let audioCtx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicStarted = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function resumeAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  if (!musicStarted) {
    musicStarted = true;
    startAmbientMusic();
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15, detune = 0) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, vol = 0.1) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playSoundEvent(event: string) {
  try {
    switch (event) {
      case 'shoot_shadow':
        playTone(80, 0.1, 'square', 0.08);
        break;
      case 'shoot_fire':
        playNoise(0.15, 0.08);
        playTone(200, 0.1, 'sawtooth', 0.06);
        break;
      case 'shoot_frost':
        playTone(800, 0.12, 'sine', 0.06);
        playTone(1200, 0.08, 'sine', 0.04);
        break;
      case 'shoot_storm':
        playNoise(0.08, 0.1);
        playTone(400, 0.05, 'square', 0.08);
        break;
      case 'shoot_venom':
        playTone(150, 0.1, 'sine', 0.07);
        playTone(300, 0.05, 'sine', 0.04, 50);
        break;
      case 'enemyHit':
        playTone(120, 0.08, 'square', 0.06);
        break;
      case 'enemyDeathRusher':
        playTone(100, 0.15, 'square', 0.08);
        playNoise(0.1, 0.06);
        break;
      case 'enemyDeathTitan':
        playTone(40, 0.4, 'sawtooth', 0.12);
        playNoise(0.3, 0.08);
        break;
      case 'playerDamage':
        playTone(60, 0.2, 'sawtooth', 0.1);
        playNoise(0.15, 0.08);
        break;
      case 'playerDeath':
        playTone(200, 0.8, 'sawtooth', 0.1);
        setTimeout(() => playTone(150, 0.6, 'sawtooth', 0.08), 200);
        setTimeout(() => playTone(80, 0.8, 'sawtooth', 0.06), 500);
        break;
      case 'gemPickup':
        playTone(523, 0.15, 'sine', 0.1);
        setTimeout(() => playTone(659, 0.15, 'sine', 0.1), 100);
        setTimeout(() => playTone(784, 0.2, 'sine', 0.1), 200);
        break;
      case 'waveClear':
        playTone(392, 0.15, 'sine', 0.1);
        setTimeout(() => playTone(523, 0.15, 'sine', 0.1), 150);
        setTimeout(() => playTone(659, 0.2, 'sine', 0.12), 300);
        break;
      case 'bossSpawn':
        playTone(40, 1.5, 'sawtooth', 0.08);
        playTone(42, 1.5, 'sawtooth', 0.06);
        break;
      case 'bossDeath':
        playNoise(0.6, 0.12);
        playTone(60, 0.8, 'sawtooth', 0.15);
        setTimeout(() => {
          playTone(523, 0.2, 'sine', 0.1);
          setTimeout(() => playTone(784, 0.3, 'sine', 0.12), 200);
        }, 400);
        break;
      case 'bossShoot':
        playTone(100, 0.15, 'square', 0.05);
        break;
      case 'bossCharge':
        playTone(60, 0.3, 'sawtooth', 0.1);
        break;
    }
  } catch {
    // Audio not available
  }
}

function startAmbientMusic() {
  try {
    const ctx = getCtx();
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.03;
    musicGain.connect(ctx.destination);

    // Deep bass drone
    const bass = ctx.createOscillator();
    bass.type = 'sawtooth';
    bass.frequency.value = 35;
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 100;
    bass.connect(bassFilter);
    bassFilter.connect(musicGain);
    bass.start();

    // Subtle pulse
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(bass.frequency);
    lfo.start();

    // Eerie high tone
    const high = ctx.createOscillator();
    high.type = 'sine';
    high.frequency.value = 800;
    const highGain = ctx.createGain();
    highGain.gain.value = 0.01;
    high.connect(highGain);
    highGain.connect(musicGain);
    high.start();

    // Slowly modulate the high tone
    const highLfo = ctx.createOscillator();
    highLfo.frequency.value = 0.1;
    const highLfoGain = ctx.createGain();
    highLfoGain.gain.value = 200;
    highLfo.connect(highLfoGain);
    highLfoGain.connect(high.frequency);
    highLfo.start();
  } catch {
    // Audio not available
  }
}
