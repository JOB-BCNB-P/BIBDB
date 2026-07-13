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
const PAGE_SIZE = 10;          // จำนวนแถวต่อหน้า (ปุ่มแบ่งหน้า)
const STEP_MIN = 30;           // ความละเอียดช่วงเวลาจอง (นาที)

/* ---------- helpers วันที่/เวลา ---------- */
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
function t2m(hhmm){ const p=String(hhmm||'').split(':'); return (+p[0]||0)*60+(+p[1]||0); }
function m2t(min){ return pad(Math.floor(min/60))+':'+pad(min%60); }
function overlaps(aS,aE,bS,bE){ return aS<bE && bS<aE; }

/* ---------- icons ---------- */
const F = ' fill="currentColor" fill-opacity=".18" stroke="none"';
const D = ' fill="currentColor" stroke="none"';
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
   CLIENT CACHE — เปิดแท็บไวขึ้น
   หลักการ: แสดงข้อมูลชุดล่าสุดที่เคยโหลดไว้ "ทันที"
   แล้วดึงข้อมูลใหม่เบื้องหลัง ถ้าเปลี่ยนค่อยวาดซ้ำ (stale-while-revalidate)
   ========================================================= */
const CACHE_TTL = 60 * 1000;   // ภายใน 60 วิ ถือว่าข้อมูลยังสด ไม่ดึงซ้ำ
const CACHE_LS  = 'bi_cache_v1';
const Cache = {
  map: {},
  load(){ try { this.map = JSON.parse(localStorage.getItem(CACHE_LS)) || {}; } catch(e){ this.map = {}; } },
  save(){ try { localStorage.setItem(CACHE_LS, JSON.stringify(this.map)); } catch(e){} },
  get(k){ const e = this.map[k]; return e ? e.d : null; },
  isFresh(k, ttl){ const e = this.map[k]; return !!e && (Date.now() - e.t) < (ttl || CACHE_TTL); },
  set(k, d){ this.map[k] = { d, t: Date.now() }; this.save(); },
  /* ทำให้ cache "หมดอายุ" (ยังแสดงได้ทันที แต่จะรีเฟรชแน่นอนเมื่อเปิดหน้า) */
  stale(prefix){
    Object.keys(this.map).forEach(k => { if (!prefix || k.startsWith(prefix)) this.map[k].t = 0; });
    this.save();
  },
  wipe(){ this.map = {}; try { localStorage.removeItem(CACHE_LS); } catch(e){} }
};
Cache.load();

/* เรียกหลังทำรายการที่เปลี่ยนข้อมูล (จอง/อนุมัติ/ยกเลิก/บัญชี BI ฯลฯ) */
function invalidateData(){ Cache.stale('v:'); }

/* โหลดข้อมูลของ view:
   - มี cache → วาดทันที (ไม่ต้องรอ spinner) แล้วรีเฟรชเบื้องหลัง
   - ไม่มี cache → รอโหลดตามปกติ */
async function viewSWR(key, fetcher, render, ttl){
  const tok = State._navToken;
  const cached = Cache.get(key);
  if (cached){
    render(cached, true);
    if (Cache.isFresh(key, ttl)) return;   // ยังสดอยู่ จบเลย
  }
  const fresh = await fetcher();
  if (fresh && !fresh.__err) Cache.set(key, fresh);
  if (State._navToken !== tok) return;      // ผู้ใช้เปลี่ยนหน้าไปแล้ว ไม่วาดทับ
  if (!cached || JSON.stringify(fresh) !== JSON.stringify(cached)) render(fresh, false);
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
  calMonth: startOfMonth(new Date()),
  _pages: {},          // สถานะเลขหน้าของแต่ละรายการ
  _bkCache: {},        // แคชรายการจองที่แสดงอยู่ (ใช้ตอนเปิด modal อนุมัติ)
};

const SESSION_KEY = 'bi_session_v1';
function saveSession(u){ localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
function loadSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)); }catch(e){ return null; } }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

/* =========================================================
   ปุ่มแบ่งหน้า (Pagination) — ใช้กับทุกรายการที่เกิน 10 แถว
   ========================================================= */
function paginate(key, list){
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  let page = Math.min(State._pages[key] || 1, pages);
  State._pages[key] = page;
  const slice = list.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  if (total <= PAGE_SIZE) return { slice, html:'' };

  // เลขหน้าแบบย่อ: 1 … ก่อนหน้า ปัจจุบัน ถัดไป … สุดท้าย
  const nums = new Set([1, pages, page-1, page, page+1]);
  const shown = [...nums].filter(n=>n>=1 && n<=pages).sort((a,b)=>a-b);
  let btns = '', prev = 0;
  shown.forEach(n=>{
    if (n - prev > 1) btns += '<span class="pg-dots">…</span>';
    btns += `<button class="pg-btn ${n===page?'active':''}" onclick="App.setPage('${key}',${n})">${n}</button>`;
    prev = n;
  });
  const html = `<div class="pager">
    <button class="pg-btn" ${page<=1?'disabled':''} onclick="App.setPage('${key}',${page-1})">‹</button>
    ${btns}
    <button class="pg-btn" ${page>=pages?'disabled':''} onclick="App.setPage('${key}',${page+1})">›</button>
    <span class="pg-info">หน้า ${page}/${pages} · ${total} รายการ</span>
  </div>`;
  return { slice, html };
}

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

  setPage(key, p){ State._pages[key] = p; App.go(State.view); },

  loginMonthShift(n){
    State._loginMonth = addMonths(State._loginMonth || startOfMonth(new Date()), n);
    App.renderLoginCal();
  },

  async renderLoginCal(){
    const grid = $('loginCal'); if (!grid) return;
    const base = State._loginMonth || (State._loginMonth = startOfMonth(new Date()));
    $('loginCalLabel').textContent = MONTH_TH_FULL[base.getMonth()] + ' ' + (base.getFullYear()+543);

    const first = startOfWeek(base);
    const cells = [];
    for (let i=0;i<42;i++) cells.push(addDays(first, i));
    const from = toISO(cells[0]), to = toISO(cells[41]);
    const seq = (State._loginSeq = (State._loginSeq||0) + 1); // กันการกดเปลี่ยนเดือนรัวๆ แล้ววาดทับกัน

    grid.innerHTML = '<div class="mc-loading"><div class="spinner"></div></div>';
    await viewSWR('v:logincal:'+from+':'+to, async ()=>{
      const [st, bk] = await Promise.all([
        State._pubSettings ? Promise.resolve({ settings: State._pubSettings }) : api('getSettings'),
        api('getBookings', { from, to })
      ]);
      return { st, bk, __err: !!(bk && bk.error) };
    }, (d)=>{
      if (seq !== State._loginSeq) return;
      const g = $('loginCal'); if (!g) return;
      State._pubSettings = (d.st && d.st.settings) || State._pubSettings
        || { total_stations:1, open_time:'08:00', close_time:'20:00', open_days:['mon','tue','wed','thu','fri'] };
      const all = ((d.bk && d.bk.bookings)||[]).filter(b=> b.status!=='cancelled' && b.status!=='rejected');
      State._loginBk = all;

      const dows = ['จ','อ','พ','พฤ','ศ','ส','อา'];
      let head = dows.map(x=>`<div class="mc-dow">${x}</div>`).join('');
      let body = '';
      cells.forEach(d2=>{
        const iso = toISO(d2);
        const inMonth = d2.getMonth()===base.getMonth();
        const isToday = iso===todayISO();
        const cnt = all.filter(b=>b.date===iso).length;
        const click = inMonth ? ` onclick="App.loginDayDetail('${iso}')"` : '';
        body += `<div class="mc-cell ${inMonth?'':'out'} ${isToday?'today':''} ${inMonth?'click':''} ${cnt>0?'has':''}"${click}>
          <span class="mc-d">${d2.getDate()}</span>
          ${cnt>0?`<span class="mc-badge">${cnt}</span>`:''}
        </div>`;
      });
      g.innerHTML = `<div class="mc-grid mc-head">${head}</div><div class="mc-grid mc-body">${body}</div>`;
    });
  },

  /* ป็อบอัพรายละเอียดวัน (หน้า login — ไม่แสดงชื่อผู้จอง) */
  loginDayDetail(iso){
    const s = State._pubSettings || { total_stations:1 };
    const day = (State._loginBk||[]).filter(b=>b.date===iso)
      .sort((a,b)=>a.start_time.localeCompare(b.start_time));
    const rows = day.length ? day.map(b=>{
      const st = b.status==='pending'?'<span class="badge pending">รออนุมัติ</span>':'<span class="badge approved">อนุมัติ</span>';
      return `<div class="dd-slot">
        <div class="dd-slot-head"><b>${esc(b.start_time)}–${esc(b.end_time)}</b>${st}</div>
        <div class="dd-case">${esc(b.subject_case||'ไม่ระบุเคส')}</div>
      </div>`;
    }).join('') : `<div class="dd-slot"><div class="dd-empty">ยังไม่มีการจองในวันนี้</div></div>`;
    openModal(`
      <div class="dd">
        <div class="dd-date">${svg(I.cal)} การจองวันที่ ${fmtThaiDate(iso)}</div>
        <div class="dd-list">${rows}</div>
        <div class="help" style="margin-top:10px">เวลาเปิดจอง ${esc((s.open_time||'08:00'))}–${esc((s.close_time||'20:00'))} · เครื่องทั้งหมด ${s.total_stations||1} เครื่อง</div>
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
    if (cid.length !== 13) return fieldError('sCid', 'เลขบัตรประชาชนต้องมี 13 หลัก (กรอกแล้ว '+cid.length+' หลัก)');
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
      clearSession(); Cache.wipe(); location.reload();  // ล้างข้อมูลแคช กันข้อมูลค้างข้ามผู้ใช้
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

    // ตั้งค่าระบบ: ใช้ค่าที่แคชไว้ก่อน (เข้าแอปได้ทันที) แล้วรีเฟรชเบื้องหลัง
    const cachedS = Cache.get('v:settings');
    if (cachedS){
      State.settings = cachedS;
      api('getSettings').then(s=>{
        if (s && s.settings){ State.settings = s.settings; Cache.set('v:settings', s.settings); }
      });
    } else {
      const s = await api('getSettings');
      State.settings = s.settings || { total_stations:1, open_days:['mon','tue','wed','thu','fri'], open_time:'08:00', close_time:'20:00', max_duration:2 };
      if (s && s.settings) Cache.set('v:settings', s.settings);
    }

    App._secureGuards(); // ป้องกันคัดลอกข้อมูลบัญชี BI ทุกหน้า (ยกเว้นผู้ดูแล)
    App.renderNav();
    App.go(isStaff() ? 'tdash' : 'sdash');
  },

  renderNav(){
    const role = State.user.role;
    let items;
    if (role==='admin'){
      items = [
        ['tdash', I.dash, 'ภาพรวม'],
        ['sbook', I.plus, 'จองคิว'],
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
        ['sbook', I.plus, 'จองคิว'],
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
        ['tbi', I.key, 'บัญชี BI'],
      ];
    }
    $('nav').innerHTML = items.map(([v,ic,label])=>
      `<button data-v="${v}" onclick="App.go('${v}')">${svg(ic)}${label}</button>`
    ).join('');
  },

  go(view){
    State._navToken = (State._navToken || 0) + 1; // กันข้อมูลหน้าเก่ามาวาดทับ
    State.view = view;
    document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active', b.dataset.v===view));
    const m = $('main');
    m.innerHTML = skeletonView(); // โครงร่างกะพริบระหว่างโหลด (ถ้ามี cache จะถูกแทนที่ทันที)
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
  await viewSWR('v:sdash:'+State.user.user_id, async ()=>{
    const [bk, st] = await Promise.all([
      api('getBookings', { user_id: State.user.user_id }),
      api('getStats')
    ]);
    return { bk, st, __err: !!(bk.error || st.error) };
  }, (d)=>Views._sdashRender(m, d));
};
Views._sdashRender = function(m, d){
  const bk = d.bk || {}, st = d.st || {};
  const mine = (bk.bookings||[]);
  const upcoming = mine.filter(b=> b.date>=todayISO() && (b.status==='approved'||b.status==='pending'))
                       .sort((a,b)=> (a.date+a.start_time).localeCompare(b.date+b.start_time));
  const freeToday = st.free_bi_today||0;
  const pendingCount = mine.filter(b=>b.status==='pending').length;

  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>สวัสดี ${esc(State.user.name.split(' ')[0])} 👋</h2><span class="hint">ยินดีต้อนรับสู่ระบบจอง Body Interact</span></div>
      <div class="grid cols-3" style="margin-bottom:18px">
        ${stat('mint', I.book, upcoming.length, 'คิวที่กำลังจะถึง')}
        ${stat('warn', I.clock, pendingCount, 'รออนุมัติ')}
        ${stat('sky', I.pulse, freeToday, 'User ว่างวันนี้')}
      </div>

      <div class="card">
        <div class="section-head"><h3>คิวของฉันที่กำลังจะถึง</h3><span class="topbar-spacer"></span>
          <button class="btn btn-primary btn-sm" onclick="App.go('sbook')">${svg(I.plus)}จองเพิ่ม</button></div>
        ${upcoming.length ? upcoming.slice(0,4).map(b=>bookingCard(b)).join('') : emptyState('🗓️','ยังไม่มีคิวที่จองไว้','กดปุ่ม “จองเพิ่ม” เพื่อเริ่มจองรอบใช้งาน')}
      </div>
    </div>`;
};


/* ---------- จองคิว (ทุกบทบาท: นักศึกษา / อาจารย์ / ผู้ดูแล) ----------
   เวลาแบบยืดหยุ่น: เลือกเวลาเริ่ม–สิ้นสุดเองเป็นช่วงละ 30 นาที */
Views.sbook = async function(m){
  const open = State.settings.open_days;
  const s = State.settings;
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>จองคิวเข้าใช้งาน</h2>
        <span class="hint">เลือกวันและช่วงเวลาได้อิสระ (ช่วงละ ${STEP_MIN} นาที · สูงสุด ${s.max_duration} ชม.)</span></div>
      <div class="card">
        <div class="grid cols-2">
          <div class="field">
            <label for="bkDate">วันที่</label>
            <input class="input" type="date" id="bkDate" min="${todayISO()}" value="${State.bookDate}" onchange="Views.loadSlots(this.value)" />
            <div class="help">เปิดให้จองเฉพาะวัน: ${open.map(d=>dowLabel(d)).join(', ')} · เวลา ${esc(s.open_time)}–${esc(s.close_time)}</div>
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
  // ความว่างต้องค่อนข้างสด → TTL สั้น 30 วิ / scenarios & รายชื่อผู้ใช้แคชรวมไปด้วย
  await viewSWR('v:slots:'+dateISO, async ()=>{
    const [av, sc, us] = await Promise.all([
      api('getAvailability', { date: dateISO }),
      Views._scnCache ? Promise.resolve(Views._scnCache) : api('getScenarios'),
      Views._userCache ? Promise.resolve({ users: Views._userCache }) : api('getUsers')
    ]);
    return {
      av,
      sc: (sc && sc.scenarios) ? sc : Views._scnCache,
      us: (us && us.users) ? us.users : Views._userCache,
      __err: !!(av && av.error)
    };
  }, (d)=>Views._slotsRender(dateISO, d), 30*1000);
};

Views._slotsRender = function(dateISO, d){
  if (State.bookDate !== dateISO) return;       // ผู้ใช้เปลี่ยนวันไปแล้ว
  const area = $('slotArea'); if (!area) return;
  const av = d.av || {};
  if (av.error){ area.innerHTML = emptyState('⚠️', av.error, ''); return; }
  if (d.sc && d.sc.scenarios) Views._scnCache = d.sc;
  if (d.us) Views._userCache = d.us;
  const scnList = ((Views._scnCache||{}).scenarios)||[];
  State._avail = av;
  Views._members = [];

  const scnOptions = scnList.map(s=>{
    const label = (s.no? s.no+' · ':'') + s.title + (s.level? ' ('+s.level+')':'');
    const val = (s.no? s.no+' · ':'') + s.title;
    return `<option value="${esc(val)}">${esc(label)}</option>`;
  }).join('');

  // รายชื่ออาจารย์ (ผู้สอน/ผู้ควบคุม) — ถ้าอาจารย์เป็นผู้จอง เลือกตัวเองให้อัตโนมัติ
  const teacherOpts = (Views._userCache||[]).filter(u=>u.role==='teacher').map(t=>
    `<option value="${esc(t.name)}" ${State.user.role==='teacher'&&String(t.user_id)===String(State.user.user_id)?'selected':''}>${esc(t.name)}</option>`
  ).join('');

  // แผนภาพความว่างรายช่วง 30 นาที (การ์ด + จุดสถานะ + ป้ายบอกจำนวนเครื่องว่างเมื่อชี้)
  const steps = av.steps||[];
  const stepChips = steps.map(st=>{
    const cls = st.free<=0 ? 'full' : (st.used>0 ? 'part' : '');
    const endT = m2t(t2m(st.time)+STEP_MIN);
    const tip = st.free<=0
      ? `${st.time}–${endT} น. · เต็ม จองไม่ได้`
      : `${st.time}–${endT} น. · ว่าง ${st.free}/${av.total_stations} เครื่อง`;
    return `<div class="tl-step ${cls}" tabindex="0">
      <span class="tl-dot"></span>
      <span class="tl-time">${st.time}</span>
      <span class="tl-tip">${tip}</span>
    </div>`;
  }).join('');

  // ตัวเลือกเวลาเริ่ม: เฉพาะช่วงที่ยังว่าง
  const startOpts = steps.filter(st=>st.free>0)
    .map(st=>`<option value="${st.time}">${st.time}</option>`).join('');

  area.innerHTML = `
    <div class="field"><label>ความว่างของวัน (${fmtThaiDate(dateISO)})</label>
      <div class="timeline">${stepChips || '<div class="help">ยังไม่ได้ตั้งค่าเวลาเปิด-ปิด</div>'}</div>
      <div class="tl-legend">
        <div class="lgi"><span class="lg free"></span><div><b>ว่าง</b><small>สามารถจองได้ทุกเครื่อง</small></div></div>
        <div class="lgi"><span class="lg part"></span><div><b>ว่างบางเครื่อง</b><small>บางเครื่องถูกจองแล้ว</small></div></div>
        <div class="lgi"><span class="lg full"></span><div><b>เต็ม</b><small>ไม่สามารถจองช่วงนี้ได้</small></div></div>
      </div>
    </div>
    ${startOpts ? `
    <div class="grid cols-3">
      <div class="field">
        <label for="bkStart">เวลาเริ่ม</label>
        <select class="input" id="bkStart" onchange="Views.updateEnd()">${startOpts}</select>
      </div>
      <div class="field">
        <label for="bkEnd">เวลาสิ้นสุด</label>
        <select class="input" id="bkEnd" onchange="Views.updateFree()"></select>
      </div>
      <div class="field">
        <label>เครื่องว่างในช่วงที่เลือก</label>
        <div class="free-ind" id="bkFree">—</div>
      </div>
    </div>
    <div id="bookForm">
      <div class="grid cols-2">
        <div class="field">
          <label for="bkCase">หัวข้อ / เคสที่จะฝึก (เลือกจาก Scenarios)</label>
          <select class="input" id="bkCase">
            <option value="">— เลือก Scenario —</option>
            ${scnOptions}
          </select>
        </div>
        <div class="field">
          <label for="bkSize">จำนวนผู้เข้าฝึก (คน)</label>
          <input class="input" id="bkSize" type="number" min="1" max="20" value="1" />
        </div>
        <div class="field">
          <label for="bkBiCount">จำนวนเครื่อง / บัญชี BI ที่ต้องการใช้</label>
          <input class="input" id="bkBiCount" type="number" min="0" max="20" value="1" />
          <div class="help">ผู้ดูแลระบบจะเป็นผู้เลือกและจ่ายบัญชีให้เมื่ออนุมัติการจอง</div>
        </div>
      </div>
      <div class="field">
        <label for="bkTeacher">อาจารย์ผู้สอน / อาจารย์ผู้ควบคุม</label>
        <select class="input" id="bkTeacher">
          <option value="">— เลือกอาจารย์ —</option>
          ${teacherOpts}
        </select>
      </div>
      <div class="field">
        <label for="bkNote">หมายเหตุเกี่ยวกับ Scenario ที่เลือก (ถ้ามี)</label>
        <textarea class="input" id="bkNote" rows="2" placeholder="เช่น จุดที่ต้องการเน้นฝึก อุปกรณ์เพิ่มเติม ฯลฯ"></textarea>
      </div>
      <div class="field">
        <label for="bkMemberSearch">${isStaff()?'เลือกนักศึกษาที่เข้าร่วม (เลือกได้หลายคน)':'รายชื่อสมาชิกในกลุ่ม (ถ้ามี)'}</label>
        <div class="member-picker" id="memberPicker">
          <div id="bkChips" class="member-chips"></div>
          <input class="input" id="bkMemberSearch" placeholder="พิมพ์ชื่อเพื่อค้นหา แล้วกดเลือก…" autocomplete="off"
                 oninput="Views.memberSearch(this.value)" onfocus="Views.memberSearch(this.value)" />
          <div id="bkMemberList" class="member-list hidden"></div>
        </div>
        <div class="help">${isStaff()?'อาจารย์สามารถเลือกนักศึกษาเข้ากลุ่มได้หลายคน':'เลือกได้เฉพาะนักศึกษาด้วยกันเท่านั้น'}</div>
      </div>
      <button class="btn btn-primary btn-block" onclick="Views.submitBooking()">${svg(I.check)}ยืนยันการจอง</button>
    </div>` : emptyState('😔','ไม่มีช่วงเวลาว่างในวันนี้','กรุณาเลือกวันอื่น')}
  `;
  if (startOpts) Views.updateEnd();

  if (!Views._memberDocBound){
    Views._memberDocBound = true;
    document.addEventListener('click', (e)=>{
      const mp = $('memberPicker');
      const list = $('bkMemberList');
      if (mp && list && !mp.contains(e.target)) list.classList.add('hidden');
    });
  }
};

/* เมื่อเปลี่ยนเวลาเริ่ม → คำนวณตัวเลือกเวลาสิ้นสุดที่เป็นไปได้ */
Views.updateEnd = function(){
  const av = State._avail; if (!av) return;
  const steps = av.steps||[];
  const start = $('bkStart').value;
  const startM = t2m(start);
  const maxM = Math.min(t2m(av.close_time), startM + (av.max_duration*60));
  const opts = [];
  // เดินหน้าทีละช่วง หยุดเมื่อเจอช่วงที่เต็ม
  for (let m = startM; m < maxM; m += STEP_MIN){
    const st = steps.find(x=>t2m(x.time)===m);
    if (!st || st.free<=0) break;
    opts.push(m + STEP_MIN);
  }
  $('bkEnd').innerHTML = opts.map(m=>`<option value="${m2t(m)}">${m2t(m)}</option>`).join('');
  Views.updateFree();
};

/* แสดงจำนวนเครื่องว่างต่ำสุดในช่วงที่เลือก */
Views.updateFree = function(){
  const av = State._avail; if (!av) return;
  const el = $('bkFree'); if (!el) return;
  const start = $('bkStart').value, end = $('bkEnd').value;
  if (!start || !end){ el.textContent='—'; return; }
  const sM = t2m(start), eM = t2m(end);
  let minFree = av.total_stations;
  (av.steps||[]).forEach(st=>{
    const m = t2m(st.time);
    if (m>=sM && m<eM) minFree = Math.min(minFree, st.free);
  });
  el.innerHTML = minFree>0
    ? `<span class="ok">${svg(I.check)} ว่าง ${minFree}/${av.total_stations} เครื่อง</span>`
    : `<span class="bad">${svg(I.x)} เต็ม</span>`;
};

/* ---------- เลือกสมาชิกกลุ่ม (ค้นหาจากรายชื่อผู้ใช้) ---------- */
Views._members = [];
Views.memberSearch = function(q){
  const list = $('bkMemberList'); if (!list) return;
  q = String(q||'').trim().toLowerCase();
  const pool = (Views._userCache||[]).filter(u=>
    u.role==='student' &&                                    // เลือกได้เฉพาะนักศึกษา
    String(u.user_id)!==String(State.user.user_id) &&
    !Views._members.some(m=>String(m.user_id)===String(u.user_id)) &&
    (!q || u.name.toLowerCase().includes(q) || String(u.class_group||'').toLowerCase().includes(q))
  );
  list.innerHTML = pool.length
    ? pool.slice(0,8).map(u=>`
        <button type="button" class="member-opt" onclick="Views.addMember('${esc(String(u.user_id))}')">
          <span class="mo-name">${esc(u.name)}</span>
          <span class="mo-role">${esc(u.class_group||'นักศึกษา')}</span>
        </button>`).join('')
    : '<div class="member-empty">ไม่พบรายชื่อที่ค้นหา</div>';
  list.classList.remove('hidden');
};
Views.addMember = function(uid){
  const u = (Views._userCache||[]).find(x=>String(x.user_id)===String(uid));
  if (!u) return;
  Views._members.push({ user_id:u.user_id, name:u.name, role:u.role });
  const inp = $('bkMemberSearch'); if (inp){ inp.value=''; inp.focus(); }
  $('bkMemberList').classList.add('hidden');
  Views.renderMemberChips();
};
Views.removeMember = function(uid){
  Views._members = Views._members.filter(m=>String(m.user_id)!==String(uid));
  Views.renderMemberChips();
};
Views.renderMemberChips = function(){
  const host = $('bkChips'); if (!host) return;
  host.innerHTML = Views._members.map(m=>`
    <span class="member-chip ${m.role}">
      ${esc(m.name)}
      <button type="button" onclick="Views.removeMember('${esc(String(m.user_id))}')" aria-label="ลบ ${esc(m.name)}">&times;</button>
    </span>`).join('');
  const size = $('bkSize'); if (size) size.value = Views._members.length + 1;
};

Views.submitBooking = async function(){
  const start = $('bkStart') && $('bkStart').value;
  const end = $('bkEnd') && $('bkEnd').value;
  // ตรวจครบทุกช่องก่อน แล้วชี้จุดผิดใต้ช่องนั้นๆ (inline validation)
  let bad = false;
  if (!start || !end){ if ($('bkStart')) fieldError('bkStart','กรุณาเลือกช่วงเวลา'); bad = true; }
  if (!$('bkCase').value){ fieldError('bkCase','กรุณาเลือก Scenario ที่จะฝึก'); bad = true; }
  if (!$('bkTeacher').value){ fieldError('bkTeacher','กรุณาเลือกอาจารย์ผู้สอน/ผู้ควบคุม'); bad = true; }
  const size = parseInt($('bkSize').value,10);
  if (!size || size < 1){ fieldError('bkSize','ระบุจำนวนผู้เข้าฝึกอย่างน้อย 1 คน'); bad = true; }
  const bic = parseInt($('bkBiCount') && $('bkBiCount').value, 10);
  if ($('bkBiCount') && (isNaN(bic) || bic < 0)){ fieldError('bkBiCount','จำนวนต้องเป็น 0 ขึ้นไป'); bad = true; }
  if (bad) return toast('กรุณากรอกข้อมูลให้ครบถ้วน', 'err');
  const btn = event.target;
  setLoading(btn, true);
  const r = await api('createBooking', {
    user_id: State.user.user_id, name: State.user.name, role: State.user.role,
    date: State.bookDate, start_time: start, end_time: end,
    subject_case: $('bkCase').value,
    supervisor: $('bkTeacher').value,
    note: $('bkNote').value.trim(),
    group_size: parseInt($('bkSize').value,10)||1,
    group_members: Views._members.map(m=>m.name).join(', '),
    bi_count: parseInt($('bkBiCount') && $('bkBiCount').value, 10) || 0
  });
  setLoading(btn, false, 'ยืนยันการจอง');
  if (r.error) return alertDialog('จองไม่สำเร็จ', r.error, 'err'); // แจ้งผลด้วย dialog เต็ม
  invalidateData();
  alertDialog('จองสำเร็จ!', 'ระบบบันทึกคำขอแล้ว รอผู้ดูแลระบบอนุมัติ', 'ok', 'ตกลง',
    ()=>App.go(isStaff() ? 'tbookings' : 'smine'));
};

/* ---------- นักศึกษา: การจองของฉัน ---------- */
Views.smine = async function(m){
  await viewSWR('v:smine:'+State.user.user_id, async ()=>{
    const bk = await api('getBookings', { user_id: State.user.user_id });
    return { bk, __err: !!bk.error };
  }, (d)=>Views._smineRender(m, d));
};
Views._smineRender = function(m, d){
  const bk = d.bk || {};
  const list = (bk.bookings||[]).sort((a,b)=> (b.date+b.start_time).localeCompare(a.date+a.start_time));
  const pg = paginate('smine', list);
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>การจองของฉัน</h2><span class="hint">ทั้งหมด ${list.length} รายการ</span></div>
      <div class="card">
        ${list.length ? pg.slice.map(b=>bookingCard(b, true)).join('') : emptyState('📋','ยังไม่มีประวัติการจอง','ไปที่หน้า “จองคิว” เพื่อเริ่มจอง')}
        ${pg.html}
      </div>
    </div>`;
};

App.cancelMine = function(id){
  confirmModal('ยกเลิกการจอง', 'ต้องการยกเลิกการจองนี้ใช่หรือไม่?', 'ยกเลิกการจอง', async ()=>{
    const r = await api('cancelBooking', { booking_id:id, user_id:State.user.user_id, role:State.user.role });
    if (r.error) return toast(r.error,'err');
    invalidateData();
    toast('ยกเลิกการจองแล้ว','ok'); App.go(State.view);
  });
};
App.checkIn = async function(id){
  const r = await api('checkIn', { booking_id:id, user_id:State.user.user_id, role:State.user.role });
  if (r.error) return toast(r.error,'err');
  invalidateData();
  toast('เช็คอินเรียบร้อย ✅','ok'); App.go(State.view);
};

/* ---------- ปฏิทินเต็มเดือน (ใช้ร่วม น.ศ./อาจารย์/ผู้ดูแล)
     คลิกวันเพื่อดูรายละเอียดเป็นป็อบอัพ ---------- */
Views.scal = function(m){ renderMonth(m, false); };
Views.tcal = function(m){ renderMonth(m, true); };

async function renderMonth(m, staff){
  const base = State.calMonth;
  const first = startOfWeek(base);
  const cells = [];
  for (let i=0;i<42;i++) cells.push(addDays(first, i));
  const from = toISO(cells[0]), to = toISO(cells[41]);

  await viewSWR('v:cal:'+from+':'+to, async ()=>{
    const bk = await api('getBookings', { from, to });
    return { bk, __err: !!bk.error };
  }, (d)=>renderMonthBody(m, staff, base, cells, d));
}

function renderMonthBody(m, staff, base, cells, d){
  const bk = d.bk || {};
  const all = (bk.bookings||[]).filter(b=> b.status!=='cancelled' && b.status!=='rejected');
  State._calBk = all;
  State._calStaff = staff;

  const dows = ['จ','อ','พ','พฤ','ศ','ส','อา'];
  const head = dows.map(d=>`<div class="mc-dow">${d}</div>`).join('');
  let body = '';
  cells.forEach(d=>{
    const iso = toISO(d);
    const inMonth = d.getMonth()===base.getMonth();
    const isToday = iso===todayISO();
    const dow = DOW_KEY[d.getDay()];
    const off = State.settings.open_days.indexOf(dow)===-1;
    const day = all.filter(b=>b.date===iso);
    const cnt = day.length;
    const pendingCnt = day.filter(b=>b.status==='pending').length;
    const click = inMonth ? ` onclick="App.dayDetail('${iso}')"` : '';
    body += `<div class="mc-cell big ${inMonth?'':'out'} ${isToday?'today':''} ${off&&inMonth?'closed':''} ${inMonth?'click':''} ${cnt>0?'has':''}"${click}>
      <span class="mc-d">${d.getDate()}</span>
      ${cnt>0?`<span class="mc-badge">${cnt}</span>`:''}
      ${pendingCnt>0?`<span class="mc-pend" title="รออนุมัติ ${pendingCnt}"></span>`:''}
    </div>`;
  });

  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>ปฏิทินการใช้งาน</h2><span class="hint">มุมมองเต็มเดือน · คลิกวันเพื่อดูรายละเอียด</span></div>
      <div class="card">
        <div class="cal-head">
          <button class="btn btn-soft btn-sm" onclick="App.monthShift(-1)">${svg('<path d="M15 18l-6-6 6-6"/>')}เดือนก่อน</button>
          <span class="range">${MONTH_TH_FULL[base.getMonth()]} ${base.getFullYear()+543}</span>
          <button class="btn btn-soft btn-sm" onclick="App.monthShift(1)">เดือนถัดไป${svg('<path d="M9 18l6-6-6-6"/>')}</button>
          <span class="topbar-spacer"></span>
          <button class="btn btn-ghost btn-sm" onclick="App.monthToday()">เดือนนี้</button>
        </div>
        <div class="month-cal main-cal">
          <div class="mc-grid mc-head">${head}</div>
          <div class="mc-grid mc-body">${body}</div>
        </div>
        <div class="cal-note" style="margin-top:12px">${svg(I.info)}<span>ตัวเลขบนวัน = จำนวนการจอง · จุดส้ม = มีรายการรออนุมัติ</span></div>
      </div>
    </div>`;
}
App.monthShift = function(n){ State.calMonth = addMonths(State.calMonth, n); App.go(State.view); };
App.monthToday = function(){ State.calMonth = startOfMonth(new Date()); App.go(State.view); };

/* ป็อบอัพรายละเอียดวัน (ในแอป) */
App.dayDetail = function(iso){
  const staff = !!State._calStaff;
  const day = (State._calBk||[]).filter(b=>b.date===iso)
    .sort((a,b)=>a.start_time.localeCompare(b.start_time));
  const rows = day.length ? day.map(b=>{
    const admin = isAdmin();
    const act = (admin && b.status==='pending')
      ? `<div class="bc-actions" style="margin-top:6px">
           <button class="btn btn-primary btn-sm" onclick="App._closeModal();App.approve('${b.booking_id}')">${svg(I.check)}อนุมัติ</button>
           <button class="btn btn-danger btn-sm" onclick="App._closeModal();App.reject('${b.booking_id}')">${svg(I.x)}ปฏิเสธ</button>
         </div>` : '';
    return `<div class="dd-slot ${b.status==='pending'?'pend':''}">
      <div class="dd-slot-head"><b>${esc(b.start_time)}–${esc(b.end_time)}</b>${statusBadge(b.status)}</div>
      <div class="dd-case">
        ${staff?`<b>${esc(b.name)}</b> · `:''}${esc(b.subject_case||'ไม่ระบุเคส')}
        <span style="color:var(--muted)">· เครื่อง #${b.station_no}${b.group_size>1?' · '+b.group_size+' คน':''}</span>
      </div>
      ${b.supervisor?`<div class="dd-case" style="color:var(--muted)">อาจารย์ผู้ควบคุม: ${esc(b.supervisor)}</div>`:''}
      ${b.group_members?`<div class="dd-case" style="color:var(--muted)">กลุ่ม: ${esc(b.group_members)}</div>`:''}
      ${b.bi_account?`<div class="dd-case ${isAdmin()?'':'secure'}">${svg(I.key)} บัญชี BI: <b>${esc(b.bi_account)}</b></div>`:''}
      ${act}
    </div>`;
  }).join('') : `<div class="dd-slot"><div class="dd-empty">ยังไม่มีการจองในวันนี้</div></div>`;
  openModal(`
    <div class="dd">
      <div class="dd-date">${svg(I.cal)} การจองวันที่ ${fmtThaiDate(iso)}</div>
      <div class="dd-list">${rows}</div>
      <div class="modal-actions" style="margin-top:12px">
        <button class="btn btn-primary btn-block" onclick="App._closeModal();State.bookDate='${iso}';App.go('sbook')">${svg(I.plus)}จองวันนี้</button>
      </div>
    </div>`);
};

/* ---------- อาจารย์/ผู้ดูแล: ภาพรวม ---------- */
Views.tdash = async function(m){
  await viewSWR('v:tdash', async ()=>{
    const [st, bk] = await Promise.all([ api('getStats'), api('getBookings', { status:'pending' }) ]);
    return { st, bk, __err: !!(st.error || bk.error) };
  }, (d)=>Views._tdashRender(m, d));
};
Views._tdashRender = function(m, d){
  const st = d.st || {}, bk = d.bk || {};
  const pend = (bk.bookings||[]).sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time));
  cacheBookings(pend);
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>ภาพรวมระบบ</h2><span class="hint">ข้อมูลวันที่ ${fmtThaiDate(st.today||todayISO())}</span></div>
      <div class="grid cols-4" style="margin-bottom:18px">
        ${stat('mint', I.book, st.bookings_today||0, 'การจองวันนี้')}
        ${stat('warn', I.clock, st.pending||0, 'รออนุมัติ')}
        ${stat('sky', I.pulse, st.free_bi_today||0, 'User ว่างวันนี้')}
        ${stat('blush', I.report, st.weekly_total||0, 'การใช้งาน 7 วัน')}
      </div>
      <div class="card">
        <div class="section-head"><h3>คำขอที่รออนุมัติ</h3><span class="hint">${pend.length} รายการ${isAdmin()?'':' · อนุมัติโดยผู้ดูแลระบบเท่านั้น'}</span>
          <span class="topbar-spacer"></span>
          <button class="btn btn-ghost btn-sm" onclick="App.go('tbookings')">ดูทั้งหมด</button></div>
        ${pend.length ? pend.slice(0,6).map(b=>teacherBookingCard(b)).join('') : emptyState('✅','ไม่มีคำขอค้างอยู่','การจองทุกรายการได้รับการพิจารณาแล้ว')}
      </div>
    </div>`;
};

/* ---------- อาจารย์/ผู้ดูแล: การจองทั้งหมด ---------- */
Views.tbookings = async function(m){
  State._tFilter = State._tFilter || 'all';
  await viewSWR('v:tbookings', async ()=>{
    const bk = await api('getBookings', {});
    return { bk, __err: !!bk.error };
  }, (d)=>Views._tbookingsRender(m, d));
};
Views._tbookingsRender = function(m, d){
  const bk = d.bk || {};
  let list = (bk.bookings||[]).sort((a,b)=>(b.date+b.start_time).localeCompare(a.date+a.start_time));
  const f = State._tFilter;
  const filtered = f==='all' ? list : list.filter(b=>b.status===f);
  cacheBookings(filtered);
  const pg = paginate('tbookings', filtered);

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
          <thead><tr><th>วันที่</th><th>เวลา</th><th>เครื่อง</th><th>ผู้จอง</th><th>เคส</th><th>อาจารย์</th><th>บัญชี BI</th><th>สถานะ</th><th>เช็คอิน</th><th>จัดการ</th></tr></thead>
          <tbody>${pg.slice.map(rowBooking).join('')}</tbody>
        </table></div>${pg.html}` : emptyState('🔍','ไม่พบรายการ','ลองเปลี่ยนตัวกรองด้านบน')}
      </div>
    </div>`;
  State._lastList = list;
};
App.setFilter = function(v){ State._tFilter = v; State._pages.tbookings = 1; App.go('tbookings'); };

/* เก็บแคชรายการจองที่กำลังแสดง เพื่อใช้ใน modal อนุมัติ */
function cacheBookings(list){
  (list||[]).forEach(b=>{ State._bkCache[b.booking_id] = b; });
}

/* ---------- อนุมัติ (ผู้ดูแลระบบเท่านั้น) + จ่ายบัญชี BI ----------
   - กด +/− เลือกจำนวน → ระบบติ๊กบัญชีว่างให้อัตโนมัติ
     (ประเภทเดียวกับผู้จองก่อน แล้วจึงอีกประเภท)
   - หรือกด "เลือกบัญชีเอง" เพื่อเปิดรายการสวิตช์เลื่อน (scroll ได้) */
App.approve = async function(id){
  if (!isAdmin()) return toast('การอนุมัติทำได้โดยผู้ดูแลระบบเท่านั้น','err');
  const b = State._bkCache[id];
  const r = await api('getBIAccounts', { role:'admin', user_id:State.user.user_id });
  const accounts = (r.accounts||[]);
  const avail = accounts.filter(a=>a.status==='available');

  // ลำดับการเลือกอัตโนมัติ: บัญชีประเภทเดียวกับผู้จองก่อน
  const prefType = (b && b.role==='student') ? 'student' : 'teacher';
  App._asnPool = avail.filter(a=>a.account_type===prefType)
    .concat(avail.filter(a=>a.account_type!==prefType))
    .map(a=>String(a.account_id));

  const sw = a => `
    <label class="asn-item">
      <span class="asn-user">${svg(I.key)}${esc(a.username)}</span>
      <span class="topbar-spacer"></span>
      <span class="sw"><input type="checkbox" class="asnck" value="${esc(a.account_id)}" onchange="App.asnSync()" /><span class="sw-track"></span></span>
    </label>`;
  const group = (type, label)=>{
    const items = avail.filter(a=>a.account_type===type);
    if (!items.length) return '';
    return `<div class="asn-group"><div class="asn-head">${label} (${items.length})</div>${items.map(sw).join('')}</div>`;
  };
  const info = b ? `<div class="asn-bk">
      <b>${esc(b.name)}</b> · ${fmtThaiShort(b.date)} · ${esc(b.start_time)}–${esc(b.end_time)}
      ${b.group_size>1?`<span class="badge in">${b.group_size} คน</span>`:''}
      ${b.bi_count?`<span class="badge pending">ขอบัญชี BI ${esc(String(b.bi_count))} บัญชี</span>`:''}
      ${b.group_members?`<div class="help">กลุ่ม: ${esc(b.group_members)}</div>`:''}
    </div>` : '';

  openModal(`
    <div class="asn">
      <h3 style="margin-bottom:6px">อนุมัติการจอง</h3>
      ${info}
      ${avail.length ? `
      <div class="asn-count">
        <div>
          <b>จำนวนบัญชี BI ที่จะจ่าย</b>
          <div class="help">ระบบเลือกจากบัญชีว่าง ${avail.length} บัญชีให้อัตโนมัติ</div>
          ${b && b.supervisor ? `<div class="help">บัญชีนักศึกษา → แสดงที่ผู้จอง · บัญชีอาจารย์ → แสดงที่ <b>${esc(b.supervisor)}</b></div>` : ''}
        </div>
        <div class="stepper">
          <button type="button" onclick="App.asnStep(-1)" aria-label="ลดจำนวน">−</button>
          <span id="asnCount">0</span>
          <button type="button" onclick="App.asnStep(1)" aria-label="เพิ่มจำนวน">+</button>
        </div>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" id="asnListBtn" onclick="App.asnToggleList()">▾ เลือกบัญชีเอง / ดูรายการบัญชี</button>
      <div id="asnList" class="asn-scroll hidden">
        ${group('teacher','บัญชีอาจารย์')}${group('student','บัญชีนักศึกษา')}
      </div>` : '<div class="dd-empty" style="padding:8px 0">ไม่มีบัญชี BI ว่างในขณะนี้</div>'}
      <div class="modal-actions" style="margin-top:14px">
        <button class="btn btn-soft" onclick="App._closeModal()">ยกเลิก</button>
        <button class="btn btn-primary" onclick="App.confirmApprove('${esc(id)}')">${svg(I.check)}อนุมัติ</button>
      </div>
    </div>`);

  // ติ๊กให้อัตโนมัติเท่าจำนวนที่ผู้จองขอ (ไม่เกินบัญชีว่างที่มี)
  const want = Math.min((b && b.bi_count) || 0, avail.length);
  for (let i=0; i<want; i++) App.asnStep(1);
};

/* กด + / − : ติ๊ก/เอาออกตามลำดับบัญชีใน pool */
App.asnStep = function(d){
  const boxes = (App._asnPool||[]).map(v=>document.querySelector('.asnck[value="'+v+'"]')).filter(Boolean);
  if (d > 0){
    const nxt = boxes.find(c=>!c.checked);
    if (!nxt) return toast('บัญชีว่างถูกเลือกครบแล้ว','err');
    nxt.checked = true;
  } else {
    const on = boxes.filter(c=>c.checked);
    if (on.length) on[on.length-1].checked = false;
  }
  App.asnSync();
};
App.asnSync = function(){
  const el = $('asnCount');
  if (el) el.textContent = document.querySelectorAll('.asnck:checked').length;
};
App.asnToggleList = function(){
  const list = $('asnList'), btn = $('asnListBtn');
  if (!list) return;
  list.classList.toggle('hidden');
  if (btn) btn.textContent = list.classList.contains('hidden') ? '▾ เลือกบัญชีเอง / ดูรายการบัญชี' : '▴ ซ่อนรายการบัญชี';
};
App.confirmApprove = async function(id){
  const ids = Array.from(document.querySelectorAll('.asnck')).filter(c=>c.checked).map(c=>c.value);
  App._closeModal();
  const r = await api('updateStatus', { booking_id:id, status:'approved', actor_id:State.user.user_id, bi_accounts: ids });
  if (r.error) return toast(r.error,'err');
  invalidateData();
  toast(ids.length?('อนุมัติแล้ว · จ่ายบัญชี BI '+ids.length+' บัญชี'):'อนุมัติแล้ว','ok');
  App.go(State.view);
};
App.reject = function(id){
  if (!isAdmin()) return toast('การปฏิเสธทำได้โดยผู้ดูแลระบบเท่านั้น','err');
  confirmModal('ปฏิเสธการจอง','ต้องการปฏิเสธการจองนี้ใช่หรือไม่?','ปฏิเสธ', async ()=>{
    const r = await api('updateStatus', { booking_id:id, status:'rejected', actor_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); invalidateData(); toast('ปฏิเสธแล้ว','ok'); App.go(State.view);
  });
};
App.teacherCancel = function(id){
  confirmModal('ยกเลิกการจอง','ยืนยันยกเลิกการจองรายการนี้?','ยกเลิก', async ()=>{
    const r = await api('cancelBooking', { booking_id:id, role:State.user.role, user_id:State.user.user_id, actor_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); invalidateData(); toast('ยกเลิกแล้ว','ok'); App.go(State.view);
  });
};
App.adminDelete = function(id){
  confirmModal('ลบการจองถาวร','ลบรายการจองนี้ออกจากระบบอย่างถาวร? การกระทำนี้ย้อนกลับไม่ได้','ลบถาวร', async ()=>{
    const r = await api('deleteBooking', { booking_id:id, role:'admin', actor_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); invalidateData(); toast('ลบรายการแล้ว','ok'); App.go(State.view);
  });
};

/* ---------- อาจารย์/ผู้ดูแล: รายงาน ---------- */
Views.treport = async function(m){
  await viewSWR('v:treport', async ()=>{
    const rp = await api('getReport', {});
    return { rp, __err: !!rp.error };
  }, (d)=>Views._treportRender(m, d));
};
Views._treportRender = function(m, d){
  const rp = d.rp || {};
  const users = rp.by_user||[]; const cases = rp.by_case||[];
  const maxU = Math.max(1, ...users.map(u=>u.count));
  const maxC = Math.max(1, ...cases.map(c=>c.count));
  const pgU = paginate('rep_u', users);
  const pgC = paginate('rep_c', cases);
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>รายงานสรุปการใช้งาน</h2><span class="hint">รวม ${rp.total||0} ครั้ง</span>
        <span class="topbar-spacer"></span>
        <button class="btn btn-ghost btn-sm" onclick="App.exportReport()">${svg(I.dl)}Export CSV</button></div>
      <div class="grid cols-2">
        <div class="card">
          <h3 style="margin-bottom:14px">จัดอันดับผู้ใช้งาน</h3>
          ${users.length ? pgU.slice.map(u=>`
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:5px">
                <b>${esc(u.name)}</b><span style="color:var(--muted)">${u.count} ครั้ง</span></div>
              <div class="report-bar"><span style="width:${Math.round(u.count/maxU*100)}%"></span></div>
              <div class="help">${u.cases.map(c=>esc(c.case)+' ('+c.count+')').join(' · ')}</div>
            </div>`).join('') + pgU.html : emptyState('📊','ยังไม่มีข้อมูล','')}
        </div>
        <div class="card">
          <h3 style="margin-bottom:14px">เคส/หัวข้อที่ฝึกบ่อย</h3>
          ${cases.length ? pgC.slice.map(c=>`
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:5px">
                <b>${esc(c.case)}</b><span style="color:var(--muted)">${c.count} ครั้ง</span></div>
              <div class="report-bar"><span style="width:${Math.round(c.count/maxC*100)}%"></span></div>
            </div>`).join('') + pgC.html : emptyState('📊','ยังไม่มีข้อมูล','')}
        </div>
      </div>
    </div>`;
};

/* ---------- ผู้ดูแล: ตั้งค่า (เวลาเปิด-ปิดแบบยืดหยุ่น) ---------- */
Views.tsettings = async function(m){
  const s = State.settings;
  const allDays = [['mon','จันทร์'],['tue','อังคาร'],['wed','พุธ'],['thu','พฤหัสบดี'],['fri','ศุกร์'],['sat','เสาร์'],['sun','อาทิตย์']];
  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>ตั้งค่าระบบ</h2><span class="hint">กำหนดเครื่อง เวลาเปิด-ปิด และวันเปิดจอง</span></div>
      <div class="card" style="max-width:620px">
        <div class="field">
          <label for="setStations">จำนวนเครื่อง / license ที่มี</label>
          <input class="input" type="number" id="setStations" min="1" max="50" value="${s.total_stations}" />
          <div class="help">จำนวนนักศึกษา/กลุ่มที่ใช้งานพร้อมกันได้ในช่วงเวลาเดียวกัน</div>
        </div>
        <div class="grid cols-2">
          <div class="field">
            <label for="setOpen">เวลาเปิดให้จอง</label>
            <input class="input" type="time" id="setOpen" step="1800" value="${esc(s.open_time||'08:00')}" />
          </div>
          <div class="field">
            <label for="setClose">เวลาปิด</label>
            <input class="input" type="time" id="setClose" step="1800" value="${esc(s.close_time||'20:00')}" />
          </div>
        </div>
        <div class="field">
          <label for="setMax">ระยะเวลาสูงสุดต่อการจอง (ชั่วโมง)</label>
          <input class="input" type="number" id="setMax" min="1" max="8" value="${s.max_duration}" />
          <div class="help">ผู้จองเลือกเวลาเริ่ม–สิ้นสุดเองได้อิสระเป็นช่วงละ ${STEP_MIN} นาที ภายใต้เพดานนี้</div>
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
        <button class="btn btn-primary" onclick="App.saveSettings()">${svg(I.check)}บันทึกการตั้งค่า</button>
      </div>
    </div>`;
};
App.saveSettings = async function(){
  const days = Array.from(document.querySelectorAll('.dayck')).filter(c=>c.checked).map(c=>c.value);
  const open = $('setOpen').value, close = $('setClose').value;
  if (!days.length) return toast('เลือกวันเปิดจองอย่างน้อย 1 วัน','err');
  if (!open || !close || t2m(close)<=t2m(open)) return toast('เวลาเปิด-ปิดไม่ถูกต้อง','err');
  const btn = event.target; setLoading(btn, true);
  const r = await api('updateSettings', {
    actor_id: State.user.user_id,
    total_stations: $('setStations').value,
    max_duration: $('setMax').value,
    open_time: open, close_time: close,
    open_days: days
  });
  setLoading(btn, false, 'บันทึกการตั้งค่า');
  if (r.error) return toast(r.error,'err');
  State.settings = r.settings;
  Cache.set('v:settings', r.settings);
  invalidateData(); // เวลาเปิด-ปิด/จำนวนเครื่อง กระทบปฏิทินและความว่าง
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
  // scenarios แทบไม่เปลี่ยน → แคชได้นาน 10 นาที
  await viewSWR('v:scn', async ()=>{
    const r = Views._scnCache || await api('getScenarios');
    return { r, __err: !(r && r.scenarios) };
  }, (d)=>Views._tscenariosRender(m, d), 10*60*1000);
};
Views._tscenariosRender = function(m, d){
  const r = d.r || {};
  if (r.scenarios) Views._scnCache = r;
  const all = r.scenarios || [];
  State._scn = all;
  const lv = State._scnLv || 'all';
  const q = (State._scnQ || '').toLowerCase();
  let list = all;
  if (lv!=='all') list = list.filter(s=>s.level===lv);
  if (q) list = list.filter(s=> (s.title+' '+s.no+' '+s.room).toLowerCase().includes(q));
  const pg = paginate('scn', list);

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
          ${list.length ? pg.slice.map(scnRow).join('') : emptyState('🔍','ไม่พบเคสที่ค้นหา','ลองเปลี่ยนคำค้นหรือตัวกรอง')}
        </div>
        ${pg.html}
      </div>
    </div>`;
};
Views.scnFilter = function(v){ State._scnLv = v; State._pages.scn = 1; App.go('tscenarios'); };
Views.scnSearch = function(v){ State._scnQ = v; State._pages.scn = 1; clearTimeout(Views._scnT); Views._scnT = setTimeout(()=>App.go('tscenarios'), 250); };
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

/* ---------- บัญชีเข้าใช้ Body Interact (ทุกบทบาท)
     แยกประเภทบัญชีชัดเจน: อาจารย์ / นักศึกษา ---------- */
Views.tbi = async function(m){
  await viewSWR('v:tbi:'+State.user.user_id, async ()=>{
    const r = await api('getBIAccounts', { role:State.user.role, user_id:State.user.user_id });
    return { r, __err: !!r.error };
  }, (d)=>Views._tbiRender(m, d));
};
Views._tbiRender = function(m, d){
  const r = d.r || {};
  const list = r.accounts || [];
  const admin = isAdmin();

  // เก็บรหัสผ่าน/ชื่อบัญชีเต็มไว้ในหน่วยความจำ (ไม่ฝังใน HTML) + เปิดระบบป้องกันการคัดลอก/แคป
  State._biList = list;
  State._pwMap = {};
  State._unMap = {};
  list.forEach(a=>{
    if (a.password!==undefined){
      State._pwMap[a.account_id] = a.password;
      State._unMap[a.account_id] = a.username; // ชื่อเต็ม (เซิร์ฟเวอร์ส่งให้เฉพาะผู้มีสิทธิ์)
    }
  });
  App._secureGuards();
  const typeBadge = t => `<span class="badge ${t==='teacher'?'in':'approved'}">${t==='teacher'?'อาจารย์':'นักศึกษา'}</span>`;

  let listHtml;
  if (admin){
    // ผู้ดูแล: เห็นทุกบัญชี แยกเป็น 2 กลุ่มชัดเจน
    const tList = list.filter(a=>a.account_type==='teacher');
    const sList = list.filter(a=>a.account_type==='student');
    const pgT = paginate('bi_t', tList);
    const pgS = paginate('bi_s', sList);
    listHtml = `
      <div class="card" style="margin-bottom:16px">
        <div class="section-head"><h3>${svg(I.user)} บัญชีสำหรับอาจารย์</h3><span class="hint">${tList.length} บัญชี</span></div>
        <div class="bi-list">${tList.length ? pgT.slice.map(a=>biCard(a, admin, typeBadge)).join('') : emptyState('🔑','ยังไม่มีบัญชีอาจารย์','')}</div>
        ${pgT.html}
      </div>
      <div class="card">
        <div class="section-head"><h3>${svg(I.cap)} บัญชีสำหรับนักศึกษา</h3><span class="hint">${sList.length} บัญชี</span></div>
        <div class="bi-list">${sList.length ? pgS.slice.map(a=>biCard(a, admin, typeBadge)).join('') : emptyState('🔑','ยังไม่มีบัญชีนักศึกษา','')}</div>
        ${pgS.html}
      </div>`;
  } else {
    const pg = paginate('bi_my', list);
    listHtml = `
      <div class="card">
        <div class="section-head"><h3>${svg(I.key)} บัญชีที่ได้รับมอบหมาย</h3><span class="hint">${list.length} บัญชี</span></div>
        <div class="bi-list secure">${list.length ? pg.slice.map(a=>biCard(a, admin, typeBadge)).join('') : emptyState('🔑','ยังไม่มีบัญชีที่ได้รับมอบหมาย','จองคิวและระบุจำนวนบัญชี BI ที่ต้องการ ผู้ดูแลระบบจะจ่ายบัญชีให้เมื่ออนุมัติ')}</div>
        ${pg.html}
      </div>`;
  }

  m.innerHTML = `
    <div class="view">
      <div class="section-head"><h2>บัญชีเข้าใช้ Body Interact</h2>
        <span class="hint">${admin
          ? 'เพิ่มบัญชี · อนุมัติคำขอ · ดูรหัสผ่านได้ทุกบัญชี'
          : (State.user.role==='teacher'
              ? 'บัญชีกลุ่มอาจารย์ · เห็นรหัสผ่านหลังผู้ดูแลอนุมัติ'
              : 'บัญชีกลุ่มนักศึกษา · เห็นรหัสผ่านหลังผู้ดูแลอนุมัติ')}</span></div>

      ${admin ? `<div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:12px">เพิ่มบัญชีใหม่</h3>
        <div class="grid cols-3">
          <div class="field"><label for="biUser">Username (BI)</label><input class="input" id="biUser" placeholder="เช่น bcnb-bi-05" /></div>
          <div class="field"><label for="biPass">Password</label><input class="input" id="biPass" placeholder="รหัสผ่านของบัญชีนี้" /></div>
          <div class="field"><label for="biType">ประเภทบัญชี</label>
            <select class="input" id="biType">
              <option value="teacher">สำหรับอาจารย์</option>
              <option value="student">สำหรับนักศึกษา</option>
            </select></div>
        </div>
        <button class="btn btn-primary" onclick="Views.biAdd()">${svg(I.plus)}เพิ่มบัญชี</button>
      </div>` : `<div class="login-note" style="margin:0 0 16px">${svg(I.info)}<span>ระบุจำนวนบัญชี BI ที่ต้องการตอนจองคิว เมื่อผู้ดูแลระบบอนุมัติแล้ว บัญชีที่ได้รับจะแสดงที่นี่ — ใช้ปุ่ม “คัดลอกไปใช้” เพื่อนำไปวางในหน้า login ของ Body Interact หรือ “กดค้างเพื่อดู” หากต้องการอ่านรหัสผ่าน</span></div>`}

      ${listHtml}
    </div>`;
  if (!admin) App._wmApply(); // ประทับลายน้ำผู้ดูลงบนรายการบัญชี
};
function biCard(a, admin, typeBadge){
  const mine = a.holder_id===State.user.user_id;
  let right = '';
  if (admin){
    right = `${a.status==='pending'?`<button class="btn btn-primary btn-sm" onclick="Views.biApprove('${a.account_id}')">${svg(I.check)}อนุมัติ</button>`:''}
      ${a.status!=='available'?`<button class="btn btn-warn btn-sm" onclick="Views.biRelease('${a.account_id}')">คืนบัญชี</button>`:''}
      <button class="btn btn-danger btn-sm" onclick="Views.biDelete('${a.account_id}')">${svg(I.x)}ลบ</button>`;
  } else {
    // ผู้ใช้ทั่วไปเลือกบัญชีเองไม่ได้ — เห็นเฉพาะบัญชีที่ผู้ดูแลจ่ายให้ และคืนบัญชีของตัวเองได้
    if (a.status==='pending' && mine) right = `<span class="badge pending">รออนุมัติ</span>`;
    else if (a.status==='approved' && mine) right = `<button class="btn btn-soft btn-sm" onclick="Views.biRelease('${a.account_id}')">คืนบัญชี</button>`;
    else right = '';
  }
  let pwRow;
  if (a.password !== undefined){
    if (admin){
      // ผู้ดูแลระบบ: เห็นรหัสผ่านตรงๆ + ปุ่มคัดลอก username และรหัสผ่าน
      pwRow = `<div class="bi-pass">${svg(I.key)}<span>รหัสผ่าน:</span><code>${esc(a.password)}</code>
        <button class="btn btn-ghost btn-sm" type="button" onclick="App.copyBI('${esc(a.account_id)}')">${svg(I.doc)}คัดลอก</button></div>`;
    } else {
      // ผู้ใช้ทั่วไป: ซ่อนรหัสผ่าน ต้องกดค้างเพื่อดู + ลายน้ำชื่อผู้ดู (รหัสจริงไม่ฝังใน HTML)
      const id = esc(String(a.account_id));
      pwRow = `<div class="bi-pass secure" id="pwrow_${id}">${svg(I.key)}<span>รหัสผ่าน:</span>
        <code class="pw-mask" id="pw_${id}">••••••••</code>
        <button class="btn btn-soft btn-sm pw-eye" type="button"
          onpointerdown="App.pwShow('${id}')" onpointerup="App.pwHide('${id}')"
          onpointercancel="App.pwHide('${id}')" onpointerleave="App.pwHide('${id}')">กดค้างเพื่อดู</button>
        <button class="btn btn-primary btn-sm" type="button" id="pwcopy_${id}"
          onclick="App.pwCopy('${id}')">คัดลอกไปใช้</button>
        <span class="pw-wm">ผู้ดู: ${esc(State.user.name)}</span></div>`;
    }
  } else {
    pwRow = (a.status==='approved' && mine ? '' : `<div class="bi-pass muted">${svg(I.key)}<span>รหัสผ่านจะแสดงหลังได้รับอนุมัติ</span></div>`);
  }
  const who = a.holder_name ? `<span class="bi-holder">${a.status==='approved'?'ผู้ใช้:':'ผู้ขอ:'} ${esc(a.holder_name)}</span>` : '';
  return `<div class="bi-item">
    <div class="bi-main">
      <div class="bi-user">${svg(I.user)}<b>${esc(a.username)}</b> ${typeBadge?typeBadge(a.account_type):''} ${biStatusBadge(a.status)}</div>
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
  const account_type = $('biType') ? $('biType').value : 'teacher';
  let bad = false;
  if (!username){ fieldError('biUser','กรุณากรอก username'); bad = true; }
  if (!password){ fieldError('biPass','กรุณากรอกรหัสผ่าน'); bad = true; }
  if (bad) return;
  const r = await api('addBIAccount', { role:State.user.role, actor_id:State.user.user_id, username, password, account_type });
  if (r.error) return toast(r.error,'err'); invalidateData(); toast('เพิ่มบัญชีแล้ว','ok'); App.go('tbi');
};
Views.biRequest = async function(id){
  const r = await api('requestBIAccount', { account_id:id, user_id:State.user.user_id, name:State.user.name, role:State.user.role });
  if (r.error) return toast(r.error,'err'); invalidateData(); toast('ส่งคำขอแล้ว รอผู้ดูแลอนุมัติ','ok'); App.go('tbi');
};
Views.biApprove = async function(id){
  const r = await api('approveBIAccount', { account_id:id, role:State.user.role, actor_id:State.user.user_id });
  if (r.error) return toast(r.error,'err'); invalidateData(); toast('อนุมัติแล้ว','ok'); App.go('tbi');
};
Views.biRelease = function(id){
  confirmModal('คืนบัญชี','ปล่อยบัญชีนี้กลับเป็นสถานะว่าง?','คืนบัญชี', async ()=>{
    const r = await api('releaseBIAccount', { account_id:id, role:State.user.role, user_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); invalidateData(); toast('คืนบัญชีแล้ว','ok'); App.go('tbi');
  });
};
Views.biDelete = function(id){
  confirmModal('ลบบัญชี','ลบบัญชี BI นี้ถาวร?','ลบ', async ()=>{
    const r = await api('deleteBIAccount', { account_id:id, role:State.user.role, actor_id:State.user.user_id });
    if (r.error) return toast(r.error,'err'); invalidateData(); toast('ลบบัญชีแล้ว','ok'); App.go('tbi');
  });
};

/* =========================================================
   ความปลอดภัยรหัสผ่าน BI
   - ผู้ใช้ทั่วไป: รหัสถูกซ่อน ต้อง "กดค้าง" เพื่อดู / ห้าม copy / ห้ามคลิกขวา
     สลับหน้าต่าง, กด PrintScreen, เปิดโปรแกรมแคป → ซ่อนรหัสทันที
   - ผู้ดูแลระบบ: ใช้งานปกติ + ปุ่มคัดลอก username และรหัสผ่าน
   ========================================================= */
App.pwShow = function(id){
  const el = $('pw_'+id); if (!el) return;
  el.textContent = (State._pwMap||{})[id] || '';
  const row = $('pwrow_'+id); if (row) row.classList.add('reveal');
};
App.pwHide = function(id){
  const el = $('pw_'+id); if (!el) return;
  el.textContent = '••••••••';
  const row = $('pwrow_'+id); if (row) row.classList.remove('reveal');
};
App.pwHideAll = function(){ Object.keys(State._pwMap||{}).forEach(id=>App.pwHide(id)); };

/* "คัดลอกไปใช้" ของเจ้าของบัญชี: รหัสไม่ปรากฏบนจอเลย (กันแคป 100%)
   กดครั้งที่ 1 คัดลอก username → วางในหน้า login Body Interact
   กดครั้งที่ 2 คัดลอกรหัสผ่าน → ล้างคลิปบอร์ดอัตโนมัติใน 60 วินาที */
App._pwCopyStep = {};
App.pwCopy = async function(id){
  const pw = (State._pwMap||{})[id];
  if (pw === undefined) return toast('คุณไม่มีสิทธิ์ใช้บัญชีนี้','err');
  const un = (State._unMap||{})[id] || '';
  const btn = $('pwcopy_'+id);
  try {
    if (!App._pwCopyStep[id]){
      await navigator.clipboard.writeText(un);
      App._pwCopyStep[id] = 1;
      if (btn) btn.textContent = 'คัดลอกรหัสผ่าน';
      toast('คัดลอก username แล้ว วางในช่อง Username จากนั้นกดปุ่มเดิมอีกครั้ง','ok');
    } else {
      await navigator.clipboard.writeText(pw);
      App._pwCopyStep[id] = 0;
      if (btn) btn.textContent = 'คัดลอกไปใช้';
      toast('คัดลอกรหัสผ่านแล้ว วางในช่อง Password ได้เลย (ล้างอัตโนมัติใน 60 วินาที)','ok');
      clearTimeout(App._pwClearT);
      App._pwClearT = setTimeout(async ()=>{
        try { await navigator.clipboard.writeText(' '); } catch(e){}
      }, 60000);
    }
  } catch(e){
    toast('เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ กรุณาใช้ปุ่ม "กดค้างเพื่อดู" แทน','err');
  }
};

App.copyBI = async function(id){
  if (!isAdmin()) return toast('คัดลอกได้เฉพาะผู้ดูแลระบบเท่านั้น','err');
  const a = (State._biList||[]).find(x=>String(x.account_id)===String(id)); if (!a) return;
  try {
    await navigator.clipboard.writeText(a.username + ' : ' + (a.password||''));
    toast('คัดลอก username และรหัสผ่านแล้ว','ok');
  } catch(e){ toast('เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ','err'); }
};

App._secureGuards = function(){
  if (App._secured) return; App._secured = true;
  const inSecure = e => e.target && e.target.closest && e.target.closest('.secure');
  // ห้ามคัดลอก/ตัด/คลิกขวา ในส่วนข้อมูลบัญชี BI (เฉพาะผู้ที่ไม่ใช่ผู้ดูแล)
  document.addEventListener('copy', e=>{
    if (!isAdmin() && inSecure(e)){ e.preventDefault(); toast('คัดลอกได้เฉพาะผู้ดูแลระบบเท่านั้น','err'); }
  });
  document.addEventListener('cut', e=>{ if (!isAdmin() && inSecure(e)) e.preventDefault(); });
  document.addEventListener('contextmenu', e=>{ if (!isAdmin() && inSecure(e)) e.preventDefault(); });
  // กด PrintScreen → ซ่อนรหัส + เคลียร์คลิปบอร์ด (เท่าที่เบราว์เซอร์อนุญาต)
  document.addEventListener('keyup', e=>{
    if (!isAdmin() && e.key === 'PrintScreen'){
      App.pwHideAll();
      try { navigator.clipboard.writeText(' '); } catch(err){}
      toast('ไม่อนุญาตให้บันทึกภาพหน้าจอรหัสผ่าน','err');
    }
  });
  // สลับหน้าต่าง/แท็บ (เช่น เปิด Snipping Tool) → ซ่อนรหัส + เบลอข้อมูลบัญชี BI ทันที
  window.addEventListener('blur', ()=>{
    if (!isAdmin()){ App.pwHideAll(); document.body.classList.add('app-blurred'); }
  });
  window.addEventListener('focus', ()=>{ document.body.classList.remove('app-blurred'); });
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden && !isAdmin()){ App.pwHideAll(); document.body.classList.add('app-blurred'); }
    else if (!document.hidden) document.body.classList.remove('app-blurred');
  });
};

/* ลายน้ำระบุตัวผู้ดู พาดทั่วรายการบัญชี BI (เฉพาะผู้ที่ไม่ใช่ผู้ดูแล)
   แคปหน้าจอ/ถ่ายรูปไป ภาพจะมีชื่อ-รหัส-วันเวลาของคนดูติดไปด้วยเสมอ */
App._wmApply = function(){
  const items = document.querySelectorAll('.bi-list.secure .bi-item');
  if (!items.length) return;
  const now = new Date();
  const label = (State.user.name||'') + ' · ' + (State.user.user_id||'') + ' · '
    + now.toLocaleDateString('th-TH') + ' ' + now.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  const svgWm = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='120'>`
    + `<text x='6' y='66' font-size='13' fill='rgba(95,120,115,0.32)' font-family='sans-serif' transform='rotate(-14 160 60)'>${label}</text></svg>`;
  const url = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svgWm) + '")';
  items.forEach(el=>{ el.style.backgroundImage = url; el.style.backgroundRepeat = 'repeat'; });
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
          ${b.supervisor?`<span>อาจารย์: <b>${esc(b.supervisor)}</b></span>`:''}
          ${b.group_members?`<span>กลุ่ม: ${esc(b.group_members)}</span>`:''}
          ${b.bi_account?`<span class="${isAdmin()?'':'secure'}">บัญชี BI: <b>${esc(b.bi_account)}</b></span>`:''}
          ${b.note?`<span>หมายเหตุ: ${esc(b.note)}</span>`:''}
        </div>
      </div>
      ${statusBadge(b.status)}
    </div>
    ${actions}
  </div>`;
}

function teacherBookingCard(b){
  const admin = isAdmin();
  return `<div class="booking-card">
    <div class="bc-top">
      <div>
        <div class="bc-title">${esc(b.name)} <span style="color:var(--muted);font-weight:400;font-size:.85rem">(${esc(b.user_id)})</span></div>
        <div class="meta">
          <span><b>${fmtThaiShort(b.date)}</b> · ${esc(b.start_time)}–${esc(b.end_time)}</span>
          <span>เครื่อง <b>#${b.station_no}</b></span>
          ${b.subject_case?`<span>เคส: <b>${esc(b.subject_case)}</b></span>`:''}
          ${b.supervisor?`<span>อาจารย์: <b>${esc(b.supervisor)}</b></span>`:''}
          ${b.group_members?`<span>กลุ่ม: ${esc(b.group_members)}</span>`:''}
          ${b.bi_count?`<span>ขอบัญชี BI: <b>${esc(String(b.bi_count))}</b></span>`:''}
          ${b.bi_account?`<span class="${isAdmin()?'':'secure'}">บัญชี BI: <b>${esc(b.bi_account)}</b></span>`:''}
        </div>
      </div>
      ${statusBadge(b.status)}
    </div>
    <div class="bc-actions">
      ${admin && b.status==='pending' ? `<button class="btn btn-primary btn-sm" onclick="App.approve('${b.booking_id}')">${svg(I.check)}อนุมัติ</button>
      <button class="btn btn-danger btn-sm" onclick="App.reject('${b.booking_id}')">${svg(I.x)}ปฏิเสธ</button>` : ''}
      ${!admin && b.status==='pending' ? `<span class="help">รอผู้ดูแลระบบอนุมัติ</span>` : ''}
      ${b.status==='approved' ? `<button class="btn btn-warn btn-sm" onclick="App.teacherCancel('${b.booking_id}')">ยกเลิก</button>` : ''}
      ${admin ? `<button class="btn btn-danger btn-sm" onclick="App.adminDelete('${b.booking_id}')">${svg(I.x)}ลบถาวร</button>` : ''}
    </div>
  </div>`;
}

function rowBooking(b){
  const admin = isAdmin();
  let act = '';
  if (b.status==='pending'){
    act = admin
      ? `<button class="btn btn-primary btn-sm" onclick="App.approve('${b.booking_id}')">${svg(I.check)}</button>
         <button class="btn btn-danger btn-sm" onclick="App.reject('${b.booking_id}')">${svg(I.x)}</button>`
      : '<span style="color:var(--muted)">รอผู้ดูแล</span>';
  } else if (b.status==='approved'){
    act = `<button class="btn btn-warn btn-sm" onclick="App.teacherCancel('${b.booking_id}')">ยกเลิก</button>`;
  } else { act = '<span style="color:var(--muted)">—</span>'; }
  if (admin)
    act += ` <button class="btn btn-danger btn-sm" onclick="App.adminDelete('${b.booking_id}')" title="ลบถาวร">${svg(I.x)}</button>`;
  return `<tr>
    <td>${fmtThaiShort(b.date)}</td>
    <td>${esc(b.start_time)}–${esc(b.end_time)}</td>
    <td>${b.bi_count
      ? `<span class="badge pending">ขอ ${esc(String(b.bi_count))} เครื่อง</span>`
      : '<span style="color:var(--muted)">—</span>'}
      <div style="font-size:.75rem;color:var(--muted);margin-top:3px">เครื่องที่ #${b.station_no}</div></td>
    <td>${esc(b.name)}<div style="font-size:.78rem;color:var(--muted)">${esc(b.user_id)}</div></td>
    <td>${esc(b.subject_case||'—')}</td>
    <td>${esc(b.supervisor||'—')}</td>
    <td>${b.bi_account
      ? `<span class="${isAdmin()?'':'secure'}">${esc(b.bi_account)}</span>`
      : '<span style="color:var(--muted)">—</span>'}</td>
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
  const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}
App.exportCSV = async function(){
  const bk = await api('getBookings', {});
  const list = bk.bookings||[];
  const rows = [['วันที่','เวลาเริ่ม','เวลาจบ','เครื่อง','รหัสผู้จอง','ชื่อ','เคส','อาจารย์ผู้ควบคุม','จำนวนคน','สมาชิกกลุ่ม','บัญชี BI','สถานะ','เช็คอิน']];
  list.forEach(b=>rows.push([b.date,b.start_time,b.end_time,b.station_no,b.user_id,b.name,b.subject_case,b.supervisor||'',b.group_size||1,b.group_members,b.bi_account||'',b.status,b.checked_in]));
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
   UI: snackbar / alert dialog / inline validation / loading
   ========================================================= */

/* Snackbar: แจ้งเตือนสั้นๆ ด้านล่างจอ — ปิดเองได้ / ใส่ปุ่ม action ได้
   toast(msg, type, { action:'เลิกทำ', onAction:fn, duration:5000 }) */
function toast(msg, type, opts){
  opts = opts || {};
  const host = $('toastHost');
  const el = document.createElement('div');
  el.className = 'toast '+(type||'');
  const ic = type==='ok'?I.check : type==='err'?I.info : I.info;
  el.innerHTML = svg(ic)+'<span>'+esc(msg)+'</span>'
    + (opts.action ? `<button type="button" class="toast-act">${esc(opts.action)}</button>` : '')
    + '<button type="button" class="toast-x" aria-label="ปิด">&times;</button>';
  host.appendChild(el);
  const close = ()=>{ el.style.opacity='0'; el.style.transform='translateY(10px)'; setTimeout(()=>el.remove(),300); };
  el.querySelector('.toast-x').onclick = close;
  if (opts.action && opts.onAction){
    el.querySelector('.toast-act').onclick = ()=>{ opts.onAction(); close(); };
  }
  setTimeout(close, opts.duration || 3500);
}

/* Alert Dialog: กล่องแจ้งผลแบบเต็ม ใช้กับเรื่องสำคัญ (สำเร็จ/ผิดพลาด/คำเตือน)
   alertDialog('จองไม่สำเร็จ', 'ช่วงเวลานี้เต็มแล้ว', 'err') */
function alertDialog(title, msg, type, okLabel, onOk){
  const ico = type==='ok' ? I.check : (type==='warn' ? I.info : I.x);
  const host = $('modalHost');
  host.innerHTML = `<div class="modal-host" onclick="if(event.target===this)App._closeModal()">
    <div class="modal" style="text-align:center">
      <div class="dlg-ico ${type||'err'}">${svg(ico)}</div>
      <h3>${esc(title)}</h3>
      <p class="modal-sub" style="margin-bottom:0">${esc(msg||'')}</p>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block" id="dlgOk">${esc(okLabel||'ตกลง')}</button>
      </div>
    </div></div>`;
  $('dlgOk').onclick = ()=>{ App._closeModal(); if (onOk) onOk(); };
}

/* Inline Validation: ขีดแดงใต้ช่องกรอก + ข้อความบอกจุดผิดตรงช่องนั้น
   หายเองทันทีที่ผู้ใช้เริ่มแก้ไข */
function fieldError(id, msg){
  const el = $(id); if (!el) return;
  el.classList.add('invalid');
  const holder = el.closest('.field') || el.parentElement;
  let e = holder.querySelector('.field-error');
  if (!e){ e = document.createElement('div'); e.className = 'field-error'; holder.appendChild(e); }
  e.innerHTML = svg(I.info) + '<span>' + esc(msg) + '</span>';
  const clear = ()=>clearFieldError(id);
  el.addEventListener('input', clear, { once:true });
  el.addEventListener('change', clear, { once:true });
}
function clearFieldError(id){
  const el = $(id); if (!el) return;
  el.classList.remove('invalid');
  const holder = el.closest('.field') || el.parentElement;
  const e = holder.querySelector('.field-error'); if (e) e.remove();
}

/* Loading State: โครงร่างกะพริบ (skeleton) ระหว่างรอโหลดหน้า */
function skeletonView(){
  const card = (w1,w2,w3)=>`<div class="card" style="margin-bottom:14px">
    <div class="skeleton sk-line" style="width:${w1}"></div>
    <div class="skeleton sk-line" style="width:${w2}"></div>
    <div class="skeleton sk-line" style="width:${w3}"></div>
  </div>`;
  return `<div class="view">${card('34%','72%','55%')}${card('46%','64%','38%')}</div>`;
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

/* modal เนื้อหาอิสระ (เช่น รายละเอียดวัน / scenario / จ่ายบัญชี BI) */
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

  // นักศึกษา: user_id เป็นรหัสสาธารณะ (ไม่ใช่เลขบัตร) · cid ใช้ login เท่านั้น
  const users = [
    { user_id:'t001', name:'อ.ดร. ปวีณา ใจดี', role:'teacher', class_group:'', email:'paweena@bcnbangkok.ac.th', password:'teacher123' },
    { user_id:'t002', name:'อ. สมหญิง รักเรียน', role:'teacher', class_group:'', email:'somying@bcnbangkok.ac.th', password:'teacher123' },
    { user_id:'a001', name:'ผู้ดูแลระบบ', role:'admin', class_group:'', email:'admin@bcnbangkok.ac.th', password:'admin123' },
    { user_id:'ST-4567-a1b2c3', cid:'1100701234567', name:'กานต์ พยาบาลดี', role:'student', class_group:'พย.2/1', email:'', password:'' },
    { user_id:'ST-5678-d4e5f6', cid:'1100702345678', name:'นภา ศรีสุข', role:'student', class_group:'พย.2/1', email:'', password:'' },
    { user_id:'ST-6789-g7h8i9', cid:'1100703456789', name:'ธีรเดช มั่นคง', role:'student', class_group:'พย.2/2', email:'', password:'' },
    { user_id:'ST-7890-j1k2l3', cid:'1100704567890', name:'พิมพ์ชนก ใจงาม', role:'student', class_group:'พย.2/2', email:'', password:'' },
  ];

  let settings = {
    total_stations: 4,
    open_days: ['mon','tue','wed','thu','fri'],
    open_time: '08:00',
    close_time: '20:00',
    slot_step: STEP_MIN,
    max_duration: 2
  };

  let seq = 1;
  const mk = (uid, name, dateOff, start, end, station, cas, status, ci)=>{
    return { booking_id:'BK'+(1000+seq++), user_id:uid, name, role:'student', date:d(dateOff),
      start_time:start, end_time:end, station_no:station, subject_case:cas, supervisor:'อ.ดร. ปวีณา ใจดี',
      group_size:1, group_members:'',
      bi_account:'', status, checked_in:ci?'yes':'no', created_at:new Date().toISOString(), note:'' };
  };
  let bookings = [
    mk('ST-4567-a1b2c3','กานต์ พยาบาลดี', 0, '09:00','10:30', 1, 'ภาวะช็อก (Shock)', 'approved', true),
    mk('ST-5678-d4e5f6','นภา ศรีสุข',       0, '09:00','10:00', 2, 'ACS', 'approved', false),
    mk('ST-6789-g7h8i9','ธีรเดช มั่นคง',     0, '10:30','12:00', 1, 'Sepsis', 'pending', false),
    mk('ST-7890-j1k2l3','พิมพ์ชนก ใจงาม',   1, '13:00','14:30', 1, 'ภาวะหายใจล้มเหลว', 'pending', false),
    mk('ST-4567-a1b2c3','กานต์ พยาบาลดี', 1, '14:30','16:00', 1, 'DKA', 'approved', false),
    mk('ST-5678-d4e5f6','นภา ศรีสุข',       2, '09:00','10:00', 1, 'Stroke', 'approved', false),
    mk('ST-6789-g7h8i9','ธีรเดช มั่นคง',     -2,'10:00','11:00', 2, 'ACS', 'approved', true),
    mk('ST-7890-j1k2l3','พิมพ์ชนก ใจงาม',   -1,'11:00','12:00', 1, 'Sepsis', 'approved', true),
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

  // ===== บัญชีเข้าใช้ Body Interact (แยกประเภทอาจารย์/นักศึกษา) =====
  let biSeq = 1;
  let biAccounts = [
    { account_id:'BI1', username:'bcnb-bi-t01', password:'BodyInt@01', status:'available', holder_id:'', holder_name:'', account_type:'teacher', updated_at:new Date().toISOString() },
    { account_id:'BI2', username:'bcnb-bi-t02', password:'BodyInt@02', status:'approved', holder_id:'t001', holder_name:'อ.ดร. ปวีณา ใจดี', account_type:'teacher', updated_at:new Date().toISOString() },
    { account_id:'BI3', username:'bcnb-bi-s01', password:'BodyInt@03', status:'available', holder_id:'', holder_name:'', account_type:'student', updated_at:new Date().toISOString() },
    { account_id:'BI4', username:'bcnb-bi-s02', password:'BodyInt@04', status:'pending', holder_id:'ST-5678-d4e5f6', holder_name:'นภา ศรีสุข', account_type:'student', updated_at:new Date().toISOString() },
    { account_id:'BI5', username:'bcnb-bi-s03', password:'BodyInt@05', status:'available', holder_id:'', holder_name:'', account_type:'student', updated_at:new Date().toISOString() },
  ];

  function activeOf(date){
    return bookings.filter(b=>b.date===date && (b.status==='pending'||b.status==='approved'));
  }
  function steps(date){
    const day = activeOf(date);
    const out = [];
    for (let m=t2m(settings.open_time); m<t2m(settings.close_time); m+=STEP_MIN){
      const used = day.filter(b=>overlaps(m, m+STEP_MIN, t2m(b.start_time), t2m(b.end_time))).length;
      out.push({ time:m2t(m), used, free:Math.max(0, settings.total_stations-used) });
    }
    return out;
  }

  function handle(action, p){
    return new Promise(resolve=>{
      setTimeout(()=>resolve(run(action, p)), 260); // จำลอง latency
    });
  }

  function strip(u){ const c = Object.assign({}, u); delete c.password; delete c.cid; return c; }

  function run(action, p){
    switch(action){
      case 'ping': return { ok:true };
      case 'login': {
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
          const s = users.find(u=>u.cid===cid && u.role==='student');
          if (!s) return { error:'ไม่พบเลขบัตรประชาชนนี้ในระบบ กรุณาติดต่ออาจารย์' };
          return { user: strip(s) };
        }
      }
      case 'getSettings': return { settings: JSON.parse(JSON.stringify(settings)) };
      case 'updateSettings': {
        if (p.total_stations!==undefined) settings.total_stations = parseInt(p.total_stations,10)||1;
        if (p.max_duration!==undefined) settings.max_duration = parseInt(p.max_duration,10)||1;
        if (p.open_days!==undefined) settings.open_days = p.open_days;
        if (p.open_time!==undefined) settings.open_time = p.open_time;
        if (p.close_time!==undefined) settings.close_time = p.close_time;
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
        return { date:p.date, total_stations:settings.total_stations,
          open_time:settings.open_time, close_time:settings.close_time,
          slot_step:STEP_MIN, max_duration:settings.max_duration,
          steps: steps(p.date),
          bookings: activeOf(p.date).map(b=>({start_time:b.start_time,end_time:b.end_time,status:b.status,subject_case:b.subject_case,name:b.name})) };
      }
      case 'createBooking': {
        const date = p.date, start = p.start_time, end = p.end_time;
        if (!date || !start || !end) return { error:'กรุณาเลือกวันและช่วงเวลา' };
        const sM = t2m(start), eM = t2m(end);
        if (eM<=sM) return { error:'เวลาสิ้นสุดต้องหลังเวลาเริ่ม' };
        if (sM%STEP_MIN!==0 || eM%STEP_MIN!==0) return { error:'เวลาต้องลงตัวเป็นช่วงละ '+STEP_MIN+' นาที' };
        if (sM<t2m(settings.open_time) || eM>t2m(settings.close_time)) return { error:'จองได้ระหว่าง '+settings.open_time+' – '+settings.close_time+' เท่านั้น' };
        if (eM-sM > settings.max_duration*60) return { error:'จองได้ไม่เกิน '+settings.max_duration+' ชั่วโมงต่อครั้ง' };
        const day = activeOf(date);
        const dup = day.find(b=>b.user_id===String(p.user_id)&&overlaps(sM,eM,t2m(b.start_time),t2m(b.end_time)));
        if (dup) return { error:'คุณมีการจองที่คาบเกี่ยวช่วงเวลานี้อยู่แล้ว' };
        const ov = day.filter(b=>overlaps(sM,eM,t2m(b.start_time),t2m(b.end_time)));
        if (ov.length>=settings.total_stations) return { error:'ช่วงเวลานี้เต็มแล้ว กรุณาเลือกช่วงอื่น' };
        const usedNos = ov.map(b=>b.station_no);
        let station=1; while(usedNos.indexOf(station)!==-1) station++;
        const rec = { booking_id:'BK'+(1000+seq++), user_id:String(p.user_id), name:p.name, role:p.role||'student',
          date, start_time:start, end_time:end, station_no:station, subject_case:p.subject_case||'',
          supervisor:p.supervisor||'',
          group_size:parseInt(p.group_size,10)||1, group_members:p.group_members||'', bi_account:'',
          status:'pending', checked_in:'no', created_at:new Date().toISOString(), note:String(p.note||'') };
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
        const actor = users.find(u=>u.user_id===String(p.actor_id));
        if (!actor || actor.role!=='admin') return { error:'ต้องเป็นผู้ดูแลระบบเท่านั้น' };
        const b = bookings.find(x=>x.booking_id===p.booking_id);
        if (!b) return { error:'ไม่พบการจองนี้' };
        b.status = p.status; if (p.note!==undefined) b.note=p.note;
        if (p.status==='approved' && p.bi_accounts && p.bi_accounts.length){
          const names=[];
          p.bi_accounts.forEach(id=>{
            const a = biAccounts.find(x=>x.account_id===id);
            if (a && a.status!=='approved'){
              a.status='approved'; a.holder_id=b.user_id; a.holder_name=b.name; a.updated_at=new Date().toISOString();
              names.push(a.username);
            }
          });
          if (names.length) b.bi_account = names.join(', ');
        }
        return { ok:true };
      }
      case 'checkIn': {
        const b = bookings.find(x=>x.booking_id===p.booking_id);
        if (!b) return { error:'ไม่พบการจองนี้' };
        if (b.status!=='approved') return { error:'เช็คอินได้เฉพาะการจองที่อนุมัติแล้ว' };
        b.checked_in='yes'; return { ok:true };
      }
      case 'getUsers': return { users: users.map(strip) };
      case 'getScenarios': return { scenarios: JSON.parse(JSON.stringify(scenarios)) };
      case 'getBIAccounts': {
        const role = p.role; const uid = String(p.user_id||'');
        let list = biAccounts.map(a=>{
          const o = { account_id:a.account_id, username:a.username, status:a.status, holder_id:a.holder_id, holder_name:a.holder_name, account_type:a.account_type||'teacher' };
          if (role==='admin' || (a.status==='approved' && a.holder_id===uid)) o.password = a.password;
          return o;
        });
        if (role==='teacher') list = list.filter(a=>a.account_type==='teacher');
        if (role==='student') list = list.filter(a=>a.account_type==='student');
        return { accounts: list };
      }
      case 'addBIAccount': {
        if (p.role!=='admin') return { error:'เฉพาะผู้ดูแลระบบเท่านั้น' };
        const u = String(p.username||'').trim(); const pw = String(p.password||'').trim();
        const type = p.account_type==='student'?'student':'teacher';
        if (!u || !pw) return { error:'กรุณากรอก username และ password' };
        biAccounts.push({ account_id:'BI'+(100+biSeq++), username:u, password:pw, status:'available', holder_id:'', holder_name:'', account_type:type, updated_at:new Date().toISOString() });
        return { ok:true };
      }
      case 'requestBIAccount': {
        const a = biAccounts.find(x=>x.account_id===p.account_id);
        if (!a) return { error:'ไม่พบบัญชีนี้' };
        if (a.status!=='available') return { error:'บัญชีนี้ถูกใช้งานอยู่' };
        const role = String(p.role||'').toLowerCase();
        if (role!=='admin' && (a.account_type||'teacher')!==role)
          return { error:'บัญชีนี้เป็นของกลุ่ม'+((a.account_type==='teacher')?'อาจารย์':'นักศึกษา')+'เท่านั้น' };
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
        const st = steps(today);
        return { today, bookings_today:todays.length,
          pending: bookings.filter(b=>b.status==='pending').length,
          free_slots_today: st.reduce((n,s)=>n+s.free,0),
          free_bi_today: biAccounts.filter(a=>a.status==='available').length,
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
