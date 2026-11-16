/**
 * Italy meets America – Google Form for the companies (data intake).
 *
 * Two parts (decision AGO 04/11, story first: it is what the slide promises):
 *   Part 1 · Company story  – the marketing team, in English, max 30 minutes (name, presentation, mission,
 *                             vision, quote, buyers, signature products, offer for America, title on the photo).
 *   Part 2 · Practical data – a few minutes (legal name, Google Maps link of the headquarters, sector,
 *                             website, emails, social, photo link, contact person, consent).
 * The address is NOT typed: the company pastes the Google Maps link of its headquarters and the script
 * reads street, postcode, city (in English), province and region from Google Maps (no typos).
 *
 * Menu "Italy meets America":
 *   Create the company form   – once: creates the form, links it to this sheet, installs the trigger.
 *   Rebuild the company form  – same form and same link, questions rebuilt (after a change of this file).
 *   Short link and slide      – forms.gle short link, written in the presentation slide.
 * imaOnFormSubmit(e): every answer becomes a row of "Companies" in "draft" (same company still in draft:
 * the row is updated). Photos by link (file upload in Google Forms needs a Google account).
 */
var IMA_FORM = {
  TITLE: 'Italy meets America 2026 – Company profile',
  RESPONSES_TAB: '_Form responses',
  PROP_ID: 'IMA_FORM_ID',
  SLIDE_ID: '1wDVdjd4WqvSsnD1pmadpbYyvtH0VWmo475J7agk7WlY', // "Cosa chiediamo alle aziende"
  // Question titles = keys of e.namedValues: do not rename them without changing imaFormToRow_.
  Q: {
    name: 'Nome commerciale',
    legal: 'Ragione sociale',
    maps: 'Sede su Google Maps (link)',
    sector: 'Settore',
    since: 'Anno di fondazione',
    website: 'Sito web',
    email1: 'Email pubblica per i buyer',
    email2: 'Seconda email pubblica (facoltativa)',
    facebook: 'Facebook (link)',
    instagram: 'Instagram (link)',
    linkedin: 'LinkedIn (link)',
    youtube: 'YouTube (link)',
    whatsapp: 'WhatsApp (link wa.me)',
    photosLink: 'Link a foto e logo',
    photoCredit: 'Credito fotografico (facoltativo)',
    contactName: 'Referente per la scheda (nome e cognome)',
    contactRole: 'Ruolo del referente',
    contactEmail: 'Email del referente',
    headline: 'Title on the photo',
    intro: 'Presentation',
    bold: 'Sentence to highlight in bold',
    mission: 'Mission',
    vision: 'Vision',
    quote: 'Quote',
    quoteAuthor: 'Quote – author (first and last name)',
    quoteRole: 'Quote – role',
    who: 'Who should connect',
    discover: 'What to discover',
    sig1: 'Signature 1',
    sig2: 'Signature 2 (optional)',
    sig3: 'Signature 3 (optional)',
    events: 'Find us in the US (optional)',
    bring: 'What they bring to America',
    consent: 'Autorizzazione',
  },
  // Same limits as src/schema.ts
  MAX: { headline: 32, intro: 730, mission: 60, vision: 60, quote: 90, who: 120, discover: 120, signature: 40, bring: 250 },
};

// --- form ---------------------------------------------------------------------------------------

function imaBuildItems_(form, sectors) {
  var Q = IMA_FORM.Q, M = IMA_FORM.MAX;
  var url = function (title, help, required) {
    return form.addTextItem().setTitle(title).setHelpText(help || '').setRequired(!!required)
      .setValidation(FormApp.createTextValidation().requireTextIsUrl().setHelpText('Incollate un link completo, che inizia con https://').build());
  };
  var short = function (title, help, max, required) {
    var it = form.addTextItem().setTitle(title).setHelpText(help || '').setRequired(!!required);
    if (max) it.setValidation(FormApp.createTextValidation().requireTextLengthLessThanOrEqualTo(max).setHelpText('Massimo ' + max + ' caratteri').build());
    return it;
  };
  var long = function (title, help, max, required) {
    var it = form.addParagraphTextItem().setTitle(title).setHelpText(help || '').setRequired(!!required);
    if (max) it.setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(max).setHelpText('Massimo ' + max + ' caratteri').build());
    return it;
  };

  // --- Part 1: the company story (marketing, in English, about 30 minutes): what the slide promises ---
  form.addSectionHeaderItem().setTitle("Parte 1 · Il racconto dell'azienda – in English")
    .setHelpText('Circa 30 minuti. Il pubblico è americano, quindi i testi vanno in inglese. ' +
      'I limiti di caratteri servono a far stare la scheda nella pagina. Gli esempi vengono dalla scheda Bellavista.');
  short(Q.name, 'Come deve comparire nel titolo della scheda. Es. Bellavista', 60, true);
  long(Q.intro, 'Max ' + M.intro + ' characters. History, territory, craftsmanship. Ex. Founded in 1977 in Erbusco, nestled in the rolling hills of Franciacorta…', M.intro, true);
  short(Q.bold, 'Copy here, exactly as written above, the ONE sentence of the presentation to print in bold. Ex. Every bottle embodies the uncompromised craftsmanship of Made in Italy', 300, false);
  short(Q.mission, 'Max ' + M.mission + '. Ex. Artisanal Excellence & Terroir', M.mission, true);
  short(Q.vision, 'Max ' + M.vision + '. Ex. The Global Benchmark for Metodo Classico', M.vision, true);
  short(Q.quote, 'Max ' + M.quote + ', without quotation marks. Ex. Wine is the art of listening to the land and letting time do its work.', M.quote, true);
  short(Q.quoteAuthor, 'Ex. Vittorio Moretti', 60, true);
  short(Q.quoteRole, 'Ex. Founder', 60, false);
  short(Q.who, 'Max ' + M.who + '. The ideal American buyer or partner. Ex. Sommeliers, fine wine buyers & hospitality directors.', M.who, true);
  short(Q.discover, 'Max ' + M.discover + '. Ex. Metodo Classico Franciacorta cuvées.', M.discover, true);
  short(Q.sig1, 'Max ' + M.signature + '. Signature product or line. Ex. Alma Grande Cuvée', M.signature, true);
  short(Q.sig2, 'Max ' + M.signature, M.signature, false);
  short(Q.sig3, 'Max ' + M.signature, M.signature, false);
  long(Q.bring, 'Max ' + M.bring + '. Your offer for the American market. Ex. The pinnacle of Italian Metodo Classico sparkling wines…', M.bring, true);
  short(Q.headline, 'Max ' + M.headline + ' characters. Ex. The Art of Time', M.headline, true);
  long(Q.events, 'Up to 4 US fairs, events or stores, ONE PER LINE, with the link if any. Ex.\nVinitaly USA | https://www.vinitalyusa.com\nFood & Wine Classic in Aspen', 600, false);

  // --- Part 2: practical data (a few minutes; an assistant can help) --------------------------------
  form.addPageBreakItem().setTitle('Parte 2 · Dati pratici')
    .setHelpText('Pochi minuti: sede, sito, contatti, foto. Indirizzo e città li prendiamo da Google Maps.');
  short(Q.legal, 'Es. Società agricola Bellavista S.R.L', 120, true);
  url(Q.maps, "Cercate l'azienda su Google Maps → Condividi → Copia link, e incollatelo qui. " +
    'Indirizzo, città e regione li prendiamo da Google Maps, senza errori di battitura.', true);
  form.addListItem().setTitle(Q.sector).setHelpText('Lo confermerà la redazione.').setChoiceValues(sectors).setRequired(true);
  form.addTextItem().setTitle(Q.since).setHelpText('4 cifre. Es. 1977').setRequired(true)
    .setValidation(FormApp.createTextValidation().requireNumberBetween(1700, 2026).setHelpText('Anno a 4 cifre').build());
  url(Q.website, 'Es. https://bellavista.it', true);
  form.addTextItem().setTitle(Q.email1).setHelpText('Sarà visibile nella scheda. Es. info@azienda.it').setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  form.addTextItem().setTitle(Q.email2).setRequired(false)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  url(Q.facebook, 'Facoltativo', false);
  url(Q.instagram, 'Facoltativo', false);
  url(Q.linkedin, 'Facoltativo', false);
  url(Q.youtube, 'Facoltativo', false);
  url(Q.whatsapp, 'Facoltativo. Es. https://wa.me/39…', false);
  url(Q.photosLink, 'Link WeTransfer, Dropbox o Google Drive con: una foto VERTICALE di almeno 2600 × 3600 pixel senza scritte, ' +
    'il logo (SVG o PNG trasparente) e, se il vostro pacchetto prevede il portfolio, le foto aggiuntive. File originali, non screenshot.', true);
  short(Q.photoCredit, 'Da citare se richiesto. Es. © Mario Rossi', 80, false);
  short(Q.contactName, 'Chi approva la bozza della scheda (non sarà pubblicato).', 80, true);
  short(Q.contactRole, '', 80, false);
  form.addTextItem().setTitle(Q.contactEmail).setHelpText('Riceverà la bozza da approvare (non sarà pubblicata).').setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  form.addCheckboxItem().setTitle(Q.consent).setRequired(true).setChoiceValues([
    "Confermo che l'azienda ha i diritti d'uso di testi, foto e logo inviati e ne autorizza la pubblicazione nell'annuario Italy meets America (sito web, PDF e stampa, comunicazioni a buyer e partner americani).",
  ]);
}

function imaFormSetup_(form) {
  form.setDescription(
    'Forbes Italia · Italy meets America – The Yearbook 2026.\n' +
    "L'annuario presenta le aziende italiane a buyer e partner americani (sito web, PDF, community Forbes USA).\n\n" +
    'Due parti: 1 · Il racconto dell\'azienda (in inglese, circa 30 minuti) · 2 · Dati pratici (pochi minuti).\n' +
    'Prima della pubblicazione riceverete la bozza della scheda da approvare.');
  form.setRequireLogin(false); // external companies: no Google account needed
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Grazie! Abbiamo ricevuto la scheda. Vi invieremo la bozza da approvare prima della pubblicazione.');
}

function imaSectors_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Lists').getDataRange().getDisplayValues().slice(1)
    .map(function (r) { return r[0]; }).filter(String);
}

function imaCreateForm() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  var existing = props.getProperty(IMA_FORM.PROP_ID);
  if (existing) {
    try {
      var f0 = FormApp.openById(existing);
      imaFormSay_('The form already exists:\n' + f0.getPublishedUrl() + '\n\nTo change its questions use "Rebuild the company form".');
      return;
    } catch (err) { /* deleted: create a new one */ }
  }
  var form = FormApp.create(IMA_FORM.TITLE);
  imaFormSetup_(form);
  imaBuildItems_(form, imaSectors_());
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  props.setProperty(IMA_FORM.PROP_ID, form.getId());
  imaInstallTrigger_();
  SpreadsheetApp.flush();
  ss.getSheets().forEach(function (sh) {
    if (sh.getFormUrl && sh.getFormUrl() && sh.getFormUrl().indexOf(form.getId()) >= 0) sh.setName(IMA_FORM.RESPONSES_TAB);
  });
  imaFormSay_('Form created.\n\nLink for the companies:\n' + form.getPublishedUrl() + '\n\nThen use "Short link and slide".');
}

/** Same form, same link: removes every question and builds the current ones (old answers stay in the sheet). */
function imaRebuildForm() {
  var id = PropertiesService.getScriptProperties().getProperty(IMA_FORM.PROP_ID);
  if (!id) return imaFormSay_('No form yet: use "Create the company form".');
  var form = FormApp.openById(id);
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Rebuild the company form', 'The questions of the form are rebuilt (same link). Answers already received stay in the "' +
    IMA_FORM.RESPONSES_TAB + '" tab. Continue?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  form.getItems().forEach(function (it) { form.deleteItem(it); });
  imaFormSetup_(form);
  imaBuildItems_(form, imaSectors_());
  imaInstallTrigger_();
  imaFormSay_('Form rebuilt: ' + form.getItems().length + ' items.\n' + form.getPublishedUrl());
}

function imaInstallTrigger_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'imaOnFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('imaOnFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
}

/** forms.gle short link, written in the slide (text and click) in place of the long form address. */
function imaShortLinkToSlide() {
  var id = PropertiesService.getScriptProperties().getProperty(IMA_FORM.PROP_ID);
  if (!id) return imaFormSay_('No form yet: use "Create the company form".');
  var form = FormApp.openById(id);
  var shortUrl = form.shortenFormUrl(form.getPublishedUrl());
  var done = 0;
  SlidesApp.openById(IMA_FORM.SLIDE_ID).getSlides().forEach(function (slide) {
    slide.getShapes().forEach(function (shape) {
      var t = shape.getText();
      var found = t.find('https://(docs\\.google\\.com/forms|forms\\.gle)/\\S+');
      found.forEach(function (r) {
        imaRelink_(r.setText(shortUrl), shortUrl);
        done++;
      });
      // the call to action (the button, its own shape) opens the form too
      t.find('Compilate il modulo[^\\n]*|COMPILATE IL MODULO[^\\n]*').forEach(function (r) { imaRelink_(r, shortUrl); });
    });
  });
  imaFormSay_('Short link: ' + shortUrl + '\n\n' + (done ? 'Written in the slide (' + done + ').' : 'The slide has no form link to replace: paste it by hand.'));
}

/** Link on a text range, keeping the colour of the slide (Slides makes a new link blue and underlined). */
function imaRelink_(range, url) {
  var st = range.getTextStyle();
  var colour = st.getForegroundColor();
  st.setLinkUrl(url).setUnderline(false);
  if (colour) st.setForegroundColor(colour);
}

function imaFormSay_(msg) {
  try { SpreadsheetApp.getUi().alert('Italy meets America', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { Logger.log(msg); }
}

// --- Google Maps ---------------------------------------------------------------------------------

/** Pure: coordinates and place name from a Google Maps address (full form, after any redirect). */
function imaMapsParse_(url) {
  var u = String(url || '');
  try { u = decodeURIComponent(u); } catch (e) { /* keep it */ }
  var out = { lat: null, lng: null, name: '' };
  var m = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
    u.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (m) { out.lat = Number(m[1]); out.lng = Number(m[2]); }
  var p = u.match(/\/maps\/place\/([^/@?]+)/) || u.match(/[?&](?:q|query)=([^&]+)/);
  if (p && !/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(p[1])) out.name = p[1].replace(/\+/g, ' ').trim();
  return out;
}

/** Italian names → English names of the sheet (keys without accents, spaces or punctuation). */
var IMA_REGIONS_IT = {
  valledaosta: 'Aosta Valley', valleedaoste: 'Aosta Valley', puglia: 'Apulia', friuliveneziagiulia: 'Friuli Venezia Giulia',
  lombardia: 'Lombardy', piemonte: 'Piedmont', sardegna: 'Sardinia', sicilia: 'Sicily',
  trentinoaltoadige: 'Trentino-South Tyrol', trentinoaltoadigesudtirol: 'Trentino-South Tyrol', toscana: 'Tuscany',
};
var IMA_CITIES_IT = {
  milano: 'Milan', roma: 'Rome', napoli: 'Naples', torino: 'Turin', firenze: 'Florence', venezia: 'Venice',
  genova: 'Genoa', padova: 'Padua', mantova: 'Mantua', siracusa: 'Syracuse', livorno: 'Leghorn',
};

/** Pure: Companies fields from two geocoder results (English for city and region, Italian for the address). */
function imaPlaceFields_(en, it, regions) {
  var comp = function (r, type, short) {
    var c = ((r && r.address_components) || []).filter(function (x) { return x.types.indexOf(type) >= 0; })[0];
    return c ? (short ? c.short_name : c.long_name) : '';
  };
  var key = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''); };
  // Google Maps can answer in Italian even when English is asked (test of 05/11: "Milano", "Lombardia"):
  // regions and the main cities are brought to the English names of the sheet here.
  var regionRaw = comp(en, 'administrative_area_level_1');
  var regionEn = IMA_REGIONS_IT[key(regionRaw)] || regionRaw;
  var region = (regions || []).filter(function (r) { return key(r) === key(regionEn); })[0] || regionEn;
  var cityRaw = comp(en, 'locality') || comp(en, 'administrative_area_level_3') || comp(en, 'postal_town');
  var cityEn = IMA_CITIES_IT[key(cityRaw)] || cityRaw;
  var cityIt = comp(it, 'locality') || comp(it, 'administrative_area_level_3') || cityEn;
  var street = comp(it, 'route') + (comp(it, 'street_number') ? ', ' + comp(it, 'street_number') : '');
  var prov = comp(it, 'administrative_area_level_2', true);
  var cap = comp(it, 'postal_code');
  return {
    city: cityEn,
    region: region,
    address_street: street,
    address_city: (cap ? cap + ' ' : '') + cityIt + (prov ? ' (' + prov + ')' : ''),
    country: comp(en, 'country', true) === 'IT' ? 'Italy' : comp(en, 'country') || 'Italy',
  };
}

/** Follows the short links (maps.app.goo.gl, goo.gl/maps) up to the full Google Maps address. */
function imaMapsExpand_(url) {
  var u = String(url || '').trim();
  for (var i = 0; i < 5 && /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)/.test(u.replace(/^https?:\/\//, 'https://')); i++) {
    var res = UrlFetchApp.fetch(u, { followRedirects: false, muteHttpExceptions: true });
    var loc = res.getHeaders().Location || res.getHeaders().location;
    if (!loc) break;
    u = loc;
  }
  return u;
}

/** Google Maps link → address fields (+ a note when something could not be read). */
function imaPlaceFromMaps_(link, regions) {
  var url = imaMapsExpand_(link);
  var p = imaMapsParse_(url);
  var en, it;
  if (p.lat !== null) {
    en = Maps.newGeocoder().setLanguage('en').reverseGeocode(p.lat, p.lng);
    it = Maps.newGeocoder().setLanguage('it').reverseGeocode(p.lat, p.lng);
  } else if (p.name) {
    en = Maps.newGeocoder().setLanguage('en').setRegion('it').geocode(p.name);
    it = Maps.newGeocoder().setLanguage('it').setRegion('it').geocode(p.name);
  } else {
    return { fields: {}, note: 'Google Maps link not readable: ' + link };
  }
  if (!en || en.status !== 'OK' || !it || it.status !== 'OK') return { fields: {}, note: 'Google Maps did not find the place: ' + link };
  var f = imaPlaceFields_(en.results[0], it.results[0], regions);
  return { fields: f, note: f.address_street ? '' : 'Google Maps gave no street address: check it (' + link + ')' };
}

// --- answers → Companies --------------------------------------------------------------------------

/** Text from the form → safe cell value (no formulas from outside: = + - @ get an apostrophe). */
function imaCell_(v) {
  var s = String(v === undefined || v === null ? '' : v).replace(/\r\n/g, '\n').trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Google Forms accepts "www.site.com" as a link: the yearbook wants https:// (validate.ts). */
function imaHttps_(s) {
  var u = String(s || '').trim();
  if (!u) return '';
  if (/^http:\/\//i.test(u)) return 'https://' + u.slice(7);
  return /^https:\/\//i.test(u) ? u : 'https://' + u.replace(/^\/+/, '');
}

function imaSlug_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Pure: one answer from e.namedValues. Every "Rebuild the company form" leaves the old columns in the
 * responses tab with the same titles, so a title can carry several values (the current question first,
 * then the empty old ones): the first non-empty one is the answer.
 */
function imaAnswer_(nv, title) {
  var v = nv[title];
  var list = Array.isArray(v) ? v : [v];
  for (var i = 0; i < list.length; i++) {
    var s = String(list[i] === undefined || list[i] === null ? '' : list[i]).trim();
    if (s) return s;
  }
  return '';
}

/** Pure: form answers (+ address read from Google Maps) → values by column name of "Companies". */
function imaFormToRow_(nv, edition, now, place) {
  var Q = IMA_FORM.Q;
  var get = function (k) { return imaAnswer_(nv, Q[k]); };
  var notes = [];
  var intro = get('intro').replace(/\*\*/g, '');
  var bold = get('bold').replace(/\*\*/g, '');
  if (bold) {
    var at = intro.indexOf(bold);
    if (at >= 0) intro = intro.slice(0, at) + '**' + bold + '**' + intro.slice(at + bold.length);
    else notes.push('Bold sentence not found in the presentation: "' + bold + '"');
  }
  var addr = (place && place.fields) || {};
  if (place && place.note) notes.push(place.note);
  var row = {
    id: imaSlug_(get('name')), edition: edition, status: 'draft', package: '', sort_order: '',
    sector: get('sector'), name: get('name'), city: addr.city || '', region: addr.region || '',
    headline: get('headline'), intro: intro, mission: get('mission'), vision: get('vision'),
    quote: get('quote').replace(/^["“”']+|["“”']+$/g, ''), quote_author: get('quoteAuthor'), quote_role: get('quoteRole'),
    who_should_connect: get('who'), what_to_discover: get('discover'), since: get('since'),
    signature_1: get('sig1'), signature_2: get('sig2'), signature_3: get('sig3'),
    what_they_bring: get('bring'), company_legal_name: get('legal'), address_street: addr.address_street || '',
    address_city: addr.address_city || '', country: addr.country || 'Italy', email_1: get('email1'), email_2: get('email2'),
    website: imaHttps_(get('website')), social_facebook: imaHttps_(get('facebook')), social_instagram: imaHttps_(get('instagram')),
    social_linkedin: imaHttps_(get('linkedin')), social_youtube: imaHttps_(get('youtube')), social_whatsapp: imaHttps_(get('whatsapp')),
    photo_credit: get('photoCredit'),
    _client_contact_name: get('contactName') + (get('contactRole') ? ' (' + get('contactRole') + ')' : ''),
    _client_contact_email: get('contactEmail'),
    _updated_at: now,
  };
  // US events: one per line, "Name | link" or "Name link"; max 4.
  var lines = get('events').split(/\n+/).map(function (l) { return l.trim(); }).filter(String);
  if (lines.length > 4) notes.push('More than 4 US events sent: only the first 4 kept (' + lines.slice(4).join(' / ') + ')');
  lines.slice(0, 4).forEach(function (l, i) {
    var m = l.match(/https?:\/\/\S+/);
    var name = (m ? l.replace(m[0], '') : l).replace(/[|\-–—:,]+\s*$/, '').replace(/^\s*[-•*]\s*/, '').trim();
    row['us_event_' + (i + 1) + '_name'] = name;
    row['us_event_' + (i + 1) + '_url'] = m ? m[0].replace(/^http:/, 'https:') : '';
  });
  notes.push('Google Maps: ' + get('maps'));
  notes.push('Photos and logo: ' + get('photosLink'));
  notes.push('From the form on ' + now);
  row._internal_notes = notes.join('\n');
  return row;
}

function imaOnFormSubmit(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lists = ss.getSheetByName('Lists').getDataRange().getDisplayValues();
  var regions = lists.slice(1).map(function (r) { return r[1]; }).filter(String);
  var edition = 2026;
  lists.forEach(function (r) { if (r[4] === 'current_edition' && r[5]) edition = Number(r[5]); });
  // Google Maps outside the lock (network); never blocks the row.
  var link = imaAnswer_(e.namedValues, IMA_FORM.Q.maps);
  var place;
  try { place = link ? imaPlaceFromMaps_(link, regions) : { fields: {}, note: 'No Google Maps link' }; }
  catch (err) { place = { fields: {}, note: 'Google Maps error (' + err.message + '): ' + link }; }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = ss.getSheetByName('Companies');
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    var now = Utilities.formatDate(new Date(), 'Europe/Rome', 'dd/MM/yyyy HH:mm');
    var row = imaFormToRow_(e.namedValues, edition, now, place);

    // Same company still in draft: update its row. Otherwise a new row (id made unique).
    var data = sh.getDataRange().getValues();
    var cId = head.indexOf('id'), cStatus = head.indexOf('status'), cEd = head.indexOf('edition'), cNotes = head.indexOf('_internal_notes');
    var target = -1, taken = {};
    for (var r = 1; r < data.length; r++) {
      var id = String(data[r][cId]);
      if (String(data[r][cEd]) === String(edition)) taken[id] = true;
      if (id === row.id && String(data[r][cEd]) === String(edition) && String(data[r][cStatus]) === 'draft') target = r + 1;
    }
    var isNew = target < 0;
    if (isNew) {
      var base = row.id || 'company', n = 2, id2 = base;
      while (taken[id2]) id2 = base + '-' + n++;
      if (id2 !== row.id) row._internal_notes += '\nId changed to "' + id2 + '": a card with id "' + row.id + '" already exists and is not a draft.';
      row.id = id2;
      target = sh.getLastRow() + 1;
    } else {
      row._internal_notes += '\nUpdated by a new form answer (previous notes: ' + String(data[target - 1][cNotes] || '').split('\n')[0] + ')';
    }
    // Write only the columns the form fills: package, sort order and the images set by the team stay.
    // One refused cell (e.g. a value outside a drop-down list) must not stop the row: it is left empty
    // and written in the notes, so the team sees what to fix.
    var refused = [];
    head.forEach(function (h, c) {
      if (!(h in row) || h === '_internal_notes') return;
      if ((h === 'package' || h === 'sort_order') && !isNew) return;
      try { sh.getRange(target, c + 1).setValue(imaCell_(row[h])); }
      catch (err) { refused.push(h + ' = "' + row[h] + '" not accepted by the sheet (' + err.message + ')'); }
    });
    if (refused.length) row._internal_notes = refused.join('\n') + '\n' + row._internal_notes;
    if (cNotes >= 0) sh.getRange(target, cNotes + 1).setValue(imaCell_(row._internal_notes));
  } finally {
    lock.releaseLock();
  }
}
