/* =========================================================
   app.js — 화면 이동(라우터), 홈·차시·활동·게임·교사 안내 화면
   ========================================================= */
(function () {
  'use strict';
  const { el, clear, Store, Sound, toast } = C;
  const { btn } = UI;
  const { LESSONS, ACT, findAct } = Lessons;

  const view = document.getElementById('view');
  const crumb = document.getElementById('crumb');
  const soundBtn = document.getElementById('sound');

  soundBtn.textContent = Sound.on ? '🔊' : '🔇';
  soundBtn.addEventListener('click', () => { soundBtn.textContent = Sound.toggle() ? '🔊' : '🔇'; });

  const stars = (id) => { const r = Store.get('game:' + id, null); return r ? '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars) : '☆☆☆'; };
  const doneAct = (id) => !!Store.get('act:' + id, false);
  const appActs = (L) => L.acts.filter(a => a.type === 'app');
  /** 배우기 활동을 모두 마쳐야 익히기 게임이 열린다 (선생님 안내에서 모두 열기 가능) */
  const teacherOpen = () => !!Store.get('unlockAll', false);
  const gameOpen = (L) => teacherOpen() || appActs(L).every(a => doneAct(a.id));
  const leftActs = (L) => appActs(L).filter(a => !doneAct(a.id));

  function setCrumb(parts) {
    clear(crumb);
    parts.forEach((p, i) => {
      if (i) crumb.appendChild(el('span', { class: 'sep' }, '›'));
      crumb.appendChild(p.href ? el('a', { href: p.href }, p.t) : el('span', {}, p.t));
    });
  }

  /* ---------- 홈: 미술관 지도 ---------- */
  function home() {
    setCrumb([{ t: '미술관 지도' }]);
    clear(view);
    view.appendChild(el('section', { class: 'hero' },
      el('div', { class: 'hero-text' },
        el('p', { class: 'kicker' }, '5학년 2학기 · 3. 합동과 대칭'),
        el('h1', {}, '다윤이와 승현이의 ', el('span', { class: 'hl' }, '합동과 대칭 미술관')),
        el('p', {}, '교과서 순서대로 전시실을 돌며 ', el('b', {}, '배우기'), ' 활동으로 개념을 탐구하고, ', el('b', {}, '익히기 게임'), '으로 여러 번 연습해요.')),
      el('div', { class: 'hero-art', 'aria-hidden': 'true' }, '👧🖼️👦')));

    const map = el('div', { class: 'rooms' });
    LESSONS.forEach((L, idx) => {
      const apps = appActs(L);
      const doneN = apps.filter(a => doneAct(a.id)).length;
      const card = el('a', { class: 'room', href: '#/lesson/' + L.id },
        el('div', { class: 'room-emoji', 'aria-hidden': 'true' }, L.emoji),
        el('div', { class: 'room-body' },
          el('div', { class: 'room-no' }, L.room),
          el('div', { class: 'room-title' }, L.title),
          el('div', { class: 'room-meta' },
            el('span', { class: 'tag-learn' }, `📘 배우기 ${doneN}/${apps.length}`),
            L.game ? (gameOpen(L) ? el('span', { class: 'tag-game' }, '🎮 ' + stars(L.game)) : el('span', { class: 'tag-lock' }, '🔒 익히기 게임')) : null)));
      map.appendChild(card);
    });
    view.appendChild(map);
    view.appendChild(el('div', { class: 'home-foot' },
      el('a', { class: 'btn ghost', href: '#/teacher' }, '👩‍🏫 선생님 안내'),
      btn('기록 지우기', () => { if (confirm('이 기기에 저장된 활동 기록과 게임 점수를 모두 지울까요?')) { Store.write({ sound: Sound.on, unlockAll: teacherOpen() }); home(); toast('기록을 지웠어요.'); } }, 'ghost small')));
  }

  /* ---------- 차시 화면 ---------- */
  function lesson(id) {
    const L = LESSONS.find(x => x.id === id);
    if (!L) return home();
    setCrumb([{ t: '미술관 지도', href: '#/' }, { t: L.title }]);
    clear(view);
    const sc = Scenes.scene(L.id);
    if (sc) view.appendChild(el('div', { class: 'scene-wrap' }, sc));
    view.appendChild(el('section', { class: 'lesson-head' },
      el('div', { class: 'lesson-emoji', 'aria-hidden': 'true' }, L.emoji),
      el('div', {},
        el('h1', {}, L.title),
        el('p', { class: 'story-line' }, L.story))));

    const learn = el('section', { class: 'panel' }, el('h2', {}, '📘 배우기'));
    const list = el('ol', { class: 'act-list' });
    L.acts.forEach(a => {
      list.appendChild(el('li', {}, el('a', { class: 'act app' + (doneAct(a.id) ? ' done' : ''), href: '#/act/' + a.id },
        el('span', { class: 'act-title' }, a.title),
        el('span', { class: 'act-go' }, doneAct(a.id) ? '✓ 완료' : '시작 ▶'))));
    });
    learn.appendChild(list);
    view.appendChild(learn);

    if (L.game) {
      const G = Games[L.game];
      if (gameOpen(L)) {
        view.appendChild(el('section', { class: 'panel game-card' },
          el('h2', {}, '🎮 익히기 게임'),
          el('a', { class: 'game-link', href: '#/game/' + L.game },
            el('span', { class: 'gl-title' }, G.title),
            el('span', { class: 'gl-stars' }, stars(L.game)),
            el('span', { class: 'gl-go' }, '게임하러 가기 ▶')),
          el('p', { class: 'muted' }, '문제는 매번 새롭게 만들어져요. 여러 번 도전해 별 3개를 모아 보세요!')));
      } else {
        const n = leftActs(L).length;
        view.appendChild(el('section', { class: 'panel game-card locked' },
          el('div', { class: 'lock-row' }, el('span', { class: 'lock-ico', 'aria-hidden': 'true' }, '🔒'),
            el('div', {}, el('b', {}, '익히기 게임'), el('div', { class: 'muted' }, `배우기 활동을 모두 마치면 열려요. (남은 활동 ${n}개)`)))));
      }
    }
    const det = el('details', { class: 'panel teacher-note' },
      el('summary', {}, '👩‍🏫 선생님 안내 — 학습 지도 및 평가의 주안점(지도서)'),
      el('ul', {}, L.focus.map(f => el('li', { html: f }))));
    view.appendChild(det);
  }

  /* ---------- 활동 화면 ---------- */
  function activity(id) {
    const found = findAct(id);
    if (!found || !ACT[id]) return home();
    const { lesson: L, act: a } = found;
    setCrumb([{ t: '미술관 지도', href: '#/' }, { t: L.title, href: '#/lesson/' + L.id }]);
    clear(view);
    const sc = Scenes.scene(L.id);
    if (sc) view.appendChild(el('div', { class: 'scene-wrap' }, sc, el('div', { class: 'scene-cap' }, L.story)));
    view.appendChild(el('div', { class: 'act-head' }, el('h1', {}, a.title)));
    const root = el('section', { class: 'activity' });
    view.appendChild(root);
    const apps = appActs(L);
    const idx = apps.findIndex(x => x.id === id);
    const nextAct = apps[idx + 1];
    ACT[id](root);
    // 마지막 단계에서 ‘활동 마치기’를 누르면
    const nav = root.querySelector('.step-nav .primary');
    if (nav) {
      const finishOnce = () => {
        if (!nav.textContent.includes('마치기') || nav.disabled) return;
        Store.set('act:' + id, true);
        Sound.win();
        clear(root);
        // 다음에 할 일: 아직 안 한 다음 활동 → (모두 마쳤으면) 익히기 게임
        const left = leftActs(L);
        const next = (nextAct && !doneAct(nextAct.id)) ? nextAct : left[0];
        const allDone = left.length === 0;
        root.appendChild(el('div', { class: 'finish' },
          el('div', { class: 'big-stars' }, '🎉'),
          el('h2', {}, '활동을 마쳤어요!'),
          allDone && L.game ? el('p', { class: 'unlock-msg' }, '🔓 배우기 활동을 모두 마쳐서 익히기 게임이 열렸어요!') : null,
          el('div', { class: 'controls center' },
            next ? el('a', { class: 'btn primary big', href: '#/act/' + next.id }, `다음 활동: ${next.title} ▶`) : null,
            allDone && L.game ? el('a', { class: 'btn primary big', href: '#/game/' + L.game }, '🎮 익히기 게임 하러 가기') : null,
            el('a', { class: 'btn ghost', href: '#/lesson/' + L.id }, '전시실 화면으로'))));
      };
      nav.addEventListener('click', finishOnce, true);
    }
  }

  /* ---------- 게임 화면 ---------- */
  function game(id) {
    const G = Games[id];
    if (!G) return home();
    const L = LESSONS.find(x => x.game === id);
    setCrumb([{ t: '미술관 지도', href: '#/' }, L ? { t: L.title, href: '#/lesson/' + L.id } : null, { t: '🎮 ' + G.title }].filter(Boolean));
    clear(view);
    if (L && !gameOpen(L)) {
      const left = leftActs(L);
      view.appendChild(el('section', { class: 'panel game-card locked' },
        el('div', { class: 'lock-row' }, el('span', { class: 'lock-ico', 'aria-hidden': 'true' }, '🔒'),
          el('div', {}, el('h2', {}, G.title), el('p', {}, '배우기 활동을 모두 마치면 열려요.'))),
        el('ul', {}, left.map(a => el('li', {}, el('a', { href: '#/act/' + a.id }, a.title)))),
        el('a', { class: 'btn primary', href: '#/act/' + left[0].id }, `남은 활동 하러 가기: ${left[0].title} ▶`)));
      return;
    }
    const root = el('section', { class: 'game-root' });
    view.appendChild(root);
    G.run(root);
  }

  /* ---------- 교사 안내 ---------- */
  function teacher() {
    setCrumb([{ t: '미술관 지도', href: '#/' }, { t: '선생님 안내' }]);
    clear(view);
    view.appendChild(el('section', { class: 'panel' },
      el('h1', {}, '👩‍🏫 선생님 안내'),
      el('p', {}, '『수학 5-2』 3단원 「합동과 대칭」에서 스마트 패드로 하기에 알맞은 활동을 교과서 순서대로 담았습니다.'),
      el('h2', {}, '익히기 게임 열기'),
      el('p', {}, '익히기 게임은 그 전시실의 배우기 활동을 모두 마쳐야 열립니다. (활동 기록은 기기마다 따로 저장돼요) 시범을 보이거나 복습할 때는 아래 버튼으로 이 기기의 게임을 모두 열 수 있어요.'),
      btn(teacherOpen() ? '🔒 게임 잠금 다시 켜기' : '🔓 이 기기에서 모든 게임 열기', () => { Store.set('unlockAll', !teacherOpen()); toast(teacherOpen() ? '이 기기의 게임을 모두 열었어요.' : '게임 잠금을 다시 켰어요.'); teacher(); }, 'secondary'),
      el('h2', {}, '전시실별 활동과 지도 주안점'),
      overview(),
      el('h2', {}, '수업 활용 팁'),
      el('ul', {},
        el('li', {}, '스마트 패드는 ', el('b', {}, '가로 방향'), '을 권장합니다. 전자칠판에 띄워 전체 시범을 보일 수도 있어요.'),
        el('li', {}, '각 활동은 지도서의 흐름(예상하기 → 확인하기 → 성질 정리하기)을 따르며, 그리기 방법은 외우기 전에 성질을 먼저 떠올리도록 구성했습니다.'),
        el('li', {}, '익히기 게임은 문제가 무작위로 만들어져 반복 연습이 가능하며, 뒤 문제로 갈수록 어려워집니다. 두 번 틀리면 “정답 보기”가 나타납니다.'),
        el('li', {}, '활동 완료 표시와 게임 최고 기록은 ', el('b', {}, '그 기기 안에만'), ' 저장되며 서버로 전송되지 않습니다. 홈 화면 아래 “기록 지우기”로 초기화할 수 있어요.'),
        el('li', {}, '각 전시실 화면 아래의 “선생님 안내”에서도 지도서의 학습 지도 및 평가의 주안점을 확인할 수 있습니다.'))));
  }
  function overview() {
    const wrap = el('div', { class: 'overview' });
    LESSONS.forEach(L => wrap.appendChild(el('div', { class: 'ov' },
      el('h3', {}, `${L.emoji} ${L.title}`),
      el('div', { class: 'ov-cols' },
        el('div', {}, el('b', {}, '배우기'), el('ul', {}, L.acts.map(a => el('li', {}, a.title))),
          L.game ? el('p', {}, el('b', {}, '익히기 게임: '), Games[L.game].title) : null),
        el('div', {}, el('b', {}, '학습 지도 및 평가의 주안점(지도서)'), el('ul', {}, L.focus.map(f => el('li', { html: f }))))))));
    return wrap;
  }

  /* ---------- 라우터 ---------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg] = h.split('/');
    window.scrollTo(0, 0);
    if (page === 'lesson') lesson(arg);
    else if (page === 'act') activity(arg);
    else if (page === 'game') game(arg);
    else if (page === 'teacher') teacher();
    else home();
  }
  window.addEventListener('hashchange', route);
  route();
})();
