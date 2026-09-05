// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import mermaid from 'mermaid';
import { DIAGRAM_TEST_BED } from './fixtures/diagramTestBed';

beforeAll(() => {
  mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true });
});

describe('ASCII-to-Mermaid Test Bed Validation', () => {
  it('loads all test cases in the diagram test bed', () => {
    expect(DIAGRAM_TEST_BED.length).toBeGreaterThanOrEqual(10);
  });

  it('contains diverse diagram categories', () => {
    const categories = new Set(DIAGRAM_TEST_BED.map(t => t.category));
    expect(categories.has('architecture')).toBe(true);
    expect(categories.has('fan_out')).toBe(true);
    expect(categories.has('comparison')).toBe(true);
    expect(categories.has('pipeline')).toBe(true);
    expect(categories.has('decision')).toBe(true);
    expect(categories.has('event_driven')).toBe(true);
    expect(categories.has('state_machine')).toBe(true);
    expect(categories.has('layered')).toBe(true);
    expect(categories.has('negative_control')).toBe(true);
  });

  it('ensures all positive test cases have valid Mermaid flowchart syntax', () => {
    const positiveCases = DIAGRAM_TEST_BED.filter(t => t.expectedMermaid !== null);
    expect(positiveCases.length).toBeGreaterThanOrEqual(8);

    for (const testCase of positiveCases) {
      const mermaid = testCase.expectedMermaid!;
      expect(mermaid).toContain('```mermaid');
      expect(mermaid).toMatch(/flowchart (TD|LR)/);
      expect(mermaid).toContain('```');

      // Check node count in target mermaid matches metadata
      const nodeDefLines = mermaid
        .split('\n')
        .map(l => l.trim())
        .filter(line => /^[a-zA-Z0-9_]+(\[|\{|\(\[|\[\[|\()".*"(\]|\}|\)\]|\]\]|\))$/.test(line));
      expect(nodeDefLines.length).toBe(testCase.nodeCount);
    }
  });

  it('ensures negative controls specify null for expectedMermaid', () => {
    const negativeCases = DIAGRAM_TEST_BED.filter(t => t.category === 'negative_control');
    expect(negativeCases.length).toBeGreaterThanOrEqual(2);

    for (const neg of negativeCases) {
      expect(neg.expectedMermaid).toBeNull();
      expect(neg.nodeCount).toBe(0);
    }
  });

  describe('Diagram Converter Engine Execution', () => {
    for (const testCase of DIAGRAM_TEST_BED) {
      if (testCase.category === 'negative_control') {
        it(`correctly ignores negative control: ${testCase.name}`, async () => {
          const { convertAsciiToMermaid, isAsciiDiagram } = await import('../src/lib/diagramConverter');
          const isDiagram = isAsciiDiagram(testCase.ascii);
          const converted = convertAsciiToMermaid(testCase.ascii);

          expect(isDiagram).toBe(false);
          expect(converted.count).toBe(0);
          expect(converted.result).toBe(testCase.ascii);
        });
      } else {
        it(`correctly converts archetype: ${testCase.name}`, async () => {
          const { convertAsciiToMermaid, isAsciiDiagram } = await import('../src/lib/diagramConverter');
          const isDiagram = isAsciiDiagram(testCase.ascii);
          expect(isDiagram).toBe(true);

          const converted = convertAsciiToMermaid(testCase.ascii);
          expect(converted.count).toBe(1);
          expect(converted.result).toContain('```mermaid');
          expect(converted.result).toContain(`flowchart ${testCase.direction}`);

          // Verify node count matches expected
          const nodeDefLines = converted.result
            .split('\n')
            .map(l => l.trim())
            .filter(line => /^[a-zA-Z0-9_]+(\[|\{|\(\[|\[\[|\()".*"(\]|\}|\)\]|\]\]|\))$/.test(line));
          expect(nodeDefLines.length).toBe(testCase.nodeCount);

          // Verify Mermaid parse validity directly with Mermaid.js engine
          const rawMermaid = converted.result
            .replace(/^```mermaid\n/, '')
            .replace(/\n```$/, '');
          await expect(mermaid.parse(rawMermaid)).resolves.not.toThrow();
        });
      }
    }
  });

  describe('User Real-World ASCII Diagram Cases', () => {
    it('converts aggregate decomposition diagram with backticks and loads annotation to valid Mermaid', async () => {
      const { convertAsciiToMermaid } = await import('../src/lib/diagramConverter');
      const input = [
        '                  ┌─────────────────────────────────────┐',
        '                  │          `merchants` Table          │',
        '                  │ (Identity, KYC, Billing, Addresses) │',
        '                  └──────────────────┬──────────────────┘',
        '                                     │',
        '        ┌────────────────────────────┼────────────────────────────┐',
        '        ▼                            ▼                            ▼',
        '┌───────────────────┐      ┌────────────────────┐      ┌───────────────────┐',
        '│ MerchantRiskState │      │  MerchantPayout    │      │  MerchantProfile  │',
        '│ Aggregate         │      │  Aggregate         │      │  Aggregate        │',
        '│ • status          │      │  • bank_account_id │      │  • legal_name     │',
        '│ • risk_score      │      │  • payout_schedule │      │  • contact_email  │',
        '│ • held_reason     │      │  • auto_sweep      │      │  • dba_name       │',
        '└───────────────────┘      └────────────────────┘      └───────────────────┘',
        ' (Loads 3 columns)          (Loads 3 columns)           (Loads 3 columns)',
      ].join('\n');

      const converted = convertAsciiToMermaid(input);
      expect(converted.count).toBe(1);
      expect(converted.result).toContain('flowchart TD');
      expect(converted.result).toContain("'merchants' Table");
      expect(converted.result).not.toContain('`merchants`');

      const rawMermaid = converted.result
        .replace(/^```mermaid\n/, '')
        .replace(/\n```$/, '');
      await expect(mermaid.parse(rawMermaid)).resolves.not.toThrow();
    });

    it('converts architectural tension comparison diagram without creating a fake cross edge for vs.', async () => {
      const { convertAsciiToMermaid } = await import('../src/lib/diagramConverter');
      const input = [
        '       ┌────────────────────────────────────────────────────────┐',
        '       │                 THE ARCHITECTURAL TENSION              │',
        '       └───────────────────────────┬────────────────────────────┘',
        '                                   │',
        '         ┌─────────────────────────┴─────────────────────────┐',
        '         ▼                                                   ▼',
        '┌─────────────────────────────────┐       ┌─────────────────────────────────┐',
        '│       Domain Invariants         │       │       Storage Efficiency        │',
        '│ • Complete internal state       │  vs.  │ • Selective column projection   │',
        '│ • No undefined/null traps       │       │ • Index-Only scans (B-Tree)     │',
        '│ • Enforces business rules       │       │ • Minimal I/O and wire transfer │',
        '└─────────────────────────────────┘       └─────────────────────────────────┘',
      ].join('\n');

      const converted = convertAsciiToMermaid(input);
      expect(converted.count).toBe(1);
      expect(converted.result).toContain('flowchart TD');
      expect(converted.result).toContain('tension --> invariants');
      expect(converted.result).toContain('tension --> storage');
      expect(converted.result).not.toContain('<-->|vs.|');
      expect(converted.result).not.toContain('invariants <-->');

      const rawMermaid = converted.result
        .replace(/^```mermaid\n/, '')
        .replace(/\n```$/, '');
      await expect(mermaid.parse(rawMermaid)).resolves.not.toThrow();
    });
  });
});


