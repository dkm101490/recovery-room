let patients = [];
let selectedWard = '';
let notifiedIds = new Set();

const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${wsProto}//${location.host}`);
const connDot = document.getElementById('conn-dot');

ws.onopen  = () => connDot.className = 'conn-dot connected';
ws.onclose = () => connDot.className = 'conn-dot disconnected';

ws.onmessage = e => {
  const msg = JSON.parse(e.data);
  if      (msg.type === 'init')               { patients = msg.patients; render(); }
  else if (msg.type === 'patient_added')      { patients.unshift(msg.patient); render(); }
  else if (msg.type === 'patient_updated')    {
    const i = patients.findIndex(p => p.id === msg.patient.id);
    if (i !== -1) patients[i] = msg.patient;
    render(); triggerAlerts();
  }
  else if (msg.type === 'patient_discharged') {
    patients = patients.filter(p => p.id !== msg.id);
    notifiedIds.delete(msg.id);
    render();
  }
};

setInterval(() => { render(); triggerAlerts(); }, 30000);

function filterWard() {
  selectedWard = document.getElementById('ward-select').value;
  render();
}

function visible() {
  return selectedWard ? patients.filter(p => p.ward === selectedWard) : patients;
}

function render() {
  const list  = document.getElementById('ward-list');
  const empty = document.getElementById('empty-state');
  const vis   = visible();

  if (!vis.length) { empty.style.display = 'flex'; list.innerHTML = ''; return; }
  empty.style.display = 'none';

  // 병실별 그룹
  const byRoom = {};
  vis.forEach(p => {
    const key = p.room;
    if (!byRoom[key]) byRoom[key] = [];
    byRoom[key].push(p);
  });

  // 병실 번호 순 정렬
  const sorted = Object.entries(byRoom).sort((a, b) => {
    const numA = parseInt(a[0]) || 0;
    const numB = parseInt(b[0]) || 0;
    return numA - numB;
  });

  list.innerHTML = sorted.map(([room, roomPatients]) => `
    <div class="room-group">
      <div class="room-group-label">${room}호</div>
      <div class="room-group-cards">
        ${roomPatients.map(p => buildCard(p)).join('')}
      </div>
    </div>
  `).join('');
}

function buildCard(p) {
  const st = calcStatus(p);
  const admitStr = fmtTime(p.admit_time);
  const estStr   = p.estimated_discharge ? fmtTime(p.estimated_discharge) : null;

  // 메인 메시지
  let mainMsg = '';
  if (p.special === 'icu' || p.special === 'unstable') {
    mainMsg = `환자분이 <b>${admitStr}</b>에 회복실에 입실하셨습니다.`;
  } else {
    mainMsg = `환자분이 <b>${admitStr}</b>에 회복실에 입실하셨습니다.<br>(40분 후) 예상 퇴실시간 <b>${estStr || '계산 중'}</b> 입니다.`;
  }

  // 투약 목록
  const drugs = [];
  if (p.fentanyl_time)    drugs.push(`구연산펜타닐 50mcg &nbsp;<b>${fmtTime(p.fentanyl_time)}</b> 투약`);
  if (p.pethidine_time)   drugs.push(`제일페티딘염산염 25mg &nbsp;<b>${fmtTime(p.pethidine_time)}</b> 투약`);
  if (p.ondansetron_time) drugs.push(`온세란주 4mg &nbsp;<b>${fmtTime(p.ondansetron_time)}</b> 투약`);
  if (p.mekool_time)      drugs.push(`멕쿨주 10mg &nbsp;<b>${fmtTime(p.mekool_time)}</b> 투약`);

  const specialMsg = p.special === 'unstable'
    ? `<div class="w-special unstable">⚠ 바이탈이 불안정할 경우 안정화 될 때까지 회복실 체류 예정</div>`
    : p.special === 'icu'
    ? `<div class="w-special icu">🔴 환자상태 안좋아 중환자실 입실 예정</div>`
    : '';

  const readyBanner = st.type === 'ready'
    ? `<div class="w-ready-banner">✅ 퇴실 준비 완료</div>` : '';

  return `
  <div class="w-card status-${st.color}">
    <div class="w-card-header">
      <div class="w-patient-info">
        <span class="w-name">${p.name}</span>
        <span class="w-reg">${p.reg_no}</span>
        <span class="w-ward-badge">${p.ward}</span>
      </div>
      <div class="w-surgery">${p.surgery}</div>
    </div>

    <div class="w-main-msg">${mainMsg}</div>

    ${drugs.length ? `<ul class="w-drug-list">${drugs.map(d=>`<li>${d}</li>`).join('')}</ul>` : ''}

    ${specialMsg}
    ${readyBanner}
  </div>`;
}

function triggerAlerts() {
  visible().forEach(p => {
    const st = calcStatus(p);
    if (st.type === 'ready' && !notifiedIds.has(p.id)) {
      notifiedIds.add(p.id);
      playBeep();
      notify(p);
    }
  });
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.5, 1.0].forEach(delay => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.4);
    });
  } catch(e) {}
}

function notify(p) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('[회복실] 퇴실 준비 완료', { body: `${p.name} (${p.ward} ${p.room}호) · ${p.surgery}` });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(r => { if (r === 'granted') notify(p); });
  }
}

window.addEventListener('load', () => {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
});
