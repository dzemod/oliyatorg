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
  const ORPHAN_BLOCKS = 'h1 .line > *, h2, h3, p, .t-full, .t-short, dt, dd, li > a, figcaption, label, .btn > span, .tabs__tab';
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
  // html.is-v (set in <head>): the designed desktop layout, its sections stacked top to bottom
  const vertical = root.classList.contains('is-v');
  const sections = $$('.panel');

  // Reload when crossing the desktop breakpoint so the right layout is built.
  const desktopMq = matchMedia('(min-width: 1024px)');
  desktopMq.addEventListener('change', () => { if (!reduceMotion) location.reload(); });

  /* ---------- Motion: one calm sequence per section, once ----------
     Every animated block carries [data-reveal] (the hero's: [data-hero]). The inline script in <head> adds html.anim
     when motion is allowed and CSS hides those blocks only while it is on; here the start states are set, then
     html.anim comes off — if anything below throws, everything is simply visible.
     Each section has ONE trigger. When it enters, the section gets .in and its blocks play in reading order — label →
     heading → text → button → content, each role left to right, top to bottom — staggered 0.08 s, 0.6 s each
     (power2.out). The motion itself is a CSS transition of opacity (+ a 16px rise on desktop), so the compositor runs
     it and no script works per frame. The section's numbers count up from the same trigger. Everything is built once
     (never again on resize or language change) and each trigger is removed after it fires.
       · desktop: an IntersectionObserver, with a 16px rise
       · phones and tablets: an IntersectionObserver; opacity only, no movement
       · hero: the same sequence on load · reduced motion: none of this, the final state at once */
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
      const io = new IntersectionObserver(entries => entries.forEach(en => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        plays[sections.indexOf(en.target)]();
      }), { rootMargin: '0px 0px -15% 0px' });
      sections.forEach(sec => { if (!sec.classList.contains('hero')) io.observe(sec); });
      // Production cards (style.css): on desktop the section's .in plays all four, one after another; on phones and
      // tablets they are stacked, so each card plays on its own as it enters
      if (!root.classList.contains('is-h')) {
        const cardIo = new IntersectionObserver(entries => entries.forEach(en => {
          if (!en.isIntersecting) return;
          cardIo.unobserve(en.target);
          en.target.classList.add('in');
        }), { rootMargin: '0px 0px -10% 0px' });
        $$('.step').forEach(el => cardIo.observe(el));
      }
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

  /* ---------- Anchor links ---------- */
  function scrollToTarget(id) {
    const target = id === 'top' ? null : document.getElementById(id);
    const behavior = reduceMotion ? 'auto' : 'smooth';
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

  /* ---------- Hero video: desktop only, never with "reduce motion" ---------- */
  const video = $('.hero__video');
  if (video && vertical && !reduceMotion) {
    // starts after the page has loaded, so it never competes with the first screen's poster, fonts and images
    const start = () => {
      video.src = innerWidth > 1600 ? video.dataset.srcLarge : video.dataset.srcSmall;
      video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
      video.play().catch(() => { /* autoplay blocked — poster stays */ });
    };
    document.readyState === 'complete' ? start() : addEventListener('load', start, { once: true });
    // Pause while the hero is off-screen
    new IntersectionObserver(([en]) => { en.isIntersecting ? video.play().catch(() => {}) : video.pause(); })
      .observe($('.hero'));
  }

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
