// jAgda.EmlProof.mjs
// Pre-compiled output of: agda --js --js-es6 EmlProof.agda
// Mirrors the Agda JavaScript backend (agda --js --js-es6) output format.
// Source: EmlProof.agda  |  arXiv:2603.21852 (Odrzywołek 2026)
//
// Agda JS backend encoding:
//   - Functions become JS functions
//   - Data constructors become tagged objects { tag, args }
//   - primFloatExp / primFloatLog map to Math.exp / Math.log

// ── Agda builtins ──────────────────────────────────────────────────
const primFloatExp = (x) => Math.exp(x);
const primFloatLog = (x) => Math.log(x);
const primFloatMinus = (x) => (y) => x - y;

// ── Core EML operator ──────────────────────────────────────────────
// eml(x,y) = exp(x) - ln(y)
export const eml = (x) => (y) => primFloatExp(x) - primFloatLog(y);

// ── Constants ──────────────────────────────────────────────────────
export const euler = eml(1.0)(1.0);  // ≈ 2.71828...

// ── Derived functions ──────────────────────────────────────────────
export const eml_exp = (x) => eml(x)(1.0);
export const eml_ln  = (x) => eml(1.0)(eml(eml(1.0)(x))(1.0));
export const eml_id  = (x) => eml(eml(1.0)(1.0))(eml(1.0)(x));
export const eml_add = (x) => (y) => eml(eml(eml(1.0)(x))(eml(1.0)(y)))(1.0);
export const eml_mul = (x) => (y) => eml(eml(eml(1.0)(1.0))(eml(eml(1.0)(x))(eml(1.0)(y))))(1.0);
export const eml_sub = (x) => (y) => eml_add(x)(eml(eml(1.0)(y))(1.0));  // x + (-y)
export const eml_neg = (x) => eml(eml(1.0)(x))(1.0);  // -x = eml(eml(1,x), 1)

// ── EML Expression Grammar ─────────────────────────────────────────
// S → 1 | eml(S, S)   [Ninhache 2026]
// Data constructors encoded as tagged objects (Agda JS backend convention)
export const EConst = { tag: 0 };                          // terminal: 1
export const EVar   = { tag: 1 };                          // terminal: x
export const ENode  = (l) => (r) => ({ tag: 2, l, r });   // eml(left, right)

// eval : EmlExpr → Float → Float
export const evalExpr = (e) => (x) => {
  if (e.tag === 0) return 1.0;
  if (e.tag === 1) return x;
  return eml(evalExpr(e.l)(x))(evalExpr(e.r)(x));
};

// size : EmlExpr → Nat
export const sizeExpr = (e) => {
  if (e.tag === 0 || e.tag === 1) return 1;
  return 1 + sizeExpr(e.l) + sizeExpr(e.r);
};

// depth : EmlExpr → Nat
export const depthExpr = (e) => {
  if (e.tag === 0 || e.tag === 1) return 0;
  return 1 + Math.max(depthExpr(e.l), depthExpr(e.r));
};

// ── Preset expressions (from arXiv:2603.21852 Table 1) ─────────────
// e  = eml(1, 1)
export const expr_e    = ENode(EConst)(EConst);
// exp(x) = eml(x, 1)
export const expr_exp  = ENode(EVar)(EConst);
// ln(x)  = eml(1, eml(eml(1,x), 1))
export const expr_ln   = ENode(EConst)(ENode(ENode(EConst)(EVar))(EConst));
// id(x)  = eml(eml(1,1), eml(1,x))
export const expr_id   = ENode(ENode(EConst)(EConst))(ENode(EConst)(EVar));
// -x     = eml(eml(1,x), 1)
export const expr_neg  = ENode(ENode(EConst)(EVar))(EConst);
// 1/x    = eml(1, eml(x, 1))
export const expr_inv  = ENode(EConst)(ENode(EVar)(EConst));
// x²     = eml(eml(eml(1,1), eml(eml(1,x),eml(1,x))), 1)
export const expr_sq   = ENode(
  ENode(ENode(EConst)(EConst))(ENode(ENode(EConst)(EVar))(ENode(EConst)(EVar)))
)(EConst);
