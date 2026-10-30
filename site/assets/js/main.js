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
  const ORPHAN_BLOCKS = 'h1 .line > *, h2, h3, p, .t-full, .t-short, dt, dd, li > a, figcaption, label, .btn > span';
  let ties = [];
  const untie = ({ node, i }) => { if (node.nodeValue[i] === ' ') node.nodeValue = node.nodeValue.slice(0, i) + ' ' + node.nodeValue.slice(i + 1); };
  function tieLastWords() {
    ties.forEach(untie);
    // all writes first, then all reads, then the few undos: one layout for the whole page, not one per block
    const tied = $$(ORPHAN_BLOCKS).map(el => ({ el, tie: tieLast(el) })).filter(x => x.tie);
    // wider than its box — or, for an inline-block (hero lines), wider than its parent
    const over = tied.map(({ el }) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().width > el.parentElement.clientWidth + 1);
    ties = [];
    tied.forEach((x, k) => over[k] ? untie(x.tie) : ties.push(x.tie));
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
    document.dispatchEvent(new CustomEvent('beforelangchange'));   // the sideways strip notes where it stands
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
  nav.addEventListener('click', e => { if (e.target.closest('a[href]')) menu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { menu(false); burger.focus(); }
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', () => menu(false));

  /* ---------- Contacts screen: the photo ends before the header menu starts ---------- */
  // CSS reads --nav-left (desktop only) and keeps a gap, so no menu item ever meets the photo at any width.
  const navList = $('.nav__list');
  const fitContacts = () => root.style.setProperty('--nav-left', Math.round(navList.getBoundingClientRect().left) + 'px');
  fitContacts();
  addEventListener('resize', fitContacts);
  document.addEventListener('langchange', fitContacts);
  document.fonts && document.fonts.ready.then(fitContacts);

  /* ---------- Layout ---------- */
  const sections = $$('.panel');
  const track = $('#track');
  const scroller = $('.scroller');
  const strip = !!(track && track.hasAttribute('data-strip'));   // only the home page scrolls sideways
  const wideMq = matchMedia('(min-width: 1024px)');
  let hTween = null;      // the sideways strip's scrubbed tween (desktop home page), null when the page is vertical
  let reveals = [];       // blocks that play once as they enter: { el, play, done }
  let revealIo = null;

  /* ---------- Motion: one calm sequence per section, once ----------
     Every animated block carries [data-reveal] (the hero's: [data-hero]). The inline script in <head> adds html.anim
     when motion is allowed and CSS hides those blocks only while it is on; here the start states are set, then
     html.anim comes off — if anything below throws, everything is simply visible.
     Each section has ONE trigger. When it enters, the section gets .in and its blocks play in reading order — label →
     heading → text → button → content, each role left to right, top to bottom — staggered 0.08 s, 0.6 s each
     (power2.out). The motion itself is a CSS transition of opacity (+ a 16px rise on desktop), so the compositor runs
     it and no script works per frame. The section's numbers count up from the same trigger. Everything is built once
     (never again on resize or language change) and each trigger is removed after it fires.
       · desktop home page (sideways strip): the strip's own update (stripUpdate) when a block's left edge passes
         85% of the screen, with a 16px rise
       · desktop, other pages: an IntersectionObserver, with a 16px rise
       · phones and tablets: an IntersectionObserver; opacity only, no movement
       · hero: the same sequence on load · reduced motion: none of this, the final state at once
     When the window crosses 1024px, everything not yet played simply shows (finishReveals). */
  const animOn = root.classList.contains('anim');
  const endAnim = () => { root.classList.remove('anim'); window.__anim = true; };
  const STAGGER = .08;
  const role = el => el.matches('.eyebrow, .pill') ? 0 : el.matches('h1, h2') ? 1 : el.matches('.text, .hero__lead') ? 2 : el.matches('.btn, .hero__hint') ? 3 : 4;
  // the section's blocks in reading order (left to right in 40px bands, then top to bottom)
  function ordered(sec) {
    const box = $$('[data-reveal], [data-hero]', sec).map(el => { const r = el.getBoundingClientRect(); return { el, role: role(el), x: Math.round(r.left / 40), y: r.top }; });
    return box.sort((a, b) => a.role - b.role || a.x - b.x || a.y - b.y).map(b => b.el);
  }
  // numbers count up to the values in the HTML (from data-from, else 0), one after another; screen readers read the
  // .sr-only copy. Only the digits' text changes (tabular figures, so nothing around them moves).
  function counter(sec) {
    const nums = $$('.stat__num', sec).map(el => {
      const v = el.textContent.trim();
      return { el, to: parseFloat(v.replace(',', '.')), dec: (v.split(/[.,]/)[1] || '').length, from: +(el.dataset.from || 0) };
    });
    if (!nums.length) return null;
    // whole numbers as they are; decimals keep their places, with the language's decimal sign
    const show = (n, v) => { n.el.textContent = n.dec ? v.toFixed(n.dec).replace('.', root.lang === 'en' ? '.' : ',') : Math.round(v); };
    nums.forEach(n => show(n, n.from));
    return delay => {
      const t0 = performance.now() + delay * 1000, dur = 1400;
      const tick = now => {
        let busy = false;
        nums.forEach((n, i) => {
          const p = Math.min(1, Math.max(0, (now - t0 - i * STAGGER * 1000) / dur));
          show(n, n.from + (n.to - n.from) * (1 - (1 - p) ** 2));   // power2.out
          if (p < 1) busy = true;
        });
        if (busy) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
  }
  // Phones and tablets: the Partnership screen's label, heading and button are never hidden for a reveal. They sit on
  // a dark photo that loads lazily, and while their fade waited for the observer (or a jump / a page capture outran it)
  // the screen showed only a dark photo with no text — the "disappeared" heading. Static, they are always readable.
  if (!root.classList.contains('is-h')) $$('.contacts__cta [data-reveal]').forEach(el => el.removeAttribute('data-reveal'));
  const restore =() => $$('.stat__num').forEach(el => { const s = el.parentNode.querySelector('.sr-only'); if (s) el.textContent = s.textContent; });
  try {
    if (!animOn || reduceMotion || !('IntersectionObserver' in window)) endAnim();
    else {
      // every section's order is read before anything is written: one layout, no thrashing
      const orders = sections.map(ordered);
      const plays = sections.map((sec, k) => {
        orders[k].forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--d', (i * STAGGER).toFixed(2) + 's'); });
        const count = counter(sec);
        return () => { sec.classList.add('in'); if (count) count(.2); };
      });
      root.classList.add('fade');
      const once = (el, play) => reveals.push({ el, play, done: false });
      sections.forEach((sec, k) => { if (!sec.classList.contains('hero')) once(sec, plays[k]); });
      // Production cards (style.css): on desktop the section's .in plays all four, one after another; on phones and
      // tablets they are stacked, so each card plays on its own as it enters
      if (!root.classList.contains('is-h')) $$('.step').forEach(el => once(el, () => el.classList.add('in')));
      // [data-stagger] lists (the ESG rows): their items rise in one after another (24px, 0.6 s, 0.12 s apart)
      // when the list itself enters the screen, once
      const lists = $$('[data-stagger]');
      lists.forEach(list => [...list.children].forEach((el, i) => el.style.setProperty('--d', (i * .12).toFixed(2) + 's')));
      lists.forEach(list => once(list, () => list.classList.add('in')));
      // the sideways strip arms them itself once it is built (buildStrip); a vertical page right away
      if (!root.classList.contains('is-x')) armReveals();
      endAnim();
      // hero: on load, once its start state has painted
      const heroPlay = plays[sections.findIndex(s => s.classList.contains('hero'))];
      if (heroPlay) requestAnimationFrame(() => requestAnimationFrame(heroPlay));
    }
  } catch (err) {
    // never leave anything hidden
    root.classList.remove('fade');
    restore();
    endAnim();
    console.error(err);
  }

  // the hero's scroll hint loops only while the hero is on screen (an endless animation would restyle every frame)
  const hero = $('.hero');
  if (hero && 'IntersectionObserver' in window) new IntersectionObserver(([en]) => hero.classList.toggle('is-away', !en.isIntersecting)).observe(hero);

  // Reveals: each plays once. On the sideways strip the strip's own update plays it when its left edge passes 85% of
  // the screen (stripUpdate below); on a vertical page an IntersectionObserver as it rises past 85%.
  function fire(r) { if (r.done) return; r.done = true; r.play(); }
  function armReveals() {
    const left = reveals.filter(r => !r.done);
    if (!left.length || hTween) return;   // the strip checks its reveals on every update
    if ('IntersectionObserver' in window) {
      revealIo = new IntersectionObserver(entries => entries.forEach(en => {
        if (!en.isIntersecting) return;
        revealIo.unobserve(en.target);
        left.filter(r => r.el === en.target).forEach(fire);
      }), { rootMargin: '0px 0px -15% 0px' });
      left.forEach(r => revealIo.observe(r.el));
    } else left.forEach(fire);
  }
  // the layout changed under them (the window crossed 1024px): whatever has not played yet simply shows
  function finishReveals() {
    if (revealIo) { revealIo.disconnect(); revealIo = null; }
    reveals.forEach(fire);
    $$('.step').forEach(el => el.classList.add('in'));
  }

  /* ---------- Desktop home page: the sideways strip ----------
     Engine from the earlier sideways version (commit 5f7b827): ONE ScrollTrigger pins the page (.scroller, under the
     fixed header) and scrubs one timeline with the page's vertical scroll (scrub 0.6: a short glide). The timeline:
       1. the strip moves left (translateX) until the ESG panel fills the screen;
       2. the strip holds still for 2 screen heights of scroll while the ESG rows open one after another, top to bottom
          (row 1 is already open when the panel arrives; each row's openness is the CSS variable --o, 0–1);
       3. the strip moves on to the end.
     The timeline's time is measured in scroll pixels, so the pin adds exactly the strip's overflow plus the hold as
     scroll height, and the start and the end meet the page's own edges with no jump. Sideways trackpad swipes and ← →
     feed the same scroll; ↑ ↓, PageUp / PageDown and Space scroll natively. A 2px line on the bottom edge shows the
     progress. Built when the window grows past 1024px, rebuilt on resize, torn down below 1024px (setMode); never
     with "reduce motion". */
  const bar = $('.hprogress__fill');
  const esg = $('#esg');
  const esgRows = esg ? $$('.esg-row', esg) : [];
  let ctx = null;
  let geo = [];          // the sections' places on the strip (px), measured at build
  let esgL = 0, hold = 0, dist = 0;
  let spotNow = null;    // where the strip stands: { p: section, f: 0–1 into it, h: 0–1 through the ESG hold }
  const distance = () => Math.max(0, track.scrollWidth - root.clientWidth);
  const st = () => hTween.scrollTrigger;
  // jump without the scrub's glide (language switch, keyboard focus, mode switch, resize)
  const jumpTo = y => {
    scrollTo(0, y);
    ScrollTrigger.update();
    const tw = st().getTween();
    if (tw) tw.progress(1);
  };
  // strip position x (px) → scroll offset into the pin: the hold sits at x = esgL
  const offsetForX = (x, h = 0) => x < esgL ? x : x > esgL ? x + hold : esgL + h * hold;
  const stripTop = (p, f = 0, h = 0) => {
    const g = geo.find(g => g.p === p) || { l: p.offsetLeft, w: p.offsetWidth };
    return Math.min(st().start + offsetForX(Math.min(g.l + f * g.w, dist), h), st().end);
  };
  // the section at the screen's left edge, from the timeline's own time (no layout reads), so it still answers right
  // when the window has just crossed 1024px and the strip's CSS is already gone
  const stripSpot = () => spotNow || { p: sections[0], f: 0, h: 0 };

  let gsapLoading = null;
  function loadGsap() {
    if (window.gsap && window.ScrollTrigger) return Promise.resolve();
    const base = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/';
    const add = src => new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
    return gsapLoading || (gsapLoading = add(base + 'gsap.min.js').then(() => add(base + 'ScrollTrigger.min.js')));
  }

  function buildStrip() {
    gsap.registerPlugin(ScrollTrigger);
    const setBar = gsap.quickSetter(bar, 'scaleX');
    // everything the timeline needs is measured once here (and again on every rebuild), never while scrolling
    const x0 = track.getBoundingClientRect().left;
    geo = sections.map(p => ({ p, l: p.offsetLeft, w: p.offsetWidth }));
    const pending = reveals.filter(r => !r.done).map(r => ({ r, l: r.el.getBoundingClientRect().left - x0 }));
    const rows = esgRows.length > 1 ? esgRows : [];
    dist = distance();
    esgL = rows.length ? Math.min(esg.offsetLeft, dist) : dist;
    hold = rows.length ? innerHeight * 2 : 0;
    const vw = root.clientWidth;
    function stripUpdate() {
      const t = this.time();
      const x = t <= esgL ? t : t <= esgL + hold ? esgL : t - hold;
      const g = geo.filter(g => g.l <= x + 1).pop() || geo[0];
      spotNow = { p: g.p, f: g.w ? (x - g.l) / g.w : 0, h: hold && t > esgL ? Math.min(1, (t - esgL) / hold) : 0 };
      setBar(this.progress());
      pending.forEach(q => { if (!q.r.done && q.l - x < vw * .85) fire(q.r); });
    }
    ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: stripUpdate,
        scrollTrigger: { trigger: scroller, start: 'top top', end: '+=' + (dist + hold), pin: true, scrub: .6 }
      });
      tl.to(track, { x: -esgL, duration: Math.max(esgL, .001) }, 0);
      if (rows.length) {
        // row 1 open on arrival; then each next row opens while the one before closes
        gsap.set(rows, { '--o': i => (i ? 0 : 1) });
        const step = hold / (rows.length - 1);
        rows.slice(1).forEach((row, k) => {
          tl.to(rows[k], { '--o': 0, duration: step, ease: 'power1.inOut' }, esgL + k * step)
            .to(row, { '--o': 1, duration: step, ease: 'power1.inOut' }, esgL + k * step);
        });
      }
      tl.to(track, { x: -dist, duration: Math.max(dist - esgL, .001) }, esgL + hold);
      hTween = tl;
    });
    stripUpdate.call(hTween);   // a page reloaded mid-way plays what is already on screen
    // lazy images load as the strip brings them near; once the page has loaded, the rest follow, so a fast scroll
    // never meets an empty frame
    const eager = () => $$('img[loading="lazy"]', track).forEach(img => { img.loading = 'eager'; });
    document.readyState === 'complete' ? setTimeout(eager, 300) : addEventListener('load', () => setTimeout(eager, 300), { once: true });
  }
  function destroyStrip() {
    if (!ctx) return;
    ctx.revert();   // unpins, removes the transform, the rows' --o and the trigger
    ctx = hTween = spotNow = null;
    track.style.transform = bar.style.transform = '';
  }
  // rebuild after a resize (the panels' widths follow the screen), keeping the same spot on screen
  function rebuildStrip() {
    if (!hTween) return;
    const s = stripSpot();
    destroyStrip();
    buildStrip();
    ScrollTrigger.refresh();   // sizes the new pin first: before that the page is one screen tall and the jump would land on 0
    jumpTo(stripTop(s.p, s.f, s.h));
  }

  // The mode follows the window: ≥1024px without "reduce motion" the desktop layout (html.is-h.is-v), and on the home
  // page the sideways strip (html.is-x) on top of it; below, the vertical page. The section on screen stays on screen.
  // the vertical page's section on screen, noted while scrolling — never right after a resize, when the layout has
  // already changed under it
  const sectionOnScreen = () => sections.find(s => s.getBoundingClientRect().bottom > innerHeight * .3);
  let onScreen = null, notedW = innerWidth, noting = false;
  addEventListener('scroll', () => {
    if (hTween || noting) return;
    noting = true;
    requestAnimationFrame(() => {
      noting = false;
      if (innerWidth === notedW) onScreen = sectionOnScreen();
      notedW = innerWidth;
    });
  }, { passive: true });

  function setMode(first) {
    const wide = wideMq.matches && !reduceMotion;
    const from = first ? null : hTween ? stripSpot().p : onScreen || sectionOnScreen();
    if (!first) finishReveals();
    root.classList.toggle('is-h', wide);
    root.classList.toggle('is-v', wide);
    if (!(wide && strip)) {
      const had = !!hTween;
      destroyStrip();
      root.classList.remove('is-x');
      if (had) {
        // ScrollTrigger's own (delayed) resize refresh would put back the old scroll offset: run it now, then land on
        // the section that was on screen
        ScrollTrigger.refresh();
        if (from) from.scrollIntoView({ behavior: 'auto' });
        onScreen = from;
      }
      return;
    }
    root.classList.add('is-x');
    loadGsap().then(() => {
      if (hTween || !root.classList.contains('is-x')) return;
      buildStrip();
      if (from) { ScrollTrigger.refresh(); jumpTo(stripTop(from)); }
    }).catch(() => {
      // no GSAP (CDN blocked): the desktop sections simply stack top to bottom
      root.classList.remove('is-x');
      armReveals();
    });
  }
  setMode(true);
  wideMq.addEventListener('change', () => setMode(false));

  if (strip) {
    // Trackpad: a sideways swipe moves the strip too. Passive, so the browser never waits for this handler.
    addEventListener('wheel', e => {
      if (!hTween || e.ctrlKey || root.classList.contains('modal-open')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) scrollBy(0, e.deltaX);
    }, { passive: true });
    // Keyboard: ← → move along the strip (↑ ↓ PageUp / PageDown / Space / Home / End scroll natively)
    addEventListener('keydown', e => {
      if (!hTween || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest('input, textarea, select, [contenteditable], dialog')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollBy({ top: (e.key === 'ArrowRight' ? 1 : -1) * innerWidth * .6, behavior: 'smooth' });
      }
    });
    // Tab focus: bring the focused element on screen through the page scroll (the strip itself is clipped, so the
    // browser never scrolls it sideways)
    document.addEventListener('focusin', e => {
      if (!hTween || !track.contains(e.target)) return;
      const r = e.target.getBoundingClientRect();
      if (r.left >= 0 && r.right <= root.clientWidth) return;
      const x = r.left - track.getBoundingClientRect().left;
      jumpTo(st().start + offsetForX(Math.max(0, Math.min(x - innerWidth * .3, dist))));
    });
    // Language: the texts change, the strip is re-measured, and the same spot stays on screen
    let spot = null;
    document.addEventListener('beforelangchange', () => { spot = hTween ? stripSpot() : null; });
    document.addEventListener('langchange', () => {
      if (!hTween) return;
      ScrollTrigger.refresh();
      if (spot) jumpTo(stripTop(spot.p, spot.f, spot.h));
      spot = null;
    });
    // fonts and images settle the widths: re-measure
    const refresh = () => { if (hTween) ScrollTrigger.refresh(); };
    document.fonts && document.fonts.ready.then(refresh);
    addEventListener('load', refresh);
    // resize: the panels follow the screen, so the timeline is rebuilt (once the resizing has stopped)
    let resizeTimer;
    addEventListener('resize', () => {
      if (!hTween) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(rebuildStrip, 250);
    });
    // ESG: a click on a row opens it — the page scrolls to that row's point of the hold
    esgRows.forEach((row, i) => row.addEventListener('click', () => {
      if (!hTween || !hold) return;
      scrollTo({ top: st().start + esgL + hold * i / (esgRows.length - 1), behavior: 'smooth' });
    }));
  }

  /* ---------- Anchor links ---------- */
  function scrollToTarget(id) {
    const target = id === 'top' ? null : document.getElementById(id);
    const behavior = reduceMotion ? 'auto' : 'smooth';
    if (hTween) return scrollTo({ top: target ? stripTop(target.closest('.panel') || target) : 0, behavior });
    if (!target) return scrollTo({ top: 0, behavior });
    target.scrollIntoView({ behavior });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    scrollToTarget(id);
    if (id !== 'top') history.replaceState(null, '', '#' + id);
  });

  /* ---------- Products page: the hero's product links ----------
     The link of the product on screen (or the one in the address) gets aria-current: CSS shows its gold dot. */
  const jump = $('[data-jump]');
  if (jump) {
    const links = $$('a[href^="#"]', jump);
    const mark = id => links.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + id));
    if (location.hash) mark(location.hash.slice(1));
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) mark(en.target.id); }), { rootMargin: '-45% 0px -45% 0px' });
      links.forEach(a => { const s = document.getElementById(a.getAttribute('href').slice(1)); if (s) spy.observe(s); });
    }
  }

  /* ---------- Hero video: every screen size, never with "reduce motion" ---------- */
  const video = $('.hero__video');
  if (video && !reduceMotion) {
    // starts after the page has loaded, so it never competes with the first screen's poster, fonts and images
    const start = () => {
      video.src = matchMedia('(max-width: 767px)').matches ? video.dataset.srcMobile
        : innerWidth > 1600 ? video.dataset.srcLarge : video.dataset.srcSmall;
      // shown only once it really plays: if autoplay is blocked (e.g. Low Power Mode) the poster stays, no frozen frame or play button
      video.addEventListener('playing', () => video.classList.add('is-ready'), { once: true });
      video.play().catch(() => { /* autoplay blocked — poster stays */ });
    };
    document.readyState === 'complete' ? start() : addEventListener('load', start, { once: true });
    // Pause while the hero is off-screen
    new IntersectionObserver(([en]) => { en.isIntersecting ? video.play().catch(() => {}) : video.pause(); })
      .observe($('.hero'));
  }

  /* ---------- About: values tabs ----------
     Three tabs switch the photo (stacked, crossfade) and the text under them. Auto-advance every 6 s in a loop: the gold
     line under the active tab is a CSS animation, and its end moves on to the next tab. It runs only while the section
     is on screen, pauses on hover and while focus is inside, and stops for good once the visitor picks a tab (click or
     ← → Home End, which also move the focus). Reduced motion: no auto-advance, instant switch. */
  const tabsBox = $('[data-about-tabs]');
  if (tabsBox) {
    const tabs = $$('[role="tab"]', tabsBox), texts = $$('[role="tabpanel"]', tabsBox), imgs = $$('[data-about-img]');
    const fill = $('.about-tabs__fill', tabsBox);
    let cur = 0, stopped = reduceMotion, hover = false, focused = false, seen = false;
    // the fill animation starts over for each tab (the class comes off, a reflow, and back on)
    const restart = () => {
      tabsBox.classList.remove('is-auto');
      if (stopped) return;
      void fill.offsetWidth;
      tabsBox.classList.add('is-auto');
    };
    const pause = () => tabsBox.classList.toggle('is-paused', hover || focused || !seen);
    function show(k, moveFocus) {
      cur = (k + tabs.length) % tabs.length;
      tabs.forEach((t, i) => { t.setAttribute('aria-selected', String(i === cur)); t.tabIndex = i === cur ? 0 : -1; });
      texts.forEach((p, i) => p.classList.toggle('is-active', i === cur));
      imgs.forEach(img => img.classList.toggle('is-active', +img.dataset.aboutImg === cur));
      tabsBox.style.setProperty('--i', cur);
      if (moveFocus) tabs[cur].focus();
      restart();
    }
    fill.addEventListener('animationend', () => { if (!stopped) show(cur + 1); });
    tabs.forEach((t, i) => t.addEventListener('click', () => { stopped = true; show(i); }));
    tabsBox.addEventListener('keydown', e => {
      if (!e.target.closest('[role="tab"]')) return;
      const k = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (k === undefined) return;
      e.preventDefault();   // the sideways strip's own ← → never sees it
      stopped = true;
      show(k, true);
    });
    tabsBox.addEventListener('mouseenter', () => { hover = true; pause(); });
    tabsBox.addEventListener('mouseleave', () => { hover = false; pause(); });
    tabsBox.addEventListener('focusin', () => { focused = true; pause(); });
    tabsBox.addEventListener('focusout', e => { if (!tabsBox.contains(e.relatedTarget)) { focused = false; pause(); } });
    // only while the section is on screen (the observer follows the sideways strip's transform too)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { seen = en.isIntersecting; pause(); }, { threshold: .35 }).observe(tabsBox.closest('.panel'));
    } else seen = true;
    pause();
    restart();
  }

  /* ---------- Certificates slider (home): one card per step ----------
     The row moves with a transform (0.5s, CSS); arrows, swipe / drag (pointer events) and ← → while focus is inside.
     A drag never opens the lightbox: the click after it is swallowed. Tabbing to a card brings it into view. */
  const slider = $('[data-slider]');
  if (slider) {
    const track = $('.slider__track', slider);
    const items = $$('.cert', track);
    const prev = $('[data-slider-prev]'), next = $('[data-slider-next]');
    let i = 0, x = 0;
    const metrics = () => {
      const step = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : 0;
      const end = items[items.length - 1];
      const max = Math.max(0, end.offsetLeft + end.offsetWidth - slider.clientWidth);
      return { step, max, last: step ? Math.ceil(max / step - .01) : 0 };
    };
    const go = k => {
      const m = metrics();
      i = Math.max(0, Math.min(k, m.last));
      x = Math.min(i * m.step, m.max);
      track.style.transform = `translateX(${-x}px)`;
      prev.disabled = i === 0;
      next.disabled = i === m.last;
    };
    prev.addEventListener('click', () => go(i - 1));
    next.addEventListener('click', () => go(i + 1));
    const off = () => root.classList.contains('is-x');   // the sideways strip shows all five cards in one row: no slider
    slider.addEventListener('keydown', e => {
      if (off() || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      go(i + (e.key === 'ArrowRight' ? 1 : -1));
    });
    slider.addEventListener('focusin', e => {
      const item = e.target.closest('.cert');
      if (!item || off()) return;
      const { step } = metrics(), l = item.offsetLeft, r = l + item.offsetWidth;
      if (l < x) go(Math.floor(l / step));
      else if (r > x + slider.clientWidth) go(Math.ceil((r - slider.clientWidth) / step));
      slider.scrollLeft = 0;   // the browser may scroll the clipped window to the focused card: the transform does it
    });
    // swipe / drag: the row follows the pointer, then snaps one card on (> 40px) or back
    let x0 = null, dx = 0, dragged = false;
    slider.addEventListener('pointerdown', e => {
      if (e.button || off()) return;
      x0 = e.clientX; dx = 0; dragged = false;
    });
    slider.addEventListener('pointermove', e => {
      if (x0 === null) return;
      dx = e.clientX - x0;
      if (!dragged && Math.abs(dx) > 6) { dragged = true; slider.classList.add('is-dragging'); slider.setPointerCapture(e.pointerId); }
      if (dragged) track.style.transform = `translateX(${-x + dx}px)`;
    });
    const release = () => {
      if (x0 === null) return;
      x0 = null;
      slider.classList.remove('is-dragging');
      if (dragged) go(i + (dx < -40 ? 1 : dx > 40 ? -1 : 0));
    };
    slider.addEventListener('pointerup', release);
    slider.addEventListener('pointercancel', release);
    slider.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
    addEventListener('resize', () => go(i));
    document.addEventListener('langchange', () => go(i));
    go(0);
  }

  /* ---------- Certificates: language-specific files + lightbox ---------- */
  // A certificate that exists in two languages (Halal) carries its English files in data-*-en: the thumbnail, the
  // large image and the PDF follow the site language.
  const certFile = (el, k) => (lang === 'en' && el.dataset[k + 'En']) || el.dataset[k];
  const certThumbs = () => $$('[data-srcset-en]').forEach(el => { $('img', el).srcset = lang === 'en' ? el.dataset.srcsetEn : el.dataset.srcsetUk; });
  certThumbs();
  document.addEventListener('langchange', certThumbs);

  const lightbox = $('#cert-lightbox');
  if (lightbox && lightbox.showModal) {
    const certs = $$('[data-cert]');
    const img = $('.lightbox__img', lightbox), title = $('.lightbox__title', lightbox), pdf = $('.lightbox__pdf', lightbox);
    let k = 0;
    const show = i => {
      k = (i + certs.length) % certs.length;
      const el = certs[k], name = $('.cert__title', el).textContent;
      img.classList.remove('is-ready');
      img.onload = () => img.classList.add('is-ready');
      img.src = certFile(el, 'large');
      img.alt = name;
      title.textContent = name;
      pdf.href = certFile(el, 'pdf');
    };
    certs.forEach((el, i) => el.addEventListener('click', () => { show(i); lightbox.showModal(); root.classList.add('modal-open'); }));
    $$('[data-lightbox-step]', lightbox).forEach(b => b.addEventListener('click', () => show(k + +b.dataset.lightboxStep)));
    $('[data-lightbox-close]', lightbox).addEventListener('click', () => lightbox.close());
    // a click on the dark area around the image closes it (Esc: native <dialog>)
    lightbox.addEventListener('click', e => { if (e.target === lightbox || e.target.matches('.lightbox__figure')) lightbox.close(); });
    lightbox.addEventListener('close', () => root.classList.remove('modal-open'));
    lightbox.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(k + (e.key === 'ArrowRight' ? 1 : -1)); }
    });
    // phones: swipe left / right
    let x0 = null;
    lightbox.addEventListener('touchstart', e => { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    lightbox.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) show(k + (dx < 0 ? 1 : -1));
    });
    document.addEventListener('langchange', () => { if (lightbox.open) show(k); });
  }

  /* ---------- Contact form popup ---------- */
  // Native <dialog>: Esc closes it and keeps focus inside. A click on the dark area outside the box closes it too.
  const modal = $('#contact-modal');
  if (modal && modal.showModal) {
    const open = () => { modal.showModal(); root.classList.add('modal-open'); };
    const close = () => modal.close();
    // a product's "Request cooperation" button (data-product: the i18n key of its name) fills in the message
    const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };
    const message = $('#f-message', modal);
    $$('[data-modal-open]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.product && message) message.value = t('pp.ask').replace('{p}', plain(t(b.dataset.product)));
      open();
    }));
    $$('[data-modal-close]', modal).forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.addEventListener('close', () => root.classList.remove('modal-open'));
    // the page behind must not scroll (no overflow:hidden — hiding the scrollbar would shift the page sideways)
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
