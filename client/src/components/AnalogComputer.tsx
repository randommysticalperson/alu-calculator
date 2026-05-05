/*
 * AnalogComputer.tsx
 * Design: Terminal Hacker — Dark flat with neon green/cyan accents
 * Represents EML(x,y) = exp(x) − ln(y) as an analog computer circuit:
 *   - EXP block: antilog amplifier  (BJT in input path)
 *   - LOG block: log amplifier      (BJT in feedback loop)
 *   - DIFF block: differential summer (inverting op-amp)
 * Signal flow is animated with SVG dashed lines and oscilloscope waveforms.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { Lang } from "@/lib/i18n";

// ── i18n strings ──────────────────────────────────────────────────────────────
const i18n: Record<Lang, Record<string, string>> = {
  en: {
    title: "ANALOG COMPUTER — EML CIRCUIT",
    subtitle: "eml(x, y) = exp(x) − ln(y)  implemented with op-amp log/antilog amplifiers",
    inputX: "Input Voltage X",
    inputY: "Input Voltage Y",
    blockExp: "EXP AMPLIFIER",
    blockLog: "LOG AMPLIFIER",
    blockDiff: "DIFFERENTIAL SUMMER",
    blockOut: "OUTPUT",
    expDesc: "Antilog (exponential) amplifier — BJT in input path",
    logDesc: "Log amplifier — BJT in op-amp feedback loop",
    diffDesc: "Inverting summer: Vout = V₁ − V₂",
    outDesc: "eml(x, y) = exp(x) − ln(y)",
    oscTitle: "OSCILLOSCOPE — Signal Traces",
    signalX: "x (input)",
    signalExpX: "exp(x)",
    signalLnY: "ln(y)",
    signalOut: "eml(x,y)",
    formulaTitle: "CIRCUIT EQUATIONS",
    formula1: "Log amp:    V_ln = −Vₜ · ln(y / I_ref)   where Vₜ = 26 mV",
    formula2: "Antilog amp: V_exp = I_ref · e^(x / Vₜ)",
    formula3: "Differential summer: V_out = V_exp − V_ln = exp(x) − ln(y)",
    analogNote: "Analog computers compute continuously — no clock, no quantization.",
    paperNote: "arXiv:2603.21852 notes: \"Pure-EML form could possibly be implemented efficiently in analog circuits.\"",
    animate: "ANIMATE SIGNAL",
    stop: "STOP",
    voltUnit: "V",
  },
  pl: {
    title: "KOMPUTER ANALOGOWY — UKŁAD EML",
    subtitle: "eml(x, y) = exp(x) − ln(y)  zrealizowane za pomocą wzmacniaczy log/antilog",
    inputX: "Napięcie wejściowe X",
    inputY: "Napięcie wejściowe Y",
    blockExp: "WZMACNIACZ EXP",
    blockLog: "WZMACNIACZ LOG",
    blockDiff: "SUMATOR RÓŻNICOWY",
    blockOut: "WYJŚCIE",
    expDesc: "Wzmacniacz antylogarytmiczny — tranzystor BJT na wejściu",
    logDesc: "Wzmacniacz logarytmiczny — BJT w pętli sprzężenia zwrotnego",
    diffDesc: "Sumator odwracający: Vout = V₁ − V₂",
    outDesc: "eml(x, y) = exp(x) − ln(y)",
    oscTitle: "OSCYLOSKOP — Przebiegi sygnałów",
    signalX: "x (wejście)",
    signalExpX: "exp(x)",
    signalLnY: "ln(y)",
    signalOut: "eml(x,y)",
    formulaTitle: "RÓWNANIA UKŁADU",
    formula1: "Wzmacniacz log:    V_ln = −Vₜ · ln(y / I_ref)   gdzie Vₜ = 26 mV",
    formula2: "Wzmacniacz antilog: V_exp = I_ref · e^(x / Vₜ)",
    formula3: "Sumator różnicowy: V_out = V_exp − V_ln = exp(x) − ln(y)",
    analogNote: "Komputery analogowe obliczają w sposób ciągły — bez zegara, bez kwantyzacji.",
    paperNote: "arXiv:2603.21852: \"Postać czysto-EML może być efektywnie zaimplementowana w układach analogowych.\"",
    animate: "ANIMUJ SYGNAŁ",
    stop: "ZATRZYMAJ",
    voltUnit: "V",
  },
  zh: {
    title: "類比電腦 — EML 電路",
    subtitle: "eml(x, y) = exp(x) − ln(y)  以運算放大器對數/反對數電路實現",
    inputX: "輸入電壓 X",
    inputY: "輸入電壓 Y",
    blockExp: "指數放大器",
    blockLog: "對數放大器",
    blockDiff: "差分加法器",
    blockOut: "輸出",
    expDesc: "反對數（指數）放大器 — BJT 置於輸入路徑",
    logDesc: "對數放大器 — BJT 置於運算放大器回授迴路",
    diffDesc: "反相加法器：Vout = V₁ − V₂",
    outDesc: "eml(x, y) = exp(x) − ln(y)",
    oscTitle: "示波器 — 訊號波形",
    signalX: "x（輸入）",
    signalExpX: "exp(x)",
    signalLnY: "ln(y)",
    signalOut: "eml(x,y)",
    formulaTitle: "電路方程式",
    formula1: "對數放大器：V_ln = −Vₜ · ln(y / I_ref)，其中 Vₜ = 26 mV",
    formula2: "反對數放大器：V_exp = I_ref · e^(x / Vₜ)",
    formula3: "差分加法器：V_out = V_exp − V_ln = exp(x) − ln(y)",
    analogNote: "類比電腦連續運算 — 無時脈、無量化誤差。",
    paperNote: "arXiv:2603.21852：「純 EML 形式或可在類比電路中高效實現。」",
    animate: "動畫訊號",
    stop: "停止",
    voltUnit: "V",
  },
};

// ── Oscilloscope canvas (with zoom + pan) ────────────────────────────────────
function OscilloscopeCanvas({
  x, y, animPhase, lang,
}: { x: number; y: number; animPhase: number; lang: Lang }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tr = (k: string) => i18n[lang][k] ?? k;

  // zoom: horizontal time scale multiplier (1 = default, >1 = zoomed in)
  // panX: horizontal offset in "time units" (0 = no pan)
  // zoomY: vertical amplitude scale multiplier
  const [zoom, setZoom] = useState(1);
  const [zoomY, setZoomY] = useState(1);
  const [panX, setPanX] = useState(0);
  const dragRef = useRef<{ startX: number; startPan: number } | null>(null);

  const resetView = () => { setZoom(1); setZoomY(1); setPanX(0); };

  // Wheel: Ctrl+wheel = vertical zoom, plain wheel = horizontal zoom
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    if (e.ctrlKey || e.metaKey) {
      setZoomY(z => Math.max(0.1, Math.min(20, z * delta)));
    } else {
      setZoom(z => Math.max(0.25, Math.min(32, z * delta)));
    }
  }, []);

  // Drag to pan
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startPan: panX };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [panX]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Convert pixel drag to time-unit pan
    const timePerPx = (2 * Math.PI / zoom) / canvas.width;
    setPanX(dragRef.current.startPan - dx * timePerPx);
  }, [zoom]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(0, 0, W, H);

    const midY = H / 2;
    const baseScaleY = H / 8;
    const scaleY = baseScaleY * zoomY;
    // Visible time window: 2π / zoom, starting at panX
    const timeWindow = (2 * Math.PI) / zoom;
    const tStart = panX;
    const tEnd = panX + timeWindow;

    // Grid — draw vertical lines at π/2 intervals
    const gridStep = Math.PI / 2;
    const firstGrid = Math.ceil(tStart / gridStep) * gridStep;
    ctx.strokeStyle = "#1e3a2e";
    ctx.lineWidth = 0.5;
    for (let gt = firstGrid; gt <= tEnd; gt += gridStep) {
      const gx = ((gt - tStart) / timeWindow) * W;
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy <= H; gy += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    // Zero line
    ctx.strokeStyle = "#2d4a3e";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();

    // Compute steady-state values
    const expX = Math.exp(x);
    const lnY = y > 0 ? Math.log(y) : 0;
    const emlOut = expX - lnY;

    const clamp = (v: number) => Math.max(-midY + 4, Math.min(midY - 4, v));

    const traces: { label: string; color: string; fn: (t: number) => number }[] = [
      { label: tr("signalX"),    color: "#64748b", fn: () => x },
      { label: tr("signalExpX"), color: "#06b6d4", fn: () => expX },
      { label: tr("signalLnY"), color: "#f59e0b", fn: () => lnY },
      { label: tr("signalOut"), color: "#10b981", fn: () => emlOut },
    ];

    traces.forEach(({ color, fn }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let px = 0; px < W; px++) {
        const t = tStart + (px / W) * timeWindow + animPhase;
        const ripple = 0.05 * Math.sin(t * 3);
        const val = fn(t) + ripple;
        const py = midY - clamp(val * scaleY);
        if (px === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    // Legend
    traces.forEach(({ label, color }, i) => {
      ctx.fillStyle = color;
      ctx.font = "9px 'Fira Code', monospace";
      ctx.fillText(`─ ${label}`, 6, 12 + i * 13);
    });

    // Zoom/pan HUD
    ctx.fillStyle = "#334155";
    ctx.font = "8px 'Fira Code', monospace";
    ctx.fillText(`H×${zoom.toFixed(1)}  V×${zoomY.toFixed(1)}  pan:${panX.toFixed(2)}`, W - 130, H - 5);
  }, [x, y, animPhase, lang, zoom, zoomY, panX]);

  return (
    <div className="space-y-1.5">
      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono-display">
        <span className="text-slate-600">
          { { en: "Scroll=H-zoom · Ctrl+Scroll=V-zoom · Drag=pan",
              pl: "Scroll=zoom H · Ctrl+Scroll=zoom V · Przeciągnij=przesunięcie",
              zh: "滾輪=水平縮放 · Ctrl+滾輪=垂直縮放 · 拖曳=平移" }[lang] ?? "Scroll=zoom · Drag=pan" }
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setZoom(z => Math.min(32, z * 1.5))}
            className="px-2 py-0.5 border border-slate-700 text-slate-400 hover:border-emerald-600 hover:text-emerald-400 transition-all"
            title="Zoom in (horizontal)"
          >H+</button>
          <button
            onClick={() => setZoom(z => Math.max(0.25, z / 1.5))}
            className="px-2 py-0.5 border border-slate-700 text-slate-400 hover:border-emerald-600 hover:text-emerald-400 transition-all"
            title="Zoom out (horizontal)"
          >H−</button>
          <button
            onClick={() => setZoomY(z => Math.min(20, z * 1.5))}
            className="px-2 py-0.5 border border-slate-700 text-slate-400 hover:border-cyan-600 hover:text-cyan-400 transition-all"
            title="Zoom in (vertical)"
          >V+</button>
          <button
            onClick={() => setZoomY(z => Math.max(0.1, z / 1.5))}
            className="px-2 py-0.5 border border-slate-700 text-slate-400 hover:border-cyan-600 hover:text-cyan-400 transition-all"
            title="Zoom out (vertical)"
          >V−</button>
          <button
            onClick={resetView}
            className="px-2 py-0.5 border border-slate-600 text-slate-500 hover:border-red-600 hover:text-red-400 transition-all"
            title="Reset view"
          >{ { en: "RESET", pl: "RESET", zh: "重置" }[lang] ?? "RESET" }</button>
        </div>
        <div className="text-slate-600 w-full text-right">
          H×<span className="text-emerald-400">{zoom.toFixed(2)}</span>
          &nbsp;V×<span className="text-cyan-400">{zoomY.toFixed(2)}</span>
          &nbsp;pan:<span className="text-amber-400">{panX.toFixed(2)}</span>
        </div>
      </div>
      {/* Canvas */}
      <div
        ref={wrapRef}
        className="cursor-crosshair select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          width={520}
          height={180}
          className="w-full border border-emerald-900/40"
          style={{ imageRendering: "pixelated", touchAction: "none" }}
        />
      </div>
    </div>
  );
}

// ── Op-Amp SVG symbol ─────────────────────────────────────────────────────────
function OpAmpSymbol({ x, y, label, color = "#10b981" }: { x: number; y: number; label: string; color?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Triangle body */}
      <polygon points="0,-20 0,20 34,0" fill="none" stroke={color} strokeWidth="1.5" />
      {/* − input */}
      <line x1="-14" y1="-10" x2="0" y2="-10" stroke={color} strokeWidth="1" />
      <text x="-20" y="-7" fill={color} fontSize="8" fontFamily="Fira Code, monospace">−</text>
      {/* + input */}
      <line x1="-14" y1="10" x2="0" y2="10" stroke={color} strokeWidth="1" />
      <text x="-20" y="13" fill={color} fontSize="8" fontFamily="Fira Code, monospace">+</text>
      {/* Output */}
      <line x1="34" y1="0" x2="48" y2="0" stroke={color} strokeWidth="1" />
      {/* Label */}
      <text x="8" y="4" fill={color} fontSize="7" fontFamily="Fira Code, monospace" textAnchor="middle">{label}</text>
    </g>
  );
}

// ── BJT symbol ────────────────────────────────────────────────────────────────
function BJTSymbol({ x, y, color = "#f59e0b" }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="10" fill="none" stroke={color} strokeWidth="1.2" />
      {/* Base */}
      <line x1="-10" y1="0" x2="-4" y2="0" stroke={color} strokeWidth="1.2" />
      {/* Collector */}
      <line x1="-4" y1="-6" x2="10" y2="-14" stroke={color} strokeWidth="1.2" />
      {/* Emitter with arrow */}
      <line x1="-4" y1="6" x2="10" y2="14" stroke={color} strokeWidth="1.2" />
      <polygon points="7,11 10,14 6,15" fill={color} />
      {/* Vertical bar */}
      <line x1="-4" y1="-8" x2="-4" y2="8" stroke={color} strokeWidth="1.5" />
    </g>
  );
}

// ── Animated signal dot ───────────────────────────────────────────────────────
function SignalDot({ path, phase, color }: { path: [number, number][]; phase: number; color: string }) {
  const idx = Math.floor(phase * path.length) % path.length;
  const [px, py] = path[idx] ?? [0, 0];
  return <circle cx={px} cy={py} r="3.5" fill={color} opacity="0.9" />;
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { lang: Lang }

export default function AnalogComputer({ lang }: Props) {
  const tr = (k: string) => i18n[lang][k] ?? k;

  const [xVal, setXVal] = useState(1.0);
  const [yVal, setYVal] = useState(2.0);
  const [animating, setAnimating] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);
  const animRef = useRef<number | null>(null);

  const expX = Math.exp(xVal);
  const lnY = yVal > 0 ? Math.log(yVal) : NaN;
  const emlOut = isNaN(lnY) ? NaN : expX - lnY;

  // Animation loop
  const tick = useCallback(() => {
    setAnimPhase(p => (p + 0.015) % (2 * Math.PI));
    animRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (animating) {
      animRef.current = requestAnimationFrame(tick);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [animating, tick]);

  // Signal dot paths along the circuit wires
  // Coordinates match the SVG layout below (viewBox 0 0 560 320)
  const pathX:   [number,number][] = [[40,100],[80,100],[80,120],[100,120]];
  const pathExpX:[number,number][] = [[220,120],[260,120],[280,180],[300,180]];
  const pathY:   [number,number][] = [[40,220],[80,220],[80,200],[100,200]];
  const pathLnY: [number,number][] = [[220,200],[260,200],[280,200],[300,200]];
  const pathOut: [number,number][] = [[400,190],[440,190],[480,190],[520,190]];

  // Dot phase offsets
  const p = animPhase / (2 * Math.PI);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="border border-emerald-800/40 bg-slate-900/60 p-3">
        <div className="text-[10px] text-emerald-400 tracking-widest font-mono-display mb-0.5">{tr("title")}</div>
        <div className="text-[10px] text-slate-500">{tr("subtitle")}</div>
      </div>

      {/* Input sliders */}
      <div className="grid grid-cols-2 gap-3">
        {/* X slider */}
        <div className="border border-border bg-slate-900/40 p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-slate-500 tracking-widest">{tr("inputX")}</span>
            <span className="font-mono-display text-cyan-400 text-sm">{xVal.toFixed(2)} {tr("voltUnit")}</span>
          </div>
          <input
            type="range" min="-2" max="2" step="0.05" value={xVal}
            onChange={e => setXVal(parseFloat(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
            <span>−2V</span><span>0V</span><span>+2V</span>
          </div>
          <div className="mt-2 font-mono-display text-[10px] text-cyan-300">
            exp({xVal.toFixed(2)}) = <span className="text-emerald-400">{expX.toFixed(4)}</span>
          </div>
        </div>
        {/* Y slider */}
        <div className="border border-border bg-slate-900/40 p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-slate-500 tracking-widest">{tr("inputY")}</span>
            <span className="font-mono-display text-amber-400 text-sm">{yVal.toFixed(2)} {tr("voltUnit")}</span>
          </div>
          <input
            type="range" min="0.1" max="5" step="0.05" value={yVal}
            onChange={e => setYVal(parseFloat(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
            <span>0.1V</span><span>2.5V</span><span>5V</span>
          </div>
          <div className="mt-2 font-mono-display text-[10px] text-amber-300">
            ln({yVal.toFixed(2)}) = <span className="text-emerald-400">{isNaN(lnY) ? "undef" : lnY.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Circuit SVG diagram */}
      <div className="border border-border bg-slate-900/60 p-2 overflow-x-auto">
        <div className="text-[10px] text-slate-600 tracking-widest mb-2 px-1">CIRCUIT DIAGRAM</div>
        <svg viewBox="0 0 560 320" className="w-full max-w-2xl mx-auto" style={{ minWidth: 400 }}>
          {/* ── Wires ── */}
          {/* X input wire → EXP block */}
          <line x1="40" y1="100" x2="100" y2="100" stroke="#64748b" strokeWidth="1.5" strokeDasharray={animating ? "4 3" : "none"} />
          <line x1="100" y1="100" x2="100" y2="130" stroke="#64748b" strokeWidth="1.5" />
          {/* Y input wire → LOG block */}
          <line x1="40" y1="220" x2="100" y2="220" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray={animating ? "4 3" : "none"} />
          <line x1="100" y1="220" x2="100" y2="190" stroke="#f59e0b" strokeWidth="1.5" />
          {/* EXP output → DIFF */}
          <line x1="220" y1="130" x2="300" y2="130" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray={animating ? "4 3" : "none"} />
          <line x1="300" y1="130" x2="300" y2="175" stroke="#06b6d4" strokeWidth="1.5" />
          {/* LOG output → DIFF */}
          <line x1="220" y1="190" x2="300" y2="190" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray={animating ? "4 3" : "none"} />
          <line x1="300" y1="190" x2="300" y2="205" stroke="#f59e0b" strokeWidth="1.5" />
          {/* DIFF output → OUT */}
          <line x1="390" y1="190" x2="520" y2="190" stroke="#10b981" strokeWidth="2" strokeDasharray={animating ? "4 3" : "none"} />

          {/* ── Input labels ── */}
          <text x="10" y="104" fill="#64748b" fontSize="9" fontFamily="Fira Code, monospace">x={xVal.toFixed(1)}V</text>
          <text x="10" y="224" fill="#f59e0b" fontSize="9" fontFamily="Fira Code, monospace">y={yVal.toFixed(1)}V</text>

          {/* ── EXP block (antilog amplifier) ── */}
          <rect x="100" y="100" width="120" height="60" rx="2" fill="#0d2030" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="160" y="118" fill="#06b6d4" fontSize="8" fontFamily="Fira Code, monospace" textAnchor="middle">{tr("blockExp")}</text>
          <BJTSymbol x={130} y={130} color="#06b6d4" />
          <OpAmpSymbol x={158} y={130} label="A₁" color="#06b6d4" />
          <text x="160" y="155" fill="#06b6d4" fontSize="7" fontFamily="Fira Code, monospace" textAnchor="middle">Vout = e^x</text>

          {/* ── LOG block (log amplifier) ── */}
          <rect x="100" y="160" width="120" height="60" rx="2" fill="#1a1500" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="160" y="178" fill="#f59e0b" fontSize="8" fontFamily="Fira Code, monospace" textAnchor="middle">{tr("blockLog")}</text>
          <BJTSymbol x={130} y={190} color="#f59e0b" />
          <OpAmpSymbol x={158} y={190} label="A₂" color="#f59e0b" />
          <text x="160" y="215" fill="#f59e0b" fontSize="7" fontFamily="Fira Code, monospace" textAnchor="middle">Vout = ln(y)</text>

          {/* ── DIFF block (differential summer) ── */}
          <rect x="300" y="155" width="90" height="70" rx="2" fill="#0d1a0d" stroke="#10b981" strokeWidth="1.5" />
          <text x="345" y="170" fill="#10b981" fontSize="7.5" fontFamily="Fira Code, monospace" textAnchor="middle">{tr("blockDiff")}</text>
          <OpAmpSymbol x={320} y={190} label="A₃" color="#10b981" />
          <text x="345" y="218" fill="#10b981" fontSize="7" fontFamily="Fira Code, monospace" textAnchor="middle">V₁ − V₂</text>

          {/* ── Output box ── */}
          <rect x="430" y="170" width="90" height="40" rx="2" fill="#0a1a12" stroke="#10b981" strokeWidth="2" />
          <text x="475" y="186" fill="#10b981" fontSize="8" fontFamily="Fira Code, monospace" textAnchor="middle">{tr("blockOut")}</text>
          <text x="475" y="200" fill="#10b981" fontSize="10" fontFamily="Fira Code, monospace" textAnchor="middle" fontWeight="bold">
            {isNaN(emlOut) ? "undef" : emlOut.toFixed(3)}V
          </text>

          {/* ── Animated signal dots ── */}
          {animating && (
            <>
              <SignalDot path={pathX}    phase={p}           color="#64748b" />
              <SignalDot path={pathExpX} phase={(p+0.25)%1}  color="#06b6d4" />
              <SignalDot path={pathY}    phase={(p+0.1)%1}   color="#f59e0b" />
              <SignalDot path={pathLnY}  phase={(p+0.35)%1}  color="#f59e0b" />
              <SignalDot path={pathOut}  phase={(p+0.6)%1}   color="#10b981" />
            </>
          )}

          {/* ── EML equation label ── */}
          <text x="280" y="295" fill="#475569" fontSize="9" fontFamily="Fira Code, monospace" textAnchor="middle">
            eml(x, y) = exp(x) − ln(y)
          </text>
        </svg>
      </div>

      {/* Animate button + result */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setAnimating(a => !a)}
          className={`px-4 py-2 text-xs font-mono-display border transition-all active:scale-95 ${
            animating
              ? "border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20"
              : "border-emerald-500 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
          }`}
        >
          {animating ? tr("stop") : tr("animate")}
        </button>
        <div className="font-mono-display text-sm">
          <span className="text-slate-500">eml(</span>
          <span className="text-cyan-400">{xVal.toFixed(2)}</span>
          <span className="text-slate-500">, </span>
          <span className="text-amber-400">{yVal.toFixed(2)}</span>
          <span className="text-slate-500">) = </span>
          <span className="text-emerald-400 text-base font-bold">
            {isNaN(emlOut) ? "undefined" : emlOut.toFixed(6)}
          </span>
        </div>
      </div>

      {/* Oscilloscope */}
      <div className="border border-border bg-slate-900/40 p-3">
        <div className="text-[10px] text-slate-500 tracking-widest mb-2">{tr("oscTitle")}</div>
        <OscilloscopeCanvas x={xVal} y={yVal} animPhase={animPhase} lang={lang} />
      </div>

      {/* Circuit equations */}
      <div className="border border-slate-700 bg-slate-800/20 p-3 space-y-1.5">
        <div className="text-[10px] text-slate-400 tracking-widest mb-1">{tr("formulaTitle")}</div>
        <div className="font-mono-display text-[10px] text-amber-300">{tr("formula1")}</div>
        <div className="font-mono-display text-[10px] text-cyan-300">{tr("formula2")}</div>
        <div className="font-mono-display text-[10px] text-emerald-300">{tr("formula3")}</div>
        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-700/50">{tr("analogNote")}</div>
        <div className="text-[10px] text-slate-600 italic">{tr("paperNote")}</div>
      </div>

      {/* Block descriptions */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { color: "cyan", label: tr("blockExp"), desc: tr("expDesc"), eq: "Vout = I_ref · e^(Vin/Vₜ)" },
          { color: "amber", label: tr("blockLog"), desc: tr("logDesc"), eq: "Vout = −Vₜ · ln(Vin/I_ref)" },
          { color: "emerald", label: tr("blockDiff"), desc: tr("diffDesc"), eq: "Vout = V₁ − V₂" },
        ].map(({ color, label, desc, eq }) => (
          <div key={label} className={`border border-${color}-800/40 bg-${color}-900/10 p-2`}>
            <div className={`text-[9px] text-${color}-400 tracking-widest mb-1`}>{label}</div>
            <div className="text-[9px] text-slate-500 mb-1">{desc}</div>
            <div className={`font-mono-display text-[9px] text-${color}-300`}>{eq}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
