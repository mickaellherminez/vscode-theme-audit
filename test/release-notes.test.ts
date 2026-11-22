import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { releaseNotes } from '../scripts/release-notes.ts';

const CHANGELOG = `# Changelog

## [Unreleased]

## [0.2.0] - 2026-12-01

### Added
- Two.

## [0.1.0] - 2026-11-22

### Added
- One.
`;

test('the notes of a version are its section, without its heading', () => {
  assert.equal(releaseNotes(CHANGELOG, '0.2.0'), '### Added\n- Two.');
  assert.equal(releaseNotes(CHANGELOG, '0.1.0'), '### Added\n- One.');
});

test('a version without a section, or with an empty one, is an error', () => {
  assert.throws(() => releaseNotes(CHANGELOG, '0.3.0'), /no section for version 0\.3\.0/);
  assert.throws(() => releaseNotes(CHANGELOG, 'Unreleased'), /is empty/);
  // 0.1.0 is not 0.1.0-beta: the heading must name the version exactly, up to its bracket
  assert.throws(() => releaseNotes(CHANGELOG, '0.1'), /no section/);
});

test('each released version of the CHANGELOG of the package has notes', () => {
  const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  for (const [, version = ''] of changelog.matchAll(/^## \[(\d+\.\d+\.\d+[^\]]*)\]/gm)) {
    assert.match(releaseNotes(changelog, version), /^### /, version);
  }
});
