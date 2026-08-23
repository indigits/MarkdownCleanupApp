import type { CleanOptions, CleanStats } from './types';
import { DEFAULT_OPTIONS } from './presets';

interface MaskedToken {
  placeholder: string;
  original: string;
}

/**
 * Masks code blocks, inline code, and protected regions so regex transforms
 * do not alter code snippets or existing formulas.
 */
class TokenMasker {
  private tokens: MaskedToken[] = [];
  private counter = 0;

  mask(text: string): string {
    this.tokens = [];
    this.counter = 0;

    // 1. Mask fenced code blocks: ``` ... ``` and ~~~ ... ~~~
    let masked = text.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
      const placeholder = `%%OB_MASKED_BLOCK_${this.counter++}%%`;
      this.tokens.push({ placeholder, original: match });
      return placeholder;
    });

    // 2. Mask inline code: `...`
    masked = masked.replace(/(`[^`\n]+?`)/g, (match) => {
      const placeholder = `%%OB_MASKED_INLINE_${this.counter++}%%`;
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
      }
    };
  }

  const opts: CleanOptions = { ...DEFAULT_OPTIONS, ...options };
  const masker = new TokenMasker();

  // 1. Mask code blocks & inline backticks
  let text = masker.mask(input);

  let listsTightened = 0;
  let calloutsConverted = 0;
  let mathConverted = 0;
  let emphasisFixed = 0;

  // 2. Math delimiters (before callouts and emphasis)
  if (opts.fixMathDelimiters) {
    const res = fixMathDelimiters(text);
    text = res.result;
    mathConverted = res.count;
  }

  // 3. Headings
  if (opts.fixHeadings) {
    text = fixHeadings(text);
  }

  // 4. Callouts
  if (opts.convertCallouts) {
    const res = convertCallouts(text);
    text = res.result;
    calloutsConverted = res.count;
  }

  // 5. Emphasis spacing
  if (opts.fixEmphasisSpacing) {
    const res = fixEmphasisSpacing(text);
    text = res.result;
    emphasisFixed = res.count;
  }

  // 6. Tighten loose lists
  if (opts.tightenLists) {
    const res = tightenLists(text);
    text = res.result;
    listsTightened = res.count;
  }

  // 7. Table spacing
  if (opts.fixTableSpacing) {
    text = fixTableSpacing(text);
  }

  // 8. Quote spacing
  if (opts.fixQuoteSpacing) {
    text = fixQuoteSpacing(text);
  }

  // 9. Normalize task lists
  if (opts.normalizeTaskLists) {
    text = normalizeTaskLists(text);
  }

  // 10. Collapse blank lines
  if (opts.collapseBlankLines) {
    text = collapseBlankLines(text);
  }

  // 11. Trim trailing whitespace
  if (opts.trimTrailingSpaces) {
    text = trimTrailingSpaces(text);
  }

  // 12. Final trim of excessive leading/trailing empty lines of the document
  text = text.trim() + '\n';

  // 13. Restore masked code blocks and inline backticks
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
  };

  return { cleaned, stats };
}
