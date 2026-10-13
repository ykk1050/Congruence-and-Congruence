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
     2차시 — 미술관 바닥 타일 수리 (합동인 도형 찾기)
     ========================================================= */
  function gameTiles(root) {
    GameShell(root, {
      id: 'g2', emoji: '🧩', title: '미술관 바닥 타일 수리',
      story: [
        { who: 'dayun', text: '앗! 미술관 바닥의 관람 방향 타일이 깨졌어요.' },
        { who: 'guide', text: '깨진 자리에 <b>꼭 맞는 타일</b>을 찾아 끼워 주세요. 모양과 크기가 같아서 <b>포개었을 때 완전히 겹치는</b> 타일만 들어가요. 타일은 돌리거나 뒤집어서 끼울 수 있어요.' },
      ],
      mission: '깨진 자리와 <b>서로 합동인</b> 타일을 찾아요. 모눈의 칸 수를 세어 보면 도움이 돼요!',
      rounds: 10, roundName: '타일',
      makeRound(area, api) {
        const multi = api.level >= 3;
        const P = Shapes.latticeShape(api.level);
        const nOpt = multi ? 6 : api.level === 1 ? 3 : 4;
        const nRight = multi ? R.int(2, 3) : 1;
        const opts = [];
        for (let k = 0; k < nRight; k++) opts.push({ P: Shapes.d4(P, R.int(0, 7)), ok: true });
        let guard = 0;
        while (opts.length < nOpt && guard++ < 100) {
          const Q = Shapes.nearMiss(P);
          if (!Q) continue;
          const T = Shapes.d4(Q, R.int(0, 7));
          if (opts.some(o => !o.ok && Poly.congruent(o.P, T)) && guard < 60) continue;
          opts.push({ P: T, ok: false });
        }
        const list = R.shuffle(opts);
        const S = Math.max(...[P].concat(list.map(o => o.P)).map(Q => { const b = Poly.bbox(Q); return Math.max(b.w, b.h); })) + 2;
        const top = el('div', { class: 'tile-target' });
        area.append(el('div', { class: 'q', html: multi ? '깨진 자리와 <b>서로 합동인 타일을 모두</b> 골라 확인을 눌러요.' : '깨진 자리에 꼭 맞는 타일을 골라요.' }), top);
        const st = new Stage(top, { x0: -1, y0: -1, w: S, h: S, grid: true, cls: 'card-stage' });
        const hole = st.poly(P, { class: 'hole' });
        const cards = el('div', { class: 'tile-opts n' + nOpt });
        area.appendChild(cards);
        const sel = new Set();
        let done = false;
        const nodes = list.map((o, idx) => {
          const c = el('button', { class: 'tile-card', type: 'button' });
          const s = new Stage(c, { x0: -1, y0: -1, w: S, h: S, grid: true, cls: 'card-stage' });
          s.poly(o.P, { class: 'shape tile' });
          c.appendChild(el('span', { class: 'tag' }, '가나다라마바'[idx]));
          c.addEventListener('click', () => {
            if (done) return;
            Sound.tap();
            if (multi) { sel.has(idx) ? sel.delete(idx) : sel.add(idx); c.classList.toggle('sel'); return; }
            if (o.ok) { done = true; c.classList.add('right'); hole.setAttribute('class', 'shape tile filled'); api.correct('타일이 딱 맞게 들어갔어요!'); }
            else { c.classList.add('wrong'); shake(c); api.wrong('모양이나 크기가 달라요. 칸 수를 세어 보세요.'); }
          });
          cards.appendChild(c);
          return c;
        });
        const reveal = () => { done = true; nodes.forEach((c, k) => { if (list[k].ok) c.classList.add('right'); }); hole.setAttribute('class', 'shape tile filled'); api.giveUp('초록색 타일이 서로 합동인 타일이에요.'); };
        api.onReveal(reveal);
        if (multi) area.appendChild(el('div', { class: 'controls center' }, btn('확인', () => {
          if (done) return;
          const ok = list.every((o, k) => o.ok === sel.has(k));
          if (ok) { done = true; nodes.forEach((c, k) => { if (list[k].ok) c.classList.add('right'); }); hole.setAttribute('class', 'shape tile filled'); api.correct('합동인 타일을 모두 찾았어요!'); }
          else { shake(cards); api.wrong(sel.size === 0 ? '타일을 골라 주세요.' : '빠진 타일이나 잘못 고른 타일이 있어요.'); }
        }, 'primary')));
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
        const sideLabel = (P, i, txt, cls) => {
          const m = V.mid(P[i], P[(i + 1) % n]), c = Poly.centroid(P);
          const out = V.norm(V.sub(m, V.foot(c, P[i], P[(i + 1) % n])));
          return st.text(V.add(m, V.mul(out, 0.6)), txt, { class: 'measure ' + (cls || '') });
        };
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
        if (type === 'len') {
          // P2의 변 i 길이를 보여 주고, P1의 변 i를 묻는다. 다른 변 하나는 방해용
          const j = (i + R.int(1, n - 1)) % n;
          sideLabel(P2, i, lenA[i] + ' cm'); sideLabel(P1, j, lenA[j] + ' cm');
          sideLabel(P1, i, '? cm', 'ask');
          st.line(P1[i], P1[(i + 1) % n], { class: 'given-side' }, 'top');
          q.innerHTML = `<b>변 ${sideName(L1, i)}</b>의 길이는 몇 cm일까요?`;
          answer = lenA[i]; unit = 'cm';
        } else if (type === 'ang') {
          const j = (i + R.int(1, n - 1)) % n;
          angLabel(P2, i, angA[i] + '°'); angLabel(P1, j, angA[j] + '°', 'muted');
          angLabel(P1, i, '?°', 'ask');
          q.innerHTML = `<b>각 ${angName(L1, i)}</b>의 크기는 몇 도일까요?`;
          answer = angA[i]; unit = '°';
        } else if (type === 'sum') {
          // 삼각형: 서로 다른 도형에 두 각이 주어지고 나머지 대응각을 구함
          const j = (i + 1) % 3, k2 = (i + 2) % 3;
          angLabel(P2, j, angA[j] + '°'); angLabel(P1, k2, angA[k2] + '°');
          angLabel(P1, i, '?°', 'ask');
          q.innerHTML = `<b>각 ${angName(L1, i)}</b>의 크기는 몇 도일까요? <span class="muted">(삼각형의 세 각의 크기의 합은 180°)</span>`;
          answer = angA[i]; unit = '°';
        } else {
          // 둘레: 삼각형 P1의 둘레가 주어지고, 변 하나는 P2에, 하나는 P1에 표시
          const j = (i + 1) % 3, k2 = (i + 2) % 3;
          sideLabel(P2, j, lenA[j] + ' cm'); sideLabel(P1, k2, lenA[k2] + ' cm');
          sideLabel(P1, i, '? cm', 'ask');
          const per = lenA[0] + lenA[1] + lenA[2];
          q.innerHTML = `삼각형 ${L1.join('')}의 둘레는 <b>${per} cm</b>예요. <b>변 ${sideName(L1, i)}</b>의 길이는 몇 cm일까요?`;
          answer = lenA[i]; unit = 'cm';
        }
        let done = false;
        keypad(ansBox, (v, reset) => {
          if (done) return;
          if (v === answer) { done = true; api.correct(`대응${unit === 'cm' ? '변의 길이' : '각의 크기'}가 같아요!`); }
          else { reset(); api.wrong(unit === 'cm' ? '구하려는 변의 대응변을 먼저 찾아보세요.' : '구하려는 각의 대응각을 먼저 찾아보세요.'); }
        }, unit);
        api.onReveal(() => { done = true; api.giveUp(`정답: <b>${answer}${unit === 'cm' ? ' cm' : '°'}</b>`); });
      },
    });
  }

  /* =========================================================
     4차시 — 색유리 창문 공방 (대칭축 긋기)
     ========================================================= */
  function gameWindow(root) {
    const L1 = ['정사각형', '직사각형', '이등변삼각형', '연모양', '평행사변형', '하트', '집모양', '직각삼각형', '등변사다리꼴', '화살표'];
    const L2 = ['마름모', '정삼각형', '직각이등변삼각형', '정오각형', '정육각형', '평행사변형', '사다리꼴', '양쪽화살표', '오목사각형'];
    const L3 = ['십자', '별', '정팔각형', '원', 'Z모양', '부등변삼각형', '정육각형', '정오각형', '마름모', '바람개비'];
    const rolls = [];
    GameShell(root, {
      id: 'g4', emoji: '💠', title: '색유리 창문 공방',
      story: [
        { who: 'dayun', text: '색유리 창문의 무늬가 정말 아름다워요!' },
        { who: 'guide', text: '유리 장인이 새 창문을 만들려고 해요. 유리 조각마다 <b>대칭축</b>을 모두 표시해 주어야 무늬를 맞출 수 있대요. 대칭축이 없는 조각도 섞여 있으니 조심하세요!' },
      ],
      mission: '손가락으로 선을 그어 <b>대칭축을 모두</b> 찾아요. 대칭축은 여러 개일 수 있고, 비스듬할 수도 있어요.',
      rounds: 10, roundName: '유리 조각',
      makeRound(area, api) {
        const pool = api.level === 1 ? L1 : api.level === 2 ? L2 : L3;
        let name; do { name = R.pick(pool); } while (rolls.length && rolls[rolls.length - 1] === name && pool.length > 1);
        rolls.push(name);
        const rot = api.level === 1 ? 0 : R.int(0, 11) * 15;
        const fig = name === '원' ? Fig.circle([0, 0], 3.2) : Shapes.polyShape(name, rot).fig;
        area.appendChild(el('div', { class: 'q', html: '유리 조각에 <b>대칭축을 모두</b> 그어요. 다 그으면 <b>다 그었어요</b>를 눌러요.' }));
        const box = el('div', { class: 'work glass' });
        area.appendChild(box);
        const colors = ['glass-1', 'glass-2', 'glass-3', 'glass-4', 'glass-5'];
        UI.AxisDraw(box, {
          fig, shapeCls: R.pick(colors),
          view: { x0: -5.2, y0: -4.6, w: 10.4, h: 9.2 },
          onResult(r) {
            if (r.ok && r.wrong === 0 && r.giveups === 0) api.correct(r.total === 0 ? '대칭축이 없는 조각을 알아봤어요!' : '대칭축을 한 번에 모두 찾았어요!');
            else if (r.ok) api.correct('대칭축을 모두 찾았어요!', true);
            else api.giveUp('초록 점선이 찾지 못한 대칭축이에요.');
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
    const sideLabel = (i, txt, cls) => {
      const a = P[i], b = P[(i + 1) % n], m = V.mid(a, b), c = Poly.centroid(P);
      const out = V.norm(V.sub(m, V.foot(c, a, b)));
      return st.text(V.add(m, V.mul(out, 0.6)), txt, { class: 'measure ' + (cls || '') });
    };
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
        st.text(V.add(V.mid(P[i], f), [0, -0.45]), v + ' cm', { class: 'measure' });
        st.text(V.add(V.mid(P[j], f), [0, -0.45]), '? cm', { class: 'measure ask' });
        q.innerHTML = `직선 ${extra[1]}${extra[2]}이 대칭축이에요. <b>선분 ${L[j]}${extra[0]}</b>의 길이는 몇 cm일까요?`;
        answer = v;
      } else {
        q.innerHTML = `대응점끼리 이은 <b>선분 ${L[i]}${L[j]}</b>과 대칭축이 만나서 이루는 각은 몇 도일까요?`;
        answer = 90; unit = '°';
      }
      const s = st.clipLine(a2, b2, 0.4);
      if (s) { st.text(V.add(s[0], [0.45, 0.2]), extra[1], { class: 'vlabel axis-lbl' }); st.text(V.add(s[1], [0.45, -0.2]), extra[2], { class: 'vlabel axis-lbl' }); }
    } else {
      st.line(P[i], P[j], { class: 'pair-link solid' }, 'help');
      const half = R.int(3, 14);
      if (type === 'half') {
        st.text(V.add(V.mid(P[i], P[j]), [0.6, -0.5]), (2 * half) + ' cm', { class: 'measure' });
        q.innerHTML = `선분 ${L[i]}${L[j]}의 길이는 <b>${2 * half} cm</b>예요. <b>선분 ${L[i]}${extra[0]}</b>의 길이는 몇 cm일까요?`;
        answer = half;
      } else {
        st.text(V.add(V.mid(P[i], o2), [0, -0.45]), half + ' cm', { class: 'measure' });
        q.innerHTML = `선분 ${L[i]}${extra[0]}의 길이가 <b>${half} cm</b>일 때, <b>선분 ${L[i]}${L[j]}</b>의 길이는 몇 cm일까요?`;
        answer = 2 * half;
      }
    }
    let done = false;
    keypad(ans, (v, reset) => {
      if (done) return;
      if (v === answer) { done = true; api.correct(isLine ? '선대칭도형의 성질을 잘 이용했어요!' : '점대칭도형의 성질을 잘 이용했어요!'); }
      else {
        reset();
        const hint = {
          side: '대응변의 길이는 같아요. 구하려는 변의 대응변을 찾아보세요.', angle: '대응각의 크기는 같아요.',
          dist: '대응점에서 대칭축까지의 거리는 같아요.', perp: '대응점끼리 이은 선분은 대칭축과 수직으로 만나요.',
          half: '대칭의 중심은 대응점끼리 이은 선분을 똑같이 둘로 나눠요.', whole: '대칭의 중심까지의 거리가 같은 두 선분을 더해요.',
        }[type];
        api.wrong(hint);
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
          animate(1300, t => g.setAttribute('transform', `rotate(${180 * t} ${center[0]} ${center[1]})`), () => { cb && cb(); setTimeout(() => g.remove(), 1500); });
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
     단원 정리 — 교통안전 체험관 표지판 분류
     ========================================================= */
  function gameSort(root) {
    const BINS = [
      { key: 'line', label: '선대칭도형만', icon: '↔' },
      { key: 'point', label: '점대칭도형만', icon: '🔄' },
      { key: 'both', label: '둘 다', icon: '✨' },
      { key: 'none', label: '둘 다 아님', icon: '✖' },
    ];
    const items = () => {
      const a = Object.keys(Shapes.letterLib).concat(['ㅇ']).map(ch => Shapes.letter(ch, 5));
      const b = Object.keys(Shapes.polyLib).map(nm => Shapes.polyShape(nm, R.pick([0, 0, 30, 45])));
      return R.shuffle(a.concat(b, [{ fig: Fig.circle([0, 0], 2.8), name: '원' }]));
    };
    let deck = [];
    GameShell(root, {
      id: 'g12', emoji: '🚦', title: '교통안전 체험관 표지판 분류',
      story: [
        { who: 'seung', text: '교통안전 체험관에서 새 표지판과 글자 판을 정리해야 해요.' },
        { who: 'guide', text: '표지판을 <b>선대칭도형만</b>, <b>점대칭도형만</b>, <b>둘 다</b>, <b>둘 다 아님</b> 상자로 나누어 주세요. 선대칭도형이면서 점대칭도형인 것은 “둘 다”에 넣어요.' },
      ],
      mission: '합동과 대칭에서 배운 내용을 모두 떠올려 도형을 알맞은 상자에 넣어요.',
      rounds: 15, roundName: '표지판',
      makeRound(area, api) {
        if (!deck.length) deck = items();
        const it = deck.pop();
        const f = it.fig, type = Fig.symType(f);
        area.appendChild(el('div', { class: 'q', html: '이 표지판은 어느 상자에 넣어야 할까요?' }));
        const st = new Stage(area, { x0: -4.4, y0: -4, w: 8.8, h: 8, cls: 'sign-stage' });
        st.fig(f, { class: 'shape ' + (f.kind === 'strokes' ? 'letter sign-letter' : 'sign') + (f.kind === 'circle' ? ' ring' : '') });
        const bins = el('div', { class: 'bins' });
        area.appendChild(bins);
        let done = false;
        const explain = () => {
          const ax = Fig.axes(f);
          if (ax === Infinity) st.fullLine([-3, 0], [3, 0], { class: 'axis reveal' }, 'over');
          else ax.forEach(a => st.fullLine(a.a, a.b, { class: 'axis reveal' }, 'over', 0.2));
          const nAx = ax === Infinity ? '셀 수 없이 많아요' : ax.length + '개';
          const ps = Fig.isPointSym(f);
          return `대칭축: <b>${nAx}</b> · 180° 돌리면 <b>${ps ? '완전히 겹쳐요' : '겹치지 않아요'}</b> → <b>${BINS.find(b => b.key === type).label}</b>`;
        };
        BINS.forEach(b => {
          const node = el('button', { class: 'bin', type: 'button' }, el('span', { class: 'bin-icon' }, b.icon), el('span', {}, b.label));
          node.onclick = () => {
            if (done) return;
            if (b.key === type) { done = true; node.classList.add('right'); api.correct(explain()); }
            else { node.classList.add('wrong'); shake(node); api.wrong(); if (api.tries >= 2) { done = true; api.giveUp(explain()); } }
          };
          bins.appendChild(node);
        });
        api.onReveal(() => { if (!done) { done = true; api.giveUp(explain()); } });
      },
    });
  }

  window.Games = {
    g2: { title: '미술관 바닥 타일 수리', run: gameTiles },
    g3: { title: '승현이의 판화 공방', run: gamePrint },
    g4: { title: '색유리 창문 공방', run: gameWindow },
    g5: { title: '데칼코마니 작품 복원', run: gameDecal },
    g7: { title: '천장 글자 작품 감별사', run: gameLetters },
    g9: { title: '바람개비 공원 만들기', run: gamePinwheel },
    g12: { title: '교통안전 체험관 표지판 분류', run: gameSort },
  };
})();
