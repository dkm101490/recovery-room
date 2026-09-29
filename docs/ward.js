let patients = [];
let selectedWard = '';
let notifiedIds = new Set();

const patientsRef = db.ref('patients');
const connDot = document.getElementById('conn-dot');

db.ref('.info/connected').on('value', snap => {
  connDot.className = snap.val() ? 'conn-dot connected' : 'conn-dot disconnected';
});

onFirebaseReady(() => {
  patientsRef.on('value', snapshot => {
    const data = snapshot.val() || {};
    patients = Object.entries(data).map(([id, p]) => withEst({ id, ...p }));
    render();
    triggerAlerts();
  });
});

setInterval(() => { render(); triggerAlerts(); }, 30000);

function filterWard() {
  selectedWard = document.getElementById('ward-select').value;
  render();
}

function visible() {
  return selectedWard ? patients.filter(p => p.ward === selectedWard) : patients;
}

// AI 실시간 분석 대시보드: 평균체류 / 침상정체는 실제 데이터 기반 계산 (2026-09-27 수정)
const CONGESTION_THRESHOLD_MIN = 20; // 퇴실준비 후 이만큼 지나면 "지연"으로 간주

function updateAIDashboard(vis) {
  const total = vis.length;
  const ready = vis.filter(p => calcStatus(p).type === 'ready').length;

  document.getElementById('ai-total').textContent = total + '명';
  document.getElementById('ai-ready').textContent = ready + '명';

  // 평균체류: 실제 입실시간 기준 경과시간 평균 (랜덤 아님)
  const avgEl = document.getElementById('ai-avg-stay');
  const avgChip = avgEl.closest('.ai-chip');
  if (total > 0) {
    const totalElapsed = vis.reduce((sum, p) => sum + getElapsedMin(p.admit_time), 0);
    const avg = Math.round(totalElapsed / total);
    avgEl.textContent = `${avg}분`;
    avgChip.className = 'ai-chip ai-chip-blue';
  } else {
    avgEl.textContent = '계산 중';
    avgChip.className = 'ai-chip ai-chip-blue';
  }

  // 침상정체: 병동별로 "퇴실준비 완료" 후 CONGESTION_THRESHOLD_MIN분 넘게 대기 중인 환자 탐지
  const congestEl = document.getElementById('ai-congestion');
  const congestChip = congestEl.closest('.ai-chip');
  const byWard = {};
  patients.forEach(p => {
    const st = calcStatus(p);
    if (st.type !== 'ready') return;
    const overdueMin = -st.diffMin; // diffMin <= 0 이므로 양수로 변환
    if (overdueMin < CONGESTION_THRESHOLD_MIN) return;
    const key = p.ward || '미지정';
    if (!byWard[key] || overdueMin > byWard[key]) byWard[key] = overdueMin;
  });

  const worst = Object.entries(byWard).sort((a, b) => b[1] - a[1])[0];
  if (worst) {
    congestEl.innerHTML = `⚠&nbsp;침상정체&nbsp;<strong>주의</strong>&nbsp;<small>(${worst[0]} 인계 지연 ${worst[1]}분)</small>`;
    congestChip.className = 'ai-chip ai-chip-orange';
    congestChip.style.display = '';
  } else {
    congestEl.innerHTML = '침상정체&nbsp;<strong>없음</strong>';
    congestChip.className = 'ai-chip ai-chip-gray';
    congestChip.style.display = '';
  }
}

function renderRoomSummary(vis) {
  const bar = document.getElementById('room-summary-bar');
  if (!bar) return;

  if (!vis.length) {
    bar.innerHTML = '<span class="rsb-title">🏥 병실 현황</span><span class="rsb-total">입실 환자 없음</span>';
    return;
  }

  const byWard = {};
  vis.forEach(p => {
    const key = p.ward || '미지정';
    if (!byWard[key]) byWard[key] = [];
    byWard[key].push(p);
  });

  const sorted = Object.entries(byWard).sort((a, b) => {
    const floorDiff = extractFloor(a[0]) - extractFloor(b[0]);
    if (floorDiff !== 0) return floorDiff;
    return extractSubWard(a[0]) - extractSubWard(b[0]);
  });

  const totalReady   = vis.filter(p => calcStatus(p).type === 'ready').length;
  const totalSpecial = vis.filter(p => p.special === 'icu' || p.special === 'unstable').length;

  const chips = sorted.map(([ward, pts]) => {
    const ready   = pts.filter(p => calcStatus(p).type === 'ready').length;
    const special = pts.filter(p => p.special === 'icu' || p.special === 'unstable').length;
    const waiting = pts.length - ready;

    const cls = special > 0 ? 'rsb-chip has-special'
              : ready > 0   ? 'rsb-chip has-ready'
              : 'rsb-chip';

    const parts = [`<span class="rsb-room">${ward}</span>`, `${pts.length}명`];
    if (ready   > 0) parts.push(`<span class="rsb-ready">퇴실준비 ${ready}</span>`);
    if (waiting > 0) parts.push(`<span class="rsb-wait">체류중 ${waiting}</span>`);
    if (special > 0) parts.push(`<span class="rsb-special">⚠${special}</span>`);

    return `<span class="${cls}">${parts.join('<span style="opacity:.4">·</span>')}</span>`;
  }).join('');

  bar.innerHTML = `
    <span class="rsb-title">🏥 병실 현황</span>
    <span class="rsb-total">전체 <strong style="color:#E2E8F0">${vis.length}</strong>명 &nbsp;·&nbsp; 퇴실준비 <strong style="color:#86EFAC">${totalReady}</strong> &nbsp;·&nbsp; 특이 <strong style="color:#FDB77A">${totalSpecial}</strong></span>
    <span class="rsb-divider"></span>
    ${chips}
  `;
}

function generateWardBriefing(vis) {
  const el = document.getElementById('ai-briefing-text');
  if (!el) return;

  const wardLabel = selectedWard || '전체 병동';

  if (!vis.length) {
    el.innerHTML = `현재 <strong>${wardLabel}</strong>에는 회복실에서 대기 중인 환자가 없습니다.`;
    return;
  }

  const nameList = list => {
    const names = list.map(p => `${p.name} 님(${p.room}호)`);
    if (names.length <= 3) return names.join(', ');
    return names.slice(0, 3).join(', ') + ` 외 ${names.length - 3}명`;
  };

  const ready      = vis.filter(p => calcStatus(p).type === 'ready');
  const soon       = vis.filter(p => calcStatus(p).type === 'soon');
  const unstable   = vis.filter(p => p.special === 'unstable');
  const icu        = vis.filter(p => p.special === 'icu');
  const recovering = vis.length - ready.length - soon.length - unstable.length - icu.length;

  const parts = [`현재 <strong>${wardLabel}</strong>에는 환자 <strong>${vis.length}명</strong>이 있습니다.`];

  if (ready.length) {
    parts.push(`이 중 <strong>${ready.length}명</strong>(${nameList(ready)})은 퇴실 준비가 완료되어 바로 인계 가능한 상태입니다.`);
  }
  if (icu.length || unstable.length) {
    const specialBits = [];
    if (icu.length)      specialBits.push(`중환자실 예정 ${icu.length}명(${nameList(icu)})`);
    if (unstable.length) specialBits.push(`바이탈 불안정 ${unstable.length}명(${nameList(unstable)})`);
    parts.push(`<span class="briefing-special">⚠ ${specialBits.join(', ')}</span>로 별도 관리가 필요합니다.`);
  }
  if (soon.length) {
    parts.push(`<strong>${soon.length}명</strong>은 10분 이내 퇴실 준비가 완료될 예정입니다.`);
  }
  if (recovering > 0) {
    parts.push(`나머지 <strong>${recovering}명</strong>은 정상적으로 회복 관찰 중입니다.`);
  }

  el.innerHTML = parts.join(' ');
}

function render() {
  const list  = document.getElementById('ward-list');
  const empty = document.getElementById('empty-state');
  const vis   = visible();

  updateAIDashboard(vis);
  renderRoomSummary(vis);
  generateWardBriefing(vis);

  if (!vis.length) { empty.style.display = 'flex'; list.innerHTML = ''; return; }
  empty.style.display = 'none';

  const byRoom = {};
  vis.forEach(p => {
    const key = p.room;
    if (!byRoom[key]) byRoom[key] = [];
    byRoom[key].push(p);
  });

  const sorted = Object.entries(byRoom).sort((a, b) => {
    const wardA = (a[1][0] && a[1][0].ward) || '';
    const wardB = (b[1][0] && b[1][0].ward) || '';
    const floorDiff = extractFloor(wardA) - extractFloor(wardB);
    if (floorDiff !== 0) return floorDiff;
    const subDiff = extractSubWard(wardA) - extractSubWard(wardB);
    if (subDiff !== 0) return subDiff;
    return (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0);
  });

  list.innerHTML = sorted.map(([room, roomPatients]) => {
    const wardLabel = (roomPatients[0] && roomPatients[0].ward) || '';
    return `
    <div class="room-group">
      <div class="room-group-label">${wardLabel ? wardLabel + ' &nbsp;·&nbsp; ' : ''}${room}호</div>
      <div class="room-group-cards">
        ${roomPatients.map(p => buildCard(p)).join('')}
      </div>
    </div>`;
  }).join('');
}

function buildCard(p) {
  const st = calcStatus(p);
  const admitStr = fmtTime(p.admit_time);
  const estStr   = p.estimated_discharge ? fmtTime(p.estimated_discharge) : null;
  const bgClass  = p.special === 'unstable' ? 'card-bg-unstable'
                 : p.special === 'icu'      ? 'card-bg-icu'
                 : '';

  let mainMsg = '';
  if (p.special === 'icu' || p.special === 'unstable') {
    mainMsg = `환자분이 <b>${admitStr}</b>에 회복실에 입실하셨습니다.`;
  } else {
    mainMsg = `환자분이 <b>${admitStr}</b>에 회복실에 입실하셨습니다.<br>(40분 후) 예상 퇴실시간 <b>${estStr || '계산 중'}</b> 입니다.`;
  }

  const drugs = [];
  if (p.fentanyl_doses) {
    Object.values(p.fentanyl_doses).sort().forEach(t =>
      drugs.push(`구연산펜타닐 50mcg &nbsp;<b>${fmtTime(t)}</b> 투약`)
    );
  } else if (p.fentanyl_time) {
    drugs.push(`구연산펜타닐 50mcg &nbsp;<b>${fmtTime(p.fentanyl_time)}</b> 투약`);
  }
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
  <div class="w-card status-${st.color} ${bgClass}">
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

    <div class="w-card-actions">
      <button class="w-ai-btn" onclick="showHandover('${p.id}')">🤖 AI 인계 요약</button>
    </div>
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
