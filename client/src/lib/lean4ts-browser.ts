// Browser-safe re-export of Lean4-ts (strips Node.js CLI code)
// Source: https://github.com/lidangzzz/Lean4-ts
export { Lean4Compiler, compile } from "./lean4ts/compiler/compiler";
export type { CompileResult, CompileOptions } from "./lean4ts/compiler/compiler";
export { formatValue } from "./lean4ts/types/types";
