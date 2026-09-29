let patients = [];
let scheduledList = [];
let currentTab = 'recovery';

/* ── 시연용 Mock 환자 데이터 (1001~1100) ── */
const DEMO_PATIENTS = [
  { reg_no: '1001', name: '홍길동',   surgery: '복강경 담낭절제술 (Laparoscopic Cholecystectomy)' },
  { reg_no: '1002', name: '이순신',   surgery: '전립선 절제술 (Radical Prostatectomy)' },
  { reg_no: '1003', name: '신사임당', surgery: '유방 보존술 (Breast Conserving Surgery)' },
  { reg_no: '1004', name: '김민준',   surgery: '충수돌기 절제술 (Appendectomy)' },
  { reg_no: '1005', name: '이서연',   surgery: '자궁 근종 절제술 (Myomectomy)' },
  { reg_no: '1006', name: '박도윤',   surgery: '갑상선 절제술 (Thyroidectomy)' },
  { reg_no: '1007', name: '최지우',   surgery: '슬관절 전치환술 (Total Knee Replacement)' },
  { reg_no: '1008', name: '정하은',   surgery: '제왕절개술 (Cesarean Section)' },
  { reg_no: '1009', name: '강준서',   surgery: '서혜부 탈장 교정술 (Inguinal Herniorrhaphy)' },
  { reg_no: '1010', name: '조서현',   surgery: '난소 낭종 절제술 (Ovarian Cystectomy)' },
  { reg_no: '1011', name: '윤민서',   surgery: '무릎 관절 내시경 수술 (Knee Arthroscopy)' },
  { reg_no: '1012', name: '장하준',   surgery: '요추 추간판 절제술 (Lumbar Discectomy)' },
  { reg_no: '1013', name: '임수아',   surgery: '편도 절제술 (Tonsillectomy)' },
  { reg_no: '1014', name: '오지훈',   surgery: '위 소매 절제술 (Sleeve Gastrectomy)' },
  { reg_no: '1015', name: '한채원',   surgery: '치핵 절제술 (Hemorrhoidectomy)' },
  { reg_no: '1016', name: '신현우',   surgery: '하지 정맥류 수술 (Varicose Vein Surgery)' },
  { reg_no: '1017', name: '서수빈',   surgery: '대장 폴립 절제술 (Colonoscopic Polypectomy)' },
  { reg_no: '1018', name: '권지민',   surgery: '고관절 전치환술 (Total Hip Replacement)' },
  { reg_no: '1019', name: '황건우',   surgery: '백내장 적출 및 인공수정체 삽입술 (Cataract Extraction)' },
  { reg_no: '1020', name: '안지아',   surgery: '어깨 회전근개 봉합술 (Rotator Cuff Repair)' },
  { reg_no: '1021', name: '송예은',   surgery: '복강경 담낭절제술 (Laparoscopic Cholecystectomy)' },
  { reg_no: '1022', name: '유민재',   surgery: '충수돌기 절제술 (Appendectomy)' },
  { reg_no: '1023', name: '홍나은',   surgery: '갑상선 절제술 (Thyroidectomy)' },
  { reg_no: '1024', name: '전우진',   surgery: '자궁 근종 절제술 (Myomectomy)' },
  { reg_no: '1025', name: '고다은',   surgery: '요추 추간판 절제술 (Lumbar Discectomy)' },
  { reg_no: '1026', name: '문선우',   surgery: '전립선 절제술 (Radical Prostatectomy)' },
  { reg_no: '1027', name: '양유진',   surgery: '제왕절개술 (Cesarean Section)' },
  { reg_no: '1028', name: '손서진',   surgery: '서혜부 탈장 교정술 (Inguinal Herniorrhaphy)' },
  { reg_no: '1029', name: '배소율',   surgery: '난소 낭종 절제술 (Ovarian Cystectomy)' },
  { reg_no: '1030', name: '백연우',   surgery: '슬관절 전치환술 (Total Knee Replacement)' },
  { reg_no: '1031', name: '허아인',   surgery: '무릎 관절 내시경 수술 (Knee Arthroscopy)' },
  { reg_no: '1032', name: '남정우',   surgery: '위 소매 절제술 (Sleeve Gastrectomy)' },
  { reg_no: '1033', name: '심다현',   surgery: '유방 보존술 (Breast Conserving Surgery)' },
  { reg_no: '1034', name: '김태양',   surgery: '하지 정맥류 수술 (Varicose Vein Surgery)' },
  { reg_no: '1035', name: '이승현',   surgery: '백내장 적출 및 인공수정체 삽입술 (Cataract Extraction)' },
  { reg_no: '1036', name: '박진우',   surgery: '충수돌기 절제술 (Appendectomy)' },
  { reg_no: '1037', name: '최재원',   surgery: '고관절 전치환술 (Total Hip Replacement)' },
  { reg_no: '1038', name: '정민성',   surgery: '편도 절제술 (Tonsillectomy)' },
  { reg_no: '1039', name: '강지원',   surgery: '대장 폴립 절제술 (Colonoscopic Polypectomy)' },
  { reg_no: '1040', name: '조병철',   surgery: '치핵 절제술 (Hemorrhoidectomy)' },
  { reg_no: '1041', name: '윤영호',   surgery: '어깨 회전근개 봉합술 (Rotator Cuff Repair)' },
  { reg_no: '1042', name: '장성민',   surgery: '복강경 담낭절제술 (Laparoscopic Cholecystectomy)' },
  { reg_no: '1043', name: '임기현',   surgery: '갑상선 절제술 (Thyroidectomy)' },
  { reg_no: '1044', name: '오서준',   surgery: '자궁 근종 절제술 (Myomectomy)' },
  { reg_no: '1045', name: '한예준',   surgery: '요추 추간판 절제술 (Lumbar Discectomy)' },
  { reg_no: '1046', name: '신시우',   surgery: '전립선 절제술 (Radical Prostatectomy)' },
  { reg_no: '1047', name: '서주원',   surgery: '슬관절 전치환술 (Total Knee Replacement)' },
  { reg_no: '1048', name: '권지호',   surgery: '제왕절개술 (Cesarean Section)' },
  { reg_no: '1049', name: '황준혁',   surgery: '충수돌기 절제술 (Appendectomy)' },
  { reg_no: '1050', name: '안도현',   surgery: '서혜부 탈장 교정술 (Inguinal Herniorrhaphy)' },
  { reg_no: '1051', name: '송민재',   surgery: '무릎 관절 내시경 수술 (Knee Arthroscopy)' },
  { reg_no: '1052', name: '유서윤',   surgery: '유방 보존술 (Breast Conserving Surgery)' },
  { reg_no: '1053', name: '홍하윤',   surgery: '난소 낭종 절제술 (Ovarian Cystectomy)' },
  { reg_no: '1054', name: '전지유',   surgery: '하지 정맥류 수술 (Varicose Vein Surgery)' },
  { reg_no: '1055', name: '고수호',   surgery: '위 소매 절제술 (Sleeve Gastrectomy)' },
  { reg_no: '1056', name: '문재원',   surgery: '백내장 적출 및 인공수정체 삽입술 (Cataract Extraction)' },
  { reg_no: '1057', name: '양승민',   surgery: '편도 절제술 (Tonsillectomy)' },
  { reg_no: '1058', name: '손진우',   surgery: '고관절 전치환술 (Total Hip Replacement)' },
  { reg_no: '1059', name: '배태인',   surgery: '대장 폴립 절제술 (Colonoscopic Polypectomy)' },
  { reg_no: '1060', name: '백지환',   surgery: '치핵 절제술 (Hemorrhoidectomy)' },
  { reg_no: '1061', name: '허수민',   surgery: '어깨 회전근개 봉합술 (Rotator Cuff Repair)' },
  { reg_no: '1062', name: '남예린',   surgery: '복강경 담낭절제술 (Laparoscopic Cholecystectomy)' },
  { reg_no: '1063', name: '심지성',   surgery: '갑상선 절제술 (Thyroidectomy)' },
  { reg_no: '1064', name: '김도현',   surgery: '충수돌기 절제술 (Appendectomy)' },
  { reg_no: '1065', name: '이하늘',   surgery: '자궁 근종 절제술 (Myomectomy)' },
  { reg_no: '1066', name: '박수진',   surgery: '요추 추간판 절제술 (Lumbar Discectomy)' },
  { reg_no: '1067', name: '최영우',   surgery: '전립선 절제술 (Radical Prostatectomy)' },
  { reg_no: '1068', name: '정현서',   surgery: '유방 보존술 (Breast Conserving Surgery)' },
  { reg_no: '1069', name: '강민호',   surgery: '슬관절 전치환술 (Total Knee Replacement)' },
  { reg_no: '1070', name: '조지현',   surgery: '서혜부 탈장 교정술 (Inguinal Herniorrhaphy)' },
  { reg_no: '1071', name: '윤태준',   surgery: '무릎 관절 내시경 수술 (Knee Arthroscopy)' },
  { reg_no: '1072', name: '장서율',   surgery: '난소 낭종 절제술 (Ovarian Cystectomy)' },
  { reg_no: '1073', name: '임민아',   surgery: '제왕절개술 (Cesarean Section)' },
  { reg_no: '1074', name: '오준혁',   surgery: '위 소매 절제술 (Sleeve Gastrectomy)' },
  { reg_no: '1075', name: '한승우',   surgery: '하지 정맥류 수술 (Varicose Vein Surgery)' },
  { reg_no: '1076', name: '신지수',   surgery: '백내장 적출 및 인공수정체 삽입술 (Cataract Extraction)' },
  { reg_no: '1077', name: '서민규',   surgery: '편도 절제술 (Tonsillectomy)' },
  { reg_no: '1078', name: '권하린',   surgery: '고관절 전치환술 (Total Hip Replacement)' },
  { reg_no: '1079', name: '황지연',   surgery: '대장 폴립 절제술 (Colonoscopic Polypectomy)' },
  { reg_no: '1080', name: '안도윤',   surgery: '치핵 절제술 (Hemorrhoidectomy)' },
  { reg_no: '1081', name: '송현준',   surgery: '어깨 회전근개 봉합술 (Rotator Cuff Repair)' },
  { reg_no: '1082', name: '유서현',   surgery: '복강경 담낭절제술 (Laparoscopic Cholecystectomy)' },
  { reg_no: '1083', name: '홍기준',   surgery: '충수돌기 절제술 (Appendectomy)' },
  { reg_no: '1084', name: '전민지',   surgery: '갑상선 절제술 (Thyroidectomy)' },
  { reg_no: '1085', name: '고영민',   surgery: '자궁 근종 절제술 (Myomectomy)' },
  { reg_no: '1086', name: '문하준',   surgery: '요추 추간판 절제술 (Lumbar Discectomy)' },
  { reg_no: '1087', name: '양수현',   surgery: '전립선 절제술 (Radical Prostatectomy)' },
  { reg_no: '1088', name: '손예진',   surgery: '유방 보존술 (Breast Conserving Surgery)' },
  { reg_no: '1089', name: '배정호',   surgery: '슬관절 전치환술 (Total Knee Replacement)' },
  { reg_no: '1090', name: '백서연',   surgery: '서혜부 탈장 교정술 (Inguinal Herniorrhaphy)' },
  { reg_no: '1091', name: '허민준',   surgery: '무릎 관절 내시경 수술 (Knee Arthroscopy)' },
  { reg_no: '1092', name: '남지훈',   surgery: '난소 낭종 절제술 (Ovarian Cystectomy)' },
  { reg_no: '1093', name: '심수아',   surgery: '제왕절개술 (Cesarean Section)' },
  { reg_no: '1094', name: '김재현',   surgery: '위 소매 절제술 (Sleeve Gastrectomy)' },
  { reg_no: '1095', name: '이도연',   surgery: '하지 정맥류 수술 (Varicose Vein Surgery)' },
  { reg_no: '1096', name: '박승준',   surgery: '백내장 적출 및 인공수정체 삽입술 (Cataract Extraction)' },
  { reg_no: '1097', name: '최지훈',   surgery: '편도 절제술 (Tonsillectomy)' },
  { reg_no: '1098', name: '정수민',   surgery: '고관절 전치환술 (Total Hip Replacement)' },
  { reg_no: '1099', name: '강예원',   surgery: '대장 폴립 절제술 (Colonoscopic Polypectomy)' },
  { reg_no: '1100', name: '조민준',   surgery: '치핵 절제술 (Hemorrhoidectomy)' },
];

const patientsRef = db.ref('patients');
const scheduledRef = db.ref('scheduled_patients');

function refreshAdmitTime() {
  document.getElementById('f-time').value = nowLocal();
}
refreshAdmitTime();
setInterval(refreshAdmitTime, 60000);

onFirebaseReady(() => {
  patientsRef.on('value', snapshot => {
    const data = snapshot.val() || {};
    patients = Object.entries(data)
      .map(([id, p]) => withEst({ id, ...p }))
      .sort((a, b) => {
        const floorDiff = extractFloor(a.ward) - extractFloor(b.ward);
        if (floorDiff !== 0) return floorDiff;
        const subDiff = extractSubWard(a.ward) - extractSubWard(b.ward);
        if (subDiff !== 0) return subDiff;
        return (parseInt(a.room)||0) - (parseInt(b.room)||0) || new Date(b.admit_time) - new Date(a.admit_time);
      });
    renderPatients();
  });
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
  const msg = document.getElementById('lookup-msg');

  /* 시연용 Mock 데이터 우선 확인 */
  const demo = DEMO_PATIENTS.find(p => p.reg_no === reg);
  if (demo) {
    document.getElementById('f-name').value    = demo.name;
    document.getElementById('f-surgery').value = demo.surgery;
    msg.textContent = `✓ ${demo.name} 환자 정보 자동 입력됨`;
    msg.className = 'lookup-msg success';
    setTimeout(() => { msg.textContent = ''; msg.className = 'lookup-msg'; }, 3000);
    return;
  }

  const snapshot = await scheduledRef.once('value');
  const data = snapshot.val() || {};
  const all = Object.values(data);
  const p = all.find(p => p.reg_no === reg || p.name.includes(reg));
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
  if (field === 'fentanyl_time') {
    const p = patients.find(x => x.id === id);
    if (p && p.fentanyl_time && (Date.now() - new Date(p.fentanyl_time)) < 15 * 60 * 1000) return;
    const newTime = nowWithSec();
    // 기존 fentanyl_time은 있지만 doses 이력이 없으면 (구 데이터) 마이그레이션
    if (p && p.fentanyl_time && !p.fentanyl_doses) {
      await db.ref(`patients/${id}/fentanyl_doses`).push(p.fentanyl_time);
    }
    await db.ref(`patients/${id}/fentanyl_doses`).push(newTime);
    await db.ref(`patients/${id}`).update({ fentanyl_time: newTime });
    return;
  }
  await db.ref(`patients/${id}`).update({ [field]: nowWithSec() });
}

async function undoFentanylDose(event, id, doseKey) {
  event.preventDefault();
  if (!confirm('이 투약 기록을 취소하시겠습니까?')) return;
  const p = patients.find(x => x.id === id);
  await db.ref(`patients/${id}/fentanyl_doses/${doseKey}`).remove();
  const remaining = p && p.fentanyl_doses
    ? Object.entries(p.fentanyl_doses).filter(([k]) => k !== doseKey)
    : [];
  if (remaining.length === 0) {
    await db.ref(`patients/${id}`).update({ fentanyl_time: null });
  } else {
    const latest = remaining.sort((a, b) => a[1].localeCompare(b[1])).pop()[1];
    await db.ref(`patients/${id}`).update({ fentanyl_time: latest });
  }
}

async function undoDrugField(event, id, field) {
  event.preventDefault();
  if (!confirm('투약 기록을 취소하시겠습니까?')) return;
  await db.ref(`patients/${id}`).update({ [field]: null });
}

/* ═══ 신규 투약 기록 UI (2026-09-29 추가): 약 종류/용량을 직접 선택해서 기록 ═══ */
function onDrugNameChange(id) {
  const nameSel     = document.getElementById(`drug-name-${id}`).value;
  const customName  = document.getElementById(`drug-custom-name-${id}`);
  const doseSel     = document.getElementById(`drug-dose-${id}`);
  const customDose  = document.getElementById(`drug-custom-dose-${id}`);

  customDose.value = '';

  if (nameSel === CUSTOM_DRUG_KEY) {
    customName.style.display = '';
    doseSel.style.display    = 'none';
    customDose.style.display = '';
  } else if (nameSel && DRUG_CATALOG[nameSel]) {
    customName.style.display = 'none';
    customName.value = '';
    doseSel.style.display    = '';
    customDose.style.display = 'none';
    const doses = DRUG_CATALOG[nameSel].doses;
    doseSel.innerHTML = `<option value="">용량 선택</option>`
      + doses.map(d => `<option value="${d}">${d}</option>`).join('')
      + `<option value="${CUSTOM_DRUG_KEY}">기타(직접입력)</option>`;
  } else {
    customName.style.display = 'none';
    doseSel.style.display    = 'none';
    customDose.style.display = 'none';
  }
}

function onDrugDoseChange(id) {
  const doseSel    = document.getElementById(`drug-dose-${id}`).value;
  const customDose = document.getElementById(`drug-custom-dose-${id}`);
  customDose.style.display = doseSel === CUSTOM_DRUG_KEY ? '' : 'none';
  if (doseSel !== CUSTOM_DRUG_KEY) customDose.value = '';
}

async function recordGenericDrug(id) {
  const nameSel = document.getElementById(`drug-name-${id}`).value;
  if (!nameSel) { alert('약을 선택해주세요.'); return; }

  let name = nameSel;
  if (nameSel === CUSTOM_DRUG_KEY) {
    name = document.getElementById(`drug-custom-name-${id}`).value.trim();
    if (!name) { alert('약 이름을 입력해주세요.'); return; }
  }

  let dose;
  if (nameSel === CUSTOM_DRUG_KEY) {
    dose = document.getElementById(`drug-custom-dose-${id}`).value.trim();
    if (!dose) { alert('용량을 입력해주세요.'); return; }
  } else {
    const doseSel = document.getElementById(`drug-dose-${id}`).value;
    if (!doseSel) { alert('용량을 선택해주세요.'); return; }
    if (doseSel === CUSTOM_DRUG_KEY) {
      dose = document.getElementById(`drug-custom-dose-${id}`).value.trim();
      if (!dose) { alert('용량을 입력해주세요.'); return; }
    } else {
      dose = doseSel;
    }
  }

  // 쿨다운 체크 (카탈로그에 정의된 약만)
  const catalogEntry = DRUG_CATALOG[nameSel];
  if (catalogEntry && catalogEntry.cooldownMin) {
    const p = patients.find(x => x.id === id);
    const entries = (p && p.drugs) ? Object.values(p.drugs) : [];
    const sameDrug = entries.filter(e => e.name === name).sort((a, b) => b.time.localeCompare(a.time));
    if (sameDrug.length) {
      const elapsedMs = Date.now() - new Date(sameDrug[0].time);
      if (elapsedMs < catalogEntry.cooldownMin * 60000) {
        const remain = Math.ceil((catalogEntry.cooldownMin * 60000 - elapsedMs) / 60000);
        alert(`${name}은(는) 최근 투약 후 ${catalogEntry.cooldownMin}분이 지나야 재투약 기록이 가능해요. (${remain}분 남음)`);
        return;
      }
    }
  }

  const time = nowWithSec();
  await db.ref(`patients/${id}/drugs`).push({ name, dose, time });

  document.getElementById(`drug-name-${id}`).value = '';
  onDrugNameChange(id);
}

async function undoGenericDrug(event, id, key) {
  event.preventDefault();
  if (!confirm('이 투약 기록을 취소하시겠습니까?')) return;
  await db.ref(`patients/${id}/drugs/${key}`).remove();
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

  grid.innerHTML = Object.entries(byWard)
    .sort((a, b) => {
      const floorDiff = extractFloor(a[0]) - extractFloor(b[0]);
      if (floorDiff !== 0) return floorDiff;
      return extractSubWard(a[0]) - extractSubWard(b[0]);
    })
    .map(([ward, list]) => {
      const byRoom = {};
      list.forEach(p => {
        const key = p.room || '미지정';
        if (!byRoom[key]) byRoom[key] = [];
        byRoom[key].push(p);
      });
      const roomGroups = Object.entries(byRoom)
        .sort((a, b) => (parseInt(a[0])||0) - (parseInt(b[0])||0))
        .map(([room, roomList]) => `
          <div class="room-subgroup">
            <div class="room-subgroup-label">${room}호</div>
            <div class="ward-group-cards">
              ${roomList.map(p => renderCard(p)).join('')}
            </div>
          </div>
        `).join('');
      return `
        <div class="ward-group">
          <div class="ward-group-label">${ward}</div>
          ${roomGroups}
        </div>
      `;
    }).join('');
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

  const drugTime = field => p[field]
    ? `<span class="drug-tag" oncontextmenu="undoDrugField(event,'${p.id}','${field}')" title="우클릭: 투약 취소">${drugLabel(field)} ${fmtTime(p[field], true)}</span>`
    : '';

  return `
  <div class="r-card status-${st.color} ${bgClass}">
    <div class="r-top">
      <div class="r-identity">
        <span class="r-name">${p.name}</span>
        <span class="r-reg">${p.reg_no}</span>
        <span class="r-room-badge">${p.room}호</span>
        ${st.type === 'ready' ? '<span class="r-ready-badge">✅ 퇴실준비완료</span>' : ''}
      </div>
      <div class="r-surgery">${p.surgery}</div>
      <div class="r-meta">입실 ${fmtTime(p.admit_time)} · ${elapsed}분 경과</div>
      <div class="r-est ${st.color}">${estLabel}</div>
    </div>

    <div class="r-drug-tags">
      ${p.fentanyl_doses
        ? Object.entries(p.fentanyl_doses).sort((a,b)=>a[1].localeCompare(b[1])).map(([key,t]) =>
            `<span class="drug-tag" oncontextmenu="undoFentanylDose(event,'${p.id}','${key}')" title="우클릭: 이 투약 취소">펜타닐 ${fmtTime(t, true)}</span>`
          ).join('')
        : drugTime('fentanyl_time')}
      ${drugTime('pethidine_time')}
      ${drugTime('ondansetron_time')}${drugTime('mekool_time')}
      ${p.drugs
        ? Object.entries(p.drugs).sort((a,b)=>(a[1].time||'').localeCompare(b[1].time||'')).map(([key,d]) =>
            `<span class="drug-tag" oncontextmenu="undoGenericDrug(event,'${p.id}','${key}')" title="우클릭: 이 투약 취소">${d.name} ${d.dose} ${fmtTime(d.time, true)}</span>`
          ).join('')
        : ''}
    </div>

    <div class="r-actions">
      <div class="r-drug-adder">
        <select class="r-drug-select" id="drug-name-${p.id}" onchange="onDrugNameChange('${p.id}')">
          <option value="">약 선택</option>
          ${Object.keys(DRUG_CATALOG).map(n => `<option value="${n}">${n}</option>`).join('')}
          <option value="${CUSTOM_DRUG_KEY}">기타 (직접입력)</option>
        </select>
        <input type="text" class="r-drug-custom-name" id="drug-custom-name-${p.id}" placeholder="약 이름 입력" style="display:none">
        <select class="r-drug-dose" id="drug-dose-${p.id}" style="display:none" onchange="onDrugDoseChange('${p.id}')"></select>
        <input type="text" class="r-drug-custom-dose" id="drug-custom-dose-${p.id}" placeholder="용량 입력" style="display:none">
        <button class="r-btn drug-add-btn" onclick="recordGenericDrug('${p.id}')">💉 투약 기록</button>
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

/* ── 시연용 등록번호 자동완성 ── */
document.getElementById('f-reg').addEventListener('input', function () {
  const match = DEMO_PATIENTS.find(p => p.reg_no === this.value.trim());
  if (match) {
    document.getElementById('f-name').value    = match.name;
    document.getElementById('f-surgery').value = match.surgery;
  } else {
    document.getElementById('f-name').value    = '';
    document.getElementById('f-surgery').value = '';
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.closest('.admit-form')) {
    if (currentTab === 'recovery') admitPatient();
    else addScheduled();
  }
});
