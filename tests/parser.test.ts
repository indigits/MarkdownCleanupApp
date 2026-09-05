// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseMarkdownToHtml, renderInline } from '../src/lib/parser';

describe('Obsidian Previewer Parser & Math Rendering', () => {
  it('correctly renders inline math variables without corrupting them into $1 or $Is', () => {
    const text = 'Glitch-Free Reactive Propagation: Fine-grained reactive graphs track dynamic dependencies at runtime, ensuring that if Signal $A$ updates both Signal $B$ and $C$, and $D$ depends on both, $D$ recalculates exactly once without intermediate stale reads ("glitches").';
    const html = parseMarkdownToHtml(text);

    // Verify it contains KaTeX math rendering for A, B, C, and D
    expect(html).toContain('katex');
    expect(html).toContain('A</annotation>');
    expect(html).toContain('B</annotation>');
    expect(html).toContain('C</annotation>');
    expect(html).toContain('D</annotation>');

    // Must NOT contain corrupted $1 or $Is
    expect(html).not.toContain('$1');
    expect(html).not.toContain('&gt;1&lt;');
    expect(html).not.toContain('>$1<');
  });

  it('renders single character and formula inline math', () => {
    const single = renderInline('Formula $x$ and $y = mx + b$');
    expect(single).toContain('katex');
    expect(single).toContain('x</annotation>');
    expect(single).toContain('y = mx + b</annotation>');
  });

  it('does not confuse currency values with inline math', () => {
    const currency = renderInline('Item costs $100 and shipping is $20 for all users.');
    expect(currency).not.toContain('katex');
    expect(currency).toContain('$100');
    expect(currency).toContain('$20');
  });

  it('renders display math blocks with KaTeX', () => {
    const md = '$$\n\\frac{a}{b} = c\n$$';
    const html = parseMarkdownToHtml(md);
    expect(html).toContain('obsidian-math-block');
    expect(html).toContain('katex-display');
    expect(html).toContain('\\frac{a}{b} = c</annotation>');
  });

  it('renders inline code, bold, and italics cleanly alongside math', () => {
    const md = 'Use `Signal<T>` with invariant $A$ and **bold** *italic* formatting.';
    const html = renderInline(md);
    expect(html).toContain('<code class="obsidian-inline-code">Signal&lt;T&gt;</code>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('A</annotation>');
  });
});
