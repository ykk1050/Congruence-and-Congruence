/* =========================================================
   core.js — DOM/SVG 도우미, 기하 계산, 저장, 소리, 알림
   ========================================================= */
(function () {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const KO = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  /* ---------- DOM ---------- */
  function setAttrs(node, attrs) {
    if (!attrs) return node;
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') node.setAttribute('class', v);
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    return node;
  }
  function append(node, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return node;
  }
  /** HTML 요소 만들기: el('div', {class:'x'}, 자식...) */
  function el(tag, attrs, ...children) {
    return append(setAttrs(document.createElement(tag), attrs), children);
  }
  /** SVG 요소 만들기 */
  function sv(tag, attrs, ...children) {
    return append(setAttrs(document.createElementNS(SVGNS, tag), attrs), children);
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  /* ---------- 벡터 ---------- */
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, k) => [a[0] * k, a[1] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1],
    cross: (a, b) => a[0] * b[1] - a[1] * b[0],
    len: (a) => Math.hypot(a[0], a[1]),
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
    norm: (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    mid: (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    near: (a, b, e = 1e-6) => Math.abs(a[0] - b[0]) < e && Math.abs(a[1] - b[1]) < e,
    rotVec: (a, deg) => {
      const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
    },
    rot: (p, c, deg) => V.add(c, V.rotVec(V.sub(p, c), deg)),
    rot180: (p, c) => [2 * c[0] - p[0], 2 * c[1] - p[1]],
    foot: (p, a, b) => {
      const d = V.sub(b, a), t = V.dot(V.sub(p, a), d) / V.dot(d, d);
      return V.add(a, V.mul(d, t));
    },
    reflect: (p, a, b) => { const f = V.foot(p, a, b); return [2 * f[0] - p[0], 2 * f[1] - p[1]]; },
    distToLine: (p, a, b) => V.dist(p, V.foot(p, a, b)),
    distToSeg: (p, a, b) => {
      const d = V.sub(b, a), l2 = V.dot(d, d);
      let t = l2 ? V.dot(V.sub(p, a), d) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      return V.dist(p, V.add(a, V.mul(d, t)));
    },
    angleOf: (a) => Math.atan2(a[1], a[0]) * 180 / Math.PI,
    round: (p, k = 1e6) => [Math.round(p[0] * k) / k, Math.round(p[1] * k) / k],
  };

  /* ---------- 다각형 ---------- */
  const Poly = {
    area2: (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; },
    orient: (P) => Math.sign(Poly.area2(P)) || 1,
    centroid: (P) => { let x = 0, y = 0; P.forEach(p => { x += p[0]; y += p[1]; }); return [x / P.length, y / P.length]; },
    bbox: (P) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      P.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
      return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    },
    /** 꼭짓점 i의 안쪽 각(도) */
    angleAt: (P, i) => {
      const n = P.length, v = P[i], u = V.sub(P[(i - 1 + n) % n], v), w = V.sub(P[(i + 1) % n], v);
      const s = Poly.orient(P);
      const a = s * Math.atan2(V.cross(w, u), V.dot(w, u)) * 180 / Math.PI;
      return (a + 360) % 360;
    },
    angles: (P) => P.map((_, i) => Poly.angleAt(P, i)),
    sides: (P) => P.map((p, i) => V.dist(p, P[(i + 1) % P.length])),
    perimeter: (P) => Poly.sides(P).reduce((a, b) => a + b, 0),
    /** 꼭짓점 i에서 안쪽을 향하는 단위벡터(각의 이등분선) */
    inward: (P, i) => {
      const n = P.length, v = P[i];
      const w = V.norm(V.sub(P[(i + 1) % n], v));
      const ang = Poly.angleAt(P, i);
      return V.rotVec(w, Poly.orient(P) * ang / 2);
    },
    translate: (P, d) => P.map(p => V.add(p, d)),
    /** 두 다각형이 합동인지: (각, 변) 순서열 비교 */
    congruent: (P, Q, tol = 0.02) => {
      if (P.length !== Q.length) return false;
      const sig = (X) => { const A = Poly.angles(X), L = Poly.sides(X); return X.map((_, i) => [A[i], L[i]]); };
      const a = sig(P);
      const tries = [Q, Q.slice().reverse()];
      for (const R of tries) {
        const b = sig(R), n = b.length;
        for (let s = 0; s < n; s++) {
          let ok = true;
          for (let i = 0; i < n && ok; i++) {
            const x = a[i], y = b[(i + s) % n];
            if (Math.abs(x[0] - y[0]) > 0.6 || Math.abs(x[1] - y[1]) > tol * Math.max(1, x[1])) ok = false;
          }
          if (ok) return true;
        }
      }
      return false;
    },
    /** 합동이면 대응 관계(P의 i번째 꼭짓점 ↔ Q의 map[i]번째 꼭짓점), 아니면 null */
    congruentMap: (P, Q, tol = 0.02) => {
      const n = P.length;
      if (n !== Q.length) return null;
      const sig = (X) => { const A = Poly.angles(X), L = Poly.sides(X); return X.map((_, i) => [A[i], L[i]]); };
      const a = sig(P);
      for (const rev of [false, true]) {
        const idx = Q.map((_, j) => (rev ? n - 1 - j : j));
        const b = sig(idx.map(j => Q[j]));
        for (let s = 0; s < n; s++) {
          let ok = true;
          for (let i = 0; i < n && ok; i++) {
            const x = a[i], y = b[(i + s) % n];
            if (Math.abs(x[0] - y[0]) > 0.6 || Math.abs(x[1] - y[1]) > tol * Math.max(1, x[1])) ok = false;
          }
          if (ok) return P.map((_, i) => idx[(i + s) % n]);
        }
      }
      return null;
    },
    /** 놓인 도형 W를 목표 T에 맞추려면?
        { congruent:false } | { congruent:true, rot: 돌려야 할 각(가장 작은 값, 도), flip: 뒤집어야만 맞는지 } */
    fitInfo: (W, T, tol = 0.03) => {
      const n = W.length;
      if (n !== T.length) return { congruent: false };
      const sig = (X) => { const A = Poly.angles(X), L = Poly.sides(X); return X.map((_, i) => [A[i], L[i]]); };
      const a = sig(W);
      let best = null, mirror = false;
      for (const rev of [false, true]) {
        const idx = T.map((_, j) => (rev ? n - 1 - j : j));
        const b = sig(idx.map(j => T[j]));
        for (let s = 0; s < n; s++) {
          let ok = true;
          for (let i = 0; i < n && ok; i++) {
            const x = a[i], y = b[(i + s) % n];
            if (Math.abs(x[0] - y[0]) > 0.8 || Math.abs(x[1] - y[1]) > tol * Math.max(1, x[1])) ok = false;
          }
          if (!ok) continue;
          const m = W.map((_, i) => idx[(i + s) % n]);
          const Tm = m.map(j => T[j]);
          if (Math.sign(Poly.area2(W)) !== Math.sign(Poly.area2(Tm))) { mirror = true; continue; }
          let rot = V.angleOf(V.sub(Tm[1], Tm[0])) - V.angleOf(V.sub(W[1], W[0]));
          rot = ((rot + 540) % 360) - 180;
          if (!best || Math.abs(rot) < Math.abs(best.rot)) best = { rot, map: m };
        }
      }
      if (best) return { congruent: true, rot: best.rot, map: best.map, flip: false };
      if (mirror) return { congruent: true, flip: true };
      return { congruent: false };
    },
    /** 단순 다각형인지(변끼리 교차하지 않는지) */
    isSimple: (P, allowCollinear) => {
      const n = P.length;
      const inter = (a, b, c, d) => {
        const d1 = V.cross(V.sub(b, a), V.sub(c, a)), d2 = V.cross(V.sub(b, a), V.sub(d, a));
        const d3 = V.cross(V.sub(d, c), V.sub(a, c)), d4 = V.cross(V.sub(d, c), V.sub(b, c));
        return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
      };
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
        if (inter(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) return false;
      }
      // 이웃한 세 점이 한 직선 위에 있으면 안 됨
      for (let i = 0; i < n && !allowCollinear; i++) {
        const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
        if (Math.abs(V.cross(V.sub(b, a), V.sub(c, b))) < 1e-9) return false;
      }
      return Math.abs(Poly.area2(P)) > 1e-6;
    },
    pointIn: (P, p) => {
      let inside = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
        if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    },
  };

  /* ---------- 도형(figure): 다각형 / 원 / 획(글자) ----------
     {kind:'poly', pts}  {kind:'circle', c, r}  {kind:'strokes', segs:[[p,q],...]} */
  const Fig = {
    poly: (pts) => ({ kind: 'poly', pts }),
    circle: (c, r) => ({ kind: 'circle', c, r }),
    strokes: (segs) => ({ kind: 'strokes', segs }),
    points: (f) => f.kind === 'poly' ? f.pts.slice() : f.kind === 'circle' ? [f.c] : f.segs.flat(),
    map: (f, fn) => {
      if (f.kind === 'poly') return Fig.poly(f.pts.map(fn));
      if (f.kind === 'circle') return Fig.circle(fn(f.c), f.r);
      return Fig.strokes(f.segs.map(s => [fn(s[0]), fn(s[1])]));
    },
    center: (f) => {
      if (f.kind === 'circle') return f.c;
      return Poly.centroid(Fig.points(f));
    },
    bbox: (f) => {
      if (f.kind === 'circle') return { x0: f.c[0] - f.r, y0: f.c[1] - f.r, x1: f.c[0] + f.r, y1: f.c[1] + f.r, w: 2 * f.r, h: 2 * f.r, cx: f.c[0], cy: f.c[1] };
      return Poly.bbox(Fig.points(f));
    },
    segs: (f) => f.kind === 'poly' ? f.pts.map((p, i) => [p, f.pts[(i + 1) % f.pts.length]]) : f.kind === 'strokes' ? f.segs : [],
    equal: (f, g, e = 1e-4) => {
      if (f.kind !== g.kind) return false;
      if (f.kind === 'circle') return V.near(f.c, g.c, e) && Math.abs(f.r - g.r) < e;
      const A = Fig.segs(f), B = Fig.segs(g);
      if (A.length !== B.length) return false;
      const used = new Array(B.length).fill(false);
      for (const s of A) {
        let hit = -1;
        for (let j = 0; j < B.length; j++) {
          if (used[j]) continue;
          const t = B[j];
          if ((V.near(s[0], t[0], e) && V.near(s[1], t[1], e)) || (V.near(s[0], t[1], e) && V.near(s[1], t[0], e))) { hit = j; break; }
        }
        if (hit < 0) return false;
        used[hit] = true;
      }
      return true;
    },
    isPointSym: (f) => {
      if (f.kind === 'circle') return true;
      const c = Fig.center(f);
      return Fig.equal(f, Fig.map(f, p => V.rot180(p, c)));
    },
    /** 대칭축 목록: [{a,b,deg}] (원이면 Infinity 반환) */
    axes: (f) => {
      if (f.kind === 'circle') return Infinity;
      const c = Fig.center(f), pts = Fig.points(f);
      const dirs = [];
      const addDir = (d) => {
        if (V.len(d) < 1e-6) return;
        let deg = ((V.angleOf(d) % 180) + 180) % 180;
        if (deg > 179.95) deg = 0;
        if (!dirs.some(x => Math.abs(x - deg) < 0.05 || Math.abs(Math.abs(x - deg) - 180) < 0.05)) dirs.push(deg);
      };
      pts.forEach(p => addDir(V.sub(p, c)));
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const p = pts[i], q = pts[j];
        if (Math.abs(V.dist(p, c) - V.dist(q, c)) > 1e-6) continue;
        const m = V.mid(p, q);
        if (V.dist(m, c) > 1e-6) addDir(V.sub(m, c));
        else addDir(V.rotVec(V.sub(q, p), 90));
      }
      const res = [];
      dirs.forEach(deg => {
        const d = V.rotVec([1, 0], deg), a = c, b = V.add(c, d);
        if (Fig.equal(f, Fig.map(f, p => V.reflect(p, a, b)))) res.push({ a, b, deg });
      });
      return res;
    },
    axisCount: (f) => { const a = Fig.axes(f); return a === Infinity ? Infinity : a.length; },
    /** 'both' | 'line' | 'point' | 'none' */
    symType: (f) => {
      const l = Fig.axisCount(f) > 0, p = Fig.isPointSym(f);
      return l && p ? 'both' : l ? 'line' : p ? 'point' : 'none';
    },
  };

  /* ---------- 난수 ---------- */
  const R = {
    int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    chance: (p) => Math.random() < p,
  };

  /* ---------- 숫자 표시 ---------- */
  function fmt(x, d = 1) {
    const k = Math.pow(10, d), r = Math.round(x * k) / k;
    return String(r);
  }

  /* ---------- 저장(학생 기기 안에만) ---------- */
  const Store = {
    key: 'congruence-symmetry-v1',
    read() { try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { return {}; } },
    write(obj) { try { localStorage.setItem(this.key, JSON.stringify(obj)); } catch (e) { /* 저장 불가 환경 */ } },
    get(k, def) { const o = this.read(); return k in o ? o[k] : def; },
    set(k, v) { const o = this.read(); o[k] = v; this.write(o); },
  };

  /* ---------- 소리 ---------- */
  const Sound = {
    ctx: null,
    on: Store.get('sound', true),
    ensure() {
      if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } }
      return this.ctx;
    },
    tone(freq, dur = 0.12, type = 'sine', delay = 0, vol = 0.18) {
      if (!this.on) return;
      const ctx = this.ensure(); if (!ctx) return;
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    good() { this.tone(660, 0.12, 'triangle'); this.tone(880, 0.16, 'triangle', 0.09); },
    bad() { this.tone(220, 0.18, 'sawtooth', 0, 0.08); },
    tap() { this.tone(520, 0.05, 'sine', 0, 0.08); },
    win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', i * 0.11)); },
    toggle() { this.on = !this.on; Store.set('sound', this.on); return this.on; },
  };

  /* ---------- 알림/효과 ---------- */
  let toastTimer = null;
  function toast(msg, type = 'info', ms = 2200) {
    let t = document.getElementById('toast');
    if (!t) { t = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(t); }
    t.className = 'toast show ' + type;
    if (/<\/?b>/.test(msg)) t.innerHTML = msg; else t.textContent = msg; // 앱 안에서 만든 문구만 들어온다(굵게 표시 허용)
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast ' + type; }, ms);
  }
  function confetti(n = 40) {
    const box = el('div', { class: 'confetti' });
    const colors = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff', '#ff9f45'];
    for (let i = 0; i < n; i++) {
      box.appendChild(el('i', {
        style: {
          left: Math.random() * 100 + '%', background: R.pick(colors),
          animationDelay: (Math.random() * 0.4) + 's', animationDuration: (1.2 + Math.random() * 1.2) + 's',
          transform: `rotate(${Math.random() * 360}deg)`,
        },
      }));
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2800);
  }
  function shake(node) {
    if (!node) return;
    node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake');
  }

  /* ---------- 애니메이션 ---------- */
  function animate(ms, fn, done) {
    // 화면이 숨겨져 있으면(requestAnimationFrame 멈춤) 바로 끝 상태로
    if (document.hidden) { fn(1); if (done) setTimeout(done, 0); return; }
    const t0 = performance.now();
    const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    function frame(now) {
      const t = Math.min(1, (now - t0) / ms);
      fn(ease(t));
      if (t < 1) requestAnimationFrame(frame); else if (done) done();
    }
    requestAnimationFrame(frame);
  }

  window.C = { el, sv, clear, V, Poly, Fig, R, KO, fmt, Store, Sound, toast, confetti, shake, animate };
})();
