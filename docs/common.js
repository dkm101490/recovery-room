function extractFloor(ward) {
  const m = (ward || '').match(/(\d+)층/);
  return m ? parseInt(m[1]) : 999;
}
function extractSubWard(ward) {
  const m = (ward || '').match(/(\d+)병동/);
  return m ? parseInt(m[1]) : 999;
}

function fmtTime(iso, withSec = false) {
  if (!iso) return null;
  const d = new Date(new Date(iso).getTime() + 9 * 3600000);
  const hm = `${String(d.getUTCHours()).padStart(2,'0')}시 ${String(d.getUTCMinutes()).padStart(2,'0')}분`;
  return withSec ? `${hm} ${String(d.getUTCSeconds()).padStart(2,'0')}초` : hm;
}

function toKSTString(d) {
  return new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 19);
}

function nowLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  return toKSTString(d).slice(0, 16);
}

function nowWithSec() {
  return toKSTString(new Date());
}

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

function calcStatus(p) {
  if (p.special === 'icu')      return { type: 'icu',      color: 'red'    };
  if (p.special === 'unstable') return { type: 'unstable', color: 'orange' };

  const est = p.estimated_discharge;
  if (!est) return { type: 'recovering', color: 'blue' };

  const diffMin = Math.round((new Date(est) - new Date()) / 60000);
  if (diffMin <= 0)  return { type: 'ready',     color: 'green',  diffMin };
  if (diffMin <= 10) return { type: 'soon',       color: 'yellow', diffMin };
  return                    { type: 'recovering', color: 'blue',   diffMin };
}

function getElapsedMin(admitTime) {
  return Math.floor((new Date() - new Date(admitTime)) / 60000);
}

/* ═══ AI 인계 요약 ═══ */
function generateHandoverScript(p) {
  try {
    const elapsed  = getElapsedMin(p.admit_time);
    const elapsedStr = elapsed >= 60
      ? `${Math.floor(elapsed / 60)}시간 ${elapsed % 60}분`
      : `${elapsed}분`;

    const drugs = [];
    if (p.fentanyl_doses) {
      const times = Object.values(p.fentanyl_doses).sort().map(t => fmtTime(t, true));
      drugs.push(`구연산펜타닐 50mcg × ${times.length}회 (${times.join(', ')} 투약)`);
    } else if (p.fentanyl_time) {
      drugs.push(`구연산펜타닐 50mcg (${fmtTime(p.fentanyl_time, true)} 투약)`);
    }
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
  const modal = document.getElementById('handover-modal');
  if (modal) modal.classList.remove('open');
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

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeHandover();
});
