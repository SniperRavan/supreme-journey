/* ════════════════════════════════════════════════
   FOCUSROOM — script.js
   ════════════════════════════════════════════════ */

'use strict';

/* ── Cursor ───────────────────────────────────── */
const cursorDot  = document.getElementById('cursor-dot');
const cursorHalo = document.getElementById('cursor-halo');
let mouseX = 0, mouseY = 0;
let haloX = 0, haloY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Smooth halo lag via rAF
;(function haloLoop() {
  haloX += (mouseX - haloX) * 0.14;
  haloY += (mouseY - haloY) * 0.14;
  cursorDot.style.left  = mouseX + 'px';
  cursorDot.style.top   = mouseY + 'px';
  cursorHalo.style.left = haloX  + 'px';
  cursorHalo.style.top  = haloY  + 'px';
  requestAnimationFrame(haloLoop);
})();

// Hover state
document.addEventListener('mouseover', e => {
  const el = e.target;
  if (el.matches('button, input, a, [data-hover]')) {
    document.body.classList.add('cursor-hover');
  }
});
document.addEventListener('mouseout', e => {
  const el = e.target;
  if (el.matches('button, input, a, [data-hover]')) {
    document.body.classList.remove('cursor-hover');
  }
});


/* ── Clock & Day Progress ─────────────────────── */
function tickClock() {
  const now = new Date();

  document.getElementById('clock').textContent =
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  document.getElementById('date').textContent =
    now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const pct = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 864;
  document.getElementById('dailyBar').style.width = pct + '%';
}
setInterval(tickClock, 1000);
tickClock();


/* ── Panel Navigation ─────────────────────────── */
document.querySelectorAll('.nav-btn[data-panel]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.panel;

    // Hide all panels, deactivate all nav
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // Show target
    document.getElementById(target + 'Panel').classList.add('active');
    btn.classList.add('active');
  });
});


/* ════════════════════════════════════════════════
   POMODORO
   ════════════════════════════════════════════════ */
const CIRC = 2 * Math.PI * 104; // ring circumference

const state = {
  modes:      { focus: 25, short: 5, long: 15 }, // minutes
  current:    'focus',
  timeLeft:   25 * 60, // seconds
  totalTime:  25 * 60,
  running:    false,
  sessions:   0,
  ticker:     null,
};

const timerEl     = document.getElementById('timer');
const ringArc     = document.getElementById('ringArc');
const timerTag    = document.getElementById('timerModeTag');
const startBtn    = document.getElementById('startBtn');
const startIcon   = document.getElementById('startIcon');
const resetBtn    = document.getElementById('resetBtn');
const skipBtn     = document.getElementById('skipBtn');
const slider      = document.getElementById('durationSlider');
const sliderFill  = document.getElementById('sliderFill');
const sliderVal   = document.getElementById('sliderVal');
const sessionDots = document.getElementById('sessionDots');

// Init ring
ringArc.style.strokeDasharray  = CIRC;
ringArc.style.strokeDashoffset = 0;

// ── Render ───────────────────────────────────────
function renderTimer() {
  const m = String(Math.floor(state.timeLeft / 60)).padStart(2, '0');
  const s = String(state.timeLeft % 60).padStart(2, '0');
  timerEl.textContent = m + ':' + s;

  const pct = state.totalTime > 0 ? state.timeLeft / state.totalTime : 0;
  ringArc.style.strokeDashoffset = CIRC - pct * CIRC;
}

function renderStartBtn() {
  if (state.running) {
    startBtn.classList.add('running');
    startIcon.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>`;
    startIcon.setAttribute('fill', 'currentColor');
  } else {
    startBtn.classList.remove('running');
    startIcon.innerHTML = `<polygon points="5 3 19 12 5 21"/>`;
  }
}

function renderSessions() {
  sessionDots.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    dot.className = 'session-dot' + (i < state.sessions ? ' done' : '');
    sessionDots.appendChild(dot);
  }
}

function setMode(mode) {
  stopTimer();
  state.current  = mode;
  state.timeLeft = state.modes[mode] * 60;
  state.totalTime = state.timeLeft;

  // Sync slider
  slider.value = state.modes[mode];
  updateSliderFill();
  sliderVal.textContent = state.modes[mode] + ' min';

  // Tag
  const labels = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' };
  timerTag.textContent = labels[mode];

  renderTimer();
  renderStartBtn();
}

// ── Start / Pause ────────────────────────────────
function toggleTimer() {
  if (state.running) {
    stopTimer();
  } else {
    if (state.timeLeft <= 0) resetTimer();
    state.running = true;
    state.ticker  = setInterval(() => {
      state.timeLeft--;
      renderTimer();
      if (state.timeLeft <= 0) {
        stopTimer();
        onSessionEnd();
      }
    }, 1000);
  }
  renderStartBtn();
}

function stopTimer() {
  if (state.ticker) { clearInterval(state.ticker); state.ticker = null; }
  state.running = false;
}

function resetTimer() {
  stopTimer();
  state.timeLeft  = state.totalTime;
  renderTimer();
  renderStartBtn();
}

function onSessionEnd() {
  if (state.current === 'focus') {
    state.sessions = Math.min(state.sessions + 1, 4);
    if (state.sessions >= 4) state.sessions = 0;
    renderSessions();
  }
  // subtle visual pulse
  timerEl.animate(
    [{ opacity: 1 }, { opacity: 0.3, transform: 'scale(0.96)' }, { opacity: 1, transform: 'scale(1)' }],
    { duration: 600, easing: 'ease-in-out' }
  );
}

// ── Slider ───────────────────────────────────────
function updateSliderFill() {
  const min = Number(slider.min);
  const max = Number(slider.max);
  const val = Number(slider.value);
  const pct = (val - min) / (max - min) * 100;
  sliderFill.style.width = pct + '%';
}

slider.addEventListener('input', () => {
  const mins = Number(slider.value);
  sliderVal.textContent = mins + ' min';
  state.modes[state.current] = mins;

  if (!state.running) {
    state.timeLeft  = mins * 60;
    state.totalTime = state.timeLeft;
    renderTimer();
  }
  updateSliderFill();
});

// ── Mode pills ───────────────────────────────────
document.querySelectorAll('.mode-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    setMode(pill.dataset.mode);
  });
});

startBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);
skipBtn.addEventListener('click', () => { stopTimer(); state.timeLeft = 0; renderTimer(); onSessionEnd(); });

// Init
updateSliderFill();
renderTimer();
renderSessions();


/* ════════════════════════════════════════════════
   TODO
   ════════════════════════════════════════════════ */
const todoInput    = document.getElementById('todoInput');
const todoList     = document.getElementById('todoList');
const addTaskBtn   = document.getElementById('addTaskBtn');
const clearDoneBtn = document.getElementById('clearDoneBtn');
const taskCountEl  = document.getElementById('taskCount');

function updateTaskCount() {
  const total  = todoList.children.length;
  const done   = todoList.querySelectorAll('li.done').length;
  const remain = total - done;
  taskCountEl.textContent = remain === 0 && total === 0
    ? 'All clear ✦'
    : remain === 0
    ? 'All done!'
    : `${remain} remaining`;
}

function createTodoItem(text) {
  const li   = document.createElement('li');
  li.dataset.text = text;

  const check = document.createElement('div');
  check.className = 'todo-check';
  check.innerHTML = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="10" height="10" style="opacity:0"><polyline points="2 6 5 9 10 3"/></svg>`;

  const span = document.createElement('span');
  span.className   = 'todo-text';
  span.textContent = text;

  const del = document.createElement('button');
  del.className = 'todo-del';
  del.title     = 'Remove';
  del.innerHTML = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="12" height="12"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>`;

  // Toggle done on check click
  check.addEventListener('click', e => {
    e.stopPropagation();
    li.classList.toggle('done');
    const svg = check.querySelector('svg');
    svg.style.opacity = li.classList.contains('done') ? '1' : '0';
    updateTaskCount();
    saveTodos();
  });

  // Delete
  del.addEventListener('click', e => {
    e.stopPropagation();
    li.style.opacity    = '0';
    li.style.transform  = 'translateX(14px)';
    li.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    setTimeout(() => { li.remove(); updateTaskCount(); saveTodos(); }, 230);
  });

  li.appendChild(check);
  li.appendChild(span);
  li.appendChild(del);

  return li;
}

function addTodo(text, done = false) {
  if (!text.trim()) return;
  const li = createTodoItem(text);
  if (done) {
    li.classList.add('done');
    const svg = li.querySelector('.todo-check svg');
    if (svg) svg.style.opacity = '1';
  }
  todoList.appendChild(li);
  updateTaskCount();
}

function saveTodos() {
  const items = [...todoList.children].map(li => ({
    text: li.dataset.text || '',
    done: li.classList.contains('done'),
  }));
  try { localStorage.setItem('focusroom_todos', JSON.stringify(items)); } catch (_) {}
}

function loadTodos() {
  try {
    const saved = JSON.parse(localStorage.getItem('focusroom_todos') || '[]');
    saved.forEach(({ text, done }) => addTodo(text, done));
  } catch (_) {}
}

function commitInput() {
  const val = todoInput.value.trim();
  if (!val) return;
  addTodo(val);
  saveTodos();
  todoInput.value = '';
}

todoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') commitInput();
});
addTaskBtn.addEventListener('click', commitInput);

clearDoneBtn.addEventListener('click', () => {
  todoList.querySelectorAll('li.done').forEach(li => li.remove());
  updateTaskCount();
  saveTodos();
});

loadTodos();
updateTaskCount();


/* ════════════════════════════════════════════════
   YOUTUBE — ad-free via youtube-nocookie.com
   No tracking, embedded player without ads from
   Google's own privacy-enhanced mode.
   ════════════════════════════════════════════════ */
const ytInput   = document.getElementById('ytUrl');
const loadBtn   = document.getElementById('loadVideo');
const playerDiv = document.getElementById('player');

function parseYoutubeId(url) {
  url = url.trim();
  // Handle youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID
  const patterns = [
    /youtu\.be\/([^?&\s/]+)/,
    /[?&]v=([^&\s/]+)/,
    /\/embed\/([^?&\s/]+)/,
    /\/shorts\/([^?&\s/]+)/,
    /\/v\/([^?&\s/]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  // Bare ID (11 chars, alphanumeric+dashes+underscores)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function loadYoutube() {
  const id = parseYoutubeId(ytInput.value);
  if (!id) {
    ytInput.style.borderColor = '#ff6b8a';
    setTimeout(() => ytInput.style.borderColor = '', 1200);
    return;
  }

  // youtube-nocookie.com = privacy-enhanced embed mode
  // rel=0    → no related videos after
  // modestbranding=1 → minimal YT branding
  // iv_load_policy=3 → hide annotations
  playerDiv.innerHTML = `
    <iframe
      src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=1"
      width="100%"
      height="315"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      loading="lazy"
    ></iframe>
  `;
  ytInput.value = '';
}

loadBtn.addEventListener('click', loadYoutube);
ytInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadYoutube(); });


/* ════════════════════════════════════════════════
   SNOW — performant, off-thread-style with rAF
   ════════════════════════════════════════════════ */
;(function initSnow() {
  const canvas = document.getElementById('snow');
  const ctx    = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Fewer, varied flakes — no blur filter (huge perf win)
  const COUNT = 80;
  const flakes = Array.from({ length: COUNT }, () => ({
    x:     Math.random() * W,
    y:     Math.random() * H,
    r:     Math.random() * 2 + 0.5,
    speed: Math.random() * 0.35 + 0.1,
    drift: (Math.random() - 0.5) * 0.12,
    alpha: Math.random() * 0.45 + 0.1,
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Batch same-color flakes for fewer state changes
    ctx.beginPath();
    flakes.forEach(f => {
      ctx.globalAlpha = f.alpha;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();

      f.y += f.speed;
      f.x += f.drift;

      if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
      if (f.x > W + 4) { f.x = -4; }
      if (f.x < -4)    { f.x = W + 4; }
    });
    ctx.globalAlpha = 1;

    requestAnimationFrame(draw);
  }
  draw();
})();