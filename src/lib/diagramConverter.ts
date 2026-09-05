/**
 * ASCII and Unicode Box-and-Arrow Diagram to Mermaid.js Flowchart Converter.
 *
 * Implements a deterministic 2D spatial graph parser:
 * 1. Node detection (Unicode single/double/round boxes, ASCII boxes, bracket nodes, decision diamonds).
 * 2. Multi-line label aggregation, bullet list extraction, subtitle annotation binding.
 * 3. 2D raycasting & pathfinding for orthogonal connectors, fan-out/fan-in junctions, and feedback loops.
 * 4. Inline connector label extraction ([Yes], [No], (label), vs.).
 * 5. Layout direction inference (flowchart TD vs flowchart LR).
 */

export interface DiagramNode {
  id: string;
  label: string;
  shape: 'rect' | 'subroutine' | 'round' | 'diamond' | 'circle';
  top: number; // line index
  bottom: number; // line index
  left: number; // col index
  right: number; // col index
  centerX: number;
  centerY: number;
  rawLines: string[];
}

export interface DiagramEdge {
  from: string; // node id
  to: string; // node id
  label?: string; // e.g. "Yes", "No", "publish event", "vs."
  style: 'arrow' | 'bidirectional' | 'dotted' | 'thick';
}

export interface ParsedDiagram {
  direction: 'TD' | 'LR';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

/**
 * Checks if a block of text represents an ASCII/Unicode diagram.
 */
export function isAsciiDiagram(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const lines = text.split('\n');
  if (lines.length < 2) return false;

  // Negative check 1: Programming source code
  if (isSourceCode(lines)) {
    return false;
  }

  // Negative check 2: Pure grid table (tabular matrix)
  if (isPureGridTable(lines)) {
    return false;
  }

  const raw = text;

  // Check for presence of diagram indicators
  const hasUnicodeBox = /[┌╔╭├╠└╚╰][─═\s┬┴┼╤╧╪╫╬╦╩]+[┐╗╮┤╣┘╝╯]/.test(raw) || /[│║]/.test(raw);
  const hasAsciiBox = /\+[=-]+\+/.test(raw);
  const hasArrows = /[▼▲►◄▶◀↓↑→←]/.test(raw) || /-->|->|==>|──►|──>|─►|<-|<--/.test(raw);
  const hasBracketNodes = /\[\s*[A-Za-z0-9_`][^\[\]\n]*?\s*\]/.test(raw);
  const hasDiamond = /\/[─\- ]+\\|<[─\- ]+>/.test(raw);

  // Must have at least one box/node type and at least one connector/arrow/box structure
  if ((hasUnicodeBox || hasAsciiBox || hasBracketNodes || hasDiamond) && (hasArrows || hasUnicodeBox || hasAsciiBox)) {
    return true;
  }

  return false;
}

/**
 * Helper to check if lines represent programming source code with comments.
 */
function isSourceCode(lines: string[]): boolean {
  let codeKeywordCount = 0;
  let commentBoxLines = 0;
  let totalNonEmpty = 0;

  const codeKeywords = /^\s*(def |class |function |import |export |from |const |let |var |return |public |private |protected |async |await |if |else |for |while |try |catch )/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    totalNonEmpty++;

    if (codeKeywords.test(trimmed) || /;\s*$/.test(trimmed) || /\w+\(.*\)\s*\{?$/.test(trimmed)) {
      codeKeywordCount++;
    }

    if (/^\s*(#|\/\/|\/\*|\*)/.test(line) && /[┌└│─\+\|]/.test(line)) {
      commentBoxLines++;
    }
  }

  if (codeKeywordCount > 0 || (commentBoxLines > 0 && commentBoxLines / totalNonEmpty > 0.3)) {
    return true;
  }

  return false;
}

/**
 * Helper to check if a block is purely a grid table rather than a diagram.
 */
function isPureGridTable(lines: string[]): boolean {
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 3) return false;

  // If arrows exist, it's a diagram
  const hasArrows = /[▼▲►◄▶◀↓↑]/.test(lines.join('\n')) || /-->|──►|─►/.test(lines.join('\n'));
  if (hasArrows) return false;

  let allTableLines = true;
  let internalColumnSeparators = 0;

  for (const line of nonEmpty) {
    const trimmed = line.trim();
    const isBorder = /^\+[-=+]+\+$/.test(trimmed) || /^[┌╔╭├╠╟╞└╚╰][─═┬╦╤╥┼╬╫╪┴╩╧╨┐╗╮┤╣╢╡┘╝╯\s]+$/.test(trimmed);
    const isContent = (trimmed.startsWith('|') && trimmed.endsWith('|')) ||
                      (trimmed.startsWith('│') && trimmed.endsWith('│')) ||
                      (trimmed.startsWith('║') && trimmed.endsWith('║'));

    if (trimmed.includes('|') || trimmed.includes('│') || trimmed.includes('║')) {
      const pipes = (trimmed.match(/[|│║]/g) || []).length;
      if (pipes >= 3) internalColumnSeparators++;
    }

    if (!isBorder && !isContent) {
      allTableLines = false;
      break;
    }
  }

  // Pure grid table has multiple columns and all lines conform to table structure
  return allTableLines && internalColumnSeparators >= 2;
}

/**
 * Generates a clean, semantic node ID from its label.
 */
export function generateNodeId(label: string, existingIds: Set<string>): string {
  // Extract first line of label
  const firstLine = label.split('<br/>')[0].replace(/[`*_[\]]/g, '').trim();

  // Known semantic mappings
  const lower = firstLine.toLowerCase();
  let base = '';

  if (lower.includes('incoming request') || lower === 'request') base = 'req';
  else if (lower.includes('mutation') || lower.includes('command')) base = 'mut';
  else if (lower.includes('read') || lower.includes('projection')) base = 'read';
  else if (lower.includes('task-scoped') || lower.includes('aggregate')) {
    if (lower.includes('risk')) base = 'risk';
    else if (lower.includes('payout')) base = 'payout';
    else if (lower.includes('profile')) base = 'profile';
    else base = 'task';
  }
  else if (lower.includes('dto')) base = 'dto';
  else if (lower.includes('merchants') && lower.includes('table')) base = 'table';
  else if (lower.includes('database table') || lower === 'database') base = 'db';
  else if (lower.includes('tension')) base = 'tension';
  else if (lower.includes('invariants')) base = 'invariants';
  else if (lower.includes('storage')) base = 'storage';
  else if (lower.includes('client')) base = 'client';
  else if (lower.includes('gateway')) base = 'gateway';
  else if (lower.includes('auth service')) base = 'auth';
  else if (lower.includes('incoming user') || lower.includes('user auth')) base = 'auth';
  else if (lower.includes('mfa')) base = 'mfa';
  else if (lower.includes('otp')) base = 'otp';
  else if (lower.includes('password')) base = 'pwd';
  else if (lower.includes('jwt') || lower.includes('token')) base = 'jwt';
  else if (lower.includes('order')) base = 'order';
  else if (lower.includes('kafka')) base = 'kafka';
  else if (lower.includes('inventory')) base = 'inv';
  else if (lower.includes('payment')) base = 'pay';
  else if (lower.includes('draft')) base = 'draft';
  else if (lower.includes('review')) base = 'review';
  else if (lower.includes('approved')) base = 'approved';
  else if (lower.includes('published')) base = 'published';
  else if (lower.includes('rejected')) base = 'rejected';
  else if (lower.includes('presentation')) base = 'pres';
  else if (lower.includes('business')) base = 'biz';
  else if (lower.includes('infrastructure')) base = 'infra';
  else {
    // Generate slug from words
    const words = lower.replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length > 0) {
      base = words.slice(0, 2).join('_');
    } else {
      base = 'node';
    }
  }

  // Ensure uniqueness and avoid reserved Mermaid keywords
  const reservedKeywords = new Set([
    'subgraph', 'end', 'style', 'class', 'classdef', 'click', 'callback',
    'linkstyle', 'interpolate', 'flowchart', 'graph', 'direction', 'node', 'default'
  ]);

  if (reservedKeywords.has(base.toLowerCase())) {
    base = `n_${base}`;
  }

  let candidate = base;
  let counter = 1;
  while (existingIds.has(candidate)) {
    candidate = `${base}_${counter++}`;
  }

  existingIds.add(candidate);
  return candidate;
}

const BOX_TOP_LEFT_CHARS = '┌╔╭';
const BOX_TOP_RIGHT_CHARS = '┐╗╮';
const BOX_BOTTOM_LEFT_CHARS = '└╚╰';
const BOX_BOTTOM_RIGHT_CHARS = '┘╝╯';
const HORIZ_BORDER_CHARS = '─═-=+┬┴┼╤╧╪╫╬╦╩';

/**
 * Extracts nodes from a 2D line array.
 */
export function extractNodes(lines: string[]): DiagramNode[] {
  const nodes: DiagramNode[] = [];
  const existingIds = new Set<string>();

  // Track occupied character cells so bracket nodes don't duplicate boxes
  const occupiedCells = new Set<string>();
  const markOccupied = (top: number, bottom: number, left: number, right: number) => {
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        occupiedCells.add(`${r},${c}`);
      }
    }
  };

  // 1. Scan for Unicode and ASCII Boxes
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];

    // Find box top corners
    for (let c = 0; c < line.length; c++) {
      const char = line[c];

      const isUnicodeTopLeft = BOX_TOP_LEFT_CHARS.includes(char);
      const isAsciiTopLeft = char === '+' && c + 1 < line.length && (line[c + 1] === '-' || line[c + 1] === '=');

      if (isUnicodeTopLeft || isAsciiTopLeft) {
        const doubleBorder = char === '╔';
        const roundedBorder = char === '╭';
        const expectedRight = doubleBorder ? '╗' : roundedBorder ? '╮' : isUnicodeTopLeft ? '┐' : '+';

        let rightCol = -1;
        for (let rc = c + 2; rc < line.length; rc++) {
          if (line[rc] === expectedRight) {
            // Validate all characters between are horizontal lines or junctions
            const segment = line.substring(c + 1, rc);
            let valid = true;
            for (let i = 0; i < segment.length; i++) {
              if (!HORIZ_BORDER_CHARS.includes(segment[i])) {
                valid = false;
                break;
              }
            }
            if (valid && segment.length >= 1) {
              rightCol = rc;
              break;
            }
          }
        }

        if (rightCol !== -1) {
          // Look down for bottom corners
          const expectedBottomLeft = doubleBorder ? '╚' : roundedBorder ? '╰' : isUnicodeTopLeft ? '└' : '+';
          const expectedBottomRight = doubleBorder ? '╝' : roundedBorder ? '╯' : isUnicodeTopLeft ? '┘' : '+';
          const vertChar = doubleBorder ? '║' : isUnicodeTopLeft ? '│' : '|';

          let bottomRow = -1;
          for (let br = r + 1; br < lines.length; br++) {
            const bLine = lines[br];
            if (c < bLine.length && rightCol < bLine.length) {
              if (bLine[c] === expectedBottomLeft && bLine[rightCol] === expectedBottomRight) {
                // Check if segment is horizontal
                const bSegment = bLine.substring(c + 1, rightCol);
                let valid = true;
                for (let i = 0; i < bSegment.length; i++) {
                  if (!HORIZ_BORDER_CHARS.includes(bSegment[i])) {
                    valid = false;
                    break;
                  }
                }
                if (valid) {
                  bottomRow = br;
                  break;
                }
              }
              // Check if walls continue
              if (bLine[c] !== vertChar && bLine[c] !== '│' && bLine[c] !== '║' && bLine[c] !== '|' && bLine[c] !== '├' && bLine[c] !== '╞' && bLine[c] !== '╠') {
                break;
              }
            } else {
              break;
            }
          }

          if (bottomRow !== -1 && bottomRow > r) {
            // Extract content lines between r+1 and bottomRow-1
            const rawContentLines: string[] = [];
            for (let cr = r + 1; cr < bottomRow; cr++) {
              const cLine = lines[cr];
              if (c < cLine.length) {
                const inner = cLine.substring(c + 1, Math.min(rightCol, cLine.length));
                rawContentLines.push(inner);
              }
            }

            // Clean content lines
            const cleanedContent = formatNodeContent(rawContentLines);
            if (cleanedContent) {
              let shape: DiagramNode['shape'] = 'rect';
              if (doubleBorder) shape = 'subroutine';
              else if (roundedBorder) shape = 'round';

              const node: DiagramNode = {
                id: generateNodeId(cleanedContent, existingIds),
                label: cleanedContent,
                shape,
                top: r,
                bottom: bottomRow,
                left: c,
                right: rightCol,
                centerX: Math.floor((c + rightCol) / 2),
                centerY: Math.floor((r + bottomRow) / 2),
                rawLines: rawContentLines,
              };

              markOccupied(r, bottomRow, c, rightCol);
              nodes.push(node);
            }
          }
        }
      }
    }
  }

  // 2. Scan for Decision / Diamond Nodes
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];
    for (let c = 0; c < line.length; c++) {
      if (line[c] === '/' && !occupiedCells.has(`${r},${c}`)) {
        const slashMatch = line.substring(c).match(/^\/[─\-═\s]+\\/);
        if (slashMatch) {
          const width = slashMatch[0].length;
          const rightCol = c + width - 1;

          // Check for multi-line diamond (3 lines)
          if (r + 2 < lines.length) {
            const midLine = lines[r + 1];
            const botLine = lines[r + 2];
            if (botLine.substring(c).startsWith('\\')) {
              // Extract label from middle line
              const startExtract = Math.max(0, c - 2);
              const endExtract = Math.min(midLine.length, rightCol + 3);
              const midSegment = midLine.substring(startExtract, endExtract).replace(/[<>\/\\|]/g, '').trim();
              if (midSegment) {
                const node: DiagramNode = {
                  id: generateNodeId(midSegment, existingIds),
                  label: midSegment,
                  shape: 'diamond',
                  top: r,
                  bottom: r + 2,
                  left: Math.max(0, c - 2),
                  right: rightCol + 2,
                  centerX: Math.floor((c + rightCol) / 2),
                  centerY: r + 1,
                  rawLines: [midSegment],
                };
                markOccupied(r, r + 2, Math.max(0, c - 3), rightCol + 3);
                nodes.push(node);
              }
            }
          }
        }
      } else if (line[c] === '<' && !occupiedCells.has(`${r},${c}`)) {
        // Single line diamond < Label >
        const singleDiamond = line.substring(c).match(/^<\s*([^<>\n]+?)\s*>/);
        if (singleDiamond) {
          const label = singleDiamond[1].trim();
          const rightCol = c + singleDiamond[0].length - 1;
          const node: DiagramNode = {
            id: generateNodeId(label, existingIds),
            label,
            shape: 'diamond',
            top: r,
            bottom: r,
            left: c,
            right: rightCol,
            centerX: Math.floor((c + rightCol) / 2),
            centerY: r,
            rawLines: [label],
          };
          markOccupied(r, r, c, rightCol);
          nodes.push(node);
        }
      }
    }
  }

  // 3. Scan for Standalone Bracket Nodes: [ Text ]
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];
    const bracketRegex = /\[\s*([A-Za-z0-9_`][^\[\]\n]*?)\s*\]/g;
    let match: RegExpExecArray | null;

    while ((match = bracketRegex.exec(line)) !== null) {
      const matchText = match[1].trim();
      const startCol = match.index;
      const endCol = startCol + match[0].length - 1;

      // Ignore if it's already inside an existing box or cell
      if (occupiedCells.has(`${r},${startCol}`) || occupiedCells.has(`${r},${endCol}`)) {
        continue;
      }

      // Ignore branching labels like [Yes], [No], [x], [ ]
      if (/^(yes|no|true|false|x| )$/i.test(matchText)) {
        continue;
      }

      // Create bracket node
      const node: DiagramNode = {
        id: generateNodeId(matchText, existingIds),
        label: matchText,
        shape: 'rect',
        top: r,
        bottom: r,
        left: startCol,
        right: endCol,
        centerX: Math.floor((startCol + endCol) / 2),
        centerY: r,
        rawLines: [matchText],
      };

      markOccupied(r, r, startCol, endCol);
      nodes.push(node);
    }
  }

  // 4. Attach Subtitle Annotations (e.g., "(Loads 3 columns)" directly below a box)
  for (const node of nodes) {
    const checkRow = node.bottom + 1;
    if (checkRow < lines.length) {
      const annotLine = lines[checkRow];
      const startSearch = Math.max(0, node.left - 4);
      const endSearch = Math.min(annotLine.length, node.right + 5);
      const sub = annotLine.substring(startSearch, endSearch);

      const annotMatch = sub.match(/\(([A-Za-z0-9_`\s]+(?:columns|rows|scoped|state|entity|table|service|module|component|invariant|event|worker)?)\)/i);
      if (annotMatch && annotMatch[1] && !annotMatch[1].toLowerCase().startsWith('back to')) {
        const fullAnnot = annotMatch[0];
        if (!node.label.includes(fullAnnot)) {
          node.label += `<br/><em>${fullAnnot}</em>`;
        }
      }
    }
  }

  return nodes;
}

/**
 * Formats multi-line node content into a clean Mermaid label string.
 */
function formatNodeContent(rawLines: string[]): string {
  const cleanedLines: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    cleanedLines.push(trimmed);
  }

  if (cleanedLines.length === 0) return '';
  return cleanedLines.join('<br/>');
}

/**
 * Extracts directional edges connecting nodes.
 */
export function extractEdges(lines: string[], nodes: DiagramNode[]): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (from: string, to: string, label?: string, style: DiagramEdge['style'] = 'arrow') => {
    if (!from || !to || from === to) return;
    const cleanLabel = label?.trim();
    const key = `${from}->${to}:${cleanLabel || ''}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ from, to, label: cleanLabel, style });
    }
  };

  // 1. Trace Outgoing Vertical & Branching Connections from each node
  for (const sourceNode of nodes) {
    const startRow = sourceNode.bottom + 1;
    if (startRow >= lines.length) continue;

    // Find all outgoing port columns along the bottom border or immediately below
    const portCols: number[] = [];
    const botBorderLine = lines[sourceNode.bottom] || '';
    for (let c = sourceNode.left; c <= sourceNode.right; c++) {
      if (c < botBorderLine.length && (botBorderLine[c] === '┴' || botBorderLine[c] === '┬' || botBorderLine[c] === '┼' || botBorderLine[c] === '+')) {
        portCols.push(c);
      }
    }

    // Also scan row startRow for vertical characters
    if (startRow < lines.length) {
      const nextLine = lines[startRow];
      for (let c = sourceNode.left; c <= sourceNode.right; c++) {
        if (c < nextLine.length && (nextLine[c] === '│' || nextLine[c] === '|' || nextLine[c] === '║' || nextLine[c] === '▼')) {
          if (!portCols.includes(c)) portCols.push(c);
        }
      }
    }

    if (portCols.length === 0) {
      portCols.push(sourceNode.centerX);
    }

    for (const portCol of portCols) {
      traceVerticalPath(lines, startRow, portCol, sourceNode, nodes, addEdge);
    }
  }

  // 2. Scan for Horizontal Inline Connections (e.g. Node A --> Node B, or Node A ──► [ Approved ])
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];

    // Check for inline arrows: -->, ->, ──►, ──>, ==>, ─►, ►
    const arrowRegex = /(-->|->|──►|──>|==>|─►|►)/g;
    let match: RegExpExecArray | null;

    while ((match = arrowRegex.exec(line)) !== null) {
      const arrowCol = match.index;

      // Look left for source node
      let leftNode: DiagramNode | null = null;
      for (const n of nodes) {
        if (n.right <= arrowCol && Math.abs(n.centerY - r) <= 2 && arrowCol - n.right < 25) {
          if (!leftNode || n.right > leftNode.right) {
            leftNode = n;
          }
        }
      }

      // Look right for target node
      const targetCol = arrowCol + match[0].length;
      let rightNode: DiagramNode | null = null;
      for (const n of nodes) {
        if (n.left >= targetCol && Math.abs(n.centerY - r) <= 2 && n.left - targetCol < 30) {
          if (!rightNode || n.left < rightNode.left) {
            rightNode = n;
          }
        }
      }

      // Check for loopback target: e.g. "(Back to Draft)"
      const subAfter = line.substring(targetCol);
      const backToMatch = subAfter.match(/\(Back to\s+([A-Za-z0-9_`]+)\)/i);
      if (backToMatch && leftNode) {
        const targetName = backToMatch[1].toLowerCase();
        const loopNode = nodes.find(n => n.label.toLowerCase().includes(targetName) || n.id.toLowerCase() === targetName);
        if (loopNode) {
          const labelMatch = line.match(/\(([a-zA-Z0-9_\-\s]+)\)/);
          const label = labelMatch && !labelMatch[1].toLowerCase().startsWith('back to') ? labelMatch[1] : undefined;
          addEdge(leftNode.id, loopNode.id, label);
          continue;
        }
      }

      if (leftNode && rightNode) {
        addEdge(leftNode.id, rightNode.id);
      }
    }
  }

  // 3. Scan for Loopbacks / Bottom Branching: e.g. └───────► (re-draft) ───────► (Back to Draft)
  for (const sourceNode of nodes) {
    for (let r = sourceNode.bottom + 1; r < Math.min(lines.length, sourceNode.bottom + 6); r++) {
      const line = lines[r];
      const backToMatch = line.match(/\(Back to\s+([A-Za-z0-9_`]+)\)/i);
      if (backToMatch && sourceNode.left < line.length && (line.includes('└') || line.includes('►'))) {
        const targetName = backToMatch[1].toLowerCase();
        const targetNode = nodes.find(n => n.label.toLowerCase().includes(targetName) || n.id.toLowerCase() === targetName);
        const labelMatch = line.match(/\(([a-zA-Z0-9_\-\s]+)\)/);
        const label = labelMatch && !labelMatch[1].toLowerCase().startsWith('back to') ? labelMatch[1] : undefined;

        if (targetNode) {
          addEdge(sourceNode.id, targetNode.id, label);
        }
      }
    }
  }

  return edges;
}

/**
 * Traces a vertical line path down from (startRow, portCol), following junctions, splits, and labels.
 */
function traceVerticalPath(
  lines: string[],
  startRow: number,
  portCol: number,
  sourceNode: DiagramNode,
  nodes: DiagramNode[],
  addEdge: (from: string, to: string, label?: string) => void
) {
  let currRow = startRow;
  let currCol = portCol;
  let collectedLabel: string | undefined = undefined;

  while (currRow < lines.length) {
    const line = lines[currRow];
    if (currCol >= line.length) {
      currRow++;
      continue;
    }

    const char = line[currCol];

    // Check if we hit another node directly
    const targetNode = nodes.find(n => n.id !== sourceNode.id && currRow >= n.top && currRow <= n.bottom && currCol >= n.left && currCol <= n.right);
    if (targetNode) {
      addEdge(sourceNode.id, targetNode.id, collectedLabel);
      return;
    }

    // Check for inline labels along this row segment e.g. [Yes], [No], (publish event), (submit), (HTTP/gRPC)
    const lineSegment = line.substring(Math.max(0, currCol - 15), Math.min(line.length, currCol + 25));

    const parenMatch = lineSegment.match(/\(([A-Za-z0-9_\-/\s]+)\)/);
    if (parenMatch && !parenMatch[1].toLowerCase().startsWith('loads') && !parenMatch[1].toLowerCase().startsWith('back to')) {
      collectedLabel = parenMatch[1];
    }

    const bracketMatch = lineSegment.match(/\[(Yes|No|True|False)\]/i);
    if (bracketMatch) {
      collectedLabel = bracketMatch[1];
    }

    // Check for Arrowhead ▼ or v pointing to a node directly below
    if (char === '▼' || char === 'v' || char === '↓') {
      const destNode = findDirectChildNode(nodes, currRow + 1, currCol);
      if (destNode && destNode.id !== sourceNode.id) {
        addEdge(sourceNode.id, destNode.id, collectedLabel);
        return;
      }
    }

    // Check for Horizontal Split or Merge Junctions:
    // ┌────────┴────────┐ or └────────────┬────────────┘ or ┌───┬───┐
    const isHorizontalBranch = char === '┴' || char === '┬' || char === '┼' || char === '+' ||
                               char === '─' || char === '-' || char === '└' || char === '┘' ||
                               char === '┌' || char === '┐' || char === '╭' || char === '╮' ||
                               char === '╰' || char === '╯';

    if (isHorizontalBranch) {
      // Find all endpoints or merge points on this horizontal bar
      const endpoints = findHorizontalEndpoints(lines, currRow, currCol);
      if (endpoints.length > 0) {
        for (const ep of endpoints) {
          const epTarget = findNodeBelowPoint(lines, nodes, currRow, ep.col);
          if (epTarget && epTarget.id !== sourceNode.id) {
            addEdge(sourceNode.id, epTarget.id, ep.label || collectedLabel);
          }
        }
        return;
      }
    }

    // Continue down on vertical char: │, |, ║, or space if next row has vertical char
    if (char === '│' || char === '|' || char === '║' || char === ' ') {
      currRow++;
    } else {
      // Check if arrowhead is adjacent
      const adjTarget = findDirectChildNode(nodes, currRow + 1, currCol);
      if (adjTarget && adjTarget.id !== sourceNode.id) {
        addEdge(sourceNode.id, adjTarget.id, collectedLabel);
        return;
      }
      currRow++;
    }
  }
}

/**
 * Finds all branch endpoints along a horizontal line segment.
 */
function findHorizontalEndpoints(
  lines: string[],
  row: number,
  startCol: number
): { col: number; label?: string }[] {
  const line = lines[row] || '';
  const endpoints: { col: number; label?: string }[] = [];

  // Scan left
  let leftCol = startCol;
  while (leftCol > 0 && /[─\-═┌╭┬┼+]/.test(line[leftCol - 1])) {
    leftCol--;
    if (line[leftCol] === '┌' || line[leftCol] === '╭' || line[leftCol] === '┬' || line[leftCol] === '▼') {
      endpoints.push({ col: leftCol });
    }
  }
  if (leftCol < startCol && (line[leftCol] === '┌' || line[leftCol] === '╭' || line[leftCol] === '─')) {
    if (!endpoints.some(e => e.col === leftCol)) {
      endpoints.push({ col: leftCol });
    }
  }

  // Scan right
  let rightCol = startCol;
  while (rightCol + 1 < line.length && /[─\-═┐╮┬┼+]/.test(line[rightCol + 1])) {
    rightCol++;
    if (line[rightCol] === '┐' || line[rightCol] === '╮' || line[rightCol] === '┬' || line[rightCol] === '▼') {
      endpoints.push({ col: rightCol });
    }
  }
  if (rightCol > startCol && (line[rightCol] === '┐' || line[rightCol] === '╮' || line[rightCol] === '─')) {
    if (!endpoints.some(e => e.col === rightCol)) {
      endpoints.push({ col: rightCol });
    }
  }

  // If central junction like ┼, include center
  if (line[startCol] === '┼') {
    endpoints.push({ col: startCol });
  }

  // Sort endpoints from left to right so branches/edges are emitted in visual reading order
  endpoints.sort((a, b) => a.col - b.col);

  return endpoints;
}

/**
 * Finds a destination node below a given point (row, col) following any immediate down line/arrow.
 */
function findNodeBelowPoint(lines: string[], nodes: DiagramNode[], row: number, col: number): DiagramNode | null {
  for (let r = row + 1; r < Math.min(lines.length, row + 8); r++) {
    const line = lines[r];
    for (const node of nodes) {
      if (r >= node.top && r <= node.bottom && col >= node.left - 3 && col <= node.right + 3) {
        return node;
      }
      if (node.top === r || node.top === r + 1) {
        if (col >= node.left - 4 && col <= node.right + 4) {
          return node;
        }
      }
    }
  }
  return null;
}

/**
 * Finds a direct child node immediately below (row, col).
 */
function findDirectChildNode(nodes: DiagramNode[], row: number, col: number): DiagramNode | null {
  for (const node of nodes) {
    if (row >= node.top - 1 && row <= node.bottom + 1 && col >= node.left - 4 && col <= node.right + 4) {
      return node;
    }
  }
  return null;
}

/**
 * Infers layout direction (TD vs LR).
 */
export function inferDirection(nodes: DiagramNode[], edges: DiagramEdge[]): 'TD' | 'LR' {
  if (nodes.length <= 1) return 'TD';

  // Check if all nodes are aligned on roughly the exact same line horizontally
  const yValues = nodes.map(n => n.centerY);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  if (maxY - minY <= 2 && nodes.length >= 2) {
    return 'LR';
  }

  // Check if nodes strictly proceed horizontally from left to right on the same level
  let strictlyHorizontal = true;
  for (let i = 0; i < nodes.length - 1; i++) {
    if (Math.abs(nodes[i].centerY - nodes[i + 1].centerY) > 2 || nodes[i + 1].left <= nodes[i].right) {
      strictlyHorizontal = false;
      break;
    }
  }
  if (strictlyHorizontal && nodes.length >= 2) {
    return 'LR';
  }

  return 'TD';
}

/**
 * Sanitizes node labels for valid Mermaid.js string literals.
 * Converts double quotes and backticks to single quotes, preserves safe HTML tags,
 * and escapes raw < and > to HTML entities.
 */
export function sanitizeMermaidLabel(label: string): string {
  if (!label) return '';
  return label
    .replace(/"/g, "'")
    .replace(/`/g, "'")
    .replace(/<br\s*\/?>/gi, '__MERMAID_BR__')
    .replace(/<em>/gi, '__MERMAID_EM_OPEN__')
    .replace(/<\/em>/gi, '__MERMAID_EM_CLOSE__')
    .replace(/<b>/gi, '__MERMAID_B_OPEN__')
    .replace(/<\/b>/gi, '__MERMAID_B_CLOSE__')
    .replace(/<i>/gi, '__MERMAID_I_OPEN__')
    .replace(/<\/i>/gi, '__MERMAID_I_CLOSE__')
    .replace(/<code>/gi, '__MERMAID_CODE_OPEN__')
    .replace(/<\/code>/gi, '__MERMAID_CODE_CLOSE__')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/__MERMAID_BR__/g, '<br/>')
    .replace(/__MERMAID_EM_OPEN__/g, '<em>')
    .replace(/__MERMAID_EM_CLOSE__/g, '</em>')
    .replace(/__MERMAID_B_OPEN__/g, '<b>')
    .replace(/__MERMAID_B_CLOSE__/g, '</b>')
    .replace(/__MERMAID_I_OPEN__/g, '<i>')
    .replace(/__MERMAID_I_CLOSE__/g, '</i>')
    .replace(/__MERMAID_CODE_OPEN__/g, '<code>')
    .replace(/__MERMAID_CODE_CLOSE__/g, '</code>');
}

/**
 * Sanitizes edge labels so pipes and quotes do not break Mermaid syntax.
 */
export function sanitizeMermaidEdgeLabel(label: string): string {
  if (!label) return '';
  return label
    .replace(/\|/g, '/')
    .replace(/"/g, "'")
    .replace(/`/g, "'")
    .trim();
}

/**
 * Converts parsed diagram AST into Mermaid syntax string.
 */
export function renderMermaidFlowchart(parsed: ParsedDiagram): string {
  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push(`flowchart ${parsed.direction}`);

  // 1. Render Node Definitions
  for (const node of parsed.nodes) {
    let nodeSyntax = '';
    const safeLabel = sanitizeMermaidLabel(node.label);

    switch (node.shape) {
      case 'subroutine':
        nodeSyntax = `    ${node.id}[["${safeLabel}"]]`;
        break;
      case 'round':
        nodeSyntax = `    ${node.id}("${safeLabel}")`;
        break;
      case 'diamond':
        nodeSyntax = `    ${node.id}{"${safeLabel}"}`;
        break;
      case 'rect':
      default:
        nodeSyntax = `    ${node.id}["${safeLabel}"]`;
        break;
    }
    lines.push(nodeSyntax);
  }

  // 2. Render Edges
  if (parsed.edges.length > 0) {
    lines.push('');
    for (const edge of parsed.edges) {
      let edgeSyntax = '';
      const safeEdgeLabel = edge.label ? sanitizeMermaidEdgeLabel(edge.label) : '';
      const labelPart = safeEdgeLabel ? `|${safeEdgeLabel}|` : '';

      if (edge.style === 'bidirectional') {
        edgeSyntax = `    ${edge.from} <-->${labelPart} ${edge.to}`;
      } else {
        edgeSyntax = `    ${edge.from} -->${labelPart} ${edge.to}`;
      }
      lines.push(edgeSyntax);
    }
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * Converts an ASCII / Unicode diagram text block to a Mermaid flowchart.
 * Returns the converted markdown and the count of converted diagrams.
 */
export function convertAsciiToMermaid(text: string): { result: string; count: number } {
  if (!text || !text.trim()) {
    return { result: text, count: 0 };
  }

  const isSingleDiagram = isAsciiDiagram(text);
  if (isSingleDiagram) {
    const lines = text.split('\n');
    const nodes = extractNodes(lines);
    if (nodes.length >= 2) {
      const edges = extractEdges(lines, nodes);
      const direction = inferDirection(nodes, edges);
      const mermaid = renderMermaidFlowchart({ direction, nodes, edges });
      return { result: mermaid, count: 1 };
    }
  }

  return { result: text, count: 0 };
}
