
"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ==========================================
  // COMMON UTILITIES
  // ==========================================

  const format = value => Number(value).toFixed(4);

  function readNumber(id) {
    const element = document.getElementById(id);

    if (element.value.trim() === "") {
      throw new Error("All input fields must be filled in.");
    }

    const value = Number(element.value);

    if (!Number.isFinite(value)) {
      throw new Error("Please enter valid numeric values.");
    }

    return value;
  }

  function showError(errorId, resultId, message) {
    document.getElementById(errorId).textContent = message;
    document.getElementById(resultId).hidden = true;
  }

  function showResult(errorId, resultId, html) {
    document.getElementById(errorId).textContent = "";

    const result = document.getElementById(resultId);
    result.innerHTML = html;
    result.hidden = false;
  }

  // ==========================================
  // EXAMPLE 1: DIAGNOSTIC TEST
  // ==========================================

  function calculateDiagnostic() {
    const errorId = "diagnostic-error";
    const resultId = "diagnostic-result";

    try {
      const prevalence = readNumber("prior-disease");
      const sensitivity = readNumber("sensitivity");
      const specificity = readNumber("specificity");

      const values = [prevalence, sensitivity, specificity];

      if (values.some(value => value < 0 || value > 100)) {
        throw new Error(
          "All percentages must be between 0 and 100."
        );
      }

      // Convert percentages into probabilities.
      const prior = prevalence / 100;
      const truePositiveRate = sensitivity / 100;
      const trueNegativeRate = specificity / 100;

      // Probability of a false positive.
      const falsePositiveRate = 1 - trueNegativeRate;

      // Law of total probability:
      // P(+) = P(+|D)P(D) + P(+|not D)P(not D)
      const probabilityPositive =
        truePositiveRate * prior +
        falsePositiveRate * (1 - prior);

      if (probabilityPositive <= 0) {
        throw new Error(
          "A positive test has zero probability under " +
          "these assumptions. The posterior is undefined."
        );
      }

      // Bayes' theorem.
      const posterior =
        (truePositiveRate * prior) / probabilityPositive;

      const priorPercentage = prior * 100;
      const posteriorPercentage = posterior * 100;

      const interpretation =
        posterior > prior
          ? "A positive test increases the estimated " +
            "probability of disease."
          : posterior < prior
            ? "A positive test decreases the estimated " +
              "probability of disease under these assumptions."
            : "A positive test does not change the " +
              "estimated probability of disease.";

      const html = `
        <h4>Bayesian updating results</h4>

        <p>
          <strong>Prior probability of disease:</strong>
          ${format(priorPercentage)}%
        </p>

        <p>
          <strong>Likelihood P(+ | Disease):</strong>
          ${format(truePositiveRate)}
        </p>

        <p>
          <strong>Likelihood P(+ | No disease):</strong>
          ${format(falsePositiveRate)}
        </p>

        <p>
          <strong>Overall probability of a positive test:</strong>
          ${format(probabilityPositive)}
        </p>

        <p>
          <strong>Posterior probability P(Disease | +):</strong>
          ${format(posteriorPercentage)}%
        </p>

        <p class="hw-interpretation">
          ${interpretation}
          The posterior is affected by both disease
          prevalence and test accuracy.
        </p>
      `;

      showResult(errorId, resultId, html);

    } catch (error) {
      showError(errorId, resultId, error.message);
    }
  }

  // ==========================================
  // EXAMPLE 2: BETA-BINOMIAL MODEL
  // ==========================================

  function calculateBetaPosterior() {
    const errorId = "beta-error";
    const resultId = "beta-result";

    try {
      const a = readNumber("beta-a");
      const b = readNumber("beta-b");

      const heads = readNumber("heads");
      const tails = readNumber("tails");

      // Beta distribution parameters must be positive.
      if (a <= 0 || b <= 0) {
        throw new Error(
          "Beta prior parameters a and b must be positive."
        );
      }

      // Observed counts must be non-negative integers.
      if (
        heads < 0 ||
        tails < 0 ||
        !Number.isSafeInteger(heads) ||
        !Number.isSafeInteger(tails)
      ) {
        throw new Error(
          "Heads and tails must be non-negative integers."
        );
      }

      const n = heads + tails;

      if (!Number.isSafeInteger(n)) {
        throw new Error(
          "The number of observations is too large."
        );
      }

      // Beta prior mean.
      const priorMean = a / (a + b);

      // Beta-Binomial conjugate updating.
      const posteriorA = a + heads;
      const posteriorB = b + tails;

      // Posterior mean.
      const posteriorMean =
        posteriorA / (posteriorA + posteriorB);

      // Sample proportion of heads.
      const sampleProportion = n > 0
        ? heads / n
        : null;

      let interpretation;

      if (n === 0) {
        interpretation =
          "No observations were provided, so the " +
          "posterior distribution is identical to the prior.";
      } else {
        interpretation =
          "The posterior combines the prior distribution " +
          "with the binomial likelihood of the observed data. " +
          "The prior has a stronger influence for smaller " +
          "samples, while the data generally become more " +
          "influential as the sample size increases.";
      }

      const html = `
        <h4>Beta-Binomial updating results</h4>

        <p>
          <strong>Prior distribution:</strong>
          Beta(${format(a)}, ${format(b)})
        </p>

        <p>
          <strong>Prior mean:</strong>
          ${format(priorMean)}
        </p>

        <p>
          <strong>Number of observations:</strong>
          ${n}
        </p>

        <p>
          <strong>Observed proportion of heads:</strong>
          ${sampleProportion === null
            ? "Not defined (no observations)"
            : format(sampleProportion)}
        </p>

        <p>
          <strong>Posterior distribution:</strong>
          Beta(${format(posteriorA)}, ${format(posteriorB)})
        </p>

        <p>
          <strong>Posterior mean:</strong>
          ${format(posteriorMean)}
        </p>

        <p class="hw-interpretation">
          ${interpretation}
        </p>
      `;

      showResult(errorId, resultId, html);

    } catch (error) {
      showError(errorId, resultId, error.message);
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  document.getElementById("calculate-diagnostic")
    .addEventListener("click", calculateDiagnostic);

  document.getElementById("calculate-beta")
    .addEventListener("click", calculateBetaPosterior);

  // Calculate initial results using default values.
  calculateDiagnostic();
  calculateBetaPosterior();

});
