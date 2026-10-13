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
      const isExtra = !L.game && apps.length === 0;
      const card = el('a', { class: 'room' + (isExtra ? ' extra' : ''), href: '#/lesson/' + L.id },
        el('div', { class: 'room-num' }, String(idx + 1)),
        el('div', { class: 'room-emoji', 'aria-hidden': 'true' }, L.emoji),
        el('div', { class: 'room-body' },
          el('div', { class: 'room-no' }, L.no + ' · ' + L.room),
          el('div', { class: 'room-title' }, L.title),
          el('div', { class: 'room-meta' },
            apps.length ? el('span', { class: 'tag-learn' }, `📘 배우기 ${doneN}/${apps.length}`) : el('span', { class: 'tag-paper' }, '📄 교과서·실물 활동'),
            L.game ? el('span', { class: 'tag-game' }, '🎮 ' + stars(L.game)) : null)));
      map.appendChild(card);
    });
    view.appendChild(map);
    view.appendChild(el('div', { class: 'home-foot' },
      el('a', { class: 'btn ghost', href: '#/teacher' }, '👩‍🏫 선생님 안내 · 활동 선정 기준'),
      btn('기록 지우기', () => { if (confirm('이 기기에 저장된 활동 기록과 게임 점수를 모두 지울까요?')) { Store.write({ sound: Sound.on }); home(); toast('기록을 지웠어요.'); } }, 'ghost small')));
  }

  /* ---------- 차시 화면 ---------- */
  function lesson(id) {
    const L = LESSONS.find(x => x.id === id);
    if (!L) return home();
    setCrumb([{ t: '미술관 지도', href: '#/' }, { t: L.no + ' ' + L.title }]);
    clear(view);
    view.appendChild(el('section', { class: 'lesson-head' },
      el('div', { class: 'lesson-emoji', 'aria-hidden': 'true' }, L.emoji),
      el('div', {},
        el('p', { class: 'kicker' }, `${L.no} · ${L.pages}`),
        el('h1', {}, L.title),
        el('p', { class: 'story-line' }, L.story))));

    const learn = el('section', { class: 'panel' }, el('h2', {}, '📘 배우기 ', el('small', {}, '교과서 순서대로')));
    const list = el('ol', { class: 'act-list' });
    L.acts.forEach(a => {
      if (a.type === 'app') {
        list.appendChild(el('li', {}, el('a', { class: 'act app' + (doneAct(a.id) ? ' done' : ''), href: '#/act/' + a.id },
          el('span', { class: 'act-tb' }, a.tb),
          el('span', { class: 'act-title' }, a.title),
          el('span', { class: 'act-go' }, doneAct(a.id) ? '✓ 완료' : '시작 ▶'))));
      } else {
        list.appendChild(el('li', {}, el('div', { class: 'act paper' },
          el('span', { class: 'act-tb' }, a.tb),
          el('span', { class: 'act-title' }, a.title, el('small', {}, a.why)),
          el('span', { class: 'act-go' }, a.type === 'tool' ? '💻 교과서 도구' : '📄 종이·실물로'))));
      }
    });
    learn.appendChild(list);
    view.appendChild(learn);

    if (L.game) {
      const G = Games[L.game];
      view.appendChild(el('section', { class: 'panel game-card' },
        el('h2', {}, '🎮 익히기 게임'),
        el('a', { class: 'game-link', href: '#/game/' + L.game },
          el('span', { class: 'gl-title' }, G.title),
          el('span', { class: 'gl-stars' }, stars(L.game)),
          el('span', { class: 'gl-go' }, '게임하러 가기 ▶')),
        el('p', { class: 'muted' }, '문제는 매번 새롭게 만들어져요. 여러 번 도전해 별 3개를 모아 보세요!')));
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
    setCrumb([{ t: '미술관 지도', href: '#/' }, { t: L.no, href: '#/lesson/' + L.id }, { t: a.tb }]);
    clear(view);
    view.appendChild(el('div', { class: 'act-head' },
      el('span', { class: 'act-tb big' }, `${L.no} ${a.tb}`),
      el('h1', {}, a.title)));
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
        root.appendChild(el('div', { class: 'finish' },
          el('div', { class: 'big-stars' }, '🎉'),
          el('h2', {}, '활동을 마쳤어요!'),
          el('div', { class: 'controls center' },
            nextAct ? el('a', { class: 'btn primary big', href: '#/act/' + nextAct.id }, `다음 활동: ${nextAct.title} ▶`) : null,
            L.game ? el('a', { class: 'btn ' + (nextAct ? 'secondary' : 'primary big'), href: '#/game/' + L.game }, '🎮 익히기 게임 하러 가기') : null,
            el('a', { class: 'btn ghost', href: '#/lesson/' + L.id }, '차시 화면으로'))));
      };
      nav.addEventListener('click', finishOnce, true);
    }
  }

  /* ---------- 게임 화면 ---------- */
  function game(id) {
    const G = Games[id];
    if (!G) return home();
    const L = LESSONS.find(x => x.game === id);
    setCrumb([{ t: '미술관 지도', href: '#/' }, L ? { t: L.no, href: '#/lesson/' + L.id } : null, { t: '🎮 ' + G.title }].filter(Boolean));
    clear(view);
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
      el('p', {}, '이 웹앱은 『수학 5-2』 3단원 「합동과 대칭」의 교과서 활동 중 ', el('b', {}, '스마트 패드로 할 때 더 효과적인 활동'), '만 골라 교과서 순서대로 구성했습니다. ', '직접 오리고, 접고, 돌려 보는 것이 중요한 조작 활동과 실물 관찰·이야기 활동은 교과서와 준비물로 진행하도록 제외했습니다.'),
      el('h2', {}, '활동 선정 기준'),
      el('div', { class: 'criteria' },
        el('div', { class: 'crit app' }, el('h3', {}, '💻 웹앱으로 하는 활동'), el('ul', {},
          el('li', {}, '종이로 하면 도형을 뜯거나 여러 번 다시 그려야 하는 활동 (포개어 대응점·대응변·대응각 찾기)'),
          el('li', {}, '즉각적인 확인과 맞춤형 피드백이 학습에 도움이 되는 활동 (대칭축 긋기, 대칭도형 완성하기)'),
          el('li', {}, '도형을 끌어 바꾸어 보며 성질이 “언제나” 성립하는지 확인하는 탐구'),
          el('li', {}, '반복 연습이 필요한 활동 → 상황이 있는 게임으로 매번 새 문제 제공'))),
        el('div', { class: 'crit paper' }, el('h3', {}, '📄 종이·실물로 하는 활동'), el('ul', {},
          el('li', {}, '색종이 겹쳐 오리기 (합동의 의미를 손으로 경험)'),
          el('li', {}, '반으로 접어 보기, 무늬를 선 따라 접어 보기 (선대칭의 의미)'),
          el('li', {}, '준비물로 글자·도형을 직접 180° 돌려 보기 (점대칭의 의미)'),
          el('li', {}, '주변에서 찾아 이야기하기, 자유롭게 그림 그리기, 실물 카드 놀이'),
          el('li', {}, '이미 공학 도구를 쓰는 활동(알지오매스 키즈)은 교과서 안내대로')))),
      el('h2', {}, '차시별 활동 분류'),
      table(),
      el('h2', {}, '수업 활용 팁'),
      el('ul', {},
        el('li', {}, '스마트 패드는 ', el('b', {}, '가로 방향'), '을 권장합니다. 전자칠판에 띄워 전체 시범을 보일 수도 있어요.'),
        el('li', {}, '각 활동은 지도서의 흐름(예상하기 → 확인하기 → 성질 정리하기)을 따르며, 그리기 방법은 외우기 전에 성질을 먼저 떠올리도록 구성했습니다.'),
        el('li', {}, '익히기 게임은 문제가 무작위로 만들어져 반복 연습이 가능하며, 뒤 문제로 갈수록 어려워집니다. 두 번 틀리면 “정답 보기”가 나타납니다.'),
        el('li', {}, '활동 완료 표시와 게임 최고 기록은 ', el('b', {}, '그 기기 안에만'), ' 저장되며 서버로 전송되지 않습니다. 홈 화면 아래 “기록 지우기”로 초기화할 수 있어요.'),
        el('li', {}, '각 차시 화면 아래의 “선생님 안내”에서 지도서의 학습 지도 및 평가의 주안점을 확인할 수 있습니다.'))));
  }
  function table() {
    const t = el('table', { class: 'tbl wide' }, el('tr', {}, el('th', {}, '차시'), el('th', {}, '교과서 활동'), el('th', {}, '방식'), el('th', {}, '이유')));
    LESSONS.forEach(L => L.acts.forEach((a, i) => {
      t.appendChild(el('tr', { class: a.type },
        i === 0 ? el('td', { rowspan: L.acts.length }, L.no) : null,
        el('td', {}, `${a.tb} ${a.title}`),
        el('td', { class: 'c-mode' }, a.type === 'app' ? '💻 웹앱' : a.type === 'tool' ? '🛠 교과서 도구' : '📄 종이·실물'),
        el('td', {}, a.why)));
      if (L.game && i === L.acts.length - 1) t.appendChild(el('tr', { class: 'app game-row' }, el('td', {}, ''), el('td', {}, '익히기 게임: ' + Games[L.game].title), el('td', { class: 'c-mode' }, '🎮 웹앱'), el('td', {}, '상황이 있는 게임으로 새 문제를 반복 연습')));
    }));
    return el('div', { class: 'tbl-wrap' }, t);
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
