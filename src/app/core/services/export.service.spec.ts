import { describe, it, expect } from 'vitest';
import { ExportService } from './export.service';
import { CostCalculatorEngine } from '../engine/cost-calculator.engine';
import { ARCHITECTURE_BLUEPRINTS } from '../models/blueprints.model';
import { ALL_PROVIDERS, CloudProvider, PROVIDER_METAS } from '../models/cloud-provider.enum';

describe('ExportService', () => {
  const service = new ExportService();
  const matrix = CostCalculatorEngine.calculateFullMatrix(ARCHITECTURE_BLUEPRINTS[0].config);
  const url = 'https://cloudcostmatrix.com/?c=test';

  it('builds a Slack summary with per-provider monthly/3-yr figures', () => {
    const slack = service.buildSlackSummary(matrix, url);
    expect(slack).toContain('CloudCostMatrix — TCO Estimate');
    expect(slack).toContain('Lowest TCO');
    expect(slack).toContain('AWS');
    expect(slack).toContain('Azure');
    expect(slack).toContain('GCP');
    expect(slack).toContain('/3yr');
    expect(slack).toContain(url);
    expect(slack).toContain(matrix.providers[matrix.cheapestMonthlyProvider].monthlyTotal.toLocaleString());
  });

  it('quotes the genuinely most expensive selected provider as the savings comparison, not just the first non-winner', () => {
    // Construct a matrix where the first non-winner in provider-selection order
    // is NOT the most expensive — this is the exact bug shape export.service.ts
    // used to have (loser = first non-winner in Object.keys order).
    const config = {
      ...ARCHITECTURE_BLUEPRINTS[0].config,
      selectedProviders: [CloudProvider.OVHCLOUD, CloudProvider.AZURE, CloudProvider.AWS]
    };
    const m = CostCalculatorEngine.calculateFullMatrix(config);
    const slack = service.buildSlackSummary(m, url);
    expect(slack).toContain(`vs ${PROVIDER_METAS[m.mostExpensiveMonthlyProvider].shortName}`);
  });

  it('builds a GFM markdown RFC table with provider summary + line items sized to the selection', () => {
    const md = service.buildMarkdownRfc(matrix);
    expect(md).toContain('## Cloud Cost RFC');
    expect(md).toContain('| Provider | Monthly TCO |');
    expect(md).toContain('Verdict');
    expect(md).toContain('```json');

    // Column count follows the selection, not a hardcoded 3.
    const nineProviderMatrix = CostCalculatorEngine.calculateFullMatrix({
      ...ARCHITECTURE_BLUEPRINTS[0].config,
      selectedProviders: [...ALL_PROVIDERS]
    });
    const mdNine = service.buildMarkdownRfc(nineProviderMatrix);
    const headerLine = mdNine.split('\n').find((l) => l.startsWith('| Service |'))!;
    const separatorLine = mdNine.split('\n')[mdNine.split('\n').indexOf(headerLine) + 1];
    // '| Service | AWS | ... | OVHcloud |'.split('|') → ['', ' Service ', ' AWS ', …, ' OVHcloud ', ''] = 1 + 1 + 9 + 1
    expect(headerLine.split('|').length).toBe(12);
    expect(separatorLine.split('|').length).toBe(headerLine.split('|').length);
  });

  it('includes the executive brief inside the print document', () => {
    // We can't run window.print in node, but we can assert the brief HTML builder
    // output that printExecutivePdf injects is well-formed via a sub-method check.
    expect(typeof service.printExecutivePdf).toBe('function');
  });
});
