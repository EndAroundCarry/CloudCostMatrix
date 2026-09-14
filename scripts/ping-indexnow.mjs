/**
 * Submits the deployed sitemap to IndexNow (Bing, Yandex, Seznam, Naver) after a
 * deploy, so new pages do not wait for the next organic crawl.
 *
 * IndexNow needs no account: the key file lives at the site root and proves
 * ownership. The key is whatever `public/<key>.txt` is named and contains —
 * discovered here rather than duplicated in this script or the workflow, so
 * rotating it means renaming one file.
 *
 * Usage:
 *   node scripts/ping-indexnow.mjs            # posts the sitemap's URLs
 *   node scripts/ping-indexnow.mjs --dry-run  # prints what it would submit
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://cloudcostmatrix.com';
const HOST = 'cloudcostmatrix.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** The sitemap is written to dist by the build and committed to public/; prefer the built one. */
export function findSitemap(root = process.cwd()) {
  const candidates = [
    path.join(root, 'dist', 'CloudCostMatrix', 'browser', 'sitemap.xml'),
    path.join(root, 'public', 'sitemap.xml')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

/** The IndexNow key is the name of the `<32 hex chars>.txt` file in public/. */
export function findIndexNowKey(publicDir) {
  if (!fs.existsSync(publicDir)) return null;
  const keyFile = fs
    .readdirSync(publicDir)
    .find((name) => /^[a-z0-9]{8,128}\.txt$/i.test(name) && /^[a-f0-9]{8,128}$/i.test(name.replace(/\.txt$/i, '')));
  return keyFile ? keyFile.replace(/\.txt$/i, '') : null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const root = process.cwd();

  const sitemapPath = findSitemap(root);
  if (!sitemapPath) {
    console.error('❌ No sitemap found — run `npm run build` (or commit public/sitemap.xml) first.');
    process.exit(1);
  }

  const key = findIndexNowKey(path.join(root, 'public'));
  if (!key) {
    console.error('❌ No IndexNow key file found in public/ (expected <32 hex chars>.txt).');
    process.exit(1);
  }

  const urls = sitemapUrls(fs.readFileSync(sitemapPath, 'utf8'));
  if (urls.length === 0) {
    console.error(`❌ ${sitemapPath} contains no URLs.`);
    process.exit(1);
  }

  const payload = {
    host: HOST,
    key,
    keyLocation: `${SITE}/${key}.txt`,
    urlList: urls
  };

  if (dryRun) {
    console.log(`ℹ️  Dry run — would submit ${urls.length} URL(s) with key ${key}:`);
    for (const url of urls.slice(0, 5)) console.log(`   ${url}`);
    if (urls.length > 5) console.log(`   … and ${urls.length - 5} more`);
    return;
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });

  // IndexNow answers 200 (accepted) or 202 (accepted, key validation pending).
  if (response.status === 200 || response.status === 202) {
    console.log(`✅ IndexNow accepted ${urls.length} URL(s) for submission (HTTP ${response.status}).`);
    return;
  }

  console.error(`❌ IndexNow rejected the submission: HTTP ${response.status} ${await response.text()}`);
  process.exit(1);
}

// Only run when executed directly, so the helpers above stay importable by specs.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`❌ IndexNow submission failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  });
}
