/**
 * Procedural Web Audio API sound generator for military / sci-fi tank game
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private engineOscillator: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Lazy initialized to handle standard browser autoplay policy barriers
  }

  private initContext() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.3, this.ctx.currentTime); // default comfortable volume
      this.masterVolume.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.stopEngine();
    } else {
      this.startEngine();
    }
  }

  public toggleSound(): boolean {
    this.setSoundEnabled(!this.soundEnabled);
    return this.soundEnabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public playShoot(type: 'STANDARD' | 'TRIPLE' | 'HEAVY' | 'PLASMA' = 'STANDARD') {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterVolume);

    if (type === 'STANDARD') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'TRIPLE') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);
      
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'HEAVY') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      
      // Add distortion-like high frequency
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(90, now);
      subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
      subOsc.connect(subGain);
      subGain.connect(this.masterVolume);
      
      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.linearRampToValueAtTime(0.001, now + 0.3);
      subOsc.start(now);
      subOsc.stop(now + 0.3);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'PLASMA') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);
      
      const modulate = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      modulate.type = 'sine';
      modulate.frequency.setValueAtTime(30, now);
      modGain.gain.setValueAtTime(100, now);
      
      modulate.connect(modGain);
      modGain.connect(osc.frequency);
      
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      modulate.start(now);
      osc.start(now);
      
      modulate.stop(now + 0.25);
      osc.stop(now + 0.25);
    }
  }

  public playHit() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(100, now + 0.04);
    osc.connect(gain);
    gain.connect(this.masterVolume);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playExplosion() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    
    // Create white noise buffer
    const bufferSize = this.ctx.sampleRate * 0.6; // 0.6 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to give deep rumble boom
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    noise.start(now);
    noise.stop(now + 0.6);

    // Add high frequency crackle osc
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'triangle';
    crackOsc.frequency.setValueAtTime(140, now);
    crackOsc.frequency.linearRampToValueAtTime(10, now + 0.25);
    crackOsc.connect(crackGain);
    crackGain.connect(this.masterVolume);
    
    crackGain.gain.setValueAtTime(0.4, now);
    crackGain.gain.linearRampToValueAtTime(0.001, now + 0.25);
    crackOsc.start(now);
    crackOsc.stop(now + 0.25);
  }

  public playPowerUp() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    
    // Quick rising scale / arpeggio
    const freqs = [300, 375, 450, 600];
    const duration = 0.08;

    freqs.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * duration);
      osc.connect(gain);
      gain.connect(this.masterVolume!);
      
      gain.gain.setValueAtTime(0.3, now + index * duration);
      gain.gain.linearRampToValueAtTime(0.001, now + (index + 1) * duration);
      
      osc.start(now + index * duration);
      osc.stop(now + (index + 1) * duration);
    });
  }

  // Sustained loop for internal tank engine
  public startEngine() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterVolume || this.engineOscillator) return;

    const now = this.ctx.currentTime;
    this.engineOscillator = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOscillator.type = 'sawtooth';
    this.engineOscillator.frequency.setValueAtTime(55, now); // low idle pitch

    const highFilter = this.ctx.createBiquadFilter();
    highFilter.type = 'lowpass';
    highFilter.frequency.setValueAtTime(120, now); // filter harsh buzzes

    this.engineOscillator.connect(highFilter);
    highFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterVolume);

    this.engineGain.gain.setValueAtTime(0.12, now); // soft idle vibration
    this.engineOscillator.start(now);
  }

  public updateEnginePitch(speedRatio: number) {
    if (!this.soundEnabled || !this.ctx || !this.engineOscillator || !this.engineGain) return;
    
    // Max speed ratios will increase pitch and volume slightly to simulate acceleration!
    const targetFreq = 55 + (speedRatio * 50); // scales from 55Hz (idle) to 105Hz (full throttle)
    const targetVolume = 0.08 + (speedRatio * 0.12); // slightly louder

    const now = this.ctx.currentTime;
    this.engineOscillator.frequency.setTargetAtTime(targetFreq, now, 0.1);
    this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.1);
  }

  public stopEngine() {
    if (this.engineOscillator) {
      try {
        this.engineOscillator.stop();
      } catch (e) {}
      this.engineOscillator = null;
      this.engineGain = null;
    }
  }

  public playFinish(winner: boolean) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    this.stopEngine();

    if (winner) {
      // Direct upbeat chord arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        osc.connect(gain);
        gain.connect(this.masterVolume!);

        gain.gain.setValueAtTime(0.4, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.6);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.6);
      });
    } else {
      // Declining tone
      const notes = [196.00, 164.81, 130.81, 110.00]; // G3, E3, C3, A2
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.2);
        osc.connect(gain);
        gain.connect(this.masterVolume!);

        gain.gain.setValueAtTime(0.3, now + idx * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + 0.7);

        osc.start(now + idx * 0.2);
        osc.stop(now + idx * 0.2 + 0.7);
      });
    }
  }
}

export const GameSounds = new SoundEffectsManager();
