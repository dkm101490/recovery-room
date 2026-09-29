/* ═══ 약물 카탈로그 (2026-09-29 추가: 회복실 투약 항목 확장) ═══
   affectsDischarge: true인 약만 "퇴실 예상시간" 계산에 반영됨.
   cooldownMin: 같은 약을 이 시간(분) 안에는 다시 기록하지 못하게 막음 (0이면 제한 없음). */
const CUSTOM_DRUG_KEY = '기타(직접입력)';
const DRUG_CATALOG = {
  '구연산펜타닐':     { doses: ['50mcg', '25mcg'],    waitMin: 15, cooldownMin: 15, affectsDischarge: true },
  '제일페티딘염산염': { doses: ['25mg', '12.5mg'],    waitMin: 15, cooldownMin: 0,  affectsDischarge: true },
  '비니카핀':         { doses: ['0.5mg'],             waitMin: 0,  cooldownMin: 0,  affectsDischarge: false },
  '온세란주':         { doses: ['4mg'],               waitMin: 10, cooldownMin: 0,  affectsDischarge: true },
  '멕쿨주':           { doses: ['10mg'],              waitMin: 10, cooldownMin: 0,  affectsDischarge: true },
};

/* 환자 한 명의 투약 기록을 하나의 배열로 합침 (구버전 고정 필드 + 신버전 drugs 필드 모두 지원) */
function collectDrugEntries(p) {
  const entries = [];
  if (p.fentanyl_doses) {
    Object.values(p.fentanyl_doses).forEach(t => entries.push({ name: '구연산펜타닐', dose: '50mcg', time: t }));
  } else if (p.fentanyl_time) {
    entries.push({ name: '구연산펜타닐', dose: '50mcg', time: p.fentanyl_time });
  }
  if (p.pethidine_time)   entries.push({ name: '제일페티딘염산염', dose: '25mg', time: p.pethidine_time });
  if (p.ondansetron_time) entries.push({ name: '온세란주', dose: '4mg', time: p.ondansetron_time });
  if (p.mekool_time)      entries.push({ name: '멕쿨주', dose: '10mg', time: p.mekool_time });
  if (p.drugs) {
    Object.values(p.drugs).forEach(d => entries.push({ name: d.name, dose: d.dose, time: d.time }));
  }
  return entries.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

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

  // 신규 drugs 필드: 카탈로그에 등록되고 퇴실계산에 반영되는 약만 반영
  if (p.drugs) {
    Object.values(p.drugs).forEach(d => {
      const cat = DRUG_CATALOG[d.name];
      if (cat && cat.affectsDischarge && cat.waitMin) check(d.time, cat.waitMin);
    });
  }
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

/* ═══ Gemini API 연동 (2026-09-29 추가) ═══
   API 키는 GitHub에 올라가지 않고, 이 브라우저의 localStorage에만 저장됩니다.
   키가 없거나 호출이 실패하면 항상 기존 규칙 기반 요약으로 자동 전환됩니다. */
const GEMINI_MODEL = 'gemini-3.8-flash';

function getGeminiApiKey() {
  try { return localStorage.getItem('gemini_api_key') || ''; }
  catch (e) { return ''; }
}

function setGeminiApiKey(key) {
  try { localStorage.setItem('gemini_api_key', key); }
  catch (e) {}
}

function promptGeminiApiKey() {
  const current = getGeminiApiKey();
  const input = prompt(
    'Gemini API 키를 입력해주세요.\n\n' +
    '무료 발급: aistudio.google.com/apikey\n' +
    '이 키는 이 브라우저에만 저장되고, GitHub 저장소나 다른 사람에게는 절대 전송되지 않습니다.\n' +
    '(지우려면 입력창을 비우고 확인을 누르세요)',
    current
  );
  if (input === null) return; // 취소
  setGeminiApiKey(input.trim());
  alert(input.trim()
    ? '✓ Gemini API 키가 저장되었습니다. 이제 AI 인계 요약이 Gemini로 생성됩니다.'
    : 'Gemini API 키를 삭제했습니다. 기존 규칙 기반 요약으로 돌아갑니다.');
}

/* 환자 상태를 Gemini에게 보낼 자연어 사실 정보로 정리 */
function buildHandoverPrompt(p) {
  const elapsed = getElapsedMin(p.admit_time);
  const elapsedStr = elapsed >= 60 ? `${Math.floor(elapsed / 60)}시간 ${elapsed % 60}분` : `${elapsed}분`;

  const drugEntries = collectDrugEntries(p);
  const drugLines = drugEntries.length
    ? drugEntries.map(d => `- ${d.name} ${d.dose} (${fmtTime(d.time, true)} 투약)`).join('\n')
    : '- 투약 없음';

  let statusFact;
  if (p.special === 'icu') {
    statusFact = '환자 상태가 좋지 않아 중환자실 입실이 필요한 상황';
  } else if (p.special === 'unstable') {
    statusFact = '바이탈이 아직 불안정하여 안정화될 때까지 회복실에서 계속 관찰해야 하는 상황 (아직 퇴실 불가능)';
  } else {
    const st = calcStatus(p);
    if (st.type === 'ready')      statusFact = '바이탈이 안정적으로 잘 유지되었고 마지막 투약 후 관찰 시간도 충족되어 퇴실 준비가 완료된 상황';
    else if (st.type === 'soon')  statusFact = `바이탈이 안정적이며 약 ${st.diffMin}분 후 관찰 시간이 충족되어 곧 퇴실 가능해지는 상황`;
    else                          statusFact = `바이탈은 안정적이나 아직 관찰 시간이 남아 있어 약 ${st.diffMin}분 더 관찰이 필요한 상황`;
  }

  return `당신은 회복실(PACU) 간호사입니다. 아래 환자 정보를 바탕으로, 병동 담당 간호사에게 전화로 인계하듯 자연스럽고 전문적인 한국어 인계 멘트를 작성해주세요.

[환자 정보]
- 이름: ${p.name}
- 수술명: ${p.surgery}
- 회복실 체류 시간: ${elapsedStr}
- 병실: ${p.room}호 / 병동: ${p.ward}
- 투약 내역:
${drugLines}
- 현재 상태: ${statusFact}

[작성 지침]
- "안녕하세요, 선생님. 회복실입니다."로 시작할 것
- 실제 간호사가 구두로 인계하듯 자연스러운 존댓말 문장으로 작성 (딱딱한 나열식 금지)
- 투약 내역은 시간과 함께 자연스럽게 문장 속에 녹여서 언급
- 현재 상태에 따라 퇴실 가능 여부를 분명하게 전달
- 마지막 줄에 "병실: ${p.room}호 | 병동: ${p.ward}"를 그대로 추가할 것
- 이모지나 마크다운 기호(*, #, -) 없이 순수 텍스트로만 작성
- 전체 6~10문장 이내로 간결하게 작성`;
}

async function callGeminiHandover(promptText) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // 15초 안에 응답이 없으면 무한 대기 대신 타임아웃 에러로 실패 처리
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Gemini 응답이 15초 안에 오지 않아 시간 초과되었습니다. (네트워크 또는 방화벽 문제일 수 있어요)');
    throw new Error(`Gemini 요청 실패: ${e.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Gemini API 오류 (${res.status}): ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답에 내용이 없습니다.');
  return text.trim();
}

function setHandoverBadge(state, detail) {
  const el = document.getElementById('handover-badge');
  const detailEl = document.getElementById('handover-badge-detail');
  if (!el) return;
  const map = {
    rule:           '📋 규칙 기반 요약',
    loading:        '✨ Gemini AI 생성 중...',
    ai:             '✨ Gemini AI 생성',
    fallback:       '📋 규칙 기반 요약 (Gemini 호출 실패)',
  };
  el.textContent = map[state] || '';
  el.className = 'hm-badge' + (state === 'ai' ? ' hm-badge-ai' : state === 'loading' ? ' hm-badge-loading' : '');

  if (detailEl) {
    if (state === 'fallback' && detail) {
      detailEl.textContent = '오류 내용: ' + detail;
      detailEl.style.display = '';
    } else {
      detailEl.textContent = '';
      detailEl.style.display = 'none';
    }
  }
}

/* ═══ AI 인계 요약 ═══ */
function generateHandoverScript(p) {
  try {
    const elapsed  = getElapsedMin(p.admit_time);
    const elapsedStr = elapsed >= 60
      ? `${Math.floor(elapsed / 60)}시간 ${elapsed % 60}분`
      : `${elapsed}분`;

    const drugEntries = collectDrugEntries(p);
    const drugStr = drugEntries.length
      ? drugEntries.map(d => `  · ${d.name} ${d.dose} (${fmtTime(d.time, true)} 투약)`).join('\n')
      : '  · 별도 투약 없음';

    const footer = `\n\n병실: ${p.room}호 | 병동: ${p.ward}`;
    const header = `안녕하세요, 선생님. 회복실입니다.\n${p.name} 환자분 관련해서 인계드리겠습니다.\n\n현재 ${p.surgery} 수술 후 입실하셨고, 회복실 체류 ${elapsedStr} 경과했습니다.\n\n회복실 투약 내역:\n${drugStr}`;

    // 중환자실行 — 가장 긴급, 최우선
    if (p.special === 'icu') {
      return `안녕하세요, 중환자실입니다.
${p.name} 환자분 중환자실 입실 예정으로 인계드리겠습니다.

현재 ${p.surgery} 수술 후 회복실 입실하셨으며,
회복실 체류 ${elapsedStr} 중 환자 상태 불안정하여
중환자실 입실이 필요한 상황입니다.

회복실 투약 내역:
${drugStr}

침대 및 이송 준비 부탁드리겠습니다. 감사합니다.${footer}`;
    }

    // 바이탈 불안정 — 아직 해제되지 않은 상태 (실제로 아직 퇴실 불가)
    if (p.special === 'unstable') {
      return `${header}

⚠ 현재 바이탈이 불안정하여 안정화될 때까지 회복실에서 계속 관찰 중입니다.
아직 퇴실 가능한 상태가 아니며, 안정화되는 대로 다시 인계드리겠습니다.
미리 참고해주시고, 현재는 병실을 비워두지 않으셔도 됩니다.${footer}`;
    }

    // 이하는 실제 회복 상태(calcStatus)에 따라 분기
    const st = calcStatus(p);

    if (st.type === 'ready') {
      return `${header}

바이탈 stable하게 잘 유지되었고, 마지막 투약 후 관찰 시간도 모두 정상적으로 충족했습니다.
퇴실 준비 완료되어 지금 병동으로 이동하셔도 좋습니다.${footer}`;
    }

    if (st.type === 'soon') {
      return `${header}

바이탈 stable하게 잘 유지되고 있으며, 약 ${st.diffMin}분 후 관찰 시간이 충족되어 퇴실 가능할 예정입니다.
미리 참고해주시면 감사하겠습니다.${footer}`;
    }

    // recovering — 아직 관찰 시간 많이 남음
    return `${header}

바이탈 stable하게 잘 유지되고 있으며, 현재 관찰 중입니다.
마지막 투약 기준 약 ${st.diffMin}분 더 관찰 후 퇴실 가능할 예정으로, 확정되면 다시 인계드리겠습니다.${footer}`;
  } catch (e) {
    return '인계 스크립트 생성 중 오류가 발생했습니다.';
  }
}

function showHandover(id) {
  try {
    const p = patients.find(pt => pt.id === id);
    if (!p) return;

    // 항상 규칙 기반 요약을 즉시 보여주고 (지연 없음), 가능하면 Gemini로 자연스럽게 다시 생성
    document.getElementById('handover-text').textContent = generateHandoverScript(p);
    document.getElementById('handover-modal').classList.add('open');
    setHandoverBadge('rule');

    const apiKey = getGeminiApiKey();
    if (!apiKey) return;

    setHandoverBadge('loading');
    callGeminiHandover(buildHandoverPrompt(p))
      .then(text => {
        // 모달이 그 사이 닫혔거나 다른 환자로 바뀌지 않았을 때만 반영
        if (document.getElementById('handover-modal').classList.contains('open')) {
          document.getElementById('handover-text').textContent = text;
          setHandoverBadge('ai');
        }
      })
      .catch(err => {
        console.error('Gemini 인계 요약 생성 실패:', err);
        setHandoverBadge('fallback', err && err.message);
      });
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
