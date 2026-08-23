import type { DiffLine } from './types';

/**
 * Computes a clean line-by-line diff between original text and cleaned text.
 */
export function computeLineDiff(original: string, cleaned: string): DiffLine[] {
  const oldLines = original.split('\n');
  const newLines = cleaned.split('\n');
  const result: DiffLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx];
    const newLine = newLines[newIdx];

    if (oldIdx >= oldLines.length) {
      // Line added
      result.push({
        type: 'added',
        newContent: newLine,
        newLineNumber: newIdx + 1,
      });
      newIdx++;
    } else if (newIdx >= newLines.length) {
      // Line removed
      result.push({
        type: 'removed',
        oldContent: oldLine,
        oldLineNumber: oldIdx + 1,
      });
      oldIdx++;
    } else if (oldLine === newLine) {
      // Unchanged line
      result.push({
        type: 'same',
        oldContent: oldLine,
        newContent: newLine,
        oldLineNumber: oldIdx + 1,
        newLineNumber: newIdx + 1,
      });
      oldIdx++;
      newIdx++;
    } else {
      // Look ahead for matches in next few lines to detect insertions/deletions accurately
      let matchedOldAhead = -1;
      let matchedNewAhead = -1;

      const LOOKAHEAD = 5;
      for (let offset = 1; offset <= LOOKAHEAD; offset++) {
        if (oldIdx + offset < oldLines.length && oldLines[oldIdx + offset] === newLine) {
          matchedOldAhead = oldIdx + offset;
          break;
        }
        if (newIdx + offset < newLines.length && oldLine === newLines[newIdx + offset]) {
          matchedNewAhead = newIdx + offset;
          break;
        }
      }

      if (matchedOldAhead !== -1) {
        // Lines were removed in new version
        while (oldIdx < matchedOldAhead) {
          result.push({
            type: 'removed',
            oldContent: oldLines[oldIdx],
            oldLineNumber: oldIdx + 1,
          });
          oldIdx++;
        }
      } else if (matchedNewAhead !== -1) {
        // Lines were added in new version
        while (newIdx < matchedNewAhead) {
          result.push({
            type: 'added',
            newContent: newLines[newIdx],
            newLineNumber: newIdx + 1,
          });
          newIdx++;
        }
      } else {
        // Line was modified
        result.push({
          type: 'modified',
          oldContent: oldLine,
          newContent: newLine,
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
      }
    }
  }

  return result;
}
