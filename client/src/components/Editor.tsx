import React, { useState, useRef, useEffect, useCallback } from 'react';
import api, { hasValidAuthToken } from '../api';
import TurndownService from 'turndown';
import { useNavigate } from 'react-router-dom';
import { 
  Undo, Redo, 
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link2,
  Activity, CheckCircle2, ShieldAlert, ChevronDown,
  Quote, Code, Image as ImageIcon, Minus, Plus, Share,
  FileText, FileDown, Keyboard, Printer, Sigma, Palette, Type, Highlighter
} from 'lucide-react';
import 'katex/dist/katex.min.css';

interface KeystrokeEvent {
  type: 'keydown' | 'keyup';
  keyCode: string;
  timestamp: number;
  duration?: number;
}

interface PastedEvent {
  timestamp: number;
  textLength: number;
}

interface AnalysisResult {
  authenticityScore: number;
  typingSpeed: number;
  speedVariance: number;
  pauseCount: number;
  microPauseCount: number;
  punctuationPauseCount: number;
  revisionCount: number;
  revisionRate: number;
  wordCount: number;
  vocabularyDiversity: number;
  sentenceLengthVariance: number;
  isPasted: boolean;
  suspiciousFlags: string[];
  recommendation: string;
}

interface ActiveFormatsState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  codeBlock: boolean;
}

interface EditorDraftPayload {
  documentTitle: string;
  content: string;
  htmlContent: string;
  pageContents: string[];
  keystrokeData: KeystrokeEvent[];
  pastedEvents: PastedEvent[];
  editorPreferences: {
    currentFont: string;
    currentFontSize: string;
    currentStyle: string;
    currentAlign: string;
    activeFormats: ActiveFormatsState;
  };
  updatedAt: string;
}

interface EditorProps {
  docTitle: string;
  setDocTitle: React.Dispatch<React.SetStateAction<string>>;
  isAuthenticated: boolean;
  documentId?: string | null;
  autoRunAnalysis?: boolean;
}

const readLocalDraft = (): EditorDraftPayload | null => {
  const rawDraft = localStorage.getItem(LOCAL_DRAFT_KEY);
  if (!rawDraft) return null;
  try {
    return JSON.parse(rawDraft) as EditorDraftPayload;
  } catch {
    return null;
  }
};

const FONTS = [
  { name: 'Arial', family: 'Arial, sans-serif' },
  { name: 'Inter', family: 'Inter, sans-serif' },
  { name: 'Roboto', family: 'Roboto, sans-serif' },
  { name: 'Open Sans', family: '"Open Sans", sans-serif' },
  { name: 'Lato', family: 'Lato, sans-serif' },
  { name: 'Montserrat', family: 'Montserrat, sans-serif' },
  { name: 'Oswald', family: 'Oswald, sans-serif' },
  { name: 'Raleway', family: 'Raleway, sans-serif' },
  { name: 'Nunito', family: 'Nunito, sans-serif' },
  { name: 'Verdana', family: 'Verdana, serif' },
  { name: 'Trebuchet MS', family: '"Trebuchet MS", sans-serif' },
  { name: 'Impact', family: 'Impact, sans-serif' },
  { name: 'Comic Sans MS', family: '"Comic Sans MS", cursive, sans-serif' },
  { name: 'Times New Roman', family: '"Times New Roman", serif' },
  { name: 'Georgia', family: 'Georgia, serif' },
  { name: 'Garamond', family: 'Garamond, serif' },
  { name: 'Palatino', family: 'Palatino, "Palatino Linotype", serif' },
  { name: 'Baskerville', family: 'Baskerville, "Baskerville Old Face", serif' },
  { name: 'Cambria', family: 'Cambria, serif' },
  { name: 'Book Antiqua', family: '"Book Antiqua", Palatino, serif' },
  { name: 'Playfair Display', family: '"Playfair Display", serif' },
  { name: 'Merriweather', family: 'Merriweather, serif' },
  { name: 'Lora', family: 'Lora, serif' },
  { name: 'Courier New', family: '"Courier New", monospace' },
  { name: 'Fira Code', family: '"Fira Code", monospace' },
  { name: 'JetBrains Mono', family: '"JetBrains Mono", monospace' },
  { name: 'Source Code Pro', family: '"Source Code Pro", monospace' },
  { name: 'Monaco', family: 'Monaco, Consolas, monospace' },
  { name: 'Consolas', family: 'Consolas, Monaco, monospace' },
  { name: 'Inconsolata', family: 'Inconsolata, monospace' },
  { name: 'Ubuntu Mono', family: '"Ubuntu Mono", monospace' },
  { name: 'Latin Modern Math', family: '"Latin Modern Math", "STIX Two Math", serif' },
  { name: 'STIX Two Math', family: '"STIX Two Math", "Latin Modern Math", serif' },
  { name: 'Cambria Math', family: '"Cambria Math", Cambria, serif' },
];

const FONT_SIZES = [
  { label: '10pt', value: '1' },
  { label: '13pt', value: '2' },
  { label: '16pt', value: '3' },
  { label: '18pt', value: '4' },
  { label: '24pt', value: '5' },
  { label: '32pt', value: '6' },
  { label: '48pt', value: '7' },
];

const MATH_SYMBOLS = [
  { category: 'Basic', symbols: [
    { label: '+', latex: '+', desc: 'Plus' },
    { label: '−', latex: '-', desc: 'Minus' },
    { label: '×', latex: '\\times', desc: 'Multiply' },
    { label: '÷', latex: '\\div', desc: 'Divide' },
    { label: '=', latex: '=', desc: 'Equals' },
    { label: '≠', latex: '\\neq', desc: 'Not equal' },
    { label: '±', latex: '\\pm', desc: 'Plus-minus' },
  ]},
  { category: 'Fractions', symbols: [
    { label: 'a/b', latex: '\\frac{a}{b}', desc: 'Fraction' },
    { label: 'ⁿ√x', latex: '\\sqrt[n]{x}', desc: 'Nth root' },
    { label: '√x', latex: '\\sqrt{x}', desc: 'Square root' },
  ]},
  { category: 'Powers', symbols: [
    { label: 'x²', latex: 'x^2', desc: 'Squared' },
    { label: 'x³', latex: 'x^3', desc: 'Cubed' },
    { label: 'xⁿ', latex: 'x^n', desc: 'Power' },
    { label: 'x₁', latex: 'x_1', desc: 'Subscript' },
  ]},
  { category: 'Relations', symbols: [
    { label: '<', latex: '<', desc: 'Less than' },
    { label: '>', latex: '>', desc: 'Greater than' },
    { label: '≤', latex: '\\leq', desc: 'Less or equal' },
    { label: '≥', latex: '\\geq', desc: 'Greater or equal' },
    { label: '≈', latex: '\\approx', desc: 'Approximately' },
    { label: '∞', latex: '\\infty', desc: 'Infinity' },
  ]},
  { category: 'Greek', symbols: [
    { label: 'α', latex: '\\alpha', desc: 'Alpha' },
    { label: 'β', latex: '\\beta', desc: 'Beta' },
    { label: 'γ', latex: '\\gamma', desc: 'Gamma' },
    { label: 'δ', latex: '\\delta', desc: 'Delta' },
    { label: 'π', latex: '\\pi', desc: 'Pi' },
    { label: 'θ', latex: '\\theta', desc: 'Theta' },
    { label: 'Σ', latex: '\\Sigma', desc: 'Sigma' },
    { label: 'Ω', latex: '\\Omega', desc: 'Omega' },
  ]},
  { category: 'Functions', symbols: [
    { label: 'sin', latex: '\\sin', desc: 'Sine' },
    { label: 'cos', latex: '\\cos', desc: 'Cosine' },
    { label: 'tan', latex: '\\tan', desc: 'Tangent' },
    { label: 'log', latex: '\\log', desc: 'Logarithm' },
    { label: 'ln', latex: '\\ln', desc: 'Natural log' },
    { label: 'lim', latex: '\\lim', desc: 'Limit' },
  ]},
  { category: 'Calculus', symbols: [
    { label: '∫', latex: '\\int', desc: 'Integral' },
    { label: '∑', latex: '\\sum', desc: 'Summation' },
    { label: '∏', latex: '\\prod', desc: 'Product' },
    { label: '∂', latex: '\\partial', desc: 'Partial derivative' },
    { label: '∇', latex: '\\nabla', desc: 'Nabla' },
  ]},
];

// Color conversion utilities
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  let s;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  } else {
    s = 0;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const v = max, s = max === 0 ? 0 : (max - min) / max;
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
};

const rgbToCmyk = (r: number, g: number, b: number): { c: number; m: number; y: number; k: number } => {
  if (r === 0 && g === 0 && b === 0) return { c: 0, m: 0, y: 0, k: 100 };
  const r_ = r / 255, g_ = g / 255, b_ = b / 255;
  const k = 1 - Math.max(r_, g_, b_);
  const c = (1 - r_ - k) / (1 - k);
  const m = (1 - g_ - k) / (1 - k);
  const y = (1 - b_ - k) / (1 - k);
  return { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) };
};

const cmykToRgb = (c: number, m: number, y: number, k: number): { r: number; g: number; b: number } => {
  const r = 255 * (1 - c / 100) * (1 - k / 100);
  const g = 255 * (1 - m / 100) * (1 - k / 100);
  const b = 255 * (1 - y / 100) * (1 - k / 100);
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
};

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  h /= 360; s /= 100; v /= 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const DEFAULT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
  '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
  '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
  '#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79',
  '#85200C', '#990000', '#B45F06', '#BF9000', '#38761D', '#134F5C', '#1155CC', '#0B5394', '#351C75', '#741B47',
  '#5B0F00', '#660000', '#783F04', '#7F6000', '#274E13', '#0C343D', '#1C4587', '#073763', '#20124D', '#4C1130',
];

const LOCAL_DRAFT_KEY = 'vi-notes-editor-draft';
const LOCAL_PENDING_ANALYSIS_KEY = 'vi-notes-pending-analysis';

const getContrastColor = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? '#111827' : '#F9FAFB';
};

const getClosestFontSizeValue = (fontSizePx: number) => {
  const sizeMap = [
    { value: '1', px: 10 },
    { value: '2', px: 13 },
    { value: '3', px: 16 },
    { value: '4', px: 18 },
    { value: '5', px: 24 },
    { value: '6', px: 32 },
    { value: '7', px: 48 },
  ];
  return sizeMap.reduce((closest, current) =>
    Math.abs(current.px - fontSizePx) < Math.abs(closest.px - fontSizePx) ? current : closest
  ).value;
};

const Editor: React.FC<EditorProps> = ({ docTitle, setDocTitle, isAuthenticated, documentId = null, autoRunAnalysis = false }) => {
  const navigate = useNavigate();
  const initialDraftRef = useRef<EditorDraftPayload | null>(isAuthenticated ? null : readLocalDraft());
  const initialDraft = initialDraftRef.current;
  const [content, setContent] = useState(() => initialDraft?.htmlContent || '');
  const [pageIds, setPageIds] = useState(() =>
    initialDraft?.pageContents?.length
      ? initialDraft.pageContents.map((_, index) => `page-initial-${index + 1}`)
      : ['page-1']
  );
  const [keystrokeData, setKeystrokeData] = useState<KeystrokeEvent[]>([]);
  const [pastedEvents, setPastedEvents] = useState<PastedEvent[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showMathModal, setShowMathModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isDocumentLoaded, setIsDocumentLoaded] = useState(() => !isAuthenticated);
  
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mathLatex, setMathLatex] = useState('');
  const [mathDisplayMode, setMathDisplayMode] = useState(false);
  const [colorMode, setColorMode] = useState<'text' | 'highlight'>('text');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [hexInput, setHexInput] = useState('#000000');
  const [rgbInput, setRgbInput] = useState({ r: 0, g: 0, b: 0 });
  const [hslInput, setHslInput] = useState({ h: 0, s: 0, l: 0 });
  const [hsvInput, setHsvInput] = useState({ h: 0, s: 0, v: 0 });
  const [cmykInput, setCmykInput] = useState({ c: 0, m: 0, y: 0, k: 100 });
  
  const [currentFont, setCurrentFont] = useState(() => initialDraft?.editorPreferences?.currentFont || 'Inter');
  const [currentFontSize, setCurrentFontSize] = useState(() => initialDraft?.editorPreferences?.currentFontSize || '3');
  const [currentStyle, setCurrentStyle] = useState(() => initialDraft?.editorPreferences?.currentStyle || 'Normal Text');
  const [currentAlign, setCurrentAlign] = useState(() => initialDraft?.editorPreferences?.currentAlign || 'Left');
  const [activeFormats, setActiveFormats] = useState<ActiveFormatsState>({
    bold: initialDraft?.editorPreferences?.activeFormats?.bold || false,
    italic: initialDraft?.editorPreferences?.activeFormats?.italic || false,
    underline: initialDraft?.editorPreferences?.activeFormats?.underline || false,
    strikeThrough: initialDraft?.editorPreferences?.activeFormats?.strikeThrough || false,
    unorderedList: initialDraft?.editorPreferences?.activeFormats?.unorderedList || false,
    orderedList: initialDraft?.editorPreferences?.activeFormats?.orderedList || false,
    blockquote: initialDraft?.editorPreferences?.activeFormats?.blockquote || false,
    codeBlock: initialDraft?.editorPreferences?.activeFormats?.codeBlock || false,
  });
  
  const editorRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const fontSizeDropdownRef = useRef<HTMLDivElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const alignDropdownRef = useRef<HTMLDivElement>(null);
  const listDropdownRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const mathLatexRef = useRef<HTMLTextAreaElement>(null);
  const svAreaRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const keyDownTimes = useRef<{ [key: string]: number }>({});
  const savedColorSelectionRef = useRef<Range | null>(null);
  const pendingPaginationRef = useRef(false);
  const isPaginatingRef = useRef(false);
  const pendingHydrationRef = useRef<EditorDraftPayload | null>(initialDraft);
  const lastServerSavedAtRef = useRef('');
  const autoRunAnalysisRef = useRef(false);
  
  const textContent = content.replace(/<[^>]*>?/gm, '');
  const wordCount = textContent.trim().split(/\s+/).filter(w => w.length > 0).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(target)) setShowFontDropdown(false);
      if (fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(target)) setShowFontSizeDropdown(false);
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(target)) setShowStyleDropdown(false);
      if (alignDropdownRef.current && !alignDropdownRef.current.contains(target)) setShowAlignDropdown(false);
      if (listDropdownRef.current && !listDropdownRef.current.contains(target)) setShowListDropdown(false);
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) setShowExportDropdown(false);
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(target)) setShowColorDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated && initialDraft?.documentTitle) {
      setDocTitle(initialDraft.documentTitle);
    }
  }, [initialDraft, isAuthenticated, setDocTitle]);

  const isWritingAreaElement = (element: Element | null): element is HTMLDivElement =>
    !!element && element.classList.contains('writing-area');

  const getWritingPages = () =>
    pageIds
      .map(pageId => pageRefs.current[pageId])
      .filter((page): page is HTMLDivElement => !!page);

  const getDocumentHtml = () =>
    getWritingPages()
      .map(page => page.innerHTML)
      .join('<div><br></div>');

  const syncContent = () => {
    setContent(getDocumentHtml());
  };

  const getActiveWritingPage = (selection: Selection | null = window.getSelection()) => {
    if (!selection || selection.rangeCount === 0) return getWritingPages()[0] ?? null;
    let node: Node | null = selection.getRangeAt(0).startContainer;
    while (node) {
      if (node instanceof Element && isWritingAreaElement(node)) return node;
      node = node.parentNode;
    }
    return getWritingPages()[0] ?? null;
  };

  const createPageId = () => `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createPageIds = (count: number) =>
    Array.from({ length: Math.max(count, 1) }, () => createPageId());

  const getDraftPayload = useCallback((): EditorDraftPayload => {
    const pageContents = getWritingPages().map((page) => page.innerHTML);
    const htmlContent = pageContents.join('<div><br></div>');

    return {
      documentTitle: docTitle,
      content: textContent,
      htmlContent,
      pageContents,
      keystrokeData,
      pastedEvents,
      editorPreferences: {
        currentFont,
        currentFontSize,
        currentStyle,
        currentAlign,
        activeFormats,
      },
      updatedAt: new Date().toISOString(),
    };
  }, [activeFormats, currentAlign, currentFont, currentFontSize, currentStyle, docTitle, keystrokeData, pastedEvents, textContent, pageIds]);

  const saveDraftLocally = useCallback((draft: EditorDraftPayload) => {
    try {
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Local draft save failed:', error);
    }
  }, []);

  const applyDraft = useCallback((draft: EditorDraftPayload) => {
    pendingHydrationRef.current = draft;
    setDocTitle(draft.documentTitle || 'Untitled Document');
    setCurrentFont(draft.editorPreferences.currentFont || 'Inter');
    setCurrentFontSize(draft.editorPreferences.currentFontSize || '3');
    setCurrentStyle(draft.editorPreferences.currentStyle || 'Normal Text');
    setCurrentAlign(draft.editorPreferences.currentAlign || 'Left');
    setKeystrokeData(Array.isArray(draft.keystrokeData) ? draft.keystrokeData : []);
    setPastedEvents(Array.isArray(draft.pastedEvents) ? draft.pastedEvents : []);
    setActiveFormats(draft.editorPreferences.activeFormats || {
      bold: false,
      italic: false,
      underline: false,
      strikeThrough: false,
      unorderedList: false,
      orderedList: false,
      blockquote: false,
      codeBlock: false,
    });
    setContent(draft.htmlContent || '');
    setPageIds(createPageIds(draft.pageContents.length));
  }, [setDocTitle]);

  const appendPageAfter = useCallback((page: HTMLDivElement) => {
    const nextPageId = createPageId();
    setPageIds(prev => {
      const currentIndex = prev.findIndex(pageId => pageRefs.current[pageId] === page);
      if (currentIndex === -1) return [...prev, nextPageId];
      return [...prev.slice(0, currentIndex + 1), nextPageId, ...prev.slice(currentIndex + 1)];
    });
    pendingPaginationRef.current = true;
  }, []);

  const isPageEmpty = (page: HTMLDivElement) => {
    const clone = page.cloneNode(true) as HTMLDivElement;
    clone.querySelectorAll('br').forEach(br => br.remove());
    return clone.textContent?.trim().length === 0;
  };

  const cleanupTrailingEmptyPages = useCallback(() => {
    const pages = getWritingPages();
    const removableIds: string[] = [];
    let keptTrailingEmptyPage = false;

    for (let index = pages.length - 1; index > 0; index -= 1) {
      if (!isPageEmpty(pages[index])) break;

      if (!keptTrailingEmptyPage) {
        keptTrailingEmptyPage = true;
        continue;
      }

      const pageId = pageIds[index];
      if (pageId) removableIds.push(pageId);
    }
    if (removableIds.length > 0) {
      setPageIds(prev => prev.filter(pageId => !removableIds.includes(pageId)));
    }
  }, [pageIds]);

  const paginateDocument = useCallback(() => {
    if (isPaginatingRef.current) return;
    const pages = getWritingPages();
    if (pages.length === 0) return;

    isPaginatingRef.current = true;
    try {
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        while (page.scrollHeight > page.clientHeight + 1) {
          if (page.childNodes.length <= 1) break;
          const nextPage = pages[index + 1];
          if (!nextPage) {
            appendPageAfter(page);
            return;
          }

          const nodeToMove = page.lastChild;
          if (!nodeToMove) break;
          nextPage.insertBefore(nodeToMove, nextPage.firstChild);
        }
      }
      cleanupTrailingEmptyPages();
      syncContent();
    } finally {
      isPaginatingRef.current = false;
    }
  }, [appendPageAfter, cleanupTrailingEmptyPages, pageIds]);

  const schedulePagination = useCallback(() => {
    pendingPaginationRef.current = true;
    requestAnimationFrame(() => {
      if (!pendingPaginationRef.current) return;
      pendingPaginationRef.current = false;
      paginateDocument();
    });
  }, [paginateDocument]);

  useEffect(() => {
    if (!pendingPaginationRef.current) return;
    const frameId = requestAnimationFrame(() => {
      if (!pendingPaginationRef.current) return;
      pendingPaginationRef.current = false;
      paginateDocument();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [pageIds, paginateDocument]);

  useEffect(() => {
    const pendingDraft = pendingHydrationRef.current;
    if (!pendingDraft) return;

    const frameId = requestAnimationFrame(() => {
      const pages = getWritingPages();
      pages.forEach((page, index) => {
        page.innerHTML = pendingDraft.pageContents[index] ?? '';
      });
      pendingHydrationRef.current = null;
      syncContent();
      setIsDraftReady(true);
      setIsDocumentLoaded(true);
      lastServerSavedAtRef.current = pendingDraft.updatedAt;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pageIds]);

  useEffect(() => {
    let cancelled = false;

    const loadEditorState = async () => {
      if (!isAuthenticated || !documentId || !hasValidAuthToken()) {
        if (!cancelled && !initialDraft) {
          setIsDraftReady(true);
          setIsDocumentLoaded(true);
        }
        return;
      }

      try {
        const { data } = await api.get(`/documents/${documentId}`);
        const remoteDraft: EditorDraftPayload = {
          documentTitle: data.title || 'Untitled Document',
          content: data.content || '',
          htmlContent: data.htmlContent || '',
          pageContents: Array.isArray(data.pageContents) && data.pageContents.length > 0 ? data.pageContents : [data.htmlContent || ''],
          keystrokeData: Array.isArray(data.keystrokeData) ? data.keystrokeData : [],
          pastedEvents: Array.isArray(data.pastedEvents) ? data.pastedEvents : [],
          editorPreferences: {
            currentFont: data.editorPreferences?.currentFont || 'Inter',
            currentFontSize: data.editorPreferences?.currentFontSize || '3',
            currentStyle: data.editorPreferences?.currentStyle || 'Normal Text',
            currentAlign: data.editorPreferences?.currentAlign || 'Left',
            activeFormats: data.editorPreferences?.activeFormats || {
              bold: false,
              italic: false,
              underline: false,
              strikeThrough: false,
              unorderedList: false,
              orderedList: false,
              blockquote: false,
              codeBlock: false,
            },
          },
          updatedAt: data.updatedAt || new Date(0).toISOString(),
        };

        if (!cancelled) {
          setAnalysis(data.lastAnalysis || null);
          applyDraft(remoteDraft);
        }
      } catch (error) {
        console.error('Document load failed:', error);
        if (!cancelled) {
          setIsDraftReady(true);
          setIsDocumentLoaded(true);
        }
      }
    };

    loadEditorState();

    return () => {
      cancelled = true;
    };
  }, [applyDraft, documentId, initialDraft, isAuthenticated]);

  useEffect(() => {
    if (!isDraftReady || isAuthenticated) return;

    const timeoutId = window.setTimeout(() => {
      const draft = getDraftPayload();
      saveDraftLocally(draft);
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [activeFormats, currentAlign, currentFont, currentFontSize, currentStyle, docTitle, content, isAuthenticated, isDraftReady, pageIds, saveDraftLocally, getDraftPayload]);

  useEffect(() => {
    if (!isDraftReady || !isDocumentLoaded || !isAuthenticated || !documentId || !hasValidAuthToken()) return;

    const timeoutId = window.setTimeout(async () => {
      const draft = getDraftPayload();
      if (draft.updatedAt === lastServerSavedAtRef.current) return;

      try {
        const { data } = await api.put(`/documents/${documentId}`, {
          content: draft.content,
          title: draft.documentTitle,
          htmlContent: draft.htmlContent,
          pageContents: draft.pageContents,
          editorPreferences: draft.editorPreferences,
          keystrokeData,
          pastedEvents,
        });
        lastServerSavedAtRef.current = data.updatedAt || draft.updatedAt;
      } catch (error) {
        console.error('Document autosave failed:', error);
      }
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [content, currentAlign, currentFont, currentFontSize, currentStyle, activeFormats, documentId, docTitle, getDraftPayload, isAuthenticated, isDocumentLoaded, isDraftReady, keystrokeData, pastedEvents]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isDraftReady || isAuthenticated) return;
      const draft = getDraftPayload();
      saveDraftLocally(draft);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [getDraftPayload, isAuthenticated, isDraftReady, saveDraftLocally]);

  const handleInput = () => {
    syncContent();
    if (!isAuthenticated) saveDraftLocally(getDraftPayload());
    schedulePagination();
  };

  const getNormalizedLineText = (value: string) => value.replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ');

  const getCodeBlockText = (pre: Element) => {
    const rawText = pre instanceof HTMLElement ? pre.innerText : pre.textContent ?? '';
    return getNormalizedLineText(rawText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const focusNode = selection && selection.rangeCount > 0 ? getElementFromNode(selection.getRangeAt(0).startContainer) : null;
    const activePre = focusNode ? findClosestTag(focusNode, ['PRE']) : null;
    const activeBlockquote = focusNode ? findClosestTag(focusNode, ['BLOCKQUOTE']) : null;

    if (activePre && selection && (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey)))) {
      e.preventDefault();
      const nextLine = document.createElement('div');
      nextLine.appendChild(document.createElement('br'));
      activePre.insertAdjacentElement('afterend', nextLine);
      const range = document.createRange();
      range.setStart(nextLine, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      syncContent();
      schedulePagination();
      return;
    }

    if (e.key === 'Enter' && activePre) {
      e.preventDefault();
      document.execCommand('insertText', false, '\n');
      syncContent();
      schedulePagination();
      return;
    }

    if (e.key === 'Enter' && activeBlockquote && selection) {
      e.preventDefault();
      const nextLine = document.createElement('div');
      nextLine.appendChild(document.createElement('br'));
      activeBlockquote.insertAdjacentElement('afterend', nextLine);
      const range = document.createRange();
      range.setStart(nextLine, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      syncContent();
      schedulePagination();
      return;
    }

    const timestamp = Date.now();
    keyDownTimes.current[e.code] = timestamp;
    setKeystrokeData(prev => [...prev, { type: 'keydown', keyCode: e.code, timestamp }]);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const timestamp = Date.now();
    const duration = keyDownTimes.current[e.code] ? timestamp - keyDownTimes.current[e.code] : 0;
    setKeystrokeData(prev => [...prev, { type: 'keyup', keyCode: e.code, timestamp, duration }]);
    delete keyDownTimes.current[e.code];
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, pastedText);
    setPastedEvents(prev => [...prev, { timestamp: Date.now(), textLength: pastedText.length }]);
    schedulePagination();
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    const activePage = getActiveWritingPage();
    if (activePage) activePage.focus();
    syncContent();
    schedulePagination();
  };

  const getSelectionContextElement = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return null;
    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!(node instanceof Element)) return null;
    return editorRef.current.contains(node) ? node : null;
  }, []);

  const findClosestTag = (element: Element | null, tags: string[]) => {
    let current: Element | null = element;
    while (current && current !== editorRef.current && !isWritingAreaElement(current)) {
      if (tags.includes(current.tagName)) return current;
      current = current.parentElement;
    }
    return null;
  };

  const syncToolbarState = useCallback(() => {
    if (!editorRef.current) return;
    const contextElement = getSelectionContextElement();
    if (!contextElement) return;

    const computedStyle = window.getComputedStyle(contextElement);
    const commandValue = (command: string) => {
      try { return document.queryCommandValue(command); } catch { return ''; }
    };
    const commandState = (command: string) => {
      try { return document.queryCommandState(command); } catch { return false; }
    };

    const fontValue = String(commandValue('fontName') || computedStyle.fontFamily || '').replace(/['"]/g, '').toLowerCase();
    const matchedFont = FONTS.find(font => {
      const name = font.name.toLowerCase();
      const family = font.family.replace(/['"]/g, '').toLowerCase().split(',')[0].trim();
      return fontValue.includes(name) || fontValue.includes(family);
    });
    if (matchedFont) setCurrentFont(matchedFont.name);

    const fontSizeValue = String(commandValue('fontSize') || '').trim();
    if (/^[1-7]$/.test(fontSizeValue)) setCurrentFontSize(fontSizeValue);
    else {
      const computedFontSize = parseFloat(computedStyle.fontSize);
      if (!Number.isNaN(computedFontSize)) setCurrentFontSize(getClosestFontSizeValue(computedFontSize));
    }

    const blockElement = findClosestTag(contextElement, ['H1', 'H2', 'H3', 'P', 'PRE', 'BLOCKQUOTE', 'DIV']);
    const blockTag = blockElement?.tagName ?? 'P';
    const styleMap: Record<string, string> = {
      H1: 'Heading 1',
      H2: 'Heading 2',
      H3: 'Heading 3',
      P: 'Normal Text',
      DIV: 'Normal Text',
      PRE: 'Normal Text',
      BLOCKQUOTE: 'Normal Text',
    };
    setCurrentStyle(styleMap[blockTag] ?? 'Normal Text');

    if (commandState('justifyCenter')) setCurrentAlign('Center');
    else if (commandState('justifyRight')) setCurrentAlign('Right');
    else setCurrentAlign('Left');

    setActiveFormats({
      bold: commandState('bold'),
      italic: commandState('italic'),
      underline: commandState('underline'),
      strikeThrough: commandState('strikeThrough'),
      unorderedList: commandState('insertUnorderedList'),
      orderedList: commandState('insertOrderedList'),
      blockquote: !!findClosestTag(contextElement, ['BLOCKQUOTE']),
      codeBlock: !!findClosestTag(contextElement, ['PRE']),
    });
  }, [getSelectionContextElement]);

  const applyFont = (fontName: string, fontFamily: string) => { setCurrentFont(fontName); execCommand('fontName', fontFamily); setShowFontDropdown(false); };
  const applyFontSize = (size: string) => { setCurrentFontSize(size); execCommand('fontSize', size); setShowFontSizeDropdown(false); };
  const changeFontSize = (delta: number) => {
    let newSize = parseInt(currentFontSize) + delta;
    if (newSize < 1) newSize = 1; if (newSize > 7) newSize = 7;
    setCurrentFontSize(newSize.toString()); execCommand('fontSize', newSize.toString());
  };
  const applyStyle = (label: string, value: string) => { setCurrentStyle(label); execCommand('formatBlock', value); setShowStyleDropdown(false); };
  const applyAlignment = (label: string, command: string) => { setCurrentAlign(label); execCommand(command); setShowAlignDropdown(false); };
  const cloneList = (source: HTMLOListElement | HTMLUListElement) => {
    const list = document.createElement(source.tagName.toLowerCase()) as HTMLOListElement | HTMLUListElement;
    list.style.listStyleType = source.style.listStyleType;
    list.className = source.className;
    if (source instanceof HTMLOListElement) {
      (list as HTMLOListElement).start = source.start;
    }
    return list;
  };

  const unwrapCurrentListItem = (selection: Selection, item: HTMLLIElement, list: HTMLOListElement | HTMLUListElement) => {
    const fragment = document.createDocumentFragment();
    const beforeItems: HTMLLIElement[] = [];
    const afterItems: HTMLLIElement[] = [];
    let reachedCurrent = false;

    Array.from(list.children).forEach((child) => {
      if (!(child instanceof HTMLLIElement)) return;
      if (child === item) {
        reachedCurrent = true;
        return;
      }
      if (!reachedCurrent) beforeItems.push(child);
      else afterItems.push(child);
    });

    if (beforeItems.length > 0) {
      const beforeList = cloneList(list);
      beforeItems.forEach((beforeItem) => beforeList.appendChild(beforeItem));
      fragment.appendChild(beforeList);
    }

    const plainLine = document.createElement('div');
    if (item.innerHTML.trim().length > 0) plainLine.innerHTML = item.innerHTML;
    else plainLine.appendChild(document.createElement('br'));
    fragment.appendChild(plainLine);

    if (afterItems.length > 0) {
      const afterList = cloneList(list);
      if (afterList instanceof HTMLOListElement && list instanceof HTMLOListElement) {
        const currentIndex = Array.from(list.children).indexOf(item);
        const numericStart = (list.start || 1) + currentIndex + 1;
        afterList.start = numericStart;
      }
      afterItems.forEach((afterItem) => afterList.appendChild(afterItem));
      fragment.appendChild(afterList);
    }

    list.replaceWith(fragment);
    moveCaretToNodeStart(selection, plainLine);
    syncContent();
    schedulePagination();
  };

  const applyListStyle = (style: 'disc' | 'circle' | 'square') => {
    const selection = window.getSelection();
    const contextElement = selection && selection.rangeCount > 0
      ? getElementFromNode(selection.getRangeAt(0).startContainer)
      : null;
    const currentList = contextElement ? findClosestTag(contextElement, ['UL']) as HTMLUListElement | null : null;

    if (!currentList) {
      execCommand('insertUnorderedList');
      const updatedSelection = window.getSelection();
      const updatedContext = updatedSelection && updatedSelection.rangeCount > 0
        ? getElementFromNode(updatedSelection.getRangeAt(0).startContainer)
        : null;
      const createdList = updatedContext ? findClosestTag(updatedContext, ['UL']) as HTMLUListElement | null : null;
      if (createdList) createdList.style.listStyleType = style;
    } else {
      currentList.style.listStyleType = style;
    }

    const activePage = getActiveWritingPage();
    if (activePage) activePage.focus();
    syncContent();
    schedulePagination();
    setShowListDropdown(false);
  };

  const toggleBulletList = () => {
    const selection = window.getSelection();
    const contextElement = selection && selection.rangeCount > 0
      ? getElementFromNode(selection.getRangeAt(0).startContainer)
      : null;
    const currentItem = contextElement ? findClosestTag(contextElement, ['LI']) as HTMLLIElement | null : null;
    const currentList = contextElement
      ? (findClosestTag(contextElement, ['UL', 'OL']) as HTMLOListElement | HTMLUListElement | null)
      : null;

    if (selection && currentItem && currentList) {
      unwrapCurrentListItem(selection, currentItem, currentList);
    } else {
      execCommand('insertUnorderedList');
    }
    setShowListDropdown(false);
  };

  const handleLinkOpen = () => { const selection = window.getSelection(); if (selection && selection.rangeCount > 0) { setLinkUrl(''); setShowLinkModal(true); } };
  const handleLinkSubmit = () => { if (linkUrl && editorRef.current) { editorRef.current.focus(); execCommand('createLink', linkUrl); } setShowLinkModal(false); setLinkUrl(''); };
  const handleImageOpen = () => { setImageUrl(''); setShowImageModal(true); };
  const handleImageSubmit = () => { if (imageUrl && editorRef.current) { editorRef.current.focus(); execCommand('insertImage', imageUrl); } setShowImageModal(false); setImageUrl(''); };
  const handleMathClick = () => { setMathLatex(''); setMathDisplayMode(false); setShowMathModal(true); };

  const insertMathSymbol = (latex: string) => {
    const textarea = mathLatexRef.current; if (!textarea) { setMathLatex(prev => prev + ' ' + latex); return; }
    const start = textarea.selectionStart; const end = textarea.selectionEnd;
    const newValue = mathLatex.substring(0, start) + ' ' + latex + ' ' + mathLatex.substring(end);
    setMathLatex(newValue);
    setTimeout(() => { const newCursorPos = start + latex.length + 2; textarea.focus(); textarea.setSelectionRange(newCursorPos, newCursorPos); }, 0);
  };

  const validateLatex = (latex: string): { valid: boolean; error?: string; suggestion?: string } => {
    if (!latex.trim()) return { valid: true };
    const katex = (window as { katex?: { renderToString: (latex: string, options: { displayMode: boolean; throwOnError: boolean }) => string } }).katex; 
    if (!katex) return { valid: true };
    try { katex.renderToString(latex, { displayMode: false, throwOnError: true }); return { valid: true }; }
    catch (error) { const errorMsg = String(error); return { valid: false, error: errorMsg.split('\n')[0], suggestion: 'Check LaTeX syntax.' }; }
  };

  const handleMathSubmit = () => {
    if (mathLatex && editorRef.current) {
      const katex = (window as { katex?: { renderToString: (latex: string, options: { displayMode: boolean; throwOnError: boolean }) => string } }).katex;
      if (katex) {
        try {
          const html = katex.renderToString(mathLatex, { displayMode: mathDisplayMode, throwOnError: false });
          const span = document.createElement('span'); span.innerHTML = html; span.contentEditable = 'false';
          span.style.display = mathDisplayMode ? 'block' : 'inline-block'; span.style.margin = mathDisplayMode ? '0.5em 0' : '0 0.2em';
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0); range.deleteContents(); range.insertNode(span);
            range.setStartAfter(span); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
          }
        } catch (error) { console.error(error); }
      }
    }
    setShowMathModal(false); setMathLatex('');
  };

  const updateAllColorFormats = useCallback((hex: string) => {
    if (!/^#[0-9A-F]{6}$/i.test(hex)) return;
    setCurrentColor(hex); setHexInput(hex);
    const rgb = hexToRgb(hex); setRgbInput(rgb);
    setHslInput(rgbToHsl(rgb.r, rgb.g, rgb.b)); setHsvInput(rgbToHsv(rgb.r, rgb.g, rgb.b));
    setCmykInput(rgbToCmyk(rgb.r, rgb.g, rgb.b));
  }, []);

  const saveColorSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    if (editorRef.current.contains(container)) {
      savedColorSelectionRef.current = range.cloneRange();
    }
  };

  const restoreColorSelection = () => {
    const selection = window.getSelection();
    const range = savedColorSelectionRef.current;
    if (!selection || !range) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const handleColorOptionClick = (mode: 'text' | 'highlight') => {
    saveColorSelection();
    setColorMode(mode); setShowColorDropdown(false);
    let initialColor = '#000000';
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const parent = selection.getRangeAt(0).commonAncestorContainer.parentElement;
      if (parent) {
        const style = window.getComputedStyle(parent);
        const colorStr = mode === 'text' ? style.color : style.backgroundColor;
        if (colorStr && colorStr.startsWith('rgb')) {
          const match = colorStr.match(/\d+/g);
          if (match) initialColor = rgbToHex(parseInt(match[0]), parseInt(match[1]), parseInt(match[2]));
        }
      }
    }
    updateAllColorFormats(initialColor); setShowColorPicker(true);
  };

  const applyColor = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.focus();
      restoreColorSelection();
      if (colorMode === 'text') document.execCommand('foreColor', false, currentColor);
      else document.execCommand('backColor', false, currentColor);
      syncContent();
      schedulePagination();
    }
    setShowColorPicker(false);
  }, [colorMode, currentColor]);

  const createEditableLineFragment = (text: string) => {
    const fragment = document.createDocumentFragment();
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      const block = document.createElement('div');
      if (line.length > 0) block.textContent = line;
      else block.appendChild(document.createElement('br'));
      fragment.appendChild(block);
      if (index === lines.length - 1 && line.length === 0) return;
    });
    return fragment;
  };

  const getElementFromNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) return node as Element;
    return node.parentElement;
  };

  const getNormalizedTextOffsetWithin = (container: Node, node: Node, offset: number) => {
    const range = document.createRange();
    range.selectNodeContents(container);
    range.setEnd(node, offset);
    return getNormalizedLineText(range.toString()).length;
  };

  const moveCaretToNodeStart = (selection: Selection, node: Node) => {
    const range = document.createRange();
    range.setStart(node, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const exitCodeBlock = (pre: Element, selection: Selection) => {
    const nextLine = document.createElement('div');
    nextLine.appendChild(document.createElement('br'));
    pre.insertAdjacentElement('afterend', nextLine);
    moveCaretToNodeStart(selection, nextLine);
    syncContent();
    schedulePagination();
  };

  const isRangeAtPreEnd = (range: Range, pre: Element) => {
    const endRange = document.createRange();
    endRange.selectNodeContents(pre);
    endRange.collapse(false);
    return range.compareBoundaryPoints(Range.START_TO_START, endRange) === 0;
  };

  const getCurrentLineElement = (node: Node) => {
    const activePage = getActiveWritingPage();
    if (!activePage) return null;
    let element = getElementFromNode(node);
    while (element && element !== activePage) {
      if (element.tagName === 'BLOCKQUOTE' || element.parentElement === activePage) return element;
      element = element.parentElement;
    }
    return null;
  };

  const ensureCurrentLineElement = (range: Range, selection: Selection) => {
    const activePage = getActiveWritingPage(selection);
    if (!activePage) return null;

    const existingLine = getCurrentLineElement(range.startContainer);
    if (existingLine) return existingLine;

    const container = range.startContainer;
    if (container.nodeType === Node.TEXT_NODE && container.parentNode === activePage) {
      const wrapper = document.createElement('div');
      container.parentNode.replaceChild(wrapper, container);
      wrapper.appendChild(container);
      const nextRange = document.createRange();
      nextRange.setStart(container, Math.min(range.startOffset, container.textContent?.length ?? 0));
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      return wrapper;
    }

    if (container === activePage) {
      const childIndex = Math.min(range.startOffset, activePage.childNodes.length - 1);
      const targetChild = activePage.childNodes[childIndex] ?? activePage.childNodes[childIndex - 1];

      if (!targetChild) {
        const line = document.createElement('div');
        line.appendChild(document.createElement('br'));
        activePage.appendChild(line);
        moveCaretToNodeStart(selection, line);
        return line;
      }

      if (targetChild.nodeType === Node.TEXT_NODE) {
        const wrapper = document.createElement('div');
        activePage.replaceChild(wrapper, targetChild);
        wrapper.appendChild(targetChild);
        const nextRange = document.createRange();
        nextRange.setStart(targetChild, 0);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        return wrapper;
      }

      return targetChild as Element;
    }

    return null;
  };

  const toggleQuoteLine = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const lineElement = ensureCurrentLineElement(range, selection);
    if (!lineElement) return;

    const replacement = lineElement.tagName === 'BLOCKQUOTE'
      ? document.createElement('div')
      : document.createElement('blockquote');

    if (lineElement.innerHTML.trim().length > 0) replacement.innerHTML = lineElement.innerHTML;
    else replacement.appendChild(document.createElement('br'));

    lineElement.replaceWith(replacement);
    moveCaretToNodeStart(selection, replacement);
    syncContent();
    schedulePagination();
  };

  const toggleCodeBlock = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    const startNode = getElementFromNode(range.startContainer);
    const endNode = getElementFromNode(range.endContainer);
    const startPre = startNode ? findClosestTag(startNode, ['PRE']) : null;
    const endPre = endNode ? findClosestTag(endNode, ['PRE']) : null;

    if (startPre && endPre && startPre === endPre) {
      if (range.collapsed) {
        if (isRangeAtPreEnd(range, startPre)) {
          exitCodeBlock(startPre, selection);
        }
        return;
      }

      const preText = getCodeBlockText(startPre);
      const startOffset = getNormalizedTextOffsetWithin(startPre, range.startContainer, range.startOffset);
      const endOffset = getNormalizedTextOffsetWithin(startPre, range.endContainer, range.endOffset);
      const beforeText = preText.slice(0, startOffset);
      const selectedText = preText.slice(startOffset, endOffset);
      const afterText = preText.slice(endOffset);

      const fragment = document.createDocumentFragment();
      if (beforeText.length > 0) {
        const beforePre = document.createElement('pre');
        beforePre.textContent = beforeText;
        fragment.appendChild(beforePre);
      }
      const selectedContent = createEditableLineFragment(selectedText);
      const selectedStartNode = selectedContent.firstChild;
      const selectedEndNode = selectedContent.lastChild;
      fragment.appendChild(selectedContent);
      if (afterText.length > 0) {
        const afterPre = document.createElement('pre');
        afterPre.textContent = afterText;
        fragment.appendChild(afterPre);
      }

      startPre.replaceWith(fragment);
      if (selectedStartNode && selectedEndNode) {
        const nextRange = document.createRange();
        nextRange.setStartBefore(selectedStartNode);
        nextRange.setEndAfter(selectedEndNode);
        selection.removeAllRanges();
        selection.addRange(nextRange);
      }
      syncContent();
      schedulePagination();
      return;
    }

    if (range.collapsed) {
      const pre = document.createElement('pre');
      pre.appendChild(document.createElement('br'));
      range.insertNode(pre);

      const caretRange = document.createRange();
      caretRange.setStart(pre, 0);
      caretRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caretRange);
      syncContent();
      schedulePagination();
      return;
    }

    const selectedText = range.toString();
    range.deleteContents();
    const pre = document.createElement('pre');
    pre.textContent = selectedText;
    range.insertNode(pre);

    const afterRange = document.createRange();
    afterRange.setStartAfter(pre);
    afterRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(afterRange);
    syncContent();
    schedulePagination();
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setHexInput(e.target.value); if (/^#[0-9A-F]{6}$/i.test(e.target.value)) updateAllColorFormats(e.target.value); };
  const handleRgbInputChange = (key: keyof typeof rgbInput, val: string) => {
    const num = Math.max(0, Math.min(255, parseInt(val) || 0)); const newRgb = { ...rgbInput, [key]: num };
    setRgbInput(newRgb); updateAllColorFormats(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };
  const handleHslInputChange = (key: keyof typeof hslInput, val: string) => {
    const max = key === 'h' ? 360 : 100; const num = Math.max(0, Math.min(max, parseInt(val) || 0));
    const newHsl = { ...hslInput, [key]: num }; setHslInput(newHsl);
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l); updateAllColorFormats(rgbToHex(rgb.r, rgb.g, rgb.b));
  };
  const handleHsvInputChange = (key: keyof typeof hsvInput, val: string) => {
    const max = key === 'h' ? 360 : 100; const num = Math.max(0, Math.min(max, parseInt(val) || 0));
    const newHsv = { ...hsvInput, [key]: num }; setHsvInput(newHsv);
    const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v); updateAllColorFormats(rgbToHex(rgb.r, rgb.g, rgb.b));
  };
  const handleCmykInputChange = (key: keyof typeof cmykInput, val: string) => {
    const num = Math.max(0, Math.min(100, parseInt(val) || 0)); const newCmyk = { ...cmykInput, [key]: num };
    setCmykInput(newCmyk); const rgb = cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k);
    updateAllColorFormats(rgbToHex(rgb.r, rgb.g, rgb.b));
  };

  // Keyboard and interaction helpers
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showColorPicker && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        applyColor();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showColorPicker, applyColor]);

  useEffect(() => {
    const handleSelectionChange = () => syncToolbarState();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [syncToolbarState]);

  const handleSvAreaMouseDown = (e: React.MouseEvent) => {
    if (!svAreaRef.current) return;
    e.preventDefault();
    const updateColor = (moveEvent: MouseEvent | React.MouseEvent) => {
      const rect = svAreaRef.current!.getBoundingClientRect();
      const s = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const v = Math.max(0, Math.min(100, (1 - (moveEvent.clientY - rect.top) / rect.height) * 100));
      const rgb = hsvToRgb(hsvInput.h, s, v); updateAllColorFormats(rgbToHex(rgb.r, rgb.g, rgb.b));
    };
    updateColor(e);
    const onMouseMove = (moveEvent: MouseEvent) => updateColor(moveEvent);
    const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
  };

  const handleHueSliderMouseDown = (e: React.MouseEvent) => {
    if (!hueSliderRef.current) return;
    e.preventDefault();
    const updateHue = (moveEvent: MouseEvent | React.MouseEvent) => {
      const rect = hueSliderRef.current!.getBoundingClientRect();
      const pointerRadius = 10;
      const usableWidth = Math.max(rect.width - pointerRadius * 2, 1);
      const position = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left - pointerRadius) / usableWidth));
      const h = Math.min(359, Math.round(position * 359));
      const nextS = hsvInput.s === 0 ? 100 : hsvInput.s;
      const nextV = hsvInput.v === 0 ? 100 : hsvInput.v;
      const rgb = hsvToRgb(h, nextS, nextV);
      updateAllColorFormats(rgbToHex(rgb.r, rgb.g, rgb.b));
    };
    updateHue(e);
    const onMouseMove = (moveEvent: MouseEvent) => updateHue(moveEvent);
    const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
  };

  const insertHorizontalRule = () => execCommand('insertHorizontalRule');
  const getDocumentTitle = () => (
    docTitle ? docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'document'
  );
  const handlePrint = () => { window.print(); setShowExportDropdown(false); };
  const handleExportMarkdown = () => {
    if (!editorRef.current) return;
    const turndown = new TurndownService({ headingStyle: 'atx', hr: '---', bulletListMarker: '-', codeBlockStyle: 'fenced' });
    const markdown = turndown.turndown(getDocumentHtml());
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `${getDocumentTitle()}.md`; link.click(); setShowExportDropdown(false);
  };
  const handleExportPDF = async () => {
    if (!editorRef.current) return;
    const originalBg = editorRef.current.style.backgroundColor; const originalColor = editorRef.current.style.color;
    editorRef.current.style.backgroundColor = '#ffffff'; editorRef.current.style.color = '#000000';
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().from(editorRef.current).set({ margin: 0, filename: `${getDocumentTitle()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).save();
    } finally { if (editorRef.current) { editorRef.current.style.backgroundColor = originalBg; editorRef.current.style.color = originalColor; } }
    setShowExportDropdown(false);
  };

  const handleAnalyze = async () => {
    const draft = getDraftPayload();

    if (!isAuthenticated) {
      saveDraftLocally(draft);
      localStorage.setItem(LOCAL_PENDING_ANALYSIS_KEY, '1');
      navigate('/login', {
        state: {
          message: 'You should login first to use Run Analysis. Your draft has been kept and analysis will continue after login.'
        }
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      if (documentId) {
        await api.put(`/documents/${documentId}`, {
          title: draft.documentTitle,
          content: draft.content,
          htmlContent: draft.htmlContent,
          pageContents: draft.pageContents,
          editorPreferences: draft.editorPreferences,
          keystrokeData,
          pastedEvents,
        });
      }

      const { data } = await api.post('/sessions', {
        content: textContent,
        keystrokeData,
        pastedEvents,
        documentId,
      });
      setAnalysis(data.analysis);
      if (documentId) {
        await api.put(`/documents/${documentId}`, { lastAnalysis: data.analysis });
      }
    }
    finally { setIsAnalyzing(false); }
  };

  useEffect(() => {
    if (!autoRunAnalysis || autoRunAnalysisRef.current || !isDocumentLoaded || !isDraftReady || !isAuthenticated) return;
    autoRunAnalysisRef.current = true;
    void handleAnalyze();
  }, [autoRunAnalysis, isAuthenticated, isDocumentLoaded, isDraftReady]);

  return (
    <div className="main-layout">
      <div className="editor-wrapper">
        <div className="toolbar-container" style={{ flexWrap: 'wrap', padding: '16px 12px' }}>
          <div className="toolbar" style={{ flexWrap: 'wrap' }}>
            <button className="toolbar-btn" onClick={() => execCommand('undo')} title="Undo"><Undo size={16} /></button>
            <button className="toolbar-btn" onClick={() => execCommand('redo')} title="Redo"><Redo size={16} /></button>
            <div className="toolbar-separator" />
            <div className="custom-dropdown-container" ref={fontDropdownRef}>
              <button className="custom-dropdown-btn" onClick={() => setShowFontDropdown(!showFontDropdown)}>
                <span style={{ fontFamily: FONTS.find(f => f.name === currentFont)?.family || 'Inter', whiteSpace: 'nowrap' }}>{currentFont}</span>
                <ChevronDown size={14} style={{ flexShrink: 0 }} />
              </button>
              {showFontDropdown && (
                <div className="custom-dropdown-menu" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {FONTS.map(font => <button key={font.name} className="custom-dropdown-item" style={{ fontFamily: font.family, whiteSpace: 'nowrap' }} onClick={() => applyFont(font.name, font.family)}>{font.name}</button>)}
                </div>
              )}
            </div>
            <div className="toolbar-separator" />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="toolbar-btn" onClick={() => changeFontSize(-1)} title="Decrease Font Size" style={{ padding: '4px' }}><Minus size={14} /></button>
              <div className="custom-dropdown-container" ref={fontSizeDropdownRef}>
                <button className="custom-dropdown-btn" onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)} style={{ padding: '4px 8px', justifyContent: 'center' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>{FONT_SIZES.find(s => s.value === currentFontSize)?.label || '16pt'}</span>
                </button>
                {showFontSizeDropdown && (
                  <div className="custom-dropdown-menu">
                    {FONT_SIZES.map(size => <button key={size.value} className="custom-dropdown-item" onClick={() => applyFontSize(size.value)} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{size.label}</button>)}
                  </div>
                )}
              </div>
              <button className="toolbar-btn" onClick={() => changeFontSize(1)} title="Increase Font Size" style={{ padding: '4px' }}><Plus size={14} /></button>
            </div>
            <div className="toolbar-separator" />
            <div className="custom-dropdown-container" ref={styleDropdownRef}>
              <button className="custom-dropdown-btn" onClick={() => setShowStyleDropdown(!showStyleDropdown)} title="Text Style">
                <span style={{ whiteSpace: 'nowrap' }}>{currentStyle}</span>
                <ChevronDown size={14} style={{ flexShrink: 0 }} />
              </button>
              {showStyleDropdown && (
                <div className="custom-dropdown-menu">
                  <button className="custom-dropdown-item" onClick={() => applyStyle('Normal Text', 'P')} style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>Normal text</button>
                  <button className="custom-dropdown-item" onClick={() => applyStyle('Heading 1', 'H1')} style={{ fontSize: '24px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Heading 1</button>
                  <button className="custom-dropdown-item" onClick={() => applyStyle('Heading 2', 'H2')} style={{ fontSize: '20px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Heading 2</button>
                  <button className="custom-dropdown-item" onClick={() => applyStyle('Heading 3', 'H3')} style={{ fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Heading 3</button>
                </div>
              )}
            </div>
            <div className="toolbar-separator" />
            <button className={`toolbar-btn ${activeFormats.bold ? 'active' : ''}`} onClick={() => execCommand('bold')} title="Bold"><Bold size={16} /></button>
            <button className={`toolbar-btn ${activeFormats.italic ? 'active' : ''}`} onClick={() => execCommand('italic')} title="Italic"><Italic size={16} /></button>
            <button className={`toolbar-btn ${activeFormats.underline ? 'active' : ''}`} onClick={() => execCommand('underline')} title="Underline"><Underline size={16} /></button>
            <button className={`toolbar-btn ${activeFormats.strikeThrough ? 'active' : ''}`} onClick={() => execCommand('strikeThrough')} title="Strikethrough"><Strikethrough size={16} /></button>
            <div className="toolbar-separator" />
            <div className="custom-dropdown-container" ref={alignDropdownRef}>
              <button className="toolbar-btn" onClick={() => setShowAlignDropdown(!showAlignDropdown)} title={`Align ${currentAlign}`} style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderRadius: '6px' }}>
                {currentAlign === 'Left' && <AlignLeft size={16} />}
                {currentAlign === 'Center' && <AlignCenter size={16} />}
                {currentAlign === 'Right' && <AlignRight size={16} />}
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>
              {showAlignDropdown && (
                <div className="custom-dropdown-menu">
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => applyAlignment('Left', 'justifyLeft')}><AlignLeft size={14} /> Left</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => applyAlignment('Center', 'justifyCenter')}><AlignCenter size={14} /> Center</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => applyAlignment('Right', 'justifyRight')}><AlignRight size={14} /> Right</button>
                </div>
              )}
            </div>
            <div className="custom-dropdown-container" ref={listDropdownRef} style={{ display: 'flex' }}>
              <button
                className={`toolbar-btn ${activeFormats.unorderedList || activeFormats.orderedList ? 'active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleBulletList}
                title="Bulleted List"
                style={{ borderRadius: '6px 0 0 6px' }}
              >
                <List size={16} />
              </button>
              <button
                className="toolbar-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowListDropdown(!showListDropdown)}
                title="List Styles"
                style={{ borderRadius: '0 6px 6px 0', padding: '6px' }}
              >
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>
              {showListDropdown && (
                <div className="custom-dropdown-menu">
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => applyListStyle('disc')}><List size={14} /> Default Bullets</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => applyListStyle('circle')}><List size={14} /> Hollow Bullets</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => applyListStyle('square')}><List size={14} /> Square Bullets</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => { execCommand('insertOrderedList'); setShowListDropdown(false); }}><ListOrdered size={14} /> Numbered List</button>
                </div>
              )}
            </div>
            <div className="toolbar-separator" />
            <button
              className={`toolbar-btn ${activeFormats.blockquote ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleQuoteLine}
              title="Quote"
            >
              <Quote size={16} />
            </button>
            <button
              className={`toolbar-btn ${activeFormats.codeBlock ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleCodeBlock}
              title="Code Block"
            >
              <Code size={16} />
            </button>
            <button className="toolbar-btn" onClick={insertHorizontalRule} title="Divider"><Minus size={16} /></button>
            <div className="toolbar-separator" />
            <button className="toolbar-btn" onClick={handleLinkOpen} title="Insert Link"><Link2 size={16} /></button>
            <button className="toolbar-btn" onClick={handleImageOpen} title="Insert Image"><ImageIcon size={16} /></button>
            <button className="toolbar-btn" onClick={handleMathClick} title="Insert Math Equation"><Sigma size={16} /></button>
            <div className="toolbar-separator" />
            <div className="custom-dropdown-container" ref={colorDropdownRef}>
              <button className="toolbar-btn" onClick={() => setShowColorDropdown(!showColorDropdown)} title="Text & Highlight Color" style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderRadius: '6px' }}>
                <Palette size={16} />
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>
              {showColorDropdown && (
                <div className="custom-dropdown-menu" style={{ right: 0, left: 'auto' }}>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => handleColorOptionClick('text')}><Type size={14} /> Text Color</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => handleColorOptionClick('highlight')}><Highlighter size={14} /> Highlight Color</button>
                </div>
              )}
            </div>
            <div className="toolbar-separator" />
            <button className="toolbar-btn" onClick={handlePrint} title="Print Document"><Printer size={16} /></button>
            <div className="custom-dropdown-container" ref={exportDropdownRef}>
              <button className={`toolbar-btn ${showExportDropdown ? 'active' : ''}`} onClick={() => setShowExportDropdown(!showExportDropdown)} title="Export Document" style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderRadius: '6px' }}>
                <Share size={16} />
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>
              {showExportDropdown && (
                <div className="custom-dropdown-menu" style={{ right: 0, left: 'auto' }}>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={handleExportMarkdown}><FileText size={14} /> Export as Markdown</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={handleExportPDF}><FileDown size={14} /> Export as PDF</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="page-container">
          <div ref={editorRef} className="document-pages">
            {pageIds.map((pageId) => (
              <div
                key={pageId}
                ref={(node) => { pageRefs.current[pageId] = node; }}
                className="writing-area"
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onPaste={handlePaste}
                data-placeholder="Start writing your document here..."
                spellCheck={false}
                style={{ fontFamily: 'var(--text-primary-font, inherit)' }}
              />
            ))}
          </div>
        </div>
      </div>
      {showLinkModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Insert Link</h3>
            <input type="text" className="modal-input" placeholder="Paste or type a link URL..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLinkSubmit()} autoFocus />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleLinkSubmit}>Apply</button>
            </div>
          </div>
        </div>
      )}
      {showImageModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Insert Image</h3>
            <input type="text" className="modal-input" placeholder="Paste an image URL..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleImageSubmit()} autoFocus />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowImageModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleImageSubmit}>Insert</button>
            </div>
          </div>
        </div>
      )}
      {showMathModal && (
        <div className="modal-overlay">
          <div className="modal-content math-modal">
            <h3 className="modal-title">Build Math Equation</h3>
            <div className="math-modal-body">
              <div className="math-symbols-panel">
                {MATH_SYMBOLS.map((categoryGroup) => (
                  <div key={categoryGroup.category} className="math-category">
                    <div className="math-category-title">{categoryGroup.category}</div>
                    <div className="math-symbols-grid">
                      {categoryGroup.symbols.map((symbol, idx) => <button key={idx} className="math-symbol-btn" onClick={() => insertMathSymbol(symbol.latex)} title={symbol.desc}>{symbol.label}</button>)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="math-preview-panel">
                <div className="math-latex-section">
                  <label className="input-label">LATEX CODE</label>
                  <textarea ref={mathLatexRef} className="math-latex-textarea" placeholder="Type LaTeX or click symbols below..." value={mathLatex} onChange={(e) => setMathLatex(e.target.value)} rows={3} spellCheck={false} />
                  {(() => {
                    const validation = validateLatex(mathLatex);
                    if (!validation.valid) return <div className="latex-error-hint"><div className="error-message">{validation.error}</div><div className="error-suggestion">💡 {validation.suggestion}</div></div>;
                    return null;
                  })()}
                </div>
                <div className="math-preview-section">
                  <div className="math-preview-label">Preview</div>
                  <div className="math-preview-box">
                    {mathLatex ? (() => {
                      try {
                        const katex = (window as { katex?: { renderToString: (latex: string, options: { displayMode: boolean; throwOnError: boolean }) => string } }).katex;
                        const html = katex ? katex.renderToString(mathLatex, { displayMode: mathDisplayMode, throwOnError: false }) : 'Loading...';
                        return <div dangerouslySetInnerHTML={{ __html: html }} />;
                      } catch { return <div className="math-preview-empty">Preview unavailable</div>; }
                    })() : <div className="math-preview-empty">Your equation will appear here</div>}
                  </div>
                </div>
                <div className="math-display-mode"><label className="checkbox-label"><input type="checkbox" className="checkbox-input" checked={mathDisplayMode} onChange={(e) => setMathDisplayMode(e.target.checked)} /><span className="checkbox-text">Centered block equation</span></label></div>
                {mathLatex && <button className="btn-clear" onClick={() => setMathLatex('')}>Clear All</button>}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowMathModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleMathSubmit} disabled={!mathLatex || !validateLatex(mathLatex).valid}>Insert Equation</button>
            </div>
          </div>
        </div>
      )}
      {showColorPicker && (
        <div className="modal-overlay">
          <div className="modal-content color-picker-modal">
            <div className="color-picker-header">
              <div>
                <h3 className="modal-title" style={{ marginBottom: 0 }}>
                  {colorMode === 'text' ? 'Text Color' : 'Highlight Color'}
                </h3>
              </div>
            </div>
            <div className="color-picker-body-wide">
              <div className="color-picker-left-column">
                <div className="color-panel-card">
                  <div className="color-section-heading">
                    <div className="color-section-title">Default Colors</div>
                  </div>
                  <div className="color-swatches-grid color-swatches-grid-defaults">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        className={`color-swatch-btn compact ${currentColor.toUpperCase() === color.toUpperCase() ? 'active' : ''}`}
                        style={{ backgroundColor: color, color: getContrastColor(color) }}
                        onClick={() => updateAllColorFormats(color)}
                        onDoubleClick={applyColor}
                        title={color}
                        aria-label={`Select ${color}`}
                      >
                        <span>{color.replace('#', '')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="color-panel-card">
                  <div className="color-inputs-grid-refined">
                    <div className="color-input-group">
                      <div className="color-format-heading">CMYK</div>
                      <div className="color-input-row-refined cmyk">
                        <div className="color-input-field compact"><input aria-label="Cyan" type="number" value={cmykInput.c} onChange={(e) => handleCmykInputChange('c', e.target.value)} /></div>
                        <div className="color-input-field compact"><input aria-label="Magenta" type="number" value={cmykInput.m} onChange={(e) => handleCmykInputChange('m', e.target.value)} /></div>
                        <div className="color-input-field compact"><input aria-label="Yellow" type="number" value={cmykInput.y} onChange={(e) => handleCmykInputChange('y', e.target.value)} /></div>
                        <div className="color-input-field compact"><input aria-label="Black" type="number" value={cmykInput.k} onChange={(e) => handleCmykInputChange('k', e.target.value)} /></div>
                      </div>
                    </div>
                    <div className="color-input-group">
                      <div className="color-format-heading">RGB</div>
                      <div className="color-input-row-refined">
                        <div className="color-input-field compact"><input aria-label="Red" type="number" value={rgbInput.r} onChange={(e) => handleRgbInputChange('r', e.target.value)} /></div>
                        <div className="color-input-field compact"><input aria-label="Green" type="number" value={rgbInput.g} onChange={(e) => handleRgbInputChange('g', e.target.value)} /></div>
                        <div className="color-input-field compact"><input aria-label="Blue" type="number" value={rgbInput.b} onChange={(e) => handleRgbInputChange('b', e.target.value)} /></div>
                      </div>
                    </div>
                    <div className="color-input-group">
                      <div className="color-format-heading">HSL</div>
                      <div className="color-input-row-refined">
                        <div className="color-input-field compact"><input aria-label="Hue" type="number" value={hslInput.h} onChange={(e) => handleHslInputChange('h', e.target.value)} /></div>
                        <div className="color-input-field compact"><input aria-label="Saturation" type="number" value={hslInput.s} onChange={(e) => handleHslInputChange('s', e.target.value)} /></div>
                        <div className="color-input-field compact"><input aria-label="Lightness" type="number" value={hslInput.l} onChange={(e) => handleHslInputChange('l', e.target.value)} /></div>
                      </div>
                    </div>
                    <div className="color-input-group">
                      <div className="color-format-heading">HSV</div>
                      <div className="color-input-row-refined">
                        <div className="color-input-field compact"><input aria-label="Hue" type="number" value={hsvInput.h} onChange={(e) => handleHsvInputChange('h', e.target.value)} /></div>
                        <div className="color-input-field compact"><input aria-label="Saturation" type="number" value={hsvInput.s} onChange={(e) => handleHsvInputChange('s', e.target.value)} /></div>
                        <div className="color-input-field compact"><input aria-label="Value" type="number" value={hsvInput.v} onChange={(e) => handleHsvInputChange('v', e.target.value)} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="color-picker-right-column">
                <div className="color-panel-card color-preview-card">
                  <div className="color-section-heading">
                    <div className="color-section-title">Preview</div>
                  </div>
                  <div className={`color-preview-large ${colorMode === 'highlight' ? 'highlight-mode' : ''}`}>
                    {colorMode === 'text' ? (
                      <span style={{ color: currentColor }}>
                        The quick brown fox jumps over the lazy dog
                      </span>
                    ) : (
                      <span className="color-preview-highlight-text" style={{ color: 'var(--text-primary)' }}>
                        <mark style={{ backgroundColor: currentColor, color: 'inherit' }}>
                          Highlight preview text
                        </mark>
                      </span>
                    )}
                  </div>
                </div>

                <div className="color-panel-card color-hex-card">
                  <div className="color-input-field">
                    <label>Hex code</label>
                    <input type="text" value={hexInput} onChange={handleHexInputChange} />
                  </div>
                </div>

                <div className="color-panel-card">
                  <div className="color-section-heading">
                    <div className="color-section-title">Picker</div>
                  </div>
                  <div
                    className="sv-area"
                    ref={svAreaRef}
                    onMouseDown={handleSvAreaMouseDown}
                    style={{ backgroundColor: `hsl(${hsvInput.h}, 100%, 50%)` }}
                  >
                    <div className="sv-area-white" />
                    <div className="sv-area-black" />
                    <div
                      className="sv-pointer"
                      style={{ left: `${hsvInput.s}%`, top: `${100 - hsvInput.v}%` }}
                    />
                  </div>
                  <div className="hue-slider-block">
                    <div className="color-slider-labels">
                      <span>Hue</span>
                      <span>{Math.round(hsvInput.h)}°</span>
                    </div>
                    <div
                      className="hue-slider-horizontal"
                      ref={hueSliderRef}
                      onMouseDown={handleHueSliderMouseDown}
                    >
                      <div className="hue-pointer" style={{ left: `${(hsvInput.h / 360) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowColorPicker(false)}>Cancel</button>
              <button className="btn-primary" onClick={applyColor}>Apply Color</button>
            </div>
          </div>
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title"><Keyboard size={14} /> Session Stats</div>
          <div className="stats-container">
            <div className="stat-box"><span className="stat-value">{wordCount}</span><span className="stat-label">Words</span></div>
            <div className="stat-box"><span className="stat-value">{keystrokeData.length}</span><span className="stat-label">Keystrokes</span></div>
            <div className="stat-box"><span className="stat-value">{pastedEvents.length}</span><span className="stat-label">Paste Events</span></div>
            <div className="stat-box"><span className="stat-value">{Math.round(keystrokeData.length / 5)}</span><span className="stat-label">Est. Time (s)</span></div>
          </div>
        </div>
        <div className="sidebar-section" style={{ flex: 1 }}>
          <div className="sidebar-title"><ShieldAlert size={14} /> Authenticity Check</div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>Run the AI analysis to verify if the writing patterns match genuine human behavior.</p>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', gap: '8px' }} onClick={handleAnalyze} disabled={isAnalyzing || textContent.length === 0}><Activity size={16} />{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}</button>
          {analysis && (
            <div className="report-card">
              <div className="score-display">
                <div className={`score-circle ${analysis.authenticityScore > 80 ? 'high' : analysis.authenticityScore > 50 ? 'medium' : 'low'}`}>{analysis.authenticityScore}</div>
                <div>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Confidence</div>
                  <div className="report-recommendation" style={{ margin: 0 }}>{analysis.recommendation}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Speed</div>
                  <div style={{ fontWeight: 600 }}>{analysis.typingSpeed} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>CPM</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pauses</div>
                  <div style={{ fontWeight: 600 }}>{analysis.pauseCount}</div>
                </div>
              </div>
              {analysis.suspiciousFlags.length > 0 ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warning-color)', marginBottom: '8px' }}>Flags Detected</div>
                  <ul className="flags-list">{analysis.suspiciousFlags.map((flag: string, i: number) => <li key={i}>{flag}</li>)}</ul>
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)' }}>
                  <CheckCircle2 size={16} /><span style={{ fontSize: '13px', fontWeight: 500 }}>No suspicious patterns found.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Editor;
