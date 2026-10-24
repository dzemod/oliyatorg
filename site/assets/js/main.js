/* Оліяторг — home page behaviour */
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Typography: no hanging short words ---------- */
  const SHORT = {
    uk: /(^|[\s(«"„])(і|й|в|у|з|із|зі|та|на|до|а|о|не|що|за|від|для|по|як|ми|це|чи)\s+/gi,
    en: /(^|[\s("“])(a|an|the|of|to|in|and|for|on|by|with|or|at|we|our|from)\s+/gi
  };
  function typo(scope, lang) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: n => /SCRIPT|STYLE|TEXTAREA/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      // run twice so chains like "і в" are both bound
      const v = n.nodeValue.replace(SHORT[lang], '$1$2 ').replace(SHORT[lang], '$1$2 ').replace(/ —/g, ' —');
      if (v !== n.nodeValue) n.nodeValue = v;
    }
    tieLastWords();
  }

  /* No orphans: tie the last two words of every text block, so a single word never ends up alone on the last line.
     Layout-aware: where the tied pair is wider than its box (very narrow columns), the tie is undone — overflow is
     worse than an orphan. Re-run on resize and language change. */
  const ORPHAN_BLOCKS = 'h1 .line > *, h2, h3, p, dt, dd, li > a, figcaption, label, .btn > span, .process__title, .tabs__tab';
  let ties = [];
  function tieLastWords() {
    ties.forEach(({ node, i }) => { if (node.nodeValue[i] === ' ') node.nodeValue = node.nodeValue.slice(0, i) + ' ' + node.nodeValue.slice(i + 1); });
    ties = [];
    $$(ORPHAN_BLOCKS).forEach(el => {
      const tie = tieLast(el);
      if (tie && el.scrollWidth > el.clientWidth + 1) {
        tie.node.nodeValue = tie.node.nodeValue.slice(0, tie.i) + ' ' + tie.node.nodeValue.slice(tie.i + 1);
      } else if (tie) ties.push(tie);
    });
  }
  function tieLast(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let word = false;
    for (let k = nodes.length - 1; k >= 0; k--) {
      const node = nodes[k], v = node.nodeValue;
      for (let i = v.length - 1; i >= 0; i--) {
        if (v[i] === ' ') return null;         // already tied by the short-word rule
        if (!/\s/.test(v[i])) { word = true; continue; }
        if (word) { node.nodeValue = v.slice(0, i) + ' ' + v.slice(i + 1); return { node, i }; }
      }
    }
    return null;
  }
  let tieTimer;
  addEventListener('resize', () => { clearTimeout(tieTimer); tieTimer = setTimeout(tieLastWords, 150); });

  /* ---------- Input modality: focus outlines only for keyboard navigation ---------- */
  addEventListener('pointerdown', () => { root.dataset.input = 'mouse'; }, true);
  addEventListener('keydown', e => { if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') root.dataset.input = 'key'; }, true);

  /* ---------- Language (UA in HTML, EN in i18n.js) ---------- */
  const dict = { uk: { ...(window.I18N && window.I18N.ukExtra) }, en: (window.I18N && window.I18N.en) || {} };
  $$('[data-i18n]').forEach(el => { dict.uk[el.dataset.i18n] = el.innerHTML; });
  $$('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(';').forEach(pair => {
      const [attr, key] = pair.split(':');
      dict.uk[key] = el.getAttribute(attr);
    });
  });
  let lang = 'uk';
  const t = key => dict[lang][key] ?? dict.uk[key] ?? '';

  function setLang(next) {
    lang = dict[next] ? next : 'uk';
    root.lang = lang === 'uk' ? 'uk' : 'en';
    $$('[data-i18n]').forEach(el => {
      const v = dict[lang][el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    $$('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => {
        const [attr, key] = pair.split(':');
        const v = dict[lang][key];
        if (v != null) el.setAttribute(attr, v);
      });
    });
    $$('.lang__btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    typo(document.body, lang);
    try { localStorage.setItem('lang', lang); } catch (e) { /* storage blocked */ }
    document.dispatchEvent(new CustomEvent('langchange'));
  }
  $$('.lang__btn').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) { /* storage blocked */ }
  if (saved === 'en') setLang('en'); else typo(document.body, 'uk');
  document.fonts && document.fonts.ready.then(tieLastWords);   // widths are only final with the web fonts

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- Mobile menu ---------- */
  const nav = $('#nav');
  const burger = $('.burger');
  function menu(open) {
    nav.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', t(open ? 'ui.closeMenu' : 'ui.openMenu'));
  }
  burger.addEventListener('click', () => menu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { menu(false); burger.focus(); }
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', () => menu(false));

  /* ---------- Contacts screen: the photo ends before the header menu starts ---------- */
  // CSS reads --nav-left (desktop only) and keeps a gap, so no menu item ever meets the photo at any width.
  // Runs before the scroll set-up below, so every later ScrollTrigger refresh measures the final layout.
  const navList = $('.nav__list');
  const fitContacts = () => root.style.setProperty('--nav-left', Math.round(navList.getBoundingClientRect().left) + 'px');
  fitContacts();
  addEventListener('resize', fitContacts);
  document.addEventListener('langchange', fitContacts);
  document.fonts && document.fonts.ready.then(fitContacts);

  /* ---------- Scroll mode ---------- */
  const track = $('#track');
  const scroller = $('.scroller');
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  // No GSAP (CDN blocked) → fall back to the normal vertical page.
  if (root.classList.contains('is-h') && !hasGsap) root.classList.remove('is-h');
  const horizontal = root.classList.contains('is-h');
  let hTween = null;

  // Reload when crossing the desktop breakpoint so the right mode is built.
  const desktopMq = matchMedia('(min-width: 1024px)');
  desktopMq.addEventListener('change', () => { if (!reduceMotion) location.reload(); });

  if (horizontal) {
    gsap.registerPlugin(ScrollTrigger);
    const distance = () => Math.max(0, track.scrollWidth - innerWidth);
    const logoLink = $('.header__logo');
    // dark zones inside a panel (the contacts photo) come first, so they win over their light panel
    const panels = [...$$('.panel [data-theme="dark"]'), ...$$('.panel')];
    // each menu item and the language switch get their own colour, so while a dark and a light section
    // meet under the menu every item matches the section right behind it
    const navItems = [...$$('.nav__list li'), $('.nav .lang')];
    const frames = $$('[data-parallax]').map(fig => {
      const img = $('img', fig);
      if (!img) return null;
      fig.classList.add('has-parallax');
      return { fig, set: gsap.quickSetter(img, 'xPercent'), v: null };
    }).filter(Boolean);

    // Everything the track needs per frame is measured once per refresh (load, resize, fonts,
    // language), so scrolling itself only does arithmetic on the track's x — no layout reads.
    let geo = null;
    function measure() {
      const x0 = track.getBoundingClientRect().left;
      const box = el => { const r = el.getBoundingClientRect(); return { l: r.left - x0, w: r.width }; };
      const mid = el => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
      geo = {
        vw: innerWidth,
        panels: panels.map(p => ({ ...box(p), dark: p.dataset.theme === 'dark' })),
        frames: frames.map(f => box(f.fig)),
        logo: mid(logoLink),
        nav: navItems.map(mid)
      };
    }
    const darkAt = x => { const p = geo.panels.find(p => x >= p.l && x < p.l + p.w); return !!p && p.dark; };
    let logoDark = null;
    const navDark = navItems.map(() => null);

    function onTrack() {
      if (!geo) return;
      const x = gsap.getProperty(track, 'x');
      // Gentle parallax inside photo frames: -4% when the frame enters on the right, +4% as it leaves on the left
      frames.forEach((f, i) => {
        const { l, w } = geo.frames[i];
        const t = Math.min(1, Math.max(0, (geo.vw - l - x) / (geo.vw + w)));
        const v = Math.round((-4 + 8 * t) * 100) / 100;
        if (v !== f.v) { f.v = v; f.set(v); }
      });
      // Logo and each menu item switch to light colours over a dark area — instantly, only on change
      const ld = darkAt(geo.logo - x);
      if (ld !== logoDark) logoLink.classList.toggle('on-dark', logoDark = ld);
      navItems.forEach((el, i) => {
        const d = darkAt(geo.nav[i] - x);
        if (d !== navDark[i]) el.classList.toggle('on-dark', navDark[i] = d);
      });
    }

    // The only ScrollTrigger: pins the page and scrubs the track. Its tween's onUpdate also runs while
    // the scrub glides on after the wheel stops, so no extra scroll listeners or tickers are needed.
    hTween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      onUpdate: onTrack,
      scrollTrigger: {
        trigger: scroller,
        pin: true,
        scrub: 1,
        end: () => '+=' + distance(),
        invalidateOnRefresh: true,
        onRefresh: () => { measure(); onTrack(); }
      }
    });
    measure();
    onTrack();

    // Trackpad: horizontal swipe moves the page too. Passive, so the browser never waits for this
    // handler before scrolling (sideways overscroll is off in CSS, nothing to prevent).
    addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) scrollBy(0, e.deltaX);
    }, { passive: true });

    // Keyboard: ← → move one step (↑ ↓ PageUp/Down/Space work natively)
    addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollBy({ top: (e.key === 'ArrowRight' ? 1 : -1) * innerWidth * 0.6, behavior: 'smooth' });
      }
    });

    // Tab focus: bring the focused element on screen through the page scroll (never let the
    // browser scroll the clipped container sideways — that would shift the whole track)
    scroller.addEventListener('scroll', () => { scroller.scrollLeft = 0; });
    document.addEventListener('focusin', e => {
      if (!track.contains(e.target)) return;
      const r = e.target.getBoundingClientRect();
      if (r.left >= 0 && r.right <= innerWidth) return;
      const st = hTween.scrollTrigger;
      const x = r.left - track.getBoundingClientRect().left;
      scrollTo({ top: Math.max(st.start, Math.min(st.start + x - innerWidth * 0.3, st.end)), behavior: 'auto' });
    });

    // Fonts and images change widths → recalculate
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh());
    document.addEventListener('langchange', () => ScrollTrigger.refresh());
  }

  /* ---------- Reveal on enter (both modes) ---------- */
  // IntersectionObserver sees the track's transform, so it also works for the horizontal page
  // without a ScrollTrigger per block.
  const blocks = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    blocks.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: horizontal ? '0px -8% 0px 0px' : '0px 0px -8% 0px' });
    blocks.forEach(el => io.observe(el));
  }

  /* ---------- Anchor links (work in both modes) ---------- */
  function scrollToTarget(id) {
    const target = id === 'top' ? null : document.getElementById(id);
    const behavior = reduceMotion ? 'auto' : 'smooth';
    if (!target) return scrollTo({ top: 0, behavior });
    if (horizontal) {
      const st = hTween.scrollTrigger;
      const panel = target.closest('.panel') || target;
      const x = panel.getBoundingClientRect().left - track.getBoundingClientRect().left;
      scrollTo({ top: Math.min(st.start + x, st.end), behavior });
    } else {
      target.scrollIntoView({ behavior });
    }
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    scrollToTarget(id);
    if (id !== 'top') history.replaceState(null, '', '#' + id);
  });

  /* ---------- Hero video: desktop only, never with "reduce motion" ---------- */
  const video = $('.hero__video');
  if (video && horizontal && !reduceMotion) {
    video.src = innerWidth > 1600 ? video.dataset.srcLarge : video.dataset.srcSmall;
    video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
    video.play().catch(() => { /* autoplay blocked — poster stays */ });
    // Pause while the hero is off-screen
    new IntersectionObserver(([en]) => { en.isIntersecting ? video.play().catch(() => {}) : video.pause(); })
      .observe($('.hero'));
  }

  /* ---------- Hero entrance ---------- */
  if (hasGsap && !reduceMotion) {
    gsap.from('.hero__title .line > *', { yPercent: 105, duration: 1.3, ease: 'power3.out', stagger: .12, delay: .15 });
    gsap.from('.hero__eyebrow, .hero__lead, .hero .btn, .hero__hint', { y: 24, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: .1, delay: .55 });
  }

  /* ---------- Production steps ----------
     Desktop (horizontal page): one step is always active; hover (mouse), click or keyboard switches it and its photo
     and text fade in beside the list. Phones / tablets: an accordion — tapping a step opens it (and closes the
     others), tapping the open step closes it. ↑ ↓ Home End move between the step buttons. */
  const steps = $$('.process__step');
  const heads = steps.map(s => $('.process__head', s));
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function activate(step) {
    steps.forEach(s => {
      const on = s === step;
      s.classList.toggle('is-active', on);
      $('.process__head', s).setAttribute('aria-expanded', String(on));
    });
  }
  steps.forEach((s, i) => {
    heads[i].addEventListener('click', () => activate(!horizontal && s.classList.contains('is-active') ? null : s));
    heads[i].addEventListener('mouseenter', () => { if (horizontal && canHover) activate(s); });
    heads[i].addEventListener('focus', () => { if (horizontal && root.dataset.input === 'key') activate(s); });
    heads[i].addEventListener('keydown', e => {
      const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: heads.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      heads[(to + heads.length) % heads.length].focus();
    });
  });

  /* ---------- Tabs (About values): click / tap, ← → Home End; roving tabindex ---------- */
  $$('[data-tabs]').forEach(box => {
    const tabs = $$('[role="tab"]', box);
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).classList.toggle('is-active', on);
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select(tabs[(to + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ---------- Header colours (vertical page) ---------- */
  // Light text over the hero, solid stone bar once the hero has scrolled under the header.
  // (The horizontal page switches the logo and menu per section in onTrack above.)
  if (!horizontal) {
    const header = $('#header');
    const hero = $('.hero');
    const paint = overHero => {
      header.classList.toggle('on-dark', overHero);
      header.classList.toggle('is-solid', !overHero);
    };
    paint(hero.getBoundingClientRect().bottom > header.offsetHeight);
    if ('IntersectionObserver' in window) {
      let io = null;
      const watch = () => {
        if (io) io.disconnect();
        // the hero "intersects" while any of it is still visible below the header
        io = new IntersectionObserver(([en]) => paint(en.isIntersecting), { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` });
        io.observe(hero);
      };
      watch();
      matchMedia('(min-width: 640px)').addEventListener('change', watch); // header height changes here
    }
  }

  /* ---------- Contact form popup ---------- */
  // Native <dialog>: Esc closes it and keeps focus inside. A click on the dark area outside the box closes it too.
  const modal = $('#contact-modal');
  if (modal && modal.showModal) {
    const open = () => { modal.showModal(); root.classList.add('modal-open'); };
    const close = () => modal.close();
    $$('[data-modal-open]').forEach(b => b.addEventListener('click', open));
    $$('[data-modal-close]', modal).forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.addEventListener('close', () => root.classList.remove('modal-open'));
    // the page behind must not scroll (no overflow:hidden — hiding the scrollbar would shift the horizontal track)
    const block = e => {
      if (!root.classList.contains('modal-open')) return;
      const box = e.target.closest('.modal__box, textarea'); // these scroll themselves (contained in CSS)
      if (!box || box.scrollHeight <= box.clientHeight) e.preventDefault();
    };
    addEventListener('wheel', block, { passive: false });
    addEventListener('touchmove', block, { passive: false });
  }

  /* ---------- Contact form ---------- */
  // data-endpoint="" (no backend yet) → opens the visitor's e-mail app with the message filled in.
  // TODO: set data-endpoint on <form> to the client's form handler (POST, JSON body).
  const form = $('.form');
  if (form) {
    const status = $('.form__status', form);
    const say = (key, error = false) => { status.textContent = t(key); status.classList.toggle('is-error', error); };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = form.elements.name;
      const email = form.elements.email;
      const okName = name.value.trim().length > 1;
      const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
      name.closest('.field').classList.toggle('is-invalid', !okName);
      email.closest('.field').classList.toggle('is-invalid', !okEmail);
      name.setAttribute('aria-invalid', String(!okName));
      email.setAttribute('aria-invalid', String(!okEmail));
      if (!okName || !okEmail) { say('form.invalid', true); (okName ? email : name).focus(); return; }

      const data = Object.fromEntries(new FormData(form));
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        const to = ($('a[href^="mailto:"]') || {}).href?.replace('mailto:', '') || '';
        const body = `${data.name}${data.company ? ' — ' + data.company : ''}\n${data.email}\n\n${data.message || ''}`;
        location.href = `mailto:${to}?subject=${encodeURIComponent('Oliyatorg — ' + data.name)}&body=${encodeURIComponent(body)}`;
        say('form.mail');
        return;
      }
      say('form.sending');
      try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, lang }) });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        say('form.ok');
      } catch (err) {
        say('form.error', true); // entered data stays in the fields
      }
    });
  }
})();
