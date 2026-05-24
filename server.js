const express = require('express');
const { WebSocketServer } = require('ws');
const Database = require('better-sqlite3');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const db = new Database('recovery_v2.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    reg_no TEXT UNIQUE NOT NULL,
    surgery TEXT NOT NULL,
    ward TEXT NOT NULL,
    room TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    reg_no TEXT NOT NULL,
    surgery TEXT NOT NULL,
    ward TEXT NOT NULL,
    room TEXT NOT NULL,
    admit_time TEXT NOT NULL,
    status TEXT DEFAULT 'recovering',
    fentanyl_time TEXT,
    pethidine_time TEXT,
    ondansetron_time TEXT,
    mekool_time TEXT,
    special TEXT,
    discharge_time TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function calcEstimatedDischarge(p) {
  if (p.special === 'icu' || p.special === 'unstable') return null;
  const admit = new Date(p.admit_time);
  let earliest = new Date(admit.getTime() + 40 * 60000);
  const check = (timeStr, addMin) => {
    if (!timeStr) return;
    const t = new Date(timeStr);
    const ready = new Date(t.getTime() + addMin * 60000);
    if (ready > earliest) earliest = ready;
  };
  check(p.fentanyl_time, 15);
  check(p.pethidine_time, 15);
  check(p.ondansetron_time, 10);
  check(p.mekool_time, 10);
  return earliest.toISOString();
}

function withEst(p) {
  return { ...p, estimated_discharge: calcEstimatedDischarge(p) };
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

function activePatients() {
  return db.prepare(`SELECT * FROM patients WHERE status != 'discharged' ORDER BY ward, room, admit_time DESC`).all();
}

// ── Scheduled patients ──
app.get('/api/scheduled', (req, res) => {
  res.json(db.prepare(`SELECT * FROM scheduled_patients ORDER BY name`).all());
});

app.post('/api/scheduled', (req, res) => {
  const { name, reg_no, surgery, ward, room } = req.body;
  if (!name || !reg_no || !surgery || !ward || !room)
    return res.status(400).json({ error: '필수 항목 누락' });
  try {
    const r = db.prepare(
      `INSERT OR REPLACE INTO scheduled_patients (name, reg_no, surgery, ward, room) VALUES (?, ?, ?, ?, ?)`
    ).run(name, reg_no, surgery, ward, room);
    res.json(db.prepare(`SELECT * FROM scheduled_patients WHERE id = ?`).get(r.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/scheduled/:id', (req, res) => {
  db.prepare(`DELETE FROM scheduled_patients WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/lookup', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json(null);
  const p = db.prepare(`SELECT * FROM scheduled_patients WHERE reg_no = ? OR name LIKE ?`).get(q, `%${q}%`);
  res.json(p || null);
});

// ── Recovery patients ──
app.get('/api/patients', (req, res) => {
  res.json(activePatients().map(withEst));
});

app.post('/api/patients', (req, res) => {
  const { name, reg_no, surgery, ward, room, admit_time } = req.body;
  if (!name || !reg_no || !surgery || !ward || !room || !admit_time)
    return res.status(400).json({ error: '필수 항목 누락' });
  const r = db.prepare(
    `INSERT INTO patients (name, reg_no, surgery, ward, room, admit_time) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(name, reg_no, surgery, ward, room, admit_time);
  const p = withEst(db.prepare(`SELECT * FROM patients WHERE id = ?`).get(r.lastInsertRowid));
  broadcast({ type: 'patient_added', patient: p });
  res.json(p);
});

app.patch('/api/patients/:id', (req, res) => {
  const allowed = ['fentanyl_time','pethidine_time','ondansetron_time','mekool_time','special','status'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: '없음' });
  const set = fields.map(f => `${f} = ?`).join(', ');
  db.prepare(`UPDATE patients SET ${set} WHERE id = ?`).run(...fields.map(f => req.body[f]), req.params.id);
  const p = withEst(db.prepare(`SELECT * FROM patients WHERE id = ?`).get(req.params.id));
  broadcast({ type: 'patient_updated', patient: p });
  res.json(p);
});

app.delete('/api/patients/:id', (req, res) => {
  db.prepare(`UPDATE patients SET status='discharged', discharge_time=datetime('now','localtime') WHERE id=?`).run(req.params.id);
  broadcast({ type: 'patient_discharged', id: Number(req.params.id) });
  res.json({ ok: true });
});

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'init', patients: activePatients().map(withEst) }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ 서버 실행 중`);
  console.log(`   회복실 화면: http://localhost:${PORT}/`);
  console.log(`   병동 화면:   http://localhost:${PORT}/ward.html\n`);
});
