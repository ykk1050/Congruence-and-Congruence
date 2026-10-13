/* =========================================================
   shapes.js — 무작위 도형 생성기와 도형/글자 모음
   ========================================================= */
(function () {
  'use strict';
  const { V, Poly, Fig, R } = C;

  /* ---------- 격자 다각형 (합동 게임) ---------- */
  const D4 = [
    p => [p[0], p[1]], p => [-p[1], p[0]], p => [-p[0], -p[1]], p => [p[1], -p[0]],
    p => [-p[0], p[1]], p => [p[1], p[0]], p => [p[0], -p[1]], p => [-p[1], -p[0]],
  ];
  function normalize(P) {
    const b = Poly.bbox(P);
    return P.map(p => [p[0] - b.x0, p[1] - b.y0]);
  }
  function d4(P, k) { return normalize(P.map(D4[k])); }

  const latticeLib = {
    1: [
      () => { const a = R.int(2, 4), b = R.int(2, 4); return [[0, 0], [a, 0], [0, b]]; },
      () => { let a = R.int(1, 4), b = R.int(2, 4); if (a === b) b++; return [[0, 0], [a, 0], [a, b], [0, b]]; },
      () => { const a = R.int(2, 4), h = R.int(2, 3), t = R.int(0, a); return [[0, h], [a, h], [t, 0]]; },
    ],
    2: [
      () => { const a = R.int(2, 3), b = R.int(2, 3), s = R.int(1, 2); return [[0, 0], [a, 0], [a + s, b], [s, b]]; },
      () => { const a = R.int(4, 5), b = R.int(2, 3), s = R.int(1, 2), t = R.int(1, a - s - 1); return [[0, b], [a, b], [a - s, 0], [t, 0]]; },
      () => { const L = R.int(1, 3); return [[0, 1], [L, 1], [L, 0], [L + 2, 2], [L, 4], [L, 3], [0, 3]]; },
      () => { const w = R.int(2, 4), r = R.int(1, 2), q = R.int(2, 3), p = R.int(0, w); return [[0, r], [p, 0], [w, r], [w, r + q], [0, r + q]]; },
    ],
    3: [
      () => { const a = R.int(2, 3), b = R.int(2, 3); return [[0, 0], [1, 0], [1, a], [b, a], [b, a + 1], [0, a + 1]]; },
      () => { for (;;) { const P = [[0, 0], [R.int(1, 4), R.int(0, 4)], [R.int(0, 4), R.int(1, 4)]]; if (Math.abs(Poly.area2(P)) >= 4 && Poly.isSimple(P)) return P; } },
      () => {
        for (;;) {
          const pts = [0, 1, 2, 3].map(() => [R.int(0, 4), R.int(0, 4)]);
          const c = Poly.centroid(pts);
          pts.sort((a, b) => V.angleOf(V.sub(a, c)) - V.angleOf(V.sub(b, c)));
          if (Poly.isSimple(pts) && Math.abs(Poly.area2(pts)) >= 8) return pts;
        }
      },
      () => { const L = R.int(1, 2), a = R.int(1, 2); return [[0, a], [L + 1, a], [L + 1, 0], [L + 3, a + 1], [L + 1, 2 * a + 2], [L + 1, a + 2], [0, a + 2]]; },
    ],
  };
  function latticeShape(level) {
    const pool = latticeLib[1].concat(level >= 2 ? latticeLib[2] : []).concat(level >= 3 ? latticeLib[3] : []);
    for (;;) {
      const P = normalize(R.pick(pool)());
      if (Poly.isSimple(P)) return P;
    }
  }
  /** 합동이 아닌 비슷한 도형 */
  function nearMiss(P, maxSize = 6) {
    const moves = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    for (let t = 0; t < 200; t++) {
      let Q;
      if (R.chance(0.3)) {
        const b = Poly.bbox(P), ax = R.int(0, 1);
        const edge = ax ? b.y1 : b.x1;
        Q = P.map(p => (p[ax] === edge ? (ax ? [p[0], p[1] + 1] : [p[0] + 1, p[1]]) : p.slice()));
      } else {
        const i = R.int(0, P.length - 1), m = R.pick(moves);
        Q = P.map((p, j) => (j === i ? V.add(p, m) : p.slice()));
      }
      Q = normalize(Q);
      const b = Poly.bbox(Q);
      if (b.w > maxSize || b.h > maxSize) continue;
      if (Poly.isSimple(Q) && !Poly.congruent(P, Q)) return Q;
    }
    return null;
  }

  /* ---------- 일반 다각형(판화 게임) ---------- */
  /** 각을 5° 단위로 갖는 삼각형 (밑변 5) */
  function niceTriangle() {
    for (;;) {
      const a = R.int(7, 19) * 5, b = R.int(7, 19) * 5, c = 180 - a - b;
      if (c < 35) continue;
      const base = 5, rad = Math.PI / 180;
      const len = base * Math.sin(b * rad) / Math.sin(c * rad);
      const P = [[0, 0], [base, 0], [len * Math.cos(a * rad), -len * Math.sin(a * rad)]];
      const bb = Poly.bbox(P);
      if (bb.h < 2.2 || bb.w > 7.5) continue;
      return { pts: P, ang: [a, b, c] };
    }
  }
  function niceQuad() {
    for (;;) {
      const w = R.int(45, 60) / 10, h = R.int(25, 40) / 10;
      const P = [[0, 0], [w, 0], [w - R.int(0, 20) / 10, -h + R.int(-8, 8) / 10], [R.int(5, 22) / 10, -h + R.int(-6, 6) / 10]];
      if (!Poly.isSimple(P)) continue;
      const A = Poly.angles(P);
      if (A.some(x => x < 50 || x > 150)) continue;
      return { pts: P };
    }
  }
  function transformFig(P, deg, flip) {
    const c = Poly.centroid(P);
    let Q = P.map(p => V.sub(p, c));
    if (flip) Q = Q.map(p => [-p[0], p[1]]);
    return Q.map(p => V.rotVec(p, deg));
  }
  /** 합동인 두 도형을 같은 배율로 배치: base와 base를 변환한 도형(transformFig 결과)
      size: 도형이 어떤 방향으로 돌아가도 들어가는 원의 지름 */
  function placePair(base, moved, ca, cb, size) {
    const c = Poly.centroid(base);
    const r = Math.max(...base.map(p => V.dist(p, c)));
    const k = size / (2 * r);
    return {
      A: base.map(p => [ca[0] + (p[0] - c[0]) * k, ca[1] + (p[1] - c[1]) * k]),
      B: moved.map(p => [cb[0] + p[0] * k, cb[1] + p[1] * k]),
      k,
    };
  }
  /** 다각형을 (cx,cy) 중심, 최대 크기 s 안에 맞추기 */
  function fitTo(P, cx, cy, s) {
    const b = Poly.bbox(P), k = s / Math.max(b.w, b.h);
    return P.map(p => [cx + (p[0] - b.cx) * k, cy + (p[1] - b.cy) * k]);
  }

  /* ---------- 대칭 도형 모음 ---------- */
  const reg = (n, r = 3, rot = -90) => Array.from({ length: n }, (_, i) => V.rotVec([r, 0], rot + i * 360 / n));
  const polyLib = {
    정사각형: () => [[-2.5, -2.5], [2.5, -2.5], [2.5, 2.5], [-2.5, 2.5]],
    직사각형: () => [[-3.4, -2], [3.4, -2], [3.4, 2], [-3.4, 2]],
    마름모: () => [[0, -3.2], [2.2, 0], [0, 3.2], [-2.2, 0]],
    평행사변형: () => [[-3.4, 1.8], [1.4, 1.8], [3.4, -1.8], [-1.4, -1.8]],
    정삼각형: () => reg(3, 3.3),
    이등변삼각형: () => [[0, -3.3], [2.2, 2.6], [-2.2, 2.6]],
    직각이등변삼각형: () => [[-2.6, -2.6], [2.6, 2.6], [-2.6, 2.6]],
    직각삼각형: () => [[-2.2, -3.2], [-2.2, 2.4], [1.6, 2.4]],
    부등변삼각형: () => [[-3.4, 2.2], [3.4, 2.2], [2.2, -2.8]],
    등변사다리꼴: () => [[-1.6, -2], [1.6, -2], [3.2, 2], [-3.2, 2]],
    직각사다리꼴: () => [[-2.8, -2.2], [0.8, -2.2], [2.8, 2.2], [-2.8, 2.2]],
    사다리꼴: () => [[-1.8, -2.2], [2.4, -2.2], [3.2, 2.2], [-3.2, 2.2]],
    연모양: () => [[0, -3.4], [2.2, -1], [0, 3.4], [-2.2, -1]],
    정오각형: () => reg(5, 3.2),
    정육각형: () => reg(6, 3.2, 0),
    정팔각형: () => reg(8, 3.2, 22.5),
    화살표: () => [[0, -3.4], [3, -0.4], [1.2, -0.4], [1.2, 3.2], [-1.2, 3.2], [-1.2, -0.4], [-3, -0.4]],
    양쪽화살표: () => [[-3.6, 0], [-1.6, -2], [-1.6, -0.8], [1.6, -0.8], [1.6, -2], [3.6, 0], [1.6, 2], [1.6, 0.8], [-1.6, 0.8], [-1.6, 2]],
    십자: () => [[-1, -3], [1, -3], [1, -1], [3, -1], [3, 1], [1, 1], [1, 3], [-1, 3], [-1, 1], [-3, 1], [-3, -1], [-1, -1]],
    별: () => Array.from({ length: 10 }, (_, i) => V.rotVec([i % 2 ? 1.4 : 3.4, 0], -90 + i * 36)),
    집모양: () => [[0, -3.2], [2.8, -0.6], [2.8, 3], [-2.8, 3], [-2.8, -0.6]],
    하트: () => [[0, -1.4], [1.4, -3], [3, -2.2], [3, -0.4], [0, 3.2], [-3, -0.4], [-3, -2.2], [-1.4, -3]],
    바람개비: () => [[1, -3], [1, -1], [3, 1], [1, 1], [-1, 3], [-1, 1], [-3, -1], [-1, -1]],
    Z모양: () => [[-3, -2.4], [1, -2.4], [1, -0.6], [3, -0.6], [3, 2.4], [-1, 2.4], [-1, 0.6], [-3, 0.6]],
    번개: () => [[-3.2, -2], [0.6, -2], [3.2, 2], [-0.6, 2]],
    육각평행: () => [[-3, -1], [-1, -2.6], [2.4, -2.6], [3, 1], [1, 2.6], [-2.4, 2.6]],
    오목사각형: () => [[0, -3.2], [2.8, 2.6], [0, 0.8], [-2.8, 2.6]],
    비대칭오각형: () => [[-2.6, -2.4], [1.6, -3], [3.2, 0.4], [0.8, 2.8], [-3, 1.6]],
    L모양: () => [[-2.4, -3], [-0.4, -3], [-0.4, 1], [3, 1], [3, 3], [-2.4, 3]],
    // 자연에서 찾은 선대칭 모양 (지도서: 생활 속 선대칭도형)
    나비: () => [[0, -1.6], [0.8, -2.6], [2.2, -3.4], [3.4, -3], [3.6, -1.6], [2.8, -0.4], [1, 0.2], [2, 0.8], [2.4, 2], [1.8, 2.9], [0.8, 2.6], [0, 1.6], [-0.8, 2.6], [-1.8, 2.9], [-2.4, 2], [-2, 0.8], [-1, 0.2], [-2.8, -0.4], [-3.6, -1.6], [-3.4, -3], [-2.2, -3.4], [-0.8, -2.6]],
    나뭇잎: () => [[0, -3.6], [1.4, -2.6], [2.3, -0.9], [2.2, 0.8], [1.4, 2], [0.3, 2.7], [0.3, 3.8],
      [-0.3, 3.8], [-0.3, 2.7], [-1.4, 2], [-2.2, 0.8], [-2.3, -0.9], [-1.4, -2.6]],
    도토리: () => [[-0.3, -3.9], [0.3, -3.9], [0.3, -3.35], [1.2, -3], [2.6, -2.2], [2.8, -1.2], [2, -1], [2, 0.8], [1.2, 2.4], [0, 3.4],
      [-1.2, 2.4], [-2, 0.8], [-2, -1], [-2.8, -1.2], [-2.6, -2.2], [-1.2, -3], [-0.3, -3.35]],
    // 펜토미노 (정사각형 5개를 이어 붙인 모양)
    T펜토미노: () => pento([[0, 0], [3, 0], [3, 1], [2, 1], [2, 3], [1, 3], [1, 1], [0, 1]]),
    U펜토미노: () => pento([[0, 0], [1, 0], [1, 1], [2, 1], [2, 0], [3, 0], [3, 2], [0, 2]]),
    V펜토미노: () => pento([[0, 0], [1, 0], [1, 2], [3, 2], [3, 3], [0, 3]]),
    W펜토미노: () => pento([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [1, 3], [1, 2], [0, 2]]),
    Z펜토미노: () => pento([[0, 0], [2, 0], [2, 2], [3, 2], [3, 3], [1, 3], [1, 1], [0, 1]]),
    N펜토미노: () => pento([[0, 0], [1, 0], [1, 1], [2, 1], [2, 4], [1, 4], [1, 2], [0, 2]]),
    L펜토미노: () => pento([[0, 0], [1, 0], [1, 3], [2, 3], [2, 4], [0, 4]]),
    P펜토미노: () => pento([[0, 0], [2, 0], [2, 2], [1, 2], [1, 3], [0, 3]]),
    F펜토미노: () => pento([[1, 0], [3, 0], [3, 1], [2, 1], [2, 3], [1, 3], [1, 2], [0, 2], [0, 1], [1, 1]]),
    Y펜토미노: () => pento([[1, 0], [2, 0], [2, 4], [1, 4], [1, 2], [0, 2], [0, 1], [1, 1]]),
  };
  /** 칸 좌표 외곽선을 가운데 맞춰 키우기 (긴 쪽 6) */
  function pento(P) {
    const b = Poly.bbox(P), k = 6 / Math.max(b.w, b.h, 3);
    return P.map(p => [(p[0] - b.cx) * k, (p[1] - b.cy) * k]);
  }
  const letterLib = {
    'ㄱ': [[[0, 0], [2, 0]], [[2, 0], [2, 2]]],
    'ㄴ': [[[0, 0], [0, 2]], [[0, 2], [2, 2]]],
    'ㄷ': [[[2, 0], [0, 0]], [[0, 0], [0, 2]], [[0, 2], [2, 2]]],
    'ㄹ': [[[0, 0], [2, 0]], [[2, 0], [2, 1]], [[2, 1], [0, 1]], [[0, 1], [0, 2]], [[0, 2], [2, 2]]],
    'ㅁ': [[[0, 0], [2, 0]], [[2, 0], [2, 2]], [[2, 2], [0, 2]], [[0, 2], [0, 0]]],
    'ㅂ': [[[0, 0], [0, 2]], [[2, 0], [2, 2]], [[0, 1], [2, 1]], [[0, 2], [2, 2]]],
    'ㅅ': [[[1, 0], [0, 2]], [[1, 0], [2, 2]]],
    'ㅈ': [[[0, 0], [2, 0]], [[1, 0], [0, 2]], [[1, 0], [2, 2]]],
    'ㅋ': [[[0, 0], [2, 0]], [[2, 0], [2, 2]], [[0, 1], [2, 1]]],
    'ㅌ': [[[0, 0], [2, 0]], [[0, 0], [0, 2]], [[0, 1], [2, 1]], [[0, 2], [2, 2]]],
    'ㅍ': [[[0, 0], [2, 0]], [[0.6, 0], [0.6, 2]], [[1.4, 0], [1.4, 2]], [[0, 2], [2, 2]]],
    'ㅏ': [[[0.6, 0], [0.6, 3]], [[0.6, 1.5], [1.6, 1.5]]],
    'ㅗ': [[[1, 0.3], [1, 1.5]], [[0, 1.5], [2, 1.5]]],
    'ㅜ': [[[0, 0.5], [2, 0.5]], [[1, 0.5], [1, 1.7]]],
    'ㅡ': [[[0, 1], [3, 1]]],
    'ㅣ': [[[1, 0], [1, 3]]],
    'N': [[[0, 3], [0, 0]], [[0, 0], [2, 3]], [[2, 3], [2, 0]]],
    'Z': [[[0, 0], [2, 0]], [[2, 0], [0, 3]], [[0, 3], [2, 3]]],
    'S': [[[2, 0], [0, 0]], [[0, 0], [0, 1.5]], [[0, 1.5], [2, 1.5]], [[2, 1.5], [2, 3]], [[2, 3], [0, 3]]],
    'H': [[[0, 0], [0, 3]], [[2, 0], [2, 3]], [[0, 1.5], [2, 1.5]]],
    'X': [[[0, 0], [2, 3]], [[2, 0], [0, 3]]],
    'I': [[[0, 0], [2, 0]], [[1, 0], [1, 3]], [[0, 3], [2, 3]]],
    'E': [[[2, 0], [0, 0]], [[0, 0], [0, 3]], [[0, 3], [2, 3]], [[0, 1.5], [1.6, 1.5]]],
    'A': [[[0, 3], [1, 0]], [[1, 0], [2, 3]], [[0.5, 1.5], [1.5, 1.5]]],
    'M': [[[0, 3], [0, 0]], [[0, 0], [1, 1.5]], [[1, 1.5], [2, 0]], [[2, 0], [2, 3]]],
    'T': [[[0, 0], [2, 0]], [[1, 0], [1, 3]]],
    'F': [[[2, 0], [0, 0]], [[0, 0], [0, 3]], [[0, 1.5], [1.5, 1.5]]],
    'L': [[[0, 0], [0, 3]], [[0, 3], [2, 3]]],
    'K': [[[0, 0], [0, 3]], [[2, 0], [0, 1.5]], [[0, 1.5], [2, 3]]],
    'V': [[[0, 0], [1, 3]], [[1, 3], [2, 0]]],
    'Y': [[[0, 0], [1, 1.5]], [[2, 0], [1, 1.5]], [[1, 1.5], [1, 3]]],
    '8': [[[0, 0], [2, 0]], [[0, 0], [0, 3]], [[2, 0], [2, 3]], [[0, 1.5], [2, 1.5]], [[0, 3], [2, 3]]],
  };
  function letter(ch, size = 5.5) {
    if (ch === 'ㅇ' || ch === 'O') return { fig: Fig.circle([0, 0], size * 0.42), name: ch };
    const segs = letterLib[ch];
    const pts = segs.flat(), b = Poly.bbox(pts), k = size / Math.max(b.w, b.h, 2);
    return { fig: Fig.strokes(segs.map(s => s.map(p => [(p[0] - b.cx) * k, (p[1] - b.cy) * k]))), name: ch };
  }
  function polyShape(name, rot = 0) {
    let P = polyLib[name]();
    if (rot) P = P.map(p => V.rotVec(p, rot));
    const c = Poly.centroid(P);
    return { fig: Fig.poly(P.map(p => V.round(V.sub(p, c), 1e9))), name };
  }

  /* ---------- 선대칭/점대칭 완성 문제 생성 ---------- */
  /** 선대칭: 대칭축 위 두 점 + 한쪽의 꼭짓점들 (격자) */
  function lineHalf(kind, N = 10) {
    for (let t = 0; t < 800; t++) {
      const k = R.int(2, 3);
      let a1, a2, A, B, pts = [];
      if (kind === 'v' || kind === 'h') {
        const ax = R.int(4, N - 4);
        a1 = [ax, R.int(0, 3)]; a2 = [ax, R.int(N - 3, N)];
        for (let i = 0; i < k; i++) pts.push([ax - R.int(1, Math.min(5, ax)), R.int(0, N)]);
        A = [ax, 0]; B = [ax, N];
      } else {
        // 대각선 대칭축 x - y = c
        const c = R.int(-1, 1);
        const u1 = R.int(Math.max(0, -c) + 1, 3), u2 = R.int(N - 4, N - 1 - Math.max(c, 0));
        a1 = [u1 + c, u1]; a2 = [u2 + c, u2];
        for (let i = 0; i < k; i++) { const x = R.int(0, N), y = R.int(0, N); if (x - y < c) pts.push([x, y]); }
        if (pts.length < 2) continue;
        A = [c, 0]; B = [N, N - c];
        if (c < 0) { A = [0, -c]; B = [N + c, N]; }
      }
      // 대칭축 위의 중점에서 본 각도 순서로 꼭짓점 정렬 (두 방향 모두 시도)
      const M = V.mid(a1, a2);
      const rel = (p) => (V.angleOf(V.sub(p, M)) - V.angleOf(V.sub(a1, M)) + 720) % 360;
      const asc = pts.slice().sort((a, b) => rel(a) - rel(b));
      for (const mid of [asc, asc.slice().reverse()]) {
        let G = [a1].concat(mid).concat([a2]);
        let AA = A, BB = B;
        if (kind === 'h') { G = G.map(p => [p[1], p[0]]); AA = [A[1], A[0]]; BB = [B[1], B[0]]; }
        if (kind !== 'd' && R.chance(0.5)) {
          const ax = kind === 'v' ? AA[0] : AA[1];
          G = G.map(p => kind === 'v' ? [2 * ax - p[0], p[1]] : [p[0], 2 * ax - p[1]]);
        }
        if (R.chance(0.5)) G = G.slice().reverse();
        if (ok(G, AA, BB, N)) return { given: G, axis: [AA, BB] };
      }
    }
    return { given: [[5, 1], [2, 3], [3, 8], [5, 9]], axis: [[5, 0], [5, 10]] };
    function ok(G, A, B, N) {
      const mids = G.slice(1, -1);
      if (mids.some(p => V.distToLine(p, A, B) < 0.5)) return false;
      if (new Set(G.map(p => p.join())).size !== G.length) return false;
      const whole = G.concat(mids.slice().reverse().map(p => V.round(V.reflect(p, A, B))));
      if (whole.some(p => p[0] < 0 || p[1] < 0 || p[0] > N || p[1] > N)) return false;
      if (!Poly.isSimple(whole)) return false;
      return Math.abs(Poly.area2(whole)) > 16;
    }
  }
  /** 점대칭: 중심 O, v0 ~ vk, v0' */
  function pointHalf(N = 10) {
    for (let t = 0; t < 800; t++) {
      const O = [R.int(4, N - 4), R.int(4, N - 4)];
      const k = R.int(2, 3);
      const pts = [];
      for (let i = 0; i < k + 1; i++) pts.push([R.int(0, N), R.int(0, N)]);
      const th0 = V.angleOf(V.sub(pts[0], O));
      const rel = (p) => (V.angleOf(V.sub(p, O)) - th0 + 720) % 360;
      if (pts.slice(1).some(p => { const r = rel(p); return r <= 8 || r >= 172; })) continue;
      const v0 = pts[0], rest = pts.slice(1).sort((a, b) => rel(a) - rel(b));
      const G = [v0].concat(rest).concat([V.rot180(v0, O)]);
      const whole = G.concat(rest.map(p => V.rot180(p, O)));
      if (whole.some(p => p[0] < 0 || p[1] < 0 || p[0] > N || p[1] > N)) continue;
      if (new Set(whole.map(p => p.join())).size !== whole.length) continue;
      if (whole.some(p => V.near(p, O))) continue;
      if (!Poly.isSimple(whole) || Math.abs(Poly.area2(whole)) < 20) continue;
      return { given: G, center: O };
    }
    return { given: [[6, 2], [2, 2], [1, 7], [4, 8]], center: [5, 5] };
  }

  window.Shapes = { normalize, d4, latticeShape, nearMiss, niceTriangle, niceQuad, transformFig, fitTo, placePair, polyLib, letterLib, letter, polyShape, lineHalf, pointHalf };
})();
