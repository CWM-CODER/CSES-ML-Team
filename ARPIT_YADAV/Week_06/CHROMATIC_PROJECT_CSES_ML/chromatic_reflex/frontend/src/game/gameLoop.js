import { classifyGesture, getGestureConfidence } from '../gesture/gestureClassifier.js';
import { drawHand } from '../hands/overlay.js';
import { playCorrect, playWrong, playCompletion, startBackgroundMusic, stopBackgroundMusic } from '../audio/soundManager.js';
import { sendSessionToBackend } from '../api/apiService.js';

const COLOR_GESTURE_MAP = {
  RED:    'two_fingers',
  BLUE:   'fist',
  YELLOW: 'thumbs_up',
  GREEN:  'point',
  WHITE:  'rock',
  PURPLE: 'open',
};
const COLORS          = Object.keys(COLOR_GESTURE_MAP);   
const TOTAL_ROUNDS    = 20;
export const CONFIRM_N       = 3;       
export const CONFIRM_WRONG_N = 4;       
const CONF_THRESH     = 0.60;    
export const FEEDBACK_MS     = 1600;    
const ARM_HOLD_MS     = 500;     
const DELAY_MIN_MS    = 1000;    
const DELAY_MAX_MS    = 3000;    
const SCORE_BASE      = 10;      

function getRoundTimeout(roundIdx, totalRounds = 20) {
  if (roundIdx < 10) {
    // Rounds 1-10: 3200ms -> 2600ms (introductory tempo)
    const t = roundIdx / 9;
    return Math.round(3200 - t * 600);
  } else if (roundIdx < 15) {
    // Rounds 11-15 (Start of last 10): 2200ms -> 1800ms (accelerated)
    const t = (roundIdx - 10) / 4;
    return Math.round(2200 - t * 400);
  } else {
    // Rounds 16-20 (Final 5 chances): 1650ms -> 1350ms (turbo reflex)
    const t = (roundIdx - 15) / 4;
    return Math.round(1650 - t * 300);
  }
}

const MAPPED = new Set(Object.values(COLOR_GESTURE_MAP));
function isRest(label) { return !MAPPED.has(label); }

function pickStroopCue() {
  const inkColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  const distractorColors = COLORS.filter((c) => c !== inkColor);
  const wordColor = distractorColors[Math.floor(Math.random() * distractorColors.length)];

  // Pick a random boundary/border color that is strictly NEITHER the ink color NOR the word color,
  // and avoid confusing shade pairs (BLUE with CYAN, RED with ORANGE).
  const borderPalette = ['RED', 'BLUE', 'YELLOW', 'GREEN', 'PURPLE', 'CYAN', 'ORANGE'];
  const bgCandidates = borderPalette.filter((c) => {
    if (c === inkColor || c === wordColor) return false;
    if ((inkColor === 'BLUE' || wordColor === 'BLUE') && c === 'CYAN') return false;
    if ((inkColor === 'CYAN' || wordColor === 'CYAN') && c === 'BLUE') return false;
    if ((inkColor === 'RED' || wordColor === 'RED') && c === 'ORANGE') return false;
    if ((inkColor === 'ORANGE' || wordColor === 'ORANGE') && c === 'RED') return false;
    return true;
  });
  const fallbackList = borderPalette.filter((c) => c !== inkColor && c !== wordColor);
  const finalCandidates = bgCandidates.length > 0 ? bgCandidates : fallbackList;
  const barBgColor = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];

  return {
    inkColor,
    wordColor,
    barBgColor,
    targetGesture: COLOR_GESTURE_MAP[inkColor],
  };
}

export function runGame(videoEl, canvasEl, tracker, playerInfo, _baseline, ui, onExit) {
  // Ensure the user's chosen background music (default: Cyber Synth) is playing
  startBackgroundMusic();

  return new Promise((resolve) => {
    const ctx = canvasEl.getContext('2d');
    let rafId = null;
    let isTerminated = false;

    const stats = {
      score: 0, correct: 0, total: 0,
      reactionTimes: [], longestStreak: 0,
    };
    let streak = 0;

    const roundHistory = [];

    let roundIdx   = 0;
    let state      = 'ARM';    
    let stateStart = performance.now();

    let currentCue     = pickStroopCue();
    let currentColor   = currentCue.inkColor;
    let targetGesture  = currentCue.targetGesture;
    let cueTriggeredAt = -1;   
    let t0             = -1;   

    let runLabel  = null;   
    let runCount  = 0;      
    let runStart  = -1;     

    let isPaused       = false;
    let pauseStartTime = -1;

    function togglePause() {
      if (isTerminated) return;
      if (isPaused) {
        // Unpause: shift timestamps so time elapsed while paused does not penalize the player
        const pauseDuration = performance.now() - pauseStartTime;
        t0 += pauseDuration;
        stateStart += pauseDuration;
        cueTriggeredAt += pauseDuration;
        if (runStart > 0) runStart += pauseDuration;
        isPaused = false;
        ui.hidePauseModal?.();
      } else {
        // Pause: open pause modal and store timestamp
        isPaused = true;
        pauseStartTime = performance.now();
        ui.showPauseModal?.(
          {
            round: `${Math.min(roundIdx + 1, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`,
            score: stats.score,
            streak: streak,
          },
          // onResume
          () => togglePause(),
          // onRestart
          () => {
            isTerminated = true;
            if (rafId) cancelAnimationFrame(rafId);
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            resolve({ restart: true, stats });
          },
          // onExit
          () => handleExit()
        );
      }
    }
    ui.setPauseHandler?.(togglePause);

    function handleExit() {
      if (isTerminated) return;
      isTerminated = true;
      if (rafId) cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ui.hideFeedback();
      startBackgroundMusic();

      if (roundHistory.length > 0) {
        sendSessionToBackend(playerInfo, stats, roundHistory);
      }

      resolve({ exit: true, stats });
      onExit?.();
    }
    ui.setExitHandler(handleExit);

    ui.setPlayerName(playerInfo.name);
    ui.setRound(1, TOTAL_ROUNDS);
    ui.setScore(0);
    ui.setStreak(0);
    if (ui.updateLiveStats) {
      ui.updateLiveStats(stats, streak, 1, TOTAL_ROUNDS);
    }
    ui.showArm();

    function loop() {
      if (isTerminated) return;
      if (videoEl.readyState < 2) { rafId = requestAnimationFrame(loop); return; }
      if (canvasEl.width !== videoEl.videoWidth && videoEl.videoWidth > 0) {
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
      }

      const now = performance.now();
      const det = tracker.detect(videoEl);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      const activeColor = ui.getStageColor ? ui.getStageColor() : '#38bdf8';
      if (det.landmarks) drawHand(ctx, det.landmarks, activeColor);

      if (isPaused) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const label = classifyGesture(det.landmarks);
      const conf  = getGestureConfidence(det.landmarks, label);

      switch (state) {

        case 'ARM': {
          if (ui.updateDetection) ui.updateDetection(label, 0);
          if (isRest(label)) {
            if (now - stateStart >= ARM_HOLD_MS) {
              const delay = DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
              cueTriggeredAt = now + delay;
              transitionTo('DELAY', now);
              ui.showDelay();
            }
          } else {
            stateStart = now; 
          }
          break;
        }

        case 'DELAY': {
          if (ui.updateDetection) ui.updateDetection(label, 0);
          if (isMapped(label) && conf >= CONF_THRESH) {
            transitionTo('ARM', now);
            ui.showFalseStart();
            setTimeout(() => { if (state === 'ARM' && !isTerminated) ui.showArm(); }, 1200);
          } else if (now >= cueTriggeredAt) {
            const currentTimeout = getRoundTimeout(roundIdx, TOTAL_ROUNDS);
            t0 = now;
            runLabel = null; runCount = 0; runStart = -1;
            transitionTo('CUE', now);
            ui.showCue(currentCue, currentTimeout);
          }
          break;
        }

        case 'CUE': {
          const currentTimeout = getRoundTimeout(roundIdx, TOTAL_ROUNDS);

          if (ui.updateTimeoutBar) {
            ui.updateTimeoutBar(now - t0, currentTimeout);
          }

          const isTarget  = label === targetGesture && conf >= CONF_THRESH;
          const isWrong   = isMapped(label)          && conf >= CONF_THRESH && label !== targetGesture;

          // If the player is actively confirming the correct gesture, allow a 400ms grace period so confirmation finishes
          const isConfirming = isTarget && runLabel === targetGesture && runCount >= 1;
          const effectiveTimeout = isConfirming ? currentTimeout + 400 : currentTimeout;

          if (now - t0 >= effectiveTimeout) {
            if (ui.updateDetection) ui.updateDetection(label, 0);
            recordResult('timeout', null, currentCue, targetGesture, null);
            transitionTo('FEEDBACK', now);
            ui.showFeedback('timeout', null, targetGesture, null, currentCue);
            break;
          }

          if (isTarget || isWrong) {
            if (label === runLabel) {
              runCount++;
              if (runCount === 1) runStart = now;
              const threshold = isTarget ? CONFIRM_N : CONFIRM_WRONG_N;
              const progress = Math.min(1, runCount / threshold);
              if (ui.updateDetection) ui.updateDetection(label, progress);

              if (runCount >= threshold) {
                const rt = runStart - t0;
                if (ui.updateDetection) ui.updateDetection(label, 1);
                if (isTarget) {
                  playCorrect();
                  recordResult('correct', rt, currentCue, targetGesture, label);
                  ui.showFeedback('correct', rt, targetGesture, label, currentCue);
                } else {
                  playWrong();
                  recordResult('wrong', rt, currentCue, targetGesture, label);
                  ui.showFeedback('wrong', rt, targetGesture, label, currentCue);
                }
                transitionTo('FEEDBACK', now);
              }
            } else {
              runLabel = label;
              runCount = 1;
              runStart = now;
              const threshold = isTarget ? CONFIRM_N : CONFIRM_WRONG_N;
              if (ui.updateDetection) ui.updateDetection(label, Math.min(1, 1 / threshold));
            }
          } else {
            if (label !== runLabel) {
              runLabel = label;
              runCount = 0;
              runStart = -1;
            }
            if (ui.updateDetection) ui.updateDetection(label, 0);
          }
          break;
        }

        case 'FEEDBACK': {
          if (ui.updateDetection) ui.updateDetection(label, 0);
          if (now - stateStart >= FEEDBACK_MS) {
            ui.hideFeedback();
            roundIdx++;
            if (roundIdx >= TOTAL_ROUNDS) {
              isTerminated = true;
              cancelAnimationFrame(rafId);
              ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
              playCompletion();

              sendSessionToBackend(playerInfo, stats, roundHistory);

              startBackgroundMusic();
              ui.showResults(
                stats,
                playerInfo,
                roundHistory,
                () => resolve({ restart: true, stats }),
                () => { startBackgroundMusic(); resolve({ exit: true, stats }); onExit?.(); }
              );
              return;
            }

            const startNextRound = () => {
              currentCue    = pickStroopCue();
              currentColor  = currentCue.inkColor;
              targetGesture = currentCue.targetGesture;
              runLabel = null; runCount = 0; runStart = -1;
              transitionTo('ARM', performance.now());
              ui.setRound(roundIdx + 1, TOTAL_ROUNDS);
              if (ui.updateLiveStats) {
                ui.updateLiveStats(stats, streak, roundIdx + 1, TOTAL_ROUNDS);
              }
              ui.showArm();
            };

            if (roundIdx === 10) {
              // 10 rounds done -> Entering Round 11: Alert for increased difficulty
              transitionTo('MILESTONE', now);
              ui.showMilestoneAlert?.('halfway', () => {
                if (!isTerminated) startNextRound();
              });
            } else if (roundIdx === 15) {
              // 15 rounds done -> Entering Round 16: Alert for final 5 chances
              transitionTo('MILESTONE', now);
              ui.showMilestoneAlert?.('final5', () => {
                if (!isTerminated) startNextRound();
              });
            } else {
              startNextRound();
            }
          }
          break;
        }

        case 'MILESTONE': {
          if (ui.updateDetection) ui.updateDetection(label, 0);
          break;
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    function transitionTo(newState, now) {
      state = newState;
      stateStart = now;
    }

    function isMapped(label) { return MAPPED.has(label); }

    function recordResult(outcome, rt, cue, target, detected) {
      stats.total++;
      const inkColor = typeof cue === 'object' ? cue.inkColor : cue;
      const wordColor = typeof cue === 'object' ? cue.wordColor : cue;
      roundHistory.push({
        outcome,
        rt,
        color: inkColor,
        word: wordColor,
        target,
        detected,
      });

      if (outcome === 'correct') {
        streak++;
        stats.correct++;
        stats.longestStreak = Math.max(stats.longestStreak, streak);
        if (rt != null) stats.reactionTimes.push(rt);

        const bonus = Math.floor(streak / 3) * 5;
        stats.score += SCORE_BASE + bonus;
      } else {
        streak = 0;
      }

      ui.setScore(stats.score);
      ui.setStreak(streak);
      if (ui.updateLiveStats) {
        ui.updateLiveStats(stats, streak, roundIdx + 1, TOTAL_ROUNDS);
      }
    }
  });
}

