let ctx = null;
let master = null;
let muted = false;

export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function setMuted(value) {
  muted = !!value;
  if (master && ctx) {
    master.gain.setValueAtTime(muted ? 0 : 0.8, ctx.currentTime);
  }
  if (!muted) {
    startBackgroundMusic();
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

export const getMuted = isMuted;

// ==========================================
// BACKGROUND MUSIC ENGINE (Smooth Lofi Chill Groove / 92 BPM)
// ==========================================
let bgGain = null;
let bgRunning = false;
let bgTimer = null;
let bgStep = 0;

// Warm, stylish, relaxed neo-soul / lofi chords (Dm9 -> G13 -> Cmaj9 -> A7alt)
// 92 BPM -> 163ms per 16th note step
const LOFI_BARS = [
  // Bar 1: Dm9 (Smooth, mellow)
  {
    bass: 73.42, // D2
    epiano: [146.83, 220.00, 261.63, 329.63, 349.23], // D3, A3, C4, E4, F4
    lead: [440.00, 523.25, 659.25, 587.33], // A4, C5, E5, D5
  },
  // Bar 2: G13 (Soulful turn)
  {
    bass: 49.00, // G1
    epiano: [98.00, 196.00, 246.94, 329.63, 392.00], // G2, G3, B3, E4, G4
    lead: [392.00, 493.88, 587.33, 493.88], // G4, B4, D5, B4
  },
  // Bar 3: Cmaj9 (Lush resolution)
  {
    bass: 65.41, // C2
    epiano: [130.81, 196.00, 246.94, 293.66, 329.63], // C3, G3, B3, D4, E4
    lead: [523.25, 587.33, 659.25, 523.25], // C5, D5, E5, C5
  },
  // Bar 4: A7b13 (Smooth jazz turnaround)
  {
    bass: 55.00, // A1
    epiano: [110.00, 174.61, 220.00, 277.18, 329.63], // A2, F3, A3, C#4, E4
    lead: [440.00, 554.37, 587.33, 493.88], // A4, C#5, D5, B4
  },
];

// Soft, relaxed electric piano chord strum
function playEPianoChords(notes, now) {
  if (!ctx || muted) return;
  try {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, now);

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const delay = i * 0.016; // Gentle human strum delay

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.detune.setValueAtTime((i - 2) * 5, now + delay);

      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.2);

      osc.connect(filter);
      filter.connect(g);
      g.connect(bgGain);

      osc.start(now + delay);
      osc.stop(now + delay + 1.25);
    });
  } catch (e) {}
}

// Deep, warm sub-bass pulse
function playMellowBass(freq, now) {
  if (!ctx || muted) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.30, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.connect(filter);
    filter.connect(g);
    g.connect(bgGain);

    osc.start(now);
    osc.stop(now + 0.9);
  } catch (e) {}
}

// Soft lofi rimshot / finger snap
function playRimshot(now) {
  if (!ctx || muted) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

    f.type = 'bandpass';
    f.frequency.setValueAtTime(1400, now);

    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(f);
    f.connect(g);
    g.connect(bgGain);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

// Soft gentle brushed hi-hat
function playSoftHat(now) {
  if (!ctx || muted) return;
  try {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(4800, now);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3600, now);

    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(filter);
    filter.connect(g);
    g.connect(bgGain);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) {}
}

// Mellow lofi lead note
function playMellowLead(freq, now) {
  if (!ctx || muted) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(filter);
    filter.connect(g);
    g.connect(bgGain);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {}
}

function onBgStep() {
  if (!bgRunning || !ctx || muted) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
    return;
  }

  const now = ctx.currentTime;
  const barIndex = Math.floor((bgStep % 64) / 16);
  const stepInBar = bgStep % 16;
  const bar = LOFI_BARS[barIndex];

  // Beat 1 (step 0): Rhodes chords + deep sub-bass
  if (stepInBar === 0) {
    playEPianoChords(bar.epiano, now);
    playMellowBass(bar.bass, now);
  }

  // Beat 3 (step 8): Secondary sub-bass bounce
  if (stepInBar === 8) {
    playMellowBass(bar.bass * 1.5, now);
  }

  // Soft rimshot on beats 2 and 4 (steps 4 and 12)
  if (stepInBar === 4 || stepInBar === 12) {
    playRimshot(now);
  }

  // Soft brushed hat on even 8th notes (0, 2, 4, 6, 8, 10, 12, 14)
  if (stepInBar % 2 === 0) {
    playSoftHat(now);
  }

  // Gentle lofi melody note on select steps (2, 7, 10)
  if (stepInBar === 2) {
    playMellowLead(bar.lead[0], now);
  } else if (stepInBar === 6) {
    playMellowLead(bar.lead[1], now);
  } else if (stepInBar === 10) {
    playMellowLead(bar.lead[2], now);
  }

  bgStep++;
}

export function startBackgroundMusic() {
  initAudio();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().then(() => {
      startMusicLoop();
    }).catch(() => {});
    return;
  }
  startMusicLoop();
}

function startMusicLoop() {
  if (bgRunning) return;
  bgRunning = true;

  if (!bgGain) {
    bgGain = ctx.createGain();
    bgGain.gain.value = 0.85;
    bgGain.connect(master);
  }

  if (bgTimer) clearInterval(bgTimer);
  bgStep = 0;
  onBgStep();
  // 92 BPM -> 163ms per 16th note step (relaxed, slow chill tempo)
  bgTimer = setInterval(onBgStep, 163);
}

export function stopBackgroundMusic() {
  bgRunning = false;
  if (bgTimer) { clearInterval(bgTimer); bgTimer = null; }
}

let lastSoundTime = 0;
export const SOUND_COOLDOWN_MS = 600;

function tone({ freq, endFreq, type = "sine", start = 0, dur = 0.2, vol = 0.3, filterHz }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + start;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  let node = osc;
  if (filterHz) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = filterHz;
    osc.connect(lp);
    node = lp;
  }
  node.connect(gain);
  gain.connect(master);

  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

let lastClickTime = 0;

export function playCorrect() {
  if (muted) return;
  const nowMs = performance.now();
  if (nowMs - lastSoundTime < SOUND_COOLDOWN_MS) return;
  lastSoundTime = nowMs;

  initAudio();
  if (!ctx) return;

  const trigger = () => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const last = i === notes.length - 1;
      const start = i * 0.07;
      const dur = last ? 0.32 : 0.14;
      tone({ freq: f, type: "sine", start, dur, vol: 0.28 });          
      tone({ freq: f * 2, type: "triangle", start, dur, vol: 0.08 });   
    });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(trigger).catch(() => {});
  } else {
    trigger();
  }
}

export function playWrong() {
  if (muted) return;
  const nowMs = performance.now();
  if (nowMs - lastSoundTime < SOUND_COOLDOWN_MS) return;
  lastSoundTime = nowMs;

  initAudio();
  if (!ctx) return;

  const trigger = () => {
    [0, 0.2].forEach((start) => {
      tone({ freq: 220, endFreq: 120, type: "sawtooth", start, dur: 0.16, vol: 0.22, filterHz: 900 });
      tone({ freq: 207, endFreq: 110, type: "square", start, dur: 0.16, vol: 0.10, filterHz: 700 });
    });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(trigger).catch(() => {});
  } else {
    trigger();
  }
}

export function playClick() {
  initAudio();
  if (!ctx || muted) return;

  const now = performance.now();
  if (now - lastClickTime < 60) return; 
  lastClickTime = now;

  const trigger = () => {
    tone({ freq: 1400, endFreq: 900, type: "triangle", dur: 0.06, vol: 0.16 });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(trigger).catch(() => {});
  } else {
    trigger();
  }
}

let lastCompletionTime = 0;

export function playCompletion() {
  if (muted) return;
  const nowMs = performance.now();
  if (nowMs - lastCompletionTime < 2500) return; 
  lastCompletionTime = nowMs;
  lastSoundTime = nowMs;

  initAudio();
  if (!ctx) return;

  const trigger = () => {

    const fanfareNotes = [
      { f: 523.25, start: 0.00, dur: 0.12, vol: 0.26 }, 
      { f: 659.25, start: 0.11, dur: 0.12, vol: 0.26 }, 
      { f: 783.99, start: 0.22, dur: 0.12, vol: 0.28 }, 
      { f: 1046.50, start: 0.33, dur: 0.18, vol: 0.32 }, 
      { f: 783.99, start: 0.48, dur: 0.12, vol: 0.24 }, 
      { f: 1046.50, start: 0.58, dur: 0.22, vol: 0.34 }, 
    ];

    fanfareNotes.forEach(({ f, start, dur, vol }) => {
      tone({ freq: f, type: "sine", start, dur, vol });
      tone({ freq: f * 1.5, type: "triangle", start, dur: dur * 0.8, vol: vol * 0.20 });
    });

    const chordStart = 0.76;
    const chordDur   = 0.85;
    const chord = [
      { f: 261.63, vol: 0.24 }, 
      { f: 392.00, vol: 0.20 }, 
      { f: 523.25, vol: 0.26 }, 
      { f: 659.25, vol: 0.24 }, 
      { f: 783.99, vol: 0.26 }, 
      { f: 1046.50, vol: 0.28 }, 
    ];

    chord.forEach(({ f, vol }) => {
      tone({ freq: f, type: "sine", start: chordStart, dur: chordDur, vol });
      tone({ freq: f * 2, type: "triangle", start: chordStart, dur: chordDur * 0.7, vol: vol * 0.15 });
    });

    const sparkles = [
      { f: 1318.51, start: 0.88, dur: 0.25, vol: 0.18 }, 
      { f: 1567.98, start: 1.02, dur: 0.28, vol: 0.18 }, 
      { f: 2093.00, start: 1.16, dur: 0.45, vol: 0.22 }, 
    ];

    sparkles.forEach(({ f, start, dur, vol }) => {
      tone({ freq: f, type: "triangle", start, dur, vol });
    });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(trigger).catch(() => {});
  } else {
    trigger();
  }
}

export function playLevelUp() {
  if (muted) return;
  initAudio();
  if (!ctx) return;

  const trigger = () => {
    // Punchy upward arcade arpeggio
    const notes = [
      { f: 392.00, start: 0.00, dur: 0.09, vol: 0.22 }, // G4
      { f: 523.25, start: 0.08, dur: 0.09, vol: 0.24 }, // C5
      { f: 659.25, start: 0.16, dur: 0.09, vol: 0.26 }, // E5
      { f: 783.99, start: 0.24, dur: 0.09, vol: 0.28 }, // G5
      { f: 1046.50, start: 0.32, dur: 0.28, vol: 0.32 }, // C6
    ];
    notes.forEach(({ f, start, dur, vol }) => {
      tone({ freq: f, type: "sine", start, dur, vol });
      tone({ freq: f * 2, type: "triangle", start, dur: dur * 0.7, vol: vol * 0.18 });
    });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(trigger).catch(() => {});
  } else {
    trigger();
  }
}

export function playGauntlet() {
  if (muted) return;
  initAudio();
  if (!ctx) return;

  const trigger = () => {
    // Intense dramatic dramatic warning / hype chord
    tone({ freq: 220, endFreq: 440, type: "sawtooth", start: 0.00, dur: 0.22, vol: 0.26, filterHz: 1200 });
    tone({ freq: 330, endFreq: 660, type: "square", start: 0.12, dur: 0.25, vol: 0.20, filterHz: 1400 });
    tone({ freq: 440, endFreq: 880, type: "sawtooth", start: 0.24, dur: 0.35, vol: 0.28, filterHz: 1600 });
    // Bright punch chord
    [554.37, 659.25, 880.00].forEach((f) => {
      tone({ freq: f, type: "triangle", start: 0.35, dur: 0.40, vol: 0.22 });
    });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(trigger).catch(() => {});
  } else {
    trigger();
  }
}

export function enableClickSounds() {
  document.addEventListener(
    "pointerdown",
    (e) => {
      initAudio();
      if (e.target.closest("button, [role='button'], a, .btn, input[type='button'], input[type='submit']")) {
        playClick();
      }
    },
    true
  );
}
