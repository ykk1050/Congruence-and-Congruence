/* =========================================================
   games.js — 학습한 내용을 익히는 상황형 게임
   ========================================================= */
(function () {
  'use strict';
  const { el, sv, clear, V, Poly, Fig, R, KO, fmt, Store, Sound, toast, confetti, shake, animate } = C;
  const { bubble, btn } = UI;

  /* =========================================================
     공통 게임 틀
     ========================================================= */
  function GameShell(root, cfg) {
    const best = Store.get('game:' + cfg.id, null);
    clear(root);
    const wrap = el('div', { class: 'game' });
    root.appendChild(wrap);
    intro();

    function intro() {
      clear(wrap);
      const card = el('div', { class: 'game-intro' },
        el('div', { class: 'game-emoji' }, cfg.emoji),
        el('h2', {}, cfg.title),
        el('div', { class: 'story' }, cfg.story.map(s => bubble(s.text, s.who))),
        el('div', { class: 'mission', html: '🎯 <b>미션</b> ' + cfg.mission }),
        best ? el('div', { class: 'best' }, `지난 최고 기록: ${'⭐'.repeat(best.stars)}${'☆'.repeat(3 - best.stars)}  ${best.score}점`) : null,
        btn('게임 시작 ▶', start, 'primary big'));
      wrap.appendChild(card);
    }
    function start() {
      clear(wrap);
      let i = 0, score = 0, firstTry = 0, streak = 0;
      const hud = el('div', { class: 'hud' });
      const area = el('div', { class: 'round' });
      const bar = el('div', { class: 'round-bar' });
      wrap.append(hud, area, bar);
      const extra = cfg.hudExtra ? cfg.hudExtra(hud) : null;
      function drawHud() {
        clear(hud);
        hud.append(...[
          el('span', { class: 'pill' }, `${cfg.roundName || '문제'} ${Math.min(i + 1, cfg.rounds)} / ${cfg.rounds}`),
          el('span', { class: 'pill score' }, `점수 ${score}`),
          streak >= 2 ? el('span', { class: 'pill streak' }, `🔥 ${streak}연속`) : null,
          el('div', { class: 'progress' }, el('i', { style: { width: (i / cfg.rounds * 100) + '%' } }))].filter(Boolean));
        if (extra) hud.appendChild(extra);
      }
      function round() {
        drawHud();
        clear(area); clear(bar);
        let tries = 0, settled = false, revealFn = null;
        const level = 1 + Math.floor(i * 3 / cfg.rounds);
        const api = {
          level, index: i,
          correct(msg, partial) {
            if (settled) return; settled = true;
            if (partial) tries = Math.max(tries, 1);
            const pts = tries === 0 ? 10 : 5;
            score += pts; if (tries === 0) { firstTry++; streak++; } else streak = 0;
            Sound.good(); drawHud();
            cfg.onScore && cfg.onScore(i);
            showNext(`<b>+${pts}점</b> ${msg || R.pick(['훌륭해요!', '정답!', '멋져요!', '완벽해요!'])}`, 'good');
          },
          wrong(msg) {
            if (settled) return;
            tries++; streak = 0; Sound.bad(); drawHud();
            if (msg) toast(msg, 'bad', 2600);
            if (tries >= 2 && revealFn && !bar.querySelector('.reveal')) bar.appendChild(btn('정답 보기', () => { revealFn(); }, 'ghost reveal'));
          },
          giveUp(msg) {
            if (settled) return; settled = true; streak = 0; drawHud();
            showNext(msg || '정답을 확인하고 다음 문제로 가요.', 'info');
          },
          onReveal(fn) { revealFn = fn; },
          get tries() { return tries; },
        };
        function showNext(msg, type) {
          clear(bar);
          bar.append(el('div', { class: 'fb ' + type, html: msg }), btn(i + 1 >= cfg.rounds ? '결과 보기 🏁' : '다음 ▶', () => { i++; if (i >= cfg.rounds) finish(); else round(); }, 'primary'));
          bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        cfg.makeRound(area, api);
      }
      function finish() {
        clear(wrap);
        const max = cfg.rounds * 10, ratio = score / max;
        const stars = ratio >= 0.9 ? 3 : ratio >= 0.65 ? 2 : 1;
        const prev = Store.get('game:' + cfg.id, null);
        if (!prev || score > prev.score) Store.set('game:' + cfg.id, { score, stars, at: Date.now() });
        Sound.win(); if (stars >= 2) confetti(60);
        wrap.appendChild(el('div', { class: 'game-end' },
          el('div', { class: 'big-stars' }, '⭐'.repeat(stars) + '☆'.repeat(3 - stars)),
          el('h2', {}, cfg.endTitle ? cfg.endTitle(stars) : '미션 완료!'),
          el('p', { class: 'end-score' }, `점수 ${score} / ${max}  ·  한 번에 맞힌 문제 ${firstTry}개`),
          cfg.endNote ? el('p', { class: 'muted', html: cfg.endNote }) : null,
          el('div', { class: 'controls center' }, btn('🔄 새 문제로 다시 하기', start, 'primary big'), btn('처음 화면', intro, 'ghost'))));
      }
      round();
    }
  }

  /** 숫자 입력판 */
  function keypad(box, onSubmit, unit) {
    let val = '';
    const disp = el('div', { class: 'kp-disp' }, el('span', { class: 'kp-val' }, ''), el('span', { class: 'kp-unit' }, unit || ''));
    const pad = el('div', { class: 'keypad' });
    const upd = () => { disp.firstChild.textContent = val || ' '; };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '확인'].forEach(k => {
      pad.appendChild(el('button', {
        class: 'key' + (k === '확인' ? ' ok' : ''), type: 'button', onclick: () => {
          Sound.tap();
          if (k === '⌫') val = val.slice(0, -1);
          else if (k === '확인') { if (val) { onSubmit(Number(val), () => { val = ''; upd(); }); } return; }
          else if (val.length < 4) val += k;
          upd();
        },
      }, k));
    });
    box.append(el('div', { class: 'kp' }, disp, pad));
    upd();
  }

  /* =========================================================
     도형의 합동 — 미술관 바닥 타일 수리 (타일을 끌어서 끼우기)
     ========================================================= */
  let uid = 0;
  /** 미술관 벽(그림 액자)과 대리석 바닥 그리기 */
  function museumScene(st, W, floorY0, floorY1) {
    const bg = st.L('bg');
    bg.appendChild(sv('rect', { x: 0, y: 0, width: W, height: floorY0, class: 'mu-wall' }));
    bg.appendChild(sv('rect', { x: 0, y: floorY0 - 0.25, width: W, height: 0.25, class: 'mu-base' }));
    // 액자 세 개
    const frames = [[2.2, 'sun'], [W / 2 - 2.6, 'mount'], [W - 7.4, 'grid']];
    frames.forEach(([x, kind]) => {
      const y = 0.35, w = 5.2, h = floorY0 - 1.05;
      bg.appendChild(sv('rect', { x: x - 0.25, y: y - 0.25, width: w + 0.5, height: h + 0.5, rx: 0.1, class: 'mu-frame' }));
      bg.appendChild(sv('rect', { x, y, width: w, height: h, class: 'mu-canvas ' + kind }));
      if (kind === 'sun') {
        bg.appendChild(sv('circle', { cx: x + w * 0.68, cy: y + h * 0.45, r: h * 0.28, class: 'mu-sun' }));
        bg.appendChild(sv('rect', { x, y: y + h * 0.7, width: w, height: h * 0.3, class: 'mu-sea' }));
      } else if (kind === 'mount') {
        bg.appendChild(sv('polygon', { points: `${x},${y + h} ${x + w * 0.35},${y + h * 0.25} ${x + w * 0.6},${y + h * 0.65} ${x + w * 0.8},${y + h * 0.35} ${x + w},${y + h}`, class: 'mu-mount' }));
      } else {
        [[0, 0, 0.55, 0.6, 'r'], [0.55, 0, 0.45, 0.35, 'y'], [0.55, 0.35, 0.45, 0.65, 'w'], [0, 0.6, 0.3, 0.4, 'b'], [0.3, 0.6, 0.25, 0.4, 'w']].forEach(([a, b, c, d, col]) =>
          bg.appendChild(sv('rect', { x: x + a * w, y: y + b * h, width: c * w, height: d * h, class: 'mu-mon ' + col })));
      }
      bg.appendChild(sv('rect', { x: x + w / 2 - 0.6, y: y + h + 0.35, width: 1.2, height: 0.35, rx: 0.05, class: 'mu-plate' }));
    });
    // 대리석 바닥 (한 칸 = 모눈 한 칸)
    for (let y = floorY0; y < floorY1; y++) for (let x = 0; x < W; x++)
      bg.appendChild(sv('rect', { x, y, width: 1, height: 1, class: 'mu-floor ' + ((x + y) % 2 ? 'a' : 'b') }));
    // 관람 방향 화살표
    const arrow = (x, y) => bg.appendChild(sv('polygon', { points: [[0, 0.3], [1.1, 0.3], [1.1, 0], [1.8, 0.5], [1.1, 1], [1.1, 0.7], [0, 0.7]].map(p => (x + p[0]) + ',' + (y + p[1])).join(' '), class: 'mu-arrow' }));
    arrow(0.6, floorY1 - 1.6); arrow(W - 2.6, floorY1 - 1.6);
  }

  function gameTiles(root) {
    GameShell(root, {
      id: 'g2', emoji: '🧩', title: '미술관 바닥 타일 수리',
      story: [
        { who: 'dayun', text: '앗! 미술관 바닥 타일이 깨져서 구멍이 났어요. 관람객이 걸려 넘어질 것 같아요.' },
        { who: 'guide', text: '타일 상자에서 <b>깨진 자리에 꼭 맞는 타일</b>을 골라 손가락으로 끌어다 끼워 주세요. 모양과 크기가 같아서 <b>포개었을 때 완전히 겹치는</b> 타일만 들어가요. 타일을 <b>두 손가락으로 돌려</b> 깨진 자리와 방향을 맞춰야 쏙 들어가요. 뒤집어야 맞는 타일도 있어요.' },
      ],
      mission: '깨진 자리와 <b>서로 합동인</b> 타일을 골라, 두 손가락으로 돌려 방향을 맞춘 뒤 끌어서 끼워요. 바닥의 칸 수를 세어 보면 도움이 돼요!',
      rounds: 10, roundName: '타일',
      makeRound(area, api) {
        const W = 28, F0 = 3, F1 = 11, T0 = 11.6, H = 18.2;
        let P;
        do { P = Shapes.latticeShape(api.level); } while (Math.max(Poly.bbox(P).w, Poly.bbox(P).h) > 5);
        const nHoles = api.level >= 3 ? 2 : 1;
        const nTiles = api.level === 1 ? 3 : 4;
        // 깨진 자리(구멍): P를 돌리거나 뒤집은 모양
        const holes = [];
        for (let h = 0; h < nHoles; h++) {
          const Q = Shapes.d4(P, R.int(0, 7)), b = Poly.bbox(Q);
          const xMin = nHoles === 1 ? 4 : (h ? 15 : 2), xMax = nHoles === 1 ? W - 4 - b.w : (h ? W - 2 - b.w : 13 - b.w);
          const x = R.int(xMin, Math.max(xMin, xMax)), y = R.int(F0 + 1, Math.max(F0 + 1, F1 - 1 - b.h));
          holes.push({ pts: Q.map(p => [p[0] + x, p[1] + y]), filled: false });
        }
        // 타일: 맞는 것 nHoles개 + 비슷하지만 다른 것
        const tiles = [];
        for (let h = 0; h < nHoles; h++) tiles.push({ local: Shapes.d4(P, R.int(0, 7)), ok: true });
        let guard = 0;
        while (tiles.length < nTiles && guard++ < 200) {
          const Q = Shapes.nearMiss(P, 5);
          if (!Q) continue;
          const T = Shapes.d4(Q, R.int(0, 7));
          if (tiles.some(t => Poly.congruent(t.local, T)) && guard < 150) continue;
          tiles.push({ local: T, ok: false });
        }
        const order = R.shuffle(tiles);
        const slotW = W / order.length;
        order.forEach((t, i) => {
          const b = Poly.bbox(t.local);
          t.home = [Math.round(i * slotW + (slotW - b.w) / 2), Math.round(T0 + 0.5 + (H - T0 - 0.8 - b.h) / 2)];
          t.pos = t.home.slice();
        });

        area.appendChild(el('div', { class: 'q', html: nHoles > 1 ? '깨진 자리가 <b>두 군데</b>예요! 꼭 맞는 타일을 끌어서 모두 끼워요.' : '깨진 자리에 꼭 맞는 타일을 <b>끌어서</b> 끼워요.' }));
        const st = new Stage(area, { x0: 0, y0: 0, w: W, h: H, cls: 'tile-stage' });
        st.svg.classList.add('tappable');
        museumScene(st, W, F0, F1);
        // 타일 상자
        st.L('bg').appendChild(sv('rect', { x: 0.15, y: T0, width: W - 0.3, height: H - T0 - 0.15, rx: 0.4, class: 'mu-box' }));
        st.L('bg').appendChild(sv('text', { x: 0.7, y: T0 + 0.55, class: 'mu-box-lbl' }, '🧰 타일 상자'));
        // 구멍 그리기 (구멍 안에도 바닥 칸 선이 보이도록)
        holes.forEach(h => {
          const id = 'hc' + (++uid);
          const cp = sv('clipPath', { id }, sv('polygon', { points: h.pts.map(p => p.join(',')).join(' ') }));
          st.L('main').appendChild(cp);
          h.node = st.poly(h.pts, { class: 'shape mu-hole' });
          const b = Poly.bbox(h.pts), g = sv('g', { 'clip-path': `url(#${id})`, class: 'mu-hole-grid' });
          for (let x = Math.floor(b.x0); x <= b.x1; x++) g.appendChild(sv('line', { x1: x, y1: b.y0, x2: x, y2: b.y1 }));
          for (let y = Math.floor(b.y0); y <= b.y1; y++) g.appendChild(sv('line', { x1: b.x0, y1: y, x2: b.x1, y2: y }));
          st.L('main').appendChild(g);
          h.grid = g;
          // 금 간 자국
          const c = Poly.centroid(h.pts);
          h.pts.forEach((p, i) => {
            if (i % 2) return;
            const d = V.norm(V.sub(p, c)), q1 = V.add(p, V.mul(d, 0.35)), q2 = V.add(q1, V.mul(V.rotVec(d, 35), 0.3));
            st.polyline([p, q1, q2], { class: 'mu-crack' }, 'main');
          });
        });
        // 타일 그리기
        order.forEach(t => {
          const id = 'tc' + (++uid), b = Poly.bbox(t.local);
          const g = sv('g', { class: 'mu-tile' });
          g.appendChild(sv('clipPath', { id }, sv('polygon', { points: t.local.map(p => p.join(',')).join(' ') })));
          g.appendChild(sv('polygon', { points: t.local.map(p => p.join(',')).join(' '), class: 'mu-tile-body' }));
          const lines = sv('g', { 'clip-path': `url(#${id})`, class: 'mu-tile-grid' });
          for (let x = 1; x < b.w; x++) lines.appendChild(sv('line', { x1: x, y1: 0, x2: x, y2: b.h }));
          for (let y = 1; y < b.h; y++) lines.appendChild(sv('line', { x1: 0, y1: y, x2: b.w, y2: y }));
          g.appendChild(lines);
          g.appendChild(sv('polygon', { points: t.local.map(p => p.join(',')).join(' '), class: 'mu-tile-edge' }));
          st.L('over').appendChild(g);
          t.node = g;
        });
        // 타일의 상태: pos(이동), theta(돌린 각도), flip(뒤집기). 중심 c를 기준으로 돌리고 뒤집는다.
        order.forEach(t => { t.c = Poly.centroid(t.local); t.theta = 0; t.flip = false; place(t); });
        function place(t) {
          const [cx, cy] = t.c;
          t.node.setAttribute('transform', `translate(${t.pos[0] + cx} ${t.pos[1] + cy}) rotate(${t.theta}) scale(${t.flip ? -1 : 1} 1) translate(${-cx} ${-cy})`);
        }
        const world = (t) => t.local.map(p => {
          let d = V.sub(p, t.c);
          if (t.flip) d = [-d[0], d[1]];
          return V.add(V.add(t.pos, t.c), V.rotVec(d, t.theta));
        });
        const center = (t) => V.add(t.pos, t.c);
        function goHome(t) {
          const from = t.pos.slice();
          animate(350, k => { t.pos = V.lerp(from, t.home, k); place(t); }, () => { t.pos = t.home.slice(); place(t); });
        }
        let sel = null;
        function select(t) {
          if (sel) sel.node.classList.remove('sel');
          sel = t; if (t) t.node.classList.add('sel');
        }
        /** 타일을 깨진 자리에 정확히 맞춰 넣기 (돌린 각도 rot만큼 마저 돌리고 자리에 끼움) */
        function fit(t, h, rot) {
          t.used = true; h.filled = true; select(null);
          const th0 = t.theta, p0 = t.pos.slice(), target = V.sub(Poly.centroid(h.pts), t.c);
          animate(Math.min(700, 250 + Math.abs(rot) * 6), k => { t.theta = th0 + rot * k; t.pos = V.lerp(p0, target, k); place(t); }, () => {
            t.node.remove();
            h.node.setAttribute('class', 'shape mu-hole filled');
            h.grid.setAttribute('class', 'mu-hole-grid filled');
            const sp = st.circle(Poly.centroid(h.pts), 0.2, { class: 'mu-spark' }, 'top');
            animate(500, k => { sp.setAttribute('r', 0.2 + k * 2.5); sp.style.opacity = 1 - k; }, () => sp.remove());
            if (holes.every(x => x.filled)) { if (!revealed) api.correct(t.flip ? '뒤집고 돌려서 딱 맞게 끼웠어요!' : '방향을 맞춰 딱 맞게 끼웠어요!'); }
            else { Sound.good(); toast('딱 맞아요! 깨진 자리가 하나 더 있어요.', 'good'); }
          });
        }
        const TOL = 15; // 이만큼 가까이 방향을 맞추면 끼워진다
        /** 타일을 놓았을 때: 깨진 자리 위인지, 방향이 맞는지 확인 */
        function drop(t) {
          const c = center(t);
          const h = holes.find(x => !x.filled && (Poly.pointIn(x.pts, c) || V.dist(c, Poly.centroid(x.pts)) < 1.8));
          if (!h) { if (c[1] > T0 - 0.3) goHome(t); return; } // 바닥 위에 놓으면 그 자리에 둔다
          const info = Poly.fitInfo(world(t), h.pts);
          if (!info.congruent) {
            shake(st.svg); goHome(t);
            api.wrong('이 타일은 깨진 자리와 모양이나 크기가 달라서 들어가지 않아요. 바닥의 칸 수를 세어 비교해 보세요.');
            return;
          }
          if (info.flip) { Sound.tap(); toast('모양은 맞는 것 같아요! 그런데 이대로는 안 맞아요. ⇋ 뒤집기를 눌러 타일을 뒤집어 보세요.', 'info', 3200); return; }
          if (Math.abs(info.rot) <= TOL) { fit(t, h, info.rot); return; }
          Sound.tap(); toast(`방향이 맞지 않아요. 두 손가락으로 타일을 돌려 깨진 자리와 방향을 맞춰 보세요. (약 ${Math.round(Math.abs(info.rot) / 5) * 5}° 더)`, 'info', 3200);
        }
        const pick = (p) => order.slice().reverse().find(x => !x.used && (Poly.pointIn(world(x), p) || world(x).some((q, i, A) => V.distToSeg(p, q, A[(i + 1) % A.length]) < 0.45)));
        let drag = null, gest = null, revealed = false;
        st.on({
          tap: (p) => { const t = pick(p); if (t) { select(t); toast('끌어서 옮기고, 두 손가락으로 돌려요. 뒤집으려면 ⇋ 뒤집기를 눌러요.'); } },
          dragStart: (p) => {
            const t = pick(p);
            if (!t) return false;
            drag = { t, off: V.sub(t.pos, p) };
            select(t);
            st.L('over').appendChild(t.node); // 맨 위로
            t.node.classList.add('lifted');
            return true;
          },
          dragMove: (p) => { if (drag) { drag.t.pos = V.add(p, drag.off); place(drag.t); } },
          dragCancel: () => { if (drag) { drag.t.node.classList.remove('lifted'); goHome(drag.t); drag = null; } },
          dragEnd: () => {
            if (!drag) return;
            const t = drag.t; drag = null;
            t.node.classList.remove('lifted');
            drop(t);
          },
          // 두 손가락: 돌리면서 옮기기
          gestureStart: (a, b) => {
            const t = (drag && drag.t) || pick(V.mid(a, b)) || pick(a) || pick(b) || sel;
            drag = null;
            if (!t || t.used) { gest = null; return; }
            select(t); st.L('over').appendChild(t.node); t.node.classList.add('lifted');
            gest = { t, th0: t.theta, p0: t.pos.slice() };
          },
          gestureMove: ({ rot, center: cNow, center0 }) => {
            if (!gest) return;
            gest.t.theta = gest.th0 + rot;
            gest.t.pos = V.add(gest.p0, V.sub(cNow, center0));
            place(gest.t);
          },
          gestureEnd: (cancelled) => {
            if (!gest) return;
            const t = gest.t; gest = null;
            t.node.classList.remove('lifted');
            if (!cancelled) drop(t);
          },
        });
        // 마우스로 할 때를 위한 버튼 (선택한 타일)
        const turn = (d) => { if (!sel || sel.used) { toast('먼저 타일을 눌러 골라요.'); return; } sel.theta += d; place(sel); drop(sel); };
        area.appendChild(el('div', { class: 'controls tile-tools' },
          el('span', { class: 'hint-chip' }, '✌️ 두 손가락으로 타일을 돌릴 수 있어요'),
          btn('↺ 15°', () => turn(-15), 'secondary small'),
          btn('↻ 15°', () => turn(15), 'secondary small'),
          btn('⇋ 뒤집기', () => { if (!sel || sel.used) { toast('먼저 타일을 눌러 골라요.'); return; } sel.flip = !sel.flip; sel.theta = -sel.theta; place(sel); drop(sel); }, 'secondary small')));
        api.onReveal(() => {
          revealed = true;
          holes.forEach(h => {
            if (h.filled) return;
            const t = order.find(x => x.ok && !x.used);
            if (!t) return;
            let info = Poly.fitInfo(world(t), h.pts);
            if (info.flip) { t.flip = !t.flip; t.theta = -t.theta; place(t); info = Poly.fitInfo(world(t), h.pts); }
            fit(t, h, info.rot);
          });
          setTimeout(() => api.giveUp('깨진 자리와 서로 합동인 타일이 끼워졌어요. 어떻게 돌리거나 뒤집었는지 살펴보세요.'), 1300);
        });
      },
    });
  }

  /* =========================================================
     3차시 — 판화 공방 (합동인 도형의 성질)
     ========================================================= */
  function gamePrint(root) {
    GameShell(root, {
      id: 'g3', emoji: '🖨️', title: '승현이의 판화 공방',
      story: [
        { who: 'seung', text: '판에 도형을 새겨서 종이에 찍었어요. 그런데 찍어 낸 판화는 <b>뒤집히고 돌아가</b> 있네요!' },
        { who: 'guide', text: '판에 새긴 도형과 찍어 낸 도형은 <b>서로 합동</b>이에요. 대응점, 대응변, 대응각을 찾고, 합동인 도형의 성질로 길이와 각도를 알아내 판화 작품을 완성해 주세요.' },
      ],
      mission: '대응점·대응변·대응각을 찾고, <b>대응변의 길이와 대응각의 크기가 같다</b>는 성질로 문제를 해결해요.',
      rounds: 10, roundName: '작품',
      makeRound(area, api) {
        const tri = api.level === 3 ? true : R.chance(0.55);
        const base = tri ? Shapes.niceTriangle() : Shapes.niceQuad();
        const n = base.pts.length;
        const Bt = Shapes.transformFig(base.pts, R.int(0, 23) * 15, true);
        const { A, B } = Shapes.placePair(base.pts, Bt, [5.7, 5.9], [17.3, 5.9], 6.8);
        // 라벨: A는 ㄱㄴㄷ(ㄹ), B는 이어지는 글자를 다른 위치부터 붙임
        const LA = KO.slice(0, n), LBletters = KO.slice(n, 2 * n);
        const shift = R.int(0, n - 1), dir = R.pick([1, -1]);
        const LB = new Array(n);
        for (let m = 0; m < n; m++) LB[((shift + dir * m) % n + n) % n] = LBletters[m];
        const st = new Stage(area, { x0: 0, y0: 0, w: 23, h: 10.6, cls: 'print-stage' });
        st.add(sv('rect', { x: 0.4, y: 0.4, width: 10.6, height: 9.8, rx: 0.4, class: 'plate' }), 'bg');
        st.add(sv('rect', { x: 12, y: 0.4, width: 10.6, height: 9.8, rx: 0.2, class: 'paper' }), 'bg');
        st.text([5.7, 0.95], '판에 새긴 도형', { class: 'cap light' });
        st.text([17.3, 0.95], '찍어 낸 도형', { class: 'cap' });
        st.poly(A, { class: 'shape print-a' }); st.poly(B, { class: 'shape print-b' });
        st.vertexLabels(A, LA, { off: 0.5, cls: 'light' }); st.vertexLabels(B, LB, { off: 0.5 });
        const sideName = (L, i) => L[i] + L[(i + 1) % n];
        const angName = (L, i) => L[(i - 1 + n) % n] + L[i] + L[(i + 1) % n];
        const angA = Poly.angles(A).map(x => Math.round(x));
        const kScale = R.pick([1.5, 2, 2.5, 3]);
        const lenA = Poly.sides(A).map(x => Math.max(2, Math.round(x * kScale)));
        if (tri && base.ang) { // 5° 단위 각도 그대로 사용 (A의 꼭짓점 순서와 같음)
          for (let j = 0; j < 3; j++) angA[j] = base.ang[j];
        }
        const sideLabel = (P, i, txt, cls) => st.dimArc(P[i], P[(i + 1) % n], txt, Poly.centroid(P), { cls });
        const angLabel = (P, i, txt, cls) => { st.angleArc(P, i, 0.55, { class: 'arc ' + (cls || '') }); return st.text(V.add(P[i], V.mul(Poly.inward(P, i), 1.15)), txt, { class: 'measure small ' + (cls || '') }); };
        const q = el('div', { class: 'q' });
        const ansBox = el('div', { class: 'ans' });
        area.append(q, ansBox);
        const typeL1 = R.pick(['point', 'side', 'angle']);
        const type = api.level === 1 ? typeL1 : api.level === 2 ? R.pick(['len', 'ang', 'len', 'ang']) : (tri ? R.pick(['perim', 'sum', 'len', 'ang']) : R.pick(['len', 'ang']));
        // 질문 대상: A 또는 B
        const askOnB = R.chance(0.5);
        const i = R.int(0, n - 1);
        const L1 = askOnB ? LB : LA, L2 = askOnB ? LA : LB;
        const P1 = askOnB ? B : A, P2 = askOnB ? A : B;
        if (type === 'point' || type === 'side' || type === 'angle') {
          const name = type === 'point' ? '점 ' + L1[i] : type === 'side' ? '변 ' + sideName(L1, i) : '각 ' + angName(L1, i);
          const correct = type === 'point' ? '점 ' + L2[i] : type === 'side' ? sideName(L2, i) : angName(L2, i);
          q.innerHTML = `<b>${name}</b>의 대응${type === 'point' ? '점' : type === 'side' ? '변' : '각'}은 무엇일까요?`;
          if (type === 'side') st.line(P1[i], P1[(i + 1) % n], { class: 'given-side' }, 'top');
          if (type === 'angle') st.angleWedge(P1, i, 0.7, { class: 'given-wedge' }, 'top');
          if (type === 'point') st.circle(P1[i], 0.3, { class: 'given-ring' }, 'top');
          const options = [];
          for (let j = 0; j < n; j++) {
            const t = type === 'point' ? '점 ' + L2[j] : type === 'side' ? '변 ' + sideName(L2, j) : '각 ' + angName(L2, j);
            options.push({ t, ok: j === i });
            if (type !== 'point' && R.chance(0.5)) { // 거꾸로 읽은 이름도 정답 처리
              options[options.length - 1].t = type === 'side' ? '변 ' + sideName(L2, j).split('').reverse().join('') : '각 ' + angName(L2, j).split('').reverse().join('');
            }
          }
          const wrapO = el('div', { class: 'opts' });
          let done = false;
          R.shuffle(options).forEach(o => {
            const b = el('button', { class: 'opt', type: 'button' }, o.t);
            b.onclick = () => {
              if (done) return;
              if (o.ok) { done = true; b.classList.add('right'); markPair(); api.correct(); }
              else { b.classList.add('wrong'); shake(b); api.wrong('판화는 뒤집혀 찍혀요. 포개었을 때 겹치는 곳을 생각해 보세요.'); }
            };
            wrapO.appendChild(b);
          });
          ansBox.appendChild(wrapO);
          function markPair() {
            if (type === 'point') st.circle(P2[i], 0.3, { class: 'given-ring' }, 'top');
            if (type === 'side') st.line(P2[i], P2[(i + 1) % n], { class: 'given-side' }, 'top');
            if (type === 'angle') st.angleWedge(P2, i, 0.7, { class: 'given-wedge' }, 'top');
          }
          api.onReveal(() => { done = true; markPair(); api.giveUp(`정답: ${correct.startsWith('점') ? correct : (type === 'side' ? '변 ' : '각 ') + correct}`); });
          return;
        }
        let answer, unit;
        const traps = {};
        if (type === 'len') {
          // P2의 변 i 길이를 보여 주고, P1의 변 i를 묻는다. 다른 변 하나는 방해용
          const j = (i + R.int(1, n - 1)) % n;
          sideLabel(P2, i, lenA[i] + ' cm'); sideLabel(P1, j, lenA[j] + ' cm');
          sideLabel(P1, i, '? cm', 'ask');
          st.line(P1[i], P1[(i + 1) % n], { class: 'given-side' }, 'top');
          q.innerHTML = `<b>변 ${sideName(L1, i)}</b>의 길이는 몇 cm일까요?`;
          answer = lenA[i]; unit = 'cm';
          if (lenA[j] !== answer) traps[lenA[j]] = `${lenA[j]} cm는 변 ${sideName(L1, j)}의 길이예요. 변 ${sideName(L1, i)}과 겹치는 변은 다른 도형의 어느 변일까요?`;
        } else if (type === 'ang') {
          const j = (i + R.int(1, n - 1)) % n;
          angLabel(P2, i, angA[i] + '°'); angLabel(P1, j, angA[j] + '°', 'muted');
          angLabel(P1, i, '?°', 'ask');
          q.innerHTML = `<b>각 ${angName(L1, i)}</b>의 크기는 몇 도일까요?`;
          answer = angA[i]; unit = '°';
          if (angA[j] !== answer) traps[angA[j]] = `${angA[j]}°는 각 ${angName(L1, j)}의 크기예요. 각 ${angName(L1, i)}과 겹치는 각은 다른 도형의 어느 각일까요?`;
        } else if (type === 'sum') {
          // 삼각형: 서로 다른 도형에 두 각이 주어지고 나머지 대응각을 구함
          const j = (i + 1) % 3, k2 = (i + 2) % 3;
          angLabel(P2, j, angA[j] + '°'); angLabel(P1, k2, angA[k2] + '°');
          angLabel(P1, i, '?°', 'ask');
          q.innerHTML = `<b>각 ${angName(L1, i)}</b>의 크기는 몇 도일까요? <span class="muted">(삼각형의 세 각의 크기의 합은 180°)</span>`;
          answer = angA[i]; unit = '°';
          [j, k2].forEach(x => { if (angA[x] !== answer) traps[angA[x]] = `${angA[x]}°는 이미 알고 있는 각의 크기예요. 두 각을 삼각형 ${L1.join('')}에 모아 놓고, 세 각의 합이 180°임을 이용해 보세요.`; });
          traps[180 - angA[i]] = '180°에서 한 각만 뺐어요. 알고 있는 두 각을 모두 빼야 해요.';
        } else {
          // 둘레: 삼각형 P1의 둘레가 주어지고, 변 하나는 P2에, 하나는 P1에 표시
          const j = (i + 1) % 3, k2 = (i + 2) % 3;
          sideLabel(P2, j, lenA[j] + ' cm'); sideLabel(P1, k2, lenA[k2] + ' cm');
          sideLabel(P1, i, '? cm', 'ask');
          const per = lenA[0] + lenA[1] + lenA[2];
          q.innerHTML = `삼각형 ${L1.join('')}의 둘레는 <b>${per} cm</b>예요. <b>변 ${sideName(L1, i)}</b>의 길이는 몇 cm일까요?`;
          answer = lenA[i]; unit = 'cm';
          [j, k2].forEach(x => { if (lenA[x] !== answer) traps[lenA[x]] = `${lenA[x]} cm는 이미 알고 있는 변의 길이예요. 둘레에서 다른 두 변의 길이를 빼 보세요.`; });
          traps[per] = '둘레 전체를 썼어요. 둘레에서 다른 두 변의 길이를 빼야 해요.';
          traps[per - lenA[j]] = traps[per - lenA[k2]] = '둘레에서 한 변만 뺐어요. 다른 두 변의 길이를 모두 빼야 해요.';
        }
        let done = false;
        keypad(ansBox, (v, reset) => {
          if (done) return;
          if (v === answer) { done = true; api.correct(`대응${unit === 'cm' ? '변의 길이' : '각의 크기'}가 같아요!`); }
          else { reset(); api.wrong(traps[v] || (unit === 'cm' ? `${v} cm는 아니에요. 구하려는 변의 대응변을 먼저 찾아보세요.` : `${v}°는 아니에요. 구하려는 각의 대응각을 먼저 찾아보세요.`)); }
        }, unit);
        api.onReveal(() => { done = true; api.giveUp(`정답: <b>${answer}${unit === 'cm' ? ' cm' : '°'}</b>`); });
      },
    });
  }

  /* =========================================================
     선대칭도형 — 거울 마술 전시실 (대칭축 찾기)
     거울을 대칭축에 세우면 거울에 비친 반쪽과 남은 반쪽이 원래 작품과 똑같이 보인다.
     (지도서 참고 자료: 거울을 이용하여 선대칭도형 만들기)
     눈으로 보아 대칭인지 애매한 도형은 넣지 않는다.
     ========================================================= */
  function gameWindow(root) {
    const SYM1 = ['정사각형', '직사각형', '이등변삼각형', '연모양', '하트', '집모양', '등변사다리꼴', '화살표'];
    const NON1 = ['평행사변형', '직각삼각형', 'L모양'];
    const SYM2 = ['마름모', '정삼각형', '직각이등변삼각형', '정오각형', '정육각형', '양쪽화살표', '오목사각형', '원'];
    const NON2 = ['평행사변형', '부등변삼각형', '직각사다리꼴', 'Z모양'];
    const SYM3 = ['십자', '별', '정팔각형', '정육각형', '정오각형', '마름모', '원', '직사각형'];
    const NON3 = ['Z모양', '바람개비', '번개', '부등변삼각형', 'L모양'];
    const recent = [];
    GameShell(root, {
      id: 'g4', emoji: '✨', title: '거울 마술 전시실',
      story: [
        { who: 'dayun', text: '이 전시실에서는 작품 위에 <b>거울</b>을 세워 놓았어요. 거울에 비친 반쪽과 남은 반쪽이 합쳐져서 원래 작품과 똑같이 보여요!' },
        { who: 'guide', text: '새 작품이 들어왔어요. 큐레이터를 도와 작품마다 <b>거울을 세울 수 있는 자리</b>를 모두 찾아 주세요. 거울은 작품의 <b>대칭축</b>에 세워야 원래 모양이 그대로 보여요. 거울을 세울 자리가 없는 작품도 있어요.' },
      ],
      mission: '손가락으로 선을 그어 거울(대칭축)을 세워요. 거울을 세울 자리는 <b>여러 개</b>일 수도, <b>비스듬할</b> 수도 있어요.',
      rounds: 10, roundName: '작품',
      makeRound(area, api) {
        const sym = api.level === 1 ? SYM1 : api.level === 2 ? SYM2 : SYM3;
        const non = api.level === 1 ? NON1 : api.level === 2 ? NON2 : NON3;
        let name;
        for (let t = 0; t < 30; t++) { name = R.chance(0.3) ? R.pick(non) : R.pick(sym); if (!recent.includes(name)) break; }
        recent.push(name); if (recent.length > 3) recent.shift();
        const rot = api.level === 1 ? 0 : R.int(0, 11) * 15;
        const fig = name === '원' ? Fig.circle([0, 0], 3.2) : Shapes.polyShape(name, rot).fig;
        area.appendChild(el('div', { class: 'q', html: '작품에 <b>거울을 세울 수 있는 자리</b>를 모두 찾아 선을 그어요. 다 찾으면 <b>다 세웠어요</b>를 눌러요.' }));
        const box = el('div', { class: 'work mirror-room' });
        area.appendChild(box);
        UI.AxisDraw(box, {
          fig, preview: 'mirror', shapeCls: R.pick(['glass-1', 'glass-2', 'glass-3', 'glass-4', 'glass-5']),
          view: { x0: -5.2, y0: -4.6, w: 10.4, h: 9.2 },
          onResult(r) {
            if (r.ok && r.wrong === 0 && r.giveups === 0) api.correct(r.total === 0 ? '거울을 세울 수 없는 작품을 알아봤어요!' : '거울 자리를 한 번에 모두 찾았어요!');
            else if (r.ok) api.correct('거울 자리를 모두 찾았어요!', true);
            else api.giveUp('초록 점선이 찾지 못한 거울 자리(대칭축)예요.');
          },
        });
      },
    });
  }

  /* =========================================================
     5~6차시 — 데칼코마니 작품 복원 (선대칭도형 완성 + 성질)
     ========================================================= */
  function symProperty(area, api, mode) {
    // 교과서처럼 실제 크기와 다른(눈금 없는) 그림으로 성질 문제
    const isLine = mode === 'line';
    const gen = isLine ? Shapes.lineHalf(R.pick(['v', 'v', 'h'])) : Shapes.pointHalf();
    const G = gen.given;
    let whole, O = gen.center, A, B;
    if (isLine) { [A, B] = gen.axis; const mids = G.slice(1, -1); whole = G.concat(mids.slice().reverse().map(p => V.round(V.reflect(p, A, B)))); }
    else { whole = G.concat(G.slice(1, -1).map(p => V.rot180(p, O))); }
    const n = whole.length;
    const bb = Poly.bbox(whole), k = 7.4 / Math.max(bb.w, bb.h);
    const T = (p) => [6 + (p[0] - bb.cx) * k, 5 + (p[1] - bb.cy) * k];
    const P = whole.map(T);
    const st = new Stage(area, { x0: 0, y0: 0, w: 12, h: 10, cls: 'prop-stage' });
    st.poly(P, { class: 'shape fill-a' });
    const L = KO.slice(0, n);
    // 축 라벨에 쓸 글자는 꼭짓점 다음 글자
    const extra = KO.slice(n, n + 4);
    st.vertexLabels(P, L, { off: 0.5 });
    // 대응 관계
    const corr = (i) => {
      const q = isLine ? V.round(V.reflect(whole[i], A, B)) : V.rot180(whole[i], O);
      return whole.findIndex(w => V.near(w, q));
    };
    let a2, b2, o2;
    if (isLine) { a2 = T(A); b2 = T(B); st.fullLine(a2, b2, { class: 'axis' }, 'help', 0.3); }
    else { o2 = T(O); st.circle(o2, 0.13, { class: 'center-dot' }, 'ui'); st.text(V.add(o2, [0.35, 0.35]), extra[0], { class: 'vlabel center-lbl' }); }
    const sideLabel = (i, txt, cls) => st.dimArc(P[i], P[(i + 1) % n], txt, Poly.centroid(P), { cls });
    const angLabel = (i, txt, cls) => { st.angleArc(P, i, 0.5, { class: 'arc ' + (cls || '') }); st.text(V.add(P[i], V.mul(Poly.inward(P, i), 1.05)), txt, { class: 'measure small ' + (cls || '') }); };
    const sideName = (i) => L[i] + L[(i + 1) % n];
    const angName = (i) => L[(i - 1 + n) % n] + L[i] + L[(i + 1) % n];
    const q = el('div', { class: 'q' });
    const ans = el('div', { class: 'ans' });
    area.append(q, ans);
    // 대칭축/중심 위에 있지 않은 꼭짓점 중 하나
    const cands = whole.map((_, i) => i).filter(i => corr(i) !== i);
    const i = R.pick(cands), j = corr(i);
    const types = isLine ? ['side', 'angle', 'dist', 'perp'] : ['side', 'angle', 'half', 'whole'];
    const type = R.pick(types);
    let answer, unit = 'cm';
    const traps = {};
    if (type === 'side') {
      // 변 i(i→i+1)의 대응변: corr(i)–corr(i+1)
      const i2 = (i + 1) % n, j2 = corr(i2);
      const v = R.int(3, 15);
      // j, j2 사이 변의 이름
      const nm = L[j] + L[j2];
      sideLabel(i, v + ' cm');
      const sidx = (j2 === (j + 1) % n) ? j : j2;
      sideLabel(sidx, '? cm', 'ask');
      q.innerHTML = `<b>변 ${nm}</b>의 길이는 몇 cm일까요?`;
      answer = v;
    } else if (type === 'angle') {
      const deg = Math.round(Poly.angleAt(P, i));
      angLabel(i, deg + '°'); angLabel(j, '?°', 'ask');
      const nm = isLine ? L[corr((i - 1 + n) % n)] + L[j] + L[corr((i + 1) % n)] : L[corr((i - 1 + n) % n)] + L[j] + L[corr((i + 1) % n)];
      q.innerHTML = `<b>각 ${nm}</b>의 크기는 몇 도일까요?`;
      answer = deg; unit = '°';
    } else if (type === 'dist' || type === 'perp') {
      const f = V.foot(P[i], a2, b2);
      st.line(P[i], P[j], { class: 'pair-link solid' }, 'help');
      st.rightMark(f, V.sub(P[i], f), V.sub(b2, a2), 0.35, {}, 'help');
      st.circle(f, 0.1, { class: 'vdot' }, 'ui');
      st.text(V.add(f, [0.4, 0.5]), extra[0], { class: 'vlabel' });
      if (type === 'dist') {
        const v = R.int(2, 12);
        st.dimArc(P[i], f, v + ' cm', Poly.centroid(P));
        st.dimArc(P[j], f, '? cm', Poly.centroid(P), { cls: 'ask' });
        q.innerHTML = `직선 ${extra[1]}${extra[2]}이 대칭축이에요. <b>선분 ${L[j]}${extra[0]}</b>의 길이는 몇 cm일까요?`;
        answer = v;
      } else {
        q.innerHTML = `대응점끼리 이은 <b>선분 ${L[i]}${L[j]}</b>과 대칭축이 만나서 이루는 각은 몇 도일까요?`;
        answer = 90; unit = '°';
        traps[180] = '180°는 두 선이 일직선일 때예요. 선분과 대칭축은 만나서 꺾여 있어요.'; traps[45] = '45°는 직각의 절반이에요. 만나는 곳의 표시를 살펴보세요.';
      }
      const s = st.clipLine(a2, b2, 0.4);
      if (s) { st.text(V.add(s[0], [0.45, 0.2]), extra[1], { class: 'vlabel axis-lbl' }); st.text(V.add(s[1], [0.45, -0.2]), extra[2], { class: 'vlabel axis-lbl' }); }
    } else {
      st.line(P[i], P[j], { class: 'pair-link solid' }, 'help');
      const half = R.int(3, 14);
      if (type === 'half') {
        st.dimArc(P[i], P[j], (2 * half) + ' cm', null);
        st.dimArc(P[i], o2, '? cm', null, { cls: 'ask', flip: true });
        q.innerHTML = `선분 ${L[i]}${L[j]}의 길이는 <b>${2 * half} cm</b>예요. <b>선분 ${L[i]}${extra[0]}</b>의 길이는 몇 cm일까요?`;
        answer = half;
        traps[2 * half] = `${2 * half} cm는 선분 ${L[i]}${L[j]} <b>전체</b>의 길이예요. 대칭의 중심 ${extra[0]}까지는 그중 일부분이에요.`;
      } else {
        st.dimArc(P[i], o2, half + ' cm', null);
        st.dimArc(P[i], P[j], '? cm', null, { cls: 'ask', flip: true });
        q.innerHTML = `선분 ${L[i]}${extra[0]}의 길이가 <b>${half} cm</b>일 때, <b>선분 ${L[i]}${L[j]}</b>의 길이는 몇 cm일까요?`;
        answer = 2 * half;
        traps[half] = `${half} cm는 선분 ${L[i]}${extra[0]}의 길이예요. 선분 ${L[i]}${L[j]}은 대칭의 중심을 지나 반대쪽 대응점까지 이어진 <b>전체</b> 선분이에요.`;
      }
    }
    let done = false;
    keypad(ans, (v, reset) => {
      if (done) return;
      if (v === answer) { done = true; return api.correct(isLine ? '선대칭도형의 성질을 잘 이용했어요!' : '점대칭도형의 성질을 잘 이용했어요!'); }
      else {
        reset();
        const hint = {
          side: '대응변의 길이는 같아요. 구하려는 변의 대응변을 찾아보세요.', angle: '대응각의 크기는 같아요.',
          dist: '대응점에서 대칭축까지의 거리는 같아요.', perp: '대응점끼리 이은 선분은 대칭축과 수직으로 만나요.',
          half: '대칭의 중심은 대응점끼리 이은 선분을 똑같이 둘로 나눠요.', whole: '대칭의 중심까지의 거리가 같은 두 선분을 더해요.',
        }[type];
        api.wrong(traps[v] || `${v}${unit === 'cm' ? ' cm' : '°'}는 아니에요. ${hint}`);
      }
    }, unit);
    api.onReveal(() => { done = true; api.giveUp(`정답: <b>${answer}${unit === 'cm' ? ' cm' : '°'}</b>`); });
  }

  function completeRound(area, api, mode, sceneAdd) {
    const isLine = mode === 'line';
    let gen;
    if (isLine) gen = Shapes.lineHalf(api.level === 1 ? 'v' : api.level === 2 ? R.pick(['v', 'h']) : R.pick(['d', 'd', 'v', 'h']));
    else gen = Shapes.pointHalf();
    area.appendChild(el('div', { class: 'q', html: isLine ? '대칭축의 반대쪽에 <b>대응점</b>을 찍어 선대칭도형을 완성해요.' : '점 ㅇ을 대칭의 중심으로 하는 <b>점대칭도형</b>을 완성해요.' }));
    const box = el('div', { class: 'work' });
    area.appendChild(box);
    let revealed = false;
    const gc = UI.GridComplete(box, {
      mode, w: 10, h: 10, axis: gen.axis, center: gen.center, given: gen.given,
      connect: 'auto', verify: false,
      onMistake(m) { if (m === 1 || m === 3) api.wrong(); },
      onDone(r) {
        if (revealed) api.giveUp('파란 점이 대응점이에요. 대응점을 찾는 방법을 다시 떠올려 보세요.');
        else if (r.mistakes === 0) api.correct(isLine ? '데칼코마니 작품이 완성됐어요!' : '바람개비가 완성됐어요!');
        else api.correct('완성했어요!', true);
        sceneAdd && sceneAdd(r.poly);
      },
    });
    api.onReveal(() => { revealed = true; gc.revealAll(); });
  }

  function gameDecal(root) {
    GameShell(root, {
      id: 'g5', emoji: '🎨', title: '데칼코마니 작품 복원',
      story: [
        { who: 'seung', text: '작품 만들기 체험장에 걸린 데칼코마니 작품이 반쯤 지워졌어요!' },
        { who: 'guide', text: '데칼코마니 작품은 <b>선대칭도형</b>이에요. 대칭축과 남은 절반을 보고 작품을 복원해 주세요. 가끔은 큐레이터의 <b>성질 퀴즈</b>도 나와요.' },
      ],
      mission: '대응점끼리 이은 선분은 대칭축과 <b>수직</b>이고, 대응점에서 대칭축까지의 <b>거리가 같다</b>는 성질을 이용해요. 주어진 꼭짓점을 누르면 수선이 그어져요.',
      rounds: 10, roundName: '작품',
      makeRound(area, api) {
        if ([2, 5, 8].includes(api.index)) symProperty(area, api, 'line');
        else completeRound(area, api, 'line');
      },
    });
  }

  /* =========================================================
     7차시 — 천장 글자 작품 감별 (점대칭도형 찾기)
     ========================================================= */
  function gameLetters(root) {
    const pool = () => {
      const letters = Object.keys(Shapes.letterLib).concat(['ㅇ']).map(ch => ({ ...Shapes.letter(ch), kind: '글자' }));
      const polys = Object.keys(Shapes.polyLib).map(nm => ({ ...Shapes.polyShape(nm, R.pick([0, 0, 15, 30, 45, 90])), kind: '도형' }));
      return letters.concat(polys);
    };
    let items = pool();
    GameShell(root, {
      id: 'g7', emoji: '🔤', title: '천장 글자 작품 감별사',
      story: [
        { who: 'dayun', text: '미술관 천장의 글자 작품 중에는 <b>거꾸로 돌려도 똑같아 보이는</b> 작품이 있어요!' },
        { who: 'guide', text: '어떤 점을 중심으로 <b>180°</b> 돌렸을 때 처음과 완전히 겹치는 작품만 “돌려도 같은 작품” 전시실로 옮길 수 있어요. 가운데에 점이 찍혀 있다고 모두 점대칭도형은 아니니 조심하세요!' },
      ],
      mission: '점대칭도형인지 판단하고, <b>대칭의 중심</b>과 <b>대응점</b>을 찾아요.',
      rounds: 12, roundName: '작품',
      makeRound(area, api) {
        const mode = api.level === 1 ? 'ox' : api.level === 2 ? R.pick(['ox', 'center']) : R.pick(['center', 'corr', 'corr']);
        if (mode === 'corr') return corrRound(area, api);
        let it;
        const want = mode === 'center' ? 'point' : null;
        for (let t = 0; t < 200; t++) {
          it = R.pick(items);
          const ty = Fig.symType(it.fig);
          if (want && !(ty === 'point' || ty === 'both')) continue;
          if (!want && R.chance(0.45) && !(ty === 'point' || ty === 'both')) continue; // 균형 맞추기
          break;
        }
        const f = it.fig, c = Fig.center(f), ps = Fig.isPointSym(f);
        const bb = Fig.bbox(f);
        const isCircle = f.kind === 'circle';
        const center = isCircle ? f.c : [bb.cx, bb.cy];
        const st = new Stage(area, { x0: -5, y0: -4.4, w: 10, h: 8.8, cls: 'letter-stage' });
        st.fig(f, { class: 'shape ' + (f.kind === 'strokes' ? 'letter' : 'fill-a') + (isCircle ? ' ring' : '') });
        const ctrl = el('div', { class: 'controls center' });
        const q = el('div', { class: 'q' });
        area.insertBefore(q, st.svg); area.appendChild(ctrl);
        let done = false;
        const spin = (cb) => {
          const g = st.fig(f, { class: 'shape ghost-rot' }, 'over');
          const same90 = f.kind !== 'circle' && Fig.equal(f, Fig.map(f, q => V.rot(q, center, 90)), 1e-3);
          UI.spin180(st, g, center, { same90: f.kind === 'circle' || same90, same180: ps, done: () => { cb && cb(); setTimeout(() => g.remove(), 1500); } });
        };
        if (mode === 'ox') {
          q.innerHTML = `이 ${it.kind}${it.kind === '도형' ? '은' : '는'} <b>점대칭도형</b>일까요? <span class="muted">(빨간 점을 중심으로 돌려 생각해요)</span>`;
          st.circle(center, 0.14, { class: 'center-dot' }, 'ui');
          const answer = (yes) => {
            if (done) return;
            const ok = yes === ps;
            if (ok) { done = true; spin(() => api.correct(ps ? '180° 돌리니 완전히 겹쳐요!' : '180° 돌리면 겹치지 않아요. 점대칭도형이 아니에요.')); }
            else { api.wrong(); done = true; spin(() => api.giveUp(ps ? '180° 돌렸더니 처음 모양과 완전히 겹쳐요. <b>점대칭도형</b>이에요.' : '180° 돌렸더니 겹치지 않아요. 점이 있다고 점대칭도형은 아니에요.')); }
          };
          ctrl.append(btn('⭕ 점대칭도형이에요', () => answer(true), 'primary'), btn('❌ 아니에요', () => answer(false), 'secondary'));
        } else {
          q.innerHTML = `이 ${it.kind}${it.kind === '도형' ? '은' : '는'} 점대칭도형이에요. <b>대칭의 중심</b>을 눌러 표시해요.`;
          st.svg.classList.add('tappable');
          st.on({
            tap: (p) => {
              if (done) return;
              const mk = st.circle(p, 0.15, { class: 'center-dot' }, 'top');
              if (V.dist(p, center) < 0.55) { done = true; mk.remove(); st.circle(center, 0.16, { class: 'center-dot' }, 'top'); spin(() => api.correct('대칭의 중심을 정확히 찾았어요!')); }
              else { setTimeout(() => mk.remove(), 700); api.wrong('그 점을 중심으로 180° 돌리면 겹치지 않아요. 도형의 한가운데를 다시 찾아보세요.'); }
            },
          });
          api.onReveal(() => { done = true; st.circle(center, 0.16, { class: 'center-dot' }, 'top'); spin(() => api.giveUp('빨간 점이 대칭의 중심이에요.')); });
        }
        void c;
      },
    });
    function corrRound(area, api) {
      const nm = R.pick(['평행사변형', 'Z모양', '육각평행', '번개', '바람개비', '정육각형', '직사각형', '마름모']);
      const f = Shapes.polyShape(nm, R.pick([0, 15, 30, 45, 90])).fig;
      const P = f.pts.map(p => [p[0] * 1.05, p[1] * 1.05]), n = P.length, L = KO.slice(0, n);
      const st = new Stage(area, { x0: -5, y0: -4.4, w: 10, h: 8.8, cls: 'letter-stage' });
      st.poly(P, { class: 'shape fill-a' }); st.vertexLabels(P, L, { off: 0.5 });
      st.circle([0, 0], 0.13, { class: 'center-dot' }, 'ui'); st.text([0.35, 0.35], KO[n] || 'ㅇ', { class: 'vlabel center-lbl' });
      const i = R.int(0, n - 1), j = P.findIndex(p => V.near(p, V.rot180(P[i], [0, 0]), 1e-6));
      const t = R.pick(['point', 'side']);
      const q = el('div', { class: 'q' });
      area.insertBefore(q, st.svg);
      const opts = el('div', { class: 'opts' });
      area.appendChild(opts);
      let options, right;
      if (t === 'point') {
        q.innerHTML = `점 ${KO[n] || 'ㅇ'}을 대칭의 중심으로 하는 점대칭도형이에요. <b>점 ${L[i]}</b>의 대응점은?`;
        st.circle(P[i], 0.3, { class: 'given-ring' }, 'top');
        options = L.filter((_, k) => k !== i).map(x => '점 ' + x); right = '점 ' + L[j];
      } else {
        const i2 = (i + 1) % n, j2 = P.findIndex(p => V.near(p, V.rot180(P[i2], [0, 0]), 1e-6));
        q.innerHTML = `점 ${KO[n] || 'ㅇ'}을 대칭의 중심으로 하는 점대칭도형이에요. <b>변 ${L[i]}${L[i2]}</b>의 대응변은?`;
        st.line(P[i], P[i2], { class: 'given-side' }, 'top');
        options = L.map((x, k) => '변 ' + x + L[(k + 1) % n]).filter(x => x !== '변 ' + L[i] + L[i2]); right = '변 ' + L[j] + L[j2];
        if (!options.includes(right)) right = '변 ' + L[j2] + L[j];
      }
      const pick = R.shuffle(options.filter(o => o !== right)).slice(0, 3).concat([right]);
      let done = false;
      R.shuffle(pick).forEach(o => {
        const b = el('button', { class: 'opt', type: 'button' }, o);
        b.onclick = () => {
          if (done) return;
          if (o === right) { done = true; b.classList.add('right'); api.correct('180° 돌렸을 때 겹치는 곳을 찾았어요!'); }
          else { b.classList.add('wrong'); shake(b); api.wrong('대칭의 중심을 지나 반대쪽으로 같은 거리만큼 간 곳을 찾아요.'); }
        };
        opts.appendChild(b);
      });
      api.onReveal(() => { done = true; api.giveUp('정답: <b>' + right + '</b>'); });
    }
  }

  /* =========================================================
     8~9차시 — 바람개비 공원 (점대칭도형 완성 + 성질)
     ========================================================= */
  function gamePinwheel(root) {
    let park;
    GameShell(root, {
      id: 'g9', emoji: '🌀', title: '바람개비 공원 만들기',
      story: [
        { who: 'dayun', text: '바람개비 공원을 꾸미려고 하는데, 바람개비 날개가 절반만 그려져 있어요.' },
        { who: 'guide', text: '바람개비처럼 <b>점대칭도형</b>을 완성하면 공원에 바람개비가 하나씩 꽂혀요. 공원 관리인의 <b>성질 퀴즈</b>도 풀어 보세요!' },
      ],
      mission: '각 점에서 <b>대칭의 중심을 지나는 직선</b>을 긋고, 중심까지의 <b>거리가 같도록</b> 대응점을 찾아요.',
      rounds: 10, roundName: '바람개비',
      hudExtra() { park = el('div', { class: 'park', 'aria-label': '바람개비 공원' }); return park; },
      onScore() { if (park) { const p = el('span', { class: 'pw' }, '🌀'); park.appendChild(p); } },
      makeRound(area, api) {
        if ([2, 5, 8].includes(api.index)) symProperty(area, api, 'point');
        else completeRound(area, api, 'point');
      },
    });
  }

  /* =========================================================
     단원 정리 — 교통안전 체험관 표지판 분류 (표지판을 끌어서 보관함에 넣기)
     ========================================================= */
  function trafficScene(st, W) {
    const bg = st.L('bg'), r = (x, y, w, h, cls, rx) => bg.appendChild(sv('rect', { x, y, width: w, height: h, rx: rx || 0, class: cls }));
    r(0, 0, W, 8.2, 'ts-sky');
    bg.appendChild(sv('circle', { cx: W - 2.4, cy: 1.5, r: 0.9, class: 'ts-sun' }));
    [[3.5, 1.2], [9, 0.8], [20, 1.4]].forEach(([x, y]) => [[0, 0, 0.9], [0.8, -0.25, 0.75], [1.5, 0.05, 0.6]].forEach(([dx, dy, rr]) => bg.appendChild(sv('circle', { cx: x + dx, cy: y + dy, r: rr, class: 'ts-cloud' }))));
    // 체험관 건물과 간판
    r(4.3, 3.2, 19.4, 5, 'ts-bldg', 0.15);
    for (let i = 0; i < 6; i++) r(5 + i * 3.1, 3.8, 1.6, 1.3, 'ts-win', 0.1);
    r(4.5, 2.25, 6.2, 1.1, 'ts-board', 0.25);
    bg.appendChild(sv('text', { x: 7.6, y: 2.82, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ts-board-lbl' }, '🚸 교통안전 체험관'));
    r(19.4, 5.6, 2.4, 2.6, 'ts-door', 0.1);
    // 나무
    [[1.8, 6.4], [26.2, 6.4]].forEach(([x, y]) => { r(x - 0.15, y, 0.3, 1.8, 'ts-trunk'); bg.appendChild(sv('circle', { cx: x, cy: y - 0.3, r: 1.1, class: 'ts-tree' })); });
    // 도로와 횡단보도
    r(0, 8.2, W, 3.4, 'ts-road');
    for (let x = 0.4; x < W; x += 2.2) if (x < 9.6 || x > 18.2) r(x, 9.82, 1.2, 0.16, 'ts-lane');
    for (let x = 10; x < 18.2; x += 1.1) r(x, 8.4, 0.6, 3, 'ts-zebra');
    // 신호등
    r(0.55, 3.6, 0.22, 4.6, 'ts-pole');
    r(0.15, 2.0, 1.0, 2.5, 'ts-light', 0.2);
    ['#ff6b6b', '#ffd43b', '#51cf66'].forEach((c, i) => bg.appendChild(sv('circle', { cx: 0.65, cy: 2.45 + i * 0.8, r: 0.3, fill: i === 2 ? c : '#495057' })));
    // 인도
    r(0, 11.6, W, 8, 'ts-walk');
    for (let x = 0; x < W; x += 1.4) bg.appendChild(sv('line', { x1: x, y1: 11.6, x2: x, y2: 19.6, class: 'ts-walk-line' }));
  }
  const SIGN_COLORS = [['#ffd43b', '#c92a2a'], ['#4dabf7', '#1864ab'], ['#ff8787', '#a61e1e'], ['#69db7c', '#2b8a3e'], ['#ffffff', '#c92a2a'], ['#ffa94d', '#a34700']];
  function drawSign(st, it, layer) {
    const g = sv('g', { class: 'ts-sign' });
    st.L(layer || 'over').appendChild(g);
    const f = it.fig, fill = it.color[0], edge = it.color[1];
    const n = st.fig(f, f.kind === 'strokes' ? { class: 'shape letter sign-letter', style: `stroke:${edge}` } : { class: 'shape sign', style: `fill:${fill};stroke:${edge}` }, layer || 'over');
    if (f.kind === 'strokes') n.querySelectorAll('line').forEach(l => { l.style.stroke = edge; });
    g.appendChild(n);
    return g;
  }

  function gameSort(root) {
    const BINS = [
      { key: 'line', label: '선대칭도형만', icon: '↔️' },
      { key: 'point', label: '점대칭도형만', icon: '🔄' },
      { key: 'both', label: '둘 다', icon: '✨' },
      { key: 'none', label: '둘 다 아님', icon: '✖️' },
    ];
    const items = () => {
      const a = Object.keys(Shapes.letterLib).concat(['ㅇ']).map(ch => Shapes.letter(ch, 5));
      const b = Object.keys(Shapes.polyLib).map(nm => Shapes.polyShape(nm, R.pick([0, 0, 30, 45])));
      return R.shuffle(a.concat(b, [{ fig: Fig.circle([0, 0], 2.8), name: '원' }]));
    };
    let deck = [], sorted = {};
    GameShell(root, {
      id: 'g12', emoji: '🚦', title: '교통안전 체험관 표지판 분류',
      story: [
        { who: 'seung', text: '교통안전 체험관에 새 표지판과 글자판이 잔뜩 도착했어요. 체험관을 열기 전에 정리해야 해요!' },
        { who: 'guide', text: '표지판을 손가락으로 끌어 <b>선대칭도형만</b>, <b>점대칭도형만</b>, <b>둘 다</b>, <b>둘 다 아님</b> 보관함에 넣어 주세요. 선대칭도형이면서 점대칭도형인 것은 “둘 다” 보관함이에요.' },
      ],
      mission: '대칭축이 있는지, 180° 돌렸을 때 겹치는지 생각해서 표지판을 알맞은 보관함으로 끌어 넣어요. 두 손가락으로 표지판을 돌려 볼 수도 있어요.',
      rounds: 15, roundName: '표지판',
      makeRound(area, api) {
        if (api.index === 0) sorted = { line: [], point: [], both: [], none: [] };
        if (!deck.length) deck = items();
        const it = deck.pop();
        it.color = R.pick(SIGN_COLORS);
        const f = it.fig, type = Fig.symType(f);
        const W = 28, H = 19.6, K = 0.6, HOME = [14, 5.0];
        area.appendChild(el('div', { class: 'q', html: '새 표지판을 <b>끌어서</b> 알맞은 보관함에 넣어요.' }));
        const st = new Stage(area, { x0: 0, y0: 0, w: W, h: H, cls: 'tile-stage' });
        st.svg.classList.add('tappable');
        trafficScene(st, W);
        // 새 표지판을 올려 둔 카드
        st.L('bg').appendChild(sv('rect', { x: HOME[0] - 2.9, y: HOME[1] - 3.2, width: 5.8, height: 6.4, rx: 0.4, class: 'ts-card' }));
        st.L('bg').appendChild(sv('text', { x: HOME[0], y: HOME[1] - 2.75, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ts-card-lbl' }, '새 표지판'));
        // 보관함
        const bw = (W - 1) / 4;
        const bins = BINS.map((b, i) => {
          const x = 0.5 + i * bw, y = 12.2, w = bw - 0.4, h = 7;
          const g = sv('g', { class: 'ts-bin' });
          g.appendChild(sv('rect', { x, y, width: w, height: h, rx: 0.35, class: 'ts-bin-box' }));
          g.appendChild(sv('rect', { x, y, width: w, height: 1.3, rx: 0.35, class: 'ts-bin-top' }));
          g.appendChild(sv('text', { x: x + w / 2, y: y + 0.68, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ts-bin-lbl' }, b.icon + ' ' + b.label));
          st.L('main').appendChild(g);
          return Object.assign({ x, y, w, h, g }, b);
        });
        // 이미 정리한 표지판은 보관함 안에 작게
        const slot = (bin, k) => [bin.x + 0.9 + (k % 4) * ((bin.w - 1.8) / 3), bin.y + 2.3 + Math.floor(k / 4) * 1.6];
        bins.forEach(b => sorted[b.key].forEach((old, k) => {
          const s = drawSign(st, old, 'main'), p = slot(b, k);
          s.setAttribute('transform', `translate(${p[0]} ${p[1]}) scale(0.16)`);
        }));
        // 새 표지판
        const sign = drawSign(st, it, 'over');
        let pos = HOME.slice(), scale = K, rot = 0, drag = null, g0 = null, done = false;
        const put = () => sign.setAttribute('transform', `translate(${pos[0]} ${pos[1]}) rotate(${rot}) scale(${scale})`);
        put();
        const fly = (bin, then) => {
          const from = pos.slice(), s0 = scale, to = slot(bin, sorted[bin.key].length);
          animate(600, t => { pos = V.lerp(from, to, t); scale = s0 + (0.16 - s0) * t; put(); }, () => { sorted[bin.key].push(it); then && then(); });
        };
        const showAxes = () => {
          const ax = Fig.axes(f), c = Fig.center(f);
          const degs = ax === Infinity ? [0, 45, 90, 135] : ax.map(a => a.deg);
          degs.forEach(d => { const v = V.rotVec([1, 0], d); sign.appendChild(sv('line', { x1: c[0] - v[0] * 3.6, y1: c[1] - v[1] * 3.6, x2: c[0] + v[0] * 3.6, y2: c[1] + v[1] * 3.6, class: 'axis reveal' })); });
          if (Fig.isPointSym(f)) sign.appendChild(sv('circle', { cx: c[0], cy: c[1], r: 0.25, class: 'center-dot' }));
        };
        const explain = () => {
          const ax = Fig.axes(f), nAx = ax === Infinity ? '셀 수 없이 많아요' : ax.length + '개';
          return `대칭축: <b>${nAx}</b> · 180° 돌리면 <b>${Fig.isPointSym(f) ? '완전히 겹쳐요' : '겹치지 않아요'}</b> → <b>${BINS.find(b => b.key === type).label}</b>`;
        };
        const finishTo = (ok) => {
          done = true; showAxes();
          const bin = bins.find(b => b.key === type);
          setTimeout(() => fly(bin, () => (ok ? api.correct(explain()) : api.giveUp(explain()))), 900);
        };
        const back = () => { const from = pos.slice(); animate(300, t => { pos = V.lerp(from, HOME, t); put(); }); };
        st.on({
          tap: (p) => { if (!done && V.dist(p, pos) < 2.6) toast('표지판을 손가락으로 끌어서 보관함에 넣어 보세요.'); },
          dragStart: (p) => { if (!done && V.dist(p, pos) < 3) { drag = V.sub(pos, p); sign.classList.add('lifted'); return true; } return false; },
          dragMove: (p) => { if (drag) { pos = V.add(p, drag); put(); } },
          dragCancel: () => { if (drag) { drag = null; sign.classList.remove('lifted'); back(); } },
          // 두 손가락으로 표지판을 돌려 볼 수 있어요 (180° 돌려 보기)
          gestureStart: () => { if (done) return; drag = null; g0 = { rot, pos: pos.slice() }; sign.classList.add('lifted'); },
          gestureMove: ({ rot: r, center, center0 }) => { if (!g0) return; rot = g0.rot + r; pos = V.add(g0.pos, V.sub(center, center0)); put(); },
          gestureEnd: () => { if (!g0) return; g0 = null; sign.classList.remove('lifted'); if (pos[1] > 11.4) dropAt(pos); },
          dragEnd: (p) => {
            if (!drag) return;
            drag = null; sign.classList.remove('lifted');
            dropAt(p);
          },
        });
        function dropAt(p) {
            const bin = bins.find(b => p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y - 0.8);
            if (!bin) { back(); return; }
            if (bin.key === type) { Sound.good(); finishTo(true); return; }
            bin.g.classList.add('wrong'); setTimeout(() => bin.g.classList.remove('wrong'), 700);
            back(); api.wrong(`‘${bin.label}’ 보관함이 아니에요. 대칭축과 180° 돌리기를 다시 생각해 보세요.`);
            if (api.tries >= 2) finishTo(false);
        }
        api.onReveal(() => { if (!done) finishTo(false); });
      },
    });
  }

  window.Games = {
    g2: { title: '미술관 바닥 타일 수리', run: gameTiles },
    g3: { title: '승현이의 판화 공방', run: gamePrint },
    g4: { title: '거울 마술 전시실', run: gameWindow },
    g5: { title: '데칼코마니 작품 복원', run: gameDecal },
    g7: { title: '천장 글자 작품 감별사', run: gameLetters },
    g9: { title: '바람개비 공원 만들기', run: gamePinwheel },
    g12: { title: '교통안전 체험관 표지판 분류', run: gameSort },
  };
})();
