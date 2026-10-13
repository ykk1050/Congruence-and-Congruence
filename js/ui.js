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

    function renderDots() {
      clear(dots);
      steps.forEach((_, i) => dots.appendChild(el('span', { class: 'dot' + (i === idx ? ' on' : '') + (doneSet.has(i) ? ' done' : '') })));
    }
    function go(i) {
      if (i < 0 || i >= steps.length) { if (i >= steps.length && opt.onFinish) opt.onFinish(); return; }
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
          fb.className = 'fb bad'; fb.innerHTML = cfg.hint || '빠진 것이나 잘못 고른 것이 있어요.';
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
  function fillBlank(box, cfg) {
    const wrap = el('div', { class: 'fill' });
    const sentence = el('div', { class: 'sentence' });
    const blanks = [];
    let active = null;
    cfg.parts.forEach(p => {
      if (typeof p === 'string') sentence.appendChild(el('span', { html: p }));
      else {
        const b = el('button', { class: 'blank', type: 'button' }, '　');
        b.dataset.ans = p.ans; b.dataset.val = '';
        b.addEventListener('click', () => {
          if (b.dataset.val) { b.dataset.val = ''; b.textContent = '　'; b.classList.remove('filled', 'right', 'wrong'); }
          blanks.forEach(x => x.classList.remove('active')); b.classList.add('active'); active = b;
        });
        blanks.push(b); sentence.appendChild(b);
      }
    });
    const chips = el('div', { class: 'chips' });
    R.shuffle(cfg.chips).forEach(c => chips.appendChild(btn(c, () => {
      const target = (active && !active.dataset.val) ? active : blanks.find(b => !b.dataset.val);
      if (!target) return;
      target.dataset.val = c; target.textContent = c; target.classList.add('filled'); target.classList.remove('active', 'wrong');
      active = blanks.find(b => !b.dataset.val) || null;
      if (active) active.classList.add('active');
    }, 'chip')));
    const fb = el('div', { class: 'fb' });
    let tries = 0;
    const check = btn('확인하기', () => {
      if (blanks.some(b => !b.dataset.val)) { fb.className = 'fb bad'; fb.textContent = '빈칸을 모두 채워 보세요.'; return; }
      let ok = true;
      blanks.forEach(b => { const r = b.dataset.val === b.dataset.ans; b.classList.toggle('right', r); b.classList.toggle('wrong', !r); if (!r) ok = false; });
      tries++;
      if (ok) {
        Sound.good(); fb.className = 'fb good'; fb.innerHTML = cfg.good || '정리 완료! 아주 잘했어요.';
        check.disabled = true; cfg.onDone && cfg.onDone(tries === 1);
      } else { Sound.bad(); fb.className = 'fb bad'; fb.innerHTML = cfg.hint || '빨간 빈칸을 눌러 지우고 다시 골라 보세요.'; }
    }, 'primary small');
    if (blanks[0]) { blanks[0].classList.add('active'); active = blanks[0]; }
    wrap.append(sentence, chips, check, fb);
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
     대응점·대응변·대응각 찾기
     ========================================================= */
  const PAIR_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#d6336c'];

  function Correspond(box, cfg) {
    const figs = cfg.figs;
    const all = [], labelOf = [], figOf = [];
    figs.forEach((f, fi) => f.pts.forEach((p, li) => { all.push(p); labelOf.push(f.labels[li]); figOf.push([fi, li]); }));
    const M = new Map();
    cfg.map.forEach(([a, b]) => { M.set(a, b); M.set(b, a); });
    const gid = (fi, li) => { let s = 0; for (let i = 0; i < fi; i++) s += figs[i].pts.length; return s + li; };
    const nb = (g, d) => { const [fi, li] = figOf[g], n = figs[fi].pts.length; return gid(fi, (li + d + n) % n); };
    const scale = cfg.scale || 1, unit = cfg.unit || 'cm';

    const stage = new Stage(box, cfg.view);
    stage.svg.classList.add('tappable');
    figs.forEach((f, fi) => stage.poly(f.pts, { class: 'shape ' + (f.cls || (fi ? 'fill-b' : 'fill-a')) }));
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
    figs.forEach(f => stage.vertexLabels(f.pts, f.labels, { off: 0.5 }));
    if (cfg.extra) cfg.extra(stage);

    const ctrl = el('div', { class: 'controls' });
    const prompt = el('div', { class: 'cprompt' });
    const fb = el('div', { class: 'fb' });
    const log = el('div', { class: 'clog' });
    box.append(prompt, ctrl, fb, log);

    let k = 0, wrong = 0, totalWrong = 0, ghost = null, busy = false;
    const pv = (g) => all[g];
    const figPts = (g) => figs[figOf[g][0]].pts;
    const nameP = (g) => '점 ' + labelOf[g];
    const nameS = (a, b) => '변 ' + labelOf[a] + labelOf[b];
    const nameA = (p, v, n) => '각 ' + labelOf[p] + labelOf[v] + labelOf[n];
    const sideLen = (a, b) => fmt(V.dist(pv(a), pv(b)) * scale, 1) + ' ' + unit;
    // 측정값은 지워지지 않는 층에
    stage.layers['top-keep'] = sv('g', { class: 'layer-keep' });
    stage.svg.insertBefore(stage.layers['top-keep'], stage.layers.top);
    const angDeg = (g) => fmt(Poly.angleAt(figPts(g), figOf[g][1]), 0) + '°';

    function cur() { return cfg.prompts[k]; }
    function promptText(p) {
      const ph = cfg.phrase || 'corr';
      if (p.text) return p.text;
      if (p.type === 'point') return ph === 'overlap' ? `포개었을 때 <b>${nameP(p.given[0])}</b>과 겹치는 꼭짓점을 눌러 보세요.` : `<b>${nameP(p.given[0])}</b>의 대응점을 찾아 눌러 보세요.`;
      if (p.type === 'side') return ph === 'overlap' ? `포개었을 때 <b>${nameS(p.given[0], p.given[1])}</b>과 겹치는 변을 눌러 보세요.` : `<b>${nameS(p.given[0], p.given[1])}</b>의 대응변을 찾아 눌러 보세요.`;
      return ph === 'overlap' ? `포개었을 때 <b>${nameA(...p.given)}</b>과 겹치는 각을 눌러 보세요. (꼭짓점 안쪽을 눌러요)` : `<b>${nameA(...p.given)}</b>의 대응각을 찾아 눌러 보세요. (꼭짓점 안쪽을 눌러요)`;
    }
    function showPrompt() {
      stage.clearLayer('top');
      const p = cur();
      if (!p) return;
      prompt.innerHTML = `<span class="badge">${k + 1} / ${cfg.prompts.length}</span> ` + promptText(p);
      const color = PAIR_COLORS[k % PAIR_COLORS.length];
      if (p.type === 'point') stage.circle(pv(p.given[0]), 0.32, { class: 'given-ring', style: `stroke:${color}` }, 'top');
      if (p.type === 'side') stage.line(pv(p.given[0]), pv(p.given[1]), { class: 'given-side', style: `stroke:${color}` }, 'top');
      if (p.type === 'angle') stage.angleWedge(figPts(p.given[1]), figOf[p.given[1]][1], 0.7, { class: 'given-wedge', style: `fill:${color}` }, 'top');
    }
    function record(p) {
      const color = PAIR_COLORS[k % PAIR_COLORS.length];
      let text = '';
      if (p.type === 'point') {
        const a = p.given[0], b = M.get(a);
        [a, b].forEach(g => stage.circle(pv(g), 0.2, { class: 'pair-dot', style: `fill:${color}` }, 'over'));
        if (figOf[a][0] !== figOf[b][0] || cfg.linkPoints) stage.line(pv(a), pv(b), { class: 'pair-link', style: `stroke:${color}` }, 'help');
        text = `${nameP(a)} ↔ ${nameP(b)}`;
      } else if (p.type === 'side') {
        const [a1, a2] = p.given, b1 = M.get(a1), b2 = M.get(a2);
        stage.line(pv(a1), pv(a2), { class: 'pair-side', style: `stroke:${color}` }, 'over');
        stage.line(pv(b1), pv(b2), { class: 'pair-side', style: `stroke:${color}` }, 'over');
        text = `${nameS(a1, a2)} ↔ ${nameS(b1, b2)}`;
        if (cfg.measure) {
          [[a1, a2], [b1, b2]].forEach(([x, y]) => {
            const m = V.mid(pv(x), pv(y)), c = Poly.centroid(figPts(x));
            const out = V.norm(V.sub(m, V.foot(c, pv(x), pv(y))));
            stage.text(V.add(m, V.mul(isFinite(out[0]) ? out : [0, -1], 0.55)), sideLen(x, y), { class: 'measure', style: `fill:${color}` }, 'top-keep');
          });
          text += ` <span class="eq">${sideLen(a1, a2)} = ${sideLen(b1, b2)}</span>`;
        }
      } else {
        const [ap, av, an] = p.given, bp = M.get(ap), bv = M.get(av), bn = M.get(an);
        [av, bv].forEach(g => stage.angleWedge(figPts(g), figOf[g][1], 0.6, { class: 'pair-wedge', style: `fill:${color}` }, 'over'));
        text = `${nameA(ap, av, an)} ↔ ${nameA(bp, bv, bn)}`;
        if (cfg.measure) {
          [av, bv].forEach(g => {
            const P = figPts(g), i = figOf[g][1];
            stage.text(V.add(pv(g), V.mul(Poly.inward(P, i), 1.05)), angDeg(g), { class: 'measure small', style: `fill:${color}` }, 'top-keep');
          });
          text += ` <span class="eq">${angDeg(av)} = ${angDeg(bv)}</span>`;
        }
      }
      log.appendChild(el('div', { class: 'row', html: `<i style="background:${color}"></i>${text}` }));
    }

    function onTap(p) {
      if (busy || k >= cfg.prompts.length) return;
      const q = cur(), r = Math.max(0.5, 30 * stage.unitPerPx());
      let ok = false, picked = null;
      if (q.type === 'point' || q.type === 'angle') {
        let g = Hit.nearestVertex(all, p, r);
        if (g < 0 && q.type === 'angle') {
          // 각 안쪽(꼭짓점 근처)을 눌렀을 때
          g = Hit.nearestVertex(all, p, r * 2);
        }
        if (g < 0) return;
        picked = g;
        const given = q.type === 'point' ? q.given[0] : q.given[1];
        if (g === given) { toast('그것은 문제에 주어진 ' + (q.type === 'point' ? '점' : '각') + '이에요.', 'info'); return; }
        ok = g === M.get(given);
      } else {
        // 변: 두 도형의 모든 변 중 가장 가까운 것
        let best = null, bd = Math.max(0.4, 22 * stage.unitPerPx());
        figs.forEach((f, fi) => f.pts.forEach((_, li) => {
          const a = gid(fi, li), b = gid(fi, (li + 1) % f.pts.length);
          const d = V.distToSeg(p, pv(a), pv(b));
          if (d < bd) { bd = d; best = [a, b]; }
        }));
        if (!best) return;
        picked = best;
        const [g1, g2] = q.given;
        const same = (x, y) => (x[0] === y[0] && x[1] === y[1]) || (x[0] === y[1] && x[1] === y[0]);
        if (same(best, [g1, g2])) { toast('그것은 문제에 주어진 변이에요.', 'info'); return; }
        ok = same(best, [M.get(g1), M.get(g2)]);
      }
      if (ok) {
        Sound.good(); record(q);
        fb.className = 'fb good'; fb.innerHTML = R.pick(['정확해요!', '맞아요!', '잘 찾았어요!']);
        k++; wrong = 0;
        if (k >= cfg.prompts.length) { stage.clearLayer('top'); prompt.innerHTML = '✅ 모두 찾았어요!'; cfg.onDone && cfg.onDone({ wrong: totalWrong }); }
        else showPrompt();
      } else {
        wrong++; totalWrong++; Sound.bad(); shake(stage.svg);
        fb.className = 'fb bad';
        fb.innerHTML = wrong >= 2 && cfg.hintText ? cfg.hintText(q) : (cfg.overlay ? '포개어 보면 어디와 겹칠지 생각해 보세요. <b>포개어 보기</b> 버튼을 눌러 확인할 수 있어요.' : (cfg.wrongText || '다시 찾아보세요.'));
        if (wrong >= 3) {
          // 정답 위치 깜박임
          const given = q.type === 'side' ? null : (q.type === 'point' ? q.given[0] : q.given[1]);
          if (given != null) { const c = stage.circle(pv(M.get(given)), 0.45, { class: 'hint-ring' }, 'top'); setTimeout(() => c.remove(), 1600); }
          else { const l = stage.line(pv(M.get(q.given[0])), pv(M.get(q.given[1])), { class: 'hint-side' }, 'top'); setTimeout(() => l.remove(), 1600); }
        }
      }
    }
    stage.on({ tap: onTap });

    if (cfg.overlay) {
      const ob = btn('🔁 포개어 보기', () => {
        if (busy) return;
        const { moving, onto } = cfg.overlay;
        const B = figs[moving].pts, A = figs[onto].pts;
        const mp = B.map((_, li) => figOf[M.get(gid(moving, li))][1]);
        if (ghost) { ghost.forEach(n => n.remove()); ghost = null; ob.textContent = '🔁 포개어 보기'; return; }
        busy = true;
        const fr = isometryFrames(B, A, mp);
        const g = stage.poly(B, { class: 'shape ghost ' + (moving ? 'fill-b' : 'fill-a') }, 'over');
        const lbls = B.map((p, li) => stage.text(p, figs[moving].labels[li], { class: 'vlabel ghost-lbl' }, 'over'));
        ghost = [g, ...lbls];
        animate(fr.flip ? 2200 : 1400, t => {
          const P = fr.at(t);
          stage.setPoints(g, P);
          P.forEach((q, li) => { const d = Poly.inward(B, li); const z = V.add(q, V.mul(V.rotVec(d, 0), 0)); lbls[li].setAttribute('x', z[0]); lbls[li].setAttribute('y', z[1]); });
        }, () => {
          const P = fr.at(1);
          P.forEach((q, li) => { const ii = mp[li]; const z = V.add(A[ii], V.mul(Poly.inward(A, ii), 0.6)); lbls[li].setAttribute('x', z[0]); lbls[li].setAttribute('y', z[1]); });
          busy = false; ob.textContent = '↩ 떼어 놓기';
          toast(fr.flip ? '뒤집어서 포개니 완전히 겹쳐요!' : '포개니 완전히 겹쳐요!', 'good');
        });
      }, 'secondary');
      ctrl.appendChild(ob);
    }
    showPrompt();
    return { stage };
  }

  /* =========================================================
     대칭축 긋기 (한 도형)
     ========================================================= */
  function AxisDraw(box, cfg) {
    const f = cfg.fig;
    const bb = Fig.bbox(f), size = Math.max(bb.w, bb.h);
    const pad = size * 0.32;
    const view = cfg.view || { x0: bb.x0 - pad, y0: bb.y0 - pad, w: bb.w + 2 * pad, h: bb.h + 2 * pad };
    const stage = new Stage(box, Object.assign({ cls: 'axis-stage' }, view));
    stage.fig(f, { class: 'shape fill-a ' + (cfg.shapeCls || '') });
    const axes = Fig.axes(f);
    const total = axes === Infinity ? Infinity : axes.length;
    const c = Fig.center(f);
    const found = [];
    let temp = null, finished = false, wrongCount = 0, giveups = 0;
    const tolD = Math.max(0.25, size * 0.08);

    const info = el('div', { class: 'axis-info' });
    const ctrl = el('div', { class: 'controls' });
    const fb = el('div', { class: 'fb' });
    box.append(info, ctrl, fb);
    const upd = () => { info.innerHTML = `찾은 대칭축: <b>${found.length}</b>개`; };
    upd();

    function drawAxis(deg, cls) {
      const d = V.rotVec([1, 0], deg);
      return stage.fullLine(c, V.add(c, d), { class: cls || 'axis found' }, 'over', 0.05);
    }
    stage.on({
      dragStart: (p) => { if (finished) return; temp = stage.line(p, p, { class: 'axis temp' }, 'top'); },
      dragMove: (p, s) => { if (temp) { temp.setAttribute('x2', p[0]); temp.setAttribute('y2', p[1]); } },
      dragEnd: (p, s) => {
        if (temp) { temp.remove(); temp = null; }
        if (finished || V.dist(p, s) < size * 0.2) return;
        const deg = ((V.angleOf(V.sub(p, s)) % 180) + 180) % 180;
        const dc = V.distToLine(c, s, p);
        const angDiff = (a, b) => { const d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); };
        let match = null;
        if (total === Infinity) { if (dc < tolD) match = { deg }; }
        else axes.forEach(ax => { if (angDiff(ax.deg, deg) < 10 && V.distToLine(ax.a, s, p) < tolD) match = ax; });
        if (match) {
          if (found.some(d => angDiff(d, match.deg) < (total === Infinity ? 12 : 1))) { fb.className = 'fb'; fb.textContent = '이미 찾은 대칭축이에요. 다른 방향도 생각해 보세요.'; Sound.tap(); return; }
          found.push(match.deg); drawAxis(match.deg); Sound.good(); upd();
          fb.className = 'fb good'; fb.textContent = '이 선을 따라 접으면 완전히 겹쳐요! 대칭축이에요.';
          cfg.onAxis && cfg.onAxis(found.length);
        } else {
          wrongCount++; Sound.bad();
          const ln = stage.fullLine(s, p, { class: 'axis bad' }, 'top', 0.05);
          const gh = stage.fig(Fig.map(f, q => V.reflect(q, s, p)), { class: 'shape ghost-bad' }, 'top');
          setTimeout(() => { ln && ln.remove(); gh.remove(); }, 1700);
          fb.className = 'fb bad'; fb.innerHTML = '이 선을 따라 접으면 <b>완전히 겹치지 않아요</b>. (빨간 점선이 접었을 때의 모양)';
        }
      },
    });

    function finish(ok, msg) {
      finished = true;
      fb.className = 'fb ' + (ok ? 'good' : 'bad'); fb.innerHTML = msg;
      cfg.onResult && cfg.onResult({ ok, found: found.length, total, wrong: wrongCount, giveups });
    }
    const showAll = () => {
      if (total === Infinity) { [0, 30, 60, 90, 120, 150].forEach(d => { if (!found.some(x => Math.abs(x - d) < 12)) drawAxis(d, 'axis reveal'); }); }
      else axes.forEach(ax => { if (!found.some(d => Math.abs(d - ax.deg) < 1 || Math.abs(Math.abs(d - ax.deg) - 180) < 1)) drawAxis(ax.deg, 'axis reveal'); });
    };
    ctrl.appendChild(btn('✔ 다 그었어요', () => {
      if (finished) return;
      if (total === 0) { Sound.bad(); giveups++; fb.className = 'fb bad'; fb.innerHTML = '이 도형은 어떤 직선을 따라 접어도 완전히 겹치지 않아요. 아래 <b>대칭축이 없어요</b>를 눌러 보세요.'; return; }
      if (found.length === 0) { fb.className = 'fb bad'; fb.textContent = '손가락으로 도형 위에 선을 그어 대칭축을 표시해 보세요.'; return; }
      if (total === Infinity) {
        if (found.length >= 2) { Sound.good(); showAll(); finish(true, '원은 중심을 지나는 직선이면 모두 대칭축이에요. 대칭축이 <b>셀 수 없이 많아요!</b>'); }
        else { giveups++; Sound.bad(); fb.className = 'fb bad'; fb.textContent = '다른 방향으로도 대칭축을 그을 수 있을까요?'; }
        return;
      }
      if (found.length >= total) { Sound.good(); finish(true, `대칭축을 모두 찾았어요! 이 도형의 대칭축은 <b>${total}개</b>예요.`); }
      else {
        giveups++; Sound.bad();
        if (giveups >= 2) { showAll(); finish(false, `아직 찾지 못한 대칭축이 있었어요. 이 도형의 대칭축은 <b>${total}개</b>예요. (초록 점선)`); }
        else { fb.className = 'fb bad'; fb.innerHTML = '아직 찾지 못한 대칭축이 있어요. <b>세로·가로뿐 아니라 비스듬한 방향</b>으로도 생각해 보세요.'; }
      }
    }, 'primary'));
    ctrl.appendChild(btn('🚫 대칭축이 없어요', () => {
      if (finished) return;
      if (total === 0) { Sound.good(); finish(true, '맞아요. 어떤 직선을 따라 접어도 완전히 겹치지 않으니 <b>선대칭도형이 아니에요.</b>'); }
      else { giveups++; Sound.bad(); fb.className = 'fb bad'; fb.innerHTML = '이 도형은 완전히 겹치도록 접을 수 있는 직선이 있어요. 다시 찾아보세요.'; if (giveups >= 2) { showAll(); finish(false, `이 도형은 선대칭도형이에요. 대칭축은 <b>${total === Infinity ? '셀 수 없이 많아요' : total + '개'}</b>.`); } }
    }, 'ghost'));
    return { stage, axes, total };
  }

  /* =========================================================
     모눈/도형판에서 선대칭·점대칭 도형 완성하기
     ========================================================= */
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

    const helpName = line ? '수선' : '대칭의 중심을 지나는 직선';
    function curIdx() { return cfg.guided ? placed.indexOf(false) : -1; }
    function setPrompt() {
      if (phase === 'place') {
        const i = curIdx();
        if (cfg.guided && i >= 0) prompt.innerHTML = `점 <b>${lg.given[i + 1]}</b>의 대응점을 찾아 점 <b>${lg.img[i]}</b>으로 표시해요. <span class="muted">(${cfg.helper !== false ? '점 ' + lg.given[i + 1] + '을 누르면 ' + helpName + '이 그어져요' : ''})</span>`;
        else prompt.innerHTML = `대응점을 찾아 모눈의 꼭짓점을 눌러 표시해요. <span class="muted">남은 점: ${placed.filter(x => !x).length}개${cfg.helper !== false ? ' · 주어진 꼭짓점을 누르면 ' + helpName + '이 그어져요' : ''}</span>`;
      } else if (phase === 'connect') {
        const names = connectSeq.map(p => labelAt(p));
        prompt.innerHTML = `점 ${names.map(n => '<b>' + n + '</b>').join(', 점 ')}을 <b>차례대로</b> 눌러 이어 보세요.`;
      }
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
    function finishAll() {
      phase = 'done'; finished = true;
      const poly = stage.poly(finalPoly, { class: 'shape done-fill' + (cfg.pegs ? ' band-fill' : '') }, 'main');
      if (cfg.pegs) stage.poly(finalPoly, { class: 'band' }, 'main');
      poly.style.opacity = 0;
      animate(500, t => { poly.style.opacity = t; });
      prompt.innerHTML = '🎉 완성했어요!';
      cfg.onDone && cfg.onDone({ mistakes, poly: finalPoly });
      if (cfg.verify !== false) ctrl.appendChild(verifyBtn());
    }
    function verifyBtn() {
      return btn(line ? '🔍 대칭축을 따라 접어 확인하기' : '🔍 180° 돌려서 확인하기', () => {
        const ghost = stage.poly(finalPoly, { class: 'shape ghost' }, 'top');
        animate(1400, t => {
          const P = finalPoly.map(p => line ? (() => { const f = V.foot(p, A, B); return V.add(f, V.mul(V.sub(p, f), 1 - 2 * t)); })() : V.rot(p, O, 180 * t));
          stage.setPoints(ghost, P);
        }, () => { toast('처음 도형과 완전히 겹쳐요!', 'good'); setTimeout(() => ghost.remove(), 900); });
      }, 'secondary small');
    }
    function startConnect() {
      phase = 'connect'; seqIdx = 0; seqDir = 0; drawn = null; setPrompt();
    }
    stage.on({
      tap: (p) => {
        if (finished) return;
        // 주어진 꼭짓점 → 보조선
        const gi = Hit.nearestVertex(G, p, Math.max(0.35, 24 * stage.unitPerPx()));
        if (phase === 'place' && gi >= 0 && cfg.helper !== false && !onAxis(G[gi]) && !(gi === 0 || gi === G.length - 1)) { helper(G[gi]); Sound.tap(); return; }
        const q = stage.snap(p, 0.42);
        if (!q) return;
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
        } else if (phase === 'connect') {
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
    setPrompt();
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
      stage.on({ tap: onTap });
      fb.className = 'fb';
      fb.innerHTML = pts.length === 0 ? '대칭축 위의 못에서 시작해요.' : (pts.length > 1 && side(pts[pts.length - 1]) === 0 ? '대칭축에 다시 닿았어요. <b>완성</b>을 눌러요.' : '대칭축 한쪽에 못을 차례로 눌러 고무줄을 걸고, 다시 대칭축 위의 못에서 끝내요.');
    }
    function onTap(p) {
      const q = stage.snap(p, 0.45);
      if (!q) return;
      if (pts.length && side(pts[pts.length - 1]) === 0 && pts.length > 1) { toast('이미 대칭축에 닿았어요. 완성을 누르거나 되돌려요.'); return; }
      if (pts.length === 0) { if (side(q) !== 0) { Sound.bad(); fb.className = 'fb bad'; fb.textContent = '대칭축 위의 못에서 시작해야 해요.'; return; } }
      else {
        if (pts.some(x => V.near(x, q))) return;
        const s = pts.slice(1).map(side).find(x => x !== 0);
        if (side(q) !== 0 && s && side(q) !== s) { Sound.bad(); fb.className = 'fb bad'; fb.textContent = '대칭축의 한쪽에만 도형을 만들어요.'; return; }
        if (side(q) === 0 && pts.length < 2) { Sound.bad(); fb.className = 'fb bad'; fb.textContent = '대칭축에서 벗어난 못을 먼저 눌러요.'; return; }
      }
      pts.push(q); Sound.tap(); draw();
    }
    draw();
    return {
      result() {
        if (pts.length < 3 || side(pts[pts.length - 1]) !== 0) return { ok: false, msg: '대칭축 위에서 시작해서 대칭축 위에서 끝나도록 만들어 주세요.' };
        const A = ax().a, B = ax().b;
        const whole = pts.concat(pts.slice(1, -1).reverse().map(p => V.round(V.reflect(p, A, B))));
        if (!Poly.isSimple(whole)) return { ok: false, msg: '고무줄이 서로 겹치거나 한 직선 위에 나란히 있으면 안 돼요. 모양을 조금 바꿔 보세요.' };
        return { ok: true, given: pts.slice(), axis: [A, B], n: N };
      },
    };
  }

  window.UI = { bubble, btn, runSteps, choice, fillBlank, conceptCard, Correspond, AxisDraw, GridComplete, GeoHalf, PAIR_COLORS };
})();
