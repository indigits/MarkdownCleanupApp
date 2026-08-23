export interface CleanOptions {
  tightenLists: boolean;          // Remove blank lines between list items (tighten loose lists)
  convertCallouts: boolean;       // Convert > **Note:** or **Tip:** into > [!note], > [!tip] etc.
  fixMathDelimiters: boolean;     // Convert \[ \] to $$ $$ and \( \) to $ $
  fixEmphasisSpacing: boolean;    // Fix ** bold ** -> **bold** and * italic * -> *italic*
  fixHeadings: boolean;           // Fix #Heading -> # Heading and standardize spacing around headings
  collapseBlankLines: boolean;    // Collapse 3+ consecutive newlines to max 2 newlines (1 blank line)
  trimTrailingSpaces: boolean;    // Remove unnecessary trailing whitespace from lines
  fixTableSpacing: boolean;       // Remove blank lines inside tables & format borders
  fixQuoteSpacing: boolean;       // Normalize blockquote markers and consecutive quotes
  normalizeTaskLists: boolean;    // Ensure [ ] and [x] formatting is clean and standardized
  smartCapitalizeHeaders: boolean;// Keep header casing clean without breaking markdown
}

export interface CleanStats {
  inputChars: number;
  outputChars: number;
  inputWords: number;
  outputWords: number;
  inputLines: number;
  outputLines: number;
  linesSaved: number;
  charactersSaved: number;
  listsTightened: number;
  calloutsConverted: number;
  mathConverted: number;
  emphasisFixed: number;
}

export type PresetName = 'gemini' | 'chatgpt' | 'claude' | 'obsidian_full' | 'minimal';

export interface Preset {
  id: PresetName;
  name: string;
  badge: string;
  description: string;
  options: CleanOptions;
}

export interface DiffLine {
  type: 'same' | 'added' | 'removed' | 'modified';
  oldContent?: string;
  newContent?: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}
