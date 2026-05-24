function fmtTime(iso, withSec = false) {
  if (!iso) return null;
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2,'0')}시 ${String(d.getMinutes()).padStart(2,'0')}분`;
  return withSec ? `${hm} ${String(d.getSeconds()).padStart(2,'0')}초` : hm;
}

function nowLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

function nowWithSec() {
  return new Date().toISOString().slice(0, 19);
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
  if (diffMin <= 0)  return { type: 'ready',     color: 'green'  };
  if (diffMin <= 10) return { type: 'soon',       color: 'yellow', diffMin };
  return                    { type: 'recovering', color: 'blue',   diffMin };
}

function getElapsedMin(admitTime) {
  return Math.floor((new Date() - new Date(admitTime)) / 60000);
}
