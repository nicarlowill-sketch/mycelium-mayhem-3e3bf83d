import { useRef, useEffect, useCallback, useState } from 'react';
import { createGame, update, updateClient, applyWorldState, startGame, setWeapon, activateDash, activateUmbraMode, selectUpgrade, enableCoop, updateSolus, updateSolusLocalMovement, activateSolusDash } from '@/game/engine';
import { render } from '@/game/renderer';
import { resumeAudio, playSoundEvent } from '@/game/audio';
import { GameData, WeaponType } from '@/game/types';
import { multiplayer } from '@/game/multiplayer';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData | null>(null);
  const [lobbyState, setLobbyState] = useState<string>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showLobby, setShowLobby] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameRef.current) {
      gameRef.current.width = canvas.width;
      gameRef.current.height = canvas.height;
    }
  }, []);

  const handleCreateSession = async () => {
    setLobbyState('creating');
    const ok = await multiplayer.createSession();
    if (ok) {
      setRoomCode(multiplayer.roomCode);
      setLobbyState('waiting');
    } else {
      setErrorMsg(multiplayer.errorMessage);
      setLobbyState('error');
    }
  };

  const handleJoinSession = async () => {
    if (joinCode.length !== 6) { setErrorMsg('Enter a 6-character code'); return; }
    setLobbyState('joining');
    const ok = await multiplayer.joinSession(joinCode);
    if (ok) {
      setLobbyState('connected');
    } else {
      setErrorMsg(multiplayer.errorMessage);
      setLobbyState('error');
    }
  };

  const startSoloGame = () => {
    const g = gameRef.current;
    if (!g) return;
    resumeAudio();
    startGame(g);
    setShowLobby(false);
  };

  const startCoopGame = () => {
    const g = gameRef.current;
    if (!g) return;
    resumeAudio();
    // Mark client mode so engine skips simulation
    g.isClientMode = !multiplayer.isHost;
    enableCoop(g);
    startGame(g);
    setShowLobby(false);
  };

  useEffect(() => {
    multiplayer.onStateChange = () => {
      setLobbyState(multiplayer.lobbyState);
      if (multiplayer.lobbyState === 'playing') {
        startCoopGame();
      }
    };
    return () => { multiplayer.onStateChange = null; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const g = createGame(canvas.width, canvas.height);
    gameRef.current = g;

    const weaponKeys: Record<string, WeaponType> = {
      '1': 'shadow', '2': 'fire', '3': 'frost', '4': 'storm', '5': 'venom',
      '6': 'void', '7': 'terra', '8': 'gale', '9': 'flux',
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keys when input is focused
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      const key = e.key.toLowerCase();
      g.keys[key] = true;
      if (key === ' ') { g.keys[' '] = true; activateDash(g); if (g.solus) activateSolusDash(g); }
      if (weaponKeys[key]) setWeapon(g, weaponKeys[key]);
      if (key === 'f') activateUmbraMode(g);
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => { g.keys[e.key.toLowerCase()] = false; };
    const onMouseMove = (e: MouseEvent) => { g.mousePos.x = e.clientX; g.mousePos.y = e.clientY; };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      g.mouseDown = true;
      resumeAudio();
      if (g.state === 'start' && !showLobby) {
        setShowLobby(true);
        return;
      }
      if (g.state === 'gameOver') { startGame(g); setShowLobby(false); }
      if (g.state === 'gemUnlock') g.gemUnlockTimer = 0;
      if (g.state === 'upgradeSelect' && g.selectedUpgrade < 0) {
        const cardW = 160, spacing = 30;
        const totalW = g.upgradeCards.length * cardW + (g.upgradeCards.length - 1) * spacing;
        const startX = g.width / 2 - totalW / 2;
        for (let i = 0; i < g.upgradeCards.length; i++) {
          const cx = startX + i * (cardW + spacing);
          const cy = 160;
          if (e.clientX >= cx && e.clientX <= cx + cardW && e.clientY >= cy && e.clientY <= cy + 200) {
            selectUpgrade(g, i);
            break;
          }
        }
      }
    };
    const onMouseUp = () => { g.mouseDown = false; };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('resize', handleResize);

    let running = true;
    const loop = () => {
      if (!running) return;

      const isClient = multiplayer.isMultiplayer && !multiplayer.isHost;

      if (isClient) {
        // CLIENT: Apply host world state, then run visual-only update
        if (multiplayer.worldState) {
          applyWorldState(g, multiplayer.worldState);
        }

        // Run local Solus movement only for responsiveness
        if (g.coopState === 'playing' && g.solus && g.state === 'playing') {
          updateSolusLocalMovement(g, {
            keys: g.keys,
            mousePos: g.mousePos,
          });
        }

        // Visual-only update (particles, camera, popups, screen shake)
        updateClient(g, performance.now());

        // Send inputs to host
        multiplayer.sendInput({
          keys: { ...g.keys },
          mousePos: { x: g.mousePos.x + g.camera.x, y: g.mousePos.y + g.camera.y },
          mouseDown: g.mouseDown,
          dashPressed: !!g.keys[' '],
          ultimatePressed: !!g.keys['f'],
          abilityQ: !!g.keys['q'],
          abilityE: !!g.keys['e'],
        });

        // Send local Solus state back to host for rendering
        if (g.solus) {
          multiplayer.sendPlayerState({
            pos: g.solus.pos, vel: g.solus.vel, angle: g.solus.angle,
            hp: g.solus.hp, maxHp: g.solus.maxHp, alive: g.solus.alive,
            animState: g.solus.animState, animFrame: g.solus.animFrame,
            activeWeapon: 'shadow', isDashing: g.solus.isDashing,
            umbraMode: false, conviction: g.solus.conviction,
            radiantBurstCooldown: g.solus.radiantBurstCooldown,
            martyrShieldCooldown: g.solus.martyrShieldCooldown,
            martyrShieldActive: g.solus.martyrShieldActive,
            divineReckoningActive: g.solus.divineReckoningActive,
            divineReckoningTimer: g.solus.divineReckoningTimer,
            collapsed: g.solus.collapsed,
            reviveProgress: g.solus.reviveProgress,
            revivesRemaining: g.solus.revivesRemaining,
          });
        }

        multiplayer.update();
      } else {
        // HOST or SOLO: Full simulation
        update(g, performance.now());

        if (multiplayer.isMultiplayer && multiplayer.isHost) {
          multiplayer.update();

          // Apply remote client input to Solus
          if (g.coopState === 'playing' && g.solus && g.state === 'playing') {
            const ri = multiplayer.remoteInput;
            if (ri) {
              updateSolus(g, {
                keys: ri.keys,
                mousePos: ri.mousePos,
                mouseDown: ri.mouseDown,
                abilityQ: ri.abilityQ,
                abilityE: ri.abilityE,
                ultimatePressed: ri.ultimatePressed,
              });
            }
          }

          // Broadcast world state to client
          if (g.solus) {
            multiplayer.sendWorldState({
              enemies: g.enemies.map(e => ({
                pos: e.pos, hp: e.hp, maxHp: e.maxHp, alive: e.alive, type: e.type,
                flashTimer: e.flashTimer, flinchTimer: e.flinchTimer, speed: e.speed,
                bossPhase: e.bossPhase, evolved: e.evolved, evolving: e.evolving,
                isBerserk: e.isBerserk, isElite: e.isElite, heraldType: e.heraldType,
                isCamouflaged: e.isCamouflaged,
                poison: !!e.poison, burning: !!e.burning, slow: !!e.slow, stun: !!e.stun,
                shadowMark: !!e.shadowMark, darkFlame: !!e.darkFlame, frozenToxin: !!e.frozenToxin,
              })),
              projectiles: g.projectiles.map(p => ({
                pos: p.pos, vel: p.vel, alive: p.alive, type: p.type, damage: p.damage, isParried: p.isParried,
              })),
              wave: g.wave,
              score: g.score,
              gameState: g.state,
              hostPlayer: {
                pos: g.player.pos, vel: g.player.vel, angle: g.player.angle,
                hp: g.player.hp, maxHp: g.player.maxHp, alive: g.player.alive,
                animState: g.player.animState, animFrame: g.player.animFrame,
                activeWeapon: g.player.activeWeapon, isDashing: g.player.isDashing,
                umbraMode: g.player.umbraMode, conviction: g.player.conviction,
                radiantBurstCooldown: 0, martyrShieldCooldown: 0, martyrShieldActive: false,
                divineReckoningActive: false, divineReckoningTimer: 0,
                collapsed: g.umbraCollapsed, reviveProgress: g.umbraReviveProgress,
                revivesRemaining: g.umbraRevivesRemaining,
              },
              gemPickup: g.gemPickup && !g.gemPickup.collected ? { pos: g.gemPickup.pos, gemType: g.gemPickup.gemType } : null,
              floorHazards: g.floorHazards.map(h => ({ pos: h.pos, radius: h.radius, type: h.type })),
            });
          }
        } else if (g.coopState === 'playing' && g.solus && g.state === 'playing') {
          // Local co-op (same machine)
          updateSolus(g, {
            keys: g.keys,
            mousePos: g.mousePos,
            mouseDown: g.mouseDown,
            abilityQ: !!g.keys['q'],
            abilityE: !!g.keys['e'],
            ultimatePressed: !!g.keys['f'],
          });
        }
      }

      for (const evt of g.soundEvents) playSoundEvent(evt);
      render(ctx, g);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => {
      running = false;
      multiplayer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block', position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh', cursor: 'crosshair',
        }}
      />
      {showLobby && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 10,
          fontFamily: 'Cinzel, serif', color: '#fff',
        }}>
          <h1 style={{ fontSize: 48, color: '#9b30ff', textShadow: '0 0 30px #9b30ff', marginBottom: 10 }}>
            MYCELIUM MAYHEM
          </h1>

          {lobbyState === 'idle' || lobbyState === 'error' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <button onClick={startSoloGame} style={{
                background: 'linear-gradient(135deg, #1a0044, #330066)', border: '2px solid #9b30ff',
                color: '#fff', padding: '16px 48px', fontSize: 20, cursor: 'pointer',
                fontFamily: 'Cinzel, serif', borderRadius: 4,
              }}>
                SOLO — Play as Umbra
              </button>
              <button onClick={handleCreateSession} style={{
                background: 'linear-gradient(135deg, #1a1a00, #333300)', border: '2px solid #ffd700',
                color: '#ffd700', padding: '16px 48px', fontSize: 20, cursor: 'pointer',
                fontFamily: 'Cinzel, serif', borderRadius: 4,
              }}>
                CO-OP — Create Session
              </button>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={e => { if (e.key === 'Enter') handleJoinSession(); e.stopPropagation(); }}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  style={{
                    background: '#0d0d18', border: '2px solid #88ddff', color: '#88ddff',
                    padding: '12px 16px', fontSize: 18, fontFamily: 'Orbitron, monospace',
                    textAlign: 'center', width: 180, letterSpacing: 4, borderRadius: 4,
                    outline: 'none',
                  }}
                  onFocus={() => { /* input focused - keys won't be intercepted */ }}
                />
                <button onClick={handleJoinSession} style={{
                  background: '#1a3300', border: '2px solid #44ff44', color: '#44ff44',
                  padding: '12px 24px', fontSize: 16, cursor: 'pointer',
                  fontFamily: 'Cinzel, serif', borderRadius: 4,
                }}>
                  JOIN
                </button>
              </div>
              {errorMsg && <p style={{ color: '#ff3333', fontSize: 14 }}>{errorMsg}</p>}
              {!multiplayer.isAvailable && (
                <p style={{ color: '#ff8800', fontSize: 12, marginTop: 8 }}>
                  Multiplayer unavailable — play solo
                </p>
              )}
            </div>
          ) : lobbyState === 'waiting' ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#88ddff', fontSize: 14, marginBottom: 12 }}>Share this code with your partner</p>
              <p style={{ fontSize: 48, color: '#88ddff', fontFamily: 'Orbitron, monospace', letterSpacing: 8, textShadow: '0 0 20px #88ddff' }}>
                {roomCode}
              </p>
              <button onClick={() => navigator.clipboard.writeText(roomCode)} style={{
                background: 'transparent', border: '1px solid #88ddff', color: '#88ddff',
                padding: '8px 20px', cursor: 'pointer', marginTop: 12, fontSize: 12, borderRadius: 4,
              }}>
                COPY CODE
              </button>
              <p style={{ color: '#666', marginTop: 20, fontSize: 14 }}>WAITING FOR PLAYER 2...</p>
            </div>
          ) : lobbyState === 'connected' ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#ffd700', fontSize: 24 }}>PARTNER CONNECTED</p>
              <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>Starting soon...</p>
            </div>
          ) : lobbyState === 'countdown' ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#ffd700', fontSize: 80, fontFamily: 'Cinzel, serif', textShadow: '0 0 30px #ffd700' }}>
                {multiplayer.countdownTimer > 0 ? multiplayer.countdownTimer : 'GO!'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 80, marginTop: 30 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 60, height: 80, background: 'rgba(155,48,255,0.3)', border: '2px solid #9b30ff', borderRadius: 8 }} />
                  <p style={{ color: '#9b30ff', fontSize: 14, marginTop: 8 }}>UMBRA</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 60, height: 80, background: 'rgba(255,215,0,0.3)', border: '2px solid #ffd700', borderRadius: 8 }} />
                  <p style={{ color: '#ffd700', fontSize: 14, marginTop: 8 }}>SOLUS</p>
                </div>
              </div>
            </div>
          ) : lobbyState === 'joining' || lobbyState === 'creating' ? (
            <p style={{ color: '#888', fontSize: 18 }}>Connecting...</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
