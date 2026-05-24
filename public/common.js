function fmtTime(iso, withSec = false) {
  if (!iso) return null;
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2,'0')}시 ${String(d.getMinutes()).padStart(2,'0')}분`;
  return withSec ? `${hm} ${String(d.getSeconds()).padStart(2,'0')}초` : hm;
}

// 입실시간 입력용 (초 없음)
function nowLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

// 약물 기록용 (초 포함 — 재투여 시 시간 변화 확인 가능)
function nowWithSec() {
  return new Date().toISOString().slice(0, 19);
}

function calcStatus(p) {
  if (p.special === 'icu')      return { type: 'icu',       color: 'red'    };
  if (p.special === 'unstable') return { type: 'unstable',  color: 'orange' };

  const est = p.estimated_discharge;
  if (!est) return { type: 'recovering', color: 'blue' };

  const diffMin = Math.round((new Date(est) - new Date()) / 60000);
  if (diffMin <= 0)  return { type: 'ready',      color: 'green'  };
  if (diffMin <= 10) return { type: 'soon',        color: 'yellow', diffMin };
  return                    { type: 'recovering',  color: 'blue',   diffMin };
}

function getElapsedMin(admitTime) {
  return Math.floor((new Date() - new Date(admitTime)) / 60000);
}
