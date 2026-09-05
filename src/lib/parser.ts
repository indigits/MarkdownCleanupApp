import Prism from 'prismjs';

// Core dependencies and language grammars
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML / XML / SVG
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-regex';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';

/**
 * Pure frontend Obsidian Markdown Parser & HTML Renderer with PrismJS Syntax Highlighting.
 * Emulates Obsidian's Reading View with native support for:
 * - Obsidian Callouts ([!note], [!tip], [!warning], [!important], [!info], [!example], etc.)
 * - Math blocks ($$...$$ and $...$)
 * - Task list checkboxes (- [ ], - [x])
 * - Tight and nested lists
 * - Markdown tables
 * - Code blocks with full syntax highlighting & copy actions
 * - Obsidian wikilinks [[Page|Title]] and tags #tag
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  python3: 'python',
  sh: 'bash',
  zsh: 'bash',
  shell: 'bash',
  golang: 'go',
  rs: 'rust',
  yml: 'yaml',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  md: 'markdown',
  cs: 'csharp',
  'c++': 'cpp',
  postgres: 'sql',
  postgresql: 'sql',
  mysql: 'sql',
  sqlite: 'sql',
  rb: 'ruby',
  kt: 'kotlin',
  dockerfile: 'docker',
  gql: 'graphql',
};

/**
 * Highlights a snippet of source code using PrismJS grammars.
 */
export function highlightCode(code: string, language: string): string {
  const cleanLang = (language || '').trim().toLowerCase();
  const normalized = LANGUAGE_ALIASES[cleanLang] || cleanLang;
  const grammar = Prism.languages[normalized];

  if (grammar) {
    try {
      return Prism.highlight(code, grammar, normalized);
    } catch {
      return escapeHtml(code);
    }
  }

  return escapeHtml(code);
}

const CALLOUT_ICONS: Record<string, string> = {
  note: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  tip: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  caution: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  important: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  example: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>`,
  quote: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>`,
  summary: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
  bug: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg>`,
  todo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
};

export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '<div class="obsidian-empty-state">No content to preview</div>';
  }

  // Tokenize blocks
  const blocks: string[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Fenced code block: ``` or ~~~
    if (/^\s*(```|~~~)/.test(line)) {
      const fenceMatch = line.match(/^\s*(```|~~~)(.*)$/);
      const fence = fenceMatch ? fenceMatch[1] : '```';
      const lang = fenceMatch ? fenceMatch[2].trim() : '';
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing fence

      const rawCode = codeLines.join('\n');
      const highlighted = highlightCode(rawCode, lang);
      const displayLang = lang || 'text';

      blocks.push(`
        <div class="obsidian-code-block" data-language="${escapeHtml(displayLang)}">
          <div class="obsidian-code-header">
            <span class="obsidian-code-lang">${escapeHtml(displayLang)}</span>
            <button class="obsidian-code-copy-btn" title="Copy code" data-code="${escapeHtml(rawCode)}">
              <svg class="copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="language-${escapeHtml(displayLang)}">${highlighted}</code></pre>
        </div>
      `);
      continue;
    }

    // 2. Display Math Block: $$ ... $$
    if (line.trim() === '$$' || /^\$\$(.*)\$\$$/.test(line.trim())) {
      if (/^\$\$(.+)\$\$$/.test(line.trim())) {
        const formula = line.trim().slice(2, -2).trim();
        blocks.push(`<div class="obsidian-math-block">$$ ${escapeHtml(formula)} $$</div>`);
        i++;
        continue;
      } else {
        const mathLines: string[] = [];
        i++;
        while (i < lines.length && lines[i].trim() !== '$$') {
          mathLines.push(lines[i]);
          i++;
        }
        i++; // Skip closing $$
        blocks.push(`<div class="obsidian-math-block">$$\n${escapeHtml(mathLines.join('\n'))}\n$$</div>`);
        continue;
      }
    }

    // 3. Obsidian Callout: > [!type] Title
    if (/^\s*>\s*\[!([a-zA-Z]+)\](.*)$/.test(line)) {
      const match = line.match(/^\s*>\s*\[!([a-zA-Z]+)\](.*)$/);
      const calloutType = (match ? match[1] : 'note').toLowerCase();
      const title = (match && match[2] ? match[2].trim() : '') || calloutType.toUpperCase();
      const calloutLines: string[] = [];
      i++;

      while (i < lines.length && /^\s*>/.test(lines[i])) {
        calloutLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }

      const iconSvg = CALLOUT_ICONS[calloutType] || CALLOUT_ICONS.note;
      const parsedBody = parseMarkdownToHtml(calloutLines.join('\n'));

      blocks.push(`
        <div class="obsidian-callout callout-${escapeHtml(calloutType)}" data-callout="${escapeHtml(calloutType)}">
          <div class="obsidian-callout-title">
            <div class="obsidian-callout-icon">${iconSvg}</div>
            <div class="obsidian-callout-title-inner">${escapeHtml(title)}</div>
          </div>
          <div class="obsidian-callout-content">${parsedBody}</div>
        </div>
      `);
      continue;
    }

    // 4. Standard Blockquote: > ...
    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      const parsedBody = parseMarkdownToHtml(quoteLines.join('\n'));
      blocks.push(`<blockquote class="obsidian-blockquote">${parsedBody}</blockquote>`);
      continue;
    }

    // 5. Headings: # Heading
    if (/^#{1,6}\s+/.test(line)) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = renderInline(match[2]);
        blocks.push(`<h${level} class="obsidian-h${level}">${text}</h${level}>`);
      }
      i++;
      continue;
    }

    // 6. Horizontal Rule: --- or ***
    if (/^(\*\*\*|---|___)\s*$/.test(line.trim())) {
      blocks.push('<hr class="obsidian-hr" />');
      i++;
      continue;
    }

    // 7. Markdown Table: | Header | Header |
    if (/^\s*\|.+\|\s*$/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const splitRow = (rowStr: string) => {
          const placeholder = '%%ESCAPED_PIPE_TOKEN%%';
          const safe = rowStr.replace(/\\\|/g, placeholder);
          return safe
            .split('|')
            .slice(1, -1)
            .map(c => c.replace(new RegExp(placeholder, 'g'), '|').trim());
        };

        const headerRow = splitRow(tableLines[0]);
        // tableLines[1] is separator row |---|---|
        const separatorCells = splitRow(tableLines[1]);
        const alignments = separatorCells.map(cell => {
          const trimmed = cell.trim();
          if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
          if (trimmed.endsWith(':')) return 'right';
          if (trimmed.startsWith(':')) return 'left';
          return 'left';
        });

        const bodyRows = tableLines.slice(2).map(row => splitRow(row));

        let tableHtml = '<div class="obsidian-table-wrapper"><table class="obsidian-table"><thead><tr>';
        for (let hIdx = 0; hIdx < headerRow.length; hIdx++) {
          const h = headerRow[hIdx];
          const align = alignments[hIdx] || 'left';
          tableHtml += `<th style="text-align: ${align}">${renderInline(h)}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';
        for (const row of bodyRows) {
          tableHtml += '<tr>';
          for (let cIdx = 0; cIdx < headerRow.length; cIdx++) {
            const cell = row[cIdx] !== undefined ? row[cIdx] : '';
            const align = alignments[cIdx] || 'left';
            tableHtml += `<td style="text-align: ${align}">${renderInline(cell)}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table></div>';
        blocks.push(tableHtml);
      }
      continue;
    }

    // 8. Lists (Bullet, Numbered, Task Lists)
    if (/^\s*(?:[-*+]|\d+[.)]|[-*+]\s*\[[ xX]\])\s+/.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length && (/^\s*(?:[-*+]|\d+[.)]|[-*+]\s*\[[ xX]\])\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && listLines.length > 0))) {
        listLines.push(lines[i]);
        i++;
      }

      blocks.push(renderListBlock(listLines));
      continue;
    }

    // 9. Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 10. Regular Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('>') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('~~~') &&
      !/^\s*(?:[-*+]|\d+[.)]|[-*+]\s*\[[ xX]\])\s+/.test(lines[i]) &&
      !/^\s*\|.+\|\s*$/.test(lines[i]) &&
      !/^(\*\*\*|---|___)\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push(`<p class="obsidian-p">${renderInline(paraLines.join(' '))}</p>`);
    }
  }

  return blocks.join('\n');
}

/**
 * Renders nested list structures into proper HTML lists.
 */
function renderListBlock(lines: string[]): string {
  let html = '<ul class="obsidian-list">';
  let inOrdered = false;

  for (const line of lines) {
    const isTaskMatch = line.match(/^(\s*[-*+]\s+)\[([ xX])\]\s+(.*)$/);
    if (isTaskMatch) {
      const checked = isTaskMatch[2].toLowerCase() === 'x';
      const text = renderInline(isTaskMatch[3]);
      html += `<li class="obsidian-task-item"><input type="checkbox" disabled ${checked ? 'checked' : ''} class="obsidian-checkbox" /> <span>${text}</span></li>`;
      continue;
    }

    const isNumMatch = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    if (isNumMatch) {
      if (!inOrdered) {
        inOrdered = true;
      }
      const text = renderInline(isNumMatch[3]);
      html += `<li class="obsidian-list-item">${text}</li>`;
      continue;
    }

    const isBulletMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (isBulletMatch) {
      const text = renderInline(isBulletMatch[3]);
      html += `<li class="obsidian-list-item">${text}</li>`;
      continue;
    }

    // Continuation
    html += `<div class="obsidian-list-continuation">${renderInline(line.trim())}</div>`;
  }

  html += '</ul>';
  return html;
}

/**
 * Renders inline markdown tokens (bold, italics, inline code, inline math, wikilinks, links, tags).
 */
export function renderInline(text: string): string {
  if (!text) return '';

  let escaped = escapeHtml(text);

  // 1. Inline Code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="obsidian-inline-code">$1</code>');

  // 2. Inline Math: $math$
  escaped = escaped.replace(/\$([^\$\n]+)\$/g, '<span class="obsidian-inline-math">$$1</span>');

  // 3. Bold + Italic: ***text*** or ___text___
  escaped = escaped.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

  // 4. Bold: **text** or __text__
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 5. Italic: *text* or _text_
  escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/_([^_]+)_/g, '<em>$1</em>');

  // 6. Strikethrough: ~~text~~
  escaped = escaped.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 7. Obsidian Wikilinks: [[Note Name|Alias]] or [[Note Name]]
  escaped = escaped.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => {
    const displayText = alias || target;
    return `<a class="obsidian-wikilink" href="#${encodeURIComponent(target)}">${displayText}</a>`;
  });

  // 8. Standard Markdown Links: [Title](url)
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="obsidian-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 9. Obsidian Tags: #tag (must have whitespace or start before it)
  escaped = escaped.replace(/(^|\s)#([a-zA-Z0-9_\-\/]+)(?=\s|$)/g, '$1<span class="obsidian-tag">#$2</span>');

  return escaped;
}
