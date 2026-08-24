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

  // ---------- display ----------
  function updateDisplay() {
    display.value = expr || '0';
  }

  function append(value) {
    expr += value;
    updateDisplay();
  }

  function clearAll() {
    expr = '';
    updateDisplay();
  }

  function backspace() {
    expr = expr.slice(0, -1);
    updateDisplay();
  }

  // Toggle sign of the last number in the expression
  function toggleSign() {
    const m = expr.match(/(-?\d+\.?\d*)$/);
    if (!m) return;
    const num = m[1];
    const start = m.index;
    if (num.startsWith('-')) {
      expr = expr.slice(0, start) + num.slice(1);
    } else {
      expr = expr.slice(0, start) + '-' + num;
    }
    updateDisplay();
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

    // function tokens, longest / most specific first
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

    // percent -> divide by 100
    p = p.replace(/%/g, '/100');

    // factorial: turn "N!" or "(...)!" into factorial(N)
    let guard = 0;
    while (/(\d+(\.\d+)?|\))!/.test(p) && guard < 25) {
      p = p.replace(/(\d+(\.\d+)?|\))!/, 'factorial($1)');
      guard++;
    }

    // power operator
    p = p.replace(/\^/g, '**');

    // auto-balance any missing closing parentheses
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

  function calculate() {
    if (!expr) return;
    try {
      const result = safeEval(expr);
      if (!Number.isFinite(result)) throw new Error('Invalid result');
      lastAnswer = result;
      expr = String(round(result));
      updateDisplay();
    } catch (e) {
      display.value = 'Error';
      expr = '';
      setTimeout(updateDisplay, 800);
    }
  }

  function round(n) {
    // avoid ugly floating point noise, keep up to 10 significant digits
    return Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  }

  // ---------- shift / angle mode ----------
  function updateShiftLabels() {
    document.querySelectorAll('[data-shift-insert]').forEach((btn) => {
      const label = shiftOn ? btn.dataset.shiftLabel : btn.dataset.label;
      btn.textContent = label;
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
  function memRecall() { append(String(round(memory))); }
  function memPlus() { memory = round(memory + currentValue()); updateMemBadge(); }
  function memMinus() { memory = round(memory - currentValue()); updateMemBadge(); }

  // ---------- wiring buttons ----------
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.value;
      const action = btn.dataset.action;
      const insert = btn.dataset.insert;
      const shiftInsert = btn.dataset.shiftInsert;

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
          case 'ans': append(String(round(lastAnswer))); break;
        }
        return;
      }

      if (shiftInsert && shiftOn) {
        append(shiftInsert);
        return;
      }
      if (insert) { append(insert); return; }
      if (v) append(v);
    });
  });

  sciToggle.addEventListener('click', () => {
    const isOpen = sciPanel.classList.toggle('open');
    sciToggle.setAttribute('aria-pressed', String(isOpen));
  });

  // ---------- keyboard support ----------
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (/^[0-9]$/.test(key)) { append(key); e.preventDefault(); return; }
    if (key === '.') { append('.'); e.preventDefault(); return; }
    if (key === '+' || key === '-' || key === '*' || key === '/') { append(key); e.preventDefault(); return; }
    if (key === '^') { append('^'); e.preventDefault(); return; }
    if (key === 'Enter' || key === '=') { calculate(); e.preventDefault(); return; }
    if (key === 'Backspace') { backspace(); e.preventDefault(); return; }
    if (key === 'Escape') { clearAll(); e.preventDefault(); return; }
    if (key === '(' || key === ')') { append(key); e.preventDefault(); return; }
  });

  // ---------- initialize ----------
  clearAll();
  updateShiftLabels();
})();
