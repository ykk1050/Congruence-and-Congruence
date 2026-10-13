/* =========================================================
   stage.js — 모눈/도형을 그리는 SVG 무대 + 터치 입력
   ========================================================= */
(function () {
  'use strict';
  const { sv, V, Poly, Fig } = C;

  class Stage {
    constructor(parent, opt) {
      this.o = Object.assign({ x0: 0, y0: 0, w: 10, h: 10, grid: false, step: 1, cls: '' }, opt);
      const { x0, y0, w, h } = this.o;
      this.svg = sv('svg', { viewBox: `${x0} ${y0} ${w} ${h}`, class: 'stage ' + this.o.cls, preserveAspectRatio: 'xMidYMid meet' });
      // 무대 크기와 관계없이 글자가 비슷한 크기로 보이도록 (단위: 도형 좌표)
      this.fs = Math.max(w, h * 1.45) / 16 * 0.6;
      this.svg.style.fontSize = this.fs + 'px';
      this.layers = {};
      ['bg', 'grid', 'main', 'help', 'over', 'ui', 'top'].forEach(n => { this.layers[n] = sv('g', { class: 'layer-' + n }); this.svg.appendChild(this.layers[n]); });
      if (this.o.grid) this.drawGrid();
      parent.appendChild(this.svg);
      this.handlers = {};
      this._bindPointer();
    }

    /* ----- 좌표 ----- */
    pt(evt) {
      const p = this.svg.createSVGPoint();
      p.x = evt.clientX; p.y = evt.clientY;
      const m = this.svg.getScreenCTM();
      if (!m) return [0, 0];
      const q = p.matrixTransform(m.inverse());
      return [q.x, q.y];
    }
    /** 화면 1px이 몇 단위인지 */
    unitPerPx() {
      const r = this.svg.getBoundingClientRect();
      return r.width ? Math.max(this.o.w / r.width, this.o.h / r.height) : 0.05;
    }

    _bindPointer() {
      let start = null, dragging = false, id = null;
      this.svg.addEventListener('pointerdown', (e) => {
        if (id !== null) return;
        id = e.pointerId; start = this.pt(e); dragging = false;
        try { this.svg.setPointerCapture(id); } catch (err) { /* noop */ }
        if (this.handlers.down) this.handlers.down(start, e);
      });
      this.svg.addEventListener('pointermove', (e) => {
        if (e.pointerId !== id || !start) return;
        const p = this.pt(e);
        if (!dragging && V.dist(p, start) / this.unitPerPx() > 8) {
          dragging = true;
          if (this.handlers.dragStart) this.handlers.dragStart(start, e);
        }
        if (dragging && this.handlers.dragMove) this.handlers.dragMove(p, start, e);
      });
      const up = (e) => {
        if (e.pointerId !== id) return;
        const p = this.pt(e);
        if (dragging) { if (this.handlers.dragEnd) this.handlers.dragEnd(p, start, e); }
        else if (this.handlers.tap) this.handlers.tap(start, e);
        id = null; start = null; dragging = false;
      };
      this.svg.addEventListener('pointerup', up);
      this.svg.addEventListener('pointercancel', (e) => { if (e.pointerId === id) { id = null; start = null; dragging = false; } });
    }
    on(h) { Object.assign(this.handlers, h); return this; }

    /* ----- 그리기 ----- */
    L(name) { return this.layers[name || 'main']; }
    clearLayer(name) { const g = this.L(name); while (g.firstChild) g.removeChild(g.firstChild); }
    add(node, layer) { this.L(layer).appendChild(node); return node; }

    drawGrid() {
      const { x0, y0, w, h, step } = this.o, g = this.L('grid');
      g.appendChild(sv('rect', { x: x0, y: y0, width: w, height: h, class: 'grid-bg' }));
      for (let x = Math.ceil(x0); x <= x0 + w + 1e-9; x += step) g.appendChild(sv('line', { x1: x, y1: y0, x2: x, y2: y0 + h, class: 'grid-line' }));
      for (let y = Math.ceil(y0); y <= y0 + h + 1e-9; y += step) g.appendChild(sv('line', { x1: x0, y1: y, x2: x0 + w, y2: y, class: 'grid-line' }));
    }
    /** 도형판(점판) 못 */
    drawPegs(r = 0.13) {
      const { x0, y0, w, h } = this.o, g = this.L('grid');
      g.appendChild(sv('rect', { x: x0, y: y0, width: w, height: h, class: 'board-bg', rx: 0.3 }));
      for (let x = Math.ceil(x0 + 0.5); x <= x0 + w - 0.5 + 1e-9; x++)
        for (let y = Math.ceil(y0 + 0.5); y <= y0 + h - 0.5 + 1e-9; y++)
          g.appendChild(sv('circle', { cx: x, cy: y, r, class: 'peg' }));
    }

    poly(pts, attrs, layer) { return this.add(sv('polygon', Object.assign({ points: pts.map(p => p.join(',')).join(' ') }, attrs)), layer); }
    polyline(pts, attrs, layer) { return this.add(sv('polyline', Object.assign({ points: pts.map(p => p.join(',')).join(' '), fill: 'none' }, attrs)), layer); }
    line(a, b, attrs, layer) { return this.add(sv('line', Object.assign({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, attrs)), layer); }
    circle(c, r, attrs, layer) { return this.add(sv('circle', Object.assign({ cx: c[0], cy: c[1], r }, attrs)), layer); }
    text(p, str, attrs, layer) { return this.add(sv('text', Object.assign({ x: p[0], y: p[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'lbl' }, attrs), str), layer); }
    path(d, attrs, layer) { return this.add(sv('path', Object.assign({ d }, attrs)), layer); }

    /** 도형(figure) 그리기 */
    fig(f, attrs, layer) {
      attrs = Object.assign({ class: 'shape' }, attrs);
      if (f.kind === 'poly') return this.poly(f.pts, attrs, layer);
      if (f.kind === 'circle') return this.circle(f.c, f.r, attrs, layer);
      const g = this.add(sv('g', { class: (attrs.class || '') + ' strokes' }), layer);
      f.segs.forEach(s => g.appendChild(sv('line', { x1: s[0][0], y1: s[0][1], x2: s[1][0], y2: s[1][1] })));
      if (attrs.style) g.setAttribute('style', attrs.style);
      return g;
    }
    /** 점 위치를 갱신 */
    setPoints(node, pts) { node.setAttribute('points', pts.map(p => p.join(',')).join(' ')); }

    /** 꼭짓점 이름 (다각형 바깥쪽에 배치) */
    vertexLabels(pts, labels, opt = {}) {
      const off = Math.max(opt.off || 0, this.fs * 0.95), out = [];
      pts.forEach((p, i) => {
        if (!labels[i]) return;
        let d = Poly.inward(pts, i);
        if (!isFinite(d[0])) d = V.norm(V.sub(Poly.centroid(pts), p));
        const q = V.sub(p, V.mul(d, off));
        out.push(this.text(q, labels[i], { class: 'vlabel ' + (opt.cls || '') }, opt.layer || 'ui'));
      });
      return out;
    }
    /** 각 표시 호 */
    anglePath(P, i, r) {
      const n = P.length, v = P[i];
      const ang = Poly.angleAt(P, i), s = Poly.orient(P);
      const w = V.norm(V.sub(P[(i + 1) % n], v)), u = V.rotVec(w, s * ang);
      if (Math.abs(ang - 90) < 0.5) {
        const k = r * 0.75, a = V.add(v, V.mul(w, k)), b = V.add(v, V.mul(u, k)), c = V.add(a, V.mul(u, k));
        return `M${a[0]},${a[1]} L${c[0]},${c[1]} L${b[0]},${b[1]}`;
      }
      const a = V.add(v, V.mul(w, r)), b = V.add(v, V.mul(u, r));
      const large = ang > 180 ? 1 : 0, sweep = s > 0 ? 1 : 0;
      return `M${a[0]},${a[1]} A${r},${r} 0 ${large} ${sweep} ${b[0]},${b[1]}`;
    }
    angleArc(P, i, r, attrs, layer) { return this.path(this.anglePath(P, i, r), Object.assign({ class: 'arc' }, attrs), layer); }
    /** 각 안쪽 부채꼴(채움) */
    angleWedge(P, i, r, attrs, layer) {
      const n = P.length, v = P[i];
      const ang = Poly.angleAt(P, i), s = Poly.orient(P);
      const w = V.norm(V.sub(P[(i + 1) % n], v)), u = V.rotVec(w, s * ang);
      const a = V.add(v, V.mul(w, r)), b = V.add(v, V.mul(u, r));
      return this.path(`M${v[0]},${v[1]} L${a[0]},${a[1]} A${r},${r} 0 ${ang > 180 ? 1 : 0} ${s > 0 ? 1 : 0} ${b[0]},${b[1]} Z`, Object.assign({ class: 'wedge' }, attrs), layer);
    }
    /** 직각 표시 */
    rightMark(v, d1, d2, k, attrs, layer) {
      const a = V.add(v, V.mul(V.norm(d1), k)), b = V.add(v, V.mul(V.norm(d2), k)), c = V.add(a, V.mul(V.norm(d2), k));
      return this.path(`M${a[0]},${a[1]} L${c[0]},${c[1]} L${b[0]},${b[1]}`, Object.assign({ class: 'right-mark' }, attrs), layer);
    }
    /** 직선 a-b를 화면 끝까지 늘인 두 점 */
    clipLine(a, b, pad = 0) {
      const { x0, y0, w, h } = this.o;
      const X0 = x0 + pad, Y0 = y0 + pad, X1 = x0 + w - pad, Y1 = y0 + h - pad;
      const d = V.sub(b, a);
      let t0 = -Infinity, t1 = Infinity;
      const clip = (p, q) => {
        if (Math.abs(p) < 1e-12) return q >= 0;
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
        return true;
      };
      if (!clip(-d[0], a[0] - X0) || !clip(d[0], X1 - a[0]) || !clip(-d[1], a[1] - Y0) || !clip(d[1], Y1 - a[1])) return null;
      if (t0 > t1) return null;
      return [V.add(a, V.mul(d, t0)), V.add(a, V.mul(d, t1))];
    }
    fullLine(a, b, attrs, layer, pad) {
      const s = this.clipLine(a, b, pad || 0);
      return s ? this.line(s[0], s[1], attrs, layer) : null;
    }
    /** 가장 가까운 격자점 */
    snap(p, maxD = 0.45) {
      const q = [Math.round(p[0]), Math.round(p[1])];
      return V.dist(p, q) <= maxD ? q : null;
    }
  }

  /** 꼭짓점/변 찾기 */
  function nearestVertex(pts, p, r) {
    let best = -1, bd = r;
    pts.forEach((q, i) => { const d = V.dist(p, q); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function nearestSide(pts, p, r) {
    let best = -1, bd = r;
    pts.forEach((q, i) => { const d = V.distToSeg(p, q, pts[(i + 1) % pts.length]); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  /** 도형 B를 도형 A 위로 옮기는 합동 변환 애니메이션 (뒤집기 → 돌리기·밀기)
      map[i] : B의 i번째 꼭짓점이 겹칠 A의 꼭짓점 번호 */
  function isometryFrames(B, A, map) {
    const A2 = B.map((_, i) => A[map[i]]);
    const cB = Poly.centroid(B), cA = Poly.centroid(A2);
    const flip = Math.sign(V.cross(V.sub(B[1], B[0]), V.sub(B[2], B[0]))) !== Math.sign(V.cross(V.sub(A2[1], A2[0]), V.sub(A2[2], A2[0])));
    const B1 = flip ? B.map(p => [2 * cB[0] - p[0], p[1]]) : B;
    let theta = V.angleOf(V.sub(A2[1], A2[0])) - V.angleOf(V.sub(B1[1], B1[0]));
    theta = ((theta + 540) % 360) - 180;
    return {
      flip,
      at(t) { // t: 0~1
        let pts = B;
        let t1 = t, t2 = t;
        if (flip) { t1 = Math.min(1, t * 2); t2 = Math.max(0, t * 2 - 1); pts = B.map(p => [cB[0] + (p[0] - cB[0]) * (1 - 2 * t1), p[1]]); if (t1 < 1) return pts; pts = B1; }
        const c = V.lerp(cB, cA, t2);
        return pts.map(p => V.add(c, V.rotVec(V.sub(p, cB), theta * t2)));
      },
    };
  }

  window.Stage = Stage;
  window.Hit = { nearestVertex, nearestSide };
  window.isometryFrames = isometryFrames;
})();
