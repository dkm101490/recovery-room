let patients = [];
let scheduledList = [];
let currentTab = 'recovery';

const patientsRef = db.ref('patients');
const scheduledRef = db.ref('scheduled_patients');

function refreshAdmitTime() {
  document.getElementById('f-time').value = nowLocal();
}
refreshAdmitTime();
setInterval(refreshAdmitTime, 60000);

patientsRef.on('value', snapshot => {
  const data = snapshot.val() || {};
  patients = Object.entries(data)
    .map(([id, p]) => withEst({ id, ...p }))
    .sort((a, b) => a.ward.localeCompare(b.ward) || new Date(b.admit_time) - new Date(a.admit_time));
  renderPatients();
});

setInterval(renderPatients, 30000);

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-recovery').classList.toggle('hidden', tab !== 'recovery');
  document.getElementById('tab-schedule').classList.toggle('hidden', tab !== 'schedule');
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'recovery') || (i === 1 && tab === 'schedule'));
  });
  if (tab === 'schedule') loadScheduled();
}

async function lookupPatient() {
  const reg = document.getElementById('f-reg').value.trim();
  if (!reg) return;
  const snapshot = await scheduledRef.once('value');
  const data = snapshot.val() || {};
  const all = Object.values(data);
  const p = all.find(p => p.reg_no === reg || p.name.includes(reg));
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

async function admitPatient() {
  const name       = document.getElementById('f-name').value.trim();
  const reg_no     = document.getElementById('f-reg').value.trim();
  const surgery    = document.getElementById('f-surgery').value.trim();
  const ward       = document.getElementById('f-ward').value;
  const room       = document.getElementById('f-room').value.trim();
  const admit_time = document.getElementById('f-time').value || nowLocal();

  if (!name || !reg_no || !surgery || !ward || !room) {
    alert('모든 항목을 입력해주세요.'); return;
  }
  await patientsRef.push({ name, reg_no, surgery, ward, room, admit_time, status: 'recovering' });
  ['f-name','f-reg','f-surgery','f-room'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-ward').value = '';
  document.getElementById('f-time').value = nowLocal();
  document.getElementById('f-reg').focus();
}

async function recordDrug(id, field) {
  await db.ref(`patients/${id}`).update({ [field]: nowWithSec() });
}

async function setSpecial(id, val) {
  await db.ref(`patients/${id}`).update({ special: val || null });
}

async function discharge(id, name) {
  if (!confirm(`${name} 환자를 퇴실 처리하시겠습니까?`)) return;
  await db.ref(`patients/${id}`).remove();
}

function renderPatients() {
  document.getElementById('count').textContent = patients.length;
  const grid = document.getElementById('patients-grid');

  if (!patients.length) {
    grid.innerHTML = '<div class="empty-msg">현재 입실 환자 없음</div>';
    return;
  }

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
  const bgClass = p.special === 'unstable' ? 'card-bg-unstable'
                : p.special === 'icu'      ? 'card-bg-icu'
                : '';

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
  <div class="r-card status-${st.color} ${bgClass}">
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
          onclick="recordDrug('${p.id}','fentanyl_time')">
          구연산펜타닐 50mcg${p.fentanyl_time ? ` ✓ ${fmtTime(p.fentanyl_time, true)}` : ''}
        </button>
        <button class="r-btn drug ${p.pethidine_time?'given':''}"
          onclick="recordDrug('${p.id}','pethidine_time')">
          제일페티딘염산염 25mg${p.pethidine_time ? ` ✓ ${fmtTime(p.pethidine_time, true)}` : ''}
        </button>
      </div>
      <div class="r-btn-row">
        <button class="r-btn antiemetic ${p.ondansetron_time?'given':''}"
          onclick="recordDrug('${p.id}','ondansetron_time')">
          온세란주 4mg${p.ondansetron_time ? ` ✓ ${fmtTime(p.ondansetron_time, true)}` : ''}
        </button>
        <button class="r-btn antiemetic ${p.mekool_time?'given':''}"
          onclick="recordDrug('${p.id}','mekool_time')">
          멕쿨주 10mg${p.mekool_time ? ` ✓ ${fmtTime(p.mekool_time, true)}` : ''}
        </button>
      </div>
      <div class="r-btn-row">
        <button class="r-btn special warn ${p.special==='unstable'?'active':''}"
          onclick="setSpecial('${p.id}', '${p.special==='unstable'?'':'unstable'}')">
          ${p.special==='unstable' ? '⚠ 바이탈 불안정 (해제)' : '바이탈 불안정'}
        </button>
        <button class="r-btn special danger ${p.special==='icu'?'active':''}"
          onclick="setSpecial('${p.id}', '${p.special==='icu'?'':'icu'}')">
          ${p.special==='icu' ? '🔴 중환자실 예정 (해제)' : '중환자실 입실 예정'}
        </button>
      </div>
      <div class="r-btn-row">
        <button class="r-btn ai-handover" onclick="showHandover('${p.id}')">🤖 AI 인계 요약</button>
        <button class="r-btn discharge" onclick="discharge('${p.id}','${p.name}')">퇴실 처리</button>
      </div>
    </div>
  </div>`;
}

function drugLabel(field) {
  return { fentanyl_time:'펜타닐', pethidine_time:'페티딘', ondansetron_time:'온세란', mekool_time:'멕쿨' }[field];
}

async function loadScheduled() {
  const snapshot = await scheduledRef.once('value');
  const data = snapshot.val() || {};
  scheduledList = Object.entries(data).map(([id, p]) => ({ id, ...p }));
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
      <button class="s-del-btn" onclick="deleteScheduled('${p.id}')">삭제</button>
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
  await scheduledRef.push({ name, reg_no, surgery, ward, room });
  ['s-name','s-reg','s-surgery','s-room'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('s-ward').value = '';
  loadScheduled();
}

async function deleteScheduled(id) {
  await db.ref(`scheduled_patients/${id}`).remove();
  loadScheduled();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.closest('.admit-form')) {
    if (currentTab === 'recovery') admitPatient();
    else addScheduled();
  }
  if (e.key === 'Escape') closeHandover();
});

/* ═══ AI 인계 요약 ═══ */
function generateHandoverScript(p) {
  try {
    const elapsed  = getElapsedMin(p.admit_time);
    const elapsedStr = elapsed >= 60
      ? `${Math.floor(elapsed / 60)}시간 ${elapsed % 60}분`
      : `${elapsed}분`;

    const drugs = [];
    if (p.fentanyl_time)    drugs.push(`구연산펜타닐 50mcg (${fmtTime(p.fentanyl_time, true)} 투약)`);
    if (p.pethidine_time)   drugs.push(`제일페티딘염산염 25mg (${fmtTime(p.pethidine_time, true)} 투약)`);
    if (p.ondansetron_time) drugs.push(`온세란주 4mg (${fmtTime(p.ondansetron_time, true)} 투약)`);
    if (p.mekool_time)      drugs.push(`멕쿨주 10mg (${fmtTime(p.mekool_time, true)} 투약)`);
    const drugStr = drugs.length
      ? drugs.map(d => `  · ${d}`).join('\n')
      : '  · 별도 투약 없음';

    if (p.special === 'icu') {
      return `안녕하세요, 중환자실입니다.
${p.name} 환자분 중환자실 입실 예정으로 인계드리겠습니다.

현재 ${p.surgery} 수술 후 회복실 입실하셨으며,
회복실 체류 ${elapsedStr} 중 환자 상태 불안정하여
중환자실 입실이 필요한 상황입니다.

회복실 투약 내역:
${drugStr}

침대 및 이송 준비 부탁드리겠습니다. 감사합니다.

병실: ${p.room}호 | 병동: ${p.ward}`;
    }

    const vitalLine = p.special === 'unstable'
      ? '바이탈이 한차례 흔들려 안정화 대기하느라 퇴실이 다소 지연되었으나,\n현재 안정화 완료되어 퇴실 가능한 상태입니다'
      : '바이탈 stable하게 잘 유지되었습니다';

    return `안녕하세요, 선생님. 회복실입니다.
${p.name} 환자분 퇴실 준비 완료되어 인계드리겠습니다.

현재 ${p.surgery} 수술 후 입실하셨고,
회복실 체류 ${elapsedStr} 만에 ${vitalLine}.

회복실 투약 내역:
${drugStr}

마지막 투약 후 관찰 시간 모두 정상적으로 충족했습니다.
환자분 지금 병동으로 이동하셔도 좋습니다.

병실: ${p.room}호 | 병동: ${p.ward}`;
  } catch (e) {
    return '인계 스크립트 생성 중 오류가 발생했습니다.';
  }
}

function showHandover(id) {
  try {
    const p = patients.find(pt => pt.id === id);
    if (!p) return;
    document.getElementById('handover-text').textContent = generateHandoverScript(p);
    document.getElementById('handover-modal').classList.add('open');
  } catch (e) {
    console.error('AI 인계 요약 오류:', e);
  }
}

function closeHandover() {
  document.getElementById('handover-modal').classList.remove('open');
}

function closeHandoverOverlay(e) {
  if (e.target === document.getElementById('handover-modal')) closeHandover();
}

function copyHandover() {
  try {
    const text = document.getElementById('handover-text').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector('.hm-copy-btn');
      const orig = btn.textContent;
      btn.textContent = '✓ 복사됨!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  } catch (e) {
    console.error('복사 실패:', e);
  }
}
