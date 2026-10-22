
"use strict";

// Homework 3 — Stochastic Penetration Process

const $ = id => document.getElementById(id);
const sizes = [25, 100, 400, 1600];
const colors = ["#2457a7", "#16a34a", "#db7a24", "#8b5cf6"];
const fmt = (x, d = 3) => x.toFixed(d);
const phi = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);

// Generate m independent trajectories of length n.
function simulate(n, m, model, p) {
    const scores = [], paths = [];

    for (let j = 0; j < m; j++) {
        let s = 0;
        const path = [0];

        for (let i = 0; i < n; i++) {
            const success = Math.random() < p;
            s += model === "bernoulli"
                ? Number(success)
                : (success ? 1 : -1);

            if (j < 10) path.push(s);
        }

        scores.push(s);
        if (j < 10) paths.push(path);
    }

    return { scores, paths };
}

// Population variance of the simulated observations.
function variance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((s, x) => s + (x - mean) ** 2, 0)
        / values.length;
}

// Draw axes and return coordinate transformations.
function chart(id, xmin, xmax, ymin, ymax, xLabel, yLabel) {
    const canvas = $(id);
    const w = canvas.clientWidth || 700;
    const h = canvas.clientHeight || 280;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const L = 50, R = 15, T = 15, B = 42;
    const x = v => L + (v - xmin) / (xmax - xmin || 1) * (w - L - R);
    const y = v => h - B - (v - ymin) / (ymax - ymin || 1) * (h - T - B);

    ctx.font = "11px Arial";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
        const value = ymin + (ymax - ymin) * i / 4;
        ctx.strokeStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.moveTo(L, y(value));
        ctx.lineTo(w - R, y(value));
        ctx.stroke();

        ctx.fillStyle = "#64748b";
        ctx.fillText(Number(value.toFixed(2)), L - 6, y(value) + 4);
    }

    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) {
        const value = xmin + (xmax - xmin) * i / 4;
        ctx.fillText(Number(value.toFixed(2)), x(value), h - B + 16);
    }

    ctx.fillText(xLabel, w / 2, h - 5);
    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    return { ctx, x, y };
}

function line(ctx, points, x, y, color, dashed = false) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = dashed ? 2.2 : 1.4;
    ctx.setLineDash(dashed ? [6, 5] : []);

    points.forEach(([a, b], i) => {
        if (i === 0) ctx.moveTo(x(a), y(b));
        else ctx.lineTo(x(a), y(b));
    });

    ctx.stroke();
    ctx.setLineDash([]);
}

// Plot 10 cumulative trajectories.
function plotPaths(paths, n, mu) {
    const values = paths.flat();
    const low = Math.min(0, n * mu, ...values);
    const high = Math.max(0, n * mu, ...values);
    const pad = Math.max(1, (high - low) * 0.1);

    const { ctx, x, y } = chart(
        "trajectories", 0, n, low - pad, high + pad,
        "System k", "Cumulative score"
    );

    paths.forEach((path, j) => {
        line(ctx, path.map((v, i) => [i, v]),
            x, y, colors[j % 4]);
    });

    // Dashed theoretical expected trajectory.
    line(ctx, [[0, 0], [n, n * mu]],
        x, y, "#111827", true);
}

// Empirical histogram with theoretical normal approximation.
function plotDistribution(id, values, mean, sd, label) {
    const bins = 35;
    let min = Math.min(...values);
    let max = Math.max(...values);

    if (sd > 0) {
        min = Math.min(min, mean - 4 * sd);
        max = Math.max(max, mean + 4 * sd);
    }

    const pad = Math.max((max - min) * 0.05, 0.01);
    min -= pad;
    max += pad;

    const width = (max - min) / bins;
    const counts = Array(bins).fill(0);

    values.forEach(v => {
        const i = Math.max(0, Math.min(
            bins - 1, Math.floor((v - min) / width)
        ));
        counts[i]++;
    });

    const density = counts.map(c => c / (values.length * width));
    const peak = Math.max(...density, sd > 0 ? phi(0) / sd : 0);

    const { ctx, x, y } = chart(
        id, min, max, 0, peak * 1.15 || 1,
        label, "Density"
    );

    ctx.fillStyle = "rgba(36,87,167,0.65)";
    density.forEach((d, i) => {
        const left = x(min + i * width);
        const right = x(min + (i + 1) * width);
        ctx.fillRect(left, y(d), Math.max(1, right - left - 1),
            y(0) - y(d));
    });

    if (sd > 0) {
        const curve = Array.from({ length: 150 }, (_, i) => {
            const v = min + (max - min) * i / 149;
            return [v, phi((v - mean) / sd) / sd];
        });
        line(ctx, curve, x, y, "#111827", true);
    }
}


// Variance comparison for increasing n.
function plotVariances(results, sigma2) {
    const curves = [
        results.map(r => [r.n, variance(r.scores)]),
        results.map(r => [r.n, variance(r.scores) / r.n ** 2]),
        results.map(r => [r.n, variance(r.scores) / r.n])
    ];

    const positive = curves.flat()
        .map(point => point[1])
        .filter(v => v > 0);

    if (!positive.length) {
        const canvas = $("variance-chart");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillText("All variances are zero.", 30, 40);
        return;
    }

    const ymin = Math.floor(Math.log10(Math.min(...positive))) - 0.3;
    const ymax = Math.ceil(Math.log10(Math.max(...positive))) + 0.3;

    const { ctx, x, y } = chart(
        "variance-chart", 25, 1600,
        ymin, ymax,
        "Number of systems n", "log10(Variance)"
    );

    curves.forEach((points, i) => {
        line(
            ctx,
            points.filter(p => p[1] > 0)
                  .map(([n, v]) => [n, Math.log10(v)]),
            x, y, colors[i]
        );
    });
}


// CLT: compare standardized distributions for different n.
function plotCLT(results, mu, sigma2) {
    const bins = 40;
    const min = -4, max = 4;
    const width = (max - min) / bins;

    const { ctx, x, y } = chart(
        "clt-chart", min, max, 0, 0.7,
        "Standardized score", "Density"
    );

    if (sigma2 === 0) return;

    results.forEach((r, j) => {
        const counts = Array(bins).fill(0);

        r.scores.forEach(s => {
            const z = (s - r.n * mu) /
                      Math.sqrt(r.n * sigma2);

            if (z >= min && z < max) {
                const i = Math.floor((z - min) / width);
                counts[i]++;
            }
        });

        const points = counts.map((count, i) => [
            min + (i + 0.5) * width,
            count / (r.scores.length * width)
        ]);

        line(ctx, points, x, y, colors[j]);
    });

    // Theoretical N(0,1) density.
    const normal = Array.from({ length: 160 }, (_, i) => {
        const z = min + (max - min) * i / 159;
        return [z, phi(z)];
    });

    line(ctx, normal, x, y, "#111827", true);
}


// Main simulation: increasing n and m independent attackers.
function run() {
    const model = $("model").value;
    const rawP = $("probability").value;
    const p = model === "rademacher" ? 0.5 : Number(rawP);

    if (model === "bernoulli" &&
        (rawP.trim() === "" || !Number.isFinite(p) || p < 0 || p > 1)) {
        $("status").textContent = "Enter a probability between 0 and 1.";
        return;
    }

    const nSelected = Number($("systems").value);
    const m = Number($("attackers").value);
    const mu = model === "bernoulli" ? p : 0;
    const sigma2 = model === "bernoulli" ? p * (1 - p) : 1;

    const results = sizes.map(n => ({
        n, ...simulate(n, m, model, p)
    }));

    // Three distributions and sample paths for selected n.
    const selected = results.find(r => r.n === nSelected);
    const totals = selected.scores;
    const averages = totals.map(s => s / nSelected);
    const normalized = totals.map(s => s / Math.sqrt(nSelected));

    plotPaths(selected.paths, nSelected, mu);

    plotDistribution(
        "total", totals,
        nSelected * mu, Math.sqrt(nSelected * sigma2),
        "Total score"
    );

    plotDistribution(
        "average", averages,
        mu, Math.sqrt(sigma2 / nSelected),
        "Average score"
    );

    plotDistribution(
        "normalized", normalized,
        Math.sqrt(nSelected) * mu, Math.sqrt(sigma2),
        "Normalized score"
    );

    // LLN deviation probability and variance comparison.
    $("results").innerHTML = results.map(r => {
        const n = r.n;
        const totalVar = variance(r.scores);

        const deviation = r.scores.filter(
            s => Math.abs(s / n - mu) > 0.1
        ).length / m;

        return `<tr>
            <td>${n}</td>
            <td>${fmt(totalVar)} / ${fmt(n * sigma2)}</td>
            <td>${fmt(totalVar / (n * n), 5)} / ${fmt(sigma2 / n, 5)}</td>
            <td>${fmt(totalVar / n)} / ${fmt(sigma2)}</td>
            <td>${fmt(deviation, 4)}</td>
        </tr>`;
    }).join("");

    
    plotVariances(results, sigma2);
    plotCLT(results, mu, sigma2);


    const explanation = model === "rademacher"
        ? "In the Rademacher case, Sₙ/√n has mean 0 and variance 1. " +
          "For increasing n, its distribution approaches N(0,1), " +
          "as predicted by the Central Limit Theorem."
        : "In the Bernoulli case, Sₙ/n approaches p. " +
          "The distribution of Sₙ/√n has mean p√n and variance p(1−p); " +
          "standard-normal convergence requires centering and scaling " +
          "by (Sₙ−np)/√(np(1−p)), for 0 < p < 1.";

    $("interpretation").textContent =
        "The comparison illustrates increasing total variance, " +
        "decreasing average variance, and constant normalized variance. " +
        "The deviation probability tends to zero as n grows, although " +
        "Monte Carlo fluctuations may prevent a monotonic decrease. " +
        explanation;

    $("status").textContent =
        `Simulated ${m} attackers for each of the four system sizes.`;
}

// Event handlers
$("model").addEventListener("change", () => {
    $("p-field").hidden = $("model").value === "rademacher";
    run();
});

$("run").addEventListener("click", run);

run();
