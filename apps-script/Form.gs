/**
 * Italy meets America – Google Form for the companies (data intake).
 *
 * imaCreateForm(): run ONCE from the Apps Script editor (or menu "Italy meets America → Create the company form").
 *   Creates the form (in Italian, texts asked in English), links it to this sheet and installs the trigger.
 *   Answers need no Google account (setRequireLogin(false): in a company domain the default is "colleagues only").
 * imaOnFormSubmit(e): every answer becomes a row of "Companies" with status "draft" (same company, still draft:
 *   the row is updated instead of duplicated). Limits are the ones of src/schema.ts and of the "Checks" tab.
 * Photos are NOT uploaded through the form (Google requires a Google account for file upload): the company sends a
 * link (WeTransfer, Dropbox, Drive), saved in _internal_notes; the editorial team puts the files in the photo folder.
 */
var IMA_FORM = {
  TITLE: 'Italy meets America 2026 – Company profile',
  RESPONSES_TAB: '_Form responses',
  PROP_ID: 'IMA_FORM_ID',
  // Question titles = keys of e.namedValues: do not rename them without changing IMA_FORM_MAP.
  Q: {
    name: 'Nome commerciale',
    legal: 'Ragione sociale',
    street: 'Indirizzo (via e numero civico)',
    addressCity: 'CAP, città e provincia',
    city: 'Città (come deve comparire sotto il nome)',
    region: 'Regione',
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
    photosLink: 'Link a foto e logo',
    photoCredit: 'Credito fotografico (facoltativo)',
    contactName: 'Referente per la scheda (nome e cognome)',
    contactRole: 'Ruolo del referente',
    contactEmail: 'Email del referente',
    consent: 'Autorizzazione',
  },
  // Same limits as src/schema.ts
  MAX: { headline: 32, intro: 730, mission: 60, vision: 60, quote: 90, who: 120, discover: 120, signature: 40, bring: 250 },
};

function imaCreateForm() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  var existing = props.getProperty(IMA_FORM.PROP_ID);
  if (existing) {
    try {
      var f0 = FormApp.openById(existing);
      imaFormSay_('The form already exists:\n' + f0.getPublishedUrl() + '\n\nEdit it here:\n' + f0.getEditUrl());
      return;
    } catch (err) { /* deleted: create a new one */ }
  }
  var Q = IMA_FORM.Q, M = IMA_FORM.MAX;
  var lists = ss.getSheetByName('Lists').getDataRange().getDisplayValues().slice(1);
  var sectors = lists.map(function (r) { return r[0]; }).filter(String);
  var regions = lists.map(function (r) { return r[1]; }).filter(String);

  var form = FormApp.create(IMA_FORM.TITLE);
  form.setDescription(
    'Forbes Italia · Italy meets America – The Yearbook 2026.\n' +
    "L'annuario presenta le aziende italiane a buyer e partner americani (sito web, PDF, community Forbes USA).\n\n" +
    'I TESTI DELLA PAGINA 2 VANNO SCRITTI IN INGLESE. I limiti di caratteri (spazi inclusi) servono a far stare la scheda nella pagina: il modulo li controlla mentre scrivete.\n' +
    'Prima della pubblicazione riceverete la bozza della scheda da approvare. Tempo di compilazione: circa 20 minuti.');
  form.setRequireLogin(false); // external companies: no Google account needed
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Grazie! Abbiamo ricevuto la scheda. Vi invieremo la bozza da approvare prima della pubblicazione.');

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

  // --- page 1: company -------------------------------------------------------------------------
  form.addSectionHeaderItem().setTitle("1. L'azienda");
  short(Q.name, 'Come deve comparire nel titolo della scheda. Es. Bellavista', 60, true);
  short(Q.legal, 'Es. Società agricola Bellavista S.R.L', 120, true);
  short(Q.street, 'Es. Via Bellavista, 5', 120, true);
  short(Q.addressCity, 'Es. 25030 Erbusco (BS)', 80, true);
  short(Q.city, 'In inglese se esiste (Milan, Turin, Naples, Florence…). Es. Erbusco', 40, true);
  form.addListItem().setTitle(Q.region).setChoiceValues(regions).setRequired(true);
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

  // --- page 2: texts (English) -----------------------------------------------------------------
  form.addPageBreakItem().setTitle('2. Texts – in English').setHelpText('Il pubblico è americano: scrivete in inglese. Gli esempi vengono dalla scheda Bellavista.');
  short(Q.headline, 'Max ' + M.headline + ' characters. Ex. The Art of Time', M.headline, true);
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
  long(Q.events, 'Up to 4 US fairs, events or stores, ONE PER LINE, with the link if any. Ex.\nVinitaly USA | https://www.vinitalyusa.com\nFood & Wine Classic in Aspen', 600, false);
  long(Q.bring, 'Max ' + M.bring + '. Your offer for the American market. Ex. The pinnacle of Italian Metodo Classico sparkling wines…', M.bring, true);

  // --- page 3: images --------------------------------------------------------------------------
  form.addPageBreakItem().setTitle('3. Immagini').setHelpText(
    'Foto principale: VERTICALE, almeno 2600 × 3600 pixel, JPG alta qualità, senza scritte o loghi sopra (titolo e settore li aggiungiamo noi in basso).\n' +
    'Logo: SVG o PDF vettoriale, oppure PNG con sfondo trasparente di almeno 800 pixel.\n' +
    'Pacchetto Premium: fino a 6 foto per la galleria.\n' +
    'Inviate i file originali (non screenshot, non foto passate da WhatsApp).');
  url(Q.photosLink, 'Link WeTransfer, Dropbox o Google Drive con foto e logo.', true);
  short(Q.photoCredit, 'Da citare se richiesto. Es. © Mario Rossi', 80, false);

  // --- page 4: contact and consent -------------------------------------------------------------
  form.addPageBreakItem().setTitle('4. Referente e autorizzazione');
  short(Q.contactName, 'Chi approva la bozza della scheda (non sarà pubblicato).', 80, true);
  short(Q.contactRole, '', 80, false);
  form.addTextItem().setTitle(Q.contactEmail).setHelpText('Riceverà la bozza da approvare (non sarà pubblicata).').setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  form.addCheckboxItem().setTitle(Q.consent).setRequired(true).setChoiceValues([
    "Confermo che l'azienda ha i diritti d'uso di testi, foto e logo inviati e ne autorizza la pubblicazione nell'annuario Italy meets America (sito web, PDF e stampa, comunicazioni a buyer e partner americani).",
  ]);

  // Answers in this sheet, trigger for the Companies rows.
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  props.setProperty(IMA_FORM.PROP_ID, form.getId());
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'imaOnFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('imaOnFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  SpreadsheetApp.flush();
  ss.getSheets().forEach(function (sh) {
    if (sh.getFormUrl && sh.getFormUrl() && sh.getFormUrl().indexOf(form.getId()) >= 0) sh.setName(IMA_FORM.RESPONSES_TAB);
  });
  imaFormSay_('Form created.\n\nLink for the companies:\n' + form.getPublishedUrl() + '\n\nEdit the form:\n' + form.getEditUrl());
}

function imaFormSay_(msg) {
  try { SpreadsheetApp.getUi().alert('Italy meets America', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { Logger.log(msg); }
}

/** Text from the form → safe cell value (no formulas from outside: = + - @ get an apostrophe). */
function imaCell_(v) {
  var s = String(v === undefined || v === null ? '' : v).replace(/\r\n/g, '\n').trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function imaSlug_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Pure: form answers → values by column name of "Companies" (tested in Node with the same file). */
function imaFormToRow_(nv, edition, now) {
  var Q = IMA_FORM.Q;
  var get = function (k) { var v = nv[Q[k]]; return (Array.isArray(v) ? v.join(', ') : v || '').trim(); };
  var notes = [];
  var intro = get('intro').replace(/\*\*/g, '');
  var bold = get('bold').replace(/\*\*/g, '');
  if (bold) {
    var at = intro.indexOf(bold);
    if (at >= 0) intro = intro.slice(0, at) + '**' + bold + '**' + intro.slice(at + bold.length);
    else notes.push('Bold sentence not found in the presentation: "' + bold + '"');
  }
  var row = {
    id: imaSlug_(get('name')), edition: edition, status: 'draft', package: '', sort_order: '',
    sector: get('sector'), name: get('name'), city: get('city'), region: get('region'),
    headline: get('headline'), intro: intro, mission: get('mission'), vision: get('vision'),
    quote: get('quote').replace(/^["“”']+|["“”']+$/g, ''), quote_author: get('quoteAuthor'), quote_role: get('quoteRole'),
    who_should_connect: get('who'), what_to_discover: get('discover'), since: get('since'),
    signature_1: get('sig1'), signature_2: get('sig2'), signature_3: get('sig3'),
    what_they_bring: get('bring'), company_legal_name: get('legal'), address_street: get('street'),
    address_city: get('addressCity'), country: 'Italy', email_1: get('email1'), email_2: get('email2'),
    website: get('website'), social_facebook: get('facebook'), social_instagram: get('instagram'),
    social_linkedin: get('linkedin'), social_youtube: get('youtube'), social_whatsapp: get('whatsapp'),
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
  notes.push('Photos and logo: ' + get('photosLink'));
  notes.push('From the form on ' + now);
  row._internal_notes = notes.join('\n');
  return row;
}

function imaOnFormSubmit(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Companies');
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    var lists = ss.getSheetByName('Lists').getDataRange().getDisplayValues();
    var edition = 2026;
    lists.forEach(function (r) { if (r[4] === 'current_edition' && r[5]) edition = Number(r[5]); });
    var now = Utilities.formatDate(new Date(), 'Europe/Rome', 'dd/MM/yyyy HH:mm');
    var row = imaFormToRow_(e.namedValues, edition, now);

    // Same company still in draft: update its row. Otherwise a new row (id made unique).
    var data = sh.getDataRange().getValues();
    var cId = head.indexOf('id'), cStatus = head.indexOf('status'), cEd = head.indexOf('edition'), cNotes = head.indexOf('_internal_notes');
    var target = -1, taken = {};
    for (var r = 1; r < data.length; r++) {
      var id = String(data[r][cId]);
      if (String(data[r][cEd]) === String(edition)) taken[id] = true;
      if (id === row.id && String(data[r][cEd]) === String(edition) && String(data[r][cStatus]) === 'draft') target = r + 1;
    }
    if (target < 0) {
      var base = row.id || 'company', n = 2, id2 = base;
      while (taken[id2]) id2 = base + '-' + n++;
      if (id2 !== row.id) row._internal_notes += '\nId changed to "' + id2 + '": a card with id "' + row.id + '" already exists and is not a draft.';
      row.id = id2;
      target = sh.getLastRow() + 1;
    } else {
      row._internal_notes += '\nUpdated by a new form answer (previous notes: ' + String(data[target - 1][cNotes] || '').split('\n')[0] + ')';
    }
    // Write only the columns the form fills: package, sort_order, logo, photo, gallery stay as the team set them.
    head.forEach(function (h, c) {
      if (!(h in row)) return;
      if (h === 'package' || h === 'sort_order') { if (target <= sh.getLastRow()) return; }
      sh.getRange(target, c + 1).setValue(imaCell_(row[h]));
    });
  } finally {
    lock.releaseLock();
  }
}
