"use strict";
// Educational elliptic curve: y² = x³ + 7 (mod 17)
const p = 17;
const G = { x: 1, y: 5 };
const mod = n => ((n % p) + p) % p;
const inverse = n => {
  for (let i = 1; i < p; i++) if (mod(n * i) === 1) return i;
  throw new Error("No modular inverse");
};
// null is the point at infinity.
function add(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  if (a.x === b.x && mod(a.y + b.y) === 0) return null;
  const slope = a.x === b.x && a.y === b.y
    ? mod(3 * a.x * a.x * inverse(2 * a.y))
    : mod((b.y - a.y) * inverse(b.x - a.x));
  const x = mod(slope * slope - a.x - b.x);
  return { x, y: mod(slope * (a.x - x) - a.y) };
}
const pointText = q => q === null ? "O (infinity)" : `(${q.x}, ${q.y})`;
function generate(k) {
  const entries = [];
  let q = null;
  for (let i = 1; i <= k; i++) {
    q = add(q, G);
    entries.push({ k: i, point: q });
  }
  return entries;
}
function calculate() {
  const k = Number(document.getElementById("key").value);
  const output = document.getElementById("output");
  const table = document.getElementById("steps");
  table.replaceChildren();
  if (!Number.isInteger(k) || k < 1 || k > 8) {
    output.textContent = "Enter an integer from 1 to 8.";
    output.classList.add("error");
    return;
  }
  output.classList.remove("error");
  for (const entry of generate(k)) {
    const tr = document.createElement("tr");
    const fields = [`${entry.k}G`, entry.k === 1 ? "G" : `${entry.k - 1}G + G`, pointText(entry.point)];
    for (const field of fields) {
      const td = document.createElement("td");
      td.textContent = field;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  output.textContent = `TOY PUBLIC KEY: Q = ${k}G = ${pointText(generate(k).at(-1).point)}`;
}
function chart(id, values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  const el = document.getElementById(id);
  el.replaceChildren();
  const max = Math.max(...counts.values());
  for (const [value, count] of [...counts].sort((a,b)=>a[0]-b[0])) {
    const row = document.createElement("div"); row.className = "chart-row";
    const label = document.createElement("span"); label.textContent = value;
    const track = document.createElement("div"); track.className = "track";
    const bar = document.createElement("div"); bar.className = "fill";
    bar.style.width = `${100 * count / max}%`;
    track.appendChild(bar);
    const frequency = document.createElement("span"); frequency.textContent = count;
    row.append(label, track, frequency); el.appendChild(row);
  }
}
const ones = n => n.toString(2).split("1").length - 1;
function correlation(xs, ys) {
  const mx = xs.reduce((a,b)=>a+b,0)/xs.length;
  const my = ys.reduce((a,b)=>a+b,0)/ys.length;
  let n=0, dx=0, dy=0;
  xs.forEach((v,i)=>{ n+=(v-mx)*(ys[i]-my);dx+=(v-mx)**2;dy+=(ys[i]-my)**2; });
  return n / Math.sqrt(dx*dy);
}
function statistics() {
  const keys = Array.from({length:8},(_,i)=>i+1);
  const points = generate(8).map(e=>e.point);
  const xs = points.map(q=>q.x), ys = points.map(q=>q.y);
  chart("x-chart", xs); chart("y-chart", ys);
  document.getElementById("distribution-note").textContent =
    "The x values 1, 2, 5 and 12 occur twice each; all eight y values are distinct.";
  const xOnes=xs.reduce((s,v)=>s+ones(v),0), yOnes=ys.reduce((s,v)=>s+ones(v),0);
  document.getElementById("bits-result").textContent =
    `X: ${xOnes}/40 one-bits (${(xOnes/40*100).toFixed(1)}%). Y: ${yOnes}/40 one-bits (${(yOnes/40*100).toFixed(1)}%).`;
  document.getElementById("correlation-result").textContent =
    `Pearson r(k,x) = ${correlation(keys,xs).toFixed(4)}; r(k,y) = ${correlation(keys,ys).toFixed(4)}.`;
  const distances=[];
  for(let i=0;i<points.length-1;i++) distances.push(ones(points[i].x ^ points[i+1].x)+ones(points[i].y ^ points[i+1].y));
  const mean=distances.reduce((a,b)=>a+b,0)/distances.length;
  document.getElementById("avalanche-result").textContent =
    `Consecutive Hamming distances: ${distances.join(", ")} bits; average ${mean.toFixed(2)} of 10 bits.`;
}
document.getElementById("calculate").addEventListener("click",calculate);
document.getElementById("key").addEventListener("keydown",e=>{if(e.key==="Enter")calculate();});
calculate();statistics();
