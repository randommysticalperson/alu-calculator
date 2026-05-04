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
import { type Lang, t } from "@/lib/i18n";

interface Node {
  id: string;
  label: string;
  category: "eml" | "seed" | "algebraic" | "trig" | "hyperbolic";
  ring: number;
  angle: number;
  description: { en: string; pl: string; zh: string };
  derivedFrom: string[];
  emlFormula?: string;
}

// ─── Node data based on Fig. 1 bootstrapping chain ───────────────────────────

const NODES: Node[] = [
  // Ring 0 — EML itself
  { id: "eml", label: "eml", category: "eml", ring: 0, angle: 0,
    description: {
      en: "eml(x,y) = exp(x) − ln(y)\nThe single universal operator. Analogous to NAND for Boolean logic.",
      pl: "eml(x,y) = exp(x) − ln(y)\nJedyny uniwersalny operator. Analogiczny do NAND w logice Boole'a.",
      zh: "eml(x,y) = exp(x) − ln(y)\n唯一的通用運算子，類比布林逿輯中的 NAND。"
    }, derivedFrom: [], emlFormula: "exp(x) − ln(y)" },

  // Ring 1 — First bootstrapped: seeds from eml(1,1) etc.
  { id: "e", label: "e", category: "seed", ring: 1, angle: 30,
    description: {
      en: "Euler's number e ≈ 2.71828\neml(1,1) = exp(1) − ln(1) = e − 0 = e",
      pl: "Liczba Eulera e ≈ 2.71828\neml(1,1) = exp(1) − ln(1) = e − 0 = e",
      zh: "Euler 數 e ≈ 2.71828\neml(1,1) = exp(1) − ln(1) = e − 0 = e"
    }, derivedFrom: ["eml"], emlFormula: "eml(1,1)" },
  { id: "one", label: "1", category: "seed", ring: 1, angle: 90,
    description: {
      en: "The terminal constant 1.\nRequired to neutralise ln(1)=0 in EML.",
      pl: "Stała terminalna 1.\nNiezbędna do neutralizacji ln(1)=0 w EML.",
      zh: "終端常數 1。\n用於消去 EML 中的 ln(1)=0。"
    }, derivedFrom: [], emlFormula: "terminal" },
  { id: "exp", label: "exp", category: "algebraic", ring: 1, angle: 150,
    description: {
      en: "Exponential: exp(x) = e^x\neml(x, 1) = exp(x) − ln(1) = exp(x)",
      pl: "Eksponencja: exp(x) = e^x\neml(x, 1) = exp(x) − ln(1) = exp(x)",
      zh: "指數函數：exp(x) = e^x\neml(x, 1) = exp(x) − ln(1) = exp(x)"
    }, derivedFrom: ["eml","one"], emlFormula: "eml(x, 1)" },
  { id: "ln", label: "ln", category: "algebraic", ring: 1, angle: 210,
    description: {
      en: "Natural logarithm: ln(x)\neml(1, eml(eml(1,x), 1))\nDepth-3 EML expression",
      pl: "Logarytm naturalny: ln(x)\neml(1, eml(eml(1,x), 1))\nWyrażenie EML głębokości 3",
      zh: "自然對數：ln(x)\neml(1, eml(eml(1,x), 1))\nEML 深度 3 表達式"
    }, derivedFrom: ["eml","one"], emlFormula: "eml(1, eml(eml(1,x), 1))" },
  { id: "neg1", label: "−1", category: "seed", ring: 1, angle: 270,
    description: {
      en: "Constant −1\nDerived via EML chain from 1",
      pl: "Stała −1\nWyprowadzona przez łańcuch EML z 1",
      zh: "常數 −1\n由 1 透過 EML 鏈推導"
    }, derivedFrom: ["eml","one"], emlFormula: "eml chain" },
  { id: "two", label: "2", category: "seed", ring: 1, angle: 330,
    description: {
      en: "Constant 2\nDerived via EML chain",
      pl: "Stała 2\nWyprowadzona przez łańcuch EML",
      zh: "常數 2\n透過 EML 鏈推導"
    }, derivedFrom: ["eml","one"], emlFormula: "eml chain" },

  // Ring 2 — Algebraic operations
  { id: "minus", label: "−", category: "algebraic", ring: 2, angle: 20,
    description: {
      en: "Subtraction: x − y\neml(ln x, e^y) = exp(ln x) − ln(e^y) = x − y\n(requires x > 0)",
      pl: "Odejmowanie: x − y\neml(ln x, e^y) = x − y\n(wymaga x > 0)",
      zh: "減法：x − y\neml(ln x, e^y) = x − y\n（需要 x > 0）"
    }, derivedFrom: ["ln","exp"], emlFormula: "eml(ln x, e^y)" },
  { id: "plus", label: "+", category: "algebraic", ring: 2, angle: 60,
    description: {
      en: "Addition: x + y\nln(e^x · e^y) = ln(eml(x,1) · eml(y,1))\nDepth ~5 EML expression",
      pl: "Dodawanie: x + y\nln(e^x · e^y) = ln(eml(x,1) · eml(y,1))\nGłębokość EML ~5",
      zh: "加法：x + y\nln(e^x · e^y) = ln(eml(x,1) · eml(y,1))\nEML 深度 ~5"
    }, derivedFrom: ["ln","exp"], emlFormula: "ln(eml(x,1)·eml(y,1))" },
  { id: "times", label: "×", category: "algebraic", ring: 2, angle: 100,
    description: {
      en: "Multiplication: x × y\neml(ln x + ln y, 1) = exp(ln x + ln y)\n(requires x,y > 0)",
      pl: "Mnożenie: x × y\neml(ln x + ln y, 1)\n(wymaga x,y > 0)",
      zh: "乘法：x × y\neml(ln x + ln y, 1)\n（需要 x,y > 0）"
    }, derivedFrom: ["ln","exp","plus"], emlFormula: "eml(ln x + ln y, 1)" },
  { id: "inv", label: "1/x", category: "algebraic", ring: 2, angle: 140,
    description: {
      en: "Reciprocal: 1/x\nexp(−ln x) = eml(−ln x, 1)\nDepth ~7 EML expression",
      pl: "Odwrotność: 1/x\nexp(−ln x) = eml(−ln x, 1)\nGłębokość EML ~7",
      zh: "倒數：1/x\nexp(−ln x) = eml(−ln x, 1)\nEML 深度 ~7"
    }, derivedFrom: ["ln","exp","minus"], emlFormula: "eml(−ln x, 1)" },
  { id: "negx", label: "−x", category: "algebraic", ring: 2, angle: 180,
    description: {
      en: "Negation: −x\nBuilt from EML chain via subtraction\nDepth ~15 (direct search)",
      pl: "Negacja: −x\nZbudowana przez łańcuch EML przez odejmowanie\nGłębokość ~15",
      zh: "取負：−x\n由減法的 EML 鏈構建\n深度 ~15"
    }, derivedFrom: ["minus","one"], emlFormula: "eml chain, depth ~15" },
  { id: "sqr", label: "x²", category: "algebraic", ring: 2, angle: 220,
    description: {
      en: "Square: x²\nexp(2·ln x) = eml(2·ln x, 1)\n(requires x > 0)",
      pl: "Kwadrat: x²\nexp(2·ln x) = eml(2·ln x, 1)\n(wymaga x > 0)",
      zh: "平方：x²\nexp(2·ln x) = eml(2·ln x, 1)\n（需要 x > 0）"
    }, derivedFrom: ["ln","exp","two"], emlFormula: "eml(2·ln x, 1)" },
  { id: "div", label: "÷", category: "algebraic", ring: 2, angle: 260,
    description: {
      en: "Division: x ÷ y\nexp(ln x − ln y) = eml(ln x − ln y, 1)\n(requires x,y > 0)",
      pl: "Dzielenie: x ÷ y\nexp(ln x − ln y) = eml(ln x − ln y, 1)\n(wymaga x,y > 0)",
      zh: "除法：x ÷ y\nexp(ln x − ln y) = eml(ln x − ln y, 1)\n（需要 x,y > 0）"
    }, derivedFrom: ["ln","exp","minus"], emlFormula: "eml(ln x − ln y, 1)" },
  { id: "xhalf", label: "x/2", category: "algebraic", ring: 2, angle: 300,
    description: {
      en: "Half: x/2\nDepth ~27 EML expression",
      pl: "Połowa: x/2\nGłębokość EML ~27",
      zh: "半値：x/2\nEML 深度 ~27"
    }, derivedFrom: ["div","two"], emlFormula: "eml chain, depth ~27" },
  { id: "pow", label: "x^y", category: "algebraic", ring: 2, angle: 340,
    description: {
      en: "Power: x^y = e^(y·ln x)\neml(y·ln x, 1)\n(requires x > 0)",
      pl: "Potęga: x^y = e^(y·ln x)\neml(y·ln x, 1)\n(wymaga x > 0)",
      zh: "冪次：x^y = e^(y·ln x)\neml(y·ln x, 1)\n（需要 x > 0）"
    }, derivedFrom: ["ln","exp","times"], emlFormula: "eml(y·ln x, 1)" },

  // Ring 2 continued — more algebraic
  { id: "sqrt", label: "√x", category: "algebraic", ring: 2, angle: 380,
    description: {
      en: "Square root: √x = x^(1/2)\neml(ln(x)/2, 1)",
      pl: "Pierwiastek kwadratowy: √x = x^(1/2)\neml(ln(x)/2, 1)",
      zh: "平方根：√x = x^(1/2)\neml(ln(x)/2, 1)"
    }, derivedFrom: ["ln","exp","xhalf"], emlFormula: "eml(ln(x)/2, 1)" },
  { id: "logxy", label: "logₓy", category: "algebraic", ring: 2, angle: 420,
    description: {
      en: "Logarithm base x: logₓ(y) = ln(y)/ln(x)\nDepth ~29 EML expression",
      pl: "Logarytm o podstawie x: logₓ(y) = ln(y)/ln(x)\nGłębokość EML ~29",
      zh: "以 x 為底的對數：logₓ(y) = ln(y)/ln(x)\nEML 深度 ~29"
    }, derivedFrom: ["ln","div"], emlFormula: "ln(y)/ln(x) via EML" },
  { id: "avg", label: "(x+y)/2", category: "algebraic", ring: 2, angle: 460,
    description: {
      en: "Arithmetic mean: (x+y)/2\nDepth ~287 EML compiler / >27 direct",
      pl: "Średnio arytmetyczna: (x+y)/2\nGłębokość ~287 (kompilator EML) / >27 bezpośrednio",
      zh: "算術平均：(x+y)/2\nEML 編譯器深度 ~287 / 直接 >27"
    }, derivedFrom: ["plus","xhalf"], emlFormula: "eml chain, depth ~287" },
  { id: "hypot", label: "√x²+y²", category: "algebraic", ring: 2, angle: 500,
    description: {
      en: "Hypotenuse: √(x²+y²)\nDepth >27 EML expression",
      pl: "Przeciwprostokątna: √(x²+y²)\nGłębokość EML >27",
      zh: "斤边：√(x²+y²)\nEML 深度 >27"
    }, derivedFrom: ["sqr","plus","sqrt"], emlFormula: "eml chain, depth >27" },
  { id: "pi", label: "π", category: "seed", ring: 2, angle: 540,
    description: {
      en: "Pi ≈ 3.14159\nDerived via EML chain (depth ~193 compiler)",
      pl: "Pi ≈ 3.14159\nWyprowadzone przez łańcuch EML (głębokość ~193 kompilator)",
      zh: "圓周率 π ≈ 3.14159\n透過 EML 鏈推導（編譯器深度 ~193）"
    }, derivedFrom: ["ln","neg1"], emlFormula: "eml chain, depth ~193" },
  { id: "sigma", label: "σ", category: "hyperbolic", ring: 2, angle: 570,
    description: {
      en: "Logistic sigmoid: σ(x) = 1/(1+e^−x)\nDerived from exp and inv",
      pl: "Sigmoid logistyczny: σ(x) = 1/(1+e^−x)\nWyprowadzony z exp i odwrotności",
      zh: "邏輯成長曲線：σ(x) = 1/(1+e^−x)\n由 exp 與倒數推導"
    }, derivedFrom: ["exp","inv","plus"], emlFormula: "1/(1+eml(−x,1))" },

  // Ring 3 — Trig and hyperbolic
  { id: "sin", label: "sin", category: "trig", ring: 3, angle: 30,
    description: {
      en: "Sine function: sin(x)\nDerived via complex EML chain using π and i\nRequires complex domain",
      pl: "Sinus: sin(x)\nWyprowadzony przez złożony łańcuch EML z π i i\nWymaga dziedziny zespolonej",
      zh: "正弦函數：sin(x)\n透過使用 π 和 i 的複數 EML 鏈推導\n需要複數域"
    }, derivedFrom: ["exp","pi","neg1"], emlFormula: "Im(eml(ix, 1))" },
  { id: "cos", label: "cos", category: "trig", ring: 3, angle: 70,
    description: {
      en: "Cosine function: cos(x)\nRe(e^(ix)) via EML in complex domain",
      pl: "Cosinus: cos(x)\nRe(e^(ix)) przez EML w dziedzinie zespolonej",
      zh: "餘弦函數：cos(x)\n複數域中 EML 的 Re(e^(ix))"
    }, derivedFrom: ["exp","pi","neg1"], emlFormula: "Re(eml(ix, 1))" },
  { id: "tan", label: "tan", category: "trig", ring: 3, angle: 110,
    description: {
      en: "Tangent: tan(x) = sin(x)/cos(x)\nDerived from sin and cos via EML",
      pl: "Tangens: tan(x) = sin(x)/cos(x)\nWyprowadzony z sin i cos przez EML",
      zh: "正切：tan(x) = sin(x)/cos(x)\n由 sin 與 cos 透過 EML 推導"
    }, derivedFrom: ["sin","cos","div"], emlFormula: "sin/cos via EML" },
  { id: "arcsin", label: "arcsin", category: "trig", ring: 3, angle: 150,
    description: {
      en: "Arcsine: arcsin(x)\nDerived via complex logarithm EML chain",
      pl: "Arcus sinus: arcsin(x)\nWyprowadzony przez złożony logarytm EML",
      zh: "反正弦：arcsin(x)\n透過複數對數 EML 鏈推導"
    }, derivedFrom: ["ln","sqr","minus"], emlFormula: "−i·ln(ix + √(1−x²))" },
  { id: "arccos", label: "arccos", category: "trig", ring: 3, angle: 190,
    description: {
      en: "Arccosine: arccos(x)\nπ/2 − arcsin(x) via EML",
      pl: "Arcus cosinus: arccos(x)\nπ/2 − arcsin(x) przez EML",
      zh: "反餘弦：arccos(x)\nπ/2 − arcsin(x) 透過 EML"
    }, derivedFrom: ["arcsin","pi"], emlFormula: "π/2 − arcsin(x)" },
  { id: "arctan", label: "arctan", category: "trig", ring: 3, angle: 230,
    description: {
      en: "Arctangent: arctan(x)\nDerived via complex logarithm",
      pl: "Arcus tangens: arctan(x)\nWyprowadzony przez logarytm zespolony",
      zh: "反正切：arctan(x)\n透過複數對數推導"
    }, derivedFrom: ["ln","neg1"], emlFormula: "−i/2·ln((1+ix)/(1−ix))" },
  { id: "sinh", label: "sinh", category: "hyperbolic", ring: 3, angle: 270,
    description: {
      en: "Hyperbolic sine: sinh(x) = (e^x − e^−x)/2\nDirectly from exp via EML",
      pl: "Sinus hiperboliczny: sinh(x) = (e^x − e^−x)/2\nBezpośrednio z exp przez EML",
      zh: "雙曲正弦：sinh(x) = (e^x − e^−x)/2\n直接由 EML 的 exp 推導"
    }, derivedFrom: ["exp","minus","xhalf"], emlFormula: "(eml(x,1)−eml(−x,1))/2" },
  { id: "cosh", label: "cosh", category: "hyperbolic", ring: 3, angle: 310,
    description: {
      en: "Hyperbolic cosine: cosh(x) = (e^x + e^−x)/2\nFrom exp via EML",
      pl: "Cosinus hiperboliczny: cosh(x) = (e^x + e^−x)/2\nZ exp przez EML",
      zh: "雙曲餘弦：cosh(x) = (e^x + e^−x)/2\n由 EML 的 exp 推導"
    }, derivedFrom: ["exp","plus","xhalf"], emlFormula: "(eml(x,1)+eml(−x,1))/2" },
  { id: "tanh", label: "tanh", category: "hyperbolic", ring: 3, angle: 350,
    description: {
      en: "Hyperbolic tangent: tanh(x) = sinh/cosh\nFrom sinh and cosh",
      pl: "Tangens hiperboliczny: tanh(x) = sinh/cosh\nZ sinh i cosh",
      zh: "雙曲正切：tanh(x) = sinh/cosh\n由 sinh 與 cosh 推導"
    }, derivedFrom: ["sinh","cosh","div"], emlFormula: "sinh(x)/cosh(x)" },
  { id: "arsinh", label: "arsinh", category: "hyperbolic", ring: 3, angle: 390,
    description: {
      en: "Inverse hyperbolic sine: arsinh(x) = ln(x + √(x²+1))\nFrom ln via EML",
      pl: "Odwrotny sinus hiperboliczny: arsinh(x) = ln(x + √(x²+1))\nZ ln przez EML",
      zh: "反雙曲正弦：arsinh(x) = ln(x + √(x²+1))\n由 EML 的 ln 推導"
    }, derivedFrom: ["ln","sqr","plus","sqrt"], emlFormula: "ln(x + √(x²+1))" },
  { id: "arcosh", label: "arcosh", category: "hyperbolic", ring: 3, angle: 430,
    description: {
      en: "Inverse hyperbolic cosine: arcosh(x) = ln(x + √(x²−1))\nFrom ln via EML",
      pl: "Odwrotny cosinus hiperboliczny: arcosh(x) = ln(x + √(x²−1))\nZ ln przez EML",
      zh: "反雙曲餘弦：arcosh(x) = ln(x + √(x²−1))\n由 EML 的 ln 推導"
    }, derivedFrom: ["ln","sqr","minus","sqrt"], emlFormula: "ln(x + √(x²−1))" },
  { id: "artanh", label: "artanh", category: "hyperbolic", ring: 3, angle: 470,
    description: {
      en: "Inverse hyperbolic tangent: artanh(x) = ln((1+x)/(1−x))/2\nFrom ln",
      pl: "Odwrotny tangens hiperboliczny: artanh(x) = ln((1+x)/(1−x))/2\nZ ln",
      zh: "反雙曲正切：artanh(x) = ln((1+x)/(1−x))/2\n由 ln 推導"
    }, derivedFrom: ["ln","plus","minus","xhalf"], emlFormula: "ln((1+x)/(1−x))/2" },
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

// Bootstrap order: eml → seeds → algebraic ring1 → algebraic ring2 → trig → hyperbolic
const BOOTSTRAP_ORDER = [
  "eml", "one", "e", "exp", "ln", "neg1", "two",
  "minus", "plus", "times", "inv", "negx", "sqr", "div", "xhalf", "pow",
  "sqrt", "logxy", "avg", "hypot", "pi", "sigma",
  "sin", "cos", "tan", "arcsin", "arccos", "arctan",
  "sinh", "cosh", "tanh", "arsinh", "arcosh", "artanh",
];

interface EmlSpiralProps { lang?: Lang; }

export default function EmlSpiral({ lang = "en" }: EmlSpiralProps) {
  const tr = useCallback((key: Parameters<typeof t>[1]) => t(lang, key), [lang]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 500, height: 500 });
  const [selected, setSelected] = useState<Node | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [revealedCount, setRevealedCount] = useState(BOOTSTRAP_ORDER.length);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAnimation = useCallback(() => {
    if (animRef.current) clearInterval(animRef.current);
    setRevealedCount(0);
    setAnimating(true);
    let count = 0;
    animRef.current = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= BOOTSTRAP_ORDER.length) {
        clearInterval(animRef.current!);
        setAnimating(false);
      }
    }, 220);
  }, []);

  useEffect(() => () => { if (animRef.current) clearInterval(animRef.current); }, []);

  const revealedSet = new Set(BOOTSTRAP_ORDER.slice(0, revealedCount));

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
      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {([
            { cat: null, label: { en: "ALL", pl: "WSZYSTKIE", zh: "全部" }[lang] ?? "ALL" },
            { cat: "seed", label: { en: "CONSTANTS", pl: "STAŁE", zh: "常數" }[lang] ?? "CONSTANTS" },
            { cat: "algebraic", label: { en: "ALGEBRAIC", pl: "ALGEBRAICZNE", zh: "代數" }[lang] ?? "ALGEBRAIC" },
            { cat: "trig", label: { en: "TRIG", pl: "TRYG", zh: "三角" }[lang] ?? "TRIG" },
            { cat: "hyperbolic", label: { en: "HYPERBOLIC", pl: "HIPERBOL", zh: "雙曲" }[lang] ?? "HYPERBOLIC" },
          ] as { cat: string | null; label: string }[]).map(({ cat, label }) => {
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
        <button
          onClick={startAnimation}
          disabled={animating}
          className={`px-3 py-1 text-[10px] font-medium border tracking-widest transition-all ${
            animating
              ? "border-rose-700/40 text-rose-600 cursor-not-allowed"
              : "border-rose-600/60 text-rose-400 hover:bg-rose-900/20 active:scale-95"
          }`}
        >
          {animating ? `${{ en: "● REPLAYING", pl: "● ODTWARZANIE", zh: "● 重播中" }[lang] ?? "● REPLAYING"}… (${revealedCount}/${BOOTSTRAP_ORDER.length})` : tr("treeReplay")}
        </button>
      </div>
      {/* Legend / filter (hidden — merged above) */}
      <div className="hidden">
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
          const isRevealed = revealedSet.has(node.id);
          const isJustRevealed = BOOTSTRAP_ORDER[revealedCount - 1] === node.id;

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer"
              onClick={() => setSelected(s => s?.id === node.id ? null : node)}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                opacity: !isRevealed ? 0 : highlighted ? 1 : 0.2,
                transition: "opacity 0.3s",
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${isJustRevealed ? 1.4 : 1})`,
              }}
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
              <span className="text-slate-500 text-[10px] ml-2 tracking-widest uppercase">
              {({
                eml: { en: "EML", pl: "EML", zh: "EML" },
                seed: { en: "CONSTANT", pl: "STAŁA", zh: "常數" },
                algebraic: { en: "ALGEBRAIC", pl: "ALGEBRAICZNE", zh: "代數" },
                trig: { en: "TRIGONOMETRIC", pl: "TRYGONOMETRYCZNE", zh: "三角函數" },
                hyperbolic: { en: "HYPERBOLIC", pl: "HIPERBOLICZNE", zh: "雙曲函數" },
              } as Record<string, Record<string, string>>)[selected.category]?.[lang] ?? selected.category.toUpperCase()}
            </span>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-300 text-lg leading-none">×</button>
          </div>
          {selected.emlFormula && (
            <div className="font-mono-display text-emerald-400 mt-1 text-[11px]">{selected.emlFormula}</div>
          )}
          <div className="text-slate-400 mt-1 whitespace-pre-line">{selected.description[lang]}</div>
          {selected.derivedFrom.length > 0 && (
            <div className="mt-1 text-[10px] text-slate-600">
              {{ en: "Derived from", pl: "Wyprowadzone z", zh: "推導自" }[lang] ?? "Derived from"}: {selected.derivedFrom.map(id => NODES.find(n => n.id === id)?.label || id).join(", ")}
            </div>
          )}
        </div>
      )}
      {!selected && (
        <div className="mt-1 text-[10px] text-slate-600 text-center">{tr("treeClickNode")}</div>
      )}
    </div>
  );
}
