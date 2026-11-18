
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const calculateButton = document.getElementById("calculate");
  const datasetInput = document.getElementById("dataset");
  const errorElement = document.getElementById("dataset-error");

  const format = value => Number(value).toFixed(4);

  // Escape user-provided category names before inserting HTML.
  function escapeHTML(value) {
    return value.replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  // Parse the bivariate dataset.
  function parseDataset(text) {
    const lines = text.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      throw new Error("Please enter a dataset.");
    }

    return lines.map((line, index) => {
      const values = line.split(",").map(value => value.trim());

      if (values.length !== 2 || values.some(v => v === "")) {
        throw new Error(
          `Invalid observation at line ${index + 1}. ` +
          "Use the format X,F."
        );
      }

      return { x: values[0], f: values[1] };
    });
  }

  // Construct the contingency table.
  function buildContingencyTable(data) {
    const xCategories = [...new Set(data.map(row => row.x))];
    const fCategories = [...new Set(data.map(row => row.f))];

    const counts = xCategories.map(() =>
      fCategories.map(() => 0)
    );

    const xIndex = new Map(
      xCategories.map((value, index) => [value, index])
    );

    const fIndex = new Map(
      fCategories.map((value, index) => [value, index])
    );

    for (const observation of data) {
      counts[
        xIndex.get(observation.x)
      ][
        fIndex.get(observation.f)
      ]++;
    }

    const rowTotals = counts.map(row =>
      row.reduce((sum, value) => sum + value, 0)
    );

    const columnTotals = fCategories.map((_, j) =>
      counts.reduce((sum, row) => sum + row[j], 0)
    );

    return {
      xCategories,
      fCategories,
      counts,
      rowTotals,
      columnTotals,
      n: data.length
    };
  }

  // Generate a table from headers and rows.
  function renderTable(containerId, headers, rows) {
    const container = document.getElementById(containerId);

    const thead = `
      <thead>
        <tr>
          ${headers.map(h => `<th>${escapeHTML(String(h))}</th>`).join("")}
        </tr>
      </thead>
    `;

    const tbody = `
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(value => `<td>${escapeHTML(String(value))}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    `;

    container.innerHTML = `
      <table class="hw-table">
        ${thead}
        ${tbody}
      </table>
    `;
  }

  function calculateFrequencies(table) {
    const {
      counts, rowTotals, columnTotals, n
    } = table;

    // Joint relative frequencies.
    const joint = counts.map(row =>
      row.map(value => value / n)
    );

    // Marginal relative frequencies.
    const marginalX = rowTotals.map(total => total / n);
    const marginalF = columnTotals.map(total => total / n);

    // Conditional distribution F | X.
    const conditionalF = counts.map((row, i) =>
      row.map(value => value / rowTotals[i])
    );

    // Conditional distribution X | F.
    const conditionalX = counts.map(row =>
      row.map((value, j) => value / columnTotals[j])
    );

    return {
      joint,
      marginalX,
      marginalF,
      conditionalF,
      conditionalX
    };
  }

  // Expected absolute frequencies under independence.
  function calculateExpected(table) {
    const {
      rowTotals, columnTotals, n
    } = table;

    return rowTotals.map(rowTotal =>
      columnTotals.map(columnTotal =>
        (rowTotal * columnTotal) / n
      )
    );
  }

  // Pearson Chi-square statistic.
  function calculateChiSquare(observed, expected) {
    let chiSquare = 0;

    for (let i = 0; i < observed.length; i++) {
      for (let j = 0; j < observed[i].length; j++) {
        const difference = observed[i][j] - expected[i][j];

        chiSquare +=
          (difference * difference) / expected[i][j];
      }
    }

    return chiSquare;
  }

  // Logarithm of the Gamma function (Lanczos approximation).
  function logGamma(z) {
    const coefficients = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if (z < 0.5) {
      return Math.log(Math.PI) -
        Math.log(Math.sin(Math.PI * z)) -
        logGamma(1 - z);
    }

    z -= 1;
    let x = coefficients[0];

    for (let i = 1; i < coefficients.length; i++) {
      x += coefficients[i] / (z + i);
    }

    const t = z + 7.5;

    return 0.5 * Math.log(2 * Math.PI) +
      (z + 0.5) * Math.log(t) -
      t + Math.log(x);
  }

  // Regularized lower incomplete Gamma function P(a,x).
  function gammaP(a, x) {
    if (x <= 0) return 0;

    const epsilon = 1e-12;
    const maxIterations = 10000;
    const factor = Math.exp(
      -x + a * Math.log(x) - logGamma(a)
    );

    if (x < a + 1) {
      let sum = 1 / a;
      let term = sum;

      for (let n = 1; n <= maxIterations; n++) {
        term *= x / (a + n);
        sum += term;

        if (Math.abs(term) < Math.abs(sum) * epsilon) {
          break;
        }
      }

      return Math.min(1, Math.max(0, sum * factor));
    }

    return 1 - gammaQContinuedFraction(a, x);
  }

  // Regularized upper incomplete Gamma function Q(a,x).
  function gammaQContinuedFraction(a, x) {
    const epsilon = 1e-12;
    const minimum = 1e-300;
    const maxIterations = 10000;

    let b = x + 1 - a;
    let c = 1 / minimum;
    let d = 1 / (Math.abs(b) < minimum ? minimum : b);
    let h = d;

    for (let i = 1; i <= maxIterations; i++) {
      const an = -i * (i - a);
      b += 2;

      d = an * d + b;
      if (Math.abs(d) < minimum) d = minimum;

      c = b + an / c;
      if (Math.abs(c) < minimum) c = minimum;

      d = 1 / d;
      const delta = d * c;
      h *= delta;

      if (Math.abs(delta - 1) < epsilon) break;
    }

    return Math.min(1, Math.max(0,
      Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
    ));
  }

  // Upper-tail probability of the Chi-square distribution.
  function chiSquarePValue(chiSquare, df) {
    const a = df / 2;
    const x = chiSquare / 2;

    if (x === 0) return 1;

    if (x < a + 1) {
      return 1 - gammaP(a, x);
    }

    return gammaQContinuedFraction(a, x);
  }

  function displayResults(table, frequencies, expected) {
    const {
      xCategories, fCategories, counts,
      rowTotals, columnTotals, n
    } = table;

    const {
      marginalX, marginalF,
      conditionalF, conditionalX
    } = frequencies;

    const r = xCategories.length;
    const c = fCategories.length;

    // Observed contingency table, including absolute marginals.
    const observedRows = xCategories.map((category, i) => [
      category,
      ...counts[i],
      rowTotals[i]
    ]);

    observedRows.push([
      "Total",
      ...columnTotals,
      n
    ]);

    renderTable(
      "observed-table",
      ["X / F", ...fCategories, "Total"],
      observedRows
    );

    // Marginal relative frequencies.
    const marginalRows = [
      ...xCategories.map((category, i) => [
        `X = ${category}`,
        format(marginalX[i])
      ]),
      ...fCategories.map((category, j) => [
        `F = ${category}`,
        format(marginalF[j])
      ])
    ];

    renderTable(
      "marginal-table",
      ["Category", "Marginal relative frequency"],
      marginalRows
    );

    // Conditional frequencies of F given X.
    renderTable(
      "conditional-f-table",
      ["X / F", ...fCategories],
      xCategories.map((category, i) => [
        category,
        ...conditionalF[i].map(format)
      ])
    );

    // Conditional frequencies of X given F.
    renderTable(
      "conditional-x-table",
      ["F / X", ...xCategories],
      fCategories.map((category, j) => [
        category,
        ...xCategories.map((_, i) =>
          format(conditionalX[i][j])
        )
      ])
    );

    // Expected frequencies.
    renderTable(
      "expected-table",
      ["X / F", ...fCategories],
      xCategories.map((category, i) => [
        category,
        ...expected[i].map(format)
      ])
    );

    // Chi-square test.
    const chiSquare = calculateChiSquare(counts, expected);
    const df = (r - 1) * (c - 1);
    const pValue = chiSquarePValue(chiSquare, df);
    const alpha = 0.05;

    document.getElementById("test-result").innerHTML = `
      <strong>Chi-square statistic:</strong>
      ${format(chiSquare)}<br>
      <strong>Degrees of freedom:</strong>
      ${df}<br>
      <strong>p-value:</strong>
      ${pValue.toPrecision(5)}
    `;

    const significant = pValue < alpha;

    document.getElementById("interpretation").textContent =
      significant
        ? `Since p = ${pValue.toPrecision(5)} < 0.05, ` +
          `we reject the null hypothesis of independence. ` +
          `The data provide statistically significant ` +
          `evidence of an association between X and F.`
        : `Since p = ${pValue.toPrecision(5)} >= 0.05, ` +
          `we fail to reject the null hypothesis of ` +
          `independence. The data do not provide sufficient ` +
          `evidence of an association between X and F. ` +
          `This does not prove that the variables are independent.`;

    const smallExpected = expected.flat()
      .filter(value => value < 5).length;

    const totalCells = r * c;

    document.getElementById("assumptions").textContent =
      smallExpected > 0
        ? `${smallExpected} of ${totalCells} expected ` +
          `frequencies are below 5. The Chi-square ` +
          `approximation may be unreliable, so the ` +
          `test result should be interpreted cautiously. ` +
          `The test also assumes independent observations.`
        : `All expected frequencies are at least 5, ` +
          `satisfying a common condition for the ` +
          `Chi-square approximation. The test also ` +
          `assumes independent observations.`;

    for (const id of [
      "results",
      "expected-section",
      "test-section",
      "conclusion-section"
    ]) {
      document.getElementById(id).hidden = false;
    }
  }

  function runAnalysis() {
    errorElement.textContent = "";

    for (const id of [
      "results",
      "expected-section",
      "test-section",
      "conclusion-section"
    ]) {
      document.getElementById(id).hidden = true;
    }

    try {
      const data = parseDataset(datasetInput.value);
      const table = buildContingencyTable(data);

      if (
        table.xCategories.length < 2 ||
        table.fCategories.length < 2
      ) {
        throw new Error(
          "Both variables must have at least two categories " +
          "to perform the Chi-square test."
        );
      }

      const frequencies = calculateFrequencies(table);
      const expected = calculateExpected(table);

      displayResults(table, frequencies, expected);

    } catch (error) {
      errorElement.textContent = error.message;
    }
  }

  calculateButton.addEventListener("click", runAnalysis);

  // Display results for the initial dataset.
  runAnalysis();
});
