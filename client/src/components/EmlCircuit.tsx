/**
 * EmlCircuit.tsx
 * Design: Terminal Hacker — dark background, neon emerald/cyan accents
 *
 * Three separate tscircuit SchematicViewer panels:
 *   U1 — Antilog (EXP) amplifier:  BJT in input path,  Vx → R1 → Q1(base) → U1(inp+) → exp(x)
 *   U2 — Log amplifier:             BJT in feedback,    Vy → R2 → U2(inp+) → Q2(feedback) → ln(y)
 *   U3 — Differential summer:       exp(x)→inp+, ln(y)→R3→inp−, output = exp(x)−ln(y)
 *
 * Port matching rule (circuit-to-svg@0.0.227):
 *   angle(schComponent.center → schPort.center) must be within PI/4 of
 *   angle(symbol.center → symbolPort.position)
 *
 * All schematic_port centers computed from verified symbol port angles
 * (schematic-symbols@0.0.208):
 *   opamp_no_power_right: inp1=167.2°, inp2=-166.2°, out=-1.3°
 *   boxresistor_right:    port1=180°,  port2=0°
 *   capacitor_right:      pos=180°,    neg=0°
 *   npn_bipolar_transistor_horz: collector=152.2°, emitter=27.8°, base=-90°
 *   ground_down: port1=88°
 *   vcc_up:      port1=-90°
 *   vcc_down:    port1=90°
 */

import { useState } from "react";
import { SchematicViewer } from "@tscircuit/schematic-viewer";
import { PCBViewer } from "@tscircuit/pcb-viewer";
import type { Lang } from "@/lib/i18n";

interface Props { lang: Lang }

// ── Helpers ───────────────────────────────────────────────────────────────────
type Pt = { x: number; y: number };
type CircuitEl = Record<string, unknown>;

function sc(id: string, ftype: string, name: string, extra: Record<string, unknown> = {}): CircuitEl {
  return { type: "source_component", source_component_id: id, ftype, name, manufacturer_part_number: "", supplier_part_numbers: {}, ...extra };
}
function sp(id: string, compId: string, name: string): CircuitEl {
  return { type: "source_port", source_port_id: id, source_component_id: compId, name };
}
function schComp(id: string, srcId: string, cx: number, cy: number, w: number, h: number, sym: string, disp: string): CircuitEl {
  return { type: "schematic_component", schematic_component_id: id, source_component_id: srcId, center: { x: cx, y: cy }, rotation: 0, size: { width: w, height: h }, symbol_name: sym, symbol_display_value: disp };
}
function schPort(id: string, srcPortId: string, compId: string, cx: number, cy: number, side: string): CircuitEl {
  return { type: "schematic_port", schematic_port_id: id, source_port_id: srcPortId, schematic_component_id: compId, center: { x: cx, y: cy }, side_of_component: side, distance_from_component_edge: 0 };
}
function trace(id: string, ...pts: Pt[]): CircuitEl {
  const edges = [];
  for (let i = 0; i < pts.length - 1; i++) edges.push({ from: pts[i], to: pts[i + 1] });
  return { type: "schematic_trace", schematic_trace_id: id, edges };
}
function netLabel(id: string, text: string, cx: number, cy: number, side: "left" | "right" | "top" | "bottom"): CircuitEl {
  return { type: "schematic_net_label", schematic_net_label_id: id, text, center: { x: cx, y: cy }, anchor_side: side, source_net_id: `net_${id}` };
}

// ── U1 Circuit JSON — Antilog (EXP) Amplifier ─────────────────────────────
// Layout:
//   R1 at (-3, 0.5)  Q1 at (0, 1.5)  U1 at (4, 0)
//   C1 at (4, -2.5)  GND at (2.8, -0.8)  VCC+ at (4,-1.5)  VCC- at (4,1.5)
const U1_CIRCUIT: CircuitEl[] = [
  // Source components
  sc("sc_u1", "simple_chip",       "U1", { manufacturer_part_number: "LM741" }),
  sc("sc_r1", "simple_resistor",   "R1", { resistance: 10000 }),
  sc("sc_c1", "simple_capacitor",  "C1", { capacitance: 1e-7 }),
  sc("sc_q1", "simple_transistor", "Q1", { transistor_type: "npn" }),
  // Source ports
  sp("sp_u1_inp1", "sc_u1", "inp1"),
  sp("sp_u1_inp2", "sc_u1", "inp2"),
  sp("sp_u1_out",  "sc_u1", "out"),
  sp("sp_r1_1",    "sc_r1", "1"),
  sp("sp_r1_2",    "sc_r1", "2"),
  sp("sp_c1_1",    "sc_c1", "1"),
  sp("sp_c1_2",    "sc_c1", "2"),
  sp("sp_q1_c",    "sc_q1", "collector"),
  sp("sp_q1_e",    "sc_q1", "emitter"),
  sp("sp_q1_b",    "sc_q1", "base"),
  // Schematic components
  schComp("sch_u1",      "sc_u1", 4,    0,    2,   2,   "opamp_no_power_right",        "U1 LM741"),
  schComp("sch_r1",      "sc_r1", -3,   0.5,  1.5, 0.4, "boxresistor_right",           "R1 10kΩ"),
  schComp("sch_c1",      "sc_c1", 4,    -2.5, 1.2, 0.4, "capacitor_right",             "C1 100nF"),
  schComp("sch_q1",      "sc_q1", 0,    1.5,  1.2, 1.2, "npn_bipolar_transistor_horz", "Q1 2N3904"),
  schComp("sch_gnd_u1",  "sc_u1", 2.8,  -0.8, 0.5, 0.5, "ground_down",                "GND"),
  schComp("sch_vcc_u1",  "sc_u1", 4,    -1.5, 0.5, 0.5, "vcc_up",                     "+15V"),
  schComp("sch_vccn_u1", "sc_u1", 4,    1.5,  0.5, 0.5, "vcc_down",                   "−15V"),
  // Schematic ports — centers from angle computation
  // U1 (center 4,0 size 2×2, r=1.2): inp1@167.2°→(2.83,0.267), inp2@-166.2°→(2.835,-0.286), out@-1.3°→(5.2,-0.028)
  schPort("schp_u1_inp1", "sp_u1_inp1", "sch_u1", 2.83,  0.267,  "left"),
  schPort("schp_u1_inp2", "sp_u1_inp2", "sch_u1", 2.835, -0.286, "left"),
  schPort("schp_u1_out",  "sp_u1_out",  "sch_u1", 5.2,   -0.028, "right"),
  // R1 (center -3,0.5 size 1.5×0.4, r=0.9): port1@180°→(-3.9,0.5), port2@0°→(-2.1,0.5)
  schPort("schp_r1_1", "sp_r1_1", "sch_r1", -3.9, 0.5, "left"),
  schPort("schp_r1_2", "sp_r1_2", "sch_r1", -2.1, 0.5, "right"),
  // C1 (center 4,-2.5 size 1.2×0.4, r=0.72): pos@180°→(3.28,-2.5), neg@0°→(4.72,-2.5)
  schPort("schp_c1_1", "sp_c1_1", "sch_c1", 3.28, -2.5, "left"),
  schPort("schp_c1_2", "sp_c1_2", "sch_c1", 4.72, -2.5, "right"),
  // Q1 (center 0,1.5 size 1.2×1.2, r=0.72): collector@152.2°→(-0.637,1.836), emitter@27.8°→(0.637,1.836), base@-90°→(0,0.78)
  schPort("schp_q1_c", "sp_q1_c", "sch_q1", -0.637, 1.836, "left"),
  schPort("schp_q1_e", "sp_q1_e", "sch_q1",  0.637, 1.836, "right"),
  schPort("schp_q1_b", "sp_q1_b", "sch_q1",  0,     0.78,  "top"),
  // GND (center 2.8,-0.8 size 0.5×0.5, r=0.3): port1@88°→(2.81,-0.5)
  schPort("schp_gnd_u1", "sp_u1_inp2", "sch_gnd_u1", 2.81, -0.5, "top"),
  // VCC+ (center 4,-1.5 size 0.5×0.5, r=0.3): port1@-90°→(4,-1.8)
  schPort("schp_vcc_u1",  "sp_u1_inp1", "sch_vcc_u1",  4, -1.8, "bottom"),
  // VCC- (center 4,1.5 size 0.5×0.5, r=0.3): port1@90°→(4,1.8)
  schPort("schp_vccn_u1", "sp_u1_inp1", "sch_vccn_u1", 4,  1.8, "top"),
  // Traces
  // Vx net label → R1 left
  netLabel("vx_in", "Vx", -5.5, 0.5, "left"),
  trace("t_vx_r1",   {x:-5,y:0.5}, {x:-3.9,y:0.5}),
  // R1 right → Q1 base (via junction at x=-1.5)
  trace("t_r1_q1b",  {x:-2.1,y:0.5}, {x:-1.5,y:0.5}, {x:-1.5,y:0.78}, {x:0,y:0.78}),
  // Q1 collector → U1 inp+ (non-inverting)
  trace("t_q1c_u1p", {x:-0.637,y:1.836}, {x:-0.637,y:0.267}, {x:2.83,y:0.267}),
  // U1 inp- → GND
  trace("t_u1n_gnd", {x:2.835,y:-0.286}, {x:2.81,y:-0.286}, {x:2.81,y:-0.5}),
  // Q1 emitter → GND (separate ground symbol)
  trace("t_q1e_gnd", {x:0.637,y:1.836}, {x:1.5,y:1.836}, {x:1.5,y:2.5}),
  netLabel("gnd_q1e", "GND", 1.5, 2.8, "bottom"),
  // U1 out → C1 neg (feedback cap)
  trace("t_u1_c1",   {x:5.2,y:-0.028}, {x:6,y:-0.028}, {x:6,y:-2.5}, {x:4.72,y:-2.5}),
  // C1 pos → U1 inp- (feedback loop closes)
  trace("t_c1_u1n",  {x:3.28,y:-2.5}, {x:2.5,y:-2.5}, {x:2.5,y:-0.286}, {x:2.835,y:-0.286}),
  // U1 out → exp(x) output label
  trace("t_u1_out",  {x:5.2,y:-0.028}, {x:7,y:-0.028}),
  netLabel("expx_out", "exp(x)", 7.2, -0.028, "right"),
];

// ── U2 Circuit JSON — Log Amplifier ──────────────────────────────────────────
// Layout:
//   R2 at (-3, 0.5)  U2 at (4, 0)  Q2 at (6.5, -1.5)
//   GND at (2.8, -0.8)  VCC+ at (4,-1.5)  VCC- at (4,1.5)
const U2_CIRCUIT: CircuitEl[] = [
  sc("sc_u2", "simple_chip",       "U2", { manufacturer_part_number: "LM741" }),
  sc("sc_r2", "simple_resistor",   "R2", { resistance: 10000 }),
  sc("sc_q2", "simple_transistor", "Q2", { transistor_type: "npn" }),
  sp("sp_u2_inp1", "sc_u2", "inp1"),
  sp("sp_u2_inp2", "sc_u2", "inp2"),
  sp("sp_u2_out",  "sc_u2", "out"),
  sp("sp_r2_1",    "sc_r2", "1"),
  sp("sp_r2_2",    "sc_r2", "2"),
  sp("sp_q2_c",    "sc_q2", "collector"),
  sp("sp_q2_e",    "sc_q2", "emitter"),
  sp("sp_q2_b",    "sc_q2", "base"),
  schComp("sch_u2",      "sc_u2", 4,    0,    2,   2,   "opamp_no_power_right",        "U2 LM741"),
  schComp("sch_r2",      "sc_r2", -3,   0.5,  1.5, 0.4, "boxresistor_right",           "R2 10kΩ"),
  schComp("sch_q2",      "sc_q2", 6.5,  -1.5, 1.2, 1.2, "npn_bipolar_transistor_horz", "Q2 2N3904"),
  schComp("sch_gnd_u2",  "sc_u2", 2.8,  -0.8, 0.5, 0.5, "ground_down",                "GND"),
  schComp("sch_vcc_u2",  "sc_u2", 4,    -1.5, 0.5, 0.5, "vcc_up",                     "+15V"),
  schComp("sch_vccn_u2", "sc_u2", 4,    1.5,  0.5, 0.5, "vcc_down",                   "−15V"),
  // U2 ports (same geometry as U1)
  schPort("schp_u2_inp1", "sp_u2_inp1", "sch_u2", 2.83,  0.267,  "left"),
  schPort("schp_u2_inp2", "sp_u2_inp2", "sch_u2", 2.835, -0.286, "left"),
  schPort("schp_u2_out",  "sp_u2_out",  "sch_u2", 5.2,   -0.028, "right"),
  // R2 ports
  schPort("schp_r2_1", "sp_r2_1", "sch_r2", -3.9, 0.5, "left"),
  schPort("schp_r2_2", "sp_r2_2", "sch_r2", -2.1, 0.5, "right"),
  // Q2 (center 6.5,-1.5 size 1.2×1.2, r=0.72): collector@152.2°→(5.863,-1.164), emitter@27.8°→(7.137,-1.164), base@-90°→(6.5,-2.22)
  schPort("schp_q2_c", "sp_q2_c", "sch_q2", 5.863, -1.164, "left"),
  schPort("schp_q2_e", "sp_q2_e", "sch_q2", 7.137, -1.164, "right"),
  schPort("schp_q2_b", "sp_q2_b", "sch_q2", 6.5,   -2.22,  "bottom"),
  // GND / VCC
  schPort("schp_gnd_u2",  "sp_u2_inp2", "sch_gnd_u2",  2.81, -0.5, "top"),
  schPort("schp_vcc_u2",  "sp_u2_inp1", "sch_vcc_u2",  4,    -1.8, "bottom"),
  schPort("schp_vccn_u2", "sp_u2_inp1", "sch_vccn_u2", 4,     1.8, "top"),
  // Traces
  netLabel("vy_in", "Vy", -5.5, 0.5, "left"),
  trace("t_vy_r2",    {x:-5,y:0.5}, {x:-3.9,y:0.5}),
  // R2 right → U2 inp+ (non-inverting)
  trace("t_r2_u2p",   {x:-2.1,y:0.5}, {x:2.83,y:0.5}, {x:2.83,y:0.267}),
  // U2 inp- → GND
  trace("t_u2n_gnd",  {x:2.835,y:-0.286}, {x:2.81,y:-0.286}, {x:2.81,y:-0.5}),
  // U2 out → Q2 base (BJT in feedback)
  trace("t_u2_q2b",   {x:5.2,y:-0.028}, {x:6,y:-0.028}, {x:6,y:-2.22}, {x:6.5,y:-2.22}),
  // Q2 collector → U2 inp- (feedback closes loop)
  trace("t_q2c_u2n",  {x:5.863,y:-1.164}, {x:5.5,y:-1.164}, {x:5.5,y:-0.286}, {x:2.835,y:-0.286}),
  // Q2 emitter → GND
  trace("t_q2e_gnd",  {x:7.137,y:-1.164}, {x:8,y:-1.164}, {x:8,y:-0.5}),
  netLabel("gnd_q2e", "GND", 8, -0.2, "right"),
  // U2 out → ln(y) output label
  trace("t_u2_out",   {x:5.2,y:-0.028}, {x:7,y:-0.028}),
  netLabel("lny_out", "ln(y)", 7.2, -0.028, "right"),
];

// ── U3 Circuit JSON — Differential Summer ────────────────────────────────────
// Layout:
//   U3 at (4, 0)
//   R3 at (1, -0.5) — on inverting input (ln(y) path)
//   R4 at (5.5, -1.5) — feedback resistor
//   GND at (2.8, -0.8)  VCC+ at (4,-1.5)  VCC- at (4,1.5)
const U3_CIRCUIT: CircuitEl[] = [
  sc("sc_u3", "simple_chip",     "U3", { manufacturer_part_number: "LM741" }),
  sc("sc_r3", "simple_resistor", "R3", { resistance: 10000 }),
  sc("sc_r4", "simple_resistor", "R4", { resistance: 10000 }),
  sp("sp_u3_inp1", "sc_u3", "inp1"),
  sp("sp_u3_inp2", "sc_u3", "inp2"),
  sp("sp_u3_out",  "sc_u3", "out"),
  sp("sp_r3_1",    "sc_r3", "1"),
  sp("sp_r3_2",    "sc_r3", "2"),
  sp("sp_r4_1",    "sc_r4", "1"),
  sp("sp_r4_2",    "sc_r4", "2"),
  schComp("sch_u3",      "sc_u3", 4,    0,    2,   2,   "opamp_no_power_right", "U3 LM741"),
  schComp("sch_r3",      "sc_r3", 1,    -0.5, 1.5, 0.4, "boxresistor_right",    "R3 10kΩ"),
  schComp("sch_r4",      "sc_r4", 5.5,  -1.5, 1.5, 0.4, "boxresistor_right",    "R4 10kΩ"),
  schComp("sch_gnd_u3",  "sc_u3", 2.8,  -0.8, 0.5, 0.5, "ground_down",          "GND"),
  schComp("sch_vcc_u3",  "sc_u3", 4,    -1.5, 0.5, 0.5, "vcc_up",               "+15V"),
  schComp("sch_vccn_u3", "sc_u3", 4,    1.5,  0.5, 0.5, "vcc_down",             "−15V"),
  // U3 ports
  schPort("schp_u3_inp1", "sp_u3_inp1", "sch_u3", 2.83,  0.267,  "left"),
  schPort("schp_u3_inp2", "sp_u3_inp2", "sch_u3", 2.835, -0.286, "left"),
  schPort("schp_u3_out",  "sp_u3_out",  "sch_u3", 5.2,   -0.028, "right"),
  // R3 (center 1,-0.5 size 1.5×0.4, r=0.9): port1@180°→(0.1,-0.5), port2@0°→(1.9,-0.5)
  schPort("schp_r3_1", "sp_r3_1", "sch_r3", 0.1, -0.5, "left"),
  schPort("schp_r3_2", "sp_r3_2", "sch_r3", 1.9, -0.5, "right"),
  // R4 (center 5.5,-1.5 size 1.5×0.4, r=0.9): port1@180°→(4.6,-1.5), port2@0°→(6.4,-1.5)
  schPort("schp_r4_1", "sp_r4_1", "sch_r4", 4.6, -1.5, "left"),
  schPort("schp_r4_2", "sp_r4_2", "sch_r4", 6.4, -1.5, "right"),
  // GND / VCC
  schPort("schp_gnd_u3",  "sp_u3_inp2", "sch_gnd_u3",  2.81, -0.5, "top"),
  schPort("schp_vcc_u3",  "sp_u3_inp1", "sch_vcc_u3",  4,    -1.8, "bottom"),
  schPort("schp_vccn_u3", "sp_u3_inp1", "sch_vccn_u3", 4,     1.8, "top"),
  // Traces
  // exp(x) → U3 inp+ (non-inverting)
  netLabel("expx_in", "exp(x)", -2.5, 0.267, "left"),
  trace("t_expx_u3p", {x:-2,y:0.267}, {x:2.83,y:0.267}),
  // ln(y) → R3 left
  netLabel("lny_in", "ln(y)", -2.5, -0.5, "left"),
  trace("t_lny_r3",   {x:-2,y:-0.5}, {x:0.1,y:-0.5}),
  // R3 right → U3 inp- (inverting)
  trace("t_r3_u3n",   {x:1.9,y:-0.5}, {x:2.5,y:-0.5}, {x:2.5,y:-0.286}, {x:2.835,y:-0.286}),
  // U3 inp- → GND (via R3 junction)
  trace("t_u3n_gnd",  {x:2.835,y:-0.286}, {x:2.81,y:-0.286}, {x:2.81,y:-0.5}),
  // U3 out → R4 right (feedback)
  trace("t_u3_r4",    {x:5.2,y:-0.028}, {x:6.4,y:-0.028}, {x:6.4,y:-1.5}),
  // R4 left → U3 inp- junction
  trace("t_r4_u3n",   {x:4.6,y:-1.5}, {x:2.5,y:-1.5}, {x:2.5,y:-0.286}),
  // U3 out → Veml output
  trace("t_u3_out",   {x:5.2,y:-0.028}, {x:7,y:-0.028}),
  netLabel("veml_out", "Veml = exp(x)−ln(y)", 7.2, -0.028, "right"),
];

// ── i18n ─────────────────────────────────────────────────────────────────────
const LABELS: Record<Lang, {
  title: string; subtitle: string;
  u1title: string; u1desc: string;
  u2title: string; u2desc: string;
  u3title: string; u3desc: string;
  note: string;
}> = {
  en: {
    title: "EML Analog Computer — Three-Stage Circuit",
    subtitle: "eml(x,y) = exp(x) − ln(y)  ·  LM741 op-amps  ·  ±15V supply",
    u1title: "① U1 — Antilog (EXP) Amplifier",
    u1desc:  "BJT Q1 in input path. Vx → R1 → Q1(base). Q1(collector) → U1(+). C1 = stability feedback cap. Output: exp(x).",
    u2title: "② U2 — Log Amplifier",
    u2desc:  "BJT Q2 in feedback path. Vy → R2 → U2(+). U2(out) → Q2(base). Q2(collector) → U2(−). Output: ln(y).",
    u3title: "③ U3 — Differential Summer",
    u3desc:  "exp(x) → U3(+). ln(y) → R3 → U3(−). R4 = feedback. Output: exp(x) − ln(y) = eml(x,y).",
    note: "Based on Odrzywołek 2026 arXiv:2603.21852. All resistors 10kΩ. C1 = 100nF. BJTs: 2N3904 or equivalent.",
  },
  pl: {
    title: "Analogowy komputer EML — układ trójstopniowy",
    subtitle: "eml(x,y) = exp(x) − ln(y)  ·  wzmacniacze LM741  ·  zasilanie ±15V",
    u1title: "① U1 — Wzmacniacz antylogarytmiczny (EXP)",
    u1desc:  "Tranzystor Q1 w torze wejściowym. Vx → R1 → Q1(baza). Q1(kolektor) → U1(+). C1 = kondensator stabilizujący. Wyjście: exp(x).",
    u2title: "② U2 — Wzmacniacz logarytmiczny",
    u2desc:  "Tranzystor Q2 w pętli sprzężenia zwrotnego. Vy → R2 → U2(+). U2(wyj) → Q2(baza). Q2(kolektor) → U2(−). Wyjście: ln(y).",
    u3title: "③ U3 — Różnicowy sumator",
    u3desc:  "exp(x) → U3(+). ln(y) → R3 → U3(−). R4 = sprzężenie zwrotne. Wyjście: exp(x) − ln(y) = eml(x,y).",
    note: "Na podstawie Odrzywołek 2026 arXiv:2603.21852. Rezystory 10kΩ. C1 = 100nF. Tranzystory: 2N3904 lub równoważne.",
  },
  zh: {
    title: "EML 類比計算機 — 三級電路",
    subtitle: "eml(x,y) = exp(x) − ln(y)  ·  LM741 運算放大器  ·  ±15V 電源",
    u1title: "① U1 — 反對數（EXP）放大器",
    u1desc:  "BJT Q1 位於輸入路徑。Vx → R1 → Q1(基極)。Q1(集極) → U1(+)。C1 = 穩定回授電容。輸出：exp(x)。",
    u2title: "② U2 — 對數放大器",
    u2desc:  "BJT Q2 位於回授路徑。Vy → R2 → U2(+)。U2(輸出) → Q2(基極)。Q2(集極) → U2(−)。輸出：ln(y)。",
    u3title: "③ U3 — 差分加法器",
    u3desc:  "exp(x) → U3(+)。ln(y) → R3 → U3(−)。R4 = 回授。輸出：exp(x) − ln(y) = eml(x,y)。",
    note: "基於 Odrzywołek 2026 arXiv:2603.21852。所有電阻 10kΩ。C1 = 100nF。BJT：2N3904 或等效元件。",
  },
};

// ── Stage card component ──────────────────────────────────────────────────────
interface StageProps {
  color: "cyan" | "amber" | "emerald";
  title: string;
  desc: string;
  circuit: CircuitEl[];
  viewMode: "schematic" | "pcb";
}
function StageCard({ color, title, desc, circuit, viewMode }: StageProps) {
  const border = color === "cyan" ? "border-cyan-500/40" : color === "amber" ? "border-amber-500/40" : "border-emerald-500/40";
  const bg     = color === "cyan" ? "bg-cyan-950/20"    : color === "amber" ? "bg-amber-950/20"    : "bg-emerald-950/20";
  const text   = color === "cyan" ? "text-cyan-400"     : color === "amber" ? "text-amber-400"     : "text-emerald-400";
  return (
    <div className={`border ${border} ${bg} rounded overflow-hidden`}>
      <div className="px-3 py-2 border-b border-slate-700/50">
        <div className={`font-mono text-sm font-bold ${text}`}>{title}</div>
        <div className="font-mono text-xs text-slate-400 mt-0.5">{desc}</div>
      </div>
      <div className="bg-white" style={{ height: 340 }}>
        {viewMode === "schematic" ? (
          <SchematicViewer
            circuitJson={circuit as Parameters<typeof SchematicViewer>[0]["circuitJson"]}
            containerStyle={{ width: "100%", height: "100%" }}
            editingEnabled={false}
            clickToInteractEnabled={true}
          />
        ) : (
          <PCBViewer
            circuitJson={circuit as Parameters<typeof PCBViewer>[0]["circuitJson"]}
            height={340}
            allowEditing={false}
            clickToInteractEnabled={true}
          />
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmlCircuit({ lang }: Props) {
  const L = LABELS[lang];
  const [viewMode, setViewMode] = useState<"schematic" | "pcb">("schematic");

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="border border-emerald-500/30 bg-emerald-950/20 rounded p-3">
        <div className="text-emerald-400 font-mono text-sm font-bold">{L.title}</div>
        <div className="text-slate-400 font-mono text-xs mt-1">{L.subtitle}</div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setViewMode("schematic")}
          className={`px-3 py-1 text-xs font-mono border transition-all ${
            viewMode === "schematic"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/30"
              : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
          }`}
        >
          ⬡ SCHEMATIC
        </button>
        <button
          onClick={() => setViewMode("pcb")}
          className={`px-3 py-1 text-xs font-mono border transition-all ${
            viewMode === "pcb"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/30"
              : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
          }`}
        >
          ⬡ PCB LAYOUT
        </button>
      </div>

      {/* Three stage panels */}
      <StageCard color="cyan"    title={L.u1title} desc={L.u1desc} circuit={U1_CIRCUIT} viewMode={viewMode} />
      <StageCard color="amber"   title={L.u2title} desc={L.u2desc} circuit={U2_CIRCUIT} viewMode={viewMode} />
      <StageCard color="emerald" title={L.u3title} desc={L.u3desc} circuit={U3_CIRCUIT} viewMode={viewMode} />

      {/* Note */}
      <div className="text-slate-500 font-mono text-xs border-l-2 border-slate-600 pl-3">
        {L.note}
      </div>

      {/* tscircuit attribution */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <span>Rendered with</span>
        <a href="https://github.com/tscircuit/tscircuit" target="_blank" rel="noopener noreferrer"
           className="text-cyan-400 hover:text-cyan-300 underline">tscircuit</a>
        <span>— React for Electronics</span>
      </div>
    </div>
  );
}
