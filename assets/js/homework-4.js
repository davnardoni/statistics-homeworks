
"use strict";

// ============================================
// HOMEWORK 4 — STATISTICS
// Welford's recurrence and sampling statistics
// ============================================

const POPULATION_MEAN = 5;
const POPULATION_VARIANCE = 2.5;
const SAMPLE_SIZES = [2, 5, 10, 30, 50, 100, 300];

const $ = (id) => document.getElementById(id);

function format(value, digits = 4) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

// ============================================
// EXERCISE 1 — WELFORD'S ALGORITHM
// ============================================

class Welford {
  constructor() {
    this.n = 0;
    this.mean = 0;
    this.SS = 0;
  }

  add(x) {
    this.n++;

    // Core recurrence: only three statements.
    const delta = x - this.mean;
    this.mean += delta / this.n;
    this.SS += delta * (x - this.mean);

    return {
      n: this.n,
      x,
      delta,
      mean: this.mean,
      SS: this.SS,
      variance: this.variance
    };
  }

  get variance() {
    return this.n > 1 ? this.SS / (this.n - 1) : NaN;
  }
}

function runWelfordExercise() {
  const raw = $("welford-values").value.trim();
  const error = $("welford-error");
  error.textContent = "";

  const parts = raw.split(",").map((part) => part.trim());

  if (
    parts.length < 2 ||
    parts.some((part) => part === "" || !Number.isFinite(Number(part)))
  ) {
    error.textContent =
      "Please enter at least two valid numbers separated by commas.";
    return;
  }

  const values = parts.map(Number);
  const accumulator = new Welford();

  const rows = values.map((value) => {
    const result = accumulator.add(value);

    return `
      <tr>
        <td>${result.n}</td>
        <td>${format(result.x)}</td>
        <td>${format(result.delta)}</td>
        <td>${format(result.mean)}</td>
        <td>${format(result.SS)}</td>
        <td>${format(result.variance)}</td>
      </tr>
    `;
  });

  $("welford-rows").innerHTML = rows.join("");

  $("welford-count").textContent = accumulator.n;
  $("welford-mean").textContent = format(accumulator.mean);
  $("welford-ss").textContent = format(accumulator.SS);
  $("welford-variance").textContent = format(accumulator.variance);

  // Independent two-pass verification.
  const directMean =
    values.reduce((sum, x) => sum + x, 0) / values.length;

  const directSS = values.reduce(
    (sum, x) => sum + (x - directMean) ** 2,
    0
  );

  const directVariance = directSS / (values.length - 1);

  const difference = Math.abs(accumulator.variance - directVariance);

  $("welford-check").textContent =
    `Verification: direct sample variance = ${format(directVariance, 6)}. ` +
    `Absolute difference from Welford = ${difference.toExponential(3)}.`;
}

// ============================================
// EXERCISE 2 — PROBABILITY DISTRIBUTION
// X ~ Binomial(10, 0.5)
// ============================================

function sampleScore() {
  let score = 0;

  for (let i = 0; i < 10; i++) {
    if (Math.random() < 0.5) {
      score++;
    }
  }

  return score;
}

// ============================================
// MONTE CARLO SIMULATION
// ============================================

function runExperiment(m, n, saveTrajectory = false) {
  const sampleMeans = [];
  const sampleVariances = [];

  let trajectory = [];
  let runningMeans = [];

  for (let hacker = 0; hacker < m; hacker++) {
    const welford = new Welford();

    const scores = [];
    const means = [];

    for (let system = 0; system < n; system++) {
      const score = sampleScore();
      welford.add(score);

      if (saveTrajectory && hacker === 0) {
        scores.push(score);
        means.push(welford.mean);
      }
    }

    sampleMeans.push(welford.mean);
    sampleVariances.push(welford.variance);

    if (saveTrajectory && hacker === 0) {
      trajectory = scores;
      runningMeans = means;
    }
  }

  // Aggregate across the m independent hackers.
  const meansAccumulator = new Welford();
  const variancesAccumulator = new Welford();

  for (let i = 0; i < m; i++) {
    meansAccumulator.add(sampleMeans[i]);
    variancesAccumulator.add(sampleVariances[i]);
  }

  return {
    m,
    n,
    sampleMeans,
    sampleVariances,
    averageMean: meansAccumulator.mean,
    averageVariance: variancesAccumulator.mean,
    sdMeans: Math.sqrt(meansAccumulator.variance),
    sdVariances: Math.sqrt(variancesAccumulator.variance),
    theoreticalSdMeans: Math.sqrt(POPULATION_VARIANCE / n),
    theoreticalSdVariances: Math.sqrt(
      theoreticalVarianceOfSampleVariance(n)
    ),
    trajectory,
    runningMeans
  };
}

function theoreticalVarianceOfSampleVariance(n) {
  // Fourth central moment for Binomial(10, 0.5).
  const mu4 = 17.5;
  const sigma4 = POPULATION_VARIANCE ** 2;

  return (
    mu4 - ((n - 3) / (n - 1)) * sigma4
  ) / n;
}

function readHackers() {
  const m = Number($("sim-hackers").value);

  if (!Number.isInteger(m) || m < 10 || m > 10000) {
    throw new Error(
      "The number of hackers must be an integer between 10 and 10000."
    );
  }

  return m;
}

// ============================================
// CANVAS DRAWING UTILITIES
// ============================================

function prepareCanvas(id) {
  const canvas = $(id);
  const context = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);

  return { context, width, height };
}

function chartPalette() {
  return {
    text: "#344054",
    grid: "#e4e7ec",
    axis: "#98a2b3",
    main: "#3468a8",
    secondary: "#e39b44",
    reference: "#c24141",
    background: "#ffffff"
  };
}

function drawFrame(context, width, height, title, yMax, yLabel = "") {
  const colors = chartPalette();

  const plot = {
    left: 70,
    right: width - 25,
    top: 55,
    bottom: height - 52
  };

  context.fillStyle = colors.background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = colors.text;
  context.font = "bold 15px Arial";
  context.textAlign = "center";
  context.fillText(title, width / 2, 25);

  context.font = "12px Arial";

  for (let i = 0; i <= 5; i++) {
    const value = (yMax * i) / 5;
    const y = plot.bottom -
      (i / 5) * (plot.bottom - plot.top);

    context.strokeStyle = colors.grid;
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();

    context.fillStyle = colors.text;
    context.textAlign = "right";
    context.fillText(format(value, yMax < 10 ? 2 : 0), plot.left - 10, y + 4);
  }

  context.strokeStyle = colors.axis;
  context.lineWidth = 1;

  context.beginPath();
  context.moveTo(plot.left, plot.top);
  context.lineTo(plot.left, plot.bottom);
  context.lineTo(plot.right, plot.bottom);
  context.stroke();

  if (yLabel) {
    context.save();
    context.translate(18, (plot.top + plot.bottom) / 2);
    context.rotate(-Math.PI / 2);
    context.textAlign = "center";
    context.fillStyle = colors.text;
    context.fillText(yLabel, 0, 0);
    context.restore();
  }

  return plot;
}

function drawLegend(context, items, width, y = 43) {
  const totalWidth = items.reduce(
    (sum, item) => sum + 45 + item.label.length * 7,
    0
  );

  let x = Math.max(70, (width - totalWidth) / 2);

  items.forEach((item) => {
    context.strokeStyle = item.color;
    context.fillStyle = item.color;
    context.lineWidth = 3;

    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 18, y);
    context.stroke();

    context.font = "12px Arial";
    context.textAlign = "left";
    context.fillStyle = "#344054";
    context.fillText(item.label, x + 24, y + 4);

    x += 45 + item.label.length * 7;
  });
}

// ============================================
// HISTOGRAMS
// ============================================

function drawHistogram(id, values, reference, title, xLabel) {
  const { context, width, height } = prepareCanvas(id);
  const colors = chartPalette();

  const binsCount = 24;

  const dataMin = Math.min(...values, reference);
  const dataMax = Math.max(...values, reference);

  const spread = Math.max(dataMax - dataMin, 0.1);
  const padding = spread * 0.08;

  const min = dataMin - padding;
  const max = dataMax + padding;

  const counts = Array(binsCount).fill(0);

  values.forEach((value) => {
    const fraction = (value - min) / (max - min);

    const index = Math.max(
      0,
      Math.min(binsCount - 1, Math.floor(fraction * binsCount))
    );

    counts[index]++;
  });

  const yMax = Math.max(1, ...counts) * 1.15;
  const plot = drawFrame(
    context, width, height, title, yMax, "Frequency"
  );

  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;
  const barWidth = plotWidth / binsCount;

  counts.forEach((count, i) => {
    const barHeight = (count / yMax) * plotHeight;
    const x = plot.left + i * barWidth;

    context.fillStyle = colors.main;
    context.fillRect(
      x + 1,
      plot.bottom - barHeight,
      Math.max(1, barWidth - 2),
      barHeight
    );
  });

  // Theoretical parameter.
  const refX = plot.left +
    ((reference - min) / (max - min)) * plotWidth;

  context.save();
  context.strokeStyle = colors.reference;
  context.lineWidth = 2;
  context.setLineDash([7, 5]);

  context.beginPath();
  context.moveTo(refX, plot.top);
  context.lineTo(refX, plot.bottom);
  context.stroke();

  context.restore();

  context.fillStyle = colors.text;
  context.font = "12px Arial";
  context.textAlign = "center";

  for (let i = 0; i <= 5; i++) {
    const value = min + (i / 5) * (max - min);
    const x = plot.left + (i / 5) * plotWidth;

    context.fillText(format(value, 2), x, plot.bottom + 18);
  }

  context.fillText(xLabel, width / 2, height - 9);

  drawLegend(context, [
    { label: "Observed distribution", color: colors.main },
    { label: "Theoretical value", color: colors.reference }
  ], width);
}

// ============================================
// SINGLE HACKER TRAJECTORY
// ============================================

function drawTrajectory(scores, means) {
  const { context, width, height } =
    prepareCanvas("sim-trajectory-chart");

  const colors = chartPalette();

  const plot = drawFrame(
    context, width, height,
    "Scores and cumulative sample mean",
    10,
    "Score"
  );

  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;

  const xAt = (i) =>
    plot.left + ((i + 0.5) / scores.length) * plotWidth;

  const yAt = (value) =>
    plot.bottom - (value / 10) * plotHeight;

  // Individual scores.
  context.fillStyle = colors.main;

  scores.forEach((score, i) => {
    const x = xAt(i);
    const y = yAt(score);

    context.beginPath();
    context.arc(x, y, 3.2, 0, 2 * Math.PI);
    context.fill();
  });

  // Running mean line.
  context.strokeStyle = colors.secondary;
  context.lineWidth = 2.5;

  context.beginPath();
  means.forEach((mean, i) => {
    const x = xAt(i);
    const y = yAt(mean);

    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  // Theoretical population mean.
  context.save();
  context.strokeStyle = colors.reference;
  context.setLineDash([6, 5]);

  context.beginPath();
  context.moveTo(plot.left, yAt(POPULATION_MEAN));
  context.lineTo(plot.right, yAt(POPULATION_MEAN));
  context.stroke();
  context.restore();

  context.fillStyle = colors.text;
  context.font = "12px Arial";
  context.textAlign = "center";

  const labels = Math.min(scores.length, 10);

  for (let i = 0; i < labels; i++) {
    const index = Math.round(
      (i * (scores.length - 1)) / Math.max(1, labels - 1)
    );

    context.fillText(
      String(index + 1),
      xAt(index),
      plot.bottom + 18
    );
  }

  context.fillText("System number", width / 2, height - 9);

  drawLegend(context, [
    { label: "Individual scores", color: colors.main },
    { label: "Cumulative mean", color: colors.secondary },
    { label: "Population mean", color: colors.reference }
  ], width);
}

// ============================================
// SAMPLE SIZE COMPARISON CHARTS
// ============================================

function drawSampleSizeChart(id, results, key, title, theoreticalKey = null) {
  const { context, width, height } = prepareCanvas(id);
  const colors = chartPalette();

  const actual = results.map((result) => result[key]);

  const theoretical = theoreticalKey
    ? results.map((result) => result[theoreticalKey])
    : [];

  const yMax = Math.max(
    0.01,
    ...actual,
    ...theoretical
  ) * 1.2;

  const plot = drawFrame(
    context, width, height, title, yMax, "Standard deviation"
  );

  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;

  const xAt = (i) =>
    plot.left + ((i + 0.5) / results.length) * plotWidth;

  const yAt = (value) =>
    plot.bottom - (value / yMax) * plotHeight;

  function drawSeries(values, color) {
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 2.5;

    context.beginPath();

    values.forEach((value, i) => {
      const x = xAt(i);
      const y = yAt(value);

      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });

    context.stroke();

    values.forEach((value, i) => {
      context.beginPath();
      context.arc(xAt(i), yAt(value), 4, 0, Math.PI * 2);
      context.fill();
    });
  }

  drawSeries(actual, colors.main);

  if (theoretical.length) {
    drawSeries(theoretical, colors.secondary);
  }

  context.fillStyle = colors.text;
  context.font = "12px Arial";
  context.textAlign = "center";

  results.forEach((result, i) => {
    context.fillText(String(result.n), xAt(i), plot.bottom + 18);
  });

  context.fillText(
    "Systems per hacker (n)",
    width / 2,
    height - 9
  );

  const legend = [
    { label: "Empirical SD", color: colors.main }
  ];

  if (theoretical.length) {
    legend.push({
      label: "Theoretical SD",
      color: colors.secondary
    });
  }

  drawLegend(context, legend, width);
}

// ============================================
// RUN SINGLE EXPERIMENT
// ============================================

let lastSimulation = null;
let lastComparison = null;

function runSingleSimulation() {
  const error = $("sim-error");
  error.textContent = "";

  try {
    const m = readHackers();
    const n = Number($("sim-systems").value);

    lastSimulation = runExperiment(m, n, true);

    const result = lastSimulation;

    $("sim-mean").textContent = format(result.averageMean);
    $("sim-variance").textContent = format(result.averageVariance);

    $("sim-mean-sd").textContent = format(result.sdMeans);
    $("sim-variance-sd").textContent = format(result.sdVariances);

    $("sim-mean-sd-theory").textContent =
      `Theoretical: ${format(result.theoreticalSdMeans)}`;

    const meanError = result.averageMean - POPULATION_MEAN;
    const varianceError =
      result.averageVariance - POPULATION_VARIANCE;

    $("sim-comparison").textContent =
      `Across ${m} independent hackers with ${n} scores each, ` +
      `the average sample mean differs from μ = 5 by ` +
      `${format(meanError, 5)}, and the average sample variance ` +
      `differs from σ² = 2.5 by ${format(varianceError, 5)}. ` +
      `The empirical SD of sample means is ` +
      `${format(result.sdMeans)}, compared with the theoretical ` +
      `value ${format(result.theoreticalSdMeans)}.`;

    drawHistogram(
      "sim-mean-chart",
      result.sampleMeans,
      POPULATION_MEAN,
      `Sampling distribution of means (n = ${n})`,
      "Sample mean"
    );

    drawHistogram(
      "sim-variance-chart",
      result.sampleVariances,
      POPULATION_VARIANCE,
      `Sampling distribution of variances (n = ${n})`,
      "Sample variance"
    );

    drawTrajectory(result.trajectory, result.runningMeans);

  } catch (exception) {
    error.textContent = exception.message;
  }
}

// ============================================
// COMPARE DIFFERENT SAMPLE SIZES
// ============================================

function runComparison() {
  const error = $("sim-error");
  error.textContent = "";

  try {
    const m = readHackers();

    const results = SAMPLE_SIZES.map((n) => runExperiment(m, n));

    lastComparison = results;

    $("sim-comparison-rows").innerHTML = results.map((result) => `
      <tr>
        <td>${result.n}</td>
        <td>${format(result.averageMean)}</td>
        <td>${format(result.averageVariance)}</td>
        <td>${format(result.sdMeans)}</td>
        <td>${format(result.theoreticalSdMeans)}</td>
        <td>${format(result.sdVariances)}</td>
      </tr>
    `).join("");

    drawSampleSizeChart(
      "sim-mean-sd-chart",
      results,
      "sdMeans",
      "Variability of sample means vs. sample size",
      "theoreticalSdMeans"
    );

    drawSampleSizeChart(
      "sim-variance-sd-chart",
      results,
      "sdVariances",
      "Variability of sample variances vs. sample size",
      "theoreticalSdVariances"
    );

    const first = results[0];
    const last = results[results.length - 1];

    $("sim-size-summary").textContent =
      `With ${m} hackers per experiment, increasing the number ` +
      `of systems from n = ${first.n} to n = ${last.n} changes ` +
      `the empirical SD of sample means from ` +
      `${format(first.sdMeans)} to ${format(last.sdMeans)}, ` +
      `and the empirical SD of sample variances from ` +
      `${format(first.sdVariances)} to ${format(last.sdVariances)}. ` +
      `The theoretical SD of the sample mean decreases as 1/√n. ` +
      `The averages remain close to the theoretical parameters, ` +
      `while individual estimates become more concentrated.`;

  } catch (exception) {
    error.textContent = exception.message;
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  $("welford-run").addEventListener("click", runWelfordExercise);
  $("sim-run").addEventListener("click", runSingleSimulation);
  $("sim-compare").addEventListener("click", runComparison);

  runWelfordExercise();
  runSingleSimulation();
  runComparison();
});
