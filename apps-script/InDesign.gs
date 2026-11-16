/**
 * Italy meets America – the InDesign folder (AGO 16/11/2026).
 *
 * A Drive folder "Italy meets America – InDesign" that the graphic designer syncs with Google Drive for desktop:
 *   yearbook.csv   the "InDesign" tab of this sheet (same file every time, so InDesign keeps its link)
 *   Links/         logos and photos copied from the photo folder, with the names written in the CSV,
 *                  plus the two placeholders used when a company has no photo or logo yet.
 * In InDesign: Data Merge → Update Data Source. Nothing to download or rename by hand.
 *
 * When: menu "Update the InDesign folder", after every form answer, and every hour (trigger installed by
 * the first run). Only new or changed photos are copied. Runs as the owner of the sheet, so the files
 * belong to the owner (no service account, no storage quota problems).
 *
 * Settings in the "Lists" tab (column E = name, F = value):
 *   indesign_image_base_path  the path of the synced Links folder on the designer's Mac, ending with "/"
 *   photos_folder             link of the Drive photo folder (where the team puts the originals)
 *   indesign_include_drafts   TRUE = every row in the CSV (proof), FALSE = only approved and published
 */
var IMA_ID = {
  FOLDER_NAME: 'Italy meets America – InDesign',
  CSV: 'yearbook.csv',
  LINKS: 'Links',
  PROP: 'IMA_INDESIGN_FOLDER_ID',
  TAB: 'InDesign',
  PLACEHOLDERS: ['_placeholder-photo.jpg', '_placeholder-logo.png'],
};

/** Menu: update now and show where the folder is. */
function imaInDesignExport() {
  var r = imaInDesignExport_();
  SpreadsheetApp.getUi().alert('Italy meets America – InDesign',
    r.rows + ' companies in ' + IMA_ID.CSV + ', ' + r.copied + ' photos copied (' + r.unchanged + ' unchanged' +
    (r.missing.length ? ', ' + r.missing.length + ' not in the photo folder: ' + r.missing.slice(0, 5).join(', ') : '') + ').\n\n' +
    'Folder for the designer:\n' + r.url, SpreadsheetApp.getUi().ButtonSet.OK);
}

/** Hourly trigger (and after each form answer): same work, no dialog. */
function imaInDesignExportTrigger() {
  imaInDesignExport_();
}

function imaInDesignExport_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    var folder = imaInDesignFolder_(ss);
    var links = imaSubfolder_(folder, IMA_ID.LINKS);

    // 1. CSV: the InDesign tab as the designer needs it (header + one row per company).
    var values = ss.getSheetByName(IMA_ID.TAB).getDataRange().getDisplayValues();
    var rows = values.filter(function (r, i) { return i === 0 || String(r[0]).trim() !== ''; });
    var csv = imaCsv_(rows);
    var existing = folder.getFilesByName(IMA_ID.CSV);
    if (existing.hasNext()) {
      var f = existing.next();
      if (f.getBlob().getDataAsString('UTF-8') !== csv) f.setContent(csv);
    } else {
      folder.createFile(IMA_ID.CSV, csv, MimeType.CSV);
    }

    // 2. Photos: every file named in the "@" columns, plus the placeholders, copied from the photo folder.
    var head = rows[0];
    var wanted = {};
    IMA_ID.PLACEHOLDERS.forEach(function (n) { wanted[n] = true; });
    rows.slice(1).forEach(function (r) {
      head.forEach(function (h, c) {
        if (String(h).charAt(0) !== '@') return;
        var name = String(r[c]).split('/').pop();
        if (name) wanted[name] = true;
      });
    });
    var source = imaPhotoFolder_(ss);
    var copied = 0, unchanged = 0, missing = [];
    Object.keys(wanted).forEach(function (name) {
      var src = imaFindFile_(source, name);
      if (!src) { missing.push(name); return; }
      var dst = links.getFilesByName(name);
      if (dst.hasNext()) {
        var d = dst.next();
        if (d.getSize() === src.getSize() && d.getLastUpdated() >= src.getLastUpdated()) { unchanged++; return; }
        d.setTrashed(true);
      }
      src.makeCopy(name, links);
      copied++;
    });

    imaInDesignTrigger_();
    return { rows: rows.length - 1, copied: copied, unchanged: unchanged, missing: missing, url: folder.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

/** The InDesign folder: created once next to the sheet, then found by its saved id. */
function imaInDesignFolder_(ss) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(IMA_ID.PROP);
  if (id) {
    try {
      var f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* deleted: create it again */ }
  }
  var parents = DriveApp.getFileById(ss.getId()).getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var folder = parent.createFolder(IMA_ID.FOLDER_NAME);
  props.setProperty(IMA_ID.PROP, folder.getId());
  return folder;
}

function imaSubfolder_(folder, name) {
  var it = folder.getFoldersByName(name);
  return it.hasNext() ? it.next() : folder.createFolder(name);
}

/** Photo folder from Lists → photos_folder (a Drive link). */
function imaPhotoFolder_(ss) {
  var link = imaSetting_(ss, 'photos_folder');
  var m = String(link).match(/folders\/([-\w]{20,})/) || String(link).match(/^([-\w]{20,})$/);
  if (!m) throw new Error('Lists → photos_folder is not a Drive folder link: ' + link);
  return DriveApp.getFolderById(m[1]);
}

/** A file by name in the folder or its subfolders (the team may sort photos by company). */
function imaFindFile_(folder, name) {
  var it = folder.getFilesByName(name);
  if (it.hasNext()) return it.next();
  var subs = folder.getFolders();
  while (subs.hasNext()) {
    var f = imaFindFile_(subs.next(), name);
    if (f) return f;
  }
  return null;
}

function imaSetting_(ss, key) {
  var rows = ss.getSheetByName('Lists').getDataRange().getDisplayValues();
  for (var i = 0; i < rows.length; i++) if (rows[i][4] === key) return rows[i][5];
  return '';
}

/** Pure: rows → CSV (RFC 4180: fields with comma, quote or line break in quotes, quotes doubled). */
function imaCsv_(rows) {
  return rows.map(function (r) {
    return r.map(function (v) {
      var s = String(v === null || v === undefined ? '' : v);
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\r\n') + '\r\n';
}

/** Hourly trigger, installed once. */
function imaInDesignTrigger_() {
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'imaInDesignExportTrigger'; });
  if (!has) ScriptApp.newTrigger('imaInDesignExportTrigger').timeBased().everyHours(1).create();
}
