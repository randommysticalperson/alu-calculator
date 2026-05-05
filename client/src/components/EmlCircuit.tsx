/**
 * EmlCircuit.tsx
 * Design: Terminal Hacker — dark background, neon emerald/cyan accents
 * Renders the EML analog computer circuit using tscircuit SchematicViewer.
 * The circuit: eml(x,y) = exp(x) - ln(y)
 *   U1: Antilog (EXP) amplifier  — computes exp(x)
 *   U2: Log amplifier             — computes ln(y)
 *   U3: Differential summer       — computes exp(x) - ln(y)
 *
 * Symbol names verified against schematic-symbols@0.0.208:
 *   opamp_no_power_right  ports: [1=inp1(+), 2=inp2(-), 3=out]
 *   boxresistor_right     ports: [1=left, 2=right]
 *   capacitor_right       ports: [1=pos, 2=neg]
 *   npn_bipolar_transistor_horz  ports: [1=collector, 2=emitter, 3=base]
 *   ground_down           ports: [1]
 *   vcc_up                ports: [1]
 *   vcc_down              ports: [1]
 */

import { useState } from "react";
import { SchematicViewer } from "@tscircuit/schematic-viewer";
import { PCBViewer } from "@tscircuit/pcb-viewer";
import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
}

// ── Circuit JSON ──────────────────────────────────────────────────────────────
// Layout (schematic units):
//   U1 center (0, 0)    — EXP amplifier
//   U2 center (8, 0)    — LOG amplifier
//   U3 center (16, 0)   — Differential summer
//   Q1 center (-2, 2)   — NPN for antilog (U1 input)
//   Q2 center (6, 2)    — NPN for log (U2 feedback)
//   R1 center (-4, 0.5) — Input resistor for U1
//   R2 center (4, 0.5)  — Input resistor for U2
//   R3 center (12, 0.5) — Feedback resistor for U3
//   C1 center (0, -2.5) — Feedback capacitor for U1 (stability)
//   C2 center (8, -2.5) — Feedback capacitor for U2 (stability)
//   GND symbols at op-amp in- pins and emitters
//   VCC+/VCC- at each op-amp power note

const EML_CIRCUIT_JSON = [
  // ── Source components ─────────────────────────────────────────────────────
  { type: "source_component", source_component_id: "sc_u1", ftype: "simple_chip", name: "U1", manufacturer_part_number: "LM741", supplier_part_numbers: {} },
  { type: "source_component", source_component_id: "sc_u2", ftype: "simple_chip", name: "U2", manufacturer_part_number: "LM741", supplier_part_numbers: {} },
  { type: "source_component", source_component_id: "sc_u3", ftype: "simple_chip", name: "U3", manufacturer_part_number: "LM741", supplier_part_numbers: {} },
  { type: "source_component", source_component_id: "sc_r1", ftype: "simple_resistor", name: "R1", resistance: 10000 },
  { type: "source_component", source_component_id: "sc_r2", ftype: "simple_resistor", name: "R2", resistance: 10000 },
  { type: "source_component", source_component_id: "sc_r3", ftype: "simple_resistor", name: "R3", resistance: 10000 },
  { type: "source_component", source_component_id: "sc_c1", ftype: "simple_capacitor", name: "C1", capacitance: 0.0000001 },
  { type: "source_component", source_component_id: "sc_c2", ftype: "simple_capacitor", name: "C2", capacitance: 0.0000001 },
  { type: "source_component", source_component_id: "sc_q1", ftype: "simple_transistor", name: "Q1", transistor_type: "npn" },
  { type: "source_component", source_component_id: "sc_q2", ftype: "simple_transistor", name: "Q2", transistor_type: "npn" },

  // ── Source ports ──────────────────────────────────────────────────────────
  { type: "source_port", source_port_id: "sp_u1_inp", source_component_id: "sc_u1", name: "in+" },
  { type: "source_port", source_port_id: "sp_u1_inn", source_component_id: "sc_u1", name: "in-" },
  { type: "source_port", source_port_id: "sp_u1_out", source_component_id: "sc_u1", name: "out" },
  { type: "source_port", source_port_id: "sp_u2_inp", source_component_id: "sc_u2", name: "in+" },
  { type: "source_port", source_port_id: "sp_u2_inn", source_component_id: "sc_u2", name: "in-" },
  { type: "source_port", source_port_id: "sp_u2_out", source_component_id: "sc_u2", name: "out" },
  { type: "source_port", source_port_id: "sp_u3_inp", source_component_id: "sc_u3", name: "in+" },
  { type: "source_port", source_port_id: "sp_u3_inn", source_component_id: "sc_u3", name: "in-" },
  { type: "source_port", source_port_id: "sp_u3_out", source_component_id: "sc_u3", name: "out" },
  { type: "source_port", source_port_id: "sp_r1_1", source_component_id: "sc_r1", name: "1" },
  { type: "source_port", source_port_id: "sp_r1_2", source_component_id: "sc_r1", name: "2" },
  { type: "source_port", source_port_id: "sp_r2_1", source_component_id: "sc_r2", name: "1" },
  { type: "source_port", source_port_id: "sp_r2_2", source_component_id: "sc_r2", name: "2" },
  { type: "source_port", source_port_id: "sp_r3_1", source_component_id: "sc_r3", name: "1" },
  { type: "source_port", source_port_id: "sp_r3_2", source_component_id: "sc_r3", name: "2" },
  { type: "source_port", source_port_id: "sp_c1_1", source_component_id: "sc_c1", name: "1" },
  { type: "source_port", source_port_id: "sp_c1_2", source_component_id: "sc_c1", name: "2" },
  { type: "source_port", source_port_id: "sp_c2_1", source_component_id: "sc_c2", name: "1" },
  { type: "source_port", source_port_id: "sp_c2_2", source_component_id: "sc_c2", name: "2" },
  { type: "source_port", source_port_id: "sp_q1_b", source_component_id: "sc_q1", name: "base" },
  { type: "source_port", source_port_id: "sp_q1_c", source_component_id: "sc_q1", name: "collector" },
  { type: "source_port", source_port_id: "sp_q1_e", source_component_id: "sc_q1", name: "emitter" },
  { type: "source_port", source_port_id: "sp_q2_b", source_component_id: "sc_q2", name: "base" },
  { type: "source_port", source_port_id: "sp_q2_c", source_component_id: "sc_q2", name: "collector" },
  { type: "source_port", source_port_id: "sp_q2_e", source_component_id: "sc_q2", name: "emitter" },

  // ── Schematic components ──────────────────────────────────────────────────
  // U1 — EXP amplifier at (0, 0)
  {
    type: "schematic_component",
    schematic_component_id: "sch_u1",
    source_component_id: "sc_u1",
    center: { x: 0, y: 0 },
    rotation: 0,
    size: { width: 2, height: 2 },
    symbol_name: "opamp_no_power_right",
    symbol_display_value: "U1",
  },
  // U2 — LOG amplifier at (8, 0)
  {
    type: "schematic_component",
    schematic_component_id: "sch_u2",
    source_component_id: "sc_u2",
    center: { x: 8, y: 0 },
    rotation: 0,
    size: { width: 2, height: 2 },
    symbol_name: "opamp_no_power_right",
    symbol_display_value: "U2",
  },
  // U3 — Differential summer at (16, 0)
  {
    type: "schematic_component",
    schematic_component_id: "sch_u3",
    source_component_id: "sc_u3",
    center: { x: 16, y: 0 },
    rotation: 0,
    size: { width: 2, height: 2 },
    symbol_name: "opamp_no_power_right",
    symbol_display_value: "U3",
  },
  // R1 — input resistor for U1, at (-4, 0.5) horizontal
  {
    type: "schematic_component",
    schematic_component_id: "sch_r1",
    source_component_id: "sc_r1",
    center: { x: -4, y: 0.5 },
    rotation: 0,
    size: { width: 1.5, height: 0.4 },
    symbol_name: "boxresistor_right",
    symbol_display_value: "10kΩ",
  },
  // R2 — input resistor for U2, at (4, 0.5) horizontal
  {
    type: "schematic_component",
    schematic_component_id: "sch_r2",
    source_component_id: "sc_r2",
    center: { x: 4, y: 0.5 },
    rotation: 0,
    size: { width: 1.5, height: 0.4 },
    symbol_name: "boxresistor_right",
    symbol_display_value: "10kΩ",
  },
  // R3 — feedback resistor for U3, at (14, -1) vertical (feedback path)
  {
    type: "schematic_component",
    schematic_component_id: "sch_r3",
    source_component_id: "sc_r3",
    center: { x: 14, y: -1.5 },
    rotation: 0,
    size: { width: 1.5, height: 0.4 },
    symbol_name: "boxresistor_right",
    symbol_display_value: "10kΩ",
  },
  // C1 — feedback capacitor for U1 (stability), at (0, -2.5)
  {
    type: "schematic_component",
    schematic_component_id: "sch_c1",
    source_component_id: "sc_c1",
    center: { x: 0, y: -2.5 },
    rotation: 0,
    size: { width: 1.2, height: 0.4 },
    symbol_name: "capacitor_right",
    symbol_display_value: "100nF",
  },
  // C2 — feedback capacitor for U2 (stability), at (8, -2.5)
  {
    type: "schematic_component",
    schematic_component_id: "sch_c2",
    source_component_id: "sc_c2",
    center: { x: 8, y: -2.5 },
    rotation: 0,
    size: { width: 1.2, height: 0.4 },
    symbol_name: "capacitor_right",
    symbol_display_value: "100nF",
  },
  // Q1 — NPN for antilog (U1 input path), at (-2, 2)
  {
    type: "schematic_component",
    schematic_component_id: "sch_q1",
    source_component_id: "sc_q1",
    center: { x: -2, y: 2 },
    rotation: 0,
    size: { width: 1.2, height: 1.2 },
    symbol_name: "npn_bipolar_transistor_horz",
    symbol_display_value: "Q1",
  },
  // Q2 — NPN for log (U2 feedback path), at (6, 2)
  {
    type: "schematic_component",
    schematic_component_id: "sch_q2",
    source_component_id: "sc_q2",
    center: { x: 6, y: 2 },
    rotation: 0,
    size: { width: 1.2, height: 1.2 },
    symbol_name: "npn_bipolar_transistor_horz",
    symbol_display_value: "Q2",
  },
  // GND symbols — at U1 in-, U2 in-, Q1 emitter, Q2 emitter
  {
    type: "schematic_component",
    schematic_component_id: "sch_gnd_u1",
    source_component_id: "sc_u1",
    center: { x: -1.2, y: -0.8 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "ground_down",
    symbol_display_value: "GND",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_gnd_u2",
    source_component_id: "sc_u2",
    center: { x: 6.8, y: -0.8 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "ground_down",
    symbol_display_value: "GND",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_gnd_q1e",
    source_component_id: "sc_q1",
    center: { x: -0.5, y: 2.8 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "ground_down",
    symbol_display_value: "GND",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_gnd_q2e",
    source_component_id: "sc_q2",
    center: { x: 7.5, y: 2.8 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "ground_down",
    symbol_display_value: "GND",
  },
  // VCC+ rails above each op-amp
  {
    type: "schematic_component",
    schematic_component_id: "sch_vcc_u1",
    source_component_id: "sc_u1",
    center: { x: 0, y: -1.5 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "vcc_up",
    symbol_display_value: "+15V",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_vcc_u2",
    source_component_id: "sc_u2",
    center: { x: 8, y: -1.5 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "vcc_up",
    symbol_display_value: "+15V",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_vcc_u3",
    source_component_id: "sc_u3",
    center: { x: 16, y: -1.5 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "vcc_up",
    symbol_display_value: "+15V",
  },
  // VCC- (negative supply) below each op-amp
  {
    type: "schematic_component",
    schematic_component_id: "sch_vccn_u1",
    source_component_id: "sc_u1",
    center: { x: 0, y: 1.5 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "vcc_down",
    symbol_display_value: "−15V",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_vccn_u2",
    source_component_id: "sc_u2",
    center: { x: 8, y: 1.5 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "vcc_down",
    symbol_display_value: "−15V",
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch_vccn_u3",
    source_component_id: "sc_u3",
    center: { x: 16, y: 1.5 },
    rotation: 0,
    size: { width: 0.5, height: 0.5 },
    symbol_name: "vcc_down",
    symbol_display_value: "−15V",
  },

  // ── Schematic ports ───────────────────────────────────────────────────────
  // opamp_no_power_right port offsets (from center):
  //   port 1 (inp+): x-0.57, y+0.18  → left side upper
  //   port 2 (inp-): x-0.57, y-0.09  → left side lower
  //   port 3 (out):  x+0.43, y+0.04  → right side
  // U1 ports (center 0,0, size 2×2 → half=1)
  { type: "schematic_port", schematic_port_id: "schp_u1_inp", source_port_id: "sp_u1_inp", schematic_component_id: "sch_u1", center: { x: -1.14, y: 0.36 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u1_inn", source_port_id: "sp_u1_inn", schematic_component_id: "sch_u1", center: { x: -1.14, y: -0.18 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u1_out", source_port_id: "sp_u1_out", schematic_component_id: "sch_u1", center: { x: 0.86, y: 0.08 }, side_of_component: "right", distance_from_component_edge: 0 },
  // U2 ports (center 8,0)
  { type: "schematic_port", schematic_port_id: "schp_u2_inp", source_port_id: "sp_u2_inp", schematic_component_id: "sch_u2", center: { x: 6.86, y: 0.36 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u2_inn", source_port_id: "sp_u2_inn", schematic_component_id: "sch_u2", center: { x: 6.86, y: -0.18 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u2_out", source_port_id: "sp_u2_out", schematic_component_id: "sch_u2", center: { x: 8.86, y: 0.08 }, side_of_component: "right", distance_from_component_edge: 0 },
  // U3 ports (center 16,0)
  { type: "schematic_port", schematic_port_id: "schp_u3_inp", source_port_id: "sp_u3_inp", schematic_component_id: "sch_u3", center: { x: 14.86, y: 0.36 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u3_inn", source_port_id: "sp_u3_inn", schematic_component_id: "sch_u3", center: { x: 14.86, y: -0.18 }, side_of_component: "left", distance_from_component_edge: 0 },
  { type: "schematic_port", schematic_port_id: "schp_u3_out", source_port_id: "sp_u3_out", schematic_component_id: "sch_u3", center: { x: 16.86, y: 0.08 }, side_of_component: "right", distance_from_component_edge: 0 },

  // ── Schematic traces (wires) ──────────────────────────────────────────────
  // Vx input → R1 → Q1 base → U1 in+
  {
    type: "schematic_trace",
    schematic_trace_id: "st_vx_r1",
    edges: [
      { from: { x: -6, y: 0.5 }, to: { x: -5, y: 0.5 } },
    ],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "st_r1_q1b",
    edges: [
      { from: { x: -3, y: 0.5 }, to: { x: -2, y: 0.5 } },
      { from: { x: -2, y: 0.5 }, to: { x: -2, y: 1.6 } },
    ],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "st_q1c_u1inp",
    edges: [
      { from: { x: -2.55, y: 1.71 }, to: { x: -2.55, y: 0.36 } },
      { from: { x: -2.55, y: 0.36 }, to: { x: -1.14, y: 0.36 } },
    ],
  },
  // U1 in- → GND
  {
    type: "schematic_trace",
    schematic_trace_id: "st_u1inn_gnd",
    edges: [
      { from: { x: -1.14, y: -0.18 }, to: { x: -1.2, y: -0.18 } },
      { from: { x: -1.2, y: -0.18 }, to: { x: -1.2, y: -0.5 } },
    ],
  },
  // U1 out → C1 (feedback) → U1 in-  (stability cap in feedback)
  {
    type: "schematic_trace",
    schematic_trace_id: "st_u1out_c1",
    edges: [
      { from: { x: 0.86, y: 0.08 }, to: { x: 1.5, y: 0.08 } },
      { from: { x: 1.5, y: 0.08 }, to: { x: 1.5, y: -2.5 } },
      { from: { x: 1.5, y: -2.5 }, to: { x: 0.6, y: -2.5 } },
    ],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "st_c1_u1inn",
    edges: [
      { from: { x: -0.6, y: -2.5 }, to: { x: -1.5, y: -2.5 } },
      { from: { x: -1.5, y: -2.5 }, to: { x: -1.5, y: -0.18 } },
      { from: { x: -1.5, y: -0.18 }, to: { x: -1.14, y: -0.18 } },
    ],
  },
  // U1 out → U3 in+ (exp(x) signal)
  {
    type: "schematic_trace",
    schematic_trace_id: "st_u1_u3inp",
    edges: [
      { from: { x: 0.86, y: 0.08 }, to: { x: 2.5, y: 0.08 } },
      { from: { x: 2.5, y: 0.08 }, to: { x: 2.5, y: 0.36 } },
      { from: { x: 2.5, y: 0.36 }, to: { x: 14.86, y: 0.36 } },
    ],
  },
  // Vy input → R2 → Q2 base → U2 in+
  {
    type: "schematic_trace",
    schematic_trace_id: "st_vy_r2",
    edges: [
      { from: { x: 2, y: 0.5 }, to: { x: 2.5, y: 0.5 } },
    ],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "st_r2_q2b",
    edges: [
      { from: { x: 5, y: 0.5 }, to: { x: 6, y: 0.5 } },
      { from: { x: 6, y: 0.5 }, to: { x: 6, y: 1.6 } },
    ],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "st_q2c_u2inp",
    edges: [
      { from: { x: 5.45, y: 1.71 }, to: { x: 5.45, y: 0.36 } },
      { from: { x: 5.45, y: 0.36 }, to: { x: 6.86, y: 0.36 } },
    ],
  },
  // U2 in- → GND
  {
    type: "schematic_trace",
    schematic_trace_id: "st_u2inn_gnd",
    edges: [
      { from: { x: 6.86, y: -0.18 }, to: { x: 6.8, y: -0.18 } },
      { from: { x: 6.8, y: -0.18 }, to: { x: 6.8, y: -0.5 } },
    ],
  },
  // U2 out → Q2 feedback → C2 (stability)
  {
    type: "schematic_trace",
    schematic_trace_id: "st_u2out_q2fb",
    edges: [
      { from: { x: 8.86, y: 0.08 }, to: { x: 9.5, y: 0.08 } },
      { from: { x: 9.5, y: 0.08 }, to: { x: 9.5, y: 2 } },
      { from: { x: 9.5, y: 2 }, to: { x: 7.55, y: 2 } },
    ],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "st_u2out_c2",
    edges: [
      { from: { x: 8.86, y: 0.08 }, to: { x: 9.5, y: 0.08 } },
      { from: { x: 9.5, y: 0.08 }, to: { x: 9.5, y: -2.5 } },
      { from: { x: 9.5, y: -2.5 }, to: { x: 8.6, y: -2.5 } },
    ],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "st_c2_u2inp",
    edges: [
      { from: { x: 7.4, y: -2.5 }, to: { x: 6.5, y: -2.5 } },
      { from: { x: 6.5, y: -2.5 }, to: { x: 6.5, y: 0.36 } },
      { from: { x: 6.5, y: 0.36 }, to: { x: 6.86, y: 0.36 } },
    ],
  },
  // U2 out → R3 → U3 in- (ln(y) signal via R3)
  {
    type: "schematic_trace",
    schematic_trace_id: "st_u2_r3",
    edges: [
      { from: { x: 8.86, y: 0.08 }, to: { x: 10.5, y: 0.08 } },
      { from: { x: 10.5, y: 0.08 }, to: { x: 10.5, y: -1.5 } },
      { from: { x: 10.5, y: -1.5 }, to: { x: 12.5, y: -1.5 } },
    ],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "st_r3_u3inn",
    edges: [
      { from: { x: 15.5, y: -1.5 }, to: { x: 15.5, y: -0.18 } },
      { from: { x: 15.5, y: -0.18 }, to: { x: 14.86, y: -0.18 } },
    ],
  },

  // ── Net labels ────────────────────────────────────────────────────────────
  {
    type: "schematic_net_label",
    schematic_net_label_id: "snl_vx",
    text: "Vx",
    center: { x: -6.5, y: 0.5 },
    anchor_side: "left",
    source_net_id: "net_vx",
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "snl_vy",
    text: "Vy",
    center: { x: 1.5, y: 0.5 },
    anchor_side: "left",
    source_net_id: "net_vy",
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "snl_expx",
    text: "exp(x)",
    center: { x: 2.5, y: -0.2 },
    anchor_side: "left",
    source_net_id: "net_expx",
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "snl_lny",
    text: "ln(y)",
    center: { x: 10.5, y: -0.8 },
    anchor_side: "left",
    source_net_id: "net_lny",
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "snl_out",
    text: "Veml",
    center: { x: 18, y: 0.08 },
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
    note: "BJT in input path for U1 (antilog), BJT in feedback for U2 (log). C1/C2 = 100nF stability caps. R1–R3 = 10kΩ. ±15V supply. Based on Odrzywołek 2026 arXiv:2603.21852.",
  },
  pl: {
    title: "Analogowy układ EML — schemat tscircuit",
    subtitle: "eml(x,y) = exp(x) − ln(y) zrealizowane za pomocą wzmacniaczy operacyjnych i tranzystorów BJT",
    stage1: "U1 — Wzmacniacz antylogarytmiczny (EXP)",
    stage2: "U2 — Wzmacniacz logarytmiczny",
    stage3: "U3 — Różnicowy sumator",
    note: "Tranzystor BJT w torze wejściowym U1 (antylog), w sprzężeniu zwrotnym U2 (log). C1/C2 = 100nF. R1–R3 = 10kΩ. Zasilanie ±15V.",
  },
  zh: {
    title: "EML 類比電路 — tscircuit 電路圖",
    subtitle: "eml(x,y) = exp(x) − ln(y)，以運算放大器與 BJT 實現",
    stage1: "U1 — 反對數（EXP）放大器",
    stage2: "U2 — 對數放大器",
    stage3: "U3 — 差分加法器",
    note: "U1 輸入路徑使用 BJT（反對數），U2 回授路徑使用 BJT（對數）。C1/C2 = 100nF 穩定電容。R1–R3 = 10kΩ。±15V 電源。",
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
          <div className="text-cyan-400 font-bold">① U1</div>
          <div className="text-slate-300">{L.stage1}</div>
          <div className="text-slate-500 mt-1">Vx → R1 → Q1 → op-amp → e<sup>x</sup></div>
        </div>
        <div className="border border-amber-500/30 bg-amber-950/20 rounded p-2">
          <div className="text-amber-400 font-bold">② U2</div>
          <div className="text-slate-300">{L.stage2}</div>
          <div className="text-slate-500 mt-1">Vy → R2 → Q2 feedback → ln(y)</div>
        </div>
        <div className="border border-emerald-500/30 bg-emerald-950/20 rounded p-2">
          <div className="text-emerald-400 font-bold">③ U3</div>
          <div className="text-slate-300">{L.stage3}</div>
          <div className="text-slate-500 mt-1">e<sup>x</sup> − ln(y) = eml(x,y)</div>
        </div>
      </div>

      {/* Component legend */}
      <div className="grid grid-cols-4 gap-1 text-xs font-mono text-slate-400">
        <div className="border border-slate-700/50 rounded px-2 py-1">R1–R3 <span className="text-slate-500">10kΩ</span></div>
        <div className="border border-slate-700/50 rounded px-2 py-1">C1–C2 <span className="text-slate-500">100nF</span></div>
        <div className="border border-slate-700/50 rounded px-2 py-1">Q1–Q2 <span className="text-slate-500">NPN BJT</span></div>
        <div className="border border-slate-700/50 rounded px-2 py-1">Supply <span className="text-slate-500">±15V</span></div>
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
        style={{ height: 420 }}
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
            height={420}
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
