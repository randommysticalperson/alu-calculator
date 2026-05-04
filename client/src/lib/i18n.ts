// ─── i18n Translation System ─────────────────────────────────────────────────
// Languages:
//   en  — English (default)
//   pl  — Polish (język polski) — native language of Andrzej Odrzywołek,
//          author of arXiv:2603.21852 "EML: The Elementary Math Language"
//   zh  — Traditional Chinese (繁體中文)

export type Lang = "en" | "pl" | "zh";

export interface Translations {
  // Header
  appTitle: string;
  appSubtitle: string;

  // Tab labels
  tabCalc: string;
  tabAlu: string;
  tabEml: string;
  tabFloat: string;
  tabTree: string;
  tabPrFn: string;

  // Standard calculator
  calcKeyboard: string;
  calcBin: string;
  calcHex: string;
  calcBaseE: string;

  // ALU panel
  aluTitle: string;
  aluBadge: string;
  aluOperandA: string;
  aluOperandB: string;
  aluOut: string;
  aluBitwiseOut: string;
  aluInputLabel: string;
  aluBaseLabel: string;
  aluResultBits: string;
  aluLogicOps: string;
  aluLogicDesc: string;
  aluTruthTable: string;
  aluUseResult: string;

  // ALU op descriptions
  opAnd: string;
  opOr: string;
  opXor: string;
  opNot: string;
  opNand: string;
  opNor: string;
  opShl: string;
  opShr: string;

  // CPU flags
  cpuFlagsTitle: string;
  flagZ: string;
  flagN: string;
  flagC: string;
  flagV: string;
  flagZero: string;
  flagNegative: string;
  flagCarry: string;
  flagOverflow: string;

  // EML panel
  emlTitle: string;
  emlFormula: string;
  emlDesc: string;
  emlSource: string;
  emlDirect: string;
  emlInputX: string;
  emlInputY: string;
  emlCompute: string;
  emlResult: string;
  emlDerive: string;
  emlSelectFn: string;
  emlSteps: string;

  // Float panel
  floatTitle: string;
  floatInput: string;
  floatPresets: string;
  floatSingle: string;
  floatDouble: string;
  floatSign: string;
  floatExponent: string;
  floatMantissa: string;
  floatComparison: string;
  floatBase2: string;
  floatBase10: string;
  floatBaseE: string;
  floatEmlConnection: string;
  floatEmlDesc: string;
  floatScaleFactor: string;
  floatMantissaLabel: string;
  floatLiveDerivation: string;

  // Tree panel
  treeTitle: string;
  treeDesc: string;
  treeReplay: string;
  treeReplaying: string;
  treeClickNode: string;
  treeDerivation: string;
  treeDepth: string;
  treeCategory: string;

  // PR-FN panel
  prTitle: string;
  prDesc: string;
  prBaseTitle: string;
  prCompositionTitle: string;
  prRecursionTitle: string;
  prSelectFn: string;
  prInputs: string;
  prEvaluate: string;
  prResult: string;
  prSteps: string;
  prAckermannTitle: string;
  prComposerTitle: string;
  prComposerDesc: string;
  prCompose: string;

  // Common
  clear: string;
  backspace: string;
  history: string;
  clearHistory: string;
  toA: string;
  toB: string;
  error: string;
}

const en: Translations = {
  appTitle: "ALU CALCULATOR",
  appSubtitle: "EML+FLOAT+PR+FLAGS",

  tabCalc: "CALC",
  tabAlu: "ALU",
  tabEml: "EML",
  tabFloat: "FLOAT",
  tabTree: "TREE",
  tabPrFn: "PR-FN",

  calcKeyboard: "KEYBOARD: 0–9 + − × / Enter Backspace Esc",
  calcBin: "BIN",
  calcHex: "HEX",
  calcBaseE: "BASE-e",

  aluTitle: "ARITHMETIC LOGIC UNIT",
  aluBadge: "16-BIT BITWISE",
  aluOperandA: "A",
  aluOperandB: "B",
  aluOut: "OUT",
  aluBitwiseOut: "BITWISE {op} OUT",
  aluInputLabel: "INPUT → {target} [{base}]",
  aluBaseLabel: "INPUT BASE",
  aluResultBits: "RESULT BITS",
  aluLogicOps: "BITWISE LOGIC OPERATIONS",
  aluLogicDesc: "— operates on individual bits",
  aluTruthTable: "BITWISE TRUTH TABLE (per bit)",
  aluUseResult: "USE RESULT",

  opAnd: "bit AND",
  opOr: "bit OR",
  opXor: "bit XOR",
  opNot: "bit NOT",
  opNand: "~(A&B)",
  opNor: "~(A|B)",
  opShl: "shift ←",
  opShr: "shift →",

  cpuFlagsTitle: "CPU STATUS FLAGS (16-bit)",
  flagZ: "Z",
  flagN: "N",
  flagC: "C",
  flagV: "V",
  flagZero: "Zero",
  flagNegative: "Negative",
  flagCarry: "Carry",
  flagOverflow: "Overflow",

  emlTitle: "EML OPERATOR — EXP-MINUS-LOG",
  emlFormula: "eml(x, y) = exp(x) − ln(y)",
  emlDesc: "The continuous-math analog of NAND. A single binary operator that generates all elementary functions.",
  emlSource: "Source: Odrzywołek, A. (2026). arXiv:2603.21852",
  emlDirect: "DIRECT: eml(x, y) = exp(x) − ln(y)",
  emlInputX: "X",
  emlInputY: "Y (must be > 0)",
  emlCompute: "COMPUTE eml(x, y)",
  emlResult: "RESULT",
  emlDerive: "DERIVE FUNCTION VIA EML",
  emlSelectFn: "Select function",
  emlSteps: "EML DERIVATION STEPS",

  floatTitle: "IEEE-754 FLOAT ANALYZER",
  floatInput: "VALUE",
  floatPresets: "PRESETS",
  floatSingle: "SINGLE PRECISION (32-BIT) — 1 sign + 8 exp + 23 mantissa",
  floatDouble: "DOUBLE PRECISION (64-BIT) — 1 sign + 11 exp + 52 mantissa",
  floatSign: "SIGN",
  floatExponent: "EXPONENT",
  floatMantissa: "MANTISSA",
  floatComparison: "COMPARISON: FLOAT BASES",
  floatBase2: "Base-2 (binary):",
  floatBase10: "Base-10 (sci):",
  floatBaseE: "Base-e (natural):",
  floatEmlConnection: "EML CONNECTION — BASE-e COMPUTED VIA EML OPERATOR",
  floatEmlDesc: "Since eml(x, 1) = exp(x) − ln(1) = eˣ, the scale factor eⁿ and mantissa m are both computed by a single EML call each:",
  floatScaleFactor: "SCALE FACTOR",
  floatMantissaLabel: "MANTISSA",
  floatLiveDerivation: "LIVE EML DERIVATION FOR x = {x}",

  treeTitle: "EML BOOTSTRAPPING TREE — PHYLOGENETIC SPIRAL",
  treeDesc: "Recreates Fig. 1 from arXiv:2603.21852. EML at the centre bootstraps all 36 elementary functions in rings — analogous to a LUCA phylogenetic tree. Click any node to see its EML derivation formula.",
  treeReplay: "▶ REPLAY BOOTSTRAP",
  treeReplaying: "● REPLAYING…",
  treeClickNode: "Click a node to see its EML derivation",
  treeDerivation: "DERIVATION",
  treeDepth: "EML DEPTH",
  treeCategory: "CATEGORY",

  prTitle: "PRIMITIVE RECURSIVE FUNCTIONS",
  prDesc: "The class of functions built from Zero, Successor, and Projection using Composition and Primitive Recursion. Every PR function terminates. The Ackermann function is the classic example that escapes this class.",
  prBaseTitle: "BASE FUNCTIONS",
  prCompositionTitle: "COMPOSITION",
  prRecursionTitle: "PRIMITIVE RECURSION",
  prSelectFn: "Select function",
  prInputs: "INPUTS",
  prEvaluate: "EVALUATE",
  prResult: "RESULT",
  prSteps: "EVALUATION STEPS",
  prAckermannTitle: "ACKERMANN GROWTH CHART",
  prComposerTitle: "PR FUNCTION COMPOSER",
  prComposerDesc: "Chain two PR functions: (f ∘ g)(x) = f(g(x))",
  prCompose: "COMPOSE",

  clear: "CLR",
  backspace: "⌫",
  history: "HISTORY",
  clearHistory: "CLEAR",
  toA: "→ A",
  toB: "→ B",
  error: "Error",
};

const pl: Translations = {
  appTitle: "KALKULATOR ALU",
  appSubtitle: "EML+ZMIENNOPRZEC+PR+FLAGI",

  tabCalc: "KALK",
  tabAlu: "ALU",
  tabEml: "EML",
  tabFloat: "ZMIENNO",
  tabTree: "DRZEWO",
  tabPrFn: "PR-FN",

  calcKeyboard: "KLAWIATURA: 0–9 + − × / Enter Backspace Esc",
  calcBin: "BIN",
  calcHex: "SZESN",
  calcBaseE: "BAZA-e",

  aluTitle: "ARYTMETYCZNO-LOGICZNA JEDNOSTKA",
  aluBadge: "16-BIT BITOWE",
  aluOperandA: "A",
  aluOperandB: "B",
  aluOut: "WYNIK",
  aluBitwiseOut: "BITOWE {op} WYNIK",
  aluInputLabel: "WEJŚCIE → {target} [{base}]",
  aluBaseLabel: "PODSTAWA WEJŚCIA",
  aluResultBits: "BITY WYNIKU",
  aluLogicOps: "BITOWE OPERACJE LOGICZNE",
  aluLogicDesc: "— działa na poszczególnych bitach",
  aluTruthTable: "BITOWA TABELA PRAWDY (na bit)",
  aluUseResult: "UŻYJ WYNIK",

  opAnd: "bit AND",
  opOr: "bit OR",
  opXor: "bit XOR",
  opNot: "bit NOT",
  opNand: "~(A&B)",
  opNor: "~(A|B)",
  opShl: "przesuń ←",
  opShr: "przesuń →",

  cpuFlagsTitle: "FLAGI STATUSU PROCESORA (16-bit)",
  flagZ: "Z",
  flagN: "N",
  flagC: "C",
  flagV: "V",
  flagZero: "Zero",
  flagNegative: "Ujemny",
  flagCarry: "Przeniesienie",
  flagOverflow: "Przepełnienie",

  emlTitle: "OPERATOR EML — EXP-MINUS-LOG",
  emlFormula: "eml(x, y) = exp(x) − ln(y)",
  emlDesc: "Ciągłoanalityczny odpowiednik NAND. Jeden operator binarny generujący wszystkie funkcje elementarne.",
  emlSource: "Źródło: Odrzywołek, A. (2026). arXiv:2603.21852",
  emlDirect: "BEZPOŚREDNIO: eml(x, y) = exp(x) − ln(y)",
  emlInputX: "X",
  emlInputY: "Y (musi być > 0)",
  emlCompute: "OBLICZ eml(x, y)",
  emlResult: "WYNIK",
  emlDerive: "WYPROWADŹ FUNKCJĘ PRZEZ EML",
  emlSelectFn: "Wybierz funkcję",
  emlSteps: "KROKI WYPROWADZENIA EML",

  floatTitle: "ANALIZATOR ZMIENNOPRZECINKOWY IEEE-754",
  floatInput: "WARTOŚĆ",
  floatPresets: "PRZYKŁADY",
  floatSingle: "POJEDYNCZA PRECYZJA (32-BIT) — 1 znak + 8 wykł + 23 mantysa",
  floatDouble: "PODWÓJNA PRECYZJA (64-BIT) — 1 znak + 11 wykł + 52 mantysa",
  floatSign: "ZNAK",
  floatExponent: "WYKŁADNIK",
  floatMantissa: "MANTYSA",
  floatComparison: "PORÓWNANIE: BAZY ZMIENNOPRZECINKOWE",
  floatBase2: "Baza-2 (binarna):",
  floatBase10: "Baza-10 (naukowa):",
  floatBaseE: "Baza-e (naturalna):",
  floatEmlConnection: "POŁĄCZENIE EML — BAZA-e OBLICZONA PRZEZ OPERATOR EML",
  floatEmlDesc: "Ponieważ eml(x, 1) = exp(x) − ln(1) = eˣ, czynnik skali eⁿ i mantysa m są obliczane przez jedno wywołanie EML:",
  floatScaleFactor: "CZYNNIK SKALI",
  floatMantissaLabel: "MANTYSA",
  floatLiveDerivation: "WYPROWADZENIE EML NA ŻYWO DLA x = {x}",

  treeTitle: "DRZEWO BOOTSTRAPOWANIA EML — SPIRALA FILOGENETYCZNA",
  treeDesc: "Odtwarza Rys. 1 z arXiv:2603.21852. EML w centrum bootstrapuje 36 funkcji elementarnych w pierścieniach — analogia do filogenetycznego drzewa LUCA. Kliknij węzeł, aby zobaczyć wyprowadzenie EML.",
  treeReplay: "▶ ODTWÓRZ BOOTSTRAP",
  treeReplaying: "● ODTWARZANIE…",
  treeClickNode: "Kliknij węzeł, aby zobaczyć wyprowadzenie EML",
  treeDerivation: "WYPROWADZENIE",
  treeDepth: "GŁĘBOKOŚĆ EML",
  treeCategory: "KATEGORIA",

  prTitle: "FUNKCJE PIERWOTNIE REKURENCYJNE",
  prDesc: "Klasa funkcji zbudowanych z Zero, Następnika i Rzutowania przez Złożenie i Rekurencję Pierwotną. Każda funkcja PR kończy działanie. Funkcja Ackermanna jest klasycznym przykładem wykraczającym poza tę klasę.",
  prBaseTitle: "FUNKCJE BAZOWE",
  prCompositionTitle: "ZŁOŻENIE",
  prRecursionTitle: "REKURENCJA PIERWOTNA",
  prSelectFn: "Wybierz funkcję",
  prInputs: "WEJŚCIA",
  prEvaluate: "OBLICZ",
  prResult: "WYNIK",
  prSteps: "KROKI OBLICZENIA",
  prAckermannTitle: "WYKRES WZROSTU ACKERMANNA",
  prComposerTitle: "KOMPOZYTOR FUNKCJI PR",
  prComposerDesc: "Połącz dwie funkcje PR: (f ∘ g)(x) = f(g(x))",
  prCompose: "ZŁÓŻ",

  clear: "WYCZYŚĆ",
  backspace: "⌫",
  history: "HISTORIA",
  clearHistory: "WYCZYŚĆ",
  toA: "→ A",
  toB: "→ B",
  error: "Błąd",
};

const zh: Translations = {
  appTitle: "算術邏輯單元計算機",
  appSubtitle: "EML+浮點+原始遞迴+旗標",

  tabCalc: "計算",
  tabAlu: "ALU",
  tabEml: "EML",
  tabFloat: "浮點",
  tabTree: "樹狀",
  tabPrFn: "原遞迴",

  calcKeyboard: "鍵盤：0–9 + − × / Enter 退格 Esc",
  calcBin: "二進位",
  calcHex: "十六進位",
  calcBaseE: "以e為底",

  aluTitle: "算術邏輯單元",
  aluBadge: "16位元 位元運算",
  aluOperandA: "A",
  aluOperandB: "B",
  aluOut: "輸出",
  aluBitwiseOut: "位元 {op} 輸出",
  aluInputLabel: "輸入 → {target} [{base}]",
  aluBaseLabel: "輸入進位制",
  aluResultBits: "結果位元",
  aluLogicOps: "位元邏輯運算",
  aluLogicDesc: "— 對各個位元進行運算",
  aluTruthTable: "位元真值表（每位元）",
  aluUseResult: "使用結果",

  opAnd: "位元 AND",
  opOr: "位元 OR",
  opXor: "位元 XOR",
  opNot: "位元 NOT",
  opNand: "~(A&B)",
  opNor: "~(A|B)",
  opShl: "左移 ←",
  opShr: "右移 →",

  cpuFlagsTitle: "處理器狀態旗標（16位元）",
  flagZ: "Z",
  flagN: "N",
  flagC: "C",
  flagV: "V",
  flagZero: "零",
  flagNegative: "負數",
  flagCarry: "進位",
  flagOverflow: "溢位",

  emlTitle: "EML 運算子 — 指數減對數",
  emlFormula: "eml(x, y) = exp(x) − ln(y)",
  emlDesc: "連續數學中的 NAND 類比。單一二元運算子，可生成所有初等函數。",
  emlSource: "來源：Odrzywołek, A. (2026). arXiv:2603.21852",
  emlDirect: "直接計算：eml(x, y) = exp(x) − ln(y)",
  emlInputX: "X",
  emlInputY: "Y（必須 > 0）",
  emlCompute: "計算 eml(x, y)",
  emlResult: "結果",
  emlDerive: "透過 EML 推導函數",
  emlSelectFn: "選擇函數",
  emlSteps: "EML 推導步驟",

  floatTitle: "IEEE-754 浮點數分析器",
  floatInput: "數值",
  floatPresets: "預設值",
  floatSingle: "單精度（32位元）— 1符號 + 8指數 + 23尾數",
  floatDouble: "雙精度（64位元）— 1符號 + 11指數 + 52尾數",
  floatSign: "符號",
  floatExponent: "指數",
  floatMantissa: "尾數",
  floatComparison: "比較：浮點數底數",
  floatBase2: "以2為底（二進位）：",
  floatBase10: "以10為底（科學記號）：",
  floatBaseE: "以e為底（自然）：",
  floatEmlConnection: "EML 連結 — 以e為底透過 EML 運算子計算",
  floatEmlDesc: "由於 eml(x, 1) = exp(x) − ln(1) = eˣ，比例因子 eⁿ 和尾數 m 各自只需一次 EML 呼叫：",
  floatScaleFactor: "比例因子",
  floatMantissaLabel: "尾數",
  floatLiveDerivation: "x = {x} 的即時 EML 推導",

  treeTitle: "EML 自舉樹 — 系統發育螺旋",
  treeDesc: "重現 arXiv:2603.21852 圖1。EML 位於中心，以環狀方式自舉36個初等函數——類比 LUCA 系統發育樹。點擊節點查看 EML 推導公式。",
  treeReplay: "▶ 重播自舉過程",
  treeReplaying: "● 重播中…",
  treeClickNode: "點擊節點查看 EML 推導",
  treeDerivation: "推導",
  treeDepth: "EML 深度",
  treeCategory: "類別",

  prTitle: "原始遞迴函數",
  prDesc: "由零函數、後繼函數和投影函數，透過合成與原始遞迴構建的函數類。每個原始遞迴函數必然終止。Ackermann 函數是超越此類的經典例子。",
  prBaseTitle: "基本函數",
  prCompositionTitle: "合成",
  prRecursionTitle: "原始遞迴",
  prSelectFn: "選擇函數",
  prInputs: "輸入",
  prEvaluate: "計算",
  prResult: "結果",
  prSteps: "計算步驟",
  prAckermannTitle: "Ackermann 增長圖",
  prComposerTitle: "原始遞迴函數合成器",
  prComposerDesc: "串接兩個原始遞迴函數：(f ∘ g)(x) = f(g(x))",
  prCompose: "合成",

  clear: "清除",
  backspace: "⌫",
  history: "歷史記錄",
  clearHistory: "清除",
  toA: "→ A",
  toB: "→ B",
  error: "錯誤",
};

export const translations: Record<Lang, Translations> = { en, pl, zh };

export function t(lang: Lang, key: keyof Translations, vars?: Record<string, string>): string {
  let str = translations[lang][key] as string;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}

export const langLabels: Record<Lang, string> = {
  en: "EN",
  pl: "PL",
  zh: "繁中",
};

export const langNames: Record<Lang, string> = {
  en: "English",
  pl: "Polski",
  zh: "繁體中文",
};
