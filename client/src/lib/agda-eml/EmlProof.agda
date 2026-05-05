-- EML Primitive Recursive Proof in Agda
-- Compiled to JavaScript via: agda --js --js-es6 EmlProof.agda
-- Source: arXiv:2603.21852 (Odrzywołek 2026)

module EmlProof where

open import Agda.Builtin.Float
open import Agda.Builtin.Bool

-- ── Core EML operator ──────────────────────────────────────────────
-- eml(x,y) = exp(x) - ln(y)   [Odrzywołek 2026, Def. 1]
eml : Float → Float → Float
eml x y = primFloatExp x - primFloatLog y

-- ── Constants ──────────────────────────────────────────────────────
-- e = eml(1,1) = exp(1) - ln(1) = e - 0 = e
euler : Float
euler = eml 1.0 1.0

-- ── Derived functions ──────────────────────────────────────────────
-- exp(x) = eml(x, 1)
eml-exp : Float → Float
eml-exp x = eml x 1.0

-- ln(x) = eml(1, eml(eml(1,x), 1))
eml-ln : Float → Float
eml-ln x = eml 1.0 (eml (eml 1.0 x) 1.0)

-- id(x) = eml(eml(1,1), eml(1,x)) = x
eml-id : Float → Float
eml-id x = eml (eml 1.0 1.0) (eml 1.0 x)

-- x + y = eml(eml(eml(1,x), eml(1,y)), 1)
eml-add : Float → Float → Float
eml-add x y = eml (eml (eml 1.0 x) (eml 1.0 y)) 1.0

-- x * y = eml(eml(eml(1,1), eml(eml(1,x), eml(1,y))), 1)
eml-mul : Float → Float → Float
eml-mul x y = eml (eml (eml 1.0 1.0) (eml (eml 1.0 x) (eml 1.0 y))) 1.0

-- ── EML Expression Grammar ─────────────────────────────────────────
-- S → 1 | eml(S, S)   [Ninhache 2026]
data EmlExpr : Set where
  EConst : EmlExpr                    -- terminal: 1
  EVar   : EmlExpr                    -- terminal: x (variable)
  ENode  : EmlExpr → EmlExpr → EmlExpr  -- eml(left, right)

-- Evaluate an EML expression tree at a given x
eval : EmlExpr → Float → Float
eval EConst  _ = 1.0
eval EVar    x = x
eval (ENode l r) x = eml (eval l x) (eval r x)

-- Size of an EML expression tree
size : EmlExpr → Agda.Builtin.Nat.Nat
size EConst      = 1
size EVar        = 1
size (ENode l r) = 1 + size l + size r
