/* ═══════════════════════════════════════════════════════════════════════════
   Thermal OS Calculator — JavaScript
   Dropdown processor selector + inline thermal stats + operator fix
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    //  18 PROCESSOR PROFILES
    // ═══════════════════════════════════════════════════════════════════

    var PROCS = [
        { id:1, name:'Intel Core i5-12400', cat:'Intel CPUs', icon:'\u{1F7E6}',
          cores:6, threads:12, tdp:65, maxT:100, arch:'Alder Lake', sock:'LGA 1700',
          cool:'Stock cooler or basic tower', cLabel:'6 (6P+0E)' },
        { id:2, name:'Intel Core i7-13700K', cat:'Intel CPUs', icon:'\u{1F7E6}',
          cores:16, threads:24, tdp:125, maxT:100, arch:'Raptor Lake', sock:'LGA 1700',
          cool:'240mm AIO or high-end tower', cLabel:'16 (8P+8E)' },
        { id:3, name:'Intel Core i9-14900K', cat:'Intel CPUs', icon:'\u{1F7E6}',
          cores:24, threads:32, tdp:125, maxT:100, arch:'Raptor Lake Refresh', sock:'LGA 1700',
          cool:'360mm AIO recommended', cLabel:'24 (8P+16E)' },
        { id:4, name:'Intel Core i3-12100F', cat:'Intel CPUs', icon:'\u{1F7E6}',
          cores:4, threads:8, tdp:58, maxT:100, arch:'Alder Lake', sock:'LGA 1700',
          cool:'Stock cooler sufficient', cLabel:'4 (4P+0E)' },
        { id:5, name:'Intel Xeon W-3375', cat:'Intel CPUs', icon:'\u{1F7E6}',
          cores:38, threads:76, tdp:270, maxT:100, arch:'Ice Lake-SP', sock:'LGA 4189',
          cool:'Server-grade cooling', cLabel:'38' },
        { id:6, name:'Intel Core Ultra 9 285K', cat:'Intel CPUs', icon:'\u{1F7E6}',
          cores:24, threads:24, tdp:125, maxT:105, arch:'Arrow Lake', sock:'LGA 1851',
          cool:'360mm AIO or custom loop', cLabel:'24 (8P+16E)' },

        { id:7, name:'AMD Ryzen 5 7600X', cat:'AMD CPUs', icon:'\u{1F7E5}',
          cores:6, threads:12, tdp:105, maxT:95, arch:'Zen 4', sock:'AM5',
          cool:'Mid-range tower or 240mm AIO', cLabel:'6' },
        { id:8, name:'AMD Ryzen 7 7800X3D', cat:'AMD CPUs', icon:'\u{1F7E5}',
          cores:8, threads:16, tdp:120, maxT:89, arch:'Zen 4 + 3D V-Cache', sock:'AM5',
          cool:'Tower cooler or 240mm AIO', cLabel:'8' },
        { id:9, name:'AMD Ryzen 9 7950X', cat:'AMD CPUs', icon:'\u{1F7E5}',
          cores:16, threads:32, tdp:170, maxT:95, arch:'Zen 4', sock:'AM5',
          cool:'360mm AIO or custom loop', cLabel:'16' },
        { id:10, name:'AMD Ryzen 5 5600X', cat:'AMD CPUs', icon:'\u{1F7E5}',
          cores:6, threads:12, tdp:65, maxT:95, arch:'Zen 3', sock:'AM4',
          cool:'Stock Wraith Stealth', cLabel:'6' },
        { id:11, name:'AMD EPYC 9654', cat:'AMD CPUs', icon:'\u{1F7E5}',
          cores:96, threads:192, tdp:360, maxT:100, arch:'Zen 4 (Genoa)', sock:'SP5',
          cool:'Enterprise liquid cooling', cLabel:'96' },
        { id:12, name:'AMD Ryzen 9 9950X', cat:'AMD CPUs', icon:'\u{1F7E5}',
          cores:16, threads:32, tdp:170, maxT:95, arch:'Zen 5', sock:'AM5',
          cool:'360mm AIO recommended', cLabel:'16' },

        { id:13, name:'NVIDIA RTX 4070 Super', cat:'NVIDIA GPUs', icon:'\u{1F7E9}',
          cores:7168, threads:0, tdp:220, maxT:90, arch:'Ada Lovelace', sock:'PCIe 4.0 x16',
          cool:'Dual/Triple fan', cLabel:'7168 CUDA', gpu:true },
        { id:14, name:'NVIDIA RTX 4090', cat:'NVIDIA GPUs', icon:'\u{1F7E9}',
          cores:16384, threads:0, tdp:450, maxT:90, arch:'Ada Lovelace', sock:'PCIe 4.0 x16',
          cool:'Triple fan or liquid', cLabel:'16384 CUDA', gpu:true },
        { id:15, name:'NVIDIA RTX 3060', cat:'NVIDIA GPUs', icon:'\u{1F7E9}',
          cores:3584, threads:0, tdp:170, maxT:93, arch:'Ampere', sock:'PCIe 4.0 x16',
          cool:'Dual fan sufficient', cLabel:'3584 CUDA', gpu:true },

        { id:16, name:'AMD RX 7900 XTX', cat:'AMD GPUs', icon:'\u{1F7E5}',
          cores:6144, threads:0, tdp:355, maxT:110, arch:'RDNA 3', sock:'PCIe 4.0 x16',
          cool:'Triple fan or liquid', cLabel:'6144 Stream', gpu:true },

        { id:17, name:'Apple M2 Pro', cat:'Apple Silicon', icon:'\u{1F34E}',
          cores:12, threads:12, tdp:30, maxT:108, arch:'ARM (5nm)', sock:'SoC',
          cool:'Passive / Internal fan', cLabel:'12 (8P+4E)' },
        { id:18, name:'Apple M3 Max', cat:'Apple Silicon', icon:'\u{1F34E}',
          cores:16, threads:16, tdp:40, maxT:106, arch:'ARM (3nm)', sock:'SoC',
          cool:'Internal fan system', cLabel:'16 (12P+4E)' }
    ];

    // ═══════════════════════════════════════════════════════════════════
    //  DOM REFS
    // ═══════════════════════════════════════════════════════════════════

    var display       = document.getElementById('display');
    var expressionEl  = document.getElementById('expression');
    var displayArea   = document.getElementById('displayArea');
    var calculatorEl  = document.getElementById('calculator');
    var btnGrid       = document.getElementById('btnGrid');
    var sciPanel      = document.getElementById('sciPanel');
    var toggleTrack   = document.getElementById('toggleTrack');
    var labelNormal   = document.getElementById('labelNormal');
    var labelSci      = document.getElementById('labelScientific');
    var themeToggle   = document.getElementById('themeToggle');

    var histOverlay   = document.getElementById('historyOverlay');
    var histList      = document.getElementById('histList');
    var histEmpty     = document.getElementById('histEmpty');
    var histClear     = document.getElementById('histClear');
    var histBack      = document.getElementById('historyBack');
    var btnHistTop    = document.getElementById('btnHistoryTop');

    var procSelect    = document.getElementById('procSelect');
    var thermalStats  = document.getElementById('thermalStats');
    var statsHeader   = document.getElementById('statsHeader');
    var metricsEl     = document.getElementById('metrics');
    var quickBtnsEl   = document.getElementById('quickBtns');
    var loadRange     = document.getElementById('loadRange');
    var loadValEl     = document.getElementById('loadVal');
    var loadFill      = document.getElementById('loadFill');

    // ═══════════════════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════════════════

    var currentInput = '0';
    var fullExpr     = '';
    var lastOp       = '';
    var justEval     = false;
    var isSci        = false;
    var history      = [];
    var selProc      = null;

    // ═══════════════════════════════════════════════════════════════════
    //  SAFE EVALUATOR (tokeniser + recursive descent parser)
    // ═══════════════════════════════════════════════════════════════════

    function tokenise(str) {
        var tokens = [];
        var i = 0;
        while (i < str.length) {
            var ch = str[i];
            if (ch === ' ') { i++; continue; }

            // Number
            if (/[0-9.]/.test(ch)) {
                var num = '';
                while (i < str.length && /[0-9.]/.test(str[i])) { num += str[i]; i++; }
                tokens.push({ type: 'n', val: parseFloat(num) });
                continue;
            }

            // Operator
            if ('+-*/%^'.indexOf(ch) !== -1) {
                // Handle negative numbers
                if (ch === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'o')) {
                    var neg = '-';
                    i++;
                    while (i < str.length && /[0-9.]/.test(str[i])) { neg += str[i]; i++; }
                    if (neg === '-') {
                        tokens.push({ type: 'o', val: '-' });
                    } else {
                        tokens.push({ type: 'n', val: parseFloat(neg) });
                    }
                    continue;
                }
                tokens.push({ type: 'o', val: ch });
                i++;
                continue;
            }
            i++;
        }
        return tokens;
    }

    function parseTokens(tokens) {
        var pos = 0;

        function factor() {
            if (pos >= tokens.length) throw new Error('end');
            var tok = tokens[pos];
            if (tok.type === 'n') { pos++; return tok.val; }
            throw new Error('expected number');
        }

        function power() {
            var left = factor();
            while (pos < tokens.length && tokens[pos].type === 'o' && tokens[pos].val === '^') {
                pos++;
                left = Math.pow(left, factor());
            }
            return left;
        }

        function term() {
            var left = power();
            while (pos < tokens.length && tokens[pos].type === 'o' && '*/%'.indexOf(tokens[pos].val) !== -1) {
                var op = tokens[pos].val;
                pos++;
                var right = power();
                if (op === '*') left *= right;
                else if (op === '/') { if (right === 0) throw new Error('div0'); left /= right; }
                else { if (right === 0) throw new Error('div0'); left %= right; }
            }
            return left;
        }

        function expr() {
            var left = term();
            while (pos < tokens.length && tokens[pos].type === 'o' && '+-'.indexOf(tokens[pos].val) !== -1) {
                var op = tokens[pos].val;
                pos++;
                var right = term();
                left = op === '+' ? left + right : left - right;
            }
            return left;
        }

        var result = expr();
        if (pos < tokens.length) throw new Error('unexpected');
        return result;
    }

    function safeEval(exprStr) {
        try {
            if (!exprStr || !exprStr.trim()) return 'Invalid Input';
            var tokens = tokenise(exprStr);
            if (!tokens.length) return 'Invalid Input';
            var result = parseTokens(tokens);
            if (!isFinite(result)) return 'Error';
            return parseFloat(result.toPrecision(12));
        } catch (e) {
            return 'Invalid Input';
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  SCIENTIFIC FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function factorial(n) {
        if (n < 0 || !Number.isInteger(n)) return NaN;
        if (n > 170) return Infinity;
        var r = 1;
        for (var i = 2; i <= n; i++) r *= i;
        return r;
    }

    function handleSci(func) {
        var val = parseFloat(currentInput);
        var result, label;

        switch (func) {
            case 'sin':
                if (isNaN(val)) { shake(); return; }
                result = parseFloat(Math.sin(val * Math.PI / 180).toPrecision(12));
                label = 'sin(' + currentInput + '\u00B0)';
                break;
            case 'cos':
                if (isNaN(val)) { shake(); return; }
                result = parseFloat(Math.cos(val * Math.PI / 180).toPrecision(12));
                label = 'cos(' + currentInput + '\u00B0)';
                break;
            case 'tan':
                if (isNaN(val)) { shake(); return; }
                if (Math.abs(Math.cos(val * Math.PI / 180)) < 1e-10) {
                    updDisp('Undefined'); shake(); currentInput = '0'; justEval = true; return;
                }
                result = parseFloat(Math.tan(val * Math.PI / 180).toPrecision(12));
                label = 'tan(' + currentInput + '\u00B0)';
                break;
            case 'log':
                if (isNaN(val) || val <= 0) { updDisp('Invalid'); shake(); return; }
                result = parseFloat(Math.log10(val).toPrecision(12));
                label = 'log(' + currentInput + ')';
                break;
            case 'ln':
                if (isNaN(val) || val <= 0) { updDisp('Invalid'); shake(); return; }
                result = parseFloat(Math.log(val).toPrecision(12));
                label = 'ln(' + currentInput + ')';
                break;
            case 'sqrt':
                if (isNaN(val) || val < 0) { updDisp('Invalid'); shake(); return; }
                result = parseFloat(Math.sqrt(val).toPrecision(12));
                label = '\u221A(' + currentInput + ')';
                break;
            case 'square':
                if (isNaN(val)) { shake(); return; }
                result = parseFloat((val * val).toPrecision(12));
                label = '(' + currentInput + ')\u00B2';
                break;
            case 'power':
                if (isNaN(val)) { shake(); return; }
                fullExpr += currentInput + '^';
                lastOp = '^';
                currentInput = '0';
                justEval = false;
                updExpr(fullExpr);
                return;
            case 'pi':
                currentInput = String(parseFloat(Math.PI.toPrecision(12)));
                justEval = true;
                updDisp(currentInput);
                updExpr('\u03C0');
                return;
            case 'e':
                currentInput = String(parseFloat(Math.E.toPrecision(12)));
                justEval = true;
                updDisp(currentInput);
                updExpr('e');
                return;
            case 'abs':
                if (isNaN(val)) { shake(); return; }
                result = Math.abs(val);
                label = '|' + currentInput + '|';
                break;
            case 'factorial':
                if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
                    updDisp('Invalid'); shake(); return;
                }
                if (val > 170) { updDisp('Overflow'); shake(); return; }
                result = factorial(val);
                if (!isFinite(result)) { updDisp('Overflow'); shake(); return; }
                result = parseFloat(result.toPrecision(12));
                label = currentInput + '!';
                break;
            default:
                return;
        }

        updExpr(label);
        currentInput = fmtResult(result);
        justEval = true;
        updDisp(currentInput);
        addHistory(label, currentInput);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DISPLAY HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function updDisp(value) {
        display.textContent = value;
        display.classList.remove('shrink-sm', 'shrink-md', 'shrink-lg');
        var len = String(value).length;
        if (len > 16) display.classList.add('shrink-lg');
        else if (len > 11) display.classList.add('shrink-md');
        else if (len > 8) display.classList.add('shrink-sm');
    }

    function updExpr(value) {
        expressionEl.textContent = value.replace(/\*/g, '\u00D7').replace(/\//g, '\u00F7');
    }

    function shake() {
        displayArea.classList.add('shake');
        setTimeout(function () { displayArea.classList.remove('shake'); }, 400);
    }

    function fmtResult(n) {
        if (typeof n === 'string') return n;
        return parseFloat(n.toFixed(10)).toString();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CORE CALCULATOR
    // ═══════════════════════════════════════════════════════════════════

    function inputNumber(num) {
        if (justEval) {
            currentInput = num;
            fullExpr = '';
            justEval = false;
        } else if (currentInput === '0' && num !== '.') {
            currentInput = num;
        } else {
            currentInput += num;
        }
        updDisp(currentInput);
    }

    function inputDecimal() {
        if (justEval) {
            currentInput = '0.';
            fullExpr = '';
            justEval = false;
            updDisp(currentInput);
            return;
        }
        if (currentInput.indexOf('.') === -1) {
            currentInput += '.';
            updDisp(currentInput);
        }
    }

    function inputOperator(op) {
        clearActiveOp();

        // If we just evaluated or inserted a quick-use value, use currentInput as operand
        if (justEval) {
            fullExpr = currentInput + op;
            justEval = false;
        } else {
            fullExpr += currentInput + op;
        }

        lastOp = op;
        currentInput = '0';
        updExpr(fullExpr);
        updDisp(fullExpr.slice(0, -1)); // Show the expression so far (without trailing op)
        highlightOp(op);
    }

    function inputPercent() {
        var val = parseFloat(currentInput);
        if (isNaN(val)) return;
        currentInput = String(val / 100);
        updDisp(currentInput);
    }

    function inputNegate() {
        if (currentInput === '0') return;
        currentInput = currentInput.charAt(0) === '-' ? currentInput.substring(1) : '-' + currentInput;
        updDisp(currentInput);
    }

    function evaluate() {
        if (!fullExpr && !currentInput) return;
        var expr = fullExpr + currentInput;
        var result = safeEval(expr);
        var formatted = fmtResult(result);

        updExpr(expr + ' =');

        if (typeof result === 'string') {
            updDisp(result);
            shake();
        } else {
            updDisp(formatted);
            addHistory(expr, formatted);
        }

        currentInput = formatted;
        fullExpr = '';
        lastOp = '';
        justEval = true;
        clearActiveOp();
    }

    function clearAll() {
        currentInput = '0';
        fullExpr = '';
        lastOp = '';
        justEval = false;
        updDisp('0');
        updExpr('');
        clearActiveOp();
    }

    function backspace() {
        if (justEval) { clearAll(); return; }
        if (currentInput.length <= 1 || currentInput === '0') {
            currentInput = '0';
        } else {
            currentInput = currentInput.slice(0, -1);
        }
        updDisp(currentInput);
    }

    function highlightOp(op) {
        var map = { '+': 'btnAdd', '-': 'btnSubtract', '*': 'btnMultiply', '/': 'btnDivide' };
        var el = document.getElementById(map[op]);
        if (el) el.classList.add('active-op');
    }

    function clearActiveOp() {
        var btns = document.querySelectorAll('.btn-operator.active-op');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active-op');
    }

    // ═══════════════════════════════════════════════════════════════════
    //  MODE TOGGLE
    // ═══════════════════════════════════════════════════════════════════

    function setSciMode(active) {
        isSci = active;
        toggleTrack.classList.toggle('active', active);
        sciPanel.classList.toggle('visible', active);
        calculatorEl.classList.toggle('sci-mode', active);
        labelSci.classList.toggle('mode-label-active', active);
        labelNormal.classList.toggle('mode-label-active', !active);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  HISTORY (session-only — in-memory)
    // ═══════════════════════════════════════════════════════════════════

    function addHistory(expr, result) {
        history.unshift({ expr: expr, result: result });
        if (history.length > 100) history.pop();
        renderHistory();
    }

    function renderHistory() {
        histList.innerHTML = '';
        if (!history.length) { histEmpty.classList.remove('hidden'); return; }
        histEmpty.classList.add('hidden');

        history.forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'hist-item';
            li.innerHTML =
                '<div class="hist-expr">' + item.expr.replace(/\*/g, '\u00D7').replace(/\//g, '\u00F7') + '</div>' +
                '<div class="hist-result">= ' + item.result + '</div>';
            li.addEventListener('click', function () {
                currentInput = String(item.result);
                fullExpr = '';
                justEval = true;
                updDisp(currentInput);
                updExpr(item.expr.replace(/\*/g, '\u00D7').replace(/\//g, '\u00F7') + ' =');
                histOverlay.classList.remove('open');
            });
            histList.appendChild(li);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PROCESSOR DROPDOWN + THERMAL STATS
    // ═══════════════════════════════════════════════════════════════════

    function populateDropdown() {
        var currentCat = '';
        var group = null;

        PROCS.forEach(function (p) {
            if (p.cat !== currentCat) {
                currentCat = p.cat;
                group = document.createElement('optgroup');
                group.label = currentCat;
                procSelect.appendChild(group);
            }
            var opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.icon + ' ' + p.name + '  (' + p.tdp + 'W)';
            group.appendChild(opt);
        });
    }

    function findProc(id) {
        for (var i = 0; i < PROCS.length; i++) {
            if (PROCS[i].id === id) return PROCS[i];
        }
        return null;
    }

    function showThermalStats(proc) {
        selProc = proc;
        thermalStats.classList.remove('hidden');

        // Header
        statsHeader.innerHTML =
            '<span class="sh-icon">' + proc.icon + '</span>' +
            '<div class="sh-info">' +
                '<div class="sh-name">' + proc.name + '</div>' +
                '<div class="sh-arch">' + proc.arch + ' \u00B7 ' + proc.sock + '</div>' +
                '<div class="sh-badges">' +
                    '<span class="badge badge-c">' + proc.cLabel + '</span>' +
                    (proc.threads ? '<span class="badge badge-t">' + proc.threads + 'T</span>' : '') +
                    '<span class="badge badge-w">' + proc.tdp + 'W TDP</span>' +
                    '<span class="badge badge-m">' + proc.maxT + '\u00B0C Max</span>' +
                '</div>' +
            '</div>';

        loadRange.value = 50;
        computeMetrics(proc, 50);
    }

    function hideThermalStats() {
        selProc = null;
        thermalStats.classList.add('hidden');
    }

    function computeMetrics(proc, loadPct) {
        loadValEl.textContent = loadPct + '%';
        loadFill.style.width = loadPct + '%';

        // Color the load value
        if (loadPct >= 85) loadValEl.style.color = '#ef4444';
        else if (loadPct >= 60) loadValEl.style.color = '#f59e0b';
        else loadValEl.style.color = '#22c55e';

        var load = loadPct / 100;
        var ambient = 25;

        // Estimated temperature
        var estTemp = Math.round(ambient + (proc.maxT - ambient) * load);

        // Power draw (non-linear)
        var powerDraw = Math.round(proc.tdp * (0.15 + 0.85 * Math.pow(load, 1.4)));
        if (powerDraw > proc.tdp * 1.1) powerDraw = Math.round(proc.tdp * 1.1);

        // Power per core
        var divisor = proc.gpu ? Math.max(proc.cores / 64, 1) : proc.cores;
        var ppc = (powerDraw / divisor).toFixed(1);
        var ppcUnit = proc.gpu ? 'W/64 SMs' : 'W/core';

        // Thermal headroom
        var headroom = proc.maxT - estTemp;

        // Efficiency
        var threads = proc.threads || proc.cores;
        var effVal = powerDraw > 0
            ? ((proc.gpu ? proc.cores / 100 : threads) / powerDraw * 100).toFixed(1)
            : '\u221E';
        var effUnit = proc.gpu ? 'SMs/W' : 'thr/W \u00D7100';

        // Cooling category
        var coolCls = powerDraw <= 65 ? 'm-hl' : powerDraw <= 150 ? 'm-wrn' : 'm-dng';
        var coolTxt = powerDraw <= 65 ? 'Low' : powerDraw <= 150 ? 'Moderate' : powerDraw <= 300 ? 'High' : 'Extreme';

        // Temp status
        var tCol = estTemp < proc.maxT * 0.65 ? '#22c55e'
                 : estTemp < proc.maxT * 0.80 ? '#f59e0b'
                 : estTemp < proc.maxT * 0.95 ? '#f97316' : '#ef4444';
        var tStatus = estTemp < proc.maxT * 0.65 ? 'Cool'
                    : estTemp < proc.maxT * 0.80 ? 'Warm'
                    : estTemp < proc.maxT * 0.95 ? 'Hot' : 'Critical';

        // Render metrics
        metricsEl.innerHTML =
            mCard('Est. Temp', estTemp + '\u00B0C', tStatus, '', tCol) +
            mCard('Power Draw', powerDraw + 'W', 'of ' + proc.tdp + 'W TDP', coolCls) +
            mCard('Headroom', headroom + '\u00B0C', 'before throttle', headroom < 10 ? 'm-dng' : headroom < 25 ? 'm-wrn' : 'm-hl') +
            mCard(proc.gpu ? 'Pwr/64 SMs' : 'Pwr/Core', ppc, ppcUnit) +
            mCard('Efficiency', effVal, effUnit) +
            mCard('Cooling', coolTxt, proc.cool, coolCls);

        // Render quick-use buttons
        quickBtnsEl.innerHTML =
            qBtn('TDP', proc.tdp) +
            qBtn('MaxT', proc.maxT) +
            qBtn('EstT', estTemp) +
            qBtn('Power', powerDraw) +
            qBtn('Head', headroom) +
            qBtn(proc.gpu ? 'CUDA' : 'Cores', proc.cores) +
            (proc.threads ? qBtn('Thr', proc.threads) : '') +
            qBtn('W/C', ppc);
    }

    function mCard(label, value, sub, cls, color) {
        return '<div class="m-card ' + (cls || '') + '">' +
            '<div class="m-label">' + label + '</div>' +
            '<div class="m-value"' + (color ? ' style="color:' + color + '"' : '') + '>' + value + '</div>' +
            '<div class="m-sub">' + (sub || '') + '</div>' +
        '</div>';
    }

    function qBtn(label, value) {
        return '<button class="q-btn" data-qv="' + value + '">' +
            '<span class="q-lbl">' + label + '</span>' +
            '<span class="q-val">' + value + '</span></button>';
    }

    // ═══════════════════════════════════════════════════════════════════
    //  THEME
    // ═══════════════════════════════════════════════════════════════════

    var THEME_KEY = 'thermalCalcTheme';

    function initTheme() {
        if (localStorage.getItem(THEME_KEY) === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    function toggleTheme() {
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem(THEME_KEY, 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem(THEME_KEY, 'light');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  RIPPLE EFFECT
    // ═══════════════════════════════════════════════════════════════════

    function ripple(btn, evt) {
        var rect = btn.getBoundingClientRect();
        var x = 50, y = 50;
        if (evt && evt.clientX) {
            x = ((evt.clientX - rect.left) / rect.width) * 100;
            y = ((evt.clientY - rect.top) / rect.height) * 100;
        }
        btn.style.setProperty('--ripple-x', x + '%');
        btn.style.setProperty('--ripple-y', y + '%');
        btn.classList.add('ripple');
        setTimeout(function () { btn.classList.remove('ripple'); }, 400);
    }

    function flashBtn(id) {
        var btn = document.getElementById(id);
        if (btn) ripple(btn, null);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: CALCULATOR BUTTONS
    // ═══════════════════════════════════════════════════════════════════

    btnGrid.addEventListener('click', function (e) {
        var btn = e.target.closest('.btn');
        if (!btn) return;
        ripple(btn, e);

        var action = btn.getAttribute('data-action');
        var value  = btn.getAttribute('data-value');

        switch (action) {
            case 'number':    inputNumber(value);   break;
            case 'decimal':   inputDecimal();       break;
            case 'operator':  inputOperator(value); break;
            case 'equals':    evaluate();            break;
            case 'clear':     clearAll();            break;
            case 'backspace': backspace();           break;
            case 'percent':   inputPercent();        break;
            case 'negate':    inputNegate();         break;
        }
    });

    sciPanel.addEventListener('click', function (e) {
        var btn = e.target.closest('.btn');
        if (!btn) return;
        ripple(btn, e);
        var func = btn.getAttribute('data-func');
        if (func) handleSci(func);
    });

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: MODE TOGGLE
    // ═══════════════════════════════════════════════════════════════════

    toggleTrack.addEventListener('click', function () { setSciMode(!isSci); });
    labelNormal.addEventListener('click', function () { if (isSci) setSciMode(false); });
    labelSci.addEventListener('click', function () { if (!isSci) setSciMode(true); });

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: HISTORY
    // ═══════════════════════════════════════════════════════════════════

    btnHistTop.addEventListener('click', function () { histOverlay.classList.add('open'); });
    histBack.addEventListener('click', function () { histOverlay.classList.remove('open'); });
    histClear.addEventListener('click', function () { history = []; renderHistory(); });

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: PROCESSOR DROPDOWN
    // ═══════════════════════════════════════════════════════════════════

    procSelect.addEventListener('change', function () {
        var id = parseInt(this.value);
        if (!id) {
            hideThermalStats();
            return;
        }
        var proc = findProc(id);
        if (proc) showThermalStats(proc);
    });

    // Load slider
    loadRange.addEventListener('input', function () {
        if (selProc) computeMetrics(selProc, parseInt(this.value));
    });

    // Quick-use buttons — FIX: Don't wipe fullExpr if an operator is pending
    quickBtnsEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.q-btn');
        if (!btn) return;
        var val = btn.getAttribute('data-qv');
        if (!val) return;

        var label = btn.querySelector('.q-lbl').textContent;

        if (fullExpr && lastOp) {
            // Operator is pending — use this value as the next operand
            currentInput = val;
            justEval = false;
            updDisp(currentInput);
            updExpr(fullExpr + val);
        } else {
            // No operator pending — start fresh with this value
            currentInput = val;
            fullExpr = '';
            justEval = true;
            updDisp(currentInput);
            updExpr('\u2190 ' + label + ': ' + val);
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: KEYBOARD
    // ═══════════════════════════════════════════════════════════════════

    document.addEventListener('keydown', function (e) {
        if (histOverlay.classList.contains('open')) {
            if (e.key === 'Escape') { histOverlay.classList.remove('open'); e.preventDefault(); }
            return;
        }

        var key = e.key;

        if (/^[0-9.+\-*/%^]$/.test(key) || ['Enter', 'Backspace', 'Escape', 'Delete'].indexOf(key) !== -1) {
            e.preventDefault();
        }

        if (key === 'Escape')              { clearAll(); return; }
        if (/^[0-9]$/.test(key))           { inputNumber(key); flashBtn('btn' + key); return; }
        if (key === '.')                    { inputDecimal(); flashBtn('btnDecimal'); return; }
        if (key === '+')                    { inputOperator('+'); flashBtn('btnAdd'); return; }
        if (key === '-')                    { inputOperator('-'); flashBtn('btnSubtract'); return; }
        if (key === '*')                    { inputOperator('*'); flashBtn('btnMultiply'); return; }
        if (key === '/')                    { inputOperator('/'); flashBtn('btnDivide'); return; }
        if (key === '^')                    { handleSci('power'); return; }
        if (key === '%')                    { inputPercent(); flashBtn('btnPercent'); return; }
        if (key === 'Enter' || key === '=') { evaluate(); flashBtn('btnEquals'); return; }
        if (key === 'Backspace')            { backspace(); flashBtn('btnBackspace'); return; }
        if (key === 'Delete')               { clearAll(); flashBtn('btnClear'); return; }
        if (key === 'h' || key === 'H')     { histOverlay.classList.add('open'); return; }
    });

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT: THEME
    // ═══════════════════════════════════════════════════════════════════

    themeToggle.addEventListener('click', toggleTheme);

    // ═══════════════════════════════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════════════════════════════

    initTheme();
    populateDropdown();
    renderHistory();
    updDisp('0');

})();
