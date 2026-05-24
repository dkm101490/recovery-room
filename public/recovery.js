let patients = [];
let scheduledList = [];
let currentTab = 'recovery';

const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${wsProto}//${location.host}`);

// 입실시간 = 현재 시간으로 자동 유지 (매 분 갱신)
function refreshAdmitTime() {
  document.getElementById('f-time').value = nowLocal();
}
refreshAdmitTime();
setInterval(refreshAdmitTime, 60000);

ws.onmessage = e => {
  const msg = JSON.parse(e.data);
  if      (msg.type === 'init')              { patients = msg.patients; renderPatients(); }
  else if (msg.type === 'patient_added')     { patients.unshift(msg.patient); renderPatients(); }
  else if (msg.type === 'patient_updated')   {
    const i = patients.findIndex(p => p.id === msg.patient.id);
    if (i !== -1) patients[i] = msg.patient;
    renderPatients();
  }
  else if (msg.type === 'patient_discharged') {
    patients = patients.filter(p => p.id !== msg.id);
    renderPatients();
  }
};

setInterval(renderPatients, 30000);

// ── 탭 전환 ──
function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-recovery').classList.toggle('hidden', tab !== 'recovery');
  document.getElementById('tab-schedule').classList.toggle('hidden', tab !== 'schedule');
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'recovery') || (i === 1 && tab === 'schedule'));
  });
  if (tab === 'schedule') loadScheduled();
}

// ── 등록번호로 환자 자동조회 ──
async function lookupPatient() {
  const reg = document.getElementById('f-reg').value.trim();
  if (!reg) return;
  const res = await fetch(`/api/lookup?q=${encodeURIComponent(reg)}`);
  const p = await res.json();
  const msg = document.getElementById('lookup-msg');
  if (p) {
    document.getElementById('f-name').value    = p.name;
    document.getElementById('f-surgery').value = p.surgery;
    document.getElementById('f-ward').value    = p.ward;
    document.getElementById('f-room').value    = p.room;
    msg.textContent = `✓ ${p.name} 환자 정보 자동 입력됨`;
    msg.className = 'lookup-msg success';
  } else {
    msg.textContent = '등록된 환자 정보 없음 — 직접 입력해주세요';
    msg.className = 'lookup-msg warn';
  }
  setTimeout(() => { msg.textContent = ''; msg.className = 'lookup-msg'; }, 3000);
}

// ── 입실 등록 ──
async function admitPatient() {
  const name     = document.getElementById('f-name').value.trim();
  const reg_no   = document.getElementById('f-reg').value.trim();
  const surgery  = document.getElementById('f-surgery').value.trim();
  const ward     = document.getElementById('f-ward').value;
  const room     = document.getElementById('f-room').value.trim();
  const admit_time = document.getElementById('f-time').value || nowLocal();

  if (!name || !reg_no || !surgery || !ward || !room) {
    alert('모든 항목을 입력해주세요.'); return;
  }
  const res = await fetch('/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, reg_no, surgery, ward, room, admit_time })
  });
  if (res.ok) {
    ['f-name','f-reg','f-surgery','f-room'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-ward').value = '';
    document.getElementById('f-time').value = nowLocal();
    document.getElementById('f-reg').focus();
  }
}

// ── 약물 투여 (재투여 가능 — 초 단위까지 기록해서 재투여 시 시간 변화 보임) ──
async function recordDrug(id, field) {
  await patch(id, { [field]: nowWithSec() });
}

async function setSpecial(id, val) {
  await patch(id, { special: val });
}

async function patch(id, body) {
  await fetch(`/api/patients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function discharge(id, name) {
  if (!confirm(`${name} 환자를 퇴실 처리하시겠습니까?`)) return;
  await fetch(`/api/patients/${id}`, { method: 'DELETE' });
}

// ── 환자 목록 렌더 (병동별 그룹) ──
function renderPatients() {
  document.getElementById('count').textContent = patients.length;
  const grid = document.getElementById('patients-grid');

  if (!patients.length) {
    grid.innerHTML = '<div class="empty-msg">현재 입실 환자 없음</div>';
    return;
  }

  // 병동별 그룹
  const byWard = {};
  patients.forEach(p => {
    if (!byWard[p.ward]) byWard[p.ward] = [];
    byWard[p.ward].push(p);
  });

  grid.innerHTML = Object.entries(byWard).map(([ward, list]) => `
    <div class="ward-group">
      <div class="ward-group-label">${ward}</div>
      <div class="ward-group-cards">
        ${list.map(p => renderCard(p)).join('')}
      </div>
    </div>
  `).join('');
}

function renderCard(p) {
  const st = calcStatus(p);
  const elapsed = getElapsedMin(p.admit_time);

  let estLabel = '';
  if      (p.special === 'icu')      estLabel = '중환자실 입실 예정';
  else if (p.special === 'unstable') estLabel = '바이탈 불안정 — 안정화 대기 중';
  else if (p.estimated_discharge) {
    const diffMin = Math.round((new Date(p.estimated_discharge) - new Date()) / 60000);
    if (diffMin <= 0) estLabel = '퇴실 준비 완료';
    else estLabel = `예상 퇴실 ${fmtTime(p.estimated_discharge)} (약 ${diffMin}분)`;
  }

  const drugTime = field => p[field] ? `<span class="drug-tag">${drugLabel(field)} ${fmtTime(p[field], true)}</span>` : '';

  return `
  <div class="r-card status-${st.color}">
    <div class="r-top">
      <div class="r-identity">
        <span class="r-name">${p.name}</span>
        <span class="r-reg">${p.reg_no}</span>
        <span class="r-room-badge">${p.room}호</span>
      </div>
      <div class="r-surgery">${p.surgery}</div>
      <div class="r-meta">입실 ${fmtTime(p.admit_time)} · ${elapsed}분 경과</div>
      <div class="r-est ${st.color}">${estLabel}</div>
    </div>

    <div class="r-drug-tags">
      ${drugTime('fentanyl_time')}${drugTime('pethidine_time')}
      ${drugTime('ondansetron_time')}${drugTime('mekool_time')}
    </div>

    <div class="r-actions">
      <div class="r-btn-row">
        <button class="r-btn drug ${p.fentanyl_time?'given':''}"
          onclick="recordDrug(${p.id},'fentanyl_time')">
          구연산펜타닐 50mcg${p.fentanyl_time ? ` ✓ ${fmtTime(p.fentanyl_time, true)}` : ''}
        </button>
        <button class="r-btn drug ${p.pethidine_time?'given':''}"
          onclick="recordDrug(${p.id},'pethidine_time')">
          제일페티딘염산염 25mg${p.pethidine_time ? ` ✓ ${fmtTime(p.pethidine_time, true)}` : ''}
        </button>
      </div>
      <div class="r-btn-row">
        <button class="r-btn antiemetic ${p.ondansetron_time?'given':''}"
          onclick="recordDrug(${p.id},'ondansetron_time')">
          온세란주 4mg${p.ondansetron_time ? ` ✓ ${fmtTime(p.ondansetron_time, true)}` : ''}
        </button>
        <button class="r-btn antiemetic ${p.mekool_time?'given':''}"
          onclick="recordDrug(${p.id},'mekool_time')">
          멕쿨주 10mg${p.mekool_time ? ` ✓ ${fmtTime(p.mekool_time, true)}` : ''}
        </button>
      </div>
      <div class="r-btn-row">
        <button class="r-btn special warn ${p.special==='unstable'?'active':''}"
          onclick="setSpecial(${p.id}, '${p.special==='unstable'?'':'unstable'}')">
          ${p.special==='unstable' ? '⚠ 바이탈 불안정 (해제)' : '바이탈 불안정'}
        </button>
        <button class="r-btn special danger ${p.special==='icu'?'active':''}"
          onclick="setSpecial(${p.id}, '${p.special==='icu'?'':'icu'}')">
          ${p.special==='icu' ? '🔴 중환자실 예정 (해제)' : '중환자실 입실 예정'}
        </button>
      </div>
      <div class="r-btn-row">
        <button class="r-btn discharge" onclick="discharge(${p.id},'${p.name}')">퇴실 처리</button>
      </div>
    </div>
  </div>`;
}

function drugLabel(field) {
  return { fentanyl_time:'펜타닐', pethidine_time:'페티딘', ondansetron_time:'온세란', mekool_time:'멕쿨' }[field];
}

// ── 수술 예정 환자 ──
async function loadScheduled() {
  const res = await fetch('/api/scheduled');
  scheduledList = await res.json();
  renderScheduled();
}

function renderScheduled() {
  const el = document.getElementById('scheduled-list');
  if (!scheduledList.length) {
    el.innerHTML = '<div class="empty-msg">등록된 환자 없음</div>'; return;
  }
  el.innerHTML = scheduledList.map(p => `
    <div class="scheduled-row">
      <span class="s-reg">${p.reg_no}</span>
      <span class="s-name">${p.name}</span>
      <span class="s-surgery">${p.surgery}</span>
      <span class="s-ward">${p.ward}</span>
      <span class="s-room">${p.room}호</span>
      <button class="s-del-btn" onclick="deleteScheduled(${p.id})">삭제</button>
    </div>
  `).join('');
}

async function addScheduled() {
  const name    = document.getElementById('s-name').value.trim();
  const reg_no  = document.getElementById('s-reg').value.trim();
  const surgery = document.getElementById('s-surgery').value.trim();
  const ward    = document.getElementById('s-ward').value;
  const room    = document.getElementById('s-room').value.trim();
  if (!name || !reg_no || !surgery || !ward || !room) {
    alert('모든 항목을 입력해주세요.'); return;
  }
  await fetch('/api/scheduled', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, reg_no, surgery, ward, room })
  });
  ['s-name','s-reg','s-surgery','s-room'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('s-ward').value = '';
  loadScheduled();
}

async function deleteScheduled(id) {
  await fetch(`/api/scheduled/${id}`, { method: 'DELETE' });
  loadScheduled();
}

// Enter 키 입실 등록
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.closest('.admit-form')) {
    if (currentTab === 'recovery') admitPatient();
    else addScheduled();
  }
});
