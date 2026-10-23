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

    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.production': 'Production',
    'nav.certificates': 'Certificates',
    'nav.contacts': 'Contacts',

    'hero.eyebrow': 'Sunflower oil from Ukraine',
    'hero.l1': 'Natural processing.',
    'hero.l2': 'Responsible production.',
    'hero.l3': 'Exceptional quality.',
    'hero.lead': 'Oliyatorg is a Ukrainian producer and exporter of double-pressed sunflower oil.',
    'hero.cta': 'Learn more',
    'hero.hint': 'Scroll',

    'about.eyebrow': 'About us',
    'about.title': 'From field<br>to bottle',
    'about.p1': 'Oliyatorg processes sunflowers grown on the fertile lands of Ukraine. We combine modern equipment with the natural double-pressing technology to preserve the taste, colour and valuable properties of the oil.',
    'about.p2': 'We work transparently and responsibly — from seed intake to shipment to partners in Ukraine and abroad.',
    'about.cta': 'About us',

    'numbers.eyebrow': 'Oliyatorg in numbers',
    'numbers.title': 'A scale <em>partners trust</em>',
    'numbers.s1': 'years in the oil market',
    'numbers.s2': 'thousand tonnes of seeds processed every year',
    'numbers.s3': 'countries we export to',
    'numbers.s4': 'partners in Ukraine and worldwide',

    'products.eyebrow': 'Products',
    'products.title': 'An honest product <em>from sunflower</em>',
    'products.intro': 'Three products — one culture of quality. Every batch is checked in our laboratory.',
    'products.all': 'All products',
    'products.c1.title': 'Unrefined oil',
    'products.c1.text': 'The rich taste and aroma of the seed. Double pressed, no chemical treatment.',
    'products.c2.title': 'Refined oil',
    'products.c2.text': 'Clean, light and odourless. For cooking and the food industry.',
    'products.c3.title': 'Sunflower meal',
    'products.c3.text': 'A valuable protein ingredient for compound feed and livestock.',

    'production.eyebrow': 'Production',
    'production.title': 'Four steps <em>to flawless oil</em>',
    'production.intro': 'A modern line, mechanical pressing and control at every stage.',
    'production.more': 'About production',
    'production.s1.title': 'Raw material intake',
    'production.s1.text': 'Every batch of seeds is checked for moisture, oil content and purity before unloading.',
    'production.s2.title': 'Cleaning',
    'production.s2.text': 'Multi-stage cleaning from impurities and dust — only selected seeds go into production.',
    'production.s3.title': 'Double pressing',
    'production.s3.text': 'Two stages of mechanical pressing yield more oil and keep its natural properties.',
    'production.s4.title': 'Quality control & storage',
    'production.s4.text': 'Our laboratory tests every batch, and the finished oil is stored in tanks with controlled conditions.',

    'values.eyebrow': 'Values · ESG',
    'values.title': 'What <em>we believe in</em>',
    'values.intro': 'We follow ESG principles: we protect the environment, support people and do business honestly.',
    'values.v1.title': 'Natural processing',
    'values.v1.text': 'Mechanical pressing without unnecessary chemicals. The oil keeps everything nature gave it.',
    'values.v2.title': 'Responsible production',
    'values.v2.text': 'We use resources carefully and care for people and the communities where we work.',
    'values.v3.title': 'Exceptional quality',
    'values.v3.text': 'Laboratory control at every stage and compliance with international standards.',

    'export.eyebrow': 'Export & partnership',
    'export.title': 'Ukrainian oil — <em>for partners all over the world</em>',
    'export.b1.title': 'Bulk and packaged',
    'export.b1.text': 'We deliver by truck, rail and sea.',
    'export.b2.title': 'Long-term partnership',
    'export.b2.text': 'Open to cooperation with distributors and manufacturers.',
    'export.cta': 'Become a partner',

    'contacts.eyebrow': 'Partnership',
    'contacts.title': 'Want to become our partner?',
    'contacts.cta': 'Contact us',
    'contacts.partner': 'Become a partner',
    'contacts.phone': 'Phone',
    'contacts.address': 'Address',
    'contacts.addressValue': '5&nbsp;Symona Petliury St., Kyiv, Ukraine',
    'modal.title': 'Let’s talk <em>about cooperation</em>',
    'ui.close': 'Close',

    'form.name': 'Name',
    'form.company': 'Company',
    'form.message': 'Message',
    'form.send': 'Send',
    'form.invalid': 'Please enter your name and a valid e-mail.',
    'form.sending': 'Sending…',
    'form.ok': 'Thank you! We will reply soon.',
    'form.mail': 'Your e-mail app has opened with the message — just press “Send”.',
    'form.error': 'Could not send. Please write to us by e-mail.',

    'footer.copy': 'Oliyatorg. All rights reserved.',

    'photo.values': 'Land and people',

    'alt.sunset': 'Sunflower field at sunset',
    'alt.detail': 'A sunflower in close-up',
    'alt.unrefined': 'A bottle and a glass bowl of unrefined sunflower oil with seeds',
    'alt.refined': 'A bottle and a glass bowl of refined sunflower oil with seeds',
    'alt.meal': 'Sunflower meal in a ceramic bowl',
    'alt.tanks': 'Plant elevator and tanks among sunflower fields',
    'alt.clean': 'Cleaned sunflower seeds, close-up',
    'alt.press': 'Pressing workshop with modern equipment',
    'alt.lab': 'Lab technician testing oil samples',
    'alt.aerial2': 'Sunflower field from a bird’s-eye view',
    'alt.port': 'Container ship loading at a sea port',
    'alt.trucks': 'Oil tank trucks on a road among sunflower fields'
  },

  // Ukrainian strings that exist only in JS (form messages, menu labels)
  ukExtra: {
    'ui.closeMenu': 'Закрити меню',
    'form.invalid': 'Вкажіть ім’я та коректний e-mail.',
    'form.sending': 'Надсилаємо…',
    'form.ok': 'Дякуємо! Ми скоро відповімо.',
    'form.mail': 'Відкрився ваш поштовий застосунок із листом — залишилося натиснути «Надіслати».',
    'form.error': 'Не вдалося надіслати. Напишіть нам на e-mail.'
  }
};
