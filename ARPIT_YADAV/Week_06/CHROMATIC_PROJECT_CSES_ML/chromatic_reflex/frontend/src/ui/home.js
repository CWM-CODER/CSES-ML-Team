import { playClick, toggleMute, getMuted, initAudio, startBackgroundMusic } from '../audio/soundManager.js';
import { createLeaderboardScreen } from './leaderboard.js';

function injectHomeStyles() {
  if (document.getElementById('home-styles')) return;
  const s = document.createElement('style');
  s.id = 'home-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

    #home-overlay {
      position: fixed; inset: 0; z-index: 100;
      background: #07090e;
      color: #f8fafc;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow-y: auto;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 32px 20px;
      box-sizing: border-box;
    }
    #home-overlay.home-hidden { display: none; }

    .home-container {
      width: 100%; max-width: 780px;
      display: flex; flex-direction: column; align-items: center;
      gap: 28px;
      animation: home-fade-in 0.3s ease;
    }
    @keyframes home-fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .home-top-bar {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      margin-bottom: -12px;
    }
    .home-btn-sound {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #94a3b8;
      border-radius: 99px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .home-btn-sound:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #f1f5f9;
      transform: translateY(-1px);
    }

    .home-header {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 10px;
    }
    .home-org-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 16px; border-radius: 99px;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #7dd3fc; font-size: 12px; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase;
    }
    .home-title {
      font-size: clamp(34px, 5.5vw, 48px); font-weight: 900;
      letter-spacing: -0.03em; margin: 0; line-height: 1.1;
      color: #ffffff;
    }
    .home-subtitle {
      font-size: 15px; color: #94a3b8; font-weight: 500;
      max-width: 540px; margin: 0; line-height: 1.5;
    }

    .home-gestures-grid {
      width: 100%;
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    @media (max-width: 680px) {
      .home-gestures-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .home-gcard {
      border-radius: 14px; padding: 20px 14px 16px;
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 8px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: default;
    }
    .home-gcard:hover {
      transform: translateY(-3px);
    }

    .home-gcard-red {
      background: linear-gradient(150deg, #dc2626 0%, #991b1b 100%);
      border: 2px solid #f87171;
      box-shadow: 0 10px 28px rgba(220, 38, 38, 0.35);
    }
    .home-gcard-red .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #fee2e2;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .home-gcard-blue {
      background: linear-gradient(150deg, #2563eb 0%, #1e40af 100%);
      border: 2px solid #60a5fa;
      box-shadow: 0 10px 28px rgba(37, 99, 235, 0.35);
    }
    .home-gcard-blue .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #dbeafe;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .home-gcard-yellow {
      background: linear-gradient(150deg, #d97706 0%, #92400e 100%);
      border: 2px solid #fbbf24;
      box-shadow: 0 10px 28px rgba(217, 119, 6, 0.35);
    }
    .home-gcard-yellow .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #fef3c7;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .home-gcard-green {
      background: linear-gradient(150deg, #16a34a 0%, #166534 100%);
      border: 2px solid #4ade80;
      box-shadow: 0 10px 28px rgba(22, 163, 74, 0.35);
    }
    .home-gcard-green .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #dcfce7;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .home-gcard-purple {
      background: linear-gradient(150deg, #9333ea 0%, #6b21a8 100%);
      border: 2px solid #c084fc;
      box-shadow: 0 10px 28px rgba(147, 51, 234, 0.35);
    }
    .home-gcard-purple .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #f3e8ff;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .home-gcard-white {
      background: linear-gradient(150deg, #ffffff 0%, #e2e8f0 100%);
      border: 2px solid #ffffff;
      box-shadow: 0 10px 28px rgba(255, 255, 255, 0.45);
    }
    .home-gcard-white .home-gcard-tag {
      background: rgba(15, 23, 42, 0.12);
      color: #0f172a;
      border: 1px solid rgba(15, 23, 42, 0.25);
      font-weight: 900;
    }
    .home-gcard-white .home-gcard-name {
      color: #0f172a;
      font-weight: 800;
    }

    .home-gcard-cyan {
      background: linear-gradient(150deg, #0891b2 0%, #0e7490 100%);
      border: 2px solid #22d3ee;
      box-shadow: 0 10px 28px rgba(6, 182, 212, 0.35);
    }
    .home-gcard-cyan .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #cffafe;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .home-gcard-orange {
      background: linear-gradient(150deg, #ea580c 0%, #9a3412 100%);
      border: 2px solid #fb923c;
      box-shadow: 0 10px 28px rgba(234, 88, 12, 0.35);
    }
    .home-gcard-orange .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #ffedd5;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .home-gcard-tag {
      font-size: 11px; font-weight: 800; letter-spacing: 0.1em;
      text-transform: uppercase; padding: 4px 12px; border-radius: 99px;
    }
    .home-gcard-emoji {
      font-size: 40px; line-height: 1; margin: 4px 0;
    }
    .home-gcard-name {
      font-size: 14px; font-weight: 700; color: #ffffff;
      letter-spacing: -0.01em;
    }

    .home-brief {
      display: flex; align-items: center; justify-content: center;
      gap: 16px; font-size: 13px; font-weight: 600; color: #64748b;
      flex-wrap: wrap;
    }
    .home-brief-divider { color: #334155; }
    .home-brief-highlight { color: #94a3b8; font-weight: 700; }

    .home-actions {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; width: 100%; max-width: 340px;
    }
    .home-btn-play {
      width: 100%;
      padding: 16px 0; border-radius: 12px; border: none;
      background: #ffffff; color: #090d16;
      font-size: 16px; font-weight: 800; font-family: inherit;
      cursor: pointer; letter-spacing: -0.01em;
      box-shadow: 0 6px 20px rgba(255, 255, 255, 0.15);
      transition: all 0.2s ease;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .home-btn-play:hover {
      background: #f1f5f9;
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(255, 255, 255, 0.25);
    }
    .home-btn-play:active {
      transform: translateY(0);
    }
    .home-btn-leaderboard {
      width: 100%;
      padding: 13px 0; border-radius: 12px;
      border: 1.5px solid rgba(56, 189, 248, 0.3);
      background: rgba(56, 189, 248, 0.06); color: #7dd3fc;
      font-size: 14px; font-weight: 800; font-family: inherit;
      cursor: pointer; letter-spacing: -0.01em;
      transition: all 0.2s ease;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .home-btn-leaderboard:hover {
      background: rgba(56, 189, 248, 0.14);
      border-color: rgba(56, 189, 248, 0.6);
      transform: translateY(-2px);
    }
    .home-btn-leaderboard:active { transform: translateY(0); }

    .home-footer-note {
      font-size: 12px; color: #475569; font-weight: 500;
    }
  `;
  document.head.appendChild(s);
}

export function createHomeScreen() {
  injectHomeStyles();

  const ov = document.createElement('div');
  ov.id = 'home-overlay';

  ov.innerHTML = `
    <div class="home-container">

      <div class="home-top-bar">
        <button id="home-btn-sound" class="home-btn-sound">🔊 Sound On</button>
      </div>

      <div class="home-header">
        <div class="home-org-badge">
          CSES • NIT WARANGAL • ML TEAM
        </div>
        <h1 class="home-title">Chromatic Reflex</h1>
        <p class="home-subtitle">
          Real-time computer vision reflex benchmark with accelerating round tempo.
        </p>
      </div>

      <div class="home-gestures-grid">
        <div class="home-gcard home-gcard-red">
          <span class="home-gcard-tag">RED</span>
          <span class="home-gcard-emoji">✌️</span>
          <span class="home-gcard-name">Two Fingers</span>
        </div>
        <div class="home-gcard home-gcard-blue">
          <span class="home-gcard-tag">BLUE</span>
          <span class="home-gcard-emoji">✊</span>
          <span class="home-gcard-name">Fist</span>
        </div>
        <div class="home-gcard home-gcard-yellow">
          <span class="home-gcard-tag">YELLOW</span>
          <span class="home-gcard-emoji">👍</span>
          <span class="home-gcard-name">Thumbs Up</span>
        </div>
        <div class="home-gcard home-gcard-green">
          <span class="home-gcard-tag">GREEN</span>
          <span class="home-gcard-emoji">☝️</span>
          <span class="home-gcard-name">Pointing</span>
        </div>
        <div class="home-gcard home-gcard-white">
          <span class="home-gcard-tag">WHITE</span>
          <span class="home-gcard-emoji">🤘</span>
          <span class="home-gcard-name">Rock On</span>
        </div>
        <div class="home-gcard home-gcard-purple">
          <span class="home-gcard-tag">PURPLE</span>
          <span class="home-gcard-emoji">🖐️</span>
          <span class="home-gcard-name">Open Hand</span>
        </div>
      </div>

      <div class="home-brief">
        <span class="home-brief-highlight">6 Reactive Gestures</span>
        <span class="home-brief-divider">•</span>
        <span class="home-brief-highlight">⚡ Stroop Challenge (Match Ink Color)</span>
        <span class="home-brief-divider">•</span>
        <span class="home-brief-highlight">Accelerating Speed (2.8s → 1.5s)</span>
      </div>

      <div class="home-actions">
        <button class="home-btn-play" id="home-btn-play">
          Start Benchmark 🚀
        </button>
        <button class="home-btn-leaderboard" id="home-btn-leaderboard">
          🏆 View Leaderboard
        </button>
        <span class="home-footer-note">Webcam required • Stand 40–70 cm away</span>
      </div>
    </div>
  `;

  document.body.appendChild(ov);

  const leaderboard = createLeaderboardScreen();

  const soundBtn = document.getElementById('home-btn-sound');
  function updateSoundBtn() {
    if (!soundBtn) return;
    const isM = getMuted();
    soundBtn.textContent = isM ? '🔇 Music: MUTED' : '🔊 Music: ON';
    soundBtn.style.color = isM ? '#fca5a5' : '#38bdf8';
    soundBtn.style.borderColor = isM ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)';
    soundBtn.style.background = isM ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.14)';
  }
  updateSoundBtn();

  if (soundBtn) {
    soundBtn.onclick = (e) => {
      e.stopPropagation();
      initAudio();
      const currentMuted = getMuted();
      if (currentMuted) {
        setMuted(false);
        startBackgroundMusic();
      } else {
        setMuted(true);
      }
      playClick();
      updateSoundBtn();
    };
  }

  return {
    show(onPlay) {
      updateSoundBtn();
      ov.classList.remove('home-hidden');
      const btn = document.getElementById('home-btn-play');
      btn.onclick = () => {
        playClick();
        ov.classList.add('home-hidden');
        onPlay?.();
      };
      const lbBtn = document.getElementById('home-btn-leaderboard');
      lbBtn.onclick = () => {
        playClick();
        ov.classList.add('home-hidden');
        leaderboard.show(() => {
          // Back from leaderboard → show home again
          ov.classList.remove('home-hidden');
        });
      };
    },
    hide() {
      ov.classList.add('home-hidden');
    },
  };
}

