/* ═══════════════════════════════════════════════════════════════════════════
   Thermal OS Calculator — JavaScript Logic
   ──────────────────────────────────────────
   Features:
     • Safe expression evaluation (no eval — uses tokeniser + recursive parser)
     • Full keyboard support
     • Calculation history with localStorage persistence
     • Dark / Light theme toggle with localStorage persistence
     • Ripple click animation on buttons
     • Adaptive display font sizing
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── DOM REFERENCES ──────────────────────────────────────────────────
    const display       = document.getElementById('display');
    const expressionEl  = document.getElementById('expression');
    const displayArea   = document.getElementById('displayArea');
    const historyPanel  = document.getElementById('historyPanel');
    const historyList   = document.getElementById('historyList');
    const historyEmpty  = document.getElementById('historyEmpty');
    const historyClear  = document.getElementById('historyClear');
    const themeToggle   = document.getElementById('themeToggle');
    const btnGrid       = document.getElementById('btnGrid');

    // ── CALCULATOR STATE ────────────────────────────────────────────────
    let currentInput  = '0';   // What the user is typing
    let fullExpr      = '';    // Building expression string (e.g. "12+34")
    let lastOperator  = '';    // Track the last operator pressed
    let justEvaluated = false; // Flag: did we just press "="

    // ── HISTORY (persisted in localStorage) ─────────────────────────────
    const HISTORY_KEY = 'thermalCalcHistory';
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    // ═══════════════════════════════════════════════════════════════════
    //  SAFE EXPRESSION EVALUATOR
    //  Tokenise → Parse (recursive descent) → Compute
    //  Supports: +, -, *, /, %, parentheses, negative numbers
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Tokenise an expression string into numbers and operator tokens.
     * @param {string} expr - e.g. "12.5+3*4"
     * @returns {Array} tokens - e.g. [{type:'num', value:12.5}, {type:'op', value:'+'}, ...]
     */
    function tokenise(expr) {
        const tokens = [];
        let i = 0;
        while (i < expr.length) {
            const ch = expr[i];

            // Skip whitespace
            if (ch === ' ') { i++; continue; }

            // Number (including decimals)
            if (/[0-9.]/.test(ch)) {
                let num = '';
                while (i < expr.length && /[0-9.]/.test(expr[i])) {
                    num += expr[i];
                    i++;
                }
                tokens.push({ type: 'num', value: parseFloat(num) });
                continue;
            }

            // Operators
            if ('+-*/%'.includes(ch)) {
                // Handle unary minus: if first token, or after another operator
                if (ch === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'op')) {
                    let num = '-';
                    i++;
                    while (i < expr.length && /[0-9.]/.test(expr[i])) {
                        num += expr[i];
                        i++;
                    }
                    tokens.push({ type: 'num', value: parseFloat(num) });
                    continue;
                }
                tokens.push({ type: 'op', value: ch });
                i++;
                continue;
            }

            // Unknown character — skip (safety)
            i++;
        }
        return tokens;
    }

    /**
     * Recursive-descent parser implementing operator precedence.
     * Grammar:
     *   expr   → term (('+' | '-') term)*
     *   term   → factor (('*' | '/' | '%') factor)*
     *   factor → NUMBER
     */
    function parseExpression(tokens) {
        let pos = 0;

        function parseFactor() {
            if (pos >= tokens.length) throw new Error('Unexpected end');
            const tok = tokens[pos];
            if (tok.type === 'num') {
                pos++;
                return tok.value;
            }
            throw new Error('Expected number');
        }

        function parseTerm() {
            let left = parseFactor();
            while (pos < tokens.length && tokens[pos].type === 'op' &&
                   ('*/%'.includes(tokens[pos].value))) {
                const op = tokens[pos].value;
                pos++;
                const right = parseFactor();
                if (op === '*') left *= right;
                else if (op === '/') {
                    if (right === 0) throw new Error('Division by zero');
                    left /= right;
                }
                else if (op === '%') {
                    if (right === 0) throw new Error('Division by zero');
                    left %= right;
                }
            }
            return left;
        }

        function parseExpr() {
            let left = parseTerm();
            while (pos < tokens.length && tokens[pos].type === 'op' &&
                   ('+-'.includes(tokens[pos].value))) {
                const op = tokens[pos].value;
                pos++;
                const right = parseTerm();
                if (op === '+') left += right;
                else left -= right;
            }
            return left;
        }

        const result = parseExpr();
        if (pos < tokens.length) throw new Error('Unexpected token');
        return result;
    }

    /**
     * Evaluate a math expression string safely.
     * @param {string} expr
     * @returns {number|string} The numeric result, or 'Error' / 'Invalid Input'
     */
    function safeEval(expr) {
        try {
            if (!expr || expr.trim() === '') return 'Invalid Input';

            const tokens = tokenise(expr);
            if (tokens.length === 0) return 'Invalid Input';

            const result = parseExpression(tokens);

            if (!isFinite(result)) return 'Error';

            // Round to avoid floating-point display artifacts (e.g. 0.1+0.2)
            return parseFloat(result.toPrecision(12));
        } catch (e) {
            return 'Invalid Input';
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DISPLAY HELPERS
    // ═══════════════════════════════════════════════════════════════════

    /** Update the main display and auto-size the font. */
    function updateDisplay(value) {
        display.textContent = value;
        // Adaptive font sizing based on content length
        display.classList.remove('shrink-sm', 'shrink-md', 'shrink-lg');
        const len = String(value).length;
        if (len > 16)     display.classList.add('shrink-lg');
        else if (len > 11) display.classList.add('shrink-md');
        else if (len > 8)  display.classList.add('shrink-sm');
    }

    /** Update the expression (secondary) line. */
    function updateExpression(value) {
        // Show human-readable operators
        expressionEl.textContent = value
            .replace(/\*/g, '×')
            .replace(/\//g, '÷');
    }

    /** Flash a shake animation on the display for errors. */
    function shakeDisplay() {
        displayArea.classList.add('shake');
        setTimeout(() => displayArea.classList.remove('shake'), 400);
    }

    /** Format a number for display (commas are optional — keep it clean). */
    function formatResult(n) {
        if (typeof n === 'string') return n; // 'Error', 'Invalid Input'
        // Show up to 10 decimal places, strip trailing zeros
        const s = parseFloat(n.toFixed(10)).toString();
        return s;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CORE CALCULATOR ACTIONS
    // ═══════════════════════════════════════════════════════════════════

    /** Append a digit or start fresh after evaluation. */
    function inputNumber(num) {
        if (justEvaluated) {
            // Start fresh after pressing "="
            currentInput = num;
            fullExpr = '';
            justEvaluated = false;
        } else if (currentInput === '0' && num !== '.') {
            currentInput = num;
        } else {
            currentInput += num;
        }
        updateDisplay(currentInput);
    }

    /** Append a decimal point (prevent duplicates). */
    function inputDecimal() {
        if (justEvaluated) {
            currentInput = '0.';
            fullExpr = '';
            justEvaluated = false;
            updateDisplay(currentInput);
            return;
        }
        if (!currentInput.includes('.')) {
            currentInput += '.';
            updateDisplay(currentInput);
        }
    }

    /** Handle an operator (+, -, *, /). */
    function inputOperator(op) {
        clearActiveOperator();

        if (justEvaluated) {
            // Chain from previous result
            fullExpr = currentInput + op;
            justEvaluated = false;
        } else {
            fullExpr += currentInput + op;
        }
        lastOperator = op;
        currentInput = '0';
        updateExpression(fullExpr);

        // Highlight the active operator button
        highlightOperator(op);
    }

    /** Handle percent: divide current input by 100. */
    function inputPercent() {
        const val = parseFloat(currentInput);
        if (isNaN(val)) return;
        currentInput = String(val / 100);
        updateDisplay(currentInput);
    }

    /** Evaluate the full expression. */
    function evaluate() {
        if (!fullExpr && !currentInput) return;

        const expr = fullExpr + currentInput;
        const result = safeEval(expr);
        const formatted = formatResult(result);

        // Show the expression in the secondary line
        updateExpression(expr + ' =');

        if (typeof result === 'string') {
            // Error case
            updateDisplay(result);
            shakeDisplay();
        } else {
            updateDisplay(formatted);
            // Save to history
            addToHistory(expr, formatted);
        }

        currentInput = formatted;
        fullExpr = '';
        lastOperator = '';
        justEvaluated = true;
        clearActiveOperator();
    }

    /** Clear everything (AC). */
    function clearAll() {
        currentInput = '0';
        fullExpr = '';
        lastOperator = '';
        justEvaluated = false;
        updateDisplay('0');
        updateExpression('');
        clearActiveOperator();
    }

    /** Backspace — remove last character. */
    function backspace() {
        if (justEvaluated) {
            clearAll();
            return;
        }
        if (currentInput.length <= 1 || currentInput === '0') {
            currentInput = '0';
        } else {
            currentInput = currentInput.slice(0, -1);
        }
        updateDisplay(currentInput);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  OPERATOR HIGHLIGHT
    // ═══════════════════════════════════════════════════════════════════

    function highlightOperator(op) {
        const opMap = { '+': 'btnAdd', '-': 'btnSubtract', '*': 'btnMultiply', '/': 'btnDivide' };
        const id = opMap[op];
        if (id) {
            const el = document.getElementById(id);
            if (el) el.classList.add('active-op');
        }
    }

    function clearActiveOperator() {
        document.querySelectorAll('.btn-operator.active-op').forEach(b => b.classList.remove('active-op'));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  HISTORY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function addToHistory(expr, result) {
        history.unshift({ expr, result, time: Date.now() });
        if (history.length > 50) history.pop(); // Cap at 50 entries
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyEmpty.classList.remove('hidden');
            return;
        }
        historyEmpty.classList.add('hidden');

        history.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="hist-expr">${item.expr.replace(/\*/g, '×').replace(/\//g, '÷')}</div>
                <div class="hist-result">= ${item.result}</div>
            `;
            // Click to reuse result
            li.addEventListener('click', () => {
                currentInput = String(item.result);
                fullExpr = '';
                justEvaluated = true;
                updateDisplay(currentInput);
                updateExpression(item.expr.replace(/\*/g, '×').replace(/\//g, '÷') + ' =');
                toggleHistory(false);
            });
            historyList.appendChild(li);
        });
    }

    function clearHistory() {
        history = [];
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    }

    function toggleHistory(forceState) {
        const isOpen = historyPanel.classList.contains('open');
        const shouldOpen = forceState !== undefined ? forceState : !isOpen;
        if (shouldOpen) {
            historyPanel.classList.add('open');
        } else {
            historyPanel.classList.remove('open');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  THEME MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    const THEME_KEY = 'thermalCalcTheme';

    function initTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        // Default is dark (no attribute needed)
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'light') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem(THEME_KEY, 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem(THEME_KEY, 'light');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  RIPPLE EFFECT ON BUTTONS
    // ═══════════════════════════════════════════════════════════════════

    function triggerRipple(btn, e) {
        const rect = btn.getBoundingClientRect();
        let x, y;
        if (e && e.clientX) {
            x = ((e.clientX - rect.left) / rect.width) * 100;
            y = ((e.clientY - rect.top) / rect.height) * 100;
        } else {
            x = 50;
            y = 50;
        }
        btn.style.setProperty('--ripple-x', x + '%');
        btn.style.setProperty('--ripple-y', y + '%');
        btn.classList.add('ripple');
        setTimeout(() => btn.classList.remove('ripple'), 400);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: BUTTON CLICKS
    // ═══════════════════════════════════════════════════════════════════

    btnGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;

        triggerRipple(btn, e);

        const action = btn.dataset.action;
        const value  = btn.dataset.value;

        switch (action) {
            case 'number':   inputNumber(value); break;
            case 'decimal':  inputDecimal();      break;
            case 'operator': inputOperator(value); break;
            case 'equals':   evaluate();           break;
            case 'clear':    clearAll();            break;
            case 'backspace': backspace();          break;
            case 'percent':  inputPercent();        break;
            case 'history':  toggleHistory();       break;
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: KEYBOARD INPUT
    // ═══════════════════════════════════════════════════════════════════

    document.addEventListener('keydown', (e) => {
        const key = e.key;

        // Prevent default for calculator keys to avoid browser shortcuts
        if (/^[0-9.+\-*/%]$/.test(key) || ['Enter', 'Backspace', 'Escape', 'Delete'].includes(key)) {
            e.preventDefault();
        }

        // Close history on Escape
        if (key === 'Escape') {
            if (historyPanel.classList.contains('open')) {
                toggleHistory(false);
                return;
            }
            clearAll();
            return;
        }

        // Numbers
        if (/^[0-9]$/.test(key)) {
            inputNumber(key);
            flashButton(`btn${key}`);
            return;
        }

        // Decimal
        if (key === '.') {
            inputDecimal();
            flashButton('btnDecimal');
            return;
        }

        // Operators
        const opMap = {
            '+': { op: '+', id: 'btnAdd' },
            '-': { op: '-', id: 'btnSubtract' },
            '*': { op: '*', id: 'btnMultiply' },
            '/': { op: '/', id: 'btnDivide' },
        };
        if (opMap[key]) {
            inputOperator(opMap[key].op);
            flashButton(opMap[key].id);
            return;
        }

        // Percent
        if (key === '%') {
            inputPercent();
            flashButton('btnPercent');
            return;
        }

        // Equals / Enter
        if (key === 'Enter' || key === '=') {
            evaluate();
            flashButton('btnEquals');
            return;
        }

        // Backspace
        if (key === 'Backspace') {
            backspace();
            flashButton('btnBackspace');
            return;
        }

        // Delete = Clear
        if (key === 'Delete') {
            clearAll();
            flashButton('btnClear');
            return;
        }
    });

    /** Briefly highlight a button to show keyboard press feedback. */
    function flashButton(id) {
        const btn = document.getElementById(id);
        if (!btn) return;
        triggerRipple(btn, null);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: HISTORY CONTROLS
    // ═══════════════════════════════════════════════════════════════════

    historyClear.addEventListener('click', clearHistory);

    // Close history when clicking outside (on the display area)
    displayArea.addEventListener('click', () => {
        if (historyPanel.classList.contains('open')) {
            toggleHistory(false);
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: THEME TOGGLE
    // ═══════════════════════════════════════════════════════════════════

    themeToggle.addEventListener('click', toggleTheme);

    // ═══════════════════════════════════════════════════════════════════
    //  INITIALISE
    // ═══════════════════════════════════════════════════════════════════

    initTheme();
    renderHistory();
    updateDisplay('0');

})();
