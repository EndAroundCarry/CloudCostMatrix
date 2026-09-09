import { Injectable } from '@angular/core';
import { ComparisonMatrixResult, ServiceCostBreakdown } from '../models/pricing.model';
import { CloudProvider, PROVIDER_METAS } from '../models/cloud-provider.enum';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  /**
   * Generates a CSV file of the side-by-side comparison matrix and triggers download.
   */
  public exportCsv(matrix: ComparisonMatrixResult): void {
    const providers = matrix.selectedProviders;
    const rows: string[][] = [
      ['CloudCostMatrix — Infrastructure Cost Comparison'],
      ['Workload Name', matrix.config.name],
      ['Generated At', new Date().toISOString()],
      [''],
      ['Provider', 'Monthly Total ($)', 'Annual Total ($)', '3-Year Total ($)', 'Coverage Gap'],
      ...providers.map((p) => [
        PROVIDER_METAS[p].shortName,
        matrix.providers[p].monthlyTotal.toString(),
        matrix.providers[p].annualTotal.toString(),
        matrix.providers[p].threeYearTotal.toString(),
        matrix.providers[p].hasCoverageGap ? 'Yes — not ranked' : ''
      ]),
      [''],
      ['Service Category', 'Provider', 'Instance / Sizing', 'Monthly Cost ($)', 'Annual Cost ($)']
    ];

    for (const b of matrix.breakdowns) {
      if (!providers.includes(b.provider)) continue;
      rows.push([b.category, b.provider, b.instanceTypeOrTier, b.monthlyCost.toString(), b.annualCost.toString()]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cloudcostmatrix_${matrix.config.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Formatted monospace summary for Slack / Teams. Bold-winner metrics,
   * monthly TCO per provider, and the share link.
   */
  public buildSlackSummary(matrix: ComparisonMatrixResult, shareUrl: string): string {
    const winner = matrix.cheapestMonthlyProvider;
    // The genuinely most expensive selected provider — not just "the first
    // non-winner in key order", which understated savings before this field
    // was threaded through from the engine.
    const loser = matrix.mostExpensiveMonthlyProvider;

    const lines: string[] = [];
    lines.push(`*CloudCostMatrix — TCO Estimate: ${matrix.config.name}*`);
    lines.push('');
    lines.push(`:trophy: *Lowest TCO: ${PROVIDER_METAS[winner].shortName}* at ` +
      `*$${matrix.providers[winner].monthlyTotal.toLocaleString()}/mo*`);
    if (loser && loser !== winner) {
      const diff = matrix.providers[loser].monthlyTotal - matrix.providers[winner].monthlyTotal;
      lines.push(`:money_with_wings: Saves *$${diff.toLocaleString()}/mo* vs ${PROVIDER_METAS[loser].shortName} ` +
        `($${(diff * 12).toLocaleString()}/yr)`);
    }
    lines.push('');
    lines.push('```');
    for (const p of matrix.selectedProviders) {
      const total = matrix.providers[p];
      const gapFlag = total.hasCoverageGap ? '  (coverage gap — not ranked)' : '';
      lines.push(
        `${PROVIDER_METAS[p].shortName.padEnd(14)} $${total.monthlyTotal.toLocaleString().padStart(10)}/mo  ` +
          `$${total.annualTotal.toLocaleString().padStart(12)}/yr  ` +
          `$${total.threeYearTotal.toLocaleString().padStart(14)}/3yr${gapFlag}`
      );
    }
    lines.push('```');
    lines.push('');
    lines.push(`Full interactive breakdown: ${shareUrl}`);
    return lines.join('\n');
  }

  /**
   * GitHub-flavored Markdown RFC table — paste into PRs, ADRs, Notion.
   */
  public buildMarkdownRfc(matrix: ComparisonMatrixResult): string {
    const providers = matrix.selectedProviders;
    const md: string[] = [];
    md.push(`## Cloud Cost RFC: ${matrix.config.name}`);
    md.push('');
    md.push(`> Generated with [CloudCostMatrix](https://cloudcostmatrix.com) — free multi-cloud TCO estimator.`);
    md.push('');
    md.push(`### Provider Summary (USD)`);
    md.push('');
    md.push('| Provider | Monthly TCO | Annual TCO | 3-Year TCO | Savings vs Max |');
    md.push('| --- | ---: | ---: | ---: | ---: |');
    const maxMonthly = Math.max(...providers.map((p) => matrix.providers[p].monthlyTotal));
    for (const p of providers) {
      const t = matrix.providers[p];
      const savings = maxMonthly - t.monthlyTotal;
      const gapNote = t.hasCoverageGap ? ' *(coverage gap)*' : '';
      md.push(
        `| **${PROVIDER_METAS[p].name}**${gapNote} | $${t.monthlyTotal.toLocaleString()} | $${t.annualTotal.toLocaleString()} | ` +
          `$${t.threeYearTotal.toLocaleString()} | $${savings.toLocaleString()}/mo |`
      );
    }
    md.push('');
    md.push(`**Verdict:** The lowest-TCO provider is **${PROVIDER_METAS[matrix.cheapestMonthlyProvider].shortName}** ` +
      `at $${matrix.providers[matrix.cheapestMonthlyProvider].monthlyTotal.toLocaleString()}/mo ` +
      `($${matrix.annualMaxSavings.toLocaleString()}/yr saved vs the most expensive comparable option).`);
    md.push('');
    md.push('### Line-Item Breakdown');
    md.push('');
    md.push(`| Service | ${providers.map((p) => PROVIDER_METAS[p].shortName).join(' | ')} |`);
    md.push(`| --- | ${providers.map(() => '---').join(' | ')} |`);
    const categories = [...new Set(matrix.breakdowns.map((b) => b.category))];
    for (const cat of categories) {
      const byProvider = (p: CloudProvider) =>
        matrix.breakdowns.find((b) => b.category === cat && b.provider === p);
      md.push(`| **${cat}** | ${providers.map((p) => fmtCell(byProvider(p))).join(' | ')} |`);
    }
    md.push('');
    md.push('### Architecture Spec');
    md.push('');
    md.push('```json');
    md.push(JSON.stringify(matrix.config, null, 2));
    md.push('```');
    return md.join('\n');
  }

  /**
   * Injects a temporary print stylesheet tuned for an executive 2-page brief,
   * then opens the print dialog (Ctrl+P → "Save as PDF").
   */
  public printExecutivePdf(matrix: ComparisonMatrixResult): void {
    if (typeof window === 'undefined') return;

    const styleId = 'ccm-print-styles';
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: letter portrait; margin: 0.6in; }
        body { background: #fff !important; color: #0f172a !important; font-family: 'Inter', Arial, sans-serif; }
        app-header, footer, app-hero, app-matrix-table, app-configurator, app-recommendations,
        app-tco-chart, app-cost-topology, app-saved-estimates-modal, app-architecture-diff-modal,
        app-export-share-modal, app-provider-picker, button, .no-print { display: none !important; }
        #ccm-print-brief { display: block !important; }
        #ccm-print-brief h1 { font-size: 22pt; color: #0b1120; margin: 0 0 2pt; }
        #ccm-print-brief .sub { color: #475569; font-size: 10pt; margin-bottom: 14pt; }
        #ccm-print-brief h2 { font-size: 13pt; color: #0b1120; border-bottom: 2px solid #1d4ed8; padding-bottom: 3pt; margin: 18pt 0 8pt; }
        #ccm-print-brief table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
        #ccm-print-brief th, #ccm-print-brief td { border: 1px solid #cbd5e1; padding: 4pt 6pt; text-align: left; }
        #ccm-print-brief th { background: #eef2ff; }
        #ccm-print-brief .winner { color: #059669; font-weight: 800; }
        #ccm-print-brief .muted { color: #64748b; font-size: 8.5pt; }
        #ccm-print-brief .savings-box { border: 2px solid #059669; background: #ecfdf5; border-radius: 8pt; padding: 10pt; margin: 12pt 0; }
      }
    `;
    document.head.appendChild(style);

    const brief = document.createElement('div');
    brief.id = 'ccm-print-brief';
    brief.style.display = 'none';
    brief.innerHTML = this.executiveBriefHtml(matrix);
    document.body.appendChild(brief);

    // Let the stylesheet apply, then print.
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        brief.remove();
        document.getElementById(styleId)?.remove();
      }, 400);
    }, 120);
  }

  private executiveBriefHtml(matrix: ComparisonMatrixResult): string {
    const providers = matrix.selectedProviders;
    const rows = providers
      .map((p) => {
        const t = matrix.providers[p];
        const meta = PROVIDER_METAS[p];
        const isWinner = matrix.cheapestMonthlyProvider === p;
        const note = t.hasCoverageGap ? 'Coverage gap — not ranked' : isWinner ? 'Lowest TCO' : '';
        return `<tr>
          <td>${meta.name}${isWinner ? ' ★' : ''}</td>
          <td>$${t.monthlyTotal.toLocaleString()}</td>
          <td>$${t.annualTotal.toLocaleString()}</td>
          <td>$${t.threeYearTotal.toLocaleString()}</td>
          <td class="${isWinner ? 'winner' : 'muted'}">${note}</td>
        </tr>`;
      })
      .join('');

    const breakdown = matrix.breakdowns
      .filter((b) => providers.includes(b.provider))
      .map(
        (b: ServiceCostBreakdown) => `<tr>
          <td>${b.category}</td><td>${PROVIDER_METAS[b.provider].shortName}</td>
          <td>${b.instanceTypeOrTier}</td><td style="text-align:right">${b.supported ? '$' + b.monthlyCost.toLocaleString() : 'Not offered'}</td>
        </tr>`
      )
      .join('');

    const w = matrix.providers[matrix.cheapestMonthlyProvider];
    const liveSources = ['AWS', 'AZURE', 'GCP', 'ORACLE', 'IBM', 'DIGITALOCEAN', 'ALIBABA', 'LINODE', 'OVHCLOUD']
      .filter((p) => providers.map(String).includes(p))
      .map((p) => PROVIDER_METAS[p as CloudProvider].shortName);
    return `
      <h1>Cloud Infrastructure TCO Executive Brief</h1>
      <div class="sub">Workload: ${matrix.config.name} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString()} &nbsp;·&nbsp; CloudCostMatrix.com</div>

      <div class="savings-box">
        <strong>Executive Summary:</strong> ${PROVIDER_METAS[matrix.cheapestMonthlyProvider].name} delivers the lowest total cost of ownership at
        <strong>$${w.monthlyTotal.toLocaleString()}/month ($${w.annualTotal.toLocaleString()}/year)</strong>.
        Switching from the most expensive comparable provider saves approximately
        <strong>$${matrix.annualMaxSavings.toLocaleString()} per year</strong> (${matrix.monthlyMaxSavingsPercent}%).
      </div>

      <h2>Provider Cost Comparison</h2>
      <table>
        <thead><tr><th>Provider</th><th>Monthly TCO</th><th>Annual TCO</th><th>3-Year TCO</th><th>Notes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <h2>Service Cost Breakdown (Monthly)</h2>
      <table>
        <thead><tr><th>Category</th><th>Provider</th><th>Instance / Sizing</th><th style="text-align:right">Cost</th></tr></thead>
        <tbody>${breakdown}</tbody>
      </table>

      <div class="muted" style="margin-top:14pt">Prices reflect public list pricing — synced live from ${liveSources.join(', ') || 'benchmark seed data'} where available, benchmark seed data otherwise. Estimates are directional — actual invoices depend on region, commitments, and negotiated enterprise discounts.</div>
    `;
  }
}

function fmtCell(bd: ServiceCostBreakdown | undefined): string {
  if (!bd) return '—';
  if (!bd.supported) return 'Not offered';
  return `$${bd.monthlyCost.toLocaleString()}/mo (${bd.instanceTypeOrTier})`;
}
