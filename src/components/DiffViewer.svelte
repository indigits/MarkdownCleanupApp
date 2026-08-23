<script lang="ts">
  import type { DiffLine } from '../lib/types';

  export let diffLines: DiffLine[] = [];
</script>

<div class="diff-container">
  {#if diffLines.length === 0}
    <div class="obsidian-empty-state">
      <span>Paste markdown on the left to see transformation diff</span>
    </div>
  {:else}
    {#each diffLines as line, idx (idx)}
      {#if line.type === 'removed'}
        <div class="diff-line diff-removed">
          <span class="diff-line-number">- {line.oldLineNumber || ''}</span>
          <span class="diff-line-content">{line.oldContent || ' '}</span>
        </div>
      {:else if line.type === 'added'}
        <div class="diff-line diff-added">
          <span class="diff-line-number">+ {line.newLineNumber || ''}</span>
          <span class="diff-line-content">{line.newContent || ' '}</span>
        </div>
      {:else if line.type === 'modified'}
        <div class="diff-line diff-removed">
          <span class="diff-line-number">- {line.oldLineNumber || ''}</span>
          <span class="diff-line-content">{line.oldContent || ' '}</span>
        </div>
        <div class="diff-line diff-added">
          <span class="diff-line-number">+ {line.newLineNumber || ''}</span>
          <span class="diff-line-content">{line.newContent || ' '}</span>
        </div>
      {:else}
        <div class="diff-line diff-same">
          <span class="diff-line-number">{line.newLineNumber || ''}</span>
          <span class="diff-line-content">{line.newContent || ' '}</span>
        </div>
      {/if}
    {/each}
  {/if}
</div>
