"use strict";

// =======================================
// ELLIPTIC CURVE IMPLEMENTATION
// y² = x³ + 7 (mod 17)
// =======================================

const P = 17;
const G = { x: 1, y: 5 };
const INF = null;

// Modular arithmetic
function mod(n) {
  return ((n % P) + P) % P;
}

// Modular inverse
function inverse(n) {
  n = mod(n);

  for (let i = 1; i < P; i++) {
    if (mod(n * i) === 1) return i;
  }

  throw new Error("Inverse does not exist");
}

// Check curve membership
function onCurve(point) {
  if (point === INF) return true;

  return mod(point.y ** 2) ===
         mod(point.x ** 3 + 7);
}

// Point addition, including doubling
function add(a, b) {
  if (a === INF) return b;
  if (b === INF) return a;

  if (a.x === b.x &&
      mod(a.y + b.y) === 0) {
    return INF;
  }

  let slope;

  if (a.x === b.x && a.y === b.y) {
    slope = mod(
      3 * a.x * a.x * inverse(2 * a.y)
    );
  } else {
    slope = mod(
      (b.y - a.y) * inverse(b.x - a.x)
    );
  }

  const x = mod(slope ** 2 - a.x - b.x);
  const y = mod(slope * (a.x - x) - a.y);

  return { x, y };
}

// Scalar multiplication by repeated addition
function multiply(k) {
  let point = INF;

  for (let i = 0; i < k; i++) {
    point = add(point, G);
  }

  return point;
}

function formatPoint(point) {
  if (point === INF) return "O";
  return `(${point.x}, ${point.y})`;
}

// =======================================
// INTERACTIVE EXPERIMENT
// =======================================

let sequence = [];
let animationIndex = -1;
let timer = null;

function calculate() {
  const k = Number(
    document.getElementById("privateKey").value
  );

  if (!Number.isInteger(k) || k < 1 || k > 8) {
    alert("Choose an integer from 1 to 8.");
    return;
  }

  stopAnimation();

  sequence = [];
  let current = INF;

  const tbody = document.getElementById("stepsTable");
  tbody.replaceChildren();

  for (let i = 1; i <= k; i++) {
    current = add(current, G);
    sequence.push(current);

    const row = document.createElement("tr");

    const operation = i === 1
      ? "G"
      : `${i - 1}G + G`;

    [i, operation, formatPoint(current)].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  }

  document.getElementById("publicKeyResult")
    .textContent =
    `Toy Public Key: Q = ${k}G = ${formatPoint(current)}`;

  animationIndex = -1;
  updateAnimation();
}

// =======================================
// SVG VISUALIZATION
// =======================================

const SVG_NS = "http://www.w3.org/2000/svg";

function svgNode(parent, tag, attrs, text) {
  const node = document.createElementNS(SVG_NS, tag);

  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }

  if (text !== undefined) node.textContent = text;

  parent.appendChild(node);
  return node;
}

function allCurvePoints() {
  const result = [];

  for (let x = 0; x < P; x++) {
    for (let y = 0; y < P; y++) {
      const point = { x, y };

      if (onCurve(point)) result.push(point);
    }
  }

  return result;
}

const CURVE_POINTS = allCurvePoints();

function drawCurve(selectedPoint) {
  const svg = document.getElementById("curveSVG");
  svg.replaceChildren();

  const offset = 45;
  const unit = 21;

  const sx = x => offset + unit * x;
  const sy = y => 395 - unit * y;

  // Grid and axis labels
  for (let i = 0; i < 17; i++) {
    svgNode(svg, "line", {
      x1: sx(i), y1: sy(0),
      x2: sx(i), y2: sy(16),
      stroke: "#e5e9ef"
    });

    svgNode(svg, "line", {
      x1: sx(0), y1: sy(i),
      x2: sx(16), y2: sy(i),
      stroke: "#e5e9ef"
    });

    svgNode(svg, "text", {
      x: sx(i), y: 420,
      "text-anchor": "middle",
      "font-size": 11,
      fill: "#64748b"
    }, String(i));

    svgNode(svg, "text", {
      x: 24, y: sy(i) + 4,
      "text-anchor": "middle",
      "font-size": 11,
      fill: "#64748b"
    }, String(i));
  }

  // All finite points of the toy curve
  for (const point of CURVE_POINTS) {
    const isBase =
      point.x === G.x && point.y === G.y;

    const isSelected =
      selectedPoint !== null &&
      point.x === selectedPoint.x &&
      point.y === selectedPoint.y;

    const circle = svgNode(svg, "circle", {
      cx: sx(point.x),
      cy: sy(point.y),
      r: isSelected ? 9 : isBase ? 7 : 5,
      fill: isSelected
        ? "#dc3545"
        : isBase ? "#16a34a" : "#5578a3"
    });

    svgNode(circle, "title", {},
      formatPoint(point));
  }
}

function updateAnimation() {
  const active = animationIndex >= 0
    ? sequence[animationIndex]
    : INF;

  drawCurve(active);

  const info = document.getElementById("animationInfo");

  info.textContent = animationIndex < 0
    ? "Press Play to start"
    : `${animationIndex + 1}G = ${formatPoint(active)}`;

  const rows = document.querySelectorAll(
    "#stepsTable tr"
  );

  rows.forEach((row, i) => {
    row.classList.toggle(
      "highlight", i === animationIndex
    );
  });
}

function stopAnimation() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }

  document.getElementById("playButton")
    .textContent = "Play";
}

function nextStep() {
  stopAnimation();

  if (animationIndex < sequence.length - 1) {
    animationIndex++;
    updateAnimation();
  }
}

function play() {
  if (timer !== null) {
    stopAnimation();
    return;
  }

  if (animationIndex >= sequence.length - 1) {
    animationIndex = -1;
    updateAnimation();
  }

  document.getElementById("playButton")
    .textContent = "Pause";

  timer = setInterval(() => {
    if (animationIndex < sequence.length - 1) {
      animationIndex++;
      updateAnimation();
    } else {
      stopAnimation();
    }
  }, 1000);
}

function reset() {
  stopAnimation();
  animationIndex = -1;
  updateAnimation();
}

// =======================================
// STATISTICAL EXPLORATION
// =======================================

// All eight non-identity multiples of G.
const SAMPLE = [];

for (let k = 1; k <= 8; k++) {
  SAMPLE.push({
    k: k,
    point: multiply(k)
  });
}

function counts(values) {
  const map = new Map();

  values.forEach(value => {
    map.set(value, (map.get(value) || 0) + 1);
  });

  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function drawBars(id, values) {
  const container = document.getElementById(id);
  container.replaceChildren();

  const data = counts(values);
  const maximum = Math.max(...data.map(d => d[1]));

  data.forEach(([value, count]) => {
    const row = document.createElement("div");
    row.className = "hw-bar-row";

    const label = document.createElement("span");
    label.textContent = value;

    const track = document.createElement("div");
    track.className = "hw-track";

    const bar = document.createElement("div");
    bar.className = "hw-fill";
    bar.style.width = `${100 * count / maximum}%`;

    track.appendChild(bar);

    const number = document.createElement("span");
    number.textContent = count;

    row.append(label, track, number);
    container.appendChild(row);
  });
}

// Number of one-bits in a nonnegative integer
function bitCount(n) {
  return n.toString(2)
    .split("")
    .filter(bit => bit === "1").length;
}

// Pearson correlation
function pearson(xs, ys) {
  const n = xs.length;

  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let vx = 0;
  let vy = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;

    numerator += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }

  return numerator / Math.sqrt(vx * vy);
}

function hamming(a, b) {
  return bitCount(a.x ^ b.x) +
         bitCount(a.y ^ b.y);
}

function showStatistics() {
  const ks = SAMPLE.map(item => item.k);
  const xs = SAMPLE.map(item => item.point.x);
  const ys = SAMPLE.map(item => item.point.y);

  // Coordinate frequencies
  drawBars("xChart", xs);
  drawBars("yChart", ys);

  document.getElementById("coordinateSummary")
    .textContent =
    `Distinct x values: ${new Set(xs).size}. ` +
    `Distinct y values: ${new Set(ys).size}. ` +
    `Sample size: ${SAMPLE.length} points.`;

  // Five bits per coordinate (values 0 to 16)
  const xOnes = xs.reduce(
    (sum, x) => sum + bitCount(x), 0
  );

  const yOnes = ys.reduce(
    (sum, y) => sum + bitCount(y), 0
  );

  document.getElementById("bitResults")
    .textContent =
    `X coordinates: ${xOnes} one-bits out of 40 ` +
    `(${(100 * xOnes / 40).toFixed(1)}%). ` +
    `Y coordinates: ${yOnes} one-bits out of 40 ` +
    `(${(100 * yOnes / 40).toFixed(1)}%).`;

  // Input-output linear correlation
  const rx = pearson(ks, xs);
  const ry = pearson(ks, ys);

  document.getElementById("correlationResults")
    .textContent =
    `Pearson r(k, x) = ${rx.toFixed(4)}. ` +
    `Pearson r(k, y) = ${ry.toFixed(4)}.`;

  // Hamming distances between consecutive points
  const distances = [];

  for (let i = 0; i < SAMPLE.length - 1; i++) {
    distances.push(
      hamming(SAMPLE[i].point, SAMPLE[i + 1].point)
    );
  }

  const average = distances.reduce(
    (a, b) => a + b, 0
  ) / distances.length;

  document.getElementById("avalancheResults")
    .textContent =
    `Hamming distances (k to k+1): ` +
    `${distances.join(", ")} bits. ` +
    `Average: ${average.toFixed(2)} out of 10 bits.`;
}

// =======================================
// INITIALIZATION
// =======================================

document.getElementById("calculateButton")
  .addEventListener("click", calculate);

document.getElementById("playButton")
  .addEventListener("click", play);

document.getElementById("nextButton")
  .addEventListener("click", nextStep);

document.getElementById("resetButton")
  .addEventListener("click", reset);

document.getElementById("privateKey")
  .addEventListener("keydown", event => {
    if (event.key === "Enter") calculate();
  });

// Verify base point and expected example
if (!onCurve(G)) {
  throw new Error("Invalid base point.");
}

const test = multiply(6);

if (test.x !== 5 || test.y !== 8 ||
    multiply(9) !== INF) {
  throw new Error("ECC mathematical test failed.");
}

calculate();
showStatistics();
