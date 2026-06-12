/* =========================================================
   Body Interact – ระบบจองเข้าใช้งาน  (app.js)
   วิทยาลัยพยาบาลบรมราชชนนี กรุงเทพ
   ========================================================= */

/* ====== ตั้งค่า ======
   หลัง deploy Apps Script แล้ว ให้นำ Web App URL มาวางแทนค่าด้านล่าง
   ถ้ายังเป็นค่า PASTE_YOUR... ระบบจะทำงานในโหมดทดลอง (mock data) ให้อัตโนมัติ */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxe4Gld_vKsps_aGSOS_lv8rTxjn6zc1BIl9QG05scSWXqjyx_ZbPQFy6Fygf0pq26P/exec'
};

const MOCK_MODE = !CONFIG.API_URL || CONFIG.API_URL.indexOf('PASTE_YOUR') === 0;

/* ---------- helpers วันที่ ---------- */
function pad(n){ return String(n).padStart(2,'0'); }
function toISO(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function todayISO(){ return toISO(new Date()); }
function parseISO(s){ const p=String(s).split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
const DOW_TH = ['อา','จ','อ','พ','พฤ','ศ','ส'];
const DOW_KEY = ['sun','mon','tue','wed','thu','fri','sat'];
const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const MONTH_TH_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
function fmtThaiDate(iso){ const d=parseISO(iso); return d.getDate()+' '+MONTH_TH[d.getMonth()]+' '+(d.getFullYear()+543); }
function fmtThaiShort(iso){ const d=parseISO(iso); return DOW_TH[d.getDay()]+' '+d.getDate()+' '+MONTH_TH[d.getMonth()]; }
function startOfWeek(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function startOfMonth(d){ const x=new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x; }
function addMonths(d,n){ return new Date(d.getFullYear(), d.getMonth()+n, 1); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

/* ---------- icons ---------- */
/* ไอคอนสไตล์ duotone มน ๆ น่ารัก: มีพื้นพาสเทลนุ่ม (f-opacity .18) ซ้อนกับเส้นโค้งหนา */
const F = ' fill="currentColor" fill-opacity=".18" stroke="none"';   // เลเยอร์พื้นนุ่ม
const D = ' fill="currentColor" stroke="none"';                       // จุดทึบ
const I = {
  dash:'<rect x="3" y="3" width="8" height="8" rx="2.6"'+F+'/><rect x="13" y="13" width="8" height="8" rx="2.6"'+F+'/>'
      +'<rect x="3" y="3" width="8" height="8" rx="2.6"/><rect x="13.5" y="3" width="7.5" height="6" rx="2.6"/>'
      +'<rect x="13" y="13" width="8" height="8" rx="2.6"/><rect x="3" y="15" width="8" height="6" rx="2.6"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="4.5"'+F+'/><rect x="3" y="5" width="18" height="16" rx="4.5"/>'
      +'<path d="M3.5 10h17"/><path d="M8 3v3.4M16 3v3.4"/><circle cx="12" cy="15.5" r="1.5"'+D+'/>',
  plus:'<circle cx="12" cy="12" r="9"'+F+'/><circle cx="12" cy="12" r="9"/><path d="M12 8.2v7.6M8.2 12h7.6"/>',
  list:'<rect x="3" y="4" width="18" height="16" rx="4.5"'+F+'/><rect x="3" y="4" width="18" height="16" rx="4.5"/>'
      +'<path d="M8 9h9M8 12h9M8 15h6"/><circle cx="5.6" cy="9" r=".95"'+D+'/><circle cx="5.6" cy="12" r=".95"'+D+'/><circle cx="5.6" cy="15" r=".95"'+D+'/>',
  gear:'<circle cx="12" cy="12" r="3.4"'+F+'/><circle cx="12" cy="12" r="3.4"/>'
      +'<path d="M12 2.6v3.1M12 18.3v3.1M21.4 12h-3.1M5.7 12H2.6M18.6 5.4l-2.2 2.2M7.6 16.4l-2.2 2.2M18.6 18.6l-2.2-2.2M7.6 7.6 5.4 5.4"/>',
  report:'<rect x="3" y="3" width="18" height="18" rx="5"'+F+'/><rect x="3" y="3" width="18" height="18" rx="5"/>'
      +'<path d="M8 16v-3.2M12 16V9.5M16 16v-4.6" stroke-width="2.4"/>',
  check:'<circle cx="12" cy="12" r="9"'+F+'/><circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.6 2.6L16 9.3"/>',
  x:'<circle cx="12" cy="12" r="9"'+F+'/><circle cx="12" cy="12" r="9"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
  clock:'<circle cx="12" cy="12" r="9"'+F+'/><circle cx="12" cy="12" r="9"/><path d="M12 7.4V12l3.1 1.9"/>',
  user:'<circle cx="12" cy="8.6" r="4"'+F+'/><circle cx="12" cy="8.6" r="4"/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"'+F+'/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"/>',
  pin:'<path d="M12 21c4-4.6 7-7.7 7-11a7 7 0 1 0-14 0c0 3.3 3 6.4 7 11z"'+F+'/><path d="M12 21c4-4.6 7-7.7 7-11a7 7 0 1 0-14 0c0 3.3 3 6.4 7 11z"/><circle cx="12" cy="10" r="2.4"/>',
  pulse:'<path d="M12 20.3C6.5 16.4 3 13.2 3 9.4 3 6.6 5.1 5 7.3 5c1.8 0 3.4 1 4.7 2.6C13.3 6 14.9 5 16.7 5 18.9 5 21 6.6 21 9.4c0 3.8-3.5 7-9 10.9z"'+F+'/><path d="M3.4 12.1H9l1-1.5 1.8 3.5 2.7-5.6L16 12.1h4.6"/>',
  book:'<path d="M5 5A3 3 0 0 1 8 2h11v15H8a3 3 0 0 0-3 3z"'+F+'/><path d="M5 5A3 3 0 0 1 8 2h11v17H8a3 3 0 0 0-3 3z"/><path d="M5 19.2A3 3 0 0 1 8 17h11"/>',
  dl:'<path d="M5 13.5v3A3.5 3.5 0 0 0 8.5 20h7a3.5 3.5 0 0 0 3.5-3.5v-3"'+F+'/><path d="M5 13.5v3A3.5 3.5 0 0 0 8.5 20h7a3.5 3.5 0 0 0 3.5-3.5v-3"/><path d="M12 3.5v9.5M8.3 9.8l3.7 3.7 3.7-3.7"/>',
  info:'<circle cx="12" cy="12" r="9"'+F+'/><circle cx="12" cy="12" r="9"/><path d="M12 11.2v4.6"/><circle cx="12" cy="7.9" r="1.1"'+D+'/>',
  heart:'<path d="M12 20.5C6.5 16.6 3 13.3 3 9.2 3 6.3 5.2 4.5 7.6 4.5c1.7 0 3.3.9 4.4 2.4 1.1-1.5 2.7-2.4 4.4-2.4C18.8 4.5 21 6.3 21 9.2c0 4.1-3.5 7.4-9 11.3z"'+F+'/><path d="M12 20.5C6.5 16.6 3 13.3 3 9.2 3 6.3 5.2 4.5 7.6 4.5c1.7 0 3.3.9 4.4 2.4 1.1-1.5 2.7-2.4 4.4-2.4C18.8 4.5 21 6.3 21 9.2c0 4.1-3.5 7.4-9 11.3z"/>',
  cap:'<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"'+F+'/><path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5z"/><path d="M6.5 11.4v4.1c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.1"/><path d="M21.5 9.5v4.2"/>',
  out:'<path d="M14 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h7"'+F+'/><path d="M14 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h7"/><path d="M16 15.5 19.5 12 16 8.5M19.5 12H9.5"/>',
  key:'<circle cx="8" cy="14" r="4.2"'+F+'/><circle cx="8" cy="14" r="4.2"/><path d="M11 11 20 2"/><path d="M16.5 5.5 19 8M14.5 7.5 17 10"/>',
  doc:'<path d="M6 3h7l5 5v13H6z"'+F+'/><path d="M6 3h7l5 5v13H6z"/><path d="M13 3v5h5"/><path d="M9 13h6M9 16.5h6"/>',
  ext:'<path d="M5 5h6v2H7v10h10v-4h2v6H5z"'+F+'/><path d="M5 5h6v2H7v10h10v-4h2v6H5z"/><path d="M14 5h5v5M19 5l-7 7"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2.2"'+F+'/><rect x="14" y="3" width="7" height="7" rx="2.2"/><rect x="3" y="14" width="7" height="7" rx="2.2"/><rect x="14" y="14" width="7" height="7" rx="2.2"'+F+'/><rect x="3" y="3" width="7" height="7" rx="2.2"/><rect x="14" y="3" width="7" height="7" rx="2.2"/><rect x="3" y="14" width="7" height="7" rx="2.2"/><rect x="14" y="14" width="7" height="7" rx="2.2"/>',
};
function svg(path, cls){ return '<svg '+(cls?'class="'+cls+'" ':'')+'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>'; }

/* ---------- DOM helpers ---------- */
const $ = (id)=>document.getElementById(id);
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
/* ---------- role helpers ---------- */
function isAdmin(){ return State.user && State.user.role==='admin'; }
function isStaff(){ return State.user && (State.user.role==='teacher' || State.user.role==='admin'); }

/* =========================================================
   API LAYER
   ========================================================= */
async function api(action, params){
  params = params || {};
  if (MOCK_MODE) return MockAPI.handle(action, params);
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // เลี่ยง CORS preflight
      body: JSON.stringify(Object.assign({ action }, params)),
      redirect: 'follow'
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return { error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตหรือ URL' };
  }
}

/* =========================================================
   STATE / SESSION
   ========================================================= */
const State = {
  user: null,
  settings: null,
  view: null,
  loginTab: 'student',
  bookDate: todayISO(),
  weekStart: startOfWeek(new Date()),
};

const SESSION_KEY = 'bi_session_v1';
function saveSession(u){ localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
function loadSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)); }catch(e){ return null; } }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

/* =========================================================
   APP
   ========================================================= */
const App = {
  async boot(){
    if (MOCK_MODE) showDemoBanner();
    const u = loadSession();
    if (u && u.user_id){
      State.user = u;
      await App.enterApp();
    } else {
      $('loginView').classList.remove('hidden');
      App.renderLoginCal();
    }
  },

  loginMonthShift(n){
    State._loginMonth = addMonths(State._loginMonth || startOfMonth(new Date()), n);
    App.renderLoginCal();
  },

  async renderLoginCal(){
    const grid = $('loginCal'); if (!grid) return;
    const base = State._loginMonth || (State._loginMonth = startOfMonth(new Date()));
    $('loginCalLabel').textContent = MONTH_TH_FULL[base.getMonth()] + ' ' + (base.getFullYear()+543);

    // ช่วงตาราง: เริ่มจันทร์ของสัปดาห์ที่มีวันที่ 1 → 6 สัปดาห์
    const first = startOfWeek(base);
    const cells = [];
    for (let i=0;i<42;i++) cells.push(addDays(first, i));
    const from = toISO(cells[0]), to = toISO(cells[41]);

    grid.innerHTML = '<div class="mc-loading"><div class="spinner"></div></div>';
    let all = [];
    try {
      if (!State._pubSettings){
        const st = await api('getSettings');
        State._pubSettings = st.settings || { total_stations:1, time_slots:[], open_days:['mon','tue','wed','thu','fri'] };
      }
      const bk = await api('getBookings', { from, to });
      all = (bk.bookings||[]).filter(b=> b.status!=='cancelled' && b.status!=='rejected');
    } catch(e){ all = []; }
    State._loginBk = all;

    const dows = ['จ','อ','พ','พฤ','ศ','ส','อา'];
    let head = dows.map(d=>`<div class="mc-dow">${d}</div>`).join('');
    let body = '';
    cells.forEach(d=>{
      const iso = toISO(d);
      const inMonth = d.getMonth()===base.getMonth();
      const isToday = iso===todayISO();
      const cnt = all.filter(b=>b.date===iso).length;
      const click = inMonth ? ` onclick="App.loginDayDetail('${iso}')"` : '';
      body += `<div class="mc-cell ${inMonth?'':'out'} ${isToday?'today':''} ${inMonth?'click':''} ${cnt>0?'has':''}"${click}>
        <span class="mc-d">${d.getDate()}</span>
        ${cnt>0?`<span class="mc-badge">${cnt}</span>`:''}
      </div>`;
    });
    grid.innerHTML = `<div class="mc-grid mc-head">${head}</div><div class="mc-grid mc-body">${body}</div>`;
  },

  loginDayDetail(iso){
    const s = State._pubSettings || { total_stations:1, time_slots:[] };
    const day = (State._loginBk||[]).filter(b=>b.date===iso);
    const slots = s.time_slots || [];
    let rows;
    if (!slots.length){
      rows = `<div class="muted-row">ยังไม่ได้ตั้งค่ารอบเวลา</div>`;
    } else {
      rows = slots.map(slot=>{
        const start = slot.split('-')[0];
        const inSlot = day.filter(b=>b.start_time===start);
        const used = inSlot.length;
        const full = used >= s.total_stations;
        const free = Math.max(0, s.total_stations - used);
        const cases = inSlot.map(b=>{
          const st = b.status==='pending'?'<span class="badge pending">รออนุมัติ</span>':'<span class="badge approved">อนุมัติ</span>';
          return `<div class="dd-case">${esc(b.subject_case||'ไม่ระบุเคส')} ${st}</div>`;
        }).join('');
        return `<div class="dd-slot ${full?'full':''}">
          <div class="dd-slot-head">
            <b>${esc(slot)}</b>
            <span class="${full?'dd-full':'dd-free'}">${full?'เต็ม':('ว่าง '+free+'/'+s.total_stations)}</span>
          </div>
          ${cases || '<div class="dd-empty">ยังไม่มีการจอง</div>'}
        </div>`;
      }).join('');
    }
    openModal(`
      <div class="dd">
        <div class="dd-date">${svg(I.cal)} การจองวันที่ ${fmtThaiDate(iso)}</div>
        <div class="dd-list">${rows}</div>
      </div>`);
  },

  switchLoginTab(tab){
    State.loginTab = tab;
    ['student','teacher','admin'].forEach(t=>{
      const seg = $('seg'+t.charAt(0).toUpperCase()+t.slice(1));
      if (seg) seg.classList.toggle('active', tab===t);
      const form = $(t+'Form');
      if (form) form.classList.toggle('hidden', tab!==t);
    });
  },

  async loginStudent(e){
    e.preventDefault();
    const cid = $('sCid').value.replace(/\D/g,'');
    if (cid.length !== 13) return toast('กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก', 'err');
    const btn = e.target.querySelector('button[type=submit]');
    setLoading(btn, true);
    const r = await api('login', { role:'student', national_id: cid });
    setLoading(btn, false, 'เข้าสู่ระบบ');
    if (r.error) return toast(r.error, 'err');
    State.user = r.user; saveSession(r.user);
    await App.enterApp();
  },

  async loginTeacher(e){
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    setLoading(btn, true);
    const r = await api('login', {
      role:'teacher',
      email: $('tEmail').value.trim(),
      password: $('tPass').value
    });
    setLoading(btn, false, 'เข้าสู่ระบบ');
    if (r.error) return toast(r.error, 'err');
    State.user = r.user; saveSession(r.user);
    await App.enterApp();
  },

  async loginAdmin(e){
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    setLoading(btn, true);
    const r = await api('login', { role:'admin', password: $('aPass').value });
    setLoading(btn, false, 'เข้าสู่ระบบ');
    if (r.error) return toast(r.error, 'err');
    State.user = r.user; saveSession(r.user);
    await App.enterApp();
  },

  logout(){
    confirmModal('ออกจากระบบ', 'ต้องการออกจากระบบใช่หรือไม่?', 'ออกจากระบบ', ()=>{
      clearSession(); location.reload();
    });
  },

  async enterApp(){
    $('loginView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    const u = State.user;
    const roleLabel = u.role==='admin' ? 'ผู้ดูแลระบบ'
                    : u.role==='teacher' ? 'อาจารย์'
                    : ('นักศึกษา'+(u.class_group?(' · '+u.class_group):''));
    $('uName').textContent = u.name;
    $('uRole').textContent = roleLabel;
    $('uAvatar').textContent = (u.name||'?').trim().charAt(0).toUpperCase();

    const s = await api('getSettings');
    State.settings = s.settings || { total_stations:1, open_days:['mon','tue','wed','thu','fri'], time_slots:[], max_duration:2 };

    App.renderNav();
    App.go(isStaff() ? 'tdash' : 'sdash');
  },

  renderNav(){
    const role = State.user.role;
    let items;
    if (role==='admin'){
      items = [
        ['tdash', I.dash, 'ภาพรวม'],
        ['tbookings', I.list, 'การจองทั้งหมด'],
        ['tcal', I.cal, 'ปฏิทิน'],
        ['tscenarios', I.grid, 'Scenarios'],
        ['tbi', I.key, 'บัญชี BI'],
        ['treport', I.report, 'รายงาน'],
        ['tsettings', I.gear, 'ตั้งค่า'],
      ];
    } else if (role==='teacher'){
      items = [
        ['tdash', I.dash, 'ภาพรวม'],
        ['tbookings', I.list, 'การจองทั้งหมด'],
        ['tcal', I.cal, 'ปฏิทิน'],
        ['tscenarios', I.grid, 'Scenarios'],
        ['tbi', I.key, 'บัญชี BI'],
        ['treport', I.report, 'รายงาน'],
      ];
    } else {
      items = [
        ['sdash', I.dash, 'หน้าหลัก'],
        ['sbook', I.plus, 'จองคิว'],
        ['scal', I.cal, 'ปฏิทิน'],
        ['smine', I.book, 'การจองของฉัน'],
      ];
    }
    $('nav').innerHTML = items.map(([v,ic,label])=>
      `<button data-v="${v}" onclick="App.go('${v}')">${svg(ic)}${label}</button>`
    ).join('');
  },

  go(view){
    State.view = view;
    document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active', b.dataset.v===view));
    const m = $('main');
    m.innerHTML = '<div class="loading"><div class="spinner"></div>กำลังโหลด…</div>';
    const fn = Views[view];
    if (fn) fn(m); else m.innerHTML = '<div class="empty">ไม่พบหน้านี้</div>';
    window.scrollTo({top:0, behavior:'smooth'});
  }
};

/* =========================================================
   VIEWS
   ========================================================= */
const Views = {};

/* ---------- นักศึกษา: หน้าหลัก ---------- */
Views.sdash = async function(m){
  const [bk, av] = await Promise.all([
    api('getBookings', { user_id: State.user.user_id }),
    api('getAvailability', { date: todayISO() })
  ]);
  const mine = (bk.bookings||[]);
  const upcoming = mine.filter(b=> b.date>=todayISO() && (b.status==='approved'||b.status==='pending'))
                       .sort((a,b)=> (a.date+a.start_time).localeCompare(b.date+b.start_time));
  const freeToday = (av.slots||[]).reduce((n,s)=>n+s.free,0);
  const pendingCount = mine.filter(b=>b.status==='pending').length;

  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>สวัสดี ${esc(State.user.name.split(' ')[0])} 👋</h2><span class="hint">ยินดีต้อนรับสู่ระบบจอง Body Interact</span></div>
      <div class="grid cols-3" style="margin-bottom:18px">
        ${stat('mint', I.book, upcoming.length, 'คิวที่กำลังจะถึง')}
        ${stat('warn', I.clock, pendingCount, 'รออนุมัติ')}
        ${stat('sky', I.pulse, freeToday, 'เครื่องว่างวันนี้')}
      </div>

      <div class="card">
        <div class="section-head"><h3>คิวของฉันที่กำลังจะถึง</h3><span class="topbar-spacer"></span>
          <button class="btn btn-primary btn-sm" onclick="App.go('sbook')">${svg(I.plus)}จองเพิ่ม</button></div>
        ${upcoming.length ? upcoming.slice(0,4).map(bookingCard).join('') : emptyState('🗓️','ยังไม่มีคิวที่จองไว้','กดปุ่ม “จองเพิ่ม” เพื่อเริ่มจองรอบใช้งาน')}
      </div>
    </div>`;
};

/* ---------- นักศึกษา: จองคิว ---------- */
Views.sbook = async function(m){
  const open = State.settings.open_days;
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>จองคิวเข้าใช้งาน</h2><span class="hint">เลือกวันและรอบเวลาที่ต้องการ</span></div>
      <div class="card">
        <div class="grid cols-2">
          <div class="field">
            <label for="bkDate">วันที่</label>
            <input class="input" type="date" id="bkDate" min="${todayISO()}" value="${State.bookDate}" onchange="Views.loadSlots(this.value)" />
            <div class="help">เปิดให้จองเฉพาะวัน: ${open.map(d=>dowLabel(d)).join(', ')}</div>
          </div>
        </div>
        <div id="slotArea"></div>
      </div>
    </div>`;
  Views.loadSlots(State.bookDate);
};

Views.loadSlots = async function(dateISO){
  State.bookDate = dateISO;
  const area = $('slotArea');
  area.innerHTML = '<div class="loading"><div class="spinner"></div>กำลังตรวจสอบเครื่องว่าง…</div>';

  const dow = DOW_KEY[parseISO(dateISO).getDay()];
  if (State.settings.open_days.indexOf(dow)===-1){
    area.innerHTML = emptyState('🚫','วันนี้ไม่เปิดให้จอง','กรุณาเลือกวันทำการตามที่ระบุด้านบน');
    return;
  }
  const av = await api('getAvailability', { date: dateISO });
  if (av.error){ area.innerHTML = emptyState('⚠️', av.error, ''); return; }

  State._selectedSlot = null;
  area.innerHTML = `
    <div class="field"><label>เลือกรอบเวลา</label>
      <div class="slot-grid">
        ${(av.slots||[]).map(s=>slotCard(s)).join('')}
      </div>
    </div>
    <div id="bookForm" class="hidden">
      <div class="grid cols-2">
        <div class="field">
          <label for="bkCase">หัวข้อ / เคสที่จะฝึก</label>
          <input class="input" id="bkCase" placeholder="เช่น ภาวะช็อก, ACS, Sepsis" />
        </div>
        <div class="field">
          <label for="bkSize">จำนวนผู้เข้าฝึก (คน)</label>
          <input class="input" id="bkSize" type="number" min="1" max="10" value="1" />
        </div>
      </div>
      <div class="field">
        <label for="bkGroup">รายชื่อสมาชิกในกลุ่ม (ถ้ามี)</label>
        <input class="input" id="bkGroup" placeholder="ชื่อเพื่อนร่วมฝึก คั่นด้วยจุลภาค" />
      </div>
      <button class="btn btn-primary btn-block" onclick="Views.submitBooking()">${svg(I.check)}ยืนยันการจอง</button>
    </div>`;
};

Views.pickSlot = function(el, slot){
  if (el.classList.contains('full')) return;
  document.querySelectorAll('.slot').forEach(s=>s.classList.remove('selected'));
  el.classList.add('selected');
  State._selectedSlot = slot;
  $('bookForm').classList.remove('hidden');
};

Views.submitBooking = async function(){
  if (!State._selectedSlot) return toast('กรุณาเลือกรอบเวลา', 'err');
  const btn = event.target;
  setLoading(btn, true);
  const r = await api('createBooking', {
    user_id: State.user.user_id, name: State.user.name, role:'student',
    date: State.bookDate, slot: State._selectedSlot,
    subject_case: $('bkCase').value.trim(),
    group_size: parseInt($('bkSize').value,10)||1,
    group_members: $('bkGroup').value.trim()
  });
  setLoading(btn, false, 'ยืนยันการจอง');
  if (r.error) return toast(r.error, 'err');
  toast('จองสำเร็จ! รออาจารย์อนุมัติ', 'ok');
  App.go('smine');
};

/* ---------- นักศึกษา: การจองของฉัน ---------- */
Views.smine = async function(m){
  const bk = await api('getBookings', { user_id: State.user.user_id });
  const list = (bk.bookings||[]).sort((a,b)=> (b.date+b.start_time).localeCompare(a.date+a.start_time));
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>การจองของฉัน</h2><span class="hint">ทั้งหมด ${list.length} รายการ</span></div>
      <div class="card">
        ${list.length ? list.map(b=>bookingCard(b, true)).join('') : emptyState('📋','ยังไม่มีประวัติการจอง','ไปที่หน้า “จองคิว” เพื่อเริ่มจอง')}
      </div>
    </div>`;
};

App.cancelMine = function(id){
  confirmModal('ยกเลิกการจอง', 'ต้องการยกเลิกการจองนี้ใช่หรือไม่?', 'ยกเลิกการจอง', async ()=>{
    const r = await api('cancelBooking', { booking_id:id, user_id:State.user.user_id, role:State.user.role });
    if (r.error) return toast(r.error,'err');
    toast('ยกเลิกการจองแล้ว','ok'); App.go(State.view);
  });
};
App.checkIn = async function(id){
  const r = await api('checkIn', { booking_id:id, user_id:State.user.user_id, role:State.user.role });
  if (r.error) return toast(r.error,'err');
  toast('เช็คอินเรียบร้อย ✅','ok'); App.go(State.view);
};

/* ---------- ปฏิทินรายสัปดาห์ (ใช้ร่วม น.ศ./อาจารย์) ---------- */
Views.scal = function(m){ renderWeek(m, false); };
Views.tcal = function(m){ renderWeek(m, true); };

async function renderWeek(m, isTeacher){
  const ws = State.weekStart;
  const from = toISO(ws), to = toISO(addDays(ws,6));
  const bk = await api('getBookings', isTeacher ? { from, to } : { from, to });
  const all = (bk.bookings||[]).filter(b=> b.status!=='cancelled' && b.status!=='rejected');
  const totalPerSlot = State.settings.total_stations;
  const slots = State.settings.time_slots;

  let cols = '';
  for (let i=0;i<7;i++){
    const d = addDays(ws,i); const iso = toISO(d);
    const dow = DOW_KEY[d.getDay()];
    const off = State.settings.open_days.indexOf(dow)===-1;
    const isToday = iso===todayISO();
    const dayBk = all.filter(b=>b.date===iso);
    let pills = '';
    if (!off){
      slots.forEach(slot=>{
        const start = slot.split('-')[0];
        const used = dayBk.filter(b=>b.start_time===start).length;
        const cls = used>=totalPerSlot ? 'full' : (dayBk.some(b=>b.start_time===start && b.status==='pending')?'pending':'');
        if (used>0) pills += `<div class="pill ${cls}" title="${esc(slot)}">${start} · ${used}/${totalPerSlot}</div>`;
      });
      if (!pills) pills = `<div class="pill" style="background:#F1F5F4;color:#9AA8A4">ว่างทุกรอบ</div>`;
    }
    cols += `<div class="day-col ${off?'off':''} ${isToday?'today':''}">
      <div class="dh"><div class="dow">${DOW_TH[d.getDay()]}</div><div class="dn">${d.getDate()}</div></div>
      ${off?'<div class="pill" style="background:transparent;color:#B7C2BF">ปิด</div>':pills}
    </div>`;
  }

  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>ปฏิทินการใช้งาน</h2><span class="hint">มุมมองรายสัปดาห์</span></div>
      <div class="card">
        <div class="cal-head">
          <button class="btn btn-soft btn-sm" onclick="App.weekShift(-1)">${svg(I.x).replace('M18 6 6 18M6 6l12 12','M15 18l-6-6 6-6')}สัปดาห์ก่อน</button>
          <span class="range">${fmtThaiDate(from)} – ${fmtThaiDate(to)}</span>
          <button class="btn btn-soft btn-sm" onclick="App.weekShift(1)">สัปดาห์ถัดไป${svg('<path d="M9 18l6-6-6-6"/>')}</button>
          <span class="topbar-spacer"></span>
          <button class="btn btn-ghost btn-sm" onclick="App.weekToday()">วันนี้</button>
        </div>
        <div class="week">${cols}</div>
      </div>
    </div>`;
}
App.weekShift = function(n){ State.weekStart = addDays(State.weekStart, n*7); App.go(State.view); };
App.weekToday = function(){ State.weekStart = startOfWeek(new Date()); App.go(State.view); };

/* ---------- อาจารย์: ภาพรวม ---------- */
Views.tdash = async function(m){
  const [st, bk] = await Promise.all([ api('getStats'), api('getBookings', { status:'pending' }) ]);
  const pend = (bk.bookings||[]).sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time));
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>ภาพรวมระบบ</h2><span class="hint">ข้อมูลวันที่ ${fmtThaiDate(st.today||todayISO())}</span></div>
      <div class="grid cols-4" style="margin-bottom:18px">
        ${stat('mint', I.book, st.bookings_today||0, 'การจองวันนี้')}
        ${stat('warn', I.clock, st.pending||0, 'รออนุมัติ')}
        ${stat('sky', I.pulse, st.free_slots_today||0, 'เครื่องว่างวันนี้')}
        ${stat('blush', I.report, st.weekly_total||0, 'การใช้งาน 7 วัน')}
      </div>
      <div class="card">
        <div class="section-head"><h3>คำขอที่รออนุมัติ</h3><span class="hint">${pend.length} รายการ</span>
          <span class="topbar-spacer"></span>
          <button class="btn btn-ghost btn-sm" onclick="App.go('tbookings')">ดูทั้งหมด</button></div>
        ${pend.length ? pend.slice(0,6).map(b=>teacherBookingCard(b)).join('') : emptyState('✅','ไม่มีคำขอค้างอยู่','การจองทุกรายการได้รับการพิจารณาแล้ว')}
      </div>
    </div>`;
};

/* ---------- อาจารย์: การจองทั้งหมด ---------- */
Views.tbookings = async function(m){
  State._tFilter = State._tFilter || 'all';
  const bk = await api('getBookings', {});
  let list = (bk.bookings||[]).sort((a,b)=>(b.date+b.start_time).localeCompare(a.date+a.start_time));
  const f = State._tFilter;
  const filtered = f==='all' ? list : list.filter(b=>b.status===f);

  const filterBtn = (val,label)=>`<button class="btn btn-sm ${State._tFilter===val?'btn-primary':'btn-soft'}" onclick="App.setFilter('${val}')">${label}</button>`;

  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>การจองทั้งหมด</h2><span class="hint">${filtered.length} รายการ</span>
        <span class="topbar-spacer"></span>
        <button class="btn btn-ghost btn-sm" onclick="App.exportCSV()">${svg(I.dl)}Export CSV</button></div>
      <div class="card">
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px">
          ${filterBtn('all','ทั้งหมด')}${filterBtn('pending','รออนุมัติ')}${filterBtn('approved','อนุมัติแล้ว')}${filterBtn('rejected','ปฏิเสธ')}${filterBtn('cancelled','ยกเลิก')}
        </div>
        ${filtered.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>วันที่</th><th>เวลา</th><th>เครื่อง</th><th>ผู้จอง</th><th>เคส</th><th>สถานะ</th><th>เช็คอิน</th><th>จัดการ</th></tr></thead>
          <tbody>${filtered.map(rowBooking).join('')}</tbody>
        </table></div>` : emptyState('🔍','ไม่พบรายการ','ลองเปลี่ยนตัวกรองด้านบน')}
      </div>
    </div>`;
  State._lastList = list;
};
App.setFilter = function(v){ State._tFilter = v; App.go('tbookings'); };

App.approve = async function(id){
  const r = await api('updateStatus', { booking_id:id, status:'approved', actor_id:State.user.user_id });
  if (r.error) return toast(r.error,'err'); toast('อนุมัติแล้ว','ok'); App.go(State.view);
};
App.reject = function(id){
  confirmModal('ปฏิเสธการจอง','ต้องการปฏิเสธการจองนี้ใช่หรือไม่?','ปฏิเสธ', async ()=>{
    const r = await api('updateStatus', { booking_id:id, status:'rejected', actor_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); toast('ปฏิเสธแล้ว','ok'); App.go(State.view);
  });
};
App.teacherCancel = function(id){
  confirmModal('ยกเลิกการจอง','ยืนยันยกเลิกการจองของนักศึกษารายนี้?','ยกเลิก', async ()=>{
    const r = await api('cancelBooking', { booking_id:id, role:'teacher', actor_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); toast('ยกเลิกแล้ว','ok'); App.go(State.view);
  });
};
App.adminDelete = function(id){
  confirmModal('ลบการจองถาวร','ลบรายการจองนี้ออกจากระบบอย่างถาวร? การกระทำนี้ย้อนกลับไม่ได้','ลบถาวร', async ()=>{
    const r = await api('deleteBooking', { booking_id:id, role:'admin', actor_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); toast('ลบรายการแล้ว','ok'); App.go(State.view);
  });
};

/* ---------- อาจารย์: รายงาน ---------- */
Views.treport = async function(m){
  const rp = await api('getReport', {});
  const users = rp.by_user||[]; const cases = rp.by_case||[];
  const maxU = Math.max(1, ...users.map(u=>u.count));
  const maxC = Math.max(1, ...cases.map(c=>c.count));
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>รายงานสรุปการใช้งาน</h2><span class="hint">รวม ${rp.total||0} ครั้ง</span>
        <span class="topbar-spacer"></span>
        <button class="btn btn-ghost btn-sm" onclick="App.exportReport()">${svg(I.dl)}Export CSV</button></div>
      <div class="grid cols-2">
        <div class="card">
          <h3 style="margin-bottom:14px">จัดอันดับผู้ใช้งาน</h3>
          ${users.length ? users.map(u=>`
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:5px">
                <b>${esc(u.name)}</b><span style="color:var(--muted)">${u.count} ครั้ง</span></div>
              <div class="report-bar"><span style="width:${Math.round(u.count/maxU*100)}%"></span></div>
              <div class="help">${u.cases.map(c=>esc(c.case)+' ('+c.count+')').join(' · ')}</div>
            </div>`).join('') : emptyState('📊','ยังไม่มีข้อมูล','')}
        </div>
        <div class="card">
          <h3 style="margin-bottom:14px">เคส/หัวข้อที่ฝึกบ่อย</h3>
          ${cases.length ? cases.map(c=>`
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:5px">
                <b>${esc(c.case)}</b><span style="color:var(--muted)">${c.count} ครั้ง</span></div>
              <div class="report-bar"><span style="width:${Math.round(c.count/maxC*100)}%"></span></div>
            </div>`).join('') : emptyState('📊','ยังไม่มีข้อมูล','')}
        </div>
      </div>
    </div>`;
};

/* ---------- อาจารย์: ตั้งค่า ---------- */
Views.tsettings = async function(m){
  const s = State.settings;
  const allDays = [['mon','จันทร์'],['tue','อังคาร'],['wed','พุธ'],['thu','พฤหัสบดี'],['fri','ศุกร์'],['sat','เสาร์'],['sun','อาทิตย์']];
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>ตั้งค่าระบบ</h2><span class="hint">กำหนดเครื่อง รอบเวลา และวันเปิดจอง</span></div>
      <div class="card" style="max-width:620px">
        <div class="field">
          <label for="setStations">จำนวนเครื่อง / license ที่มี</label>
          <input class="input" type="number" id="setStations" min="1" max="50" value="${s.total_stations}" />
          <div class="help">จำนวนนักศึกษา/กลุ่มที่ใช้งานพร้อมกันได้ต่อรอบ</div>
        </div>
        <div class="field">
          <label for="setMax">ระยะเวลาสูงสุดต่อการจอง (ชั่วโมง)</label>
          <input class="input" type="number" id="setMax" min="1" max="8" value="${s.max_duration}" />
        </div>
        <div class="field">
          <label>วันที่เปิดให้จอง</label>
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            ${allDays.map(([k,l])=>`
              <label class="btn btn-sm ${s.open_days.indexOf(k)>=0?'btn-primary':'btn-soft'}" style="cursor:pointer" data-day="${k}">
                <input type="checkbox" class="sr-only dayck" value="${k}" ${s.open_days.indexOf(k)>=0?'checked':''} onchange="this.closest('label').classList.toggle('btn-primary', this.checked);this.closest('label').classList.toggle('btn-soft', !this.checked)"/>${l}
              </label>`).join('')}
          </div>
        </div>
        <div class="field">
          <label for="setSlots">รอบเวลา (คั่นแต่ละรอบด้วยจุลภาค)</label>
          <textarea class="input" id="setSlots" rows="3">${s.time_slots.join(', ')}</textarea>
          <div class="help">รูปแบบ HH:MM-HH:MM เช่น 09:00-10:00, 10:00-11:00, 13:00-14:00</div>
        </div>
        <button class="btn btn-primary" onclick="App.saveSettings()">${svg(I.check)}บันทึกการตั้งค่า</button>
      </div>
    </div>`;
};
App.saveSettings = async function(){
  const days = Array.from(document.querySelectorAll('.dayck')).filter(c=>c.checked).map(c=>c.value);
  const slots = $('setSlots').value.split(',').map(x=>x.trim()).filter(Boolean);
  if (!days.length) return toast('เลือกวันเปิดจองอย่างน้อย 1 วัน','err');
  if (!slots.length) return toast('กรุณาระบุรอบเวลาอย่างน้อย 1 รอบ','err');
  const btn = event.target; setLoading(btn, true);
  const r = await api('updateSettings', {
    actor_id: State.user.user_id,
    total_stations: $('setStations').value,
    max_duration: $('setMax').value,
    open_days: days, time_slots: slots
  });
  setLoading(btn, false, 'บันทึกการตั้งค่า');
  if (r.error) return toast(r.error,'err');
  State.settings = r.settings;
  toast('บันทึกการตั้งค่าแล้ว','ok');
};

/* =========================================================
   COMPONENTS (HTML builders)
   ========================================================= */
function levelBadge(lv){
  const map = { Basic:'lv-basic', Intermediate:'lv-inter', Advanced:'lv-adv' };
  const th = { Basic:'พื้นฐาน', Intermediate:'ปานกลาง', Advanced:'ขั้นสูง' };
  return `<span class="lv ${map[lv]||''}"><span class="lv-bars"><i></i><i></i><i></i></span>${esc(lv)}${th[lv]?` · ${th[lv]}`:''}</span>`;
}

/* ---------- อาจารย์/ผู้ดูแล: Scenarios ---------- */
Views.tscenarios = async function(m){
  const r = await api('getScenarios');
  const all = r.scenarios || [];
  State._scn = all;
  const lv = State._scnLv || 'all';
  const q = (State._scnQ || '').toLowerCase();
  let list = all;
  if (lv!=='all') list = list.filter(s=>s.level===lv);
  if (q) list = list.filter(s=> (s.title+' '+s.no+' '+s.room).toLowerCase().includes(q));

  const chip = (val,label)=>`<button class="chip ${lv===val?'active':''}" onclick="Views.scnFilter('${val}')">${label}</button>`;
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>Scenarios สำหรับฝึก</h2><span class="hint">${all.length} เคส · คลิกเพื่อดูรายละเอียด</span></div>
      <div class="card">
        <div class="scn-tools">
          <input class="input" placeholder="ค้นหาเคส / หมายเลข / ห้อง…" value="${esc(State._scnQ||'')}" oninput="Views.scnSearch(this.value)" />
          <div class="chips">${chip('all','ทั้งหมด')}${chip('Basic','พื้นฐาน')}${chip('Intermediate','ปานกลาง')}${chip('Advanced','ขั้นสูง')}</div>
        </div>
        <div class="scn-list">
          ${list.length ? list.map(scnRow).join('') : emptyState('🔍','ไม่พบเคสที่ค้นหา','ลองเปลี่ยนคำค้นหรือตัวกรอง')}
        </div>
      </div>
    </div>`;
};
Views.scnFilter = function(v){ State._scnLv = v; App.go('tscenarios'); };
Views.scnSearch = function(v){ State._scnQ = v; clearTimeout(Views._scnT); Views._scnT = setTimeout(()=>App.go('tscenarios'), 250); };
function scnRow(s){
  return `<div class="scn-item" onclick="Views.scnDetail('${esc(s.no)}')">
    <div class="scn-no">#${esc(s.no)}</div>
    <div class="scn-main">
      <div class="scn-title">${esc(s.title)}</div>
      <div class="scn-meta"><span>${esc(s.room)}</span> · ${levelBadge(s.level)}</div>
    </div>
    <button class="btn btn-soft btn-sm scn-pdf" onclick="event.stopPropagation();Views.scnPdf('${esc(s.no)}')">${svg(I.doc)}PDF</button>
  </div>`;
}
Views.scnDetail = function(no){
  const s = (State._scn||[]).find(x=>String(x.no)===String(no)); if(!s) return;
  openModal(`
    <div class="scn-modal">
      <div class="scn-modal-no">#${esc(s.no)}</div>
      <h3 style="margin:6px 0 10px">${esc(s.title)}</h3>
      <div class="kv"><span>ห้อง/สถานการณ์</span><b>${esc(s.room)}</b></div>
      <div class="kv"><span>ระดับความยาก</span><b>${levelBadge(s.level)}</b></div>
      <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="Views.scnPdf('${esc(s.no)}')">${svg(I.doc)}เปิดไฟล์ PDF รายละเอียด</button>
    </div>`);
};
Views.scnPdf = function(no){
  const s = (State._scn||[]).find(x=>String(x.no)===String(no)); if(!s) return;
  if (s.pdf){ window.open(s.pdf, '_blank', 'noopener'); }
  else { toast('ยังไม่ได้แนบไฟล์ PDF สำหรับเคสนี้ (ผู้ดูแลเพิ่มได้ในชีต Scenarios)', 'err'); }
};

/* ---------- อาจารย์/ผู้ดูแล: บัญชีเข้าใช้ Body Interact ---------- */
Views.tbi = async function(m){
  const r = await api('getBIAccounts', { role:State.user.role, user_id:State.user.user_id });
  const list = r.accounts || [];
  const admin = isAdmin();
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>บัญชีเข้าใช้ Body Interact</h2>
        <span class="hint">${admin?'เพิ่มบัญชี · อนุมัติคำขอ · ดูรหัสผ่านได้ทุกบัญชี':'เลือกขอใช้ username · เห็นรหัสผ่านหลังผู้ดูแลอนุมัติ'}</span></div>

      ${admin ? `<div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:12px">เพิ่มบัญชีใหม่</h3>
        <div class="grid cols-2">
          <div class="field"><label for="biUser">Username (BI)</label><input class="input" id="biUser" placeholder="เช่น bcnb-bi-05" /></div>
          <div class="field"><label for="biPass">Password</label><input class="input" id="biPass" placeholder="รหัสผ่านของบัญชีนี้" /></div>
        </div>
        <button class="btn btn-primary" onclick="Views.biAdd()">${svg(I.plus)}เพิ่มบัญชี</button>
      </div>` : `<div class="login-note" style="margin:0 0 16px">${svg(I.info)}<span>เลือก “ขอใช้งาน” บัญชีที่ว่าง เมื่อผู้ดูแลระบบอนุมัติแล้ว ระบบจะแสดงรหัสผ่านให้เฉพาะคุณ</span></div>`}

      <div class="card">
        <div class="bi-list">
          ${list.length ? list.map(a=>biCard(a, admin)).join('') : emptyState('🔑','ยังไม่มีบัญชี', admin?'เพิ่มบัญชีด้านบนได้เลย':'รอผู้ดูแลเพิ่มบัญชี')}
        </div>
      </div>
    </div>`;
};
function biCard(a, admin){
  const mine = a.holder_id===State.user.user_id;
  let right = '';
  if (admin){
    right = `${a.status==='pending'?`<button class="btn btn-primary btn-sm" onclick="Views.biApprove('${a.account_id}')">${svg(I.check)}อนุมัติ</button>`:''}
      ${a.status!=='available'?`<button class="btn btn-warn btn-sm" onclick="Views.biRelease('${a.account_id}')">คืนบัญชี</button>`:''}
      <button class="btn btn-danger btn-sm" onclick="Views.biDelete('${a.account_id}')">${svg(I.x)}ลบ</button>`;
  } else {
    if (a.status==='available') right = `<button class="btn btn-primary btn-sm" onclick="Views.biRequest('${a.account_id}')">${svg(I.key)}ขอใช้งาน</button>`;
    else if (a.status==='pending' && mine) right = `<span class="badge pending">รออนุมัติ</span>`;
    else if (a.status==='approved' && mine) right = `<button class="btn btn-soft btn-sm" onclick="Views.biRelease('${a.account_id}')">คืนบัญชี</button>`;
    else right = `<span class="badge" style="background:#EEF1F0;color:#8A9794">ไม่ว่าง</span>`;
  }
  // แถวรหัสผ่าน: แสดงเมื่อ backend ส่ง password มา (admin = ทุกอัน, teacher = ของตัวเองที่อนุมัติแล้ว)
  const pwRow = (a.password!==undefined)
    ? `<div class="bi-pass">${svg(I.key)}<span>รหัสผ่าน:</span><code>${esc(a.password)}</code></div>`
    : (a.status==='approved' && mine ? '' : `<div class="bi-pass muted">${svg(I.key)}<span>รหัสผ่านจะแสดงหลังได้รับอนุมัติ</span></div>`);
  const who = a.holder_name ? `<span class="bi-holder">${a.status==='approved'?'ผู้ใช้:':'ผู้ขอ:'} ${esc(a.holder_name)}</span>` : '';
  return `<div class="bi-item">
    <div class="bi-main">
      <div class="bi-user">${svg(I.user)}<b>${esc(a.username)}</b> ${biStatusBadge(a.status)}</div>
      ${who}
      ${(admin || (a.status==='approved'&&mine)) ? pwRow : (a.status==='pending'&&mine ? `<div class="bi-pass muted">${svg(I.key)}<span>รหัสผ่านจะแสดงหลังได้รับอนุมัติ</span></div>` : '')}
    </div>
    <div class="bi-actions">${right}</div>
  </div>`;
}
function biStatusBadge(s){
  const map = { available:['ว่าง','approved'], pending:['รออนุมัติ','pending'], approved:['ใช้งานอยู่','in'] };
  const v = map[s]||[s,'']; return `<span class="badge ${v[1]}">${v[0]}</span>`;
}
Views.biAdd = async function(){
  const username = $('biUser').value.trim(), password = $('biPass').value.trim();
  if (!username || !password) return toast('กรอก username และ password','err');
  const r = await api('addBIAccount', { role:State.user.role, actor_id:State.user.user_id, username, password });
  if (r.error) return toast(r.error,'err'); toast('เพิ่มบัญชีแล้ว','ok'); App.go('tbi');
};
Views.biRequest = async function(id){
  const r = await api('requestBIAccount', { account_id:id, user_id:State.user.user_id, name:State.user.name });
  if (r.error) return toast(r.error,'err'); toast('ส่งคำขอแล้ว รอผู้ดูแลอนุมัติ','ok'); App.go('tbi');
};
Views.biApprove = async function(id){
  const r = await api('approveBIAccount', { account_id:id, role:State.user.role, actor_id:State.user.user_id });
  if (r.error) return toast(r.error,'err'); toast('อนุมัติแล้ว','ok'); App.go('tbi');
};
Views.biRelease = function(id){
  confirmModal('คืนบัญชี','ปล่อยบัญชีนี้กลับเป็นสถานะว่าง?','คืนบัญชี', async ()=>{
    const r = await api('releaseBIAccount', { account_id:id, role:State.user.role, user_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); toast('คืนบัญชีแล้ว','ok'); App.go('tbi');
  });
};
Views.biDelete = function(id){
  confirmModal('ลบบัญชี','ลบบัญชี BI นี้ถาวร?','ลบ', async ()=>{
    const r = await api('deleteBIAccount', { account_id:id, role:State.user.role, actor_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); toast('ลบบัญชีแล้ว','ok'); App.go('tbi');
  });
};

/* =========================================================
   COMPONENTS (HTML builders) — เดิม
   ========================================================= */
function stat(color, icon, num, label){
  return `<div class="stat ${color}"><div class="ico">${svg(icon)}</div><div><div class="num">${num}</div><div class="lab">${label}</div></div></div>`;
}
function statusBadge(s){
  const map = {pending:'รออนุมัติ', approved:'อนุมัติแล้ว', rejected:'ปฏิเสธ', cancelled:'ยกเลิก'};
  return `<span class="badge ${s}">${map[s]||s}</span>`;
}
function dowLabel(k){ return {mon:'จันทร์',tue:'อังคาร',wed:'พุธ',thu:'พฤหัสบดี',fri:'ศุกร์',sat:'เสาร์',sun:'อาทิตย์'}[k]||k; }

function slotCard(s){
  const dots = Array.from({length:s.total}, (_,i)=> `<span class="dot ${i<s.used?'taken':''}"></span>`).join('');
  const full = s.free<=0;
  const json = esc(JSON.stringify(s.slot));
  return `<button type="button" class="slot ${full?'full':''}" onclick='Views.pickSlot(this, ${json})'>
    <div class="time">${esc(s.start_time)}–${esc(s.end_time)}</div>
    <div class="avail">${full?'<span style="color:var(--danger)">เต็มแล้ว</span>':'<span style="color:var(--mint-deep)">ว่าง '+s.free+'/'+s.total+'</span>'}</div>
    <div class="dots" style="margin-top:8px">${dots}</div>
  </button>`;
}

function bookingCard(b, withActions){
  const today = todayISO();
  let actions = '';
  if (withActions){
    const can = [];
    if (b.status==='pending' || b.status==='approved')
      can.push(`<button class="btn btn-danger btn-sm" onclick="App.cancelMine('${b.booking_id}')">${svg(I.x)}ยกเลิก</button>`);
    if (b.status==='approved' && b.checked_in!=='yes' && b.date===today)
      can.push(`<button class="btn btn-sky btn-sm" onclick="App.checkIn('${b.booking_id}')">${svg(I.check)}เช็คอิน</button>`);
    if (b.checked_in==='yes')
      can.push(`<span class="badge in">${svg(I.check)} เช็คอินแล้ว</span>`);
    if (can.length) actions = `<div class="bc-actions">${can.join('')}</div>`;
  }
  return `<div class="booking-card">
    <div class="bc-top">
      <div>
        <div class="bc-title">${fmtThaiShort(b.date)} · ${esc(b.start_time)}–${esc(b.end_time)}</div>
        <div class="meta">
          <span>เครื่อง <b>#${b.station_no}</b></span>
          ${b.group_size?`<span>${esc(String(b.group_size))} คน</span>`:''}
          ${b.subject_case?`<span>เคส: <b>${esc(b.subject_case)}</b></span>`:''}
          ${b.group_members?`<span>กลุ่ม: ${esc(b.group_members)}</span>`:''}
        </div>
      </div>
      ${statusBadge(b.status)}
    </div>
    ${actions}
  </div>`;
}

function teacherBookingCard(b){
  return `<div class="booking-card">
    <div class="bc-top">
      <div>
        <div class="bc-title">${esc(b.name)} <span style="color:var(--muted);font-weight:400;font-size:.85rem">(${esc(b.user_id)})</span></div>
        <div class="meta">
          <span><b>${fmtThaiShort(b.date)}</b> · ${esc(b.start_time)}–${esc(b.end_time)}</span>
          <span>เครื่อง <b>#${b.station_no}</b></span>
          ${b.subject_case?`<span>เคส: <b>${esc(b.subject_case)}</b></span>`:''}
        </div>
      </div>
      ${statusBadge(b.status)}
    </div>
    <div class="bc-actions">
      ${b.status==='pending' ? `<button class="btn btn-primary btn-sm" onclick="App.approve('${b.booking_id}')">${svg(I.check)}อนุมัติ</button>
      <button class="btn btn-danger btn-sm" onclick="App.reject('${b.booking_id}')">${svg(I.x)}ปฏิเสธ</button>` : ''}
      ${b.status==='approved' ? `<button class="btn btn-warn btn-sm" onclick="App.teacherCancel('${b.booking_id}')">ยกเลิก</button>` : ''}
      ${isAdmin() ? `<button class="btn btn-danger btn-sm" onclick="App.adminDelete('${b.booking_id}')">${svg(I.x)}ลบถาวร</button>` : ''}
    </div>
  </div>`;
}

function rowBooking(b){
  let act = '';
  if (b.status==='pending'){
    act = `<button class="btn btn-primary btn-sm" onclick="App.approve('${b.booking_id}')">${svg(I.check)}</button>
           <button class="btn btn-danger btn-sm" onclick="App.reject('${b.booking_id}')">${svg(I.x)}</button>`;
  } else if (b.status==='approved'){
    act = `<button class="btn btn-warn btn-sm" onclick="App.teacherCancel('${b.booking_id}')">ยกเลิก</button>`;
  } else { act = '<span style="color:var(--muted)">—</span>'; }
  if (isAdmin())
    act += ` <button class="btn btn-danger btn-sm" onclick="App.adminDelete('${b.booking_id}')" title="ลบถาวร">${svg(I.x)}</button>`;
  return `<tr>
    <td>${fmtThaiShort(b.date)}</td>
    <td>${esc(b.start_time)}–${esc(b.end_time)}</td>
    <td>#${b.station_no}</td>
    <td>${esc(b.name)}<div style="font-size:.78rem;color:var(--muted)">${esc(b.user_id)}</div></td>
    <td>${esc(b.subject_case||'—')}</td>
    <td>${statusBadge(b.status)}</td>
    <td>${b.checked_in==='yes'?'<span class="badge in">มาแล้ว</span>':'<span style="color:var(--muted)">—</span>'}</td>
    <td><div class="row-actions">${act}</div></td>
  </tr>`;
}

function emptyState(emo, title, sub){
  return `<div class="empty"><div class="emo">${emo}</div><h3 style="margin-bottom:4px">${esc(title)}</h3>${sub?`<p>${esc(sub)}</p>`:''}</div>`;
}

/* =========================================================
   EXPORT CSV
   ========================================================= */
function downloadCSV(filename, rows){
  const csv = rows.map(r=>r.map(c=>{
    const s = String(c==null?'':c);
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  }).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}
App.exportCSV = async function(){
  const bk = await api('getBookings', {});
  const list = bk.bookings||[];
  const rows = [['วันที่','เวลาเริ่ม','เวลาจบ','เครื่อง','รหัสผู้จอง','ชื่อ','เคส','จำนวนคน','สมาชิกกลุ่ม','สถานะ','เช็คอิน']];
  list.forEach(b=>rows.push([b.date,b.start_time,b.end_time,b.station_no,b.user_id,b.name,b.subject_case,b.group_size||1,b.group_members,b.status,b.checked_in]));
  downloadCSV('bookings_'+todayISO()+'.csv', rows);
  toast('ดาวน์โหลดไฟล์แล้ว','ok');
};
App.exportReport = async function(){
  const rp = await api('getReport', {});
  const rows = [['รหัส','ชื่อ','จำนวนครั้ง','เคสที่ฝึก']];
  (rp.by_user||[]).forEach(u=>rows.push([u.user_id,u.name,u.count,u.cases.map(c=>c.case+'('+c.count+')').join(' / ')]));
  downloadCSV('report_'+todayISO()+'.csv', rows);
  toast('ดาวน์โหลดรายงานแล้ว','ok');
};

/* =========================================================
   UI: toast / modal / loading
   ========================================================= */
function toast(msg, type){
  const host = $('toastHost');
  const el = document.createElement('div');
  el.className = 'toast '+(type||'');
  const ic = type==='ok'?I.check : type==='err'?I.info : I.info;
  el.innerHTML = svg(ic)+'<span>'+esc(msg)+'</span>';
  host.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(10px)'; setTimeout(()=>el.remove(),300); }, 3000);
}
function confirmModal(title, sub, okLabel, onOk){
  const host = $('modalHost');
  host.innerHTML = `<div class="modal-host" onclick="if(event.target===this)App._closeModal()">
    <div class="modal">
      <h3>${esc(title)}</h3><p class="modal-sub">${esc(sub)}</p>
      <div class="modal-actions">
        <button class="btn btn-soft" onclick="App._closeModal()">ยกเลิก</button>
        <button class="btn btn-primary" id="modalOk">${esc(okLabel)}</button>
      </div>
    </div></div>`;
  $('modalOk').onclick = ()=>{ App._closeModal(); onOk(); };
}
App._closeModal = function(){ $('modalHost').innerHTML=''; };

/* modal เนื้อหาอิสระ (เช่น รายละเอียด scenario / บัญชี BI) */
function openModal(html, wide){
  const host = $('modalHost');
  host.innerHTML = `<div class="modal-host" onclick="if(event.target===this)App._closeModal()">
    <div class="modal ${wide?'modal-wide':''}">
      ${html}
      <div class="modal-actions" style="margin-top:18px">
        <button class="btn btn-soft btn-block" onclick="App._closeModal()">ปิด</button>
      </div>
    </div></div>`;
}

function setLoading(btn, on, restore){
  if (!btn) return;
  if (on){ btn.dataset._t = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span>'; }
  else { btn.disabled = false; btn.innerHTML = btn.dataset._t || restore || 'ตกลง'; }
}

function showDemoBanner(){
  const b = document.createElement('div');
  b.className = 'demo-banner';
  b.innerHTML = svg(I.info)+'<span><b>โหมดทดลอง (Demo)</b> — กำลังใช้ข้อมูลตัวอย่างในเครื่อง ยังไม่ได้เชื่อม Google Sheets · ตั้งค่า <code>CONFIG.API_URL</code> ใน app.js เพื่อใช้งานจริง</span>';
  document.body.prepend(b);
}

/* =========================================================
   MOCK BACKEND (โหมดทดลอง — จำลอง Apps Script + Google Sheets)
   ใช้เมื่อยังไม่ได้ตั้งค่า CONFIG.API_URL
   ========================================================= */
const MockAPI = (function(){
  const wk = startOfWeek(new Date());
  const d = (off)=>toISO(addDays(wk, off));

  const users = [
    { user_id:'t001', name:'อ.ดร. ปวีณา ใจดี', role:'teacher', class_group:'', email:'paweena@bcnbangkok.ac.th', password:'teacher123' },
    { user_id:'t002', name:'อ. สมหญิง รักเรียน', role:'teacher', class_group:'', email:'somying@bcnbangkok.ac.th', password:'teacher123' },
    { user_id:'a001', name:'ผู้ดูแลระบบ', role:'admin', class_group:'', email:'admin@bcnbangkok.ac.th', password:'admin123' },
    { user_id:'1100701234567', name:'กานต์ พยาบาลดี', role:'student', class_group:'พย.2/1', email:'', password:'' },
    { user_id:'1100702345678', name:'นภา ศรีสุข', role:'student', class_group:'พย.2/1', email:'', password:'' },
    { user_id:'1100703456789', name:'ธีรเดช มั่นคง', role:'student', class_group:'พย.2/2', email:'', password:'' },
    { user_id:'1100704567890', name:'พิมพ์ชนก ใจงาม', role:'student', class_group:'พย.2/2', email:'', password:'' },
  ];

  let settings = {
    total_stations: 4,
    open_days: ['mon','tue','wed','thu','fri'],
    time_slots: ['09:00-10:00','10:00-11:00','11:00-12:00','13:00-14:00','14:00-15:00','15:00-16:00'],
    max_duration: 2
  };

  let seq = 1;
  const mk = (uid, name, dateOff, slot, station, cas, status, ci)=>{
    const s = slot.split('-');
    return { booking_id:'BK'+(1000+seq++), user_id:uid, name, role:'student', date:d(dateOff),
      start_time:s[0], end_time:s[1], station_no:station, subject_case:cas, group_members:'',
      status, checked_in:ci?'yes':'no', created_at:new Date().toISOString(), note:'' };
  };
  let bookings = [
    mk('1100701234567','กานต์ พยาบาลดี', 0, '09:00-10:00', 1, 'ภาวะช็อก (Shock)', 'approved', true),
    mk('1100702345678','นภา ศรีสุข',       0, '09:00-10:00', 2, 'ACS', 'approved', false),
    mk('1100703456789','ธีรเดช มั่นคง',     0, '10:00-11:00', 1, 'Sepsis', 'pending', false),
    mk('1100704567890','พิมพ์ชนก ใจงาม',   1, '13:00-14:00', 1, 'ภาวะหายใจล้มเหลว', 'pending', false),
    mk('1100701234567','กานต์ พยาบาลดี', 1, '14:00-15:00', 1, 'DKA', 'approved', false),
    mk('1100702345678','นภา ศรีสุข',       2, '09:00-10:00', 1, 'Stroke', 'approved', false),
    mk('1100703456789','ธีรเดช มั่นคง',     -2,'10:00-11:00', 2, 'ACS', 'approved', true),
    mk('1100704567890','พิมพ์ชนก ใจงาม',   -1,'11:00-12:00', 1, 'Sepsis', 'approved', true),
  ];

  // ===== Scenarios (จากแคตตาล็อก Body Interact) =====
  let scenarios = [
    { no:'115', title:'Pre-eclampsia seizure at 29 Weeks in Primigravid', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'238', title:'Acute pyelonephritis', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'297', title:'Umbilical cord prolapse', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'315', title:'Preterm labour', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'316', title:'First stage labor at home', room:'Living Room', level:'Basic', pdf:'' },
    { no:'350', title:'Postpartum hemorrhage', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'370', title:'Anaphylaxis reaction after propofol administration', room:'Emergency Room', level:'Advanced', pdf:'' },
    { no:'408', title:'Pyelonephritis with lower back pain and fever', room:'Emergency Room', level:'Basic', pdf:'' },
    { no:'454', title:'Multiple Fractures, Dyspnea, and Chest Pain After Fall', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'471', title:'Traumatic brain injury with head wound', room:'Emergency Room', level:'Advanced', pdf:'' },
    { no:'474', title:'Anxiety crisis', room:'Emergency Room', level:'Basic', pdf:'' },
    { no:'499', title:'COPD exacerbation with shortness of breath', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'536', title:'Asthma exacerbation', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'590', title:'Schizophrenia with agitation', room:'Emergency Room', level:'Basic', pdf:'' },
    { no:'594', title:'Acute appendicitis with perforation', room:'Emergency Room', level:'Advanced', pdf:'' },
    { no:'599', title:'Urinary tract infection and fever', room:'Emergency Room', level:'Basic', pdf:'' },
    { no:'600', title:'Viral gastroenteritis and dehydration', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'691', title:'Child with pneumonia', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'701', title:'Diabetic ketoacidosis with vomiting, and hypovolemic shock', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'832', title:'Anaphylactic shock due to food allergy', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'881', title:'Preparing for discharge with family education', room:'Inpatient Room', level:'Basic', pdf:'' },
    { no:'899', title:'Sepsis due to pneumonia', room:'Emergency Room', level:'Advanced', pdf:'' },
    { no:'940', title:'Alcohol use disorder', room:'Consultation', level:'Intermediate', pdf:'' },
    { no:'942', title:'Adolescent suicide risk', room:'Consultation', level:'Basic', pdf:'' },
    { no:'963', title:'Cardiac arrest after angioplasty', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'1009', title:'Smoking cessation in consultation', room:'Consultation', level:'Intermediate', pdf:'' },
    { no:'1024', title:'Triage of Chest Pain in Emergency Department #3', room:'Emergency Room', level:'Intermediate', pdf:'' },
    { no:'1276', title:'Shoulder dystocia at 39 weeks pregnant', room:'Emergency Room', level:'Intermediate', pdf:'' },
  ];

  // ===== บัญชีเข้าใช้ Body Interact (admin เพิ่ม / teacher ขอใช้) =====
  let biSeq = 1;
  let biAccounts = [
    { account_id:'BI1', username:'bcnb-bi-01', password:'BodyInt@01', status:'available', holder_id:'', holder_name:'', updated_at:new Date().toISOString() },
    { account_id:'BI2', username:'bcnb-bi-02', password:'BodyInt@02', status:'available', holder_id:'', holder_name:'', updated_at:new Date().toISOString() },
    { account_id:'BI3', username:'bcnb-bi-03', password:'BodyInt@03', status:'pending', holder_id:'t002', holder_name:'อ. สมหญิง รักเรียน', updated_at:new Date().toISOString() },
    { account_id:'BI4', username:'bcnb-bi-04', password:'BodyInt@04', status:'approved', holder_id:'t001', holder_name:'อ.ดร. ปวีณา ใจดี', updated_at:new Date().toISOString() },
  ];

  function slotsArr(){ return settings.time_slots; }
  function occupied(date, slot){
    const start = slot.split('-')[0];
    return bookings.filter(b=>b.date===date && b.start_time===start && (b.status==='pending'||b.status==='approved'));
  }
  function availability(date){
    return slotsArr().map(slot=>{
      const used = occupied(date, slot);
      const free = settings.total_stations - used.length;
      const p = slot.split('-');
      return { slot, start_time:p[0], end_time:p[1], total:settings.total_stations,
        used:used.length, free:free<0?0:free, used_stations:used.map(b=>b.station_no) };
    });
  }

  function handle(action, p){
    return new Promise(resolve=>{
      setTimeout(()=>resolve(run(action, p)), 260); // จำลอง latency
    });
  }

  function run(action, p){
    switch(action){
      case 'ping': return { ok:true };
      case 'login': {
        const strip = (u)=>{ const c = Object.assign({}, u); delete c.password; return c; };
        if (p.role==='admin'){
          const pass = String(p.password||'');
          const a = users.find(u=>u.role==='admin' && u.password===pass);
          if (!a) return { error:'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' };
          return { user: strip(a) };
        } else if (p.role==='teacher'){
          const email = String(p.email||'').toLowerCase().trim();
          const t = users.find(u=>u.email.toLowerCase()===email && u.role==='teacher');
          if (!t) return { error:'ไม่พบอีเมลนี้ในระบบ กรุณาติดต่อผู้ดูแล' };
          if (String(t.password||'') !== String(p.password||'')) return { error:'รหัสผ่านไม่ถูกต้อง' };
          return { user: strip(t) };
        } else {
          const cid = String(p.national_id||'').replace(/\D/g,'');
          if (cid.length !== 13) return { error:'เลขบัตรประชาชนต้องมี 13 หลัก' };
          const s = users.find(u=>u.user_id===cid && u.role==='student');
          if (!s) return { error:'ไม่พบเลขบัตรประชาชนนี้ในระบบ กรุณาติดต่ออาจารย์' };
          return { user: strip(s) };
        }
      }
      case 'getSettings': return { settings: JSON.parse(JSON.stringify(settings)) };
      case 'updateSettings': {
        if (p.total_stations!==undefined) settings.total_stations = parseInt(p.total_stations,10)||1;
        if (p.max_duration!==undefined) settings.max_duration = parseInt(p.max_duration,10)||1;
        if (p.open_days!==undefined) settings.open_days = p.open_days;
        if (p.time_slots!==undefined) settings.time_slots = p.time_slots;
        return { settings: JSON.parse(JSON.stringify(settings)) };
      }
      case 'getBookings': {
        let list = bookings.slice();
        if (p.user_id) list = list.filter(b=>b.user_id===String(p.user_id));
        if (p.status) list = list.filter(b=>b.status===p.status);
        if (p.date) list = list.filter(b=>b.date===p.date);
        if (p.from) list = list.filter(b=>b.date>=p.from);
        if (p.to) list = list.filter(b=>b.date<=p.to);
        list.sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time));
        return { bookings: JSON.parse(JSON.stringify(list)) };
      }
      case 'getAvailability': {
        if (!p.date) return { error:'กรุณาระบุวันที่' };
        return { date:p.date, total_stations:settings.total_stations, slots:availability(p.date) };
      }
      case 'createBooking': {
        const slot = p.slot; const date = p.date;
        if (!slot || !date) return { error:'กรุณาเลือกวันและรอบเวลา' };
        if (slotsArr().indexOf(slot)===-1) return { error:'รอบเวลาไม่ถูกต้อง' };
        const start = slot.split('-')[0];
        const dup = bookings.find(b=>b.user_id===String(p.user_id)&&b.date===date&&b.start_time===start&&(b.status==='pending'||b.status==='approved'));
        if (dup) return { error:'คุณมีการจองในรอบเวลานี้อยู่แล้ว' };
        const used = occupied(date, slot);
        if (used.length>=settings.total_stations) return { error:'รอบเวลานี้เต็มแล้ว กรุณาเลือกรอบอื่น' };
        const usedNos = used.map(b=>b.station_no);
        let station=1; while(usedNos.indexOf(station)!==-1) station++;
        const p2 = slot.split('-');
        const rec = { booking_id:'BK'+(1000+seq++), user_id:String(p.user_id), name:p.name, role:'student',
          date, start_time:p2[0], end_time:p2[1], station_no:station, subject_case:p.subject_case||'',
          group_size:parseInt(p.group_size,10)||1, group_members:p.group_members||'', status:'pending', checked_in:'no', created_at:new Date().toISOString(), note:'' };
        bookings.push(rec);
        return { booking: JSON.parse(JSON.stringify(rec)) };
      }
      case 'cancelBooking': {
        const b = bookings.find(x=>x.booking_id===p.booking_id);
        if (!b) return { error:'ไม่พบการจองนี้' };
        if (p.role!=='teacher' && p.role!=='admin' && b.user_id!==String(p.user_id)) return { error:'ยกเลิกได้เฉพาะของตัวเอง' };
        b.status='cancelled'; return { ok:true };
      }
      case 'deleteBooking': {
        if (p.role!=='admin') return { error:'เฉพาะผู้ดูแลระบบเท่านั้นที่ลบได้' };
        const i = bookings.findIndex(x=>x.booking_id===p.booking_id);
        if (i===-1) return { error:'ไม่พบการจองนี้' };
        bookings.splice(i,1); return { ok:true };
      }
      case 'updateStatus': {
        const b = bookings.find(x=>x.booking_id===p.booking_id);
        if (!b) return { error:'ไม่พบการจองนี้' };
        b.status = p.status; if (p.note!==undefined) b.note=p.note; return { ok:true };
      }
      case 'checkIn': {
        const b = bookings.find(x=>x.booking_id===p.booking_id);
        if (!b) return { error:'ไม่พบการจองนี้' };
        if (b.status!=='approved') return { error:'เช็คอินได้เฉพาะการจองที่อนุมัติแล้ว' };
        b.checked_in='yes'; return { ok:true };
      }
      case 'getUsers': return { users: JSON.parse(JSON.stringify(users)) };
      case 'getScenarios': return { scenarios: JSON.parse(JSON.stringify(scenarios)) };
      case 'getBIAccounts': {
        const role = p.role; const uid = String(p.user_id||'');
        const list = biAccounts.map(a=>{
          const o = { account_id:a.account_id, username:a.username, status:a.status, holder_id:a.holder_id, holder_name:a.holder_name };
          // เห็น password ได้: admin เห็นทุกอัน / teacher เห็นเฉพาะของตัวเองที่อนุมัติแล้ว
          if (role==='admin' || (a.status==='approved' && a.holder_id===uid)) o.password = a.password;
          return o;
        });
        return { accounts: list };
      }
      case 'addBIAccount': {
        if (p.role!=='admin') return { error:'เฉพาะผู้ดูแลระบบเท่านั้น' };
        const u = String(p.username||'').trim(); const pw = String(p.password||'').trim();
        if (!u || !pw) return { error:'กรุณากรอก username และ password' };
        biAccounts.push({ account_id:'BI'+(100+biSeq++), username:u, password:pw, status:'available', holder_id:'', holder_name:'', updated_at:new Date().toISOString() });
        return { ok:true };
      }
      case 'requestBIAccount': {
        const a = biAccounts.find(x=>x.account_id===p.account_id);
        if (!a) return { error:'ไม่พบบัญชีนี้' };
        if (a.status!=='available') return { error:'บัญชีนี้ถูกใช้งานอยู่' };
        a.status='pending'; a.holder_id=String(p.user_id||''); a.holder_name=String(p.name||''); a.updated_at=new Date().toISOString();
        return { ok:true };
      }
      case 'approveBIAccount': {
        if (p.role!=='admin') return { error:'เฉพาะผู้ดูแลระบบเท่านั้น' };
        const a = biAccounts.find(x=>x.account_id===p.account_id);
        if (!a) return { error:'ไม่พบบัญชีนี้' };
        if (a.status!=='pending') return { error:'บัญชีนี้ไม่มีคำขอที่รออนุมัติ' };
        a.status='approved'; a.updated_at=new Date().toISOString();
        return { ok:true };
      }
      case 'releaseBIAccount': {
        const a = biAccounts.find(x=>x.account_id===p.account_id);
        if (!a) return { error:'ไม่พบบัญชีนี้' };
        // admin คืนได้ทุกบัญชี / teacher คืนได้เฉพาะของตัวเอง
        if (p.role!=='admin' && a.holder_id!==String(p.user_id||'')) return { error:'คืนได้เฉพาะบัญชีของตัวเอง' };
        a.status='available'; a.holder_id=''; a.holder_name=''; a.updated_at=new Date().toISOString();
        return { ok:true };
      }
      case 'deleteBIAccount': {
        if (p.role!=='admin') return { error:'เฉพาะผู้ดูแลระบบเท่านั้น' };
        const i = biAccounts.findIndex(x=>x.account_id===p.account_id);
        if (i===-1) return { error:'ไม่พบบัญชีนี้' };
        biAccounts.splice(i,1); return { ok:true };
      }
      case 'getStats': {
        const today = todayISO();
        const todays = bookings.filter(b=>b.date===today && b.status!=='cancelled' && b.status!=='rejected');
        const weekAgo = toISO(addDays(new Date(),-6));
        const weekly = bookings.filter(b=>b.date>=weekAgo && b.date<=today && b.status!=='cancelled' && b.status!=='rejected');
        const av = availability(today);
        return { today, bookings_today:todays.length,
          pending: bookings.filter(b=>b.status==='pending').length,
          free_slots_today: av.reduce((n,s)=>n+s.free,0),
          weekly_total: weekly.length,
          checked_in_today: todays.filter(b=>b.checked_in==='yes').length };
      }
      case 'getReport': {
        let list = bookings.filter(b=>b.status!=='cancelled'&&b.status!=='rejected');
        const byUser={}, byCase={};
        list.forEach(b=>{
          if(!byUser[b.user_id]) byUser[b.user_id]={user_id:b.user_id,name:b.name,count:0,cases:{}};
          byUser[b.user_id].count++;
          const c=b.subject_case||'(ไม่ระบุ)';
          byUser[b.user_id].cases[c]=(byUser[b.user_id].cases[c]||0)+1;
          byCase[c]=(byCase[c]||0)+1;
        });
        const usersR = Object.values(byUser).map(u=>({...u, cases:Object.keys(u.cases).map(c=>({case:c,count:u.cases[c]}))})).sort((a,b)=>b.count-a.count);
        const casesR = Object.keys(byCase).map(c=>({case:c,count:byCase[c]})).sort((a,b)=>b.count-a.count);
        return { by_user:usersR, by_case:casesR, total:list.length };
      }
      default: return { error:'ไม่รู้จัก action: '+action };
    }
  }
  return { handle };
})();

/* =========================================================
   เริ่มทำงาน
   ========================================================= */
window.addEventListener('DOMContentLoaded', App.boot);
