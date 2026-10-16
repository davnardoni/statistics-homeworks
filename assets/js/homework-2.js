"use strict";

/* ==========================================
   1. TOY ELLIPTIC CURVE
   ========================================== */

const P = 17;
const G = { x: 1, y: 5 };

// Positive modulo
function mod(n) {
    return ((n % P) + P) % P;
}

// Multiplicative inverse modulo P
function inverse(n) {
    for (let i = 1; i < P; i++) {
        if (mod(n * i) === 1) {
            return i;
        }
    }

    throw new Error("Modular inverse not found");
}

// Elliptic curve point addition
function pointAdd(a, b) {

    if (a === null) return b;
    if (b === null) return a;

    if (
        a.x === b.x &&
        mod(a.y + b.y) === 0
    ) {
        return null;
    }

    let slope;

    if (a.x === b.x && a.y === b.y) {
        slope = mod(
            3 * a.x * a.x *
            inverse(2 * a.y)
        );
    } else {
        slope = mod(
            (b.y - a.y) *
            inverse(b.x - a.x)
        );
    }

    const x = mod(
        slope * slope - a.x - b.x
    );

    const y = mod(
        slope * (a.x - x) - a.y
    );

    return { x, y };
}

// Scalar multiplication
function scalarMultiply(k, point = G) {

    let result = null;

    for (let i = 0; i < k; i++) {
        result = pointAdd(result, point);
    }

    return result;
}

function samePoint(a, b) {

    if (a === null || b === null) {
        return a === b;
    }

    return a.x === b.x && a.y === b.y;
}

function formatPoint(point) {

    if (point === null) {
        return "O";
    }

    return `(${point.x}, ${point.y})`;
}

// Validate integer inputs
function readInteger(id, min, max) {

    const raw = document
        .getElementById(id)
        .value.trim();

    const value = Number(raw);

    if (
        !/^\d+$/.test(raw) ||
        !Number.isInteger(value) ||
        value < min ||
        value > max
    ) {
        throw new Error(
            `${id} must be between ${min} and ${max}`
        );
    }

    return value;
}


/* ==========================================
   2. TOY ECC ENCRYPTION
   ========================================== */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toHex(data) {

    return Array.from(data, byte =>
        byte.toString(16).padStart(2, "0")
    ).join("");
}

// Insecure deterministic educational mask
function generateMask(sharedPoint, index) {

    return (
        sharedPoint.x * 17 +
        sharedPoint.y * 29 +
        index * 31
    ) & 255;
}

// XOR encrypt/decrypt
function xorCrypt(data, sharedPoint) {

    if (sharedPoint === null) {
        throw new Error("Invalid shared point");
    }

    return Uint8Array.from(
        data,
        (byte, i) =>
            byte ^ generateMask(sharedPoint, i)
    );
}

// Simulated transmitted packet
let packet = null;

function runECC() {

    const output =
        document.getElementById("eccResult");

    try {

        const d = readInteger("private", 1, 8);
        const r = readInteger("ephemeral", 1, 8);

        const message =
            document.getElementById("message").value;

        // Recipient's public key
        const Q = scalarMultiply(d);

        // Sender's ephemeral public point
        const R = scalarMultiply(r);

        // Sender's shared secret
        const sharedSender =
            scalarMultiply(r, Q);

        if (sharedSender === null) {
            throw new Error(
                "The selected keys produce the point at infinity. " +
                "Choose a different ephemeral scalar r."
            );
        }

        // Encrypt message
        const plaintextBytes =
            encoder.encode(message);

        const ciphertext =
            xorCrypt(plaintextBytes, sharedSender);

        // Recipient reconstructs shared point
        const sharedReceiver =
            scalarMultiply(d, R);

        // Decrypt
        const decryptedBytes =
            xorCrypt(ciphertext, sharedReceiver);

        const recovered =
            decoder.decode(decryptedBytes);

        // Publicly intercepted information
        packet = {
            Q: Q,
            R: R,
            ciphertext: ciphertext
        };

        output.textContent =
            `Public key Q = ${formatPoint(Q)}\n` +
            `Ephemeral point R = ${formatPoint(R)}\n` +
            `Shared point S = ${formatPoint(sharedSender)}\n\n` +
            `Ciphertext (hex):\n${toHex(ciphertext)}\n\n` +
            `Decrypted message:\n${recovered}\n\n` +
            `Successful: ${recovered === message}`;

    } catch (error) {

        packet = null;
        output.textContent = error.message;
    }
}


/* ==========================================
   3. CAESAR CIPHER
   ========================================== */

function caesar(text, shift) {

    return text.replace(/[A-Za-z]/g, char => {

        const base =
            char >= "A" && char <= "Z"
                ? 65
                : 97;

        const position =
            char.charCodeAt(0) - base;

        const shifted =
            (position + shift + 26) % 26;

        return String.fromCharCode(
            base + shifted
        );
    });
}

function runCaesar() {

    const output =
        document.getElementById("caesarResult");

    try {

        const shift =
            readInteger("shift", 0, 25);

        const message =
            document.getElementById("message").value;

        const ciphertext =
            caesar(message, shift);

        const decrypted =
            caesar(ciphertext, 26 - shift);

        document.getElementById(
            "cipherInput"
        ).value = ciphertext;

        output.textContent =
            `Shift: ${shift}\n\n` +
            `Ciphertext:\n${ciphertext}\n\n` +
            `Decrypted message:\n${decrypted}\n\n` +
            `Successful: ${decrypted === message}`;

    } catch (error) {

        output.textContent = error.message;
    }
}


/* ==========================================
   4. ENGLISH LETTER FREQUENCIES
   ========================================== */

const englishFrequencies = [
    8.167, 1.492, 2.782, 4.253,
    12.702, 2.228, 2.015, 6.094,
    6.966, 0.153, 0.772, 4.025,
    2.406, 6.749, 7.507, 1.929,
    0.095, 5.987, 6.327, 9.056,
    2.758, 0.978, 2.360, 0.150,
    1.974, 0.074
].map(value => value / 100);


/* ==========================================
   5. CHI-SQUARE STATISTIC
   ========================================== */

function chiSquare(text) {

    const letters = text
        .toUpperCase()
        .replace(/[^A-Z]/g, "");

    const N = letters.length;

    if (N === 0) {
        return Infinity;
    }

    const counts = Array(26).fill(0);

    for (const char of letters) {
        counts[char.charCodeAt(0) - 65]++;
    }

    let chi = 0;

    for (let i = 0; i < 26; i++) {

        const expected =
            N * englishFrequencies[i];

        const observed = counts[i];

        chi +=
            Math.pow(observed - expected, 2) /
            expected;
    }

    return chi;
}


/* ==========================================
   6. RECOVER CAESAR SHIFT
   ========================================== */

function estimateShift(ciphertext) {

    const candidates = [];

    for (let shift = 0; shift < 26; shift++) {

        const plaintext =
            caesar(ciphertext, 26 - shift);

        const score =
            chiSquare(plaintext);

        candidates.push({
            shift,
            plaintext,
            score
        });
    }

    candidates.sort(
        (a, b) => a.score - b.score
    );

    return candidates;
}

function attackCaesar() {

    const ciphertext =
        document.getElementById(
            "cipherInput"
        ).value;

    const output =
        document.getElementById(
            "attackResult"
        );

    if (!/[A-Za-z]/.test(ciphertext)) {

        output.textContent =
            "Enter ciphertext containing letters.";

        document.getElementById(
            "frequencyBars"
        ).replaceChildren();

        return;
    }

    const candidates =
        estimateShift(ciphertext);

    const best = candidates[0];

    output.textContent =
        `Estimated shift: ${best.shift}\n` +
        `Chi-square: ${best.score.toFixed(2)}\n\n` +
        `Recovered plaintext:\n${best.plaintext}\n\n` +
        `Top candidates:\n` +
        candidates.slice(0, 5)
            .map(item =>
                `k=${item.shift}, ` +
                `χ²=${item.score.toFixed(2)}`
            )
            .join("\n");

    showFrequencies(ciphertext);
}


/* ==========================================
   7. LETTER FREQUENCY CHART
   ========================================== */

function showFrequencies(text) {

    const container =
        document.getElementById(
            "frequencyBars"
        );

    container.replaceChildren();

    const counts = Array(26).fill(0);

    const letters = text
        .toUpperCase()
        .replace(/[^A-Z]/g, "");

    for (const char of letters) {

        counts[char.charCodeAt(0) - 65]++;
    }

    const maximum = Math.max(...counts);

    counts.forEach((count, index) => {

        const row =
            document.createElement("div");

        row.className = "bar-row";

        const letter =
            document.createElement("span");

        letter.textContent =
            String.fromCharCode(65 + index);

        const track =
            document.createElement("div");

        track.className = "bar-track";

        const fill =
            document.createElement("div");

        fill.className = "bar-fill";

        fill.style.width =
            `${100 * count / maximum}%`;

        track.appendChild(fill);

        const label =
            document.createElement("span");

        label.textContent = count;

        row.append(letter, track, label);

        container.appendChild(row);
    });
}


/* ==========================================
   8. CIPHERTEXT LENGTH EXPERIMENT
   ========================================== */

const corpus = (
    "The study of statistics provides a systematic " +
    "way to understand information and uncertainty. " +
    "Researchers collect observations and compare " +
    "hypotheses using experimental evidence. " +
    "Cryptography protects information exchanged " +
    "across untrusted networks. " +
    "A sender encrypts a message so that the intended " +
    "recipient can recover its contents. " +
    "Natural languages contain characteristic patterns " +
    "that can be useful for statistical cryptanalysis. " +
    "Common English letters appear more frequently " +
    "than uncommon letters in sufficiently large samples. " +
    "The reliability of an estimate depends on the " +
    "amount of available information. " +
    "Short samples may differ considerably from the " +
    "expected distribution of the language. " +
    "Repeated experiments help researchers understand " +
    "the effectiveness and limitations of their methods. "
).repeat(15);

function testLengths() {

    const output =
        document.getElementById("lengthNote");

    let shift;

    try {
        shift = readInteger("shift", 0, 25);
    } catch (error) {
        output.textContent = error.message;
        return;
    }

    const letters = corpus
        .toUpperCase()
        .replace(/[^A-Z]/g, "");

    const lengths = [
        10, 25, 50, 100,
        250, 500, 1000, 2000
    ];

    const table =
        document.getElementById(
            "lengthRows"
        );

    table.replaceChildren();

    for (const length of lengths) {

        const plaintext =
            letters.slice(0, length);

        const ciphertext =
            caesar(plaintext, shift);

        const best =
            estimateShift(ciphertext)[0];

        const correct =
            best.shift === shift;

        const row =
            document.createElement("tr");

        const values = [
            length,
            shift,
            best.shift,
            correct ? "Yes" : "No",
            best.score.toFixed(2)
        ];

        for (const value of values) {

            const cell =
                document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);
        }

        table.appendChild(row);
    }

    output.textContent =
        "This experiment uses a fixed English corpus " +
        "and the selected Caesar shift. Results describe " +
        "one sample per length rather than an average " +
        "success rate over independent trials.";
}


/* ==========================================
   9. ECC PRIVATE-KEY ATTACK
   ========================================== */

function attackECC() {

    const output =
        document.getElementById(
            "eccAttackResult"
        );

    const table =
        document.getElementById(
            "eccAttackRows"
        );

    table.replaceChildren();

    if (packet === null) {

        output.textContent =
            "First run the ECC encryption experiment.";

        return;
    }

    let recoveredKey = null;
    let attempts = 0;

    // Exhaustive search over private-key range
    for (let candidate = 1; candidate <= 8; candidate++) {

        attempts++;

        const candidatePublic =
            scalarMultiply(candidate);

        const matches =
            samePoint(candidatePublic, packet.Q);

        const row =
            document.createElement("tr");

        const values = [
            candidate,
            formatPoint(candidatePublic),
            matches ? "Yes" : "No"
        ];

        for (const value of values) {

            const cell =
                document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);
        }

        table.appendChild(row);

        if (matches) {

            recoveredKey = candidate;
            break;
        }
    }

    if (recoveredKey === null) {

        output.textContent =
            "Private key not found.";

        return;
    }

    // Reconstruct shared secret
    const sharedPoint =
        scalarMultiply(recoveredKey, packet.R);

    // Decrypt intercepted ciphertext
    const plaintextBytes =
        xorCrypt(packet.ciphertext, sharedPoint);

    const plaintext =
        decoder.decode(plaintextBytes);

    output.textContent =
        `Recovered private key: ${recoveredKey}\n` +
        `Candidate tests: ${attempts}\n` +
        `Recovered shared point: ${formatPoint(sharedPoint)}\n\n` +
        `Decrypted message:\n${plaintext}`;
}


/* ==========================================
   10. EVENT LISTENERS
   ========================================== */

document.getElementById("eccRun")
    .addEventListener("click", runECC);

document.getElementById("caesarRun")
    .addEventListener("click", runCaesar);

document.getElementById("attackCaesar")
    .addEventListener("click", attackCaesar);

document.getElementById("lengthTest")
    .addEventListener("click", testLengths);

document.getElementById("attackEcc")
    .addEventListener("click", attackECC);


/* ==========================================
   11. INITIAL EXPERIMENTS
   ========================================== */

runECC();
runCaesar();
attackCaesar();
testLengths();
