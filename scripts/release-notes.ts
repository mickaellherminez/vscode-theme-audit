// Prints the notes of a release: the section of CHANGELOG.md for that version, without its heading. The release
// workflow (.github/workflows/release.yml) gives them to the GitHub release.
//
//   node scripts/release-notes.ts <version> [CHANGELOG.md]
//
// It stops with an error when the CHANGELOG has no section for the version, or when the section is empty, so that a
// release cannot go out without its notes.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The section of a CHANGELOG in the format of Keep a Changelog for one version: the lines after its heading
 * (`## [0.1.0] - 2026-11-22`), up to the next heading of the same level, without the blank lines around them.
 */
export function releaseNotes(changelog: string, version: string): string {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1) throw new Error(`CHANGELOG.md has no section for version ${version}`);
  const next = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  const notes = lines.slice(start + 1, next === -1 ? undefined : next).join('\n').trim();
  if (notes.length === 0) throw new Error(`The section of version ${version} in CHANGELOG.md is empty`);
  return notes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [version, file = 'CHANGELOG.md'] = process.argv.slice(2);
  if (version === undefined) {
    process.stderr.write('Usage: node scripts/release-notes.ts <version> [CHANGELOG.md]\n');
    process.exit(2);
  }
  try {
    process.stdout.write(releaseNotes(readFileSync(file, 'utf8'), version) + '\n');
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
