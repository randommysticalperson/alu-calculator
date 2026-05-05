/**
 * EmlGrammar.tsx
 * Design: Terminal Hacker — Dark flat with neon green/cyan accents
 *
 * Implements the EML production grammar:
 *   S → 1 | eml(S, S)
 *
 * Features:
 * - Formal grammar display
 * - Expression parser → AST
 * - Interactive SVG binary parse tree with depth/leaves/shape labels
 * - Live evaluator: enter x, compute result at every node
 * - Preset gallery from Ninhache/EML-Operator README
 * - Link to Ninhache/EML-Operator repo
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { Lang } from "@/lib/i18n";

// ── i18n ──────────────────────────────────────────────────────────────────────
const i18n: Record<Lang, Record<string, string>> = {
  en: {
    title: "EML GRAMMAR — S → 1 | eml(S, S)",
    subtitle: "Every elementary function is an EML expression tree",
    grammarLabel: "PRODUCTION GRAMMAR",
    grammarRule: "S  →  1  |  eml(S, S)",
    grammarNote: "The constant 1 and the binary operator eml(x,y)=exp(x)−ln(y) are the only primitives.",
    exprLabel: "EXPRESSION",
    exprPlaceholder: "e.g. eml(x, 1)  or  eml(1, eml(eml(1,x),1))",
    xLabel: "x =",
    evaluate: "EVALUATE",
    treeTitle: "PARSE TREE",
    resultLabel: "RESULT",
    depthLabel: "Depth",
    leavesLabel: "Leaves",
    nodesLabel: "Nodes",
    shapeLabel: "Shape",
    presetsTitle: "PRESET EXPRESSIONS",
    errorParse: "Parse error",
    repoLink: "Ninhache/EML-Operator on GitHub",
    chain: "chain",
    branching: "branching",
    wide: "wide",
    nodeVal: "val",
  },
  pl: {
    title: "GRAMATYKA EML — S → 1 | eml(S, S)",
    subtitle: "Każda funkcja elementarna jest drzewem wyrażeń EML",
    grammarLabel: "GRAMATYKA PRODUKCYJNA",
    grammarRule: "S  →  1  |  eml(S, S)",
    grammarNote: "Stała 1 i operator binarny eml(x,y)=exp(x)−ln(y) to jedyne prymitywy.",
    exprLabel: "WYRAŻENIE",
    exprPlaceholder: "np. eml(x, 1)  lub  eml(1, eml(eml(1,x),1))",
    xLabel: "x =",
    evaluate: "OBLICZ",
    treeTitle: "DRZEWO SKŁADNIOWE",
    resultLabel: "WYNIK",
    depthLabel: "Głębokość",
    leavesLabel: "Liście",
    nodesLabel: "Węzły",
    shapeLabel: "Kształt",
    presetsTitle: "GOTOWE WYRAŻENIA",
    errorParse: "Błąd parsowania",
    repoLink: "Ninhache/EML-Operator na GitHub",
    chain: "łańcuch",
    branching: "rozgałęzione",
    wide: "szerokie",
    nodeVal: "war",
  },
  zh: {
    title: "EML 文法 — S → 1 | eml(S, S)",
    subtitle: "所有初等函數皆為 EML 表達式樹",
    grammarLabel: "產生文法",
    grammarRule: "S  →  1  |  eml(S, S)",
    grammarNote: "常數 1 與二元算子 eml(x,y)=exp(x)−ln(y) 是唯一的基本元素。",
    exprLabel: "表達式",
    exprPlaceholder: "例如 eml(x, 1)  或  eml(1, eml(eml(1,x),1))",
    xLabel: "x =",
    evaluate: "計算",
    treeTitle: "語法樹",
    resultLabel: "結果",
    depthLabel: "深度",
    leavesLabel: "葉節點",
    nodesLabel: "節點數",
    shapeLabel: "形狀",
    presetsTitle: "預設表達式",
    errorParse: "解析錯誤",
    repoLink: "GitHub 上的 Ninhache/EML-Operator",
    chain: "鏈式",
    branching: "分支",
    wide: "寬型",
    nodeVal: "值",
  },
};

// ── AST types ─────────────────────────────────────────────────────────────────
type EmlNode =
  | { kind: "const"; value: 1 }
  | { kind: "var" }
  | { kind: "eml"; left: EmlNode; right: EmlNode };

// ── Parser: tokenise then recursive descent ───────────────────────────────────
function tokenise(src: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < src.length) {
    if (/\s/.test(src[i])) { i++; continue; }
    if (src[i] === "(" || src[i] === ")" || src[i] === ",") {
      tokens.push(src[i++]); continue;
    }
    // word token
    let w = "";
    while (i < src.length && /[a-zA-Z0-9_.]/.test(src[i])) w += src[i++];
    if (w) tokens.push(w);
  }
  return tokens;
}

function parse(expr: string): EmlNode {
  const tokens = tokenise(expr.trim());
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume(expected?: string) {
    const t = tokens[pos++];
    if (expected && t !== expected) throw new Error(`Expected '${expected}' got '${t}'`);
    return t;
  }

  function parseS(): EmlNode {
    const t = peek();
    if (t === "1") { consume(); return { kind: "const", value: 1 }; }
    if (t === "x") { consume(); return { kind: "var" }; }
    if (t === "eml") {
      consume(); // eml
      consume("(");
      const left = parseS();
      consume(",");
      const right = parseS();
      consume(")");
      return { kind: "eml", left, right };
    }
    throw new Error(`Unexpected token: '${t}'`);
  }

  const tree = parseS();
  if (pos !== tokens.length) throw new Error("Trailing tokens");
  return tree;
}

// ── Evaluate AST at x ─────────────────────────────────────────────────────────
function evaluate(node: EmlNode, x: number): number {
  switch (node.kind) {
    case "const": return 1;
    case "var": return x;
    case "eml": {
      const l = evaluate(node.left, x);
      const r = evaluate(node.right, x);
      return Math.exp(l) - Math.log(r);
    }
  }
}

// ── Tree metrics ──────────────────────────────────────────────────────────────
function depth(node: EmlNode): number {
  if (node.kind !== "eml") return 0;
  return 1 + Math.max(depth(node.left), depth(node.right));
}
function countLeaves(node: EmlNode): number {
  if (node.kind !== "eml") return 1;
  return countLeaves(node.left) + countLeaves(node.right);
}
function countNodes(node: EmlNode): number {
  if (node.kind !== "eml") return 1;
  return 1 + countNodes(node.left) + countNodes(node.right);
}
function shapeLabel(d: number, l: number, lang: Lang): string {
  const tr = (k: string) => i18n[lang][k] ?? k;
  if (l >= 2 * d) return tr("wide");
  if (d === l) return tr("chain");
  return tr("branching");
}

// ── SVG tree layout (Reingold-Tilford simplified) ─────────────────────────────
interface LayoutNode {
  node: EmlNode;
  x: number;
  y: number;
  val?: number;
  left?: LayoutNode;
  right?: LayoutNode;
}

function layoutTree(node: EmlNode, xVal: number | null): LayoutNode {
  // assign positions via post-order: each node gets a width
  let counter = 0;
  function assign(n: EmlNode, depth: number): LayoutNode {
    if (n.kind !== "eml") {
      const x = counter++;
      return {
        node: n,
        x,
        y: depth,
        val: xVal !== null ? evaluate(n, xVal) : undefined,
      };
    }
    const left = assign(n.left, depth + 1);
    const right = assign(n.right, depth + 1);
    const x = (left.x + right.x) / 2;
    return {
      node: n,
      x,
      y: depth,
      val: xVal !== null ? evaluate(n, xVal) : undefined,
      left,
      right,
    };
  }
  return assign(node, 0);
}

// ── SVG Tree renderer ─────────────────────────────────────────────────────────
function SvgTree({ root, xVal, lang }: { root: LayoutNode; xVal: number | null; lang: Lang }) {
  const tr = (k: string) => i18n[lang][k] ?? k;
  const leaves = countLeaves(root.node);
  const d = depth(root.node);
  const W = Math.max(leaves * 56, 160);
  const H = (d + 1) * 70 + 20;
  const xScale = W / (leaves + 0.5);

  function renderEdges(n: LayoutNode): React.ReactNode {
    if (!n.left || !n.right) return null;
    const px = n.x * xScale + xScale / 2;
    const py = n.y * 70 + 30;
    const lx = n.left.x * xScale + xScale / 2;
    const ly = n.left.y * 70 + 30;
    const rx = n.right.x * xScale + xScale / 2;
    const ry = n.right.y * 70 + 30;
    return (
      <>
        <line x1={px} y1={py} x2={lx} y2={ly} stroke="#1e4a3a" strokeWidth="1.5" />
        <line x1={px} y1={py} x2={rx} y2={ry} stroke="#1e4a3a" strokeWidth="1.5" />
        {renderEdges(n.left)}
        {renderEdges(n.right)}
      </>
    );
  }

  function renderNodes(n: LayoutNode): React.ReactNode {
    const cx = n.x * xScale + xScale / 2;
    const cy = n.y * 70 + 30;
    const isLeaf = n.node.kind !== "eml";
    const color = n.node.kind === "eml" ? "#10b981"
      : n.node.kind === "var" ? "#06b6d4"
      : "#f59e0b";
    const label = n.node.kind === "eml" ? "eml"
      : n.node.kind === "var" ? "x"
      : "1";
    const r = isLeaf ? 14 : 18;
    const valStr = n.val !== undefined
      ? (isFinite(n.val) ? n.val.toFixed(3) : "∞")
      : "";
    return (
      <>
        <circle cx={cx} cy={cy} r={r} fill="#0a1a12" stroke={color} strokeWidth="1.5" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill={color}
          fontSize="9" fontFamily="Fira Code, monospace" fontWeight="bold">
          {label}
        </text>
        {valStr && (
          <text x={cx} y={cy + r + 11} textAnchor="middle" fill="#475569"
            fontSize="7.5" fontFamily="Fira Code, monospace">
            {tr("nodeVal")}={valStr}
          </text>
        )}
        {n.left && renderNodes(n.left)}
        {n.right && renderNodes(n.right)}
      </>
    );
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ overflow: "visible", minHeight: 80 }}
    >
      {renderEdges(root)}
      {renderNodes(root)}
    </svg>
  );
}

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS = [
  { label: "e",       expr: "eml(1, 1)",                          x: 0,     desc: "eml(1,1) = e" },
  { label: "exp(x)",  expr: "eml(x, 1)",                          x: 1,     desc: "eml(x,1) = eˣ" },
  { label: "ln(x)",   expr: "eml(1, eml(eml(1, x), 1))",          x: 2.718, desc: "depth-3 chain" },
  { label: "id(x)",   expr: "eml(eml(1, eml(eml(1, x), 1)), 1)",  x: 5,     desc: "exp(ln(x)) = x" },
  { label: "eml(x,1) at x=0", expr: "eml(x, 1)",                  x: 0,     desc: "exp(0) = 1" },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function EmlGrammar({ lang }: { lang: Lang }) {
  const tr = (k: string) => i18n[lang][k] ?? k;
  const [expr, setExpr] = useState("eml(x, 1)");
  const [xInput, setXInput] = useState("1");
  const [tree, setTree] = useState<EmlNode | null>(null);
  const [layout, setLayout] = useState<LayoutNode | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xVal, setXVal] = useState<number | null>(1);

  const doEvaluate = useCallback((expression: string, xStr: string) => {
    try {
      const ast = parse(expression);
      const xNum = parseFloat(xStr);
      const xv = isNaN(xNum) ? null : xNum;
      const lay = layoutTree(ast, xv);
      setTree(ast);
      setLayout(lay);
      setXVal(xv);
      setResult(xv !== null ? evaluate(ast, xv) : null);
      setError(null);
    } catch (e) {
      setError(tr("errorParse") + ": " + (e instanceof Error ? e.message : String(e)));
      setTree(null);
      setLayout(null);
      setResult(null);
    }
  }, [lang]);

  // Evaluate on mount with default
  useEffect(() => { doEvaluate(expr, xInput); }, []);

  const d = tree ? depth(tree) : 0;
  const l = tree ? countLeaves(tree) : 0;
  const n = tree ? countNodes(tree) : 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="border border-emerald-700/40 bg-emerald-900/10 p-3">
        <div className="text-[10px] text-emerald-400 tracking-widest mb-1">{tr("title")}</div>
        <div className="text-[11px] text-slate-400">{tr("subtitle")}</div>
      </div>

      {/* Grammar rule */}
      <div className="border border-violet-700/30 bg-violet-900/10 p-3">
        <div className="text-[9px] text-violet-400 tracking-widest mb-2">{tr("grammarLabel")}</div>
        <div className="font-mono-display text-base text-violet-300 tracking-wide mb-1">{tr("grammarRule")}</div>
        <div className="text-[10px] text-slate-500">{tr("grammarNote")}</div>
      </div>

      {/* Presets */}
      <div>
        <div className="text-[9px] text-slate-500 tracking-widest mb-2">{tr("presetsTitle")}</div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label + p.x}
              onClick={() => {
                setExpr(p.expr);
                setXInput(String(p.x));
                doEvaluate(p.expr, String(p.x));
              }}
              className="px-2.5 py-1 text-[10px] font-mono-display border border-slate-700 text-slate-400
                hover:border-emerald-600 hover:text-emerald-400 transition-all"
            >
              <span className="text-emerald-400">{p.label}</span>
              <span className="text-slate-600 ml-1">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expression input */}
      <div className="flex flex-col gap-2">
        <div className="text-[9px] text-slate-500 tracking-widest">{tr("exprLabel")}</div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={expr}
            onChange={e => setExpr(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doEvaluate(expr, xInput)}
            placeholder={tr("exprPlaceholder")}
            className="flex-1 min-w-0 bg-slate-900 border border-slate-700 text-emerald-300
              font-mono-display text-xs px-3 py-2 focus:outline-none focus:border-emerald-600
              placeholder:text-slate-700"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-mono-display">{tr("xLabel")}</span>
            <input
              value={xInput}
              onChange={e => setXInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doEvaluate(expr, xInput)}
              className="w-20 bg-slate-900 border border-slate-700 text-cyan-300
                font-mono-display text-xs px-2 py-2 focus:outline-none focus:border-cyan-600"
            />
          </div>
          <button
            onClick={() => doEvaluate(expr, xInput)}
            className="px-4 py-2 text-xs font-mono-display border border-emerald-600
              text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-95"
          >
            {tr("evaluate")}
          </button>
        </div>
        {error && (
          <div className="text-red-400 text-[10px] font-mono-display border border-red-900/40 bg-red-900/10 px-3 py-1.5">
            {error}
          </div>
        )}
      </div>

      {/* Tree + stats */}
      {tree && layout && (
        <>
          {/* Stats bar */}
          <div className="flex gap-4 flex-wrap text-[10px] font-mono-display border border-slate-700/40 bg-slate-900/30 px-3 py-2">
            <span><span className="text-slate-500">{tr("depthLabel")}: </span><span className="text-emerald-400">{d}</span></span>
            <span><span className="text-slate-500">{tr("leavesLabel")}: </span><span className="text-cyan-400">{l}</span></span>
            <span><span className="text-slate-500">{tr("nodesLabel")}: </span><span className="text-amber-400">{n}</span></span>
            <span><span className="text-slate-500">{tr("shapeLabel")}: </span><span className="text-violet-400">{shapeLabel(d, l, lang)}</span></span>
            {result !== null && (
              <span className="ml-auto">
                <span className="text-slate-500">{tr("resultLabel")}: </span>
                <span className="text-emerald-300 font-bold text-sm">
                  {isFinite(result) ? result.toFixed(8) : "∞"}
                </span>
              </span>
            )}
          </div>

          {/* SVG tree */}
          <div className="border border-slate-700/40 bg-slate-900/30 p-3">
            <div className="text-[9px] text-slate-500 tracking-widest mb-2">{tr("treeTitle")}</div>
            <div className="overflow-x-auto">
              <SvgTree root={layout} xVal={xVal} lang={lang} />
            </div>
          </div>
        </>
      )}

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-[9px]">
        <div className="border border-emerald-800/30 bg-emerald-900/10 p-2">
          <div className="text-emerald-400 font-mono-display mb-1">eml</div>
          <div className="text-slate-500">Internal node — binary operator</div>
        </div>
        <div className="border border-cyan-800/30 bg-cyan-900/10 p-2">
          <div className="text-cyan-400 font-mono-display mb-1">x</div>
          <div className="text-slate-500">Leaf — variable input</div>
        </div>
        <div className="border border-amber-800/30 bg-amber-900/10 p-2">
          <div className="text-amber-400 font-mono-display mb-1">1</div>
          <div className="text-slate-500">Leaf — constant 1</div>
        </div>
      </div>

      {/* Repo link */}
      <div className="text-[10px] text-slate-600 border-t border-slate-800 pt-2">
        <a
          href="https://github.com/Ninhache/EML-Operator"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 hover:text-emerald-400 transition-colors font-mono-display"
        >
          ↗ {tr("repoLink")}
        </a>
        <span className="ml-2">· PyTorch symbolic regression prototype by Ninhache</span>
      </div>
    </div>
  );
}
