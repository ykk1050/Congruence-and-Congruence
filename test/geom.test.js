global.window = global;
require('../js/core.js'); require('../js/shapes.js');
const { Fig, Poly, V } = C;
const out = {};
for (const ch of Object.keys(Shapes.letterLib).concat(['ㅇ'])) { const f = Shapes.letter(ch).fig; out[ch] = Fig.symType(f) + '/' + Fig.axisCount(f); }
console.log('LETTERS', JSON.stringify(out));
const po = {};
for (const n of Object.keys(Shapes.polyLib)) { const f = Shapes.polyShape(n, 37).fig; po[n] = Fig.symType(f) + '/' + Fig.axisCount(f); }
console.log('POLYS(rot37)', JSON.stringify(po));
// generation
let t0 = Date.now(), fails = 0;
for (const k of ['v','h','d']) for (let i = 0; i < 300; i++) { const r = Shapes.lineHalf(k); if (V.near(r.given[0],[5,1]) && r.given.length===4 && V.near(r.given[3],[5,9])) fails++; 
  const [A,B]=r.axis; if (V.distToLine(r.given[0],A,B)>1e-9||V.distToLine(r.given[r.given.length-1],A,B)>1e-9) throw new Error('endpoint not on axis '+k+JSON.stringify(r)); }
console.log('lineHalf fallbacks', fails, 'ms', Date.now()-t0);
t0 = Date.now(); fails = 0;
for (let i = 0; i < 300; i++) { const r = Shapes.pointHalf(); if (r.center[0]===5&&r.center[1]===5&&r.given.length===4&&r.given[0][0]===6) fails++; }
console.log('pointHalf fallbacks', fails, 'ms', Date.now()-t0);
let bad = 0;
for (let lv = 1; lv <= 3; lv++) for (let i = 0; i < 300; i++) { const P = Shapes.latticeShape(lv); for (let k=0;k<8;k++) if (!Poly.congruent(P, Shapes.d4(P,k))) bad++; const Q = Shapes.nearMiss(P); if (!Q) bad+=100; else if (Poly.congruent(P,Q)) bad++; }
console.log('lattice bad', bad);
for (let i=0;i<200;i++){ const t=Shapes.niceTriangle(); const q=Shapes.niceQuad(); if(!Poly.isSimple(t.pts)||!Poly.isSimple(q.pts)) bad++; }
console.log('nice bad', bad);
