import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Vec2, WeaponType } from './types';

export type MultiplayerRole = 'host' | 'client';
export type LobbyState = 'idle' | 'creating' | 'waiting' | 'joining' | 'connected' | 'countdown' | 'playing' | 'disconnected' | 'error';

export interface RemotePlayerState {
  pos: Vec2;
  vel: Vec2;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  animState: string;
  animFrame: number;
  activeWeapon: WeaponType;
  isDashing: boolean;
  umbraMode: boolean;
  conviction: number;
  // Solus-specific
  radiantBurstCooldown: number;
  martyrShieldCooldown: number;
  martyrShieldActive: boolean;
  divineReckoningActive: boolean;
  divineReckoningTimer: number;
  collapsed: boolean;
  reviveProgress: number;
  revivesRemaining: number;
}

export interface RemoteInputState {
  keys: Record<string, boolean>;
  mousePos: Vec2;
  mouseDown: boolean;
  dashPressed: boolean;
  ultimatePressed: boolean;
  abilityQ: boolean;
  abilityE: boolean;
}

export interface WorldStateSync {
  enemies: Array<{
    pos: Vec2; hp: number; maxHp: number; alive: boolean; type: string;
    flashTimer: number; flinchTimer: number; speed: number; bossPhase: number;
    evolved: boolean; evolving: boolean; isBerserk: boolean; isElite: boolean;
    heraldType: number; isCamouflaged: boolean;
    poison: boolean; burning: boolean; slow: boolean; stun: boolean;
    shadowMark: boolean; darkFlame: boolean; frozenToxin: boolean;
  }>;
  projectiles: Array<{
    pos: Vec2; vel: Vec2; alive: boolean; type: string; damage: number;
    isParried: boolean;
  }>;
  wave: number;
  score: number;
  hostPlayer: RemotePlayerState;
  gemPickup: { pos: Vec2; gemType: WeaponType } | null;
  floorHazards: Array<{ pos: Vec2; radius: number; type: string }>;
}

export class MultiplayerManager {
  role: MultiplayerRole = 'host';
  lobbyState: LobbyState = 'idle';
  roomCode: string = '';
  channel: RealtimeChannel | null = null;
  remotePlayer: RemotePlayerState | null = null;
  remoteInput: RemoteInputState | null = null;
  worldState: WorldStateSync | null = null;
  countdownTimer: number = 0;
  lastSyncTime: number = 0;
  latency: number = 0;
  disconnectTimer: number = 0;
  errorMessage: string = '';
  _clientFallbackTimer: any = null;
  onStateChange: (() => void) | null = null;

  get isMultiplayer(): boolean {
    return this.lobbyState === 'playing';
  }

  get isHost(): boolean {
    return this.role === 'host';
  }

  get isAvailable(): boolean {
    return supabase !== null;
  }

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  async createSession(): Promise<boolean> {
    if (!supabase) {
      this.errorMessage = 'Multiplayer unavailable';
      this.lobbyState = 'error';
      return false;
    }

    this.role = 'host';
    this.roomCode = this.generateRoomCode();
    this.lobbyState = 'creating';

    try {
      this.channel = supabase.channel(`mm_room_${this.roomCode}`, {
        config: { broadcast: { self: false } }
      });

      this.channel.on('broadcast', { event: 'player_join' }, () => {
        this.lobbyState = 'connected';
        this.onStateChange?.();
        setTimeout(() => {
          this.runHostCountdown();
        }, 1000);
      });

      this.channel.on('broadcast', { event: 'client_input' }, (payload: any) => {
        this.remoteInput = payload.payload as RemoteInputState;
        this.latency = Date.now() - (payload.payload._ts || Date.now());
      });

      this.channel.on('broadcast', { event: 'client_player_state' }, (payload: any) => {
        this.remotePlayer = payload.payload as RemotePlayerState;
      });

      this.channel.on('broadcast', { event: 'player_disconnect' }, () => {
        this.lobbyState = 'disconnected';
        this.disconnectTimer = 1800; // 30 seconds
        this.onStateChange?.();
      });

      this.channel.on('broadcast', { event: 'player_reconnect' }, () => {
        if (this.lobbyState === 'disconnected') {
          this.lobbyState = 'playing';
          this.onStateChange?.();
        }
      });

      await this.channel.subscribe();
      this.lobbyState = 'waiting';
      this.onStateChange?.();
      return true;
    } catch {
      this.errorMessage = 'Failed to create session';
      this.lobbyState = 'error';
      return false;
    }
  }

  async joinSession(code: string): Promise<boolean> {
    if (!supabase) {
      this.errorMessage = 'Multiplayer unavailable';
      this.lobbyState = 'error';
      return false;
    }

    this.role = 'client';
    this.roomCode = code.toUpperCase();
    this.lobbyState = 'joining';

    try {
      this.channel = supabase.channel(`mm_room_${this.roomCode}`, {
        config: { broadcast: { self: false } }
      });

      this.channel.on('broadcast', { event: 'world_state' }, (payload: any) => {
        this.worldState = payload.payload as WorldStateSync;
        this.lastSyncTime = Date.now();
        this.latency = Date.now() - (payload.payload._ts || Date.now());
      });

      this.channel.on('broadcast', { event: 'countdown_tick' }, (payload: any) => {
        if (this._clientFallbackTimer) { clearTimeout(this._clientFallbackTimer); this._clientFallbackTimer = null; }
        this.lobbyState = 'countdown';
        this.countdownTimer = payload.payload.value;
        this.onStateChange?.();
      });

      this.channel.on('broadcast', { event: 'game_start' }, () => {
        this.lobbyState = 'playing';
        this.onStateChange?.();
      });

      this.channel.on('broadcast', { event: 'player_disconnect' }, () => {
        this.lobbyState = 'disconnected';
        this.disconnectTimer = 1800;
        this.onStateChange?.();
      });

      await this.channel.subscribe();

      // Wait a moment then signal join
      await new Promise(r => setTimeout(r, 500));
      await this.channel.send({ type: 'broadcast', event: 'player_join', payload: {} });

      this.lobbyState = 'connected';
      this.onStateChange?.();

      // Fallback: if no countdown received within 4s, run local countdown
      this._clientFallbackTimer = setTimeout(() => {
        if (this.lobbyState === 'connected') {
          this.lobbyState = 'countdown';
          this.countdownTimer = 3;
          this.onStateChange?.();
          const tick = (v: number) => {
            if (v <= 0) {
              this.countdownTimer = 0;
              this.onStateChange?.();
              setTimeout(() => { this.lobbyState = 'playing'; this.onStateChange?.(); }, 500);
              return;
            }
            setTimeout(() => { this.countdownTimer = v - 1; this.onStateChange?.(); tick(v - 1); }, 1000);
          };
          tick(3);
        }
      }, 4000) as any;

      return true;
    } catch {
      this.errorMessage = 'Room not found';
      this.lobbyState = 'error';
      return false;
    }
  }

  sendWorldState(state: WorldStateSync) {
    if (!this.channel || this.role !== 'host') return;
    const now = Date.now();
    if (now - this.lastSyncTime < 50) return; // 20Hz
    this.lastSyncTime = now;
    this.channel.send({
      type: 'broadcast', event: 'world_state',
      payload: { ...state, _ts: now },
    });
  }

  sendInput(input: RemoteInputState) {
    if (!this.channel || this.role !== 'client') return;
    this.channel.send({
      type: 'broadcast', event: 'client_input',
      payload: { ...input, _ts: Date.now() },
    });
  }

  sendPlayerState(state: RemotePlayerState) {
    if (!this.channel || this.role !== 'client') return;
    this.channel.send({
      type: 'broadcast', event: 'client_player_state',
      payload: state,
    });
  }

  runHostCountdown() {
    this.lobbyState = 'countdown';
    this.countdownTimer = 3;
    this.channel?.send({ type: 'broadcast', event: 'countdown_tick', payload: { value: 3 } });
    this.onStateChange?.();

    const tick = (value: number) => {
      if (value <= 0) {
        this.countdownTimer = 0;
        this.channel?.send({ type: 'broadcast', event: 'countdown_tick', payload: { value: 0 } });
        this.onStateChange?.();
        setTimeout(() => this.startGame(), 500);
        return;
      }
      setTimeout(() => {
        this.countdownTimer = value - 1;
        this.channel?.send({ type: 'broadcast', event: 'countdown_tick', payload: { value: value - 1 } });
        this.onStateChange?.();
        tick(value - 1);
      }, 1000);
    };
    tick(3);
  }

  startGame() {
    if (!this.channel || this.role !== 'host') return;
    this.lobbyState = 'playing';
    this.channel.send({ type: 'broadcast', event: 'game_start', payload: {} });
    this.onStateChange?.();
  }

  disconnect() {
    if (this.channel) {
      this.channel.send({ type: 'broadcast', event: 'player_disconnect', payload: {} });
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }
    this.lobbyState = 'idle';
    this.remotePlayer = null;
    this.remoteInput = null;
    this.worldState = null;
  }

  update() {
    if (this.lobbyState === 'disconnected') {
      this.disconnectTimer--;
      if (this.disconnectTimer <= 0) {
        this.disconnect();
      }
    }
    // Latency check
    if (this.lobbyState === 'playing' && this.role === 'client') {
      if (Date.now() - this.lastSyncTime > 5000) {
        this.lobbyState = 'disconnected';
        this.disconnectTimer = 1800;
      }
    }
  }
}

export const multiplayer = new MultiplayerManager();
