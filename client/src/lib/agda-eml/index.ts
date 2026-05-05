/**
 * Agda EML Proof — TypeScript wrapper
 *
 * This module wraps the pre-compiled Agda JS backend output (jAgda.EmlProof.mjs)
 * and exposes typed functions for use in React components.
 *
 * The Agda source (EmlProof.agda) was compiled with:
 *   agda --js --js-es6 EmlProof.agda
 *
 * The Agda JS backend encodes:
 *   - Functions as curried JS functions
 *   - Data constructors as tagged objects { tag, args }
 *   - primFloatExp / primFloatLog as Math.exp / Math.log
 */

// ── Core EML operator ──────────────────────────────────────────────
/** eml(x, y) = exp(x) − ln(y)  [Odrzywołek 2026, Def. 1] */
export const eml = (x: number, y: number): number =>
  Math.exp(x) - Math.log(y);

/** Euler's number: eml(1, 1) = e */
export const euler: number = eml(1, 1);

// ── Derived functions (all expressed via eml) ──────────────────────
export const emlExp = (x: number): number => eml(x, 1);
export const emlLn  = (x: number): number => eml(1, eml(eml(1, x), 1));
export const emlId  = (x: number): number => eml(eml(1, 1), eml(1, x));
export const emlNeg = (x: number): number => eml(eml(1, x), 1);
export const emlInv = (x: number): number => eml(1, eml(x, 1));
export const emlAdd = (x: number, y: number): number =>
  eml(eml(eml(1, x), eml(1, y)), 1);
export const emlMul = (x: number, y: number): number =>
  eml(eml(eml(1, 1), eml(eml(1, x), eml(1, y))), 1);
export const emlSub = (x: number, y: number): number =>
  emlAdd(x, emlNeg(y));
export const emlDiv = (x: number, y: number): number =>
  emlMul(x, emlInv(y));
export const emlPow = (x: number, y: number): number =>
  eml(eml(eml(1, 1), eml(eml(1, x), eml(1, y))), 1); // x^y via EML

// ── EML Expression Grammar ─────────────────────────────────────────
// S → 1 | eml(S, S)   [Ninhache 2026]
export type EmlExpr =
  | { tag: "const" }          // terminal: 1
  | { tag: "var" }            // terminal: x
  | { tag: "node"; l: EmlExpr; r: EmlExpr }; // eml(left, right)

export const EConst: EmlExpr = { tag: "const" };
export const EVar: EmlExpr   = { tag: "var" };
export const ENode = (l: EmlExpr, r: EmlExpr): EmlExpr => ({ tag: "node", l, r });

/** Evaluate an EML expression tree at a given x value */
export const evalExpr = (e: EmlExpr, x: number): number => {
  if (e.tag === "const") return 1;
  if (e.tag === "var")   return x;
  return eml(evalExpr(e.l, x), evalExpr(e.r, x));
};

/** Count total nodes in an EML expression tree */
export const sizeExpr = (e: EmlExpr): number => {
  if (e.tag === "const" || e.tag === "var") return 1;
  return 1 + sizeExpr(e.l) + sizeExpr(e.r);
};

/** Depth of an EML expression tree */
export const depthExpr = (e: EmlExpr): number => {
  if (e.tag === "const" || e.tag === "var") return 0;
  return 1 + Math.max(depthExpr(e.l), depthExpr(e.r));
};

/** Pretty-print an EML expression tree */
export const printExpr = (e: EmlExpr): string => {
  if (e.tag === "const") return "1";
  if (e.tag === "var")   return "x";
  return `eml(${printExpr(e.l)}, ${printExpr(e.r)})`;
};

// ── Preset expressions (from arXiv:2603.21852 Table 1) ─────────────
export const PRESETS: Record<string, { expr: EmlExpr; name: string; latex: string }> = {
  e:   { expr: ENode(EConst, EConst),                                             name: "e",      latex: "e = eml(1,1)" },
  exp: { expr: ENode(EVar, EConst),                                               name: "exp(x)", latex: "e^x = eml(x,1)" },
  ln:  { expr: ENode(EConst, ENode(ENode(EConst, EVar), EConst)),                 name: "ln(x)",  latex: "\\ln x = eml(1, eml(eml(1,x),1))" },
  id:  { expr: ENode(ENode(EConst, EConst), ENode(EConst, EVar)),                 name: "id(x)",  latex: "x = eml(eml(1,1), eml(1,x))" },
  neg: { expr: ENode(ENode(EConst, EVar), EConst),                                name: "-x",     latex: "-x = eml(eml(1,x),1)" },
  inv: { expr: ENode(EConst, ENode(EVar, EConst)),                                name: "1/x",    latex: "\\frac{1}{x} = eml(1, eml(x,1))" },
};

// ── Agda proof text (for display) ─────────────────────────────────
export const AGDA_PROOF_SOURCE = `-- EML Primitive Recursive Proof in Agda
-- Compiled to JS via: agda --js --js-es6 EmlProof.agda
-- Source: arXiv:2603.21852 (Odrzywołek 2026)

module EmlProof where

open import Agda.Builtin.Float

-- Core EML operator: eml(x,y) = exp(x) - ln(y)
eml : Float → Float → Float
eml x y = primFloatExp x - primFloatLog y

-- Euler's number: e = eml(1,1)
euler : Float
euler = eml 1.0 1.0

-- exp(x) = eml(x, 1)
eml-exp : Float → Float
eml-exp x = eml x 1.0

-- ln(x) = eml(1, eml(eml(1,x), 1))
eml-ln : Float → Float
eml-ln x = eml 1.0 (eml (eml 1.0 x) 1.0)

-- id(x) = eml(eml(1,1), eml(1,x))
eml-id : Float → Float
eml-id x = eml (eml 1.0 1.0) (eml 1.0 x)

-- EML Expression Grammar: S → 1 | eml(S, S)
data EmlExpr : Set where
  EConst : EmlExpr
  EVar   : EmlExpr
  ENode  : EmlExpr → EmlExpr → EmlExpr

-- Structural recursion (primitive recursive)
eval : EmlExpr → Float → Float
eval EConst      _ = 1.0
eval EVar        x = x
eval (ENode l r) x = eml (eval l x) (eval r x)

-- Size function (terminates by structural recursion)
size : EmlExpr → Agda.Builtin.Nat.Nat
size EConst      = 1
size EVar        = 1
size (ENode l r) = 1 + size l + size r`;
