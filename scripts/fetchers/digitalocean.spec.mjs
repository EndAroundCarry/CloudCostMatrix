import { describe, it, expect, vi } from 'vitest';

/**
 * Fixture mirroring the real pricing page's markup, including the two traps
 * this fetcher exists to defend against: the slug is percent-encoded in the
 * href (`size%3D`), and the $/hr column is deliberately ABOVE monthly/730.
 * Numbers are the genuine published prices.
 */
function row({ memory, vcpu, transfer, ssd, hourly, monthly, slug }) {
  return (
    `<tr class="SimpleTablestyles__StyledSimpleTableRow-x">` +
    `<td class="c">${memory}</td>` +
    `<td class="c">${vcpu}</td>` +
    `<td class="c">${transfer}</td>` +
    `<td class="c">1x</td>` +
    `<td class="c">${ssd}</td>` +
    `<td class="c">$${hourly}</td>` +
    `<td class="c"><a aria-disabled="false" class="btn" href="https://cloud.digitalocean.com/registrations/new?activation_redirect=%2Fdroplets%2Fnew%3Fsize%3D${slug}&amp;redirect_url=%2Fdroplets%2Fnew%3Fsize%3D${slug}">$<!-- -->${monthly}</a></td>` +
    `</tr>`
  );
}

const ROWS = [
  // Basic
  row({ memory: '1 GiB', vcpu: '1 vCPU', transfer: '1,000 GiB', ssd: '25 GiB', hourly: '0.00893', monthly: '6.00', slug: 's-1vcpu-1gb' }),
  row({ memory: '2 GiB', vcpu: '1 vCPU', transfer: '2,000 GiB', ssd: '50 GiB', hourly: '0.01786', monthly: '12.00', slug: 's-1vcpu-2gb' }),
  row({ memory: '2 GiB', vcpu: '2 vCPUs', transfer: '3,000 GiB', ssd: '60 GiB', hourly: '0.02679', monthly: '18.00', slug: 's-2vcpu-2gb' }),
  row({ memory: '4 GiB', vcpu: '2 vCPUs', transfer: '4,000 GiB', ssd: '80 GiB', hourly: '0.03571', monthly: '24.00', slug: 's-2vcpu-4gb' }),
  row({ memory: '4 GiB', vcpu: '2 vCPUs', transfer: '4,000 GiB', ssd: '80 GiB', hourly: '0.04167', monthly: '28.00', slug: 's-2vcpu-4gb-intel' }),
  row({ memory: '8 GiB', vcpu: '4 vCPUs', transfer: '5,000 GiB', ssd: '160 GiB', hourly: '0.07143', monthly: '48.00', slug: 's-4vcpu-8gb' }),
  row({ memory: '16 GiB', vcpu: '8 vCPUs', transfer: '6,000 GiB', ssd: '320 GiB', hourly: '0.14286', monthly: '96.00', slug: 's-8vcpu-16gb' }),
  // CPU-Optimized — note c-N slugs carry no memory, so it must come from the row.
  row({ memory: '4 GiB', vcpu: '2 vCPUs', transfer: '4,000 GiB', ssd: '25 GiB', hourly: '0.06250', monthly: '42.00', slug: 'c-2' }),
  row({ memory: '8 GiB', vcpu: '4 vCPUs', transfer: '5,000 GiB', ssd: '50 GiB', hourly: '0.12500', monthly: '84.00', slug: 'c-4' }),
  row({ memory: '16 GiB', vcpu: '8 vCPUs', transfer: '6,000 GiB', ssd: '100 GiB', hourly: '0.25000', monthly: '168.00', slug: 'c-8' }),
  row({ memory: '32 GiB', vcpu: '16 vCPUs', transfer: '7,000 GiB', ssd: '200 GiB', hourly: '0.50000', monthly: '336.00', slug: 'c-16' }),
  row({ memory: '64 GiB', vcpu: '32 vCPUs', transfer: '9,000 GiB', ssd: '400 GiB', hourly: '1.00000', monthly: '672.00', slug: 'c-32' }),
  row({ memory: '96 GiB', vcpu: '48 vCPUs', transfer: '11,000 GiB', ssd: '600 GiB', hourly: '1.50000', monthly: '1,008.00', slug: 'c-48' }),
  // General Purpose
  row({ memory: '8 GiB', vcpu: '2 vCPUs', transfer: '4,000 GiB', ssd: '25 GiB', hourly: '0.09375', monthly: '63.00', slug: 'g-2vcpu-8gb' }),
  row({ memory: '16 GiB', vcpu: '4 vCPUs', transfer: '5,000 GiB', ssd: '50 GiB', hourly: '0.18750', monthly: '126.00', slug: 'g-4vcpu-16gb' }),
  row({ memory: '32 GiB', vcpu: '8 vCPUs', transfer: '6,000 GiB', ssd: '100 GiB', hourly: '0.37500', monthly: '252.00', slug: 'g-8vcpu-32gb' }),
  row({ memory: '64 GiB', vcpu: '16 vCPUs', transfer: '7,000 GiB', ssd: '200 GiB', hourly: '0.75000', monthly: '504.00', slug: 'g-16vcpu-64gb' }),
  row({ memory: '128 GiB', vcpu: '32 vCPUs', transfer: '8,000 GiB', ssd: '400 GiB', hourly: '1.50000', monthly: '1,008.00', slug: 'g-32vcpu-128gb' }),
  row({ memory: '160 GiB', vcpu: '40 vCPUs', transfer: '9,000 GiB', ssd: '500 GiB', hourly: '1.87500', monthly: '1,260.00', slug: 'g-40vcpu-160gb' }),
  // Memory-Optimized
  row({ memory: '16 GiB', vcpu: '2 vCPUs', transfer: '4,000 GiB', ssd: '50 GiB', hourly: '0.12500', monthly: '84.00', slug: 'm-2vcpu-16gb' }),
  row({ memory: '32 GiB', vcpu: '4 vCPUs', transfer: '6,000 GiB', ssd: '100 GiB', hourly: '0.25000', monthly: '168.00', slug: 'm-4vcpu-32gb' }),
  row({ memory: '64 GiB', vcpu: '8 vCPUs', transfer: '7,000 GiB', ssd: '200 GiB', hourly: '0.50000', monthly: '336.00', slug: 'm-8vcpu-64gb' }),
  row({ memory: '128 GiB', vcpu: '16 vCPUs', transfer: '8,000 GiB', ssd: '400 GiB', hourly: '1.00000', monthly: '672.00', slug: 'm-16vcpu-128gb' }),
  row({ memory: '192 GiB', vcpu: '24 vCPUs', transfer: '9,000 GiB', ssd: '600 GiB', hourly: '1.50000', monthly: '1,008.00', slug: 'm-24vcpu-192gb' }),
  row({ memory: '256 GiB', vcpu: '32 vCPUs', transfer: '10,000 GiB', ssd: '800 GiB', hourly: '2.00000', monthly: '1,344.00', slug: 'm-32vcpu-256gb' }),
  // Excluded families: v5 (no monthly cap), Storage-Optimized, GPU.
  row({ memory: '4 GiB', vcpu: '2 vCPUs', transfer: '4,000 GiB', ssd: '30 GiB', hourly: '0.0529', monthly: '38.63', slug: 's5-2vcpu-4gb-30gb' }),
  row({ memory: '32 GiB', vcpu: '4 vCPUs', transfer: '6,000 GiB', ssd: '600 GiB', hourly: '0.38988', monthly: '262.00', slug: 'so-4vcpu-32gb' }),
  row({ memory: '20 GiB', vcpu: '1 vCPU', transfer: '2,000 GiB', ssd: '720 GiB', hourly: '0.7746', monthly: '565.44', slug: 'gpu-4000adax1-20gb' })
];

const PAGE = `<html><body><table>${ROWS.join('')}</table></body></html>`;
const TRUNCATED_PAGE = `<html><body><table>${ROWS.slice(0, 3).join('')}</table></body></html>`;

vi.mock('./shared.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchText: vi.fn().mockResolvedValue(PAGE) };
});

const { fetchDigitalOceanCatalog, __internal } = await import('./digitalocean.mjs');
const { parseDropletPricing, dedupeCandidates, familyFor } = __internal;

describe('digitalocean fetcher — the monthly-cap trap', () => {
  it('derives hourlyOnDemandLinux from monthly/730, not the inflated $/hr column', async () => {
    const catalog = await fetchDigitalOceanCatalog();
    const big = catalog.compute.find((c) => c.name === 'g-32vcpu-128gb');
    expect(big).toBeDefined();
    expect(big.hourlyOnDemandLinux).toBeCloseTo(1008 / 730, 4); // 1.3808
    expect(big.hourlyOnDemandLinux).not.toBeCloseTo(1.5, 2); // the page's $/hr column
  });

  it('parses the percent-encoded slug form (size%3D) the page actually uses', () => {
    const parsed = parseDropletPricing(PAGE);
    expect(parsed.some((p) => p.slug === 'g-32vcpu-128gb')).toBe(true);
  });

  it('reads memory from the row when the slug carries none (c-16)', () => {
    const parsed = parseDropletPricing(PAGE);
    const c16 = parsed.find((p) => p.slug === 'c-16');
    expect(c16.vCpu).toBe(16);
    expect(c16.ramGb).toBe(32);
    expect(c16.monthly).toBe(336);
  });
});

describe('digitalocean fetcher — envelope coverage', () => {
  it('spans 2 to 32 vCPU with 7 distinct shapes', async () => {
    const catalog = await fetchDigitalOceanCatalog();
    expect(catalog.compute).toHaveLength(7);
    expect(new Set(catalog.compute.map((c) => c.name)).size).toBe(7);
    expect(Math.min(...catalog.compute.map((c) => c.vCpu))).toBeLessThanOrEqual(2);
    expect(Math.max(...catalog.compute.map((c) => c.vCpu))).toBeGreaterThanOrEqual(32);
  });

  it('emits only the bundled-plan families, keeping the CPU-optimized story', async () => {
    const catalog = await fetchDigitalOceanCatalog();
    const families = new Set(catalog.compute.map((c) => c.family));
    expect(families).toContain('CPU-Optimized Droplet');
    expect(families).toContain('General Purpose Droplet');
    for (const row of catalog.compute) {
      expect(row.name).not.toMatch(/^(s5|g5|so|gpu|gd)-/);
    }
  });
});

describe('digitalocean fetcher — dedupe and family classification', () => {
  it('prefers the base Regular slug over a -intel Premium duplicate at the same shape', () => {
    const deduped = dedupeCandidates(parseDropletPricing(PAGE));
    const twoByFour = deduped.filter((c) => c.vCpu === 2 && c.ramGb === 4);
    expect(twoByFour).toHaveLength(1);
    expect(twoByFour[0].slug).toBe('s-2vcpu-4gb');
    expect(twoByFour[0].monthly).toBe(24);
  });

  it('classifies families by slug prefix and rejects non-bundled ones', () => {
    expect(familyFor('s-2vcpu-4gb')).toBe('Basic Droplet');
    expect(familyFor('c-16')).toBe('CPU-Optimized Droplet');
    expect(familyFor('g-32vcpu-128gb')).toBe('General Purpose Droplet');
    expect(familyFor('m-16vcpu-128gb')).toBe('Memory-Optimized Droplet');
    expect(familyFor('s5-2vcpu-4gb-30gb')).toBeNull();
    expect(familyFor('so-4vcpu-32gb')).toBeNull();
  });
});

describe('digitalocean fetcher — page-shape guard', () => {
  it('refuses to publish a catalog from a truncated/redesigned page', async () => {
    const { fetchText } = await import('./shared.mjs');
    fetchText.mockResolvedValueOnce(TRUNCATED_PAGE);
    await expect(fetchDigitalOceanCatalog()).rejects.toThrow(/too few plans|structure may have changed/);
  });
});

describe('digitalocean fetcher — egress allowance', () => {
  it('takes the bundled allowance from the reference plan and states the caveat', async () => {
    const catalog = await fetchDigitalOceanCatalog();
    expect(catalog.networking.bundledEgressGbPerInstance).toBe(5000); // g-4vcpu-16gb
    expect(catalog.networking.overageEgressPerGb).toBe(0.01);
    expect(catalog.networking.egressPolicyNote).toMatch(/pooled account-wide/i);
  });

  it('omits storage/database/kubernetes so mergeOverSeed keeps the seeded sections', async () => {
    const catalog = await fetchDigitalOceanCatalog();
    expect(catalog.storage).toBeUndefined();
    expect(catalog.database).toBeUndefined();
    expect(catalog.kubernetes).toBeUndefined();
    expect(catalog.provider).toBe('DIGITALOCEAN');
  });
});
