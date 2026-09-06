import { Injectable } from '@angular/core';
import { ComparisonMatrixResult } from '../models/pricing.model';
import { CloudProvider } from '../models/cloud-provider.enum';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  /**
   * Generates a CSV file of the side-by-side comparison matrix and triggers download.
   */
  public exportCsv(matrix: ComparisonMatrixResult): void {
    const rows: string[][] = [
      ['CloudCostMatrix — Infrastructure Cost Comparison'],
      ['Workload Name', matrix.config.name],
      ['Generated At', new Date().toISOString()],
      [''],
      ['Provider', 'Monthly Total ($)', 'Annual Total ($)', '3-Year Total ($)'],
      [
        'AWS',
        matrix.providers[CloudProvider.AWS].monthlyTotal.toString(),
        matrix.providers[CloudProvider.AWS].annualTotal.toString(),
        matrix.providers[CloudProvider.AWS].threeYearTotal.toString()
      ],
      [
        'Azure',
        matrix.providers[CloudProvider.AZURE].monthlyTotal.toString(),
        matrix.providers[CloudProvider.AZURE].annualTotal.toString(),
        matrix.providers[CloudProvider.AZURE].threeYearTotal.toString()
      ],
      [
        'GCP',
        matrix.providers[CloudProvider.GCP].monthlyTotal.toString(),
        matrix.providers[CloudProvider.GCP].annualTotal.toString(),
        matrix.providers[CloudProvider.GCP].threeYearTotal.toString()
      ],
      [''],
      ['Service Category', 'Provider', 'Instance / Sizing', 'Monthly Cost ($)', 'Annual Cost ($)']
    ];

    for (const b of matrix.breakdowns) {
      rows.push([
        b.category,
        b.provider,
        b.instanceTypeOrTier,
        b.monthlyCost.toString(),
        b.annualCost.toString()
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cloudcostmatrix_${matrix.config.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
