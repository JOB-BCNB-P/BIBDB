/*************************************************************
 * Notify.gs – บริการส่งอีเมลแจ้งผู้ดูแลระบบ (Body Interact)
 * Supabase จะเรียก Web app นี้ทุกครั้งที่ "อาจารย์/นักศึกษา" จองหรือยกเลิกการจอง
 *
 * ติดตั้ง (ทำครั้งเดียว)
 *   1) เปิด script.google.com ด้วยบัญชี @bcn.ac.th ที่จะเป็น "ผู้ส่ง" อีเมล
 *      > New project > ตั้งชื่อ "BI Notify" > วางโค้ดนี้แทนทั้งหมด
 *   2) Project Settings > Script Properties > Add
 *        NOTIFY_SECRET = ข้อความลับยาว ๆ (เช่น สุ่ม 40 ตัวอักษร) — ต้องตรงกับ 03_notify_setup.sql
 *        APP_URL       = ลิงก์หน้าเว็บระบบจองบน GitHub Pages (ใส่ในอีเมลให้กดเข้าไปอนุมัติ)
 *   3) เลือกฟังก์ชัน testSend > Run > อนุญาตสิทธิ์ (ส่งอีเมลทดสอบหาตัวเอง)
 *   4) Deploy > New deployment > Web app
 *        Execute as: Me   |   Who has access: Anyone
 *      คัดลอก Web app URL (ลงท้าย /exec) ไปใส่ใน 03_notify_setup.sql
 *
 * ความปลอดภัย: คำขอที่ไม่มี NOTIFY_SECRET ถูกต้องจะถูกปฏิเสธ จึงไม่มีใครใช้ URL นี้ส่งเมลแทนได้
 *************************************************************/

var TZ = 'Asia/Bangkok';
var MONTH_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
var DOW_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function doPost(e) {
  var out = { ok: false };
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var secret = PropertiesService.getScriptProperties().getProperty('NOTIFY_SECRET');
    if (!secret || body.secret !== secret) {
      out.error = 'unauthorized';
    } else {
      sendBookingMail_(body);
      out.ok = true;
    }
  } catch (err) {
    out.error = String(err && err.message || err);
    console.error(out.error);
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('BI Notify: OK');
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function thaiDate_(iso) {
  var p = String(iso || '').split('-');
  if (p.length !== 3) return iso;
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  return 'วัน' + DOW_TH[d.getDay()] + 'ที่ ' + d.getDate() + ' ' + MONTH_TH[d.getMonth()] + ' ' + (d.getFullYear() + 543);
}

function roleTh_(r) {
  return r === 'teacher' ? 'อาจารย์' : r === 'admin' ? 'ผู้ดูแลระบบ' : 'นักศึกษา';
}

function sendBookingMail_(body) {
  var to = (body.to || []).filter(function (x) { return /@/.test(String(x)); });
  if (!to.length) throw new Error('ไม่มีอีเมลผู้รับ');
  var b = body.booking || {};
  var a = body.actor || {};
  var created = body.event !== 'cancelled';
  var appUrl = PropertiesService.getScriptProperties().getProperty('APP_URL') || '';

  var head = created ? '📅 มีการจองใหม่ รออนุมัติ' : '❌ มีการยกเลิกการจอง';
  var color = created ? '#0e7c86' : '#b42318';
  var subject = '[Body Interact] ' + (created ? 'จองใหม่' : 'ยกเลิกการจอง') + ' – ' +
                (a.name || b.name) + ' · ' + thaiDate_(b.date) + ' ' + b.start_time + '–' + b.end_time;

  var rows = [
    ['ผู้จอง', esc_(a.name || b.name) + ' (' + roleTh_(a.role || b.role) +
               (a.class_group ? ' · ' + esc_(a.class_group) : '') + ')'],
    ['อีเมล', esc_(a.email || '-')],
    ['วันที่', esc_(thaiDate_(b.date))],
    ['เวลา', esc_(b.start_time + ' – ' + b.end_time + ' น.')],
    ['เครื่องที่', esc_(b.station_no === '' ? '-' : b.station_no)],
    ['Scenario', esc_(b.subject_case || '-')],
    ['อาจารย์ผู้ควบคุม', esc_(b.supervisor || '-')],
    ['จำนวนผู้ฝึก', esc_(b.group_size || 1) + ' คน' + (b.group_members ? ' (' + esc_(b.group_members) + ')' : '')],
    ['ขอบัญชี BI', (Number(b.bi_count_teacher) || Number(b.bi_count_student))
        ? 'User อาจารย์ ' + esc_(b.bi_count_teacher || 0) + ' · User นักศึกษา ' + esc_(b.bi_count_student || 0) + ' บัญชี'
        : esc_(b.bi_count || 0) + ' บัญชี'],
    ['หมายเหตุ', esc_(b.note || '-')],
    ['รหัสการจอง', esc_(b.booking_id)]
  ];
  var table = rows.map(function (r) {
    return '<tr><td style="padding:6px 12px;color:#667085;white-space:nowrap;vertical-align:top">' + r[0] +
           '</td><td style="padding:6px 12px;color:#101828">' + r[1] + '</td></tr>';
  }).join('');

  var btn = (created && appUrl)
    ? '<p style="margin:20px 0 0"><a href="' + esc_(appUrl) + '" style="background:' + color +
      ';color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">เปิดระบบเพื่ออนุมัติ</a></p>'
    : '';

  var html =
    '<div style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eaecf0;border-radius:12px;overflow:hidden">' +
      '<div style="background:' + color + ';color:#fff;padding:14px 18px;font-size:17px;font-weight:bold">' + head + '</div>' +
      '<div style="padding:16px 6px">' +
        '<table style="border-collapse:collapse;font-size:14px">' + table + '</table>' + btn +
      '</div>' +
      '<div style="background:#f9fafb;color:#98a2b3;font-size:12px;padding:10px 18px">' +
        'อีเมลอัตโนมัติจากระบบจอง Body Interact · วิทยาลัยพยาบาลบรมราชชนนี กรุงเทพ · ส่งเมื่อ ' +
        Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + ' น.' +
      '</div>' +
    '</div>';

  var mail = { to: to.join(','), subject: subject, htmlBody: html, name: 'ระบบจอง Body Interact' };
  if (a.email) mail.replyTo = a.email;   // กด "ตอบกลับ" แล้วถึงผู้จองโดยตรง
  MailApp.sendEmail(mail);
}

/** ทดสอบ: ส่งอีเมลตัวอย่างหาตัวเอง (กด Run ที่ฟังก์ชันนี้) */
function testSend() {
  sendBookingMail_({
    event: 'created',
    to: [Session.getActiveUser().getEmail()],
    actor: { name: 'ทดสอบ ระบบ', role: 'student', email: '', class_group: 'พย.2/1' },
    booking: { booking_id: 'TEST', name: 'ทดสอบ ระบบ', role: 'student',
               date: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
               start_time: '09:00', end_time: '10:00', station_no: 1, subject_case: 'Shock',
               supervisor: 'อ.ทดสอบ', group_size: 2, group_members: 'ก, ข', bi_count: 1, note: 'ทดสอบ' }
  });
  Logger.log('ส่งแล้ว → ' + Session.getActiveUser().getEmail() + ' | โควตาคงเหลือวันนี้: ' + MailApp.getRemainingDailyQuota());
}
