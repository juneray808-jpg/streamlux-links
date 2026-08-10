#!/usr/bin/env node
/**
 * Generate Digital Asset Links JSON for StreamLux Android App Links.
 *
 * Required for Play Store installs (Google Play App Signing):
 *   ANDROID_APP_SIGNING_KEY_SHA256 — Play Console → Protected with Play →
 *   Play app signing → App signing key certificate → SHA-256
 *
 * Optional (sideload / upload-key builds):
 *   ANDROID_UPLOAD_KEY_SHA256 — defaults to the known EAS upload key below.
 *
 * Usage:
 *   ANDROID_APP_SIGNING_KEY_SHA256='AA:BB:...' node scripts/generate-assetlinks.mjs > website/.well-known/assetlinks.json
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PACKAGE_NAME = 'com.terry.streamlux.io';
const DEFAULT_UPLOAD_SHA256 =
  'BD:35:5A:78:14:EA:E8:2C:B7:AE:EC:EC:DA:61:C0:1B:FA:07:DA:92:4F:F5:E7:26:7F:3C:1D:1F:F6:8F:C5:97';

const SHA256_RE = /^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/;

function normalizeFingerprint(raw, label) {
  const value = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!SHA256_RE.test(value)) {
    throw new Error(`Invalid ${label} SHA-256 fingerprint: ${raw}`);
  }
  return value;
}

const appSigning = process.env.ANDROID_APP_SIGNING_KEY_SHA256;
if (!appSigning) {
  console.error(
    'ERROR: ANDROID_APP_SIGNING_KEY_SHA256 is required.\n' +
      'Get it from Play Console → Protected with Play → Play app signing →\n' +
      'App signing key certificate → SHA-256 (or copy the Digital Asset Links JSON block).',
  );
  process.exit(1);
}

const upload =
  process.env.ANDROID_UPLOAD_KEY_SHA256?.trim() || DEFAULT_UPLOAD_SHA256;

const fingerprints = [
  normalizeFingerprint(appSigning, 'app signing key'),
  normalizeFingerprint(upload, 'upload key'),
].filter((fp, index, all) => all.indexOf(fp) === index);

const payload = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: PACKAGE_NAME,
      sha256_cert_fingerprints: fingerprints,
    },
  },
];

const json = `${JSON.stringify(payload, null, 2)}\n`;
const outArg = process.argv.find((a) => a.startsWith('--out='));
if (outArg) {
  const outPath = resolve(outArg.slice('--out='.length));
  writeFileSync(outPath, json, 'utf8');
  console.error(`Wrote ${outPath} (${fingerprints.length} fingerprint(s))`);
} else {
  process.stdout.write(json);
}
