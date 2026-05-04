/*
 * ALU Calculator — Enhanced Home Page
 * Design: Terminal Hacker — Dark flat with neon green/cyan accents
 * New features:
 *   - Mantissa/Exponent IEEE-754 float breakdown panel
 *   - EML Explorer: eml(x,y) = exp(x) - ln(y), the NAND-equivalent for continuous math
 *   - Base-e float representation: m × e^n
 * Sources:
 *   - Odrzywołek, A. (2026). All elementary functions from a single binary operator. arXiv:2603.21852
 *   - https://monkfrom.earth/blogs/eml-operator-math-nand-gate
 */

import { useState, useEffect, useCallback } from "react";
import { Calculator, Cpu, RotateCcw, Delete, FlaskConical, Binary } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "standard" | "alu" | "eml" | "float";
type AluOp = "AND" | "OR" | "XOR" | "NOT" | "SHL" | "SHR" | "NAND" | "NOR";

// ─── IEEE-754 Float Utilities ─────────────────────────────────────────────────

function getFloat32Parts(value: number): {
  sign: number;
  exponentBits: string;
  mantissaBits: string;
  exponentValue: number;
  mantissaValue: number;
  biasedExponent: number;
  isSpecial: boolean;
  specialLabel: string;
} {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setFloat32(0, value, false);
  const bits = view.getUint32(0, false);

  const sign = (bits >>> 31) & 1;
  const exponentRaw = (bits >>> 23) & 0xff;
  const mantissaRaw = bits & 0x7fffff;

  const exponentBits = exponentRaw.toString(2).padStart(8, "0");
  const mantissaBits = mantissaRaw.toString(2).padStart(23, "0");

  const biasedExponent = exponentRaw;
  const exponentValue = exponentRaw - 127;
  const mantissaValue = 1 + mantissaRaw / Math.pow(2, 23);

  let isSpecial = false;
  let specialLabel = "";
  if (exponentRaw === 0xff) {
    isSpecial = true;
    specialLabel = mantissaRaw !== 0 ? "NaN" : sign ? "-∞" : "+∞";
  } else if (exponentRaw === 0 && mantissaRaw === 0) {
    isSpecial = true;
    specialLabel = sign ? "-0" : "+0";
  }

  return { sign, exponentBits, mantissaBits, exponentValue, mantissaValue, biasedExponent, isSpecial, specialLabel };
}

function getFloat64Parts(value: number): {
  sign: number;
  exponentBits: string;
  mantissaBits: string;
  exponentValue: number;
  biasedExponent: number;
} {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setFloat64(0, value, false);
  const hi = view.getUint32(0, false);
  const lo = view.getUint32(4, false);

  const sign = (hi >>> 31) & 1;
  const exponentRaw = (hi >>> 20) & 0x7ff;
  const mantissaHi = hi & 0xfffff;

  const exponentBits = exponentRaw.toString(2).padStart(11, "0");
  const mantissaBits = mantissaHi.toString(2).padStart(20, "0") + lo.toString(2).padStart(32, "0");

  return {
    sign,
    exponentBits,
    mantissaBits,
    exponentValue: exponentRaw - 1023,
    biasedExponent: exponentRaw,
  };
}

// ─── Base-e Float Utilities ───────────────────────────────────────────────────

// Represent x as m × e^n where n = floor(ln|x|), m = x / e^n
// This is the "natural float" representation using base e
function toBaseE(value: number): { mantissa: number; exponent: number; repr: string } {
  if (!isFinite(value) || value === 0) {
    return { mantissa: value, exponent: 0, repr: value === 0 ? "0 × e⁰" : String(value) };
  }
  const absVal = Math.abs(value);
  const n = Math.floor(Math.log(absVal)); // floor(ln|x|)
  const m = value / Math.exp(n);          // m = x / e^n
  const sign = value < 0 ? "−" : "";
  const mStr = Math.abs(m).toFixed(6);
  const expStr = n >= 0 ? `e^${n}` : `e^(${n})`;
  return {
    mantissa: m,
    exponent: n,
    repr: `${sign}${mStr} × ${expStr}`,
  };
}

// ─── EML Utilities ────────────────────────────────────────────────────────────

// Core EML operator: eml(x, y) = exp(x) - ln(y)
// Source: Odrzywołek (2026), arXiv:2603.21852
function eml(x: number, y: number): number {
  return Math.exp(x) - Math.log(y);
}

// Key EML identities derived from the paper:
// e = eml(1, 1)                         depth 1
// e^x = eml(x, 1)                       depth 1
// ln(x) = eml(1, eml(eml(1,x), 1))     depth 3 (eq. 5)
// x + y = ln(e^x * e^y) = eml(1, eml(eml(x,1), eml(y,1)))  via log-sum
// x * y = e^(ln x + ln y)
// x - y = eml(ln(x), e^y)  — direct from definition
// x / y = e^(ln x - ln y)

function emlDerived(op: string, x: number, y: number): { result: number; steps: string[] } {
  const steps: string[] = [];
  let result = NaN;

  switch (op) {
    case "e^x": {
      result = eml(x, 1);
      steps.push(`eml(x, 1) = exp(x) − ln(1) = exp(x) − 0 = e^x`);
      steps.push(`= e^${x.toFixed(4)} = ${result.toFixed(6)}`);
      break;
    }
    case "ln(x)": {
      if (x <= 0) { steps.push("ln(x) undefined for x ≤ 0"); result = NaN; break; }
      // ln(x) = eml(1, eml(eml(1, x), 1))
      const inner1 = eml(1, x);          // exp(1) - ln(x) = e - ln(x)
      const inner2 = eml(inner1, 1);     // exp(e - ln(x)) - ln(1) = exp(e - ln(x))
      result = eml(1, inner2);           // exp(1) - ln(inner2)
      steps.push(`Step 1: eml(1, x) = e − ln(x) = ${inner1.toFixed(6)}`);
      steps.push(`Step 2: eml(step1, 1) = exp(step1) = ${inner2.toFixed(6)}`);
      steps.push(`Step 3: eml(1, step2) = e − ln(step2) = ${result.toFixed(6)}`);
      steps.push(`ln(${x}) ≈ ${Math.log(x).toFixed(6)} (verify)`);
      break;
    }
    case "x + y": {
      // x + y = ln(e^x · e^y) = eml(1, eml(eml(x,1), eml(y,1)))
      // Simpler: use ln(e^x + e^y) approach via eml
      // Direct: x + y = eml(ln(eml(x,1) + eml(y,1)), 1) — but this uses +
      // Paper approach: x+y = eml(1, e^(-(x+y))) but that's circular
      // We use: x + y = ln(e^x * e^y) = ln(eml(x,1) * eml(y,1))
      const ex = eml(x, 1);   // e^x
      const ey = eml(y, 1);   // e^y
      result = Math.log(ex * ey); // ln(e^x * e^y) = x + y
      steps.push(`e^x = eml(x, 1) = ${ex.toFixed(6)}`);
      steps.push(`e^y = eml(y, 1) = ${ey.toFixed(6)}`);
      steps.push(`x + y = ln(e^x × e^y) = ln(${(ex * ey).toFixed(6)}) = ${result.toFixed(6)}`);
      break;
    }
    case "x × y": {
      if (x <= 0 || y <= 0) {
        result = x * y;
        steps.push("Note: EML multiplication via ln requires positive inputs");
        steps.push(`Direct result: ${result}`);
        break;
      }
      // x * y = e^(ln x + ln y) = eml(ln(x) + ln(y), 1)
      const lnx = Math.log(x);
      const lny = Math.log(y);
      result = eml(lnx + lny, 1); // exp(ln x + ln y) - ln(1) = x*y
      steps.push(`ln(x) = ${lnx.toFixed(6)}`);
      steps.push(`ln(y) = ${lny.toFixed(6)}`);
      steps.push(`x × y = eml(ln x + ln y, 1) = exp(${(lnx + lny).toFixed(6)}) = ${result.toFixed(6)}`);
      break;
    }
    case "x − y": {
      // x - y = eml(ln(x), e^y) when x > 0
      // eml(ln x, e^y) = exp(ln x) - ln(e^y) = x - y
      if (x > 0) {
        const lnx2 = Math.log(x);
        const ey2 = Math.exp(y);
        result = eml(lnx2, ey2);
        steps.push(`ln(x) = ln(${x}) = ${lnx2.toFixed(6)}`);
        steps.push(`e^y = e^(${y}) = ${ey2.toFixed(6)}`);
        steps.push(`x − y = eml(ln x, e^y) = exp(ln x) − ln(e^y) = x − y = ${result.toFixed(6)}`);
      } else {
        result = x - y;
        steps.push("Note: EML subtraction via ln requires x > 0");
        steps.push(`Direct result: ${result}`);
      }
      break;
    }
    case "x / y": {
      if (x <= 0 || y <= 0) {
        result = x / y;
        steps.push("Note: EML division via ln requires positive inputs");
        steps.push(`Direct result: ${result}`);
        break;
      }
      // x / y = e^(ln x - ln y) = eml(ln x - ln y, 1)
      const lnxd = Math.log(x);
      const lnyd = Math.log(y);
      result = eml(lnxd - lnyd, 1);
      steps.push(`ln(x) = ${lnxd.toFixed(6)}`);
      steps.push(`ln(y) = ${lnyd.toFixed(6)}`);
      steps.push(`x / y = eml(ln x − ln y, 1) = exp(${(lnxd - lnyd).toFixed(6)}) = ${result.toFixed(6)}`);
      break;
    }
    case "x^y": {
      if (x <= 0) {
        result = Math.pow(x, y);
        steps.push("Note: EML power via ln requires x > 0");
        steps.push(`Direct result: ${result}`);
        break;
      }
      // x^y = e^(y * ln x) = eml(y * ln(x), 1)
      const lnxp = Math.log(x);
      result = eml(y * lnxp, 1);
      steps.push(`ln(x) = ${lnxp.toFixed(6)}`);
      steps.push(`y × ln(x) = ${(y * lnxp).toFixed(6)}`);
      steps.push(`x^y = eml(y·ln x, 1) = exp(y·ln x) = ${result.toFixed(6)}`);
      break;
    }
    default:
      result = NaN;
  }

  return { result, steps };
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function toSafeInt(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.trunc(n);
}

function toBinary(n: number): string {
  if (n < 0) return (n >>> 0).toString(2).slice(-16).padStart(16, "0");
  return n.toString(2).padStart(16, "0");
}

function toHex(n: number): string {
  if (n < 0) return (n >>> 0).toString(16).toUpperCase().padStart(4, "0");
  return n.toString(16).toUpperCase().padStart(4, "0");
}

function formatDisplay(val: string): string {
  if (val === "Error") return "Error";
  if (val.includes(".")) {
    const parts = val.split(".");
    return Number(parts[0]).toLocaleString() + "." + parts[1];
  }
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (Math.abs(n) > 1e15) return n.toExponential(6);
  return n.toLocaleString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BitGrid({ value }: { value: number }) {
  const bits = toBinary(value).split("");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 flex-wrap">
        {bits.map((bit, i) => (
          <span
            key={i}
            className={`
              font-mono-display text-xs w-5 h-5 flex items-center justify-center
              border transition-all duration-150
              ${bit === "1"
                ? "border-emerald-400 text-emerald-400 bg-emerald-400/10"
                : "border-slate-600 text-slate-600 bg-transparent"
              }
              ${i === 7 ? "mr-2" : ""}
            `}
          >
            {bit}
          </span>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className={`font-mono-display text-[9px] w-5 text-center text-slate-600 ${i === 7 ? "mr-2" : ""}`}
          >
            {15 - i}
          </span>
        ))}
      </div>
    </div>
  );
}

// IEEE-754 bit field display
function Float32BitField({ value }: { value: number }) {
  const { sign, exponentBits, mantissaBits, exponentValue, mantissaValue, biasedExponent, isSpecial, specialLabel } = getFloat32Parts(value);
  const allBits = String(sign) + exponentBits + mantissaBits;

  return (
    <div className="space-y-2">
      {/* Bit layout */}
      <div className="flex gap-0.5 flex-wrap">
        {/* Sign bit */}
        <div className="flex flex-col items-center">
          <span className={`font-mono-display text-xs w-5 h-5 flex items-center justify-center border ${sign ? "border-red-500 text-red-400 bg-red-500/10" : "border-slate-600 text-slate-500"}`}>
            {sign}
          </span>
          <span className="text-[8px] text-red-400 mt-0.5">S</span>
        </div>
        <div className="w-px bg-slate-600 mx-0.5" />
        {/* Exponent bits */}
        {exponentBits.split("").map((b, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className={`font-mono-display text-xs w-5 h-5 flex items-center justify-center border ${b === "1" ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-slate-600 text-slate-600"}`}>
              {b}
            </span>
            {i === 0 && <span className="text-[8px] text-amber-400 mt-0.5">E</span>}
            {i > 0 && <span className="text-[8px] text-slate-700 mt-0.5">&nbsp;</span>}
          </div>
        ))}
        <div className="w-px bg-slate-600 mx-0.5" />
        {/* Mantissa bits */}
        {mantissaBits.split("").map((b, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className={`font-mono-display text-xs w-5 h-5 flex items-center justify-center border ${b === "1" ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-slate-600 text-slate-600"}`}>
              {b}
            </span>
            {i === 0 && <span className="text-[8px] text-cyan-400 mt-0.5">M</span>}
            {i > 0 && <span className="text-[8px] text-slate-700 mt-0.5">&nbsp;</span>}
          </div>
        ))}
      </div>

      {/* Breakdown table */}
      <div className="grid grid-cols-3 gap-1 text-xs mt-2">
        <div className="border border-red-500/30 bg-red-500/5 p-2">
          <div className="text-[10px] text-red-400 tracking-widest mb-1">SIGN</div>
          <div className="font-mono-display text-red-300">{sign === 0 ? "+1" : "−1"}</div>
          <div className="text-[10px] text-slate-600">bit 31</div>
        </div>
        <div className="border border-amber-500/30 bg-amber-500/5 p-2">
          <div className="text-[10px] text-amber-400 tracking-widest mb-1">EXPONENT</div>
          <div className="font-mono-display text-amber-300">
            {isSpecial ? specialLabel : `2^${exponentValue}`}
          </div>
          <div className="text-[10px] text-slate-600">bias={biasedExponent} (−127)</div>
        </div>
        <div className="border border-cyan-500/30 bg-cyan-500/5 p-2">
          <div className="text-[10px] text-cyan-400 tracking-widest mb-1">MANTISSA</div>
          <div className="font-mono-display text-cyan-300">
            {isSpecial ? "—" : `1.${mantissaValue.toFixed(6).split(".")[1]}`}
          </div>
          <div className="text-[10px] text-slate-600">bits 22–0</div>
        </div>
      </div>

      {/* Formula */}
      {!isSpecial && (
        <div className="border border-emerald-700/30 bg-emerald-900/10 p-2 text-xs">
          <span className="text-slate-500 text-[10px]">VALUE = </span>
          <span className="font-mono-display text-emerald-400">
            {sign === 0 ? "+" : "−"}{mantissaValue.toFixed(6)} × 2^{exponentValue}
          </span>
          <span className="text-slate-500 text-[10px] ml-2">≈ {value.toPrecision(7)}</span>
        </div>
      )}

      {/* Base-e representation */}
      <div className="border border-slate-700 bg-slate-800/40 p-2 text-xs">
        <span className="text-slate-500 text-[10px]">BASE-e = </span>
        <span className="font-mono-display text-emerald-300">{toBaseE(value).repr}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [mode, setMode] = useState<Mode>("standard");
  const [aluA, setAluA] = useState("0");
  const [aluB, setAluB] = useState("0");
  const [aluResult, setAluResult] = useState<string | null>(null);
  const [aluOp, setAluOp] = useState<AluOp | null>(null);
  const [aluInputFocus, setAluInputFocus] = useState<"A" | "B">("A");
  const [history, setHistory] = useState<string[]>([]);
  const [expression, setExpression] = useState("");

  // EML state
  const [emlX, setEmlX] = useState("1");
  const [emlY, setEmlY] = useState("1");
  const [emlOp, setEmlOp] = useState("e^x");
  const [emlResult, setEmlResult] = useState<{ result: number; steps: string[] } | null>(null);
  const [emlDirectResult, setEmlDirectResult] = useState<number | null>(null);

  // Float state
  const [floatInput, setFloatInput] = useState("3.14159265");
  const [floatPrecision, setFloatPrecision] = useState<"32" | "64">("32");

  // ── Standard Calculator Logic ──────────────────────────────────────────────

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(prev => prev === "0" ? digit : prev.length >= 15 ? prev : prev + digit);
    }
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) setDisplay(prev => prev + ".");
  }, [display, waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression("");
  }, []);

  const clearEntry = useCallback(() => setDisplay("0"), []);

  const toggleSign = useCallback(() => {
    setDisplay(prev => {
      const n = parseFloat(prev);
      return isNaN(n) ? prev : String(-n);
    });
  }, []);

  const percentage = useCallback(() => {
    setDisplay(prev => {
      const n = parseFloat(prev);
      return isNaN(n) ? prev : String(n / 100);
    });
  }, []);

  const backspace = useCallback(() => {
    if (display.length > 1) setDisplay(prev => prev.slice(0, -1));
    else setDisplay("0");
  }, [display]);

  const handleOperator = useCallback((op: string) => {
    const current = parseFloat(display);
    if (prevValue !== null && !waitingForOperand) {
      const prev = parseFloat(prevValue);
      let result: number;
      switch (operator) {
        case "+": result = prev + current; break;
        case "−": result = prev - current; break;
        case "×": result = prev * current; break;
        case "÷": result = current === 0 ? NaN : prev / current; break;
        case "MOD": result = current === 0 ? NaN : prev % current; break;
        default: result = current;
      }
      const resultStr = isNaN(result) ? "Error" : String(result);
      setDisplay(resultStr);
      setPrevValue(resultStr);
      setExpression(`${prev} ${operator} ${current} ${op}`);
    } else {
      setPrevValue(display);
      setExpression(`${display} ${op}`);
    }
    setOperator(op);
    setWaitingForOperand(true);
  }, [display, prevValue, operator, waitingForOperand]);

  const calculate = useCallback(() => {
    if (!operator || prevValue === null) return;
    const current = parseFloat(display);
    const prev = parseFloat(prevValue);
    let result: number;
    switch (operator) {
      case "+": result = prev + current; break;
      case "−": result = prev - current; break;
      case "×": result = prev * current; break;
      case "÷": result = current === 0 ? NaN : prev / current; break;
      case "MOD": result = current === 0 ? NaN : prev % current; break;
      default: result = current;
    }
    const resultStr = isNaN(result) ? "Error" : String(result);
    const entry = `${prevValue} ${operator} ${display} = ${resultStr}`;
    setHistory(h => [entry, ...h.slice(0, 9)]);
    setDisplay(resultStr);
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
    setExpression(entry);
  }, [display, prevValue, operator]);

  const specialFn = useCallback((fn: string) => {
    const n = parseFloat(display);
    let result: number;
    switch (fn) {
      case "√": result = Math.sqrt(n); break;
      case "x²": result = n * n; break;
      case "1/x": result = n === 0 ? NaN : 1 / n; break;
      case "log": result = n <= 0 ? NaN : Math.log10(n); break;
      case "ln": result = n <= 0 ? NaN : Math.log(n); break;
      default: result = n;
    }
    const resultStr = isNaN(result) ? "Error" : String(result);
    setHistory(h => [`${fn}(${n}) = ${resultStr}`, ...h.slice(0, 9)]);
    setDisplay(resultStr);
    setWaitingForOperand(true);
    setExpression(`${fn}(${n}) = ${resultStr}`);
  }, [display]);

  // ── ALU Logic ──────────────────────────────────────────────────────────────

  const performAlu = useCallback((op: AluOp) => {
    const a = toSafeInt(aluA);
    const b = toSafeInt(aluB);
    let result: number;
    switch (op) {
      case "AND":  result = a & b; break;
      case "OR":   result = a | b; break;
      case "XOR":  result = a ^ b; break;
      case "NOT":  result = ~a; break;
      case "NAND": result = ~(a & b); break;
      case "NOR":  result = ~(a | b); break;
      case "SHL":  result = a << (b & 0x1f); break;
      case "SHR":  result = a >> (b & 0x1f); break;
      default:     result = 0;
    }
    setAluOp(op);
    setAluResult(String(result));
    const entry = op === "NOT" ? `NOT(${a}) = ${result}` : `${a} ${op} ${b} = ${result}`;
    setHistory(h => [entry, ...h.slice(0, 9)]);
  }, [aluA, aluB]);

  const aluInputDigit = useCallback((digit: string) => {
    const setter = aluInputFocus === "A" ? setAluA : setAluB;
    setter(prev => {
      if (prev === "0") return digit;
      if (prev.length >= 10) return prev;
      return prev + digit;
    });
    setAluResult(null);
  }, [aluInputFocus]);

  const aluBackspace = useCallback(() => {
    const setter = aluInputFocus === "A" ? setAluA : setAluB;
    setter(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
    setAluResult(null);
  }, [aluInputFocus]);

  const aluClear = useCallback(() => {
    setAluA("0"); setAluB("0"); setAluResult(null); setAluOp(null);
  }, []);

  // ── EML Logic ──────────────────────────────────────────────────────────────

  const computeEml = useCallback(() => {
    const x = parseFloat(emlX);
    const y = parseFloat(emlY);
    if (isNaN(x) || isNaN(y)) return;
    // Direct EML computation
    const direct = eml(x, y);
    setEmlDirectResult(direct);
    // Derived operation
    const derived = emlDerived(emlOp, x, y);
    setEmlResult(derived);
  }, [emlX, emlY, emlOp]);

  // ── Keyboard Support ───────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mode === "standard") {
        if (e.key >= "0" && e.key <= "9") inputDigit(e.key);
        else if (e.key === ".") inputDecimal();
        else if (e.key === "+") handleOperator("+");
        else if (e.key === "-") handleOperator("−");
        else if (e.key === "*") handleOperator("×");
        else if (e.key === "/") { e.preventDefault(); handleOperator("÷"); }
        else if (e.key === "Enter" || e.key === "=") calculate();
        else if (e.key === "Backspace") backspace();
        else if (e.key === "Escape") clearAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, inputDigit, inputDecimal, handleOperator, calculate, backspace, clearAll]);

  // ── Derived display values ─────────────────────────────────────────────────

  const safeInt = toSafeInt(display);
  const displayHex = toHex(safeInt);
  const aluAInt = toSafeInt(aluA);
  const aluBInt = toSafeInt(aluB);
  const aluResultInt = aluResult !== null ? toSafeInt(aluResult) : null;
  const floatVal = parseFloat(floatInput) || 0;
  const float32 = getFloat32Parts(floatVal);
  const float64 = getFloat64Parts(floatVal);
  const baseERepr = toBaseE(floatVal);

  // ── Mode tabs ──────────────────────────────────────────────────────────────

  const tabs: { id: Mode; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "standard", label: "CALC", icon: <Calculator className="w-3.5 h-3.5" />, color: "emerald" },
    { id: "alu", label: "ALU", icon: <Cpu className="w-3.5 h-3.5" />, color: "cyan" },
    { id: "eml", label: "EML", icon: <FlaskConical className="w-3.5 h-3.5" />, color: "violet" },
    { id: "float", label: "FLOAT", icon: <Binary className="w-3.5 h-3.5" />, color: "amber" },
  ];

  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500 text-emerald-400 bg-emerald-500/10",
    cyan: "border-cyan-500 text-cyan-400 bg-cyan-500/10",
    violet: "border-violet-500 text-violet-400 bg-violet-500/10",
    amber: "border-amber-500 text-amber-400 bg-amber-500/10",
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-border px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span className="font-mono-display text-emerald-400 font-semibold tracking-wider text-xs">
            ALU CALCULATOR
          </span>
          <span className="text-slate-600 text-[10px] font-mono-display">v2.0 · EML+FLOAT</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`
                flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border transition-all duration-150
                ${mode === tab.id
                  ? colorMap[tab.color]
                  : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">

        {/* ── Standard Calculator ── */}
        {mode === "standard" && (
          <div className="flex flex-col">
            {/* Display */}
            <div className="relative border-b border-border bg-slate-900/80 px-4 pt-3 pb-3">
              <div className="font-mono-display text-xs text-slate-500 h-5 text-right truncate mb-1">
                {expression || "\u00A0"}
              </div>
              <div className="font-mono-display text-4xl font-bold text-right text-emerald-400 truncate leading-tight min-h-[2.5rem]">
                {formatDisplay(display)}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 tracking-widest">BIN</span>
                  <span className="font-mono-display text-[11px] text-slate-400 tracking-wider">
                    {display === "Error" ? "────────────────" : toBinary(safeInt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 tracking-widest">HEX</span>
                  <span className="font-mono-display text-[11px] text-cyan-400 tracking-wider">
                    {display === "Error" ? "────" : `0x${displayHex}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 tracking-widest">BASE-e</span>
                  <span className="font-mono-display text-[11px] text-amber-400 tracking-wider">
                    {display === "Error" ? "—" : toBaseE(parseFloat(display) || 0).repr}
                  </span>
                </div>
              </div>
            </div>
            {/* Bit Grid */}
            <div className="px-4 py-3 border-b border-border bg-slate-900/40">
              <BitGrid value={display === "Error" ? 0 : safeInt} />
            </div>
            {/* Keypad */}
            <div className="p-3 grid grid-cols-4 gap-1.5">
              {[
                { label: "√", v: "action", fn: () => specialFn("√") },
                { label: "x²", v: "action", fn: () => specialFn("x²") },
                { label: "log", v: "action", fn: () => specialFn("log") },
                { label: "ln", v: "action", fn: () => specialFn("ln") },
                { label: "AC", v: "action", fn: clearAll },
                { label: "CE", v: "action", fn: clearEntry },
                { label: "⌫", v: "action", fn: backspace },
                { label: "÷", v: "operator", fn: () => handleOperator("÷") },
                { label: "7", v: "number", fn: () => inputDigit("7") },
                { label: "8", v: "number", fn: () => inputDigit("8") },
                { label: "9", v: "number", fn: () => inputDigit("9") },
                { label: "×", v: "operator", fn: () => handleOperator("×") },
                { label: "4", v: "number", fn: () => inputDigit("4") },
                { label: "5", v: "number", fn: () => inputDigit("5") },
                { label: "6", v: "number", fn: () => inputDigit("6") },
                { label: "−", v: "operator", fn: () => handleOperator("−") },
                { label: "1", v: "number", fn: () => inputDigit("1") },
                { label: "2", v: "number", fn: () => inputDigit("2") },
                { label: "3", v: "number", fn: () => inputDigit("3") },
                { label: "+", v: "operator", fn: () => handleOperator("+") },
                { label: "+/−", v: "action", fn: toggleSign },
                { label: "0", v: "number", fn: () => inputDigit("0") },
                { label: ".", v: "number", fn: inputDecimal },
                { label: "=", v: "equals", fn: calculate },
                { label: "%", v: "action", fn: percentage },
                { label: "1/x", v: "action", fn: () => specialFn("1/x") },
                { label: "MOD", v: "operator", fn: () => handleOperator("MOD") },
                { label: "CLR", v: "action", fn: clearAll },
              ].map(({ label, v, fn }, i) => {
                const styles: Record<string, string> = {
                  number: "bg-slate-800/60 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500",
                  operator: "bg-slate-800/40 border-cyan-700/60 text-cyan-400 hover:bg-cyan-900/30 hover:border-cyan-500",
                  action: "bg-slate-800/40 border-slate-500/60 text-slate-400 hover:bg-slate-700/60 hover:border-slate-400",
                  equals: "bg-emerald-600/20 border-emerald-500 text-emerald-400 hover:bg-emerald-600/40",
                };
                return (
                  <button
                    key={i}
                    onClick={fn}
                    className={`h-11 font-mono-display text-sm border transition-all duration-150 active:scale-95 ${styles[v]}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ALU Panel ── */}
        {mode === "alu" && (
          <div className="flex flex-col">
            {/* ALU Display */}
            <div className="border-b border-border bg-slate-900/80 p-4">
              <div className="text-[10px] text-slate-600 tracking-widest mb-2">ARITHMETIC LOGIC UNIT</div>
              <div
                className={`flex items-center justify-between p-2 border mb-1 cursor-pointer transition-all duration-150 ${aluInputFocus === "A" ? "border-cyan-500 bg-cyan-500/5" : "border-slate-700 hover:border-slate-500"}`}
                onClick={() => setAluInputFocus("A")}
              >
                <span className="text-[10px] text-slate-500 tracking-widest">A</span>
                <span className="font-mono-display text-xl text-cyan-400">{aluInputFocus === "A" ? aluA + "▌" : aluA}</span>
                <span className="font-mono-display text-[10px] text-slate-500">{`0x${toHex(aluAInt)}`}</span>
              </div>
              <div
                className={`flex items-center justify-between p-2 border mb-3 cursor-pointer transition-all duration-150 ${aluInputFocus === "B" ? "border-cyan-500 bg-cyan-500/5" : "border-slate-700 hover:border-slate-500"}`}
                onClick={() => setAluInputFocus("B")}
              >
                <span className="text-[10px] text-slate-500 tracking-widest">B</span>
                <span className="font-mono-display text-xl text-cyan-400">{aluInputFocus === "B" ? aluB + "▌" : aluB}</span>
                <span className="font-mono-display text-[10px] text-slate-500">{`0x${toHex(aluBInt)}`}</span>
              </div>
              <div className="flex items-center justify-between p-2 border border-emerald-700/40 bg-emerald-900/10">
                <span className="text-[10px] text-slate-500 tracking-widest">{aluOp ? `OUT (${aluOp})` : "OUT"}</span>
                <span className="font-mono-display text-2xl font-bold text-emerald-400">{aluResult !== null ? aluResult : "—"}</span>
                <span className="font-mono-display text-[10px] text-slate-500">{aluResultInt !== null ? `0x${toHex(aluResultInt)}` : "0x——"}</span>
              </div>
            </div>
            {aluResult !== null && (
              <div className="px-4 py-3 border-b border-border bg-slate-900/40">
                <div className="text-[10px] text-slate-600 tracking-widest mb-2">RESULT BITS</div>
                <BitGrid value={aluResultInt ?? 0} />
              </div>
            )}
            {/* Logic ops */}
            <div className="p-3 border-b border-border">
              <div className="text-[10px] text-slate-600 tracking-widest mb-2">LOGIC OPERATIONS</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(["AND", "OR", "XOR", "NOT", "NAND", "NOR", "SHL", "SHR"] as AluOp[]).map(op => (
                  <button
                    key={op}
                    onClick={() => performAlu(op)}
                    className={`h-10 font-mono-display text-xs font-semibold border transition-all duration-150 active:scale-95 ${aluOp === op ? "border-cyan-400 text-cyan-300 bg-cyan-500/15" : "border-cyan-700/50 text-cyan-400 bg-cyan-900/10 hover:border-cyan-500"}`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
            {/* Numpad */}
            <div className="p-3 grid grid-cols-4 gap-1.5">
              <div className="col-span-4 text-[10px] text-slate-600 tracking-widest mb-1">INPUT → {aluInputFocus === "A" ? "OPERAND A" : "OPERAND B"}</div>
              <button onClick={() => setAluInputFocus("A")} className={`h-10 text-xs font-medium border transition-all ${aluInputFocus === "A" ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-slate-600 text-slate-500 hover:border-slate-400"}`}>→ A</button>
              <button onClick={() => setAluInputFocus("B")} className={`h-10 text-xs font-medium border transition-all ${aluInputFocus === "B" ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-slate-600 text-slate-500 hover:border-slate-400"}`}>→ B</button>
              <button onClick={aluBackspace} className="h-10 text-xs font-medium border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200 transition-all">⌫</button>
              <button onClick={aluClear} className="h-10 text-xs font-medium border border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400 transition-all flex items-center justify-center gap-1"><RotateCcw className="w-3 h-3" /> CLR</button>
              {["7","8","9","+/−","4","5","6","USE","1","2","3"].map((d, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (d === "+/−") {
                      const setter = aluInputFocus === "A" ? setAluA : setAluB;
                      setter(prev => String(-parseInt(prev)));
                      setAluResult(null);
                    } else if (d === "USE") {
                      if (aluResult !== null) {
                        const setter = aluInputFocus === "A" ? setAluA : setAluB;
                        setter(aluResult);
                        setAluResult(null);
                      }
                    } else {
                      aluInputDigit(d);
                    }
                  }}
                  className={`h-10 font-mono-display text-sm border transition-all duration-150 active:scale-95 ${d === "USE" ? "border-emerald-700/50 text-emerald-400 bg-emerald-900/10 hover:border-emerald-500" : "border-slate-600 text-slate-200 bg-slate-800/60 hover:bg-slate-700 hover:border-slate-500"}`}
                >
                  {d}
                </button>
              ))}
              <button onClick={() => aluInputDigit("0")} className="h-10 font-mono-display text-sm border border-slate-600 text-slate-200 bg-slate-800/60 hover:bg-slate-700 col-span-4 transition-all active:scale-95">0</button>
            </div>
          </div>
        )}

        {/* ── EML Explorer Panel ── */}
        {mode === "eml" && (
          <div className="flex flex-col p-4 gap-4">
            {/* Header info */}
            <div className="border border-violet-700/40 bg-violet-900/10 p-3">
              <div className="text-[10px] text-violet-400 tracking-widest mb-1">EML OPERATOR — EXP-MINUS-LOG</div>
              <div className="font-mono-display text-violet-300 text-sm">eml(x, y) = exp(x) − ln(y)</div>
              <div className="text-[10px] text-slate-500 mt-1">
                The continuous-math analog of NAND. A single binary operator that generates all elementary functions.
                <br />Source: Odrzywołek, A. (2026). arXiv:2603.21852
              </div>
            </div>

            {/* Direct EML computation */}
            <div className="border border-border bg-slate-900/40 p-3">
              <div className="text-[10px] text-slate-500 tracking-widest mb-2">DIRECT: eml(x, y) = exp(x) − ln(y)</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-slate-500 tracking-widest block mb-1">X</label>
                  <input
                    type="number"
                    value={emlX}
                    onChange={e => { setEmlX(e.target.value); setEmlDirectResult(null); setEmlResult(null); }}
                    className="w-full bg-slate-800 border border-slate-600 text-cyan-400 font-mono-display text-sm px-2 py-1.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 tracking-widest block mb-1">Y (must be &gt; 0)</label>
                  <input
                    type="number"
                    value={emlY}
                    onChange={e => { setEmlY(e.target.value); setEmlDirectResult(null); setEmlResult(null); }}
                    className="w-full bg-slate-800 border border-slate-600 text-cyan-400 font-mono-display text-sm px-2 py-1.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              {emlDirectResult !== null && (
                <div className="border border-violet-500/30 bg-violet-900/10 p-2 mb-2">
                  <span className="text-[10px] text-slate-500">eml({emlX}, {emlY}) = </span>
                  <span className="font-mono-display text-violet-300 text-lg">{emlDirectResult.toFixed(8)}</span>
                </div>
              )}
              {/* Key identities */}
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 mb-2">
                <span>e = eml(1,1) = {eml(1,1).toFixed(6)}</span>
                <span>e^x = eml(x,1)</span>
                <span>ln(x) = eml(1, eml(eml(1,x),1))</span>
                <span>x−y = eml(ln x, e^y)</span>
              </div>
            </div>

            {/* Derived operations via EML */}
            <div className="border border-border bg-slate-900/40 p-3">
              <div className="text-[10px] text-slate-500 tracking-widest mb-2">DERIVED OPERATIONS VIA EML</div>
              <div className="grid grid-cols-3 gap-1 mb-2 sm:grid-cols-4">
                {["e^x", "ln(x)", "x + y", "x × y", "x − y", "x / y", "x^y"].map(op => (
                  <button
                    key={op}
                    onClick={() => { setEmlOp(op); setEmlResult(null); }}
                    className={`h-9 font-mono-display text-xs border transition-all duration-150 active:scale-95 ${emlOp === op ? "border-violet-400 text-violet-300 bg-violet-500/15" : "border-violet-700/50 text-violet-400 bg-violet-900/10 hover:border-violet-500"}`}
                  >
                    {op}
                  </button>
                ))}
              </div>
              <button
                onClick={computeEml}
                className="w-full h-10 font-mono-display text-sm border border-violet-500 text-violet-300 bg-violet-600/20 hover:bg-violet-600/30 transition-all active:scale-95 mb-2"
              >
                COMPUTE {emlOp} via EML
              </button>

              {emlResult && (
                <div className="space-y-1">
                  <div className="border border-emerald-700/40 bg-emerald-900/10 p-2">
                    <span className="text-[10px] text-slate-500">RESULT = </span>
                    <span className="font-mono-display text-emerald-400 text-lg">
                      {isNaN(emlResult.result) ? "undefined" : emlResult.result.toFixed(8)}
                    </span>
                  </div>
                  <div className="border border-slate-700 bg-slate-800/40 p-2 space-y-1">
                    <div className="text-[10px] text-slate-500 tracking-widest mb-1">EML DERIVATION STEPS</div>
                    {emlResult.steps.map((step, i) => (
                      <div key={i} className="font-mono-display text-[11px] text-slate-400">{step}</div>
                    ))}
                  </div>
                  {/* Base-e of result */}
                  {!isNaN(emlResult.result) && (
                    <div className="border border-amber-700/30 bg-amber-900/10 p-2">
                      <span className="text-[10px] text-amber-400 tracking-widest">BASE-e REPR = </span>
                      <span className="font-mono-display text-amber-300 text-xs">{toBaseE(emlResult.result).repr}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* EML grammar reference */}
            <div className="border border-slate-700 bg-slate-800/20 p-3 text-[10px] text-slate-500 space-y-1">
              <div className="text-slate-400 tracking-widest mb-1">EML GRAMMAR: S → 1 | eml(S, S)</div>
              <div>Every elementary function is a binary tree of identical EML nodes.</div>
              <div>Analogous to NAND gate for Boolean logic — a single universal primitive.</div>
              <div className="text-slate-600">Odrzywołek, A. (2026). arXiv:2603.21852 [cs.SC]</div>
            </div>
          </div>
        )}

        {/* ── Float / Mantissa Panel ── */}
        {mode === "float" && (
          <div className="flex flex-col p-4 gap-4">
            {/* Input */}
            <div className="border border-border bg-slate-900/40 p-3">
              <div className="text-[10px] text-slate-500 tracking-widest mb-2">IEEE-754 FLOAT ANALYZER</div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={floatInput}
                  onChange={e => setFloatInput(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 text-amber-400 font-mono-display text-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                  placeholder="Enter a number..."
                />
                <div className="flex gap-1">
                  {(["32", "64"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setFloatPrecision(p)}
                      className={`px-3 text-xs font-medium border transition-all ${floatPrecision === p ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-slate-600 text-slate-500 hover:border-slate-400"}`}
                    >
                      {p}-bit
                    </button>
                  ))}
                </div>
              </div>
              {/* Quick values */}
              <div className="flex gap-1 flex-wrap">
                {["0", "1", "-1", "3.14159265", "2.71828182", "0.5", "Infinity", "NaN", "1e-10"].map(v => (
                  <button
                    key={v}
                    onClick={() => setFloatInput(v)}
                    className="px-2 py-0.5 text-[10px] font-mono-display border border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300 transition-all"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Float breakdown */}
            <div className="border border-border bg-slate-900/40 p-3">
              <div className="text-[10px] text-slate-500 tracking-widest mb-3">
                {floatPrecision === "32" ? "SINGLE PRECISION (32-BIT) — 1 sign + 8 exp + 23 mantissa" : "DOUBLE PRECISION (64-BIT) — 1 sign + 11 exp + 52 mantissa"}
              </div>
              {floatPrecision === "32" ? (
                <Float32BitField value={floatVal} />
              ) : (
                <div className="space-y-2">
                  {/* 64-bit simplified view */}
                  <div className="flex gap-0.5 flex-wrap">
                    <div className="flex flex-col items-center">
                      <span className={`font-mono-display text-xs w-5 h-5 flex items-center justify-center border ${float64.sign ? "border-red-500 text-red-400 bg-red-500/10" : "border-slate-600 text-slate-500"}`}>{float64.sign}</span>
                      <span className="text-[8px] text-red-400 mt-0.5">S</span>
                    </div>
                    <div className="w-px bg-slate-600 mx-0.5" />
                    {float64.exponentBits.split("").map((b, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <span className={`font-mono-display text-xs w-5 h-5 flex items-center justify-center border ${b === "1" ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-slate-600 text-slate-600"}`}>{b}</span>
                        {i === 0 && <span className="text-[8px] text-amber-400 mt-0.5">E</span>}
                        {i > 0 && <span className="text-[8px] text-slate-700 mt-0.5">&nbsp;</span>}
                      </div>
                    ))}
                    <div className="w-px bg-slate-600 mx-0.5" />
                    {float64.mantissaBits.slice(0, 20).split("").map((b, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <span className={`font-mono-display text-xs w-5 h-5 flex items-center justify-center border ${b === "1" ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-slate-600 text-slate-600"}`}>{b}</span>
                        {i === 0 && <span className="text-[8px] text-cyan-400 mt-0.5">M</span>}
                        {i > 0 && <span className="text-[8px] text-slate-700 mt-0.5">&nbsp;</span>}
                      </div>
                    ))}
                    <span className="font-mono-display text-xs text-slate-600 self-center ml-1">+32 more</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs mt-2">
                    <div className="border border-red-500/30 bg-red-500/5 p-2">
                      <div className="text-[10px] text-red-400 tracking-widest mb-1">SIGN</div>
                      <div className="font-mono-display text-red-300">{float64.sign === 0 ? "+1" : "−1"}</div>
                    </div>
                    <div className="border border-amber-500/30 bg-amber-500/5 p-2">
                      <div className="text-[10px] text-amber-400 tracking-widest mb-1">EXPONENT</div>
                      <div className="font-mono-display text-amber-300">2^{float64.exponentValue}</div>
                      <div className="text-[10px] text-slate-600">bias={float64.biasedExponent} (−1023)</div>
                    </div>
                    <div className="border border-cyan-500/30 bg-cyan-500/5 p-2">
                      <div className="text-[10px] text-cyan-400 tracking-widest mb-1">MANTISSA</div>
                      <div className="font-mono-display text-cyan-300 text-xs">52-bit fraction</div>
                    </div>
                  </div>
                  <div className="border border-emerald-700/30 bg-emerald-900/10 p-2 text-xs">
                    <span className="text-slate-500 text-[10px]">VALUE ≈ </span>
                    <span className="font-mono-display text-emerald-400">{floatVal.toPrecision(15)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Base-e representation */}
            <div className="border border-amber-700/40 bg-amber-900/10 p-3">
              <div className="text-[10px] text-amber-400 tracking-widest mb-2">BASE-e FLOAT REPRESENTATION</div>
              <div className="text-[10px] text-slate-500 mb-2">
                Natural float: x = m × e^n, where n = ⌊ln|x|⌋, m = x / e^n
                <br />Uses base e (≈2.71828) instead of base 2 or base 10
              </div>
              <div className="border border-amber-600/30 bg-amber-900/20 p-3 mb-2">
                <div className="font-mono-display text-amber-300 text-lg">{baseERepr.repr}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="border border-slate-700 bg-slate-800/40 p-2">
                  <div className="text-[10px] text-slate-500 tracking-widest mb-1">MANTISSA (m)</div>
                  <div className="font-mono-display text-amber-300">{baseERepr.mantissa.toFixed(8)}</div>
                  <div className="text-[10px] text-slate-600">1 ≤ |m| &lt; e</div>
                </div>
                <div className="border border-slate-700 bg-slate-800/40 p-2">
                  <div className="text-[10px] text-slate-500 tracking-widest mb-1">EXPONENT (n)</div>
                  <div className="font-mono-display text-amber-300">{baseERepr.exponent}</div>
                  <div className="text-[10px] text-slate-600">n = ⌊ln|x|⌋</div>
                </div>
              </div>
              {/* Comparison table */}
              <div className="mt-2 border border-slate-700 bg-slate-800/20 p-2">
                <div className="text-[10px] text-slate-500 tracking-widest mb-1">COMPARISON: FLOAT BASES</div>
                <div className="space-y-1 font-mono-display text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base-2 (binary):</span>
                    <span className="text-slate-300">{floatVal !== 0 && isFinite(floatVal) ? `${(floatVal / Math.pow(2, Math.floor(Math.log2(Math.abs(floatVal))))).toFixed(6)} × 2^${Math.floor(Math.log2(Math.abs(floatVal)))}` : String(floatVal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base-10 (sci):</span>
                    <span className="text-slate-300">{floatVal.toExponential(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-500">Base-e (natural):</span>
                    <span className="text-amber-300">{baseERepr.repr}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* EML connection */}
            <div className="border border-violet-700/30 bg-violet-900/10 p-3 text-[10px] text-slate-500">
              <div className="text-violet-400 tracking-widest mb-1">EML CONNECTION</div>
              <div>The base-e representation is natural for EML: since eml(x,1) = e^x, the exponent n in m×e^n is directly the EML input that produces the scale factor. The mantissa m is recovered as eml(ln(x) − n, 1).</div>
            </div>
          </div>
        )}
      </main>

      {/* History Panel */}
      {history.length > 0 && (
        <div className="border-t border-border bg-slate-900/60 px-4 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-slate-600 tracking-widest">HISTORY</span>
            <button onClick={() => setHistory([])} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
              <Delete className="w-3 h-3 inline" /> CLEAR
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {history.map((entry, i) => (
              <span key={i} className="font-mono-display text-[11px] text-slate-500 whitespace-nowrap hover:text-slate-300 transition-colors cursor-default">{entry}</span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border px-4 py-1.5 flex items-center justify-between flex-wrap gap-1">
        <span className="font-mono-display text-[10px] text-slate-700">KEYBOARD: 0-9 + - * / Enter Backspace Esc</span>
        <span className="font-mono-display text-[10px] text-slate-700">EML: eml(x,y) = exp(x) − ln(y) · arXiv:2603.21852</span>
      </footer>
    </div>
  );
}
