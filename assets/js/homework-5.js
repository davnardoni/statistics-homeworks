
"use strict";

// ============================================
// UTILITIES
// ============================================

const $ = id => document.getElementById(id);

const format = value => Number(value).toFixed(8);

function gcd(a, b) {
  while (b !== 0) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a;
}

// Average execution time in milliseconds.
// The initial call avoids including first-run overhead.
function benchmark(fn, repetitions = 500) {
  fn();

  const start = performance.now();

  for (let i = 0; i < repetitions; i++) {
    fn();
  }

  return (performance.now() - start) / repetitions;
}

// ============================================
// EXERCISE 1
// RIEMANN AND LEBESGUE INTEGRATION
// ============================================

// Each regular function provides:
// - its integration interval
// - an exact integral
// - an upper bound for its values
// - its evaluation function
// - the measure of {x : f(x) >= t}

const functions = {

  square: {
    a: 0,
    b: 1,
    max: 1,
    exact: 1 / 3,

    f: x => x * x,

    measure: t =>
      t <= 0 ? 1 :
      t >= 1 ? 0 :
      1 - Math.sqrt(t)
  },

  sine: {
    a: 0,
    b: Math.PI,
    max: 1,
    exact: 2,

    f: x => Math.sin(x),

    measure: t =>
      t <= 0 ? Math.PI :
      t >= 1 ? 0 :
      Math.PI - 2 * Math.asin(t)
  },

  step: {
    a: 0,
    b: 1,
    max: 3,
    exact: 2,

    f: x => x < 0.5 ? 1 : 3,

    measure: t =>
      t <= 1 ? 1 :
      t <= 3 ? 0.5 : 0
  },

  absolute: {
    a: 0,
    b: 1,
    max: 0.5,
    exact: 0.25,

    f: x => Math.abs(x - 0.5),

    measure: t =>
      t <= 0 ? 1 :
      t >= 0.5 ? 0 :
      1 - 2 * t
  },

  dirichlet: {
    a: 0,
    b: 1,
    max: 1,
    exact: 0,
    pathological: true
  },

  thomae: {
    a: 0,
    b: 1,
    max: 1,
    exact: 0,
    pathological: true
  }
};

// --------------------------------------------
// Riemann midpoint rule
// --------------------------------------------

function riemann(key, n) {
  const f = functions[key];

  // Every midpoint of the uniform grid on [0,1]
  // is rational. Dirichlet equals 1 there.
  // This sum does not represent a Riemann integral.
  if (key === "dirichlet") {
    return 1;
  }

  // Thomae: at rational p/q in lowest terms,
  // the function equals 1/q.
  if (key === "thomae") {
    let sum = 0;

    for (let i = 0; i < n; i++) {
      const numerator = 2 * i + 1;
      const denominator = 2 * n;

      const reduced = gcd(numerator, denominator);
      const value = reduced / denominator;

      sum += value;
    }

    return sum / n;
  }

  const dx = (f.b - f.a) / n;
  let sum = 0;

  for (let i = 0; i < n; i++) {
    const x = f.a + (i + 0.5) * dx;
    sum += f.f(x);
  }

  return sum * dx;
}

// --------------------------------------------
// Lebesgue-inspired level-set approximation
// --------------------------------------------

function lebesgue(key, n) {
  const f = functions[key];

  // Dirichlet and Thomae are nonzero
  // only on a countable set.
  // That set has Lebesgue measure zero.
  if (f.pathological) {
    return 0;
  }

  const dy = f.max / n;
  let sum = 0;

  for (let j = 0; j < n; j++) {
    const level = (j + 0.5) * dy;
    sum += f.measure(level);
  }

  return sum * dy;
}

// --------------------------------------------
// Display integration results
// --------------------------------------------

function runIntegration() {
  const key = $("int-function").value;
  const f = functions[key];

  const partitions = [8, 32, 128, 512];

  $("int-rows").replaceChildren();

  for (const n of partitions) {
    const r = riemann(key, n);
    const l = lebesgue(key, n);

    const errorR = Math.abs(r - f.exact);
    const errorL = Math.abs(l - f.exact);

    const values = [
      n,
      format(r),
      format(errorR),
      format(l),
      format(errorL)
    ];

    const tr = document.createElement("tr");

    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }

    $("int-rows").appendChild(tr);
  }

  $("int-reference").textContent =
    `Exact integral: ${format(f.exact)}`;

  // Timing comparison for regular functions.
  if (!f.pathological) {
    const n = 512;
    const repeats = 1000;

    const timeR = benchmark(
      () => riemann(key, n), repeats
    );

    const timeL = benchmark(
      () => lebesgue(key, n), repeats
    );

    $("int-time").textContent =
      `Average execution time at n = ${n}: ` +
      `Riemann ${timeR.toFixed(4)} ms; ` +
      `Lebesgue ${timeL.toFixed(4)} ms ` +
      `(${repeats} repetitions, browser-dependent).`;
  } else {
    $("int-time").textContent =
      "For these pathological functions, the Lebesgue " +
      "method uses the known measure-zero property of " +
      "their nonzero sets. It is an analytical result, " +
      "not an estimate obtained from finite sampling.";
  }

  const notes = {

    square:
      "Both methods converge to 1/3. " +
      "The errors differ because one method partitions " +
      "the domain and the other partitions function values.",

    sine:
      "Both approaches converge to 2. The convergence " +
      "behavior depends on the function and on how " +
      "the intervals or levels are selected.",

    step:
      "The Riemann midpoint approximation is exact " +
      "for these grids because the discontinuity is " +
      "aligned with a partition boundary. " +
      "The Lebesgue approximation converges as " +
      "the level width decreases.",

    absolute:
      "Both methods converge to 1/4. The function " +
      "is continuous despite having a corner at x = 0.5.",

    dirichlet:
      "Dirichlet's function is not Riemann-integrable. " +
      "All selected midpoints are rational, so the " +
      "midpoint sum remains 1. Its Lebesgue integral " +
      "is 0 because the rationals have measure zero.",

    thomae:
      "Thomae's function is Riemann-integrable " +
      "because its discontinuities form a measure-zero " +
      "set. Its midpoint sums converge to 0, " +
      "which is also its Lebesgue integral."
  };

  $("int-note").textContent = notes[key];
}

// ============================================
// EXERCISE 2
// NUMERICAL COMPUTATION OF NORMAL CDF
// ============================================

// Standard normal probability density.
function normalPDF(x) {
  return Math.exp(-x * x / 2) /
         Math.sqrt(2 * Math.PI);
}

// --------------------------------------------
// Method 1: Composite Simpson's rule
// --------------------------------------------

function normalSimpson(z, n = 256) {
  if (z === 0) {
    return 0.5;
  }

  const a = Math.abs(z);
  const h = a / n;

  let sum = normalPDF(0) + normalPDF(a);

  for (let i = 1; i < n; i++) {
    const weight = i % 2 === 0 ? 2 : 4;
    sum += weight * normalPDF(i * h);
  }

  const integral = (h / 3) * sum;

  return Math.max(
    0,
    Math.min(1, 0.5 + Math.sign(z) * integral)
  );
}

// --------------------------------------------
// Method 2: Power series expansion
// --------------------------------------------

function normalSeries(z) {
  if (z === 0) {
    return 0.5;
  }

  const a = Math.abs(z);

  let term = a;
  let sum = a;

  const tolerance = 1e-16;
  const maxTerms = 200;

  for (let k = 1; k <= maxTerms; k++) {
    // Recurrence avoids computing factorials.
    term *= -(a * a) / (2 * k);

    const increment = term / (2 * k + 1);
    sum += increment;

    if (Math.abs(increment) < tolerance) {
      break;
    }
  }

  return 0.5 +
    Math.sign(z) * sum / Math.sqrt(2 * Math.PI);
}

// --------------------------------------------
// Method 3: erf approximation
// Abramowitz and Stegun, 7.1.26
// --------------------------------------------

function normalErfApprox(z) {
  if (z === 0) {
    return 0.5;
  }

  const x = Math.abs(z) / Math.SQRT2;

  const p = 0.3275911;
  const t = 1 / (1 + p * x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const polynomial =
    (((((a5 * t + a4) * t + a3) * t + a2)
      * t + a1) * t);

  const erf =
    1 - polynomial * Math.exp(-x * x);

  return 0.5 * (1 + Math.sign(z) * erf);
}

// --------------------------------------------
// NIST reference values (rounded to 5 decimals)
// --------------------------------------------


const referenceValues = [
  { z: -3, cdf: 0.0013498980316301 },
  { z: -2, cdf: 0.0227501319481792 },
  { z: -1, cdf: 0.1586552539314571 },
  { z:  0, cdf: 0.5000000000000000 },
  { z:  1, cdf: 0.8413447460685429 },
  { z:  2, cdf: 0.9772498680518208 },
  { z:  3, cdf: 0.9986501019683699 }
];


// --------------------------------------------
// Display CDF results
// --------------------------------------------

function runNormal() {
  const n = Number($("cdf-steps").value);

  $("cdf-rows").replaceChildren();

  for (const { z, cdf } of referenceValues) {
    const simpson = normalSimpson(z, n);
    const series = normalSeries(z);
    const erf = normalErfApprox(z);

    const error = Math.abs(simpson - cdf);

    const values = [
      z,
      cdf.toFixed(8),
      format(simpson),
      format(series),
      format(erf),
      error.toExponential(3)
    ];

    const tr = document.createElement("tr");

    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }

    $("cdf-rows").appendChild(tr);
  }

  const z = 2;
  const repeats = 10000;

  const timeSimpson = benchmark(
    () => normalSimpson(z, n), repeats
  );

  const timeSeries = benchmark(
    () => normalSeries(z), repeats
  );

  const timeErf = benchmark(
    () => normalErfApprox(z), repeats
  );

  $("cdf-benchmark").textContent =
    `At z = ${z}, average time per evaluation ` +
    `(${repeats} repetitions): ` +
    `Simpson ${timeSimpson.toFixed(5)} ms; ` +
    `series ${timeSeries.toFixed(5)} ms; ` +
    `erf approximation ${timeErf.toFixed(5)} ms. ` +
    `Timings depend on the browser and hardware.`;
}


// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {

  // Exercise 1: run only when button is clicked.
  $("int-run").addEventListener("click", runIntegration);

  // Exercise 2: run only when button is clicked.
  $("cdf-run").addEventListener("click", runNormal);

  // Initial results, displayed on page load.
  runIntegration();
  runNormal();

});
