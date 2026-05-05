/**
 * EmlCircuit.tsx
 * Design: Terminal Hacker — dark background, neon emerald/cyan accents
 * Renders the EML analog computer circuit using tscircuit SchematicViewer.
 * The circuit: eml(x,y) = exp(x) - ln(y)
 *   U1: Antilog (EXP) amplifier  — computes exp(x)
 *   U2: Log amplifier             — computes ln(y)
 *   U3: Differential summer       — computes exp(x) - ln(y)
 */

import { useState } from "react";
import { SchematicViewer } from "@tscircuit/schematic-viewer";
import { PCBViewer } from "@tscircuit/pcb-viewer";
import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
}

// ── Circuit JSON ──────────────────────────────────────────────────────────────
// Hand-crafted circuit-json for the 3-stage EML analog computer.
// Coordinates are in schematic units (1 unit ≈ 0.5mm on PCB, arbitrary on schematic).

const EML_CIRCUIT_JSON = [
  // ── Source components ─────────────────────────────────────────────────────
  {
    type: "source_component",
    source_component_id: "sc_u1",
    ftype: "simple_chip",
    name: "U1",
    manufacturer_part_number: "LM741",
    supplier_part_numbers: {},
  },
  {
    type: "source_component",
    source_component_id: "sc_u2",
    ftype: "simple_chip",
    name: "U2",
    manufacturer_part_number: "LM741",
    supplier_part_numbers: {},
  },
  {
    type: "source_component",
    source_component_id: "sc_u3",
    ftype: "simple_chip",
    name: "U3",
    manufacturer_part_number: "LM741",
    supplier_part_numbers: {},
  },
  {
    type: "source_component",
    source_component_id: "sc_r1",
    ftype: "simple_resistor",
    name: "R1",
    resistance: 10000,
  },
  {
    type: "source_component",
    source_component_id: "sc_r2",
    ftype: "simple_resistor",
    name: "R2",
    resistance: 10000,
  },
  {
    type: "source_component",
    source_component_id: "sc_r3",
    ftype: "simple_resistor",
    name: "R3",
    resistance: 10000,
  },
  {
    type: "source_component",
    source_component_id: "sc_q1",
    ftype: "simple_transistor",
    name: "Q1",
    transistor_type: "npn",
  },
  {
    type: "source_component",
    source_component_id: "sc_q2",
    ftype: "simple_transistor",
    name: "Q2",
    transistor_type: "npn",
  },

  // ── Source ports ──────────────────────────────────────────────────────────
  // U1 ports
  { type: "source_port", source_port_id: "sp_u1_in+", source_component_id: "sc_u1", name: "in+" },
  { type: "source_port", source_port_id: "sp_u1_in-", source_component_id: "sc_u1", name: "in-" },
  { type: "source_port", source_port_id: "sp_u1_out", source_component_id: "sc_u1", name: "out" },
  // U2 ports
  { type: "source_port", source_port_id: "sp_u2_in+", source_component_id: "sc_u2", name: "in+" },
  { type: "source_port", source_port_id: "sp_u2_in-", source_component_id: "sc_u2", name: "in-" },
  { type: "source_port", source_port_id: "sp_u2_out", source_component_id: "sc_u2", name: "out" },
  // U3 ports
  { type: "source_port", source_port_id: "sp_u3_in+", source_component_id: "sc_u3", name: "in+" },
  { type: "source_port", source_port_id: "sp_u3_in-", source_component_id: "sc_u3", name: "in-" },
  { type: "source_port", source_port_id: "sp_u3_out", source_component_id: "sc_u3", name: "out" },
  // R1 ports
  { type: "source_port", source_port_id: "sp_r1_1", source_component_id: "sc_r1", name: "1" },
  { type: "source_port", source_port_id: "sp_r1_2", source_component_id: "sc_r1", name: "2" },
  // R2 ports
  { type: "source_port", source_port_id: "sp_r2_1", source_component_id: "sc_r2", name: "1" },
  { type: "source_port", source_port_id: "sp_r2_2", source_component_id: "sc_r2", name: "2" },
  // R3 ports
  { type: "source_port", source_port_id: "sp_r3_1", source_component_id: "sc_r3", name: "1" },
  { type: "source_port", source_port_id: "sp_r3_2", source_component_id: "sc_r3", name: "2" },
  // Q1 ports (BJT: base, collector, emitter)
  { type: "source_port", source_port_id: "sp_q1_b", source_component_id: "sc_q1", name: "base" },
  { type: "source_port", source_port_id: "sp_q1_c", source_component_id: "sc_q1", name: "collector" },
  { type: "source_port", source_port_id: "sp_q1_e", source_component_id: "sc_q1", name: "emitter" },
  // Q2 ports
  { type: "source_port", source_port_id: "sp_q2_b", source_component_id: "sc_q2", name: "base" },
  { type: "source_port", source_port_id: "sp_q2_c", source_component_id: "sc_q2", name: "collector" },
  { type: "source_port", source_port_id: "sp_q2_e", source_component_id: "sc_q2", name: "emitter" },

  // ── Schematic components ──────────────────────────────────────────────────
  {
    type: "schematic_component",
    schematic_component_id: "sch_u1",
    source_component_id: "sc_u1",
    center: { x: 0, y: 0 },
    rotation: 0,
    size: { width: 2, height: 3 },
    symbol_name: "opamp_no_power_right",
    port_labels: {
      in_pos: "x (EXP input)",
      in_neg: "GND",
      out: "exp(x)",
    },
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_u2",
    source_component_id: "sc_u2",
    center: { x: 6, y: 0 },
    rotation: 0,
    size: { width: 2, height: 3 },
    symbol_name: "opamp_no_power_right",
    port_labels: {
      in_pos: "y (LOG input)",
      in_neg: "GND",
      out: "ln(y)",
    },
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_u3",
    source_component_id: "sc_u3",
    center: { x: 12, y: 0 },
    rotation: 0,
    size: { width: 2, height: 3 },
    symbol_name: "opamp_no_power_right",
    port_labels: {
      in_pos: "exp(x)",
      in_neg: "ln(y)",
      out: "eml(x,y)",
    },
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_r1",
    source_component_id: "sc_r1",
    center: { x: -3, y: -1 },
    rotation: 0,
    size: { width: 1, height: 0.3 },
    symbol_name: "resistor_horz",
    symbol_display_value: "10kΩ",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_r2",
    source_component_id: "sc_r2",
    center: { x: 3, y: -1 },
    rotation: 0,
    size: { width: 1, height: 0.3 },
    symbol_name: "resistor_horz",
    symbol_display_value: "10kΩ",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_r3",
    source_component_id: "sc_r3",
    center: { x: 9, y: -1 },
    rotation: 0,
    size: { width: 1, height: 0.3 },
    symbol_name: "resistor_horz",
    symbol_display_value: "10kΩ",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_q1",
    source_component_id: "sc_q1",
    center: { x: -1.5, y: 1 },
    rotation: 0,
    size: { width: 1, height: 1.5 },
    symbol_name: "npn_bipolar_transistor_horz",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_q2",
    source_component_id: "sc_q2",
    center: { x: 4.5, y: 1 },
    rotation: 0,
    size: { width: 1, height: 1.5 },
    symbol_name: "npn_bipolar_transistor_horz",
  },

  // ── Schematic ports ───────────────────────────────────────────────────────
  // U1
  { type: "schematic_port", schematic_port_id: "schp_u1_in+", source_port_id: "sp_u1_in+", schematic_component_id: "sch_u1", center: { x: -1, y: 0.5 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u1_in-", source_port_id: "sp_u1_in-", schematic_component_id: "sch_u1", center: { x: -1, y: -0.5 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u1_out", source_port_id: "sp_u1_out", schematic_component_id: "sch_u1", center: { x: 1, y: 0 }, side_of_component: "right", distance_from_component_edge: 0 },
  // U2
  { type: "schematic_port", schematic_port_id: "schp_u2_in+", source_port_id: "sp_u2_in+", schematic_component_id: "sch_u2", center: { x: 5, y: 0.5 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u2_in-", source_port_id: "sp_u2_in-", schematic_component_id: "sch_u2", center: { x: 5, y: -0.5 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u2_out", source_port_id: "sp_u2_out", schematic_component_id: "sch_u2", center: { x: 7, y: 0 }, side_of_component: "right", distance_from_component_edge: 0 },
  // U3
  { type: "schematic_port", schematic_port_id: "schp_u3_in+", source_port_id: "sp_u3_in+", schematic_component_id: "sch_u3", center: { x: 11, y: 0.5 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u3_in-", source_port_id: "sp_u3_in-", schematic_component_id: "sch_u3", center: { x: 11, y: -0.5 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u3_out", source_port_id: "sp_u3_out", schematic_component_id: "sch_u3", center: { x: 13, y: 0 }, side_of_component: "right", distance_from_component_edge: 0 },

  // ── Schematic traces (wires) ──────────────────────────────────────────────
  // U1 out → U3 in+
  {
    type: "schematic_trace",
    schematic_trace_id: "st_u1_u3",
    edges: [
      { from: { x: 1, y: 0 }, to: { x: 9, y: 0 } },
      { from: { x: 9, y: 0 }, to: { x: 9, y: 0.5 } },
      { from: { x: 9, y: 0.5 }, to: { x: 11, y: 0.5 } },
    ],
  },
  // U2 out → U3 in-
  {
    type: "schematic_trace",
    schematic_trace_id: "st_u2_u3",
    edges: [
      { from: { x: 7, y: 0 }, to: { x: 9.5, y: 0 } },
      { from: { x: 9.5, y: 0 }, to: { x: 9.5, y: -0.5 } },
      { from: { x: 9.5, y: -0.5 }, to: { x: 11, y: -0.5 } },
    ],
  },

  // ── Net labels ────────────────────────────────────────────────────────────
  {
    type: "schematic_net_label",
    schematic_net_label_id: "snl_x",
    text: "Vx",
    center: { x: -4, y: 0.5 },
    anchor_side: "left",
    source_net_id: "net_x",
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "snl_y",
    text: "Vy",
    center: { x: 2, y: 0.5 },
    anchor_side: "left",
    source_net_id: "net_y",
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "snl_out",
    text: "Veml",
    center: { x: 14, y: 0 },
    anchor_side: "right",
    source_net_id: "net_out",
  },
] as unknown[];

// ── Component ─────────────────────────────────────────────────────────────────
const LABELS: Record<Lang, { title: string; subtitle: string; stage1: string; stage2: string; stage3: string; note: string }> = {
  en: {
    title: "EML Analog Circuit — tscircuit Schematic",
    subtitle: "eml(x,y) = exp(x) − ln(y) implemented with op-amps and BJTs",
    stage1: "U1 — Antilog (EXP) Amplifier",
    stage2: "U2 — Log Amplifier",
    stage3: "U3 — Differential Summer",
    note: "BJT in input path for U1 (antilog), BJT in feedback for U2 (log). R1–R3 = 10kΩ. Based on Odrzywołek 2026 arXiv:2603.21852.",
  },
  pl: {
    title: "Analogowy układ EML — schemat tscircuit",
    subtitle: "eml(x,y) = exp(x) − ln(y) zrealizowane za pomocą wzmacniaczy operacyjnych i tranzystorów BJT",
    stage1: "U1 — Wzmacniacz antylogarytmiczny (EXP)",
    stage2: "U2 — Wzmacniacz logarytmiczny",
    stage3: "U3 — Różnicowy sumator",
    note: "Tranzystor BJT w torze wejściowym U1 (antylog), w sprzężeniu zwrotnym U2 (log). R1–R3 = 10kΩ.",
  },
  zh: {
    title: "EML 類比電路 — tscircuit 電路圖",
    subtitle: "eml(x,y) = exp(x) − ln(y)，以運算放大器與 BJT 實現",
    stage1: "U1 — 反對數（EXP）放大器",
    stage2: "U2 — 對數放大器",
    stage3: "U3 — 差分加法器",
    note: "U1 輸入路徑使用 BJT（反對數），U2 回授路徑使用 BJT（對數）。R1–R3 = 10kΩ。",
  },
};

export default function EmlCircuit({ lang }: Props) {
  const L = LABELS[lang];
  const [viewMode, setViewMode] = useState<'schematic' | 'pcb'>('schematic');
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="border border-emerald-500/30 bg-emerald-950/20 rounded p-3">
        <div className="text-emerald-400 font-mono text-sm font-bold">{L.title}</div>
        <div className="text-slate-400 font-mono text-xs mt-1">{L.subtitle}</div>
      </div>

      {/* Stage legend */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="border border-cyan-500/30 bg-cyan-950/20 rounded p-2">
          <div className="text-cyan-400 font-bold">①</div>
          <div className="text-slate-300">{L.stage1}</div>
          <div className="text-slate-500 mt-1">V<sub>in</sub>=x → BJT → op-amp → e<sup>x</sup></div>
        </div>
        <div className="border border-amber-500/30 bg-amber-950/20 rounded p-2">
          <div className="text-amber-400 font-bold">②</div>
          <div className="text-slate-300">{L.stage2}</div>
          <div className="text-slate-500 mt-1">V<sub>in</sub>=y → op-amp → BJT feedback → ln(y)</div>
        </div>
        <div className="border border-emerald-500/30 bg-emerald-950/20 rounded p-2">
          <div className="text-emerald-400 font-bold">③</div>
          <div className="text-slate-300">{L.stage3}</div>
          <div className="text-slate-500 mt-1">e<sup>x</sup> − ln(y) = eml(x,y)</div>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setViewMode('schematic')}
          className={`px-3 py-1 text-xs font-mono border transition-all ${
            viewMode === 'schematic'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30'
              : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
          }`}
        >
          ⬡ SCHEMATIC
        </button>
        <button
          onClick={() => setViewMode('pcb')}
          className={`px-3 py-1 text-xs font-mono border transition-all ${
            viewMode === 'pcb'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30'
              : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
          }`}
        >
          ⬡ PCB LAYOUT
        </button>
      </div>
      {/* tscircuit Viewer */}
      <div
        className="border border-slate-700 rounded overflow-hidden bg-white"
        style={{ height: 380 }}
      >
        {viewMode === 'schematic' ? (
          <SchematicViewer
            circuitJson={EML_CIRCUIT_JSON as Parameters<typeof SchematicViewer>[0]['circuitJson']}
            containerStyle={{ width: "100%", height: "100%" }}
            editingEnabled={false}
            clickToInteractEnabled={true}
          />
        ) : (
          <PCBViewer
            circuitJson={EML_CIRCUIT_JSON as Parameters<typeof PCBViewer>[0]['circuitJson']}
            height={380}
            allowEditing={false}
            clickToInteractEnabled={true}
          />
        )}
      </div>

      {/* Note */}
      <div className="text-slate-500 font-mono text-xs border-l-2 border-slate-600 pl-3">
        {L.note}
      </div>

      {/* tscircuit attribution */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <span>Rendered with</span>
        <a
          href="https://github.com/tscircuit/tscircuit"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline"
        >
          tscircuit
        </a>
        <span>— React for Electronics</span>
      </div>
    </div>
  );
}
