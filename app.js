'use strict';

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────
// Month is 0-indexed: 10 = November
const EVENT_DATE = new Date(2026, 10, 21, 19, 0, 0);
const YT_VIDEO_ID = 'bpXyk6sxsh4'; // Wang Da Naap — Ammy Virk

// ──────────────────────────────────────────────────────────────────────────────
// DOM REFERENCES (resolved after DOM loads)
// ──────────────────────────────────────────────────────────────────────────────
let landingScreen, envelopeScene, envelopeWrapper, mainSite;
let cdDays, cdHours, cdMinutes;
let btnPlayPause, playIcon, pauseIcon;
let progressFill, progressThumb, progressBar;
let currentTimeEl, totalTimeEl;

// ──────────────────────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────────────────────
let isOpened         = false;
let ytPlayer         = null;
let ytReady          = false;
let isPlaying        = false;
let progressInterval = null;
let playRequestedByUser = false; // set true when envelope is tapped

// ──────────────────────────────────────────────────────────────────────────────
// INIT — wait for DOM
// ──────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  landingScreen   = document.getElementById('landing-screen');
  envelopeScene   = document.getElementById('envelope-scene');
  envelopeWrapper = document.getElementById('envelope-wrapper');
  mainSite        = document.getElementById('main-site');

  cdDays    = document.getElementById('cd-days');
  cdHours   = document.getElementById('cd-hours');
  cdMinutes = document.getElementById('cd-minutes');

  btnPlayPause  = document.getElementById('btn-play-pause');
  playIcon      = document.getElementById('play-icon');
  pauseIcon     = document.getElementById('pause-icon');
  progressFill  = document.getElementById('audio-progress-fill');
  progressThumb = document.getElementById('audio-progress-thumb');
  progressBar   = document.getElementById('audio-progress-bar');
  currentTimeEl = document.getElementById('audio-current-time');
  totalTimeEl   = document.getElementById('audio-total-time');

  // Wire envelope tap
  envelopeWrapper.addEventListener('click', openInvitation);
  envelopeWrapper.addEventListener('touchstart', openInvitation, { passive: true });

  // Wire audio controls
  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      if (!ytPlayer || !ytReady) return;
      if (isPlaying) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.playVideo();
      }
    });
  }

  document.getElementById('btn-prev')?.addEventListener('click', () => {
    if (!ytPlayer || !ytReady) return;
    ytPlayer.seekTo(Math.max(0, ytPlayer.getCurrentTime() - 10));
  });

  document.getElementById('btn-next')?.addEventListener('click', () => {
    if (!ytPlayer || !ytReady) return;
    ytPlayer.seekTo(ytPlayer.getCurrentTime() + 10);
  });

  progressBar?.addEventListener('click', (e) => {
    if (!ytPlayer || !ytReady) return;
    const rect = progressBar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur  = ytPlayer.getDuration();
    if (dur) ytPlayer.seekTo(pct * dur);
  });

  // Show live countdown even on landing screen (updates every second)
  updateCountdown();
  setInterval(updateCountdown, 1000);
});

// ──────────────────────────────────────────────────────────────────────────────
// ENVELOPE OPEN
// ──────────────────────────────────────────────────────────────────────────────
function openInvitation() {
  if (isOpened) return;
  isOpened = true;

  // 1. Animate envelope flap
  envelopeScene.classList.add('open');

  // 2. *** PLAY MUSIC IMMEDIATELY — still inside user-gesture event ***
  //    Browsers allow play() calls that happen synchronously or very
  //    close to the originating user gesture. This is the key fix.
  playRequestedByUser = true;
  if (ytReady && ytPlayer) {
    ytPlayer.playVideo();
  }
  // If ytPlayer isn't ready yet, playRequestedByUser flag will trigger
  // playback as soon as onYTReady fires (see below).

  // 3. Fade out landing overlay
  setTimeout(() => {
    landingScreen.classList.add('fade-out');
  }, 1600);

  // 4. Reveal main site + start scroll reveal
  setTimeout(() => {
    landingScreen.classList.add('hidden');
    mainSite.classList.remove('hidden');
    initScrollReveal();
  }, 2500);
}

// ──────────────────────────────────────────────────────────────────────────────
// COUNTDOWN — updates every second
// ──────────────────────────────────────────────────────────────────────────────
function updateCountdown() {
  // Guard: elements may not exist yet during very early calls
  if (!cdDays || !cdHours || !cdMinutes) return;

  const now  = Date.now();
  const diff = EVENT_DATE.getTime() - now;

  if (diff <= 0) {
    cdDays.textContent    = '000';
    cdHours.textContent   = '00';
    cdMinutes.textContent = '00';
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days         = Math.floor(totalSeconds / 86400);
  const hours        = Math.floor((totalSeconds % 86400) / 3600);
  const minutes      = Math.floor((totalSeconds % 3600) / 60);

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
      autoplay:       0,
      controls:       0,
      disablekb:      1,
      enablejsapi:    1,
      fs:             0,
      iv_load_policy: 3,
      loop:           1,
      modestbranding: 1,
      playlist:       YT_VIDEO_ID,   // required for loop
      rel:            0,
    },
    events: {
      onReady:       onYTReady,
      onStateChange: onYTStateChange,
      onError:       onYTError,
    },
  });
};

function onYTReady() {
  ytReady = true;

  // If user already tapped envelope before player was ready, play now.
  // This is still acceptable — the user gesture initiated the request.
  if (playRequestedByUser) {
    ytPlayer.playVideo();
  }
}

function onYTStateChange(event) {
  switch (event.data) {
    case YT.PlayerState.PLAYING:
      setPlayUI(true);
      startProgressPoll();
      totalTimeEl.textContent = formatTime(ytPlayer.getDuration() || 0);
      break;

    case YT.PlayerState.PAUSED:
      setPlayUI(false);
      stopProgressPoll();
      break;

    case YT.PlayerState.ENDED:
      // Loop manually (in case playlist loop glitches)
      ytPlayer.seekTo(0);
      ytPlayer.playVideo();
      break;

    default:
      break;
  }
}

function onYTError(event) {
  console.warn('YouTube player error:', event.data);
  const wrap = document.getElementById('audio-player-wrap');
  if (wrap && !wrap.querySelector('.yt-error-note')) {
    const note = document.createElement('p');
    note.className = 'yt-error-note';
    note.style.cssText = 'font-size:0.7rem;color:var(--muted);font-family:var(--font-sc);letter-spacing:0.1em;margin-top:0.5rem;opacity:0.7;';
    note.textContent = 'Requires internet connection to stream the song.';
    wrap.appendChild(note);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// AUDIO PLAYER UI HELPERS
// ──────────────────────────────────────────────────────────────────────────────
function setPlayUI(playing) {
  isPlaying = playing;
  if (playing) {
    playIcon?.classList.add('hidden');
    pauseIcon?.classList.remove('hidden');
  } else {
    pauseIcon?.classList.add('hidden');
    playIcon?.classList.remove('hidden');
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
    const curr = ytPlayer.getCurrentTime() || 0;
    const dur  = ytPlayer.getDuration()    || 0;
    if (!dur) return;

    const pct = (curr / dur) * 100;
    if (progressFill)  progressFill.style.width = pct + '%';
    if (progressThumb) progressThumb.style.left  = pct + '%';
    if (currentTimeEl) currentTimeEl.textContent = formatTime(curr);
    if (totalTimeEl)   totalTimeEl.textContent   = formatTime(dur);
  } catch (e) { /* ignore */ }
}

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
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
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
  );

  // Stagger reveals within each section
  const sections = mainSite.querySelectorAll('.section');
  sections.forEach((sec) => {
    const items = sec.querySelectorAll('.reveal-on-scroll');
    items.forEach((el, i) => {
      el.style.transitionDelay = `${i * 0.12}s`;
    });
  });

  elements.forEach((el) => observer.observe(el));
}
