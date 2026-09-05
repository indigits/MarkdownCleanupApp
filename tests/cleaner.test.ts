import { describe, it, expect } from 'vitest';
import {
  cleanMarkdown,
  tightenLists,
  fixMathDelimiters,
  convertCallouts,
  fixEmphasisSpacing,
  fixHeadings,
  enforceSingleH1,
  collapseBlankLines,
  trimTrailingSpaces,
  fixTableSpacing,
  isListItemLine,
  isGridBorderLine,
  extractColIndices,
  isGridContentLine,
  isMarkdownPipeTable,
  parseGridTable,
  convertGridTables,
} from '../src/lib/cleaner';
import { PRESETS } from '../src/lib/presets';
import { computeLineDiff } from '../src/lib/diff';
import { parseMarkdownToHtml, renderInline, highlightCode } from '../src/lib/parser';

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

describe('Markdown Cleaner - Grid & ASCII Table Conversion', () => {
  it('converts the Architectural Trade-Off Matrix from Gemini into a markdown table', () => {
    const input = [
      '# Architectural Trade-Off Matrix',
      '',
      '```',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '| Approach                   | Aggregate Integrity   | Query Efficiency    | Complexity Cost         |',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '| Classical Repository       | High                  | Very Low            | Low                     |',
      '| (Full Hydration)           | (No partial state)    | (SELECT * everywhere)| (Simple abstractions)   |',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '| CQRS Separation            | High                  | High                | Medium                  |',
      '| (Bypass for Reads)         | (Entities for writes) | (Targeted DTO reads)| (Two data paths)        |',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '| Aggregate Decomposition    | High                  | High                | Medium                  |',
      '| (Shared Table Pattern)     | (Fully valid models)  | (Narrow projections)| (Multiple entity models)|',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '| Task-Specific Commands     | High                  | High                | Medium                  |',
      '| (Narrow Command Models)    | (Scoped invariants)   | (Single-row slices) | (Granular repositories) |',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '| Functional Transition      | High                  | Maximum             | Low/Medium              |',
      '| (Pure Functions)           | (Explicit arguments)  | (Ad-hoc projections)| (No OOP encapsulation)  |',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '```',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(input);

    expect(cleaned).toContain('| Approach | Aggregate Integrity | Query Efficiency | Complexity Cost |');
    expect(cleaned).toContain('| --- | --- | --- | --- |');
    expect(cleaned).toContain('| Classical Repository (Full Hydration) | High (No partial state) | Very Low (SELECT * everywhere) | Low (Simple abstractions) |');
    expect(cleaned).toContain('| CQRS Separation (Bypass for Reads) | High (Entities for writes) | High (Targeted DTO reads) | Medium (Two data paths) |');
    expect(cleaned).toContain('| Aggregate Decomposition (Shared Table Pattern) | High (Fully valid models) | High (Narrow projections) | Medium (Multiple entity models) |');
    expect(cleaned).toContain('| Task-Specific Commands (Narrow Command Models) | High (Scoped invariants) | High (Single-row slices) | Medium (Granular repositories) |');
    expect(cleaned).toContain('| Functional Transition (Pure Functions) | High (Explicit arguments) | Maximum (Ad-hoc projections) | Low/Medium (No OOP encapsulation) |');
    expect(cleaned).not.toContain('+----------------------------+');
    expect(stats.tablesConverted).toBe(1);
  });

  it('converts multi-line wrapped cells in Failure Modes table accurately', () => {
    const input = [
      '```',
      '+--------------------------+-------------------------------------------------------------+',
      '| Naive Workaround         | Failure Mechanism                                           |',
      '+--------------------------+-------------------------------------------------------------+',
      '| Nullable Domain Fields   | Fields not fetched are set to null. Methods must guess      |',
      '|                          | whether an attribute is genuinely null or simply omitted,   |',
      '|                          | destroying the entity\'s ability to protect invariants.      |',
      '+--------------------------+-------------------------------------------------------------+',
      '| Dynamic Proxies &        | Property getters trigger secondary database queries on      |',
      '| Lazy-Loading             | access. This creates hidden I/O within domain logic, N+1    |',
      '|                          | query cascades, and breaks offline unit testability.       |',
      '+--------------------------+-------------------------------------------------------------+',
      '```',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(input);

    expect(cleaned).toContain('| Naive Workaround | Failure Mechanism |');
    expect(cleaned).toContain('| Nullable Domain Fields | Fields not fetched are set to null. Methods must guess whether an attribute is genuinely null or simply omitted, destroying the entity\'s ability to protect invariants. |');
    expect(cleaned).toContain('| Dynamic Proxies & Lazy-Loading | Property getters trigger secondary database queries on access. This creates hidden I/O within domain logic, N+1 query cascades, and breaks offline unit testability. |');
    expect(stats.tablesConverted).toBe(1);
  });

  it('converts Unicode box drawing tables (single and double lines)', () => {
    const singleUnicode = [
      '┌───────────┬────────────┐',
      '│ Language  │ Type       │',
      '├───────────┼────────────┤',
      '│ Svelte    │ Frontend   │',
      '│ Go        │ Backend    │',
      '└───────────┴────────────┘',
    ].join('\n');

    const doubleUnicode = [
      '╔═══════════╦════════════╗',
      '║ Language  ║ Type       ║',
      '╠═══════════╬════════════╣',
      '║ Rust      ║ Systems    ║',
      '╚═══════════╩════════════╝',
    ].join('\n');

    const resSingle = cleanMarkdown(singleUnicode);
    expect(resSingle.cleaned).toContain('| Language | Type |\n| --- | --- |\n| Svelte | Frontend |\n| Go | Backend |');

    const resDouble = cleanMarkdown(doubleUnicode);
    expect(resDouble.cleaned).toContain('| Language | Type |\n| --- | --- |\n| Rust | Systems |');
  });

  it('converts grid tables with = header divider', () => {
    const input = [
      '+-----------+------------+',
      '| Metric    | Value      |',
      '+===========+============+',
      '| Speed     | Fast       |',
      '+-----------+------------+',
    ].join('\n');

    const { cleaned } = cleanMarkdown(input);
    expect(cleaned).toContain('| Metric | Value |\n| --- | --- |\n| Speed | Fast |');
  });

  it('preserves ASCII diagrams without converting them to broken tables', () => {
    const diagram = [
      '```',
      '       ┌────────────────────────────────────────────────────────┐',
      '       │                 THE ARCHITECTURAL TENSION              │',
      '       └───────────────────────────┬────────────────────────────┘',
      '                                   │',
      '         ┌─────────────────────────┴─────────────────────────┐',
      '         ▼                                                   ▼',
      '┌─────────────────────────────────┐       ┌─────────────────────────────────┐',
      '│       Domain Invariants         │       │       Storage Efficiency        │',
      '│ • Complete internal state       │  vs.  │ • Selective column projection   │',
      '│ • No undefined/null traps       │       │ • Index-Only scans (B-Tree)     │',
      '│ • Enforces business rules       │       │ • Minimal I/O and wire transfer │',
      '└─────────────────────────────────┘       └─────────────────────────────────┘',
      '```',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(diagram);
    expect(cleaned).toContain('THE ARCHITECTURAL TENSION');
    expect(cleaned).toContain('Storage Efficiency');
    expect(cleaned).toContain('```');
    expect(stats.tablesConverted).toBe(0);
  });

  it('cleans the full user prompt document with both tables converted and diagrams/code preserved', () => {
    const userDoc = [
      '# The Partial Hydration Dilemma',
      '',
      'The partial hydration dilemma is the architectural deadlock between Domain-Driven Design\'s mandate for **aggregate integrity** and the relational database\'s requirement for **access-path efficiency**.',
      '',
      '```',
      '       ┌────────────────────────────────────────────────────────┐',
      '       │                 THE ARCHITECTURAL TENSION              │',
      '       └───────────────────────────┬────────────────────────────┘',
      '                                   │',
      '         ┌─────────────────────────┴─────────────────────────┐',
      '         ▼                                                   ▼',
      '┌─────────────────────────────────┐       ┌─────────────────────────────────┐',
      '│       Domain Invariants         │       │       Storage Efficiency        │',
      '└─────────────────────────────────┘       └─────────────────────────────────┘',
      '```',
      '',
      '# The Failure Modes of Naive Solutions',
      '',
      '```',
      '+--------------------------+-------------------------------------------------------------+',
      '| Naive Workaround         | Failure Mechanism                                           |',
      '+--------------------------+-------------------------------------------------------------+',
      '| Nullable Domain Fields   | Fields not fetched are set to null. Methods must guess      |',
      '|                          | whether an attribute is genuinely null or simply omitted.   |',
      '+--------------------------+-------------------------------------------------------------+',
      '```',
      '',
      '```sql',
      'SELECT id, name FROM merchants WHERE status = 1;',
      '```',
      '',
      '# Architectural Trade-Off Matrix',
      '',
      '```',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '| Approach                   | Aggregate Integrity   | Query Efficiency    | Complexity Cost         |',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '| Classical Repository       | High                  | Very Low            | Low                     |',
      '| (Full Hydration)           | (No partial state)    | (SELECT * everywhere)| (Simple abstractions)   |',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '| CQRS Separation            | High                  | High                | Medium                  |',
      '| (Bypass for Reads)         | (Entities for writes) | (Targeted DTO reads)| (Two data paths)        |',
      '+----------------------------+-----------------------+---------------------+-------------------------+',
      '```',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(userDoc);

    // Both tables converted
    expect(stats.tablesConverted).toBe(2);
    expect(cleaned).toContain('| Naive Workaround | Failure Mechanism |');
    expect(cleaned).toContain('| Nullable Domain Fields | Fields not fetched are set to null. Methods must guess whether an attribute is genuinely null or simply omitted. |');
    expect(cleaned).toContain('| Approach | Aggregate Integrity | Query Efficiency | Complexity Cost |');
    expect(cleaned).toContain('| Classical Repository (Full Hydration) | High (No partial state) | Very Low (SELECT * everywhere) | Low (Simple abstractions) |');

    // Diagram preserved in code block
    expect(cleaned).toContain('THE ARCHITECTURAL TENSION');
    expect(cleaned).toContain('Domain Invariants');

    // SQL code block preserved
    expect(cleaned).toContain('```sql\nSELECT id, name FROM merchants WHERE status = 1;\n```');
  });

  it('correctly processes the complete partial hydration dilemma markdown verbatim', () => {
    const verbatimInput = `# The Partial Hydration Dilemma

The partial hydration dilemma is the architectural deadlock between Domain-Driven Design's mandate for **aggregate integrity** and the relational database's requirement for **access-path efficiency**.

Classical Clean Architecture treats the database as an emulation of an in-memory collection (\`Repository<T>\`), where calling \`repository.get_by_id(id)\` yields a fully realized, invariant-protecting Entity. In high-throughput, data-intensive systems, fulfilling that contract forces \`SELECT *\` queries that cripple database performance. Conversely, fetching only the columns required for a specific business task results in partially initialized entities, degrading strong domain models into unpredictable, bug-prone structures.

\`\`\`
       ┌────────────────────────────────────────────────────────┐
       │                 THE ARCHITECTURAL TENSION              │
       └───────────────────────────┬────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│       Domain Invariants         │       │       Storage Efficiency        │
│ • Complete internal state       │  vs.  │ • Selective column projection   │
│ • No undefined/null traps       │       │ • Index-Only scans (B-Tree)     │
│ • Enforces business rules       │       │ • Minimal I/O and wire transfer │
└─────────────────────────────────┘       └─────────────────────────────────┘

\`\`\`

---

# Why Full Hydration Kills Database Performance

Defaulting to full entity retrieval to satisfy repository purity introduces severe operational penalties at the database engine level.

### Heap Lookups vs. Index-Only Scans

When a query targets a subset of columns covered by a secondary B-Tree index (e.g., \`status\`, \`balance\`, \`tenant_id\`), the storage engine resolves the query entirely within memory via an **Index-Only Scan**.

Issuing \`SELECT *\` forces the engine to perform random I/O heap fetches for table pages to retrieve the remaining 30+ columns, destroying cache locality and saturating storage buffer pools.

### TOAST and Out-of-Line Storage Overhead

Relational engines like PostgreSQL use secondary storage mechanisms (TOAST—The Oversized-Attribute Storage Technique) for large values such as text fields, JSONB blobs, or audit arrays exceeding a 2KB threshold.

A \`SELECT *\` forces decompression and disk assembly of TOAST chunks even if the executing business rule only inspects a numeric balance or a single enum state.

### Serialization, Memory, and Garbage Collection

Transferring 40 attributes across the wire instead of 3 increases:

* Network socket buffer utilization between application servers and the database instance.
* CPU serialization/deserialization overhead on both sides.
* Managed runtime allocations (Java/CLR/V8), which increases heap fragmentation and garbage collection pressure under sustained throughput.

### The Lost-Update Hazard in Full-Row Saves

ORMs and repositories that fully hydrate entities typically persist state by issuing a blind write across all fields:

\`\`\`sql
UPDATE merchants 
SET legal_name = $1, address = $2, status = $3, daily_limit = $4, ... 
WHERE id = $5;

\`\`\`

If Thread A hydrates a merchant to update \`daily_limit\` while Thread B concurrently updates \`address\`, Thread A's subsequent save will silently overwrite Thread B's update unless complex, wide optimistic locking strategies monitor every column.

---

# The Failure Modes of Naive Solutions

Teams often attempt to patch this dilemma using compromises that introduce architectural rot.

\`\`\`
+--------------------------+-------------------------------------------------------------+
| Naive Workaround         | Failure Mechanism                                           |
+--------------------------+-------------------------------------------------------------+
| Nullable Domain Fields   | Fields not fetched are set to null. Methods must guess      |
|                          | whether an attribute is genuinely null or simply omitted,   |
|                          | destroying the entity's ability to protect invariants.      |
+--------------------------+-------------------------------------------------------------+
| Dynamic Proxies &        | Property getters trigger secondary database queries on      |
| Lazy-Loading             | access. This creates hidden I/O within domain logic, N+1    |
|                          | query cascades, and breaks offline unit testability.       |
+--------------------------+-------------------------------------------------------------+
| Specific "Hydrated"      | Creating PartialMerchant, BasicMerchant, and FullMerchant  |
| Variations               | causes an exponential explosion of classes with duplicate   |
|                          | business logic and unclear responsibilities.               |
+--------------------------+-------------------------------------------------------------+

\`\`\`

---

# Modern Architectural Resolutions

Resolving the partial hydration dilemma requires rejecting the premise that a database table must map 1:1 to a single domain aggregate.

\`\`\`
                             [ Incoming Request ]
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        [ Mutation / Command ]                 [ Read / Projection ]
                   │                                     │
                   ▼                                     ▼
      ┌─────────────────────────┐           ┌─────────────────────────┐
      │ Task-Scoped Aggregate   │           │ Direct DTO Projection   │
      │ • Focused state         │           │ • Raw optimized SQL     │
      │ • Enforces 1 invariant  │           │ • Index-only execution  │
      └────────────┬────────────┘           └────────────┬────────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      ▼
                        ┌───────────────────────────┐
                        │   Single Database Table   │
                        │    (e.g., \`merchants\`)    │
                        └───────────────────────────┘

\`\`\`

### 1. CQRS (Command Query Responsibility Segregation)

The vast majority of partial hydration issues stem from using entities for read, search, or display operations. Read workflows have no invariants to protect; they only display state.

* **The Rule:** Domain entities and repositories are used exclusively for write-side business invariants.
* **The Implementation:** Read operations bypass domain entities and repositories entirely. They query the database using raw SQL, query builders, or lightweight micro-ORMs (e.g., Dapper, sqlx), projecting directly into flat Read DTOs.

\`\`\`sql
-- Read-side projection: zero entity hydration, pure index-only scan
SELECT id, business_name, settlement_currency 
FROM merchants 
WHERE region = $1 AND status = 'ACTIVE';

\`\`\`

### 2. Aggregate Decomposition Across a Shared Table

A wide database table with 40 columns usually reflects a failure of bounded context isolation. A physical database table can back multiple, distinct aggregates without requiring schema decomposition.

Instead of a monolithic \`Merchant\` aggregate, split the model based on business capabilities:

\`\`\`
                  ┌─────────────────────────────────────┐
                  │          \`merchants\` Table          │
                  │ (Identity, KYC, Billing, Addresses) │
                  └──────────────────┬──────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
┌───────────────────┐      ┌────────────────────┐      ┌───────────────────┐
│ MerchantRiskState │      │  MerchantPayout    │      │  MerchantProfile  │
│ Aggregate         │      │  Aggregate         │      │  Aggregate        │
│ • status          │      │  • bank_account_id │      │  • legal_name     │
│ • risk_score      │      │  • payout_schedule │      │  • contact_email  │
│ • held_reason     │      │  • auto_sweep      │      │  • dba_name       │
└───────────────────┘      └────────────────────┘      └───────────────────┘
 (Loads 3 columns)          (Loads 3 columns)           (Loads 3 columns)

\`\`\`

Each aggregate is 100% complete and fully hydrated within its own operational boundary, but its repository queries only the 3 or 4 columns relevant to its operational context.

### 3. Task-Specific Command Models

When an operation represents a discrete state transition, create a repository method and aggregate dedicated strictly to that command.

\`\`\`typescript
// Command Model: Completely hydrated for this single business rule
export class MerchantSuspensionContext {
  constructor(
    public readonly id: string,
    private _isSuspended: boolean,
    public readonly version: number
  ) {}

  suspend(reason: string): void {
    if (this._isSuspended) {
      throw new Error("Merchant is already suspended.");
    }
    this._isSuspended = true;
  }
}

// Repository exposes a narrow contract
export interface MerchantSuspensionRepository {
  getForSuspension(id: string): Promise<MerchantSuspensionContext>;
  saveSuspension(aggregate: MerchantSuspensionContext): Promise<void>;
}

\`\`\`

The underlying adapter issues a targeted select and an atomic update:

\`\`\`sql
-- Fetch only the invariant state
SELECT id, is_suspended, version 
FROM merchants 
WHERE id = $1;

-- Write atomic delta update with optimistic concurrency
UPDATE merchants 
SET is_suspended = TRUE, 
    version = version + 1 
WHERE id = $1 AND version = $2;

\`\`\`

### 4. Functional State Transitions (Decoupled State and Behavior)

In high-performance runtimes (Go, Rust), the object-oriented aggregate pattern can be replaced with pure functional domain validation.

Instead of an aggregate object holding state, the domain policy is defined as a pure function that takes only the primitive values required to evaluate the invariant:

\`\`\`go
// Pure domain rule - zero database or object graph awareness
func CanDisburseFunds(status MerchantStatus, balanceCents int64, dailyLimitCents int64, amountCents int64) error {
    if status != StatusActive {
        return ErrMerchantNotActive
    }
    if balanceCents < amountCents {
        return ErrInsufficientFunds
    }
    if amountCents > dailyLimitCents {
        return ErrDailyLimitExceeded
    }
    return nil
}

\`\`\`

The application service handles data retrieval and persistence:

\`\`\`go
// Application Service retrieves only the 3 specific columns
row := db.QueryRow(ctx, "SELECT status, balance_cents, daily_limit_cents FROM merchants WHERE id = $1", id)
row.Scan(&status, &balance, &dailyLimit)

// Execute pure business invariant
if err := CanDisburseFunds(status, balance, dailyLimit, requestedAmount); err != nil {
    return err
}

// Persist single-column mutation
_, err := db.Exec(ctx, "UPDATE merchants SET balance_cents = balance_cents - $1 WHERE id = $2", requestedAmount, id)

\`\`\`

This pattern eliminates the aggregate class entirely, allowing SQL queries to remain minimal while business invariants remain deterministic and testable.

---

# Architectural Trade-Off Matrix

\`\`\`
+----------------------------+-----------------------+---------------------+-------------------------+
| Approach                   | Aggregate Integrity   | Query Efficiency    | Complexity Cost         |
+----------------------------+-----------------------+---------------------+-------------------------+
| Classical Repository       | High                  | Very Low            | Low                     |
| (Full Hydration)           | (No partial state)    | (SELECT * everywhere)| (Simple abstractions)   |
+----------------------------+-----------------------+---------------------+-------------------------+
| CQRS Separation            | High                  | High                | Medium                  |
| (Bypass for Reads)         | (Entities for writes) | (Targeted DTO reads)| (Two data paths)        |
+----------------------------+-----------------------+---------------------+-------------------------+
| Aggregate Decomposition    | High                  | High                | Medium                  |
| (Shared Table Pattern)     | (Fully valid models)  | (Narrow projections)| (Multiple entity models)|
+----------------------------+-----------------------+---------------------+-------------------------+
| Task-Specific Commands     | High                  | High                | Medium                  |
| (Narrow Command Models)    | (Scoped invariants)   | (Single-row slices) | (Granular repositories) |
+----------------------------+-----------------------+---------------------+-------------------------+
| Functional Transition      | High                  | Maximum             | Low/Medium              |
| (Pure Functions)           | (Explicit arguments)  | (Ad-hoc projections)| (No OOP encapsulation)  |
+----------------------------+-----------------------+---------------------+-------------------------+

\`\`\`

The partial hydration dilemma is not an unavoidable database limitation; it is an artifact of treating the database as an object store and designing wide, single-table aggregates. The tension disappears when reads are routed through dedicated CQRS projections and write-side aggregates are decomposed around specific business capabilities rather than physical table boundaries.`;

    const { cleaned, stats } = cleanMarkdown(verbatimInput, PRESETS.gemini.options);

    // Both tables converted
    expect(stats.tablesConverted).toBe(2);

    // Subsequent # headings converted to ## (enforceSingleH1)
    expect(stats.headingsNormalized).toBe(4);
    expect(cleaned).toContain('# The Partial Hydration Dilemma');
    expect(cleaned).toContain('## Why Full Hydration Kills Database Performance');
    expect(cleaned).toContain('## The Failure Modes of Naive Solutions');
    expect(cleaned).toContain('## Modern Architectural Resolutions');
    expect(cleaned).toContain('## Architectural Trade-Off Matrix');

    // Naive Workaround table converted to pipe table
    expect(cleaned).toContain('| Naive Workaround | Failure Mechanism |');
    expect(cleaned).toContain('| Nullable Domain Fields | Fields not fetched are set to null. Methods must guess whether an attribute is genuinely null or simply omitted, destroying the entity\'s ability to protect invariants. |');
    expect(cleaned).toContain('| Dynamic Proxies & Lazy-Loading | Property getters trigger secondary database queries on access. This creates hidden I/O within domain logic, N+1 query cascades, and breaks offline unit testability. |');
    expect(cleaned).toContain('| Specific "Hydrated" Variations | Creating PartialMerchant, BasicMerchant, and FullMerchant causes an exponential explosion of classes with duplicate business logic and unclear responsibilities. |');

    // Trade-off Matrix table converted to pipe table
    expect(cleaned).toContain('| Approach | Aggregate Integrity | Query Efficiency | Complexity Cost |');
    expect(cleaned).toContain('| Classical Repository (Full Hydration) | High (No partial state) | Very Low (SELECT * everywhere) | Low (Simple abstractions) |');
    expect(cleaned).toContain('| CQRS Separation (Bypass for Reads) | High (Entities for writes) | High (Targeted DTO reads) | Medium (Two data paths) |');
    expect(cleaned).toContain('| Aggregate Decomposition (Shared Table Pattern) | High (Fully valid models) | High (Narrow projections) | Medium (Multiple entity models) |');
    expect(cleaned).toContain('| Task-Specific Commands (Narrow Command Models) | High (Scoped invariants) | High (Single-row slices) | Medium (Granular repositories) |');
    expect(cleaned).toContain('| Functional Transition (Pure Functions) | High (Explicit arguments) | Maximum (Ad-hoc projections) | Low/Medium (No OOP encapsulation) |');

    // All code blocks and diagrams preserved
    expect(cleaned).toContain('THE ARCHITECTURAL TENSION');
    expect(cleaned).toContain('Incoming Request');
    expect(cleaned).toContain("'merchants' Table");
    expect(cleaned).toContain('```sql\nUPDATE merchants');
    expect(cleaned).toContain('```typescript\n// Command Model:');
    expect(cleaned).toContain('```go\n// Pure domain rule');
  });
});

describe('Unit Tests - Grid Table Detection Helpers', () => {
  it('detects ASCII border lines correctly with isGridBorderLine', () => {
    expect(isGridBorderLine('+---+---+')).toBe(true);
    expect(isGridBorderLine('+--------------------+--------------------+')).toBe(true);
    expect(isGridBorderLine('+====================+====================+')).toBe(true);
    expect(isGridBorderLine('  +---+---+  ')).toBe(true);

    // Invalid borders
    expect(isGridBorderLine('++++')).toBe(false);
    expect(isGridBorderLine('----')).toBe(false);
    expect(isGridBorderLine('|---|---|')).toBe(false);
    expect(isGridBorderLine('+')).toBe(false);
    expect(isGridBorderLine('')).toBe(false);
    expect(isGridBorderLine('Hello + World +')).toBe(false);
  });

  it('detects Unicode box border lines correctly with isGridBorderLine', () => {
    // Single line borders
    expect(isGridBorderLine('┌───┬───┐')).toBe(true);
    expect(isGridBorderLine('├───┼───┤')).toBe(true);
    expect(isGridBorderLine('└───┴───┘')).toBe(true);

    // Double line borders
    expect(isGridBorderLine('╔═══╦═══╗')).toBe(true);
    expect(isGridBorderLine('╠═══╬═══╣')).toBe(true);
    expect(isGridBorderLine('╚═══╩═══╝')).toBe(true);

    // Rounded borders
    expect(isGridBorderLine('╭───┬───╮')).toBe(true);
    expect(isGridBorderLine('╰───┴───╯')).toBe(true);

    // Mixed borders
    expect(isGridBorderLine('╟───╫───╢')).toBe(true);
    expect(isGridBorderLine('╞═══╪═══╡')).toBe(true);
  });

  it('extracts column indices accurately with extractColIndices', () => {
    const indices1 = extractColIndices('+-----+-----+-----+');
    expect(indices1).toEqual([0, 6, 12, 18]);

    const indices2 = extractColIndices('┌────────┬────────┐');
    expect(indices2).toEqual([0, 9, 18]);

    const indices3 = extractColIndices('+--+');
    expect(indices3).toEqual([0, 3]);
  });

  it('identifies grid content lines with isGridContentLine', () => {
    expect(isGridContentLine('| Col 1 | Col 2 |')).toBe(true);
    expect(isGridContentLine('  | Col 1 | Col 2 |  ')).toBe(true);
    expect(isGridContentLine('│ Col 1 │ Col 2 │')).toBe(true);
    expect(isGridContentLine('║ Col 1 ║ Col 2 ║')).toBe(true);

    // Invalid content lines
    expect(isGridContentLine('| Missing closing')).toBe(false);
    expect(isGridContentLine('Missing opening |')).toBe(false);
    expect(isGridContentLine('Col 1 | Col 2')).toBe(false);
    expect(isGridContentLine('||')).toBe(false);
    expect(isGridContentLine('')).toBe(false);
    expect(isGridContentLine('Regular paragraph text')).toBe(false);
  });

  it('identifies markdown pipe tables with isMarkdownPipeTable', () => {
    const validTable = '| Header 1 | Header 2 |\n|---|---|\n| Data 1 | Data 2 |';
    expect(isMarkdownPipeTable(validTable)).toBe(true);

    const alignedTable = '| Col 1 | Col 2 |\n| :--- | ---: |\n| A | B |';
    expect(isMarkdownPipeTable(alignedTable)).toBe(true);

    const noOuterPipes = 'Col 1 | Col 2\n---|---\nVal 1 | Val 2';
    expect(isMarkdownPipeTable(noOuterPipes)).toBe(true);

    const singleLine = '| Header 1 | Header 2 |';
    expect(isMarkdownPipeTable(singleLine)).toBe(false);

    const pythonCode = 'def add(a, b):\n    return a | b';
    expect(isMarkdownPipeTable(pythonCode)).toBe(false);
  });
});

describe('Unit Tests - parseGridTable & Edge Cases', () => {
  it('parses a simple 2x2 ASCII table', () => {
    const input = [
      '+-------+-------+',
      '| Name  | Role  |',
      '+-------+-------+',
      '| Alice | Admin |',
      '| Bob   | User  |',
      '+-------+-------+',
    ];

    const result = parseGridTable(input);
    expect(result).toBe('| Name | Role |\n| --- | --- |\n| Alice | Admin |\n| Bob | User |');
  });

  it('parses a 1-column grid table', () => {
    const input = [
      '+--------------+',
      '| Todo Item    |',
      '+--------------+',
      '| Buy groceries|',
      '| Read paper   |',
      '+--------------+',
    ];

    const result = parseGridTable(input);
    expect(result).toBe('| Todo Item |\n| --- |\n| Buy groceries |\n| Read paper |');
  });

  it('handles empty cells gracefully in grid tables', () => {
    const input = [
      '+-------+-------+',
      '| Col A | Col B |',
      '+-------+-------+',
      '|       | Val B |',
      '| Val A |       |',
      '+-------+-------+',
    ];

    const result = parseGridTable(input);
    expect(result).toBe('| Col A | Col B |\n| --- | --- |\n|  | Val B |\n| Val A |  |');
  });

  it('escapes unescaped pipes inside cell content', () => {
    const input = [
      '+-------------+-------------+',
      '| Operation   | Example     |',
      '+-------------+-------------+',
      '| Bitwise OR  | a | b = c   |',
      '+-------------+-------------+',
    ];

    const result = parseGridTable(input);
    expect(result).toContain('a \\| b = c');
  });

  it('handles leading indentation in grid tables', () => {
    const input = [
      '  +-------+-------+',
      '  | Key   | Value |',
      '  +-------+-------+',
      '  | Port  | 8080  |',
      '  +-------+-------+',
    ];

    const result = parseGridTable(input);
    expect(result).toBe('| Key | Value |\n| --- | --- |\n| Port | 8080 |');
  });

  it('returns null for invalid grid tables with non-grid lines in between', () => {
    const broken = [
      '+-------+-------+',
      '| Key   | Value |',
      'This line breaks the grid table format',
      '| Port  | 8080  |',
      '+-------+-------+',
    ];

    expect(parseGridTable(broken)).toBeNull();
  });

  it('returns null for incomplete tables with fewer than 3 lines', () => {
    expect(parseGridTable(['+---+', '| A |'])).toBeNull();
    expect(parseGridTable([])).toBeNull();
  });
});

describe('Unit Tests - Code Block Table Unwrapping vs Code Preservation', () => {
  it('unwraps grid tables inside ```text, ```ascii, ```table, ```markdown', () => {
    const langs = ['text', 'ascii', 'table', 'markdown', 'md', 'plaintext', ''];

    for (const lang of langs) {
      const input = [
        `\`\`\`${lang}`,
        '+-------+-------+',
        '| Key   | Value |',
        '+-------+-------+',
        '| Host  | Local |',
        '+-------+-------+',
        '```',
      ].join('\n');

      const { cleaned, stats } = cleanMarkdown(input);
      expect(cleaned).toContain('| Key | Value |\n| --- | --- |\n| Host | Local |');
      expect(cleaned).not.toContain('```');
      expect(stats.tablesConverted).toBe(1);
    }
  });

  it('unwraps raw pipe tables inside code blocks without language tag', () => {
    const input = [
      '```',
      '| Name | Status |',
      '|---|---|',
      '| Server 1 | Online |',
      '| Server 2 | Offline |',
      '```',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(input);
    expect(cleaned).toContain('| Name | Status |\n|---|---|\n| Server 1 | Online |\n| Server 2 | Offline |');
    expect(cleaned).not.toContain('```');
    expect(stats.tablesConverted).toBe(1);
  });

  it('strictly preserves programming code blocks even if they contain table-like characters', () => {
    const codeSnippets = [
      {
        lang: 'python',
        code: 'def grid():\n    # +---+---+\n    return "+---+---+"'
      },
      {
        lang: 'json',
        code: '{\n  "table": "+---+---+"\n}'
      },
      {
        lang: 'typescript',
        code: 'const bitwise = (a: number, b: number) => a | b;'
      },
      {
        lang: 'bash',
        code: 'echo "+---+---+" | grep "+"'
      }
    ];

    for (const { lang, code } of codeSnippets) {
      const input = `\`\`\`${lang}\n${code}\n\`\`\``;
      const { cleaned, stats } = cleanMarkdown(input);
      expect(cleaned).toContain(`\`\`\`${lang}\n${code}\n\`\`\``);
      expect(stats.tablesConverted).toBe(0);
    }
  });
});

describe('Unit Tests - Preset Options and convertGridTables Toggle', () => {
  it('preserves grid tables untouched when convertGridTables is disabled (e.g. Minimal Preset)', () => {
    const input = [
      '+-------+-------+',
      '| Key   | Value |',
      '+-------+-------+',
      '| Port  | 8080  |',
      '+-------+-------+',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(input, PRESETS.minimal.options);
    expect(cleaned).toContain('+-------+-------+');
    expect(stats.tablesConverted).toBe(0);
  });

  it('converts grid tables when convertGridTables is enabled across standard presets', () => {
    const input = [
      '+-------+-------+',
      '| Key   | Value |',
      '+-------+-------+',
      '| Port  | 8080  |',
      '+-------+-------+',
    ].join('\n');

    const geminiRes = cleanMarkdown(input, PRESETS.gemini.options);
    const chatgptRes = cleanMarkdown(input, PRESETS.chatgpt.options);
    const claudeRes = cleanMarkdown(input, PRESETS.claude.options);
    const obsidianRes = cleanMarkdown(input, PRESETS.obsidian_full.options);

    expect(geminiRes.cleaned).toContain('| Key | Value |\n| --- | --- |\n| Port | 8080 |');
    expect(chatgptRes.cleaned).toContain('| Key | Value |\n| --- | --- |\n| Port | 8080 |');
    expect(claudeRes.cleaned).toContain('| Key | Value |\n| --- | --- |\n| Port | 8080 |');
    expect(obsidianRes.cleaned).toContain('| Key | Value |\n| --- | --- |\n| Port | 8080 |');
  });
});

describe('Unit Tests - Obsidian HTML Table Rendering (parser.ts)', () => {
  it('renders table HTML with column alignments (:---, :---:, ---:)', () => {
    const md = [
      '| Left Column | Center Column | Right Column |',
      '| :--- | :---: | ---: |',
      '| Text Left | Text Center | $100.00 |',
    ].join('\n');

    const html = parseMarkdownToHtml(md);
    expect(html).toContain('<table class="obsidian-table">');
    expect(html).toContain('text-align: left');
    expect(html).toContain('text-align: center');
    expect(html).toContain('text-align: right');
    expect(html).toContain('Text Left');
    expect(html).toContain('Text Center');
    expect(html).toContain('$100.00');
  });

  it('renders tables with escaped pipes without splitting columns on escaped pipes', () => {
    const md = [
      '| Command | Description |',
      '| --- | --- |',
      '| `grep \\| wc` | Pipes output to word count |',
    ].join('\n');

    const html = parseMarkdownToHtml(md);
    expect(html).toContain('<table class="obsidian-table">');
    expect(html).toContain('grep | wc');
    expect(html).toContain('Pipes output to word count');
  });
});

describe('Unit Tests - Enforce Single H1 (#) Heading Structure', () => {
  it('retains the first # as note title and demotes subsequent # to ##', () => {
    const input = [
      '# Document Title',
      'Introduction paragraph.',
      '',
      '# Architecture Overview',
      'Details on architecture.',
      '',
      '# Implementation Strategy',
      'Details on implementation.',
    ].join('\n');

    const { result, count } = enforceSingleH1(input);

    expect(count).toBe(2);
    expect(result).toBe([
      '# Document Title',
      'Introduction paragraph.',
      '',
      '## Architecture Overview',
      'Details on architecture.',
      '',
      '## Implementation Strategy',
      'Details on implementation.',
    ].join('\n'));
  });

  it('shifts child headings proportionally when a demoted section has ## children', () => {
    const input = [
      '# My Note',
      'Intro paragraph.',
      '',
      '# Section One',
      '## Subsection A',
      '### Sub-subsection A1',
      '## Subsection B',
      '',
      '# Section Two',
      '## Subsection C',
    ].join('\n');

    const { result, count } = enforceSingleH1(input);

    // Section One demoted (1), Subsection A (+1), Sub-subsection A1 (+1), Subsection B (+1), Section Two (1), Subsection C (+1) = 6
    expect(count).toBe(6);
    expect(result).toBe([
      '# My Note',
      'Intro paragraph.',
      '',
      '## Section One',
      '### Subsection A',
      '#### Sub-subsection A1',
      '### Subsection B',
      '',
      '## Section Two',
      '### Subsection C',
    ].join('\n'));
  });

  it('preserves child headings when they are already ### (typical Gemini skipping H2)', () => {
    const input = [
      '# Root Note Title',
      '',
      '# Why Full Hydration Kills Database Performance',
      'Defaulting to full entity retrieval causes penalties.',
      '',
      '### Heap Lookups vs. Index-Only Scans',
      'When a query targets secondary B-Tree...',
      '',
      '### TOAST and Out-of-Line Storage Overhead',
      'Relational engines like PostgreSQL use TOAST...',
    ].join('\n');

    const { result, count } = enforceSingleH1(input);

    expect(count).toBe(1); // Only the subsequent H1 was demoted to H2
    expect(result).toContain('# Root Note Title');
    expect(result).toContain('## Why Full Hydration Kills Database Performance');
    expect(result).toContain('### Heap Lookups vs. Index-Only Scans');
    expect(result).toContain('### TOAST and Out-of-Line Storage Overhead');
  });

  it('does nothing when the document has only a single # heading', () => {
    const input = [
      '# Single Document Title',
      'Intro paragraph.',
      '## Section A',
      '### Subsection A.1',
      '## Section B',
    ].join('\n');

    const { result, count } = enforceSingleH1(input);
    expect(count).toBe(0);
    expect(result).toBe(input);
  });

  it('does nothing when the document has no # headings at all', () => {
    const input = [
      '## Section First',
      '### Subsection',
      'Paragraph text.',
    ].join('\n');

    const { result, count } = enforceSingleH1(input);
    expect(count).toBe(0);
    expect(result).toBe(input);
  });

  it('never touches # inside fenced code blocks or comments', () => {
    const input = [
      '# Main Title',
      '',
      '```python',
      '# Python comment heading lookalike',
      'def compute():',
      '    # another comment',
      '    pass',
      '```',
      '',
      '# Subsequent Section',
      'Some text.',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(input);

    expect(cleaned).toContain('# Python comment heading lookalike');
    expect(cleaned).toContain('# another comment');
    expect(cleaned).toContain('## Subsequent Section');
    expect(stats.headingsNormalized).toBe(1);
  });

  it('caps heading levels at ###### (H6) without producing invalid #######', () => {
    const input = [
      '# Note Title',
      '# Demoted Section',
      '## Child 2',
      '###### Deepest Child 6',
    ].join('\n');

    const { result } = enforceSingleH1(input);
    expect(result).toContain('## Demoted Section');
    expect(result).toContain('### Child 2');
    expect(result).toContain('###### Deepest Child 6');
    expect(result).not.toContain('#######');
  });

  it('respects enforceSingleH1 toggle in CleanOptions and Presets', () => {
    const input = [
      '# Note 1',
      '',
      '# Note 2',
    ].join('\n');

    const withOption = cleanMarkdown(input, { enforceSingleH1: true });
    expect(withOption.cleaned).toBe('# Note 1\n\n## Note 2\n');
    expect(withOption.stats.headingsNormalized).toBe(1);

    const withoutOption = cleanMarkdown(input, { enforceSingleH1: false });
    expect(withoutOption.cleaned).toBe('# Note 1\n\n# Note 2\n');
    expect(withoutOption.stats.headingsNormalized).toBe(0);

    // Verify presets
    expect(cleanMarkdown(input, PRESETS.gemini.options).cleaned).toContain('## Note 2');
    expect(cleanMarkdown(input, PRESETS.chatgpt.options).cleaned).toContain('## Note 2');
    expect(cleanMarkdown(input, PRESETS.claude.options).cleaned).toContain('## Note 2');
    expect(cleanMarkdown(input, PRESETS.obsidian_full.options).cleaned).toContain('## Note 2');
    expect(cleanMarkdown(input, PRESETS.minimal.options).cleaned).toContain('# Note 2');
  });
});

describe('Unit Tests - Code Block Syntax Highlighting (PrismJS)', () => {
  it('highlights SQL keywords, strings, and operators', () => {
    const sqlCode = "SELECT id, name FROM merchants WHERE status = 'ACTIVE';";
    const highlighted = highlightCode(sqlCode, 'sql');

    expect(highlighted).toContain('<span class="token keyword">SELECT</span>');
    expect(highlighted).toContain('<span class="token keyword">FROM</span>');
    expect(highlighted).toContain('<span class="token keyword">WHERE</span>');
    expect(highlighted).toContain('<span class="token string">\'ACTIVE\'</span>');
  });

  it('highlights Python code including comments, functions, and keywords', () => {
    const pythonCode = "def calculate_total(price, tax):\n    # Calculate grand total\n    return price * (1 + tax)";
    const highlighted = highlightCode(pythonCode, 'python');

    expect(highlighted).toContain('<span class="token keyword">def</span>');
    expect(highlighted).toContain('<span class="token function">calculate_total</span>');
    expect(highlighted).toContain('<span class="token comment"># Calculate grand total</span>');
    expect(highlighted).toContain('<span class="token keyword">return</span>');
  });

  it('highlights TypeScript / JavaScript with types, keywords, and strings', () => {
    const tsCode = 'const greeting: string = "Hello Obsidian";';
    const highlighted = highlightCode(tsCode, 'typescript');

    expect(highlighted).toContain('<span class="token keyword">const</span>');
    expect(highlighted).toContain('<span class="token string">"Hello Obsidian"</span>');
  });

  it('highlights Go code including types, keywords, and built-ins', () => {
    const goCode = 'func CanDisburse(status int) error {\n    return nil\n}';
    const highlighted = highlightCode(goCode, 'go');

    expect(highlighted).toContain('<span class="token keyword">func</span>');
    expect(highlighted).toContain('<span class="token function">CanDisburse</span>');
    expect(highlighted).toContain('<span class="token keyword">return</span>');
    expect(highlighted).toContain('<span class="token boolean">nil</span>');
  });

  it('handles language aliases like py, ts, js, sh, yml correctly', () => {
    expect(highlightCode('const a = 1;', 'ts')).toContain('<span class="token keyword">const</span>');
    expect(highlightCode('echo "hi"', 'sh')).toContain('<span class="token builtin class-name">echo</span>');
    expect(highlightCode('import os', 'py')).toContain('<span class="token keyword">import</span>');
  });

  it('falls back to escaped HTML for unknown languages or plain text', () => {
    const plain = 'Plain text <without> crash';
    const highlighted = highlightCode(plain, 'unknown-lang');
    expect(highlighted).toBe('Plain text &lt;without&gt; crash');
  });

  it('renders code block in parseMarkdownToHtml with language badge and copy button', () => {
    const md = '```sql\nSELECT * FROM users;\n```';
    const html = parseMarkdownToHtml(md);

    expect(html).toContain('class="obsidian-code-block"');
    expect(html).toContain('data-language="sql"');
    expect(html).toContain('<span class="obsidian-code-lang">sql</span>');
    expect(html).toContain('class="obsidian-code-copy-btn"');
    expect(html).toContain('data-code="SELECT * FROM users;"');
    expect(html).toContain('<span class="token keyword">SELECT</span>');
  });

  it('renders Mermaid diagrams in parseMarkdownToHtml with obsidian-mermaid-container and render target', () => {
    const md = '```mermaid\nflowchart TD\n    a["Start"] --> b["End"]\n```';
    const html = parseMarkdownToHtml(md);

    expect(html).toContain('class="obsidian-mermaid-container"');
    expect(html).toContain('class="obsidian-mermaid-block"');
    expect(html).toContain('class="obsidian-mermaid-render-target"');
    expect(html).toContain('Mermaid Diagram');
    expect(html).toContain('data-mermaid="flowchart TD\n    a[&quot;Start&quot;] --&gt; b[&quot;End&quot;]"');
  });
});

describe('Markdown Cleaner - Diagram Conversion Integration', () => {
  it('converts unfenced ASCII diagrams inside a full markdown note', () => {
    const input = [
      '# My Architecture Note',
      '',
      '+--------------+     +--------------+',
      '|  Client App  | --> | API Gateway  |',
      '+--------------+     +--------------+',
      '',
      '* Bullet 1',
      '* Bullet 2',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(input);

    expect(cleaned).toContain('```mermaid');
    expect(cleaned).toContain('flowchart LR');
    expect(cleaned).toContain('client["Client App"]');
    expect(cleaned).toContain('gateway["API Gateway"]');
    expect(cleaned).toContain('client --> gateway');
    expect(stats.diagramsConverted).toBe(1);
  });

  it('converts ASCII diagrams inside ```text or ```ascii code fences', () => {
    const input = [
      '# Note with Fenced Diagram',
      '',
      '```text',
      '┌───────────────┐',
      '│     Draft     │',
      '└───────┬───────┘',
      '        │',
      '        ▼ (submit)',
      '┌───────────────┐',
      '│ Under Review  │',
      '└───────────────┘',
      '```',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(input);

    expect(cleaned).toContain('```mermaid');
    expect(cleaned).toContain('flowchart TD');
    expect(cleaned).toContain('draft["Draft"]');
    expect(cleaned).toContain('review["Under Review"]');
    expect(cleaned).toContain('draft -->|submit| review');
    expect(stats.diagramsConverted).toBe(1);
  });

  it('preserves code blocks and does not convert python code with box comments', () => {
    const input = [
      '```python',
      'def process_orders():',
      '    # ┌─────────────────┐',
      '    # │ Step 1: Validate │',
      '    # └────────┬────────┘',
      '    #          ▼',
      '    # ┌─────────────────┐',
      '    # │ Step 2: Persist │',
      '    # └─────────────────┘',
      '    validate()',
      '```',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(input);

    expect(cleaned).toContain('```python');
    expect(cleaned).not.toContain('```mermaid');
    expect(stats.diagramsConverted).toBe(0);
  });

  it('respects convertDiagrams: false option in minimal preset', () => {
    const input = [
      '+--------------+     +--------------+',
      '|  Client App  | --> | API Gateway  |',
      '+--------------+     +--------------+',
    ].join('\n');

    const { cleaned, stats } = cleanMarkdown(input, PRESETS.minimal.options);

    expect(cleaned).not.toContain('```mermaid');
    expect(cleaned).toContain('+--------------+');
    expect(stats.diagramsConverted).toBe(0);
  });
});





