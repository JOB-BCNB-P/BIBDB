# BIBDB
# ระบบจอง Body Interact — วิทยาลัยพยาบาลบรมราชชนนี กรุงเทพ

ระบบกำกับติดตามการจองเข้าใช้งานโปรแกรม Body Interact (Virtual Patient Simulation)
ที่มีจำนวน license/เครื่องจำกัด · Frontend (GitHub Pages) + Google Apps Script + Google Sheets

---

## 📁 ไฟล์ในชุดนี้

| ไฟล์ | หน้าที่ |
|------|---------|
| `index.html` | โครงหน้าเว็บ (Single Page App) |
| `style.css` | ดีไซน์พาสเทล + responsive |
| `app.js` | ตรรกะทั้งหมด + โหมดทดลอง (mock) |
| `Code.gs` | Google Apps Script — เป็น API กลางอ่าน/เขียน Sheets |
| `preview.html` | ไฟล์รวมไฟล์เดียว เปิดดูดีไซน์ได้ทันที (ไม่ต้องตั้งค่าอะไร) |
| `README.md` | คู่มือนี้ |

> **อยากดูหน้าตาก่อน?** เปิด `preview.html` ด้วยเบราว์เซอร์ได้เลย ระบบจะรันในโหมดทดลองด้วยข้อมูลตัวอย่าง
> ลองล็อกอินด้วยบัญชีตัวอย่าง (ดูหัวข้อ “ข้อมูลตัวอย่าง” ด้านล่าง)

---

## 🗂️ ขั้นที่ 1 — สร้าง Google Sheets

สร้าง Google Sheet ใหม่ 1 ไฟล์ ตั้งชื่อเช่น **"BodyInteract-Booking-DB"** แล้วสร้าง **4 ชีต**
ชื่อชีต **ต้องสะกดตรงนี้เป๊ะ** (ตัวพิมพ์ใหญ่-เล็กตรงกัน) และ **แถวแรกของแต่ละชีตคือ header**

### ชีต `Users`
| user_id | name | role | class_group | email | password |
|---------|------|------|-------------|-------|----------|

- `role` ใส่ได้ 3 ค่า: `student` / `teacher` / `admin`
- **นักศึกษา** — `user_id` ใส่ **เลขบัตรประชาชน 13 หลัก** ใช้เข้าระบบ (ไม่ต้องมี password)
- **อาจารย์** — ต้องมี `email` (ห้ามซ้ำ) **และ** `password` เข้าระบบด้วยอีเมล+รหัสผ่าน
- **ผู้ดูแลระบบ (admin)** — ต้องมี `password` เข้าระบบด้วยรหัสผ่านอย่างเดียว แก้ไขได้ทุกอย่าง
- 💡 เลือกทั้งคอลัมน์ `user_id` แล้วตั้ง Format ▸ Number ▸ Plain text กันเลขบัตร 13 หลักถูกตัดเป็นตัวเลขวิทยาศาสตร์

### ชีต `Bookings`
| booking_id | user_id | name | role | date | start_time | end_time | station_no | subject_case | group_size | group_members | status | checked_in | created_at | note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- ใส่แค่แถว header พอ ระบบจะเพิ่มข้อมูลให้เอง
- `group_size` = จำนวนผู้เข้าฝึกในคิวนั้น (ตัวเลข)
- `status`: `pending` / `approved` / `rejected` / `cancelled` · `checked_in`: `yes` / `no`
- 💡 เลือกทั้งคอลัมน์ `date` แล้วตั้ง Format ▸ Number ▸ Plain text กันวันที่เพี้ยน

### ชีต `Settings` (มี header + 1 แถวข้อมูล)
| total_stations | open_days | time_slots | max_duration |
|---|---|---|---|
| 4 | mon,tue,wed,thu,fri | 09:00-10:00,10:00-11:00,11:00-12:00,13:00-14:00,14:00-15:00,15:00-16:00 | 2 |

- `open_days` ใช้ตัวย่ออังกฤษ คั่นด้วยจุลภาค: `mon,tue,wed,thu,fri,sat,sun`
- `time_slots` รูปแบบ `HH:MM-HH:MM` คั่นด้วยจุลภาค

### ชีต `Logs`
| timestamp | user_id | action |
|---|---|---|

- ใส่แค่ header — ระบบบันทึก audit log ให้เอง

---

## ⚙️ ขั้นที่ 2 — Deploy Google Apps Script

1. ในไฟล์ Google Sheet เดิม ไปที่เมนู **ส่วนขยาย (Extensions) ▸ Apps Script**
2. ลบโค้ดเดิมในไฟล์ `Code.gs` ทิ้ง แล้ววางเนื้อหาจากไฟล์ `Code.gs` ในชุดนี้ลงไปทั้งหมด
3. กด 💾 บันทึก
4. (ถ้า Apps Script ผูกกับ Sheet โดยตรงตามขั้นข้างบน ไม่ต้องแก้ `SPREADSHEET_ID` — ปล่อยว่างไว้
   แต่ถ้าสร้าง Apps Script แยกไฟล์ ให้ใส่ Spreadsheet ID ลงในตัวแปร `SPREADSHEET_ID` ด้านบนสุดของโค้ด)
5. กด **Deploy ▸ New deployment**
   - ไอคอนเฟือง ⚙️ ▸ เลือก **Web app**
   - **Description:** เช่น `booking api v1`
   - **Execute as:** `Me (อีเมลของคุณ)`
   - **Who has access:** `Anyone`  ← สำคัญมาก ต้องเลือกอันนี้
6. กด **Deploy** → ครั้งแรกจะให้ **Authorize access** → เลือกบัญชี → "Advanced" → "Go to ... (unsafe)" → Allow
   (ที่ขึ้น unsafe เป็นปกติ เพราะเป็นสคริปต์ที่คุณเขียนเอง)
7. คัดลอก **Web app URL** ที่ได้ (ลงท้ายด้วย `/exec`) เก็บไว้

**ทดสอบเร็ว ๆ:** เปิด `Web app URL?action=ping` ในเบราว์เซอร์ ควรเห็น `{"ok":true,...}`

> ⚠️ ทุกครั้งที่แก้ `Code.gs` ต้อง **Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy**
> ไม่งั้นเว็บจะยังเรียกโค้ดเวอร์ชันเก่า

---

## 🔗 ขั้นที่ 3 — ใส่ URL ใน Frontend

เปิดไฟล์ `app.js` แก้บรรทัดบนสุด นำ Web app URL มาวาง:

```js
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec'
};
```

เมื่อใส่ URL จริงแล้ว โหมดทดลอง (mock) จะปิดอัตโนมัติ และระบบจะอ่าน/เขียน Google Sheets จริง

---

## 🚀 ขั้นที่ 4 — Deploy ขึ้น GitHub Pages

1. สร้าง repository ใหม่บน GitHub เช่น `bodyinteract-booking` (ตั้งเป็น Public)
2. อัปโหลด `index.html`, `style.css`, `app.js` เข้า repo (ผ่านเว็บ GitHub หรือ git)

   ผ่าน git:
   ```bash
   git init
   git add index.html style.css app.js
   git commit -m "ระบบจอง Body Interact"
   git branch -M main
   git remote add origin https://github.com/<username>/bodyinteract-booking.git
   git push -u origin main
   ```
3. ไปที่ **Settings ▸ Pages**
   - **Source:** Deploy from a branch
   - **Branch:** `main` · **Folder:** `/ (root)` → Save
4. รอ ~1 นาที จะได้ลิงก์ `https://<username>.github.io/bodyinteract-booking/`
5. เปิดลิงก์นั้น — ระบบพร้อมใช้งาน 🎉

> ไฟล์ `index.html` ต้องอยู่ที่ root ของ repo และต้องอยู่โฟลเดอร์เดียวกับ `style.css`, `app.js`

---

## 👥 ข้อมูลตัวอย่าง (สำหรับทดสอบ)

เติมลงชีต `Users` เพื่อทดลอง (หรือใช้ล็อกอินในโหมด preview ได้เลย):

**ผู้ดูแลระบบ** (เข้าด้วยรหัสผ่าน · แก้ไขได้ทุกอย่าง):
| user_id | name | role | class_group | email | password |
|---|---|---|---|---|---|
| a001 | ผู้ดูแลระบบ | admin |  | admin@bcnbangkok.ac.th | `admin123` |

**อาจารย์** (เข้าด้วยอีเมล + รหัสผ่าน):
| user_id | name | role | class_group | email | password |
|---|---|---|---|---|---|
| t001 | อ.ดร. ปวีณา ใจดี | teacher |  | paweena@bcnbangkok.ac.th | `teacher123` |
| t002 | อ. สมหญิง รักเรียน | teacher |  | somying@bcnbangkok.ac.th | `teacher123` |

**นักศึกษา** (เข้าด้วยเลขบัตรประชาชน 13 หลัก):
| user_id | name | role | class_group | email | password |
|---|---|---|---|---|---|
| 1100701234567 | กานต์ พยาบาลดี | student | พย.2/1 |  |  |
| 1100702345678 | นภา ศรีสุข | student | พย.2/1 |  |  |
| 1100703456789 | ธีรเดช มั่นคง | student | พย.2/2 |  |  |
| 1100704567890 | พิมพ์ชนก ใจงาม | student | พย.2/2 |  |  |

> ⚠️ เลขบัตรประชาชนด้านบนเป็นตัวอย่างสำหรับทดสอบเท่านั้น และควรเปลี่ยนรหัสผ่านตัวอย่างก่อนใช้งานจริง

---

## 🔐 สิทธิ์การใช้งานแต่ละบทบาท

| ความสามารถ | นักศึกษา | อาจารย์ | ผู้ดูแลระบบ |
|---|:---:|:---:|:---:|
| เข้าระบบด้วย | เลขบัตร 13 หลัก | อีเมล + รหัสผ่าน | รหัสผ่าน |
| Dashboard สรุปตัวเลข | ✅ (ของตัวเอง) | ✅ (ทั้งระบบ) | ✅ (ทั้งระบบ) |
| จองคิว (เลือกวัน-รอบ-จำนวนคน) | ✅ | – | – |
| ดูการจองทั้งหมด (ปฏิทิน+ตาราง) | ดูปฏิทินรวม | ✅ | ✅ |
| ดูประวัติ / ยกเลิกของตัวเอง | ✅ | – | – |
| อนุมัติ / ปฏิเสธ / เช็คอิน | – | ✅ | ✅ |
| ยกเลิกการจองของผู้อื่น | – | ✅ | ✅ |
| ลบการจองถาวร | – | – | ✅ |
| รายงานสรุป + Export CSV | – | ✅ | ✅ |
| ตั้งค่าระบบ (จำนวนเครื่อง/วัน/รอบเวลา) | – | – | ✅ |

> ระบบเช็คที่ว่างของแต่ละรอบให้อัตโนมัติก่อนยืนยันการจองทุกครั้ง และใช้ `LockService` กันการจองชนกัน

---

เรียกด้วย POST (body เป็น JSON, `Content-Type: text/plain`) ทุก action มีฟิลด์ `action`

| action | ใคร | พารามิเตอร์หลัก | คืนค่า |
|--------|-----|----------------|--------|
| `login` | ทุกคน | role + (`national_id` / `email`+`password` / `password`) | `{user}` / `{error}` |
| `getSettings` | ทุกคน | – | `{settings}` |
| `getBookings` | ทุกคน | user_id, status, date, from, to (เลือกใส่) | `{bookings:[]}` |
| `getAvailability` | ทุกคน | date | `{slots:[]}` |
| `createBooking` | นักศึกษา | user_id, name, date, slot, subject_case, group_size, group_members | `{booking}` |
| `cancelBooking` | เจ้าของ/อาจารย์/ผู้ดูแล | booking_id, user_id, role | `{ok}` |
| `deleteBooking` | ผู้ดูแลเท่านั้น | booking_id, actor_id | `{ok}` |
| `updateStatus` | อาจารย์/ผู้ดูแล | booking_id, status, actor_id | `{ok}` |
| `checkIn` | เจ้าของ/อาจารย์/ผู้ดูแล | booking_id, user_id, role | `{ok}` |
| `updateSettings` | ผู้ดูแลเท่านั้น | actor_id, total_stations, open_days, time_slots, max_duration | `{settings}` |
| `getStats` | อาจารย์/ผู้ดูแล | – | ตัวเลขสรุป |
| `getReport` | อาจารย์/ผู้ดูแล | from, to (เลือกใส่) | `{by_user, by_case}` |
| `getUsers` | อาจารย์/ผู้ดูแล | – | `{users:[]}` |

**กลไกสำคัญ**
- ใช้ `LockService` ตอน `createBooking` เพื่อกันการจองชนกัน (race condition)
- ก่อนยืนยันจะนับเครื่องที่ถูกใช้ในรอบนั้น (เฉพาะ pending+approved) ถ้าเต็มจะปฏิเสธ
- ระบบเลือกหมายเลขเครื่องว่างให้อัตโนมัติ (เครื่อง #1..#N)
- กันผู้ใช้คนเดิมจองซ้ำในรอบเวลาเดียวกัน

---

## 🛠️ แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|-------|------------------|
| เว็บขึ้น "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" | URL ผิด / ยังไม่ได้ตั้ง Who has access = Anyone / ลืม Deploy เวอร์ชันใหม่ |
| ล็อกอินอาจารย์ไม่ผ่าน | อีเมล/รหัสผ่านในชีต `Users` ไม่ตรง หรือ `role` ไม่ใช่ `teacher` |
| ล็อกอินนักศึกษาไม่ผ่าน | เลขบัตรประชาชนต้องครบ 13 หลักและตรงกับ `user_id` ในชีต `Users` (role=`student`) |
| ล็อกอินผู้ดูแลไม่ผ่าน | ต้องมีแถว role=`admin` ในชีต `Users` ที่ `password` ตรงกับที่กรอก |
| เลขบัตร 13 หลักกลายเป็นตัวเลขแปลก ๆ | ตั้ง format คอลัมน์ `user_id` เป็น Plain text |
| แก้โค้ดแล้วไม่อัปเดต | ต้อง Manage deployments ▸ New version ทุกครั้ง |
| วันที่เพี้ยน | ตั้ง format คอลัมน์ `date` เป็น Plain text |
| ภาษาไทยใน CSV เพี้ยนใน Excel | ไฟล์มี BOM อยู่แล้ว ลองเปิดด้วย "Import ▸ UTF-8" |

---

## 🎨 หมายเหตุการออกแบบ
- โทนพาสเทล มิ้นต์–ฟ้า–ชมพู สื่อความอบอุ่นแบบงานพยาบาล
- ฟอนต์ **Prompt** (หัวข้อ) + **IBM Plex Sans Thai** (เนื้อหา) โหลดจาก Google Fonts
- ภาษาไทยทั้งระบบ · มี loading/empty state · responsive มือถือ–คอมพิวเตอร์
- รองรับ `prefers-reduced-motion` และ keyboard focus เพื่อการเข้าถึง
