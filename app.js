/*************************************************************
 * Body Interact – ระบบจองเข้าใช้งานโปรแกรม
 * วิทยาลัยพยาบาลบรมราชชนนี กรุงเทพ
 * Google Apps Script Web App API (Code.gs)
 *
 * Sheets ที่ต้องมี: Users, Bookings, Settings, Logs, Scenarios, BIAccounts
 *
 * *** อัปเกรดจากเวอร์ชันเดิม: รันฟังก์ชัน upgradeSheets() หนึ่งครั้ง ***
 * จะเพิ่มคอลัมน์ใหม่ให้อัตโนมัติ:
 *   Settings   : open_time, close_time
 *   Bookings   : bi_account
 *   BIAccounts : account_type  (teacher / student)
 *
 * ความปลอดภัยข้อมูล:
 *   - ปิดการแชร์ Google Sheet เป็นสาธารณะได้เลย ระบบดึงข้อมูลผ่าน
 *     Apps Script เท่านั้น (Deploy แบบ Execute as: Me)
 *   - เลขบัตรประชาชนไม่ถูกส่งออกทาง API — นักศึกษาจะถูกแทนด้วย
 *     รหัสสาธารณะ (ST-xxxx) และการจองใหม่บันทึกเฉพาะรหัสสาธารณะ
 *************************************************************/

/** เปลี่ยนเป็น Spreadsheet ID ของคุณ หรือปล่อยว่างไว้ถ้า bind กับ Sheet โดยตรง */
var SPREADSHEET_ID = '10NnLn0q3QNthm-MONcD8dg1DLw6GXIKNQI4VI8v6FlY';

var SLOT_STEP = 30; // นาทีต่อช่วงเวลา (ความละเอียดของการจอง)

function getSS() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

/* ---------------------------------------------------------
 *  ENTRY POINTS
 * ------------------------------------------------------- */

function doGet(e) {
  return handleRequest(e, (e && e.parameter) ? e.parameter : {});
}

function doPost(e) {
  var body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    body = (e && e.parameter) ? e.parameter : {};
  }
  return handleRequest(e, body);
}

function handleRequest(e, p) {
  var action = p.action || '';
  try {
    var result;
    switch (action) {
      case 'login':            result = apiLogin(p); break;
      case 'getSettings':      result = apiGetSettings(); break;
      case 'getBookings':      result = apiGetBookings(p); break;
      case 'getAvailability':  result = apiGetAvailability(p); break;
      case 'createBooking':    result = apiCreateBooking(p); break;
      case 'cancelBooking':    result = apiCancelBooking(p); break;
      case 'deleteBooking':    result = apiDeleteBooking(p); break;
      case 'updateStatus':     result = apiUpdateStatus(p); break;
      case 'checkIn':          result = apiCheckIn(p); break;
      case 'updateSettings':   result = apiUpdateSettings(p); break;
      case 'getUsers':         result = apiGetUsers(p); break;
      case 'getStats':         result = apiGetStats(p); break;
      case 'getReport':        result = apiGetReport(p); break;
      case 'getScenarios':     result = apiGetScenarios(); break;
      case 'getBIAccounts':    result = apiGetBIAccounts(p); break;
      case 'addBIAccount':     result = apiAddBIAccount(p); break;
      case 'requestBIAccount': result = apiRequestBIAccount(p); break;
      case 'approveBIAccount': result = apiApproveBIAccount(p); break;
      case 'releaseBIAccount': result = apiReleaseBIAccount(p); break;
      case 'deleteBIAccount':  result = apiDeleteBIAccount(p); break;
      case 'ping':             result = { ok: true, time: new Date().toISOString() }; break;
      default:
        result = { error: 'ไม่รู้จัก action: "' + action + '"' };
    }
    return json(result);
  } catch (err) {
    return json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์: ' + err.message });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------
 *  SHEET HELPERS
 * ------------------------------------------------------- */

function sheet(name) {
  var sh = getSS().getSheetByName(name);
  if (!sh) throw new Error('ไม่พบชีต "' + name + '" กรุณาสร้างตามคู่มือ');
  return sh;
}

function readSheet(name) {
  var sh = sheet(name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { headers: values[0] || [], rows: [] };
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = { _row: i + 1 };
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = values[i][c];
    rows.push(obj);
  }
  return { headers: headers, rows: rows };
}

function appendRow(name, obj) {
  var sh = sheet(name);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  var row = headers.map(function (h) {
    return (obj[h] !== undefined && obj[h] !== null) ? obj[h] : '';
  });
  sh.appendRow(row);
}

function updateRow(name, rowIndex, obj) {
  var sh = sheet(name);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  for (var c = 0; c < headers.length; c++) {
    if (obj[headers[c]] !== undefined) {
      sh.getRange(rowIndex, c + 1).setValue(obj[headers[c]]);
    }
  }
}

function logAction(userId, action) {
  try {
    appendRow('Logs', {
      timestamp: new Date(),
      user_id: userId || '',
      action: action || ''
    });
  } catch (e) { /* ไม่ให้ log error ทำให้ระบบหลักล้ม */ }
}

function fmtDate(d) {
  if (d instanceof Date) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(d).trim();
}

/** แปลงค่าเวลาจากชีต (string หรือ Date) เป็น "HH:MM" */
function fmtTime(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm');
  }
  var s = String(v || '').trim();
  var m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return ('0' + m[1]).slice(-2) + ':' + m[2];
  return s;
}

/* เวลาเป็นนาที */
function t2m(hhmm) {
  var p = String(hhmm || '').split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
}
function m2t(min) {
  var h = Math.floor(min / 60), m = min % 60;
  return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
}
function rangesOverlap(aS, aE, bS, bE) { return aS < bE && bS < aE; }

/* ---------------------------------------------------------
 *  การปกปิดเลขบัตรประชาชน (PDPA)
 *  - นักศึกษาใช้รหัสสาธารณะ "ST-<4ตัวท้าย>-<hash>" แทนเลขบัตรจริง
 *  - API ทุกตัวส่งออกเฉพาะรหัสสาธารณะ ไม่มีเลขบัตรเต็มหลุดออกไป
 * ------------------------------------------------------- */

function shortHash(s) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(s), Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < 3; i++) {
    var b = (raw[i] + 256) % 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return hex; // 6 ตัวอักษร
}

/** รหัสสาธารณะของผู้ใช้ (นักศึกษาเท่านั้นที่ถูกแปลง) */
function pubId(u) {
  var role = String(u.role || '').trim().toLowerCase();
  var id = String(u.user_id || '').trim();
  if (role !== 'student') return id;
  var digits = id.replace(/\D/g, '');
  return 'ST-' + digits.slice(-4) + '-' + shortHash(digits);
}

/** map: เลขจริงในชีต -> รหัสสาธารณะ (ไว้แปลงข้อมูลจองเก่า) */
function buildIdMap(users) {
  var map = {};
  users.forEach(function (u) { map[String(u.user_id).trim()] = pubId(u); });
  return map;
}

/** แปลง user_id ในข้อมูลจอง: ถ้าเป็นเลขบัตร 13 หลักเก่า → รหัสสาธารณะ */
function toPubUid(uid, idmap) {
  uid = String(uid || '').trim();
  if (idmap[uid]) return idmap[uid];
  if (/^\d{13}$/.test(uid)) return 'ST-' + uid.slice(-4) + '-' + shortHash(uid); // เผื่อผู้ใช้ถูกลบไปแล้ว
  return uid;
}

function publicUser(u) {
  // ไม่คืนค่า password และเลขบัตรประชาชนกลับไปฝั่ง client
  return {
    user_id: pubId(u),
    name: String(u.name),
    role: String(u.role).toLowerCase(),
    class_group: String(u.class_group || ''),
    email: String(u.email || '')
  };
}

/* ---------------------------------------------------------
 *  AUTH
 * ------------------------------------------------------- */

function apiLogin(p) {
  var role = (p.role || '').toLowerCase();
  var users = readSheet('Users').rows;

  // ผู้ดูแลระบบ: เข้าด้วยรหัสผ่านอย่างเดียว
  if (role === 'admin') {
    var apass = String(p.password || '');
    if (!apass) return { error: 'กรุณากรอกรหัสผ่าน' };
    var a = users.filter(function (u) {
      return String(u.role).trim().toLowerCase() === 'admin' &&
             String(u.password || '') === apass;
    })[0];
    if (!a) return { error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' };
    logAction(a.user_id, 'login (admin)');
    return { user: publicUser(a) };
  }

  // อาจารย์: อีเมล + รหัสผ่าน
  if (role === 'teacher') {
    var email = String(p.email || '').trim().toLowerCase();
    if (!email) return { error: 'กรุณากรอกอีเมล' };
    var t = users.filter(function (u) {
      return String(u.email).trim().toLowerCase() === email &&
             String(u.role).trim().toLowerCase() === 'teacher';
    })[0];
    if (!t) return { error: 'ไม่พบอีเมลนี้ในระบบ กรุณาติดต่อผู้ดูแล' };
    if (String(t.password || '') !== String(p.password || '')) return { error: 'รหัสผ่านไม่ถูกต้อง' };
    logAction(t.user_id, 'login (teacher)');
    return { user: publicUser(t) };
  }

  // นักศึกษา: เลขบัตรประชาชน 13 หลัก (ใช้ตอน login เท่านั้น ไม่ส่งกลับ)
  if (role === 'student') {
    var cid = String(p.national_id || p.user_id || '').replace(/\D/g, '');
    if (cid.length !== 13) return { error: 'เลขบัตรประชาชนต้องมี 13 หลัก' };
    var s = users.filter(function (u) {
      return String(u.user_id).replace(/\D/g, '') === cid &&
             String(u.role).trim().toLowerCase() === 'student';
    })[0];
    if (!s) return { error: 'ไม่พบเลขบัตรประชาชนนี้ในระบบ กรุณาติดต่ออาจารย์' };
    logAction(pubId(s), 'login (student)');
    return { user: publicUser(s) };
  }

  return { error: 'ระบุประเภทผู้ใช้ไม่ถูกต้อง' };
}

/* ---------------------------------------------------------
 *  SETTINGS  (เวลาเปิด-ปิดแบบยืดหยุ่น จองเป็นช่วงละ 30 นาที)
 * ------------------------------------------------------- */

function rawSettings() {
  var rows = readSheet('Settings').rows;
  var s = rows[0] || {};
  return {
    _row: s._row || 2,
    total_stations: parseInt(s.total_stations, 10) || 1,
    open_days: String(s.open_days || 'mon,tue,wed,thu,fri'),
    open_time: fmtTime(s.open_time) || '08:00',
    close_time: fmtTime(s.close_time) || '20:00',
    max_duration: parseInt(s.max_duration, 10) || 2
  };
}

function apiGetSettings() {
  var s = rawSettings();
  return {
    settings: {
      total_stations: s.total_stations,
      open_days: s.open_days.split(',').map(function (x) { return x.trim(); }).filter(String),
      open_time: s.open_time || '08:00',
      close_time: s.close_time || '20:00',
      slot_step: SLOT_STEP,
      max_duration: s.max_duration
    }
  };
}

function apiUpdateSettings(p) {
  requireAdmin(p); // ตั้งค่าระบบ: ผู้ดูแลเท่านั้น
  var s = rawSettings();
  var patch = {};
  if (p.total_stations !== undefined) patch.total_stations = parseInt(p.total_stations, 10) || 1;
  if (p.open_days !== undefined)
    patch.open_days = Array.isArray(p.open_days) ? p.open_days.join(',') : String(p.open_days);
  if (p.open_time !== undefined)  patch.open_time = fmtTime(p.open_time);
  if (p.close_time !== undefined) patch.close_time = fmtTime(p.close_time);
  if (p.max_duration !== undefined) patch.max_duration = parseInt(p.max_duration, 10) || 1;
  updateRow('Settings', s._row, patch);
  logAction(p.actor_id, 'updateSettings');
  return apiGetSettings();
}

/* ---------------------------------------------------------
 *  BOOKINGS
 * ------------------------------------------------------- */

function bookingToObj(b, idmap) {
  return {
    booking_id: String(b.booking_id),
    user_id: toPubUid(b.user_id, idmap || {}),
    name: String(b.name),
    role: String(b.role),
    date: fmtDate(b.date),
    start_time: fmtTime(b.start_time),
    end_time: fmtTime(b.end_time),
    station_no: b.station_no === '' ? '' : Number(b.station_no),
    subject_case: String(b.subject_case || ''),
    group_size: b.group_size === '' || b.group_size === undefined ? 1 : Number(b.group_size),
    group_members: String(b.group_members || ''),
    bi_account: String(b.bi_account || ''),
    status: String(b.status || 'pending'),
    checked_in: String(b.checked_in || 'no'),
    created_at: b.created_at instanceof Date ? b.created_at.toISOString() : String(b.created_at || ''),
    note: String(b.note || '')
  };
}

function allBookingsPub() {
  var idmap = buildIdMap(readSheet('Users').rows);
  return readSheet('Bookings').rows.map(function (b) { return bookingToObj(b, idmap); });
}

function apiGetBookings(p) {
  var rows = allBookingsPub();

  if (p.user_id) rows = rows.filter(function (b) { return b.user_id === String(p.user_id); });
  if (p.status)  rows = rows.filter(function (b) { return b.status === p.status; });
  if (p.date)    rows = rows.filter(function (b) { return b.date === fmtDate(p.date); });
  if (p.from)    rows = rows.filter(function (b) { return b.date >= fmtDate(p.from); });
  if (p.to)      rows = rows.filter(function (b) { return b.date <= fmtDate(p.to); });

  rows.sort(function (a, b) {
    return (a.date + a.start_time).localeCompare(b.date + b.start_time);
  });
  return { bookings: rows };
}

/** การจองที่ยัง active (pending/approved) ของวันหนึ่ง */
function activeOfDate(all, date) {
  return all.filter(function (b) {
    return b.date === date && (b.status === 'pending' || b.status === 'approved');
  });
}

/** ความว่างรายช่วง 30 นาที ของวันที่กำหนด */
function apiGetAvailability(p) {
  var date = fmtDate(p.date);
  if (!date) return { error: 'กรุณาระบุวันที่' };
  var s = apiGetSettings().settings;
  var day = activeOfDate(allBookingsPub(), date);

  var openM = t2m(s.open_time), closeM = t2m(s.close_time);
  var steps = [];
  for (var m = openM; m < closeM; m += SLOT_STEP) {
    var used = day.filter(function (b) {
      return rangesOverlap(m, m + SLOT_STEP, t2m(b.start_time), t2m(b.end_time));
    }).length;
    steps.push({
      time: m2t(m),
      used: used,
      free: Math.max(0, s.total_stations - used)
    });
  }
  return {
    date: date,
    total_stations: s.total_stations,
    open_time: s.open_time, close_time: s.close_time,
    slot_step: SLOT_STEP, max_duration: s.max_duration,
    steps: steps,
    bookings: day.map(function (b) {
      return { start_time: b.start_time, end_time: b.end_time, status: b.status, subject_case: b.subject_case, name: b.name };
    })
  };
}

function apiCreateBooking(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // กันจองชนกัน (race condition)
  try {
    var s = apiGetSettings().settings;
    var date = fmtDate(p.date);
    var start = fmtTime(p.start_time);
    var end = fmtTime(p.end_time);
    if (!date || !start || !end) return { error: 'กรุณาเลือกวันและช่วงเวลา' };

    var startM = t2m(start), endM = t2m(end);
    var openM = t2m(s.open_time), closeM = t2m(s.close_time);
    if (startM % SLOT_STEP !== 0 || endM % SLOT_STEP !== 0)
      return { error: 'เวลาต้องลงตัวเป็นช่วงละ ' + SLOT_STEP + ' นาที' };
    if (endM <= startM) return { error: 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม' };
    if (startM < openM || endM > closeM)
      return { error: 'จองได้ระหว่าง ' + s.open_time + ' – ' + s.close_time + ' เท่านั้น' };
    if (endM - startM > s.max_duration * 60)
      return { error: 'จองได้ไม่เกิน ' + s.max_duration + ' ชั่วโมงต่อครั้ง' };

    var all = allBookingsPub();
    var day = activeOfDate(all, date);

    // กันจองซ้อนของผู้ใช้คนเดิม
    var dup = day.filter(function (b) {
      return b.user_id === String(p.user_id) &&
             rangesOverlap(startM, endM, t2m(b.start_time), t2m(b.end_time));
    });
    if (dup.length) return { error: 'คุณมีการจองที่คาบเกี่ยวช่วงเวลานี้อยู่แล้ว' };

    // หาเครื่องที่ว่างตลอดช่วงเวลา
    var overlapping = day.filter(function (b) {
      return rangesOverlap(startM, endM, t2m(b.start_time), t2m(b.end_time));
    });
    if (overlapping.length >= s.total_stations)
      return { error: 'ช่วงเวลานี้เต็มแล้ว กรุณาเลือกช่วงอื่น' };
    var station = 1;
    var stationBusy = function (no) {
      return overlapping.some(function (b) { return Number(b.station_no) === no; });
    };
    while (stationBusy(station)) station++;

    var id = 'BK' + Date.now() + Math.floor(Math.random() * 1000);
    var rec = {
      booking_id: id,
      user_id: String(p.user_id || ''),   // รหัสสาธารณะ (ไม่ใช่เลขบัตร)
      name: String(p.name || ''),
      role: String(p.role || 'student'),
      date: date,
      start_time: start,
      end_time: end,
      station_no: station,
      subject_case: String(p.subject_case || ''),
      group_size: parseInt(p.group_size, 10) || 1,
      group_members: String(p.group_members || ''),
      bi_account: '',
      status: 'pending',
      checked_in: 'no',
      created_at: new Date(),
      note: String(p.note || '')
    };
    appendRow('Bookings', rec);
    logAction(p.user_id, 'createBooking ' + id);
    return { booking: bookingToObj(rec, {}) };
  } finally {
    lock.releaseLock();
  }
}

function findBookingRow(bookingId) {
  var data = readSheet('Bookings');
  var b = data.rows.filter(function (r) {
    return String(r.booking_id) === String(bookingId);
  })[0];
  return b || null;
}

function apiCancelBooking(p) {
  var b = findBookingRow(p.booking_id);
  if (!b) return { error: 'ไม่พบการจองนี้' };
  var idmap = buildIdMap(readSheet('Users').rows);
  var staff = (p.role === 'teacher' || p.role === 'admin');
  if (!staff && toPubUid(b.user_id, idmap) !== String(p.user_id)) {
    return { error: 'คุณยกเลิกได้เฉพาะการจองของตัวเอง' };
  }
  updateRow('Bookings', b._row, { status: 'cancelled' });
  logAction(p.user_id || p.actor_id, 'cancelBooking ' + p.booking_id);
  return { ok: true };
}

function apiDeleteBooking(p) {
  // ลบถาวร: เฉพาะผู้ดูแลระบบ
  requireAdmin(p);
  var b = findBookingRow(p.booking_id);
  if (!b) return { error: 'ไม่พบการจองนี้' };
  sheet('Bookings').deleteRow(b._row);
  logAction(p.actor_id, 'deleteBooking ' + p.booking_id);
  return { ok: true };
}

/** อนุมัติ/ปฏิเสธ: ผู้ดูแลระบบเท่านั้น (+ จ่ายบัญชี BI ให้ผู้จองได้) */
function apiUpdateStatus(p) {
  requireAdmin(p);
  var b = findBookingRow(p.booking_id);
  if (!b) return { error: 'ไม่พบการจองนี้' };
  var status = String(p.status || '').toLowerCase();
  if (['approved', 'rejected', 'cancelled', 'pending'].indexOf(status) === -1) {
    return { error: 'สถานะไม่ถูกต้อง' };
  }
  var patch = { status: status };
  if (p.note !== undefined) patch.note = String(p.note);

  // จ่ายบัญชี BI ให้การจอง (เลือกได้หลายบัญชีเมื่อกลุ่มมีหลายคน)
  if (status === 'approved' && p.bi_accounts !== undefined) {
    var ids = Array.isArray(p.bi_accounts)
      ? p.bi_accounts
      : String(p.bi_accounts || '').split(',').map(function (x) { return x.trim(); }).filter(String);
    var idmap = buildIdMap(readSheet('Users').rows);
    var holderId = toPubUid(b.user_id, idmap);
    var names = [];
    ids.forEach(function (accId) {
      var a = biFind(accId);
      if (a && String(a.status) !== 'approved') {
        updateRow('BIAccounts', a._row, {
          status: 'approved',
          holder_id: holderId,
          holder_name: String(b.name || ''),
          updated_at: new Date()
        });
        names.push(String(a.username));
      }
    });
    if (names.length) patch.bi_account = names.join(', ');
  }

  updateRow('Bookings', b._row, patch);
  logAction(p.actor_id, 'updateStatus ' + p.booking_id + ' -> ' + status +
            (patch.bi_account ? ' (BI: ' + patch.bi_account + ')' : ''));
  return { ok: true };
}

function apiCheckIn(p) {
  var b = findBookingRow(p.booking_id);
  if (!b) return { error: 'ไม่พบการจองนี้' };
  var idmap = buildIdMap(readSheet('Users').rows);
  if (p.role !== 'teacher' && p.role !== 'admin' && toPubUid(b.user_id, idmap) !== String(p.user_id)) {
    return { error: 'เช็คอินได้เฉพาะการจองของตัวเอง' };
  }
  if (String(b.status) !== 'approved') {
    return { error: 'เช็คอินได้เฉพาะการจองที่อนุมัติแล้ว' };
  }
  updateRow('Bookings', b._row, { checked_in: 'yes' });
  logAction(p.user_id, 'checkIn ' + p.booking_id);
  return { ok: true };
}

/* ---------------------------------------------------------
 *  USERS / STATS / REPORT
 * ------------------------------------------------------- */

function apiGetUsers(p) {
  // ส่งออกเฉพาะข้อมูลสาธารณะ: ชื่อ บทบาท กลุ่มเรียน (ไม่มีเลขบัตร/รหัสผ่าน)
  var rows = readSheet('Users').rows.map(function (u) {
    var o = publicUser(u);
    if (String(u.role).toLowerCase() === 'student') o.email = '';
    return o;
  });
  return { users: rows };
}

/* ---------------------------------------------------------
 *  SCENARIOS
 * ------------------------------------------------------- */
function apiGetScenarios() {
  var rows = readSheet('Scenarios').rows;
  var list = rows.map(function (r) {
    return {
      no: String(r.scenario_no || r.no || ''),
      title: String(r.title || ''),
      room: String(r.room || ''),
      level: String(r.level || ''),
      pdf: String(r.pdf_url || r.pdf || '')
    };
  }).filter(function (s) { return s.no || s.title; });
  return { scenarios: list };
}

/* ---------------------------------------------------------
 *  BODY INTERACT ACCOUNTS
 *  ชีต BIAccounts: account_id, username, password, status,
 *                  holder_id, holder_name, account_type, updated_at
 *  status: available / pending / approved
 *  account_type: teacher / student  (แยกกลุ่มบัญชีชัดเจน)
 * ------------------------------------------------------- */
function biFind(accountId) {
  var rows = readSheet('BIAccounts').rows;
  return rows.filter(function (r) { return String(r.account_id) === String(accountId); })[0] || null;
}

function biType(a) {
  var t = String(a.account_type || '').trim().toLowerCase();
  return (t === 'student') ? 'student' : 'teacher';
}

function apiGetBIAccounts(p) {
  var role = String(p.role || '').toLowerCase();
  var uid = String(p.user_id || '');
  var rows = readSheet('BIAccounts').rows;
  var list = rows.map(function (a) {
    var o = {
      account_id: String(a.account_id),
      username: String(a.username),
      status: String(a.status || 'available'),
      holder_id: String(a.holder_id || ''),
      holder_name: String(a.holder_name || ''),
      account_type: biType(a)
    };
    // เห็นรหัสผ่าน: admin ทุกบัญชี / ผู้ถือบัญชีที่อนุมัติแล้วเห็นของตัวเอง
    if (role === 'admin' || (o.status === 'approved' && o.holder_id === uid)) {
      o.password = String(a.password || '');
    }
    return o;
  });
  // แยกให้เห็นเฉพาะประเภทของตนเอง (admin เห็นทั้งหมด)
  if (role === 'teacher') list = list.filter(function (a) { return a.account_type === 'teacher'; });
  if (role === 'student') list = list.filter(function (a) { return a.account_type === 'student'; });
  return { accounts: list };
}

function apiAddBIAccount(p) {
  requireAdmin(p);
  var username = String(p.username || '').trim();
  var password = String(p.password || '').trim();
  var type = String(p.account_type || 'teacher').toLowerCase() === 'student' ? 'student' : 'teacher';
  if (!username || !password) return { error: 'กรุณากรอก username และ password' };
  var id = 'BI' + Date.now() + Math.floor(Math.random() * 1000);
  appendRow('BIAccounts', {
    account_id: id, username: username, password: password,
    status: 'available', holder_id: '', holder_name: '',
    account_type: type, updated_at: new Date()
  });
  logAction(p.actor_id, 'addBIAccount ' + username + ' (' + type + ')');
  return { ok: true };
}

function apiRequestBIAccount(p) {
  var a = biFind(p.account_id);
  if (!a) return { error: 'ไม่พบบัญชีนี้' };
  if (String(a.status) !== 'available') return { error: 'บัญชีนี้ถูกใช้งานอยู่' };
  // ขอได้เฉพาะบัญชีประเภทเดียวกับบทบาทตนเอง (admin ขอแทนได้ทุกประเภท)
  var role = String(p.role || '').toLowerCase();
  if (role !== 'admin' && biType(a) !== role) {
    return { error: 'บัญชีนี้เป็นของกลุ่ม' + (biType(a) === 'teacher' ? 'อาจารย์' : 'นักศึกษา') + 'เท่านั้น' };
  }
  updateRow('BIAccounts', a._row, {
    status: 'pending', holder_id: String(p.user_id || ''),
    holder_name: String(p.name || ''), updated_at: new Date()
  });
  logAction(p.user_id, 'requestBIAccount ' + p.account_id);
  return { ok: true };
}

function apiApproveBIAccount(p) {
  requireAdmin(p);
  var a = biFind(p.account_id);
  if (!a) return { error: 'ไม่พบบัญชีนี้' };
  if (String(a.status) !== 'pending') return { error: 'บัญชีนี้ไม่มีคำขอที่รออนุมัติ' };
  updateRow('BIAccounts', a._row, { status: 'approved', updated_at: new Date() });
  logAction(p.actor_id, 'approveBIAccount ' + p.account_id);
  return { ok: true };
}

function apiReleaseBIAccount(p) {
  var a = biFind(p.account_id);
  if (!a) return { error: 'ไม่พบบัญชีนี้' };
  var role = String(p.role || '').toLowerCase();
  if (role !== 'admin' && String(a.holder_id) !== String(p.user_id || '')) {
    return { error: 'คืนได้เฉพาะบัญชีของตัวเอง' };
  }
  updateRow('BIAccounts', a._row, { status: 'available', holder_id: '', holder_name: '', updated_at: new Date() });
  logAction(p.user_id || p.actor_id, 'releaseBIAccount ' + p.account_id);
  return { ok: true };
}

function apiDeleteBIAccount(p) {
  requireAdmin(p);
  var a = biFind(p.account_id);
  if (!a) return { error: 'ไม่พบบัญชีนี้' };
  sheet('BIAccounts').deleteRow(a._row);
  logAction(p.actor_id, 'deleteBIAccount ' + p.account_id);
  return { ok: true };
}

/* ---------------------------------------------------------
 *  สิทธิ์ผู้ใช้  (ตรวจจาก actor_id ซึ่งเป็นรหัสสาธารณะ)
 * ------------------------------------------------------- */
function actorOf(p) {
  var users = readSheet('Users').rows;
  var target = String(p.actor_id || '');
  return users.filter(function (u) {
    return pubId(u) === target || String(u.user_id) === target;
  })[0] || null;
}

// อาจารย์หรือผู้ดูแลระบบ
function requireStaff(p) {
  var actor = actorOf(p);
  var role = actor ? String(actor.role).toLowerCase() : '';
  if (role !== 'teacher' && role !== 'admin') throw new Error('ต้องเป็นอาจารย์หรือผู้ดูแลระบบเท่านั้น');
  return actor;
}

// ผู้ดูแลระบบเท่านั้น (อนุมัติ / ลบถาวร / ตั้งค่า)
function requireAdmin(p) {
  var actor = actorOf(p);
  var role = actor ? String(actor.role).toLowerCase() : '';
  if (role !== 'admin') throw new Error('ต้องเป็นผู้ดูแลระบบเท่านั้น');
  return actor;
}

function apiGetStats(p) {
  var all = allBookingsPub();
  var s = apiGetSettings().settings;
  var today = fmtDate(new Date());

  var todays = all.filter(function (b) {
    return b.date === today && b.status !== 'cancelled' && b.status !== 'rejected';
  });

  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
  var weekStr = fmtDate(weekAgo);
  var weekly = all.filter(function (b) {
    return b.date >= weekStr && b.date <= today &&
           b.status !== 'cancelled' && b.status !== 'rejected';
  });

  // นับช่วง 30 นาทีที่ยังว่างของวันนี้
  var avail = apiGetAvailability({ date: today });
  var freeToday = 0, totalSteps = 0;
  if (avail.steps) {
    avail.steps.forEach(function (st) { freeToday += st.free; });
    totalSteps = avail.steps.length * s.total_stations;
  }

  var freeBI = readSheet('BIAccounts').rows.filter(function (a) {
    return String(a.status || 'available').toLowerCase() === 'available';
  }).length;

  return {
    today: today,
    bookings_today: todays.length,
    pending: all.filter(function (b) { return b.status === 'pending'; }).length,
    approved_today: todays.filter(function (b) { return b.status === 'approved'; }).length,
    free_slots_today: freeToday,
    free_bi_today: freeBI,
    total_slots_today: totalSteps,
    weekly_total: weekly.length,
    checked_in_today: todays.filter(function (b) { return b.checked_in === 'yes'; }).length
  };
}

function apiGetReport(p) {
  var all = allBookingsPub();
  if (p.from) all = all.filter(function (b) { return b.date >= fmtDate(p.from); });
  if (p.to)   all = all.filter(function (b) { return b.date <= fmtDate(p.to); });

  var byUser = {};
  all.forEach(function (b) {
    if (b.status === 'cancelled' || b.status === 'rejected') return;
    var k = b.user_id; // รหัสสาธารณะ
    if (!byUser[k]) byUser[k] = { user_id: b.user_id, name: b.name, count: 0, cases: {} };
    byUser[k].count++;
    var c = b.subject_case || '(ไม่ระบุ)';
    byUser[k].cases[c] = (byUser[k].cases[c] || 0) + 1;
  });
  var users = Object.keys(byUser).map(function (k) {
    var u = byUser[k];
    u.cases = Object.keys(u.cases).map(function (c) { return { case: c, count: u.cases[c] }; });
    return u;
  }).sort(function (a, b) { return b.count - a.count; });

  var byCase = {};
  all.forEach(function (b) {
    if (b.status === 'cancelled' || b.status === 'rejected') return;
    var c = b.subject_case || '(ไม่ระบุ)';
    byCase[c] = (byCase[c] || 0) + 1;
  });
  var cases = Object.keys(byCase).map(function (c) {
    return { case: c, count: byCase[c] };
  }).sort(function (a, b) { return b.count - a.count; });

  return { by_user: users, by_case: cases, total: all.length };
}

/* ---------------------------------------------------------
 *  UPGRADE: รันหนึ่งครั้งหลังอัปเดตโค้ด (เมนู Run > upgradeSheets)
 *  เพิ่มคอลัมน์ใหม่ + ค่าเริ่มต้น โดยไม่กระทบข้อมูลเดิม
 * ------------------------------------------------------- */
function upgradeSheets() {
  var need = {
    'Settings':   ['open_time', 'close_time'],
    'Bookings':   ['bi_account'],
    'BIAccounts': ['account_type']
  };
  Object.keys(need).forEach(function (name) {
    var sh = sheet(name);
    var lastCol = sh.getLastColumn();
    var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(function (h) { return String(h).trim(); });
    need[name].forEach(function (col) {
      if (headers.indexOf(col) === -1) {
        lastCol++;
        sh.getRange(1, lastCol).setValue(col);
        headers.push(col);
      }
    });
  });
  // ค่าเริ่มต้น Settings
  var s = rawSettings();
  var patch = {};
  if (!fmtTime(s.open_time))  patch.open_time = '08:00';
  if (!fmtTime(s.close_time)) patch.close_time = '20:00';
  patch.open_time = s.open_time || '08:00';
  patch.close_time = s.close_time || '20:00';
  updateRow('Settings', s._row, patch);
  // ค่าเริ่มต้นประเภทบัญชี BI = teacher
  var bi = readSheet('BIAccounts');
  bi.rows.forEach(function (a) {
    if (!String(a.account_type || '').trim()) {
      updateRow('BIAccounts', a._row, { account_type: 'teacher' });
    }
  });
  Logger.log('upgradeSheets: เสร็จสิ้น');
}
