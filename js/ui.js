/* =========================================================
   ui.js — 활동에 쓰는 공용 인터랙티브 부품
   ========================================================= */
(function () {
  'use strict';
  const { el, sv, clear, V, Poly, Fig, R, KO, fmt, Sound, toast, confetti, shake, animate } = C;

  const WHO = {
    dayun: { name: '다윤', face: '👧' },
    seung: { name: '승현', face: '👦' },
    guide: { name: '도슨트', face: '🦉' },
  };

  /** 말풍선 */
  function bubble(text, who = 'guide') {
    const w = WHO[who] || WHO.guide;
    return el('div', { class: 'bubble ' + who },
      el('div', { class: 'avatar', 'aria-hidden': 'true' }, w.face),
      el('div', { class: 'bubble-body' }, el('b', { class: 'who' }, w.name), el('div', { class: 'say', html: text })));
  }

  function btn(label, onClick, cls = '') {
    return el('button', { class: 'btn ' + cls, type: 'button', onclick: (e) => { Sound.tap(); onClick(e); } }, label);
  }

  /* =========================================================
     단계 진행기: steps = [function(ctx){...}]
     ctx = { box, say, controls, done(), feedback(msg,type) }
     ========================================================= */
  function runSteps(root, steps, opt = {}) {
    const dots = el('div', { class: 'step-dots' });
    const box = el('div', { class: 'step-box' });
    const nav = el('div', { class: 'step-nav' });
    const prev = btn('◀ 이전', () => go(idx - 1), 'ghost');
    const next = btn('다음 ▶', () => go(idx + 1), 'primary');
    nav.append(prev, next);
    root.append(dots, box, nav);
    let idx = 0;
    const doneSet = new Set();

    // 점을 누르면 그 단계로 이동 (앞 단계를 모두 마쳤을 때만)
    const reachable = (i) => { for (let j = 0; j < i; j++) if (!doneSet.has(j)) return false; return true; };
    function renderDots() {
      clear(dots);
      steps.forEach((_, i) => {
        const ok = reachable(i);
        const d = el('button', {
          type: 'button', class: 'dot' + (i === idx ? ' on' : '') + (doneSet.has(i) ? ' done' : '') + (ok ? '' : ' locked'),
          'aria-label': `${i + 1}단계` + (ok ? '' : ' (앞 단계를 먼저 마쳐요)'), title: `${i + 1}단계`,
        });
        d.addEventListener('click', () => {
          if (i === idx) return;
          if (!ok) { Sound.bad(); toast('앞 단계를 먼저 마쳐야 넘어갈 수 있어요.'); return; }
          Sound.tap(); go(i);
        });
        dots.appendChild(d);
      });
    }
    // 단계를 떠날 때 그 단계의 그림(무대·표·기록)을 복사해 둔다.
    // 그림이 없는 다음 단계(정리 문제 등)에서 ‘앞 단계 그림’으로 다시 보여 주어 이전으로 돌아가지 않아도 되게 한다.
    const snaps = {};
    function snapshot() {
      if (!box.querySelector('svg.stage, table')) return null;
      const copy = box.cloneNode(true);
      copy.querySelectorAll('.bubble, .controls, .btn, .fb, .qi, .choice, .fill, .order, .numq, .concept, .prev-fig, .tile-tools').forEach(n => n.remove());
      if (!copy.querySelector('svg.stage, table')) return null;
      copy.className = 'prev-fig-body';
      copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      return copy;
    }
    function go(i) {
      if (i < 0 || i >= steps.length) { if (i >= steps.length && opt.onFinish) opt.onFinish(); return; }
      if (box.firstChild) { const s = snapshot(); if (s) snaps[idx] = s; }
      idx = i;
      clear(box);
      renderDots();
      prev.style.visibility = i === 0 ? 'hidden' : 'visible';
      next.disabled = !doneSet.has(i);
      next.classList.toggle('glow', doneSet.has(i));
      next.textContent = i === steps.length - 1 ? (opt.finishLabel || '활동 마치기 ✔') : '다음 ▶';
      const ctx = {
        box,
        say: (text, who) => { const b = bubble(text, who); box.appendChild(b); return b; },
        area: (cls = '') => { const d = el('div', { class: 'work ' + cls }); box.appendChild(d); return d; },
        controls: () => { const d = el('div', { class: 'controls' }); box.appendChild(d); return d; },
        done: () => {
          if (doneSet.has(i)) return;
          doneSet.add(i); next.disabled = false; next.classList.add('glow'); renderDots();
        },
        index: i,
      };
      steps[i](ctx);
      if (!box.querySelector('svg.stage') && snaps[i - 1]) {
        box.insertBefore(el('details', { class: 'prev-fig', open: '' },
          el('summary', {}, '👀 앞 단계에서 본 그림'), snaps[i - 1].cloneNode(true)), box.firstChild);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    go(0);
    return { go };
  }

  /* =========================================================
     선택 문제
     ========================================================= */
  function choice(box, cfg) {
    const wrap = el('div', { class: 'choice' });
    if (cfg.q) wrap.appendChild(el('div', { class: 'q', html: cfg.q }));
    const list = el('div', { class: 'opts' + (cfg.grid ? ' grid' : '') });
    wrap.appendChild(list);
    const fb = el('div', { class: 'fb' });
    let wrong = 0, finished = false;
    const picked = new Set();
    const buttons = cfg.options.map((o, i) => {
      const b = el('button', { class: 'opt', type: 'button' }, o.t);
      b.addEventListener('click', () => {
        if (finished) return;
        Sound.tap();
        if (cfg.multi) { picked.has(i) ? picked.delete(i) : picked.add(i); b.classList.toggle('sel'); return; }
        if (o.ok) {
          b.classList.add('right'); finished = true; Sound.good();
          fb.className = 'fb good'; fb.innerHTML = o.why || cfg.good || '맞아요!';
          cfg.onDone && cfg.onDone(wrong === 0);
        } else {
          wrong++; b.classList.add('wrong'); shake(b); Sound.bad();
          fb.className = 'fb bad'; fb.innerHTML = o.why || cfg.hint || '다시 생각해 보세요.';
        }
      });
      list.appendChild(b);
      return b;
    });
    if (cfg.multi) {
      wrap.appendChild(btn('확인하기', () => {
        if (finished) return;
        const ok = cfg.options.every((o, i) => !!o.ok === picked.has(i));
        if (ok) {
          finished = true; Sound.good();
          buttons.forEach((b, i) => { if (cfg.options[i].ok) b.classList.add('right'); });
          fb.className = 'fb good'; fb.innerHTML = cfg.good || '맞아요!';
          cfg.onDone && cfg.onDone(wrong === 0);
        } else {
          wrong++; Sound.bad(); shake(list);
          // 학생이 실제로 고른 것(또는 빠뜨린 것)에 맞춘 피드백
          const msgs = [];
          if (picked.size === 0) msgs.push('알맞은 것을 골라 보세요.');
          cfg.options.forEach((o, i) => {
            if (!o.ok && picked.has(i)) {
              buttons[i].classList.add('wrong'); setTimeout(() => buttons[i].classList.remove('wrong'), 1500);
              msgs.push(o.why ? o.why : `‘${o.t}’은(는) 알맞지 않아요.`);
            }
          });
          const missed = cfg.options.filter((o, i) => o.ok && !picked.has(i)).length;
          if (missed && picked.size) msgs.push(cfg.missText ? cfg.missText(missed) : `알맞은 것이 <b>${missed}개</b> 더 있어요.`);
          fb.className = 'fb bad'; fb.innerHTML = msgs.join('<br>');
        }
      }, 'primary small'));
    }
    wrap.appendChild(fb);
    box.appendChild(wrap);
    return wrap;
  }

  /* =========================================================
     빈칸 채우기(개념 정리 문장)
     parts: ['문장', {ans:'정답'}, '문장', ...], chips: [...]
     ========================================================= */
  /** 빈칸에 잘못 넣은 말에 대한 설명 (넣은 말 > 정답 순서로 찾음) */
  const WORD_WHY = {
    '대응각>대응변': '‘대응각’은 각이라서 <b>길이</b>가 아니라 크기(각도)를 재요. 길이를 비교하는 것은 무엇일까요?',
    '대응변>대응각': '‘대응변’은 변이라서 <b>크기(각도)</b>가 아니라 길이를 재요. 각도를 비교하는 것은 무엇일까요?',
    '대응점': '‘대응점’은 겹치는 <b>점</b>이에요. 점에는 길이나 크기가 없어요.',
    '넓이': '‘넓이’는 이 문장에 어울리지 않아요. 포개었을 때 겹치는 변과 각을 떠올려 보세요.',
    '대칭축': '‘대칭축’은 선대칭도형을 <b>접는 직선</b>이에요. 이 빈칸에 들어갈 말인지 다시 읽어 보세요.',
    '대칭의 중심': '‘대칭의 중심’은 점대칭도형을 <b>180° 돌리는 중심점</b>이에요. 이 빈칸에 들어갈 말인지 다시 읽어 보세요.',
    '평행>수직': '대응점끼리 이은 선분은 대칭축과 <b>만나요</b>. 평행한 두 선은 만나지 않아요. 만나서 이루는 각(직각 표시)을 보세요.',
    '다릅니다>같습니다': '대응점에서 대칭축까지 모눈 몇 칸인지 양쪽을 세어 비교해 보세요.',
    '다르게>똑같이': '대칭의 중심에서 양쪽 대응점까지의 거리를 비교해 보세요.',
    '합동': '‘합동’은 두 도형을 <b>포개었을 때</b> 완전히 겹치는 것을 말해요.',
    '선대칭도형': '‘선대칭도형’은 한 직선을 따라 <b>접었을 때</b> 완전히 겹치는 도형이에요.',
    '점대칭도형': '‘점대칭도형’은 어떤 점을 중심으로 <b>180° 돌렸을 때</b> 완전히 겹치는 도형이에요.',
    '수직': '‘수직’은 두 선이 만나는 <b>모양</b>을 나타내는 말이에요. 이 빈칸에는 다른 말이 들어가요.',
    '같습니다': '‘같습니다’는 길이나 거리를 비교하는 말이에요. 이 빈칸에는 두 선이 만나는 모양을 나타내는 말이 들어가요.',
    '똑같이': '‘똑같이’는 나누는 방법을 나타내는 말이에요. 이 빈칸에는 다른 말이 들어가요.',
  };
  function wordWhy(val, ans) { return WORD_WHY[val + '>' + ans] || WORD_WHY[val] || `‘${val}’은(는) 이 빈칸에 알맞지 않아요.`; }

  /** 빈칸 채우기: 낱말 카드를 손가락(마우스)으로 끌어 빈칸에 놓는다.
      빈칸에 놓인 낱말은 다른 빈칸으로 옮기거나 밖으로 끌어내 되돌릴 수 있다(누르면 빠짐). */
  function fillBlank(box, cfg) {
    const wrap = el('div', { class: 'fill' });
    const sentence = el('div', { class: 'sentence' });
    const blanks = [];
    cfg.parts.forEach(p => {
      if (typeof p === 'string') sentence.appendChild(el('span', { html: p }));
      else {
        const b = el('span', { class: 'blank drop', role: 'button', 'aria-label': '빈칸' }, '　');
        b.dataset.ans = p.ans; b.dataset.val = '';
        blanks.push(b); sentence.appendChild(b);
      }
    });
    const pool = el('div', { class: 'chips word-pool' });
    const cards = {};
    R.shuffle(cfg.chips).forEach(w => { const c = el('span', { class: 'word-card' }, w); c.dataset.w = w; cards[w] = c; pool.appendChild(c); });
    const fb = el('div', { class: 'fb' });
    let checked = false;

    const setBlank = (b, w) => {
      b.dataset.val = w || '';
      b.textContent = w || '　';
      b.classList.toggle('filled', !!w);
      b.classList.remove('right', 'wrong');
    };
    const showCard = (w, on) => { if (w && cards[w]) cards[w].classList.toggle('used', !on); };
    const blankAt = (x, y) => blanks.find(b => { const r = b.getBoundingClientRect(), m = 10; return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m; }) || null;

    /** 끌기: word 를 from(낱말 카드 또는 빈칸)에서 집어 든다 */
    function startDrag(e, word, fromBlank, srcEl) {
      if (check.disabled) return;
      e.preventDefault();
      const r = srcEl.getBoundingClientRect();
      const ghost = el('div', { class: 'word-card dragging' }, word);
      document.body.appendChild(ghost);
      const off = [e.clientX - r.left, e.clientY - r.top];
      const move = (x, y) => { ghost.style.left = (x - off[0]) + 'px'; ghost.style.top = (y - off[1]) + 'px'; };
      move(e.clientX, e.clientY);
      srcEl.classList.add('lifting');
      let over = null, moved = false;
      const sx = e.clientX, sy = e.clientY;
      const onMove = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
        move(ev.clientX, ev.clientY);
        const b = blankAt(ev.clientX, ev.clientY);
        if (b !== over) { if (over) over.classList.remove('over'); over = b; if (over) over.classList.add('over'); }
      };
      const onUp = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
        ghost.remove(); srcEl.classList.remove('lifting');
        if (over) over.classList.remove('over');
        const target = ev.type === 'pointercancel' ? null : blankAt(ev.clientX, ev.clientY);
        if (!moved) {
          // 누르기만 했을 때: 빈칸의 낱말은 빼고, 카드는 끌어 보라고 알려 준다
          if (fromBlank) { showCard(fromBlank.dataset.val, true); setBlank(fromBlank, ''); Sound.tap(); }
          else { Sound.tap(); toast('낱말 카드를 손가락으로 끌어서 빈칸에 놓아요.'); }
          return;
        }
        if (target && target !== fromBlank) {
          const prev = target.dataset.val;
          if (fromBlank) setBlank(fromBlank, prev); // 빈칸끼리 옮기면 서로 바꾼다
          else showCard(prev, true);
          setBlank(target, word); showCard(word, false);
          Sound.tap();
          target.classList.add('pop'); setTimeout(() => target.classList.remove('pop'), 250);
        } else if (!target && fromBlank) {
          setBlank(fromBlank, ''); showCard(word, true); // 빈칸 밖으로 끌어내면 되돌린다
        }
        if (checked) { fb.className = 'fb'; fb.textContent = ''; }
      };
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    }
    Object.values(cards).forEach(c => c.addEventListener('pointerdown', (e) => { if (!c.classList.contains('used')) startDrag(e, c.dataset.w, null, c); }));
    blanks.forEach(b => b.addEventListener('pointerdown', (e) => { if (b.dataset.val) startDrag(e, b.dataset.val, b, b); }));

    let tries = 0;
    const check = btn('확인하기', () => {
      if (blanks.some(b => !b.dataset.val)) { fb.className = 'fb bad'; fb.textContent = '낱말 카드를 끌어 빈칸을 모두 채워 보세요.'; return; }
      let ok = true;
      blanks.forEach(b => { const r = b.dataset.val === b.dataset.ans; b.classList.toggle('right', r); b.classList.toggle('wrong', !r); if (!r) ok = false; });
      tries++; checked = true;
      if (ok) {
        Sound.good(); fb.className = 'fb good'; fb.innerHTML = cfg.good || '정리 완료! 아주 잘했어요.';
        check.disabled = true; wrap.classList.add('locked'); cfg.onDone && cfg.onDone(tries === 1);
      } else {
        Sound.bad(); fb.className = 'fb bad';
        const msgs = [];
        blanks.forEach(b => { if (b.dataset.val !== b.dataset.ans) { const m = wordWhy(b.dataset.val, b.dataset.ans); if (!msgs.includes(m)) msgs.push(m); } });
        fb.innerHTML = msgs.join('<br>') + '<br><span class="muted">빨간 빈칸의 낱말을 밖으로 끌어내고, 알맞은 낱말 카드를 끌어다 놓아 보세요.</span>';
      }
    }, 'primary small');
    wrap.append(sentence, el('div', { class: 'word-hint muted' }, '✋ 낱말 카드를 끌어서 빈칸에 놓아요.'), pool, check, fb);
    box.appendChild(wrap);
    return wrap;
  }

  /** 개념 카드 */
  function conceptCard(box, title, html) {
    const c = el('div', { class: 'concept' }, el('div', { class: 'concept-title' }, '💡 ' + title), el('div', { class: 'concept-body', html }));
    box.appendChild(c);
    return c;
  }

  /* =========================================================
     대응점·대응변·대응각 — 도형을 직접 옮겨 포개고, 답을 입력하기
     ========================================================= */
  const PAIR_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#d6336c', '#5c940d', '#1864ab'];
  const mul2 = (A, B) => [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];

  function Correspond(box, cfg) {
    const figs = cfg.figs;
    const all = [], labelOf = [], figOf = [];
    figs.forEach((f, fi) => f.pts.forEach((p, li) => { all.push(p); labelOf.push(f.labels[li]); figOf.push([fi, li]); }));
    const M = new Map();
    cfg.map.forEach(([a, b]) => { M.set(a, b); M.set(b, a); });
    const scale = cfg.scale || 1, unit = cfg.unit || 'cm';
    const mv = cfg.drag ? cfg.drag.moving : -1, onto = cfg.drag ? cfg.drag.onto : -1;
    const clsOf = (fi) => 'shape ' + (figs[fi].cls || (fi ? 'fill-b' : 'fill-a'));

    const stage = new Stage(box, cfg.view);
    figs.forEach((f, fi) => { if (fi !== mv) stage.poly(f.pts, { class: clsOf(fi) }); });
    if (cfg.axis) {
      stage.fullLine(cfg.axis.a, cfg.axis.b, { class: 'axis' }, 'help', 0.3);
      if (cfg.axis.labels) {
        const d = V.norm(V.sub(cfg.axis.b, cfg.axis.a)), nrm = V.rotVec(d, -90);
        const s = stage.clipLine(cfg.axis.a, cfg.axis.b, 0.3);
        if (s) {
          const off = V.mul(nrm, stage.fs * 1.1);
          stage.text(V.add(V.add(s[0], V.mul(d, stage.fs * 0.5)), off), cfg.axis.labels[0], { class: 'vlabel axis-lbl' });
          stage.text(V.add(V.sub(s[1], V.mul(d, stage.fs * 0.5)), off), cfg.axis.labels[1], { class: 'vlabel axis-lbl' });
        }
      }
    }
    if (cfg.center) {
      stage.circle(cfg.center.p, 0.12, { class: 'center-dot' }, 'ui');
      if (cfg.center.label) stage.text(V.add(cfg.center.p, [0.4, 0.35]), cfg.center.label, { class: 'vlabel center-lbl' });
    }
    figs.forEach((f, fi) => { if (fi !== mv) stage.vertexLabels(f.pts, f.labels); });
    stage.layers['top-keep'] = sv('g', { class: 'layer-keep' });
    stage.svg.insertBefore(stage.layers['top-keep'], stage.layers.top);

    const ctrl = el('div', { class: 'controls' });
    const fb = el('div', { class: 'fb' });
    box.append(ctrl);

    /* ----- 직접 옮겨 포개는 도형 ----- */
    let S = null, dragOff = null;
    if (mv >= 0) {
      const base = figs[mv].pts, c0 = Poly.centroid(base);
      const g = sv('g', { class: 'movable' });
      stage.L('over').appendChild(g);
      const poly = sv('polygon', { points: base.map(p => p.join(',')).join(' '), class: clsOf(mv) + ' drag-shape' });
      g.appendChild(poly);
      const hl = sv('g'); g.appendChild(hl);
      const lblG = sv('g'); stage.L('ui').appendChild(lblG);
      S = { base, c0, g, poly, hl, lblG, M: [[1, 0], [0, 1]], pos: c0.slice(), snapped: false };
      stage.svg.classList.add('tappable');
    }
    const mvPt = (p, pos) => { const d = V.sub(p, S.c0), o = pos || S.pos; return [o[0] + S.M[0][0] * d[0] + S.M[0][1] * d[1], o[1] + S.M[1][0] * d[0] + S.M[1][1] * d[1]]; };
    function mvApply() {
      const m11 = S.M[0][0], m12 = S.M[0][1], m21 = S.M[1][0], m22 = S.M[1][1];
      const e = S.pos[0] - m11 * S.c0[0] - m12 * S.c0[1], f = S.pos[1] - m21 * S.c0[0] - m22 * S.c0[1];
      S.g.setAttribute('transform', `matrix(${m11} ${m21} ${m12} ${m22} ${e} ${f})`);
      S.poly.classList.toggle('match', S.snapped);
      clear(S.lblG);
      const P = S.base.map(p => mvPt(p));
      P.forEach((q, i) => {
        const d = Poly.inward(P, i), off = S.snapped ? -stage.fs * 1.0 : stage.fs * 0.95;
        const z = V.sub(q, V.mul(d, off));
        S.lblG.appendChild(sv('text', { x: z[0], y: z[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'vlabel' + (S.snapped ? ' ghost-lbl' : '') }, figs[mv].labels[i]));
      });
    }
    const rotM = (deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), n = Math.sin(r); return [[c, -n], [n, c]]; };
    /** 옮긴 도형이 목표 도형 위에 있으면: 방향이 거의 맞을 때(15° 이내) 딱 맞게 포개 준다 */
    function snapCheck(quiet) {
      const T = figs[onto].pts, cT = Poly.centroid(T);
      if (V.dist(S.pos, cT) > 1.6) { S.snapped = false; mvApply(); return; }
      const info = Poly.fitInfo(S.base.map(p => mvPt(p, cT)), T);
      if (info.congruent && !info.flip && Math.abs(info.rot) <= 15) {
        S.M = mul2(rotM(info.rot), S.M);
        S.pos = cT.slice(); S.snapped = true; mvApply(); Sound.good();
        fb.className = 'fb good'; fb.innerHTML = '<b>완전히 겹쳐요!</b> 겹친 점·변·각을 살펴보고 아래 물음에 답해 보세요.';
        return;
      }
      S.snapped = false; mvApply();
      if (quiet) return;
      Sound.tap(); fb.className = 'fb bad';
      if (info.congruent && info.flip) fb.innerHTML = '이대로는 겹치지 않아요. <b>⇋ 뒤집기</b>를 눌러 도형을 뒤집어 보세요.';
      else if (info.congruent) fb.innerHTML = `방향이 맞지 않아요. <b>두 손가락으로</b> 도형을 돌리거나 <b>↻ 돌리기</b>를 눌러 방향을 맞춰 보세요. (약 ${Math.round(Math.abs(info.rot) / 5) * 5}° 더)`;
      else fb.innerHTML = '겹치지 않는 부분이 있어요.';
    }
    if (S) {
      mvApply();
      stage.on({
        dragStart: (p) => {
          const P = S.base.map(q => mvPt(q));
          dragOff = (Poly.pointIn(P, p) || V.dist(p, S.pos) < 1.4) ? V.sub(S.pos, p) : null;
          if (dragOff) { S.snapped = false; }
          return !!dragOff;
        },
        dragMove: (p) => { if (dragOff) { S.pos = V.add(p, dragOff); mvApply(); } },
        dragEnd: () => { if (dragOff) { dragOff = null; snapCheck(); } },
        dragCancel: () => { if (dragOff) { dragOff = null; snapCheck(true); } },
        // 두 손가락으로 돌리면서 옮기기
        gestureStart: () => { dragOff = null; S.g0 = { M: S.M, pos: S.pos.slice() }; S.snapped = false; },
        gestureMove: ({ rot, center, center0 }) => { if (!S.g0) return; S.M = mul2(rotM(rot), S.g0.M); S.pos = V.add(S.g0.pos, V.sub(center, center0)); mvApply(); },
        gestureEnd: (cancelled) => { if (!S.g0) return; S.g0 = null; snapCheck(cancelled); },
      });
      ctrl.append(
        el('span', { class: 'hint-chip' }, '✋ 끌어서 옮기고 ✌️ 두 손가락으로 돌려요'),
        btn('↻ 돌리기', () => { S.M = mul2([[0, -1], [1, 0]], S.M); S.snapped = false; snapCheck(true); }, 'secondary small'),
        btn('⇋ 뒤집기', () => { S.M = mul2([[-1, 0], [0, 1]], S.M); S.snapped = false; snapCheck(true); }, 'secondary small'),
        btn('⟲ 제자리', () => { S.M = [[1, 0], [0, 1]]; S.pos = S.c0.slice(); S.snapped = false; mvApply(); fb.className = 'fb'; fb.textContent = ''; }, 'ghost small'));
    }
    if (cfg.tools) cfg.tools(stage, ctrl);
    box.appendChild(fb);

    /* ----- 답 입력 ----- */
    const pv = (g) => all[g];
    const figPts = (g) => figs[figOf[g][0]].pts;
    const L = (g) => labelOf[g];
    const sideLen = (a, b) => fmt(V.dist(pv(a), pv(b)) * scale, 1) + ' ' + unit;
    const angDeg = (g) => fmt(Poly.angleAt(figPts(g), figOf[g][1]), 0) + '°';
    const KIND = { point: '점', side: '변', angle: '각' };
    const NEED = { point: 1, side: 2, angle: 3 };
    const letters = [...new Set(labelOf)].sort((a, b) => KO.indexOf(a) - KO.indexOf(b));

    const qbox = el('div', { class: 'qi' });
    const qtext = el('div', { class: 'cprompt' });
    const ansRow = el('div', { class: 'qi-ans' });
    const keys = el('div', { class: 'qi-keys' });
    const qfb = el('div', { class: 'fb' });
    const log = el('div', { class: 'clog' });
    qbox.append(qtext, ansRow, keys, qfb);
    box.append(qbox, log);

    let k = 0, entered = [], wrong = 0, totalWrong = 0;
    const cur = () => cfg.prompts[k];
    const givenName = (q) => q.given.map(L).join('');
    const answerSeq = (q) => q.given.map(g => L(M.get(g)));
    function qHtml(q) {
      const nm = `${KIND[q.type]} ${givenName(q)}`;
      if (q.text) return q.text;
      if (cfg.phrase === 'overlap') return `포개었을 때 <b>${nm}</b>과 겹치는 ${KIND[q.type]}${q.type === 'point' ? '은' : '은'} 무엇일까요?`;
      return `<b>${nm}</b>의 대응${KIND[q.type]}은 무엇일까요?`;
    }
    function renderQ() {
      clear(ansRow); clear(keys); stage.clearLayer('top');
      const q = cur();
      if (!q) { qtext.innerHTML = '✅ 모두 찾았어요!'; qbox.classList.add('done'); return; }
      const color = PAIR_COLORS[k % PAIR_COLORS.length];
      qtext.innerHTML = `<span class="badge">${k + 1} / ${cfg.prompts.length}</span> ` + qHtml(q);
      if (q.type === 'point') stage.circle(pv(q.given[0]), 0.32, { class: 'given-ring', style: `stroke:${color}` }, 'top');
      if (q.type === 'side') stage.line(pv(q.given[0]), pv(q.given[1]), { class: 'given-side', style: `stroke:${color}` }, 'top');
      if (q.type === 'angle') stage.angleWedge(figPts(q.given[1]), figOf[q.given[1]][1], 0.7, { class: 'given-wedge', style: `fill:${color}` }, 'top');
      ansRow.appendChild(el('span', { class: 'qi-kind' }, KIND[q.type]));
      for (let i = 0; i < NEED[q.type]; i++) ansRow.appendChild(el('span', { class: 'qi-slot' + (i === entered.length ? ' active' : '') }, entered[i] || ''));
      letters.forEach(t => keys.appendChild(btn(t, () => { if (entered.length < NEED[q.type]) { entered.push(t); renderQ(); if (entered.length === NEED[q.type]) check(); } }, 'key-l')));
      keys.appendChild(btn('⌫', () => { entered.pop(); renderQ(); }, 'key-l ghost'));
    }
    function record(q) {
      const color = PAIR_COLORS[k % PAIR_COLORS.length];
      const layerFor = (g) => figOf[g][0] === mv ? S.hl : stage.L('over');
      const put = (g, node) => layerFor(g).appendChild(node);
      let text = '';
      if (q.type === 'point') {
        const a = q.given[0], b = M.get(a);
        [a, b].forEach(g => put(g, sv('circle', { cx: pv(g)[0], cy: pv(g)[1], r: 0.2, class: 'pair-dot', style: `fill:${color}` })));
        if (cfg.linkPoints && mv < 0) stage.line(pv(a), pv(b), { class: 'pair-link', style: `stroke:${color}` }, 'help');
        text = `점 ${L(a)} ↔ 점 ${L(b)}`;
      } else if (q.type === 'side') {
        const [a1, a2] = q.given, b1 = M.get(a1), b2 = M.get(a2);
        [[a1, a2], [b1, b2]].forEach(([x, y]) => put(x, sv('line', { x1: pv(x)[0], y1: pv(x)[1], x2: pv(y)[0], y2: pv(y)[1], class: 'pair-side', style: `stroke:${color}` })));
        text = `변 ${L(a1)}${L(a2)} ↔ 변 ${L(b1)}${L(b2)}`;
        if (cfg.measure) {
          [[a1, a2], [b1, b2]].forEach(([x, y]) => {
            if (figOf[x][0] === mv) return;
            const m = V.mid(pv(x), pv(y)), c = Poly.centroid(figPts(x));
            const out = V.norm(V.sub(m, V.foot(c, pv(x), pv(y))));
            stage.text(V.add(m, V.mul(isFinite(out[0]) ? out : [0, -1], stage.fs * 1.1)), sideLen(x, y), { class: 'measure', style: `fill:${color}` }, 'top-keep');
          });
          text += ` <span class="eq">${sideLen(a1, a2)} = ${sideLen(b1, b2)}</span>`;
        }
      } else {
        const [ap, av, an] = q.given, bp = M.get(ap), bv = M.get(av), bn = M.get(an);
        [av, bv].forEach(g => {
          const w = stage.angleWedge(figPts(g), figOf[g][1], 0.6, { class: 'pair-wedge', style: `fill:${color}` }, 'over');
          if (figOf[g][0] === mv) S.hl.appendChild(w); // 옮기는 도형과 함께 움직이도록
        });
        text = `각 ${L(ap)}${L(av)}${L(an)} ↔ 각 ${L(bp)}${L(bv)}${L(bn)}`;
        if (cfg.measure) {
          [av, bv].forEach(g => {
            if (figOf[g][0] === mv) return;
            const P = figPts(g), i = figOf[g][1];
            stage.text(V.add(pv(g), V.mul(Poly.inward(P, i), 1.05)), angDeg(g), { class: 'measure small', style: `fill:${color}` }, 'top-keep');
          });
          text += ` <span class="eq">${angDeg(av)} = ${angDeg(bv)}</span>`;
        }
      }
      log.appendChild(el('div', { class: 'row', html: `<i style="background:${color}"></i>${text}` }));
    }
    /** 입력한 답에 맞춘 오답 피드백 */
    const gidOf = (t) => labelOf.indexOf(t);
    const isEdge = (a, b) => a >= 0 && b >= 0 && figOf[a][0] === figOf[b][0] && (() => { const n = figs[figOf[a][0]].pts.length, d = Math.abs(figOf[a][1] - figOf[b][1]); return d === 1 || d === n - 1; })();
    function tip(q) {
      if (cfg.hintText) return cfg.hintText(q);
      return mv >= 0 ? '도형을 끌어 포개어 보면 어디와 겹치는지 알 수 있어요.' : '';
    }
    function diagnose(q, E, want, typed) {
      const g = q.given, gn = givenName(q), twoFigs = figs.length > 1;
      const sameFig = (t) => twoFigs && gidOf(t) >= 0 && figOf[gidOf(t)][0] === figOf[g[0]][0];
      if (q.type === 'point') {
        if (typed === gn) return '문제에 나온 점을 그대로 썼어요. 겹치는 <b>다른</b> 점을 찾아요.';
        if (sameFig(typed)) return `점 ${typed}은 점 ${gn}과 <b>같은 도형</b>에 있는 점이에요. 대응점은 다른 도형에서 찾아요.`;
        return `점 ${typed}은 점 ${gn}과 겹치지 않아요. ${tip(q)}`;
      }
      const ids = E.map(gidOf);
      if (typed === gn || typed === gn.split('').reverse().join('')) return `문제에 나온 ${KIND[q.type]}을 그대로 썼어요. 겹치는 <b>다른</b> ${KIND[q.type]}을 찾아요.`;
      if (q.type === 'side') {
        if (!isEdge(ids[0], ids[1])) return `${E.join('')}은 도형의 변이 아니에요. 변은 <b>이웃한 두 꼭짓점</b>의 이름으로 읽어요.`;
        if (sameFig(E[0])) return `변 ${typed}은 변 ${gn}과 <b>같은 도형</b>의 변이에요. 대응변은 다른 도형에서 찾아요.`;
        const hit = E.filter(t => want.includes(t));
        if (hit.length === 1) return `점 ${hit[0]}은 맞았어요. 변 ${gn}의 양 끝 점(점 ${L(g[0])}, 점 ${L(g[1])})이 각각 어느 점과 겹치는지 생각해 보세요.`;
        return `변 ${typed}은 변 ${gn}과 겹치지 않아요. ${tip(q)}`;
      }
      if (!isEdge(ids[0], ids[1]) || !isEdge(ids[1], ids[2]) || E[0] === E[2]) return `${E.join('')}은 도형의 각 이름이 될 수 없어요. 각은 <b>이웃한 세 꼭짓점</b>을 차례로 읽고, 가운데에 꼭짓점을 써요.`;
      if (sameFig(E[1])) return `각 ${typed}은 각 ${gn}과 <b>같은 도형</b>의 각이에요. 대응각은 다른 도형에서 찾아요.`;
      return `각 ${typed}의 꼭짓점(가운데 글자 ${E[1]})이 맞지 않아요. 점 ${L(g[1])}과 겹치는 점이 가운데에 와야 해요. ${tip(q)}`;
    }
    function check() {
      const q = cur(), want = answerSeq(q);
      const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
      // 변과 각은 어느 쪽부터 읽어도 정답 (예: 변 ㄹㅁ = 변 ㅁㄹ, 각 ㄹㅁㅂ = 각 ㅂㅁㄹ)
      const ok = same(entered, want) || (q.type !== 'point' && same(entered, want.slice().reverse()));
      if (ok) {
        Sound.good(); record(q);
        qfb.className = 'fb good'; qfb.innerHTML = R.pick(['정확해요!', '맞아요!', '잘 찾았어요!']);
        k++; wrong = 0; entered = [];
        renderQ();
        if (k >= cfg.prompts.length) cfg.onDone && cfg.onDone({ wrong: totalWrong });
        return;
      }
      wrong++; totalWrong++; Sound.bad(); shake(ansRow);
      const typed = entered.join('');
      const msg = diagnose(q, entered, want, typed);
      entered = [];
      if (wrong >= 3) {
        qfb.className = 'fb info'; qfb.innerHTML = `정답은 <b>${KIND[q.type]} ${want.join('')}</b>이에요.`;
        record(q); k++; wrong = 0; renderQ();
        if (k >= cfg.prompts.length) cfg.onDone && cfg.onDone({ wrong: totalWrong });
        return;
      }
      qfb.className = 'fb bad'; qfb.innerHTML = msg;
      renderQ();
    }
    renderQ();
    return { stage };
  }

  /** 180° 돌리기를 90°씩 두 번 나누어 보여 준다 (지도서: 어려워하면 90°씩 두 번 나누어 돌려 보게 한다)
      node: 돌릴 SVG 요소(transform으로 회전), check90: 90° 돌렸을 때 겹치는지 */
  function spin180(stage, node, center, opt = {}) {
    const lbl = stage.text(V.add(center, [0, -stage.fs * 2.2]), '', { class: 'spin-lbl' }, 'top');
    const rotTo = (a) => node.setAttribute('transform', `rotate(${a} ${center[0]} ${center[1]})`);
    animate(700, t => rotTo(90 * t), () => {
      lbl.textContent = opt.same90 ? '90° 돌렸어요 — 벌써 겹쳐요!' : '90° 돌렸어요 — 아직 안 겹쳐요';
      setTimeout(() => animate(700, t => rotTo(90 + 90 * t), () => {
        lbl.textContent = opt.same180 ? '180° — 완전히 겹쳐요!' : '180° — 겹치지 않아요';
        setTimeout(() => lbl.remove(), 1800);
        opt.done && opt.done();
      }), 700);
    });
  }

  /* =========================================================
     대칭축 긋기 (한 도형)
     preview: 'fold' — 잘못 그은 선으로 접었을 때의 모양
              'mirror' — 그 선에 거울을 세웠을 때 보이는 모양
     ========================================================= */
  function polyOfFig(f) {
    if (f.kind === 'poly') return f.pts;
    if (f.kind === 'circle') return Array.from({ length: 72 }, (_, i) => V.add(f.c, V.rotVec([f.r, 0], i * 5)));
    return null;
  }
  /** 다각형을 직선 a-b의 한쪽(sgn)으로 자르기 */
  function clipHalf(P, a, b, sgn) {
    const side = (p) => V.cross(V.sub(b, a), V.sub(p, a)) * sgn;
    const out = [], n = P.length;
    for (let i = 0; i < n; i++) {
      const cur = P[i], prev = P[(i - 1 + n) % n], sc = side(cur), sp = side(prev);
      const cut = () => V.lerp(prev, cur, sp / (sp - sc));
      if (sc >= 0) { if (sp < 0) out.push(cut()); out.push(cur); }
      else if (sp >= 0) out.push(cut());
    }
    return out;
  }
  const areaOf = (P) => P.length < 3 ? 0 : Math.abs(Poly.area2(P)) / 2;
  /** 종이 접기 모션: 다각형 P를 직선 a-b로 접는다.
      접혀 올라가는 쪽의 원래 자리는 종이가 없어지므로 흰색으로 비우고, 접힌 조각이 반대쪽으로 넘어간다.
      opt.moveSide: 접혀 넘어갈 쪽에 있는 점(없으면 넓이가 작은 쪽) / opt.good: 완전히 겹치는 접기인지
      opt.labels: [{p, text}] 접히는 쪽 꼭짓점 이름도 함께 넘어간다 */
  function foldAnim(stage, P, a, b, opt = {}) {
    const h1 = clipHalf(P, a, b, 1), h2 = clipHalf(P, a, b, -1);
    let move, stay;
    if (opt.moveSide) {
      const sgn = Math.sign(V.cross(V.sub(b, a), V.sub(opt.moveSide, a)));
      move = sgn > 0 ? h1 : h2; stay = sgn > 0 ? h2 : h1;
    } else { const big = areaOf(h1) >= areaOf(h2); stay = big ? h1 : h2; move = big ? h2 : h1; }
    const flat = (p, t) => { const ft = V.foot(p, a, b); return V.add(ft, V.mul(V.sub(p, ft), 1 - 2 * t)); };
    const nodes = [];
    nodes.push(stage.poly(move, { class: 'fold-gone' }, 'top'));             // 종이가 떠난 자리(흰색)
    if (opt.showStay) nodes.push(stage.poly(stay, { class: 'shape fold-stay' }, 'top'));
    const flap = stage.poly(move, { class: 'shape fold-move' + (opt.good ? ' good' : '') }, 'top');
    nodes.push(flap);
    const sideMove = (p) => Math.sign(V.cross(V.sub(b, a), V.sub(p, a))) === Math.sign(V.cross(V.sub(b, a), V.sub(Poly.centroid(move.length ? move : P), a)));
    const lbls = (opt.labels || []).filter(l => sideMove(l.p) && V.distToLine(l.p, a, b) > 1e-6)
      .map(l => ({ p: l.p, node: stage.text(l.p, l.text, { class: 'vlabel ghost-lbl' }, 'top') }));
    lbls.forEach(l => nodes.push(l.node));
    animate(opt.ms || 1000, t => {
      stage.setPoints(flap, move.map(p => flat(p, t)));
      lbls.forEach(l => { const q = flat(l.p, t); l.node.setAttribute('x', q[0]); l.node.setAttribute('y', q[1]); });
    }, () => setTimeout(() => { nodes.forEach(n => n.remove()); opt.done && opt.done(); }, opt.hold || 1500));
    return nodes;
  }

  function AxisDraw(box, cfg) {
    const f = cfg.fig, mode = cfg.preview || 'fold';
    const bb = Fig.bbox(f), size = Math.max(bb.w, bb.h);
    const pad = size * 0.32;
    const view = cfg.view || { x0: bb.x0 - pad, y0: bb.y0 - pad, w: bb.w + 2 * pad, h: bb.h + 2 * pad };
    const stage = new Stage(box, Object.assign({ cls: 'axis-stage' }, view));
    const main = stage.fig(f, { class: 'shape fill-a ' + (cfg.shapeCls || '') });
    const P0 = polyOfFig(f);
    const axes = Fig.axes(f);
    const total = axes === Infinity ? Infinity : axes.length;
    const c = Fig.center(f);
    const found = [];
    let temp = null, finished = false, wrongCount = 0, giveups = 0, busy = false;
    // 손으로 긋는 선은 조금 빗나가기 쉬우므로 넉넉하게 판정 (중심에서 도형 크기의 14%, 각도 15°)
    const tolD = Math.max(0.35, size * 0.14), tolA = 15;
    const angDiff = (a, b) => { const d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); };

    const info = el('div', { class: 'axis-info' });
    const ctrl = el('div', { class: 'controls' });
    const fb = el('div', { class: 'fb' });
    box.append(info, ctrl, fb);
    const word = mode === 'mirror' ? '거울' : '대칭축';
    const upd = () => { info.innerHTML = mode === 'mirror' ? `세운 거울: <b>${found.length}</b>개` : `찾은 대칭축: <b>${found.length}</b>개`; };
    upd();

    function drawAxis(deg, cls) {
      const d = V.rotVec([1, 0], deg);
      return stage.fullLine(c, V.add(c, d), { class: cls || ('axis found' + (mode === 'mirror' ? ' mirror' : '')) }, 'over', 0.05);
    }
    let stopPreview = null;
    /** 직선 a-b로 접거나 거울을 세웠을 때의 모습을 잠깐 보여 준다 (새 선을 그으면 바로 끝낸다) */
    function preview(a, b, good, done) {
      if (!P0) { done && done(); return; }
      const h1 = clipHalf(P0, a, b, 1), h2 = clipHalf(P0, a, b, -1);
      const A1 = areaOf(h1), A2 = areaOf(h2);
      const stay = A1 >= A2 ? h1 : h2, move = A1 >= A2 ? h2 : h1;
      const nodes = [];
      busy = true;
      if (mode !== 'fold') main.style.opacity = 0.18;
      if (mode !== 'fold') nodes.push(stage.poly(stay, { class: 'shape fold-stay' }, 'top'));
      nodes.push(stage.fullLine(a, b, { class: 'axis ' + (good ? 'found' : 'bad') + (mode === 'mirror' ? ' mirror' : '') }, 'top', 0.05));
      const flat = (p, t) => { const ft = V.foot(p, a, b); return V.add(ft, V.mul(V.sub(p, ft), 1 - 2 * t)); };
      if (mode === 'fold') {
        // 접기에서는 원래 도형을 그대로 두고, 접혀 올라가는 쪽만 흰색으로 비운 뒤 넘긴다
        nodes.push(...foldAnim(stage, P0, a, b, { good, hold: good ? 700 : 1900, done: end }));
        stage.L('top').appendChild(nodes[0]); // 접는 선이 맨 위에 보이도록
      } else {
        nodes.push(stage.poly(P0, { class: 'outline-ref' }, 'top'));
        const img = stage.poly(stay, { class: 'shape mirror-img' + (good ? ' good' : '') }, 'top');
        nodes.push(img);
        animate(700, t => stage.setPoints(img, stay.map(p => flat(p, t))), () => setTimeout(end, good ? 700 : 1900));
      }
      let ended = false;
      function end() { if (ended) return; ended = true; stopPreview = null; nodes.forEach(n => n && n.remove()); main.style.opacity = ''; busy = false; done && done(); }
      stopPreview = end;
    }

    stage.on({
      dragStart: (p) => {
        // 그림 안 어디에서 시작해도(도형 바깥 위·아래·왼쪽·오른쪽 포함) 대칭축을 그을 수 있다
        if (finished) return false;
        if (stopPreview) stopPreview(); // 앞 선의 접기 모습이 아직 보이고 있어도 새 선을 그을 수 있게
        temp = stage.line(p, p, { class: 'axis temp' }, 'top');
        return true;
      },
      dragMove: (p) => { if (temp) { temp.setAttribute('x2', p[0]); temp.setAttribute('y2', p[1]); } },
      dragCancel: () => { if (temp) { temp.remove(); temp = null; } },
      dragEnd: (p, s) => {
        if (!temp) return;
        temp.remove(); temp = null;
        if (finished) return;
        if (stopPreview) stopPreview();
        if (V.dist(p, s) < Math.max(size * 0.12, 40 * stage.unitPerPx())) { fb.className = 'fb'; fb.textContent = '선을 조금 더 길게 그어 보세요.'; return; }
        const deg = ((V.angleOf(V.sub(p, s)) % 180) + 180) % 180;
        const dc = V.distToLine(c, s, p);
        let match = null, near = false;
        if (total === Infinity) { if (dc < tolD) match = { deg }; else if (dc < size * 0.3) near = true; }
        else axes.forEach(ax => {
          const ad = angDiff(ax.deg, deg);
          if (ad < tolA && dc < tolD && (!match || ad < angDiff(match.deg, deg))) match = ax;
          else if (ad < 25 && dc < size * 0.3) near = true;
        });
        if (P0 && !match) {
          const h1 = clipHalf(P0, s, p, 1), h2 = clipHalf(P0, s, p, -1);
          if (areaOf(h1) < 1e-6 || areaOf(h2) < 1e-6) { fb.className = 'fb'; fb.textContent = '도형을 가로지르도록 선을 그어 보세요.'; return; }
        }
        if (match) {
          if (found.some(d => angDiff(d, match.deg) < (total === Infinity ? 12 : 1))) { fb.className = 'fb'; fb.textContent = `이미 찾은 ${word === '거울' ? '거울 자리' : '대칭축'}예요. 다른 방향도 생각해 보세요.`; Sound.tap(); return; }
          found.push(match.deg); Sound.good(); upd();
          const d = V.rotVec([1, 0], match.deg);
          preview(c, V.add(c, d), true, () => drawAxis(match.deg));
          fb.className = 'fb good';
          fb.textContent = mode === 'mirror' ? '거울에 비친 모습이 원래 작품과 똑같아요! 이 선이 대칭축이에요.' : '이 선을 따라 접으면 완전히 겹쳐요! 대칭축이에요.';
          cfg.onAxis && cfg.onAxis(found.length);
        } else if (near) {
          Sound.tap();
          fb.className = 'fb'; fb.innerHTML = '거의 비슷해요! 도형의 <b>한가운데</b>를 지나도록 조금 더 정확하게 그어 보세요.';
        } else {
          wrongCount++; Sound.bad();
          preview(s, p, false);
          fb.className = 'fb bad';
          // 지도서 오개념: ‘선대칭도형 = 둘로 똑같이 나누어진 도형’ (예: 평행사변형을 가운데로 자른 경우)
          const halvesSame = P0 && (() => { const h1 = clipHalf(P0, s, p, 1), h2 = clipHalf(P0, s, p, -1); return h1.length >= 3 && h1.length === h2.length && Poly.congruent(h1, h2, 0.05); })();
          if (halvesSame) fb.innerHTML = '이 선으로 자르면 <b>모양과 크기가 같은 두 조각</b>이 되긴 해요. 하지만 이 선을 따라 <b>접으면</b> 완전히 겹치지 않아요. 대칭축은 둘로 똑같이 나누는 선이 아니라 <b>접었을 때 완전히 겹치는</b> 선이에요.';
          else fb.innerHTML = mode === 'mirror'
            ? '이 선에 거울을 세우면 <b>원래 작품과 다른 모양</b>이 보여요. (점선이 원래 작품)'
            : '이 선을 따라 접으면 <b>완전히 겹치지 않아요</b>. 접힌 부분(빨간색)이 삐져나오거나 모자라요.';
        }
      },
    });

    function finish(ok, msg) {
      finished = true;
      fb.className = 'fb ' + (ok ? 'good' : 'bad'); fb.innerHTML = msg;
      cfg.onResult && cfg.onResult({ ok, found: found.length, total, wrong: wrongCount, giveups });
    }
    const showAll = () => {
      if (total === Infinity) { [0, 30, 60, 90, 120, 150].forEach(d => { if (!found.some(x => angDiff(x, d) < 12)) drawAxis(d, 'axis reveal'); }); }
      else axes.forEach(ax => { if (!found.some(d => angDiff(d, ax.deg) < 1)) drawAxis(ax.deg, 'axis reveal'); });
    };
    const noneLabel = mode === 'mirror' ? '🚫 거울을 세울 곳이 없어요' : '🚫 대칭축이 없어요';
    ctrl.appendChild(btn(mode === 'mirror' ? '✔ 다 세웠어요' : '✔ 다 그었어요', () => {
      if (finished) return; if (stopPreview) stopPreview();
      if (total === 0) { Sound.bad(); giveups++; fb.className = 'fb bad'; fb.innerHTML = `이 도형은 어떤 직선으로도 완전히 겹치게 할 수 없어요. <b>${noneLabel.slice(2)}</b>를 눌러 보세요.`; return; }
      if (found.length === 0) { fb.className = 'fb bad'; fb.textContent = '손가락으로 도형 위에 선을 그어 보세요.'; return; }
      if (total === Infinity) {
        if (found.length >= 2) { Sound.good(); showAll(); finish(true, '원은 중심을 지나는 직선이면 모두 대칭축이에요. 대칭축이 <b>셀 수 없이 많아요!</b>'); }
        else { giveups++; Sound.bad(); fb.className = 'fb bad'; fb.textContent = '다른 방향으로도 그을 수 있을까요?'; }
        return;
      }
      if (found.length >= total) { Sound.good(); finish(true, `모두 찾았어요! 이 도형의 대칭축은 <b>${total}개</b>예요.`); }
      else {
        giveups++; Sound.bad();
        if (giveups >= 2) { showAll(); finish(false, `아직 찾지 못한 대칭축이 있었어요. 이 도형의 대칭축은 <b>${total}개</b>예요. (초록 점선)`); }
        else { fb.className = 'fb bad'; fb.innerHTML = '아직 찾지 못한 대칭축이 있어요. <b>세로·가로뿐 아니라 비스듬한 방향</b>으로도 생각해 보세요.'; }
      }
    }, 'primary'));
    ctrl.appendChild(btn(noneLabel, () => {
      if (finished) return; if (stopPreview) stopPreview();
      if (total === 0) { Sound.good(); finish(true, '맞아요. 어떤 직선으로도 완전히 겹치게 할 수 없으니 <b>선대칭도형이 아니에요.</b>'); }
      else { giveups++; Sound.bad(); fb.className = 'fb bad'; fb.innerHTML = '이 도형은 완전히 겹치게 할 수 있는 직선이 있어요. 다시 찾아보세요.'; if (giveups >= 2) { showAll(); finish(false, `이 도형은 선대칭도형이에요. 대칭축은 <b>${total === Infinity ? '셀 수 없이 많아요' : total + '개'}</b>.`); } }
    }, 'ghost'));
    return { stage, axes, total };
  }

  /* =========================================================
     모눈/도형판에서 선대칭·점대칭 도형 완성하기
     ========================================================= */
  /** 손가락으로 긋는 선(잉크). 다 그으면 곧은 선으로 보정해 그린다. */
  function Ink(stage) {
    let node = null, path = [];
    return {
      begin(p) { path = [p]; node = stage.polyline(path, { class: 'ink' }, 'top'); },
      add(p) { if (!node) return; if (V.dist(p, path[path.length - 1]) > 0.04) { path.push(p); stage.setPoints(node, path); } },
      end() { const r = path; if (node) node.remove(); node = null; path = []; return r; },
      get active() { return !!node; },
    };
  }
  /** 손으로 그은 선이 a-b 곧은 선과 비슷한지(가장 멀리 벗어난 거리로 판단) */
  function nearlyStraight(path, a, b) {
    const L = V.dist(a, b), tol = Math.max(0.6, L * 0.22);
    return path.every(q => V.distToSeg(q, a, b) <= tol);
  }
  /** 선의 방향 차이(0~90°) */
  function dirDiff(d1, d2) {
    const a = Math.abs(((V.angleOf(d1) - V.angleOf(d2)) % 180 + 180) % 180);
    return Math.min(a, 180 - a);
  }

  function GridComplete(box, cfg) {
    const line = cfg.mode === 'line';
    const W = cfg.w, H = cfg.h;
    const stage = new Stage(box, { x0: -0.5, y0: -0.5, w: W + 1, h: H + 1, grid: false, cls: 'grid-stage' });
    if (cfg.pegs) stage.drawPegs(); else {
      stage.add(sv('rect', { x: -0.5, y: -0.5, width: W + 1, height: H + 1, class: 'grid-bg' }), 'grid');
      for (let x = 0; x <= W; x++) stage.line([x, 0], [x, H], { class: 'grid-line' }, 'grid');
      for (let y = 0; y <= H; y++) stage.line([0, y], [W, y], { class: 'grid-line' }, 'grid');
    }
    stage.svg.classList.add('tappable');
    const A = cfg.axis && cfg.axis[0], B = cfg.axis && cfg.axis[1], O = cfg.center;
    const img = (p) => line ? V.round(V.reflect(p, A, B)) : V.rot180(p, O);
    const onAxis = (p) => line && V.distToLine(p, A, B) < 1e-6;
    const G = cfg.given;
    let todo, finalPoly, connectSeq;
    if (line) {
      todo = G.slice(1, -1);
      finalPoly = G.concat(todo.slice().reverse().map(img));
      connectSeq = [G[0]].concat(todo.map(img)).concat([G[G.length - 1]]);
    } else {
      todo = G.slice(1, -1);
      finalPoly = G.concat(todo.map(img));
      connectSeq = [G[0]].concat(todo.slice().reverse().map(img)).concat([G[G.length - 1]]);
    }
    const lg = cfg.labels || null; // {given:[...], img:[...]} img는 todo 순서
    if (line) {
      stage.fullLine(A, B, { class: 'axis' }, 'help', 0.1);
      if (cfg.axisLabels) {
        const s = stage.clipLine(A, B, 0.15), d = V.norm(V.sub(B, A));
        if (s) { stage.text(V.add(V.add(s[0], V.mul(d, 0.0)), [0.35, 0.25]), cfg.axisLabels[0], { class: 'vlabel axis-lbl' }); stage.text(V.add(s[1], [0.35, -0.25]), cfg.axisLabels[1], { class: 'vlabel axis-lbl' }); }
      }
    } else {
      stage.circle(O, 0.14, { class: 'center-dot' }, 'ui');
      stage.text(V.add(O, [0.38, 0.3]), cfg.centerLabel || 'ㅇ', { class: 'vlabel center-lbl' });
    }
    stage.polyline(G, { class: cfg.pegs ? 'band' : 'given-line' });
    G.forEach(p => stage.circle(p, 0.12, { class: 'vdot' }, 'ui'));
    if (lg) G.forEach((p, i) => {
      const prev = G[i - 1] || (line ? img(G[1]) : img(G[G.length - 2])), next = G[i + 1] || (line ? img(G[G.length - 2]) : img(G[1]));
      const out = V.norm(V.add(V.norm(V.sub(p, prev)), V.norm(V.sub(p, next))));
      stage.text(V.add(p, V.mul(isFinite(out[0]) && V.len(out) > 0.1 ? out : [-0.7, -0.7], 0.5)), lg.given[i], { class: 'vlabel' });
    });

    const prompt = el('div', { class: 'cprompt' });
    const ctrl = el('div', { class: 'controls' });
    const fb = el('div', { class: 'fb' });
    box.append(prompt, ctrl, fb);
    const placed = new Array(todo.length).fill(false);
    let mistakes = 0, phase = 'place', seqIdx = 0, seqDir = 0, drawn = null, finished = false;
    // drawHelpers: 교과서 순서대로 ① 선 긋기 → ② 대응점 찍기 → ③ 차례대로 잇기 (선은 손으로 긋는다)
    const linesDone = new Array(todo.length).fill(false);
    const segDone = new Set();
    const ink = Ink(stage);
    if (cfg.drawHelpers) phase = 'lines';
    const stepBar = cfg.drawHelpers ? el('div', { class: 'step-bar' }) : null;
    if (stepBar) box.insertBefore(stepBar, prompt);
    function drawStepBar() {
      if (!stepBar) return;
      const names = [line ? '① 대칭축에 수선 긋기' : '① 대칭의 중심을 지나는 직선 긋기', '② 거리가 같도록 대응점 찍기', '③ 차례대로 이어 완성하기'];
      const cur = phase === 'lines' ? 0 : phase === 'place' ? 1 : phase === 'connect' ? 2 : 3;
      clear(stepBar);
      names.forEach((t, k) => stepBar.appendChild(el('span', { class: 'sb' + (k === cur ? ' on' : '') + (k < cur ? ' done' : '') }, (k < cur ? '✓ ' : '') + t)));
    }

    const helpName = line ? '수선' : '대칭의 중심을 지나는 직선';
    function curIdx() { return cfg.guided ? placed.indexOf(false) : -1; }
    function setPrompt() {
      drawStepBar();
      if (phase === 'lines') {
        const i = linesDone.indexOf(false), nm = lg ? '점 ' + lg.given[i + 1] : '빨간 테두리 점';
        prompt.innerHTML = line
          ? `${nm}에서 대칭축에 <b>수선</b>을 손가락으로 그어요. <span class="muted">(대칭축과 직각으로 만나도록, 대칭축 너머까지 길게)</span>`
          : `${nm}에서 대칭의 중심 점 <b>${cfg.centerLabel || 'ㅇ'}</b>을 지나는 <b>직선</b>을 손가락으로 그어요. <span class="muted">(중심 너머까지 길게)</span>`;
        markCur(i);
        return;
      }
      markCur(-1);
      if (phase === 'place') {
        const i = curIdx();
        if (cfg.guided && i >= 0) prompt.innerHTML = `점 <b>${lg.given[i + 1]}</b>의 대응점을 찾아 점 <b>${lg.img[i]}</b>으로 표시해요. <span class="muted">(${cfg.helper !== false && !cfg.drawHelpers ? '점 ' + lg.given[i + 1] + '을 누르면 ' + helpName + '이 그어져요' : (line ? '수선 위에서 대칭축까지의 거리가 같은 곳' : '직선 위에서 중심까지의 거리가 같은 곳')})</span>`;
        else prompt.innerHTML = `대응점을 찾아 ${cfg.pegs ? '도형판의 못' : '모눈의 꼭짓점'}을 눌러 표시해요. <span class="muted">남은 점: ${placed.filter(x => !x).length}개${cfg.helper !== false ? ' · 주어진 꼭짓점을 누르면 ' + helpName + '이 그어져요' : ''}</span>`;
      } else if (phase === 'connect') {
        const names = connectSeq.map(p => labelAt(p));
        prompt.innerHTML = `점 ${names.map(n => '<b>' + n + '</b>').join(', 점 ')}을 <b>차례대로</b> 이어요. <span class="muted">점에서 점까지 손가락으로 선을 그어요. (남은 선: ${connectSeq.length - 1 - segDone.size}개)</span>`;
      }
    }
    let curMark = null;
    function markCur(i) {
      if (curMark) { curMark.remove(); curMark = null; }
      if (i >= 0) curMark = stage.circle(todo[i], 0.32, { class: 'given-ring' }, 'top');
    }
    function labelAt(p) {
      if (!lg) return '';
      let i = G.findIndex(q => V.near(q, p));
      if (i >= 0) return lg.given[i];
      i = todo.findIndex(q => V.near(img(q), p));
      return i >= 0 ? lg.img[i] : '';
    }
    function helper(p) {
      if (line) {
        const f = V.foot(p, A, B);
        stage.fullLine(p, V.add(p, V.sub(f, p).every(x => Math.abs(x) < 1e-9) ? [0, 1] : V.sub(f, p)), { class: 'helper' }, 'help', 0.05);
        stage.rightMark(f, V.sub(p, f), V.sub(B, A), 0.3, {}, 'help');
      } else stage.fullLine(p, O, { class: 'helper' }, 'help', 0.05);
    }
    function dirWords(d) {
      const w = [];
      if (d[0]) w.push((d[0] > 0 ? '오른쪽' : '왼쪽') + ' ' + Math.abs(d[0]) + '칸');
      if (d[1]) w.push((d[1] > 0 ? '아래' : '위') + ' ' + Math.abs(d[1]) + '칸');
      return w.join(', ') || '0칸';
    }
    function explainWrong(q) {
      // 가장 그럴듯한 대상 꼭짓점
      let i = curIdx();
      if (i < 0) { let bd = Infinity; todo.forEach((v, j) => { if (placed[j]) return; const d = V.dist(img(v), q); if (d < bd) { bd = d; i = j; } }); }
      const v = todo[i], nm = lg ? '점 ' + lg.given[i + 1] : '그 점';
      if (line) {
        const sv1 = Math.sign(V.cross(V.sub(B, A), V.sub(v, A))), sq = Math.sign(V.cross(V.sub(B, A), V.sub(q, A)));
        if (sq === 0) return '대칭축 위의 점은 대응점이 될 수 없어요(자기 자신이 대응점). 대칭축의 <b>반대쪽</b>을 찾아보세요.';
        if (sv1 === sq) return '대응점은 대칭축의 <b>반대쪽</b>에 있어요.';
        const f = V.foot(v, A, B);
        if (V.distToLine(q, v, f) > 1e-6) return `${nm}에서 대칭축에 <b>수선</b>을 그어 보세요. 대응점은 그 수선 위에 있어요.`;
        const axisAligned = Math.abs(A[0] - B[0]) < 1e-9 || Math.abs(A[1] - B[1]) < 1e-9;
        if (axisAligned) return `대칭축까지의 거리가 같아야 해요. ${nm}: <b>${fmt(V.distToLine(v, A, B), 1)}칸</b>, 누른 점: <b>${fmt(V.distToLine(q, A, B), 1)}칸</b>`;
        return `수선 위에서 대칭축까지의 거리가 ${nm}과 <b>같도록</b> 칸을 세어 보세요. (모눈을 대각선으로 지나는 칸 수를 세요)`;
      }
      const d1 = V.sub(O, v), d2 = V.sub(q, O);
      if (Math.abs(V.cross(d1, d2)) > 1e-6 || V.dot(d1, d2) <= 0) return `${nm}과 점 ${cfg.centerLabel || 'ㅇ'}을 지나는 <b>직선</b>을 그어 보세요. 대응점은 그 직선 위, 중심의 반대쪽에 있어요.`;
      return `${nm}에서 점 ${cfg.centerLabel || 'ㅇ'}까지: <b>${dirWords(d1)}</b>. 점 ${cfg.centerLabel || 'ㅇ'}에서 같은 방향으로 <b>똑같이</b> 가야 해요. (누른 점까지: ${dirWords(d2)})`;
    }
    function place(j) {
      placed[j] = true;
      const p = img(todo[j]);
      stage.circle(p, 0.16, { class: 'vdot new' }, 'ui');
      if (lg) {
        const v = todo[j];
        const out = line ? V.norm(V.sub(p, V.foot(p, A, B))) : V.norm(V.sub(p, O));
        stage.text(V.add(p, V.mul(out, 0.55)), lg.img[j], { class: 'vlabel new' });
      }
    }
    function finishAll(revealed) {
      phase = 'done'; finished = true;
      const poly = stage.poly(finalPoly, { class: 'shape done-fill' + (cfg.pegs ? ' band-fill' : '') }, 'main');
      if (cfg.pegs) stage.poly(finalPoly, { class: 'band' }, 'main');
      poly.style.opacity = 0;
      animate(500, t => { poly.style.opacity = t; });
      prompt.innerHTML = revealed ? '바른 대응점으로 완성한 모양이에요.' : '🎉 완성했어요!';
      cfg.onDone && cfg.onDone({ mistakes, poly: finalPoly, revealed: !!revealed });
      if (cfg.verify !== false) ctrl.appendChild(verifyBtn());
    }
    function verifyBtn() {
      return btn(line ? '🔍 대칭축을 따라 접어 확인하기' : '🔍 180° 돌려서 확인하기', () => {
        if (line) {
          // 학생이 완성한 쪽(대응점이 있는 쪽)을 접어 주어진 쪽에 포갠다
          const side = img(todo[0]);
          foldAnim(stage, finalPoly, A, B, { moveSide: side, good: true, hold: 1200, done: () => toast('접었더니 완전히 겹쳐요!', 'good') });
          return;
        }
        const ghost = stage.poly(finalPoly, { class: 'shape ghost' }, 'top');
        animate(1400, t => stage.setPoints(ghost, finalPoly.map(p => V.rot(p, O, 180 * t))), () => { toast('처음 도형과 완전히 겹쳐요!', 'good'); setTimeout(() => ghost.remove(), 900); });
      }, 'secondary small');
    }
    function startConnect() {
      phase = 'connect'; seqIdx = 0; seqDir = 0; drawn = null; setPrompt();
    }
    const tolPt = () => Math.max(0.55, 30 * stage.unitPerPx());
    /** 가장 가까운 ‘이을 수 있는 점’ */
    function anchorNear(p, list) {
      let best = -1, bd = tolPt();
      list.forEach((q, k) => { const d = V.dist(p, q); if (d <= bd) { bd = d; best = k; } });
      return best;
    }
    /** ① 선 긋기 판정: 그은 선을 보정해 곧은 보조선으로 바꾼다 */
    function judgeHelper(path) {
      const i = linesDone.indexOf(false), v = todo[i];
      const a = path[0], b = path[path.length - 1];
      const nm = lg ? '점 ' + lg.given[i + 1] : '그 점';
      const fromV = V.dist(a, v) <= tolPt() ? a : V.dist(b, v) <= tolPt() ? b : null;
      if (!fromV) return `${nm}에서 시작해서 그어요.`;
      const far = fromV === a ? b : a, d = V.sub(far, v);
      if (V.len(d) < 0.8) return '조금 더 길게 그어요.';
      if (line) {
        const f = V.foot(v, A, B), u = V.sub(f, v);
        if (dirDiff(d, u) > 18) return `대칭축과 <b>직각</b>으로 만나도록 그어요. 지금은 ${Math.round(90 - dirDiff(d, u))}°쯤으로 비스듬해요.`;
        if (V.dot(d, u) < 0) return '대칭축 쪽으로 그어요.';
        if (V.len(d) < V.len(u) - 0.5) return '대칭축에 닿을 때까지(넘어가도 좋아요) 그어요.';
        helper(v);
      } else {
        const u = V.sub(O, v);
        if (V.dot(d, u) < 0) return `대칭의 중심 점 ${cfg.centerLabel || 'ㅇ'} 쪽으로 그어요.`;
        if (path.every(q => V.dist(q, O) > Math.max(0.6, tolPt())) || dirDiff(d, u) > 15) return `선이 대칭의 중심 점 <b>${cfg.centerLabel || 'ㅇ'}</b>을 지나도록 그어요.`;
        if (V.len(d) < V.len(u) - 0.3) return `점 ${cfg.centerLabel || 'ㅇ'}을 지나 반대쪽까지 길게 그어요.`;
        helper(v);
      }
      return null;
    }
    /** ③ 잇기 판정 */
    function judgeSeg(path) {
      const pts = connectSeq;
      const ia = anchorNear(path[0], pts), ib = anchorNear(path[path.length - 1], pts);
      if (ia < 0 || ib < 0) return '점에서 시작해서 점에서 끝나도록 그어요.';
      if (ia === ib) return '다른 점까지 그어요.';
      if (Math.abs(ia - ib) !== 1) return `점 <b>${labelAt(pts[ia])}</b>과 점 <b>${labelAt(pts[ib])}</b>은 이웃한 점이 아니에요. 차례대로 이어요.`;
      if (!nearlyStraight(path, pts[ia], pts[ib])) return '두 점을 곧게 이어요.';
      const k = Math.min(ia, ib);
      if (segDone.has(k)) return '이미 이은 선이에요.';
      segDone.add(k);
      stage.line(pts[k], pts[k + 1], { class: 'connect-line' }, 'over');
      return null;
    }
    /* ----- free: 점을 찍을 때마다 맞고 틀림을 알려 주지 않는다.
       점을 모두 찍어 도형이 완성되면 그때 확인하고, 틀렸으면 한 번 더 기회를 준다. ----- */
    const mine = [];           // 학생이 찍은 점 [{p, node}]
    let attempt = 0, wrongNodes = [];
    function freePrompt() {
      const left = todo.length - mine.length;
      prompt.innerHTML = `대응점이 될 ${cfg.pegs ? '못' : '점'}을 눌러 표시해요. <span class="muted">남은 점: ${left}개 · 찍은 점을 다시 누르면 지워져요${cfg.helper !== false ? ' · 주어진 꼭짓점을 누르면 ' + helpName + '이 그어져요' : ''}</span>`;
    }
    /** 학생이 찍은 점을 주어진 꼭짓점과 짝지어(가장 가깝게) 완성된 도형을 만든다 */
    function mineToPoly() {
      const targets = todo.map(img), pts = mine.map(m => m.p);
      let best = null, bestD = Infinity;
      const perm = (arr, k) => {
        if (k === arr.length) { const d = arr.reduce((s, pi, ti) => s + V.dist(pts[pi], targets[ti]), 0); if (d < bestD) { bestD = d; best = arr.slice(); } return; }
        for (let i = k; i < arr.length; i++) { [arr[k], arr[i]] = [arr[i], arr[k]]; perm(arr, k + 1); [arr[k], arr[i]] = [arr[i], arr[k]]; }
      };
      perm(pts.map((_, i) => i), 0);
      const ordered = best.map(pi => pts[pi]);
      return line ? G.concat(ordered.slice().reverse()) : G.concat(ordered);
    }
    function freeCheck() {
      const ok = todo.every(v => mine.some(m => V.near(m.p, img(v))));
      attempt++;
      if (ok) {
        mine.forEach(m => m.node.remove()); mine.length = 0;
        todo.forEach((_, j) => place(j));
        fb.className = 'fb good'; fb.textContent = attempt === 1 ? '한 번에 선대칭도형을 완성했어요!' : '이번에는 선대칭도형이 되었어요!';
        Sound.good(); finishAll();
        return;
      }
      mistakes++; Sound.bad();
      phase = 'wrong';
      const W2 = mineToPoly();
      wrongNodes.push(stage.poly(W2, { class: 'shape wrong-fill' }, 'main'), stage.poly(W2, { class: 'band wrong-band' }, 'main'));
      const fold = () => {
        if (line && Poly.isSimple(W2)) foldAnim(stage, W2, A, B, { moveSide: img(todo[0]), good: false, hold: 1200 });
        else if (!line) { const gh = stage.poly(W2, { class: 'shape ghost-bad' }, 'top'); animate(1200, t => stage.setPoints(gh, W2.map(p => V.rot(p, O, 180 * t))), () => setTimeout(() => gh.remove(), 900)); }
      };
      fold();
      if (attempt === 1) {
        fb.className = 'fb bad';
        fb.innerHTML = line ? '완성한 도형을 대칭축으로 접어 보니 <b>완전히 겹치지 않아요</b>. 선대칭도형이 아니에요.<br>대응점은 주어진 점에서 대칭축에 그은 <b>수선</b> 위에, 대칭축까지의 <b>거리가 같은</b> 곳에 있어요. 한 번 더 해 볼까요?'
          : '180° 돌려 보니 <b>처음 도형과 겹치지 않아요</b>. 점대칭도형이 아니에요.<br>대응점은 대칭의 중심을 지나는 직선 위, 중심까지의 <b>거리가 같은</b> 곳에 있어요. 한 번 더 해 볼까요?';
        clear(ctrl);
        ctrl.appendChild(btn('🔁 다시 해 보기', () => {
          wrongNodes.forEach(n => n.remove()); wrongNodes = [];
          mine.forEach(m => m.node.remove()); mine.length = 0;
          clear(ctrl); fb.className = 'fb'; fb.textContent = '';
          phase = 'place'; freePrompt();
        }, 'primary'));
        prompt.innerHTML = '도형이 완성되었어요. 선대칭도형이 맞는지 확인해 봐요.'.replace('선대칭', line ? '선대칭' : '점대칭');
        return;
      }
      // 두 번째도 틀리면 바른 대응점을 보여 준다
      fb.className = 'fb bad';
      fb.innerHTML = '이번에도 완전히 겹치지 않아요. <b>파란 점</b>이 바른 대응점이에요. 내가 찍은 점과 비교해 보세요.';
      setTimeout(() => {
        wrongNodes.forEach(n => n.remove()); wrongNodes = [];
        todo.forEach((_, j) => place(j));
        finishAll(true);
      }, line ? 2600 : 2300);
    }
    stage.on({
      dragStart: (p) => {
        if (finished) return false;
        if (phase === 'lines') { const v = todo[linesDone.indexOf(false)]; if (V.dist(p, v) > tolPt() * 1.4) return false; }
        else if (phase === 'connect') { if (anchorNear(p, connectSeq) < 0) return false; }
        else return false;
        ink.begin(p); return true;
      },
      dragMove: (p) => ink.add(p),
      dragCancel: () => ink.end(),
      dragEnd: (p) => {
        ink.add(p);
        const path = ink.end();
        if (path.length < 2) return;
        if (phase === 'lines') {
          const msg = judgeHelper(path);
          if (msg) { mistakes++; Sound.bad(); fb.className = 'fb bad'; fb.innerHTML = msg; return; }
          Sound.good(); fb.className = 'fb good'; fb.textContent = line ? '수선을 그었어요!' : '대칭의 중심을 지나는 직선을 그었어요!';
          linesDone[linesDone.indexOf(false)] = true;
          if (linesDone.every(Boolean)) { phase = 'place'; fb.textContent += ' 이제 대응점을 찍어요.'; }
          setPrompt();
        } else if (phase === 'connect') {
          const msg = judgeSeg(path);
          if (msg) { mistakes++; Sound.bad(); fb.className = 'fb bad'; fb.innerHTML = msg; return; }
          Sound.tap(); fb.className = 'fb'; fb.textContent = '';
          if (segDone.size >= connectSeq.length - 1) { Sound.good(); finishAll(); } else setPrompt();
        }
      },
      tap: (p) => {
        if (finished) return;
        if (phase === 'lines') { fb.className = 'fb'; fb.innerHTML = '점을 누르지 말고, 손가락을 대고 <b>선을 그어요</b>.'; return; }
        if (phase === 'connect') { fb.className = 'fb'; fb.innerHTML = '점에서 점까지 손가락으로 <b>선을 그어</b> 이어요.'; return; }
        // 주어진 꼭짓점 → 보조선
        const gi = Hit.nearestVertex(G, p, Math.max(0.35, 24 * stage.unitPerPx()));
        if (phase === 'place' && !cfg.drawHelpers && gi >= 0 && cfg.helper !== false && !onAxis(G[gi]) && !(gi === 0 || gi === G.length - 1)) { helper(G[gi]); Sound.tap(); return; }
        const q = stage.snap(p, 0.42);
        if (!q) return;
        if (cfg.free) {
          if (phase !== 'place') return;
          const k = mine.findIndex(m => V.near(m.p, q));
          if (k >= 0) { mine[k].node.remove(); mine.splice(k, 1); Sound.tap(); freePrompt(); return; }
          if (G.some(g => V.near(g, q))) return;
          mine.push({ p: q, node: stage.circle(q, 0.17, { class: 'vdot mine' }, 'ui') });
          Sound.tap();
          if (mine.length === todo.length) freeCheck(); else freePrompt();
          return;
        }
        if (phase === 'place') {
          const i = curIdx();
          let j = -1;
          todo.forEach((v, jj) => { if (!placed[jj] && V.near(img(v), q) && (i < 0 || jj === i)) j = jj; });
          if (j >= 0) {
            Sound.good(); place(j); fb.className = 'fb good'; fb.textContent = R.pick(['맞아요!', '정확해요!', '좋아요!']);
            if (placed.every(Boolean)) { if (cfg.connect === 'manual') startConnect(); else finishAll(); }
            else setPrompt();
          } else {
            if (G.some(g => V.near(g, q)) || todo.some((v, jj) => placed[jj] && V.near(img(v), q))) return;
            mistakes++; Sound.bad();
            const x = stage.circle(q, 0.18, { class: 'wrong-dot' }, 'top'); setTimeout(() => x.remove(), 1200);
            fb.className = 'fb bad'; fb.innerHTML = explainWrong(q);
            cfg.onMistake && cfg.onMistake(mistakes);
          }
        } else if (phase === 'connect-tap') {
          const target = seqDir >= 0 ? connectSeq[seqIdx] : connectSeq[connectSeq.length - 1 - seqIdx];
          if (seqIdx === 0) {
            if (V.near(q, connectSeq[0])) seqDir = 1; else if (V.near(q, connectSeq[connectSeq.length - 1])) seqDir = -1;
            else { Sound.bad(); fb.className = 'fb bad'; fb.innerHTML = `점 <b>${labelAt(connectSeq[0])}</b>에서 시작해 보세요.`; return; }
            drawn = stage.polyline([q], { class: 'connect-line' }, 'over'); seqIdx = 1; Sound.tap(); return;
          }
          const want = seqDir > 0 ? connectSeq[seqIdx] : connectSeq[connectSeq.length - 1 - seqIdx];
          if (V.near(q, want)) {
            const pts = (seqDir > 0 ? connectSeq.slice(0, seqIdx + 1) : connectSeq.slice(connectSeq.length - 1 - seqIdx).reverse());
            stage.setPoints(drawn, pts); seqIdx++; Sound.tap();
            if (seqIdx >= connectSeq.length) { Sound.good(); finishAll(); }
          } else { mistakes++; Sound.bad(); fb.className = 'fb bad'; fb.innerHTML = `다음은 점 <b>${labelAt(want)}</b>이에요. 차례대로 이어요.`; }
          void target;
        }
      },
    });
    if (cfg.free) freePrompt(); else setPrompt();
    return {
      stage, finalPoly,
      revealAll() {
        if (finished) return;
        todo.forEach((_, j) => { if (!placed[j]) place(j); });
        finishAll();
      },
    };
  }

  /* =========================================================
     도형판에 선대칭도형의 절반 만들기
     ========================================================= */
  function GeoHalf(box, cfg) {
    const N = cfg.n || 8;
    const axes = {
      v: { a: [N / 2, 0], b: [N / 2, N], name: '세로' },
      h: { a: [0, N / 2], b: [N, N / 2], name: '가로' },
      d: { a: [0, 0], b: [N, N], name: '대각선' },
    };
    let axisKey = 'v', pts = [];
    const tools = el('div', { class: 'controls' });
    const stageBox = el('div', { class: 'work' });
    const fb = el('div', { class: 'fb' });
    box.append(tools, stageBox, fb);
    let stage;
    const axisBtns = {};
    Object.keys(axes).forEach(k => { axisBtns[k] = btn(axes[k].name + ' 대칭축', () => { axisKey = k; pts = []; draw(); }, 'chip'); tools.appendChild(axisBtns[k]); });
    tools.appendChild(btn('↶ 되돌리기', () => { pts.pop(); draw(); }, 'ghost small'));
    tools.appendChild(btn('🧹 다시', () => { pts = []; draw(); }, 'ghost small'));
    const ax = () => axes[axisKey];
    const side = (p) => Math.sign(V.cross(V.sub(ax().b, ax().a), V.sub(p, ax().a)));
    function draw() {
      Object.keys(axisBtns).forEach(k => axisBtns[k].classList.toggle('sel', k === axisKey));
      clear(stageBox);
      stage = new Stage(stageBox, { x0: -0.5, y0: -0.5, w: N + 1, h: N + 1, cls: 'grid-stage' });
      stage.drawPegs();
      stage.svg.classList.add('tappable');
      stage.fullLine(ax().a, ax().b, { class: 'axis' }, 'help', 0.1);
      if (pts.length) stage.polyline(pts, { class: 'band' });
      pts.forEach(p => stage.circle(p, 0.16, { class: 'vdot' }, 'ui'));
      if (pts.length) stage.circle(pts[pts.length - 1], 0.3, { class: 'given-ring' }, 'top');
      const ink = Ink(stage);
      const tol = () => Math.max(0.45, 26 * stage.unitPerPx());
      let from = null;
      stage.on({
        // 고무줄은 못에서 못까지 손가락으로 선을 그어 건다 (끝 못에 맞춰 곧게 보정)
        dragStart: (p) => {
          if (closed()) return false;
          const q = stage.snap(p, Math.max(0.5, tol()));
          if (!q) return false;
          if (pts.length && !V.near(q, pts[pts.length - 1])) return false;
          from = q; ink.begin(p); return true;
        },
        dragMove: (p) => ink.add(p),
        dragCancel: () => ink.end(),
        dragEnd: (p) => {
          ink.add(p);
          const path = ink.end();
          const q = stage.snap(p, Math.max(0.5, tol()));
          if (!q || V.near(q, from)) { fb.className = 'fb'; fb.textContent = '선을 다른 못까지 그어요.'; return; }
          if (!nearlyStraight(path, from, q)) { Sound.bad(); fb.className = 'fb bad'; fb.textContent = '못에서 못까지 곧게 그어요.'; return; }
          if (!pts.length) { if (!tryAdd(from)) return; }
          if (!tryAdd(q)) { if (pts.length === 1) pts.pop(); return; }
          Sound.tap(); draw();
        },
        tap: () => { fb.className = 'fb'; fb.innerHTML = pts.length ? '마지막 못(빨간 테두리)에서 다음 못까지 손가락으로 <b>선을 그어요</b>.' : '대칭축 위의 못에서 시작해 손가락으로 <b>선을 그어요</b>.'; },
      });
      fb.className = 'fb';
      fb.innerHTML = pts.length === 0 ? '대칭축 위의 못에서 손가락으로 선을 그어 시작해요.' : (closed() ? '대칭축에 다시 닿았어요. <b>완성</b>을 눌러요.' : '빨간 테두리 못에서 다음 못까지 선을 그어 고무줄을 걸고, 다시 대칭축 위의 못에서 끝내요.');
    }
    const closed = () => pts.length > 1 && side(pts[pts.length - 1]) === 0;
    function tryAdd(q) {
      const bad = (t) => { Sound.bad(); fb.className = 'fb bad'; fb.textContent = t; return false; };
      if (pts.length === 0) { if (side(q) !== 0) return bad('대칭축 위의 못에서 시작해야 해요.'); }
      else {
        if (pts.some(x => V.near(x, q))) return bad('이미 고무줄을 건 못이에요.');
        const s = pts.slice(1).map(side).find(x => x !== 0);
        if (side(q) !== 0 && s && side(q) !== s) return bad('대칭축의 한쪽에만 도형을 만들어요.');
        if (side(q) === 0 && pts.length < 2) return bad('대칭축에서 벗어난 못으로 먼저 그어요.');
      }
      pts.push(q);
      return true;
    }
    draw();
    return {
      result() {
        if (pts.length < 3 || side(pts[pts.length - 1]) !== 0) return { ok: false, msg: '대칭축 위에서 시작해서 대칭축 위에서 끝나도록 만들어 주세요.' };
        const A = ax().a, B = ax().b;
        const whole = pts.concat(pts.slice(1, -1).reverse().map(p => V.round(V.reflect(p, A, B))));
        // 곧은 변 위에 놓인 점(예: 대칭축 위의 점이 위·아래 변의 한가운데에 있는 경우)은 괜찮다.
        // 고무줄이 서로 엇갈리거나, 같은 길로 되돌아가 겹치는 경우만 안 된다.
        const n = whole.length;
        const backtrack = whole.some((b, i) => {
          const a = whole[(i - 1 + n) % n], c = whole[(i + 1) % n];
          return Math.abs(V.cross(V.sub(b, a), V.sub(c, b))) < 1e-9 && V.dot(V.sub(b, a), V.sub(c, b)) <= 0;
        });
        if (backtrack || !Poly.isSimple(whole, true)) return { ok: false, msg: '고무줄이 서로 엇갈리거나 같은 길을 되돌아가면 안 돼요. 모양을 조금 바꿔 보세요.' };
        return { ok: true, given: pts.slice(), axis: [A, B], n: N };
      },
    };
  }

  window.UI = { spin180, foldAnim, clipHalf, bubble, btn, runSteps, choice, fillBlank, conceptCard, Correspond, AxisDraw, GridComplete, GeoHalf, PAIR_COLORS };
})();
