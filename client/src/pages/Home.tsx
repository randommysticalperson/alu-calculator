/*
 * ALU Calculator — Home Page
 * Design: Terminal Hacker — Dark flat with neon green/cyan accents
 * Layout: Full-screen two-panel calculator with shared display
 * Font: Fira Code (numbers), IBM Plex Sans (labels)
 */

import { useState, useEffect, useCallback } from "react";
import { Calculator, Cpu, RotateCcw, Delete } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "standard" | "alu";
type AluOp = "AND" | "OR" | "XOR" | "NOT" | "SHL" | "SHR" | "NAND" | "NOR";

// ─── Utility helpers ──────────────────────────────────────────────────────────

function toSafeInt(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.trunc(n);
}

function toBinary(n: number): string {
  if (n < 0) {
    // two's complement 16-bit
    return (n >>> 0).toString(2).slice(-16).padStart(16, "0");
  }
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
                ? "border-emerald-400 text-emerald-400 bg-emerald-400/10 glow-green"
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

interface CalcButtonProps {
  label: string;
  onClick: () => void;
  variant?: "number" | "operator" | "action" | "equals" | "alu" | "zero";
  wide?: boolean;
  tall?: boolean;
  disabled?: boolean;
}

function CalcButton({ label, onClick, variant = "number", wide, tall, disabled }: CalcButtonProps) {
  const base = `
    relative flex items-center justify-center
    font-mono-display font-medium text-sm
    border transition-all duration-150 select-none
    active:scale-95
    ${wide ? "col-span-2" : ""}
    ${tall ? "row-span-2" : ""}
    ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
    rounded-none
  `;

  const variants: Record<string, string> = {
    number: `
      bg-slate-800/60 border-slate-600 text-slate-200
      hover:bg-slate-700 hover:border-slate-500 hover:text-white
    `,
    operator: `
      bg-slate-800/40 border-cyan-700/60 text-cyan-400
      hover:bg-cyan-900/30 hover:border-cyan-500 hover:text-cyan-300
    `,
    action: `
      bg-slate-800/40 border-slate-500/60 text-slate-400
      hover:bg-slate-700/60 hover:border-slate-400 hover:text-slate-200
    `,
    equals: `
      bg-emerald-600/20 border-emerald-500 text-emerald-400
      hover:bg-emerald-600/40 hover:border-emerald-400 hover:text-emerald-300
      glow-green
    `,
    alu: `
      bg-cyan-900/20 border-cyan-600/60 text-cyan-300
      hover:bg-cyan-800/30 hover:border-cyan-400 hover:text-cyan-200
    `,
    zero: `
      bg-slate-800/60 border-slate-600 text-slate-200
      hover:bg-slate-700 hover:border-slate-500 hover:text-white
    `,
  };

  return (
    <button
      className={`${base} ${variants[variant]} h-12`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
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
    if (!display.includes(".")) {
      setDisplay(prev => prev + ".");
    }
  }, [display, waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression("");
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay("0");
  }, []);

  const toggleSign = useCallback(() => {
    setDisplay(prev => {
      const n = parseFloat(prev);
      if (isNaN(n)) return prev;
      return String(-n);
    });
  }, []);

  const percentage = useCallback(() => {
    setDisplay(prev => {
      const n = parseFloat(prev);
      if (isNaN(n)) return prev;
      return String(n / 100);
    });
  }, []);

  const backspace = useCallback(() => {
    if (display.length > 1) {
      setDisplay(prev => prev.slice(0, -1));
    } else {
      setDisplay("0");
    }
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
    const entry = op === "NOT"
      ? `NOT(${a}) = ${result}`
      : `${a} ${op} ${b} = ${result}`;
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
    setAluA("0");
    setAluB("0");
    setAluResult(null);
    setAluOp(null);
  }, []);

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
        else if (e.key === "%") handleOperator("MOD");
        else if (e.key === "Enter" || e.key === "=") calculate();
        else if (e.key === "Backspace") backspace();
        else if (e.key === "Escape") clearAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, inputDigit, inputDecimal, handleOperator, calculate, backspace, clearAll]);

  // ── Derived display values ─────────────────────────────────────────────────

  const displayNum = parseFloat(display);
  const safeInt = toSafeInt(display);
  const displayBin = toBinary(safeInt);
  const displayHex = toHex(safeInt);

  const aluAInt = toSafeInt(aluA);
  const aluBInt = toSafeInt(aluB);
  const aluResultInt = aluResult !== null ? toSafeInt(aluResult) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <span className="font-mono-display text-emerald-400 font-semibold tracking-wider text-sm glow-text-green">
            ALU CALCULATOR
          </span>
          <span className="text-slate-600 text-xs font-mono-display">v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("standard")}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-all duration-150
              ${mode === "standard"
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                : "border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300"
              }
            `}
          >
            <Calculator className="w-3.5 h-3.5" />
            STANDARD
          </button>
          <button
            onClick={() => setMode("alu")}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-all duration-150
              ${mode === "alu"
                ? "border-cyan-500 text-cyan-400 bg-cyan-500/10"
                : "border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300"
              }
            `}
          >
            <Cpu className="w-3.5 h-3.5" />
            ALU OPS
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* ── Standard Calculator Panel ── */}
        <div className={`
          flex flex-col border-r border-border
          ${mode === "alu" ? "hidden lg:flex lg:w-1/2" : "flex w-full lg:w-1/2"}
        `}>
          {/* Display */}
          <div className="relative scanlines border-b border-border bg-slate-900/80 p-4">
            {/* Expression line */}
            <div className="font-mono-display text-xs text-slate-500 h-5 text-right truncate mb-1">
              {expression || "\u00A0"}
            </div>
            {/* Main display */}
            <div className="font-mono-display text-4xl font-bold text-right text-emerald-400 glow-text-green truncate leading-tight min-h-[2.5rem]">
              {formatDisplay(display)}
            </div>
            {/* Binary / Hex row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 font-medium tracking-widest">BIN</span>
                <span className="font-mono-display text-[11px] text-slate-400 tracking-wider">
                  {display === "Error" ? "────────────────" : displayBin}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 font-medium tracking-widest">HEX</span>
                <span className="font-mono-display text-[11px] text-cyan-400 tracking-wider">
                  {display === "Error" ? "────" : `0x${displayHex}`}
                </span>
              </div>
            </div>
          </div>

          {/* Bit Grid */}
          <div className="px-4 py-3 border-b border-border bg-slate-900/40">
            <BitGrid value={display === "Error" ? 0 : safeInt} />
          </div>

          {/* Keypad */}
          <div className="flex-1 p-3 grid grid-cols-4 gap-1.5 content-start">
            {/* Row 1: Special functions */}
            <CalcButton label="√" onClick={() => specialFn("√")} variant="action" />
            <CalcButton label="x²" onClick={() => specialFn("x²")} variant="action" />
            <CalcButton label="log" onClick={() => specialFn("log")} variant="action" />
            <CalcButton label="ln" onClick={() => specialFn("ln")} variant="action" />

            {/* Row 2: Clear / backspace */}
            <CalcButton label="AC" onClick={clearAll} variant="action" />
            <CalcButton label="CE" onClick={clearEntry} variant="action" />
            <CalcButton label="⌫" onClick={backspace} variant="action" />
            <CalcButton label="÷" onClick={() => handleOperator("÷")} variant="operator" />

            {/* Row 3 */}
            <CalcButton label="7" onClick={() => inputDigit("7")} variant="number" />
            <CalcButton label="8" onClick={() => inputDigit("8")} variant="number" />
            <CalcButton label="9" onClick={() => inputDigit("9")} variant="number" />
            <CalcButton label="×" onClick={() => handleOperator("×")} variant="operator" />

            {/* Row 4 */}
            <CalcButton label="4" onClick={() => inputDigit("4")} variant="number" />
            <CalcButton label="5" onClick={() => inputDigit("5")} variant="number" />
            <CalcButton label="6" onClick={() => inputDigit("6")} variant="number" />
            <CalcButton label="−" onClick={() => handleOperator("−")} variant="operator" />

            {/* Row 5 */}
            <CalcButton label="1" onClick={() => inputDigit("1")} variant="number" />
            <CalcButton label="2" onClick={() => inputDigit("2")} variant="number" />
            <CalcButton label="3" onClick={() => inputDigit("3")} variant="number" />
            <CalcButton label="+" onClick={() => handleOperator("+")} variant="operator" />

            {/* Row 6 */}
            <CalcButton label="+/−" onClick={toggleSign} variant="action" />
            <CalcButton label="0" onClick={() => inputDigit("0")} variant="number" />
            <CalcButton label="." onClick={inputDecimal} variant="number" />
            <CalcButton label="=" onClick={calculate} variant="equals" />

            {/* Row 7: Extra */}
            <CalcButton label="%" onClick={percentage} variant="action" />
            <CalcButton label="1/x" onClick={() => specialFn("1/x")} variant="action" />
            <CalcButton label="MOD" onClick={() => handleOperator("MOD")} variant="operator" />
            <CalcButton label="CLR" onClick={clearAll} variant="action" />
          </div>
        </div>

        {/* ── ALU Operations Panel ── */}
        <div className={`
          flex flex-col
          ${mode === "standard" ? "hidden lg:flex lg:w-1/2" : "flex w-full lg:w-1/2"}
        `}>
          {/* ALU Display */}
          <div className="relative scanlines border-b border-border bg-slate-900/80 p-4">
            <div className="text-[10px] text-slate-600 tracking-widest mb-2">ARITHMETIC LOGIC UNIT</div>

            {/* Operand A */}
            <div
              className={`
                flex items-center justify-between p-2 border mb-1 cursor-pointer transition-all duration-150
                ${aluInputFocus === "A"
                  ? "border-cyan-500 bg-cyan-500/5"
                  : "border-slate-700 hover:border-slate-500"
                }
              `}
              onClick={() => setAluInputFocus("A")}
            >
              <span className="text-[10px] text-slate-500 font-medium tracking-widest">A</span>
              <span className="font-mono-display text-xl text-cyan-400">
                {aluInputFocus === "A" ? aluA + "▌" : aluA}
              </span>
              <span className="font-mono-display text-[10px] text-slate-500">
                {`0x${toHex(aluAInt)}`}
              </span>
            </div>

            {/* Operand B */}
            <div
              className={`
                flex items-center justify-between p-2 border mb-3 cursor-pointer transition-all duration-150
                ${aluInputFocus === "B"
                  ? "border-cyan-500 bg-cyan-500/5"
                  : "border-slate-700 hover:border-slate-500"
                }
              `}
              onClick={() => setAluInputFocus("B")}
            >
              <span className="text-[10px] text-slate-500 font-medium tracking-widest">B</span>
              <span className="font-mono-display text-xl text-cyan-400">
                {aluInputFocus === "B" ? aluB + "▌" : aluB}
              </span>
              <span className="font-mono-display text-[10px] text-slate-500">
                {`0x${toHex(aluBInt)}`}
              </span>
            </div>

            {/* Result */}
            <div className="flex items-center justify-between p-2 border border-emerald-700/40 bg-emerald-900/10">
              <span className="text-[10px] text-slate-500 font-medium tracking-widest">
                {aluOp ? `OUT (${aluOp})` : "OUT"}
              </span>
              <span className="font-mono-display text-2xl font-bold text-emerald-400 glow-text-green">
                {aluResult !== null ? aluResult : "—"}
              </span>
              <span className="font-mono-display text-[10px] text-slate-500">
                {aluResultInt !== null ? `0x${toHex(aluResultInt)}` : "0x——"}
              </span>
            </div>
          </div>

          {/* Result Bit Grid */}
          {aluResult !== null && (
            <div className="px-4 py-3 border-b border-border bg-slate-900/40">
              <div className="text-[10px] text-slate-600 tracking-widest mb-2">RESULT BITS</div>
              <BitGrid value={aluResultInt ?? 0} />
            </div>
          )}

          {/* ALU Operation Buttons */}
          <div className="p-3 border-b border-border">
            <div className="text-[10px] text-slate-600 tracking-widest mb-2">LOGIC OPERATIONS</div>
            <div className="grid grid-cols-4 gap-1.5">
              {(["AND", "OR", "XOR", "NOT", "NAND", "NOR", "SHL", "SHR"] as AluOp[]).map(op => (
                <button
                  key={op}
                  onClick={() => performAlu(op)}
                  className={`
                    h-10 font-mono-display text-xs font-semibold border transition-all duration-150
                    active:scale-95
                    ${aluOp === op
                      ? "border-cyan-400 text-cyan-300 bg-cyan-500/15 glow-cyan"
                      : "border-cyan-700/50 text-cyan-400 bg-cyan-900/10 hover:border-cyan-500 hover:bg-cyan-900/20"
                    }
                  `}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>

          {/* ALU Numpad */}
          <div className="flex-1 p-3 grid grid-cols-4 gap-1.5 content-start">
            <div className="col-span-4 text-[10px] text-slate-600 tracking-widest mb-1">
              INPUT → {aluInputFocus === "A" ? "OPERAND A" : "OPERAND B"}
            </div>
            {/* Toggle focus */}
            <button
              onClick={() => setAluInputFocus("A")}
              className={`
                h-10 text-xs font-medium border transition-all duration-150
                ${aluInputFocus === "A" ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-slate-600 text-slate-500 hover:border-slate-400"}
              `}
            >
              → A
            </button>
            <button
              onClick={() => setAluInputFocus("B")}
              className={`
                h-10 text-xs font-medium border transition-all duration-150
                ${aluInputFocus === "B" ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-slate-600 text-slate-500 hover:border-slate-400"}
              `}
            >
              → B
            </button>
            <button
              onClick={aluBackspace}
              className="h-10 text-xs font-medium border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200 transition-all duration-150"
            >
              ⌫
            </button>
            <button
              onClick={aluClear}
              className="h-10 text-xs font-medium border border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400 transition-all duration-150 flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> CLR
            </button>

            {/* Digits 7-9 */}
            {["7","8","9"].map(d => (
              <button
                key={d}
                onClick={() => aluInputDigit(d)}
                className="h-10 font-mono-display text-sm border border-slate-600 text-slate-200 bg-slate-800/60 hover:bg-slate-700 hover:border-slate-500 transition-all duration-150 active:scale-95"
              >
                {d}
              </button>
            ))}
            {/* Negative toggle */}
            <button
              onClick={() => {
                const setter = aluInputFocus === "A" ? setAluA : setAluB;
                setter(prev => {
                  const n = parseInt(prev);
                  return String(-n);
                });
                setAluResult(null);
              }}
              className="h-10 font-mono-display text-sm border border-slate-600 text-slate-400 bg-slate-800/40 hover:bg-slate-700 hover:border-slate-500 transition-all duration-150 active:scale-95"
            >
              +/−
            </button>
            {/* Digits 4-6 */}
            {["4","5","6"].map(d => (
              <button
                key={d}
                onClick={() => aluInputDigit(d)}
                className="h-10 font-mono-display text-sm border border-slate-600 text-slate-200 bg-slate-800/60 hover:bg-slate-700 hover:border-slate-500 transition-all duration-150 active:scale-95"
              >
                {d}
              </button>
            ))}
            {/* USE result button */}
            <button
              onClick={() => {
                if (aluResult !== null) {
                  const setter = aluInputFocus === "A" ? setAluA : setAluB;
                  setter(aluResult);
                  setAluResult(null);
                }
              }}
              className="h-10 font-mono-display text-xs border border-emerald-700/50 text-emerald-400 bg-emerald-900/10 hover:border-emerald-500 hover:bg-emerald-900/20 transition-all duration-150 active:scale-95"
              title="Use result as input"
            >
              USE
            </button>
            {/* Digits 1-3 */}
            {["1","2","3"].map(d => (
              <button
                key={d}
                onClick={() => aluInputDigit(d)}
                className="h-10 font-mono-display text-sm border border-slate-600 text-slate-200 bg-slate-800/60 hover:bg-slate-700 hover:border-slate-500 transition-all duration-150 active:scale-95"
              >
                {d}
              </button>
            ))}
            {/* Zero wide */}
            <button
              onClick={() => aluInputDigit("0")}
              className="h-10 font-mono-display text-sm border border-slate-600 text-slate-200 bg-slate-800/60 hover:bg-slate-700 hover:border-slate-500 transition-all duration-150 active:scale-95 col-span-4"
            >
              0
            </button>
          </div>
        </div>
      </main>

      {/* History Panel */}
      {history.length > 0 && (
        <div className="border-t border-border bg-slate-900/60 px-4 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-slate-600 tracking-widest">HISTORY</span>
            <button
              onClick={() => setHistory([])}
              className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
            >
              <Delete className="w-3 h-3 inline" /> CLEAR
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {history.map((entry, i) => (
              <span
                key={i}
                className="font-mono-display text-[11px] text-slate-500 whitespace-nowrap hover:text-slate-300 transition-colors cursor-default"
              >
                {entry}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border px-6 py-2 flex items-center justify-between">
        <span className="font-mono-display text-[10px] text-slate-700">
          KEYBOARD: 0-9 + - * / Enter Backspace Esc
        </span>
        <span className="font-mono-display text-[10px] text-slate-700">
          ALU OPS: AND OR XOR NOT NAND NOR SHL SHR
        </span>
      </footer>
    </div>
  );
}
