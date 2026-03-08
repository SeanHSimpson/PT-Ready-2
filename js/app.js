// ════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════
let sex = 'male';
let puType = 'standard';
let coreType = 'situp';
let cardioType = 'run';
let lastScore = null;
const initialState = window.appStore?.init?.() || {};
let logs = initialState.logs || [];
let scoreHistory = initialState.scoreHistory || [];

// Scoring data and lookup helpers now live in ./js/scoring.js
// ════════════════════════════════════════════════════════
// UI STATE SETTERS
// ════════════════════════════════════════════════════════
function setSex(s, btn) {
  sex = s;
  document.querySelectorAll('#panel-calc .toggle-group:first-of-type .toggle-btn')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['pu', 'core', 'cardio', 'whtr'].forEach(c => liveScoreComponent(c));
}
function setPuType(t, btn) {
  puType = t;
  btn.parentElement.querySelectorAll('.toggle-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const timerBtn = document.getElementById('pu-timer-btn');
  if(t === 'hr') {
    timerBtn.textContent = '⏱ Start 2:00 Timer';
    timerBtn.onclick = () => startCountdown(120, 'Hand Release Push-ups');
  } else {
    timerBtn.textContent = '⏱ Start 1:00 Timer';
    timerBtn.onclick = () => startCountdown(60, 'Push-ups');
  }
}
function toggleAcc(id) {
  const body = document.getElementById('acc-body-' + id);
  const chev = document.getElementById('acc-chev-' + id);
  const hint = document.getElementById('acc-hint-' + id);
  if(!body) return;
  const isOpen = body.style.display === 'block';
  body.style.display = isOpen ? 'none' : 'block';
  if(chev) chev.classList.toggle('open', !isOpen);
  if(hint) hint.textContent = isOpen ? 'tap to expand' : 'tap to collapse';
}

function updateAccPill(id, score, exempted) {
  const pill = document.getElementById('acc-pill-' + id);
  if(!pill) return;
  if(exempted) {
    pill.textContent = 'EXEMPT';
    pill.className = 'acc-score-pill';
    return;
  }
  if(score !== null && score !== undefined && !isNaN(score)) {
    pill.textContent = parseFloat(score).toFixed(1) + ' pts';
    pill.className = 'acc-score-pill has-score';
  } else {
    pill.textContent = '—';
    pill.className = 'acc-score-pill';
  }
}

function setCoreType(t, btn) {
  coreType = t;
  btn.parentElement.querySelectorAll('.toggle-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const isPlank = t === 'plank';
  const isClrc  = t === 'clrc';
  document.getElementById('core-reps-field').style.display = isPlank ? 'none' : 'block';
  const plankRow = document.getElementById('plank-time-row');
  if(plankRow) plankRow.style.display = isPlank ? 'flex' : 'none';
  document.getElementById('core-min-field').style.display = isPlank ? 'block' : 'none';
  document.getElementById('core-sec-field').style.display = isPlank ? 'block' : 'none';
  // Timer button: 2-min countdown for CLRC, count-up for plank, hidden for sit-ups
  const timerRow = document.getElementById('core-timer-row');
  const timerBtn = document.getElementById('core-timer-btn');
  if(timerRow && timerBtn) {
    if(isPlank) {
      timerRow.style.display = 'block';
      timerBtn.textContent = '⏱ Start Plank Timer';
      timerBtn.onclick = () => startStopwatch('Forearm Plank', 'plank');
    } else if(isClrc) {
      timerRow.style.display = 'block';
      timerBtn.textContent = '⏱ Start 2:00 Timer';
      timerBtn.onclick = () => startCountdown(120, 'Cross-Leg Reverse Crunch');
    } else {
      // Sit-ups — 1 min
      timerRow.style.display = 'block';
      timerBtn.textContent = '⏱ Start 1:00 Timer';
      timerBtn.onclick = () => startCountdown(60, 'Sit-ups');
    }
  }
}
let equipmentType = 'bodyweight';
function setEquipment(type, btn) {
  equipmentType = type;
  document.querySelectorAll('#equip-bw, #equip-gym').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setCardioType(t, btn) {
  cardioType = t;
  btn.parentElement.querySelectorAll('.toggle-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const runRow = document.getElementById('run-time-row');
  if(runRow) runRow.style.display = t==='run' ? 'flex' : 'none';
  document.getElementById('run-min-field').style.display = t==='run' ? 'block' : 'none';
  document.getElementById('run-sec-field').style.display = t==='run' ? 'block' : 'none';
  document.getElementById('hamr-field').style.display = t==='hamr' ? 'block' : 'none';
  showCalcTimer('run-timer-row', t === 'run');
  const hamrPlayer = document.getElementById('hamr-player-row');
  if(hamrPlayer) hamrPlayer.style.display = t === 'hamr' ? 'block' : 'none';
  // Pause HAMR audio if switching away
  if(t !== 'hamr') {
    const audio = document.getElementById('hamr-audio');
    if(audio && !audio.paused) audio.pause();
  }
}
function toggleExempt(inputsDivId, checkboxId) {
  const checked = document.getElementById(checkboxId).checked;
  const div = document.getElementById(inputsDivId);
  div.style.opacity = checked ? '0.35' : '1';
  div.style.pointerEvents = checked ? 'none' : '';
  updateExemptions();
}

function updateExemptions() {
  const any = ['puExempt','coreExempt','cardioExempt','whtrExempt']
    .some(id => document.getElementById(id).checked);
  document.getElementById('exemptNote').style.display = any ? 'block' : 'none';
}
// Live WHtR calculation
document.getElementById('waist').addEventListener('input', calcWHtR);
document.getElementById('height').addEventListener('input', calcWHtR);

// Live component score pills — wire all score inputs
['puReps'].forEach(id => document.getElementById(id)?.addEventListener('input', () => liveScoreComponent('pu')));
['coreReps','plankMin','plankSec'].forEach(id => document.getElementById(id)?.addEventListener('input', () => liveScoreComponent('core')));
['runMin','runSec','hamrShuttles'].forEach(id => document.getElementById(id)?.addEventListener('input', () => liveScoreComponent('cardio')));
['waist','height'].forEach(id => document.getElementById(id)?.addEventListener('input', () => liveScoreComponent('whtr')));
// Also re-score when age or gender changes
document.getElementById('age')?.addEventListener('input', () => {
  ['pu','core','cardio','whtr'].forEach(c => liveScoreComponent(c));
});

function calcWHtR() {
  const w = parseFloat(document.getElementById('waist').value);
  const h = parseFloat(document.getElementById('height').value);
  if(w && h && h > 0) {
    const r = (w/h).toFixed(3);
    document.getElementById('whtrDisplay').value = r;
    const risk = getWhtrRiskLabel(parseFloat(r));
    document.getElementById('whtr-risk').style.display = 'block';
    document.getElementById('whtr-risk').innerHTML = `<span style="color:${risk.color}">● ${risk.label}</span> &nbsp;·&nbsp; Points: ${lookupWHtR(parseFloat(r))}`;
  } else {
    document.getElementById('whtrDisplay').value = '';
    document.getElementById('whtr-risk').style.display = 'none';
  }
}

// ════════════════════════════════════════════════════════
// CALCULATE
function calculate() {
  const age = parseInt(document.getElementById('age').value, 10);
  const ag = getAG(age);
  const testDate = document.getElementById('testDate')?.value || '';

  if (!ag) {
    alert('Please enter a valid age.');
    return;
  }

  const puEx = document.getElementById('puExempt').checked;
  const coreEx = document.getElementById('coreExempt').checked;
  const cardioEx = document.getElementById('cardioExempt').checked;
  const whtrEx = document.getElementById('whtrExempt').checked;

  let puScore = 0, puDetail = 'Exempted', puMin = 7.5;
  let coreScore = 0, coreDetail = 'Exempted';
  let cardioScore = 0, cardioDetail = 'Exempted';
  let whtrScore = 0, whtrDetail = 'Exempted';

  // Push-ups
  if (!puEx) {
    const reps = parseInt(document.getElementById('puReps').value, 10) || 0;
    const table = puType === 'standard'
      ? (sex === 'male' ? PU_STD_M : PU_STD_F)
      : (sex === 'male' ? PU_HR_M : PU_HR_F);
    puScore = lookupHigh(table, ag, reps);
    puDetail = `${reps} reps`;
  }

  // Core
  if (!coreEx) {
    if (coreType === 'plank') {
      const secs = parsePlankTime(
        document.getElementById('plankMin').value,
        document.getElementById('plankSec').value
      );
      const table = sex === 'male' ? PLANK_M : PLANK_F;
      coreScore = lookupHigh(table, ag, secs);
      coreDetail = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    } else {
      const reps = parseInt(document.getElementById('coreReps').value, 10) || 0;
      const table = coreType === 'situp'
        ? (sex === 'male' ? SITUP_M : SITUP_F)
        : (sex === 'male' ? CLRC_M : CLRC_F);
      coreScore = lookupHigh(table, ag, reps);
      coreDetail = `${reps} reps`;
    }
  }

  // Cardio
  if (!cardioEx) {
    if (cardioType === 'run') {
      const secs = parseRunTime(
        document.getElementById('runMin').value,
        document.getElementById('runSec').value
      );
      const table = sex === 'male' ? RUN_M : RUN_F;
      cardioScore = secs > 0 ? lookupLow(table, ag, secs) : 0;
      cardioDetail = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    } else {
      const shuttles = parseInt(document.getElementById('hamrShuttles').value, 10) || 0;
      const table = sex === 'male' ? HAMR_M : HAMR_F;
      cardioScore = shuttles > 0 ? lookupHigh(table, ag, shuttles) : 0;
      cardioDetail = `${shuttles} shuttles`;
    }
  }

  // WHtR
  if (!whtrEx) {
    const w = parseFloat(document.getElementById('waist').value);
    const h = parseFloat(document.getElementById('height').value);
    if (w && h) {
      const ratio = w / h;
      const table = sex === 'male' ? WHTR_M : WHTR_F;
      whtrScore = lookupLow(table, ag, ratio);
      whtrDetail = ratio.toFixed(3);
    } else {
      whtrScore = 0;
      whtrDetail = 'No data';
    }
  }

  // Composite (exempted components redistribute proportionally)
  const compMap = [
    { name: 'pu', score: puScore, max: 15, exempt: puEx },
    { name: 'core', score: coreScore, max: 15, exempt: coreEx },
    { name: 'cardio', score: cardioScore, max: 50, exempt: cardioEx },
    { name: 'whtr', score: whtrScore, max: 20, exempt: whtrEx },
  ];
  const activeComps = compMap.filter(c => !c.exempt);
  const totalMaxActive = activeComps.reduce((s, c) => s + c.max, 0);
  const rawSum = activeComps.reduce((s, c) => s + c.score, 0);
  const composite = totalMaxActive > 0 ? (rawSum / totalMaxActive * 100) : 0;

  let cat, bannerClass;
  if (composite >= 90) { cat = 'EXCELLENT'; bannerClass = 'excellent'; }
  else if (composite >= 75) { cat = 'SATISFACTORY'; bannerClass = 'satisfactory'; }
  else if (composite >= 60) { cat = 'FAIL — MARGINAL'; bannerClass = 'marginal'; }
  else { cat = 'FAIL — UNSATISFACTORY'; bannerClass = 'unsat'; }

  const fails = [];
  if (!puEx && puScore < (puMin || 7.5) && document.getElementById('puReps').value) {
    fails.push('Push-ups below minimum');
  }
  if (!cardioEx && cardioScore < 29.5 && (document.getElementById('runMin').value || document.getElementById('hamrShuttles').value)) {
    fails.push('Cardio below minimum');
  }

  let daysMsg = '';
  if (testDate) {
    const days = Math.max(0, Math.round((new Date(testDate) - new Date()) / 86400000));
    daysMsg = `${days} day${days !== 1 ? 's' : ''} until test`;
  }

  lastScore = {
    sex, age, ag, testDate,
    puType, puScore, puDetail, puEx,
    coreType, coreScore, coreDetail, coreEx,
    cardioType, cardioScore, cardioDetail, cardioEx,
    whtrScore, whtrDetail, whtrEx,
    composite: composite.toFixed(1), cat, fails
  };

  document.getElementById('result-banner').className = `result-banner ${bannerClass}`;
  document.getElementById('res-total').textContent = composite.toFixed(1);
  document.getElementById('res-category').textContent = cat;

  const badgeEl = document.getElementById('score-badge');
  if (composite >= 90) {
    badgeEl.textContent = '🏆';
    badgeEl.title = 'USAF Fitness Excellence — 90+';
  } else if (composite >= 75) {
    badgeEl.textContent = '✅';
    badgeEl.title = 'Satisfactory — 75-89';
  } else if (composite >= 60) {
    badgeEl.textContent = '🦴';
    badgeEl.title = 'Fail — Marginal (60-74)';
  } else {
    badgeEl.textContent = '❌';
    badgeEl.title = 'Fail — Unsatisfactory (below 60)';
  }

  document.getElementById('res-days').textContent = daysMsg;

  const setBox = (id, labelId, detailId, val, lbl, detail, ex) => {
    document.getElementById(id).textContent = ex ? 'EXM' : (val > 0 ? val.toFixed(1) : '0.0');
    document.getElementById(labelId).textContent = lbl;
    document.getElementById(detailId).textContent = ex ? 'Exempted' : detail;
  };

  const puLabel = puType === 'standard' ? 'Push-ups (Std)' : 'Hand Release PU';
  const coreLabel = coreType === 'situp' ? 'Sit-ups' : coreType === 'clrc' ? 'Cross Leg RC' : 'Forearm Plank';
  const cardioLabel = cardioType === 'run' ? '2-Mile Run' : 'HAMR Shuttle';

  setBox('res-pu', 'res-pu-label', 'res-pu-detail', puScore, puLabel, puDetail, puEx);
  setBox('res-core', 'res-core-label', 'res-core-detail', coreScore, coreLabel, coreDetail, coreEx);
  setBox('res-cardio', 'res-cardio-label', 'res-cardio-detail', cardioScore, cardioLabel, cardioDetail, cardioEx);
  setBox('res-whtr', 'res-whtr-label', 'res-whtr-detail', whtrScore, 'WHtR', whtrDetail, whtrEx);

  updateAccPill('pu', puScore, puEx);
  updateAccPill('core', coreScore, coreEx);
  updateAccPill('cardio', cardioScore, cardioEx);
  updateAccPill('whtr', whtrScore, whtrEx);

  if (fails.length > 0) {
    document.getElementById('min-fail-msg').style.display = 'block';
    document.getElementById('min-fail-msg').innerHTML =
      `⚠ Minimum component failure: ${fails.join(' · ')} — <strong>UNSATISFACTORY regardless of composite</strong>`;
  } else {
    document.getElementById('min-fail-msg').style.display = 'none';
  }

  document.getElementById('results').style.display = 'block';
  updateAISummary();

  setTimeout(() => {
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}
// ════════════════════════════════════════════════════════
// ── LIVE COMPONENT SCORING ────────────────────────────────────────────────────
// Updates a single accordion pill without running the full calculate()
function liveScoreComponent(component) {
  const age = parseInt(document.getElementById('age').value, 10);
  const ag = getAG(age);
  const currentSex = sex;

  if (!ag) {
    updateAccPill(component, 0, false);
    return;
  }

  if (component === 'pu') {
    const exempt = document.getElementById('puExempt').checked;
    if (exempt) {
      updateAccPill('pu', null, true);
      return;
    }
    const reps = parseInt(document.getElementById('puReps').value, 10) || 0;
    const table = puType === 'standard'
      ? (currentSex === 'male' ? PU_STD_M : PU_STD_F)
      : (currentSex === 'male' ? PU_HR_M : PU_HR_F);
    const score = lookupHigh(table, ag, reps);
    updateAccPill('pu', score, false);
  }

  if (component === 'core') {
    const exempt = document.getElementById('coreExempt').checked;
    if (exempt) {
      updateAccPill('core', null, true);
      return;
    }
    let score = 0;
    if (coreType === 'plank') {
      const secs = parsePlankTime(
        document.getElementById('plankMin').value,
        document.getElementById('plankSec').value
      );
      const table = currentSex === 'male' ? PLANK_M : PLANK_F;
      score = lookupHigh(table, ag, secs);
    } else {
      const reps = parseInt(document.getElementById('coreReps').value, 10) || 0;
      const table = coreType === 'situp'
        ? (currentSex === 'male' ? SITUP_M : SITUP_F)
        : (currentSex === 'male' ? CLRC_M : CLRC_F);
      score = lookupHigh(table, ag, reps);
    }
    updateAccPill('core', score, false);
  }

  if (component === 'cardio') {
    const exempt = document.getElementById('cardioExempt').checked;
    if (exempt) {
      updateAccPill('cardio', null, true);
      return;
    }
    let score = 0;
    if (cardioType === 'run') {
      const secs = parseRunTime(
        document.getElementById('runMin').value,
        document.getElementById('runSec').value
      );
      const table = currentSex === 'male' ? RUN_M : RUN_F;
      score = secs > 0 ? lookupLow(table, ag, secs) : 0;
    } else {
      const shuttles = parseInt(document.getElementById('hamrShuttles').value, 10) || 0;
      const table = currentSex === 'male' ? HAMR_M : HAMR_F;
      score = shuttles > 0 ? lookupHigh(table, ag, shuttles) : 0;
    }
    updateAccPill('cardio', score, false);
  }

  if (component === 'whtr') {
    const exempt = document.getElementById('whtrExempt').checked;
    if (exempt) {
      updateAccPill('whtr', null, true);
      return;
    }
    const w = parseFloat(document.getElementById('waist').value);
    const h = parseFloat(document.getElementById('height').value);
    if (w && h) {
      const ratio = w / h;
      const table = currentSex === 'male' ? WHTR_M : WHTR_F;
      const score = lookupLow(table, ag, ratio);
      updateAccPill('whtr', score, false);
    } else {
      updateAccPill('whtr', null, false);
    }
  }
}

  

function clearForm() {
  document.getElementById('puReps').value='';
  document.getElementById('coreReps').value='';
  document.getElementById('plankMin').value='';
  document.getElementById('plankSec').value='';
  document.getElementById('runMin').value='';
  document.getElementById('runSec').value='';
  document.getElementById('hamrShuttles').value='';
  document.getElementById('waist').value='';
  document.getElementById('height').value='';
  document.getElementById('whtrDisplay').value='';
  document.getElementById('whtr-risk').style.display='none';
  document.getElementById('results').style.display='none';
  // Reset exemption checkboxes and restore inputs
  ['puExempt','coreExempt','cardioExempt','whtrExempt'].forEach(id => {
    document.getElementById(id).checked = false;
  });
  ['pu-inputs','core-inputs','cardio-inputs','whtr-inputs'].forEach(id => {
    const el = document.getElementById(id);
    if(el) { el.style.opacity='1'; el.style.pointerEvents=''; }
  });
  document.getElementById('exemptNote').style.display='none';
}

function saveScore() {
  if(navigator.vibrate) navigator.vibrate(40);
  if(!lastScore) return;
  // Prompt for recorded date (default today) and test date
  const today = new Date().toISOString().split('T')[0];
  const recordedDate = prompt('Date this score was recorded (YYYY-MM-DD):', today);
  if(recordedDate === null) return; // cancelled
  const testDateVal = prompt('Official test date (YYYY-MM-DD), or leave blank if none:', lastScore.testDate || '');
  const entry = {
    id: Date.now(),
    recordedDate: recordedDate || today,
    officialTestDate: testDateVal || '',
    ...lastScore,
  };
  scoreHistory.unshift(entry);
  if(scoreHistory.length > 100) scoreHistory = scoreHistory.slice(0,100);
  window.appStore?.writeJSON(window.appStore.keys.history, scoreHistory);
  renderHistory();
  // Brief toast instead of blocking alert
  showToast(`Score ${lastScore.composite} saved!`);
}

// ════════════════════════════════════════════════════════
// AI PLAN
// ════════════════════════════════════════════════════════
function updateAISummary() {
  if(!lastScore) return;
  const noScore = document.getElementById('ai-no-score');
  if(noScore) noScore.style.display = 'none';
  
}

// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// AI PLAN — GEMINI API
// ════════════════════════════════════════════════════════
function updateAITestDate() {
  const val = document.getElementById('aiTestDate').value;
  const el = document.getElementById('ai-days-until');
  if(!val){el.textContent='';return;}
  const days = Math.max(0, Math.round((new Date(val)-new Date())/86400000));
  el.textContent = days + ' day' + (days!==1?'s':'') + ' until test';
}

function buildAIPrompt() {
  if(!lastScore) return null;
  const s = lastScore;
  const aiTestDate = document.getElementById('aiTestDate').value;
  const effectiveTestDate = aiTestDate || s.testDate || '';
  const daysUntilTest = effectiveTestDate
    ? Math.round((new Date(effectiveTestDate) - new Date()) / 86400000)
    : null;
  // Reserve 3 days before test as mandatory rest — plan covers remaining days
  const trainingDays = daysUntilTest ? Math.max(7, daysUntilTest - 3) : null;
  const totalWeeks = trainingDays
    ? Math.max(1, Math.ceil(trainingDays / 7))
    : 8;
  const focus      = document.getElementById('aiFocus').value;
  const level      = document.getElementById('aiLevel').value;
  const daysPerWeek= parseInt(document.getElementById('aiDays').value);
  const injuries   = document.getElementById('aiInjuries').value;
  const equipment  = equipmentType || 'bodyweight';
  const puLabel    = s.puType==='standard' ? 'Standard Push-ups' : 'Hand Release Push-ups';
  const coreLabel  = s.coreType==='situp' ? 'Sit-ups' : s.coreType==='clrc' ? 'Cross Leg Reverse Crunch' : 'Forearm Plank';
  const cardioLabel= s.cardioType==='run' ? '2-Mile Run' : 'HAMR';

  // Determine playbook tier based on composite score
  const tier = s.composite < 80 ? 1 : s.composite < 90 ? 2 : 3;
  const tierDesc = tier === 1
    ? 'Level 1 (score <80) — needs significant improvement, focus on building base fitness'
    : tier === 2
    ? 'Level 2 (score 80-89) — meets standards, focus on improving weak components'
    : 'Level 3 (score 90+) — high performer, focus on maintaining and sharpening peak performance';

  return `You are an expert USAF PT coach. Build a periodized training plan following The Warfighter's Fitness Playbook principles. Use PFRA standards (Effective 1 Mar 2026). This is Playbook v2.0 Feb 2026. Output ONLY a JSON object. No markdown. No trailing commas. No comments.
CRITICAL RULES — strictly follow every rule marked CRITICAL or NON-NEGOTIABLE:
1. Output phase_templates with phase1 and phase2 — each with a full week_template. Phase 2 exercises MUST differ from Phase 1 (at least 2 swaps per day).
2. daysPerWeek=${daysPerWeek} → EXACTLY ${daysPerWeek} days with is_rest:false in EACH phase template.
3. equipment=${equipment} → ${equipment === 'gym' ? 'EVERY training day must contain at least 1 gym exercise (DB/cable/machine).' : 'Bodyweight only — no gym equipment.'}

MEMBER: ${s.sex}, age ${s.age}, composite ${s.composite}/100 (${s.cat})
Tier: ${tierDesc}
Push-ups (${puLabel}): ${s.puEx?'EXEMPT':s.puDetail+' = '+s.puScore.toFixed(1)+'pts'}
Core (${coreLabel}): ${s.coreEx?'EXEMPT':s.coreDetail+' = '+s.coreScore.toFixed(1)+'pts'}
Cardio (${cardioLabel}): ${s.cardioEx?'EXEMPT':s.cardioDetail+' = '+s.cardioScore.toFixed(1)+'pts'}
Weeks: ${totalWeeks}, Training days/week: ${daysPerWeek}, Focus: ${focus}, Level: ${level}, Equipment: ${equipment}
Injuries/Limitations: ${injuries||'none'}
${injuries ? `
⚠️ INJURY MODIFICATION REQUIRED — "${injuries}":
- If shoulder/rotator cuff/AC joint mentioned: REMOVE all push-up exercises entirely. Replace with resistance band pulls, dumbbell rows, or core-only work.
- If knee/IT band/patellar mentioned: REMOVE running and lunges. Replace with cycling, swimming, or upper body cardio. Use low-impact intervals.
- If back/lumbar/spine mentioned: REMOVE sit-ups and deadlifts. Replace with bird-dogs, dead bugs, planks only.
- If wrist mentioned: REMOVE push-ups and planks on hands. Replace with fist push-ups or elbow plank variations.
- For ANY injury: do NOT include exercises that directly stress the injured area. Substituting is mandatory, not optional.
- Still include a full plan — just route around the injury entirely.` : ''}

WARFIGHTER'S FITNESS PLAYBOOK 2.0 (Feb 2026) — follow this framework exactly:

TRAINING TIERS (Playbook p.17):
- Level 1 (score <80 or PFA not completed): 2-Mile 18:00+, HAMR <60. Base building — 3 sessions/week, master form, lower intensity.
- Level 2 (score 80-89.9): 2-Mile 16:00-18:00, HAMR 60-79. Meets standard — 3-4 sessions/week, target weak components.
- Level 3 (score 90+): 2-Mile <16:00, HAMR 80+. High performer — 4-5 sessions/week, maintain and sharpen.

PLAYBOOK ROTATION (Playbook p.21 — rotate every session):
  Bodyweight Day → Metabolic Interval Day → Hybrid Day (repeat)
3-day: Mon=Bodyweight, Wed=Metabolic Interval, Fri=Hybrid
4-day: Mon=Bodyweight, Tue=Metabolic Interval, Thu=Hybrid, Fri=Bodyweight
5-day: Mon=Bodyweight, Tue=Metabolic Interval, Wed=Hybrid, Thu=Bodyweight, Fri=Metabolic Interval
6-day (use when daysPerWeek=6): Mon=Bodyweight (Upper), Tue=Metabolic Interval, Wed=Hybrid, Thu=Bodyweight (Lower+Core), Fri=Metabolic Interval, Sat=Hybrid or Active Recovery, Sun=Rest
  → Exactly 6 is_rest:false entries. NEVER default to 5 for a 6-day selection.

════════════════════════════════
WARM-UP (Appendix H — use on EVERY training day, 10-15 min)
════════════════════════════════
Standard Dynamic Warm-Up sequence (10 reps or 10 yards each):
1. 2-min jog or jog in place (raise HR, warm joints)
2. Arm Rotations — 1 arm at a time, 5x forward / 5x backward, slow large circles
3. Trunk Rotations — arms out, twist to rear (4-count hold), 5x each direction
4. Over the Fence — lateral step over imaginary fence, high knee each rep, 5x each direction
5. Under the Fence — slide under, chest to quad, 5x each direction
6. Open/Close the Gate — knee up to waist, rotate hip out, 10x each leg
7. Good Morning — hinge at hip, flat back, 4-count hold at bottom, 10x
8. Heel Rocker — rock toe-to-heel, 10x (activates ankles/calves, prevents shin splints)
9. Pendulum Leg Swing — swing leg side-to-side, 10x each leg
10. Soccer Kicks — slow pendulum hamstring kick forward/back, 10x each leg

ALTERNATE Warm-Up for Strength/Cardio days (from Sample Workouts):
- World's Greatest Stretch 2×8 ea | Inchworms 2×8 | 90/90 Hip Switch 2×12
- Knee Hug to Lunge 10yd | Straight Leg Kicks 10yd | Quad Pulls 10yd
- High Knees 10yd | Butt Kicks 10yd | Pogo Hops fwd/back 10yd | Striders 20yd

For RUN-FOCUSED sessions use this specific warmup:
- Walking Knee Hugs 10yd | Frankensteins 10yd | Heel-to-Toe walks 10yd
- Lateral shuffle 20yd | High knees 10yd jog back | Butt kicks 10yd jog back
- Forward Pogo hops 10yd jog back | Progressive striders 2×40yd

════════════════════════════════
COOL-DOWN (Appendix H — use on EVERY training day, 10-15 min)
════════════════════════════════
1. 2-min slow walk to lower heart rate
2. Shoulder Stretch — arm across chest, 10×4-count each arm
3. Triceps Stretch — arm behind head, 10×4-count each arm
4. Quad Stretch — heel to glute, knees together, hips forward, 10×4-count each leg
5. Seated or Standing Calf Stretch — 10×4-count
6. Butterfly Stretch — soles together, lean forward, 10×4-count
7. Modified Hurdler Stretch — one leg extended, reach for toes, 10×4-count each leg
8. Piriformis Stretch — ankle over opposite knee, pull to chest, 10×4-count each leg
9. Half Pretzel — cross leg over body, look opposite direction, 10×4-count each leg

ALTERNATE Recovery/Mobility (from Appendix B — 20-30 sec holds):
- 90/90 Stretch | Hamstring Stretch | Hip Flexor Stretch | Quad Stretch
- Figure 4 Stretch | Frog Stretch | Chest Stretch | Child's Pose
- Cobra/Upward Dog | Pigeon | Shoulder Rotations | Triceps Stretch

════════════════════════════════
APPENDIX A — ADAPTIVE EXERCISE CIRCUITS
════════════════════════════════
BODYWEIGHT DAY (Appendix A, p.A2) — 2-3 rounds:
- Level 1: Air Squats 8-12, Glute Bridge 8-12, Push-ups 8-12, Inverted Row 8-12, Hollow Body Rock 15-20s, Side Planks 15-20s ea
- Level 2 adds: HR Push-ups 10-15, Split Squats 10-15
- Level 3 adds: Cross-Leg Reverse Crunch 15-20, Reverse Lunge 15-20 (3-4 rounds)
Aerobic: Wks 1-2: 7×2min jog/1min walk | Wks 3-4: 5×4min jog/2min walk | Wks 5-6: 5×6min jog/2min walk | Wks 7-9: 4×1:00 med/easy/hard (12 sets) | Wks 10-11: same at 1:15 | Wk 12: deload 6 sets

METABOLIC INTERVAL DAY (Appendix A, p.A3) — 3-5 rounds, 2min rest between:
- Level 1: Air Squats 20s on/40s off, Frog Jumps 25s on/35s off, Push-ups, Forearm Plank — 3-4 rounds
- Level 2 adds: Run in Place 30s on/30s off, Reverse Lunge — 4-5 rounds
- Level 3 adds: Side Hops, HR Push-ups, Cross-Leg Reverse Crunch, Side Plank — 4-5 rounds
Aerobic: Wks 1-2: 12×30s run/1:00 walk | Wks 3-4: 12×45s run/1:00 walk | Wks 5-6: 4×1:00 med/easy/hard | Wk 7: 20min steady | Wk 8: 24min | Wk 9: 28min | Wks 10-11: 32min | Wk 12: 25min easy

HYBRID DAY (Appendix A, p.A4) — 2-4 rounds:
- Level 1: Push-up Pyramid 1-10-1, Goblet Squat 3×10, RKC Plank 3×20s, DB Shoulder Press 3×10, DB Alt Lunge 3×8ea, Cross-Leg Rev Crunch 3×20, TRX Row 3×10, Sit-ups 3×20
- Level 2: Push-up Pyramid 1-12-1, Goblet Squat 3×12, Cross-Leg Rev Crunch 3×30, DB Chest Press 3×12, DB Walking Lunge 3×12ea, Forearm Plank max hold, Pull-ups 3×3-6, Sit-ups 3×30
- Level 3: Push-up Pyramid 1-14-1, 1½ Goblet Squat 3×12, 1-Arm Plank, DB Chest Press 3-sec neg 3×12, Goblet Drop Lunge 3×12ea, Hollow Body Rock 3×12, Pull-ups 3×5-8, Sit-ups 3×40
Aerobic: Wks 1-4 same as Bodyweight | Wks 7-11 same intervals | Wk 12: Mock 2-mile or HAMR test

════════════════════════════════
APPENDIX A — COUCH TO 5K / RUN PROGRAMS
════════════════════════════════
COUCH TO 5K (use for Level 1 cardio — 10 weeks):
Wk 1: alt jog/walk every 100-200m for 1mi | Wk 2: 200-300m run/walk segments | Wk 3: 600m run/300m walk ×3 | Wk 4: 800m jog/400m walk ×2-3 | Wk 5: 1200m jog/800m walk then 2mi no-stop | Wk 6: 1600m/400m walk then 2.25mi | Wk 7: 2.5mi vary pace | Wk 8: 2.75mi | Wk 9: 3mi | Wk 10: 3.25mi

2-MILE REMEDIAL PROGRAM (use when cardio is very weak, Appendix A p.A5):
Level I (off 8+ weeks): Walk 20min → 30min over 2 weeks
Level II: Wk1 5min walk/1min run ×5 → Wk2 4/2 → Wk3 3/3 → Wk4 2/4 → Wk5 1/5 → Wk6 1min walk/8min run ×3 → Wk7 1/10 ×2 → Wk8 mock 2-mile

RUN-FOCUSED SPEED WORKOUT (Appendix A Workout 1):
- 1×800m at 7/10 RPE (~10 sec faster than 2-mile goal pace), rest 1:2
- 2×400m (~5-10 sec faster than goal pace), rest 1:2
- 4×200m (≥5 sec faster than goal pace), rest 1:3

════════════════════════════════
APPENDIX C — HAMR 6-WEEK IMPROVEMENT PROGRAM
════════════════════════════════
Use when member selects HAMR as cardio component or score is weak.
3 days/week structure:
Day 1 (Speed): 200m and 400m intervals + 30m sprints
Day 2 (Endurance): Sustained run 20-30min + 100m strides + 200m sprints
Day 3 (Test): HAMR test attempt + 20m sprints

Week-by-week volume:
- Wk 1-2: 4×200m/2×400m/3×30m sprints | 20min run/5-6×100m/2×200m | HAMR test+4×20m
- Wk 3-4: 5×200m/3×400m/3×30m | 25min/6×100m/3×200m | HAMR+5×20m
- Wk 5-6: 6×200m/4×400m/3×30m | 30min/8×100m/4×200m | HAMR+6×20m
Rest: 60s between 200m, 75s between 400m, 30s between 20-30m sprints

════════════════════════════════
APPENDIX B — APPROVED EXERCISE LIBRARY
════════════════════════════════
WARM-UP movements approved by playbook:
4-Way Neck Series, A-Skip, Air Squat, Alt Lateral Lunge, Arm Circles, Bird Dog, Butt Kickers, Calf Raise, Glute Bridge, Hamstring Sweep, Jumping Jacks, Pike Plank Ankle Mobility, Reverse Lunge & Twist, Single-Leg RDL, Spiderman, Swimmers Prone Scap Reach, Vertical Side Hops, Walk-Outs, World's Greatest Stretch

PHYSICAL TRAINING movements (draw from these):
Cardio: Biking, Elliptical, Jogging/Running, Rowing (use Appendix D conversion tables for machine alternatives)
Strength/Bodyweight: Air Squat, Alt V-up, Bear Stance Plank Taps, Cross-Leg Reverse Crunch, Deadbugs, Flutter Kicks, Forearm Plank, Frog Jump, Glute Bridge, Goblet Squat, Hand Release Push-Up, Hollow Body Hold, Mini-Band Monster Walk, Push-Up, Run in Place, Side Hops, Side Plank, Sit-Up, Split Squat, Step Up to Hip Flexion
Gym/Equipment: DB Chest Press, DB Thrusters, DB Alternating Lunge, DB Shoulder Press, Farmer's Carry, KB Swings, Lat Pull-Down, MB Clean to Press, Renegade Row, Rope Face Pull, Rotational MB Throw, Stability Ball Leg Curls, Suitcase Carry, TRX/Inverted Row

RECOVERY movements (use in cool-down):
90/90 Stretch, Chest Stretch, Child's Pose, Cobra/Upward Dog, Figure 4 Stretch, Frog Stretch, Hamstring Stretch, Hip Flexor Stretch, Pigeon, Quad Stretch, Shoulder 90° Rotation, Shoulder Thumbs Rotation, Single Leg Groin, Triceps Stretch

CARDIO TRAINING METHODS (Playbook p.15):
- Interval: 85-95% MHR during work, recover to 50-75% MHR, 1:2 work:rest ratio
- Tempo/Threshold: comfortably hard, ≤85% MHR, sustained 20-32min
- Long Slow Distance (LSD): 55-75% MHR, conversational pace, time on feet
- Fartlek: intuitive pace variation, good for middle weeks

EXERCISE PRESCRIPTION (Playbook p.13 — match goal to rep range):
- Muscular Endurance (PFRA prep): 12+ reps, 2-3 sets, RPE 5.5-6.5, ≤30s rest
- Hypertrophy: 6-12 reps, 3-6 sets, RPE 6.5-8.5, 30-90s rest
- Strength: 3-6 reps, 2-6 sets, RPE >8.5, 2-5min rest
- Power: 1-3 reps, 3-5 sets, RPE 7.5-9, 2-5min rest

LOW-IMPACT ALTERNATIVES (Appendix D — use for injuries or profile):
100m run = 125m row = 125m SkiErg = 250m BikeErg = 8 Assault Bike cals
400m run = 500m row = 500m SkiErg = 1000m BikeErg = 30 Assault Bike cals
1600m run = 2000m row = 2000m SkiErg = 4000m BikeErg = 120 Assault Bike cals

EQUIPMENT (CRITICAL ENFORCEMENT):
${equipment === 'gym' ? `Gym + Bodyweight — member has access to dumbbells, barbells, cables, and machines.
CRITICAL: EVERY non-rest training day MUST include at least ONE gym-specific exercise (e.g., DB Chest Press, Lat Pulldown, Cable Row, Goblet Squat, Leg Press, Romanian Deadlift, DB Shoulder Press, KB Swings).
Across the full week: minimum 3 UNIQUE gym-specific exercises total.
Do NOT rename bodyweight moves as gym exercises (e.g., never call air squat "Goblet Squat" — goblet squat requires a dumbbell or kettlebell).
When equipment=gym, prioritize gym versions FIRST for push, pull, and lower-body categories before using bodyweight.
If any gym exercise appears on a day, that day's "focus" field MUST start with "Gym + Bodyweight — ".` : 'Bodyweight Only — member has no gym access. All exercises must use bodyweight, resistance bands, or items available at home. No gym equipment allowed.'}

WORKOUT TYPES (rotate through these each week — each day must feel DIFFERENT from the others):
- Bodyweight Strength: Focus on lower body and pushing/pulling muscles. MUST include leg exercises every session (squats, lunges, step-ups, calf raises). Do NOT default to push-ups + sit-ups only.
- Metabolic Interval: High-intensity cardio bursts with recovery. Mix running intervals with bodyweight circuits (burpees, jumping jacks, high knees, mountain climbers).
- Hybrid: Full body session combining push-up variations, core, legs, AND cardio. Mirrors PT test structure but adds leg work.

EXERCISE VARIETY — MANDATORY. You MUST draw from ALL of these categories each week, not just push-ups/sit-ups/run:

LOWER BODY (include at least 2 lower body exercises per non-cardio day):
${equipment === 'gym' ? '- Bodyweight: Air squats, jump squats, reverse lunges, forward lunges, lateral lunges, step-ups, calf raises, wall sits, glute bridges, single-leg RDL. Gym: Goblet squats, dumbbell lunges, leg press, hamstring curls, Romanian deadlift, box jumps.' : '- Air squats, jump squats, reverse lunges, forward lunges, lateral lunges, step-ups (use chair/curb), calf raises, wall sits, glute bridges, single-leg RDL, broad jumps'}

CORE (rotate — do NOT use sit-ups every session):
- Sit-ups, forearm plank, side plank, flutter kicks, leg raises, bicycle crunches, dead bugs, bird-dogs, hollow body hold, Russian twists
${equipment === 'gym' ? '- Gym: Cable crunches (kneeling, round back, crunch toward hips), ab wheel rollouts' : ''}

PUSH (rotate push-up variations — never the same two sessions in a row):
- Standard push-ups, diamond push-ups, wide-grip push-ups, decline push-ups, pike push-ups, slow tempo push-ups (3 sec down), explosive push-ups
${equipment === 'gym' ? '- Gym: Dumbbell bench press, dumbbell shoulder press, cable chest fly, incline dumbbell press' : ''}

PULL (include pull work at least twice per week):
${equipment === 'gym' ? '- Gym: Lat pulldown, seated cable row, dumbbell row, face pulls, band pull-aparts, inverted rows. Do NOT include pull-ups — use lat pulldown instead.' : '- Inverted rows (use a sturdy table), resistance band rows, band pull-aparts, doorframe rows. No pull-ups unless member specifically requests them.'}

CARDIO VARIETY (rotate — do NOT use the same run format every cardio day):
- 400m intervals (speed), 800m intervals (threshold), tempo run (comfortably hard), easy long slow run, fartlek (mix fast/slow), hill repeats
${equipment === 'gym' ? '- Gym: Rowing machine intervals, stationary bike sprints, treadmill incline walk' : ''}

METABOLIC CIRCUITS (use on interval days for variety):
- Burpees, jumping jacks, high knees, mountain climbers, squat jumps, lateral shuffles, box step-overs

PLAYBOOK TRAINING PRINCIPLES:
- Three-phased: Warm-up (10-15 min) → Main workout (30-40 min) → Cool-down (10-15 min).
- FOSI (Form Over Speed and Intensity): Note proper form cues in exercise notes.
- Progressive Overload: Aim for 5-10% increase per week (use reps_add_per_week of 1-2).
- Muscular Endurance focus for PFA prep: RPE 5.5-6.5, sets of 15-30 reps.
- Recovery days: Include active recovery (brisk walk, foam rolling, dynamic stretching).
- REP RANGE GUIDANCE (match to exercise type and goal):
  * PFRA event training (push-ups, sit-ups, run): Muscular Endurance — 12+ reps, 2-3 sets, short rest
  * Accessory gym lifts (goblet squat, dumbbell press, Romanian deadlift, lat pulldown): STRENGTH — 3-5 reps, 3-5 sets, 2-3 min rest, ~80-85% 1RM. Do NOT use 12-14 reps for these.
  * Hypertrophy accessories (lunges, rows, shoulder press): 6-10 reps, 3-4 sets, 60-90s rest
  * Suggest intensity as % of 1RM in notes where applicable — e.g. "~80% 1RM controlled descent"

WEEKLY ROTATION — each training day must have a DIFFERENT primary focus:
For ${daysPerWeek} training days:
- 3 days: Upper Body Strength / Cardio Intervals / Full Body Hybrid
- 4 days: Upper Body / Cardio Intervals / Lower Body + Core / Full Body Hybrid
- 5 days: Upper Body / Cardio Intervals / Lower Body + Core / Full Body Hybrid / Metabolic Circuit
- 6 days: Upper / Cardio / Lower + Core / Hybrid / Metabolic / Active Recovery

COMPONENT-SPECIFIC GUIDANCE:
- Push-ups: Current max is ${s.puEx?'EXEMPT':s.puDetail}. 
  * base_reps per set = 40-50% of current max (NOT 80%) — this is endurance training, not max effort
  * Example: 46 max HR push-ups → start at 18-20 reps per set, 4-5 sets, 45s rest
  * reps_add_per_week: 1-2 reps per set per week maximum
  * reps_max: never exceed 30 reps per set for push-ups (do more sets instead)
  * Use push-up variations: standard, diamond, wide-grip, decline to build different muscles
- Core: Current is ${s.coreEx?'EXEMPT':s.coreDetail}.
  * Same principle: 40-50% of current max per set
  * Example: 60 max sit-ups → start at 25-30 reps per set, 3-4 sets, 45s rest  
  * reps_max: never exceed 35 reps per set for sit-ups (do more sets instead)
  * Mix in planks (30-60 sec holds), flutter kicks, leg raises for variety
- Cardio: Current is ${s.cardioEx?'EXEMPT':s.cardioDetail}.
  * Interval: 4-6 x 400m at hard effort, 90s rest between
  * Tempo: 1.5-2mi at comfortably hard pace (not a sprint)
  * LSD: Easy 2-3mi at conversational pace (55-75% MHR)
  * RUN PROGRESSION — use base_reps + reps_add_per_week to auto-progress. Easy run: base_reps=1.5 mi, add 0.1/wk, max 3.0. Tempo: base_reps=1.5, add 0.1/wk, max 2.5. Intervals: base_sets=4, base_reps=400m, reps_add_per_week=0 (add a set per phase instead). Never exceed 3mi total on a single day for Level 1-2.

JSON schema (follow exactly):
{
  "plan_name": "string",
  "total_weeks": ${totalWeeks},
  "phases": [
    {"name": "Phase 1: Base", "start_week": 1, "end_week": ${Math.ceil(totalWeeks/2)}, "goal": "Build foundation per playbook Level ${tier}"},
    {"name": "Phase 2: Peak", "start_week": ${Math.ceil(totalWeeks/2)+1}, "end_week": ${totalWeeks}, "goal": "Maximize PFA score"}
  ],
  "phase_templates": {
    "phase1": { "week_template": [
    {
      "day_of_week": 1,
      "label": "Monday",
      "focus": "Upper Body Strength — Push + Pull + Core",
      "session_purpose": "Build push-up and pull endurance targeting all upper body components tested on the PFRA.",
      "is_rest": false,
      "warmup": [
        {"name": "Arm Rotations", "reps_display": "10 ea direction"},
        {"name": "Walk-Outs", "reps_display": "10 reps"},
        {"name": "World's Greatest Stretch", "reps_display": "5 ea side"},
        {"name": "Bird Dog", "reps_display": "10 ea side"},
        {"name": "Jumping Jacks", "reps_display": "20 reps"},
        {"name": "Butt Kicks", "reps_display": "10 yds"},
        {"name": "High Knees", "reps_display": "10 yds"}
      ],
      "exercises": [
        {"category": "pushups", "name": "Standard Push-ups", "base_sets": 4, "base_reps": 15, "reps_unit": "reps", "reps_add_per_week": 1, "reps_max": 28, "rest_seconds": 45, "notes": "chest to ground full ROM"},
        {"category": "pushups", "name": "Diamond Push-ups", "base_sets": 3, "base_reps": 8, "reps_unit": "reps", "reps_add_per_week": 1, "reps_max": 20, "rest_seconds": 60, "notes": "tricep focus elbows tucked"},
        {"category": "pull", "name": "Inverted Row", "base_sets": 3, "base_reps": 10, "reps_unit": "reps", "reps_add_per_week": 1, "reps_max": 20, "rest_seconds": 45, "notes": "chest to bar squeeze back"},
        {"category": "core", "name": "Flutter Kicks", "base_sets": 3, "base_reps": 20, "reps_unit": "reps", "reps_add_per_week": 2, "reps_max": 40, "rest_seconds": 30, "notes": "lower back flat on ground"},
        {"category": "core", "name": "Forearm Plank", "base_sets": 3, "base_reps": 30, "reps_unit": "sec", "reps_add_per_week": 5, "reps_max": 90, "rest_seconds": 30, "notes": "flat back neutral spine"}
      ],
      "cooldown": [
        {"name": "Shoulder Stretch", "hold": "20 sec ea arm"},
        {"name": "Triceps Stretch", "hold": "20 sec ea arm"},
        {"name": "Chest Stretch", "hold": "20 sec"},
        {"name": "Child's Pose", "hold": "30 sec"},
        {"name": "90/90 Stretch", "hold": "20 sec ea side"}
      ]
    },
    {"day_of_week": 2, "label": "Tuesday", "focus": "Active Recovery", "session_purpose": "Light movement to flush soreness and prepare for next session.", "is_rest": true, "warmup": [], "exercises": [], "cooldown": []},
    {
      "day_of_week": 3,
      "label": "Wednesday",
      "focus": "Cardio Intervals — Speed Work",
      "session_purpose": "Develop speed and aerobic capacity for the 2-mile run through structured intervals at goal pace.",
      "is_rest": false,
      "warmup": [
        {"name": "Walking Knee Hugs", "reps_display": "10 yds"},
        {"name": "Straight Leg Kicks", "reps_display": "10 yds"},
        {"name": "Lateral Shuffle", "reps_display": "20 yds"},
        {"name": "High Knees", "reps_display": "10 yds + jog back"},
        {"name": "Butt Kicks", "reps_display": "10 yds + jog back"},
        {"name": "Forward Pogo Hops", "reps_display": "10 yds + jog back"},
        {"name": "Progressive Striders", "reps_display": "2 × 40 yds"}
      ],
      "exercises": [
        {"category": "cardio", "name": "Run Intervals", "base_sets": 4, "base_reps": 400, "reps_unit": "m", "reps_add_per_week": 0, "reps_max": 400, "rest_seconds": 90, "notes": "85-95% effort at goal pace"},
        {"category": "lower", "name": "Calf Raises", "base_sets": 3, "base_reps": 20, "reps_unit": "reps", "reps_add_per_week": 2, "reps_max": 40, "rest_seconds": 30, "notes": "full range pause at top"},
        {"category": "cardio", "name": "Easy Cool-down Jog", "base_sets": 1, "base_reps": 0.5, "reps_unit": "mi", "reps_add_per_week": 0, "reps_max": 0.5, "rest_seconds": 0, "notes": "conversational pace cool down"}
      ],
      "cooldown": [
        {"name": "Walk 1 lap", "hold": "~3 min"},
        {"name": "Quad Stretch", "hold": "20 sec ea leg"},
        {"name": "Standing Hamstring Stretch", "hold": "20 sec ea leg"},
        {"name": "Standing Calf Stretch", "hold": "20 sec ea leg"},
        {"name": "Kneeling Hip Flexor Stretch", "hold": "20 sec ea side"}
      ]
    },
    {"day_of_week": 4, "label": "Thursday", "focus": "Active Recovery", "session_purpose": "Foam rolling, mobility, and hydration to prepare for Friday.", "is_rest": true, "warmup": [], "exercises": [], "cooldown": []},
    {
      "day_of_week": 5,
      "label": "Friday",
      "focus": "Full Body Hybrid — Legs + Push + Core + Cardio",
      "session_purpose": "Full body conditioning combining lower body, push endurance, core stability, and a tempo cardio finish.",
      "is_rest": false,
      "warmup": [
        {"name": "Glute Bridge", "reps_display": "10 reps"},
        {"name": "Bird Dog", "reps_display": "10 ea side"},
        {"name": "Air Squats", "reps_display": "10 reps"},
        {"name": "Reverse Lunge & Twist", "reps_display": "10 ea side"},
        {"name": "Vertical Side Hops", "reps_display": "10 reps"},
        {"name": "Butt Kicks", "reps_display": "10 yds"},
        {"name": "Calf Raise / Dorsi-Flex", "reps_display": "10 reps"}
      ],
      "exercises": [
        {"category": "lower", "name": "Reverse Lunges", "base_sets": 3, "base_reps": 12, "reps_unit": "reps", "reps_add_per_week": 1, "reps_max": 20, "rest_seconds": 45, "notes": "each leg step back controlled"},
        {"category": "pushups", "name": "Wide-grip Push-ups", "base_sets": 3, "base_reps": 12, "reps_unit": "reps", "reps_add_per_week": 1, "reps_max": 25, "rest_seconds": 45, "notes": "chest focus wide hand placement"},
        {"category": "core", "name": "Leg Raises", "base_sets": 3, "base_reps": 15, "reps_unit": "reps", "reps_add_per_week": 1, "reps_max": 25, "rest_seconds": 30, "notes": "lower back pressed to floor"},
        {"category": "cardio", "name": "Tempo Run", "base_sets": 1, "base_reps": 1.5, "reps_unit": "mi", "reps_add_per_week": 0.1, "reps_max": 2.5, "rest_seconds": 0, "notes": "comfortably hard not a sprint"}
      ],
      "cooldown": [
        {"name": "Hamstring Stretch", "hold": "20 sec ea side"},
        {"name": "Hip Flexor Stretch", "hold": "20 sec ea side"},
        {"name": "Figure 4 Stretch", "hold": "20 sec ea side"},
        {"name": "Frog Stretch", "hold": "20 sec"},
        {"name": "Cobra / Upward Dog", "hold": "20 sec"}
      ]
    },
    {"day_of_week": 6, "label": "Saturday", "focus": "Active Recovery or Rest", "session_purpose": "Optional light walk or full rest.", "is_rest": true, "warmup": [], "exercises": [], "cooldown": []},
    {"day_of_week": 7, "label": "Sunday", "focus": "Rest", "session_purpose": "Full rest and recovery.", "is_rest": true, "warmup": [], "exercises": [], "cooldown": []}
    ]
    },
    "phase2": { "week_template": [
      /* PHASE 2 — MUST swap at least 2 exercises per non-rest day vs phase1. New push-up variation, new core movement, new lower-body movement. Different session_purpose referencing "Phase 2 focus shifts to..." */
      /* Include all 7 day objects with is_rest matching phase1 exactly */
    ] }
  }
}

RULES:
1. week_template must have exactly 7 objects (day_of_week 1-7). Each non-rest day MUST include:
   - "session_purpose": 1 sentence describing the goal of this session
   - "warmup": array of 5-8 {name, reps_display} drills drawn from the Appendix H/B warm-up library
   - "exercises": the main work (3-6 exercises)
   - "cooldown": array of 4-6 {name, hold} stretches drawn from the Appendix B/H recovery library
   Rest days: warmup/exercises/cooldown are empty arrays []
2. CRITICAL: Exactly ${daysPerWeek} training days (is_rest: false) and ${7 - daysPerWeek} rest days (is_rest: true) in EACH phase template. Count is_rest:false flags before outputting — must equal exactly ${daysPerWeek}. Examples: daysPerWeek=3 → 3 training days. daysPerWeek=5 → 5 training days. daysPerWeek=6 → 6 training days (follow 6-day schedule above). This is NON-NEGOTIABLE — do NOT default to 4 or 5 training days regardless of other instructions.
3. Every non-rest day must have 3-5 exercises — never fewer than 3
4. Rotate workout types: Bodyweight → Metabolic Interval → Hybrid each week
5. base_reps is always a NUMBER. reps_unit: reps, sec, mi, m, or shuttles
6. NEVER use reps_unit sec on jumping jacks, high knees, or burpees — use reps
6b. For interval runs, NEVER put the distance in the exercise name — use generic names like "Run Intervals" or "Speed Intervals". The distance is shown automatically from base_reps. Example: name="Run Intervals", base_reps=400, reps_unit="m" displays as "4 × 400m · 90s rest"
7. notes: form cue ONLY — plain text, no quotes, max 6 words, NEVER mention week numbers or future progressions
8. No trailing commas anywhere
9a. VARIETY IS MANDATORY — across the full week you MUST include:
    - At least 2 different lower body exercises (squats, lunges, calf raises, glute bridges, etc.)
    - At least 2 different core exercises (NOT just sit-ups — include flutter kicks, leg raises, planks, bird-dogs, etc.)
    - At least 2 different push-up variations (standard, diamond, wide-grip, decline, pike, etc.)
    - At least 1 pulling exercise per week
    - At least 2 different cardio formats (intervals vs tempo vs easy run — NOT the same format twice)
9b. NEVER repeat the exact same exercise on consecutive training days
9c. CRITICAL: equipment=gym → EVERY training day must contain at least 1 true gym exercise (DB, cable, machine, or barbell). Minimum 3 UNIQUE gym exercises per week total. Goblet squat requires a DB/KB. Lat pulldown requires a machine. Do NOT rename bodyweight moves as gym exercises. Failure to include gym exercises on gym days violates playbook compliance.
9d. FOCUS FIELD LABELING: If ANY gym equipment exercises appear in the session, the focus field MUST start with "Gym + Bodyweight" not "Bodyweight". Bodyweight-only sessions use "Bodyweight". Example: "Gym + Bodyweight — Upper Body Strength / Push + Pull + Core / Cool-down 10min"
9. CRITICAL REP CALIBRATION — follow this exactly:
   - Push-up base_reps per set = 40-50% of current max, NEVER more than 30 reps per set
   - Sit-up base_reps per set = 40-50% of current max, NEVER more than 35 reps per set  
   - Plank base_reps = 20-40 sec to start, add 5 sec/week, max 90 sec
   - Run distances: use reps_add_per_week to progress automatically. Easy run base 1.5mi +0.1/wk max 3mi. Tempo base 1.5mi +0.1/wk max 2.5mi. Intervals use meters (base_reps=400, reps_unit="m"). NEVER write week numbers in notes.
   - If member has high scores (46 push-ups), use MORE sets at moderate reps — NOT fewer sets at near-max reps
   - Total push-up volume per session should not exceed 100 reps for Level 1, 150 for Level 2, 200 for Level 3
10. PROGRESSIVE OVERLOAD — Use reps_add_per_week to progressively increase load within each phase automatically. The app calculates correct reps/distance for each week. NEVER describe future weeks in notes — notes are form cues only, max 6 words. Thursday's exercises MUST be different from Monday's.
10b. PHASE 2 EXERCISE ROTATION (MANDATORY — enforced by separate phase_templates) — Phase 2 week_template MUST use different exercises from Phase 1 on the same days. For example: Monday Phase 1 might use Standard Push-ups + Flutter Kicks, while Monday Phase 2 uses Decline Push-ups + Hollow Body Hold. Use the phase_overrides field to specify exercise substitutions for Phase 2:
  - Swap at least 2 exercises per day between phases
  - Introduce at least 1 new exercise per week that wasn't in the previous week
  - Push-up variations must cycle: never repeat the same variation more than 2 weeks in a row
  - Core exercises must rotate weekly: sit-ups → flutter kicks → leg raises → dead bugs → hollow body → bicycle crunches
  - Lower body must vary: squats one week, lunges next, step-ups after, glute bridges, single-leg RDL, etc.
  - Label phase changes clearly in session_purpose: "Phase 2 focus shifts to..."
11. Final week (week ${totalWeeks}): reduce sets and reps by 30% as deload before 3-day taper
12. Focus field: short label only — e.g. "Upper Body Strength — Push + Pull + Core" (no "Warm-up Xmin / Cool-down Xmin" — those are shown as separate sections)
13. Warmup drills must match the session type: strength days use the standard 14-drill dynamic warm-up; cardio/run days use the run-specific warm-up (Knee Hugs, Frankensteins, Striders); hybrid days combine both. Choose 5-8 drills appropriate to the day.
14. Cooldown stretches must match muscles worked: push days include shoulder/chest/triceps; leg days include quad/hamstring/hip flexor/calf; cardio days include quad/hamstring/calf/hip flexor`;




}


// Load remembered key on startup
const PROXY_URL = 'https://groq-proxy.simpson-sean-h.workers.dev';
// API key is handled server-side via Cloudflare Worker proxy
(function() {
  try {
    const saved = window.appStore?.readText('af_pt_groq_key');
    window.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('geminiKey');
      if(el) el.placeholder = 'No key needed — handled securely';
    });
  } catch(e) {}
})();

async function generatePlan() {
  if(navigator.vibrate) navigator.vibrate(40);
  if(!lastScore) {
    showErrEl('Calculate a score first on the Calculator tab.');
    return;
  }
  // API key is handled securely via server-side proxy

  const errEl  = document.getElementById('ai-error');
  const resultEl = document.getElementById('ai-result');
  const outputEl = document.getElementById('ai-output');
  const btn    = document.getElementById('genBtn');
  errEl.style.display = 'none';
  document.getElementById('ai-plan-ready').style.display = 'none';
  document.getElementById('ai-parse-error').style.display = 'none';
  outputEl.style.display = 'none';
  outputEl.textContent = '';
  document.getElementById('ai-result-title').textContent = 'Generating...';
  resultEl.style.display = 'block';
  resultEl.scrollIntoView({behavior:'smooth'});
  btn.disabled = true;

  const prompt = buildAIPrompt();
  // Non-streaming generateContent — cleaner JSON, no chunk boundary corruption
  // Groq OpenAI-compatible API — faster, more generous free tier
  const MODELS = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];

  async function tryModel(model) {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [{role: 'user', content: prompt}],
        max_tokens: 8192,
        temperature: 0.0,
        response_format: {type: 'json_object'}
      })
    });
    if(res.status === 429) throw Object.assign(new Error('Rate limit hit — retrying...'), {code:429});
    if(res.status === 403) throw new Error('Access denied — open ptreadiness.app to generate plans.');
    if(!res.ok) {
      let msg = 'API error ' + res.status;
      try { const d = await res.json(); msg = d.error?.message || msg; } catch(e) {}
      throw new Error(msg);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if(!text) throw new Error('Empty response from model.');
    return text;
  }

  // Animated waiting dots so the user knows it's working
  let dotInterval = setInterval(() => {
    const dots = btn.textContent.match(/\.+$/)?.[0] || '';
    const base  = btn.textContent.replace(/\.+$/, '');
    btn.textContent = base + (dots.length >= 3 ? '.' : dots + '.');
  }, 500);

  try {
    let fullText = '', usedModel = '';
    for(const model of MODELS) {
      try {
        btn.textContent = `⚡ Generating (${model})`;
        fullText = await tryModel(model);
        usedModel = model;
        break;
      } catch(e) {
        if(e.code === 429 && model !== MODELS[MODELS.length-1]) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        throw e;
      }
    }
    clearInterval(dotInterval);
    if(!fullText) throw new Error('All models rate limited. Wait a minute and try again.');
    outputEl.textContent = fullText;

    // Parse with progressive fallback strategy
    document.getElementById('ai-result-title').textContent = 'Parsing...';
    let planData;

    function cleanRaw(raw) {
      let s = raw.trim()
        .replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'');
      // Remove control chars using safe codepoint checks
      s = s.split('').filter(function(c){var n=c.charCodeAt(0);return n>=32||n===9||n===10||n===13;}).join('');
      const fb = s.indexOf('{'), lb = s.lastIndexOf('}');
      return (fb !== -1 && lb !== -1) ? s.slice(fb, lb+1) : s;
    }

    function fixCommas(s) {
      // Remove trailing commas before ] or }
      return s.replace(/,(\s*[}\]])/g, '$1');
    }

    function fixQuotes(s) {
      // Walk char by char fixing unescaped double-quotes inside string values
      let out = '', inStr = false;
      for(let i = 0; i < s.length; i++) {
        const c = s[i];
        if(!inStr) {
          if(c === '"') inStr = true;
          out += c;
        } else {
          if(c === '\\') { out += c + (s[++i]||''); }
          else if(c === '"') {
            // Look ahead past whitespace
            let j = i+1;
            while(j < s.length && ' \t\r\n'.includes(s[j])) j++;
            const nxt = s[j];
            if(':,}]'.includes(nxt) || j >= s.length) { inStr = false; out += c; }
            else { out += '\\"'; } // escape it
          } else { out += c; }
        }
      }
      return out;
    }

    function tryParse(raw) {
      let s = cleanRaw(raw);
      // Attempt 1: clean parse
      try { return JSON.parse(s); } catch(e) {}
      // Attempt 2: fix trailing commas only
      try { return JSON.parse(fixCommas(s)); } catch(e) {}
      // Attempt 3: fix unescaped quotes
      try { return JSON.parse(fixQuotes(s)); } catch(e) {}
      // Attempt 4: both fixes
      try { return JSON.parse(fixCommas(fixQuotes(s))); } catch(e) {}
      // Attempt 5: nuke all backslashes then reparse (lossy but recoverable)
      try { return JSON.parse(fixCommas(s.replace(/\\/g, ''))); } catch(e) {}
      // Attempt 6: extract individual complete day objects even if array is truncated
      const wtStart = s.indexOf('"week_template"');
      if(wtStart !== -1) {
        const arrStart = s.indexOf('[', wtStart);
        if(arrStart !== -1) {
          const days = [];
          let ei = arrStart+1, edepth = 0, objStart = -1;
          while(ei < s.length) {
            const c = s[ei];
            if(c === '{') { if(edepth === 0) objStart = ei; edepth++; }
            else if(c === '}') {
              edepth--;
              if(edepth === 0 && objStart !== -1) {
                try {
                  const d = JSON.parse(fixCommas(fixQuotes(s.slice(objStart, ei+1))));
                  if(d.day_of_week) days.push(d);
                } catch(ex) {}
                objStart = -1;
              }
            }
            ei++;
          }
          if(days.length > 0) {
            const nm = s.match(/"plan_name"\s*:\s*"([^"]+)"/);
            const tw = s.match(/"total_weeks"\s*:\s*(\d+)/);
            return {
              plan_name: nm?nm[1]:'Training Plan',
              total_weeks: tw?parseInt(tw[1]):8,
              week_template: days,
              phases: [], _partial: true
            };
          }
        }
      }
      return null;
    }

    planData = tryParse(fullText);

    // Normalize phase_templates → week_template for app compatibility
    // If AI returns phase_templates, flatten into week_template (phase1) and store phase2 separately
    if(planData && planData.phase_templates) {
      const p1 = planData.phase_templates.phase1?.week_template;
      const p2 = planData.phase_templates.phase2?.week_template;
      if(p1 && Array.isArray(p1)) {
        planData.week_template = p1;
        if(p2 && Array.isArray(p2)) {
          planData.week_template_phase2 = p2;
        }
      }
    }

    if(!planData) {
      document.getElementById('ai-result-title').textContent = 'Parse Failed';
      document.getElementById('ai-parse-error-msg').textContent =
        'Could not parse plan — tap Retry to regenerate.';
      document.getElementById('ai-parse-error').style.display = 'block';
      outputEl.style.display = 'block';
      btn.disabled = false; btn.innerHTML = '&#9889; Generate My Workout Plan';
      return;
    }

    if(planData._partial) {
      document.getElementById('ai-parse-status').textContent =
        '⚠ Partial parse — phases/targets unavailable but workout days loaded.';
    }


    if(!planData.week_template || !Array.isArray(planData.week_template)) {
      throw new Error('Plan is missing week_template array.');
    }

    currentPlanData = planData;
    currentWeek = 1;
    currentDayOfWeek = 1;
    currentChecked = {};
    try {
      window.appStore?.writeJSON(window.appStore.keys.activePlan, planData);
      window.appStore?.removeStorageKey(window.appStore.keys.planChecked);
    } catch(e) {}

    const trainDays = planData.week_template.filter(d=>!d.is_rest).length;
    document.getElementById('ai-result-title').textContent = 'Plan Ready!';
    document.getElementById('ai-plan-summary').textContent =
      planData.total_weeks + ' weeks · ' + trainDays + ' training days/week · ' + (planData.phases?.length||0) + ' phases';
    document.getElementById('ai-plan-ready').style.display = 'block';
    showToast('Plan generated with ' + usedModel + '!');

  } catch(e) {
    resultEl.style.display = 'none';
    const msg = e.message || String(e);
    const isRL = msg.toLowerCase().includes('rate') || msg.includes('429');
    errEl.innerHTML = '❌ ' + msg + (isRL
      ? ' <button onclick="generatePlan()" style="margin-left:10px;background:var(--surface2);color:var(--accent);border:1px solid var(--accent);padding:4px 12px;border-radius:3px;cursor:pointer;font-size:11px;">↺ Retry</button>'
      : '');
    errEl.style.display = 'block';
  } finally {
    clearInterval(dotInterval);
    btn.disabled = false;
    btn.innerHTML = '&#9889; Generate My Workout Plan';
  }
}

function showErrEl(msg) {
  const el = document.getElementById('ai-error');
  el.textContent = msg;
  el.style.display = 'block';
}


function downloadPlan() {
  const text = document.getElementById('ai-output').textContent;
  if(!text) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type:'text/plain'}));
  a.download = 'usaf_pt_workout_plan.txt';
  a.click();
}


// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// PLAN VIEWER + PROGRESSION ENGINE
// ════════════════════════════════════════════════════════
let currentPlanData  = initialState.currentPlanData || null;
let currentWeek      = 1;
let currentDayOfWeek = 1;  // 1=Mon...7=Sun
let currentChecked   = initialState.currentChecked || {};

// Timer state
let timerInterval = null;
let timerSeconds  = 0;
let timerTotal    = 0;
let timerPaused   = false;
let timerDeadline = 0;
let timerLabel    = '';

// ── Progression engine ────────────────────────────────
function getPhaseForWeek(week) {
  if(!currentPlanData?.phases) return null;
  return currentPlanData.phases.find(p => week >= p.start_week && week <= p.end_week) || null;
}

function computeExercise(ex, week, totalWeeks) {
  const isTaper  = (week === totalWeeks) && totalWeeks > 1;
  const taperMult = 0.7;

  let sets = ex.base_sets || 3;
  let reps = ex.base_reps || 10;

  // Apply weekly reps progression
  const repsAdd = ex.reps_add_per_week || 0;
  reps = reps + repsAdd * (week - 1);
  if(ex.reps_max) reps = Math.min(reps, ex.reps_max);

  // Taper final week
  if(isTaper) {
    sets = Math.max(1, Math.round(sets * taperMult));
    reps = Math.max(1, Math.round(reps * taperMult));
  }

  // Format display string
  const unit = ex.reps_unit || 'reps';
  let repsDisplay;
  if(unit === 'sec')           repsDisplay = reps + ' sec hold';
  else if(unit === 'mi')       repsDisplay = Number(reps).toFixed(1) + ' mi';
  else if(unit === 'shuttles') repsDisplay = reps + ' shuttles';
  else if(unit === 'm')        repsDisplay = reps + 'm';
  else                         repsDisplay = reps + ' reps';

  // For cardio single-effort (sets=1, no meaningful set count), flatten display
  const isCardioSingle = (ex.category === 'cardio' && sets === 1);

  return { ...ex, computed_sets: sets, computed_reps: reps, reps_display: repsDisplay, is_cardio_single: isCardioSingle };
}

// ── Saved plan loader ─────────────────────────────────
(function loadSavedPlan() {
  try {
    const saved = JSON.stringify(window.appStore?.readJSON(window.appStore.keys.activePlan, null));
    if(saved) {
      currentPlanData = JSON.parse(saved);
      const savedChecked = JSON.stringify(window.appStore?.readJSON(window.appStore.keys.planChecked, {}));
      if(savedChecked) currentChecked = JSON.parse(savedChecked);
    }
  } catch(e) {}
})();

function activatePlan() {
  if(!currentPlanData) return;
  currentWeek = 1;
  currentDayOfWeek = 1;
  document.getElementById('no-plan-msg').style.display = 'none';
  document.getElementById('my-plan-section').style.display = 'block';
  buildWeekDayDropdowns();
  renderPlanOverview();
  // Jump to first incomplete training day
  restoreCurrentPosition();
  loadPlanDay();
  showToast('Plan loaded — select Week & Day to begin!');
  // Auto switch to log tab
  const logTab = document.querySelector('.tab:nth-child(3)');
  if(logTab) switchTab('log', logTab);
}

function restoreCurrentPosition() {
  // Find the first week/day combo not yet marked done
  const totalWeeks = currentPlanData.total_weeks || 1;
  for(let w = 1; w <= totalWeeks; w++) {
    for(const tmpl of (currentPlanData.week_template||[])) {
      if(tmpl.is_rest) continue;
      if(!currentChecked['w'+w+'_d'+tmpl.day_of_week+'_done']) {
        currentWeek = w;
        currentDayOfWeek = tmpl.day_of_week;
        document.getElementById('plan-week-select').value = w;
        document.getElementById('plan-day-select').value = tmpl.day_of_week;
        return;
      }
    }
  }
  // All done — stay at last
  currentWeek = totalWeeks;
}

function buildWeekDayDropdowns() {
  if(!currentPlanData) return;
  const totalWeeks = currentPlanData.total_weeks || 1;

  // Week dropdown
  const wSel = document.getElementById('plan-week-select');
  wSel.innerHTML = '';
  const phases = currentPlanData.phases || [];
  for(let w = 1; w <= totalWeeks; w++) {
    const ph = getPhaseForWeek(w);
    const doneCount = (currentPlanData.week_template||[])
      .filter(d=>!d.is_rest && currentChecked['w'+w+'_d'+d.day_of_week+'_done']).length;
    const trainCount = (currentPlanData.week_template||[]).filter(d=>!d.is_rest).length;
    const allDone = trainCount > 0 && doneCount === trainCount;
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = (allDone?'✓ ':'') + 'Week ' + w + (ph ? ' · ' + ph.name : '') + ' (' + doneCount + '/' + trainCount + ')';
    wSel.appendChild(opt);
  }
  wSel.value = currentWeek;

  // Day dropdown
  buildDayDropdown();
}

function buildDayDropdown() {
  if(!currentPlanData) return;
  const dSel = document.getElementById('plan-day-select');
  dSel.innerHTML = '';
  (currentPlanData.week_template||[]).forEach(tmpl => {
    const isDone = currentChecked['w'+currentWeek+'_d'+tmpl.day_of_week+'_done'];
    const opt = document.createElement('option');
    opt.value = tmpl.day_of_week;
    opt.textContent = (isDone?'✓ ':'')+tmpl.label+' · '+(tmpl.is_rest?'Rest':tmpl.focus);
    dSel.appendChild(opt);
  });
  dSel.value = currentDayOfWeek;
}

function onWeekChange() {
  currentWeek = parseInt(document.getElementById('plan-week-select').value);
  buildDayDropdown();
  loadPlanDay();
  renderPlanOverview();
}

function onDayChange() {
  currentDayOfWeek = parseInt(document.getElementById('plan-day-select').value);
  loadPlanDay();
}

function loadPlanDay() {
  if(!currentPlanData) return;
    // Use phase2 template in second half of plan if available
  const totalWks = currentPlanData.total_weeks || 8;
  const usePhase2 = currentPlanData.week_template_phase2 && currentWeek > Math.ceil(totalWks / 2);
  const activeTemplate = usePhase2 ? currentPlanData.week_template_phase2 : (currentPlanData.week_template || []);
  const tmpl = activeTemplate.find(d=>d.day_of_week===currentDayOfWeek);
  if(!tmpl) return;
  const isDone = currentChecked['w'+currentWeek+'_d'+currentDayOfWeek+'_done'];
  const phase = getPhaseForWeek(currentWeek);
  const totalWeeks = currentPlanData.total_weeks || 1;

  // Header
  document.getElementById('plan-day-header').innerHTML =
    '<div class="plan-day-header">' +
    'Week ' + currentWeek + ' · ' + tmpl.label +
    (phase ? ' <span class="plan-phase-badge">' + phase.name + '</span>' : '') +
    (isDone ? ' <span class="day-done-badge">&#10003; COMPLETE</span>' : '') +
    '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:4px;">' + (tmpl.focus||'') + '</div>';

  const listEl = document.getElementById('plan-exercise-list');

  if(tmpl.is_rest) {
    listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:14px;">&#128164; Rest Day — Light stretching, hydration, recovery walk.</div>';
    updatePlanProgress(0, 0);
    return;
  }

  if(!tmpl.exercises || tmpl.exercises.length === 0) {
    listEl.innerHTML = '<div style="color:var(--muted);font-size:13px;">No exercises for this day.</div>';
    return;
  }

  listEl.innerHTML = '';
  const checkPrefix = 'w'+currentWeek+'_d'+currentDayOfWeek;

  // ── helper: build a main exercise item ────────────────────────────────────
  function buildExItem(rawEx, ei) {
    const ex = computeExercise(rawEx, currentWeek, totalWeeks);
    const checkKey = checkPrefix + '_ex_' + ei;
    const checked  = !!currentChecked[checkKey];

    let setsLine;
    if(ex.is_cardio_single) {
      setsLine = ex.reps_display + (ex.rest_seconds ? ' · ' + ex.rest_seconds + 's rest' : '');
    } else if(ex.reps_unit === 'm') {
      setsLine = ex.computed_sets + ' × ' + ex.reps_display + (ex.rest_seconds ? ' · ' + ex.rest_seconds + 's rest' : '');
    } else if(ex.computed_sets > 1) {
      setsLine = ex.computed_sets + ' sets × ' + ex.reps_display + (ex.rest_seconds ? ' · ' + ex.rest_seconds + 's rest' : '');
    } else {
      setsLine = ex.reps_display;
    }

    const repsAdd = rawEx.reps_add_per_week || 0;
    let progBadge = '';
    if(currentWeek > 1 && repsAdd > 0) {
      const wk1Reps = rawEx.base_reps || 0;
      const actualDiff = ex.computed_reps - wk1Reps;
      if(actualDiff > 0)      progBadge = '<span style="font-size:10px;color:var(--green);margin-left:6px;">+' + actualDiff + ' vs wk1</span>';
      else if(actualDiff < 0) progBadge = '<span style="font-size:10px;color:var(--accent);margin-left:6px;">↓ deload</span>';
    }

    const item = document.createElement('div');
    item.className = 'ex-item';

    const chkEl = document.createElement('div');
    chkEl.className = 'ex-check' + (checked ? ' done' : '');
    chkEl.id = 'chk-' + ei;
    chkEl.addEventListener('click', () => toggleExercise(ei));

    const bodyEl = document.createElement('div');
    bodyEl.className = 'ex-body';

    const nameEl = document.createElement('div');
    nameEl.className = 'ex-name';
    if(checked) nameEl.style.cssText = 'text-decoration:line-through;opacity:0.45;';
    let displayName = ex.name || '';
    if(ex.reps_unit === 'm') displayName = displayName.replace(/^\d+\s*m\s+/i, '').trim() || displayName;
    nameEl.innerHTML = displayName + progBadge;

    const detailEl = document.createElement('div');
    detailEl.className = 'ex-detail';
    detailEl.innerHTML = setsLine + (ex.notes ? ' · <em>' + ex.notes + '</em>' : '');

    const actionsEl = document.createElement('div');
    actionsEl.className = 'ex-actions';

    if(ex.rest_seconds > 0) {
      const restBtn = document.createElement('button');
      restBtn.className = 'timer-btn';
      restBtn.innerHTML = '&#9201; ' + ex.rest_seconds + 's Rest';
      restBtn.addEventListener('click', () => startTimer(ex.rest_seconds, 'Rest', ex.computed_sets));
      actionsEl.appendChild(restBtn);
    }
    const secIdx = String(ex.reps_display).toLowerCase().indexOf('sec');
    if(secIdx > 0) {
      const holdSecs = parseInt(String(ex.reps_display).slice(0, secIdx).trim().split(' ').pop());
      if(holdSecs > 0) {
        const holdBtn = document.createElement('button');
        holdBtn.className = 'timer-btn';
        holdBtn.innerHTML = '&#9201; ' + holdSecs + 's Hold';
        holdBtn.addEventListener('click', () => startTimer(holdSecs, 'Hold', ex.computed_sets));
        actionsEl.appendChild(holdBtn);
      }
    }

    bodyEl.appendChild(nameEl);
    bodyEl.appendChild(detailEl);
    bodyEl.appendChild(actionsEl);
    item.appendChild(chkEl);
    item.appendChild(bodyEl);
    return item;
  }

  // ── helper: section header ─────────────────────────────────────────────────
  function makeSectionHeader(icon, label, sublabel) {
    const h = document.createElement('div');
    h.style.cssText = 'display:flex;align-items:baseline;gap:8px;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid rgba(255,180,0,0.2);';
    h.innerHTML = '<span style="font-size:13px;font-weight:700;letter-spacing:0.08em;color:var(--accent);">' + icon + ' ' + label + '</span>'
      + (sublabel ? '<span style="font-size:11px;color:var(--muted);">' + sublabel + '</span>' : '');
    return h;
  }

  // ── helper: warmup/cooldown drill row ─────────────────────────────────────
  function makeDrillRow(drill, isWarmup) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px;';
    const nameSpan = document.createElement('span');
    nameSpan.style.color = 'var(--fg)';
    nameSpan.textContent = drill.name || drill;
    const repsSpan = document.createElement('span');
    repsSpan.style.cssText = 'color:var(--muted);font-size:12px;white-space:nowrap;margin-left:8px;';
    repsSpan.textContent = drill.reps_display || drill.hold || '';
    row.appendChild(nameSpan);
    row.appendChild(repsSpan);
    return row;
  }

  // ── SESSION PURPOSE ────────────────────────────────────────────────────────
  if(tmpl.session_purpose) {
    const purposeEl = document.createElement('div');
    purposeEl.style.cssText = 'font-size:12px;color:var(--muted);font-style:italic;margin-bottom:12px;padding:8px 10px;background:rgba(255,180,0,0.06);border-left:3px solid var(--accent);border-radius:3px;';
    purposeEl.textContent = tmpl.session_purpose;
    listEl.appendChild(purposeEl);
  }

  // ── WARM-UP SECTION ────────────────────────────────────────────────────────
  const warmupDrills = tmpl.warmup || [];
  if(warmupDrills.length > 0) {
    listEl.appendChild(makeSectionHeader('🔥', 'WARM-UP', 'dynamic movement prep'));
    const warmupBlock = document.createElement('div');
    warmupBlock.style.cssText = 'background:rgba(255,255,255,0.03);border-radius:6px;padding:4px 10px;margin-bottom:4px;';
    warmupDrills.forEach(d => warmupBlock.appendChild(makeDrillRow(d, true)));
    listEl.appendChild(warmupBlock);
  }

  // ── MAIN WORK SECTION ─────────────────────────────────────────────────────
  listEl.appendChild(makeSectionHeader('💪', 'MAIN WORKOUT', ''));
  tmpl.exercises.forEach((rawEx, ei) => {
    listEl.appendChild(buildExItem(rawEx, ei));
  });

  // ── COOL-DOWN SECTION ─────────────────────────────────────────────────────
  const cooldownDrills = tmpl.cooldown || [];
  if(cooldownDrills.length > 0) {
    listEl.appendChild(makeSectionHeader('🧘', 'COOL-DOWN', 'hold each stretch'));
    const coolBlock = document.createElement('div');
    coolBlock.style.cssText = 'background:rgba(255,255,255,0.03);border-radius:6px;padding:4px 10px;margin-top:4px;';
    cooldownDrills.forEach(d => coolBlock.appendChild(makeDrillRow(d, false)));
    listEl.appendChild(coolBlock);
  }

  const total = tmpl.exercises.length;
  const done  = tmpl.exercises.filter((_,i) => currentChecked[checkPrefix+'_ex_'+i]).length;
  updatePlanProgress(total, done);
}

function toggleExercise(ei) {
  const checkPrefix = 'w'+currentWeek+'_d'+currentDayOfWeek;
  const key = checkPrefix + '_ex_' + ei;
  currentChecked[key] = !currentChecked[key];
  window.appStore?.writeJSON(window.appStore.keys.planChecked, currentChecked);

  const chk = document.getElementById('chk-'+ei);
  if(chk) {
    chk.className = 'ex-check'+(currentChecked[key]?' done':'');
    const nm = chk.nextElementSibling?.querySelector('.ex-name');
    if(nm) nm.style.cssText = currentChecked[key] ? 'text-decoration:line-through;opacity:0.45;' : '';
  }
    // Use phase2 template in second half of plan if available
  const totalWks = currentPlanData.total_weeks || 8;
  const usePhase2 = currentPlanData.week_template_phase2 && currentWeek > Math.ceil(totalWks / 2);
  const activeTemplate = usePhase2 ? currentPlanData.week_template_phase2 : (currentPlanData.week_template || []);
  const tmpl = activeTemplate.find(d=>d.day_of_week===currentDayOfWeek);
  if(tmpl) {
    const total = tmpl.exercises.length;
    const done  = tmpl.exercises.filter((_,i)=>currentChecked[checkPrefix+'_ex_'+i]).length;
    updatePlanProgress(total, done);
  }
}

function updatePlanProgress(total, done) {
  document.getElementById('plan-progress-text').textContent = total ? done+' / '+total+' complete' : 'Rest Day';
  const pct = total ? Math.round(done/total*100) : 100;
  const bar = document.getElementById('plan-progress-bar');
  bar.style.width = pct + '%';
  bar.style.background = (done===total && total>0) ? 'var(--green)' : 'var(--accent)';
}

function markDayDone() {
  const tmpl = (currentPlanData?.week_template||[]).find(d=>d.day_of_week===currentDayOfWeek);
  if(!tmpl || tmpl.is_rest) { showToast('Rest day — nothing to mark!'); return; }
  const checkPrefix = 'w'+currentWeek+'_d'+currentDayOfWeek;
  currentChecked[checkPrefix+'_done'] = true;
  (tmpl.exercises||[]).forEach((_,i) => { currentChecked[checkPrefix+'_ex_'+i] = true; });
  window.appStore?.writeJSON(window.appStore.keys.planChecked, currentChecked);
  buildWeekDayDropdowns();
  loadPlanDay();
  renderPlanOverview();
  showToast('Week ' + currentWeek + ' · ' + tmpl.label + ' marked complete!');
}

function logPlanDay() {
  if(navigator.vibrate) navigator.vibrate(40);
  const tmpl = (currentPlanData?.week_template||[]).find(d=>d.day_of_week===currentDayOfWeek);
  if(!tmpl || tmpl.is_rest) { showToast('Rest day — nothing to log!'); return; }

  const totalWeeks = currentPlanData.total_weeks || 1;
  const exList = (tmpl.exercises||[]).map(ex => computeExercise(ex, currentWeek, totalWeeks));

  // Pick log type from first non-mobility exercise
  let type = 'Strength Training';
  const cardioEx = exList.find(e=>e.category==='cardio');
  const puEx     = exList.find(e=>e.category==='pushups');
  if(cardioEx) type = cardioEx.name.includes('Interval')||cardioEx.name.includes('Sprint') ? 'Interval Training' : '2-Mile Run';
  else if(puEx) type = 'Standard Push-ups';

  const repsStr  = exList.map(e=>e.computed_sets+'x'+e.reps_display).join(', ');
  const notesStr = ('Wk'+currentWeek+' '+tmpl.label+' · '+tmpl.focus+' · '+exList.map(e=>e.name+' '+e.computed_sets+'x'+e.reps_display).join(', ')).substring(0,200);

  document.getElementById('logDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('logType').value = type;
  document.getElementById('logReps').value = repsStr;
  document.getElementById('logTime').value = '';
  document.getElementById('logNotes').value = notesStr;

  markDayDone();
  addLog();
  showToast('Week ' + currentWeek + ' ' + tmpl.label + ' logged!');
}

function renderPlanOverview() {
  if(!currentPlanData) return;
  const el = document.getElementById('plan-overview');
  const totalWeeks = currentPlanData.total_weeks || 1;
  const totalWksOv = currentPlanData.total_weeks || 8;
  const usePhase2Ov = currentPlanData.week_template_phase2 && currentWeek > Math.ceil(totalWksOv / 2);
  const activeTemplateOv = usePhase2Ov ? currentPlanData.week_template_phase2 : (currentPlanData.week_template || []);
  const trainPerWeek = activeTemplateOv.filter(d=>!d.is_rest).length;
  const totalTrain = totalWeeks * trainPerWeek;
  let doneTrain = 0;
  for(let w=1;w<=totalWeeks;w++) {
    (currentPlanData.week_template||[]).filter(d=>!d.is_rest).forEach(d=>{
      if(currentChecked['w'+w+'_d'+d.day_of_week+'_done']) doneTrain++;
    });
  }
  const pct = totalTrain ? Math.round(doneTrain/totalTrain*100) : 0;

  let html = '<div style="margin-bottom:8px;"><strong style="color:#fff;">' + (currentPlanData.plan_name||'Training Plan') + '</strong>';
  html += ' &nbsp;·&nbsp; ' + doneTrain + ' / ' + totalTrain + ' sessions complete (' + pct + '%)';
  html += ' &nbsp;·&nbsp; <span style="color:var(--muted);">Week '+currentWeek+' of '+totalWeeks+'</span></div>';
  html += '<div style="height:6px;background:var(--border2);border-radius:3px;overflow:hidden;margin-bottom:14px;"><div style="height:100%;width:'+pct+'%;background:var(--green);border-radius:3px;transition:width .3s;"></div></div>';

  (currentPlanData.phases||[]).forEach(ph => {
    const phWeeks = [];
    for(let w=ph.start_week;w<=ph.end_week;w++) phWeeks.push(w);
    const phTrain = phWeeks.length * trainPerWeek;
    let phDone = 0;
    phWeeks.forEach(w => {
      (currentPlanData.week_template||[]).filter(d=>!d.is_rest).forEach(d=>{
        if(currentChecked['w'+w+'_d'+d.day_of_week+'_done']) phDone++;
      });
    });
    html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">';
    html += '<span><strong style="color:var(--accent2);">' + ph.name + '</strong> &nbsp;Wk ' + ph.start_week + '–' + ph.end_week + ' &nbsp;<span style="color:var(--muted);">' + ph.goal + '</span></span>';
    html += '<span style="white-space:nowrap;margin-left:8px;">' + phDone + '/' + phTrain + '</span></div>';
  });

  if(currentPlanData.score_targets?.length) {
    html += '<div style="margin-top:12px;font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Score Targets</div>';
    currentPlanData.score_targets.forEach(t => {
      html += '<div style="font-size:12px;padding:3px 0;color:var(--muted);"><strong style="color:#fff;">'+t.phase+'</strong> — PU: '+t.pushups+' · Core: '+t.core+' · Cardio: '+t.cardio+' · Composite: '+t.composite+'</div>';
    });
  }

  if(currentPlanData.body_comp_tips?.length) {
    html += '<div style="margin-top:12px;font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Body Composition Tips</div>';
    currentPlanData.body_comp_tips.forEach(tip => {
      html += '<div style="font-size:12px;padding:2px 0;color:var(--muted);">· ' + tip + '</div>';
    });
  }

  el.innerHTML = html;
}

function clearActivePlan() {
  if(!confirm('Clear the active plan and all progress?')) return;
  currentPlanData = null; currentChecked = {};
  window.appStore?.removeStorageKey(window.appStore.keys.activePlan); window.appStore?.removeStorageKey(window.appStore.keys.planChecked);
  document.getElementById('my-plan-section').style.display = 'none';
  document.getElementById('no-plan-msg').style.display = 'block';
  showToast('Plan cleared.');
}


// ── TIMER ────────────────────────────────────────────────
function startTimer(seconds, label, sets) {
  clearInterval(timerInterval);
  timerSeconds  = parseInt(seconds) || 0;
  timerTotal    = timerSeconds;
  timerPaused   = false;
  timerLabel    = label;
  timerDeadline = Date.now() + timerSeconds * 1000;

  document.getElementById('timer-label').textContent = label.toUpperCase();
  document.getElementById('timer-sub').textContent   = sets > 1 ? sets + ' sets' : '';
  document.getElementById('timer-pause-btn').textContent = '⏸ PAUSE';
  document.getElementById('timer-display').style.color = '#fff';

  // Show fullscreen
  const tm = document.getElementById('timer-modal');
  tm.style.display = 'flex';

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if(timerPaused) return;
    timerSeconds = Math.max(0, Math.round((timerDeadline - Date.now()) / 1000));
    updateTimerDisplay();
    if(timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerBeep();
      if(navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
      document.getElementById('timer-label').textContent = "TIMES UP!";
      document.getElementById('timer-display').textContent = '0:00';
      document.getElementById('timer-display').style.color = 'var(--green)';
      document.getElementById('timer-ring-prog').style.stroke = 'var(--green)';
      // Auto-close after 1.5s and return to workout
      setTimeout(() => closeTimer(), 1500);
    }
  }, 250);
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  document.getElementById('timer-display').textContent = m + ':' + String(s).padStart(2,'0');
  const circumference = 616;
  const offset = circumference - (circumference * (timerSeconds / timerTotal));
  const ring = document.getElementById('timer-ring-prog');
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = timerSeconds <= 5 ? '#e74c3c' : 'var(--accent)';
  document.getElementById('timer-display').style.color = timerSeconds <= 5 ? '#e74c3c' : '#fff';
}

function toggleTimerPause() {
  timerPaused = !timerPaused;
  if(!timerPaused) timerDeadline = Date.now() + timerSeconds * 1000;
  document.getElementById('timer-pause-btn').textContent = timerPaused ? '▶ RESUME' : '⏸ PAUSE';
}

function timerReset() {
  timerSeconds  = timerTotal;
  timerPaused   = false;
  timerDeadline = Date.now() + timerSeconds * 1000;
  document.getElementById('timer-pause-btn').textContent = '⏸ PAUSE';
  document.getElementById('timer-display').style.color = '#fff';
  document.getElementById('timer-ring-prog').style.stroke = 'var(--accent)';
  updateTimerDisplay();
}

function closeTimer() {
  clearInterval(timerInterval);
  document.getElementById('timer-modal').style.display = 'none';
}

// Feedback — screen name map
const FB_SCREENS = { calc:'Calculator', ai:'AI Plan', log:'Workout Log', history:'Score History' };

function openFeedback() {
  if(navigator.vibrate) navigator.vibrate(30);
  const activeTab = document.querySelector('.tab.active');
  const tabId = activeTab ? activeTab.getAttribute('onclick').match(/'(\w+)'/)?.[1] : 'app';
  const screenName = FB_SCREENS[tabId] || 'PT Ready';
  document.getElementById('fb-screen-label').textContent = screenName;
  document.getElementById('fb-status').textContent = '';
  document.getElementById('fb-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeFeedback() {
  document.getElementById('fb-modal').style.display = 'none';
  document.body.style.overflow = '';
}

// Feedback helper functions
function fbTypeChanged(val) {
  const row = document.getElementById('fb-discrepancy-row');
  row.style.display = val === 'Bug Report' ? 'block' : 'none';
  if(val !== 'Bug Report') {
    document.getElementById('fb-is-discrepancy').checked = false;
    fbDiscrepancyChanged(false);
  }
}

function fbDiscrepancyChanged(checked) {
  document.getElementById('fb-discrepancy-fields').style.display = checked ? 'block' : 'none';
  if(!checked) {
    document.getElementById('fb-sex-val').value = '';
    document.getElementById('fb-age').value = '';
    document.getElementById('fb-components').value = '';
    fbSetSex(null);
  }
}

let fbSelectedSex = '';
function fbSetSex(val) {
  fbSelectedSex = val || '';
  document.getElementById('fb-sex-val').value = fbSelectedSex;
  const mBtn = document.getElementById('fb-sex-m');
  const fBtn = document.getElementById('fb-sex-f');
  if(!mBtn || !fBtn) return;
  const activeStyle = "flex:1;padding:8px;background:rgba(232,160,32,0.15);border:1px solid var(--accent);border-radius:5px;color:var(--accent);font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;";
  const inactiveStyle = "flex:1;padding:8px;background:rgba(255,255,255,0.05);border:1px solid #2a3540;border-radius:5px;color:#aaa;font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;";
  mBtn.style.cssText = val === 'Male' ? activeStyle : inactiveStyle;
  fBtn.style.cssText = val === 'Female' ? activeStyle : inactiveStyle;
}

function fbResponseChanged(checked) {
  document.getElementById('fb-email-row').style.display = checked ? 'block' : 'none';
  if (!checked) document.getElementById('fb-email').value = '';
}

function submitFeedback() {
  const type    = document.getElementById('fb-type').value.trim();
  const message = document.getElementById('fb-message').value.trim();
  const screen  = document.getElementById('fb-screen-label').textContent || 'PT Ready';
  const status  = document.getElementById('fb-status');

  if(!type)    { status.style.color='#e74c3c'; status.textContent='Please select a feedback type.'; return; }
  if(!message) { status.style.color='#e74c3c'; status.textContent='Please enter a message.'; return; }

  const wantsResponse = document.getElementById('fb-wants-response')?.checked;
  const email         = document.getElementById('fb-email')?.value.trim() || '';
  if(wantsResponse && !email) {
    status.style.color='#e74c3c';
    status.textContent='Please enter your email address.';
    return;
  }
  if(wantsResponse && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    status.style.color='#e74c3c';
    status.textContent='Please enter a valid email address.';
    return;
  }

  status.style.color='#778'; status.textContent='Sending...';

  const isDiscrepancy = document.getElementById('fb-is-discrepancy')?.checked;
  const sex        = document.getElementById('fb-sex-val')?.value || '';
  const age        = document.getElementById('fb-age')?.value || '';
  const components = document.getElementById('fb-components')?.value || '';

  const FORM_URL = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSerMF3xb63Uj6MJ92_P10E93TEO-00zOCmr6hHt22cZBjrs-g/formResponse';
  const body = new FormData();
  body.append('entry.1847213335', type);
  body.append('entry.1989216715', message);
  body.append('entry.491117581',  screen);
  body.append('entry.210364117',  isDiscrepancy ? 'Yes' : 'No');
  if(sex)           body.append('entry.1998555850', sex);
  if(age)           body.append('entry.355370934',  age);
  if(components)    body.append('entry.838403070',  components);
  if(wantsResponse) body.append('entry.2047383010', email || 'No');

  fetch(FORM_URL, { method:'POST', mode:'no-cors', body })
    .then(() => {
      status.style.color = 'var(--green)';
      status.textContent = '✓ Sent — thank you!';
      document.getElementById('fb-type').value = '';
      document.getElementById('fb-message').value = '';
      document.getElementById('fb-is-discrepancy').checked = false;
      document.getElementById('fb-wants-response').checked = false;
      document.getElementById('fb-email').value = '';
      fbResponseChanged(false);
      fbDiscrepancyChanged(false);
      fbTypeChanged('');
      setTimeout(() => closeFeedback(), 1800);
    })
    .catch(() => {
      status.style.color = '#e74c3c';
      status.textContent = 'Failed to send. Check your connection.';
    });
}

// ── CALCULATOR TIMERS ─────────────────────────────────────────────────────────

// Show/hide timer buttons based on selected type
// Called from existing setPuType / setCoreType / setCardioType functions
// We'll patch those below. Standalone helpers:
function showCalcTimer(rowId, show) {
  const el = document.getElementById(rowId);
  if(el) el.style.display = show ? 'block' : 'none';
}

// Stopwatch state
let swInterval   = null;
let swRunning    = false;
let swElapsed    = 0;      // ms
let swStartedAt  = 0;
let swMode       = '';     // 'plank' | 'run' | 'countdown'
let swCountdownMs = 0;     // for countdown mode
let swSplits     = [];

function swLeadIn(onGo) {
  // 5-sec countdown: beep at 5,4,3,2 (normal pitch), long high beep at GO
  const display = document.getElementById('sw-display');
  const label   = document.getElementById('sw-label');
  const startBtn = document.getElementById('sw-start-btn');
  startBtn.disabled = true;
  startBtn.style.opacity = '0.4';

  let count = 5;
  label.textContent = 'GET READY';
  display.textContent = count;
  display.style.color = 'var(--accent)';
  swLeadBeep(880, 0.08, false);

  const tick = setInterval(() => {
    count--;
    if(count > 0) {
      display.textContent = count;
      swLeadBeep(880, 0.08, false);
      if(navigator.vibrate) navigator.vibrate(60);
    } else {
      clearInterval(tick);
      display.textContent = 'GO!';
      display.style.color = 'var(--green)';
      swLeadBeep(1200, 0.3, true);
      if(navigator.vibrate) navigator.vibrate([100,50,100]);
      setTimeout(() => {
        display.style.color = '#fff';
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        onGo();
      }, 400);
    }
  }, 1000);
}

// Shared AudioContext — created on first user gesture to satisfy iOS policy
let _audioCtx = null;
function getAudioCtx() {
  if(!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

// Unlock audio on first tap anywhere (iOS requires this)
document.addEventListener('touchstart', function unlockAudio() {
  const ctx = getAudioCtx();
  // Play silent buffer to unlock
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  document.removeEventListener('touchstart', unlockAudio);
}, { once: true });

function swLeadBeep(freq, duration, long) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const dur = long ? 0.4 : 0.1;
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.01);
  } catch(e) {}
}

function startStopwatch(label, mode) {
  swMode = mode;
  swElapsed = 0;
  swRunning = false;
  swSplits = [];
  document.getElementById('sw-label').textContent = label.toUpperCase();
  document.getElementById('sw-display').textContent = '0:00';
  document.getElementById('sw-display').style.color = '#fff';
  document.getElementById('sw-start-btn').textContent = '▶ START';
  document.getElementById('sw-record-btn').style.display = 'none';
  document.getElementById('sw-split').textContent = mode === 'run' ? 'Tap Pause when you finish' : '';
  document.getElementById('sw-modal').style.display = 'flex';
  clearInterval(swInterval);
  swLeadIn(swToggle);
}

function startCountdown(seconds, label) {
  swMode = 'countdown';
  swCountdownMs = seconds * 1000;
  swElapsed = 0;
  swRunning = false;
  swSplits = [];
  document.getElementById('sw-label').textContent = label.toUpperCase();
  document.getElementById('sw-display').textContent = fmtTime(seconds * 1000);
  document.getElementById('sw-display').style.color = '#fff';
  document.getElementById('sw-start-btn').textContent = '▶ START';
  document.getElementById('sw-record-btn').style.display = 'none';
  document.getElementById('sw-split').textContent = '';
  document.getElementById('sw-modal').style.display = 'flex';
  clearInterval(swInterval);
  swLeadIn(swToggle);
}

function swToggle() {
  if(swRunning) {
    // Pause
    swRunning = false;
    clearInterval(swInterval);
    document.getElementById('sw-start-btn').textContent = '▶ RESUME';
    // Show record button for plank/run after first pause
    if(swMode === 'plank' || swMode === 'run') {
      document.getElementById('sw-record-btn').style.display = 'block';
    }
  } else {
    // Start/resume
    swRunning = true;
    const startElapsed = swElapsed;
    const startTime = Date.now();
    document.getElementById('sw-start-btn').textContent = '⏸ PAUSE';
    document.getElementById('sw-record-btn').style.display = 'none';

    swInterval = setInterval(() => {
      swElapsed = startElapsed + (Date.now() - startTime);

      if(swMode === 'countdown') {
        const remaining = Math.max(0, swCountdownMs - swElapsed);
        document.getElementById('sw-display').textContent = fmtTime(remaining);
        document.getElementById('sw-display').style.color = remaining <= 10000 ? '#e74c3c' : '#fff';
        document.getElementById('sw-record-btn').style.display = 'none';
        if(remaining <= 0) {
          clearInterval(swInterval);
          swRunning = false;
          timerBeep();
          if(navigator.vibrate) navigator.vibrate([300,100,300,100,300]);
          document.getElementById('sw-label').textContent = "TIME'S UP!";
          document.getElementById('sw-display').style.color = 'var(--green)';
          document.getElementById('sw-start-btn').textContent = '▶ START';
          // For push-ups (countdown mode) no record needed — they enter reps manually
        }
      } else {
        // Count-up (plank / run)
        document.getElementById('sw-display').textContent = fmtTime(swElapsed);

        // Run: show 1-mile split
        if(swMode === 'run' && swSplits.length === 0 && swElapsed >= 60000) {
          // We track first manual split only via button — auto hint shown
        }
      }
    }, 100);
  }
}

function swReset() {
  clearInterval(swInterval);
  swRunning = false;
  swElapsed = 0;
  swSplits = [];
  document.getElementById('sw-start-btn').textContent = '▶ START';
  document.getElementById('sw-record-btn').style.display = 'none';
  document.getElementById('sw-split').textContent = swMode === 'run' ? 'Mile split will appear at 1 mi mark' : '';
  if(swMode === 'countdown') {
    document.getElementById('sw-display').textContent = fmtTime(swCountdownMs);
  } else {
    document.getElementById('sw-display').textContent = '0:00';
  }
  document.getElementById('sw-display').style.color = '#fff';
}

function swClose() {
  clearInterval(swInterval);
  swRunning = false;
  document.getElementById('sw-modal').style.display = 'none';
}

function swRecord() {
  if(navigator.vibrate) navigator.vibrate(40);
  const totalSec = Math.round(swElapsed / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;

  if(swMode === 'plank') {
    document.getElementById('plankMin').value = m;
    document.getElementById('plankSec').value = String(s).padStart(2,'0');
    liveScoreComponent('core');
  } else if(swMode === 'run') {
    document.getElementById('runMin').value = m;
    document.getElementById('runSec').value = String(s).padStart(2,'0');
    liveScoreComponent('cardio');
  }

  document.getElementById('sw-record-btn').textContent = '✓ Recorded!';
  document.getElementById('sw-record-btn').style.background = 'var(--green)';
  setTimeout(() => swClose(), 900);
}

function fmtTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10); // centiseconds
  if(ms >= 3600000) {
    // Over 1 hour — show H:MM:SS
    const h = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    return h + ':' + String(mm).padStart(2,'0') + ':' + String(totalSec % 60).padStart(2,'0');
  }
  return m + ':' + String(s).padStart(2,'0');
}

// ── ABOUT ACCORDION ─────────────────────────────────────────
function toggleAboutAcc(id) {
  const el = document.getElementById('about-acc-' + id);
  if (el) {
    el.classList.toggle('open');
    const isNowOpen = el.classList.contains('open');
    const hint = el.querySelector('.about-tap-hint');
    if(hint) hint.textContent = isNowOpen ? 'tap to collapse' : 'tap to expand';
  }
}

// ── ABOUT MODAL ─────────────────────────────────────────────
function openAbout() {
  document.getElementById('about-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAbout() {
  document.getElementById('about-modal').classList.remove('open');
  document.body.style.overflow = '';
  // Record the time they closed it
  try { localStorage.setItem('ptr_about_seen', Date.now()); } catch(e) {}
}

// Auto-show About on first visit, then every 30 days from first visit date
(function checkFirstVisit() {
  try {
    const days30 = 30 * 24 * 60 * 60 * 1000;
    const firstVisit = parseInt(localStorage.getItem('ptr_first_visit') || '0', 10);
    const lastShown  = parseInt(localStorage.getItem('ptr_about_seen') || '0', 10);

    if (!firstVisit) {
      // Brand new user — record first visit and show
      localStorage.setItem('ptr_first_visit', Date.now());
      setTimeout(openAbout, 600);
    } else {
      // Returning user — show if a 30-day interval has elapsed since first visit
      const elapsed = Date.now() - firstVisit;
      const intervals = Math.floor(elapsed / days30);
      const lastShownInterval = Math.floor((lastShown - firstVisit) / days30);
      if (intervals > lastShownInterval) {
        setTimeout(openAbout, 600);
      }
    }
  } catch(e) {}
})();

function timerBeep() {
  try {
    const ctx = getAudioCtx();
    [0, 0.18, 0.36].forEach(offset => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.5, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.15);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime  + offset + 0.16);
    });
  } catch(e) {}
}

function addLog(){
  if(navigator.vibrate) navigator.vibrate(40);
  const date=document.getElementById('logDate').value;
  const type=document.getElementById('logType').value;
  if(!date||!type)return;
  const entry={id:Date.now(),date,type,
    reps:document.getElementById('logReps').value,
    time:document.getElementById('logTime').value,
    notes:document.getElementById('logNotes').value};
  logs.unshift(entry);
  window.appStore?.writeJSON(window.appStore.keys.logs, logs);
  renderLogs();
  document.getElementById('logDate').value='';
  document.getElementById('logType').value='';
  document.getElementById('logReps').value='';
  document.getElementById('logTime').value='';
  document.getElementById('logNotes').value='';
}
function deleteLog(id){
  logs=logs.filter(l=>l.id!==id);
  window.appStore?.writeJSON(window.appStore.keys.logs, logs);
  renderLogs();
}
let logPageSize = 20;
let logPage = 1;

function renderLogs(){
  const typeFilter = document.getElementById('logFilter')?.value || 'all';
  const dateFilter = document.getElementById('logDateFilter')?.value || 'all';
  const now = new Date();
  const list=document.getElementById('log-list');
  const statsEl=document.getElementById('log-stats');
  const loadMoreEl=document.getElementById('log-load-more');

  let filtered = logs.filter(l => {
    if(typeFilter !== 'all' && l.type !== typeFilter) return false;
    if(dateFilter !== 'all') {
      const cutoff = new Date(now - parseInt(dateFilter)*86400000);
      if(new Date(l.date) < cutoff) return false;
    }
    return true;
  });

  document.getElementById('log-title').textContent=`Previous Workouts (${filtered.length} of ${logs.length} entries)`;

  if(!filtered.length){
    list.innerHTML='<p style="color:var(--muted);font-size:13px;">'+(logs.length?'No entries match the current filter.':'No workouts logged yet.')+'</p>';
    if(statsEl) statsEl.style.display='none';
    if(loadMoreEl) loadMoreEl.style.display='none';
    return;
  }

  // Stats for filtered set
  if(statsEl && filtered.length > 1) {
    const total = filtered.length;
    const types = [...new Set(filtered.map(l=>l.type))];
    const mostRecent = filtered[0].date;
    const oldest = filtered[filtered.length-1].date;
    statsEl.style.display='block';
    statsEl.innerHTML = `<span style="color:var(--text);">${total} sessions</span> &nbsp;·&nbsp; ${types.length} exercise type${types.length!==1?'s':''} &nbsp;·&nbsp; ${oldest} → ${mostRecent}`;
  } else if(statsEl) {
    statsEl.style.display='none';
  }

  const visible = filtered.slice(0, logPage * logPageSize);
  list.innerHTML=visible.map(l=>`
    <div class="log-item">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
          <span class="log-type">${window.appStore.escapeHtml(l.type)}</span>
          <span class="tag">${window.appStore.escapeHtml(l.date)}</span>
          ${l.reps?`<span class="tag" style="color:var(--text);">${window.appStore.escapeHtml(l.reps)}</span>`:''}
          ${l.time?`<span class="tag" style="color:var(--blue);">⏱ ${window.appStore.escapeHtml(l.time)}</span>`:''}
        </div>
        ${l.notes?`<div class="log-meta">📝 ${window.appStore.escapeHtml(l.notes)}</div>`:''}
      </div>
      <button class="btn btn-danger" onclick="deleteLog(${l.id})">✕</button>
    </div>`).join('');

  if(loadMoreEl) {
    loadMoreEl.style.display = visible.length < filtered.length ? 'block' : 'none';
  }
}

function loadMoreLogs() {
  logPage++;
  renderLogs();
}

function exportLogs(){
  if(!logs.length){alert('No workouts to export.');return;}
  const rows=[['Date','Type','Reps/Distance','Time/Duration','Notes']];
  logs.forEach(l=>rows.push([l.date,l.type,l.reps||'',l.time||'',l.notes||'']));
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='af_pt_workouts.csv';a.click();
}

// ════════════════════════════════════════════════════════
// SCORE HISTORY
// ════════════════════════════════════════════════════════
function deleteHistory(id){
  scoreHistory=scoreHistory.filter(h=>h.id!==id);
  window.appStore?.writeJSON(window.appStore.keys.history, scoreHistory);
  renderHistory();
}
function renderHistory(){
  const list=document.getElementById('history-list');
  const wrap=document.getElementById('history-chart-wrap');
  const statsEl=document.getElementById('history-stats');
  if(!scoreHistory.length){
    list.innerHTML='<p style="color:var(--muted);font-size:13px;">No scores saved yet.</p>';
    wrap.style.display='none'; statsEl.style.display='none'; return;
  }
  // Chart
  wrap.style.display='block';
  drawHistChart();
  // Stats
  statsEl.style.display='block';
  const scores=scoreHistory.map(h=>parseFloat(h.composite));
  const best=Math.max(...scores), worst=Math.min(...scores), avg=(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1);
  const trend=scores.length>1?(scores[0]-scores[scores.length-1]).toFixed(1):null;
  document.getElementById('stat-grid').innerHTML=`
    <div class="score-box"><div class="score-num" style="color:var(--green)">${best}</div><div class="score-label">Best Score</div></div>
    <div class="score-box"><div class="score-num" style="color:var(--accent)">${avg}</div><div class="score-label">Average</div></div>
    <div class="score-box"><div class="score-num" style="color:var(--red)">${worst}</div><div class="score-label">Lowest</div></div>
    <div class="score-box"><div class="score-num" style="color:${trend&&parseFloat(trend)>0?'var(--green)':'var(--red)'}">${trend!==null?(parseFloat(trend)>0?'+':'')+trend:'—'}</div><div class="score-label">Progress</div></div>
  `;
  // List
  list.innerHTML=scoreHistory.map(h=>`
    <div class="history-item">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;">
          <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:28px;color:#fff;line-height:1;">${h.composite}</span>
          <span class="tag" style="background:${parseFloat(h.composite)>=90?'#1a2e1a':parseFloat(h.composite)>=75?'#2a2000':'#2a0a0a'};border-color:${parseFloat(h.composite)>=90?'#2ecc71':parseFloat(h.composite)>=75?'#a07840':'#e74c3c'};color:${parseFloat(h.composite)>=90?'#2ecc71':parseFloat(h.composite)>=75?'#a07840':'#e74c3c'};">${h.cat}</span>
        </div>
        <div style="font-size:11px;color:var(--muted);line-height:1.8;">
          <span style="color:var(--text);">📅 Recorded:</span> ${h.recordedDate||h.date||'—'}
          ${h.officialTestDate?` &nbsp;·&nbsp; <span style="color:var(--text);">🎯 Test date:</span> ${h.officialTestDate}`:''}
          <br/>
          <span style="color:var(--muted);">Age ${h.age} · ${h.sex} · PU: ${h.puEx?'EXM':h.puScore?.toFixed(1)||'—'} · Core: ${h.coreEx?'EXM':h.coreScore?.toFixed(1)||'—'} · Cardio: ${h.cardioEx?'EXM':h.cardioScore?.toFixed(1)||'—'} · WHtR: ${h.whtrEx?'EXM':h.whtrScore||'—'}</span>
        </div>
      </div>
      <button class="btn btn-danger" onclick="deleteHistory(${h.id})" style="margin-left:12px;align-self:center;">✕</button>
    </div>`).join('');
}

function drawHistChart(){
  const canvas=document.getElementById('histChart');
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth||700;
  canvas.height=160;
  const data=[...scoreHistory].reverse();
  const scores=data.map(h=>parseFloat(h.composite));
  const W=canvas.width, H=canvas.height;
  const pad={t:20,r:20,b:30,l:40};
  const chartW=W-pad.l-pad.r, chartH=H-pad.t-pad.b;
  ctx.clearRect(0,0,W,H);
  if(scores.length<2){ctx.fillStyle='var(--muted)';ctx.textAlign='center';ctx.fillText('Need 2+ scores to chart',W/2,H/2);return;}
  const min=Math.max(0,Math.min(...scores)-10), max=Math.min(100,Math.max(...scores)+10);
  const xScale=(i)=>pad.l+i*(chartW/(scores.length-1));
  const yScale=(v)=>pad.t+chartH-(((v-min)/(max-min))*chartH);
  // Grid lines at 75, 90
  [75,90].forEach(v=>{
    if(v>=min&&v<=max){
      ctx.strokeStyle=v===90?'rgba(46,204,113,0.3)':'rgba(232,160,32,0.3)';
      ctx.lineWidth=1; ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(pad.l,yScale(v));ctx.lineTo(W-pad.r,yScale(v));ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=v===90?'rgba(46,204,113,0.7)':'rgba(232,160,32,0.7)';
      ctx.font='10px Barlow Condensed';ctx.textAlign='right';
      ctx.fillText(v,pad.l-4,yScale(v)+4);
    }
  });
  // Line
  ctx.strokeStyle='rgba(232,160,32,0.8)';ctx.lineWidth=2;ctx.setLineDash([]);
  ctx.beginPath();
  scores.forEach((v,i)=>{i===0?ctx.moveTo(xScale(i),yScale(v)):ctx.lineTo(xScale(i),yScale(v));});
  ctx.stroke();
  // Dots
  scores.forEach((v,i)=>{
    ctx.fillStyle=v>=90?'#2ecc71':v>=75?'#a07840':'#e74c3c';
    ctx.beginPath();ctx.arc(xScale(i),yScale(v),4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='10px Barlow Condensed';ctx.textAlign='center';
    ctx.fillText(v.toFixed(0),xScale(i),yScale(v)-8);
  });
  // X labels
  ctx.fillStyle='rgba(90,106,122,0.9)';ctx.font='10px Barlow';ctx.textAlign='center';
  data.forEach((h,i)=>{ctx.fillText(h.date.slice(0,5),xScale(i),H-5);});
}

// ════════════════════════════════════════════════════════
// TAB NAVIGATION
// ════════════════════════════════════════════════════════
function switchTab(name, btn) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  btn.classList.add('active');
  window.scrollTo({top:0, behavior:'instant'});
  if(name==='history') renderHistory();
  if(name==='ai') { updateAISummary(); }
}

// ════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════
renderLogs();
renderHistory();
// Init plan section
(function initPlanSection() {
  if(currentPlanData && currentPlanData.week_template) {
    document.getElementById('my-plan-section').style.display = 'block';
    document.getElementById('no-plan-msg').style.display = 'none';
    buildWeekDayDropdowns();
    restoreCurrentPosition();
    loadPlanDay();
    renderPlanOverview();
  } else {
    document.getElementById('my-plan-section').style.display = 'none';
    document.getElementById('no-plan-msg').style.display = 'block';
  }
})();
document.getElementById('logDate').value = new Date().toISOString().split('T')[0];


// ── PDF Calendar Export ───────────────────────────────
function downloadPlanPDF() {
  if(!currentPlanData) return;
  const plan = currentPlanData;
  const member = lastScore || {};
  const tmpl = plan.week_template || [];
  const totalWeeks = plan.total_weeks || 12;

  // Build weeks array
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const orderedDays = tmpl.slice().sort((a,b)=>a.day_of_week - b.day_of_week);

  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${plan.plan_name || 'USAF PT Plan'}</title>
<style>
  @page { size: landscape; margin: 0.5in; }
  body { font-family: Arial, sans-serif; font-size: 8px; color: #111; margin: 0; }
  h1 { font-size: 14px; margin: 0 0 2px; }
  .subtitle { font-size: 9px; color: #555; margin-bottom: 10px; }
  .meta { display:flex; gap:20px; margin-bottom:12px; font-size:8px; color:#444; }
  .meta span { background:#f0f0f0; padding:3px 8px; border-radius:3px; }
  .weeks-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; page-break-inside:avoid; }
  .week-block { border:1px solid #ccc; border-radius:4px; overflow:hidden; }
  .week-label { background:#1a1a2e; color:#a07840; font-size:8px; font-weight:bold; letter-spacing:1px; text-transform:uppercase; padding:4px 8px; }
  .days-grid { display:grid; grid-template-columns:repeat(7,1fr); }
  .day-col { border-right:1px solid #e0e0e0; min-height:80px; }
  .day-col:last-child { border-right:none; }
  .day-header { background:#f5f5f5; font-weight:bold; font-size:7px; text-align:center; padding:3px 2px; border-bottom:1px solid #e0e0e0; text-transform:uppercase; letter-spacing:.5px; }
  .day-body { padding:3px 4px; }
  .day-type { font-size:6px; color:#888; margin-bottom:2px; font-style:italic; }
  .rest-label { font-size:7px; color:#aaa; text-align:center; padding:10px 2px; }
  .ex-line { font-size:6.5px; margin-bottom:1px; line-height:1.3; }
  .ex-name { font-weight:bold; }
  .ex-detail { color:#555; }
  .phase-bar { background:#e8f0e8; border-left:3px solid #4a9e4a; font-size:7px; padding:2px 6px; margin-bottom:4px; color:#2a6e2a; font-weight:bold; }
  .footer { margin-top:8px; font-size:7px; color:#aaa; text-align:center; border-top:1px solid #eee; padding-top:6px; }
</style>
</head>
<body>
<h1>⚡ ${plan.plan_name || 'USAF PT Training Plan'}</h1>
<div class="subtitle">PFRA Preparedness Tool · v1.2 · ptreadiness.app · PFRA Standards Effective 1 Mar 2026</div>
<div class="meta">
  ${member.sex ? '<span>'+member.sex.toUpperCase()+'</span>' : ''}
  ${member.age ? '<span>Age '+member.age+'</span>' : ''}
  ${member.composite ? '<span>Composite: '+member.composite+'</span>' : ''}
  ${member.cat ? '<span>'+member.cat+'</span>' : ''}
  <span>${totalWeeks} Weeks</span>
</div>`;

  // Group weeks into pairs for landscape layout
  for(let w = 1; w <= totalWeeks; w += 2) {
    const phase1 = (plan.phases||[]).find(p=>w>=p.start_week&&w<=p.end_week);
    const phase2 = (plan.phases||[]).find(p=>(w+1)>=p.start_week&&(w+1)<=p.end_week);

    html += `<div class="weeks-row">`;
    for(let wi = w; wi <= Math.min(w+1, totalWeeks); wi++) {
      const phase = (plan.phases||[]).find(p=>wi>=p.start_week&&wi<=p.end_week);
      const isTaper = wi === totalWeeks;
      html += `<div class="week-block">
        <div class="week-label">Week ${wi}${isTaper?' — Deload/Taper':''} ${phase?' · '+phase.name:''}</div>
        <div class="days-grid">`;

      orderedDays.forEach(dayTmpl => {
        const dow = dayTmpl.day_of_week;
        const dayName = days[dow-1] || 'Day'+dow;
        const isRest = dayTmpl.is_rest;
        const exercises = dayTmpl.exercises || [];

        html += `<div class="day-col">
          <div class="day-header">${dayName}</div>
          <div class="day-body">`;

        if(isRest) {
          html += `<div class="rest-label">Rest /<br>Recovery</div>`;
        } else {
          const typeShort = (dayTmpl.focus||'').split('—')[0].trim().split(' ').slice(0,2).join(' ');
          if(typeShort) html += `<div class="day-type">${typeShort}</div>`;

          exercises.slice(0,4).forEach(ex => {
            const repsAdd = ex.reps_add_per_week||0;
            const reps = Math.min((ex.base_reps||0) + repsAdd*(wi-1), ex.reps_max||9999);
            const sets = ex.base_sets||3;
            const unit = ex.reps_unit||'reps';
            let repsStr = unit==='sec'?reps+'s':unit==='mi'?reps.toFixed(1)+'mi':unit==='m'?reps+'m':reps+' reps';
            if(isTaper) { repsStr = '↓ deload'; }
            html += `<div class="ex-line">
              <span class="ex-name">${ex.name||''}</span>
              <span class="ex-detail"> ${sets}×${repsStr}</span>
            </div>`;
          });
          if(exercises.length > 4) html += `<div style="font-size:6px;color:#aaa;">+${exercises.length-4} more</div>`;
        }

        html += `</div></div>`;
      });

      html += `</div></div>`;
    }
    if(w+1 > totalWeeks) html += `<div></div>`; // empty cell if odd weeks
    html += `</div>`;
  }

  html += `<div class="footer">⚠️ Unofficial tool — not affiliated with or endorsed by the USAF, DAF, or DoD. For official guidance consult your UFPM or DAFMAN 36-2905.</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function shareApp() {
  const url = 'https://ptreadiness.app';
  if(navigator.share) {
    navigator.share({
      title: 'PT Readiness',
      text: 'Free USAF PT assessment tracker and AI workout plan generator',
      url: url
    }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard!');
    }).catch(() => {
      showToast('ptreadiness.app');
    });
  }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a3a1a;border:1px solid #2ecc71;color:#2ecc71;padding:10px 24px;border-radius:4px;font-family:Barlow Condensed,sans-serif;font-weight:700;letter-spacing:1px;font-size:14px;z-index:9999;transition:opacity .4s;';
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),400);},2200);
}


function exportHistory(){
  if(!scoreHistory.length){alert('No history to export.');return;}
  const rows=[['Recorded Date','Official Test Date','Composite','Category','Sex','Age','PU Type','PU Score','Core Type','Core Score','Cardio Type','Cardio Score','WHtR Score']];
  scoreHistory.forEach(h=>rows.push([
    h.recordedDate||h.date||'',h.officialTestDate||h.testDate||'',
    h.composite,h.cat,h.sex,h.age,
    h.puEx?'EXEMPT':h.puType,h.puEx?'EXEMPT':h.puScore?.toFixed(1)||'',
    h.coreEx?'EXEMPT':h.coreType,h.coreEx?'EXEMPT':h.coreScore?.toFixed(1)||'',
    h.cardioEx?'EXEMPT':h.cardioType,h.cardioEx?'EXEMPT':h.cardioScore?.toFixed(1)||'',
    h.whtrEx?'EXEMPT':h.whtrScore||''
  ]));
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='af_pt_score_history.csv';a.click();
}


