/*
 * EML Phylogenetic Spiral Visualizer
 * Recreates the bootstrapping "phylogenetic" tree from arXiv:2603.21852 Fig. 1
 * Design: Terminal Hacker — dark bg, neon accents, SVG canvas
 *
 * Node color categories (matching the paper's figure):
 *   red    = EML operator (center)
 *   green  = constants/seeds (1, e, π, -1, 2)
 *   grey   = algebraic/arithmetic (exp, ln, +, -, ×, ÷, x², √x, 1/x, -x, x/2, x^y, logₓy, avg, hypot)
 *   blue   = trigonometric (sin, cos, tan, arcsin, arccos, arctan)
 *   pink   = hyperbolic (sinh, cosh, tanh, arsinh, arcosh, artanh, σ)
 */

import { useState, useRef, useEffect, useCallback } from "react";

interface Node {
  id: string;
  label: string;
  category: "eml" | "seed" | "algebraic" | "trig" | "hyperbolic";
  ring: number;       // 0 = center, 1 = inner, 2 = mid, 3 = outer
  angle: number;      // degrees, 0 = top
  description: string;
  derivedFrom: string[];  // ids of parent nodes
  emlFormula?: string;
}

// ─── Node data based on Fig. 1 bootstrapping chain ───────────────────────────

const NODES: Node[] = [
  // Ring 0 — EML itself
  { id: "eml", label: "eml", category: "eml", ring: 0, angle: 0,
    description: "eml(x,y) = exp(x) − ln(y)\nThe single universal operator. Analogous to NAND for Boolean logic.",
    derivedFrom: [], emlFormula: "exp(x) − ln(y)" },

  // Ring 1 — First bootstrapped: seeds from eml(1,1) etc.
  { id: "e", label: "e", category: "seed", ring: 1, angle: 30,
    description: "Euler's number e ≈ 2.71828\neml(1,1) = exp(1) − ln(1) = e − 0 = e",
    derivedFrom: ["eml"], emlFormula: "eml(1,1)" },
  { id: "one", label: "1", category: "seed", ring: 1, angle: 90,
    description: "The terminal constant 1.\nRequired to neutralise ln(1)=0 in EML.",
    derivedFrom: [], emlFormula: "terminal" },
  { id: "exp", label: "exp", category: "algebraic", ring: 1, angle: 150,
    description: "Exponential: exp(x) = e^x\neml(x, 1) = exp(x) − ln(1) = exp(x)",
    derivedFrom: ["eml","one"], emlFormula: "eml(x, 1)" },
  { id: "ln", label: "ln", category: "algebraic", ring: 1, angle: 210,
    description: "Natural logarithm: ln(x)\neml(1, eml(eml(1,x), 1))\nDepth-3 EML expression",
    derivedFrom: ["eml","one"], emlFormula: "eml(1, eml(eml(1,x), 1))" },
  { id: "neg1", label: "−1", category: "seed", ring: 1, angle: 270,
    description: "Constant −1\nDerived via EML chain from 1",
    derivedFrom: ["eml","one"], emlFormula: "eml chain" },
  { id: "two", label: "2", category: "seed", ring: 1, angle: 330,
    description: "Constant 2\nDerived via EML chain",
    derivedFrom: ["eml","one"], emlFormula: "eml chain" },

  // Ring 2 — Algebraic operations
  { id: "minus", label: "−", category: "algebraic", ring: 2, angle: 20,
    description: "Subtraction: x − y\neml(ln x, e^y) = exp(ln x) − ln(e^y) = x − y\n(requires x > 0)",
    derivedFrom: ["ln","exp"], emlFormula: "eml(ln x, e^y)" },
  { id: "plus", label: "+", category: "algebraic", ring: 2, angle: 60,
    description: "Addition: x + y\nln(e^x · e^y) = ln(eml(x,1) · eml(y,1))\nDepth ~5 EML expression",
    derivedFrom: ["ln","exp"], emlFormula: "ln(eml(x,1)·eml(y,1))" },
  { id: "times", label: "×", category: "algebraic", ring: 2, angle: 100,
    description: "Multiplication: x × y\neml(ln x + ln y, 1) = exp(ln x + ln y)\n(requires x,y > 0)",
    derivedFrom: ["ln","exp","plus"], emlFormula: "eml(ln x + ln y, 1)" },
  { id: "inv", label: "1/x", category: "algebraic", ring: 2, angle: 140,
    description: "Reciprocal: 1/x\nexp(−ln x) = eml(−ln x, 1)\nDepth ~7 EML expression",
    derivedFrom: ["ln","exp","minus"], emlFormula: "eml(−ln x, 1)" },
  { id: "negx", label: "−x", category: "algebraic", ring: 2, angle: 180,
    description: "Negation: −x\nBuilt from EML chain via subtraction\nDepth ~15 (direct search)",
    derivedFrom: ["minus","one"], emlFormula: "eml chain, depth ~15" },
  { id: "sqr", label: "x²", category: "algebraic", ring: 2, angle: 220,
    description: "Square: x²\nexp(2·ln x) = eml(2·ln x, 1)\n(requires x > 0)",
    derivedFrom: ["ln","exp","two"], emlFormula: "eml(2·ln x, 1)" },
  { id: "div", label: "÷", category: "algebraic", ring: 2, angle: 260,
    description: "Division: x ÷ y\nexp(ln x − ln y) = eml(ln x − ln y, 1)\n(requires x,y > 0)",
    derivedFrom: ["ln","exp","minus"], emlFormula: "eml(ln x − ln y, 1)" },
  { id: "xhalf", label: "x/2", category: "algebraic", ring: 2, angle: 300,
    description: "Half: x/2\nDepth ~27 EML expression",
    derivedFrom: ["div","two"], emlFormula: "eml chain, depth ~27" },
  { id: "pow", label: "x^y", category: "algebraic", ring: 2, angle: 340,
    description: "Power: x^y = e^(y·ln x)\neml(y·ln x, 1)\n(requires x > 0)",
    derivedFrom: ["ln","exp","times"], emlFormula: "eml(y·ln x, 1)" },

  // Ring 2 continued — more algebraic
  { id: "sqrt", label: "√x", category: "algebraic", ring: 2, angle: 380,
    description: "Square root: √x = x^(1/2)\neml(ln(x)/2, 1)",
    derivedFrom: ["ln","exp","xhalf"], emlFormula: "eml(ln(x)/2, 1)" },
  { id: "logxy", label: "logₓy", category: "algebraic", ring: 2, angle: 420,
    description: "Logarithm base x: logₓ(y) = ln(y)/ln(x)\nDepth ~29 EML expression",
    derivedFrom: ["ln","div"], emlFormula: "ln(y)/ln(x) via EML" },
  { id: "avg", label: "(x+y)/2", category: "algebraic", ring: 2, angle: 460,
    description: "Arithmetic mean: (x+y)/2\nDepth ~287 EML compiler / >27 direct",
    derivedFrom: ["plus","xhalf"], emlFormula: "eml chain, depth ~287" },
  { id: "hypot", label: "√x²+y²", category: "algebraic", ring: 2, angle: 500,
    description: "Hypotenuse: √(x²+y²)\nDepth >27 EML expression",
    derivedFrom: ["sqr","plus","sqrt"], emlFormula: "eml chain, depth >27" },
  { id: "pi", label: "π", category: "seed", ring: 2, angle: 540,
    description: "Pi ≈ 3.14159\nDerived via EML chain (depth ~193 compiler)",
    derivedFrom: ["ln","neg1"], emlFormula: "eml chain, depth ~193" },
  { id: "sigma", label: "σ", category: "hyperbolic", ring: 2, angle: 570,
    description: "Logistic sigmoid: σ(x) = 1/(1+e^−x)\nDerived from exp and inv",
    derivedFrom: ["exp","inv","plus"], emlFormula: "1/(1+eml(−x,1))" },

  // Ring 3 — Trig and hyperbolic
  { id: "sin", label: "sin", category: "trig", ring: 3, angle: 30,
    description: "Sine function: sin(x)\nDerived via complex EML chain using π and i\nRequires complex domain",
    derivedFrom: ["exp","pi","neg1"], emlFormula: "Im(eml(ix, 1))" },
  { id: "cos", label: "cos", category: "trig", ring: 3, angle: 70,
    description: "Cosine function: cos(x)\nRe(e^(ix)) via EML in complex domain",
    derivedFrom: ["exp","pi","neg1"], emlFormula: "Re(eml(ix, 1))" },
  { id: "tan", label: "tan", category: "trig", ring: 3, angle: 110,
    description: "Tangent: tan(x) = sin(x)/cos(x)\nDerived from sin and cos via EML",
    derivedFrom: ["sin","cos","div"], emlFormula: "sin/cos via EML" },
  { id: "arcsin", label: "arcsin", category: "trig", ring: 3, angle: 150,
    description: "Arcsine: arcsin(x)\nDerived via complex logarithm EML chain",
    derivedFrom: ["ln","sqr","minus"], emlFormula: "−i·ln(ix + √(1−x²))" },
  { id: "arccos", label: "arccos", category: "trig", ring: 3, angle: 190,
    description: "Arccosine: arccos(x)\nπ/2 − arcsin(x) via EML",
    derivedFrom: ["arcsin","pi"], emlFormula: "π/2 − arcsin(x)" },
  { id: "arctan", label: "arctan", category: "trig", ring: 3, angle: 230,
    description: "Arctangent: arctan(x)\nDerived via complex logarithm",
    derivedFrom: ["ln","neg1"], emlFormula: "−i/2·ln((1+ix)/(1−ix))" },
  { id: "sinh", label: "sinh", category: "hyperbolic", ring: 3, angle: 270,
    description: "Hyperbolic sine: sinh(x) = (e^x − e^−x)/2\nDirectly from exp via EML",
    derivedFrom: ["exp","minus","xhalf"], emlFormula: "(eml(x,1)−eml(−x,1))/2" },
  { id: "cosh", label: "cosh", category: "hyperbolic", ring: 3, angle: 310,
    description: "Hyperbolic cosine: cosh(x) = (e^x + e^−x)/2\nFrom exp via EML",
    derivedFrom: ["exp","plus","xhalf"], emlFormula: "(eml(x,1)+eml(−x,1))/2" },
  { id: "tanh", label: "tanh", category: "hyperbolic", ring: 3, angle: 350,
    description: "Hyperbolic tangent: tanh(x) = sinh/cosh\nFrom sinh and cosh",
    derivedFrom: ["sinh","cosh","div"], emlFormula: "sinh(x)/cosh(x)" },
  { id: "arsinh", label: "arsinh", category: "hyperbolic", ring: 3, angle: 390,
    description: "Inverse hyperbolic sine: arsinh(x) = ln(x + √(x²+1))\nFrom ln via EML",
    derivedFrom: ["ln","sqr","plus","sqrt"], emlFormula: "ln(x + √(x²+1))" },
  { id: "arcosh", label: "arcosh", category: "hyperbolic", ring: 3, angle: 430,
    description: "Inverse hyperbolic cosine: arcosh(x) = ln(x + √(x²−1))\nFrom ln via EML",
    derivedFrom: ["ln","sqr","minus","sqrt"], emlFormula: "ln(x + √(x²−1))" },
  { id: "artanh", label: "artanh", category: "hyperbolic", ring: 3, angle: 470,
    description: "Inverse hyperbolic tangent: artanh(x) = ln((1+x)/(1−x))/2\nFrom ln",
    derivedFrom: ["ln","plus","minus","xhalf"], emlFormula: "ln((1+x)/(1−x))/2" },
];

// ─── Color scheme ─────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { fill: string; stroke: string; text: string; glow: string }> = {
  eml:       { fill: "#ef4444", stroke: "#f87171", text: "#fff",    glow: "rgba(239,68,68,0.5)" },
  seed:      { fill: "#22c55e", stroke: "#4ade80", text: "#fff",    glow: "rgba(34,197,94,0.4)" },
  algebraic: { fill: "#334155", stroke: "#64748b", text: "#cbd5e1", glow: "rgba(100,116,139,0.3)" },
  trig:      { fill: "#1d4ed8", stroke: "#60a5fa", text: "#bfdbfe", glow: "rgba(96,165,250,0.4)" },
  hyperbolic:{ fill: "#9d174d", stroke: "#f472b6", text: "#fce7f3", glow: "rgba(244,114,182,0.4)" },
};

// ─── Layout computation ───────────────────────────────────────────────────────

function computeNodePositions(width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const radii = [0, Math.min(width, height) * 0.14, Math.min(width, height) * 0.28, Math.min(width, height) * 0.43];

  // Group by ring
  const byRing: Record<number, Node[]> = { 0: [], 1: [], 2: [], 3: [] };
  NODES.forEach(n => byRing[n.ring].push(n));

  // Distribute ring 1 evenly, ring 2 and 3 by their angle hints
  const positions: Record<string, { x: number; y: number }> = {};

  NODES.forEach(node => {
    const r = radii[node.ring];
    let angle: number;
    if (node.ring === 0) {
      angle = 0;
    } else if (node.ring === 1) {
      // Evenly space ring 1 nodes
      const ring1 = byRing[1];
      const idx = ring1.indexOf(node);
      angle = (idx / ring1.length) * 360 - 90;
    } else {
      // Use angle hint, normalized
      angle = node.angle - 90;
    }
    const rad = (angle * Math.PI) / 180;
    positions[node.id] = {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  });

  return positions;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmlSpiral() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 500, height: 500 });
  const [selected, setSelected] = useState<Node | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const entry = entries[0];
      const w = entry.contentRect.width;
      const h = Math.min(w, 520);
      setSize({ width: w, height: h });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const positions = computeNodePositions(size.width, size.height);

  const isHighlighted = useCallback((nodeId: string) => {
    if (!selected && !hovered) return true;
    const focusId = hovered || selected?.id;
    if (!focusId) return true;
    const focus = NODES.find(n => n.id === focusId);
    if (!focus) return true;
    return nodeId === focusId || focus.derivedFrom.includes(nodeId) ||
      NODES.find(n => n.id === nodeId)?.derivedFrom.includes(focusId) || false;
  }, [selected, hovered]);

  const visibleNodes = filterCategory
    ? NODES.filter(n => n.category === filterCategory || n.id === "eml" || n.id === "one")
    : NODES;

  const nodeRadius = (node: Node) => {
    if (node.ring === 0) return 22;
    if (node.ring === 1) return 16;
    return 13;
  };

  return (
    <div ref={containerRef} className="w-full">
      {/* Legend / filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[
          { cat: null, label: "ALL" },
          { cat: "seed", label: "CONSTANTS" },
          { cat: "algebraic", label: "ALGEBRAIC" },
          { cat: "trig", label: "TRIG" },
          { cat: "hyperbolic", label: "HYPERBOLIC" },
        ].map(({ cat, label }) => {
          const col = cat ? CATEGORY_COLORS[cat] : null;
          return (
            <button
              key={label}
              onClick={() => setFilterCategory(f => f === cat ? null : cat)}
              className={`px-2 py-0.5 text-[10px] font-medium border transition-all tracking-widest ${filterCategory === cat ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
              style={col ? { borderColor: col.stroke, color: col.text, backgroundColor: col.fill + "22" } : { borderColor: "#475569", color: "#94a3b8" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className="w-full"
        style={{ background: "transparent" }}
      >
        <defs>
          {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
            <filter key={cat} id={`glow-${cat}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
          </marker>
          <marker id="arrow-highlight" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" />
          </marker>
        </defs>

        {/* Ring circles (faint guides) */}
        {[1, 2, 3].map(ring => {
          const r = Math.min(size.width, size.height) * [0, 0.14, 0.28, 0.43][ring];
          return (
            <circle
              key={ring}
              cx={size.width / 2}
              cy={size.height / 2}
              r={r}
              fill="none"
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          );
        })}

        {/* Edges */}
        {visibleNodes.map(node =>
          node.derivedFrom.map(parentId => {
            const parent = positions[parentId];
            const child = positions[node.id];
            if (!parent || !child) return null;
            const isActive = hovered === node.id || hovered === parentId ||
              selected?.id === node.id || selected?.id === parentId;
            return (
              <line
                key={`${parentId}-${node.id}`}
                x1={parent.x}
                y1={parent.y}
                x2={child.x}
                y2={child.y}
                stroke={isActive ? "#10b981" : "#1e293b"}
                strokeWidth={isActive ? 1.5 : 0.8}
                strokeOpacity={isActive ? 0.9 : 0.5}
                markerEnd={isActive ? "url(#arrow-highlight)" : "url(#arrow)"}
                className="transition-all duration-200"
              />
            );
          })
        )}

        {/* Nodes */}
        {visibleNodes.map(node => {
          const pos = positions[node.id];
          if (!pos) return null;
          const col = CATEGORY_COLORS[node.category];
          const r = nodeRadius(node);
          const highlighted = isHighlighted(node.id);
          const isSelected = selected?.id === node.id;

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer"
              onClick={() => setSelected(s => s?.id === node.id ? null : node)}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ opacity: highlighted ? 1 : 0.2, transition: "opacity 0.2s" }}
            >
              {/* Glow ring for selected */}
              {isSelected && (
                <circle r={r + 5} fill="none" stroke={col.stroke} strokeWidth="2" opacity="0.5" />
              )}
              {/* Main circle */}
              <circle
                r={r}
                fill={col.fill}
                stroke={col.stroke}
                strokeWidth={isSelected ? 2 : 1}
                filter={isSelected || hovered === node.id ? `url(#glow-${node.category})` : undefined}
              />
              {/* Label */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill={col.text}
                fontSize={node.ring === 0 ? 11 : node.ring === 1 ? 9 : 8}
                fontFamily="'Fira Code', monospace"
                fontWeight={node.ring <= 1 ? "bold" : "normal"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Info panel */}
      {selected && (
        <div
          className="mt-2 border p-3 text-xs"
          style={{
            borderColor: CATEGORY_COLORS[selected.category].stroke + "60",
            backgroundColor: CATEGORY_COLORS[selected.category].fill + "15",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className="font-mono-display font-bold text-sm"
                style={{ color: CATEGORY_COLORS[selected.category].stroke }}
              >
                {selected.label}
              </span>
              <span className="text-slate-500 text-[10px] ml-2 tracking-widest uppercase">{selected.category}</span>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-300 text-lg leading-none">×</button>
          </div>
          {selected.emlFormula && (
            <div className="font-mono-display text-emerald-400 mt-1 text-[11px]">{selected.emlFormula}</div>
          )}
          <div className="text-slate-400 mt-1 whitespace-pre-line">{selected.description}</div>
          {selected.derivedFrom.length > 0 && (
            <div className="mt-1 text-[10px] text-slate-600">
              Derived from: {selected.derivedFrom.map(id => NODES.find(n => n.id === id)?.label || id).join(", ")}
            </div>
          )}
        </div>
      )}
      {!selected && (
        <div className="mt-1 text-[10px] text-slate-600 text-center">Click any node to see its EML derivation</div>
      )}
    </div>
  );
}
