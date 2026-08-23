<script lang="ts">
  import { onMount } from 'svelte';
  import type { CleanOptions, CleanStats, DiffLine, PresetName } from './lib/types';
  import { cleanMarkdown } from './lib/cleaner';
  import { PRESETS } from './lib/presets';
  import { SAMPLES } from './lib/samples';
  import { computeLineDiff } from './lib/diff';
  import Header from './components/Header.svelte';
  import EditorPanel from './components/EditorPanel.svelte';
  import OutputPanel from './components/OutputPanel.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import Toast from './components/Toast.svelte';

  let currentPreset: PresetName = 'gemini';
  let options: CleanOptions = { ...PRESETS.gemini.options };
  let theme: 'dark' | 'light' = 'dark';
  let isSettingsOpen = false;

  // Toast state
  let toastMessage = '';
  let isToastVisible = false;
  let toastTimer: any;

  function showToast(msg: string) {
    toastMessage = msg;
    isToastVisible = true;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      isToastVisible = false;
    }, 2400);
  }

  // Input & Output states
  let inputMarkdown: string = '';
  let cleanedMarkdown: string = '';
  let stats: CleanStats = {
    inputChars: 0,
    outputChars: 0,
    inputWords: 0,
    outputWords: 0,
    inputLines: 0,
    outputLines: 0,
    linesSaved: 0,
    charactersSaved: 0,
    listsTightened: 0,
    calloutsConverted: 0,
    mathConverted: 0,
    emphasisFixed: 0,
  };
  let diffLines: DiffLine[] = [];

  // Reactive cleaning pipeline
  $: {
    if (inputMarkdown) {
      const res = cleanMarkdown(inputMarkdown, options);
      cleanedMarkdown = res.cleaned;
      stats = res.stats;
      diffLines = computeLineDiff(inputMarkdown, cleanedMarkdown);
    } else {
      cleanedMarkdown = '';
      stats = {
        inputChars: 0,
        outputChars: 0,
        inputWords: 0,
        outputWords: 0,
        inputLines: 0,
        outputLines: 0,
        linesSaved: 0,
        charactersSaved: 0,
        listsTightened: 0,
        calloutsConverted: 0,
        mathConverted: 0,
        emphasisFixed: 0,
      };
      diffLines = [];
    }
  }

  onMount(() => {
    // Load stored theme or system preference
    const savedTheme = localStorage.getItem('obsidian_cleaner_theme') as 'dark' | 'light';
    if (savedTheme) {
      theme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);

    // Load initial sample or saved text
    const savedText = localStorage.getItem('obsidian_cleaner_input');
    if (savedText) {
      inputMarkdown = savedText;
    } else {
      // Default to realistic Gemini sample for immediate wow factor!
      inputMarkdown = SAMPLES[0].markdown;
    }
  });

  function handleInputChange(event: CustomEvent<string>) {
    inputMarkdown = event.detail;
    try {
      localStorage.setItem('obsidian_cleaner_input', inputMarkdown);
    } catch {}
  }

  function handlePresetChange(event: CustomEvent<PresetName>) {
    currentPreset = event.detail;
    options = { ...PRESETS[currentPreset].options };
    showToast(`Preset: ${PRESETS[currentPreset].name} applied`);
  }

  function handleLoadSample(event: CustomEvent<string>) {
    inputMarkdown = event.detail;
    try {
      localStorage.setItem('obsidian_cleaner_input', inputMarkdown);
    } catch {}
    showToast('Sample markdown loaded');
  }

  function handleToggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('obsidian_cleaner_theme', theme);
    showToast(`${theme === 'dark' ? 'Dark' : 'Light'} theme enabled`);
  }

  function handleCopy() {
    showToast('Cleaned markdown copied to clipboard!');
  }

  function handleDownload() {
    showToast('Markdown file downloaded!');
  }

  function handleOpenObsidian() {
    showToast('Opening note in Obsidian app...');
  }
</script>

<div class="app-layout">
  <Header
    {currentPreset}
    {theme}
    on:changePreset={handlePresetChange}
    on:loadSample={handleLoadSample}
    on:openSettings={() => (isSettingsOpen = true)}
    on:toggleTheme={handleToggleTheme}
  />

  <!-- Interactive Stats Banner -->
  <div class="stats-banner">
    <div class="stats-group">
      <span><strong>Transformations:</strong></span>
      {#if stats.linesSaved > 0}
        <span class="stat-pill stat-highlight" title="Empty blank lines removed">
          &minus;{stats.linesSaved} loose {stats.linesSaved === 1 ? 'line' : 'lines'} removed
        </span>
      {:else}
        <span class="stat-pill">No extra lines</span>
      {/if}

      {#if stats.listsTightened > 0}
        <span class="stat-pill" title="Bullet & numbered lists tightened">
          {stats.listsTightened} {stats.listsTightened === 1 ? 'list' : 'lists'} tightened
        </span>
      {/if}

      {#if stats.calloutsConverted > 0}
        <span class="stat-pill" title="AI notes converted to Obsidian callouts">
          {stats.calloutsConverted} {stats.calloutsConverted === 1 ? 'callout' : 'callouts'}
        </span>
      {/if}

      {#if stats.mathConverted > 0}
        <span class="stat-pill" title="LaTeX math delimiters normalized">
          {stats.mathConverted} math blocks
        </span>
      {/if}

      {#if stats.emphasisFixed > 0}
        <span class="stat-pill" title="Bold/italic whitespace fixed">
          {stats.emphasisFixed} bold tokens fixed
        </span>
      {/if}
    </div>

    <div class="stats-group">
      <span>Input: {stats.inputLines} lines &bull; {stats.inputWords} words</span>
      <span>&rarr;</span>
      <span>Output: {stats.outputLines} lines &bull; {stats.outputWords} words</span>
    </div>
  </div>

  <!-- Dual Split-Screen View -->
  <main class="split-view-container">
    <EditorPanel
      {inputMarkdown}
      lines={stats.inputLines}
      words={stats.inputWords}
      chars={stats.inputChars}
      on:update={handleInputChange}
      on:paste={() => showToast('Pasted from clipboard')}
      on:clear={() => showToast('Editor cleared')}
    />

    <OutputPanel
      {cleanedMarkdown}
      {diffLines}
      lines={stats.outputLines}
      words={stats.outputWords}
      chars={stats.outputChars}
      linesSaved={stats.linesSaved}
      on:copy={handleCopy}
      on:download={handleDownload}
      on:openObsidian={handleOpenObsidian}
    />
  </main>

  <!-- Settings Modal -->
  <SettingsModal
    isOpen={isSettingsOpen}
    bind:options={options}
    {currentPreset}
    on:close={() => (isSettingsOpen = false)}
    on:updateOptions={(e) => {
      options = e.detail;
    }}
  />

  <!-- Animated Toast Notification -->
  <Toast message={toastMessage} visible={isToastVisible} />
</div>
