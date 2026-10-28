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
    // Direct destination connection
    master.connect(ctx.destination);
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
// MULTI-TRACK BACKGROUND MUSIC JUKEBOX
// ==========================================
export const MUSIC_TRACKS = [
  { id: 'arcade',    name: '8-Bit Arcade 👾' },
  { id: 'synthwave', name: 'Cyber Synth ⚡' },
  { id: 'lofi',      name: 'Chill Lofi ☕' },
  { id: 'off',       name: 'Music: Off 🔇' },
];

let currentTrackId = 'arcade';
try {
  const saved = localStorage.getItem('chromatic_music_track');
  if (saved && saved !== 'off') currentTrackId = saved;
} catch (e) {}

let bgGain = null;
let bgRunning = false;
let bgTimer = null;
let bgStep = 0;

export function getCurrentTrack() {
  return MUSIC_TRACKS.find(t => t.id === currentTrackId) || MUSIC_TRACKS[0];
}

export function setMusicTrack(trackId) {
  if (trackId === 'off') {
    currentTrackId = 'off';
    try { localStorage.setItem('chromatic_music_track', 'off'); } catch (e) {}
    stopBackgroundMusic();
    return getCurrentTrack();
  }

  currentTrackId = trackId;
  try { localStorage.setItem('chromatic_music_track', trackId); } catch (e) {}

  stopBackgroundMusic();
  startBackgroundMusic();
  return getCurrentTrack();
}

export function cycleMusicTrack() {
  initAudio();
  const currentIndex = MUSIC_TRACKS.findIndex(t => t.id === currentTrackId);
  const nextTrack = MUSIC_TRACKS[(currentIndex + 1) % MUSIC_TRACKS.length];
  return setMusicTrack(nextTrack.id);
}

// ------------------------------------------
// 1. ARCADE CHIPTUNE (Upbeat, Catchy, Bouncy)
// ------------------------------------------
const CHIPTUNE_BARS = [
  // Bar 1: C Major (Joyful & bouncy)
  {
    bass: 130.81, // C3
    sub: 65.41,   // C2
    melody: [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 523.25, 587.33],
  },
  // Bar 2: A Minor (Nostalgic arcade flow)
  {
    bass: 110.00, // A2
    sub: 55.00,   // A1
    melody: [440.00, 523.25, 659.25, 880.00, 659.25, 523.25, 440.00, 493.88],
  },
  // Bar 3: F Major (Upward anthem energy)
  {
    bass: 87.31,  // F2
    sub: 43.65,   // F1
    melody: [349.23, 440.00, 523.25, 698.46, 523.25, 440.00, 349.23, 392.00],
  },
  // Bar 4: G Major (Bouncy turnaround)
  {
    bass: 98.00,  // G2
    sub: 49.00,   // G1
    melody: [392.00, 493.88, 587.33, 783.99, 880.00, 783.99, 587.33, 493.88],
  },
];

function stepArcadeChiptune(now) {
  const barIndex = Math.floor((bgStep % 64) / 16);
  const stepInBar = bgStep % 16;
  const bar = CHIPTUNE_BARS[barIndex];

  // 8-bit staccato bass (plays on every even 16th step)
  if (stepInBar % 2 === 0) {
    const isHigh = stepInBar % 4 === 2;
    const freq = isHigh ? bar.bass : bar.sub;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.20, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(g);
      g.connect(bgGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  // Chiptune lead melody (bouncy 8th notes on even steps)
  if (stepInBar % 2 === 0) {
    const mIdx = (stepInBar / 2) % bar.melody.length;
    const mFreq = bar.melody[mIdx];
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(mFreq, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(g);
      g.connect(bgGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  // Chiptune noise snare / percussion on beats 2 & 4 (steps 4 & 12)
  if (stepInBar === 4 || stepInBar === 12) {
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);

      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(g);
      g.connect(bgGain);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  // Chiptune hi-hat blip on odd steps
  if (stepInBar % 2 === 1) {
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(3600, now);

      g.gain.setValueAtTime(0.04, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(g);
      g.connect(bgGain);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  }
}

// ------------------------------------------
// 2. CYBER SYNTHWAVE (Neon 80s Groove)
// ------------------------------------------
const SYNTH_BARS = [
  { root: 110.00, pad: [220.00, 261.63, 329.63] }, // Am
  { root: 87.31,  pad: [174.61, 220.00, 261.63] }, // F
  { root: 130.81, pad: [196.00, 261.63, 329.63] }, // C
  { root: 98.00,  pad: [196.00, 246.94, 293.66] }, // G
];

function stepSynthwave(now) {
  const barIndex = Math.floor((bgStep % 64) / 16);
  const stepInBar = bgStep % 16;
  const bar = SYNTH_BARS[barIndex];

  // Kick on steps 0, 4, 8, 12
  if (stepInBar % 4 === 0) {
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      g.gain.setValueAtTime(0.35, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(g);
      g.connect(bgGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  // Sawtooth rolling bass
  if (stepInBar % 2 === 0) {
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bar.root * 0.5, now);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(500, now);
      f.frequency.exponentialRampToValueAtTime(160, now + 0.09);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
      osc.connect(f);
      f.connect(g);
      g.connect(bgGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch (e) {}
  }

  // Synth chord pad on step 0
  if (stepInBar === 0) {
    bar.pad.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.06, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        osc.connect(g);
        g.connect(bgGain);
        osc.start(now);
        osc.stop(now + 1.65);
      } catch (e) {}
    });
  }
}

// ------------------------------------------
// 3. CHILL LOFI (Mellow Neo-Soul)
// ------------------------------------------
const LOFI_BARS = [
  { bass: 73.42, epiano: [146.83, 220.00, 261.63, 329.63] }, // Dm9
  { bass: 49.00, epiano: [98.00, 196.00, 246.94, 329.63] },  // G13
  { bass: 65.41, epiano: [130.81, 196.00, 246.94, 293.66] }, // Cmaj9
  { bass: 55.00, epiano: [110.00, 174.61, 220.00, 277.18] }, // A7alt
];

function stepLofi(now) {
  const barIndex = Math.floor((bgStep % 64) / 16);
  const stepInBar = bgStep % 16;
  const bar = LOFI_BARS[barIndex];

  if (stepInBar === 0) {
    // Sub-bass
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(bar.bass, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.28, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(g);
      g.connect(bgGain);
      osc.start(now);
      osc.stop(now + 1.25);
    } catch (e) {}

    // Rhodes strum
    bar.epiano.forEach((freq, i) => {
      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const del = i * 0.018;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + del);
        g.gain.setValueAtTime(0.0001, now + del);
        g.gain.linearRampToValueAtTime(0.10, now + del + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + del + 1.4);
        osc.connect(g);
        g.connect(bgGain);
        osc.start(now + del);
        osc.stop(now + del + 1.45);
      } catch (e) {}
    });
  }

  // Soft rimshot on steps 4 and 12
  if (stepInBar === 4 || stepInBar === 12) {
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.04);
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.connect(g);
      g.connect(bgGain);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }
}

function onBgStep() {
  if (!bgRunning || !ctx || muted || currentTrackId === 'off') return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
    return;
  }

  const now = ctx.currentTime + 0.025;
  if (currentTrackId === 'arcade') {
    stepArcadeChiptune(now);
  } else if (currentTrackId === 'synthwave') {
    stepSynthwave(now);
  } else if (currentTrackId === 'lofi') {
    stepLofi(now);
  }

  bgStep++;
}

export function startBackgroundMusic() {
  initAudio();
  if (!ctx || currentTrackId === 'off') return;

  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      startMusicLoop();
    }).catch(() => {});
    return;
  }
  startMusicLoop();
}

function startMusicLoop() {
  if (bgRunning || currentTrackId === 'off') return;
  bgRunning = true;

  if (!bgGain) {
    bgGain = ctx.createGain();
    bgGain.gain.value = 0.85;
    bgGain.connect(master);
  }

  if (bgTimer) clearInterval(bgTimer);
  bgStep = 0;
  onBgStep();

  // Speed according to track
  const stepMs = currentTrackId === 'arcade' ? 116 : (currentTrackId === 'synthwave' ? 128 : 160);
  bgTimer = setInterval(onBgStep, stepMs);
}

export function stopBackgroundMusic() {
  bgRunning = false;
  if (bgTimer) { clearInterval(bgTimer); bgTimer = null; }
}

let lastSoundTime = 0;
export const SOUND_COOLDOWN_MS = 600;

function tone({ freq, endFreq, type = "sine", start = 0, dur = 0.2, vol = 0.3, filterHz }) {
  if (!ctx || muted) return;
  const t0 = Math.max(ctx.currentTime, ctx.currentTime + start) + 0.01;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
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
