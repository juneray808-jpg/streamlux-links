#!/usr/bin/env node
/**
 * Verify live Android App Links hosting for streamlux.io.
 *
 * Usage:
 *   node scripts/verify-assetlinks.mjs
 *   node scripts/verify-assetlinks.mjs --require-play-signing
 */
const HOST = process.env.STREAMLUX_LINK_HOST?.replace(/\/$/, '') || 'https://streamlux.io';
const URL = `${HOST}/.well-known/assetlinks.json`;
const PACKAGE = 'com.terry.streamlux.io';
const KNOWN_UPLOAD_SHA256 =
  'BD:35:5A:78:14:EA:E8:2C:B7:AE:EC:EC:DA:61:C0:1B:FA:07:DA:92:4F:F5:E7:26:7F:3C:1D:1F:F6:8F:C5:97';

const requirePlaySigning = process.argv.includes('--require-play-signing');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`OK: ${message}`);
}

const res = await fetch(URL, {
  redirect: 'manual',
  headers: { Accept: 'application/json' },
});

if (res.status >= 300 && res.status < 400) {
  fail(`${URL} redirects (${res.status} → ${res.headers.get('location')}). Android App Link verification requires HTTP 200 with no redirect.`);
}
if (!res.ok) {
  fail(`${URL} returned HTTP ${res.status}`);
}
ok(`${URL} returns HTTP ${res.status}`);

const contentType = res.headers.get('content-type') || '';
if (!contentType.toLowerCase().includes('application/json')) {
  fail(`Content-Type is "${contentType}" (expected application/json)`);
}
ok(`Content-Type is ${contentType}`);

let body;
try {
  body = await res.json();
} catch (e) {
  fail(`Response is not valid JSON: ${e.message}`);
}

if (!Array.isArray(body) || body.length === 0) {
  fail('assetlinks.json must be a non-empty JSON array');
}

const statement = body[0];
const relation = statement?.relation;
const target = statement?.target;
const fingerprints = target?.sha256_cert_fingerprints;

if (!Array.isArray(relation) || !relation.includes('delegate_permission/common.handle_all_urls')) {
  fail('Missing relation delegate_permission/common.handle_all_urls');
}
if (target?.namespace !== 'android_app') {
  fail(`target.namespace must be android_app (got ${target?.namespace})`);
}
if (target?.package_name !== PACKAGE) {
  fail(`target.package_name must be ${PACKAGE} (got ${target?.package_name})`);
}
if (!Array.isArray(fingerprints) || fingerprints.length === 0) {
  fail('sha256_cert_fingerprints must be a non-empty array');
}
ok(`package_name is ${PACKAGE}`);
ok(`${fingerprints.length} SHA-256 fingerprint(s) present`);

const normalized = fingerprints.map((fp) => String(fp).trim().toUpperCase());
if (!normalized.includes(KNOWN_UPLOAD_SHA256)) {
  console.warn(
    `WARN: Upload-key fingerprint ${KNOWN_UPLOAD_SHA256} is not listed (sideload/internal APK builds may not verify).`,
  );
} else {
  ok('Upload-key fingerprint present');
}

if (fingerprints.length < 2) {
  const msg =
    'Only one SHA-256 fingerprint is configured. Play Store installs are signed with Google Play App Signing, so verification fails until the App signing key certificate SHA-256 is also listed.';
  if (requirePlaySigning) fail(msg);
  console.warn(`WARN: ${msg}`);
} else {
  ok('Multiple fingerprints configured (upload + Play app signing expected)');
}

const dalUrl = `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=${encodeURIComponent(HOST)}&relation=delegate_permission/common.handle_all_urls`;
const dalRes = await fetch(dalUrl);
if (!dalRes.ok) {
  console.warn(`WARN: Google Digital Asset Links API returned HTTP ${dalRes.status}`);
} else {
  const dal = await dalRes.json();
  const count = Array.isArray(dal.statements) ? dal.statements.length : 0;
  ok(`Google DAL API reports ${count} statement(s) for ${HOST}`);
}

console.log('\nVerification complete.');
