<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DiffLine } from '../lib/types';
  import ObsidianPreview from './ObsidianPreview.svelte';
  import DiffViewer from './DiffViewer.svelte';

  export let cleanedMarkdown: string = '';
  export let diffLines: DiffLine[] = [];
  export let lines: number = 0;
  export let words: number = 0;
  export let chars: number = 0;
  export let linesSaved: number = 0;

  type ViewTab = 'raw' | 'preview' | 'diff';
  let activeTab: ViewTab = 'raw';
  let isCopied = false;

  const dispatch = createEventDispatcher<{
    copy: void;
    download: void;
    openObsidian: void;
  }>();

  async function handleCopy() {
    if (!cleanedMarkdown) return;
    try {
      await navigator.clipboard.writeText(cleanedMarkdown);
      isCopied = true;
      dispatch('copy');
      setTimeout(() => {
        isCopied = false;
      }, 2000);
    } catch {
      const textarea = document.getElementById('cleaned-markdown-area') as HTMLTextAreaElement;
      if (textarea) {
        textarea.select();
        document.execCommand('copy');
        isCopied = true;
        dispatch('copy');
        setTimeout(() => {
          isCopied = false;
        }, 2000);
      }
    }
  }

  function handleDownload() {
    if (!cleanedMarkdown) return;
    const blob = new Blob([cleanedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obsidian-clean-note-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    dispatch('download');
  }

  function handleOpenObsidian() {
    if (!cleanedMarkdown) return;
    const encodedContent = encodeURIComponent(cleanedMarkdown);
    const obsidianUri = `obsidian://new?content=${encodedContent}`;
    window.open(obsidianUri, '_blank');
    dispatch('openObsidian');
  }
</script>

<div class="panel panel-right">
  <div class="panel-header">
    <div class="panel-title">
      <div class="panel-indicator {cleanedMarkdown ? 'active' : ''}"></div>
      <span>Obsidian Ready</span>
      
      <!-- Tab Group -->
      <div class="tab-group" style="margin-left: 8px;">
        <button
          class="tab-btn {activeTab === 'raw' ? 'active' : ''}"
          on:click={() => (activeTab = 'raw')}
          title="View clean raw markdown"
        >
          Markdown
        </button>
        <button
          class="tab-btn {activeTab === 'preview' ? 'active' : ''}"
          on:click={() => (activeTab = 'preview')}
          title="View Obsidian reading mode preview"
        >
          Preview
        </button>
        <button
          class="tab-btn {activeTab === 'diff' ? 'active' : ''}"
          on:click={() => (activeTab = 'diff')}
          title="View removed loose spaces and line differences"
        >
          Diff {#if linesSaved > 0}({linesSaved} saved){/if}
        </button>
      </div>

      {#if cleanedMarkdown}
        <span style="font-size: 11px; font-weight: normal; color: var(--text-muted); margin-left: 6px;">
          ({lines} {lines === 1 ? 'line' : 'lines'} &bull; {words} {words === 1 ? 'word' : 'words'} &bull; {chars} chars)
        </span>
      {/if}
    </div>

    <div class="panel-actions">
      {#if cleanedMarkdown}
        <button class="btn btn-ghost" on:click={handleDownload} title="Download .md note file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Download</span>
        </button>

        <button class="btn btn-ghost" on:click={handleOpenObsidian} title="Send note directly to Obsidian app">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          <span>Obsidian App</span>
        </button>

        <button
          class="btn {isCopied ? 'btn-success' : 'btn-primary'}"
          on:click={handleCopy}
          title="Copy clean markdown to clipboard"
        >
          {#if isCopied}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
          {:else}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy Markdown</span>
          {/if}
        </button>
      {/if}
    </div>
  </div>

  {#if activeTab === 'raw'}
    <div class="editor-wrapper">
      {#if !cleanedMarkdown}
        <div class="obsidian-empty-state" style="width: 100%;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--accent); opacity: 0.7;">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <p>Cleaned markdown will appear here automatically</p>
        </div>
      {:else}
        <textarea
          id="cleaned-markdown-area"
          class="markdown-textarea"
          readonly
          value={cleanedMarkdown}
          spellcheck="false"
        ></textarea>
      {/if}
    </div>
  {:else if activeTab === 'preview'}
    <ObsidianPreview markdown={cleanedMarkdown} />
  {:else if activeTab === 'diff'}
    <DiffViewer {diffLines} />
  {/if}
</div>
