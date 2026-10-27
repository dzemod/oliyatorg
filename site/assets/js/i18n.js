/* Translations.
   Ukrainian (default) is written directly in index.html — main.js reads it from the page.
   English lives here. Keys match the data-i18n / data-i18n-attr attributes in the HTML.
   To edit a text: UA → change it in index.html, EN → change it below. Simple HTML (<em>, <br>) is allowed. */
window.I18N = {
  en: {
    'meta.title': 'Oliyatorg — sunflower oil from Ukraine',
    'meta.desc': 'Oliyatorg is a Ukrainian producer and exporter of sunflower oil. Natural processing, double pressing, ESG principles.',

    'ui.skip': 'Skip to content',
    'ui.home': 'Oliyatorg — home',
    'ui.menu': 'Main menu',
    'ui.lang': 'Site language',
    'ui.openMenu': 'Open menu',
    'ui.closeMenu': 'Close menu',
    'ui.soon': 'Page coming soon',

    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.production': 'Production',
    'nav.certificates': 'Certificates',
    'nav.contacts': 'Contacts',

    'hero.eyebrow': 'Sunflower oil from Ukraine',
    'hero.l1': 'Natural processing.',
    'hero.l2': 'Responsible production.',
    'hero.l3': 'Exceptional quality.',
    'hero.lead': 'Oliyatorg is a Ukrainian producer and exporter of double-pressed sunflower oil',
    'hero.cta': 'Learn more',
    'hero.hint': 'Scroll',

    'about.eyebrow': 'About us',
    'about.title': 'From seed to oil —<br><em>with respect for nature</em>',
    'about.p1': 'Oliyatorg processes sunflower seeds from Ukrainian farmers with double pressing technology — no chemical solvents, keeping the natural properties of the raw material',
    'about.p1short': 'We double-press sunflower seeds from Ukrainian farmers — no chemical solvents',
    'about.tabs': 'Our values',
    'about.t1': 'Nature',
    'about.t2': 'People',
    'about.t3': 'Quality',
    'about.v1': 'No chemical solvents, our own 1.8-megawatt solar power plant',
    'about.v2': 'We support sport, culture and local initiatives',
    'about.v3': 'Quality control at every stage — from raw materials to finished product',
    'about.cta': 'About us',

    'numbers.eyebrow': 'Oliyatorg in numbers',
    'numbers.title': 'Production <em>scale</em>',
    'numbers.s1': 'year founded',
    'numbers.s2': 'thousand tons of seeds a year',
    'numbers.s3': 'thousand tons — elevator',
    'numbers.s4': 'thousand tons — oil tanks',

    'products.eyebrow': 'Products',
    'products.title': 'A natural product <em>from sunflower</em>',
    'products.all': 'All products',
    'products.c1.meta': 'Oil / double pressed',
    'products.c1.title': 'Unrefined oil',
    'products.c2.meta': 'Oil / linoleic and high-oleic',
    'products.c2.title': 'Refined oil',
    'products.c3.meta': 'Press cake / animal feed',
    'products.c3.title': 'Sunflower press cake',

    'production.eyebrow': 'Production',
    'production.title': 'Four steps <em>to quality oil</em>',
    'production.more': 'About production',
    'production.s1.title': 'Raw material intake',
    'production.s1.text': 'We take seeds from trusted farmers and check their quality at intake',
    'production.s2.title': 'Double pressing',
    'production.s2.text': 'Two-stage pressing without chemical solvents keeps the seeds’ properties',
    'production.s3.title': 'Oil and press cake',
    'production.s3.text': 'We get quality oil and press cake, a nutritious part of animal feed',
    'production.s4.title': 'Quality control & storage',
    'production.s4.text': 'A certified laboratory; oil is stored in tanks of up to 5,000 tons',


    'export.eyebrow': 'Export & partnership',
    'export.title': 'Ukrainian oil — <em>for international partners</em>',
    'export.b1.title': 'Where we deliver',
    'export.b1.text': 'USA, Europe, India, China, the Middle East, Africa, Australia',
    'export.b2.title': 'Long-term partnership',
    'export.b2.text': 'We build long-term partnerships with suppliers and customers',
    'export.b3.title': 'Consistent quality',
    'export.b3.text': 'From incoming control to the finished product — consistent characteristics and traceability',

    'contacts.eyebrow': 'Partnership',
    'contacts.title': 'Want to become our partner?',
    'contacts.cta': 'Contact us',
    'contacts.partner': 'Become a partner',
    'contacts.phone': 'Phone',
    'contacts.address': 'Address',
    'contacts.addressValue': '5&nbsp;Symona&nbsp;Petliury Street, Kyiv, Ukraine',
    'modal.title': 'Let’s talk <em>about cooperation</em>',
    'ui.close': 'Close',

    'form.name': 'Name',
    'form.company': 'Company',
    'form.message': 'Message',
    'form.send': 'Send',
    'form.invalid': 'Please enter your name and a valid e-mail',
    'form.sending': 'Sending…',
    'form.ok': 'Thank you! We will reply soon',
    'form.mail': 'Your e-mail app has opened with the message — just press “Send”',
    'form.error': 'Could not send. Please write to us by e-mail',

    'footer.copy': 'Oliyatorg. All rights reserved',
    'footer.vH': 'Horizontal version',
    'footer.vV': 'Vertical version',


    'alt.sunset': 'Sunflower field at sunset',
    'alt.unrefined': 'A bottle and a glass bowl of unrefined sunflower oil with seeds',
    'alt.refined': 'A bottle and a glass bowl of refined sunflower oil with seeds',
    'alt.meal': 'Sunflower press cake in a ceramic bowl',
    'alt.oilcake': 'A bottle of sunflower oil and pieces of press cake on a workshop table',
    'alt.tanks': 'Plant elevator and tanks among sunflower fields',
    'alt.clean': 'Cleaned sunflower seeds, close-up',
    'alt.press': 'Pressing workshop with modern equipment',
    'alt.lab': 'Lab technician testing oil samples',
    'alt.port': 'Container ship loading at a sea port',
    'alt.trucks': 'Oil tank trucks on a road among sunflower fields'
  },

  // Ukrainian strings that exist only in JS (form messages, menu labels)
  ukExtra: {
    'ui.closeMenu': 'Закрити меню',
    'form.invalid': 'Вкажіть ім’я та коректний e-mail',
    'form.sending': 'Надсилаємо…',
    'form.ok': 'Дякуємо! Ми скоро відповімо',
    'form.mail': 'Відкрився ваш поштовий застосунок із листом — залишилося натиснути «Надіслати»',
    'form.error': 'Не вдалося надіслати. Напишіть нам на e-mail'
  }
};
