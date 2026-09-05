import type { CleanOptions, CleanStats } from './types';
import { DEFAULT_OPTIONS } from './presets';
import { convertAsciiToMermaid, isAsciiDiagram } from './diagramConverter';

interface MaskedToken {
  placeholder: string;
  original: string;
}

/**
 * Detects whether a line is a horizontal grid border line.
 * Matches ASCII: +---+---+ or +===+===+
 * Matches Unicode box drawing: ┌───┬───┐, ├───┼───┤, └───┴───┘, ╔═══╦═══╗, ╠═══╬═══╣, ╚═══╩═══╝, etc.
 */
export function isGridBorderLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3) return false;

  // ASCII border: +---+---+ or +===+===+
  if (/^\+[-=+]+\+$/.test(trimmed)) {
    return trimmed.includes('-') || trimmed.includes('=');
  }

  // Unicode border:
  const startChars = '┌╔╭├╠╟╞└╚╰';
  const endChars = '┐╗╮┤╣╢╡┘╝╯';
  const validChars = /^[┌╔╭├╠╟╞└╚╰][─═┬╦╤╥┼╬╫╪┴╩╧╨┐╗╮┤╣╢╡┘╝╯\s]+$/;

  if (startChars.includes(trimmed[0]) && endChars.includes(trimmed[trimmed.length - 1])) {
    return validChars.test(trimmed) && (trimmed.includes('─') || trimmed.includes('═'));
  }

  return false;
}

/**
 * Extracts column split indices from a border line.
 */
export function extractColIndices(borderLine: string): number[] {
  const indices: number[] = [];
  const junctionChars = '+┌┬┐├┼┤└┴┘╔╦╗╠╬╣╚╩╝╭╮╰╯╟╫╢╞╪╡╤╥╧╨';
  for (let i = 0; i < borderLine.length; i++) {
    if (junctionChars.includes(borderLine[i])) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Detects whether a line is a grid table content line (starts and ends with vertical divider).
 */
export function isGridContentLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3) return false;
  const isAscii = trimmed.startsWith('|') && trimmed.endsWith('|');
  const isUnicode =
    (trimmed.startsWith('│') && trimmed.endsWith('│')) ||
    (trimmed.startsWith('║') && trimmed.endsWith('║'));
  return isAscii || isUnicode;
}

/**
 * Checks if text is a standard markdown pipe table.
 */
export function isMarkdownPipeTable(text: string): boolean {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return false;
  if (!lines[0].includes('|')) return false;
  if (!/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[1])) return false;
  for (const line of lines) {
    if (!line.includes('|')) return false;
  }
  return true;
}

/**
 * Parses an array of lines into a formatted Markdown pipe table.
 * Returns null if the block does not conform to a valid grid table.
 */
export function parseGridTable(lines: string[]): string | null {
  if (lines.length < 3) return null;
  const topBorder = lines[0];
  if (!isGridBorderLine(topBorder)) return null;

  const colIndices = extractColIndices(topBorder);
  if (colIndices.length < 2) return null;
  const numCols = colIndices.length - 1;

  // Find all border line indices
  const borderIdxs: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isGridBorderLine(lines[i])) {
      borderIdxs.push(i);
    } else if (!isGridContentLine(lines[i])) {
      return null;
    }
  }

  // Must have at least top border and bottom border
  if (borderIdxs.length < 2 || borderIdxs[0] !== 0 || borderIdxs[borderIdxs.length - 1] !== lines.length - 1) {
    return null;
  }

  // Helper to extract column cells from a single content line
  const extractLineCells = (line: string): string[] => {
    const trimmed = line.trim();
    const pipeChar = trimmed.startsWith('|') ? '|' : trimmed.startsWith('│') ? '│' : '║';
    const segments = trimmed.split(pipeChar);

    if (segments.length === numCols + 2) {
      return segments.slice(1, -1).map(s => s.trim());
    }

    // Positional fallback
    const cells: string[] = [];
    for (let c = 0; c < numCols; c++) {
      const start = colIndices[c] + 1;
      const end = colIndices[c + 1] !== undefined ? colIndices[c + 1] : line.length - 1;
      if (start < line.length) {
        cells.push(line.substring(start, Math.min(end, line.length)).trim());
      } else {
        cells.push('');
      }
    }
    return cells;
  };

  const rows: { isHeader: boolean; cells: string[] }[] = [];

  // Check if rows are delimited by interior borders
  const hasInteriorRowBorders = borderIdxs.length > 3;

  if (hasInteriorRowBorders || borderIdxs.length === 3) {
    // There is a header section: between borderIdxs[0] and borderIdxs[1]
    const headerLines = lines.slice(borderIdxs[0] + 1, borderIdxs[1]);
    if (headerLines.length === 0) return null;

    const headerColLines: string[][] = Array.from({ length: numCols }, () => []);
    for (const hLine of headerLines) {
      const cells = extractLineCells(hLine);
      for (let c = 0; c < numCols; c++) {
        if (cells[c]) headerColLines[c].push(cells[c]);
      }
    }
    const headerCells = headerColLines.map(col => col.join(' ').replace(/\s+/g, ' ').replace(/(?<!\\)\|/g, '\\|'));
    rows.push({ isHeader: true, cells: headerCells });

    // Body rows
    if (hasInteriorRowBorders) {
      // Each section between borderIdxs[b] and borderIdxs[b+1] is a row
      for (let b = 1; b < borderIdxs.length - 1; b++) {
        const bodySectionLines = lines.slice(borderIdxs[b] + 1, borderIdxs[b + 1]);
        if (bodySectionLines.length === 0) continue;

        const rowColLines: string[][] = Array.from({ length: numCols }, () => []);
        for (const line of bodySectionLines) {
          const cells = extractLineCells(line);
          for (let c = 0; c < numCols; c++) {
            if (cells[c]) rowColLines[c].push(cells[c]);
          }
        }
        const rowCells = rowColLines.map(col => col.join(' ').replace(/\s+/g, ' ').replace(/(?<!\\)\|/g, '\\|'));
        if (rowCells.some(c => c.length > 0)) {
          rows.push({ isHeader: false, cells: rowCells });
        }
      }
    } else {
      // borderIdxs.length === 3: No interior borders in body
      const bodyLines = lines.slice(borderIdxs[1] + 1, borderIdxs[2]);
      let currentBodyRow: string[][] | null = null;

      for (const line of bodyLines) {
        const cells = extractLineCells(line);
        const hasContent = cells.some(c => c.length > 0);
        if (!hasContent) continue;

        const isContinuation = currentBodyRow !== null && cells[0] === '' && cells.slice(1).some(c => c.length > 0);

        if (isContinuation && currentBodyRow) {
          // Append to current row
          for (let c = 0; c < numCols; c++) {
            if (cells[c]) currentBodyRow[c].push(cells[c]);
          }
        } else {
          // Commit previous row if exists
          if (currentBodyRow) {
            const rowCells = currentBodyRow.map(col => col.join(' ').replace(/\s+/g, ' ').replace(/(?<!\\)\|/g, '\\|'));
            rows.push({ isHeader: false, cells: rowCells });
          }
          currentBodyRow = Array.from({ length: numCols }, (_, idx) => (cells[idx] ? [cells[idx]] : []));
        }
      }

      if (currentBodyRow) {
        const rowCells = currentBodyRow.map(col => col.join(' ').replace(/\s+/g, ' ').replace(/(?<!\\)\|/g, '\\|'));
        rows.push({ isHeader: false, cells: rowCells });
      }
    }
  } else {
    // Only 2 borders (top and bottom) -> first line is header, subsequent lines are body rows
    const allContentLines = lines.slice(1, lines.length - 1);
    if (allContentLines.length === 0) return null;

    const firstCells = extractLineCells(allContentLines[0]).map(c => c.replace(/(?<!\\)\|/g, '\\|'));
    rows.push({ isHeader: true, cells: firstCells });

    for (let i = 1; i < allContentLines.length; i++) {
      const cells = extractLineCells(allContentLines[i]).map(c => c.replace(/(?<!\\)\|/g, '\\|'));
      if (cells.some(c => c.length > 0)) {
        rows.push({ isHeader: false, cells });
      }
    }
  }

  if (rows.length < 1) return null;

  const header = rows[0];
  const body = rows.slice(1);

  const headerCells = header.cells.map((c, idx) => c || `Col ${idx + 1}`);
  const separatorCells = headerCells.map(() => '---');

  const mdLines: string[] = [];
  mdLines.push(`| ${headerCells.join(' | ')} |`);
  mdLines.push(`| ${separatorCells.join(' | ')} |`);

  for (const row of body) {
    const rowCells = Array.from({ length: numCols }, (_, idx) => row.cells[idx] || '');
    mdLines.push(`| ${rowCells.join(' | ')} |`);
  }

  return mdLines.join('\n');
}

/**
 * Converts all ASCII and Unicode grid tables in a markdown string into standard Markdown tables.
 */
export function convertGridTables(text: string): { result: string; count: number } {
  const lines = text.split('\n');
  const resultLines: string[] = [];
  let count = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isGridBorderLine(line)) {
      // Potential grid table start
      const tableCandidateLines: string[] = [line];
      let j = i + 1;

      while (j < lines.length) {
        const nextLine = lines[j];
        if (isGridBorderLine(nextLine) || isGridContentLine(nextLine)) {
          tableCandidateLines.push(nextLine);
          if (isGridBorderLine(nextLine)) {
            // Check if next line is not a content line
            if (j + 1 >= lines.length || (!isGridContentLine(lines[j + 1]) && !isGridBorderLine(lines[j + 1]))) {
              j++;
              break;
            }
          }
          j++;
        } else {
          break;
        }
      }

      const parsed = parseGridTable(tableCandidateLines);
      if (parsed) {
        count++;
        resultLines.push(parsed);
        i = j;
        continue;
      }
    }

    resultLines.push(line);
    i++;
  }

  return { result: resultLines.join('\n'), count };
}

/**
 * Masks code blocks, inline code, and protected regions so regex transforms
 * do not alter code snippets or existing formulas.
 */
class TokenMasker {
  private tokens: MaskedToken[] = [];
  private counter = 0;
  public tablesConverted = 0;
  public diagramsConverted = 0;

  mask(text: string, convertGridTablesEnabled = true, convertDiagramsEnabled = true): string {
    this.tokens = [];
    this.counter = 0;
    this.tablesConverted = 0;
    this.diagramsConverted = 0;

    // 1. Process fenced code blocks: ``` ... ``` and ~~~ ... ~~~
    let masked = text.replace(/(```([\w-]*)\n([\s\S]*?)\n```|~~~([\w-]*)\n([\s\S]*?)\n~~~)/g, (fullMatch, _block, lang1, content1, lang2, content2) => {
      const lang = (lang1 || lang2 || '').trim().toLowerCase();
      const rawContent = content1 !== undefined ? content1 : content2 || '';
      const content = rawContent.replace(/^\n+/, '').replace(/\n+$/, '');

      const nonCodeLangs = ['', 'text', 'plaintext', 'ascii', 'markdown', 'md', 'table', 'grid', 'diagram', 'flowchart'];

      // Check if this is an ASCII Diagram inside a generic/text code block
      if (convertDiagramsEnabled && nonCodeLangs.includes(lang)) {
        if (isAsciiDiagram(content)) {
          const diag = convertAsciiToMermaid(content);
          if (diag.count > 0) {
            this.diagramsConverted += diag.count;
            const placeholder = `%%OB_MASKED_BLOCK_${this.counter++}%%`;
            this.tokens.push({ placeholder, original: diag.result });
            return placeholder;
          }
        }
      }

      // Check if this is a table inside a code block
      if (convertGridTablesEnabled && nonCodeLangs.includes(lang)) {
        // Check if content is a Grid Table
        const parsedGrid = parseGridTable(content.split('\n'));
        if (parsedGrid) {
          this.tablesConverted++;
          return parsedGrid;
        }

        // Check if content is already a Markdown Pipe Table
        if (isMarkdownPipeTable(content)) {
          this.tablesConverted++;
          return content;
        }
      }

      // Otherwise, mask as protected code block
      const placeholder = `%%OB-MASKED-BLOCK-${this.counter++}%%`;
      this.tokens.push({ placeholder, original: fullMatch });
      return placeholder;
    });

    // Handle any remaining single-line fenced blocks
    masked = masked.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
      const placeholder = `%%OB-MASKED-BLOCK-${this.counter++}%%`;
      this.tokens.push({ placeholder, original: match });
      return placeholder;
    });

    // 2. Mask inline code: `...`
    masked = masked.replace(/(`[^`\n]+?`)/g, (match) => {
      const placeholder = `%%OB-MASKED-INLINE-${this.counter++}%%`;
      this.tokens.push({ placeholder, original: match });
      return placeholder;
    });

    return masked;
  }

  unmask(text: string): string {
    let result = text;
    // Unmask in reverse order
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const token = this.tokens[i];
      result = result.replace(token.placeholder, () => token.original);
    }
    return result;
  }
}

/**
 * Tests if a line is a markdown list item.
 */
export function isListItemLine(line: string): boolean {
  // Matches:
  // - Bullet lists: *, -, +
  // - Numbered lists: 1., 1), a., a), i., i)
  // - Task lists: - [ ], - [x], * [ ], etc.
  return /^\s*(?:[-*+]|\d+[.)]|[a-zA-Z][.)]|[-*+]\s*\[[ xX]\])\s+/.test(line);
}

/**
 * Returns indentation level (number of spaces, tabs counted as 2 spaces)
 */
export function getLineIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  return match[1].replace(/\t/g, '  ').length;
}

/**
 * Tightens loose lists by removing blank lines between list items and their children.
 */
export function tightenLists(text: string): { result: string; count: number } {
  const lines = text.split('\n');
  const resultLines: string[] = [];
  let tightenedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];

    if (currentLine.trim() === '') {
      // Find previous non-empty line
      let prevNonEmptyIdx = -1;
      for (let j = resultLines.length - 1; j >= 0; j--) {
        if (resultLines[j].trim() !== '') {
          prevNonEmptyIdx = j;
          break;
        }
      }

      // Find next non-empty line
      let nextNonEmptyIdx = -1;
      for (let k = i + 1; k < lines.length; k++) {
        if (lines[k].trim() !== '') {
          nextNonEmptyIdx = k;
          break;
        }
      }

      if (prevNonEmptyIdx !== -1 && nextNonEmptyIdx !== -1) {
        const prevLine = resultLines[prevNonEmptyIdx];
        const nextLine = lines[nextNonEmptyIdx];

        const isPrevList = isListItemLine(prevLine);
        const isNextList = isListItemLine(nextLine);

        // Case 1: Between two list items (at same level or nested)
        if (isPrevList && isNextList) {
          tightenedCount++;
          continue; // Skip this blank line
        }

        // Case 2: Between a list item and its indented continuation
        if (isPrevList && !isNextList) {
          const prevIndent = getLineIndent(prevLine);
          const nextIndent = getLineIndent(nextLine);
          // If the next line is indented as a continuation of the list item
          if (nextIndent > prevIndent && !nextLine.trim().startsWith('#') && !nextLine.trim().startsWith('>')) {
            tightenedCount++;
            continue; // Skip blank line inside list item continuation
          }
        }
      }
    }

    resultLines.push(currentLine);
  }

  return { result: resultLines.join('\n'), count: tightenedCount };
}

/**
 * Fixes LaTeX math delimiters to Obsidian standard:
 * \[ ... \] -> $$ ... $$ (display math)
 * \( ... \) -> $ ... $ (inline math)
 */
export function fixMathDelimiters(text: string): { result: string; count: number } {
  let count = 0;

  // 1. Display math: \[ ... \] -> $$ ... $$
  let result = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
    count++;
    const trimmed = formula.trim();
    if (formula.includes('\n') || match.includes('\n')) {
      return `$$\n${trimmed}\n$$`;
    }
    return `$$ ${trimmed} $$`;
  });

  // 2. Inline math: \( ... \) -> $ ... $
  result = result.replace(/\\\((.*?)\\\)/g, (_match, formula) => {
    count++;
    return `$${formula.trim()}$`;
  });

  return { result, count };
}

const CALLOUT_TYPES_MAP: Record<string, string> = {
  note: 'note',
  notes: 'note',
  tip: 'tip',
  tips: 'tip',
  warning: 'warning',
  warnings: 'warning',
  caution: 'caution',
  important: 'important',
  info: 'info',
  information: 'info',
  todo: 'todo',
  example: 'example',
  quote: 'quote',
  question: 'question',
  faq: 'faq',
  success: 'success',
  failure: 'failure',
  fail: 'failure',
  bug: 'bug',
  summary: 'summary',
  tldr: 'summary',
  'tl;dr': 'summary',
  'key takeaway': 'info',
  'key takeaways': 'info',
};

/**
 * Converts AI note/warning prefixes to Obsidian Callouts.
 */
export function convertCallouts(text: string): { result: string; count: number } {
  let count = 0;
  const typesRegexStr = Object.keys(CALLOUT_TYPES_MAP).join('|');

  // Case 1: Standardize existing Obsidian callouts: > [!NOTE] or > [!WARNING]
  let result = text.replace(/^([ \t]*>[ \t]*)\[!([a-zA-Z]+)\](.*)$/gm, (_match, prefix, tag, rest) => {
    count++;
    return `${prefix}[!${tag.toLowerCase()}]${rest}`;
  });

  // Case 2: Quoted AI notes: > **Note:** content or > **Tip (Custom Title):** content
  const quotedRegex = new RegExp(
    `^([ \\t]*>[ \\t]*)\\*\\*(${typesRegexStr})(?:[ \\t]*\\(([^)]+)\\))?:?\\*\\*:?[ \\t]*(.*)$`,
    'gim'
  );

  result = result.replace(quotedRegex, (_match, prefix, type, customTitle, content) => {
    count++;
    const canonicalType = CALLOUT_TYPES_MAP[type.toLowerCase()] || 'note';
    const trimmedTitle = (customTitle || '').trim();
    const titleSuffix = trimmedTitle ? ` ${trimmedTitle}` : '';
    const trimmedContent = (content || '').trim();
    if (trimmedContent) {
      return `${prefix}[!${canonicalType}]${titleSuffix}\n${prefix}${trimmedContent}`;
    }
    return `${prefix}[!${canonicalType}]${titleSuffix}`;
  });

  // Case 3: Standalone AI alerts: **Note:** content or **Warning (Title):** content
  const standaloneRegex = new RegExp(
    `^(\\*\\*(${typesRegexStr})(?:[ \\t]*\\(([^)]+)\\))?:?\\*\\*:?)[ \\t]+([^\\n]+)$`,
    'gim'
  );

  result = result.replace(standaloneRegex, (_match, _fullPrefix, type, customTitle, content) => {
    count++;
    const canonicalType = CALLOUT_TYPES_MAP[type.toLowerCase()] || 'note';
    const trimmedTitle = (customTitle || '').trim();
    const titleSuffix = trimmedTitle ? ` ${trimmedTitle}` : '';
    return `> [!${canonicalType}]${titleSuffix}\n> ${content.trim()}`;
  });

  return { result, count };
}

/**
 * Fixes emphasis whitespace so Obsidian markdown parser handles bold & italics correctly.
 * e.g. ** bold ** -> **bold**, * italic * -> *italic*
 */
export function fixEmphasisSpacing(text: string): { result: string; count: number } {
  let totalCount = 0;
  let result = text;

  // 1. Triple asterisks *** text ***
  result = result.replace(/\*\*\*([ \t]*)([^\n*]+?)([ \t]*)\*\*\*/g, (match, leading, content, trailing) => {
    if (leading.length > 0 || trailing.length > 0) {
      totalCount++;
      return `***${content.trim()}***`;
    }
    return match;
  });

  // 2. Double asterisks ** text **
  result = result.replace(/\*\*([ \t]*)([^\n*]+?)([ \t]*)\*\*/g, (match, leading, content, trailing) => {
    if (leading.length > 0 || trailing.length > 0) {
      totalCount++;
      return `**${content.trim()}**`;
    }
    return match;
  });

  // 3. Double underscores __ text __
  result = result.replace(/__([ \t]*)([^\n_]+?)([ \t]*)__/g, (match, leading, content, trailing) => {
    if (leading.length > 0 || trailing.length > 0) {
      totalCount++;
      return `__${content.trim()}__`;
    }
    return match;
  });

  // 4. Single asterisks * text *
  result = result.replace(/(?<!\*)\*([ \t]*)([^\n*]+?)([ \t]*)\*(?!\*)/g, (match, leading, content, trailing) => {
    if (leading.length > 0 || trailing.length > 0) {
      totalCount++;
      return `*${content.trim()}*`;
    }
    return match;
  });

  // 5. Single underscores _ text _
  result = result.replace(/(?<!_)_([ \t]*)([^\n_]+?)([ \t]*)_(?!_)/g, (match, leading, content, trailing) => {
    if (leading.length > 0 || trailing.length > 0) {
      totalCount++;
      return `_${content.trim()}_`;
    }
    return match;
  });

  return { result, count: totalCount };
}

/**
 * Standardizes headings:
 * - Fixes `#Heading` -> `# Heading`
 * - Normalizes excessive blank lines surrounding headings
 */
export function fixHeadings(text: string): string {
  // Fix missing space after hash
  let result = text.replace(/^(#{1,6})([^\s#\n].*)$/gm, '$1 $2');

  // Ensure maximum 1 blank line after heading and maximum 1-2 blank lines before
  result = result.replace(/\n{3,}(#{1,6}\s+)/g, '\n\n$1');
  return result;
}

/**
 * Enforces a strict heading hierarchy with at most one H1 (# Heading) per document.
 * The first H1 is retained as the note title, while any subsequent H1s
 * are demoted to H2 (##). Immediate child headings under demoted H1s are adjusted
 * proportionally to preserve clean hierarchical nesting.
 */
export function enforceSingleH1(text: string): { result: string; count: number } {
  const lines = text.split('\n');
  let firstH1Index = -1;

  // 1. First pass: find the index of the first H1
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^#\s+(.*)$/);
    if (match) {
      firstH1Index = i;
      break;
    }
  }

  // If there's 0 or 1 H1, check if there are any subsequent H1s
  if (firstH1Index === -1) {
    return { result: text, count: 0 };
  }

  // 2. Partition into sections: Section 0 is before second H1, Section 1..N start with a subsequent H1
  interface Section {
    startLineIdx: number;
    endLineIdx: number;
    isDemoted: boolean;
    hasLevel2Child: boolean;
  }

  const sections: Section[] = [];
  let currentSection: Section = {
    startLineIdx: 0,
    endLineIdx: lines.length - 1,
    isDemoted: false,
    hasLevel2Child: false,
  };

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      const level = match[1].length;
      if (level === 1 && i > firstH1Index) {
        // Start of a new demoted section
        currentSection.endLineIdx = i - 1;
        sections.push(currentSection);
        currentSection = {
          startLineIdx: i,
          endLineIdx: lines.length - 1,
          isDemoted: true,
          hasLevel2Child: false,
        };
      } else if (level === 2 && currentSection.isDemoted) {
        currentSection.hasLevel2Child = true;
      }
    }
  }
  sections.push(currentSection);

  // If no demoted sections, return original
  if (sections.length === 1 && !sections[0].isDemoted) {
    return { result: text, count: 0 };
  }

  // 3. Second pass: transform lines according to section rules
  let count = 0;
  const resultLines: string[] = [];

  for (const section of sections) {
    for (let i = section.startLineIdx; i <= section.endLineIdx; i++) {
      const line = lines[i];
      const match = line.match(/^(#{1,6})\s+(.*)$/);

      if (match && section.isDemoted) {
        const level = match[1].length;
        const content = match[2];

        if (level === 1) {
          // Demote subsequent H1 to H2
          count++;
          resultLines.push(`## ${content}`);
        } else if (section.hasLevel2Child) {
          // If this section has H2 children, shift all children by +1
          count++;
          const newLevel = Math.min(6, level + 1);
          resultLines.push(`${'#'.repeat(newLevel)} ${content}`);
        } else {
          // Children are already level 3 (###) or deeper -> already valid children of H2
          resultLines.push(line);
        }
      } else {
        resultLines.push(line);
      }
    }
  }

  return { result: resultLines.join('\n'), count };
}

/**
 * Collapses 3 or more consecutive blank lines into 1 blank line (2 newlines).
 */
export function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * Cleans unwanted trailing whitespace on lines.
 */
export function trimTrailingSpaces(text: string): string {
  const lines = text.split('\n');
  return lines
    .map(line => {
      // If line ends with exactly 2 spaces (markdown hard line break), preserve if intentional
      if (line.endsWith('  ') && !line.endsWith('   ') && line.trim() !== '') {
        return line;
      }
      return line.replace(/[ \t]+$/, '');
    })
    .join('\n');
}

/**
 * Cleans markdown table blank line interruptions.
 */
export function fixTableSpacing(text: string): string {
  // Remove blank lines between table rows
  return text.replace(/(\|.+?\|)\n\s*\n(?=\|)/g, '$1\n');
}

/**
 * Cleans empty blockquote lines.
 */
export function fixQuoteSpacing(text: string): string {
  // Collapse consecutive empty quote lines (e.g. > \n > \n) into a single > \n
  return text.replace(/^(>[ \t]*\n){2,}/gm, '>\n');
}

/**
 * Normalizes task list formatting: `- [ ] ` or `* [x] `
 */
export function normalizeTaskLists(text: string): string {
  return text.replace(/^(\s*[-*+]\s+)\[([ xX])\]\s*/gm, (_match, prefix, mark) => {
    const isChecked = mark.toLowerCase() === 'x';
    return `${prefix.trimEnd()} [${isChecked ? 'x' : ' '}] `;
  });
}

/**
 * Main cleaning pipeline function.
 */
export function cleanMarkdown(
  input: string,
  options: Partial<CleanOptions> = DEFAULT_OPTIONS
): { cleaned: string; stats: CleanStats } {
  if (!input || !input.trim()) {
    return {
      cleaned: '',
      stats: {
        inputChars: 0,
        outputChars: 0,
        inputWords: 0,
        outputWords: 0,
        inputLines: 0,
        outputLines: 0,
        linesSaved: 0,
        charactersSaved: 0,
        listsTightened: 0,
        calloutsConverted: 0,
        mathConverted: 0,
        emphasisFixed: 0,
        tablesConverted: 0,
        diagramsConverted: 0,
        headingsNormalized: 0,
      }
    };
  }

  const opts: CleanOptions = { ...DEFAULT_OPTIONS, ...options };
  const masker = new TokenMasker();

  // 1. Mask code blocks & inline backticks (automatically converts diagrams & tables inside generic code fences)
  let text = masker.mask(input, opts.convertGridTables, opts.convertDiagrams);
  let tablesConverted = masker.tablesConverted;
  let diagramsConverted = masker.diagramsConverted;

  let listsTightened = 0;
  let calloutsConverted = 0;
  let mathConverted = 0;
  let emphasisFixed = 0;
  let headingsNormalized = 0;

  // 2. Convert unfenced ASCII/Unicode diagrams to Mermaid flowcharts
  if (opts.convertDiagrams) {
    const blocks = text.split(/\n{2,}/);
    let anyConverted = false;
    const newBlocks = blocks.map(block => {
      const cleanBlock = block.replace(/^\n+/, '').replace(/\n+$/, '');
      if (isAsciiDiagram(cleanBlock)) {
        const res = convertAsciiToMermaid(cleanBlock);
        if (res.count > 0) {
          diagramsConverted += res.count;
          anyConverted = true;
          return res.result;
        }
      }
      return block;
    });
    if (anyConverted) {
      text = newBlocks.join('\n\n');
    }
  }

  // 3. Convert unfenced ASCII/Unicode grid tables to markdown tables
  if (opts.convertGridTables) {
    const res = convertGridTables(text);
    text = res.result;
    tablesConverted += res.count;
  }

  // 4. Math delimiters (before callouts and emphasis)
  if (opts.fixMathDelimiters) {
    const res = fixMathDelimiters(text);
    text = res.result;
    mathConverted = res.count;
  }

  // 5. Headings: formatting space & spacing
  if (opts.fixHeadings) {
    text = fixHeadings(text);
  }

  // 6. Enforce single H1 and strict heading hierarchy
  if (opts.enforceSingleH1) {
    const res = enforceSingleH1(text);
    text = res.result;
    headingsNormalized = res.count;
  }

  // 7. Callouts
  if (opts.convertCallouts) {
    const res = convertCallouts(text);
    text = res.result;
    calloutsConverted = res.count;
  }

  // 8. Emphasis spacing
  if (opts.fixEmphasisSpacing) {
    const res = fixEmphasisSpacing(text);
    text = res.result;
    emphasisFixed = res.count;
  }

  // 9. Tighten loose lists
  if (opts.tightenLists) {
    const res = tightenLists(text);
    text = res.result;
    listsTightened = res.count;
  }

  // 10. Table spacing
  if (opts.fixTableSpacing) {
    text = fixTableSpacing(text);
  }

  // 11. Quote spacing
  if (opts.fixQuoteSpacing) {
    text = fixQuoteSpacing(text);
  }

  // 12. Normalize task lists
  if (opts.normalizeTaskLists) {
    text = normalizeTaskLists(text);
  }

  // 13. Collapse blank lines
  if (opts.collapseBlankLines) {
    text = collapseBlankLines(text);
  }

  // 14. Trim trailing whitespace
  if (opts.trimTrailingSpaces) {
    text = trimTrailingSpaces(text);
  }

  // 15. Final trim of excessive leading/trailing empty lines of the document
  text = text.trim() + '\n';

  // 16. Restore masked code blocks and inline backticks
  const cleaned = masker.unmask(text);

  // Calculate statistics
  const inputChars = input.length;
  const outputChars = cleaned.length;
  const inputWords = (input.match(/\S+/g) || []).length;
  const outputWords = (cleaned.match(/\S+/g) || []).length;
  const inputLines = input ? input.split('\n').length : 0;
  const outputLines = cleaned ? cleaned.split('\n').length : 0;

  const stats: CleanStats = {
    inputChars,
    outputChars,
    inputWords,
    outputWords,
    inputLines,
    outputLines,
    linesSaved: Math.max(0, inputLines - outputLines),
    charactersSaved: Math.max(0, inputChars - outputChars),
    listsTightened,
    calloutsConverted,
    mathConverted,
    emphasisFixed,
    tablesConverted,
    diagramsConverted,
    headingsNormalized,
  };

  return { cleaned, stats };
}
