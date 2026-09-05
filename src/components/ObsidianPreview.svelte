<script lang="ts">
  import { onMount, tick } from 'svelte';
  import mermaid from 'mermaid';
  import { parseMarkdownToHtml } from '../lib/parser';

  export let markdown: string = '';

  $: renderedHtml = parseMarkdownToHtml(markdown);

  let renderCount = 0;

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function renderMermaidDiagrams() {
    await tick();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      });
    } catch {}

    const blocks = document.querySelectorAll<HTMLElement>('.obsidian-mermaid-block');
    for (let idx = 0; idx < blocks.length; idx++) {
      const block = blocks[idx];
      const code = block.getAttribute('data-mermaid');
      const target = block.querySelector<HTMLElement>('.obsidian-mermaid-render-target');
      if (code && target && !block.classList.contains('rendered')) {
        const id = `mermaid-svg-${Date.now()}-${idx}-${renderCount++}`;
        try {
          const { svg } = await mermaid.render(id, code);
          target.innerHTML = svg;
          block.classList.add('rendered');
        } catch (err) {
          target.innerHTML = `<pre class="mermaid-error-fallback"><code>${escapeHtml(code)}</code></pre>`;
          block.classList.add('rendered');
        }
      }
    }
  }

  $: if (renderedHtml) {
    renderMermaidDiagrams();
  }

  onMount(() => {
    renderMermaidDiagrams();

    // Listen to theme changes to re-render diagrams with corresponding dark/light theme
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-theme') {
          const blocks = document.querySelectorAll<HTMLElement>('.obsidian-mermaid-block');
          blocks.forEach(b => b.classList.remove('rendered'));
          renderMermaidDiagrams();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  });

  function codeCopyAction(node: HTMLElement) {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const copyBtn = target.closest('.obsidian-code-copy-btn') as HTMLButtonElement | null;
      if (!copyBtn) return;

      const code = copyBtn.getAttribute('data-code') || '';
      if (!code) return;

      navigator.clipboard.writeText(code).then(() => {
        const span = copyBtn.querySelector('span');
        const originalText = span ? span.textContent : 'Copy';
        copyBtn.classList.add('copied');
        if (span) span.textContent = 'Copied!';

        setTimeout(() => {
          copyBtn.classList.remove('copied');
          if (span) span.textContent = originalText;
        }, 2000);
      }).catch(() => {});
    }

    node.addEventListener('click', handleClick);
    return {
      destroy() {
        node.removeEventListener('click', handleClick);
      }
    };
  }
</script>

<div class="preview-wrapper" use:codeCopyAction>
  {#if !markdown.trim()}
    <div class="obsidian-empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--accent); opacity: 0.7;">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      <p>Cleaned Obsidian reading view will appear here</p>
    </div>
  {:else}
    <div class="preview-content">
      {@html renderedHtml}
    </div>
  {/if}
</div>
