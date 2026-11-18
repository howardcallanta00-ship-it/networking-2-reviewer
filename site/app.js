/* CCNA 2 Reviewer — single-page app, no build step. */
(function () {
  'use strict';

  // ---------- constants ----------
  var GROUP_STYLE = {
    'm1-4': { color: '#2563EB', badge: 'VL', badgeName: 'VLAN Wrangler' },
    'm5-6': { color: '#7C3AED', badge: 'ST', badgeName: 'Loop Breaker' },
    'm7-9': { color: '#0D9488', badge: 'GW', badgeName: 'Gateway Keeper' },
    'm10-13': { color: '#E11D48', badge: 'PS', badgeName: 'Port Guardian' },
    'm14-16': { color: '#D97706', badge: 'RT', badgeName: 'Route Master' }
  };
  var MODULES = {
    1: 'Basic Device Configuration', 2: 'Switching Concepts', 3: 'VLANs', 4: 'Inter-VLAN Routing',
    5: 'STP Concepts', 6: 'EtherChannel', 7: 'DHCPv4', 8: 'SLAAC and DHCPv6', 9: 'FHRP Concepts',
    10: 'LAN Security Concepts', 11: 'Switch Security Configuration', 12: 'WLAN Concepts',
    13: 'WLAN Configuration', 14: 'Routing Concepts', 15: 'IP Static Routing', 16: 'Troubleshoot Static and Default Routes'
  };
  var AUTO = { single: 1, multi: 1 };           // kinds graded automatically
  var KEY = 'ccna2r:v1';
  var SKEY = 'ccna2r:session';

  // ---------- tiny helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // **bold** and `code` inside already-escaped text
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="ic">$1</code>');
  }
  var CLI_LINE = /^(\S+(\(config[^)]*\))?[#>]|ip |ipv6 |no |interface |switchport|spanning-tree|channel-group|encapsulation |router |network |default-router|dns-server|show )/;
  function isCli(text) {
    var lines = String(text).split('\n');
    return lines.some(function (l) { return CLI_LINE.test(l); });
  }
  // A code block: one command per line, prompt and "! comment" coloured.
  function codeBlock(lines) {
    if (typeof lines === 'string') lines = lines.split('\n');
    var html = lines.map(function (l) {
      var m = l.match(/^(\S+(?:\([^)]*\))?[#>])(\s?.*)$/);
      var body = m ? m[2] : l;
      var bang = body.indexOf(' !');
      var cmt = '';
      if (bang >= 0) { cmt = body.slice(bang); body = body.slice(0, bang); }
      return (m ? '<span class="p">' + esc(m[1]) + '</span>' : '') + esc(body) + (cmt ? '<span class="cm">' + esc(cmt) + '</span>' : '');
    }).join('\n');
    return '<pre class="code">' + html + '</pre>';
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function today(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function icon(name, size, color) {
    size = size || 18; color = color || 'currentColor';
    var p = {
      flame: '<path d="M12 22c4 0 7-2.7 7-7 0-3-2-5.5-3.5-7-.3 2-1.5 3-2.5 3 0-3-1-6-4-9 0 3.5-4 6.5-4 13 0 4.3 3 7 7 7z"/>',
      flag: '<path d="M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5"/>',
      back: '<path d="M15 18l-6-6 6-6"/>',
      next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      play: '<path d="M7 4v16l13-8z" fill="' + color + '"/>',
      check: '<path d="M20 6L9 17l-5-5"/>',
      x: '<path d="M6 6l12 12M18 6L6 18"/>',
      alert: '<path d="M12 8v5M12 17h.01"/>',
      bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/>',
      moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    }[name];
    return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  }
  function ring(size, stroke, frac, color, track) {
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, d = Math.max(0, Math.min(1, frac)) * c;
    return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + track + '" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + d.toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>';
  }
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  // ---------- storage (always guarded) ----------
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode etc. */ }
  }
  var store = load(KEY, null) || {};
  store.q = store.q || {};            // id -> { a: attempts, c: correct, last: 1|0, ok2: correct-in-a-row }
  store.flags = store.flags || {};    // id -> true
  store.missed = store.missed || {};  // id -> correct answers since last miss
  store.days = store.days || {};      // yyyy-mm-dd -> answered count
  store.prefs = Object.assign({ groups: ['m1-4'], shuffleOpts: true, shuffleQs: true, count: '20', timer: '60', goal: 20 }, store.prefs || {});
  function persist() { save(KEY, store); }

  function record(id, ok) {
    var s = store.q[id] || (store.q[id] = { a: 0, c: 0, last: 0, ok2: 0 });
    s.a++; if (ok) { s.c++; s.ok2++; } else { s.ok2 = 0; }
    s.last = ok ? 1 : 0;
    if (!ok) store.missed[id] = 0;
    else if (store.missed[id] != null) {
      store.missed[id]++;
      if (store.missed[id] >= 2) delete store.missed[id];   // cleared after 2 right answers
    }
    var d = today(); store.days[d] = (store.days[d] || 0) + 1;
    persist();
  }

  // ---------- data ----------
  var DATA = null, BY_ID = {}, GROUP = {};
  function groupOf(q) { return GROUP[q.group]; }
  function moduleOf(q) { var m = q.topic && q.topic.match(/^(\d+)/); return m ? Number(m[1]) : null; }
  function correctIdx(q) { var r = []; q.options.forEach(function (o, i) { if (o.correct) r.push(i); }); return r; }

  // ---------- stats ----------
  function groupStats(gid) {
    var qs = DATA.questions.filter(function (q) { return q.group === gid; });
    var seen = 0, a = 0, c = 0;
    qs.forEach(function (q) { var s = store.q[q.id]; if (s) { seen++; a += s.a; c += s.c; } });
    return { total: qs.length, seen: seen, acc: a ? pct(c, a) : null };
  }
  function moduleStats() {
    var m = {};
    DATA.questions.forEach(function (q) {
      var mod = moduleOf(q), s = store.q[q.id];
      if (!mod || !s) return;
      var e = m[mod] || (m[mod] = { a: 0, c: 0 });
      e.a += s.a; e.c += s.c;
    });
    return m;
  }
  function streak() {
    var n = 0, d = new Date();
    if (!store.days[today(d)]) d.setDate(d.getDate() - 1);   // today not started yet still counts yesterday's run
    while (store.days[today(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function totals() {
    var seen = 0, a = 0, c = 0;
    Object.keys(store.q).forEach(function (id) { if (BY_ID[id]) { seen++; a += store.q[id].a; c += store.q[id].c; } });
    return { seen: seen, answered: a, correct: c };
  }
  function milestones() {
    var list = [];
    DATA.groups.forEach(function (g) {
      var st = groupStats(g.id), gs = GROUP_STYLE[g.id];
      var done = st.acc != null && st.acc >= 80 && st.seen >= Math.ceil(st.total * 0.8);
      list.push({ icon: gs.badge, name: gs.badgeName, desc: '80%+ on ' + g.range + ', most questions seen', done: done,
        prog: (st.acc == null ? 0 : st.acc) + '% · ' + st.seen + '/' + st.total, color: gs.color });
    });
    var s = streak(), t = totals();
    list.push({ icon: s + 'd', name: 'On a roll', desc: '5-day study streak', done: s >= 5, prog: s + ' / 5 days', color: '#B45309' });
    list.push({ icon: '100', name: 'Centurion', desc: 'Answer 100 questions', done: t.answered >= 100, prog: Math.min(t.answered, 100) + ' / 100', color: '#0F766E' });
    list.push({ icon: 'ALL', name: 'Full coverage', desc: 'See every question once', done: t.seen >= DATA.questions.length, prog: t.seen + ' / ' + DATA.questions.length, color: '#7C3AED' });
    return list;
  }

  // ---------- session ----------
  var S = load(SKEY, null);  // current session
  function saveSession() { save(SKEY, S); }

  function buildSession(mode, opts) {
    opts = opts || {};
    if (!opts.noConfirm && S && !S.submitted && S.ids) {
      var answered = Object.keys(S.done).length;
      if (answered > 0 && answered < S.ids.length &&
          !confirm('You have an unfinished session (' + answered + ' of ' + S.ids.length + ' answered). Start a new one anyway?')) return;
    }
    var pool;
    if (opts.ids) pool = opts.ids.slice();
    else {
      var groups = store.prefs.groups.length ? store.prefs.groups : DATA.groups.map(function (g) { return g.id; });
      pool = DATA.questions.filter(function (q) { return groups.indexOf(q.group) >= 0; }).map(function (q) { return q.id; });
    }
    if (mode === 'exam') pool = pool.filter(function (id) { return AUTO[BY_ID[id].kind]; });
    if (store.prefs.shuffleQs || mode === 'exam') pool = shuffle(pool);
    var count = store.prefs.count === 'all' ? pool.length : Number(store.prefs.count);
    if (!opts.ids) pool = pool.slice(0, count);
    if (!pool.length) { toast('No questions match that selection.'); return; }
    var order = {};
    pool.forEach(function (id) {
      var q = BY_ID[id], idx = q.options.map(function (_, i) { return i; });
      order[id] = (store.prefs.shuffleOpts && q.kind !== 'order') ? shuffle(idx) : idx;
      if (q.kind === 'order') order[id] = shuffle(idx);
    });
    S = {
      mode: mode, ids: pool, i: 0, order: order, sel: {}, done: {}, res: {}, reveal: {},
      label: opts.label || labelFor(mode), started: Date.now(),
      deadline: mode === 'exam' && store.prefs.timer !== 'off' ? Date.now() + Number(store.prefs.timer) * 60000 : null,
      submitted: false
    };
    saveSession();
    go('#/q');
  }
  function labelFor(mode) {
    var g = store.prefs.groups.map(function (id) { return GROUP[id] ? GROUP[id].range.replace('Modules ', '') : ''; }).join(', ');
    var name = { practice: 'Practice', exam: 'Exam', flash: 'Flashcards', missed: 'Review missed' }[mode];
    return name + (g && mode !== 'missed' ? ' · Modules ' + g : '');
  }

  // grading
  function grade(q, picked) {
    var right = correctIdx(q);
    var hits = picked.filter(function (i) { return right.indexOf(i) >= 0; }).length;
    var ok = hits === right.length && picked.length === right.length;
    return { ok: ok, hits: hits, need: right.length };
  }

  // ---------- routing ----------
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  window.addEventListener('hashchange', render);

  var timerHandle = null;
  var lastViewKey = null;
  // Remember which control had focus so a re-render doesn't throw it away.
  function focusKey() {
    var el = document.activeElement;
    if (!el || !el.getAttribute || el === document.body) return null;
    var attrs = ['data-act', 'data-oi', 'data-i', 'data-mode', 'data-pref', 'data-ok', 'value', 'id'];
    var sel = attrs.filter(function (a) { return el.hasAttribute(a) && !(a === 'value' && el.tagName !== 'INPUT'); })
      .map(function (a) { return '[' + a + '="' + String(el.getAttribute(a)).replace(/"/g, '\\"') + '"]'; }).join('');
    return sel || null;
  }
  function render() {
    clearInterval(timerHandle);
    var h = location.hash || '#/';
    var app = $('#app');
    var viewKey = h.split('?')[0] + '|' + (S && h.indexOf('#/q') === 0 ? S.i : '');
    var sameView = viewKey === lastViewKey;
    var fk = sameView ? focusKey() : null;
    var y = window.scrollY;
    if (h.indexOf('#/q') === 0 && S) app.innerHTML = viewQuiz();
    else if (h.indexOf('#/results') === 0 && S) app.innerHTML = viewResults();
    else if (h.indexOf('#/browse') === 0) app.innerHTML = viewBrowse();
    else if (h.indexOf('#/progress') === 0) app.innerHTML = viewProgress();
    else app.innerHTML = viewHome();
    bind();
    if (h.indexOf('#/q') === 0 && S && S.deadline && !S.submitted) {
      timerHandle = setInterval(tick, 1000); tick();
    }
    // Only jump to the top when the page or the question actually changed.
    if (sameView) {
      window.scrollTo(0, y);
      if (fk) { var f = $(fk); if (f && !f.disabled) f.focus({ preventScroll: true }); }
    } else {
      window.scrollTo(0, 0);
      var head = $('.qtext');
      if (head && h.indexOf('#/q') === 0) { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); }
    }
    lastViewKey = viewKey;
  }

  // ---------- shared chrome ----------
  function header(active) {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    function link(href, label, key) { return '<a href="' + href + '"' + (active === key ? ' aria-current="page"' : '') + '>' + label + '</a>'; }
    return '<header class="wrap topbar">' +
      '<a class="brand" href="#/"><span class="logo">C2</span><span><b>CCNA 2 Reviewer</b><small>Switching, Routing &amp; Wireless Essentials v7</small></span></a>' +
      '<nav class="nav" aria-label="Main">' + link('#/', 'Home', 'home') + link('#/browse', 'Browse', 'browse') + link('#/progress', 'Progress', 'progress') +
      '<button class="icon-btn" data-act="theme" aria-label="Switch to ' + (dark ? 'light' : 'dark') + ' theme">' + icon(dark ? 'sun' : 'moon') + '</button></nav></header>';
  }
  function netArt() {
    return '<svg class="net" aria-hidden="true" viewBox="0 0 1280 330" preserveAspectRatio="xMidYMid slice"><g stroke="#1E3A8A" stroke-width="1.5" fill="none">' +
      '<path d="M760 70 L900 40 L1040 110 L1180 60 M900 40 L960 180 L1040 110 M960 180 L1110 220 L1180 60 M960 180 L840 260 L1110 220 M840 260 L700 200 L760 70 M1110 220 L1240 290"/></g>' +
      '<g fill="#3B82F6"><circle cx="760" cy="70" r="5"/><circle cx="900" cy="40" r="7"/><circle cx="1040" cy="110" r="5"/><circle cx="1180" cy="60" r="6"/><circle cx="960" cy="180" r="8"/><circle cx="1110" cy="220" r="5"/><circle cx="840" cy="260" r="6"/><circle cx="700" cy="200" r="4"/><circle cx="1240" cy="290" r="4"/></g>' +
      '<circle cx="960" cy="180" r="18" fill="none" stroke="#F59E0B" stroke-width="2"/></svg>';
  }
  function footer() {
    var links = DATA.groups.map(function (g) { return '<a href="' + esc(g.source) + '" rel="noopener" target="_blank">' + esc(g.range) + '</a>'; }).join(' · ');
    return '<footer class="site"><div class="wrap">' +
      '<span><strong>Source:</strong> Questions, answer choices and original explanations are from ITExamAnswers.net — CCNA 2 v7 exam answers (' + links + '). ' +
      'Question text is kept as published. Explanations were rewritten for clarity; the original is one click away on every question.</span>' +
      '<span>Unofficial personal study tool. Not affiliated with Cisco or ITExamAnswers.net. CCNA is a trademark of Cisco Systems, Inc. Progress is saved in this browser only.</span>' +
      '</div></footer>';
  }

  // ---------- HOME ----------
  function viewHome() {
    var t = totals(), s = streak(), goal = store.prefs.goal, done = store.days[today()] || 0;
    var resume = S && !S.submitted && S.ids && Object.keys(S.done).length < S.ids.length;
    var noSel = store.prefs.groups.length ? '' : ' disabled';
    // weakest group with progress
    var weakest = null;
    DATA.groups.forEach(function (g) { var st = groupStats(g.id); if (st.acc != null && (!weakest || st.acc < weakest.acc)) weakest = { g: g, acc: st.acc }; });
    var msg = t.answered === 0
      ? 'Pick one or more module groups below, then start practising. Every answer counts toward your daily goal and streak.'
      : 'You\'ve seen <strong style="color:#fff">' + t.seen + ' of ' + DATA.questions.length + '</strong> questions. ' +
        (weakest ? 'Your weakest group is <strong style="color:#fff">' + esc(weakest.g.range) + '</strong> (' + weakest.acc + '%) — a good place to focus next.' : '');

    var days = [], d = new Date(); d.setDate(d.getDate() - 6);
    for (var i = 0; i < 7; i++) {
      var k = today(d);
      days.push('<div><span class="' + (store.days[k] ? 'on' : '') + (k === today() ? ' today' : '') + '"></span>' + 'SMTWTFS'[d.getDay()] + '</div>');
      d.setDate(d.getDate() + 1);
    }

    var hero = '<div class="hero">' + netArt() + header('home') +
      '<section class="wrap hero-body"><div class="hero-copy">' +
      (s ? '<span class="pill streak" style="align-self:flex-start">' + icon('flame', 15, '#FCD34D') + s + '-day streak — keep it going</span>' : '') +
      '<h1>Ready to route<br>some packets?</h1><p>' + msg + '</p>' +
      '<div class="actions">' +
      (resume ? '<button class="btn primary big" data-act="resume">' + icon('play', 16, '#fff') + 'Resume ' + esc(S.label.split(' ·')[0].toLowerCase()) +
        ' (' + Object.keys(S.done).length + '/' + S.ids.length + ')</button>' :
        '<button class="btn primary big" data-act="start" data-mode="practice"' + noSel + '>' + icon('play', 16, '#fff') + 'Start practice</button>') +
      (resume ? '<button class="btn big" data-act="start" data-mode="practice"' + noSel + '>New practice</button>' : '') +
      '<button class="btn big" data-act="start" data-mode="exam"' + noSel + '>Exam simulation</button>' +
      '<button class="btn big" data-act="start" data-mode="flash"' + noSel + '>Flashcards</button></div>' +
      (noSel ? '<p style="font-size:14px;color:#FCD34D">Select at least one module group below to start.</p>' : '') + '</div>' +
      '<div class="goal-card"><div class="ring">' + ring(112, 10, done / goal, '#F59E0B', '#1E3A8A') +
      '<div class="val"><b>' + done + '</b><small>of ' + goal + ' today</small></div></div>' +
      '<div><b style="color:#fff">Daily goal</b><div style="font-size:13px;color:#CBD5E1;margin-top:4px">' +
      (done >= goal ? 'Goal reached. Nice work!' : (goal - done) + ' more to ' + (s && !store.days[today()] ? 'keep your streak alive.' : 'hit today\'s goal.')) +
      '</div><div class="week" aria-label="Days studied this week">' + days.join('') + '</div></div></div>' +
      '</section></div>';

    var sel = store.prefs.groups;
    var groups = DATA.groups.map(function (g) {
      var st = groupStats(g.id), gs = GROUP_STYLE[g.id], on = sel.indexOf(g.id) >= 0, p = st.seen / st.total;
      return '<label class="group' + (on ? ' on' : '') + '" style="--gc:' + gs.color + '">' +
        '<span class="gring">' + ring(62, 6, p, gs.color, 'color-mix(in srgb,' + gs.color + ' 18%, transparent)') + '<span>' + pct(st.seen, st.total) + '%</span></span>' +
        '<span class="gmeta"><span class="range">' + esc(g.range.toUpperCase()) + '</span><b>' + esc(g.name) + '</b>' +
        '<small>' + st.seen + '/' + st.total + ' seen · <strong style="color:var(--ink)">' + (st.acc == null ? '—' : st.acc + '%') + '</strong> correct</small></span>' +
        '<input type="checkbox" data-act="group" value="' + g.id + '"' + (on ? ' checked' : '') + ' aria-label="Include ' + esc(g.range) + '"></label>';
    }).join('');
    var nSel = DATA.questions.filter(function (q) { return sel.indexOf(q.group) >= 0; }).length;

    var ms = moduleStats(), weak = Object.keys(ms).map(function (m) { return { m: m, p: pct(ms[m].c, ms[m].a), a: ms[m].a }; })
      .filter(function (x) { return x.a >= 2; }).sort(function (a, b) { return a.p - b.p; }).slice(0, 3);
    var missedN = Object.keys(store.missed).filter(function (id) { return BY_ID[id]; }).length;
    var weakHtml = weak.length ? weak.map(function (w) {
      return '<div class="weak-row"><div><span>Module ' + w.m + ' · ' + esc(MODULES[w.m] || '') + '</span><span class="pct">' + w.p + '%</span></div><div class="bar"><i style="width:' + w.p + '%"></i></div></div>';
    }).join('') : '<p class="muted" style="margin:0 0 10px;font-size:14px">Answer a few questions and your weakest modules will show up here.</p>';

    var badges = milestones().slice(0, 8).map(function (b) {
      return '<div class="badge' + (b.done ? '' : ' locked') + '"><span class="bi" style="' + (b.done ? 'background:color-mix(in srgb,' + b.color + ' 16%, transparent);color:' + b.color : '') + '">' + esc(b.icon) + '</span>' +
        '<span class="bt"><b>' + esc(b.name) + '</b><small>' + esc(b.desc) + '</small></span>' +
        '<span class="bs" style="color:' + (b.done ? 'var(--ok-ink)' : 'var(--muted)') + '">' + (b.done ? 'Earned' : esc(b.prog)) + '</span></div>';
    }).join('');

    var p = store.prefs;
    function opt(v, l, cur) { return '<option value="' + v + '"' + (String(cur) === v ? ' selected' : '') + '>' + l + '</option>'; }

    return hero + '<main class="wrap">' +
      '<section><div class="sec-head"><h2 class="sec">Module groups</h2><span class="muted" style="font-size:14px">Selected: ' + sel.length + ' group' + (sel.length === 1 ? '' : 's') + ' · ' + nSel + ' questions</span></div>' +
      '<div class="groups">' + groups +
      '<div class="group-all"><b>All modules — final review</b><span class="muted" style="font-size:13px">Every group mixed together.</span>' +
      '<button class="btn" style="align-self:flex-start;margin-top:4px" data-act="allgroups">' + (sel.length === DATA.groups.length ? 'Clear selection' : 'Select all') + '</button></div></div></section>' +
      '<section class="row">' +
      '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px"><h3 style="margin:0">Review missed</h3>' +
      '<span class="chip" style="background:var(--bad-soft);color:var(--bad-ink)">' + missedN + ' to retry</span></div>' + weakHtml +
      '<button class="btn dark" style="width:100%" data-act="missed"' + (missedN ? '' : ' disabled') + '>Drill missed questions</button>' +
      '<p class="hint" style="margin:8px 0 0">A missed question leaves this list after you get it right twice.</p></div>' +
      '<div class="card"><h3>Milestones</h3>' + badges + '</div>' +
      '<div class="card settings"><h3>Session settings</h3>' +
      '<label>Shuffle answer options <input type="checkbox" data-pref="shuffleOpts"' + (p.shuffleOpts ? ' checked' : '') + '></label>' +
      '<label>Shuffle questions <input type="checkbox" data-pref="shuffleQs"' + (p.shuffleQs ? ' checked' : '') + '></label>' +
      '<label>Questions per session <select data-pref="count">' + opt('10', '10', p.count) + opt('20', '20', p.count) + opt('40', '40', p.count) + opt('60', '60', p.count) + opt('all', 'All', p.count) + '</select></label>' +
      '<label>Exam timer <select data-pref="timer">' + opt('30', '30 min', p.timer) + opt('60', '60 min', p.timer) + opt('90', '90 min', p.timer) + opt('off', 'Off', p.timer) + '</select></label>' +
      '<label>Daily goal <select data-pref="goal">' + opt('10', '10 questions', p.goal) + opt('20', '20 questions', p.goal) + opt('40', '40 questions', p.goal) + opt('60', '60 questions', p.goal) + '</select></label>' +
      '<p class="hint" style="margin:0">Exam mode uses multiple-choice questions only (matching and drag-and-drop items are in Practice and Flashcards).</p></div>' +
      '</section></main>' + footer();
  }

  // ---------- QUESTION RENDERING ----------
  function stemHtml(q) {
    return q.stem.concat(q.kind === 'match' || q.kind === 'statement' ? [] : []).map(blockHtml).join('');
  }
  function blockHtml(b) {
    if (b.type === 'code') return codeBlock(b.text);
    if (b.type === 'img') {
      if (b.src) return '<figure class="exhibit"><img src="' + esc(b.src) + '" alt="Exhibit for this question" loading="lazy" data-act="zoom"><figcaption>Exhibit — click to enlarge</figcaption></figure>';
      return '<div class="missing-img"><span>This exhibit image wasn\'t saved in the source file.</span><a href="' + esc(b.remote) + '" target="_blank" rel="noopener">Open the image on ITExamAnswers.net</a></div>';
    }
    if (b.type === 'table') {
      return '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:14px">' + b.rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td style="border:1px solid var(--line);padding:6px 10px;white-space:pre-line">' + esc(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</table></div>';
    }
    if (b.type === 'list') return '<ul>' + b.items.map(function (it) { return '<li>' + esc(it.text) + '</li>'; }).join('') + '</ul>';
    return '<p class="stem-text">' + esc(b.text) + '</p>';
  }
  function explainHtml(q, open) {
    var e = q.explain || {};
    var h = '<section class="explain" id="explain"' + (open ? '' : ' hidden') + '>' +
      '<div class="head"><h2><span class="ei">' + icon('bulb', 17) + '</span>Why it works</h2>' +
      '<span class="chip">' + (q.explain ? 'Rewritten for clarity' : 'Original explanation') + '</span></div>';
    if (e.s) h += '<p class="lead">' + inline(e.s) + '</p>';
    if (e.code && e.code.length) h += codeBlock(e.code);
    if (e.x && e.x.length) h += '<div class="why"><h4>WHY THE OTHER OPTIONS ARE WRONG</h4><ul>' + e.x.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul></div>';
    if (e.note) h += '<div class="note"><strong>Heads-up:</strong> ' + inline(e.note) + '</div>';
    if (q.extra && q.extra.length) h += q.extra.map(blockHtml).join('');
    if (q.original) h += '<details class="orig"><summary>Show original explanation</summary><p>' + esc(q.original) + '</p></details>';
    else h += '<p class="hint" style="margin:0">The source page had no explanation for this question.</p>';
    h += '<span class="source-line">Source: <a href="' + esc(q.source) + '" target="_blank" rel="noopener">ITExamAnswers.net — CCNA 2 v7 ' + esc(groupOf(q).range) + ' exam answers</a>, question ' + q.num + (q.topic ? ' · Topic ' + esc(q.topic) : '') + '</span>';
    return h + '</section>';
  }
  function answerKeyHtml(q) {
    if (!q.options.length) return '';
    var list = q.kind === 'order' ? q.options : q.options.filter(function (o) { return o.correct; });
    return '<div class="answer-key">' + list.map(function (o, i) {
      return '<div class="' + (isCli(o.text) ? 'cli' : '') + '">' + (q.kind === 'order' ? (i + 1) + '. ' : '') + esc(o.text) + '</div>';
    }).join('') + '</div>';
  }

  // ---------- QUIZ VIEW ----------
  function viewQuiz() {
    if (S.mode === 'flash') return viewFlash();
    var id = S.ids[S.i], q = BY_ID[id], g = groupOf(q), gs = GROUP_STYLE[q.group];
    var exam = S.mode === 'exam';
    var picked = S.sel[id] || [];
    var done = !!S.done[id];
    var showFeedback = done && (!exam || S.submitted);
    var auto = !!AUTO[q.kind];
    var nCorrect = S.ids.filter(function (x) { return S.res[x] === true; }).length;
    var nDone = Object.keys(S.done).length;

    // progress segments
    var segs = S.ids.length <= 60 ? '<div class="segs" aria-hidden="true">' + S.ids.map(function (x, i) {
      var c = S.done[x] ? (exam && !S.submitted ? 'a' : (S.res[x] ? 'c' : 'w')) : '';
      return '<i class="' + c + (i === S.i ? ' cur' : '') + '"></i>';
    }).join('') + '</div>' : '<div class="segs" aria-hidden="true"><i class="c" style="flex:' + nDone + '"></i><i style="flex:' + Math.max(0, S.ids.length - nDone) + '"></i></div>';

    // best run in this session
    var run = 0, best = 0;
    S.ids.forEach(function (x) { if (S.res[x] === true) { run++; best = Math.max(best, run); } else if (S.res[x] === false) run = 0; });

    var bar = '<div class="qbar"><div class="wrap">' +
      '<a class="icon-btn" href="#/" aria-label="Back to home">' + icon('back') + '</a>' +
      '<div class="title"><b>' + esc(S.label) + '</b><small>Question ' + (S.i + 1) + ' of ' + S.ids.length + '</small></div>' + segs +
      '<div class="pills">' +
      (exam && S.deadline && !S.submitted ? '<span class="pill time" id="timer">' + icon('clock', 14, '#FDBA74') + '<span>--:--</span></span>' : '') +
      (!exam ? '<span class="pill streak">' + icon('flame', 14, '#FCD34D') + 'Best run ' + best + '</span><span class="pill score">' + nCorrect + '/' + nDone + ' correct</span>' : '') +
      (exam && !S.submitted ? '<span class="pill score">' + nDone + '/' + S.ids.length + ' answered</span>' : '') +
      (!exam && nDone ? '<button class="btn qend" data-act="finish" title="Stop here and see your results">End session</button>' : '') +
      '</div></div></div>';

    var order = S.order[id];
    var optsHtml = '';
    if (q.options.length) {
      var right = correctIdx(q);
      optsHtml = '<div class="opts" role="group" aria-label="Answer options">' + order.map(function (oi, n) {
        var o = q.options[oi], sel = picked.indexOf(oi) >= 0, cls = '', tag = '';
        if (showFeedback && auto) {
          if (sel && o.correct) { cls = 'right'; tag = '✓ Your pick — correct'; }
          else if (sel && !o.correct) { cls = 'wrong'; tag = '✕ Your pick'; }
          else if (!sel && o.correct) { cls = 'missed'; tag = 'Correct answer'; }
        }
        if (q.kind === 'order' && S.reveal[id]) { tag = 'Step ' + (oi + 1); cls = 'right'; }
        return '<button type="button" class="opt ' + cls + '" data-act="pick" data-oi="' + oi + '"' +
          (auto && !cls ? ' aria-pressed="' + sel + '"' : '') + ((done && !(exam && !S.submitted)) || !auto ? ' disabled' : '') + '>' +
          '<span class="k">' + (n + 1) + '</span><span class="t' + (isCli(o.text) ? ' cli' : '') + '">' + esc(o.text) + '</span>' +
          (tag ? '<span class="tag">' + tag + '</span>' : '') + '</button>';
      }).join('') + '</div>';
      if (q.kind === 'order' && !S.reveal[id]) optsHtml = '<p class="hint" style="margin:0">Put these in the right order in your head (or on paper), then reveal the answer.</p>' + optsHtml;
      if (q.kind === 'multi' && !showFeedback) {
        optsHtml += '<p class="hint pick-count" style="margin:0">Choose ' + q.choose + ' · <strong>' + picked.length + ' selected</strong>' +
          (picked.length >= q.choose ? ' — picking another swaps out your earliest choice' : '') + '</p>';
      }
    }

    var verdict = '';
    if (showFeedback && auto) {
      var gr = grade(q, picked);
      verdict = gr.ok
        ? '<div role="status" class="verdict ok"><span class="vi">' + icon('check', 20, '#fff') + '</span><div><b>Correct!</b><small>' + (best >= 3 ? best + ' in a row — you\'re on fire.' : 'Nice. Keep the run going.') + '</small></div></div>'
        : '<div role="status" class="verdict bad"><span class="vi">' + icon('alert', 20, '#fff') + '</span><div><b>' + (gr.hits ? 'So close — ' + gr.hits + ' of ' + gr.need + ' right' : 'Not quite') + '</b><small>It\'s been added to Review missed, so you\'ll see it again.</small></div></div>';
    }
    if (!auto) {
      if (!S.reveal[id]) verdict = '<div class="selfgrade"><button class="btn primary" data-act="reveal">Reveal answer</button><span class="hint" style="align-self:center">' + (q.kind === 'match' ? 'Matching item — try it first, then compare.' : q.kind === 'statement' ? 'Fact to review — read it and check the explanation.' : '') + '</span></div>';
      else if (!done) verdict = '<div class="selfgrade"><button class="btn" style="border-color:var(--ok);color:var(--ok-ink)" data-act="self" data-ok="1">' + icon('check', 16) + 'I got it</button><button class="btn" style="border-color:var(--bad);color:var(--bad-ink)" data-act="self" data-ok="0">' + icon('x', 16) + 'I missed it</button></div>';
      else verdict = '<div role="status" class="verdict ' + (S.res[id] ? 'ok' : 'bad') + '"><span class="vi">' + icon(S.res[id] ? 'check' : 'alert', 20, '#fff') + '</span><div><b>' + (S.res[id] ? 'Marked as known' : 'Marked as missed') + '</b></div></div>';
    }

    var flagged = !!store.flags[id];
    var card = '<article class="qcard" style="--gc:' + gs.color + '">' +
      '<div class="qmeta"><div class="chips"><span class="chip" style="background:color-mix(in srgb,' + gs.color + ' 14%, transparent);color:' + gs.color + '">' + esc(g.range.toUpperCase()) + ' · Q' + q.num + '</span>' +
      (q.topic ? '<span class="chip">TOPIC ' + esc(q.topic) + '</span>' : '') +
      (q.kind === 'multi' ? '<span class="chip">Choose ' + q.choose + '</span>' : '') +
      (q.kind === 'match' ? '<span class="chip">Matching</span>' : '') + (q.kind === 'order' ? '<span class="chip">Ordering</span>' : '') + '</div>' +
      '<button class="btn" style="min-height:40px;padding:0 12px;font-weight:500;font-size:13px" data-act="flag" aria-pressed="' + flagged + '">' + icon('flag', 15, flagged ? '#F59E0B' : 'currentColor') + (flagged ? 'Flagged' : 'Flag') + '</button></div>' +
      '<h1 class="qtext">' + esc(q.question) + '</h1>' + stemHtml(q) + optsHtml +
      (!auto && S.reveal[id] && q.kind !== 'order' ? answerKeyHtml(q) : '') + verdict + '</article>';

    var showExplain = (showFeedback && auto) || (!auto && S.reveal[id]);
    var nav = '<div class="qnav"><button class="btn big" data-act="prev"' + (S.i === 0 ? ' disabled' : '') + '>Previous</button><div class="r">';
    if (exam && !S.submitted) {
      nav += (S.i === S.ids.length - 1 ? '' : '<button class="btn big" data-act="next">Next ' + icon('next', 16) + '</button>') +
        '<button class="btn primary big" data-act="submit">Submit exam</button>';
    } else if (auto && !done) {
      nav += (S.i < S.ids.length - 1 ? '<button class="btn big ghost" data-act="next" title="Come back to it later">Skip</button>' : '') +
        '<span class="hint">Press <kbd>Enter</kbd></span><button class="btn primary big" data-act="check"' + (picked.length ? '' : ' disabled') + '>Check answer</button>';
    } else if (!auto && !done && S.reveal[id]) {
      nav += (S.i < S.ids.length - 1 ? '<button class="btn big ghost" data-act="next">Skip</button>' : '');
    } else {
      nav += (S.i === S.ids.length - 1
        ? '<button class="btn primary big" data-act="finish">See results</button>'
        : '<span class="hint">Press <kbd>Enter</kbd></span><button class="btn primary big" data-act="next">Next question ' + icon('next', 16, '#fff') + '</button>');
    }
    nav += '</div></div>';

    // aside
    var gridBtns = S.ids.map(function (x, i) {
      var c = i === S.i ? 'cur' : S.done[x] ? (exam && !S.submitted ? 'a' : (S.res[x] ? 'c' : 'w')) : '';
      return '<button data-act="jump" data-i="' + i + '" class="' + c + (store.flags[x] ? ' f' : '') + '" aria-label="Question ' + (i + 1) + '">' + (i + 1) + '</button>';
    }).join('');
    var mod = moduleOf(q), ms = moduleStats()[mod], lvl = ms ? Math.min(5, Math.floor(ms.c / 2)) : 0;
    var aside = '<aside><div class="card"><h3 style="font-family:var(--display)">Questions</h3><div class="grid-nav">' + gridBtns + '</div>' +
      '<div class="legend">' + (exam && !S.submitted ? '<span><i style="background:var(--brand-soft)"></i>Answered</span>' :
        '<span><i style="background:var(--ok-soft)"></i>Correct</span><span><i style="background:var(--bad-soft)"></i>Missed</span>') +
      '<span><i style="background:var(--brand)"></i>Current</span><span><i style="background:var(--amber);border-radius:50%"></i>Flagged</span></div>' +
      (function () {
        var firstOpen = S.ids.findIndex(function (x, i) { return !S.done[x] && i !== S.i; });
        var firstFlag = S.ids.findIndex(function (x, i) { return store.flags[x] && i !== S.i; });
        var b = '';
        if (firstOpen >= 0 && !(exam && S.submitted)) b += '<button class="btn" style="width:100%;margin-top:12px" data-act="jump" data-i="' + firstOpen + '">Go to next unanswered</button>';
        if (firstFlag >= 0) b += '<button class="btn ghost" style="width:100%;margin-top:8px" data-act="jump" data-i="' + firstFlag + '">Go to a flagged question</button>';
        return b;
      })() + '</div>' +
      (mod ? '<div class="card"><h3 style="font-family:var(--display)">Topic mastery</h3><p class="muted" style="margin:0 0 8px;font-size:13px">Module ' + mod + ' · ' + esc(MODULES[mod] || '') + '</p>' +
        '<div class="mastery">' + [1, 2, 3, 4, 5].map(function (n) { return '<i class="' + (n <= lvl ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<p class="hint" style="margin:8px 0 0">Level ' + lvl + ' of 5' + (lvl < 5 ? ' · ' + (2 - ((ms ? ms.c : 0) % 2)) + ' more correct to level up' : ' · mastered') + '</p></div>' : '') +
      '<div class="card shortcuts"><h3 style="font-family:var(--display)">Shortcuts</h3><span><kbd>1</kbd>–<kbd>6</kbd> pick option</span><span><kbd>Enter</kbd> check / next</span>' +
      '<span><kbd>←</kbd> <kbd>→</kbd> previous / next</span><span><kbd>E</kbd> show / hide explanation</span><span><kbd>F</kbd> flag question</span></div></aside>';

    return bar + '<main class="wrap"><div class="quiz"><div class="main">' + card +
      (showExplain ? explainHtml(q, true) : '') + nav + '</div>' + aside + '</div></main>' + footer();
  }

  // ---------- FLASHCARDS ----------
  function viewFlash() {
    var id = S.ids[S.i], q = BY_ID[id], gs = GROUP_STYLE[q.group], g = groupOf(q), back = !!S.reveal[id];
    var known = S.ids.filter(function (x) { return S.res[x] === true; }).length;
    var bar = '<div class="qbar"><div class="wrap"><a class="icon-btn" href="#/" aria-label="Back to home">' + icon('back') + '</a>' +
      '<div class="title"><b>' + esc(S.label) + '</b><small>Card ' + (S.i + 1) + ' of ' + S.ids.length + '</small></div>' +
      '<div class="pills"><span class="pill score">' + known + ' known</span></div></div></div>';
    var front = '<span class="face-label">QUESTION</span><h1 class="qtext">' + esc(q.question) + '</h1>' + stemHtml(q) +
      (q.options.length && q.kind !== 'order' ? '<ul class="opts-list" style="margin:0;padding-left:20px">' + q.options.map(function (o) { return '<li style="white-space:pre-line">' + esc(o.text) + '</li>'; }).join('') + '</ul>' : '');
    var answer = back ? '<span class="face-label">ANSWER</span>' + answerKeyHtml(q) : '<p class="hint" style="margin:0">Tap the card or press <kbd>Enter</kbd> to flip · swipe or use <kbd>←</kbd> <kbd>→</kbd> to move between cards.</p>';
    var card = '<article class="qcard flash" style="--gc:' + gs.color + '" data-act="flip" tabindex="0" role="button" aria-label="Flip card">' +
      '<div class="qmeta"><div class="chips"><span class="chip" style="color:' + gs.color + '">' + esc(g.range.toUpperCase()) + ' · Q' + q.num + '</span></div></div>' + front + answer + '</article>';
    var controls = back
      ? '<div class="qnav"><button class="btn big" data-act="prev"' + (S.i === 0 ? ' disabled' : '') + '>Previous</button><div class="r">' +
        '<button class="btn big" style="border-color:var(--bad);color:var(--bad-ink)" data-act="self" data-ok="0">' + icon('x', 16) + 'Missed it</button>' +
        '<button class="btn big" style="border-color:var(--ok);color:var(--ok-ink)" data-act="self" data-ok="1">' + icon('check', 16) + 'Knew it</button></div></div>'
      : '<div class="qnav"><button class="btn big" data-act="prev"' + (S.i === 0 ? ' disabled' : '') + '>Previous</button><button class="btn primary big" data-act="flip">Flip card</button></div>';
    return bar + '<main class="wrap"><div class="quiz"><div class="main">' + card + (back ? explainHtml(q, true) : '') + controls + '</div></div></main>' + footer();
  }

  // ---------- RESULTS ----------
  function viewResults() {
    var auto = S.ids.filter(function (x) { return S.done[x] && (AUTO[BY_ID[x].kind] || S.mode !== 'exam'); });
    var right = S.ids.filter(function (x) { return S.res[x] === true; }).length;
    var total = S.mode === 'exam' ? S.ids.length : auto.length;
    var score = pct(right, total);
    var pass = score >= 80;
    var byGroup = {};
    S.ids.forEach(function (x) { var q = BY_ID[x], e = byGroup[q.group] || (byGroup[q.group] = { n: 0, c: 0 }); e.n++; if (S.res[x] === true) e.c++; });
    var wrong = S.ids.filter(function (x) { return S.res[x] !== true; });
    var mins = Math.round((Date.now() - S.started) / 60000);

    var groupRows = Object.keys(byGroup).map(function (gid) {
      var e = byGroup[gid], gs = GROUP_STYLE[gid], p = pct(e.c, e.n);
      return '<div class="weak-row"><div><span>' + esc(GROUP[gid].range) + ' · ' + esc(GROUP[gid].name) + '</span><span class="pct" style="color:var(--ink)">' + e.c + '/' + e.n + ' · ' + p + '%</span></div>' +
        '<div class="bar"><i style="width:' + p + '%;background:' + gs.color + '"></i></div></div>';
    }).join('');

    var review = wrong.length ? wrong.map(function (x) {
      var q = BY_ID[x], picked = (S.sel[x] || []).map(function (i) { return q.options[i] && q.options[i].text; }).filter(Boolean);
      return '<div class="review-item"><span class="chip" style="align-self:flex-start;color:' + GROUP_STYLE[q.group].color + '">' + esc(GROUP[q.group].range) + ' · Q' + q.num + '</span>' +
        '<div class="ri-q">' + esc(q.question) + '</div>' +
        (picked.length ? '<div class="ri-a" style="color:var(--bad-ink)">Your answer: ' + esc(picked.join(' | ')) + '</div>' : (S.mode === 'exam' ? '<div class="ri-a" style="color:var(--bad-ink)">Not answered</div>' : '')) +
        '<div class="ri-a" style="color:var(--ok-ink)">Correct: ' + esc(q.options.filter(function (o) { return o.correct; }).map(function (o) { return o.text; }).join(' | ') || 'see the answer image') + '</div>' +
        (q.explain && q.explain.s ? '<div class="ri-a muted">' + inline(q.explain.s) + '</div>' : '') + '</div>';
    }).join('') : '<p class="muted">Nothing to review — every answer was right.</p>';

    return '<div class="hero">' + netArt() + header('') + '<section class="wrap hero-body"><div class="hero-copy">' +
      '<span class="pill ' + (pass ? 'score' : 'streak') + '" style="align-self:flex-start">' + (pass ? 'Passed the 80% target' : 'Below the 80% target — keep going') + '</span>' +
      '<h1>' + (S.mode === 'exam' ? 'Exam results' : 'Session complete') + '</h1><p>' + esc(S.label) + ' · ' + mins + ' min</p>' +
      '<div class="actions"><button class="btn primary big" data-act="retry-wrong"' + (wrong.length ? '' : ' disabled') + '>Retry the ' + wrong.length + ' I missed</button>' +
      '<button class="btn big" data-act="review-session">Review answers</button><a class="btn big" href="#/">Home</a></div></div>' +
      '<div class="goal-card"><div class="ring">' + ring(120, 12, score / 100, pass ? '#22C55E' : '#F59E0B', '#1E3A8A') +
      '<div class="val"><b>' + score + '%</b><small>' + right + ' of ' + total + '</small></div></div>' +
      '<div style="color:#CBD5E1;font-size:14px">' + (pass ? 'Strong work. Try an exam with more groups mixed in.' : 'Review the misses below, then drill them from Review missed.') + '</div></div></section></div>' +
      '<main class="wrap"><section class="row"><div class="card"><h3>By module group</h3>' + groupRows + '</div></section>' +
      '<section class="card"><h3>Questions to review (' + wrong.length + ')</h3>' + review + '</section></main>' + footer();
  }

  // ---------- BROWSE ----------
  var browseState = { q: '', g: 'all', only: 'all', limit: 60 };
  function viewBrowse() {
    var opts = '<option value="all">All groups</option>' + DATA.groups.map(function (g) { return '<option value="' + g.id + '"' + (browseState.g === g.id ? ' selected' : '') + '>' + esc(g.range) + '</option>'; }).join('');
    return '<div class="hero">' + netArt() + header('browse') + '<section class="wrap hero-body" style="padding-bottom:28px"><div class="hero-copy"><h1>Browse all questions</h1><p>Search every question with its answer — handy for a quick read-through before the exam.</p></div></section></div>' +
      '<main class="wrap"><div class="search"><label class="sr-only" for="bsearch">Search questions</label><input id="bsearch" type="search" placeholder="Search questions, answers or explanations…" value="' + esc(browseState.q) + '">' +
      '<label class="sr-only" for="bgroup">Module group</label><select id="bgroup">' + opts + '</select>' +
      '<label class="sr-only" for="bonly">Filter</label><select id="bonly"><option value="all">All questions</option><option value="flag"' + (browseState.only === 'flag' ? ' selected' : '') + '>Flagged</option><option value="missed"' + (browseState.only === 'missed' ? ' selected' : '') + '>Missed</option></select></div>' +
      '<p class="muted" id="bcount" style="margin:0"></p><div id="blist" style="display:flex;flex-direction:column;gap:12px"></div></main>' + footer();
  }
  function fillBrowse() {
    var term = browseState.q.trim().toLowerCase();
    var list = DATA.questions.filter(function (q) {
      if (browseState.g !== 'all' && q.group !== browseState.g) return false;
      if (browseState.only === 'flag' && !store.flags[q.id]) return false;
      if (browseState.only === 'missed' && store.missed[q.id] == null) return false;
      if (!term) return true;
      var hay = (q.question + ' ' + q.options.map(function (o) { return o.text; }).join(' ') + ' ' + (q.explain ? q.explain.s : '') + ' ' + q.stem.map(function (b) { return b.text || ''; }).join(' ')).toLowerCase();
      return hay.indexOf(term) >= 0;
    });
    $('#bcount').textContent = list.length + ' question' + (list.length === 1 ? '' : 's');
    var shown = list.slice(0, browseState.limit);
    $('#blist').innerHTML = shown.map(function (q) {
      var gs = GROUP_STYLE[q.group];
      return '<article class="bq" style="--gc:' + gs.color + '"><div class="chips" style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip" style="color:' + gs.color + '">' + esc(GROUP[q.group].range.toUpperCase()) + ' · Q' + q.num + '</span>' + (q.topic ? '<span class="chip">TOPIC ' + esc(q.topic) + '</span>' : '') + (store.flags[q.id] ? '<span class="chip" style="color:var(--amber-ink)">FLAGGED</span>' : '') + '</div>' +
        '<h2 class="qtext">' + esc(q.question) + '</h2>' + stemHtml(q) +
        (q.options.length ? '<ul class="opts-list">' + q.options.map(function (o, i) { return '<li class="' + (o.correct || q.kind === 'order' ? 'ok' : '') + (isCli(o.text) ? ' cli' : '') + '">' + (q.kind === 'order' ? (i + 1) + '. ' : (o.correct ? '✓ ' : '')) + esc(o.text) + '</li>'; }).join('') + '</ul>' : '') +
        '<details><summary>Explanation</summary>' + explainHtml(q, true).replace('class="explain"', 'class="explain" style="box-shadow:none;border:0;padding:12px 0 0"') + '</details></article>';
    }).join('') + (list.length > shown.length ? '<button class="btn" id="bmore" style="align-self:center">Show more (' + (list.length - shown.length) + ' left)</button>' : '');
    bindZoom();
    var more = $('#bmore');
    if (more) more.addEventListener('click', function () { browseState.limit += 60; var y = window.scrollY; fillBrowse(); window.scrollTo(0, y); });
  }

  // ---------- PROGRESS ----------
  function viewProgress() {
    var t = totals(), ms = moduleStats();
    var rows = Object.keys(MODULES).map(function (m) {
      var e = ms[m], p = e ? pct(e.c, e.a) : null;
      return '<div class="weak-row"><div><span>Module ' + m + ' · ' + esc(MODULES[m]) + '</span><span class="pct" style="color:var(--ink)">' + (p == null ? '—' : p + '%') + '</span></div><div class="bar"><i style="width:' + (p || 0) + '%;background:' + (p == null ? 'transparent' : p >= 80 ? 'var(--ok)' : p >= 60 ? 'var(--amber)' : 'var(--bad)') + '"></i></div></div>';
    }).join('');
    var badges = milestones().map(function (b) {
      return '<div class="badge' + (b.done ? '' : ' locked') + '"><span class="bi" style="' + (b.done ? 'background:color-mix(in srgb,' + b.color + ' 16%, transparent);color:' + b.color : '') + '">' + esc(b.icon) + '</span><span class="bt"><b>' + esc(b.name) + '</b><small>' + esc(b.desc) + '</small></span><span class="bs" style="color:' + (b.done ? 'var(--ok-ink)' : 'var(--muted)') + '">' + (b.done ? 'Earned' : esc(b.prog)) + '</span></div>';
    }).join('');
    return '<div class="hero">' + netArt() + header('progress') + '<section class="wrap hero-body" style="padding-bottom:28px"><div class="hero-copy"><h1>Your progress</h1>' +
      '<p>' + t.seen + ' of ' + DATA.questions.length + ' questions seen · ' + t.answered + ' answers · ' + pct(t.correct, t.answered) + '% correct · ' + streak() + '-day streak</p></div></section></div>' +
      '<main class="wrap"><section class="row"><div class="card" style="flex:2 1 420px"><h3>Accuracy by module</h3>' + rows + '</div><div class="card"><h3>Milestones</h3>' + badges + '</div></section>' +
      '<section class="card"><h3>Your data</h3><p class="muted" style="margin:0 0 12px;font-size:14px">Progress lives in this browser only. Export it to move to another device or browser.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px"><button class="btn" data-act="export">Export progress</button><label class="btn" style="cursor:pointer">Import progress<input type="file" accept="application/json" data-act="import" class="sr-only"></label>' +
      '<button class="btn" style="color:var(--bad-ink)" data-act="reset">Reset all progress</button></div></section></main>' + footer();
  }

  // ---------- actions ----------
  function current() { return BY_ID[S.ids[S.i]]; }
  function move(d) {
    var n = S.i + d;
    if (n < 0 || n >= S.ids.length) return;
    S.i = n; saveSession(); render();
  }
  function check() {
    var q = current(), id = q.id, picked = S.sel[id] || [];
    if (!picked.length || S.done[id]) return;
    var gr = grade(q, picked);
    S.done[id] = true; S.res[id] = gr.ok;
    if (S.mode !== 'exam') record(id, gr.ok);
    saveSession(); render();
    // Bring the verdict (and the start of the explanation) into view without a jarring jump.
    var v = $('.verdict');
    if (v) {
      var r = v.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight - 40) v.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    var nb = $('.qnav [data-act="next"], .qnav [data-act="finish"]'); if (nb) nb.focus({ preventScroll: true });
  }
  function pick(oi) {
    var q = current(), id = q.id;
    if (S.done[id] && (S.mode !== 'exam' || S.submitted)) return;
    if (!AUTO[q.kind]) return;
    var p = (S.sel[id] || []).slice(), at = p.indexOf(oi);
    if (q.kind === 'single') p = [oi];
    else if (at >= 0) p.splice(at, 1);
    else { if (p.length >= q.choose) p.shift(); p.push(oi); }
    S.sel[id] = p;
    if (S.mode === 'exam') {
      S.done[id] = p.length > 0;
      if (!p.length) delete S.done[id];
      S.res[id] = grade(q, p).ok;
    }
    saveSession(); render();
  }
  function selfGrade(ok) {
    var id = S.ids[S.i];
    if (S.done[id] && S.mode !== 'flash') return;
    if (!S.done[id] || S.res[id] !== ok) record(id, ok);
    S.done[id] = true; S.res[id] = ok; S.reveal[id] = true;
    saveSession();
    if (S.i < S.ids.length - 1) move(1); else if (S.mode === 'flash') go('#/results'); else render();
  }
  function submitExam(force) {
    var left = S.ids.length - Object.keys(S.done).length;
    if (!force && left > 0 && !confirm(left + ' question' + (left === 1 ? ' is' : 's are') + ' unanswered. Submit anyway?')) return;
    S.submitted = true;
    S.ids.forEach(function (id) { if (S.res[id] !== true) S.res[id] = false; record(id, S.res[id]); });
    saveSession(); go('#/results');
  }
  function tick() {
    var el = $('#timer span'); if (!el || !S || !S.deadline) return;
    var ms = S.deadline - Date.now();
    if (ms <= 0) { clearInterval(timerHandle); toast('Time is up — submitting your exam.'); submitExam(true); return; }
    var m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    var pill = $('#timer');
    if (ms < 300000 && !pill.classList.contains('warn')) {
      pill.classList.add('warn');
      if (!S.warned) { S.warned = true; saveSession(); toast('5 minutes left.'); }
    }
  }

  function bindZoom() {
    $all('[data-act="zoom"]').forEach(function (img) {
      img.addEventListener('click', function () {
        var box = document.createElement('div');
        box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Exhibit');
        box.innerHTML = '<img src="' + esc(img.getAttribute('src')) + '" alt="Exhibit enlarged"><button class="btn" aria-label="Close">Close</button>';
        var close = function () { box.remove(); document.removeEventListener('keydown', onKey); img.focus && img.focus({ preventScroll: true }); };
        var onKey = function (e) { if (e.key === 'Escape') close(); };
        box.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        document.body.appendChild(box);
        $('button', box).focus();
      });
    });
  }

  function bind() {
    bindZoom();
    $all('[data-act]').forEach(function (el) {
      var act = el.getAttribute('data-act');
      if (act === 'zoom' || act === 'import' || act === 'group') return;
      el.addEventListener('click', function (ev) {
        if (act === 'flip' && (ev.target.closest('a, details, img') || el.dataset.swiped)) return;
        handle(act, el, ev);
      });
    });
    $all('[data-act="group"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var g = store.prefs.groups, v = cb.value, i = g.indexOf(v);
        if (cb.checked && i < 0) g.push(v); if (!cb.checked && i >= 0) g.splice(i, 1);
        persist(); render();
      });
    });
    $all('[data-pref]').forEach(function (el) {
      el.addEventListener('change', function () {
        var k = el.getAttribute('data-pref');
        store.prefs[k] = el.type === 'checkbox' ? el.checked : (k === 'goal' ? Number(el.value) : el.value);
        persist(); if (k === 'goal') render();
      });
    });
    var imp = $('[data-act="import"]');
    if (imp) imp.addEventListener('change', function () {
      var f = imp.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try { var d = JSON.parse(r.result); if (!d || !d.q) throw new Error('bad'); store = d; persist(); toast('Progress imported.'); render(); }
        catch (e) { toast('That file isn\'t a reviewer progress export.'); }
      };
      r.readAsText(f);
    });
    var bs = $('#bsearch');
    if (bs) {
      fillBrowse();
      var deb = null;
      bs.addEventListener('input', function () {
        clearTimeout(deb);
        deb = setTimeout(function () { browseState.q = bs.value; browseState.limit = 60; fillBrowse(); }, 150);
      });
      $('#bgroup').addEventListener('change', function (e) { browseState.g = e.target.value; browseState.limit = 60; fillBrowse(); });
      $('#bonly').addEventListener('change', function (e) { browseState.only = e.target.value; browseState.limit = 60; fillBrowse(); });
      if (browseState.q) { bs.focus({ preventScroll: true }); }
    }
    // Flashcards: swipe left = next, swipe right = previous.
    var fc = $('.flash');
    if (fc) {
      var sx = null, sy = null;
      fc.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
      fc.addEventListener('touchend', function (e) {
        if (sx == null) return;
        var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        sx = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { fc.dataset.swiped = '1'; move(dx < 0 ? 1 : -1); }
      });
    }
  }

  function handle(act, el) {
    switch (act) {
      case 'theme': {
        var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
          (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
        var next = dark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('ccna2r:theme', next); } catch (e) {}
        render(); break;
      }
      case 'start': buildSession(el.getAttribute('data-mode')); break;
      case 'resume': go('#/q'); break;
      case 'missed': buildSession('missed', { ids: shuffle(Object.keys(store.missed).filter(function (id) { return BY_ID[id]; })), label: 'Review missed' }); break;
      case 'allgroups':
        store.prefs.groups = store.prefs.groups.length === DATA.groups.length ? [] : DATA.groups.map(function (g) { return g.id; });
        persist(); render(); break;
      case 'pick': pick(Number(el.getAttribute('data-oi'))); break;
      case 'check': check(); break;
      case 'next': move(1); break;
      case 'prev': move(-1); break;
      case 'jump': S.i = Number(el.getAttribute('data-i')); saveSession(); render(); break;
      case 'flag': {
        var id = S.ids[S.i];
        if (store.flags[id]) delete store.flags[id]; else store.flags[id] = true;
        persist(); render(); break;
      }
      case 'reveal': S.reveal[S.ids[S.i]] = true; saveSession(); render(); break;
      case 'self': selfGrade(el.getAttribute('data-ok') === '1'); break;
      case 'flip': S.reveal[S.ids[S.i]] = !S.reveal[S.ids[S.i]]; saveSession(); render(); break;
      case 'submit': submitExam(false); break;
      case 'finish': go('#/results'); break;
      case 'retry-wrong': {
        var wrong = S.ids.filter(function (x) { return S.res[x] !== true; });
        buildSession(S.mode === 'exam' ? 'practice' : S.mode, { ids: wrong, label: 'Retry missed', noConfirm: true }); break;
      }
      case 'review-session': S.i = 0; saveSession(); go('#/q'); break;
      case 'export': {
        var blob = new Blob([JSON.stringify(store, null, 1)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ccna2-reviewer-progress-' + today() + '.json';
        document.body.appendChild(a); a.click(); a.remove(); break;
      }
      case 'reset':
        if (confirm('Erase all progress, flags and streaks in this browser? This can\'t be undone.')) {
          store = { q: {}, flags: {}, missed: {}, days: {}, prefs: store.prefs }; persist(); S = null; save(SKEY, null); render();
        }
        break;
    }
  }

  // keyboard
  document.addEventListener('keydown', function (e) {
    if (!S || location.hash.indexOf('#/q') !== 0) return;
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var q = current(), id = q.id;
    if (/^[1-9]$/.test(e.key) && S.mode !== 'flash') {
      var n = Number(e.key) - 1, oi = S.order[id][n];
      if (oi != null) { e.preventDefault(); pick(oi); }
    } else if (e.key === 'Enter') {
      // A focused answer option shouldn't be re-toggled by Enter: treat Enter as "check / next".
      // Other focused buttons and links keep their normal Enter behaviour.
      if (e.target.closest && e.target.closest('button:not(.opt), a, summary')) return;
      e.preventDefault();
      if (S.mode === 'flash') { if (!S.reveal[id]) handle('flip'); else selfGrade(true); return; }
      if (AUTO[q.kind] && S.mode !== 'exam' && !S.done[id]) check();
      else if (!AUTO[q.kind] && !S.reveal[id]) handle('reveal');
      else if (S.i < S.ids.length - 1) move(1);
      else if (S.mode !== 'exam') go('#/results');
    } else if (e.key === 'ArrowRight') { move(1); }
    else if (e.key === 'ArrowLeft') { move(-1); }
    else if (e.key === 'f' || e.key === 'F') { handle('flag'); }
    else if (e.key === 'e' || e.key === 'E') {
      var ex = $('#explain'); if (ex) { ex.hidden = !ex.hidden; if (!ex.hidden) ex.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }
  });

  // Offline indicator (the service worker keeps the reviewer usable without a connection).
  function netBadge() {
    var b = $('.offline-badge');
    if (navigator.onLine) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.className = 'offline-badge'; b.setAttribute('role', 'status'); b.textContent = 'Offline — still works, progress is saved locally'; document.body.appendChild(b); }
  }
  window.addEventListener('online', netBadge);
  window.addEventListener('offline', netBadge);

  // ---------- boot ----------
  fetch('data/questions.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      DATA = d;
      d.questions.forEach(function (q) { BY_ID[q.id] = q; });
      d.groups.forEach(function (g) { GROUP[g.id] = g; });
      store.prefs.groups = store.prefs.groups.filter(function (g) { return GROUP[g]; });
      if (S && (!S.ids || S.ids.some(function (id) { return !BY_ID[id]; }))) S = null;
      render();
    })
    .catch(function () {
      $('#app').innerHTML = '<p class="empty">Couldn\'t load the question bank. If you opened this file directly, serve the <code>site</code> folder with a local web server instead.</p>';
    });
})();
