import { Component, input } from '@angular/core';
import { ProviderTableRow } from './provider-pages.data';

/**
 * A label/value/note table — the shape every derived section on a provider page
 * takes (storage tiers, database engines, networking, Kubernetes). Kept as its
 * own component so the four sections cannot drift apart visually.
 */
@Component({
  selector: 'app-provider-table',
  standalone: true,
  template: `
    <div class="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
      <table class="w-full text-left text-xs border-collapse">
        <tbody class="divide-y divide-slate-800/60">
          @for (row of rows(); track row.label) {
            <tr>
              <th scope="row" class="py-3 px-4 align-top font-semibold text-white w-1/3">{{ row.label }}</th>
              <td class="py-3 px-4 text-slate-200">
                <div>{{ row.value }}</div>
                @if (row.note) {
                  <div class="mt-1 text-[11px] text-slate-500 leading-relaxed">{{ row.note }}</div>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class ProviderTableComponent {
  readonly rows = input.required<ProviderTableRow[]>();
}
