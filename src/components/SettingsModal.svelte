<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CleanOptions, PresetName } from '../lib/types';
  import { PRESETS } from '../lib/presets';

  export let isOpen: boolean = false;
  export let options: CleanOptions;
  export let currentPreset: PresetName;

  const dispatch = createEventDispatcher<{
    close: void;
    updateOptions: CleanOptions;
    resetPreset: PresetName;
  }>();

  function close() {
    dispatch('close');
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function resetToPreset() {
    options = { ...PRESETS[currentPreset].options };
    dispatch('updateOptions', options);
  }

  function enableAll() {
    options = {
      ...options,
      tightenLists: true,
      convertCallouts: true,
      fixMathDelimiters: true,
      fixEmphasisSpacing: true,
      fixHeadings: true,
      collapseBlankLines: true,
      trimTrailingSpaces: true,
      fixTableSpacing: true,
      fixQuoteSpacing: true,
      normalizeTaskLists: true,
    };
    dispatch('updateOptions', options);
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <div class="modal-title" id="modal-title">Transformation Rules & Settings</div>
        <button class="btn-icon" on:click={close} aria-label="Close settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <label class="rule-toggle-row">
          <div class="rule-info">
            <span class="rule-name">Tighten Loose Lists (Gemini List Fix)</span>
            <span class="rule-desc">Removes unwanted empty lines between bullet points and numbered lists.</span>
          </div>
          <div class="switch">
            <input type="checkbox" bind:checked={options.tightenLists} on:change={() => dispatch('updateOptions', options)} />
            <span class="slider"></span>
          </div>
        </label>

        <label class="rule-toggle-row">
          <div class="rule-info">
            <span class="rule-name">Convert AI Callouts to Obsidian Format</span>
            <span class="rule-desc">Converts <code>&gt; **Note:**</code>, <code>&gt; **Warning:**</code> to <code>&gt; [!note]</code>, <code>&gt; [!warning]</code>.</span>
          </div>
          <div class="switch">
            <input type="checkbox" bind:checked={options.convertCallouts} on:change={() => dispatch('updateOptions', options)} />
            <span class="slider"></span>
          </div>
        </label>

        <label class="rule-toggle-row">
          <div class="rule-info">
            <span class="rule-name">Normalize LaTeX Math Delimiters</span>
            <span class="rule-desc">Converts LaTeX <code>\[ ... \]</code> to <code>$$ ... $$</code> and <code>\( ... \)</code> to <code>$ ... $</code>.</span>
          </div>
          <div class="switch">
            <input type="checkbox" bind:checked={options.fixMathDelimiters} on:change={() => dispatch('updateOptions', options)} />
            <span class="slider"></span>
          </div>
        </label>

        <label class="rule-toggle-row">
          <div class="rule-info">
            <span class="rule-name">Fix Bold & Italic Whitespace</span>
            <span class="rule-desc">Fixes <code>** text **</code> to <code>**text**</code> so Obsidian parses emphasis properly.</span>
          </div>
          <div class="switch">
            <input type="checkbox" bind:checked={options.fixEmphasisSpacing} on:change={() => dispatch('updateOptions', options)} />
            <span class="slider"></span>
          </div>
        </label>

        <label class="rule-toggle-row">
          <div class="rule-info">
            <span class="rule-name">Standardize Headings</span>
            <span class="rule-desc">Ensures spacing after <code>#</code> (fixes <code>###Heading</code> &rarr; <code>### Heading</code>).</span>
          </div>
          <div class="switch">
            <input type="checkbox" bind:checked={options.fixHeadings} on:change={() => dispatch('updateOptions', options)} />
            <span class="slider"></span>
          </div>
        </label>

        <label class="rule-toggle-row">
          <div class="rule-info">
            <span class="rule-name">Collapse Excessive Blank Lines</span>
            <span class="rule-desc">Normalizes 3+ consecutive newlines down to a single blank line.</span>
          </div>
          <div class="switch">
            <input type="checkbox" bind:checked={options.collapseBlankLines} on:change={() => dispatch('updateOptions', options)} />
            <span class="slider"></span>
          </div>
        </label>

        <label class="rule-toggle-row">
          <div class="rule-info">
            <span class="rule-name">Trim Trailing Whitespace</span>
            <span class="rule-desc">Removes redundant trailing spaces from line ends.</span>
          </div>
          <div class="switch">
            <input type="checkbox" bind:checked={options.trimTrailingSpaces} on:change={() => dispatch('updateOptions', options)} />
            <span class="slider"></span>
          </div>
        </label>

        <label class="rule-toggle-row">
          <div class="rule-info">
            <span class="rule-name">Clean Table Spacing</span>
            <span class="rule-desc">Eliminates empty lines inside markdown tables.</span>
          </div>
          <div class="switch">
            <input type="checkbox" bind:checked={options.fixTableSpacing} on:change={() => dispatch('updateOptions', options)} />
            <span class="slider"></span>
          </div>
        </label>

        <label class="rule-toggle-row">
          <div class="rule-info">
            <span class="rule-name">Normalize Task Lists</span>
            <span class="rule-desc">Standardizes checkbox notation <code>- [ ]</code> and <code>- [x]</code>.</span>
          </div>
          <div class="switch">
            <input type="checkbox" bind:checked={options.normalizeTaskLists} on:change={() => dispatch('updateOptions', options)} />
            <span class="slider"></span>
          </div>
        </label>
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" on:click={resetToPreset}>
          Reset to Preset ({PRESETS[currentPreset].name})
        </button>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" on:click={enableAll}>Enable All</button>
          <button class="btn btn-primary" on:click={close}>Done</button>
        </div>
      </div>
    </div>
  </div>
{/if}
