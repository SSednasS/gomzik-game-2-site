/* ==========================================================================
   GOMZIK GAME 2 — Modernist Interactive Experience
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Theme Toggle (ДЕНЬ / ТЕНЬ МАМЫ)
     ------------------------------------------------------------------------ */
  const themeBtn = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');
  const rootEl = document.documentElement;

  const savedTheme = localStorage.getItem('gomzik_theme') || 'light';
  applyTheme(savedTheme);

  function applyTheme(theme) {
    rootEl.setAttribute('data-theme', theme);
    themeLabel.textContent = theme === 'dark' ? 'ТЕНЬ МАМЫ' : 'ДЕНЬ';
    localStorage.setItem('gomzik_theme', theme);
  }

  themeBtn.addEventListener('click', () => {
    const next = rootEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  /* ------------------------------------------------------------------------
     2. Archetype Tabs
     ------------------------------------------------------------------------ */
  const archTabs = document.querySelectorAll('.arch-tab');
  const archPanels = document.querySelectorAll('.arch-panel');

  archTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.arch;
      archTabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      archPanels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(`arch-${target}`).classList.add('active');
    });
  });

  /* ------------------------------------------------------------------------
     3. GOMZIK PLAYER (Web Audio API Chiptune Synthesizer + Visualizer)
     ------------------------------------------------------------------------ */
  const tracks = [
    {
      title: 'Залетаю в лобби!',
      durationSec: 27,
      bpm: 138,
      wave: 'square',
      notes: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 349.23],
      accent: '#e85d1a',
      src: 'assets/audio/zaletayu-v-lobbi.mp3',
    },
    {
      title: 'Чёрное окно',
      durationSec: 25,
      bpm: 92,
      wave: 'triangle',
      notes: [220.0, 246.94, 261.63, 196.0, 174.61, 164.81, 196.0, 220.0],
      accent: '#1694e8',
      src: 'assets/audio/chernoe-okno.mp3',
    },
    {
      title: 'gomzik do 5 (remix)',
      durationSec: 194,
      bpm: 126,
      wave: 'sawtooth',
      notes: [293.66, 349.23, 440.0, 587.33, 523.25, 440.0, 392.0, 349.23],
      accent: '#d90429',
      src: 'assets/audio/ggomzik.mp3',
    },
  ];

  const realAudio = new Audio();
  realAudio.preload = 'metadata';

  let currentTrackIdx = 0;
  let isPlaying = false;
  let elapsedSec = 0;
  let audioCtx = null;
  let masterGain = null;
  let stepTimer = null;
  let secTimer = null;
  let noteStep = 0;

  const trackItems = document.querySelectorAll('.track-item');
  const nowTitleEl = document.getElementById('nowPlayingTitle');
  const nowTimeEl = document.getElementById('nowPlayingTime');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const prevBtn = document.getElementById('prevTrackBtn');
  const nextBtn = document.getElementById('nextTrackBtn');
  const volSlider = document.getElementById('playerVolume');
  const vizCanvas = document.getElementById('visualizerCanvas');
  const vizCtx = vizCanvas.getContext('2d');

  function formatTime(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = (Number(volSlider.value) / 100) * 0.16;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playNote(freq, wave, durationMs) {
    if (!audioCtx || !masterGain) return;
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    env.gain.setValueAtTime(0.001, audioCtx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.9, audioCtx.currentTime + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);

    osc.connect(env);
    env.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000 + 0.02);
  }

  function selectTrack(idx, autoPlay) {
    currentTrackIdx = (idx + tracks.length) % tracks.length;
    elapsedSec = 0;
    noteStep = 0;

    trackItems.forEach((el, i) => {
      el.classList.toggle('active', i === currentTrackIdx);
    });

    nowTitleEl.textContent = tracks[currentTrackIdx].title;
    nowTimeEl.textContent = formatTime(0);

    if (isPlaying || autoPlay) {
      startPlayback();
    }
  }

  function startPlayback() {
    stopTimers();
    realAudio.pause();
    isPlaying = true;
    playPauseBtn.textContent = '⏸';

    const track = tracks[currentTrackIdx];
    if (track.src) {
      if (!realAudio.src.endsWith(track.src)) {
        realAudio.src = track.src;
      }
      realAudio.volume = Number(volSlider.value) / 100;
      realAudio.currentTime = elapsedSec;
      realAudio.play().catch(() => {});

      secTimer = setInterval(() => {
        elapsedSec = Math.floor(realAudio.currentTime);
        nowTimeEl.textContent = formatTime(elapsedSec);
      }, 250);
      return;
    }

    ensureAudio();
    const intervalMs = Math.round((60 / track.bpm) * 500);

    stepTimer = setInterval(() => {
      const freq = track.notes[noteStep % track.notes.length];
      playNote(freq, track.wave, intervalMs * 0.85);
      noteStep++;
    }, intervalMs);

    secTimer = setInterval(() => {
      elapsedSec++;
      if (elapsedSec >= track.durationSec) {
        selectTrack(currentTrackIdx + 1, true);
        return;
      }
      nowTimeEl.textContent = formatTime(elapsedSec);
    }, 1000);
  }

  function pausePlayback() {
    isPlaying = false;
    playPauseBtn.textContent = '▶';
    realAudio.pause();
    stopTimers();
  }

  realAudio.addEventListener('ended', () => {
    selectTrack(currentTrackIdx + 1, true);
  });

  function stopTimers() {
    if (stepTimer) clearInterval(stepTimer);
    if (secTimer) clearInterval(secTimer);
    stepTimer = null;
    secTimer = null;
  }

  playPauseBtn.addEventListener('click', () => {
    if (isPlaying) pausePlayback();
    else startPlayback();
  });

  prevBtn.addEventListener('click', () => selectTrack(currentTrackIdx - 1, isPlaying));
  nextBtn.addEventListener('click', () => selectTrack(currentTrackIdx + 1, isPlaying));

  trackItems.forEach((item) => {
    item.addEventListener('click', () => {
      const idx = Number(item.dataset.index);
      selectTrack(idx, true);
    });
  });

  volSlider.addEventListener('input', () => {
    const v = Number(volSlider.value) / 100;
    realAudio.volume = v;
    if (masterGain) {
      masterGain.gain.value = v * 0.16;
    }
  });

  function drawVisualizer() {
    const w = vizCanvas.width;
    const h = vizCanvas.height;
    vizCtx.clearRect(0, 0, w, h);

    const track = tracks[currentTrackIdx];
    const bars = 28;
    const barW = w / bars;
    const t = performance.now() * 0.005;

    for (let i = 0; i < bars; i++) {
      const amp = isPlaying
        ? (Math.sin(t + i * 0.55) * 0.4 + Math.cos(t * 1.4 - i * 0.3) * 0.3 + 0.55)
        : 0.08 + Math.sin(i * 0.5) * 0.04;
      const barH = Math.max(6, amp * (h - 24));
      vizCtx.fillStyle = i % 3 === 0 ? track.accent : '#111111';
      vizCtx.fillRect(i * barW + 4, h - barH - 8, barW - 8, barH);
    }
    requestAnimationFrame(drawVisualizer);
  }
  drawVisualizer();

  /* ------------------------------------------------------------------------
     4. Playable Mini-Game: «НАЙДИ МОНИТОР!»
     ------------------------------------------------------------------------ */
  const canvas = document.getElementById('gomzikCanvas');
  const ctx = canvas.getContext('2d');
  const keyCounterEl = document.getElementById('keyCounter');
  const statusEl = document.getElementById('gameStatusText');
  const restartBtn = document.getElementById('restartGameBtn');

  const input = { left: false, right: false, jump: false };

  const platforms = [
    { x: 20, y: 340, w: 170, h: 80 },
    { x: 230, y: 270, w: 120, h: 60 },
    { x: 395, y: 205, w: 120, h: 60 },
    { x: 560, y: 295, w: 115, h: 45 },
    { x: 720, y: 230, w: 220, h: 190 },
  ];

  const spikeZone = { x: 190, y: 392, w: 530, h: 28 };

  let player = {};
  let keys = [];
  let monitor = { x: 865, y: 178, w: 46, h: 40 };
  let gameWon = false;

  function resetGame() {
    player = {
      x: 70,
      y: 280,
      w: 24,
      h: 48,
      vx: 0,
      vy: 0,
      onGround: false,
    };
    keys = [
      { x: 285, y: 242, collected: false },
      { x: 450, y: 175, collected: false },
      { x: 615, y: 265, collected: false },
    ];
    gameWon = false;
    keyCounterEl.textContent = '0/3';
    statusEl.textContent = 'Соберите 3 ключа и коснитесь монитора! (← → / A D, Пробел)';
  }

  function updateGame() {
    if (!gameWon) {
      const speed = 3.8;
      if (input.left) player.vx = -speed;
      else if (input.right) player.vx = speed;
      else player.vx *= 0.72;

      if (input.jump && player.onGround) {
        player.vy = -10.8;
        player.onGround = false;
      }

      player.vy += 0.52;
      player.x += player.vx;
      player.y += player.vy;

      if (player.x < 0) player.x = 0;
      if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;

      player.onGround = false;
      for (const p of platforms) {
        const withinX = player.x + player.w > p.x + 4 && player.x < p.x + p.w - 4;
        const wasAbove = player.y + player.h - player.vy <= p.y + 8;
        if (withinX && wasAbove && player.y + player.h >= p.y && player.vy >= 0) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      }

      // Collect keys
      let collectedCount = 0;
      for (const k of keys) {
        if (!k.collected) {
          const dx = player.x + player.w / 2 - k.x;
          const dy = player.y + player.h / 2 - k.y;
          if (Math.hypot(dx, dy) < 28) {
            k.collected = true;
          }
        }
        if (k.collected) collectedCount++;
      }
      keyCounterEl.textContent = `${collectedCount}/3`;

      // Check spikes or fall
      if (
        player.y > canvas.height ||
        (player.x + player.w > spikeZone.x &&
          player.x < spikeZone.x + spikeZone.w &&
          player.y + player.h >= spikeZone.y)
      ) {
        statusEl.textContent = 'Ой! Шипы! Попробуйте ещё раз.';
        resetGame();
      }

      // Check monitor goal
      if (
        collectedCount === 3 &&
        player.x + player.w > monitor.x &&
        player.x < monitor.x + monitor.w &&
        player.y + player.h > monitor.y &&
        player.y < monitor.y + monitor.h
      ) {
        gameWon = true;
        statusEl.textContent = 'ПОБЕДА! Монитор найден — путь к Gomzik Player открыт!';
      }
    }

    drawGame();
    requestAnimationFrame(updateGame);
  }

  function drawGame() {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#36b9ff');
    sky.addColorStop(0.78, '#9be4ff');
    sky.addColorStop(1, '#79d70f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [
      [140, 85, 60],
      [420, 65, 75],
      [760, 95, 65],
    ].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.5, cy - 10, r * 0.6, 0, Math.PI * 2);
      ctx.arc(cx + r, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Platforms (brown dirt + green grass top)
    for (const p of platforms) {
      ctx.fillStyle = '#8b3e24';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#249f1a';
      ctx.fillRect(p.x, p.y, p.w, 14);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }

    // Spikes
    ctx.fillStyle = '#7e7d8a';
    ctx.strokeStyle = '#111';
    for (let sx = spikeZone.x; sx < spikeZone.x + spikeZone.w; sx += 18) {
      ctx.beginPath();
      ctx.moveTo(sx, canvas.height);
      ctx.lineTo(sx + 9, spikeZone.y);
      ctx.lineTo(sx + 18, canvas.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Keys
    keys.forEach((k) => {
      if (k.collected) return;
      ctx.fillStyle = '#ffd60a';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(k.x - 6, k.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(k.x + 1, k.y - 2, 13, 4);
      ctx.fillRect(k.x + 9, k.y + 2, 3, 5);
    });

    // Monitor goal
    const allKeys = keys.every((k) => k.collected);
    ctx.fillStyle = '#222';
    ctx.fillRect(monitor.x, monitor.y, monitor.w, monitor.h);
    ctx.fillStyle = allKeys ? '#38bdf8' : '#555';
    ctx.fillRect(monitor.x + 4, monitor.y + 4, monitor.w - 8, monitor.h - 12);
    ctx.fillStyle = '#111';
    ctx.fillRect(monitor.x + 17, monitor.y + monitor.h, 12, 12);
    if (allKeys) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('OK!', monitor.x + 14, monitor.y + 22);
    }

    // Gomzik character (orange head + white shirt + stick legs)
    const px = player.x;
    const py = player.y;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.5;
    // Legs
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 34);
    ctx.lineTo(px + 8, py + 48);
    ctx.moveTo(px + 16, py + 34);
    ctx.lineTo(px + 16, py + 48);
    ctx.stroke();
    // Shirt
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 4, py + 18, 16, 17);
    ctx.strokeRect(px + 4, py + 18, 16, 17);
    // Head
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(px + 12, py + 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Eyes
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 8, py + 8, 2.5, 2.5);
    ctx.fillRect(px + 14, py + 8, 2.5, 2.5);
  }

  window.addEventListener('keydown', (e) => {
    if (document.activeElement === canvas || ['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        input.jump = true;
        if (document.activeElement === canvas) e.preventDefault();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') input.jump = false;
  });

  function bindTouch(id, key) {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input[key] = true;
    });
    el.addEventListener('pointerup', () => (input[key] = false));
    el.addEventListener('pointerleave', () => (input[key] = false));
  }
  bindTouch('btnLeft', 'left');
  bindTouch('btnRight', 'right');
  bindTouch('btnJump', 'jump');

  restartBtn.addEventListener('click', resetGame);
  resetGame();
  updateGame();

  /* ------------------------------------------------------------------------
     5. Filterable Gallery + Lightbox
     ------------------------------------------------------------------------ */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = Array.from(document.querySelectorAll('.gallery-card'));

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !show);
      });
    });
  });

  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCaption = document.getElementById('lbCaption');
  const lbClose = document.getElementById('lbClose');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  let activeCardIdx = 0;

  function openLightbox(idx) {
    activeCardIdx = (idx + cards.length) % cards.length;
    const card = cards[activeCardIdx];
    lbImg.src = card.dataset.src;
    lbCaption.textContent = card.dataset.caption;
    lightbox.hidden = false;
  }

  cards.forEach((card, idx) => {
    card.addEventListener('click', () => openLightbox(idx));
  });

  lbClose.addEventListener('click', () => (lightbox.hidden = true));
  lbPrev.addEventListener('click', () => openLightbox(activeCardIdx - 1));
  lbNext.addEventListener('click', () => openLightbox(activeCardIdx + 1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.hidden = true;
  });

  window.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') lightbox.hidden = true;
    if (e.key === 'ArrowLeft') openLightbox(activeCardIdx - 1);
    if (e.key === 'ArrowRight') openLightbox(activeCardIdx + 1);
  });
})();
