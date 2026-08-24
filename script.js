// Scientific calculator logic
(() => {
  const display = document.getElementById('display');
  const sciPanel = document.getElementById('sciPanel');
  const sciToggle = document.getElementById('sciToggle');
  const shiftBtn = document.getElementById('shiftBtn');
  const angleBtn = document.getElementById('angleBtn');
  const badgeAngle = document.getElementById('badgeAngle');
  const badgeShift = document.getElementById('badgeShift');
  const badgeMem = document.getElementById('badgeMem');

  let expr = '';          // expression string shown in display
  let angleMode = 'DEG';  // 'DEG' or 'RAD'
  let shiftOn = false;    // 2nd function mode
  let memory = 0;
  let lastAnswer = 0;

  // ---------- helpers used inside evaluated expressions ----------
  function degToRad(d) { return (d * Math.PI) / 180; }
  function radToDeg(r) { return (r * 180) / Math.PI; }

  function sinD(x) { return Math.sin(angleMode === 'DEG' ? degToRad(x) : x); }
  function cosD(x) { return Math.cos(angleMode === 'DEG' ? degToRad(x) : x); }
  function tanD(x) { return Math.tan(angleMode === 'DEG' ? degToRad(x) : x); }
  function asinD(x) { const r = Math.asin(x); return angleMode === 'DEG' ? radToDeg(r) : r; }
  function acosD(x) { const r = Math.acos(x); return angleMode === 'DEG' ? radToDeg(r) : r; }
  function atanD(x) { const r = Math.atan(x); return angleMode === 'DEG' ? radToDeg(r) : r; }

  function factorial(n) {
    if (n < 0 || !Number.isFinite(n) || Math.floor(n) !== n) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  // ---------- display / caret ----------
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderDisplay() {
    if (!expr) {
      display.innerHTML = '<span class="caret"></span>0';
      return;
    }
    const before = escapeHtml(expr.slice(0, cursorPos));
    const after = escapeHtml(expr.slice(cursorPos));
    display.innerHTML = before + '<span class="caret"></span>' + after;
  }

  function insertAtCursor(text) {
    expr = expr.slice(0, cursorPos) + text + expr.slice(cursorPos);
    cursorPos += text.length;
    renderDisplay();
  }

  function clearAll() {
    expr = '';
    cursorPos = 0;
    renderDisplay();
  }

  function backspace() {
    if (cursorPos === 0) return;
    expr = expr.slice(0, cursorPos - 1) + expr.slice(cursorPos);
    cursorPos -= 1;
    renderDisplay();
  }

  function moveCursor(dir) {
    if (dir === 'left') cursorPos = Math.max(0, cursorPos - 1);
    if (dir === 'right') cursorPos = Math.min(expr.length, cursorPos + 1);
    renderDisplay();
  }

  // Toggle sign of the last number before the caret
  function toggleSign() {
    const head = expr.slice(0, cursorPos);
    const m = head.match(/(-?\d+\.?\d*)$/);
    if (!m) return;
    const num = m[1];
    const start = m.index;
    let newHead;
    if (num.startsWith('-')) newHead = head.slice(0, start) + num.slice(1);
    else newHead = head.slice(0, start) + '-' + num;
    expr = newHead + expr.slice(cursorPos);
    cursorPos = newHead.length;
    renderDisplay();
  }

  function reciprocal() {
    if (!expr) return;
    expr = '1/(' + expr + ')';
    calculate();
  }

  // ---------- expression preprocessing & evaluation ----------
  function prepareExpression(input) {
    let p = input
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, '(Math.PI)')
      .replace(/\be\b/g, '(Math.E)');

    p = p
      .replace(/asin\(/g, 'asinD(')
      .replace(/acos\(/g, 'acosD(')
      .replace(/atan\(/g, 'atanD(')
      .replace(/sin\(/g, 'sinD(')
      .replace(/cos\(/g, 'cosD(')
      .replace(/tan\(/g, 'tanD(')
      .replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/cbrt\(/g, 'Math.cbrt(')
      .replace(/abs\(/g, 'Math.abs(');

    p = p.replace(/%/g, '/100');

    let guard = 0;
    while (/(\d+(\.\d+)?|\))!/.test(p) && guard < 25) {
      p = p.replace(/(\d+(\.\d+)?|\))!/, 'factorial($1)');
      guard++;
    }

    p = p.replace(/\^/g, '**');

    const opens = (p.match(/\(/g) || []).length;
    const closes = (p.match(/\)/g) || []).length;
    if (opens > closes) p += ')'.repeat(opens - closes);

    return p;
  }

  function safeEval(input) {
    const prepared = prepareExpression(input);
    const fn = new Function(
      'helpers',
      '"use strict"; const {sinD, cosD, tanD, asinD, acosD, atanD, factorial} = helpers; return (' + prepared + ');'
    );
    return fn({ sinD, cosD, tanD, asinD, acosD, atanD, factorial });
  }

  function round(n) {
    return Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  }

  function calculate() {
    if (!expr) return;
    try {
      const result = safeEval(expr);
      if (!Number.isFinite(result)) throw new Error('Invalid result');
      lastAnswer = result;
      expr = String(round(result));
      cursorPos = expr.length;
      renderDisplay();
    } catch (e) {
      display.innerHTML = 'Error';
      expr = '';
      cursorPos = 0;
      setTimeout(renderDisplay, 800);
    }
  }

  // ---------- shift / angle mode ----------
  function updateShiftLabels() {
    document.querySelectorAll('[data-shift-insert]').forEach((btn) => {
      const sub = btn.querySelector('.key-sub');
      const main = btn.querySelector('.key-main');
      if (shiftOn) {
        main.textContent = btn.dataset.shiftLabel || btn.dataset.label;
      } else {
        main.textContent = btn.dataset.label;
      }
      if (sub) sub.textContent = shiftOn ? btn.dataset.label : (btn.dataset.shiftLabel || '\u00A0');
    });
    shiftBtn.classList.toggle('active', shiftOn);
    badgeShift.classList.toggle('hidden', !shiftOn);
  }

  function toggleShift() {
    shiftOn = !shiftOn;
    updateShiftLabels();
  }

  function toggleAngleMode() {
    angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
    angleBtn.textContent = angleMode;
    badgeAngle.textContent = angleMode;
  }

  // ---------- memory ----------
  function currentValue() {
    if (!expr) return 0;
    try {
      const v = safeEval(expr);
      return Number.isFinite(v) ? v : 0;
    } catch (e) {
      return 0;
    }
  }

  function updateMemBadge() {
    badgeMem.classList.toggle('hidden', memory === 0);
  }

  function memClear() { memory = 0; updateMemBadge(); }
  function memRecall() { insertAtCursor(String(round(memory))); }
  function memPlus() { memory = round(memory + currentValue()); updateMemBadge(); }
  function memMinus() { memory = round(memory - currentValue()); updateMemBadge(); }
  function ansRecall() { insertAtCursor(String(round(lastAnswer))); }

  // ---------- wiring buttons ----------
  document.querySelectorAll('[data-value], [data-action], [data-insert], [data-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.value;
      const action = btn.dataset.action;
      const insert = btn.dataset.insert;
      const shiftInsert = btn.dataset.shiftInsert;
      const dir = btn.dataset.dir;

      if (dir) {
        if (dir === 'left' || dir === 'right') moveCursor(dir);
        else if (dir === 'up') ansRecall();
        else if (dir === 'down') memRecall();
        return;
      }

      if (action) {
        switch (action) {
          case 'clear': clearAll(); break;
          case 'back': backspace(); break;
          case 'equals': calculate(); break;
          case 'toggle-sign': toggleSign(); break;
          case 'reciprocal': reciprocal(); break;
          case 'shift': toggleShift(); break;
          case 'angle': toggleAngleMode(); break;
          case 'mc': memClear(); break;
          case 'mr': memRecall(); break;
          case 'mplus': memPlus(); break;
          case 'mminus': memMinus(); break;
          case 'ans': ansRecall(); break;
        }
        return;
      }

      if (shiftInsert && shiftOn) { insertAtCursor(shiftInsert); return; }
      if (insert) { insertAtCursor(insert); return; }
      if (v) insertAtCursor(v);
    });
  });

  // ---------- keyboard support ----------
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (/^[0-9]$/.test(key)) { insertAtCursor(key); e.preventDefault(); return; }
    if (key === '.') { insertAtCursor('.'); e.preventDefault(); return; }
    if (key === '+' || key === '-' || key === '*' || key === '/') { insertAtCursor(key); e.preventDefault(); return; }
    if (key === '^') { insertAtCursor('^'); e.preventDefault(); return; }
    if (key === 'Enter' || key === '=') { calculate(); e.preventDefault(); return; }
    if (key === 'Backspace') { backspace(); e.preventDefault(); return; }
    if (key === 'Escape') { clearAll(); e.preventDefault(); return; }
    if (key === '(' || key === ')') { insertAtCursor(key); e.preventDefault(); return; }
    if (key === 'ArrowLeft') { moveCursor('left'); e.preventDefault(); return; }
    if (key === 'ArrowRight') { moveCursor('right'); e.preventDefault(); return; }
    if (key === 'ArrowUp') { ansRecall(); e.preventDefault(); return; }
    if (key === 'ArrowDown') { memRecall(); e.preventDefault(); return; }
  });

  // ---------- initialize ----------
  clearAll();
  updateShiftLabels();
})();
