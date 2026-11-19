(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Texts in English (default) or Dutch: set `language` in config.js.
  const CONF = window.LAUNCHPAD || {};
  const NL = (CONF.language || 'en').startsWith('nl');
  const T = NL ? {
    greet: ['Goedenacht', 'Goedemorgen', 'Goedemiddag', 'Goedenavond'], search: 'Zoek een link…', empty: 'Geen links gevonden.',
    sort: 'Sorteer de links', done: 'Klaar met sorteren', reset: 'Terug naar de standaardvolgorde', confirm: 'Terug naar de standaardvolgorde?'
  } : {
    greet: ['Good night', 'Good morning', 'Good afternoon', 'Good evening'], search: 'Search a link…', empty: 'No links found.',
    sort: 'Sort the links', done: 'Done sorting', reset: 'Back to the default order', confirm: 'Back to the default order?'
  };
  document.documentElement.lang = NL ? 'nl' : 'en';
  $('#q').placeholder = T.search;
  $('#empty').textContent = T.empty;

  // Greeting and date
  const now = new Date();
  const h = now.getHours();
  $('#greeting').textContent = T.greet[h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3];
  if (CONF.name) $('#name').textContent = CONF.name;
  $('#date').textContent = now.toLocaleDateString(CONF.locale || (NL ? 'nl-BE' : 'en-GB'), { weekday: 'long', day: 'numeric', month: 'long' });

  // Host name under each link
  const hostOf = (a) => {
    if (a.dataset.host) return a.dataset.host;
    try {
      const u = new URL(a.href);
      return u.hostname.replace(/^www\./, '') + (u.port ? ':' + u.port : '');
    } catch (e) {
      return '';
    }
  };
  // Labels from config.js: each label has a list of host names, * is a wildcard.
  const esc = (h) => h.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const LABELS = (CONF.labels || []).filter((l) => (l.hosts || []).length)
    .map((l) => ({ ...l, re: new RegExp('^(' + l.hosts.map(esc).join('|') + ')$') }));
  $$('.grid a').forEach((a) => {
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = a.textContent.trim();
    const host = document.createElement('small');
    host.textContent = hostOf(a);
    const icon = document.createElement('img');
    icon.alt = '';
    icon.src = 'icons/' + (a.dataset.icon || 'generic.svg');
    icon.onerror = () => { icon.onerror = null; icon.src = 'icons/generic.svg'; };
    try {
      const u = new URL(a.href);
      LABELS.forEach((l) => {
        if (!(l.re.test(u.hostname) || l.re.test(u.host))) return;
        const el = document.createElement('span');
        el.className = l.color === 'pub' ? 'pub' : 'pub ' + (l.color || '');
        el.textContent = l.text;
        if (l.title) el.title = l.title;
        host.prepend(el);
      });
    } catch (e) {}
    a.replaceChildren(icon, name, host);
  });

  // Counters and tabs (mobile)
  const sections = $$('section[data-section]');
  const tabs = $('#tabs');
  let active;
  try { active = localStorage.getItem('tab'); } catch (e) {}
  if (!sections.some((s) => s.dataset.section === active)) active = sections[0].dataset.section;

  const setActive = (name) => {
    active = name;
    try { localStorage.setItem('tab', name); } catch (e) {}
    sections.forEach((s) => s.classList.toggle('active', s.dataset.section === name));
    $$('button', tabs).forEach((b) => b.setAttribute('aria-selected', b.dataset.section === name));
  };

  sections.forEach((s) => {
    const n = $$('li', s).length;
    $('.count', s).textContent = n;
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.section = s.dataset.section;
    b.innerHTML = '<span></span><small></small>';
    b.firstChild.textContent = s.dataset.section;
    b.lastChild.textContent = n;
    b.addEventListener('click', () => setActive(s.dataset.section));
    tabs.appendChild(b);
  });
  setActive(active);

  // Custom order of the links: per section a list of hrefs. Stored in D1 (/api/order) when that
  // works (Cloudflare Pages + Access); otherwise only in this browser (localStorage).
  // Links missing from the saved list (new in index.html) stay where they are in the HTML.
  const recount = () => {
    sections.forEach((s) => {
      const n = $$('li', s).length;
      $('.count', s).textContent = n;
      const b = $$('button', tabs).find((x) => x.dataset.section === s.dataset.section);
      if (b) b.lastChild.textContent = n;
    });
  };
  const applyOrder = (layout) => {
    const byHref = new Map($$('.grid li').map((li) => [li.firstElementChild.getAttribute('href'), li]));
    sections.forEach((s) => {
      const ul = $('ul', s);
      const list = (layout && layout[s.dataset.section]) || [];
      list.forEach((h) => { const li = byHref.get(h); if (li) { ul.appendChild(li); byHref.delete(h); } });
    });
    recount();
  };
  const currentOrder = () => Object.fromEntries(sections.map((s) =>
    [s.dataset.section, $$('li a', s).map((a) => a.getAttribute('href'))]));
  let api = false; // becomes true once /api/order really answers
  const stored = (l) => {
    try {
      if (l === undefined) return JSON.parse(localStorage.getItem('order') || '{}');
      localStorage.setItem('order', JSON.stringify(l));
    } catch (e) { return {}; }
  };
  const saveOrder = (layout) => {
    stored(layout);
    if (!api) return Promise.resolve();
    return fetch('/api/order', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(layout)
    }).catch(() => {});
  };
  const apply = (l) => { if (l && Object.keys(l).length) applyOrder(l); };
  fetch('/api/order')
    .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
    .then((l) => { if (l) api = true; apply(l || stored()); })
    .catch(() => apply(stored()));

  // Sort mode: button bottom right; drag links (mouse or finger), also to another section.
  const sortBtn = document.createElement('button');
  sortBtn.type = 'button';
  sortBtn.id = 'sortbtn';
  const ICO = {
    sort: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M7 4 4 7m3-3 3 3M17 20V4m0 16-3-3m3 3 3-3"/></svg>',
    klaar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    reset: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg>'
  };
  sortBtn.innerHTML = ICO.sort;
  sortBtn.title = sortBtn.ariaLabel = T.sort;
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.id = 'sortreset';
  resetBtn.innerHTML = ICO.reset;
  resetBtn.title = resetBtn.ariaLabel = T.reset;
  resetBtn.hidden = true;
  document.body.append(resetBtn, sortBtn);
  sortBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('sorting');
    sortBtn.innerHTML = on ? ICO.klaar : ICO.sort;
    sortBtn.title = sortBtn.ariaLabel = on ? T.done : T.sort;
    resetBtn.hidden = !on;
  });
  resetBtn.addEventListener('click', () => {
    if (!confirm(T.confirm)) return;
    saveOrder({}).then(() => location.reload());
  });
  // In sort mode a click on a link must not open or count it
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('sorting') && e.target.closest('.grid a, .favs a')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    if (!document.body.classList.contains('sorting') || e.button > 0) return;
    const li = e.target.closest('.grid li');
    if (!li) return;
    drag = li;
    li.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const doel = el && el.closest('.grid li');
    if (doel && doel !== drag) {
      const r = doel.getBoundingClientRect();
      doel.parentNode.insertBefore(drag, e.clientY < r.top + r.height / 2 ? doel : doel.nextSibling);
    } else if (!doel) {
      const s = el && el.closest('section[data-section]');
      if (s) {
        const ul = $('ul', s);
        const r = ul.getBoundingClientRect();
        if (e.clientY < r.top) ul.prepend(drag);
        else if (e.clientY > r.bottom) ul.appendChild(drag);
      }
    }
  });
  const drop = () => {
    if (!drag) return;
    drag.classList.remove('dragging');
    drag = null;
    recount();
    saveOrder(currentOrder());
  };
  document.addEventListener('pointerup', drop);
  document.addEventListener('pointercancel', drop);

  // Collapsible groups, closed by default
  $$(".fold-btn").forEach((b) => b.addEventListener("click", () => {
    const s = b.closest(".fold");
    b.setAttribute("aria-expanded", s.classList.toggle("open"));
    b.blur();
  }));
  // Close again after a click on a link inside, or anywhere else
  document.addEventListener("click", (e) => {
    $$(".fold.open").forEach((s) => {
      if (!s.contains(e.target) || e.target.closest("a")) {
        s.classList.remove("open");
        $(".fold-btn", s).setAttribute("aria-expanded", "false");
      }
    });
  });

  // Count clicks (Pages Function /api/click, D1), only when the API works
  const log = (a) => {
    if (!api) return;
    try {
      const name = ($('.name', a) || $('span', a) || a).textContent.trim();
      fetch('/api/click', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: a.href, name }),
        keepalive: true
      }).catch(() => {});
    } catch (e) {}
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.grid a, .favs a');
    if (a) log(a);
  });
  document.addEventListener('auxclick', (e) => {
    const a = e.button === 1 && e.target.closest('.grid a, .favs a');
    if (a) log(a);
  });

  // Search
  const q = $('#q');
  const empty = $('#empty');
  const search = () => {
    const term = q.value.trim().toLowerCase();
    document.body.classList.toggle('searching', !!term);
    let total = 0;
    sections.forEach((s) => {
      let n = 0;
      $$('li', s).forEach((li) => {
        const hit = !term || li.textContent.toLowerCase().includes(term);
        li.hidden = !hit;
        if (hit) n++;
      });
      s.hidden = n === 0;
      $('.count', s).textContent = n;
      total += n;
    });
    empty.hidden = total > 0;
  };
  q.addEventListener('input', search);

  q.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      q.value = '';
      search();
      q.blur();
    } else if (e.key === 'Enter') {
      const first = $$('.grid li').find((li) => !li.hidden && !li.closest('section').hidden);
      if (first) {
        log(first.firstElementChild);
        window.open(first.firstElementChild.href, '_blank');
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q) {
      e.preventDefault();
      q.focus();
    }
  });

  // Starry sky: softly twinkling stars and the occasional shooting star
  const sky = document.createElement('canvas');
  sky.id = 'sky';
  sky.setAttribute('aria-hidden', 'true');
  document.body.prepend(sky);
  const ctx = sky.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, stars = [], meteor = null, nextMeteor = performance.now() + 4000;

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    sky.width = W * dpr;
    sky.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((W * H) / 7000) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.5 + Math.random() * 0.9,
      a: 0.3 + Math.random() * 0.45,
      speed: 0.0004 + Math.random() * 0.0008,
      phase: Math.random() * Math.PI * 2
    }));
  };

  const draw = (t) => {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const a = still ? s.a : s.a * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = `rgba(237,237,233,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (still) return;

    if (!meteor && t > nextMeteor) {
      const angle = (20 + Math.random() * 20) * Math.PI / 180;
      meteor = {
        x: Math.random() * W * 0.7,
        y: Math.random() * H * 0.4,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        len: 110 + Math.random() * 80,
        start: t,
        life: 900 + Math.random() * 500
      };
    }
    if (meteor) {
      const p = (t - meteor.start) / meteor.life;
      if (p >= 1) {
        meteor = null;
        nextMeteor = t + 5000 + Math.random() * 6000;
      } else {
        const dist = p * 420;
        const hx = meteor.x + meteor.dx * dist;
        const hy = meteor.y + meteor.dy * dist;
        const tx = hx - meteor.dx * meteor.len;
        const ty = hy - meteor.dy * meteor.len;
        const fade = Math.sin(p * Math.PI) * 0.8;
        const g = ctx.createLinearGradient(hx, hy, tx, ty);
        g.addColorStop(0, `rgba(255,236,210,${fade})`);
        g.addColorStop(1, 'rgba(255,236,210,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener('resize', () => {
    resize();
    if (still) draw(0);
  });
  requestAnimationFrame(draw);
})();
