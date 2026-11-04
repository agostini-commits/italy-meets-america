/**
 * Italy meets America – menu "Publish to site" for the data sheet.
 * Extensions → Apps Script: paste this file and appsscript.json, save, reload the sheet.
 * Script properties (Project settings → Script properties):
 *   GITHUB_TOKEN  fine-grained token on agostini-commits/italy-meets-america with "Actions: Read and write"
 *   PUBLISHERS    optional: emails allowed to publish, separated by commas (empty = every editor of the sheet)
 * Full setup: docs/PUBLISH-SETUP.md in the repository.
 */
var IMA = {
  OWNER: 'agostini-commits',
  REPO: 'italy-meets-america',
  WORKFLOW: 'publish.yml',
  REF: 'main',
  SITE: 'https://italy-meets-america.netlify.app',
  TAB: 'Companies',
  CHECKS: 'Checks',
  LOG: '_Publish',
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Italy meets America')
    .addItem('Publish to site', 'imaPublish')
    .addItem('Publish status', 'imaStatus')
    .addSeparator()
    .addItem('Open the site', 'imaOpenSite')
    .addItem('Create the company form', 'imaCreateForm')
    .addToUi();
}

/** Counts the cards that will go online and those blocked by the checks (same rules as the import). */
function imaSummary_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = ss.getSheetByName(IMA.TAB).getDataRange().getDisplayValues();
  var head = data[0];
  var col = function (n) { return head.indexOf(n); };
  var cStatus = col('status'), cName = col('name'), cId = col('id');
  var checks = {};
  var chk = ss.getSheetByName(IMA.CHECKS);
  if (chk) {
    chk.getDataRange().getDisplayValues().slice(1).forEach(function (r, i) {
      if (r[3] && r[3].indexOf('❌') === 0) checks[i + 2] = r[4];
    });
  }
  var ready = 0, blocked = [], other = 0;
  data.slice(1).forEach(function (r, i) {
    if (!r[cName] && !r[cId]) return;
    var s = r[cStatus];
    if (s === 'approved' || s === 'published') {
      if (checks[i + 2]) blocked.push('row ' + (i + 2) + ' ' + r[cName] + ': ' + checks[i + 2]);
      else ready++;
    } else other++;
  });
  return { ready: ready, blocked: blocked, other: other };
}

function imaAllowed_() {
  var list = (PropertiesService.getScriptProperties().getProperty('PUBLISHERS') || '').toLowerCase().split(',')
    .map(function (s) { return s.trim(); }).filter(String);
  var me = (Session.getActiveUser().getEmail() || '').toLowerCase();
  return { ok: !list.length || list.indexOf(me) >= 0, me: me };
}

function imaGithub_(method, path, body) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN is missing in the script properties (see docs/PUBLISH-SETUP.md).');
  var opts = {
    method: method,
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  };
  if (body) opts.payload = JSON.stringify(body);
  return UrlFetchApp.fetch('https://api.github.com/repos/' + IMA.OWNER + '/' + IMA.REPO + path, opts);
}

function imaPublish() {
  var ui = SpreadsheetApp.getUi();
  var who = imaAllowed_();
  if (!who.ok) {
    ui.alert('Publish to site', 'Your account (' + (who.me || 'unknown') + ') is not allowed to publish. Ask the marketing team.', ui.ButtonSet.OK);
    return;
  }
  // Double click / two people at once: one publication every 3 minutes from the sheet.
  var cache = CacheService.getScriptCache();
  if (cache.get('ima-publishing')) {
    ui.alert('Publish to site', 'A publication has just started. Wait a couple of minutes, then use "Publish status".', ui.ButtonSet.OK);
    return;
  }
  var s = imaSummary_();
  var msg = s.ready + ' companies will be online.\n';
  if (s.blocked.length) msg += '\n' + s.blocked.length + ' approved but with problems (NOT published until fixed):\n• ' + s.blocked.slice(0, 5).join('\n• ') + (s.blocked.length > 5 ? '\n…' : '') + '\n';
  if (s.other) msg += '\n' + s.other + ' not approved yet (draft, to client, in review): not published.\n';
  msg += '\nPublish now? The site updates in 2–3 minutes.';
  if (!s.ready) {
    ui.alert('Publish to site', 'No approved company without problems: nothing to publish.\n\n' + msg, ui.ButtonSet.OK);
    return;
  }
  if (ui.alert('Publish to site', msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  var res = imaGithub_('post', '/actions/workflows/' + IMA.WORKFLOW + '/dispatches', { ref: IMA.REF, inputs: { requested_by: who.me || 'sheet' } });
  if (res.getResponseCode() !== 204) {
    ui.alert('Publish to site', 'GitHub did not accept the request (' + res.getResponseCode() + '):\n' + res.getContentText().slice(0, 300), ui.ButtonSet.OK);
    return;
  }
  cache.put('ima-publishing', '1', 180);
  SpreadsheetApp.getActiveSpreadsheet().toast('Publication started. The result will appear in the "' + IMA.LOG + '" tab in 2–3 minutes.', 'Italy meets America', 10);
}

function imaStatus() {
  var res = imaGithub_('get', '/actions/workflows/' + IMA.WORKFLOW + '/runs?per_page=1');
  var html;
  if (res.getResponseCode() !== 200) {
    html = '<p>GitHub did not answer (' + res.getResponseCode() + ').</p>';
  } else {
    var run = (JSON.parse(res.getContentText()).workflow_runs || [])[0];
    if (!run) html = '<p>No publication yet.</p>';
    else {
      var state = run.status !== 'completed' ? 'In progress…' : run.conclusion === 'success' ? '✅ Published' : '❌ Failed';
      var when = Utilities.formatDate(new Date(run.created_at), 'Europe/Rome', 'dd/MM/yyyy HH:mm');
      html = '<p style="font:15px sans-serif"><b>' + state + '</b><br>Started ' + when + '</p>' +
        '<p style="font:14px sans-serif"><a href="' + run.html_url + '" target="_blank">Details on GitHub</a> · ' +
        '<a href="' + IMA.SITE + '" target="_blank">Open the site</a></p>' +
        '<p style="font:13px sans-serif;color:#555">Errors and warnings of each publication are in the "' + IMA.LOG + '" tab.</p>';
    }
  }
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(380).setHeight(170), 'Publish status');
}

function imaOpenSite() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<p style="font:15px sans-serif"><a href="' + IMA.SITE + '" target="_blank">' + IMA.SITE + '</a></p>').setWidth(380).setHeight(90),
    'Italy meets America');
}
