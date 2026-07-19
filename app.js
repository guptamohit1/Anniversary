/* ==========================================================================
   APP.JS — Anniversary Invitation Logic
   - Envelope open animation
   - Countdown timer
   - YouTube IFrame audio player (autoplay)
   - Scroll reveal animations
   ========================================================================== */

'use strict';

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────
const EVENT_DATE = new Date('November 21, 2026 19:00:00');
const YT_VIDEO_ID = 'bpXyk6sxsh4'; // Wang Da Naap — Ammy Virk

// ──────────────────────────────────────────────────────────────────────────────
// DOM REFERENCES
// ──────────────────────────────────────────────────────────────────────────────
const landingScreen   = document.getElementById('landing-screen');
const envelopeScene   = document.getElementById('envelope-scene');
const envelopeWrapper = document.getElementById('envelope-wrapper');
const tapToOpen       = document.getElementById('tap-to-open');
const mainSite        = document.getElementById('main-site');

const cdDays    = document.getElementById('cd-days');
const cdHours   = document.getElementById('cd-hours');
const cdMinutes = document.getElementById('cd-minutes');

const btnPlayPause  = document.getElementById('btn-play-pause');
const playIcon      = document.getElementById('play-icon');
const pauseIcon     = document.getElementById('pause-icon');
const progressFill  = document.getElementById('audio-progress-fill');
const progressThumb = document.getElementById('audio-progress-thumb');
const progressBar   = document.getElementById('audio-progress-bar');
const currentTimeEl = document.getElementById('audio-current-time');
const totalTimeEl   = document.getElementById('audio-total-time');

// ──────────────────────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────────────────────
let isOpened       = false;
let ytPlayer       = null;
let ytReady        = false;
let isPlaying      = false;
let progressInterval = null;

// ──────────────────────────────────────────────────────────────────────────────
// ENVELOPE OPEN
// ──────────────────────────────────────────────────────────────────────────────
function openInvitation() {
  if (isOpened) return;
  isOpened = true;

  // Animate envelope open
  envelopeScene.classList.add('open');

  // After card peeks, fade out landing and reveal main
  setTimeout(() => {
    landingScreen.classList.add('fade-out');
  }, 1600);

  setTimeout(() => {
    landingScreen.classList.add('hidden');
    mainSite.classList.remove('hidden');

    // Boot systems
    initCountdown();
    initScrollReveal();

    // Start music (YouTube autoplay)
    if (ytReady && ytPlayer) {
      tryAutoplay();
    }
  }, 2500);
}

// Tap targets
envelopeWrapper.addEventListener('click', openInvitation);
envelopeWrapper.addEventListener('touchstart', openInvitation, { passive: true });

// ──────────────────────────────────────────────────────────────────────────────
// COUNTDOWN TIMER
// ──────────────────────────────────────────────────────────────────────────────
function initCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 60000); // update every minute
}

function updateCountdown() {
  const now  = Date.now();
  const diff = EVENT_DATE.getTime() - now;

  if (diff <= 0) {
    cdDays.textContent    = '000';
    cdHours.textContent   = '00';
    cdMinutes.textContent = '00';
    return;
  }

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  cdDays.textContent    = String(days).padStart(3, '0');
  cdHours.textContent   = String(hours).padStart(2, '0');
  cdMinutes.textContent = String(minutes).padStart(2, '0');
}

// ──────────────────────────────────────────────────────────────────────────────
// YOUTUBE IFRAME API
// ──────────────────────────────────────────────────────────────────────────────
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('yt-player', {
    height: '1',
    width: '1',
    videoId: YT_VIDEO_ID,
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      iv_load_policy: 3,
      loop: 1,
      modestbranding: 1,
      origin: window.location.origin || 'http://localhost',
      playlist: YT_VIDEO_ID,
    },
    events: {
      onReady: onYTReady,
      onStateChange: onYTStateChange,
      onError: onYTError,
    },
  });
};

function onYTReady(event) {
  ytReady = true;
  // Try to get total duration once loaded
  const dur = event.target.getDuration();
  if (dur) {
    totalTimeEl.textContent = formatTime(dur);
  }

  // If user has already opened the invitation, start playing
  if (isOpened) {
    tryAutoplay();
  }
}

function onYTStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    setPlayUI(true);
    startProgressPoll();
    // Update total duration
    const dur = ytPlayer.getDuration();
    if (dur) totalTimeEl.textContent = formatTime(dur);
  } else if (
    event.data === YT.PlayerState.PAUSED ||
    event.data === YT.PlayerState.ENDED
  ) {
    setPlayUI(false);
    stopProgressPoll();
    if (event.data === YT.PlayerState.ENDED) {
      // Loop
      ytPlayer.seekTo(0);
      ytPlayer.playVideo();
    }
  }
}

function onYTError(event) {
  console.warn('YouTube player error:', event.data);
  // Gracefully: just show a note
  const wrap = document.getElementById('audio-player-wrap');
  if (wrap) {
    const note = document.createElement('p');
    note.style.cssText = 'font-size:0.72rem;color:var(--muted);font-family:var(--font-sc);letter-spacing:0.1em;margin-top:0.6rem;';
    note.textContent = 'Open in browser with network to hear the song.';
    wrap.appendChild(note);
  }
}

function tryAutoplay() {
  if (!ytPlayer || !ytReady) return;
  // Browsers may block autoplay without user gesture; we try anyway.
  try {
    ytPlayer.mute();          // muted autoplay is usually allowed
    ytPlayer.playVideo();
    // Unmute after a short delay to try getting audio
    setTimeout(() => {
      try { ytPlayer.unMute(); } catch(e) {}
    }, 800);
  } catch (e) {
    console.warn('Autoplay blocked:', e);
  }
}

// ── AUDIO CONTROLS ──
btnPlayPause.addEventListener('click', () => {
  if (!ytPlayer || !ytReady) return;
  if (isPlaying) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
});

document.getElementById('btn-prev')?.addEventListener('click', () => {
  if (!ytPlayer || !ytReady) return;
  const curr = ytPlayer.getCurrentTime();
  ytPlayer.seekTo(Math.max(0, curr - 10));
});

document.getElementById('btn-next')?.addEventListener('click', () => {
  if (!ytPlayer || !ytReady) return;
  const curr = ytPlayer.getCurrentTime();
  ytPlayer.seekTo(curr + 10);
});

// Click on progress bar to seek
progressBar?.addEventListener('click', (e) => {
  if (!ytPlayer || !ytReady) return;
  const rect = progressBar.getBoundingClientRect();
  const pct  = (e.clientX - rect.left) / rect.width;
  const dur  = ytPlayer.getDuration();
  if (dur) ytPlayer.seekTo(pct * dur);
});

function setPlayUI(playing) {
  isPlaying = playing;
  if (playing) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    pauseIcon.classList.add('hidden');
    playIcon.classList.remove('hidden');
  }
}

function startProgressPoll() {
  stopProgressPoll();
  progressInterval = setInterval(updateProgress, 500);
}

function stopProgressPoll() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function updateProgress() {
  if (!ytPlayer || !ytReady) return;
  try {
    const curr = ytPlayer.getCurrentTime();
    const dur  = ytPlayer.getDuration();
    if (!dur) return;

    const pct = (curr / dur) * 100;
    progressFill.style.width  = pct + '%';
    progressThumb.style.left  = pct + '%';
    currentTimeEl.textContent = formatTime(curr);
    totalTimeEl.textContent   = formatTime(dur);
  } catch(e) {}
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// SCROLL REVEAL (IntersectionObserver)
// ──────────────────────────────────────────────────────────────────────────────
function initScrollReveal() {
  const elements = mainSite.querySelectorAll('.reveal-on-scroll');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Stagger children in the same parent
          const siblings = entry.target.parentElement
            ? Array.from(entry.target.parentElement.querySelectorAll('.reveal-on-scroll'))
            : [entry.target];
          const idx = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = `${idx * 0.12}s`;
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}
