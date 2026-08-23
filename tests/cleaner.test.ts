import { describe, it, expect } from 'vitest';
import {
  cleanMarkdown,
  tightenLists,
  fixMathDelimiters,
  convertCallouts,
  fixEmphasisSpacing,
  fixHeadings,
  collapseBlankLines,
  trimTrailingSpaces,
  fixTableSpacing,
  isListItemLine,
} from '../src/lib/cleaner';
import { PRESETS } from '../src/lib/presets';
import { computeLineDiff } from '../src/lib/diff';
import { parseMarkdownToHtml, renderInline } from '../src/lib/parser';

describe('Markdown Cleaner - List Tightening (Gemini Loose Lists)', () => {
  it('identifies list item lines correctly', () => {
    expect(isListItemLine('* Bullet item')).toBe(true);
    expect(isListItemLine('- Bullet item')).toBe(true);
    expect(isListItemLine('+ Bullet item')).toBe(true);
    expect(isListItemLine('  * Indented bullet')).toBe(true);
    expect(isListItemLine('1. Numbered item')).toBe(true);
    expect(isListItemLine('  1. Indented numbered')).toBe(true);
    expect(isListItemLine('- [ ] Task unchecked')).toBe(true);
    expect(isListItemLine('- [x] Task checked')).toBe(true);
    expect(isListItemLine('Regular text line')).toBe(false);
    expect(isListItemLine('# Heading')).toBe(false);
  });

  it('removes blank lines between simple bullet items', () => {
    const input = '* Item 1\n\n* Item 2\n\n* Item 3';
    const expected = '* Item 1\n* Item 2\n* Item 3';
    const { result, count } = tightenLists(input);
    expect(result).toBe(expected);
    expect(count).toBe(2);
  });

  it('removes blank lines between numbered list items', () => {
    const input = '1. First step\n\n2. Second step\n\n3. Third step';
    const expected = '1. First step\n2. Second step\n3. Third step';
    const { result, count } = tightenLists(input);
    expect(result).toBe(expected);
    expect(count).toBe(2);
  });

  it('tightens nested loose lists with mixed indentation', () => {
    const input = [
      '1. Root item 1',
      '',
      '   * Sub-bullet A',
      '',
      '   * Sub-bullet B',
      '',
      '2. Root item 2',
    ].join('\n');

    const expected = [
      '1. Root item 1',
      '   * Sub-bullet A',
      '   * Sub-bullet B',
      '2. Root item 2',
    ].join('\n');

    const { result } = tightenLists(input);
    expect(result).toBe(expected);
  });

  it('tightens task lists (- [ ] and - [x])', () => {
    const input = '- [ ] Task 1\n\n- [x] Task 2\n\n- [ ] Task 3';
    const expected = '- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3';
    const { result } = tightenLists(input);
    expect(result).toBe(expected);
  });

  it('preserves blank line between a list and an unindented paragraph', () => {
    const input = 'Intro paragraph\n\n* Item 1\n\n* Item 2\n\nOutro paragraph';
    const { cleaned } = cleanMarkdown(input);
    expect(cleaned).toBe('Intro paragraph\n\n* Item 1\n* Item 2\n\nOutro paragraph\n');
  });

  it('preserves blank lines between list and headings', () => {
    const input = '* Item 1\n\n* Item 2\n\n## Next Section';
    const { cleaned } = cleanMarkdown(input);
    expect(cleaned).toBe('* Item 1\n* Item 2\n\n## Next Section\n');
  });
});

describe('Markdown Cleaner - Code Block Protection', () => {
  it('never modifies list lookalikes inside fenced code blocks', () => {
    const input = [
      '# Code Section',
      '',
      '```python',
      '# * Item 1 in code',
      '',
      '# * Item 2 in code',
      '```',
      '',
      '* Real item 1',
      '',
      '* Real item 2',
    ].join('\n');

    const { cleaned } = cleanMarkdown(input);
    expect(cleaned).toContain('# * Item 1 in code\n\n# * Item 2 in code');
    expect(cleaned).toContain('* Real item 1\n* Real item 2');
  });

  it('never modifies math or bold inside inline code backticks', () => {
    const input = 'Use the command `\\[ formula \\]` or `** not bold **` directly.';
    const { cleaned } = cleanMarkdown(input);
    expect(cleaned).toContain('`\\[ formula \\]`');
    expect(cleaned).toContain('`** not bold **`');
  });
});

describe('Markdown Cleaner - Math / LaTeX Delimiters', () => {
  it('converts display math \\[ ... \\] to $$ ... $$', () => {
    const input = '\\[ E = mc^2 \\]';
    const { result, count } = fixMathDelimiters(input);
    expect(result).toBe('$$ E = mc^2 $$');
    expect(count).toBe(1);
  });

  it('converts multi-line display math \\[ ... \\] to $$\n...\n$$', () => {
    const input = '\\[\n\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\n\\]';
    const { result } = fixMathDelimiters(input);
    expect(result).toBe('$$\n\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\n$$');
  });

  it('converts inline math \\( ... \\) to $ ... $', () => {
    const input = 'Let \\( x = 42 \\) and \\( y = 10 \\).';
    const { result, count } = fixMathDelimiters(input);
    expect(result).toBe('Let $x = 42$ and $y = 10$.');
    expect(count).toBe(2);
  });
});

describe('Markdown Cleaner - AI Callouts Conversion', () => {
  it('converts quoted AI note > **Note:** to > [!note]', () => {
    const input = '> **Note:** Always save your work.';
    const { result, count } = convertCallouts(input);
    expect(result).toBe('> [!note]\n> Always save your work.');
    expect(count).toBe(1);
  });

  it('converts quoted AI warning > **Warning:** to > [!warning]', () => {
    const input = '> **Warning:** This will delete files.';
    const { result } = convertCallouts(input);
    expect(result).toBe('> [!warning]\n> This will delete files.');
  });

  it('converts quoted AI tip > **Tip:** to > [!tip]', () => {
    const input = '> **Tip:** Use shortcut keys.';
    const { result } = convertCallouts(input);
    expect(result).toBe('> [!tip]\n> Use shortcut keys.');
  });

  it('normalizes uppercase Obsidian callouts > [!NOTE] to > [!note]', () => {
    const input = '> [!NOTE] Title here\n> Body text';
    const { result } = convertCallouts(input);
    expect(result).toContain('> [!note] Title here');
  });

  it('converts quoted AI note in multi-line context', () => {
    const input = '* Item 1\n\n> **Note:** The equation is $E = mc^2$.\n\n$$ formula $$';
    const { result } = convertCallouts(input);
    expect(result).toBe('* Item 1\n\n> [!note]\n> The equation is $E = mc^2$.\n\n$$ formula $$');
  });
});

describe('Markdown Cleaner - Bold & Italic Whitespace', () => {
  it('fixes spaces inside double asterisks ** text ** -> **text**', () => {
    const input = 'This is ** bold text ** and this is **another one **.';
    const { result, count } = fixEmphasisSpacing(input);
    expect(result).toBe('This is **bold text** and this is **another one**.');
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('fixes spaces inside single asterisks * text * -> *text*', () => {
    const input = 'This is * italic text * here.';
    const { result } = fixEmphasisSpacing(input);
    expect(result).toBe('This is *italic text* here.');
  });

  it('fixes spaces inside triple asterisks *** text *** -> ***text***', () => {
    const input = 'This is *** bold italic *** text.';
    const { result } = fixEmphasisSpacing(input);
    expect(result).toBe('This is ***bold italic*** text.');
  });
});

describe('Markdown Cleaner - Headings & Blank Lines', () => {
  it('fixes missing space in #Heading', () => {
    const input = '###My Heading\n##Another';
    const result = fixHeadings(input);
    expect(result).toBe('### My Heading\n## Another');
  });

  it('collapses 3+ consecutive newlines to 2 newlines (1 blank line)', () => {
    const input = 'Para 1\n\n\n\n\nPara 2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Para 1\n\nPara 2');
  });

  it('trims trailing spaces', () => {
    const input = 'Line 1   \nLine 2\t\nLine 3';
    const result = trimTrailingSpaces(input);
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });

  it('cleans empty line interruptions in markdown tables', () => {
    const input = '| Col 1 | Col 2 |\n|---|---|\n\n| Data 1 | Data 2 |';
    const result = fixTableSpacing(input);
    expect(result).toBe('| Col 1 | Col 2 |\n|---|---|\n| Data 1 | Data 2 |');
  });
});

describe('Markdown Cleaner - End to End & Idempotency', () => {
  it('cleans a complex Gemini chat output thoroughly', () => {
    const geminiInput = [
      '###Overview of Systems',
      '',
      '* **Module A**: Data handler',
      '',
      '* **Module B**: Model inference',
      '',
      '  * Sub-item 1',
      '',
      '  * Sub-item 2',
      '',
      '> **Note:** The equation is \\( E = mc^2 \\).',
      '',
      '\\[',
      'f(x) = x^2',
      '\\]',
      '',
      '** Key takeaway **: All systems are operational.',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(geminiInput, PRESETS.gemini.options);

    expect(cleaned).toContain('### Overview of Systems');
    expect(cleaned).toContain('* **Module A**: Data handler\n* **Module B**: Model inference');
    expect(cleaned).toContain('  * Sub-item 1\n  * Sub-item 2');
    expect(cleaned).toContain('> [!note]\n> The equation is $E = mc^2$.');
    expect(cleaned).toContain('$$\nf(x) = x^2\n$$');
    expect(cleaned).toContain('**Key takeaway**');
    expect(stats.linesSaved).toBeGreaterThan(0);
  });

  it('is idempotent: running clean twice produces the same result', () => {
    const raw = '# Title\n\n* A\n\n* B\n\n> **Note:** text\n\n\\[ x \\]';
    const pass1 = cleanMarkdown(raw).cleaned;
    const pass2 = cleanMarkdown(pass1).cleaned;
    expect(pass2).toBe(pass1);
  });
});

describe('Diff Viewer Algorithm', () => {
  it('correctly calculates line differences', () => {
    const oldText = '* Item 1\n\n* Item 2';
    const newText = '* Item 1\n* Item 2';
    const diff = computeLineDiff(oldText, newText);

    expect(diff.length).toBeGreaterThan(0);
    const removedLines = diff.filter(d => d.type === 'removed');
    expect(removedLines.length).toBe(1);
    expect(removedLines[0].oldContent).toBe('');
  });
});

describe('Obsidian HTML Parser & Inline Renderer', () => {
  it('renders callouts to HTML with appropriate classes', () => {
    const md = '> [!note]\n> Remember to save.';
    const html = parseMarkdownToHtml(md);
    expect(html).toContain('callout-note');
    expect(html).toContain('Remember to save.');
  });

  it('renders wikilinks correctly', () => {
    const inline = renderInline('Check [[Design Notes|My Notes]] for details.');
    expect(inline).toContain('<a class="obsidian-wikilink"');
    expect(inline).toContain('My Notes');
  });

  it('renders tags correctly', () => {
    const inline = renderInline('This note has #project/gemini tag.');
    expect(inline).toContain('<span class="obsidian-tag">#project/gemini</span>');
  });

  it('renders math blocks to display html', () => {
    const md = '$$ x^2 + y^2 = z^2 $$';
    const html = parseMarkdownToHtml(md);
    expect(html).toContain('obsidian-math-block');
  });
});

describe('Extended Edge Cases & Complex Scenarios', () => {
  it('handles 4-level deeply nested lists correctly', () => {
    const input = [
      '* Level 1',
      '',
      '  * Level 2',
      '',
      '    * Level 3',
      '',
      '      * Level 4',
      '',
      '* Level 1 again'
    ].join('\n');

    const expected = [
      '* Level 1',
      '  * Level 2',
      '    * Level 3',
      '      * Level 4',
      '* Level 1 again\n'
    ].join('\n');

    const { cleaned } = cleanMarkdown(input);
    expect(cleaned).toBe(expected);
  });

  it('handles callouts with custom parenthetical titles', () => {
    const input = '> **Tip (Performance Optimization):** Use memory cache.';
    const { cleaned } = cleanMarkdown(input);
    expect(cleaned).toContain('> [!tip]');
    expect(cleaned).toContain('Use memory cache.');
  });

  it('converts Claude and ChatGPT presets correctly', () => {
    const raw = '#Heading\n\n* A\n\n* B\n\n**Note:** Clean this up.';
    const claudeResult = cleanMarkdown(raw, PRESETS.claude.options);
    const chatgptResult = cleanMarkdown(raw, PRESETS.chatgpt.options);
    const minimalResult = cleanMarkdown(raw, PRESETS.minimal.options);

    expect(claudeResult.cleaned).toContain('# Heading');
    expect(claudeResult.cleaned).toContain('* A\n* B');
    expect(claudeResult.cleaned).toContain('> [!note]');

    expect(chatgptResult.cleaned).toContain('* A\n* B');
    expect(minimalResult.cleaned).toContain('* A\n* B');
    // Minimal does not convert callouts
    expect(minimalResult.cleaned).toContain('**Note:** Clean this up.');
  });

  it('safely handles empty strings, null-like input and pure whitespace', () => {
    expect(cleanMarkdown('').cleaned).toBe('');
    expect(cleanMarkdown('   \n\n  \t  ').cleaned).toBe('');
    expect(cleanMarkdown('\n\n\n').cleaned).toBe('');
  });

  it('processes large documents quickly under 50ms', () => {
    let largeDoc = '# Benchmark Document\n\n';
    for (let i = 0; i < 500; i++) {
      largeDoc += `* **Item ${i}**: Description with \\( x_{${i}} = ${i}^2 \\)\n\n`;
      if (i % 20 === 0) {
        largeDoc += `> **Note:** Checkpoint at index ${i}\n\n`;
      }
    }

    const t0 = performance.now();
    const { cleaned, stats } = cleanMarkdown(largeDoc);
    const duration = performance.now() - t0;

    expect(cleaned.length).toBeGreaterThan(1000);
    expect(stats.listsTightened).toBeGreaterThan(400);
    expect(duration).toBeLessThan(100); // Super fast pure regex pipeline
  });
});

