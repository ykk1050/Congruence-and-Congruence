/* =========================================================
   scenes.js — 전시실(차시)마다 상황을 보여 주는 장면 그림
   교과서의 이야기(다윤이와 승현이의 미술관 탐험)에 맞춘 그림을 활동 화면 맨 위에 보여 준다.
   ========================================================= */
(function () {
  'use strict';
  const { sv, V } = C;
  const W = 32, H = 8;

  const P = (pts) => pts.map(p => p.join(',')).join(' ');
  const rect = (g, x, y, w, h, cls, rx) => g.appendChild(sv('rect', { x, y, width: w, height: h, rx: rx || 0, class: cls }));
  const poly = (g, pts, cls, extra) => g.appendChild(sv('polygon', Object.assign({ points: P(pts), class: cls }, extra || {})));
  const text = (g, x, y, t, cls) => g.appendChild(sv('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: cls }, t));
  /** 다윤이와 승현이 */
  function kids(g, x, y, s = 1) {
    text(g, x, y, '👧', 'sc-kid').setAttribute('font-size', 1.9 * s);
    text(g, x + 1.9 * s, y + 0.05, '👦', 'sc-kid').setAttribute('font-size', 1.9 * s);
  }
  /** 미술관 벽과 바닥 */
  function room(g, floorY, wall = 'sc-wall', floor = 'sc-floor') {
    rect(g, 0, 0, W, floorY, wall);
    rect(g, 0, floorY, W, H - floorY, floor);
    rect(g, 0, floorY - 0.18, W, 0.18, 'sc-base');
  }
  function frame(g, x, y, w, h, inner) {
    rect(g, x - 0.22, y - 0.22, w + 0.44, h + 0.44, 'sc-frame', 0.08);
    rect(g, x, y, w, h, 'sc-canvas');
    if (inner) inner(x, y, w, h);
  }
  const reflectX = (pts, ax) => pts.map(([x, y]) => [2 * ax - x, y]);
  const rot180 = (pts, c) => pts.map(p => V.rot180(p, c));

  const SCENES = {
    /* 도형의 합동: 미술관 바닥에 모양과 크기가 같은 관람 방향 화살표 */
    l2(g) {
      room(g, 4.2);
      frame(g, 2, 0.9, 4.2, 2.4, (x, y, w, h) => { rect(g, x, y + h * 0.65, w, h * 0.35, 'sc-sea'); g.appendChild(sv('circle', { cx: x + w * 0.7, cy: y + h * 0.4, r: 0.55, class: 'sc-sun' })); });
      frame(g, 13.9, 0.9, 4.2, 2.4, (x, y, w, h) => poly(g, [[x, y + h], [x + w * 0.35, y + h * 0.3], [x + w * 0.6, y + h * 0.7], [x + w * 0.8, y + h * 0.4], [x + w, y + h]], 'sc-mount'));
      frame(g, 25.8, 0.9, 4.2, 2.4, (x, y, w, h) => { rect(g, x, y, w * 0.55, h * 0.6, 'sc-red'); rect(g, x + w * 0.55, y, w * 0.45, h * 0.35, 'sc-yellow'); rect(g, x, y + h * 0.6, w * 0.3, h * 0.4, 'sc-blue'); });
      for (let x = 0; x < W; x += 1) g.appendChild(sv('line', { x1: x, y1: 4.2, x2: x, y2: H, class: 'sc-floor-line' }));
      const arrow = [[0, 0.45], [1.7, 0.45], [1.7, 0], [2.8, 0.85], [1.7, 1.7], [1.7, 1.25], [0, 1.25]];
      [3, 9, 15, 21].forEach(x => poly(g, arrow.map(([a, b]) => [x + a, 5.3 + b]), 'sc-arrow'));
      kids(g, 27.4, 6.4);
    },
    /* 합동인 도형의 성질: 판에 새긴 도형과 찍어 낸 판화 */
    l3(g) {
      rect(g, 0, 0, W, H, 'sc-studio');
      rect(g, 0, 5.6, W, 2.4, 'sc-table');
      rect(g, 5, 1.2, 7, 5.2, 'sc-plate', 0.25);
      const tri = [[6.4, 5.4], [10.8, 5.4], [7.6, 2.0]];
      poly(g, tri, 'sc-carve');
      rect(g, 14.6, 1.0, 7.4, 5.6, 'sc-paper', 0.1);
      poly(g, reflectX(tri, 8.5).map(([x, y]) => [x + 9.8, y]), 'sc-print');
      // 롤러
      rect(g, 23.2, 4.8, 3.6, 0.9, 'sc-roller', 0.45);
      rect(g, 24.8, 3.6, 0.3, 1.3, 'sc-handle');
      text(g, 8.5, 0.6, '판에 새긴 도형', 'sc-cap');
      text(g, 18.3, 0.5, '찍어 낸 도형', 'sc-cap');
      kids(g, 28, 6.6);
    },
    /* 선대칭도형: 미술관의 색유리 창문 */
    l4(g) {
      room(g, 7.2, 'sc-wall2');
      // 창틀(아치)과 색유리 무늬 (세로 대칭축에 대해 대칭)
      const cx = 16, top = 0.5, bot = 7.0, hw = 4.6;
      g.appendChild(sv('path', { d: `M${cx - hw},${bot} L${cx - hw},${top + 2.4} A${hw},${hw * 0.55} 0 0 1 ${cx + hw},${top + 2.4} L${cx + hw},${bot} Z`, class: 'sc-window' }));
      const half = [
        [[cx, top + 0.4], [cx - 2.2, top + 1.6], [cx, top + 2.8]],
        [[cx, top + 2.8], [cx - 3.8, top + 2.6], [cx - 3.6, top + 4.6], [cx, top + 4.4]],
        [[cx, top + 4.4], [cx - 2.6, top + 5.2], [cx, top + 6.3]],
        [[cx - 3.6, top + 4.6], [cx - 4.3, top + 6.4], [cx - 2.6, top + 5.2]],
      ];
      const cls = ['sc-g1', 'sc-g2', 'sc-g3', 'sc-g4'];
      half.forEach((q, i) => { poly(g, q, 'sc-glass ' + cls[i]); poly(g, reflectX(q, cx), 'sc-glass ' + cls[i]); });
      // 햇빛
      [[3, 1], [5, 3], [27, 1.5], [29, 3.5]].forEach(([x, y]) => g.appendChild(sv('circle', { cx: x, cy: y, r: 0.25, class: 'sc-spark' })));
      kids(g, 24, 6.3);
    },
    /* 선대칭도형의 성질: 색종이를 반으로 접어 오린 선대칭도형 작품 */
    l5(g) {
      room(g, 6.2, 'sc-wall3');
      const art = [
        { ax: 5, pts: [[5, 1.6], [3.7, 0.8], [2.4, 1.2], [2.5, 2.7], [3.9, 3.2], [2.8, 4.1], [3.2, 5.1], [4.4, 4.7], [5, 3.7]], cls: 'sc-p1' }, // 나비
        { ax: 12, pts: [[12, 1.0], [10.6, 2.6], [11.4, 2.6], [10.0, 4.2], [11.2, 4.2], [11.6, 5.2], [12, 5.2]], cls: 'sc-p2' }, // 나무
        { ax: 19, pts: [[19, 2.0], [18, 0.9], [16.8, 1.4], [16.8, 2.8], [19, 5.2]], cls: 'sc-p3' },                      // 하트
        { ax: 26, pts: [[26, 0.8], [25.2, 2.4], [23.6, 2.6], [24.8, 3.6], [24.4, 5.2], [26, 4.3]], cls: 'sc-p4' },        // 별
      ];
      art.forEach(a => {
        rect(g, a.ax - 3, 0.5, 6, 5.1, 'sc-card', 0.15);
        poly(g, a.pts.concat(reflectX(a.pts.slice(1, -1), a.ax).reverse()), 'sc-cut ' + a.cls);
      });
      text(g, 16, 7.1, '✂ 색종이를 반으로 접어 오려 만든 작품', 'sc-cap dark');
      kids(g, 28.8, 6.7);
    },
    /* 점대칭도형: 미술관 천장에 매달린 글자 작품 */
    l7(g) {
      rect(g, 0, 0, W, H, 'sc-wall4');
      rect(g, 0, 0, W, 0.6, 'sc-ceiling');
      const L = Shapes.letterLib;
      [['ㄹ', 4, 'sc-l1'], ['ㅍ', 10, 'sc-l2'], ['ㄹ', 16, 'sc-l3'], ['ㅍ', 22, 'sc-l4'], ['ㄹ', 28, 'sc-l1']].forEach(([ch, x, cls], i) => {
        const y = i % 2 ? 2.6 : 1.6;
        g.appendChild(sv('line', { x1: x, y1: 0.6, x2: x, y2: y, class: 'sc-string' }));
        const s = 1.4, segs = L[ch];
        const grp = sv('g', { class: 'sc-letter ' + cls });
        segs.forEach(([a, b]) => grp.appendChild(sv('line', { x1: x + (a[0] - 1) * s, y1: y + 0.2 + a[1] * s, x2: x + (b[0] - 1) * s, y2: y + 0.2 + b[1] * s })));
        g.appendChild(grp);
      });
      kids(g, 13.9, 6.9);
    },
    /* 점대칭도형의 성질: 복도에 전시된 점대칭도형 작품 */
    l8(g) {
      room(g, 6.4, 'sc-wall5');
      const works = [
        { c: [5, 3.2], pts: [[0.8, -2.2], [0.8, -0.8], [2.2, 0.8], [0.8, 0.8], [-0.8, 2.2], [-0.8, 0.8], [-2.2, -0.8], [-0.8, -0.8]], cls: 'sc-p1' }, // 바람개비
        { c: [13, 3.2], pts: [[-2.2, -1.6], [0.6, -1.6], [0.6, -0.4], [2.2, -0.4], [2.2, 1.6], [-0.6, 1.6], [-0.6, 0.4], [-2.2, 0.4]], cls: 'sc-p2' }, // Z
        { c: [21, 3.2], pts: [[-2.4, 1.4], [0.8, 1.4], [2.4, -1.4], [-0.8, -1.4]], cls: 'sc-p3' }, // 평행사변형
        { c: [28.4, 3.2], pts: [[-1.6, -2], [1.6, -2], [2.2, 0], [1.6, 2], [-1.6, 2], [-2.2, 0]], cls: 'sc-p4' }, // 육각형
      ];
      works.forEach(w => {
        rect(g, w.c[0] - 3, 0.5, 6, 5.4, 'sc-card', 0.15);
        poly(g, w.pts.map(p => V.add(p, w.c)), 'sc-cut ' + w.cls);
        g.appendChild(sv('circle', { cx: w.c[0], cy: w.c[1], r: 0.14, class: 'sc-dot' }));
      });
      kids(g, 16.1, 7.1, 0.9);
    },
    /* 단원 정리: 교통안전 체험관 */
    l12(g) {
      rect(g, 0, 0, W, 4.8, 'ts-sky');
      g.appendChild(sv('circle', { cx: 29.5, cy: 1.2, r: 0.7, class: 'ts-sun' }));
      rect(g, 6, 1.6, 20, 3.2, 'ts-bldg', 0.15);
      rect(g, 11.5, 0.8, 9, 1.0, 'ts-board', 0.2);
      text(g, 16, 1.3, '🚸 교통안전 체험관', 'sc-board-lbl');
      for (let i = 0; i < 5; i++) rect(g, 7.5 + i * 3.6, 2.4, 1.8, 1.1, 'ts-win', 0.1);
      rect(g, 0, 4.8, W, 2, 'ts-road');
      for (let x = 12; x < 20; x += 1.1) rect(g, x, 4.95, 0.6, 1.7, 'ts-zebra');
      rect(g, 0, 6.8, W, 1.2, 'ts-walk');
      // 표지판들
      const sign = (x, shape, fill, edge) => {
        rect(g, x - 0.08, 3.2, 0.16, 3.6, 'ts-pole');
        poly(g, shape.map(([a, b]) => [x + a, 2.6 + b]), 'sc-sign', { style: `fill:${fill};stroke:${edge}` });
      };
      sign(3, [[0, -1], [1, 0.8], [-1, 0.8]], '#ffd43b', '#c92a2a');
      sign(5.2, Array.from({ length: 8 }, (_, i) => V.rotVec([1, 0], 22.5 + i * 45)), '#e03131', '#fff');
      sign(27, [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]], '#4dabf7', '#1864ab');
      kids(g, 28.6, 6.9, 0.85);
    },
  };

  /** 전시실 장면 그림(SVG 요소) */
  function scene(lessonId) {
    const draw = SCENES[lessonId];
    if (!draw) return null;
    const svgEl = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'scene-banner', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': '상황 그림' });
    svgEl.style.fontSize = '0.55px';
    draw(svgEl);
    return svgEl;
  }
  window.Scenes = { scene };
})();
