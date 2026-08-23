<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PresetName } from '../lib/types';
  import { PRESETS } from '../lib/presets';
  import { SAMPLES } from '../lib/samples';

  export let currentPreset: PresetName;
  export let theme: 'dark' | 'light' = 'dark';

  const dispatch = createEventDispatcher<{
    changePreset: PresetName;
    loadSample: string;
    openSettings: void;
    toggleTheme: void;
  }>();

  function onPresetChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    dispatch('changePreset', target.value as PresetName);
  }

  function onSampleSelect(sampleId: string) {
    const sample = SAMPLES.find(s => s.id === sampleId);
    if (sample) {
      dispatch('loadSample', sample.markdown);
    }
  }
</script>

<header class="app-header">
  <div class="brand-section">
    <div class="brand-logo" title="Obsidian Markdown Cleaner">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>
    </div>
    <div class="brand-info">
      <div class="brand-title">
        <span>Obsidian Clean</span>
        <span class="brand-badge">Client Side</span>
      </div>
      <div class="brand-subtitle">Fix Gemini & AI Markdown for Obsidian</div>
    </div>
  </div>

  <div class="header-center">
    <div class="preset-dropdown-wrapper">
      <select class="preset-select" value={currentPreset} on:change={onPresetChange} aria-label="Cleanup Preset">
        {#each Object.values(PRESETS) as preset (preset.id)}
          <option value={preset.id}>{preset.name}</option>
        {/each}
      </select>
      <div class="preset-select-arrow">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>

    <!-- Quick Samples -->
    <div style="display: flex; gap: 4px;">
      <button class="btn btn-secondary" on:click={() => onSampleSelect('gemini-chat')} title="Load realistic Gemini chat with loose lists & math">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span>Gemini Sample</span>
      </button>
      <button class="btn btn-ghost" on:click={() => onSampleSelect('chatgpt-plan')} title="Load ChatGPT task list sample">
        <span>ChatGPT</span>
      </button>
      <button class="btn btn-ghost" on:click={() => onSampleSelect('claude-research')} title="Load Claude research sample">
        <span>Claude</span>
      </button>
    </div>
  </div>

  <div class="header-actions">
    <!-- Settings button -->
    <button class="btn btn-secondary" on:click={() => dispatch('openSettings')} title="Customize transformation rules">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      <span>Rules</span>
    </button>

    <!-- Theme switch -->
    <button class="btn-icon" on:click={() => dispatch('toggleTheme')} aria-label="Toggle Dark/Light Mode" title="Toggle theme">
      {#if theme === 'dark'}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      {/if}
    </button>
  </div>
</header>
