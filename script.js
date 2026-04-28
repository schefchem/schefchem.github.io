/* ============================================================
   SchefChem - Unit 8: Acids & Bases
   script.js - All interactive logic
   ============================================================ */

'use strict';

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById('section-' + sectionId);
  const btn = document.querySelector(`[data-section="${sectionId}"]`);
  if (target) target.classList.add('active');
  if (btn) btn.classList.add('active');

  // Init subsystems on first visit
  if (sectionId === 'buffers' && !bufferInitialized) initBuffer();
  if (sectionId === 'ph-pka' && !phkaInitialized) initPhKa();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.section));
});

// ============================================================
// THEME TOGGLE
// ============================================================
const themeToggle = document.getElementById('theme-toggle');
let isDark = false;
themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  document.body.dataset.theme = isDark ? 'dark' : 'light';
  themeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  drawGraph();
  drawBeaker();
  if (bufferInitialized) drawBufferGraph();
  if (phkaInitialized) drawPhKaGraph(), drawPie();
});

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ============================================================
// TITRATION STATE
// ============================================================
const state = {
  type: 'SA_SB',   // SA_SB | WA_SB | SA_WB
  analyteVol: 25,   // mL
  analyteConc: 0.1, // M
  titrantConc: 0.1, // M
  ka: 1.8e-5,
  ka2: null,        // Support for diprotic acids
  kb: 1.8e-5,
  volAdded: 0,      // mL
  dataPoints: [],   // [{vol, pH}]
  autoInterval: null,
  particleMode: true
};

// ============================================================
// HELPER: DRAW ARROW
// ============================================================
function drawDownArrow(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 6, y - 10);
  ctx.lineTo(x + 6, y - 10);
  ctx.closePath();
  ctx.fill();
}

// ============================================================
// CHEMISTRY CALCULATIONS
// ============================================================

function calculatePH(volAddedML) {
  const Va = state.analyteVol;
  const Ca = state.analyteConc;
  const Ct = state.titrantConc;
  const totalVol = Va + volAddedML;
  const Kw = 1e-14;

  function delta(pH) {
    const H = Math.pow(10, -pH);
    const OH = Kw / H;

    if (state.type === 'SA_SB') {
      const Na = (Ct * volAddedML) / totalVol;
      const Cl = (Ca * Va) / totalVol;
      return H + Na - OH - Cl;
    } 
    else if (state.type === 'WA_SB') {
      const Na = (Ct * volAddedML) / totalVol;
      const Ka1 = state.ka;
      const Ka2 = state.ka2 || 0;
      const D = H * H + H * Ka1 + Ka1 * Ka2;
      const alpha1 = (H * Ka1) / D;
      const alpha2 = (Ka1 * Ka2) / D;
      const A_minus = ((Ca * Va) / totalVol) * alpha1;
      const A_2minus = ((Ca * Va) / totalVol) * alpha2;
      return H + Na - OH - A_minus - 2 * A_2minus;
    } 
    else if (state.type === 'SA_WB') {
      const Ka = Kw / state.kb;
      const D = H + Ka;
      const alpha_BH = H / D;
      const BH = ((Ca * Va) / totalVol) * alpha_BH;
      const Cl = (Ct * volAddedML) / totalVol;
      return H + BH - OH - Cl;
    }
  }

  let low = 0;
  let high = 14;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (delta(mid) > 0) low = mid; 
    else high = mid;
  }
  return Math.max(0, Math.min(14, low));
}

function equivalencePointVol() {
  const Va = state.analyteVol;
  const Ca = state.analyteConc;
  const Ct = state.titrantConc;
  return (Va * Ca) / Ct;
}

function getCurrentPKa() {
  if (state.type === 'WA_SB') return -Math.log10(state.ka);
  if (state.type === 'SA_WB') return -Math.log10(1e-14 / state.kb);
  return null;
}

function getSpecies(volAddedML) {
  const Va = state.analyteVol;
  const Ca = state.analyteConc;
  const Ct = state.titrantConc;
  const totalVol = Va + volAddedML;
  const pH = calculatePH(volAddedML);
  const cH  = Math.pow(10, -pH);
  const cOH = 1e-14 / cH;
  const species = [
    { name: '[H+]',  val: cH },
    { name: '[OH-]', val: cOH },
  ];

  if (state.type === 'WA_SB') {
    const Ka1 = state.ka;
    const Ka2 = state.ka2 || 0;
    const D = cH * cH + cH * Ka1 + Ka1 * Ka2;
    const alpha0 = (cH * cH) / D;
    const alpha1 = (cH * Ka1) / D;
    const alpha2 = (Ka1 * Ka2) / D;
    const C_weak = (Va * Ca) / totalVol;
    if (state.ka2) {
      species.push({ name: '[H2A]', val: C_weak * alpha0 });
      species.push({ name: '[HA-]', val: C_weak * alpha1 });
      species.push({ name: '[A2-]', val: C_weak * alpha2 });
    } else {
      species.push({ name: '[HA]', val: C_weak * alpha0 });
      species.push({ name: '[A-]', val: C_weak * alpha1 });
    }
  } else if (state.type === 'SA_WB') {
    const Ka = 1e-14 / state.kb;
    const D = cH + Ka;
    const alpha_BH = cH / D;
    const alpha_B = Ka / D;
    const C_base = (Va * Ca) / totalVol;
    species.push({ name: '[B]',   val: C_base * alpha_B });
    species.push({ name: '[BH+]', val: C_base * alpha_BH });
  }

  return species;
}

function getHHValues(volAddedML) {
  if (state.ka2) return null; 
  const Va = state.analyteVol;
  const Ca = state.analyteConc;
  const Ct = state.titrantConc;
  const mmolAnal = Va * Ca;
  const mmolTit  = volAddedML * Ct;
  const pKa = getCurrentPKa();
  if (!pKa) return null;

  const mmolConj = Math.min(mmolTit, mmolAnal);
  const mmolAcid = Math.max(0, mmolAnal - mmolTit);

  if (mmolAcid <= 0 || mmolConj <= 0) return null;

  const ratio = mmolConj / mmolAcid;
  const logRatio = Math.log10(ratio);
  const calcPH = pKa + logRatio;

  return {
    pKa: pKa.toFixed(2),
    ratio: ratio.toFixed(3),
    logRatio: logRatio.toFixed(3),
    calcPH: calcPH.toFixed(2),
  };
}

// ============================================================
// STEP-BY-STEP EXPLANATIONS
// ============================================================
function generateExplanation(volAddedML) {
  const ep = equivalencePointVol();
  const hep = ep / 2;
  const pH = calculatePH(volAddedML);
  const pKa = getCurrentPKa();

  if (volAddedML === 0) {
    if (state.type === 'SA_SB') {
      return `<b>Start:</b> Pure strong acid at ${state.analyteConc} M. Fully dissociated, so [H+] = ${state.analyteConc} M. pH = ${(-Math.log10(state.analyteConc)).toFixed(2)}.`;
    } else if (state.type === 'WA_SB') {
      if (state.ka2) return `<b>Start:</b> Polyprotic weak acid (Ka1 = ${state.ka.toExponential(2)}, Ka2 = ${state.ka2.toExponential(2)}). Current pH = ${pH.toFixed(2)}.`;
      return `<b>Start:</b> Weak acid (Ka = ${state.ka.toExponential(2)}). Partially dissociates. Use Ka = [H+][A-]/[HA] to find [H+], giving pH = ${pH.toFixed(2)}.`;
    } else {
      return `<b>Start:</b> Weak base (Kb = ${state.kb.toExponential(2)}). Partially accepts protons from water. Current pH = ${pH.toFixed(2)}.`;
    }
  }

  if (state.type === 'WA_SB' && state.ka2) {
    if (volAddedML < ep - 0.5) return `<b>First Buffer Region:</b> Removing the first proton. pH is governed by Ka1. pH = ${pH.toFixed(2)}.`;
    if (Math.abs(volAddedML - ep) < 0.6) return `<b>First Equivalence Point:</b> The first proton is completely neutralized. The solution now contains an amphiprotic species.`;
    if (volAddedML < 2 * ep - 0.5) return `<b>Second Buffer Region:</b> Removing the second proton. pH is governed by Ka2. pH = ${pH.toFixed(2)}.`;
    if (Math.abs(volAddedML - 2 * ep) < 0.6) return `<b>Second Equivalence Point:</b> Both protons fully neutralized. Hydrolysis of the fully deprotonated ion causes a basic pH.`;
    return `<b>Past equivalence:</b> Excess strong base dominates. pH is controlled by excess [OH-]. pH = ${pH.toFixed(2)}.`;
  }

  if (volAddedML < hep - 0.5) {
    return `<b>Early buffer region:</b> Both HA and A- (or B and BH+) are present but unequal. pH governed by Henderson-Hasselbalch. More weak acid causes pH < pKa. Current pH = ${pH.toFixed(2)}.`;
  }

  if (Math.abs(volAddedML - hep) < 0.6 && pKa) {
    return `<b>Half-Equivalence Point:</b> You've added exactly half the titrant needed to reach equivalence. [HA] = [A-], so log([A-]/[HA]) = 0. <b>pH = pKa = ${pKa.toFixed(2)}</b>. This is the buffer midpoint.`;
  }

  if (volAddedML < ep - 0.5) {
    return `<b>Buffer region:</b> Neutralization is ongoing. HA is converting to A-. pH = pKa + log([A-]/[HA]). pH = ${pH.toFixed(2)}.`;
  }

  if (Math.abs(volAddedML - ep) < 0.6) {
    if (state.type === 'SA_SB') {
      return `<b>Equivalence Point:</b> All acid has been neutralized. Solution contains only water and salt. pH = 7.00.`;
    } else if (state.type === 'WA_SB') {
      return `<b>Equivalence Point:</b> All weak acid is now its conjugate base (A-). A- hydrolyzes (A- + H2O <-> HA + OH-) creating a basic pH = ${pH.toFixed(2)}.`;
    } else {
      return `<b>Equivalence Point:</b> All weak base is now its conjugate acid (BH+). BH+ hydrolyzes creating an acidic pH = ${pH.toFixed(2)}.`;
    }
  }

  return `<b>Past equivalence:</b> Excess ${state.type === 'SA_WB' ? 'strong acid' : 'strong base'} dominates. pH is controlled by excess [${state.type === 'SA_WB' ? 'H+' : 'OH-'}]. pH = ${pH.toFixed(2)}.`;
}

// ============================================================
// GRAPH RENDERING (Canvas)
// ============================================================
let graphCanvas, graphCtx;

function initGraph() {
  graphCanvas = document.getElementById('graph-canvas');
  graphCtx = graphCanvas.getContext('2d');
  drawGraph();
}

function drawGraph() {
  if (!graphCtx) return;
  const ctx = graphCtx;
  const W = graphCanvas.width;
  const H = graphCanvas.height;
  const dark = isDark;

  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  ctx.fillStyle = dark ? '#2b2b2b' : '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const ep = equivalencePointVol();
  const maxVol = (state.type === 'WA_SB' && state.ka2) ? ep * 3.2 : ep * 2.2;

  function toX(vol) { return PAD.left + (vol / maxVol) * plotW; }
  function toY(pH)  { return PAD.top + plotH - (pH / 14) * plotH; }

  ctx.strokeStyle = dark ? '#444444' : '#dddddd';
  ctx.lineWidth = 1;
  for (let pH = 0; pH <= 14; pH += 2) {
    ctx.beginPath();
    ctx.moveTo(PAD.left, toY(pH));
    ctx.lineTo(PAD.left + plotW, toY(pH));
    ctx.stroke();
  }
  for (let v = 0; v <= maxVol; v += ep / 2) {
    ctx.beginPath();
    ctx.moveTo(toX(v), PAD.top);
    ctx.lineTo(toX(v), PAD.top + plotH);
    ctx.stroke();
  }

  if (state.type === 'WA_SB' && state.ka2) {
    const ep1X = toX(ep);
    const ep2X = toX(ep * 2);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#cc6600';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath(); ctx.moveTo(ep1X, PAD.top); ctx.lineTo(ep1X, PAD.top + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ep2X, PAD.top); ctx.lineTo(ep2X, PAD.top + plotH); ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.fillStyle = '#cc6600';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EP1', ep1X, PAD.top + plotH + 26);
    ctx.fillText('EP2', ep2X, PAD.top + plotH + 26);

  } else {
    const pKa = getCurrentPKa();
    const epX = toX(ep);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#cc6600';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(epX, PAD.top);
    ctx.lineTo(epX, PAD.top + plotH);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = '#cc6600';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EP', epX, PAD.top + plotH + 26);

    if (pKa && state.type !== 'SA_SB') {
      const hepX = toX(ep / 2);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#cc0000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hepX, PAD.top);
      ctx.lineTo(hepX, PAD.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#cc0000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('1/2 EP', hepX, PAD.top + plotH + 26);

      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#cc0000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD.left, toY(pKa));
      ctx.lineTo(PAD.left + plotW, toY(pKa));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#cc0000';
      ctx.font = '10px Courier New, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`pKa=${pKa.toFixed(2)}`, PAD.left + 4, toY(pKa) - 3);
    }
  }

  const numPreviewPoints = 150;
  const previewCurve = [];
  for (let i = 0; i <= numPreviewPoints; i++) {
    const v = (i / numPreviewPoints) * maxVol;
    const pH = calculatePH(v);
    previewCurve.push({ vol: v, pH });
  }

  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = dark ? '#888888' : '#bbbbbb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  previewCurve.forEach((pt, i) => {
    const x = toX(pt.vol);
    const y = toY(pt.pH);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  if (state.dataPoints.length > 1) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#006699';
    ctx.beginPath();
    state.dataPoints.forEach((pt, i) => {
      const x = toX(pt.vol);
      const y = toY(pt.pH);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    const last = state.dataPoints[state.dataPoints.length - 1];
    drawDownArrow(ctx, toX(last.vol), toY(last.pH), '#cc0000');
  }

  ctx.strokeStyle = dark ? '#dddddd' : '#222222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, PAD.top + plotH);
  ctx.lineTo(PAD.left + plotW, PAD.top + plotH);
  ctx.stroke();

  ctx.fillStyle = dark ? '#eeeeee' : '#111111';
  ctx.font = '12px Courier New, monospace';
  ctx.textAlign = 'right';
  for (let pH = 0; pH <= 14; pH += 2) {
    ctx.fillText(pH, PAD.left - 6, toY(pH) + 4);
  }

  ctx.textAlign = 'center';
  for (let v = 0; v <= maxVol; v += ep / 2) {
    ctx.fillText(v.toFixed(1), toX(v), PAD.top + plotH + 16);
  }

  ctx.fillStyle = dark ? '#dddddd' : '#222222';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Volume Titrant Added (mL)', PAD.left + plotW / 2, H - 4);

  ctx.save();
  ctx.translate(12, PAD.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('pH', 0, 0);
  ctx.restore();
}

// ============================================================
// BEAKER ANIMATION
// ============================================================
let beakerCanvas, beakerCtx;
const particles = [];
let animFrame;

function initBeaker() {
  beakerCanvas = document.getElementById('beaker-canvas');
  beakerCtx = beakerCanvas.getContext('2d');
  spawnParticles();
  runBeakerAnimation();
}

function getParticleColor(type) {
  const colors = {
    'H+':  '#cc0000',
    'OH-': '#006699',
    'HA':  '#cc6600',
    'A-':  '#333399',
    'B':   '#660066',
    'BH+': '#ff6600',
    'H2O': '#99ccff',
    'Na+': '#cccccc',
    'Cl-': '#99cc99',
  };
  return colors[type] || '#aaaaaa';
}

function spawnParticles() {
  particles.length = 0;
  const W = beakerCanvas.width;
  const pH = state.dataPoints.length
    ? state.dataPoints[state.dataPoints.length - 1].pH
    : calculatePH(0);

  const types = getParticleTypes(pH);

  for (let i = 0; i < 55; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    particles.push({
      x: 20 + Math.random() * (W - 40),
      y: 60 + Math.random() * 150,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: 5 + Math.random() * 3,
      type,
      label: type,
      alpha: 0.8 + Math.random() * 0.2,
    });
  }
}

function getParticleTypes(pH) {
  if (state.type === 'SA_SB') {
    if (pH < 6.5) return ['H+', 'H+', 'H+', 'H2O', 'Cl-', 'Na+'];
    if (pH > 7.5) return ['OH-', 'OH-', 'OH-', 'H2O', 'Cl-', 'Na+'];
    return ['H2O', 'H2O', 'H2O', 'Cl-', 'Na+'];
  }
  if (state.type === 'WA_SB') {
    if (pH < 4) return ['H+', 'HA', 'HA', 'HA', 'H2O'];
    if (pH < 7) return ['HA', 'HA', 'A-', 'A-', 'H2O', 'Na+'];
    if (pH < 8) return ['A-', 'A-', 'A-', 'OH-', 'H2O'];
    return ['A-', 'OH-', 'OH-', 'H2O', 'Na+'];
  }
  if (pH > 10) return ['B', 'B', 'B', 'OH-', 'H2O'];
  if (pH > 7)  return ['B', 'B', 'BH+', 'H2O', 'Cl-'];
  if (pH > 4)  return ['BH+', 'BH+', 'B', 'H2O', 'Cl-', 'H+'];
  return ['BH+', 'BH+', 'H+', 'H2O', 'Cl-'];
}

function drawBeaker() {
  if (!beakerCtx) return;
  const ctx = beakerCtx;
  const W = beakerCanvas.width;
  const H = beakerCanvas.height;
  const dark = isDark;

  ctx.clearRect(0, 0, W, H);

  const bx = 14, by = 30, bw = W - 28, bh = H - 50;

  const pH = state.dataPoints.length
    ? state.dataPoints[state.dataPoints.length - 1].pH
    : calculatePH(0);
  const solutionColor = pHtoColor(pH, 0.2);

  ctx.fillStyle = solutionColor;
  ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);

  ctx.strokeStyle = dark ? '#aaaaaa' : '#222222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx, by + bh);
  ctx.lineTo(bx + bw, by + bh);
  ctx.lineTo(bx + bw, by);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx - 6, by);
  ctx.lineTo(bx + bw + 6, by);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bx + bw, by - 2);
  ctx.lineTo(bx + bw + 10, by - 10);
  ctx.stroke();

  if (!state.particleMode) {
    return;
  }

  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = getParticleColor(p.type);
    ctx.globalAlpha = p.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (p.r >= 6) {
      ctx.fillStyle = dark ? '#fff' : '#000';
      ctx.font = `bold ${Math.max(6, p.r - 1)}px Courier New`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, p.x, p.y);
    }
  });
}

function pHtoColor(pH, alpha = 1) {
  if (pH < 3)  return `rgba(204, 0, 0, ${alpha})`;
  if (pH < 5)  return `rgba(204, 102, 0, ${alpha})`;
  if (pH < 6)  return `rgba(204, 204, 0, ${alpha})`;
  if (pH < 7)  return `rgba(153, 204, 51, ${alpha})`;
  if (pH < 8)  return `rgba(51, 153, 51, ${alpha})`;
  if (pH < 9)  return `rgba(0, 102, 153, ${alpha})`;
  if (pH < 11) return `rgba(51, 51, 153, ${alpha})`;
  return `rgba(102, 0, 102, ${alpha})`;
}

function runBeakerAnimation() {
  function tick() {
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 20 || p.x > beakerCanvas.width - 20) p.vx *= -1;
      if (p.y < 35 || p.y > beakerCanvas.height - 60) p.vy *= -1;
      p.vx += (Math.random() - 0.5) * 0.04;
      p.vy += (Math.random() - 0.5) * 0.04;
      p.vx = Math.max(-0.8, Math.min(0.8, p.vx));
      p.vy = Math.max(-0.8, Math.min(0.8, p.vy));
    });

    drawBeaker();
    animFrame = requestAnimationFrame(tick);
  }
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = requestAnimationFrame(tick);
}

// ============================================================
// UI DATA UPDATES
// ============================================================
function updateDataPanel(vol) {
  const pH = calculatePH(vol);
  const cH  = Math.pow(10, -pH);
  const cOH = 1e-14 / cH;
  const pOH = -Math.log10(cOH);

  document.getElementById('dp-ph').textContent = pH.toFixed(2);
  document.getElementById('dp-poh').textContent = pOH.toFixed(2);
  document.getElementById('dp-h').textContent = formatSci(cH);
  document.getElementById('dp-oh').textContent = formatSci(cOH);
  document.getElementById('dp-vol').textContent = vol.toFixed(1) + ' mL';

  const pct = (pH / 14) * 100;
  document.getElementById('ph-bar').style.left = pct + '%';

  const ep = equivalencePointVol();
  const hep = ep / 2;
  const pKa = getCurrentPKa();
  const epCard = document.getElementById('dp-eq-card');
  const heqCard = document.getElementById('dp-heq-card');
  const bufCard = document.getElementById('dp-buffer-card');
  const hhCard = document.getElementById('hh-card');

  epCard.style.display = '';
  document.getElementById('dp-eq').textContent = state.ka2 ? `Diprotic System` : `${ep.toFixed(2)} mL (pH=${calculatePH(ep).toFixed(2)})`;

  if (pKa && !state.ka2) {
    heqCard.style.display = '';
    document.getElementById('dp-heq').textContent = `${hep.toFixed(2)} mL (pKa=${pKa.toFixed(2)})`;

    bufCard.style.display = '';
    const inBuffer = vol > 0.05 * ep && vol < 0.95 * ep;
    document.getElementById('dp-buffer').textContent = inBuffer
      ? `Active (${(vol / ep * 100).toFixed(0)}% to EP)`
      : `-`;

    const hh = getHHValues(vol);
    if (hh) {
      hhCard.style.display = '';
      document.getElementById('hh-values').innerHTML =
        `pKa = ${hh.pKa}<br>` +
        `[A-]/[HA] = ${hh.ratio}<br>` +
        `log([A-]/[HA]) = ${hh.logRatio}<br>` +
        `pH = ${hh.pKa} + ${hh.logRatio} = <b>${hh.calcPH}</b>`;
    } else {
      hhCard.style.display = 'none';
    }
  } else {
    heqCard.style.display = 'none';
    bufCard.style.display = 'none';
    hhCard.style.display = 'none';
  }

  const species = getSpecies(vol);
  const listEl = document.getElementById('species-list');
  listEl.innerHTML = species.map(s =>
    `<div class="species-row"><span>${s.name}</span><span>${formatSci(s.val)} M</span></div>`
  ).join('');

  document.getElementById('step-explanation-text').innerHTML = generateExplanation(vol);
}

function formatSci(n) {
  if (n === 0) return '0';
  if (n >= 0.001 && n < 1000) return n.toFixed(4);
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const coeff = n / Math.pow(10, exp);
  return `${coeff.toFixed(2)}x10^${exp}`;
}

// ============================================================
// TITRATION ACTIONS
// ============================================================
function addTitrant(mlToAdd) {
  const newVol = state.volAdded + mlToAdd;
  state.volAdded = newVol;

  const pH = calculatePH(newVol);
  state.dataPoints.push({ vol: newVol, pH });

  drawGraph();
  updateDataPanel(newVol);
  spawnParticles();
}

function undoDrop() {
  if (state.dataPoints.length > 0) {
    state.dataPoints.pop();
    state.volAdded = state.dataPoints.length > 0 ? state.dataPoints[state.dataPoints.length - 1].vol : 0;
    drawGraph();
    updateDataPanel(state.volAdded);
    spawnParticles();
  }
}

function refreshCurve() {
  state.dataPoints = [];
  if(state.volAdded > 0) {
      let steps = state.volAdded / 0.5;
      for(let i=0; i <= steps; i++) {
          let v = i * 0.5;
          if (v > state.volAdded) v = state.volAdded;
          state.dataPoints.push({vol: v, pH: calculatePH(v)});
      }
  }
  drawGraph();
  updateDataPanel(state.volAdded);
  spawnParticles();
}

function resetTitration() {
  state.volAdded = 0;
  state.dataPoints = [];
  if (state.autoInterval) { clearInterval(state.autoInterval); state.autoInterval = null; }
  drawGraph();
  updateDataPanel(0);
  document.getElementById('dp-ph').textContent = '-';
  spawnParticles();
}

function startAuto() {
  if (state.autoInterval) {
    clearInterval(state.autoInterval);
    state.autoInterval = null;
    document.getElementById('add-auto').textContent = 'Auto-fill';
    return;
  }
  document.getElementById('add-auto').textContent = 'Pause';
  state.autoInterval = setInterval(() => {
    const ep = equivalencePointVol();
    const max = state.ka2 ? ep * 3 : ep * 2;
    if (state.volAdded >= max) {
      clearInterval(state.autoInterval);
      state.autoInterval = null;
      document.getElementById('add-auto').textContent = 'Auto-fill';
      return;
    }
    addTitrant(parseFloat(document.getElementById('drop-size').value));
  }, 120);
}

// ============================================================
// INPUT VALIDATION
// ============================================================
function readInputs() {
  state.analyteVol  = parseFloat(document.getElementById('analyte-vol').value) || 25;
  state.analyteConc = parseFloat(document.getElementById('analyte-conc').value) || 0.1;
  state.titrantConc = parseFloat(document.getElementById('titrant-conc').value) || 0.1;
  if (state.type === 'WA_SB') {
    state.ka = parseFloat(document.getElementById('ka-val').value) || 1.8e-5;
  }
  if (state.type === 'SA_WB') {
    state.kb = parseFloat(document.getElementById('kb-val').value) || 1.8e-5;
  }
}


// ============================================================
// BUFFER SECTION
// ============================================================
let bufferInitialized = false;
const bufferState = {
  pKa: 4.76,
  cHA: 0.1,
  cA: 0.1,
  vol: 100,
  history: [], 
};

const BUFFER_SYSTEMS = {
  acetate:   { pKa: 4.76,  name: 'Acetic acid / Acetate' },
  phosphate: { pKa: 7.20,  name: 'Phosphate (H2PO4-/HPO4 2-)' },
  carbonate: { pKa: 10.33, name: 'Carbonate' },
  ammonia:   { pKa: 9.25,  name: 'Ammonia / Ammonium' },
  custom:    { pKa: 7.00,  name: 'Custom' },
};

function initBuffer() {
  bufferInitialized = true;
  document.getElementById('buffer-system').addEventListener('change', e => {
    const sys = e.target.value;
    if (sys === 'custom') {
      document.getElementById('custom-pka-group').style.display = '';
      bufferState.pKa = parseFloat(document.getElementById('custom-pka').value) || 7.0;
    } else {
      document.getElementById('custom-pka-group').style.display = 'none';
      bufferState.pKa = BUFFER_SYSTEMS[sys].pKa;
    }
    resetBuffer();
  });

  document.getElementById('custom-pka').addEventListener('input', e => {
    bufferState.pKa = parseFloat(e.target.value) || 7.0;
    updateBufferDisplay();
    drawBufferGraph();
  });

  ['buf-ha', 'buf-a', 'buf-vol'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      readBufferInputs();
      updateBufferDisplay();
      drawBufferGraph();
    });
  });

  const bufAddEl = document.getElementById('buf-add-amount');
  if (bufAddEl) {
    document.getElementById('buf-add-label').textContent = parseFloat(bufAddEl.value).toFixed(1);
    bufAddEl.addEventListener('input', e => {
      document.getElementById('buf-add-label').textContent = parseFloat(e.target.value).toFixed(1);
    });
  }

  const bufConcEl = document.getElementById('buf-add-conc');
  if (bufConcEl) {
    document.getElementById('buf-add-conc-label').textContent = parseFloat(bufConcEl.value).toFixed(3);
    bufConcEl.addEventListener('input', e => {
      document.getElementById('buf-add-conc-label').textContent = parseFloat(e.target.value).toFixed(3);
    });
  }

  readBufferInputs();
  updateBufferDisplay();
  drawBufferGraph();
}

function readBufferInputs() {
  bufferState.cHA = parseFloat(document.getElementById('buf-ha').value) || 0;
  bufferState.cA  = parseFloat(document.getElementById('buf-a').value)  || 0;
  bufferState.vol = parseFloat(document.getElementById('buf-vol').value) || 100;
  bufferState.excessH = 0;
  bufferState.excessOH = 0;
}

function addToBuffer(type, amount) {
  const addVol = parseFloat(document.getElementById('buf-add-amount').value);
  const addConc = parseFloat(document.getElementById('buf-add-conc').value) || 0.1;
  document.getElementById('buf-add-conc-label').textContent = addConc.toFixed(3);

  const totalVol = bufferState.vol + addVol;
  let mmolHA = bufferState.cHA * bufferState.vol;
  let mmolA  = bufferState.cA  * bufferState.vol;
  let exH    = (bufferState.excessH || 0) * bufferState.vol;
  let exOH   = (bufferState.excessOH || 0) * bufferState.vol;

  let mmolAdded = addConc * addVol;

  if (type === 'acid') {
    const nOH = Math.min(mmolAdded, exOH);
    exOH -= nOH;
    mmolAdded -= nOH;

    const consumed = Math.min(mmolAdded, mmolA);
    mmolHA += consumed;
    mmolA  -= consumed;
    mmolAdded -= consumed;

    exH += mmolAdded;
    if (mmolAdded > 0) showToast('Buffer capacity exceeded! pH dropped sharply.');
  } else {
    const nH = Math.min(mmolAdded, exH);
    exH -= nH;
    mmolAdded -= nH;

    const consumed = Math.min(mmolAdded, mmolHA);
    mmolHA -= consumed;
    mmolA  += consumed;
    mmolAdded -= consumed;

    exOH += mmolAdded;
    if (mmolAdded > 0) showToast('Buffer capacity exceeded! pH rose sharply.');
  }

  bufferState.vol = totalVol;
  bufferState.cHA = mmolHA / totalVol;
  bufferState.cA  = mmolA  / totalVol;
  bufferState.excessH = exH / totalVol;
  bufferState.excessOH = exOH / totalVol;

  const pH = bufferPH();
  bufferState.history.push({ action: type, pH });

  document.getElementById('buf-ha').value = bufferState.cHA.toFixed(4);
  document.getElementById('buf-a').value  = bufferState.cA.toFixed(4);
  document.getElementById('buf-vol').value = bufferState.vol.toFixed(1);

  updateBufferDisplay();
  drawBufferGraph();
}

function bufferPH() {
  const Ka = Math.pow(10, -bufferState.pKa);
  const C_W = bufferState.cHA + bufferState.cA;
  const C_Na_net = bufferState.cA + (bufferState.excessOH || 0) - (bufferState.excessH || 0);

  const Kw = 1e-14;

  if (C_W === 0) {
    if (C_Na_net > 0) return 14 + Math.log10(Math.max(1e-14, C_Na_net));
    if (C_Na_net < 0) return -Math.log10(Math.max(1e-14, -C_Na_net));
    return 7;
  }

  function delta(pH) {
    const H = Math.pow(10, -pH);
    const OH = Kw / H;
    const A_minus = C_W * Ka / (H + Ka);
    return H + C_Na_net - OH - A_minus;
  }

  let low = 0, high = 14;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (delta(mid) > 0) low = mid;
    else high = mid;
  }
  return low;
}

function resetBuffer() {
  readBufferInputs();
  bufferState.history = [];
  updateBufferDisplay();
  drawBufferGraph();
}

function updateBufferDisplay() {
  const pH = bufferPH();
  document.getElementById('buf-ph').textContent = pH.toFixed(3);
  document.getElementById('buf-pka').textContent = bufferState.pKa.toFixed(2);
  document.getElementById('buf-ha-val').textContent = bufferState.cHA.toFixed(4) + ' M';
  document.getElementById('buf-a-val').textContent  = bufferState.cA.toFixed(4) + ' M';

  const ratio = bufferState.cHA > 0 ? (bufferState.cA / bufferState.cHA).toFixed(3) : '∞';
  document.getElementById('buf-ratio').textContent = ratio;

  const logRatio = bufferState.cHA > 0 && bufferState.cA > 0
    ? Math.log10(bufferState.cA / bufferState.cHA).toFixed(3)
    : '-';
    
  let hhText = `pKa = ${bufferState.pKa.toFixed(2)}<br>log([A-]/[HA]) = ${logRatio}<br>`;
  if (logRatio !== '-') {
    const hb_ph = (bufferState.pKa + parseFloat(logRatio)).toFixed(3);
    hhText += `pH (approx) = <b>${hb_ph}</b><br><span style="font-size:0.85em; color: #888;">Exact pH: ${pH.toFixed(3)}</span>`;
  } else {
    hhText += `<b>Exact pH = ${pH.toFixed(3)}</b>`;
  }
  document.getElementById('buf-hh-values').innerHTML = hhText;

  const cTotal = bufferState.cHA + bufferState.cA;
  
  // Usable buffer capacity (educational definition): 
  // 100% at pH = pKa, scaling linearly to 0% at pH = pKa +/- 1
  const pH_current = bufferPH();
  let fraction = 1 - Math.abs(pH_current - bufferState.pKa);
  fraction = Math.max(0, Math.min(1, fraction));

  // If there's no weak acid/base at all, capacity is 0
  if (cTotal <= 0) fraction = 0;

  document.getElementById('cap-bar').style.width = (fraction * 100).toFixed(1) + '%';
  document.getElementById('cap-text').textContent = (fraction * 100).toFixed(0) + '%';
}

let bufferGraphCanvas, bufferGraphCtx;

function drawBufferGraph() {
  bufferGraphCanvas = document.getElementById('buffer-graph');
  if (!bufferGraphCanvas) return;
  bufferGraphCtx = bufferGraphCanvas.getContext('2d');
  const ctx = bufferGraphCtx;
  const W = bufferGraphCanvas.width;
  const H = bufferGraphCanvas.height;
  const dark = isDark;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = dark ? '#2b2b2b' : '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  function toX(pH) { return PAD.left + (pH / 14) * plotW; }
  function toY(f)  { return PAD.top + plotH - f * plotH; }

  ctx.strokeStyle = dark ? '#444444' : '#dddddd';
  ctx.lineWidth = 1;
  for (let f = 0; f <= 1; f += 0.25) {
    ctx.beginPath(); ctx.moveTo(PAD.left, toY(f)); ctx.lineTo(PAD.left + plotW, toY(f)); ctx.stroke();
  }
  for (let pH = 0; pH <= 14; pH += 2) {
    ctx.beginPath(); ctx.moveTo(toX(pH), PAD.top); ctx.lineTo(toX(pH), PAD.top + plotH); ctx.stroke();
  }

  const pKa = bufferState.pKa;
  const Ka = Math.pow(10, -pKa);

  ctx.strokeStyle = '#006699';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const pH = (i / 200) * 14;
    const cH = Math.pow(10, -pH);
    const alphaA = Ka / (Ka + cH);
    const x = toX(pH);
    const y = toY(alphaA);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const pH = (i / 200) * 14;
    const cH = Math.pow(10, -pH);
    const alphaHA = cH / (Ka + cH);
    const x = toX(pH);
    const y = toY(alphaHA);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#cc6600';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(toX(pKa), PAD.top);
  ctx.lineTo(toX(pKa), PAD.top + plotH);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#cc6600';
  ctx.font = 'bold 10px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`pKa=${pKa.toFixed(2)}`, toX(pKa), PAD.top + 12);

  const bLow = Math.max(0, pKa - 1);
  const bHigh = Math.min(14, pKa + 1);
  ctx.fillStyle = 'rgba(0,102,153,0.1)';
  ctx.fillRect(toX(bLow), PAD.top, toX(bHigh) - toX(bLow), plotH);

  const curPH = bufferPH();
  const cH_cur = Math.pow(10, -curPH);
  const alphaA_cur = Ka / (Ka + cH_cur);
  drawDownArrow(ctx, toX(curPH), toY(alphaA_cur), '#660066');

  bufferState.history.forEach(pt => {
    const cH = Math.pow(10, -pt.pH);
    const fA = Ka / (Ka + cH);
    ctx.fillStyle = pt.action === 'acid' ? 'rgba(204,0,0,0.6)' : 'rgba(0,102,153,0.6)';
    ctx.fillRect(toX(pt.pH) - 3, toY(fA) - 3, 6, 6);
  });

  ctx.strokeStyle = dark ? '#dddddd' : '#222222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, PAD.top + plotH);
  ctx.lineTo(PAD.left + plotW, PAD.top + plotH);
  ctx.stroke();

  ctx.fillStyle = dark ? '#eeeeee' : '#111111';
  ctx.font = '10px Courier New, monospace';
  ctx.textAlign = 'right';
  for (let f = 0; f <= 1; f += 0.25) {
    ctx.fillText(f.toFixed(2), PAD.left - 4, toY(f) + 4);
  }
  ctx.textAlign = 'center';
  for (let pH = 0; pH <= 14; pH += 2) {
    ctx.fillText(pH, toX(pH), PAD.top + plotH + 14);
  }

  ctx.font = 'bold 12px Arial';
  ctx.fillText('pH', PAD.left + plotW / 2, H - 4);

  ctx.font = '11px Arial';
  ctx.fillStyle = '#cc0000';
  ctx.textAlign = 'left';
  ctx.fillText(' [HA] fraction', PAD.left + 4, PAD.top + 24);
  ctx.fillStyle = '#006699';
  ctx.fillText(' [A-] fraction', PAD.left + 4, PAD.top + 38);
  ctx.fillStyle = '#cc6600';
  ctx.fillText(' pKa', PAD.left + 4, PAD.top + 52);
  ctx.fillStyle = '#5588aa';
  ctx.fillText(' Buffer region (pKa +/- 1)', PAD.left + 4, PAD.top + 66);
}

// ============================================================
// pH & pKa SECTION
// ============================================================
let phkaInitialized = false;
let phkaGraphCanvas, phkaGraphCtx;
let phkaPieCanvas, phkaPieCtx;

function initPhKa() {
  phkaInitialized = true;
  phkaGraphCanvas = document.getElementById('phka-graph');
  phkaGraphCtx = phkaGraphCanvas.getContext('2d');
  phkaPieCanvas = document.getElementById('phka-pie');
  phkaPieCtx = phkaPieCanvas.getContext('2d');

  const pkaEl = document.getElementById('phka-pka');
  if (pkaEl) {
    document.getElementById('phka-pka-val').textContent = parseFloat(pkaEl.value).toFixed(2);
    pkaEl.addEventListener('input', e => {
      document.getElementById('phka-pka-val').textContent = parseFloat(e.target.value).toFixed(2);
      drawPhKaGraph();
      drawPie();
      updatePhKaCard();
    });
  }

  const phEl = document.getElementById('phka-ph');
  if (phEl) {
    document.getElementById('phka-ph-val').textContent = parseFloat(phEl.value).toFixed(2);
    phEl.addEventListener('input', e => {
      document.getElementById('phka-ph-val').textContent = parseFloat(e.target.value).toFixed(2);
      drawPhKaGraph();
      drawPie();
      updatePhKaCard();
    });
  }

  drawPhKaGraph();
  drawPie();
  updatePhKaCard();
}

function drawPhKaGraph() {
  const ctx = phkaGraphCtx;
  const W = phkaGraphCanvas.width;
  const H = phkaGraphCanvas.height;
  const dark = isDark;
  const pKa = parseFloat(document.getElementById('phka-pka').value);
  const curPH = parseFloat(document.getElementById('phka-ph').value);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = dark ? '#2b2b2b' : '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  function toX(pH) { return PAD.left + (pH / 14) * plotW; }
  function toY(f)  { return PAD.top + plotH - f * plotH; }

  const Ka = Math.pow(10, -pKa);

  ctx.strokeStyle = dark ? '#444444' : '#dddddd';
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(f => {
    ctx.beginPath(); ctx.moveTo(PAD.left, toY(f)); ctx.lineTo(PAD.left + plotW, toY(f)); ctx.stroke();
  });
  for (let pH = 0; pH <= 14; pH += 2) {
    ctx.beginPath(); ctx.moveTo(toX(pH), PAD.top); ctx.lineTo(toX(pH), PAD.top + plotH); ctx.stroke();
  }

  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 400; i++) {
    const pH = (i / 400) * 14;
    const cH = Math.pow(10, -pH);
    const f = cH / (Ka + cH);
    i === 0 ? ctx.moveTo(toX(pH), toY(f)) : ctx.lineTo(toX(pH), toY(f));
  }
  ctx.stroke();

  ctx.strokeStyle = '#006699';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 400; i++) {
    const pH = (i / 400) * 14;
    const cH = Math.pow(10, -pH);
    const f = Ka / (Ka + cH);
    i === 0 ? ctx.moveTo(toX(pH), toY(f)) : ctx.lineTo(toX(pH), toY(f));
  }
  ctx.stroke();

  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#cc6600';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(toX(pKa), PAD.top); ctx.lineTo(toX(pKa), PAD.top + plotH);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#cc6600';
  ctx.font = 'bold 10px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`pKa=${pKa.toFixed(2)}`, toX(pKa), PAD.top + 12);

  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#660066';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(toX(curPH), PAD.top); ctx.lineTo(toX(curPH), PAD.top + plotH);
  ctx.stroke();
  ctx.setLineDash([]);

  const cH_cur = Math.pow(10, -curPH);
  const fHA = cH_cur / (Ka + cH_cur);
  const fA  = Ka    / (Ka + cH_cur);

  drawDownArrow(ctx, toX(curPH), toY(fHA), '#660066');
  drawDownArrow(ctx, toX(curPH), toY(fA), '#660066');

  ctx.strokeStyle = dark ? '#dddddd' : '#222222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, PAD.top + plotH);
  ctx.lineTo(PAD.left + plotW, PAD.top + plotH);
  ctx.stroke();

  ctx.fillStyle = dark ? '#eeeeee' : '#111111';
  ctx.font = '10px Courier New, monospace';
  ctx.textAlign = 'right';
  [0, 0.25, 0.5, 0.75, 1].forEach(f => ctx.fillText(f.toFixed(2), PAD.left - 4, toY(f) + 4));
  ctx.textAlign = 'center';
  for (let pH = 0; pH <= 14; pH += 2) ctx.fillText(pH, toX(pH), PAD.top + plotH + 14);
  
  ctx.font = 'bold 12px Arial';
  ctx.fillText('pH', PAD.left + plotW / 2, H - 4);

  ctx.textAlign = 'left';
  ctx.font = '11px Arial';
  ctx.fillStyle = '#cc0000'; ctx.fillText(' [HA] fraction', PAD.left + 4, PAD.top + 22);
  ctx.fillStyle = '#006699'; ctx.fillText(' [A-] fraction', PAD.left + 4, PAD.top + 36);
  ctx.fillStyle = '#660066'; ctx.fillText(' Current pH', PAD.left + 4, PAD.top + 50);
}

function drawPie() {
  const ctx = phkaPieCtx;
  const W = phkaPieCanvas.width;
  const H = phkaPieCanvas.height;
  const dark = isDark;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = dark ? '#2b2b2b' : '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const pKa = parseFloat(document.getElementById('phka-pka').value);
  const curPH = parseFloat(document.getElementById('phka-ph').value);
  const Ka = Math.pow(10, -pKa);
  const cH = Math.pow(10, -curPH);
  const fA  = Ka / (Ka + cH);
  const fHA = cH / (Ka + cH);

  const cx = W / 2, cy = H / 2 - 10, r = 72;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + fHA * 2 * Math.PI);
  ctx.closePath();
  ctx.fillStyle = '#cc0000';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2 + fHA * 2 * Math.PI, -Math.PI / 2 + 2 * Math.PI);
  ctx.closePath();
  ctx.fillStyle = '#006699';
  ctx.fill();

  ctx.fillStyle = dark ? '#eeeeee' : '#111111';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (fHA > 0.05) {
    const midAngle = -Math.PI / 2 + fHA * Math.PI;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${(fHA * 100).toFixed(1)}%`, cx + Math.cos(midAngle) * r * 0.6, cy + Math.sin(midAngle) * r * 0.6);
  }
  if (fA > 0.05) {
    const midAngle = -Math.PI / 2 + fHA * 2 * Math.PI + fA * Math.PI;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${(fA * 100).toFixed(1)}%`, cx + Math.cos(midAngle) * r * 0.6, cy + Math.sin(midAngle) * r * 0.6);
  }

  document.getElementById('pie-legend').innerHTML =
    `<span style="color:#cc0000; font-weight:bold;">[ ]</span> [HA] = ${(fHA * 100).toFixed(1)}%<br>` +
    `<span style="color:#006699; font-weight:bold;">[ ]</span> [A-] = ${(fA * 100).toFixed(1)}%`;
}

function updatePhKaCard() {
  const pKa = parseFloat(document.getElementById('phka-pka').value);
  const pH  = parseFloat(document.getElementById('phka-ph').value);
  const diff = pH - pKa;
  const Ka = Math.pow(10, -pKa);
  const cH = Math.pow(10, -pH);
  const fA  = (Ka / (Ka + cH) * 100).toFixed(1);
  const fHA = (cH / (Ka + cH) * 100).toFixed(1);

  let comparison, explain;
  if (Math.abs(diff) < 0.05) {
    comparison = 'pH = pKa';
    explain = 'Equal amounts of acid and conjugate base. Maximum buffer capacity. log([A-]/[HA]) = 0.';
  } else if (diff < 0) {
    comparison = `pH < pKa (by ${Math.abs(diff).toFixed(2)})`;
    explain = `Solution is more acidic than pKa. HA dominates (${fHA}% acid form). [A-]/[HA] < 1.`;
  } else {
    comparison = `pH > pKa (by ${diff.toFixed(2)})`;
    explain = `Solution is more basic than pKa. A- dominates (${fA}% base form). [A-]/[HA] > 1.`;
  }

  document.getElementById('phka-comparison').textContent = comparison;
  document.getElementById('phka-fractions').innerHTML =
    `[HA] = ${fHA}% [A-] = ${fA}%<br>log([A-]/[HA]) = ${diff.toFixed(3)}`;
  document.getElementById('phka-label-explain').textContent = explain;
}

// ============================================================
// HERO CANVAS ANIMATION
// ============================================================
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  
  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const ctx = canvas.getContext('2d');
  
  const heroParticles = Array.from({ length: 45 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 6 + Math.random() * 8,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    type: ['H+','OH-','HA','A-','H2O'][Math.floor(Math.random() * 5)],
    color: ['#cc0000','#006699','#cc6600','#333399','#99ccff'][Math.floor(Math.random() * 5)],
    phase: Math.random() * Math.PI * 2,
  }));

  let t = 0;
  function tick() {
    const W = canvas.width;
    const H = canvas.height;
    
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = isDark ? '#2b2b2b' : '#ffffff';
    ctx.fillRect(0, 0, W, H);

    heroParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < p.r || p.x > W - p.r) p.vx *= -1;
      if (p.y < p.r || p.y > H - p.r) p.vy *= -1;

      const pulse = 1 + 0.12 * Math.sin(t * 0.03 + p.phase);
      const rr = p.r * pulse;

      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isDark ? '#dddddd' : '#222222';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(7, rr - 2)}px Courier New`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type, p.x, p.y);
    });
    t++;
    requestAnimationFrame(tick);
  }
  tick();
}

// ============================================================
// EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  // Reset all inputs and selects to their default HTML states
  // to prevent the browser from remembering them across soft reloads.
  document.querySelectorAll('input').forEach(input => {
    if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = input.defaultChecked;
    } else {
      input.value = input.defaultValue;
    }
  });
  document.querySelectorAll('select').forEach(select => {
    const defaultOption = select.querySelector('option[selected]');
    if (defaultOption) {
      select.value = defaultOption.value;
    } else if (select.options.length > 0) {
      select.value = select.options[0].value;
    }
  });

  initGraph();
  initBeaker();
  initHeroCanvas();

  readInputs();
  updateDataPanel(0);

  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.type = btn.dataset.type;

      document.getElementById('ka-group').style.display = state.type === 'WA_SB' ? '' : 'none';
      document.getElementById('kb-group').style.display = state.type === 'SA_WB' ? '' : 'none';

      resetTitration();
    });
  });

  ['analyte-vol', 'analyte-conc', 'titrant-conc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        document.getElementById(id + '-label').textContent = parseFloat(el.value).toFixed(id.includes('vol') ? 0 : 3);
        el.addEventListener('input', (e) => {
            document.getElementById(id + '-label').textContent = parseFloat(e.target.value).toFixed(id.includes('vol') ? 0 : 3);
            readInputs();
            refreshCurve();
        });
    }
  });

  ['ka-val', 'kb-val'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      state.ka2 = null; 
      readInputs();
      refreshCurve();
    });
  });

  const dsEl = document.getElementById('drop-size');
  if (dsEl) {
    document.getElementById('drop-size-label').textContent = parseFloat(dsEl.value).toFixed(1);
    dsEl.addEventListener('input', e => {
      document.getElementById('drop-size-label').textContent = parseFloat(e.target.value).toFixed(1);
    });
  }

  document.getElementById('add-drop').addEventListener('click', () => {
    readInputs();
    const dropSize = parseFloat(document.getElementById('drop-size').value);
    addTitrant(dropSize);
  });

  document.getElementById('undo-drop').addEventListener('click', undoDrop);

  document.getElementById('add-auto').addEventListener('click', () => {
    readInputs();
    startAuto();
  });

  document.getElementById('reset-titration').addEventListener('click', resetTitration);

  document.getElementById('particle-toggle').addEventListener('change', e => {
    state.particleMode = e.target.checked;
    document.getElementById('beaker-section').style.display = e.target.checked ? 'flex' : 'none';
  });

  document.querySelectorAll('.preset-btn:not(.kb-preset)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('ka-val').value = btn.dataset.ka;
      state.ka = parseFloat(btn.dataset.ka);
      state.ka2 = btn.dataset.ka2 ? parseFloat(btn.dataset.ka2) : null;
      showToast(`Set to ${btn.dataset.name}`);
      refreshCurve();
    });
  });

  document.querySelectorAll('.kb-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('kb-val').value = btn.dataset.kb;
      state.kb = parseFloat(btn.dataset.kb);
      showToast(`Set to ${btn.dataset.name}`);
      refreshCurve();
    });
  });

  updateDataPanel(0);
});
