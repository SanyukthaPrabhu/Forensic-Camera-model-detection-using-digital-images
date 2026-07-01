class SoundManager {
  constructor() {
    this.ctx = null;
    this.scanningOsc = null;
    this.scanningGain = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Quick high-tech beep for file drop/clicks
  playBeep() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Low tech-hum for active scanning
  startScanHum() {
    this.init();
    if (this.scanningOsc) return;

    this.scanningOsc = this.ctx.createOscillator();
    this.scanningGain = this.ctx.createGain();
    
    // Creates a rapid "ticking/humming" tech sound by modulating frequency
    this.scanningOsc.type = 'square';
    this.scanningOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
    
    // Add LFO for a pulsing radar effect
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 8; // 8 pulses per second
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 40;
    
    lfo.connect(lfoGain);
    lfoGain.connect(this.scanningOsc.frequency);
    lfo.start();

    this.scanningGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.scanningGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.5); // Fade in
    
    this.scanningOsc.connect(this.scanningGain);
    this.scanningGain.connect(this.ctx.destination);
    
    this.scanningOsc.start();
    this.scanningOsc.lfo = lfo; // store to stop later
  }

  stopScanHum() {
    if (this.scanningOsc && this.scanningGain && this.ctx) {
      const stopTime = this.ctx.currentTime + 0.5;
      this.scanningGain.gain.linearRampToValueAtTime(0.01, stopTime);
      this.scanningOsc.stop(stopTime);
      if (this.scanningOsc.lfo) this.scanningOsc.lfo.stop(stopTime);
      this.scanningOsc = null;
      this.scanningGain = null;
    }
  }

  // Heavy "Thud" or "Kachunk" impact for final verdict
  playImpact(isDanger = false) {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // A rapid frequency drop simulates an impact
    osc.type = isDanger ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);

    // If danger (forgery), play an extra high dissonant note
    if (isDanger) {
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc2.frequency.linearRampToValueAtTime(350, this.ctx.currentTime + 0.4);
      
      gain2.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
      
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.4);
    }
  }
}

export const soundManager = new SoundManager();
