/* =========================================================
   lessons.js — 차시 구성(교과서 순서), 활동 분류, 학습 활동
   ========================================================= */
(function () {
  'use strict';
  const { el, sv, clear, V, Poly, Fig, R, KO, fmt, Store, Sound, toast, confetti, shake, animate } = C;
  const { btn, choice, fillBlank, conceptCard, Correspond, AxisDraw, GridComplete, GeoHalf } = UI;

  /* =========================================================
     작은 도우미들
     ========================================================= */
  /** 순서 맞추기: 방법 카드를 손가락으로 끌어 1, 2, 3 칸에 차례대로 놓는다 */
  function orderCards(box, cfg) {
    const wrap = el('div', { class: 'order' });
    wrap.appendChild(el('div', { class: 'q', html: cfg.q }));
    const slots = el('ol', { class: 'order-slots' });
    const pool = el('div', { class: 'order-pool' });
    const fb = el('div', { class: 'fb' });
    const items = cfg.items.map((t, i) => ({ t, i }));
    const placed = new Array(items.length).fill(null);   // 칸마다 놓인 카드
    const slotEls = items.map((_, k) => {
      const li = el('li', { class: 'slot drop' }, el('span', { class: 'slot-no' }, (k + 1) + ''), el('span', { class: 'slot-t' }, '여기에 끌어 놓아요'));
      slots.appendChild(li); return li;
    });
    const cardEls = new Map();
    R.shuffle(items).forEach(it => { const c = el('div', { class: 'step-card' }, it.t); cardEls.set(it, c); pool.appendChild(c); });
    let done = false;
    function draw() {
      slotEls.forEach((li, k) => {
        const it = placed[k];
        li.classList.toggle('filled', !!it); li.classList.remove('right', 'wrong');
        li.querySelector('.slot-t').textContent = it ? it.t : '여기에 끌어 놓아요';
      });
      cardEls.forEach((c, it) => c.classList.toggle('used', placed.includes(it)));
      check.disabled = done || placed.some(x => !x);
    }
    const slotAt = (x, y) => slotEls.findIndex(li => { const r = li.getBoundingClientRect(); return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 6 && y <= r.bottom + 6; });
    function startDrag(e, it, fromSlot, srcEl) {
      if (done) return;
      e.preventDefault();
      const r = srcEl.getBoundingClientRect();
      const ghost = el('div', { class: 'step-card dragging' }, it.t);
      ghost.style.width = Math.min(r.width, 520) + 'px';
      document.body.appendChild(ghost);
      const off = [Math.min(e.clientX - r.left, 40), e.clientY - r.top];
      const move = (x, y) => { ghost.style.left = (x - off[0]) + 'px'; ghost.style.top = (y - off[1]) + 'px'; };
      move(e.clientX, e.clientY);
      srcEl.classList.add('lifting');
      let over = -1, moved = false;
      const sx = e.clientX, sy = e.clientY;
      const onMove = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
        move(ev.clientX, ev.clientY);
        const k = slotAt(ev.clientX, ev.clientY);
        if (k !== over) { if (over >= 0) slotEls[over].classList.remove('over'); over = k; if (over >= 0) slotEls[over].classList.add('over'); }
      };
      const onUp = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
        ghost.remove(); srcEl.classList.remove('lifting');
        if (over >= 0) slotEls[over].classList.remove('over');
        const k = ev.type === 'pointercancel' ? -1 : slotAt(ev.clientX, ev.clientY);
        if (!moved) { if (fromSlot >= 0) { placed[fromSlot] = null; Sound.tap(); } else toast('카드를 손가락으로 끌어서 순서 칸에 놓아요.'); draw(); return; }
        if (k >= 0 && k !== fromSlot) {
          const prev = placed[k];
          if (fromSlot >= 0) placed[fromSlot] = prev; // 칸끼리 옮기면 서로 바꾼다
          placed[k] = it; Sound.tap();
          slotEls[k].classList.add('pop'); setTimeout(() => slotEls[k].classList.remove('pop'), 250);
        } else if (k < 0 && fromSlot >= 0) placed[fromSlot] = null; // 칸 밖으로 끌어내면 되돌린다
        fb.className = 'fb'; fb.textContent = '';
        draw();
      };
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    }
    cardEls.forEach((c, it) => c.addEventListener('pointerdown', (e) => { if (!c.classList.contains('used')) startDrag(e, it, -1, c); }));
    slotEls.forEach((li, k) => li.addEventListener('pointerdown', (e) => { if (placed[k]) startDrag(e, placed[k], k, li); }));
    const check = btn('확인하기', () => {
      if (placed.some(x => !x)) return;
      let ok = true;
      placed.forEach((it, k) => { const r = it.i === k; slotEls[k].classList.toggle('right', r); slotEls[k].classList.toggle('wrong', !r); if (!r) ok = false; });
      if (ok) { done = true; check.disabled = true; wrap.classList.add('locked'); Sound.good(); fb.className = 'fb good'; fb.innerHTML = cfg.good || '순서대로 잘 정리했어요!'; cfg.onDone && cfg.onDone(); }
      else {
        Sound.bad(); shake(slots); fb.className = 'fb bad';
        const first = placed.findIndex((it, k) => it.i !== k);
        fb.innerHTML = (cfg.why && cfg.why[first]) || '순서가 맞지 않아요. 앞에서 직접 해 본 차례를 떠올리며 빨간 칸의 카드를 옮겨 보세요.';
      }
    }, 'primary small');
    wrap.append(slots, el('div', { class: 'word-hint muted' }, '✋ 카드를 끌어서 1, 2, 3 칸에 차례대로 놓아요.'), pool, check, fb);
    box.appendChild(wrap);
    draw();
  }

  /** 숫자 답 쓰기 */
  function numQuestion(box, cfg) {
    const wrap = el('div', { class: 'numq' });
    const input = el('input', { type: 'number', inputmode: 'numeric', class: 'num-in', 'aria-label': '답' });
    const fb = el('div', { class: 'fb' });
    let tries = 0, done = false;
    const go = () => {
      if (done || input.value === '') return;
      tries++;
      if (Number(input.value) === cfg.answer) { done = true; Sound.good(); input.classList.add('right'); fb.className = 'fb good'; fb.innerHTML = cfg.good || '맞아요!'; input.disabled = true; cfg.onDone && cfg.onDone(); }
      else { const v = Number(input.value), m = (cfg.traps && cfg.traps[v]) || cfg.hint; Sound.bad(); shake(input); fb.className = 'fb bad'; fb.innerHTML = tries >= 3 ? `${m} <br>정답은 <b>${cfg.answer}${cfg.unit}</b>이에요.` : m; if (tries >= 3) { done = true; input.disabled = true; cfg.onDone && cfg.onDone(); } }
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    wrap.append(el('div', { class: 'q', html: cfg.q }), el('div', { class: 'num-row' }, input, el('span', { class: 'unit' }, cfg.unit), btn('확인', go, 'primary small')), fb);
    box.appendChild(wrap);
  }

  /** 교과서 개념 상자의 용어를 직접 쓰기
      parts: ['문장', {ans:'용어'}, ...] / figure(stageBox): 그림 그리기 / onReveal(정답들): 확인 후 그림에 용어 표시
      틀리게 쓴 빈칸은 정답을 알려 주고 바르게 고쳐 써 준다. */
  function termCard(c, cfg) {
    const card = el('div', { class: 'concept term-card' + (cfg.wide ? ' wide' : '') });
    const text = el('div', { class: 'term-text' });
    const inputs = [];
    cfg.parts.forEach(pt => {
      if (typeof pt === 'string') { text.appendChild(el('span', { html: pt })); return; }
      const inp = el('input', { type: 'text', class: 'term-in', maxlength: '8', autocomplete: 'off', 'aria-label': '빈칸에 들어갈 말' });
      inp.style.width = (pt.ans.length + 1.6) + 'em';
      inp.dataset.ans = pt.ans;
      inputs.push(inp); text.appendChild(inp);
    });
    const fig = el('div', { class: 'term-fig' });
    card.append(fig, text);
    c.box.appendChild(card);
    if (cfg.figure) cfg.figure(fig);
    const fb = el('div', { class: 'fb' });
    const ctl = c.controls();
    let done = false;
    const go = () => {
      if (done) return;
      const empty = inputs.find(x => !x.value.replace(/\s/g, ''));
      if (empty) { fb.className = 'fb'; fb.textContent = '빈칸에 알맞은 말을 모두 써 보세요.'; empty.focus(); return; }
      done = true; check.disabled = true;
      const wrong = [];
      inputs.forEach(x => {
        const v = x.value.replace(/\s/g, ''), a = x.dataset.ans;
        x.disabled = true;
        if (v === a.replace(/\s/g, '')) { x.value = a; x.classList.add('right'); return; }
        wrong.push(`‘${v}’ → <b>${a}</b>`);
        x.value = a; x.classList.add('fixed');
      });
      if (!wrong.length) { Sound.good(); fb.className = 'fb good'; fb.innerHTML = cfg.good || '정답! 빈칸을 모두 바르게 썼어요.'; }
      else {
        Sound.bad(); shake(text);
        fb.className = 'fb bad';
        fb.innerHTML = `틀린 빈칸은 정답으로 고쳐 썼어요: ${wrong.join(', ')}<br>빨간 칸을 확인하고 문장을 소리 내어 읽어 보세요.`;
      }
      cfg.onReveal && cfg.onReveal();
      if (cfg.after) cfg.after();
      c.done();
    };
    inputs.forEach((x, i) => x.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.isComposing) return;
      if (inputs[i + 1] && !inputs[i + 1].value) inputs[i + 1].focus(); else go();
    }));
    const check = btn('확인', go, 'primary');
    ctl.appendChild(check);
    c.box.appendChild(fb);
  }
  /** 그림 속 이름표(둥근 상자) */
  function pill(st, p, text, cls) {
    const g = sv('g', { class: 'pill-lbl ' + (cls || '') });
    const w = st.fs * (0.62 * text.length * 1.6 + 0.9), h = st.fs * 1.35;
    const r = sv('rect', { x: p[0] - w / 2, y: p[1] - h / 2, width: w, height: h, rx: h / 2 });
    const t = sv('text', { x: p[0], y: p[1], 'text-anchor': 'middle', 'dominant-baseline': 'central' }, text);
    g.append(r, t);
    st.L('top').appendChild(g);
    return { g, set(txt) { t.textContent = txt; const w2 = st.fs * (0.62 * txt.length * 1.6 + 0.9); r.setAttribute('x', p[0] - w2 / 2); r.setAttribute('width', w2); } };
  }
  /** 화살촉 (tip 쪽, dir 방향) */
  function arrowHead(st, tip, dir, layer) {
    const d = V.norm(dir), n = V.rotVec(d, 90), L = 0.38, W = 0.2;
    const a = V.sub(tip, V.mul(d, L));
    return st.poly([tip, V.add(a, V.mul(n, W)), V.sub(a, V.mul(n, W))], { class: 'term-arrowhead' }, layer || 'help');
  }

  /** 대응점끼리 이은 선분과 대칭축/대칭의 중심 관계를 끌어 보며 탐구 */
  function SymExplore(box, cfg) {
    const line = cfg.mode === 'line';
    const W = cfg.w, H = cfg.h;
    const stage = new Stage(box, { x0: -0.5, y0: -0.5, w: W + 1, h: H + 1, grid: true, cls: 'grid-stage' });
    stage.svg.classList.add('tappable');
    const [A, B] = cfg.axis || [];
    const O = cfg.center;
    const img = (p) => line ? V.round(V.reflect(p, A, B)) : V.rot180(p, O);
    let P = cfg.pts.map(p => p.slice()), moves = 0, active = -1;
    const partner = {};
    cfg.pairs.forEach(([i, j]) => { partner[i] = j; partner[j] = i; });
    const side0 = {};
    cfg.drag.forEach(i => { side0[i] = line ? Math.sign(V.cross(V.sub(B, A), V.sub(P[i], A))) : 0; });
    const info = el('div', { class: 'explore-info' });
    box.appendChild(info);
    function redraw() {
      ['main', 'help', 'ui', 'over', 'top'].forEach(l => stage.clearLayer(l));
      stage.poly(P, { class: 'shape fill-a' });
      if (line) stage.fullLine(A, B, { class: 'axis' }, 'help', 0.1);
      else { stage.circle(O, 0.13, { class: 'center-dot' }, 'ui'); stage.text(V.add(O, [0.4, 0.35]), cfg.centerLabel || 'ㅇ', { class: 'vlabel center-lbl' }); }
      if (line && cfg.axisLabels) { stage.text(V.add(A, [0.45, 0.15]), cfg.axisLabels[0], { class: 'vlabel axis-lbl' }); stage.text(V.add(B, [0.45, -0.15]), cfg.axisLabels[1], { class: 'vlabel axis-lbl' }); }
      stage.vertexLabels(P, cfg.labels, { off: 0.5 });
      const rows = [];
      cfg.pairs.forEach(([i, j], k) => {
        const color = UI.PAIR_COLORS[k % UI.PAIR_COLORS.length];
        stage.line(P[i], P[j], { class: 'pair-link', style: `stroke:${color}` }, 'help');
        if (line) {
          const f = V.foot(P[i], A, B);
          stage.rightMark(f, V.sub(P[i], f), V.sub(B, A), 0.32, {}, 'help');
          stage.circle(f, 0.09, { class: 'vdot' }, 'ui');
          if (cfg.footLabels) stage.text(V.add(f, [-0.4, 0.42]), cfg.footLabels[k], { class: 'vlabel small' });
          const d1 = V.dist(P[i], f), d2 = V.dist(P[j], f);
          stage.text(V.add(V.mid(P[i], f), [0, -0.38]), fmt(d1, 1) + '칸', { class: 'measure small', style: `fill:${color}` }, 'top');
          stage.text(V.add(V.mid(P[j], f), [0, -0.38]), fmt(d2, 1) + '칸', { class: 'measure small', style: `fill:${color}` }, 'top');
          const ang = Math.round(Math.abs(V.angleOf(V.sub(P[j], P[i])) - V.angleOf(V.sub(B, A))) % 180);
          rows.push(`<span style="color:${color}">●</span> 선분 ${cfg.labels[i]}${cfg.footLabels ? cfg.footLabels[k] : ''} = <b>${fmt(d1, 1)}칸</b>, 선분 ${cfg.labels[j]}${cfg.footLabels ? cfg.footLabels[k] : ''} = <b>${fmt(d2, 1)}칸</b> · 대칭축과 이루는 각 <b>${ang}°</b>`);
        } else {
          const d1 = V.dist(P[i], O), d2 = V.dist(P[j], O);
          const off = V.mul(V.norm(V.rotVec(V.sub(P[i], O), 90)), 0.42);
          stage.text(V.add(V.mid(P[i], O), off), fmt(d1, 1), { class: 'measure small', style: `fill:${color}` }, 'top');
          stage.text(V.add(V.mid(P[j], O), off), fmt(d2, 1), { class: 'measure small', style: `fill:${color}` }, 'top');
          rows.push(`<span style="color:${color}">●</span> 선분 ${cfg.labels[i]}${cfg.centerLabel || 'ㅇ'} = <b>${fmt(d1, 1)} cm</b>, 선분 ${cfg.labels[j]}${cfg.centerLabel || 'ㅇ'} = <b>${fmt(d2, 1)} cm</b>`);
        }
      });
      cfg.drag.forEach(i => stage.circle(P[i], 0.3, { class: 'handle' }, 'top'));
      info.innerHTML = rows.join('<br>');
    }
    stage.on({
      dragStart: (p) => { active = Hit.nearestVertex(P, p, Math.max(0.6, 36 * stage.unitPerPx())); if (!cfg.drag.includes(active)) active = -1; return active >= 0; },
      dragMove: (p) => {
        if (active < 0) return;
        const q = [Math.round(p[0]), Math.round(p[1])];
        if (V.near(q, P[active])) return;
        const Q = P.slice(); Q[active] = q; Q[partner[active]] = img(q);
        const inside = (x) => x[0] >= 0 && x[1] >= 0 && x[0] <= W && x[1] <= H;
        if (!inside(Q[active]) || !inside(Q[partner[active]])) return;
        if (line && Math.sign(V.cross(V.sub(B, A), V.sub(q, A))) !== side0[active]) return;
        if (!line && V.near(q, O)) return;
        if (!Poly.isSimple(Q, true) || Q.some((x, k) => Q.some((y, m) => m > k && V.near(x, y)))) return;
        P = Q; redraw(); active >= 0 && (P._moved = true);
      },
      dragEnd: () => { if (active >= 0 && P._moved) { moves++; P._moved = false; cfg.onMove && cfg.onMove(moves); } active = -1; },
    });
    redraw();
    return { stage };
  }

  /** 도형 하나를 180° 돌리거나 대칭축으로 접어 보는 버튼 */
  function motionButton(stage, P, labels, kind, center, axis, label) {
    let busy = false;
    return btn(label, () => {
      if (busy) return; busy = true;
      if (kind === 'fold') {
        // 대칭축 오른쪽(아래쪽) 반을 접어 넘긴다. 접혀 올라간 자리는 종이가 없어져 흰색이 된다.
        const sd = (p) => V.cross(V.sub(axis[1], axis[0]), V.sub(p, axis[0]));
        const far = P.reduce((m, p) => (Math.abs(sd(p)) > Math.abs(sd(m)) ? p : m), P[0]);
        UI.foldAnim(stage, P, axis[0], axis[1], { moveSide: far, good: true, hold: 2600, labels: P.map((p, i) => ({ p, text: labels[i] })), done: () => { busy = false; } });
        setTimeout(() => toast('대칭축을 따라 접었더니 완전히 겹쳐요! (파란 글자가 접혀 넘어온 점)', 'good', 3000), 1000);
        return;
      }
      const g = stage.poly(P, { class: 'shape ghost' }, 'over');
      const lbls = labels.map((t, i) => stage.text(P[i], t, { class: 'vlabel ghost-lbl' }, 'over'));
      const at = (p, t) => V.rot(p, center, 180 * t);
      animate(1500, t => {
        const Q = P.map(p => at(p, t));
        stage.setPoints(g, Q);
        Q.forEach((q, i) => { lbls[i].setAttribute('x', q[0]); lbls[i].setAttribute('y', q[1]); });
      }, () => {
        const Q = P.map(p => at(p, 1));
        Q.forEach((q, i) => { const j = P.findIndex(p => V.near(p, q, 1e-6)); const z = j >= 0 ? V.add(P[j], V.mul(Poly.inward(P, j), 0.62)) : q; lbls[i].setAttribute('x', z[0]); lbls[i].setAttribute('y', z[1]); });
        toast('180° 돌렸더니 처음 도형과 완전히 겹쳐요! (작은 글자가 겹친 점)', 'good', 3000);
        setTimeout(() => { g.remove(); lbls.forEach(l => l.remove()); busy = false; }, 3200);
      });
    }, 'secondary small');
  }

  /** 개념 상자 그림: a와 b를 잇는 (굽은) 양쪽 화살표 */
  function termLink(st, a, b, curve) {
    st.path(curve ? `M${a[0]},${a[1]} Q${curve[0]},${curve[1]} ${b[0]},${b[1]}` : `M${a[0]},${a[1]} L${b[0]},${b[1]}`, { class: 'term-arrow' }, 'help');
    arrowHead(st, a, V.sub(a, curve || b)); arrowHead(st, b, V.sub(b, curve || a));
  }
  const shift = (P, dx, dy) => P.map(p => [p[0] + dx, p[1] + dy]);
  const centerAt0 = (P) => { const c = Poly.centroid(P); return P.map(p => V.sub(p, c)); };

  /* =========================================================
     2차시 — 도형의 합동
     ========================================================= */
  const ACT = {};

  ACT.l2a = function (root) {
    const ga = [[0, 3], [4, 3], [1.4, 0]];
    const cands = {
      나: [[0, 0.2], [1.3, 4.2], [2.7, 2.9]],
      다: ga.map(p => [p[0] * 0.82, p[1] * 0.82]),
      라: ga.map(p => [4 - p[0], 3 - p[1]]),
      마: [[0, 3], [4, 3], [2, 0.2]],
    };
    const place = { 가: [3, 4.6], 나: [10, 4.6], 다: [15.5, 4.6], 라: [21, 4.6], 마: [26.5, 4.6] };
    const shapes = {};
    shapes.가 = centerAt0(ga).map(p => V.add(p, place.가));
    Object.keys(cands).forEach(k => { shapes[k] = centerAt0(cands[k]).map(p => V.add(p, place[k])); });
    function drawAll(st) {
      st.add(sv('rect', { x: 0.2, y: 0.6, width: 5.6, height: 7.8, rx: 0.6, class: 'pink-area' }), 'bg');
      st.add(sv('rect', { x: 6.8, y: 0.6, width: 23, height: 7.8, rx: 0.6, class: 'cand-area' }), 'bg');
      Object.keys(shapes).forEach(k => { st.poly(shapes[k], { class: 'shape ' + (k === '가' ? 'fill-b' : 'fill-a') }); st.text(V.add(Poly.centroid(shapes[k]), [0, 0.15]), k, { class: 'cap' }); });
    }
    UI.runSteps(root, [
      (c) => {
        c.say('미술관 바닥에 <b>관람 방향을 알려 주는 화살표</b>들이 있어. 모양과 크기가 모두 같아 보여!', 'dayun');
        c.say('모양과 크기가 같은지 어떻게 알 수 있을까?', 'seung');
        choice(c.box, {
          q: '모양과 크기가 같은지 확인하는 가장 좋은 방법은?',
          options: [
            { t: '두 도형을 포개어 보았을 때 완전히 겹치는지 확인해요.', ok: true, why: '맞아요! 포개었을 때 <b>완전히 겹치면</b> 모양과 크기가 같아요.' },
            { t: '두 도형의 색깔이 같은지 확인해요.', why: '색깔은 모양이나 크기와 관계가 없어요.' },
            { t: '두 도형이 같은 방향으로 놓여 있는지 확인해요.', why: '놓인 방향이 달라도 돌리거나 뒤집으면 겹칠 수 있어요.' },
          ],
          onDone: c.done,
        });
      },
      (c) => {
        c.say('도형 <b>가</b>와 <b>완전히 겹치는 도형</b>은 어느 것일지 먼저 <b>예상</b>해 보세요. (눈으로만 살펴봐요)', 'guide');
        const st = new Stage(c.area(), { x0: 0, y0: 0, w: 30, h: 9 });
        drawAll(st);
        const row = c.controls();
        ['나', '다', '라', '마'].forEach(k => row.appendChild(btn('도형 ' + k, (e) => {
          row.querySelectorAll('.btn').forEach(b => b.classList.remove('sel')); e.target.classList.add('sel');
          Store.set('l2a:guess', k);
          c.say(`도형 <b>${k}</b>(이)라고 예상했어요. 다음 단계에서 투명 종이로 직접 포개어 확인해 봐요!`, 'seung');
          c.done();
        }, 'chip')));
      },
      (c) => {
        c.say('<b>디지털 투명 종이</b>(분홍색)에 도형 가를 그려 두었어요. 투명 종이를 손가락으로 끌어 다른 도형 위에 포개어 보세요. <b>두 손가락</b>으로 돌릴 수 있고, 필요하면 <b>뒤집기</b>를 눌러요.', 'guide');
        const area = c.area();
        const st = new Stage(area, { x0: 0, y0: 0, w: 30, h: 9 });
        st.svg.classList.add('tappable');
        drawAll(st);
        const base = centerAt0(ga);
        let rel = base.map(p => p.slice()), pos = place.가.slice(), drag = null, matched = false;
        const paper = st.poly(rel.map(p => V.add(p, pos)), { class: 'tracing' }, 'over');
        const upd = () => st.setPoints(paper, rel.map(p => V.add(p, pos)));
        const fb = el('div', { class: 'fb' });
        let g0 = null;
        st.on({
          dragStart: (p) => { if (Poly.pointIn(rel.map(q => V.add(q, pos)), p) || V.dist(p, pos) < 1.6) { drag = V.sub(pos, p); return true; } return false; },
          dragMove: (p) => { if (drag) { pos = V.add(p, drag); upd(); } },
          dragEnd: () => { if (!drag) return; drag = null; check(); },
          // 두 손가락으로 투명 종이를 돌리면서 옮기기
          gestureStart: () => { drag = null; g0 = { rel: rel.map(p => p.slice()), pos: pos.slice() }; paper.classList.remove('match'); },
          gestureMove: ({ rot, center, center0 }) => { if (!g0) return; rel = g0.rel.map(p => V.rotVec(p, rot)); pos = V.add(g0.pos, V.sub(center, center0)); upd(); },
          gestureEnd: () => { if (!g0) return; g0 = null; check(); },
        });
        function check() {
          for (const k of ['나', '다', '라', '마']) {
            const Q = shapes[k], cq = Poly.centroid(Q);
            if (V.dist(pos, cq) > 1.3) continue;
            const info = Poly.fitInfo(rel.map(p => V.add(p, cq)), Q);
            if (info.congruent && !info.flip && Math.abs(info.rot) <= 15) {
              rel = rel.map(p => V.rotVec(p, info.rot)); pos = cq; upd(); paper.classList.add('match'); Sound.good();
              fb.className = 'fb good'; fb.innerHTML = `도형 가와 도형 <b>${k}</b>는 <b>완전히 겹쳐요!</b>`;
              if (k === '라' && !matched) { matched = true; c.done(); }
            } else if (info.congruent) {
              paper.classList.remove('match'); Sound.tap();
              fb.className = 'fb'; fb.innerHTML = info.flip ? `도형 ${k}와 겹칠 것 같나요? 이대로는 안 겹쳐요. <b>뒤집기</b>를 해 보세요.` : `도형 ${k}와 방향이 맞지 않아요. <b>두 손가락으로</b> 투명 종이를 돌려 방향을 맞춰 보세요.`;
            } else {
              paper.classList.remove('match'); Sound.tap();
              fb.className = 'fb bad'; fb.innerHTML = `도형 ${k}와는 겹치지 않는 부분이 있어요. 돌리거나 뒤집어도 겹치지 않으면 모양이나 크기가 다른 거예요.`;
            }
            return;
          }
          paper.classList.remove('match');
        }
        const ctl = c.controls();
        ctl.append(
          btn('↻ 돌리기 (90°)', () => { rel = rel.map(p => V.rotVec(p, 90)); upd(); check(); }, 'secondary'),
          btn('⇋ 뒤집기', () => { rel = rel.map(p => [-p[0], p[1]]); upd(); check(); }, 'secondary'),
          btn('⟲ 처음으로', () => { rel = base.map(p => p.slice()); pos = place.가.slice(); upd(); paper.classList.remove('match'); }, 'ghost'));
        c.box.appendChild(fb);
      },
      (c) => {
        drawAll(new Stage(c.area(), { x0: 0, y0: 0, w: 30, h: 9 }));
        choice(c.box, {
          q: '도형 가와 완전히 겹치는 도형은 어느 것인가요?',
          options: ['나', '다', '라', '마'].map(k => ({ t: '도형 ' + k, ok: k === '라', why: k === '라' ? null : (k === '다' ? '도형 다는 모양은 비슷하지만 <b>크기</b>가 달라요.' : k === '마' ? '도형 마는 크기가 비슷하지만 <b>모양</b>이 달라요.' : '모양과 크기가 모두 달라요.') })),
          good: '정답! 도형 가를 돌려서 포개면 도형 라와 완전히 겹쳐요.',
          onDone: () => {
            const g = Store.get('l2a:guess', null);
            if (g) c.say(g === '라' ? '예상한 대로였어요! 👏' : `처음에는 도형 ${g}라고 예상했지만, 직접 포개어 보니 도형 라였어요. 예상과 확인이 다를 수 있어요!`, 'seung');
            c.done();
          },
        });
      },
      (c) => {
        c.say('도형 가와 도형 라처럼 포개었을 때 완전히 겹치는 두 도형을 무엇이라고 하는지 알아봐요. 빈칸에 알맞은 말을 <b>직접 써</b> 보세요.', 'guide');
        // 교과서 개념 상자: 문장 + 서로 합동인 두 삼각형
        termCard(c, {
          parts: ['모양과 크기가 같아서 포개었을 때 완전히 겹치는 두 도형을 서로 ', { ans: '합동' }, '이라고 합니다.'],
          figure: (box) => {
            const st = new Stage(box, { x0: -0.4, y0: -0.6, w: 11, h: 4.2, cls: 'term-stage' });
            st.poly(ga, { class: 'shape term-tri' });
            st.poly(ga.map(p => [4 - p[0] + 6, p[1]]), { class: 'shape term-tri' });
          },
          good: '정답! 포개었을 때 완전히 겹치는 두 도형을 서로 <b>합동</b>이라고 해요.',
          after: () => conceptCard(c.box, '합동', '모양과 크기가 같아서 포개었을 때 <b>완전히 겹치는</b> 두 도형을 서로 <b>합동</b>이라고 합니다.<br>돌리거나 <b>뒤집어서</b> 포개었을 때 완전히 겹쳐도 서로 합동이에요.'),
        });
      },
    ]);
  };

  ACT.l2b = function (root) {
    const items = [
      { k: '가', f: Fig.poly([[1, 1], [5, 1], [5, 3]]), dim: [['가로 4칸', [3, 0.55]], ['세로 2칸', [5.9, 2]]] },
      { k: '나', f: Fig.poly([[7, 1], [9, 1], [9, 5], [7, 5]]), dim: [['가로 2칸', [8, 0.55]], ['세로 4칸', [9.9, 3]]] },
      { k: '다', f: Fig.circle([13, 3], 2), dim: [['지름 4칸', [13, 0.55]]] },
      { k: '라', f: Fig.poly([[16, 1], [17, 1], [16, 5]]), dim: [['가로 1칸', [16.5, 0.55]], ['세로 4칸', [15.4, 3]]] },
      { k: '마', f: Fig.poly([[19, 2], [23, 2], [23, 4], [19, 4]]), dim: [['가로 4칸', [21, 1.55]], ['세로 2칸', [23.9, 3]]] },
      { k: '바', f: Fig.circle([3, 8], 2), dim: [['지름 4칸', [3, 5.55]]] },
      { k: '사', f: Fig.poly([[7, 10], [11, 10], [11, 7]]), dim: [['가로 4칸', [9, 10.45]], ['세로 3칸', [11.9, 8.5]]] },
      { k: '아', f: Fig.poly([[13, 7], [16, 7], [16, 10], [13, 10]]), dim: [['가로 3칸', [14.5, 6.55]], ['세로 3칸', [16.9, 8.5]]] },
      { k: '자', f: Fig.circle([19.5, 8.5], 1.5), dim: [['지름 3칸', [19.5, 6.55]]] },
      { k: '차', f: Fig.poly([[22, 6], [22, 10], [24, 10]]), dim: [['가로 2칸', [23, 10.45]], ['세로 4칸', [21.1, 8]]] },
    ];
    const pairs = [['가', '차'], ['나', '마'], ['다', '바']];
    UI.runSteps(root, [
      (c) => {
        c.say('이번에는 투명 종이 없이 <b>모눈의 칸 수</b>를 세어서 서로 합동인 도형을 찾아봐요. 서로 합동인 두 도형을 차례로 눌러 짝을 지어요.', 'guide');
        const st = new Stage(c.area(), { x0: 0, y0: 0, w: 25, h: 11, grid: true });
        st.svg.classList.add('tappable');
        const nodes = {};
        const colors = R.shuffle(Stage.ART.slice());
        items.forEach((it, k) => {
          nodes[it.k] = st.fig(it.f, { class: 'shape plain', style: `fill:${colors[k % colors.length]}` });
          const cc = it.f.kind === 'circle' ? it.f.c : Poly.centroid(it.f.pts);
          st.text(it.f.kind === 'circle' ? cc : V.add(cc, [0, 0.1]), it.k, { class: 'cap' });
        });
        const dimLayer = [];
        let sel = null, found = 0;
        const fb = el('div', { class: 'fb' });
        const hit = (p) => items.find(it => it.f.kind === 'circle' ? V.dist(p, it.f.c) <= it.f.r + 0.2 : (Poly.pointIn(it.f.pts, p) || it.f.pts.some((q, i) => V.distToSeg(p, q, it.f.pts[(i + 1) % it.f.pts.length]) < 0.35)));
        const done = new Set();
        st.on({
          tap: (p) => {
            const it = hit(p);
            if (!it || done.has(it.k)) return;
            Sound.tap();
            if (!sel) { sel = it; nodes[it.k].classList.add('picked'); return; }
            if (sel === it) { nodes[it.k].classList.remove('picked'); sel = null; return; }
            const pr = pairs.find(x => x.includes(sel.k) && x.includes(it.k));
            nodes[sel.k].classList.remove('picked');
            if (pr) {
              const color = UI.PAIR_COLORS[found];
              [sel.k, it.k].forEach(k => { nodes[k].style.fill = color; nodes[k].style.fillOpacity = 0.45; done.add(k); });
              found++; Sound.good();
              fb.className = 'fb good'; fb.innerHTML = `도형 ${sel.k}와 도형 ${it.k}는 서로 합동이에요! (${found}/3)`;
              if (found === 3) { fb.innerHTML += '<br>서로 합동인 도형을 모두 찾았어요.'; c.done(); }
            } else {
              Sound.bad(); shake(st.svg);
              fb.className = 'fb bad'; fb.innerHTML = `도형 ${sel.k}와 도형 ${it.k}는 포개었을 때 완전히 겹치지 않아요. <b>칸 수 보기</b>를 눌러 길이를 비교해 보세요.`;
            }
            sel = null;
          },
        });
        const ctl = c.controls();
        let shown = false;
        ctl.appendChild(btn('📏 칸 수 보기', (e) => {
          shown = !shown;
          if (shown) items.forEach(it => it.dim.forEach(([t, p]) => dimLayer.push(st.text(p, t, { class: 'dim' }, 'top'))));
          else { dimLayer.forEach(n => n.remove()); dimLayer.length = 0; }
          e.target.textContent = shown ? '📏 칸 수 숨기기' : '📏 칸 수 보기';
        }, 'secondary'));
        c.box.appendChild(fb);
      },
      (c) => {
        choice(c.box, {
          q: '서로 합동인 도형을 어떻게 찾았나요? 알맞은 방법을 <b>모두</b> 고르세요.', multi: true,
          options: [
            { t: '모눈의 칸 수를 세어 변의 길이(원은 지름)를 비교했어요.', ok: true },
            { t: '삼각형, 사각형, 원처럼 같은 모양끼리 모은 뒤 크기를 비교했어요.', ok: true },
            { t: '놓인 방향이 같은 도형끼리 골랐어요.', why: '‘놓인 방향이 같은 도형끼리’는 알맞지 않아요. 도형 가와 차처럼 놓인 방향이 달라도 돌리거나 뒤집어 포개어 완전히 겹치면 합동이에요.' },
            { t: '도형의 이름 글자가 비슷한 것끼리 골랐어요.', why: '‘이름 글자’는 알맞지 않아요. 가, 나, 다 같은 이름은 모양이나 크기와 관계가 없어요.' },
          ],
          good: '좋아요! 놓인 방향이 달라도 돌리거나 뒤집어 포개어 완전히 겹치면 서로 합동이에요.',
          missText: () => '알맞은 방법이 하나 더 있어요. 모양이 같은 도형끼리 먼저 모아 보는 방법도 생각해 보세요.',
          onDone: () => { conceptCard(c.box, '서로 합동인 도형 찾기', '모양이 같은 도형끼리 모은 다음, <b>모눈의 칸 수</b>를 세어 변의 길이(원은 지름)가 같은지 비교해요.<br>도형 가와 차처럼 <b>돌리거나 뒤집은 모양</b>도 서로 합동이에요.'); c.done(); },
        });
      },
    ]);
  };

  /* =========================================================
     3차시 — 합동인 도형의 성질
     ========================================================= */
  ACT.l3a = function (root) {
    const A = [[3, 1], [1, 5], [7, 5]], B = shift(A, 9, 0);
    const figs = [{ pts: A, labels: ['ㄱ', 'ㄴ', 'ㄷ'] }, { pts: B, labels: ['ㄹ', 'ㅁ', 'ㅂ'] }];
    const map = [[0, 3], [1, 4], [2, 5]];
    const view = { x0: 0, y0: 0, w: 17, h: 6.2 };
    UI.runSteps(root, [
      (c) => {
        c.say('판화 체험장이에요! 판에 새긴 삼각형과 찍어 낸 삼각형은 모양과 크기가 같아요. 오른쪽 삼각형 ㄹㅁㅂ을 <b>손가락으로 끌어</b> 삼각형 ㄱㄴㄷ 위에 완전히 겹치도록 포개어 보세요. 그리고 겹치는 점·변·각을 글자로 입력해요.', 'seung');
        Correspond(c.area(), {
          view, figs, map, phrase: 'overlap', drag: { moving: 1, onto: 0 },
          prompts: [[0], [1], [2]].map(g => ({ type: 'point', given: g }))
            .concat([[0, 1], [1, 2], [2, 0]].map(g => ({ type: 'side', given: g })))
            .concat([[2, 0, 1], [0, 1, 2], [1, 2, 0]].map(g => ({ type: 'angle', given: g }))),
          onDone: () => { c.say('겹치는 점·변·각을 모두 찾았어요! 이렇게 겹치는 점·변·각을 무엇이라고 부르는지 다음 단계에서 알아봐요.', 'guide'); c.done(); },
        });
      },
      (c) => {
        c.say('서로 합동인 두 삼각형을 포개었을 때 겹치는 점, 변, 각을 부르는 이름이 있어요. 그림의 화살표를 보고 빈칸에 알맞은 말을 <b>직접 써</b> 보세요.', 'guide');
        let tags = [];
        termCard(c, {
          wide: true,
          parts: ['서로 합동인 두 도형을 완전히 겹치도록 포개었을 때 겹치는 점을 ', { ans: '대응점' }, ', 겹치는 변을 ', { ans: '대응변' }, ', 겹치는 각을 ', { ans: '대응각' }, '이라고 합니다.'],
          figure: (box) => {
            // 교과서 그림: 합동인 두 삼각형과 겹치는 점·변·각을 잇는 화살표
            const T = [[3, 1.4], [0.6, 6], [6.4, 6]], U = shift(T, 9, 0);
            const st = new Stage(box, { x0: -0.4, y0: -0.2, w: 16.2, h: 6.7, cls: 'term-stage' });
            st.poly(T, { class: 'shape term-tri' }); st.poly(U, { class: 'shape term-tri' });
            st.angleArc(T, 2, 0.75, { class: 'arc term-arc' }); st.angleArc(U, 2, 0.75, { class: 'arc term-arc' });
            const link = (a, b, curve) => {
              const pts = curve ? [a, curve, b] : [a, b];
              st.path(curve ? `M${a[0]},${a[1]} Q${curve[0]},${curve[1]} ${b[0]},${b[1]}` : `M${a[0]},${a[1]} L${b[0]},${b[1]}`, { class: 'term-arrow' }, 'help');
              arrowHead(st, a, V.sub(a, pts[1])); arrowHead(st, b, V.sub(b, pts[pts.length - 2]));
            };
            link(V.add(T[0], [0.15, 0]), V.sub(U[0], [0.15, 0]));
            const m1 = V.mid(T[0], T[2]), m2 = V.mid(U[0], U[2]);
            link(V.add(m1, [0.25, 0]), V.sub(m2, [0.25, 0]));
            const a1 = V.add(T[2], [-0.75, -0.42]), a2 = V.add(U[2], [-0.7, -0.38]);
            link(a1, a2, [9.5, 2.9]);
            tags = [pill(st, [7.5, 1.4], '?', 'p1'), pill(st, [7.9, 3.7], '?', 'p2'), pill(st, [8.4, 4.9], '?', 'p3')];
          },
          onReveal: () => ['대응점', '대응변', '대응각'].forEach((t, i) => tags[i].set(t)),
          good: '정답! 겹치는 점은 <b>대응점</b>, 겹치는 변은 <b>대응변</b>, 겹치는 각은 <b>대응각</b>이에요.',
          after: () => conceptCard(c.box, '대응점, 대응변, 대응각', '서로 합동인 두 도형을 완전히 겹치도록 포개었을 때 겹치는 점을 <b>대응점</b>, 겹치는 변을 <b>대응변</b>, 겹치는 각을 <b>대응각</b>이라고 합니다.'),
        });
      },
    ]);
  };

  ACT.l3b = function (root) {
    const A = [[4, 1], [1, 4], [7, 4], [7, 1]];          // ㄱ ㄴ ㄷ ㄹ
    const B = [[10, 1], [10, 4], [16, 4], [13, 1]];      // ㅁ ㅂ ㅅ ㅇ
    const figs = [{ pts: A, labels: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'] }, { pts: B, labels: ['ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'] }];
    const map = [[0, 7], [1, 6], [2, 5], [3, 4]];
    const view = { x0: 0, y0: 0, w: 17, h: 5.4, grid: true };
    UI.runSteps(root, [
      (c) => {
        c.say('두 사각형은 서로 합동이에요. 대응변과 대응각을 입력하면 <b>디지털 자와 각도기</b>가 길이와 크기를 재어 줘요. (모눈 한 칸은 1 cm) 헷갈리면 사각형 ㅁㅂㅅㅇ을 끌어 포개어 보세요.', 'guide');
        Correspond(c.area(), {
          view, figs, map, measure: true, drag: { moving: 1, onto: 0 },
          prompts: [[0, 3], [3, 2], [2, 1], [1, 0]].map(g => ({ type: 'side', given: g }))
            .concat([[0, 3, 2], [3, 2, 1], [0, 1, 2], [1, 0, 3]].map(g => ({ type: 'angle', given: g }))),
          onDone: c.done,
        });
      },
      (c) => {
        c.say('재어 본 결과를 보고 서로 합동인 두 도형의 성질을 정리해 보세요.', 'dayun');
        fillBlank(c.box, {
          parts: ['서로 합동인 두 도형은 ', { ans: '대응변' }, '의 길이와 ', { ans: '대응각' }, '의 크기가 각각 같습니다.'],
          chips: ['대응변', '대응각', '대응점', '넓이'],
          onDone: c.done,
        });
      },
    ]);
  };

  ACT.l3c = function (root) {
    // 두 사각형은 서로 합동 (오른쪽은 왼쪽을 뒤집어 돌린 것)
    const base = [[0, 0], [1.5, -3.2], [4.6, -3.6], [6, 0]];
    const { A, B } = Shapes.placePair(base, Shapes.transformFig(base, 200, true), [4.4, 3.7], [13.2, 3.7], 6.8);
    const LA = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'], LB = [];
    // B의 i번째 꼭짓점 ↔ A의 i번째 꼭짓점. 이름은 B 둘레를 따라 ㅁㅂㅅㅇ
    const order = [2, 1, 0, 3]; order.forEach((i, m) => { LB[i] = ['ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'][m]; });
    const angA = Poly.angles(A).map(Math.round);
    const len = [5, 4, 6, 7]; // 변 i(i→i+1)의 길이(cm, 그림은 실제 크기와 다를 수 있음)
    function figure(stage, ask) {
      stage.poly(A, { class: 'shape fill-a' }); stage.poly(B, { class: 'shape fill-b' });
      stage.vertexLabels(A, LA); stage.vertexLabels(B, LB);
      const sideLabel = (P, i, t, cls) => stage.dimArc(P[i], P[(i + 1) % 4], t, Poly.centroid(P), { cls });
      const angLabel = (P, i, t, cls) => { stage.angleArc(P, i, 0.5, { class: 'arc ' + (cls || '') }); stage.text(V.add(P[i], V.mul(Poly.inward(P, i), 1.05)), t, { class: 'measure small ' + (cls || '') }); };
      angLabel(A, 1, angA[1] + '°'); angLabel(A, 2, angA[2] + '°');
      sideLabel(B, 1, len[1] + ' cm'); sideLabel(B, 2, len[2] + ' cm');
      if (ask === 'len') sideLabel(A, 1, '? cm', 'ask');
      if (ask === 'ang') angLabel(B, 2, '?°', 'ask');
    }
    UI.runSteps(root, [
      (c) => {
        c.say('두 도형은 서로 합동이에요. 그림은 실제 크기와 다를 수 있으니 <b>합동인 도형의 성질</b>을 이용해 구해요.', 'guide');
        const st = new Stage(c.area(), { x0: 0, y0: 0, w: 17.6, h: 7.4 }); figure(st, 'len');
        numQuestion(c.box, { q: `<b>변 ${LA[1]}${LA[2]}</b>의 길이는 몇 cm일까요?`, answer: len[1], unit: 'cm', hint: `변 ${LA[1]}${LA[2]}의 대응변을 오른쪽 도형에서 찾아보세요.`, traps: { [len[2]]: `${len[2]} cm는 변 ${LB[2]}${LB[3]}의 길이예요. 변 ${LA[1]}${LA[2]}과 겹치는 변은 어느 것인지 다시 찾아보세요.` }, good: `변 ${LA[1]}${LA[2]}의 대응변은 변 ${LB[1]}${LB[2]}이므로 ${len[1]} cm예요.`, onDone: c.done });
      },
      (c) => {
        const st = new Stage(c.area(), { x0: 0, y0: 0, w: 17.6, h: 7.4 }); figure(st, 'ang');
        numQuestion(c.box, { q: `<b>각 ${LB[1]}${LB[2]}${LB[3]}</b>의 크기는 몇 도일까요?`, answer: angA[2], unit: '°', hint: `각 ${LB[1]}${LB[2]}${LB[3]}의 대응각을 왼쪽 도형에서 찾아보세요.`, traps: { [angA[1]]: `${angA[1]}°는 각 ${LA[0]}${LA[1]}${LA[2]}의 크기예요. 각 ${LB[1]}${LB[2]}${LB[3]}의 꼭짓점 ${LB[2]}과 겹치는 점은 어느 점일까요?` }, good: `대응각인 각 ${LA[1]}${LA[2]}${LA[3]}의 크기와 같으므로 ${angA[2]}°예요.`, onDone: () => { conceptCard(c.box, '합동인 도형의 성질 이용하기', '① 구하려는 변(각)의 <b>대응변(대응각)</b>을 찾는다.<br>② 서로 합동인 두 도형은 대응변의 길이와 대응각의 크기가 각각 같다는 성질을 이용한다.'); c.done(); } });
      },
    ]);
  };

  ACT.l3d = function (root) {
    const A = [[3.2, 0.9], [0.8, 4.8], [6.4, 4.8]];
    const Bc = [12.6, 3.2];
    const B = A.map(p => V.rot180(p, V.lerp(Poly.centroid(A), Bc, 0.5)));
    const figs = [{ pts: A, labels: ['ㄱ', 'ㄴ', 'ㄷ'] }, { pts: B, labels: ['ㅁ', 'ㅂ', 'ㄹ'], cls: 'fill-c' }];
    const map = [[0, 3], [1, 4], [2, 5]];
    const view = { x0: 0, y0: 0, w: 17.4, h: 6.6 };
    UI.runSteps(root, [
      (c) => {
        c.say('삼각형 ㄱㄴㄷ 조각을 퍼즐의 빈 곳(삼각형 ㅁㅂㄹ)에 끼우면 퍼즐이 완성돼요. 조각을 <b>끌어서</b> 옮기고, 맞지 않으면 <b>돌리기</b>를 눌러 보세요. 그리고 대응점·대응변·대응각을 입력해 친구에게 설명해 보세요.', 'dayun');
        Correspond(c.area(), {
          view, figs, map, drag: { moving: 0, onto: 1 },
          prompts: [[0], [1], [2]].map(g => ({ type: 'point', given: g }))
            .concat([[0, 1], [1, 2], [2, 0]].map(g => ({ type: 'side', given: g })))
            .concat([[2, 0, 1], [0, 1, 2], [1, 2, 0]].map(g => ({ type: 'angle', given: g }))),
          onDone: () => { conceptCard(c.box, '친구에게 설명하기', '예) “삼각형 ㄱㄴㄷ과 삼각형 ㅁㅂㄹ은 서로 합동이야. 점 ㄱ의 대응점은 점 ㅁ, 변 ㄱㄴ의 대응변은 변 ㅁㅂ, 각 ㄱㄴㄷ의 대응각은 각 ㅁㅂㄹ이야. 대응변의 길이와 대응각의 크기는 각각 같아.”'); c.done(); },
        });
      },
    ]);
  };

  /* =========================================================
     4차시 — 선대칭도형
     ========================================================= */
  const l4Shapes = [
    { k: '가', f: Fig.poly(centerAt0([[0, 0], [2, 0], [3.6, 4], [0, 4]])) },
    { k: '나', f: Fig.poly(centerAt0([[0, 0], [4, 4], [0, 4]])) },
    { k: '다', f: Fig.poly(centerAt0([[1.4, 0], [4.2, 0], [2.8, 4], [0, 4]])) },
    { k: '라', f: Fig.circle([0, 0], 2.1) },
    { k: '마', f: Fig.poly(Shapes.polyLib.양쪽화살표().map(p => V.mul(p, 0.62))) },
  ];
  ACT.l4a = function (root) {
    const results = {};
    UI.runSteps(root, [
      (c) => {
        c.say('반으로 접어 보는 활동은 교과서와 준비물로 직접 해 보았지요? 이제 도형에 <b>대칭축</b>을 그어 봐요. 먼저 <b>선대칭도형일 것 같은 도형</b>을 모두 골라 예상해 보세요.', 'guide');
        const row = el('div', { class: 'thumbs' });
        c.box.appendChild(row);
        const picked = new Set();
        l4Shapes.forEach(s => {
          const b = el('button', { class: 'thumb', type: 'button' });
          const st = new Stage(b, { x0: -2.8, y0: -2.8, w: 5.6, h: 5.6 });
          st.fig(s.f, { class: 'shape fill-a' });
          b.appendChild(el('span', { class: 'tag' }, s.k));
          b.onclick = () => { Sound.tap(); picked.has(s.k) ? picked.delete(s.k) : picked.add(s.k); b.classList.toggle('sel'); };
          row.appendChild(b);
        });
        c.controls().appendChild(btn('예상 완료', () => { Store.set('l4a:guess', [...picked]); c.say(`예상: <b>${[...picked].join(', ') || '없음'}</b> — 다음 단계에서 대칭축을 그어 확인해요!`, 'dayun'); c.done(); }, 'primary'));
      },
      (c) => {
        c.say('도형을 하나씩 골라 <b>손가락으로 선을 그어</b> 대칭축을 모두 찾아요. 대칭축이 아닌 선을 그으면 그 선으로 접었을 때의 모양이 빨간 점선으로 보여요. 모든 도형을 확인해 보세요.', 'guide');
        const row = el('div', { class: 'thumbs small' });
        const work = el('div', { class: 'work' });
        c.box.append(row, work);
        const tabs = {};
        const open = (s) => {
          Object.values(tabs).forEach(t => t.classList.remove('on')); tabs[s.k].classList.add('on');
          clear(work);
          work.appendChild(el('div', { class: 'q', html: `도형 <b>${s.k}</b>` }));
          AxisDraw(work, {
            fig: s.f, view: { x0: -3.6, y0: -3.3, w: 7.2, h: 6.6 },
            onResult: (r) => {
              results[s.k] = r;
              tabs[s.k].classList.add('done');
              tabs[s.k].querySelector('.tag').textContent = s.k + ' ✓';
              if (Object.keys(results).length === l4Shapes.length) c.done();
            },
          });
        };
        l4Shapes.forEach(s => {
          const b = el('button', { class: 'thumb', type: 'button' });
          const st = new Stage(b, { x0: -2.8, y0: -2.8, w: 5.6, h: 5.6 });
          st.fig(s.f, { class: 'shape fill-a' });
          b.appendChild(el('span', { class: 'tag' }, s.k));
          b.onclick = () => { Sound.tap(); open(s); };
          tabs[s.k] = b; row.appendChild(b);
        });
        open(l4Shapes[0]);
      },
      (c) => {
        const row = el('div', { class: 'thumbs fig-only' });
        l4Shapes.forEach(s => {
          const b = el('div', { class: 'thumb' });
          const st = new Stage(b, { x0: -2.8, y0: -2.8, w: 5.6, h: 5.6 });
          st.fig(s.f, { class: 'shape fill-a' });
          b.appendChild(el('span', { class: 'tag' }, s.k));
          row.appendChild(b);
        });
        c.box.appendChild(row);
        const tbl = el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, '도형'), ...l4Shapes.map(s => el('th', {}, s.k))),
          el('tr', {}, el('td', {}, '대칭축의 수'), ...l4Shapes.map(s => { const n = Fig.axisCount(s.f); return el('td', {}, n === Infinity ? '셀 수 없이 많음' : n + '개'); })));
        c.box.appendChild(tbl);
        choice(c.box, {
          q: '선대칭도형을 모두 고르세요.', multi: true, grid: true,
          options: l4Shapes.map(s => ({ t: '도형 ' + s.k, ok: Fig.axisCount(s.f) > 0, why: `도형 ${s.k}는 어떤 직선을 따라 접어도 완전히 겹치지 않아요. (위 표의 대칭축 수를 보세요)` })),
          missText: (n) => `선대칭도형이 <b>${n}개</b> 더 있어요. 위 표에서 대칭축이 있는 도형을 확인해 보세요.`,
          good: '맞아요! 도형 나, 라, 마가 선대칭도형이에요. 도형 다는 가운데를 지나는 어떤 선으로 접어도 완전히 겹치지 않아요.',
          onDone: () => {
            const g = Store.get('l4a:guess', []);
            if (g.length) c.say(`처음 예상(${g.join(', ')})과 비교해 보세요. 친구가 그은 대칭축과도 비교해 보세요!`, 'seung');
            c.done();
          },
        });
      },
      (c) => {
        c.say('도형 나, 라, 마처럼 한 직선을 따라 접었을 때 완전히 겹치는 도형과 그 직선을 무엇이라고 하는지 알아봐요. 빈칸에 알맞은 말을 <b>직접 써</b> 보세요.', 'guide');
        let tags = [];
        termCard(c, {
          parts: ['한 직선을 따라 접었을 때 완전히 겹치는 도형을 ', { ans: '선대칭도형' }, '이라고 합니다. 이때 그 직선을 ', { ans: '대칭축' }, '이라고 합니다.'],
          figure: (box) => {
            const st = new Stage(box, { x0: -0.6, y0: -1.2, w: 10, h: 9.4, cls: 'term-stage' });
            const H = Shapes.polyLib.집모양().map(p => [4 + p[0] * 0.95, 3.6 + p[1] * 0.95]);
            st.poly(H, { class: 'shape term-tri' });
            st.line([4, -0.4], [4, 6.9], { class: 'axis' }, 'help');
            termLink(st, [6.9, 0.7], [4.15, 1.6]);
            tags = [pill(st, [4, 7.7], '?', 'p1'), pill(st, [7.6, 0.2], '?', 'p2')];
          },
          onReveal: () => ['선대칭도형', '대칭축'].forEach((t, i) => tags[i].set(t)),
          good: '정답! 접었을 때 완전히 겹치는 도형은 <b>선대칭도형</b>, 접은 직선은 <b>대칭축</b>이에요.',
          after: () => conceptCard(c.box, '선대칭도형과 대칭축', '한 직선을 따라 접었을 때 완전히 겹치는 도형을 <b>선대칭도형</b>이라고 합니다. 이때 그 직선을 <b>대칭축</b>이라고 합니다.<br>도형의 모양에 따라 대칭축은 <b>여러 개</b>일 수 있어요. (원은 셀 수 없이 많아요)'),
        });
      },
    ]);
  };

  ACT.l4b = function (root) {
    const P = [[0, -3], [-2.6, -1.2], [-2.6, 1.6], [0, 3.2], [2.6, 1.6], [2.6, -1.2]];
    const figs = [{ pts: P, labels: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ'] }];
    const map = [[0, 0], [1, 5], [2, 4], [3, 3]];
    const base = { view: { x0: -5, y0: -4.6, w: 10, h: 9.2 }, figs, map, axis: { a: [0, -4.2], b: [0, 4.2], labels: ['ㅅ', 'ㅇ'] } };
    UI.runSteps(root, [
      (c) => {
        c.say('직선 ㅅㅇ을 대칭축으로 하는 선대칭도형이에요. 대칭축을 따라 접었을 때 겹치는 점을 <b>대응점</b>, 겹치는 변을 <b>대응변</b>, 겹치는 각을 <b>대응각</b>이라고 해요. 글자를 눌러 답을 입력해요.', 'guide');
        Correspond(c.area(), Object.assign({}, base, {
          prompts: [[1], [2]].map(g => ({ type: 'point', given: g }))
            .concat([[0, 1], [1, 2], [2, 3]].map(g => ({ type: 'side', given: g })))
            .concat([[0, 1, 2], [1, 2, 3]].map(g => ({ type: 'angle', given: g }))),
          hintText: () => '대칭축 ㅅㅇ을 따라 접으면 어디와 겹칠지 생각해 보세요. <b>대칭축으로 접어 확인</b>을 눌러 볼 수도 있어요.',
          tools: (st, ctl) => ctl.appendChild(motionButton(st, P, figs[0].labels, 'fold', null, [[0, -4], [0, 4]], '📖 대칭축으로 접어 확인')),
          onDone: () => { c.say('대칭축을 따라 접었을 때 겹치는 점·변·각을 모두 찾았어요! 교과서 개념 상자를 완성해 봐요.', 'guide'); c.done(); },
        }));
      },
      (c) => {
        c.say('선대칭도형을 대칭축을 따라 접었을 때 겹치는 점, 변, 각을 무엇이라고 할까요? 그림의 화살표를 보고 빈칸에 알맞은 말을 <b>직접 써</b> 보세요.', 'guide');
        let tags = [];
        termCard(c, {
          wide: true,
          parts: [{ ans: '대칭축' }, '을 따라 접었을 때 겹치는 점을 ', { ans: '대응점' }, ', 겹치는 변을 ', { ans: '대응변' }, ', 겹치는 각을 ', { ans: '대응각' }, '이라고 합니다.'],
          figure: (box) => {
            // 교과서 그림: 오각형 선대칭도형, 대칭축, 겹치는 점·변·각을 잇는 화살표
            const T = [[4, 0.8], [7.6, 3.2], [6.4, 6.6], [1.6, 6.6], [0.4, 3.2]];
            const st = new Stage(box, { x0: -1.4, y0: -1.6, w: 10.8, h: 10.2, cls: 'term-stage' });
            st.poly(T, { class: 'shape term-tri' });
            st.line([4, -0.2], [4, 7.6], { class: 'axis' }, 'help');
            st.angleArc(T, 4, 0.75, { class: 'arc term-arc' }); st.angleArc(T, 1, 0.75, { class: 'arc term-arc' });
            termLink(st, V.mid(T[4], T[0]), V.mid(T[0], T[1]), [4, -1.6]);              // 대응변
            termLink(st, V.add(T[4], [0.95, 0.05]), V.add(T[1], [-0.95, 0.05]));       // 대응각
            termLink(st, V.add(T[3], [-0.1, 0.25]), V.add(T[2], [0.1, 0.25]), [4, 9.4]); // 대응점
            tags = [pill(st, [5.3, 5.3], '?', 'p0'), pill(st, [4, 8.0], '?', 'p1'), pill(st, [4, -0.75], '?', 'p2'), pill(st, [4, 3.25], '?', 'p3')];
          },
          onReveal: () => ['대칭축', '대응점', '대응변', '대응각'].forEach((t, i) => tags[i].set(t)),
          good: '정답! <b>대칭축</b>을 따라 접었을 때 겹치는 점은 <b>대응점</b>, 변은 <b>대응변</b>, 각은 <b>대응각</b>이에요.',
          after: () => conceptCard(c.box, '선대칭도형의 대응점, 대응변, 대응각', '대칭축을 따라 접었을 때 겹치는 점을 <b>대응점</b>, 겹치는 변을 <b>대응변</b>, 겹치는 각을 <b>대응각</b>이라고 합니다.'),
        });
      },
    ]);
  };

  /* =========================================================
     5~6차시 — 선대칭도형의 성질
     ========================================================= */
  /* 대칭축을 따라 접어서, 대응변·대응각이 꼭 맞게 겹치는 것을 보고 길이·크기가 같음을 알게 한다
     (자나 각도기로 재지 않아도 알 수 있다는 것을 깨닫게 하는 것이 목적) */
  ACT.l5a = function (root) {
    const P = [[0, -2.2], [-1.5, -0.2], [-1.5, 1.3], [0, 2.1], [1.5, 1.3], [1.5, -0.2]];
    const L = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ'];
    const A = [0, -3], B = [0, 4];
    const flat = (p, t) => [p[0] * (1 - 2 * t), p[1]];   // 대칭축(x=0)을 따라 접는 중인 점
    /** 선대칭도형 + 대칭축 + 비교할 두 곳(왼쪽: 주황, 오른쪽: 파랑)을 그리고, 접기 버튼을 단다 */
    function foldBoard(c, cfg) {
      const st = new Stage(c.area(), { x0: -4.5, y0: -3.4, w: 9, h: 6.6 });
      st.poly(P, { class: 'shape fill-a' });
      st.fullLine(A, B, { class: 'axis' }, 'help', 0.2);
      st.text([0.35, -3.05], 'ㅅ', { class: 'vlabel axis-lbl' }); st.text([0.35, 3.05], 'ㅇ', { class: 'vlabel axis-lbl' });
      st.vertexLabels(P, L, { off: 0.45 });
      const left = cfg.draw(st, P, 'cmp-left', 'top');
      let right = cfg.drawRight(st, P, 'cmp-right', 'top');
      let folded = 0;
      const ctl = c.controls();
      const go = btn('📖 대칭축을 따라 접기', () => {
        if (go.disabled) return;
        go.disabled = true;
        UI.foldAnim(st, P, A, B, { moveSide: P[5], good: true, hold: 2200, labels: P.map((q, i) => ({ p: q, text: L[i] })), done: () => {
          right.forEach(n => n.remove()); right = cfg.drawRight(st, P, 'cmp-right', 'top');
          go.disabled = false; go.textContent = '📖 다시 접어 보기';
          if (++folded === 1) cfg.onFolded();
        } });
        // 오른쪽(파랑) 표시도 종이와 함께 접혀 넘어간다
        animate(1000, t => { right.forEach(n => n.remove()); right = cfg.drawRight(st, P.map(q => flat(q, t)), 'cmp-right', 'top'); }, () => {
          setTimeout(() => toast(cfg.overlapMsg, 'good', 2600), 100);
        });
      }, 'primary');
      ctl.appendChild(go);
      void left;
      return st;
    }
    const sideLine = (i, j) => (st, Q, cls, layer) => [st.line(Q[i], Q[j], { class: 'cmp-side ' + cls }, layer)];
    UI.runSteps(root, [
      (c) => {
        c.say('직선 ㅅㅇ을 대칭축으로 하는 선대칭도형 작품이에요. <b>변 ㄴㄷ</b>(주황)과 <b>변 ㅂㅁ</b>(파랑)은 대응변이에요. 자로 재지 않고도 두 변의 길이를 비교할 수 있을까요? <b>대칭축을 따라 접어</b> 보세요.', 'guide');
        foldBoard(c, {
          draw: sideLine(1, 2), drawRight: sideLine(5, 4),
          overlapMsg: '변 ㅂㅁ이 변 ㄴㄷ에 꼭 맞게 겹쳤어요!',
          onFolded: () => choice(c.box, {
            q: '접었더니 변 ㅂㅁ이 변 ㄴㄷ에 <b>꼭 맞게 겹쳤어요</b>. 두 변의 길이는 어떨까요?',
            options: [
              { t: '두 변의 길이가 같아요.', ok: true },
              { t: '변 ㄴㄷ이 더 길어요.', why: '한쪽이 더 길면 접었을 때 끝이 삐져나와요. 두 변은 삐져나온 곳 없이 꼭 맞게 겹쳤어요.' },
              { t: '자로 재어 보아야만 알 수 있어요.', why: '재어 보지 않아도 알 수 있어요. 접었을 때 꼭 맞게 겹친다는 것은 두 변의 길이가 어떻다는 뜻일까요?' },
            ],
            good: '맞아요! 접었을 때 꼭 맞게 겹치니까 재어 보지 않아도 <b>대응변의 길이가 같다</b>는 것을 알 수 있어요.',
            onDone: () => choice(c.box, {
              q: '변 ㄱㄴ과 변 ㄱㅂ, 변 ㄷㄹ과 변 ㅁㄹ처럼 <b>다른 대응변</b>들은 어떨까요?',
              options: [
                { t: '접으면 모두 꼭 맞게 겹치니까 길이가 각각 같아요.', ok: true },
                { t: '변 ㄴㄷ과 변 ㅂㅁ만 길이가 같아요.', why: '대칭축을 따라 접으면 도형 전체가 완전히 겹쳐요. 다른 대응변들도 꼭 맞게 겹치는지 다시 접어 보세요.' },
              ],
              good: '맞아요! 선대칭도형은 대칭축을 따라 접으면 완전히 겹치니까 대응변끼리 모두 꼭 맞게 겹쳐요.',
              onDone: c.done,
            }),
          }),
        });
      },
      (c) => {
        c.say('이번에는 <b>각 ㄱㄴㄷ</b>(주황)과 <b>각 ㄱㅂㅁ</b>(파랑)이에요. 두 각은 대응각이에요. 각도기 없이 크기를 비교할 수 있을까요? 대칭축을 따라 접어 보세요.', 'seung');
        const wedge = (i) => (st, Q, cls, layer) => [st.angleWedge(Q, i, 0.55, { class: 'cmp-wedge ' + cls }, layer)];
        foldBoard(c, {
          draw: wedge(1), drawRight: wedge(5),
          overlapMsg: '각 ㄱㅂㅁ이 각 ㄱㄴㄷ에 꼭 맞게 겹쳤어요!',
          onFolded: () => choice(c.box, {
            q: '접었더니 각 ㄱㅂㅁ이 각 ㄱㄴㄷ에 <b>꼭 맞게 겹쳤어요</b>. 두 각의 크기는 어떨까요?',
            options: [
              { t: '두 각의 크기가 같아요.', ok: true },
              { t: '각 ㄱㅂㅁ이 더 커요.', why: '한 각이 더 크면 접었을 때 각의 변이 서로 어긋나요. 두 각은 꼭 맞게 겹쳤어요.' },
              { t: '각도기로 재어 보아야만 알 수 있어요.', why: '재어 보지 않아도 알 수 있어요. 접었을 때 꼭 맞게 겹친다는 것은 두 각의 크기가 어떻다는 뜻일까요?' },
            ],
            good: '맞아요! 접었을 때 꼭 맞게 겹치니까 재어 보지 않아도 <b>대응각의 크기가 같다</b>는 것을 알 수 있어요. 각 ㄴㄷㄹ과 각 ㅂㅁㄹ도 마찬가지예요.',
            onDone: c.done,
          }),
        });
      },
    ]);
  };

  const l5Cfg = { mode: 'line', w: 12, h: 8, axis: [[6, 0], [6, 8]], axisLabels: ['ㅅ', 'ㅇ'], pts: [[6, 2], [2, 1], [3, 7], [6, 6], [9, 7], [10, 1]], labels: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ'], pairs: [[1, 5], [2, 4]], drag: [1, 2], footLabels: ['ㅈ', 'ㅊ'] };
  ACT.l5b = function (root) {
    const cfg = l5Cfg;
    UI.runSteps(root, [
      (c) => {
        c.say('대응점끼리 이은 선분 ㄴㅂ, ㄷㅁ과 대칭축 ㅅㅇ 사이에는 어떤 관계가 있을까요? 모눈의 칸 수와 각도를 살펴보세요.', 'guide');
        SymExplore(c.area(), cfg);
        let a = false, b = false;
        choice(c.box, { q: '선분 ㄴㅈ과 선분 ㅂㅈ의 길이를 비교하면?', options: [{ t: '길이가 같아요.', ok: true }, { t: '선분 ㄴㅈ이 더 길어요.', why: '선분 ㄴㅈ과 선분 ㅂㅈ이 각각 모눈 몇 칸인지 세어 다시 비교해 보세요. 정말 ㄴㅈ이 더 긴가요?' }, { t: '선분 ㅂㅈ이 더 길어요.', why: '선분 ㄴㅈ과 선분 ㅂㅈ이 각각 모눈 몇 칸인지 세어 다시 비교해 보세요. 정말 ㅂㅈ이 더 긴가요?' }], onDone: () => { a = true; if (a && b) c.done(); } });
        choice(c.box, { q: '대응점끼리 이은 선분 ㄴㅂ이 대칭축과 만나서 이루는 각은?', options: [{ t: '45°', why: '45°는 직각의 절반이에요. 선분 ㄴㅂ과 대칭축이 만나는 곳에 있는 ㄴ자 모양 표시를 살펴보세요.' }, { t: '90°', ok: true }, { t: '180°', why: '180°는 두 선이 일직선일 때예요. 선분 ㄴㅂ과 대칭축은 서로 만나서 꺾여 있어요.' }], onDone: () => { b = true; if (a && b) c.done(); } });
      },
    ]);
  };

  /* ---------- 추측 → 검증 → 정리 (귀납 추론) ----------
     학생이 쓴 추측은 이 기기에 저장해 두었다가, ‘성질 정리하기’에서 낱말 카드로 문장을 완성하며 비교한다. */
  const GUESS_KEY = 'guess:l5';
  const GUESS_Q = [
    { q: '대응변의 길이와 대응각의 크기는 어떨 것 같나요?', ph: '예) 대응변의 길이는 ~일 것이다.' },
    { q: '대응점끼리 이은 선분과 대칭축 사이에는 어떤 관계가 있을 것 같나요?', ph: '예) 대응점끼리 이은 선분은 대칭축과 ~일 것이다.' },
    { q: '대응점에서 대칭축까지의 거리는 어떨 것 같나요?', ph: '예) 대응점에서 대칭축까지의 거리는 ~일 것이다.' },
  ];
  const loadGuess = () => Store.get(GUESS_KEY, null);
  function guessCard(box, idx, title) {
    const g = loadGuess();
    const card = el('div', { class: 'guess-card' }, el('div', { class: 'guess-title' }, title || '📝 내가 세운 추측'));
    const list = idx || [0, 1, 2];
    if (!g) card.appendChild(el('div', { class: 'muted' }, '아직 저장한 추측이 없어요. ‘공통된 규칙 추측하기’ 활동에서 먼저 추측을 써 보세요.'));
    else list.forEach(i => card.appendChild(el('div', { class: 'guess-line' }, el('span', { class: 'guess-no' }, '추측 ' + '①②③'[i]), ' ' + (g.text[i] || '(쓰지 않음)'))));
    box.appendChild(card);
    return card;
  }

  ACT.l5p = function (root) {
    UI.runSteps(root, [
      (c) => {
        c.say('접어 보고, 모눈에서 살펴본 결과를 떠올려 보세요. 선대칭도형에는 어떤 <b>공통된 규칙</b>이 있을 것 같나요? 아직 확인하지 않았으니 <b>‘~일 것이다.’</b>로 추측해서 써 봐요.', 'guide');
        const prev = loadGuess();
        const wrap = el('div', { class: 'guess-form' });
        const inputs = GUESS_Q.map((g, i) => {
          const ta = el('textarea', { class: 'guess-in', rows: 2, placeholder: g.ph, 'aria-label': g.q });
          if (prev && prev.text[i]) ta.value = prev.text[i];
          wrap.append(el('div', { class: 'guess-q' }, el('b', {}, '추측 ' + '①②③'[i]), ' ' + g.q), ta);
          return ta;
        });
        c.box.appendChild(wrap);
        const fb = el('div', { class: 'fb' });
        const save = btn('💾 추측 저장하기', () => {
          const text = inputs.map(t => t.value.trim());
          const empty = text.findIndex(t => t.length < 4);
          if (empty >= 0) { fb.className = 'fb bad'; fb.textContent = `추측 ${'①②③'[empty]}을 문장으로 써 보세요.`; inputs[empty].focus(); return; }
          Store.set(GUESS_KEY, { text, at: Date.now() });
          Sound.good();
          fb.className = 'fb good';
          fb.innerHTML = '추측을 저장했어요! 다음 활동에서 이 추측이 <b>언제나</b> 맞는지 확인해 봐요.';
          c.done();
        }, 'primary');
        c.controls().appendChild(save);
        c.box.appendChild(fb);
      },
    ]);
  };

  ACT.l5v = function (root) {
    UI.runSteps(root, [
      (c) => {
        c.say('내가 세운 추측이 정말 <b>언제나</b> 맞을까요? <b>점 ㄴ이나 점 ㄷ을 손가락으로 끌어</b> 도형을 여러 번 바꾸어 보세요. 대응점도 함께 움직여요. 추측이 틀리는 도형을 찾을 수 있는지 도전해 봐요!', 'seung');
        guessCard(c.box, [1, 2]);
        SymExplore(c.area(), Object.assign({}, l5Cfg, { onMove: (m) => { if (m === 2) { toast('여러 번 바꾸어 보았어요. 내 추측과 비교해 보세요.', 'good'); c.done(); } } }));
      },
      (c) => {
        // 학생마다 추측이 다르므로 정답·오답이 없다. 고른 답에 맞는 안내만 한다.
        c.box.appendChild(el('div', { class: 'q', html: '도형의 모양을 여러 번 바꾸어 보았어요. <b>내 추측이 틀리는 도형</b>을 찾았나요?' }));
        const opts = el('div', { class: 'opts' });
        const fb = el('div', { class: 'fb' });
        const answers = [
          { t: '찾지 못했어요. 내 추측대로였어요.', msg: '모양을 여러 번 바꾸어도 추측대로였군요. 다음 활동에서 성질을 정리하며 내 추측과 다시 비교해 봐요.' },
          { t: '찾았어요. 내 추측과 다른 도형이 있었어요.', msg: '추측과 다른 점을 찾았군요! 어느 부분이 달랐는지 화면의 직각 표시와 양쪽 칸 수를 다시 살펴보세요. 다음 활동에서 성질을 정리하며 내 추측을 고쳐 봐요.' },
        ];
        answers.forEach((o, i) => {
          const b = el('button', { class: 'opt', type: 'button' }, o.t);
          b.onclick = () => {
            opts.querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', x === b));
            fb.className = 'fb'; fb.innerHTML = o.msg;
            const st = Store.get(GUESS_KEY, null);
            if (st) { st.verify = i === 0 ? 'held' : 'counter'; Store.set(GUESS_KEY, st); }
            Sound.tap(); c.done();
          };
          opts.appendChild(b);
        });
        c.box.append(opts, fb);
      },
    ]);
  };

  ACT.l5s = function (root) {
    const g0 = loadGuess();
    /** 확인한 성질 문장을 낱말 카드로 완성하고, 바로 위의 내 추측과 비교한다 */
    function compare(c, idx, sentence, chips, title) {
      guessCard(c.box, idx, '📝 내 추측');
      c.box.appendChild(el('div', { class: 'guess-title confirmed' }, '✅ ' + title));
      fillBlank(c.box, {
        parts: sentence, chips,
        onDone: () => {
          if (!g0) { c.done(); return; }
          const box = el('div', { class: 'self-check' });
          c.box.appendChild(box);
          const results = {};
          idx.forEach(i => {
            const row = el('div', { class: 'sc-row' }, el('span', {}, `추측 ${'①②③'[i]}은 확인한 성질과`));
            const set = (v, b) => {
              results[i] = v;
              row.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b));
              const st = Store.get(GUESS_KEY, g0); st.check = Object.assign({}, st.check, { [i]: v }); Store.set(GUESS_KEY, st);
              if (idx.every(k => results[k])) {
                c.say(Object.values(results).every(v => v === 'same')
                  ? '내 추측이 확인한 성질과 같았어요! 추측하고 확인하는 과정을 잘 해냈어요.'
                  : '다른 부분이 있었어요. 내 추측의 어느 낱말이 달랐는지 확인한 성질과 비교해 보세요. 추측은 확인하면서 고쳐 나가는 거예요.', 'guide');
                c.done();
              }
            };
            const b1 = btn('같아요', () => set('same', b1), 'chip');
            const b2 = btn('달라요(고쳐야 해요)', () => set('diff', b2), 'chip');
            row.append(b1, b2);
            box.appendChild(row);
          });
        },
      });
    }
    UI.runSteps(root, [
      (c) => {
        c.say('확인한 내용을 낱말 카드로 정리하고, 처음에 세운 <b>내 추측</b>과 비교해 봐요.', 'guide');
        compare(c, [0], ['선대칭도형은 ', { ans: '대응변' }, '의 길이와 ', { ans: '대응각' }, '의 크기가 각각 같습니다.'], ['대응변', '대응각', '대칭축', '대응점'], '확인한 성질 ①');
      },
      (c) => {
        compare(c, [1, 2], ['선대칭도형에서 대응점끼리 이은 선분은 대칭축과 ', { ans: '수직' }, '으로 만나고, 대응점에서 대칭축까지의 거리는 ', { ans: '같습니다' }, '.'], ['수직', '평행', '같습니다', '다릅니다'], '확인한 성질 ②');
      },
      (c) => {
        conceptCard(c.box, '선대칭도형의 성질', '• 대응변의 길이와 대응각의 크기가 각각 같아요.<br>• 대응점끼리 이은 선분은 대칭축과 <b>수직</b>으로 만나고, 대칭축은 그 선분을 <b>똑같이 둘로</b> 나눠요.<br>&nbsp;&nbsp;→ 대응점끼리 이은 선분은 대칭축에 의하여 <b>수직이등분</b>돼요.');
        c.say('왜 언제나 그럴까요? 대칭축을 따라 접으면 대응점끼리 완전히 겹치니까 대칭축까지의 거리가 같고, 선분이 반으로 접혀 겹치니까 양쪽 각이 같아서 90°예요.', 'seung');
        c.done();
      },
    ]);
  };

  ACT.l5c = function (root) {
    const P1 = [[0, -1.0], [2.6, -2.6], [3.0, 2.0], [-3.0, 2.0], [-2.6, -2.6]];
    const P2 = [[-3.2, 0], [-1.4, -2.2], [1.4, -2.2], [3.2, 0], [1.4, 2.2], [-1.4, 2.2]];
    const ang = Math.round(Poly.angleAt(P1, 4));
    UI.runSteps(root, [
      (c) => {
        c.say('직선 ㄱㄴ을 대칭축으로 하는 선대칭도형이에요. 그림은 실제 크기와 다를 수 있으니 <b>선대칭도형의 성질</b>로 구해요.', 'guide');
        const st = new Stage(c.area(), { x0: -5, y0: -4, w: 10, h: 7.6 });
        st.poly(P1, { class: 'shape fill-a' });
        st.fullLine([0, -3.6], [0, 3.6], { class: 'axis' }, 'help', 0.3);
        st.text([0.5, -3.4], 'ㄱ', { class: 'vlabel axis-lbl' }); st.text([0.5, 3.4], 'ㄴ', { class: 'vlabel axis-lbl' });
        const lab = (i, t, cls) => st.dimArc(P1[i], P1[(i + 1) % 5], t, [0, 0], { cls });
        lab(1, '5 cm'); lab(3, '? cm', 'ask');
        st.angleArc(P1, 4, 0.5, {}); st.text(V.add(P1[4], V.mul(Poly.inward(P1, 4), 1.05)), ang + '°', { class: 'measure small' });
        st.angleArc(P1, 1, 0.5, { class: 'arc ask' }); st.text(V.add(P1[1], V.mul(Poly.inward(P1, 1), 1.05)), '?°', { class: 'measure small ask' });
        let n = 0; const fin = () => { if (++n === 2) c.done(); };
        numQuestion(c.box, { q: '<b>?</b>로 표시한 변의 길이는 몇 cm일까요?', answer: 5, unit: 'cm', hint: '대응변의 길이는 같아요. 대칭축을 따라 접었을 때 겹치는 변을 찾아보세요.', onDone: fin });
        numQuestion(c.box, { q: '<b>?</b>로 표시한 각의 크기는 몇 도일까요?', answer: ang, unit: '°', hint: '대응각의 크기는 같아요.', onDone: fin });
      },
      (c) => {
        c.say('직선 ㄱㄴ을 대칭축으로 하는 선대칭도형이에요. 대응점끼리 이은 선분과 대칭축의 관계를 이용해요.', 'guide');
        const st = new Stage(c.area(), { x0: -5, y0: -3.6, w: 10, h: 7.2 });
        st.poly(P2, { class: 'shape fill-a' });
        st.fullLine([-4.6, 0], [4.6, 0], { class: 'axis' }, 'help', 0.3);
        st.text([-4.5, -0.45], 'ㄱ', { class: 'vlabel axis-lbl' }); st.text([4.5, -0.45], 'ㄴ', { class: 'vlabel axis-lbl' });
        st.line(P2[2], P2[4], { class: 'pair-link solid' }, 'help');
        st.rightMark([1.4, 0], [0, -1], [1, 0], 0.35, { class: 'right-mark ask-mark' }, 'help');
        st.dimArc([1.4, -2.2], [1.4, 0], '4 cm', [5, 0]); st.dimArc([1.4, 0], [1.4, 2.2], '? cm', [5, 0], { cls: 'ask' });
        st.text([2.2, -0.45], '?°', { class: 'measure small ask' });
        let n = 0; const fin = () => { if (++n === 2) { conceptCard(c.box, '선대칭도형의 성질', '• 대응변의 길이와 대응각의 크기가 각각 같아요.<br>• 대응점끼리 이은 선분은 대칭축과 <b>수직</b>으로 만나요.<br>• 대응점에서 대칭축까지의 <b>거리가 같아요</b>.'); c.done(); } };
        numQuestion(c.box, { q: '<b>? cm</b>로 표시한 선분의 길이는 몇 cm일까요?', answer: 4, unit: 'cm', hint: '대응점에서 대칭축까지의 거리는 같아요.', traps: { 8: '8 cm는 위아래 대응점을 이은 선분 <b>전체</b>의 길이예요. ? 표시는 대칭축까지의 길이예요.', 2: '대응점에서 대칭축까지의 거리는 양쪽이 같아요. 위쪽 길이를 다시 보세요.' }, onDone: fin });
        numQuestion(c.box, { q: '<b>?°</b>로 표시한 각(대응점끼리 이은 선분과 대칭축이 만나서 이루는 각)은 몇 도일까요?', answer: 90, unit: '°', hint: '대응점끼리 이은 선분은 대칭축과 수직으로 만나요.', onDone: fin });
      },
    ]);
  };

  /** 완성하기 전, 주어진 일부만 그린 모눈 그림 (성질을 먼저 생각해 보는 단계에서 함께 보여 줌) */
  function partialFigure(box, cfg) {
    const st = new Stage(box, { x0: -0.5, y0: -0.5, w: cfg.w + 1, h: cfg.h + 1, grid: true, cls: 'grid-stage' });
    const G = cfg.given;
    if (cfg.axis) {
      const [A, B] = cfg.axis;
      st.fullLine(A, B, { class: 'axis' }, 'help', 0.1);
      st.text(V.add(A, [0.35, 0.25]), cfg.axisLabels[0], { class: 'vlabel axis-lbl' });
      st.text(V.add(B, [0.35, -0.25]), cfg.axisLabels[1], { class: 'vlabel axis-lbl' });
    } else {
      st.circle(cfg.center, 0.14, { class: 'center-dot' }, 'ui');
      st.text(V.add(cfg.center, [0.38, 0.3]), 'ㅇ', { class: 'vlabel center-lbl' });
    }
    st.polyline(G, { class: 'given-line' });
    G.forEach(p => st.circle(p, 0.12, { class: 'vdot' }, 'ui'));
    const c0 = Poly.centroid(G);
    G.forEach((p, i) => { const d = V.norm(V.sub(p, c0)); st.text(V.add(p, V.mul(V.len(d) > 0.1 ? d : [-0.7, -0.7], 0.55)), cfg.labels[i], { class: 'vlabel' }); });
    return st;
  }

  ACT.l5d = function (root) {
    UI.runSteps(root, [
      (c) => {
        c.say('직선 ㅁㅂ을 대칭축으로 하는 선대칭도형의 <b>일부</b>가 그려져 있어요. 나머지를 완성하려면 대응점을 찾아야 해요.', 'guide');
        partialFigure(c.area(), { w: 12, h: 8, axis: [[6, 0], [6, 8]], axisLabels: ['ㅁ', 'ㅂ'], given: [[6, 1], [3, 2], [1, 7], [6, 5]], labels: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'] });
        choice(c.box, {
          q: '대응점을 찾으려면 선대칭도형의 어떤 성질을 이용해야 할까요? <b>모두</b> 고르세요.', multi: true,
          options: [
            { t: '대응점끼리 이은 선분은 대칭축과 수직으로 만나요.', ok: true },
            { t: '대응점에서 대칭축까지의 거리가 같아요.', ok: true },
            { t: '대응점은 항상 대칭축 위에 있어요.', why: '‘대응점은 항상 대칭축 위에 있다’는 틀려요. 대칭축 위의 점은 자기 자신이 대응점이고, 다른 점의 대응점은 대칭축의 <b>반대쪽</b>에 있어요.' },
            { t: '대응점끼리 이은 선분은 대칭축과 평행해요.', why: '‘평행해요’는 틀려요. 대응점끼리 이은 선분은 대칭축과 <b>만나요</b>. 만나서 이루는 각을 떠올려 보세요.' },
          ],
          missText: () => '선대칭도형의 성질이 하나 더 필요해요. 대응점에서 대칭축까지의 <b>거리</b>도 생각해 보세요.',
          onDone: c.done,
        });
      },
      (c) => {
        c.say('위에서 고른 성질을 이용해 선대칭도형을 완성해요. ① 점 ㄴ, ㄷ에서 대칭축에 <b>수선을 손으로 긋고</b>, ② 대칭축까지의 거리가 같도록 <b>대응점을 찍고</b>, ③ 점을 <b>차례대로 선으로 이어요</b>.', 'seung');
        GridComplete(c.area(), {
          mode: 'line', w: 12, h: 8, axis: [[6, 0], [6, 8]], axisLabels: ['ㅁ', 'ㅂ'],
          given: [[6, 1], [3, 2], [1, 7], [6, 5]], labels: { given: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'], img: ['ㅅ', 'ㅇ'] },
          guided: true, drawHelpers: true, connect: 'manual', onDone: c.done,
        });
      },
      (c) => {
        orderCards(c.box, {
          q: '선대칭도형을 완성하는 방법을 순서대로 끌어 놓아 정리해 보세요.',
          items: ['각 점에서 대칭축에 수선을 긋습니다.', '각 점에서 대칭축까지의 거리가 같도록 대응점을 찾아 표시합니다.', '각 점을 차례대로 이어 선대칭도형을 완성합니다.'],
          why: ['대응점을 찾으려면 먼저 무엇이 있어야 할까요? 대응점은 <b>수선</b> 위에 있었어요.', '수선을 그은 다음, 이어서 선을 긋기 전에 할 일은 무엇일까요?'],
          onDone: c.done,
        });
      },
    ]);
  };

  ACT.l5e = function (root) {
    UI.runSteps(root, [
      (c) => {
        c.say('앞에서 정리한 순서대로 선대칭도형을 완성해 보세요. ① 각 점에서 대칭축에 <b>수선을 긋고</b>, ② 거리가 같도록 <b>대응점을 찍고</b>, ③ 점을 <b>차례대로 이어요</b>. 다 완성하면 <b>대칭축을 따라 접어 확인하기</b>를 눌러 보세요.', 'guide');
        GridComplete(c.area(), { mode: 'line', w: 12, h: 8, axis: [[6, 0], [6, 8]], given: [[6, 0], [3, 2], [5, 3], [1, 5], [6, 7]], drawHelpers: true, connect: 'manual', onDone: c.done });
      },
      (c) => {
        c.say('이번에는 대칭축이 <b>비스듬해요</b>. 모눈의 선과 방향이 다를 때에는 먼저 각 점에서 대칭축에 <b>수선</b>을 그어야 대응점을 쉽게 찾을 수 있어요. 대칭축과 직각이 되도록 손으로 그어 보세요.', 'guide');
        GridComplete(c.area(), { mode: 'line', w: 10, h: 8, axis: [[2, 0], [10, 8]], given: [[3, 1], [2, 3], [6, 7], [8, 6]], drawHelpers: true, connect: 'manual', onDone: c.done });
      },
      (c) => {
        c.say('친구는 어떤 방법으로 완성했는지 이야기 나누어 보세요. 아래 버튼으로 새로운 문제도 더 풀 수 있어요.', 'dayun');
        const box = el('div', { class: 'work' });
        c.box.appendChild(box);
        const more = () => {
          clear(box);
          const g = Shapes.lineHalf(R.pick(['v', 'h', 'd']));
          GridComplete(box, { mode: 'line', w: 10, h: 10, axis: g.axis, given: g.given, drawHelpers: true, connect: 'manual', onDone: () => { c.done(); } });
        };
        c.controls().appendChild(btn('🎲 새 문제', more, 'secondary'));
        more();
      },
    ]);
  };

  ACT.l5f = function (root) {
    UI.runSteps(root, [
      (c) => {
        c.say('도형판에 <b>대칭축</b>을 정하고, 대칭축의 한쪽에 <b>나만의 도형</b>을 만들어요. 못에서 못까지 손가락으로 선을 그어 고무줄을 걸어요. 다 만들면 친구에게 패드를 넘겨 선대칭도형을 완성하게 해요!', 'guide');
        const zone = el('div', {});
        c.box.appendChild(zone);
        let gh;
        const make = () => {
          clear(zone);
          gh = GeoHalf(zone, { n: 8 });
          const ctl = el('div', { class: 'controls' });
          zone.appendChild(ctl);
          ctl.appendChild(btn('🤝 완성! 친구에게 넘기기', () => {
            const r = gh.result();
            if (!r.ok) { toast(r.msg, 'bad', 3000); Sound.bad(); return; }
            clear(zone);
            zone.appendChild(UI.bubble('이제 <b>친구 차례</b>예요! 친구가 만든 도형을 선대칭도형이 되도록 완성해 주세요. 대응점이 될 못을 눌러요.', 'seung'));
            GridComplete(zone, {
              mode: 'line', w: r.n, h: r.n, axis: r.axis, given: r.given, pegs: true, free: true,
              onDone: () => {
                c.done();
                zone.appendChild(el('div', { class: 'controls' }, btn('🔄 역할을 바꾸어 새로 만들기', make, 'primary')));
              },
            });
          }, 'primary'));
        };
        make();
      },
    ]);
  };

  /* =========================================================
     7차시 — 점대칭도형
     ========================================================= */
  const l7Shapes = [
    { k: '가', P: [[0, -2.4], [1.6, 0], [0, 2.4], [-1.6, 0]] },
    { k: '나', P: [[-1.8, -1.2], [0.6, -2.2], [2.2, -0.2], [1.6, 2], [-1.8, 2]] },
    { k: '다', P: [[-1.2, -1.8], [1.2, -1.8], [2, 1.8], [-2, 1.8]] },
    { k: '라', P: [[-2.2, -1.6], [1, -1.6], [2.2, -0.4], [2.2, 1.6], [-1, 1.6], [-2.2, 0.4]] },
    { k: '마', P: Shapes.polyLib.Z모양().map(p => V.mul(p, 0.62)) },
  ];
  ACT.l7a = function (root) {
    const centerOf = (P) => { const b = Poly.bbox(P); return [b.cx, b.cy]; };
    UI.runSteps(root, [
      (c) => {
        c.say('글자 작품을 직접 돌려 보았지요? 이제 여러 도형 중에서 <b>점대칭도형</b>을 찾아봐요. 빨간 점을 중심으로 <b>180°</b> 돌렸을 때 처음 도형과 완전히 겹칠지 <b>예상</b>해서 모두 골라 보세요.', 'guide');
        const row = el('div', { class: 'thumbs' });
        c.box.appendChild(row);
        const picked = new Set();
        l7Shapes.forEach(s => {
          const b = el('button', { class: 'thumb', type: 'button' });
          const st = new Stage(b, { x0: -3, y0: -3, w: 6, h: 6 });
          st.poly(s.P, { class: 'shape fill-a' }); st.circle(centerOf(s.P), 0.14, { class: 'center-dot' }, 'ui');
          b.appendChild(el('span', { class: 'tag' }, s.k));
          b.onclick = () => { Sound.tap(); picked.has(s.k) ? picked.delete(s.k) : picked.add(s.k); b.classList.toggle('sel'); };
          row.appendChild(b);
        });
        c.controls().appendChild(btn('예상 완료', () => { Store.set('l7a:guess', [...picked]); c.say(`예상: <b>${[...picked].join(', ') || '없음'}</b>`, 'dayun'); c.done(); }, 'primary'));
      },
      (c) => {
        c.say('도형마다 <b>180° 돌려 보기</b>를 눌러 확인해요. 반투명한 도형이 빨간 점을 중심으로 돌아가요.', 'guide');
        const grid = el('div', { class: 'spin-grid' });
        c.box.appendChild(grid);
        const checked = new Set();
        l7Shapes.forEach(s => {
          const card = el('div', { class: 'spin-card' });
          const st = new Stage(card, { x0: -3.2, y0: -3.2, w: 6.4, h: 6.4 });
          const ctr = centerOf(s.P);
          st.poly(s.P, { class: 'shape fill-a' }); st.circle(ctr, 0.14, { class: 'center-dot' }, 'ui');
          const res = el('div', { class: 'spin-res' }, '도형 ' + s.k);
          card.append(res, btn('↻ 180° 돌려 보기', () => {
            const g = st.poly(s.P, { class: 'shape ghost-rot' }, 'over');
            const F = Fig.poly(s.P), same90 = Fig.equal(F, Fig.map(F, q => V.rot(q, ctr, 90)), 1e-3);
            UI.spin180(st, g, ctr, { same90, same180: Fig.isPointSym(F), done: () => {
              const ok = Fig.isPointSym(Fig.poly(s.P));
              res.innerHTML = `도형 ${s.k}: ${ok ? '<b class="ok">완전히 겹쳐요</b>' : '<b class="no">겹치지 않아요</b>'}`;
              card.classList.add(ok ? 'yes' : 'no');
              setTimeout(() => g.remove(), 1600);
              checked.add(s.k); if (checked.size === l7Shapes.length) c.done();
            } });
          }, 'secondary small'));
          grid.appendChild(card);
        });
      },
      (c) => {
        choice(c.box, {
          q: '점대칭도형을 모두 고르세요.', multi: true, grid: true,
          options: l7Shapes.map(s => ({ t: '도형 ' + s.k, ok: Fig.isPointSym(Fig.poly(s.P)), why: `도형 ${s.k}는 180° 돌렸을 때 처음 도형과 겹치지 않았어요. 위에서 돌려 본 결과를 보세요.` })),
          missText: (n) => `점대칭도형이 <b>${n}개</b> 더 있어요. 위에서 돌려 본 결과를 다시 보세요.`,
          good: '맞아요! 도형 가, 라, 마가 점대칭도형이에요.',
          onDone: () => {
            const g = Store.get('l7a:guess', []);
            if (g.length) c.say(`처음 예상(${g.join(', ')})과 같았나요? 가운데에 점이 있다고 해서 모두 점대칭도형은 아니에요!`, 'seung');
            choice(c.box, {
              q: '점대칭도형인지 알 수 있는 방법은 무엇인가요?',
              options: [
                { t: '대칭의 중심을 중심으로 180° 돌렸을 때 처음 도형과 완전히 겹치는지 확인해요.', ok: true },
                { t: '도형의 가운데에 점이 찍혀 있는지 확인해요.', why: '점이 있어도 180° 돌렸을 때 겹치지 않으면 점대칭도형이 아니에요.' },
                { t: '반으로 접었을 때 완전히 겹치는지 확인해요.', why: '그것은 선대칭도형인지 알아보는 방법이에요.' },
                { t: '90° 돌렸을 때 완전히 겹치는지 확인해요.', why: '점대칭도형은 180° 돌렸을 때 처음 도형과 겹치는 도형이에요.' },
              ],
              onDone: () => c.done(),
            });
          },
        });
      },
      (c) => {
        c.say('도형 가, 라, 마처럼 어떤 점을 중심으로 180° 돌렸을 때 처음 도형과 완전히 겹치는 도형과 그 점을 무엇이라고 하는지 알아봐요. 빈칸에 알맞은 말을 <b>직접 써</b> 보세요.', 'guide');
        let tags = [];
        termCard(c, {
          parts: ['한 도형을 어떤 점을 중심으로 180° 돌렸을 때 처음 도형과 완전히 겹치면 이 도형을 ', { ans: '점대칭도형' }, '이라고 합니다. 이때 그 점을 ', { ans: '대칭의 중심' }, '이라고 합니다.'],
          figure: (box) => {
            const st = new Stage(box, { x0: -0.8, y0: -1.4, w: 10.6, h: 9.2, cls: 'term-stage' });
            const Q = [[0.6, 5.6], [2.6, 1], [8.4, 1], [6.4, 5.6]], O = [4.5, 3.3];
            st.poly(Q, { class: 'shape term-tri' });
            // 180° 돌리기 화살표
            const r = 1.15, a0 = V.add(O, V.rotVec([r, 0], 200)), a1 = V.add(O, V.rotVec([r, 0], 20));
            st.path(`M${a0[0]},${a0[1]} A${r},${r} 0 0 1 ${a1[0]},${a1[1]}`, { class: 'term-arrow' }, 'help');
            arrowHead(st, a1, V.rotVec(V.sub(a1, O), 90));
            st.text(V.add(O, [0, -r - 0.45]), '180°', { class: 'measure small' });
            st.circle(O, 0.14, { class: 'center-dot' }, 'ui');
            termLink(st, [8.0, 6.4], V.add(O, [0.2, 0.2]), [7.4, 3.9]);
            tags = [pill(st, [3.4, 6.9], '?', 'p1'), pill(st, [8.4, 7.0], '?', 'p2')];
          },
          onReveal: () => ['점대칭도형', '대칭의 중심'].forEach((t, i) => tags[i].set(t)),
          good: '정답! 180° 돌렸을 때 완전히 겹치는 도형은 <b>점대칭도형</b>, 돌린 중심이 되는 점은 <b>대칭의 중심</b>이에요.',
          after: () => conceptCard(c.box, '점대칭도형과 대칭의 중심', '한 도형을 어떤 점을 중심으로 <b>180°</b> 돌렸을 때 처음 도형과 완전히 겹치면 이 도형을 <b>점대칭도형</b>이라고 합니다. 이때 그 점을 <b>대칭의 중심</b>이라고 합니다.<br>가운데에 점이 있다고 모두 점대칭도형은 아니에요. <b>180° 돌려 겹치는지</b> 확인해요.'),
        });
      },
    ]);
  };

  const hexP = [[-1, -2.2], [-3.2, 0.3], [-1.6, 2.2], [1, 2.2], [3.2, -0.3], [1.6, -2.2]];
  ACT.l7b = function (root) {
    const figs = [{ pts: hexP, labels: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ'] }];
    const map = [[0, 3], [1, 4], [2, 5]];
    const base = { view: { x0: -4.6, y0: -3.4, w: 9.2, h: 6.8 }, figs, map, center: { p: [0, 0], label: 'ㅇ' } };
    UI.runSteps(root, [
      (c) => {
        c.say('점 ㅇ을 대칭의 중심으로 하는 점대칭도형이에요. 대칭의 중심을 중심으로 180° 돌렸을 때 겹치는 점을 <b>대응점</b>, 겹치는 변을 <b>대응변</b>, 겹치는 각을 <b>대응각</b>이라고 해요. 글자를 눌러 답을 입력해요.', 'guide');
        Correspond(c.area(), Object.assign({}, base, {
          prompts: [[0], [1], [2]].map(g => ({ type: 'point', given: g }))
            .concat([[0, 1], [1, 2], [2, 3]].map(g => ({ type: 'side', given: g })))
            .concat([[0, 1, 2], [1, 2, 3], [2, 3, 4]].map(g => ({ type: 'angle', given: g }))),
          linkPoints: true,
          hintText: () => '점 ㅇ을 중심으로 180° 돌리면 어디로 갈지 생각해 보세요. <b>180° 돌려 확인</b>을 눌러 볼 수도 있어요.',
          tools: (st, ctl) => ctl.appendChild(motionButton(st, hexP, figs[0].labels, 'rot', [0, 0], null, '↻ 180° 돌려 확인')),
          onDone: () => { c.say('180° 돌렸을 때 겹치는 점·변·각을 모두 찾았어요! 교과서 개념 상자를 완성해 봐요.', 'guide'); c.done(); },
        }));
      },
      (c) => {
        c.say('점대칭도형을 대칭의 중심을 중심으로 180° 돌렸을 때 겹치는 점, 변, 각을 무엇이라고 할까요? 그림의 화살표를 보고 빈칸에 알맞은 말을 <b>직접 써</b> 보세요.', 'guide');
        let tags = [];
        termCard(c, {
          wide: true,
          parts: [{ ans: '대칭의 중심' }, '을 중심으로 180° 돌렸을 때 겹치는 점을 ', { ans: '대응점' }, ', 겹치는 변을 ', { ans: '대응변' }, ', 겹치는 각을 ', { ans: '대응각' }, '이라고 합니다.'],
          figure: (box) => {
            // 평행사변형 점대칭도형: 겹치는 점·변·각을 잇는 화살표
            const Q = [[-4, 2], [-1.8, -2], [4, -2], [1.8, 2]], O = [0, 0];
            const st = new Stage(box, { x0: -6.4, y0: -4.6, w: 12.8, h: 9.4, cls: 'term-stage' });
            st.poly(Q, { class: 'shape term-tri' });
            st.circle(O, 0.13, { class: 'center-dot' }, 'ui');
            st.angleArc(Q, 1, 0.7, { class: 'arc term-arc' }); st.angleArc(Q, 3, 0.7, { class: 'arc term-arc' });
            termLink(st, V.add(Q[0], [0.35, -0.18]), V.add(Q[2], [-0.35, 0.18]));                      // 대응점 (대칭의 중심을 지남)
            // 대응변: 왼쪽 변과 오른쪽 변을 도형 위로 돌아가는 화살표로 잇기
            const s0 = [-3.45, -0.25], s1 = [3.45, 0.25], k0 = [-6.4, -5.2], k1 = [6.4, -5.2];
            st.path(`M${s0[0]},${s0[1]} C${k0[0]},${k0[1]} ${k1[0]},${k1[1]} ${s1[0]},${s1[1]}`, { class: 'term-arrow' }, 'help');
            arrowHead(st, s0, V.sub(s0, k0)); arrowHead(st, s1, V.sub(s1, k1));
            termLink(st, V.add(Q[1], [0.25, 0.85]), V.add(Q[3], [-0.25, -0.85]));                     // 대응각
            // 대칭의 중심: 아래 이름표에서 가운데 점을 가리키는 화살표
            st.path('M0,3.05 L0,0.32', { class: 'term-arrow' }, 'help'); arrowHead(st, [0, 0.26], [0, -1]);
            tags = [pill(st, [0, 3.55], '?', 'p0'), pill(st, [-2.4, 1.2], '?', 'p1'), pill(st, [0, -3.85], '?', 'p2'), pill(st, [1.0, 0.74], '?', 'p3')];
          },
          onReveal: () => ['대칭의 중심', '대응점', '대응변', '대응각'].forEach((t, i) => tags[i].set(t)),
          good: '정답! <b>대칭의 중심</b>을 중심으로 180° 돌렸을 때 겹치는 점은 <b>대응점</b>, 변은 <b>대응변</b>, 각은 <b>대응각</b>이에요.',
          after: () => conceptCard(c.box, '점대칭도형의 대응점, 대응변, 대응각', '대칭의 중심을 중심으로 180° 돌렸을 때 겹치는 점을 <b>대응점</b>, 겹치는 변을 <b>대응변</b>, 겹치는 각을 <b>대응각</b>이라고 합니다.'),
        });
      },
    ]);
  };

  /* =========================================================
     8~9차시 — 점대칭도형의 성질
     ========================================================= */
  ACT.l8a = function (root) {
    const P = [[-1, -2], [-3, -0.5], [-2, 2], [1, 2], [3, 0.5], [2, -2]];
    const figs = [{ pts: P, labels: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ'] }];
    const base = { view: { x0: -4.6, y0: -3.2, w: 9.2, h: 6.4 }, figs, map: [[0, 3], [1, 4], [2, 5]], center: { p: [0, 0], label: 'ㅇ' }, measure: true };
    UI.runSteps(root, [
      (c) => {
        c.say('점대칭도형 작품에서 대응변과 대응각을 입력하면 <b>디지털 자와 각도기</b>가 길이와 크기를 재어 줘요. 재어 본 값을 비교해 보세요.', 'guide');
        Correspond(c.area(), Object.assign({}, base, {
          prompts: [[0, 1], [1, 2], [2, 3]].map(g => ({ type: 'side', given: g })).concat([[0, 1, 2], [1, 2, 3], [2, 3, 4]].map(g => ({ type: 'angle', given: g }))),
          onDone: c.done,
        }));
      },
      (c) => fillBlank(c.box, { parts: ['점대칭도형은 ', { ans: '대응변' }, '의 길이와 ', { ans: '대응각' }, '의 크기가 각각 같습니다.'], chips: ['대응변', '대응각', '대칭의 중심', '대칭축'], onDone: c.done }),
    ]);
  };

  ACT.l8b = function (root) {
    const P = [[1, 1], [3, 2], [2, 5], [9, 5], [7, 4], [8, 1]];
    const L = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ'], O = [5, 3];
    const pairs = [[0, 3], [1, 4], [2, 5]];
    function base(box) {
      const st = new Stage(box, { x0: -0.5, y0: -0.5, w: 11, h: 7, grid: true, cls: 'grid-stage' });
      st.poly(P, { class: 'shape fill-a' }); st.vertexLabels(P, L, { off: 0.5 });
      P.forEach(p => st.circle(p, 0.11, { class: 'vdot' }, 'ui'));
      return st;
    }
    UI.runSteps(root, [
      (c) => {
        c.say('점대칭도형에서 <b>대응점끼리</b> 선분으로 이어 보세요. 한 점을 누르고, 그 대응점을 누르면 선분이 그어져요.', 'guide');
        const st = base(c.area()); st.svg.classList.add('tappable');
        const fb = el('div', { class: 'fb' }); c.box.appendChild(fb);
        let first = -1; const made = new Set();
        st.on({
          tap: (p) => {
            const i = Hit.nearestVertex(P, p, Math.max(0.5, 30 * st.unitPerPx()));
            if (i < 0) return;
            if (first < 0) { first = i; st.circle(P[i], 0.3, { class: 'given-ring' }, 'top'); Sound.tap(); return; }
            st.clearLayer('top');
            const pr = pairs.find(x => x.includes(first) && x.includes(i));
            if (pr && first !== i && !made.has(pr.join())) {
              made.add(pr.join());
              st.line(P[first], P[i], { class: 'pair-link solid', style: `stroke:${UI.PAIR_COLORS[made.size - 1]}` }, 'help');
              Sound.good(); fb.className = 'fb good'; fb.innerHTML = `점 ${L[first]}과 점 ${L[i]}을 이었어요. (${made.size}/3)`;
              if (made.size === 3) c.done();
            } else if (first !== i) { Sound.bad(); fb.className = 'fb bad'; fb.innerHTML = `점 ${L[first]}과 점 ${L[i]}은 대응점이 아니에요. 도형을 180° 돌렸을 때 겹치는 점끼리 이어요.`; }
            first = -1;
          },
        });
      },
      (c) => {
        c.say('대응점끼리 이은 세 선분이 만나는 점을 찾아 눌러 <b>점 ㅇ</b>으로 표시해요.', 'guide');
        const st = base(c.area()); st.svg.classList.add('tappable');
        pairs.forEach(([i, j], k) => st.line(P[i], P[j], { class: 'pair-link solid', style: `stroke:${UI.PAIR_COLORS[k]}` }, 'help'));
        const fb = el('div', { class: 'fb' }); c.box.appendChild(fb);
        let ok = false;
        st.on({
          tap: (p) => {
            if (ok) return;
            if (V.dist(p, O) < 0.5) {
              ok = true; Sound.good();
              st.circle(O, 0.15, { class: 'center-dot' }, 'top'); st.text(V.add(O, [0.4, 0.4]), 'ㅇ', { class: 'vlabel center-lbl' }, 'top');
              fb.className = 'fb good'; fb.innerHTML = '세 선분이 한 점에서 만나요. 이 점이 무엇인지 확인해 볼까요?';
              c.controls().appendChild(btn('↻ 점 ㅇ을 중심으로 180° 돌려 보기', () => {
                const g = st.poly(P, { class: 'shape ghost-rot' }, 'over');
                animate(1400, t => g.setAttribute('transform', `rotate(${180 * t} ${O[0]} ${O[1]})`), () => {
                  fb.innerHTML = '처음 도형과 완전히 겹쳐요! 점 ㅇ은 <b>대칭의 중심</b>이에요.'; toast('점 ㅇ은 대칭의 중심!', 'good');
                  setTimeout(() => g.remove(), 1500); c.done();
                });
              }, 'secondary'));
            } else { Sound.bad(); fb.className = 'fb bad'; fb.textContent = '세 선분이 모두 지나는 점을 찾아보세요.'; }
          },
        });
      },
      (c) => {
        c.say('대칭의 중심에서 대응점까지의 거리를 비교해 보세요. <b>점 ㄱ, ㄴ, ㄷ을 끌어</b> 도형을 바꾸어도 그럴까요?', 'seung');
        SymExplore(c.area(), { mode: 'point', w: 10, h: 6, center: O, pts: P, labels: L, pairs, drag: [0, 1, 2], onMove: (m) => { if (m === 2) { toast('도형이 바뀌어도 거리는 같아요!', 'good'); c.done(); } } });
      },
      (c) => fillBlank(c.box, {
        parts: ['점대칭도형에서 대응점끼리 이은 선분은 ', { ans: '대칭의 중심' }, '에서 만나고, 대칭의 중심은 대응점끼리 이은 선분을 ', { ans: '똑같이' }, ' 둘로 나눕니다.'],
        chips: ['대칭의 중심', '대칭축', '똑같이', '다르게'], onDone: c.done,
      }),
    ]);
  };

  ACT.l8c = function (root) {
    const P1 = [[-3.2, -2.2], [-4, 2.2], [0.2, 1.4], [3.2, 2.2], [4, -2.2], [-0.2, -1.4]];
    const L = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ'];
    const angG = Math.round(Poly.angleAt(P1, 0));
    UI.runSteps(root, [
      (c) => {
        c.say('점 ㅇ을 대칭의 중심으로 하는 점대칭도형이에요. 그림은 실제 크기와 다를 수 있어요.', 'guide');
        const st = new Stage(c.area(), { x0: -5.4, y0: -3.6, w: 10.8, h: 7.2 });
        st.poly(P1, { class: 'shape fill-a' }); st.vertexLabels(P1, L, { off: 0.5 });
        st.circle([0, 0], 0.12, { class: 'center-dot' }, 'ui'); st.text([0.4, 0.35], 'ㅇ', { class: 'vlabel center-lbl' });
        const lab = (i, t, cls) => st.dimArc(P1[i], P1[(i + 1) % 6], t, [0, 0], { cls });
        lab(0, '14 cm'); lab(5, '8 cm');
        st.angleArc(P1, 0, 0.5, {}); st.text(V.add(P1[0], V.mul(Poly.inward(P1, 0), 1.05)), angG + '°', { class: 'measure small' });
        let n = 0; const fin = () => { if (++n === 2) c.done(); };
        numQuestion(c.box, { q: '<b>선분 ㄹㅁ</b>의 길이는 몇 cm일까요?', answer: 14, unit: 'cm', hint: '선분 ㄹㅁ의 대응변을 찾아보세요.', traps: { 8: '8 cm는 변 ㄱㅂ의 길이예요. 180° 돌렸을 때 변 ㄹㅁ과 겹치는 변은 어느 것일까요?' }, onDone: fin });
        numQuestion(c.box, { q: '<b>각 ㄷㄹㅁ</b>의 크기는 몇 도일까요?', answer: angG, unit: '°', hint: '각 ㄷㄹㅁ의 대응각을 찾아보세요.', onDone: fin });
      },
      (c) => {
        const st = new Stage(c.area(), { x0: -4.6, y0: -3.2, w: 9.2, h: 6.4 });
        st.poly(hexP, { class: 'shape fill-a' }); st.vertexLabels(hexP, L, { off: 0.5 });
        st.circle([0, 0], 0.12, { class: 'center-dot' }, 'ui'); st.text([0.3, 0.45], 'ㅇ', { class: 'vlabel center-lbl' });
        st.line(hexP[1], hexP[4], { class: 'pair-link solid' }, 'help'); st.line(hexP[2], hexP[5], { class: 'pair-link solid' }, 'help');
        st.dimArc(hexP[1], hexP[4], '26 cm', [0, 3]);
        st.dimArc(hexP[5], [0, 0], '10 cm', [-3, 0]);
        let n = 0; const fin = () => { if (++n === 2) { conceptCard(c.box, '점대칭도형의 성질', '• 대응변의 길이와 대응각의 크기가 각각 같아요.<br>• 대칭의 중심은 대응점끼리 이은 선분을 <b>똑같이 둘로</b> 나눠요.<br>• 각각의 대응점에서 대칭의 중심까지의 거리는 같아요.'); c.done(); } };
        numQuestion(c.box, { q: '선분 ㄴㅁ이 26 cm일 때, <b>선분 ㄴㅇ</b>의 길이는 몇 cm일까요?', answer: 13, unit: 'cm', hint: '대칭의 중심은 대응점끼리 이은 선분을 똑같이 둘로 나눠요.', traps: { 26: '26 cm는 선분 ㄴㅁ <b>전체</b>의 길이예요. 선분 ㄴㅇ은 그중 대칭의 중심 ㅇ까지의 부분이에요.', 52: '선분 ㄴㅇ은 선분 ㄴㅁ보다 짧아야 해요. 대칭의 중심이 선분을 어떻게 나누는지 생각해 보세요.' }, onDone: fin });
        numQuestion(c.box, { q: '선분 ㅂㅇ이 10 cm일 때, <b>선분 ㄷㅂ</b>의 길이는 몇 cm일까요?', answer: 20, unit: 'cm', hint: '선분 ㄷㅇ과 선분 ㅂㅇ의 길이는 같아요.', traps: { 10: '10 cm는 선분 ㅂㅇ의 길이예요. 선분 ㄷㅂ은 선분 ㄷㅇ과 선분 ㅂㅇ을 <b>합친</b> 길이예요.', 5: '선분 ㄷㅂ은 선분 ㅂㅇ보다 길어야 해요. 선분 ㄷㅇ과 선분 ㅂㅇ을 합친 길이예요.' }, onDone: fin });
      },
    ]);
  };

  ACT.l8d = function (root) {
    UI.runSteps(root, [
      (c) => {
        c.say('점 ㅇ을 대칭의 중심으로 하는 점대칭도형의 <b>일부</b>가 그려져 있어요. 나머지를 완성하려면 어떤 성질을 이용해야 할까요?', 'guide');
        partialFigure(c.area(), { w: 10, h: 6, center: [5, 3], given: [[5, 1], [2, 0], [1, 5], [5, 5]], labels: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'] });
        choice(c.box, {
          q: '대응점을 찾을 때 이용하는 점대칭도형의 성질을 <b>모두</b> 고르세요.', multi: true,
          options: [
            { t: '대칭의 중심은 대응점끼리 이은 선분을 똑같이 둘로 나눠요.', ok: true },
            { t: '각 점에서 대칭의 중심까지의 거리와 그 대응점에서 대칭의 중심까지의 거리는 같아요.', ok: true },
            { t: '대응점끼리 이은 선분은 대칭의 중심을 지나지 않아요.', why: '‘대칭의 중심을 지나지 않는다’는 틀려요. 앞에서 대응점끼리 이은 세 선분은 모두 대칭의 중심에서 만났어요.' },
            { t: '대응점은 대칭의 중심과 같은 쪽에 있어요.', why: '‘같은 쪽에 있다’는 틀려요. 대응점은 대칭의 중심을 지나 <b>반대쪽</b>에 있어요.' },
          ],
          onDone: c.done,
        });
      },
      (c) => {
        c.say('점대칭도형을 완성해요. ① 점 ㄴ, ㄷ에서 <b>대칭의 중심을 지나는 직선을 손으로 긋고</b>, ② 중심까지의 거리가 같도록 <b>대응점을 찍고</b>, ③ 점을 <b>차례대로 선으로 이어요</b>.', 'dayun');
        GridComplete(c.area(), {
          mode: 'point', w: 10, h: 6, center: [5, 3],
          given: [[5, 1], [2, 0], [1, 5], [5, 5]], labels: { given: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'], img: ['ㅁ', 'ㅂ'] },
          guided: true, drawHelpers: true, connect: 'manual', onDone: c.done,
        });
      },
      (c) => orderCards(c.box, {
        q: '점대칭도형을 완성하는 방법을 순서대로 끌어 놓아 정리해 보세요.',
        items: ['각 점에서 대칭의 중심을 지나는 직선을 긋습니다.', '각 점에서 대칭의 중심까지의 거리가 같도록 대응점을 찾아 표시합니다.', '각 점을 차례대로 이어 점대칭도형을 완성합니다.'],
        why: ['대응점을 찾으려면 먼저 무엇이 있어야 할까요? 대응점은 <b>대칭의 중심을 지나는 직선</b> 위에 있었어요.', '직선을 그은 다음, 점들을 잇기 전에 할 일은 무엇일까요?'],
        onDone: c.done,
      }),
    ]);
  };

  ACT.l8e = function (root) {
    UI.runSteps(root, [
      (c) => {
        c.say('앞에서 정리한 순서대로 점대칭도형을 완성해 보세요. ① 각 점에서 <b>대칭의 중심을 지나는 직선을 긋고</b>, ② 거리가 같도록 <b>대응점을 찍고</b>, ③ 점을 <b>차례대로 이어요</b>. 완성하면 <b>180° 돌려서 확인하기</b>를 눌러 보세요.', 'guide');
        GridComplete(c.area(), { mode: 'point', w: 10, h: 8, center: [5, 4], given: [[3, 1], [1, 3], [2, 6], [7, 7]], drawHelpers: true, connect: 'manual', onDone: c.done });
      },
      (c) => {
        GridComplete(c.area(), { mode: 'point', w: 10, h: 8, center: [5, 4], given: [[5, 1], [2, 2], [3, 5], [5, 7]], drawHelpers: true, connect: 'manual', onDone: c.done });
      },
      (c) => {
        c.say('새로운 문제를 더 풀어 보고, 친구에게 완성한 방법을 설명해 보세요.', 'seung');
        const box = el('div', { class: 'work' });
        c.box.appendChild(box);
        const more = () => { clear(box); const g = Shapes.pointHalf(); GridComplete(box, { mode: 'point', w: 10, h: 10, center: g.center, given: g.given, drawHelpers: true, connect: 'manual', onDone: () => c.done() }); };
        c.controls().appendChild(btn('🎲 새 문제', more, 'secondary'));
        more();
      },
    ]);
  };

  /* =========================================================
     12차시 — 단원 정리
     ========================================================= */
  ACT.l12a = function (root) {
    UI.runSteps(root, [
      (c) => {
        c.say('이 단원에서 배운 용어를 정리해 봐요.', 'guide');
        fillBlank(c.box, {
          parts: ['① 포개었을 때 완전히 겹치는 두 도형을 서로 ', { ans: '합동' }, '이라고 합니다.<br>② 한 직선을 따라 접었을 때 완전히 겹치는 도형을 ', { ans: '선대칭도형' }, '이라고 합니다.<br>③ 어떤 점을 중심으로 180° 돌렸을 때 처음 도형과 완전히 겹치는 도형을 ', { ans: '점대칭도형' }, '이라고 합니다.'],
          chips: ['합동', '선대칭도형', '점대칭도형', '대칭축'], onDone: c.done,
        });
      },
      (c) => {
        fillBlank(c.box, {
          parts: ['④ 선대칭도형에서 접는 직선을 ', { ans: '대칭축' }, ', 점대칭도형에서 돌리는 중심이 되는 점을 ', { ans: '대칭의 중심' }, '이라고 합니다.<br>⑤ 합동인 도형, 선대칭도형, 점대칭도형 모두 ', { ans: '대응변' }, '의 길이와 ', { ans: '대응각' }, '의 크기가 각각 같습니다.'],
          chips: ['대칭축', '대칭의 중심', '대응변', '대응각', '대응점'], onDone: c.done,
        });
      },
    ]);
  };

  /* =========================================================
     차시 구성 (교과서 순서) + 활동 분류
     type: 'app' 웹앱 활동, 'paper' 실물·종이로 하는 활동, 'tool' 다른 공학 도구
     ========================================================= */
  const LESSONS = [
    {
      id: 'l2', no: '2차시', title: '도형의 합동을 알아볼까요', pages: '수학 60~61쪽 · 수학익힘 40~41쪽', emoji: '➡️', room: '미술관 입구 · 바닥 화살표',
      story: '다윤이와 승현이가 미술관 문을 열자 바닥에 모양과 크기가 같은 화살표가 그려져 있어요. 모양과 크기가 같은 것을 어떻게 알 수 있을까요?',
      acts: [
        { id: 'l2a', title: '완전히 겹치는 도형 찾기 (디지털 투명 종이)', type: 'app' },
        { id: 'l2b', title: '모눈에서 서로 합동인 도형 찾기', type: 'app' },
      ],
      game: 'g2',
    },
    {
      id: 'l3', no: '3차시', title: '합동인 도형의 성질을 알아볼까요', pages: '수학 62~63쪽 · 수학익힘 42~43쪽', emoji: '🖨️', room: '판화 체험장',
      story: '판화 체험장에서 판에 새긴 도형과 찍어 낸 도형을 살펴봐요. 어느 곳이 겹칠까요?',
      acts: [
        { id: 'l3a', title: '포개었을 때 겹치는 점·변·각 찾기', type: 'app' },
        { id: 'l3b', title: '대응변의 길이와 대응각의 크기 비교하기', type: 'app' },
        { id: 'l3c', title: '합동인 도형의 성질로 길이와 각 구하기', type: 'app' },
        { id: 'l3d', title: '퍼즐 조각에서 대응점·대응변·대응각 찾기', type: 'app' },
      ],
      game: 'g3',
    },
    {
      id: 'l4', no: '4차시', title: '선대칭도형을 알아볼까요', pages: '수학 64~65쪽 · 수학익힘 44~45쪽', emoji: '💠', room: '색유리 창문',
      story: '미술관의 색유리 창문 무늬가 햇빛을 받아 반짝여요. 무늬에는 어떤 특징이 있을까요?',
      acts: [
        { id: 'l4a', title: '선대칭도형을 찾고 대칭축 긋기', type: 'app' },
        { id: 'l4b', title: '선대칭도형에서 대응점·대응변·대응각 찾기', type: 'app' },
      ],
      game: 'g4',
    },
    {
      id: 'l5', no: '5~6차시', title: '선대칭도형의 성질을 알아볼까요', pages: '수학 66~69쪽 · 수학익힘 46~47쪽', emoji: '🎨', room: '작품 만들기 체험장',
      story: '다윤이와 승현이가 색종이를 반으로 접어 오려서 선대칭도형 작품을 만들었어요. 대응변과 대응각에는 어떤 성질이 있을까요?',
      acts: [
        { id: 'l5a', title: '접어 보며 대응변과 대응각 비교하기', type: 'app' },
        { id: 'l5b', title: '대응점끼리 이은 선분과 대칭축의 관계 살펴보기', type: 'app' },
        { id: 'l5p', title: '공통된 규칙 추측하기', type: 'app' },
        { id: 'l5v', title: '추측이 맞는지 확인하기', type: 'app' },
        { id: 'l5s', title: '선대칭도형의 성질 정리하기', type: 'app' },
        { id: 'l5c', title: '선대칭도형의 성질로 길이와 각 구하기', type: 'app' },
        { id: 'l5d', title: '선대칭도형을 완성하는 방법 알아보기', type: 'app' },
        { id: 'l5e', title: '선대칭도형 완성하기', type: 'app' },
        { id: 'l5f', title: '도형판에 나만의 선대칭도형 만들기', type: 'app' },
      ],
      game: 'g5',
    },
    {
      id: 'l7', no: '7차시', title: '점대칭도형을 알아볼까요', pages: '수학 70~71쪽 · 수학익힘 48~49쪽', emoji: '🔤', room: '천장 글자 작품',
      story: '미술관 천장에 글자 작품들이 가득해요. 글자 작품 ‘ㄹ’에는 다른 작품과 다른 특징이 있대요.',
      acts: [
        { id: 'l7a', title: '점대칭도형 찾기 (예상하고 확인하기)', type: 'app' },
        { id: 'l7b', title: '점대칭도형에서 대응점·대응변·대응각 찾기', type: 'app' },
      ],
      game: 'g7',
    },
    {
      id: 'l8', no: '8~9차시', title: '점대칭도형의 성질을 알아볼까요', pages: '수학 72~75쪽 · 수학익힘 50~51쪽', emoji: '🌀', room: '점대칭도형 작품 복도',
      story: '복도에 점대칭도형 작품들이 전시되어 있어요. 대응변과 대응각, 대칭의 중심에는 어떤 성질이 있을까요?',
      acts: [
        { id: 'l8a', title: '대응변의 길이와 대응각의 크기 알아보기', type: 'app' },
        { id: 'l8b', title: '대응점끼리 이어 대칭의 중심 찾기', type: 'app' },
        { id: 'l8c', title: '점대칭도형의 성질로 길이와 각 구하기', type: 'app' },
        { id: 'l8d', title: '점대칭도형을 완성하는 방법 알아보기', type: 'app' },
        { id: 'l8e', title: '점대칭도형 완성하기', type: 'app' },
      ],
      game: 'g9',
    },
    {
      id: 'l12', no: '12차시', title: '공부한 내용을 확인해요', pages: '수학 80~82쪽 · 수학익힘 52쪽', emoji: '🚦', room: '교통안전 체험관',
      story: '단원에서 배운 내용을 정리하고, 교통안전 체험관의 표지판을 분류해 봐요.',
      acts: [
        { id: 'l12a', title: '용어 정리하기', type: 'app' },
      ],
      game: 'g12',
    },
  ];

  /** 활동 정보 찾기 */
  function findAct(id) {
    for (const L of LESSONS) for (const a of L.acts) if (a.id === id) return { lesson: L, act: a };
    return null;
  }

  window.Lessons = { ACT, LESSONS, findAct };
})();
