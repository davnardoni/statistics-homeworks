"use strict";

// Public BIP-39 test vector.
// NEVER substitute a real wallet recovery phrase.
const DEMO_MNEMONIC =
  "abandon abandon abandon abandon " +
  "abandon abandon abandon abandon " +
  "abandon abandon abandon about";

const BASE_PATH = "m/44'/60'/0'/0/";

// Derive one account from the fixed test mnemonic.
function deriveAccount(index) {
  const path = BASE_PATH + index;

  const mnemonic = ethers.Mnemonic.fromPhrase(
    DEMO_MNEMONIC
  );

  const seed = mnemonic.computeSeed();

  const wallet = ethers.HDNodeWallet.fromPhrase(
    DEMO_MNEMONIC,
    "",
    path
  );

  const publicKey = ethers.SigningKey.computePublicKey(
    wallet.privateKey,
    false
  );

  // The 0x04 prefix is excluded from the Keccak input.
  const publicCoordinates = "0x" + publicKey.slice(4);
  const hash = ethers.keccak256(publicCoordinates);

  // Last 20 bytes (40 hexadecimal characters).
  const lowercaseAddress =
    "0x" + hash.slice(-40);

  const checksummedAddress =
    ethers.getAddress(lowercaseAddress);

  return {
    path,
    seed,
    privateKey: wallet.privateKey,
    publicKey,
    hash,
    lowercaseAddress,
    checksummedAddress
  };
}

// Update a text element safely.
function show(id, value) {
  document.getElementById(id).textContent = value;
}

// Interactive wallet derivation.
function runDerivation() {
  if (typeof ethers === "undefined") {
    show("status",
      "The ethers.js library could not be loaded. " +
      "Check your internet connection.");
    return;
  }

  const index = Number(
    document.getElementById("accountIndex").value
  );

  if (!Number.isInteger(index) ||
      index < 0 || index > 20) {
    show("status", "Choose an index from 0 to 20.");
    return;
  }

  try {
    const result = deriveAccount(index);

    show("pathOutput", result.path);
    show("seedOutput", result.seed);
    show("privateOutput", result.privateKey);
    show("publicOutput", result.publicKey);
    show("hashOutput", result.hash);
    show("addressOutput", result.lowercaseAddress);
    show("checksumOutput", result.checksummedAddress);

    // Independent library address calculation check.
    const verifiedAddress = ethers.computeAddress(
      result.publicKey
    );

    if (verifiedAddress !== result.checksummedAddress) {
      throw new Error("Address verification failed.");
    }

    show("status",
      "Address derived successfully using " +
      "the public demonstration mnemonic.");

  } catch (error) {
    show("status", "Derivation error: " + error.message);
  }
}

// Count one-bits in hexadecimal data.
function countOneBits(hex) {
  const bits = {
    "0":0, "1":1, "2":1, "3":2,
    "4":1, "5":2, "6":2, "7":3,
    "8":1, "9":2, "a":2, "b":3,
    "c":2, "d":3, "e":3, "f":4
  };

  let count = 0;

  for (const c of hex.toLowerCase().replace(/^0x/, "")) {
    count += bits[c];
  }

  return count;
}

// Hamming distance between hexadecimal addresses.
function hammingDistance(a, b) {
  const x = a.slice(2).toLowerCase();
  const y = b.slice(2).toLowerCase();

  let distance = 0;

  for (let i = 0; i < x.length; i++) {
    const xor =
      parseInt(x[i], 16) ^ parseInt(y[i], 16);

    distance += countOneBits(xor.toString(16));
  }

  return distance;
}

// Statistical exploration using address indices 0..7.
function runStatistics() {
  if (typeof ethers === "undefined") {
    show("statStatus",
      "The ethers.js library is unavailable.");
    return;
  }

  const button =
    document.getElementById("statisticsButton");

  button.disabled = true;
  show("statStatus", "Computing eight demo addresses...");

  try {
    const addresses = [];

    for (let i = 0; i < 8; i++) {
      const account = deriveAccount(i);
      addresses.push(account.lowercaseAddress);
    }

    // 8 addresses * 160 bits each.
    const totalBits = addresses.length * 160;

    const oneBits = addresses.reduce(
      (sum, address) => sum + countOneBits(address),
      0
    );

    const zeroBits = totalBits - oneBits;

    show(
      "bitStats",
      "Bit distribution: " +
      oneBits + " ones (" +
      (100 * oneBits / totalBits).toFixed(2) +
      "%), " +
      zeroBits + " zeros (" +
      (100 * zeroBits / totalBits).toFixed(2) +
      "%). Total: " + totalBits + " bits."
    );

    // Frequency of hexadecimal symbols.
    const frequencies = {};

    for (const digit of "0123456789abcdef") {
      frequencies[digit] = 0;
    }

    for (const address of addresses) {
      for (const digit of address.slice(2)) {
        frequencies[digit]++;
      }
    }

    const frequencyText = Object.entries(frequencies)
      .map(([digit, count]) => `${digit}: ${count}`)
      .join(" | ");

    show(
      "digitStats",
      "Hexadecimal digit frequencies " +
      "(320 digits): " + frequencyText
    );

    // Hamming distances of consecutive addresses.
    const distances = [];

    for (let i = 0; i < addresses.length - 1; i++) {
      distances.push(
        hammingDistance(addresses[i], addresses[i + 1])
      );
    }

    const average = distances.reduce(
      (a, b) => a + b, 0
    ) / distances.length;

    show(
      "hammingStats",
      "Consecutive-address Hamming distances: " +
      distances.join(", ") + " bits. " +
      "Average: " + average.toFixed(2) +
      " / 160 bits (reference expectation: 80)."
    );

    show(
      "statStatus",
      "Statistical experiment completed."
    );

  } catch (error) {
    show("statStatus",
      "Statistical experiment failed: " + error.message);
  } finally {
    button.disabled = false;
  }
}

// Event handlers
document.getElementById("deriveButton")
  .addEventListener("click", runDerivation);

document.getElementById("statisticsButton")
  .addEventListener("click", runStatistics);

document.getElementById("accountIndex")
  .addEventListener("keydown", event => {
    if (event.key === "Enter") runDerivation();
  });

// Start with the first demo account.
runDerivation();
