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

  it('renders italics nested within bold text properly', () => {
    const md1 = '**1. Continuous Optimization: Boyd & Vandenberghe, *Convex Optimization***';
    expect(renderInline(md1)).toBe('<strong>1. Continuous Optimization: Boyd &amp; Vandenberghe, <em>Convex Optimization</em></strong>');

    const md2 = '**2. High-Dimensional Geometry & Streaming: Blum, Hopcroft, & Kannan, *Foundations of Data Science***';
    expect(renderInline(md2)).toBe('<strong>2. High-Dimensional Geometry &amp; Streaming: Blum, Hopcroft, &amp; Kannan, <em>Foundations of Data Science</em></strong>');

    const md3 = '**3. Probabilistic & Randomized Methods: Mitzenmacher & Upfal, *Probability and Computing* (2nd Edition)**';
    expect(renderInline(md3)).toBe('<strong>3. Probabilistic &amp; Randomized Methods: Mitzenmacher &amp; Upfal, <em>Probability and Computing</em> (2nd Edition)</strong>');

    const md4 = '* **Continuous Optimization: *Convex Optimization* (Boyd & Vandenberghe)**';
    expect(renderInline(md4)).toBe('* <strong>Continuous Optimization: <em>Convex Optimization</em> (Boyd &amp; Vandenberghe)</strong>');
  });

  it('renders all nested emphasis edge cases correctly', () => {
    expect(renderInline('***Bold italic* at start of bold**')).toBe('<strong><em>Bold italic</em> at start of bold</strong>');
    expect(renderInline('***Bold and italic entirely***')).toBe('<strong><em>Bold and italic entirely</em></strong>');
    expect(renderInline('*Italic with **nested bold** inside*')).toBe('<em>Italic with <strong>nested bold</strong> inside</em>');
    expect(renderInline('__Bold with _nested italic_ in underscores__')).toBe('<strong>Bold with <em>nested italic</em> in underscores</strong>');
    expect(renderInline('_Italic with __nested bold__ in underscores_')).toBe('<em>Italic with <strong>nested bold</strong> in underscores</em>');
    expect(renderInline('* *Sequence Flows* model strictly *within* a pool.')).toBe('* <em>Sequence Flows</em> model strictly <em>within</em> a pool.');
  });
});
