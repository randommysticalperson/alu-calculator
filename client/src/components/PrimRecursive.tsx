/*
 * Primitive Recursive Function Explorer
 * Design: Terminal Hacker — dark bg, neon green/cyan accents
 *
 * Theory:
 *   Primitive recursive functions are built from three base functions
 *   using two operations (composition and primitive recursion):
 *
 *   Base functions:
 *     Z(x)         = 0                    (Zero)
 *     S(x)         = x + 1                (Successor)
 *     P^n_i(x1..xn) = xi                  (Projection)
 *
 *   Operations:
 *     Composition: h(x) = f(g1(x), ..., gk(x))
 *     Primitive Recursion:
 *       h(x, 0)    = f(x)
 *       h(x, n+1)  = g(x, n, h(x, n))
 *
 *   Hierarchy:
 *     Zero → Successor → Addition → Multiplication → Exponentiation → Factorial
 *     → Ackermann (NOT primitive recursive — grows too fast)
 */

import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PRFunction {
  id: string;
  name: string;
  notation: string;
  definition: string[];   // lines of formal definition
  description: string;
  category: "base" | "arithmetic" | "extended" | "non-pr";
  compute: (args: number[]) => { result: number; steps: string[] };
  arity: number;
  argLabels: string[];
  maxArgs?: number[];     // max safe input values
}

// ─── Implementations with step traces ────────────────────────────────────────

function addSteps(x: number, y: number): { result: number; steps: string[] } {
  const steps: string[] = [`add(${x}, ${y}) by primitive recursion on y:`];
  if (y === 0) {
    steps.push(`  add(${x}, 0) = ${x}  [base case: P^1_1]`);
    return { result: x, steps };
  }
  let cur = x;
  steps.push(`  add(${x}, 0) = ${x}`);
  for (let i = 1; i <= y; i++) {
    const prev = cur;
    cur = cur + 1; // S(add(x, i-1))
    steps.push(`  add(${x}, ${i}) = S(add(${x}, ${i-1})) = S(${prev}) = ${cur}`);
    if (i >= 5 && y > 6) { steps.push(`  ... (${y - i} more steps)`); break; }
  }
  return { result: x + y, steps };
}

function mulSteps(x: number, y: number): { result: number; steps: string[] } {
  const steps: string[] = [`mul(${x}, ${y}) by primitive recursion on y:`];
  if (y === 0) {
    steps.push(`  mul(${x}, 0) = 0  [base case: Z]`);
    return { result: 0, steps };
  }
  let cur = 0;
  steps.push(`  mul(${x}, 0) = 0`);
  for (let i = 1; i <= y; i++) {
    const prev = cur;
    cur = cur + x;
    steps.push(`  mul(${x}, ${i}) = add(${x}, mul(${x}, ${i-1})) = add(${x}, ${prev}) = ${cur}`);
    if (i >= 4 && y > 5) { steps.push(`  ... (${y - i} more steps)`); break; }
  }
  return { result: x * y, steps };
}

function expSteps(x: number, y: number): { result: number; steps: string[] } {
  const steps: string[] = [`exp(${x}, ${y}) = ${x}^${y} by primitive recursion on y:`];
  if (y === 0) {
    steps.push(`  exp(${x}, 0) = 1  [base case: S(Z) = 1]`);
    return { result: 1, steps };
  }
  let cur = 1;
  steps.push(`  exp(${x}, 0) = 1`);
  for (let i = 1; i <= y; i++) {
    const prev = cur;
    cur = cur * x;
    steps.push(`  exp(${x}, ${i}) = mul(${x}, exp(${x}, ${i-1})) = mul(${x}, ${prev}) = ${cur}`);
    if (i >= 4 && y > 5) { steps.push(`  ... (${y - i} more steps)`); break; }
  }
  return { result: Math.pow(x, y), steps };
}

function factSteps(n: number): { result: number; steps: string[] } {
  const steps: string[] = [`fact(${n}) by primitive recursion:`];
  steps.push(`  fact(0) = 1  [base case: S(Z) = 1]`);
  let cur = 1;
  for (let i = 1; i <= n; i++) {
    const prev = cur;
    cur = cur * i;
    steps.push(`  fact(${i}) = mul(${i}, fact(${i-1})) = mul(${i}, ${prev}) = ${cur}`);
    if (i >= 6 && n > 7) { steps.push(`  ... (${n - i} more steps)`); break; }
  }
  return { result: cur, steps };
}

function predSteps(n: number): { result: number; steps: string[] } {
  const steps: string[] = [`pred(${n}) = max(0, n−1) by primitive recursion:`];
  steps.push(`  pred(0) = 0  [base case: Z]`);
  if (n > 0) steps.push(`  pred(${n}) = P^3_2(x, n−1, pred(x, n−1)) = ${n - 1}`);
  return { result: Math.max(0, n - 1), steps };
}

function subSteps(x: number, y: number): { result: number; steps: string[] } {
  const steps: string[] = [`monus(${x}, ${y}) = max(0, x−y) via iterated predecessor:`];
  steps.push(`  monus(${x}, 0) = ${x}`);
  let cur = x;
  for (let i = 1; i <= y; i++) {
    const prev = cur;
    cur = Math.max(0, cur - 1);
    steps.push(`  monus(${x}, ${i}) = pred(monus(${x}, ${i-1})) = pred(${prev}) = ${cur}`);
    if (i >= 4 && y > 5) { steps.push(`  ... (${y - i} more steps)`); break; }
  }
  return { result: Math.max(0, x - y), steps };
}

function ackSteps(m: number, n: number): { result: number; steps: string[] } {
  const steps: string[] = [`Ackermann(${m}, ${n}) — NOT primitive recursive:`];
  steps.push(`  A(0, n) = n + 1`);
  steps.push(`  A(m+1, 0) = A(m, 1)`);
  steps.push(`  A(m+1, n+1) = A(m, A(m+1, n))`);
  steps.push(`  Growth rate exceeds any primitive recursive function!`);

  // Compute with depth limit
  let callCount = 0;
  function ack(m: number, n: number): number {
    callCount++;
    if (callCount > 100000) throw new Error("overflow");
    if (m === 0) return n + 1;
    if (n === 0) return ack(m - 1, 1);
    return ack(m - 1, ack(m, n - 1));
  }

  try {
    const result = ack(m, n);
    steps.push(`  A(${m}, ${n}) = ${result}  (computed in ${callCount} recursive calls)`);
    if (m >= 4) steps.push(`  Warning: A(4,0) = 65533, A(4,1) = 2^65536 − 3 (astronomically large)`);
    return { result, steps };
  } catch {
    steps.push(`  A(${m}, ${n}) is too large to compute directly`);
    return { result: Infinity, steps };
  }
}

// ─── Function definitions ─────────────────────────────────────────────────────

const PR_FUNCTIONS: PRFunction[] = [
  {
    id: "zero", name: "Zero", notation: "Z(x) = 0", arity: 1, argLabels: ["x"],
    category: "base", maxArgs: [99],
    definition: ["Z : ℕ → ℕ", "Z(x) = 0  for all x"],
    description: "The constant zero function. Returns 0 for any input. One of the three base functions of primitive recursion.",
    compute: (args) => ({ result: 0, steps: [`Z(${args[0]}) = 0  [base function]`] }),
  },
  {
    id: "succ", name: "Successor", notation: "S(x) = x + 1", arity: 1, argLabels: ["x"],
    category: "base", maxArgs: [99],
    definition: ["S : ℕ → ℕ", "S(x) = x + 1"],
    description: "The successor function. Returns x+1. Together with Zero and Projection, generates all primitive recursive functions.",
    compute: (args) => ({ result: args[0] + 1, steps: [`S(${args[0]}) = ${args[0]} + 1 = ${args[0] + 1}  [base function]`] }),
  },
  {
    id: "proj", name: "Projection", notation: "P²₁(x,y) = x", arity: 2, argLabels: ["x", "y"],
    category: "base", maxArgs: [99, 99],
    definition: ["P^n_i : ℕⁿ → ℕ", "P^n_i(x₁,...,xₙ) = xᵢ", "Example: P²₁(x,y) = x"],
    description: "The projection function. Returns the i-th argument. Used to select inputs in composition and primitive recursion.",
    compute: (args) => ({ result: args[0], steps: [`P²₁(${args[0]}, ${args[1]}) = ${args[0]}  [base function: select 1st arg]`] }),
  },
  {
    id: "add", name: "Addition", notation: "add(x, y) = x + y", arity: 2, argLabels: ["x", "y"],
    category: "arithmetic", maxArgs: [999, 999],
    definition: [
      "add(x, 0)   = P¹₁(x) = x",
      "add(x, n+1) = S(P³₃(x, n, add(x, n)))",
      "           = S(add(x, n))",
    ],
    description: "Addition defined by primitive recursion on the second argument. The successor is applied y times to x.",
    compute: (args) => addSteps(args[0], args[1]),
  },
  {
    id: "mul", name: "Multiplication", notation: "mul(x, y) = x × y", arity: 2, argLabels: ["x", "y"],
    category: "arithmetic", maxArgs: [999, 999],
    definition: [
      "mul(x, 0)   = Z(x) = 0",
      "mul(x, n+1) = add(P³₁(x,n,mul(x,n)), P³₃(x,n,mul(x,n)))",
      "           = add(x, mul(x, n))",
    ],
    description: "Multiplication defined by primitive recursion: multiply by adding x repeatedly y times.",
    compute: (args) => mulSteps(args[0], args[1]),
  },
  {
    id: "exp", name: "Exponentiation", notation: "exp(x, y) = xʸ", arity: 2, argLabels: ["base", "exp"],
    category: "arithmetic", maxArgs: [99, 9],
    definition: [
      "exp(x, 0)   = S(Z(x)) = 1",
      "exp(x, n+1) = mul(x, exp(x, n))",
    ],
    description: "Exponentiation defined by primitive recursion: multiply x by itself y times.",
    compute: (args) => expSteps(args[0], args[1]),
  },
  {
    id: "fact", name: "Factorial", notation: "fact(n) = n!", arity: 1, argLabels: ["n"],
    category: "arithmetic", maxArgs: [12],
    definition: [
      "fact(0)   = S(Z) = 1",
      "fact(n+1) = mul(S(n), fact(n))",
      "          = (n+1) × fact(n)",
    ],
    description: "Factorial defined by primitive recursion. fact(n) = n × (n−1) × ... × 1.",
    compute: (args) => factSteps(args[0]),
  },
  {
    id: "pred", name: "Predecessor", notation: "pred(n) = max(0, n−1)", arity: 1, argLabels: ["n"],
    category: "extended", maxArgs: [99],
    definition: [
      "pred(0)   = Z = 0",
      "pred(n+1) = P³₂(x, n, pred(x, n)) = n",
    ],
    description: "Predecessor: returns n−1 for n>0, or 0 for n=0. Used to define subtraction.",
    compute: (args) => predSteps(args[0]),
  },
  {
    id: "monus", name: "Monus (∸)", notation: "x ∸ y = max(0, x−y)", arity: 2, argLabels: ["x", "y"],
    category: "extended", maxArgs: [99, 99],
    definition: [
      "monus(x, 0)   = P¹₁(x) = x",
      "monus(x, n+1) = pred(monus(x, n))",
    ],
    description: "Truncated subtraction (monus). Returns x−y if x≥y, else 0. Natural numbers have no negatives, so this is the primitive recursive version of subtraction.",
    compute: (args) => subSteps(args[0], args[1]),
  },
  {
    id: "ackermann", name: "Ackermann", notation: "A(m, n)", arity: 2, argLabels: ["m", "n"],
    category: "non-pr", maxArgs: [4, 4],
    definition: [
      "A(0, n)   = n + 1",
      "A(m+1, 0) = A(m, 1)",
      "A(m+1, n+1) = A(m, A(m+1, n))",
      "NOT primitive recursive!",
    ],
    description: "The Ackermann function grows faster than any primitive recursive function. It is total recursive (computable) but not primitive recursive — proving that primitive recursion cannot express all computable functions.",
    compute: (args) => ackSteps(args[0], args[1]),
  },
];

// ─── Category colors ──────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  base:       { border: "border-emerald-700/50", bg: "bg-emerald-900/10", text: "text-emerald-400", badge: "bg-emerald-900/40 text-emerald-400" },
  arithmetic: { border: "border-cyan-700/50",    bg: "bg-cyan-900/10",    text: "text-cyan-400",    badge: "bg-cyan-900/40 text-cyan-400" },
  extended:   { border: "border-amber-700/50",   bg: "bg-amber-900/10",   text: "text-amber-400",   badge: "bg-amber-900/40 text-amber-400" },
  "non-pr":   { border: "border-red-700/50",     bg: "bg-red-900/10",     text: "text-red-400",     badge: "bg-red-900/40 text-red-400" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrimRecursive() {
  const [selected, setSelected] = useState<PRFunction>(PR_FUNCTIONS[3]); // default: add
  const [args, setArgs] = useState<string[]>(["5", "3"]);
  const [result, setResult] = useState<{ result: number; steps: string[] } | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const compute = useCallback(() => {
    const numArgs = args.slice(0, selected.arity).map(a => Math.max(0, Math.floor(parseFloat(a) || 0)));
    // Clamp to maxArgs
    const clamped = numArgs.map((v, i) => selected.maxArgs ? Math.min(v, selected.maxArgs[i] ?? 9999) : v);
    const res = selected.compute(clamped);
    setResult(res);
  }, [selected, args]);

  const selectFn = (fn: PRFunction) => {
    setSelected(fn);
    setArgs(Array(fn.arity).fill("0"));
    setResult(null);
  };

  const filtered = filterCat ? PR_FUNCTIONS.filter(f => f.category === filterCat) : PR_FUNCTIONS;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="border border-emerald-700/30 bg-emerald-900/10 p-3">
        <div className="text-[10px] text-emerald-400 tracking-widest mb-1">PRIMITIVE RECURSIVE FUNCTIONS</div>
        <div className="text-[11px] text-slate-400">
          Built from three base functions (Zero, Successor, Projection) using Composition and Primitive Recursion.
          Every primitive recursive function is total and computable — but not all computable functions are primitive recursive (cf. Ackermann).
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {[
          { cat: null, label: "ALL" },
          { cat: "base", label: "BASE" },
          { cat: "arithmetic", label: "ARITHMETIC" },
          { cat: "extended", label: "EXTENDED" },
          { cat: "non-pr", label: "NON-PR" },
        ].map(({ cat, label }) => {
          const col = cat ? CAT_COLORS[cat] : null;
          return (
            <button
              key={label}
              onClick={() => setFilterCat(f => f === cat ? null : cat)}
              className={`px-2 py-0.5 text-[10px] font-medium border transition-all tracking-widest ${filterCat === cat ? "opacity-100" : "opacity-40 hover:opacity-70"} ${col ? `${col.border} ${col.text}` : "border-slate-600 text-slate-500"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Function selector */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {filtered.map(fn => {
          const col = CAT_COLORS[fn.category];
          return (
            <button
              key={fn.id}
              onClick={() => selectFn(fn)}
              className={`p-2 text-left border transition-all duration-150 ${selected.id === fn.id ? `${col.border} ${col.bg} ${col.text}` : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"}`}
            >
              <div className="font-mono-display text-xs font-semibold">{fn.name}</div>
              <div className="font-mono-display text-[10px] opacity-70 truncate">{fn.notation}</div>
            </button>
          );
        })}
      </div>

      {/* Selected function detail */}
      <div className={`border p-3 ${CAT_COLORS[selected.category].border} ${CAT_COLORS[selected.category].bg}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className={`font-mono-display font-bold text-sm ${CAT_COLORS[selected.category].text}`}>{selected.name}</span>
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-sm ${CAT_COLORS[selected.category].badge}`}>
              {selected.category === "non-pr" ? "NOT PRIMITIVE RECURSIVE" : selected.category.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Formal definition */}
        <div className="border border-slate-700 bg-slate-900/60 p-2 mb-2">
          <div className="text-[10px] text-slate-500 tracking-widest mb-1">FORMAL DEFINITION</div>
          {selected.definition.map((line, i) => (
            <div key={i} className="font-mono-display text-[11px] text-slate-300">{line}</div>
          ))}
        </div>

        <div className="text-[11px] text-slate-400 mb-3">{selected.description}</div>

        {/* Inputs */}
        <div className="flex gap-2 mb-2 flex-wrap">
          {selected.argLabels.map((label, i) => (
            <div key={i}>
              <div className="text-[10px] text-slate-500 tracking-widest mb-1">{label}</div>
              <input
                type="number"
                min="0"
                max={selected.maxArgs?.[i] ?? 999}
                value={args[i] ?? "0"}
                onChange={e => {
                  const newArgs = [...args];
                  newArgs[i] = e.target.value;
                  setArgs(newArgs);
                  setResult(null);
                }}
                className="w-20 bg-slate-800 border border-slate-600 text-cyan-400 font-mono-display text-sm px-2 py-1.5 focus:outline-none focus:border-cyan-500"
              />
            </div>
          ))}
          <div className="flex items-end">
            <button
              onClick={compute}
              className={`h-9 px-4 font-mono-display text-xs font-semibold border transition-all active:scale-95 ${CAT_COLORS[selected.category].border} ${CAT_COLORS[selected.category].text} hover:opacity-80`}
            >
              COMPUTE
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-1">
            <div className="border border-emerald-700/40 bg-emerald-900/10 p-2">
              <span className="text-[10px] text-slate-500">RESULT = </span>
              <span className="font-mono-display text-emerald-400 text-lg">
                {isFinite(result.result) ? result.result.toLocaleString() : "∞ (too large)"}
              </span>
            </div>
            <div className="border border-slate-700 bg-slate-800/40 p-2">
              <div className="text-[10px] text-slate-500 tracking-widest mb-1">EVALUATION TRACE</div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {result.steps.map((step, i) => (
                  <div key={i} className="font-mono-display text-[11px] text-slate-400">{step}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PR Hierarchy */}
      <div className="border border-slate-700 bg-slate-800/20 p-3">
        <div className="text-[10px] text-slate-500 tracking-widest mb-2">PRIMITIVE RECURSIVE HIERARCHY</div>
        <div className="flex items-center gap-1 flex-wrap font-mono-display text-[11px]">
          {[
            { label: "Z, S, P", color: "text-emerald-400" },
            { label: "→", color: "text-slate-600" },
            { label: "add", color: "text-cyan-400" },
            { label: "→", color: "text-slate-600" },
            { label: "mul", color: "text-cyan-400" },
            { label: "→", color: "text-slate-600" },
            { label: "exp", color: "text-cyan-400" },
            { label: "→", color: "text-slate-600" },
            { label: "fact", color: "text-cyan-400" },
            { label: "→", color: "text-slate-600" },
            { label: "⊂ PR", color: "text-amber-400" },
            { label: "⊊", color: "text-slate-600" },
            { label: "Ackermann", color: "text-red-400" },
            { label: "∈ μ-recursive", color: "text-slate-500" },
          ].map((item, i) => (
            <span key={i} className={item.color}>{item.label}</span>
          ))}
        </div>
        <div className="text-[10px] text-slate-600 mt-1">
          PR = Primitive Recursive · μ-recursive = General Recursive (Turing-complete)
        </div>
      </div>
    </div>
  );
}
