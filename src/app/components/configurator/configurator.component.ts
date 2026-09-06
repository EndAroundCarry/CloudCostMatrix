import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { ServiceCategory, SERVICE_CATEGORY_METAS } from '../../core/models/service-category.enum';
import { CommitmentType, DbEngine, OperatingSystem, StorageTier } from '../../core/models/pricing.model';

@Component({
  selector: 'app-configurator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSliderModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-xl backdrop-blur-md">
      
      <!-- Category Tabs & Activators -->
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 class="text-lg font-bold text-white tracking-tight m-0 flex items-center gap-2">
            <mat-icon class="text-blue-400">tune</mat-icon>
            <span>Infrastructure Spec Configurator</span>
          </h2>
          <p class="text-xs text-slate-400 m-0 mt-0.5">Customize workload specs to update the matrix dynamically.</p>
        </div>

        <!-- Commitment Pill Selector -->
        <div class="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <button 
            (click)="store.updateComputeCommitment('ON_DEMAND')"
            [class.bg-blue-600]="store.config().compute.commitment === 'ON_DEMAND'"
            [class.text-white]="store.config().compute.commitment === 'ON_DEMAND'"
            [class.text-slate-400]="store.config().compute.commitment !== 'ON_DEMAND'"
            class="px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer border-none">
            On-Demand
          </button>
          <button 
            (click)="store.updateComputeCommitment('1_YEAR_RESERVED')"
            [class.bg-blue-600]="store.config().compute.commitment === '1_YEAR_RESERVED'"
            [class.text-white]="store.config().compute.commitment === '1_YEAR_RESERVED'"
            [class.text-slate-400]="store.config().compute.commitment !== '1_YEAR_RESERVED'"
            class="px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer border-none">
            1-Yr Commit (~35% off)
          </button>
          <button 
            (click)="store.updateComputeCommitment('3_YEAR_RESERVED')"
            [class.bg-blue-600]="store.config().compute.commitment === '3_YEAR_RESERVED'"
            [class.text-white]="store.config().compute.commitment === '3_YEAR_RESERVED'"
            [class.text-slate-400]="store.config().compute.commitment !== '3_YEAR_RESERVED'"
            class="px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer border-none">
            3-Yr Commit (~60% off)
          </button>
        </div>
      </div>

      <!-- Service Selection Buttons -->
      <div class="flex flex-wrap gap-2 mb-6">
        @for (cat of categories; track cat) {
          @let isActive = store.config().activeCategories[cat];
          @let isCurrent = store.activeCategory() === cat;

          <div class="flex items-center rounded-xl bg-slate-800/60 border border-slate-700 p-1">
            <button
              type="button"
              (click)="store.setActiveCategory(cat)"
              [class.text-blue-400]="isCurrent"
              [class.text-slate-200]="!isCurrent"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-700/60 transition-colors border-none bg-transparent cursor-pointer">
              <mat-icon class="!text-sm">{{ categoryMetas[cat].icon }}</mat-icon>
              <span>{{ categoryMetas[cat].name.split('/')[0] }}</span>
            </button>

            <!-- Toggle include in TCO -->
            <button
              type="button"
              (click)="store.toggleCategory(cat)"
              [title]="isActive ? 'Exclude from TCO calculation' : 'Include in TCO calculation'"
              class="w-6 h-6 rounded-md flex items-center justify-center text-xs transition-colors border-none cursor-pointer"
              [class.text-emerald-400]="isActive"
              [class.bg-emerald-500/10]="isActive"
              [class.text-slate-500]="!isActive"
              [class.bg-slate-700/50]="!isActive">
              <mat-icon class="!text-xs">{{ isActive ? 'check' : 'close' }}</mat-icon>
            </button>
          </div>
        }
      </div>

      <!-- Dynamic Form by Category -->
      <div class="bg-slate-800/40 rounded-xl p-5 border border-slate-800">
        
        <!-- COMPUTE CONTROLS -->
        @if (store.activeCategory() === ServiceCategory.COMPUTE) {
          <div class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- vCPU Slider -->
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">
                  vCPUs per Instance: <span class="text-blue-400 font-extrabold text-sm">{{ store.config().compute.vCpu }}</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="32" 
                  step="1"
                  [value]="store.config().compute.vCpu" 
                  (input)="onVcpuChange($event)"
                  class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
              </div>

              <!-- RAM Slider -->
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">
                  RAM (GB): <span class="text-blue-400 font-extrabold text-sm">{{ store.config().compute.ramGb }} GB</span>
                </label>
                <input 
                  type="range" 
                  min="2" 
                  max="128" 
                  step="2"
                  [value]="store.config().compute.ramGb" 
                  (input)="onRamChange($event)"
                  class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
              </div>

              <!-- Instance Count -->
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">
                  Instance Count: <span class="text-blue-400 font-extrabold text-sm">{{ store.config().compute.count }}</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  step="1"
                  [value]="store.config().compute.count" 
                  (input)="onCountChange($event)"
                  class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
              </div>

              <!-- Operating System -->
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">Operating System</label>
                <select 
                  [value]="store.config().compute.os"
                  (change)="onOsChange($event)"
                  class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500">
                  <option value="LINUX">Linux (Ubuntu / Debian / Amazon Linux)</option>
                  <option value="WINDOWS">Windows Server (+ OS License Surcharge)</option>
                </select>
              </div>
            </div>
          </div>
        }

        <!-- STORAGE CONTROLS -->
        @if (store.activeCategory() === ServiceCategory.STORAGE) {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">
                Storage Capacity: <span class="text-blue-400 font-extrabold text-sm">{{ store.config().storage.capacityGb.toLocaleString() }} GB</span>
              </label>
              <input 
                type="range" 
                min="50" 
                max="20000" 
                step="50"
                [value]="store.config().storage.capacityGb" 
                (input)="onStorageCapacityChange($event)"
                class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
            </div>

            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">Storage Access Tier</label>
              <select 
                [value]="store.config().storage.tier"
                (change)="onStorageTierChange($event)"
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500">
                <option value="HOT">Standard / Hot (Frequent Access)</option>
                <option value="COOL">Cool / Infrequent Access (~50% cheaper)</option>
                <option value="COLD">Cold / Archive (~80% cheaper)</option>
                <option value="ARCHIVE">Deep Archive (Long-term backup)</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">Read Ops (Thousands / Mo)</label>
              <input 
                type="number" 
                min="0" 
                [value]="store.config().storage.readOpsThousands"
                (change)="onReadOpsChange($event)"
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500">
            </div>
          </div>
        }

        <!-- DATABASE CONTROLS -->
        @if (store.activeCategory() === ServiceCategory.DATABASE) {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">Database Engine</label>
              <select 
                [value]="store.config().database.engine"
                (change)="onDbEngineChange($event)"
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500">
                <option value="POSTGRES">PostgreSQL (Standard)</option>
                <option value="MYSQL">MySQL</option>
                <option value="SQL_SERVER">Microsoft SQL Server</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">
                Database Storage (SSD): <span class="text-blue-400 font-extrabold text-sm">{{ store.config().database.storageGb }} GB</span>
              </label>
              <input 
                type="range" 
                min="20" 
                max="5000" 
                step="20"
                [value]="store.config().database.storageGb" 
                (input)="onDbStorageChange($event)"
                class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
            </div>

            <div class="flex items-center">
              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                <input 
                  type="checkbox" 
                  [checked]="store.config().database.multiAz"
                  (change)="onMultiAzToggle($event)"
                  class="w-4 h-4 accent-blue-500 rounded">
                <span>Multi-AZ High Availability (2x Instances)</span>
              </label>
            </div>
          </div>
        }

        <!-- NETWORKING CONTROLS -->
        @if (store.activeCategory() === ServiceCategory.NETWORKING) {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">
                Outbound Internet Egress: <span class="text-blue-400 font-extrabold text-sm">{{ store.config().networking.egressGbPerMonth.toLocaleString() }} GB/mo</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="50000" 
                step="250"
                [value]="store.config().networking.egressGbPerMonth" 
                (input)="onEgressChange($event)"
                class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
            </div>

            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">
                Load Balancers: <span class="text-blue-400 font-extrabold text-sm">{{ store.config().networking.loadBalancersCount }}</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="1"
                [value]="store.config().networking.loadBalancersCount" 
                (input)="onLbChange($event)"
                class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
            </div>

            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">
                Static IPv4 Addresses: <span class="text-blue-400 font-extrabold text-sm">{{ store.config().networking.staticIpsCount }}</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="1"
                [value]="store.config().networking.staticIpsCount" 
                (input)="onIpChange($event)"
                class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
            </div>
          </div>
        }

        <!-- KUBERNETES CONTROLS -->
        @if (store.activeCategory() === ServiceCategory.KUBERNETES) {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">
                Kubernetes Clusters: <span class="text-blue-400 font-extrabold text-sm">{{ store.config().kubernetes.clustersCount }}</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="5" 
                step="1"
                [value]="store.config().kubernetes.clustersCount" 
                (input)="onK8sClustersChange($event)"
                class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
            </div>

            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">
                Worker Nodes per Cluster: <span class="text-blue-400 font-extrabold text-sm">{{ store.config().kubernetes.workerNodesPerCluster }}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="30" 
                step="1"
                [value]="store.config().kubernetes.workerNodesPerCluster" 
                (input)="onK8sNodesChange($event)"
                class="w-full accent-blue-500 cursor-pointer h-2 bg-slate-700 rounded-lg">
            </div>
          </div>
        }

      </div>
    </div>
  `
})
export class ConfiguratorComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly ServiceCategory = ServiceCategory;
  protected readonly categoryMetas = SERVICE_CATEGORY_METAS;
  protected readonly categories = [
    ServiceCategory.COMPUTE,
    ServiceCategory.STORAGE,
    ServiceCategory.DATABASE,
    ServiceCategory.NETWORKING,
    ServiceCategory.KUBERNETES
  ];

  onVcpuChange(e: Event) {
    this.store.updateComputeVcpu(Number((e.target as HTMLInputElement).value));
  }
  onRamChange(e: Event) {
    this.store.updateComputeRam(Number((e.target as HTMLInputElement).value));
  }
  onCountChange(e: Event) {
    this.store.updateComputeCount(Number((e.target as HTMLInputElement).value));
  }
  onOsChange(e: Event) {
    this.store.updateComputeOs((e.target as HTMLSelectElement).value as OperatingSystem);
  }

  onStorageCapacityChange(e: Event) {
    this.store.updateStorageCapacity(Number((e.target as HTMLInputElement).value));
  }
  onStorageTierChange(e: Event) {
    this.store.updateStorageTier((e.target as HTMLSelectElement).value as StorageTier);
  }
  onReadOpsChange(e: Event) {
    this.store.config.update(c => ({
      ...c,
      storage: { ...c.storage, readOpsThousands: Number((e.target as HTMLInputElement).value) }
    }));
  }

  onDbEngineChange(e: Event) {
    this.store.updateDatabaseEngine((e.target as HTMLSelectElement).value as DbEngine);
  }
  onDbStorageChange(e: Event) {
    this.store.updateDatabaseStorage(Number((e.target as HTMLInputElement).value));
  }
  onMultiAzToggle(e: Event) {
    this.store.updateDatabaseMultiAz((e.target as HTMLInputElement).checked);
  }

  onEgressChange(e: Event) {
    this.store.updateEgress(Number((e.target as HTMLInputElement).value));
  }
  onLbChange(e: Event) {
    this.store.updateLoadBalancers(Number((e.target as HTMLInputElement).value));
  }
  onIpChange(e: Event) {
    this.store.updateLoadBalancers(Number((e.target as HTMLInputElement).value));
  }

  onK8sClustersChange(e: Event) {
    this.store.updateK8sClusters(Number((e.target as HTMLInputElement).value));
  }
  onK8sNodesChange(e: Event) {
    this.store.updateK8sWorkerNodes(Number((e.target as HTMLInputElement).value));
  }
}
