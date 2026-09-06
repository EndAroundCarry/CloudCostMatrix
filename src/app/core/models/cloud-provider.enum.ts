export enum CloudProvider {
  AWS = 'AWS',
  AZURE = 'AZURE',
  GCP = 'GCP'
}

export interface ProviderMeta {
  id: CloudProvider;
  name: string;
  shortName: string;
  primaryColor: string;
  badgeBg: string;
  badgeBorder: string;
  icon: string;
  headline: string;
}

export const PROVIDER_METAS: Record<CloudProvider, ProviderMeta> = {
  [CloudProvider.AWS]: {
    id: CloudProvider.AWS,
    name: 'Amazon Web Services',
    shortName: 'AWS',
    primaryColor: '#FF9900',
    badgeBg: 'rgba(255, 153, 0, 0.1)',
    badgeBorder: '#FF9900',
    icon: 'cloud_queue',
    headline: 'Market leader with broad services and reserved instances.'
  },
  [CloudProvider.AZURE]: {
    id: CloudProvider.AZURE,
    name: 'Microsoft Azure',
    shortName: 'Azure',
    primaryColor: '#0078D4',
    badgeBg: 'rgba(0, 120, 212, 0.1)',
    badgeBorder: '#0078D4',
    icon: 'window',
    headline: 'Enterprise standard with Azure Hybrid Benefit and deep Windows integration.'
  },
  [CloudProvider.GCP]: {
    id: CloudProvider.GCP,
    name: 'Google Cloud Platform',
    shortName: 'GCP',
    primaryColor: '#4285F4',
    badgeBg: 'rgba(66, 133, 244, 0.1)',
    badgeBorder: '#4285F4',
    icon: 'hub',
    headline: 'Pioneer in Kubernetes, big data, custom machine types and sustained use discounts.'
  }
};
