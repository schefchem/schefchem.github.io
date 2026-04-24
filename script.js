const unitContainer = document.getElementById("unitContainer");
const tabs = Array.from(document.querySelectorAll(".tab"));
const progressBadge = document.getElementById("progressBadge");
const darkModeToggle = document.getElementById("darkModeToggle");

const state = {
  activeUnit: "unit1",
  completedUnits: JSON.parse(localStorage.getItem("schefchem-completed") || "[]"),
  darkMode: localStorage.getItem("schefchem-dark") === "1",
};
const PHENOLPHTHALEIN_TRANSITION_PH = 8.2;
const PHENOLPHTHALEIN_PINK = "rgba(255, 100, 150, 0.45)";
const SOLUTION_BLUE = "rgba(100, 180, 255, 0.33)";
const PARTICLE_CONCENTRATION_SCALE = 8;
const MIN_PARTICLE_COUNT = 22;

if (state.darkMode) document.body.classList.add("dark");

const quizzes = {
  unit1: {
    q: "Across period 2, atomic radius generally...",
    options: ["Increases", "Decreases", "Stays constant"],
    answer: 1,
    explain: "Effective nuclear charge increases left to right, pulling electrons closer.",
  },
  unit2: {
    q: "Ionic compounds are held together mainly by...",
    options: ["Dispersion forces", "Electrostatic attraction", "Hydrogen bonding"],
    answer: 1,
    explain: "Opposite charges attract strongly in ionic lattices.",
  },
  unit3: {
    q: "The strongest common IMF between neutral molecules is...",
    options: ["London dispersion", "Dipole-dipole", "Hydrogen bonding"],
    answer: 2,
    explain: "Hydrogen bonding is a strong, directional dipole interaction.",
  },
  unit4: {
    q: "In a net ionic equation, spectator ions are...",
    options: ["Retained", "Cancelled", "Converted into precipitate"],
    answer: 1,
    explain: "Spectator ions appear unchanged on both sides and are cancelled.",
  },
  unit5: {
    q: "Increasing reactant concentration usually makes rate...",
    options: ["Slower", "Faster", "Unchanged"],
    answer: 1,
    explain: "More collisions per second increases effective collision frequency.",
  },
  unit6: {
    q: "A reaction is spontaneous when ΔG is...",
    options: ["Positive", "Zero", "Negative"],
    answer: 2,
    explain: "Negative Gibbs free energy indicates thermodynamic favorability.",
  },
  unit7: {
    q: "If product concentration increases, equilibrium shifts...",
    options: ["Left", "Right", "No change"],
    answer: 0,
    explain: "Le Châtelier: system shifts to consume added product.",
  },
  unit8: {
    q: "At half-equivalence in WA/SB titration, pH equals...",
    options: ["7", "pKa", "pKb"],
    answer: 1,
    explain: "When [HA]=[A−], Henderson–Hasselbalch gives pH = pKa.",
  },
  unit9: {
    q: "In Nernst equation, increasing product/reactant ratio makes E...",
    options: ["Decrease", "Increase", "Unchanged"],
    answer: 0,
    explain: "Larger Q lowers E from E° for spontaneous galvanic cells.",
  },
};

const units = {
  unit1: {
    title: "Atomic Structure & Properties",
    subtitle: "Visualize periodic trends and build intuition for electron behavior.",
    render: renderUnit1,
  },
  unit2: {
    title: "Molecular & Ionic Compound Structure",
    subtitle: "Compare bonding models and how structure controls properties.",
    render: renderUnit2,
  },
  unit3: {
    title: "Intermolecular Forces & Properties",
    subtitle: "Explore IMF strength and how it affects phase and boiling behavior.",
    render: renderUnit3,
  },
  unit4: {
    title: "Chemical Reactions",
    subtitle: "Classify reactions and observe ionic-level changes.",
    render: renderUnit4,
  },
  unit5: {
    title: "Kinetics",
    subtitle: "Model how concentration and temperature shape reaction rate.",
    render: renderUnit5,
  },
  unit6: {
    title: "Thermodynamics",
    subtitle: "Connect ΔH, ΔS, and temperature to spontaneity.",
    render: renderUnit6,
  },
  unit7: {
    title: "Equilibrium",
    subtitle: "Apply Le Châtelier's principle through dynamic concentration shifts.",
    render: renderUnit7,
  },
  unit8: {
    title: "Acids & Bases — Advanced Titration Lab",
    subtitle: "High-detail simulation for SA/SB, WA/SB, and SA/WB titrations.",
    render: renderUnit8,
  },
  unit9: {
    title: "Applications of Thermodynamics",
    subtitle: "Relate electrochemistry and free energy in real systems.",
    render: renderUnit9,
  },
};

function updateProgressBadge() {
  const unique = new Set(state.completedUnits);
  progressBadge.textContent = `${unique.size} / 9 complete`;
  localStorage.setItem("schefchem-completed", JSON.stringify(Array.from(unique)));
}

function markUnitComplete(unit) {
  if (!state.completedUnits.includes(unit)) state.completedUnits.push(unit);
  updateProgressBadge();
}

function attachQuiz(unitId) {
  const quiz = quizzes[unitId];
  const template = document.getElementById("quizTemplate");
  const node = template.content.cloneNode(true);
  node.querySelector(".quiz-question").textContent = quiz.q;
  const options = node.querySelector(".quiz-options");
  const feedback = node.querySelector(".quiz-feedback");
  quiz.options.forEach((label, i) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      if (i === quiz.answer) {
        feedback.textContent = `✅ Correct. ${quiz.explain}`;
        feedback.style.color = "var(--ok)";
        markUnitComplete(unitId);
      } else {
        feedback.textContent = "❌ Try again and focus on the conceptual trend.";
        feedback.style.color = "var(--danger)";
      }
    });
    options.appendChild(btn);
  });
  unitContainer.appendChild(node);
}

function setActiveTab(unitId) {
  state.activeUnit = unitId;
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.unit === unitId));
  renderUnit(unitId);
}

function renderUnit(unitId) {
  const unit = units[unitId];
  unitContainer.classList.remove("fade-in");
  void unitContainer.offsetWidth;
  unitContainer.classList.add("fade-in");
  unitContainer.innerHTML = `
    <section class="unit-header">
      <h2>${unit.title}</h2>
      <p>${unit.subtitle}</p>
    </section>
  `;
  unit.render();
  attachQuiz(unitId);
}

function unitCard(html) {
  const section = document.createElement("section");
  section.className = "card";
  section.innerHTML = html;
  return section;
}

function fmtExp(v) {
  if (!isFinite(v)) return "—";
  if (v === 0) return "0";
  if (Math.abs(v) >= 0.01 && Math.abs(v) < 1000) return v.toFixed(4);
  return v.toExponential(3);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function validateNumberInput(value, { min = 0, max = Infinity }) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

function drawSimpleBar(canvas, fraction, color = "#2f7ef7", label = "") {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(128,128,128,0.15)";
  ctx.fillRect(20, h / 2 - 12, w - 40, 24);
  ctx.fillStyle = color;
  ctx.fillRect(20, h / 2 - 12, (w - 40) * clamp(fraction, 0, 1), 24);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text");
  ctx.font = "14px sans-serif";
  ctx.fillText(label, 20, h / 2 - 18);
}

function drawLineGraph(canvas, points, { xMax, yMax = 14, yMin = 0, highlight = null }) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const m = { l: 45, r: 12, t: 15, b: 34 };
  const plotW = w - m.l - m.r;
  const plotH = h - m.t - m.b;

  const toX = (x) => m.l + (x / Math.max(1e-9, xMax)) * plotW;
  const toY = (y) => m.t + ((yMax - y) / (yMax - yMin)) * plotH;

  if (highlight) {
    ctx.fillStyle = "rgba(31, 187, 166, 0.16)";
    const x1 = toX(clamp(highlight.start, 0, xMax));
    const x2 = toX(clamp(highlight.end, 0, xMax));
    ctx.fillRect(x1, m.t, Math.max(0, x2 - x1), plotH);
  }

  ctx.strokeStyle = "rgba(120,120,120,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(m.l, m.t);
  ctx.lineTo(m.l, h - m.b);
  ctx.lineTo(w - m.r, h - m.b);
  ctx.stroke();

  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text");
  ctx.font = "12px sans-serif";
  for (let i = 0; i <= 7; i++) {
    const y = i * 2;
    const py = toY(y);
    ctx.fillText(String(y), 8, py + 4);
    ctx.strokeStyle = "rgba(120,120,120,0.12)";
    ctx.beginPath();
    ctx.moveTo(m.l, py);
    ctx.lineTo(w - m.r, py);
    ctx.stroke();
  }

  ctx.fillText("Volume Added (mL)", w / 2 - 45, h - 7);
  ctx.save();
  ctx.translate(12, h / 2 + 25);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("pH", 0, 0);
  ctx.restore();

  if (!points.length) return;
  ctx.strokeStyle = "#2f7ef7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((pt, i) => {
    const x = toX(pt.x);
    const y = toY(pt.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const last = points[points.length - 1];
  ctx.fillStyle = "#cf3f5e";
  ctx.beginPath();
  ctx.arc(toX(last.x), toY(last.y), 4, 0, Math.PI * 2);
  ctx.fill();
}

function renderUnit1() {
  const layout = document.createElement("div");
  layout.className = "layout-2";
  layout.append(
    unitCard(`
      <h3>Atomic Radius Trends</h3>
      <label for="trendMode">Trend direction</label>
      <select id="trendMode">
        <option value="period">Across a period</option>
        <option value="group">Down a group</option>
      </select>
      <label for="positionSlider">Position</label>
      <input id="positionSlider" type="range" min="1" max="8" value="1" />
      <p id="radiusReadout" class="notice"></p>
      <div class="canvas-wrap"><canvas id="radiusCanvas" height="220"></canvas></div>
      <p class="small-note">Visual cue: left→right shrinks radius, top→bottom expands radius.</p>
    `),
    unitCard(`
      <h3>Concept Link</h3>
      <p>Radius is controlled by <strong>effective nuclear charge</strong> and electron shell distance.</p>
      <div class="kpi">
        <div><strong>Across period:</strong> Zeff increases</div>
        <div><strong>Down group:</strong> shells increase</div>
        <div><strong>Coulomb pull:</strong> stronger with Zeff</div>
        <div><strong>Shielding:</strong> stronger with inner electrons</div>
      </div>
    `)
  );
  unitContainer.appendChild(layout);

  const trendMode = document.getElementById("trendMode");
  const slider = document.getElementById("positionSlider");
  const readout = document.getElementById("radiusReadout");
  const canvas = document.getElementById("radiusCanvas");

  function draw() {
    const isPeriod = trendMode.value === "period";
    const pos = Number(slider.value);
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    for (let i = 1; i <= 8; i++) {
      const x = 50 + (i - 1) * ((w - 100) / 7);
      const base = isPeriod ? 40 - i * 3 : 12 + i * 4;
      const r = clamp(base, 10, 42);
      ctx.beginPath();
      ctx.fillStyle = i === pos ? "#2f7ef7" : "rgba(47,126,247,0.25)";
      ctx.arc(x, h / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text");
      ctx.font = "12px sans-serif";
      ctx.fillText(String(i), x - 3, h / 2 + 4);
    }

    if (isPeriod) {
      readout.textContent = `Position ${pos}: radius decreases as proton pull dominates across the period.`;
    } else {
      readout.textContent = `Position ${pos}: radius increases as atoms gain new electron shells down the group.`;
    }
  }

  trendMode.addEventListener("change", draw);
  slider.addEventListener("input", draw);
  draw();
}

function renderUnit2() {
  const layout = document.createElement("div");
  layout.className = "layout-2";
  layout.append(
    unitCard(`
      <h3>Bonding Model Explorer</h3>
      <label for="bondType">Structure type</label>
      <select id="bondType">
        <option value="ionic">Ionic Lattice</option>
        <option value="molecular">Molecular Covalent</option>
        <option value="network">Network Covalent</option>
      </select>
      <div class="canvas-wrap"><canvas id="bondCanvas" height="220"></canvas></div>
      <p id="bondNote" class="notice"></p>
    `),
    unitCard(`
      <h3>Property Contrast</h3>
      <div class="kpi" id="bondKpi"></div>
    `)
  );
  unitContainer.appendChild(layout);

  const type = document.getElementById("bondType");
  const canvas = document.getElementById("bondCanvas");
  const note = document.getElementById("bondNote");
  const kpi = document.getElementById("bondKpi");

  function drawBond() {
    const val = type.value;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const profiles = {
      ionic: {
        note: "Ionic solids form repeating lattices of alternating charges.",
        kpi: ["High mp/bp", "Brittle", "Conducts when molten", "Water-soluble tendency"],
      },
      molecular: {
        note: "Molecules are discrete units; IMFs dominate bulk behavior.",
        kpi: ["Lower mp/bp", "Often soft/volatile", "Poor conductivity", "Shape-dependent polarity"],
      },
      network: {
        note: "Covalent networks are giant bonded structures (e.g., diamond, SiO2).",
        kpi: ["Very high mp", "Hard/rigid", "Usually non-conductive", "Directional bonding"],
      },
    };

    if (val === "ionic") {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
          const x = 35 + c * 45;
          const y = 35 + r * 45;
          const plus = (r + c) % 2 === 0;
          ctx.fillStyle = plus ? "#2f7ef7" : "#cf3f5e";
          ctx.beginPath();
          ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillText(plus ? "+" : "−", x - 3, y + 4);
        }
      }
    }
    if (val === "molecular") {
      for (let i = 0; i < 8; i++) {
        const x = 50 + (i % 4) * 80;
        const y = 50 + Math.floor(i / 4) * 95;
        ctx.strokeStyle = "#6e84a4";
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x + 12, y);
        ctx.stroke();
        ctx.fillStyle = "#44d1bd";
        ctx.beginPath();
        ctx.arc(x - 15, y, 9, 0, Math.PI * 2);
        ctx.arc(x + 15, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (val === "network") {
      ctx.strokeStyle = "#44d1bd";
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
          const x = 35 + i * 60;
          const y = 35 + j * 38;
          if (i < 5) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 60, y + 20);
            ctx.stroke();
          }
          if (j < 4) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 38);
            ctx.stroke();
          }
          ctx.fillStyle = "#2f7ef7";
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    note.textContent = profiles[val].note;
    kpi.innerHTML = profiles[val].kpi.map((x) => `<div>${x}</div>`).join("");
  }

  type.addEventListener("change", drawBond);
  drawBond();
}

function renderUnit3() {
  unitContainer.appendChild(
    unitCard(`
      <h3>IMF Strength Simulator</h3>
      <div class="layout-2">
        <div>
          <label for="imfType">Molecule type</label>
          <select id="imfType">
            <option value="ldf">Nonpolar (LDF dominant)</option>
            <option value="dipole">Polar (Dipole-dipole)</option>
            <option value="hbond">Hydrogen-bonding</option>
          </select>
          <label for="imfTemp">Temperature (°C)</label>
          <input id="imfTemp" type="range" min="-50" max="150" value="25" />
          <p id="imfReadout" class="notice"></p>
        </div>
        <div>
          <div class="canvas-wrap"><canvas id="imfCanvas" height="180"></canvas></div>
          <p class="small-note">Higher IMF strength generally raises boiling point and reduces volatility.</p>
        </div>
      </div>
    `)
  );

  const type = document.getElementById("imfType");
  const temp = document.getElementById("imfTemp");
  const readout = document.getElementById("imfReadout");
  const canvas = document.getElementById("imfCanvas");

  function update() {
    const t = Number(temp.value);
    const base = { ldf: 0.35, dipole: 0.6, hbond: 0.85 }[type.value];
    const thermalDisruption = clamp((t + 50) / 200, 0, 1) * 0.55;
    const effective = clamp(base - thermalDisruption + 0.15, 0, 1);
    const phase = effective > 0.62 ? "More liquid-like" : effective > 0.35 ? "Mixed tendency" : "More gas-like";
    readout.textContent = `IMF effectiveness: ${(effective * 100).toFixed(1)}% at ${t}°C → ${phase}`;
    drawSimpleBar(canvas, effective, "#44d1bd", "Relative intermolecular attraction");
  }

  type.addEventListener("change", update);
  temp.addEventListener("input", update);
  update();
}

function renderUnit4() {
  unitContainer.appendChild(
    unitCard(`
      <h3>Reaction Type + Net Ionic Explorer</h3>
      <label for="rxnType">Select reaction</label>
      <select id="rxnType">
        <option value="precip">AgNO₃ + NaCl → AgCl(s) + NaNO₃</option>
        <option value="acidbase">HCl + NaOH → NaCl + H₂O</option>
        <option value="redox">Zn + CuSO₄ → ZnSO₄ + Cu</option>
      </select>
      <div class="layout-2">
        <div>
          <p id="rxnDetails" class="notice"></p>
          <div class="legend" id="rxnLegend"></div>
        </div>
        <div class="canvas-wrap"><canvas id="rxnCanvas" height="190"></canvas></div>
      </div>
    `)
  );

  const type = document.getElementById("rxnType");
  const details = document.getElementById("rxnDetails");
  const legend = document.getElementById("rxnLegend");
  const canvas = document.getElementById("rxnCanvas");

  function draw() {
    const val = type.value;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const profiles = {
      precip: {
        details: "Net ionic: Ag⁺ + Cl⁻ → AgCl(s). Insoluble solid forms and drops out.",
        legend: ["Ag⁺", "Cl⁻", "AgCl(s) precipitate"],
      },
      acidbase: {
        details: "Net ionic: H⁺ + OH⁻ → H₂O. Neutralization reduces free acid/base ions.",
        legend: ["H⁺", "OH⁻", "H₂O"],
      },
      redox: {
        details: "Zn is oxidized and Cu²⁺ is reduced; electrons transfer drives the reaction.",
        legend: ["Zn(s)", "Cu²⁺", "Cu(s)"],
      },
    };

    if (val === "precip") {
      for (let i = 0; i < 30; i++) {
        const x = 18 + ((i * 31) % (w - 35));
        const y = 22 + ((i * 17) % 90);
        ctx.fillStyle = i % 2 ? "#2f7ef7" : "#44d1bd";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#c0c7d6";
      for (let i = 0; i < 18; i++) {
        const x = 30 + i * 16;
        const y = 130 + (i % 4) * 8;
        ctx.fillRect(x, y, 10, 6);
      }
    }

    if (val === "acidbase") {
      for (let i = 0; i < 36; i++) {
        const x = 20 + ((i * 19) % (w - 40));
        const y = 25 + ((i * 23) % (h - 60));
        const acid = i % 2 === 0;
        ctx.fillStyle = acid ? "#cf3f5e" : "#2f7ef7";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#44d1bd";
      for (let i = 0; i < 12; i++) {
        const x = 30 + i * 24;
        const y = 130 + (i % 3) * 9;
        ctx.fillText("H₂O", x, y);
      }
    }

    if (val === "redox") {
      ctx.fillStyle = "#8a8f98";
      ctx.fillRect(20, 30, 45, 130);
      ctx.fillStyle = "#a4632a";
      for (let i = 0; i < 18; i++) {
        const x = 180 + (i % 5) * 18;
        const y = 40 + Math.floor(i / 5) * 25;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#44d1bd";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(70, 95);
      ctx.lineTo(165, 95);
      ctx.stroke();
      ctx.fillStyle = "#44d1bd";
      ctx.fillText("e⁻ flow", 105, 88);
    }

    details.textContent = profiles[val].details;
    legend.innerHTML = profiles[val].legend.map((x) => `<span>${x}</span>`).join("");
  }

  type.addEventListener("change", draw);
  draw();
}

function renderUnit5() {
  unitContainer.appendChild(
    unitCard(`
      <h3>Rate vs Concentration Simulator</h3>
      <div class="layout-3">
        <div>
          <label for="concA">[A] (M)</label>
          <input id="concA" type="range" min="0.1" max="2" step="0.05" value="1" />
          <label for="tempK">Temperature (K)</label>
          <input id="tempK" type="range" min="250" max="450" value="298" />
          <label for="order">Reaction order in A</label>
          <select id="order">
            <option value="1">First order</option>
            <option value="2">Second order</option>
          </select>
          <p id="rateReadout" class="notice"></p>
        </div>
        <div class="canvas-wrap"><canvas id="rateCanvas" height="180"></canvas></div>
        <div class="card">
          <h4>Collision Insight</h4>
          <p id="collisionText"></p>
        </div>
      </div>
    `)
  );

  const conc = document.getElementById("concA");
  const temp = document.getElementById("tempK");
  const order = document.getElementById("order");
  const readout = document.getElementById("rateReadout");
  const collisionText = document.getElementById("collisionText");
  const canvas = document.getElementById("rateCanvas");

  function update() {
    const a = Number(conc.value);
    const n = Number(order.value);
    const t = Number(temp.value);
    const k = Math.exp(-5000 / (8.314 * t));
    const rate = k * Math.pow(a, n);
    const scaled = clamp(rate / 0.3, 0, 1);
    readout.textContent = `Rate ∝ k[A]^n = ${rate.toExponential(3)} (relative units)`;
    collisionText.textContent = `At ${t} K, particle speed and collision energy increase; with order ${n}, concentration sensitivity is ${n === 2 ? "quadratic" : "linear"}.`;
    drawSimpleBar(canvas, scaled, "#2f7ef7", "Relative reaction rate");
  }

  conc.addEventListener("input", update);
  temp.addEventListener("input", update);
  order.addEventListener("change", update);
  update();
}

function renderUnit6() {
  unitContainer.appendChild(
    unitCard(`
      <h3>ΔG Explorer</h3>
      <div class="layout-2">
        <div>
          <label for="deltaH">ΔH (kJ/mol)</label>
          <input id="deltaH" type="range" min="-200" max="200" value="-40" />
          <label for="deltaS">ΔS (J/mol·K)</label>
          <input id="deltaS" type="range" min="-300" max="300" value="80" />
          <label for="tempThermo">Temperature (K)</label>
          <input id="tempThermo" type="range" min="200" max="1000" value="298" />
          <p id="gibbsReadout" class="notice"></p>
        </div>
        <div class="canvas-wrap"><canvas id="thermoCanvas" height="220"></canvas></div>
      </div>
    `)
  );

  const dH = document.getElementById("deltaH");
  const dS = document.getElementById("deltaS");
  const t = document.getElementById("tempThermo");
  const readout = document.getElementById("gibbsReadout");
  const canvas = document.getElementById("thermoCanvas");

  function update() {
    const H = Number(dH.value);
    const S = Number(dS.value) / 1000;
    const T = Number(t.value);
    const G = H - T * S;
    readout.className = `notice ${G < 0 ? "ok" : "warn"}`;
    readout.textContent = `ΔG = ΔH − TΔS = ${G.toFixed(2)} kJ/mol → ${G < 0 ? "Spontaneous" : "Non-spontaneous"} at ${T} K`;

    const points = [];
    for (let tempK = 200; tempK <= 1000; tempK += 20) points.push({ x: tempK - 200, y: H - tempK * S + 20 });
    drawLineGraph(canvas, points, { xMax: 800, yMax: 40, yMin: -40 });
  }

  [dH, dS, t].forEach((el) => el.addEventListener("input", update));
  update();
}

function renderUnit7() {
  unitContainer.appendChild(
    unitCard(`
      <h3>Le Châtelier Shift Simulator</h3>
      <p>Reaction model: A + B ⇌ C + D</p>
      <div class="layout-2">
        <div>
          <label for="eqA">[A] (M)</label><input id="eqA" type="number" min="0.01" step="0.05" value="1" />
          <label for="eqB">[B] (M)</label><input id="eqB" type="number" min="0.01" step="0.05" value="1" />
          <label for="eqC">[C] (M)</label><input id="eqC" type="number" min="0.01" step="0.05" value="1" />
          <label for="eqD">[D] (M)</label><input id="eqD" type="number" min="0.01" step="0.05" value="1" />
          <label for="eqK">K value</label><input id="eqK" type="number" min="0.01" step="0.1" value="1" />
          <div class="btn-row">
            <button class="btn" id="eqShiftA">Add A</button>
            <button class="btn secondary" id="eqShiftC">Add C</button>
            <button class="btn alt" id="eqRecalc">Recalculate</button>
          </div>
          <p id="eqReadout" class="notice"></p>
        </div>
        <div class="canvas-wrap"><canvas id="eqCanvas" height="220"></canvas></div>
      </div>
    `)
  );

  const ids = ["eqA", "eqB", "eqC", "eqD", "eqK"].map((id) => document.getElementById(id));
  const readout = document.getElementById("eqReadout");
  const canvas = document.getElementById("eqCanvas");

  function values() {
    return {
      A: Number(ids[0].value),
      B: Number(ids[1].value),
      C: Number(ids[2].value),
      D: Number(ids[3].value),
      K: Number(ids[4].value),
    };
  }

  function recalc() {
    const { A, B, C, D, K } = values();
    const Q = (C * D) / Math.max(1e-9, A * B);
    let shift = "at equilibrium";
    if (Q < K) shift = "shifts right (toward products)";
    if (Q > K) shift = "shifts left (toward reactants)";
    readout.textContent = `Q = ${Q.toFixed(3)}, K = ${K.toFixed(3)} → system ${shift}.`;

    drawLineGraph(
      canvas,
      [
        { x: 0, y: clamp(A, 0, 14) },
        { x: 20, y: clamp(B, 0, 14) },
        { x: 40, y: clamp(C, 0, 14) },
        { x: 60, y: clamp(D, 0, 14) },
      ],
      { xMax: 60, yMax: 14, yMin: 0 }
    );
  }

  document.getElementById("eqShiftA").addEventListener("click", () => {
    ids[0].value = (Number(ids[0].value) + 0.3).toFixed(2);
    recalc();
  });
  document.getElementById("eqShiftC").addEventListener("click", () => {
    ids[2].value = (Number(ids[2].value) + 0.3).toFixed(2);
    recalc();
  });
  document.getElementById("eqRecalc").addEventListener("click", recalc);
  ids.forEach((el) => el.addEventListener("input", recalc));
  recalc();
}

function renderUnit8() {
  unitContainer.innerHTML += `
    <div class="layout-3">
      <section class="card">
        <h3>Titration Setup</h3>
        <label for="titType">Titration type</label>
        <select id="titType">
          <option value="sasb">Strong Acid / Strong Base (SA/SB)</option>
          <option value="wasb">Weak Acid / Strong Base (WA/SB)</option>
          <option value="sawb">Strong Acid / Weak Base (SA/WB)</option>
        </select>
        <label for="analyteConc">Analyte concentration (M)</label>
        <input id="analyteConc" type="number" value="0.1" step="0.01" min="0.001" max="20" />
        <label for="analyteVol">Analyte volume (mL)</label>
        <input id="analyteVol" type="number" value="25" step="1" min="1" max="500" />
        <label for="titrantConc">Titrant concentration (M)</label>
        <input id="titrantConc" type="number" value="0.1" step="0.01" min="0.001" max="20" />
        <label for="kaInput">Ka (for weak acid, WA/SB)</label>
        <input id="kaInput" type="number" value="0.0000018" step="any" min="0.00000000000001" max="1" />
        <label for="kbInput">Kb (for weak base, SA/WB)</label>
        <input id="kbInput" type="number" value="0.0000018" step="any" min="0.00000000000001" max="1" />
        <label for="dropSize">Drop size (mL)</label>
        <input id="dropSize" type="number" value="0.1" step="0.1" min="0.05" max="5" />
        <div class="btn-row">
          <button class="btn" id="addDrop">Add Drop</button>
          <button class="btn alt" id="addMilli">Add 1.0 mL</button>
          <button class="btn secondary" id="resetTit">Reset</button>
        </div>
        <div class="btn-row">
          <button class="btn warn" id="challengeBtn">Challenge Mode</button>
          <button class="btn secondary" id="explainGraph">Explain this graph</button>
        </div>
        <label><input id="stepMode" type="checkbox" /> Step-by-step explanation mode</label>
        <label><input id="microToggle" type="checkbox" checked /> Microscopic view</label>
        <div id="inputWarning" class="notice"></div>
      </section>

      <section class="card">
        <h3>Live Data Panel</h3>
        <div class="kpi" id="acidData"></div>
        <h4>Species Concentrations (M)</h4>
        <div class="species-grid" id="speciesData"></div>
        <h4>pKa Relationship</h4>
        <p id="pkaRelation" class="notice"></p>
        <h4>Henderson–Hasselbalch</h4>
        <p id="hhText" class="notice"></p>
        <h4>Step Explanation</h4>
        <p id="stepText" class="notice"></p>
      </section>

      <section class="card">
        <h3>Beaker View</h3>
        <div class="beaker" id="beaker">
          <div class="liquid" id="liquid"></div>
          <div id="particleLayer"></div>
        </div>
        <div class="legend">
          <span>🔴 H⁺</span><span>🔵 OH⁻</span><span>🟣 HA</span><span>🟢 A⁻</span><span>🟠 B</span><span>🟤 BH⁺</span>
        </div>
      </section>
    </div>

    <section class="card" style="margin-top: 0.9rem;">
      <h3>Real-Time pH Curve</h3>
      <div class="canvas-wrap"><canvas id="titrationGraph" height="300"></canvas></div>
      <p id="pointInfo" class="small-note"></p>
    </section>

    <section class="card" style="margin-top: 0.9rem;" id="challengePanel"></section>
  `;

  // Core titration state uses moles + total volume model so each drop updates all values continuously.
  const titration = {
    type: "sasb",
    Ca: 0.1,
    Va: 25,
    Cb: 0.1,
    Ka: 1.8e-6,
    Kb: 1.8e-6,
    dropSize: 0.1,
    vAdded: 0,
    points: [],
    challenge: null,
  };

  const ids = {
    titType: document.getElementById("titType"),
    analyteConc: document.getElementById("analyteConc"),
    analyteVol: document.getElementById("analyteVol"),
    titrantConc: document.getElementById("titrantConc"),
    kaInput: document.getElementById("kaInput"),
    kbInput: document.getElementById("kbInput"),
    dropSize: document.getElementById("dropSize"),
    stepMode: document.getElementById("stepMode"),
    microToggle: document.getElementById("microToggle"),
    warning: document.getElementById("inputWarning"),
    acidData: document.getElementById("acidData"),
    speciesData: document.getElementById("speciesData"),
    pkaRelation: document.getElementById("pkaRelation"),
    hhText: document.getElementById("hhText"),
    stepText: document.getElementById("stepText"),
    graph: document.getElementById("titrationGraph"),
    pointInfo: document.getElementById("pointInfo"),
    beaker: document.getElementById("beaker"),
    liquid: document.getElementById("liquid"),
    particleLayer: document.getElementById("particleLayer"),
    challengePanel: document.getElementById("challengePanel"),
  };

  function validateInputs() {
    const checks = [
      validateNumberInput(ids.analyteConc.value, { min: 1e-6, max: 20 }),
      validateNumberInput(ids.analyteVol.value, { min: 0.01, max: 500 }),
      validateNumberInput(ids.titrantConc.value, { min: 1e-6, max: 20 }),
      validateNumberInput(ids.dropSize.value, { min: 0.01, max: 5 }),
      validateNumberInput(ids.kaInput.value, { min: 1e-14, max: 1 }),
      validateNumberInput(ids.kbInput.value, { min: 1e-14, max: 1 }),
    ];
    if (!checks.every(Boolean)) {
      ids.warning.className = "notice warn";
      ids.warning.textContent = "⚠️ Enter physically reasonable positive values (concentrations ≤ 20 M, volume ≤ 500 mL, 0 < Ka/Kb ≤ 1).";
      return false;
    }
    ids.warning.className = "notice ok";
    ids.warning.textContent = "Inputs validated. Simulation is chemically reasonable.";
    return true;
  }

  function syncStateFromInputs() {
    titration.type = ids.titType.value;
    titration.Ca = Number(ids.analyteConc.value);
    titration.Va = Number(ids.analyteVol.value);
    titration.Cb = Number(ids.titrantConc.value);
    titration.Ka = Number(ids.kaInput.value);
    titration.Kb = Number(ids.kbInput.value);
    titration.dropSize = Number(ids.dropSize.value);
  }

  function getEquivalenceVolume() {
    const nAnalyte = titration.Ca * (titration.Va / 1000);
    return (nAnalyte / Math.max(1e-12, titration.Cb)) * 1000;
  }

  // Calculates pH + species concentrations for each titration type.
  function computePoint(vAdded) {
    const Kw = 1e-14;
    const nAnalyte = titration.Ca * (titration.Va / 1000);
    const nTitrant = titration.Cb * (vAdded / 1000);
    const Vtot = (titration.Va + vAdded) / 1000;

    let pH = 7;
    let explanation = "";
    const species = { H: 1e-7, OH: 1e-7, HA: 0, A: 0, B: 0, BH: 0 };
    let hh = "Not in a buffer region currently.";

    if (titration.type === "sasb") {
      if (nTitrant < nAnalyte) {
        const H = (nAnalyte - nTitrant) / Vtot;
        pH = -Math.log10(H);
        species.H = H;
        species.OH = Kw / H;
        explanation = "Before equivalence: excess strong acid controls pH.";
      } else if (Math.abs(nTitrant - nAnalyte) < 1e-12) {
        pH = 7;
        species.H = species.OH = 1e-7;
        explanation = "At equivalence: strong acid and strong base neutralize completely (ideal pH ~ 7).";
      } else {
        const OH = (nTitrant - nAnalyte) / Vtot;
        const pOH = -Math.log10(OH);
        pH = 14 - pOH;
        species.OH = OH;
        species.H = Kw / OH;
        explanation = "After equivalence: excess strong base controls pH.";
      }
    }

    if (titration.type === "wasb") {
      const Ka = titration.Ka;
      const pKa = -Math.log10(Ka);
      if (nTitrant === 0) {
        const C = nAnalyte / Vtot;
        const H = (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * C)) / 2;
        pH = -Math.log10(H);
        species.H = H;
        species.OH = Kw / H;
        species.HA = C;
        explanation = "Initial weak acid: partial ionization sets pH.";
      } else if (nTitrant < nAnalyte) {
        const nHA = nAnalyte - nTitrant;
        const nA = nTitrant;
        pH = pKa + Math.log10(Math.max(1e-12, nA / nHA));
        species.H = Math.pow(10, -pH);
        species.OH = Kw / species.H;
        species.HA = nHA / Vtot;
        species.A = nA / Vtot;
        hh = `pH = pKa + log([A⁻]/[HA]) = ${(-Math.log10(Ka)).toFixed(2)} + log(${fmtExp(species.A)}/${fmtExp(species.HA)})`;
        explanation = "Buffer region: both HA and A⁻ present, Henderson–Hasselbalch applies.";
      } else if (Math.abs(nTitrant - nAnalyte) < 1e-12) {
        const cA = nAnalyte / Vtot;
        const Kb = Kw / Ka;
        const OH = Math.sqrt(Kb * cA);
        pH = 14 + Math.log10(OH);
        species.OH = OH;
        species.H = Kw / OH;
        species.A = cA;
        explanation = "Equivalence: conjugate base hydrolysis makes solution basic.";
      } else {
        const OH = (nTitrant - nAnalyte) / Vtot;
        pH = 14 + Math.log10(OH);
        species.OH = OH;
        species.H = Kw / OH;
        species.A = nAnalyte / Vtot;
        explanation = "After equivalence: excess OH⁻ dominates pH.";
      }
    }

    if (titration.type === "sawb") {
      const Kb = titration.Kb;
      const pKb = -Math.log10(Kb);
      if (nTitrant < nAnalyte) {
        const H = (nAnalyte - nTitrant) / Vtot;
        pH = -Math.log10(H);
        species.H = H;
        species.OH = Kw / H;
        species.BH = nTitrant / Vtot;
        explanation = "Before equivalence: excess strong acid dictates pH.";
      } else if (Math.abs(nTitrant - nAnalyte) < 1e-12) {
        const cBH = nAnalyte / Vtot;
        const Ka = Kw / Kb;
        const H = Math.sqrt(Ka * cBH);
        pH = -Math.log10(H);
        species.H = H;
        species.OH = Kw / H;
        species.BH = cBH;
        explanation = "Equivalence: conjugate acid (BH⁺) hydrolysis makes pH acidic.";
      } else {
        const nBH = nAnalyte;
        const nB = nTitrant - nAnalyte;
        const pOH = pKb + Math.log10(Math.max(1e-12, nBH / nB));
        pH = 14 - pOH;
        species.OH = Math.pow(10, -pOH);
        species.H = Kw / species.OH;
        species.BH = nBH / Vtot;
        species.B = nB / Vtot;
        hh = `pOH = pKb + log([BH⁺]/[B]) = ${pKb.toFixed(2)} + log(${fmtExp(species.BH)}/${fmtExp(species.B)})`;
        explanation = "After equivalence: weak base/conjugate acid buffer region forms.";
      }
    }

    pH = clamp(pH, 0, 14);
    const pOH = 14 - pH;
    return { pH, pOH, species, explanation, Vtot, Veq: getEquivalenceVolume(), hh };
  }

  function relationText(pH) {
    if (titration.type !== "wasb") return "pKa comparison is most informative for weak-acid titrations.";
    const pKa = -Math.log10(titration.Ka);
    if (Math.abs(pH - pKa) < 0.05) return "pH ≈ pKa: buffer midpoint (half-equivalence), [HA] ≈ [A⁻].";
    if (pH < pKa) return "pH < pKa: protonated form (HA) dominates.";
    return "pH > pKa: deprotonated form (A⁻) dominates.";
  }

  function bufferHighlight() {
    const Veq = getEquivalenceVolume();
    if (titration.type === "wasb") return { start: 0.1 * Veq, end: 0.9 * Veq };
    if (titration.type === "sawb") return { start: 1.05 * Veq, end: 1.8 * Veq };
    return null;
  }

  function redrawGraph() {
    const Veq = getEquivalenceVolume();
    drawLineGraph(ids.graph, titration.points, {
      xMax: Math.max(Veq * 2, titration.vAdded + 2, 20),
      yMax: 14,
      yMin: 0,
      highlight: bufferHighlight(),
    });

    const half = Veq / 2;
    const latest = titration.points[titration.points.length - 1];
    if (latest) {
      ids.pointInfo.textContent = `Current: V = ${latest.x.toFixed(2)} mL, pH = ${latest.y.toFixed(3)} | Equivalence ≈ ${Veq.toFixed(2)} mL | Half-equivalence ≈ ${half.toFixed(2)} mL`;
    }
  }

  function drawParticles(species, microView) {
    ids.particleLayer.innerHTML = "";
    const colors = {
      H: "#cf3f5e",
      OH: "#2f7ef7",
      HA: "#9656dd",
      A: "#2baa7a",
      B: "#f29a2e",
      BH: "#8c5d2d",
    };

    const volumeRatio = clamp((titration.Va + titration.vAdded) / 80, 0.3, 1);
    ids.liquid.style.height = `${Math.round(40 + volumeRatio * 45)}%`;

    if (!microView) {
      const last = titration.points[titration.points.length - 1] || { y: 7 };
      // Phenolphthalein appears pink in basic solution above ~8.2 pH.
      ids.liquid.style.background = last.y > PHENOLPHTHALEIN_TRANSITION_PH ? PHENOLPHTHALEIN_PINK : SOLUTION_BLUE;
      return;
    }

    ids.liquid.style.background = SOLUTION_BLUE;
    const entries = ["H", "OH", "HA", "A", "B", "BH"];
    entries.forEach((key) => {
      const amount = species[key] || 0;
      const count = clamp(Math.round(Math.log10(amount + 1e-12) * PARTICLE_CONCENTRATION_SCALE + MIN_PARTICLE_COUNT), 2, 28);
      for (let i = 0; i < count; i++) {
        const p = document.createElement("div");
        p.className = "particle";
        p.style.background = colors[key];
        p.style.left = `${Math.random() * 95}%`;
        p.style.top = `${35 + Math.random() * 58}%`;
        p.style.animationDuration = `${2 + Math.random() * 3.5}s`;
        p.textContent = key === "OH" ? "−" : key === "H" ? "+" : key[0];
        ids.particleLayer.appendChild(p);
      }
    });
  }

  function updatePanels(point) {
    const { pH, pOH, species, explanation, hh } = point;
    const H = species.H;
    const OH = species.OH;
    ids.acidData.innerHTML = `
      <div><strong>pH</strong><br>${pH.toFixed(3)}</div>
      <div><strong>pOH</strong><br>${pOH.toFixed(3)}</div>
      <div><strong>[H⁺]</strong><br>${fmtExp(H)}</div>
      <div><strong>[OH⁻]</strong><br>${fmtExp(OH)}</div>
      <div><strong>Volume Added</strong><br>${titration.vAdded.toFixed(2)} mL</div>
      <div><strong>Total Volume</strong><br>${(titration.Va + titration.vAdded).toFixed(2)} mL</div>
    `;

    ids.speciesData.innerHTML = `
      <div>HA: ${fmtExp(species.HA)}</div>
      <div>A⁻: ${fmtExp(species.A)}</div>
      <div>B: ${fmtExp(species.B)}</div>
      <div>BH⁺: ${fmtExp(species.BH)}</div>
      <div>H⁺: ${fmtExp(species.H)}</div>
      <div>OH⁻: ${fmtExp(species.OH)}</div>
    `;

    ids.pkaRelation.textContent = relationText(pH);
    ids.hhText.textContent = hh;
    ids.stepText.textContent = ids.stepMode.checked ? explanation : "Enable step-by-step mode to see drop-level interpretation.";
    drawParticles(species, ids.microToggle.checked);
  }

  function pushPointAndRender() {
    const point = computePoint(titration.vAdded);
    titration.points.push({ x: titration.vAdded, y: point.pH });
    redrawGraph();
    updatePanels(point);
    return point;
  }

  function resetTitration() {
    syncStateFromInputs();
    if (!validateInputs()) return;
    titration.vAdded = 0;
    titration.points = [];
    const point = pushPointAndRender();
    ids.challengePanel.innerHTML = "<p class='small-note'>Start challenge mode to test prediction skills.</p>";
    return point;
  }

  function addVolume(delta) {
    syncStateFromInputs();
    if (!validateInputs()) return;
    titration.vAdded = Math.max(0, titration.vAdded + delta);
    const point = pushPointAndRender();
    markUnitComplete("unit8");
    return point;
  }

  function explainGraphRuleBased() {
    if (titration.points.length < 3) return "Collect more data points to interpret curve behavior.";
    const latest = titration.points[titration.points.length - 1];
    const Veq = getEquivalenceVolume();
    let msg = "";
    if (latest.x < Veq * 0.9) msg += "You are mostly in the pre-equivalence region. ";
    else if (latest.x <= Veq * 1.1) msg += "You are near the equivalence region where slope is steepest. ";
    else msg += "You are in post-equivalence region where excess titrant dominates pH. ";

    if (titration.type === "wasb") msg += "For WA/SB, buffer behavior appears before equivalence and pH approaches pKa at half-equivalence.";
    if (titration.type === "sasb") msg += "For SA/SB, pH jump is very sharp around equivalence with little buffer action.";
    if (titration.type === "sawb") msg += "For SA/WB, equivalence pH is below 7 and buffer character appears after equivalence.";

    ids.stepText.textContent = msg;
  }

  function startChallenge() {
    const Veq = getEquivalenceVolume();
    const current = computePoint(titration.vAdded);
    const mode = Math.random() < 0.5 ? "eq" : "ph";
    titration.challenge = mode;

    ids.challengePanel.innerHTML = mode === "eq"
      ? `
      <h3>Challenge Mode</h3>
      <p>Predict the equivalence-point volume (mL).</p>
      <input id="challengeAnswer" type="number" step="0.1" />
      <button class="btn" id="checkChallenge">Check</button>
      <p id="challengeFeedback" class="notice"></p>
      `
      : `
      <h3>Challenge Mode</h3>
      <p>Predict pH after one more 1.0 mL addition from current state.</p>
      <input id="challengeAnswer" type="number" step="0.01" />
      <button class="btn" id="checkChallenge">Check</button>
      <p id="challengeFeedback" class="notice"></p>
      `;

    document.getElementById("checkChallenge").addEventListener("click", () => {
      const ans = Number(document.getElementById("challengeAnswer").value);
      const feedback = document.getElementById("challengeFeedback");
      if (!Number.isFinite(ans)) {
        feedback.className = "notice warn";
        feedback.textContent = "Enter a numerical answer.";
        return;
      }
      if (mode === "eq") {
        const err = Math.abs(ans - Veq);
        const ok = err <= Math.max(0.5, Veq * 0.05);
        feedback.className = `notice ${ok ? "ok" : "danger"}`;
        feedback.textContent = `${ok ? "Great prediction!" : "Not quite."} Expected ≈ ${Veq.toFixed(2)} mL.`;
      } else {
        const next = computePoint(titration.vAdded + 1).pH;
        const err = Math.abs(ans - next);
        const ok = err <= 0.25;
        feedback.className = `notice ${ok ? "ok" : "danger"}`;
        feedback.textContent = `${ok ? "Excellent pH estimate!" : "Try again."} Expected pH ≈ ${next.toFixed(3)}.`;
      }
    });

    ids.stepText.textContent = `Challenge started (${mode === "eq" ? "equivalence volume" : "future pH"}). Current pH is ${current.pH.toFixed(3)}.`;
  }

  document.getElementById("addDrop").addEventListener("click", () => addVolume(Number(ids.dropSize.value)));
  document.getElementById("addMilli").addEventListener("click", () => addVolume(1));
  document.getElementById("resetTit").addEventListener("click", resetTitration);
  document.getElementById("challengeBtn").addEventListener("click", startChallenge);
  document.getElementById("explainGraph").addEventListener("click", explainGraphRuleBased);
  ids.microToggle.addEventListener("change", () => {
    if (!titration.points.length) return;
    updatePanels(computePoint(titration.vAdded));
  });

  [
    ids.titType,
    ids.analyteConc,
    ids.analyteVol,
    ids.titrantConc,
    ids.kaInput,
    ids.kbInput,
    ids.dropSize,
    ids.stepMode,
  ].forEach((el) => el.addEventListener("input", resetTitration));

  resetTitration();
}

function renderUnit9() {
  unitContainer.appendChild(
    unitCard(`
      <h3>Electrochemistry + Thermodynamics Simulator</h3>
      <div class="layout-2">
        <div>
          <label for="e0">E°cell (V)</label>
          <input id="e0" type="number" value="1.10" step="0.01" />
          <label for="nElectron">n (electrons transferred)</label>
          <input id="nElectron" type="number" value="2" step="1" min="1" max="6" />
          <label for="qValue">Reaction quotient Q</label>
          <input id="qValue" type="number" value="1" step="0.1" min="0.0001" />
          <label for="tempN">Temperature (K)</label>
          <input id="tempN" type="range" min="250" max="400" value="298" />
          <p id="nernstOut" class="notice"></p>
        </div>
        <div class="canvas-wrap"><canvas id="nernstCanvas" height="220"></canvas></div>
      </div>
    `)
  );

  const e0 = document.getElementById("e0");
  const n = document.getElementById("nElectron");
  const q = document.getElementById("qValue");
  const t = document.getElementById("tempN");
  const out = document.getElementById("nernstOut");
  const canvas = document.getElementById("nernstCanvas");

  function update() {
    const R = 8.314;
    const F = 96485;
    const T = Number(t.value);
    const E0 = Number(e0.value);
    const ne = Math.max(1, Number(n.value));
    const Q = Math.max(1e-12, Number(q.value));
    const E = E0 - (R * T / (ne * F)) * Math.log(Q);
    const dG = -ne * F * E / 1000;
    out.textContent = `E = ${E.toFixed(3)} V, ΔG = ${dG.toFixed(2)} kJ/mol (${dG < 0 ? "spontaneous" : "non-spontaneous"})`;
    drawSimpleBar(canvas, clamp(E / Math.max(0.01, E0 + 0.6), 0, 1), "#44d1bd", "Cell potential relative scale");
  }

  [e0, n, q].forEach((el) => el.addEventListener("input", update));
  t.addEventListener("input", update);
  update();
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.unit));
});

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  state.darkMode = document.body.classList.contains("dark");
  localStorage.setItem("schefchem-dark", state.darkMode ? "1" : "0");
  renderUnit(state.activeUnit);
});

updateProgressBadge();
renderUnit(state.activeUnit);
