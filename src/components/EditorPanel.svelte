<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let inputMarkdown: string = '';
  export let lines: number = 0;
  export let words: number = 0;
  export let chars: number = 0;

  const dispatch = createEventDispatcher<{
    update: string;
    paste: void;
    clear: void;
  }>();

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        inputMarkdown = text;
        dispatch('update', inputMarkdown);
        dispatch('paste');
      }
    } catch {
      const textarea = document.getElementById('input-markdown-area') as HTMLTextAreaElement;
      if (textarea) textarea.focus();
    }
  }

  function handleClear() {
    inputMarkdown = '';
    dispatch('update', '');
    dispatch('clear');
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    inputMarkdown = target.value;
    dispatch('update', inputMarkdown);
  }
</script>

<div class="panel panel-left">
  <div class="panel-header">
    <div class="panel-title">
      <div class="panel-indicator {inputMarkdown ? 'active' : ''}"></div>
      <span>Input (AI Chat Output)</span>
      {#if inputMarkdown}
        <span style="font-size: 11px; font-weight: normal; color: var(--text-muted); margin-left: 6px;">
          ({lines} {lines === 1 ? 'line' : 'lines'} &bull; {words} {words === 1 ? 'word' : 'words'} &bull; {chars} chars)
        </span>
      {/if}
    </div>

    <div class="panel-actions">
      <button class="btn btn-ghost" on:click={handlePaste} title="Paste from Clipboard">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
        <span>Paste</span>
      </button>

      {#if inputMarkdown}
        <button class="btn btn-ghost" on:click={handleClear} title="Clear text">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>Clear</span>
        </button>
      {/if}
    </div>
  </div>

  <div class="editor-wrapper">
    <textarea
      id="input-markdown-area"
      class="markdown-textarea"
      placeholder="Paste your markdown from Google Gemini, ChatGPT, Claude, or any AI chatbot here...&#10;&#10;Loose list bullet points with excessive spaces, LaTeX math \( formulas \), broken bold text, and AI notes will be cleaned up instantly in real-time."
      value={inputMarkdown}
      on:input={handleInput}
      spellcheck="false"
    ></textarea>
  </div>
</div>
