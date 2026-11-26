<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/readme-banner-dark.svg">
    <img src=".github/assets/readme-banner-light.svg" alt="vscode-theme-audit: accessibility audit for Visual Studio Code color themes" width="640">
  </picture>
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/vscode-theme-audit"><img alt="npm version" src="https://img.shields.io/npm/v/vscode-theme-audit?color=0B7F7A"></a>
  <a href="https://github.com/mickaellherminez/vscode-theme-audit/actions/workflows/ci.yml?query=branch%3Amain"><img alt="CI status" src="https://img.shields.io/github/actions/workflow/status/mickaellherminez/vscode-theme-audit/ci.yml?branch=main&amp;label=CI&amp;color=0B7F7A"></a>
</p>

Accessibility audit for Visual Studio Code color themes, for theme authors and their CI: WCAG contrast of the text and the code, and color pairs that must stay distinct with color blindness simulations.

> **Status: early releases (0.2).** Version 0.2.0 adds `.vsix` and Eclipse Open VSX™ inputs, configuration, Markdown reports and a GitHub Action ([milestones](https://github.com/mickaellherminez/vscode-theme-audit/milestones)).

These documents describe version **0.2.0**. If npm does not serve this version yet, run the [sources](#from-the-sources) to try the command; the versioned npm examples below become available when 0.2.0 is published. The action workflows in this repository demonstrate its GitHub Action independently of npm publication.

## Where it comes from

The audit was first written for [365 Day & Night](https://github.com/mickaellherminez/365-daynight-vscode-theme-ext), a set of 48 VS Code themes, where it runs before each release and publishes [its report](https://github.com/mickaellherminez/365-daynight-vscode-theme-ext/blob/main/docs/AUDIT.md). That version only reads the themes of its own project. This package makes it read any VS Code color theme, the way VS Code does.

The themes of the Visual Studio Marketplace and of [Eclipse Open VSX™](https://open-vsx.org/) use the same format, so the audit also covers the editors that use Open VSX, such as VSCodium, Cursor or Gitpod.

## Quick start

Node.js 22.18 or later. From the folder of your theme extension (the one with its `package.json`):

```sh
npx vscode-theme-audit .
```

The command reads every theme that the `package.json` declares (`contributes.themes`), measures it as VS Code shows it, prints a report, and exits with `0` when every check passes, `1` when one fails.

## Ways to run it

| How | Command | When |
| --- | --- | --- |
| Without installing | `npx vscode-theme-audit <themes>` | Once, or now and then. npx downloads the package into its cache on the first run |
| Global install | `npm install --global vscode-theme-audit`, then `vscode-theme-audit <themes>` | On your computer, for several projects |
| Project dependency | `npm install --save-dev vscode-theme-audit`, then `npx vscode-theme-audit <themes>` or a script of `package.json` | In a theme project and its CI: the version is fixed in `package-lock.json` |
| TypeScript or JavaScript API | `import { auditInputs } from 'vscode-theme-audit'` | In your own scripts (see [API](#api)) |

As a script of your `package.json`, after `npm install --save-dev vscode-theme-audit`:

```json
{
  "scripts": {
    "audit:themes": "vscode-theme-audit ."
  }
}
```

Then `npm run audit:themes`.

### From the sources

To run the development version, from a clone of this repository:

```sh
git clone https://github.com/mickaellherminez/vscode-theme-audit.git
cd vscode-theme-audit
npm ci
node src/cli.ts path/to/my-extension
```

## Usage

```sh
vscode-theme-audit path/to/my-extension                   # every theme of an extension folder (its package.json)
vscode-theme-audit path/to/themes/my-color-theme.json     # one theme file
vscode-theme-audit my-theme-1.2.3.vsix                    # a packaged extension, as vsce package writes it
vscode-theme-audit open-vsx:publisher.name                # the latest version of an extension of Open VSX
vscode-theme-audit open-vsx:publisher.name@1.2.3          # a version of it
vscode-theme-audit ext-one ext-two/themes/night.json      # several at once
vscode-theme-audit path/to/my-extension --json > audit.json   # the report as JSON, for CI
vscode-theme-audit path/to/my-extension --format markdown > audit.md  # a PR comment or job summary
vscode-theme-audit path/to/my-extension --strict          # the rules of 365 Day & Night
```

Each argument is a theme file, an extension folder, a `.vsix` file or an Open VSX id. A folder must contain a `package.json` that declares its themes; the command does not search subfolders.

- **A `.vsix` file** is extracted into a temporary folder as VS Code installs it, audited, and the folder is deleted. The report names its themes by the `.vsix` and their path inside it: `my-theme-1.2.3.vsix/extension/themes/dark.json`. To audit your extension as you publish it, run `npx @vscode/vsce package` first, then audit the `.vsix` it writes.
- **An Open VSX id**, `open-vsx:publisher.name` or `open-vsx:publisher.name@version`, is downloaded from [Open VSX](https://open-vsx.org/) through its public API: the latest version, or the one given. The package checks the download against the SHA-256 that Open VSX publishes, then audits it as a `.vsix`. The report names it with the version found: `open-vsx:publisher.name@1.2.3/extension/themes/dark.json`. This is the only case where the command uses the network.
- **The Visual Studio Marketplace** has no such id: its download API is not documented, so the package does not use it. Audit a `.vsix` instead: your own, or one you already have.

 A theme file takes its type (light, dark, high contrast) and its name from the extension that declares it, the nearest `package.json` above it. Without one, its type comes from its `type` field (`light`, `dark`, `hc`, `hcLight`), or it is audited as dark, as VS Code shows it, with a warning.

| Option | Effect |
| --- | --- |
| `--json` | Prints the report as JSON instead of text: format 1, described by [`schema/report-v1.schema.json`](schema/report-v1.schema.json), which the package contains. It gives every check, not only the failures. See [The JSON report](#the-json-report) |
| `--format text\|json\|markdown` | Chooses the report format. Text is the default; `--json` remains an alias for `--format json`. Markdown is for PR comments and job summaries. Both `--format markdown` and `--format=markdown` work. Contradictory choices are an error (exit code `2`) |
| `--strict` | Applies the rules of 365 Day & Night (see [Strict mode](#strict-mode)) |
| `--config <file>` | Uses this configuration for every theme, instead of the `.vscode-theme-audit.json` of each extension folder (see [Configuration](#configuration)) |
| `-h`, `--help` | Shows the help |
| `-v`, `--version` | Shows the version |

| Exit code | Meaning |
| --- | --- |
| `0` | Every check passes |
| `1` | A check fails, or a pair of colors is confused (in strict mode, also a missing color or a variety failure) |
| `2` | A theme cannot be read, a path does not exist, a folder has no themes, or an option is unknown. The other themes are still audited and reported |

Outside strict mode, a color that VS Code does not show, and the styles of WCAG 1.4.1, are information: they never change the exit code. The errors of exit code `2` (path missing, folder without themes, unknown option) go to the standard error, and then no JSON is printed.

## Reading the report

The text report starts with the version of the package and of VS Code whose colors it uses. Then, for each theme, its name, its type and its file, followed by one line per problem. This is an excerpt of the report of a test theme of this repository (`test/data/oracle-extension/themes/dark.json`), which sets few colors:

```text
vscode-theme-audit 0.2.0, colors of VS Code 1.147.0

Oracle Dark (vs-dark): test/data/oracle-extension/themes/dark.json
  FAIL     Line numbers: #858585 on #1B2230  4.32 < 4.5
  FAIL     activityBarBadge.foreground / activityBarBadge.background: #FFFFFF on #8FBCBB  2.08 < 4.5
  FAIL     Git graph: line 3: #994F00 on #151B26  2.85 < 3
  CONFUSED keyword / function (#D8DEE9 / #D8DEE9): ΔE2000 under 7: normal 0.0, protan 0.0 (Machado 2009), deutan 0.0 (Machado 2009), tritan 0.0 (Brettel 1997)
  247 of 263 checks pass; 64 of 148 pairs stay distinct; 8 colors that VS Code does not show (information); 7 styles of WCAG 1.4.1 missing (information); achromatopsia: 21 of 21 pairs under 7 (information)

1 theme: 1 with failures, 100 failures
```

| Line | Meaning |
| --- | --- |
| `warning: ...` | Something VS Code accepts, but that the author probably did not mean: an invalid color that VS Code shows in red, a value that is not a color, a file name whose case differs. A warning is not a failure |
| `FAIL     <check>: <text> on <background>  <ratio> < <minimum>` | A contrast under its minimum. The two colors are those that VS Code shows: opaque, after a transparent color is composed on what is under it. For a style of WCAG 1.4.1, `expected <style>` |
| `CONFUSED <a> / <b> (<colors>): ΔE2000 under 7: ...` | Two colors that must stay distinct are too close in at least one vision. Each vision gives its smallest difference and the model that gives it |
| `MISSING  <check>` | Strict mode only: a color that the check needs is not set by the theme |
| `IGNORED  <check or pair> ... (ignored: <reason>)` | A check or a pair that fails, but that the configuration ignores, with its reason. It does not count as a failure |
| `configuration: <file>` | The configuration that applies to the theme, with its thresholds when they differ from the defaults |
| `ERROR    <reason>` | The theme cannot be read; VS Code would refuse it too |
| The summary line | Checks that pass, pairs that stay distinct (each pair counted once in each of the 4 visions), then information: colors that VS Code does not show, styles of WCAG 1.4.1, achromatopsia |
| The last line | Themes audited, themes with failures, failures (failed checks, plus confused pairs counted once in each vision where they are confused), and themes that cannot be read |

To fix a failure, change the color named in the line: a check named `foreground key / background key` names both keys of the theme. A check with a plain label, such as `Line numbers`, is listed with its keys in [the list of checks](docs/checks.md).

## The JSON report

`--json` prints the same audit as one JSON document, with every check, passed or not, and every pair in every vision. Its main fields, for the same test theme, with each list cut to one entry that fails:

```jsonc
{
  "format": 1,                                   // the version of this format
  "tool": { "name": "vscode-theme-audit", "version": "0.2.0" },
  "vscode": { "version": "1.147.0", "commit": "8a14f0cc1b08d531eb83255ea3764ae22aa932b5" },
  "strict": false,
  "minimumDeltaE2000": 7,
  "warnings": [],                                // about the extensions: their package.json and colors
  "themes": [{
    "label": "Oracle Dark", "file": "test/data/oracle-extension/themes/dark.json", "uiTheme": "vs-dark", "warnings": [],
    "summary": { "checks": 263, "failed": 16, "missing": 8, "information": 7, "pairs": 148, "confused": 84, "ignored": 0 },
    "checks": [
      { "label": "Line numbers", "value": 4.317608886674965, "minimum": 4.5, "status": "fail", "colors": ["#858585", "#1B2230"] }
    ],
    "distinctions": [
      { "view": "deutan", "pair": ["keyword", "function"], "deltaE2000": 0, "model": "Machado 2009", "cie76": 0, "colors": ["#D8DEE9", "#D8DEE9"], "status": "fail" }
    ],
    "achromatopsia": [{ "pair": ["keyword", "function"], "deltaE2000": 0, "cie76": 0, "colors": ["#D8DEE9", "#D8DEE9"] }]
  }],
  "variety": [],                                 // strict mode: the themes of one type compared with each other
  "summary": { "themes": 1, "themesWithFailures": 1, "failures": 100, "unreadable": 0 }
}
```

A check fails when it has neither `"information": true` nor `ignored`, and its `status` is `"fail"` (or `"missing"` in strict mode). The values are not rounded. Every field is described in [docs/report-format.md](docs/report-format.md), and the schema [`schema/report-v1.schema.json`](schema/report-v1.schema.json) (JSON Schema 2020-12) can validate a report. New fields can appear in format 1; a field removed or changing meaning gives format 2, with a new schema.

## The Markdown report

`--format markdown` prints the audit as GitHub Markdown: the result and complete totals, the tool and VS Code versions, the mode, a table of themes, then failures, confused pairs by vision, configuration and ignored reasons, warnings, unreadable themes and strict variety. Missing colors outside strict mode, missing styles and achromatopsia remain information. The exit codes are the same as for text and JSON.

The report is limited to 60,000 UTF-8 bytes, so it fits a PR comment and a job summary. If details do not fit, a notice says so; the global totals still cover the complete audit. Use JSON for every result. Theme names, warnings and exception reasons are escaped, including mentions. The command only prints the Markdown; it does not post a PR comment. For a local report, redirect it to `audit.md`; remove that file when it is no longer needed. To return to text, remove `--format markdown` or use `--format text`.

## In a CI

### GitHub Action

The action in this repository embeds the audit engine and its dependencies. After checkout it audits the theme extension, writes its Markdown report in the job summary, and fails the step on audit failures or errors. It uses the GitHub Actions Node.js 24 runtime; no npm installation or `setup-node` step is needed for the action. [Full inputs, outputs, demonstration, versioning and removal](docs/github-action.md).

The following workflow pins the reviewed **0.2.0 action code** at commit `0f287bd6b42642f5c5f5d1c5e8c497630f695a57`. That commit embeds engine version 0.2.0 and can run independently of npm publication. A full SHA fixes the action code; changing it is an explicit update.

```yaml
name: Theme audit
on: [push, pull_request]
permissions:
  contents: read
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: mickaellherminez/vscode-theme-audit@0f287bd6b42642f5c5f5d1c5e8c497630f695a57
        with:
          path: '.'
          # Optional; false by default
          strict: 'false'
          # Optional; otherwise the extension's configuration is discovered
          # config: .vscode-theme-audit.json
```

`path` accepts one theme file, extension folder, `.vsix` or Open VSX id as a literal value. An Open VSX id downloads the extension; local inputs need no network access from the audit engine. `strict` is `true` or `false`; `config` is a configuration file relative to the checked-out workspace. The action needs no secret and does not post comments or change the theme files. Delete its step to remove it, or its workflow if the workflow serves only this audit.

The [public action test](.github/workflows/action-public.yml) uses that exact SHA from a checkout containing only test themes, their configuration and the report assertions. It checks public action download separately from the [three-system demonstration](.github/workflows/action.yml), which tests the current commit's action.

### The published command

A job for version 0.2.0, once it is available on npm, auditing the themes on each push and pull request and keeping the JSON report as an artifact:

```yaml
name: Theme audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npx --yes vscode-theme-audit@0.2.0 .
      - run: npx --yes vscode-theme-audit@0.2.0 . --json > theme-audit.json
        if: always()
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: theme-audit
          path: theme-audit.json
```

The first step fails the job when a check fails (exit code `1`) or a theme cannot be read (`2`). Give a fixed version (`@0.2.0`), so that a new release of the package, with new checks or the colors of a newer VS Code, does not change the result of a commit. With the package in `devDependencies`, `npm ci` then `npx vscode-theme-audit .` uses the version of `package-lock.json`.

## Configuration

A theme extension can adapt the audit with a file `.vscode-theme-audit.json` in its folder, next to its `package.json`. The command finds it for the folder, for a theme file of the extension, and inside a `.vsix` that contains it. `--config <file>` gives another file for every input instead. The file is JSON with comments, as the settings of VS Code:

```jsonc
{
  // Completion and validation in VS Code
  "$schema": "https://raw.githubusercontent.com/mickaellherminez/vscode-theme-audit/main/schema/config-v1.schema.json",
  "thresholds": {
    "deltaE2000": 10
  },
  "ignore": [
    { "check": "Line numbers", "theme": "My Theme Dark", "reason": "Dimmed on purpose; the active line number passes" },
    { "pair": ["keyword", "function"], "view": "tritan", "reason": "Keywords are bold, functions are not" }
  ]
}
```

With the package installed in the project, `"$schema": "./node_modules/vscode-theme-audit/schema/config-v1.schema.json"` uses the schema of that version.

**Thresholds.** Four reference thresholds can be changed. Each check that uses the default value uses the new one: [the list of checks](docs/checks.md) gives the minimum of each check.

| Threshold | Default | Checks |
| --- | --- | --- |
| `text` | 4.5 | Contrast of text, [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/#contrast-minimum): every check whose minimum is 4.5 |
| `enhancedText` | 7 | Contrast of text in high contrast themes, and of the main text in strict mode, [WCAG 2.2 AAA](https://www.w3.org/TR/WCAG22/#contrast-enhanced): every check whose minimum is 7 |
| `nonText` | 3 | Contrast of indicators, borders, icons and lines, [WCAG 2.2](https://www.w3.org/TR/WCAG22/#non-text-contrast): every check whose minimum is 3 |
| `deltaE2000` | 7 | CIEDE2000 difference between colors that must stay distinct, in every vision: a project rule |

A threshold can be raised freely. A lower one gives a warning at the top of the report, since the audit then no longer follows WCAG or the rule. The other minimums, such as those for a selection to stay visible (1.2 to 2), do not change: an exception covers a particular case.

**Exceptions.** Each entry of `ignore` names a check by its exact label, as the report writes it, or a pair of colors, in either order. It applies to every theme of the extension unless `theme` names one, and to every vision unless `view` names one (`normal`, `protan`, `deutan` or `tritan`). Its `reason` is required. The report keeps each ignored check and pair: the text report shows them as `IGNORED` with their reason, and the JSON report gives them an `ignored` field with it. They do not count as failures, so they do not change the exit code. An exception that names nothing, such as a label with a typo, or that names only checks that pass, gives a warning: it can be removed before it hides a future failure.

An invalid configuration stops the command with exit code `2` and says what is wrong. To go back to the defaults, delete the file, or the entries you no longer want. To keep the file out of the `.vsix` you publish, list it in `.vscodeignore`; the audit of that `.vsix` then uses the defaults, unless you give `--config`.

## What it checks

The same measures as the audit of 365 Day & Night, with the same results on its 48 themes:

| Check | What it measures | Minimum |
| --- | --- | --- |
| Contrast | The WCAG 2.2 contrast ratio of each text color on its background: the editor and its selections, line numbers, find matches, the terminal and its ANSI colors, the debug console, the side bar, lists, tabs, the status bar, buttons, inputs, widgets, notifications, menus, Git decorations, chat, testing, notebooks, merge editor, symbol icons, Git graph, command center, agent sessions, each syntax category and each semantic color | 4.5:1 for text (WCAG AA), 3:1 for indicators, borders and icons; 7:1 for text in high contrast themes (AAA). Lower minimums for a selection or the current line to stay visible (1.2 to 1.35; 2 or 3 in high contrast) |
| Color blindness | The CIEDE2000 difference between colors that must stay distinct: keyword, function, string, number, class, comment and variable; error, warning and info; added, modified and deleted; passed and failed tests; the 5 lines of the Git graph. In normal vision, and with protanopia, deuteranopia and tritanopia simulations by several models: the closest one counts | ΔE2000 of 7, a project rule |
| Styles (WCAG 1.4.1) | Comments in italics, invalid code underlined, deprecated code struck through, links underlined, Markdown headings and bold in bold, Markdown italics in italics | Information (a failure in strict mode) |
| Achromatopsia | The same difference between the syntax colors, seen without color | Information |

The colors measured are those that VS Code 1.147.0 shows: the theme, then the defaults of VS Code for the colors that the theme leaves out (see [Colors that a theme leaves out](#colors-that-a-theme-leaves-out)). In the terminal, the color measured is the one VS Code shows after its minimum contrast of 4.5:1. The semantic colors are checked when the theme enables semantic highlighting, since VS Code shows them only then.

Each check, its keys, its minimum and its references are listed in [docs/checks.md](docs/checks.md). The references:

- **Contrast:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/), success criteria [1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG22/#contrast-minimum), [1.4.6 Contrast (Enhanced)](https://www.w3.org/TR/WCAG22/#contrast-enhanced), [1.4.11 Non-text Contrast](https://www.w3.org/TR/WCAG22/#non-text-contrast) and [1.4.1 Use of Color](https://www.w3.org/TR/WCAG22/#use-of-color), with the relative luminance and contrast ratio of WCAG.
- **Color difference:** CIEDE2000, as specified in CIE 15:2004 and checked against the test data of G. Sharma, W. Wu and E. N. Dalal, "The CIEDE2000 color-difference formula: implementation notes, supplementary test data, and mathematical observations", *Color Research & Application* 30(1), 2005.
- **Color blindness simulations:** G. M. Machado, M. M. Oliveira and L. A. F. Fernandes, "A Physiologically-based Model for Simulation of Color Vision Deficiency", *IEEE TVCG* 15(6), 2009; H. Brettel, F. Viénot and J. D. Mollon, "Computerized simulation of color appearance for dichromats", *JOSA A* 14(10), 1997; F. Viénot, H. Brettel and J. D. Mollon, "Digital video colourmaps for checking the legibility of displays by dichromats", *Color Research & Application* 24(4), 1999.

There will be no score, ranking or badge before a pilot with theme authors.

### Strict mode

`--strict` applies the rules of 365 Day & Night, stricter than WCAG AA and meant for that project:

- every color that a check uses must be set by the theme: a missing one is a failure, and the defaults of VS Code do not count;
- the main text (editor, terminal, side bar, notebook cells) needs 7:1, and the terminal is measured with the colors of the theme, without the minimum contrast of VS Code;
- the styles of WCAG 1.4.1 are failures;
- some recent keys and semantic rules must be set, and the status bar button of 365 Day & Night must be readable;
- the themes of one type in an extension must look different from each other (variety).

## Colors that a theme leaves out

A theme almost never sets all the workbench colors. For a key it leaves out, VS Code shows its own default, which depends on the theme type and is often derived from other colors of the theme: `inlineChat.background` is `editorWidget.background`, `editorInlayHint.background` is `badge.background` at 10% of its opacity (except in high contrast dark). The audit measures the color that VS Code shows, with the defaults of VS Code 1.147.0 (extracted from its sources by a script), and says where each color comes from:

| Origin | Meaning |
| --- | --- |
| `theme` | The theme sets the key |
| `default` | VS Code shows its own color |
| `derived` | VS Code computes it from other keys, which are listed |
| `none` | VS Code shows no color for this key |

For a theme of any author, a missing key is information, not a failure. The strict mode keeps the rule of 365 Day & Night, where every key that a check uses must be set by the theme. The colors that the extension of the theme contributes (`contributes.colors`) have their defaults too.

The command does not show the origin yet; the API gives it (see below).

## API

The package exports its engine, with its TypeScript types. The main functions:

```ts
import { auditInputs, auditPaths, auditTheme, exitCode, isFailure, loadTheme, markdownReport, packageVersion, textReport } from 'vscode-theme-audit';

// What the command does: a report in the JSON format, the text report and the exit code. auditInputs takes
// what the command takes, .vsix files and Open VSX ids included
const report = await auditInputs(['path/to/my-extension', 'my-theme-1.2.3.vsix'], { version: packageVersion(), strict: false });
console.log(textReport(report));
// For a PR comment body or job summary; this only produces the text
const markdown = markdownReport(report);
process.exitCode = exitCode(report);

// The same for theme files and extension folders only, without waiting
const local = auditPaths(['path/to/my-extension'], { version: packageVersion() });

// One theme, with its type: 'vs' (light), 'vs-dark', 'hc-black' or 'hc-light'
const audit = auditTheme(loadTheme('themes/my-theme.json'), 'vs-dark');
audit.checks.filter((check) => isFailure(check));             // checks under their minimum
audit.distinctions.filter((pair) => isFailure(pair));        // colors that a vision confuses, except ignored pairs
```

The origin of each workbench color:

```ts
import { VSCODE_COLORS, WorkbenchColors, extensionColors, loadTheme, missingKeys } from 'vscode-theme-audit';

const registry = { ...VSCODE_COLORS, ...extensionColors('.').colors };
const colors = new WorkbenchColors(loadTheme('themes/my-theme.json'), 'vs-dark', registry);
colors.get('inlineChat.background');
// For a dark theme that sets neither inlineChat.background nor editorWidget.background:
// { key: 'inlineChat.background', color: '#252526', origin: 'derived', from: ['editorWidget.background'], registered: true }
missingKeys(colors, ['editor.background', 'inlineChat.background'], { strict: true });
// [{ key: 'inlineChat.background', origin: 'derived', color: '#252526', failure: true }]
```

Before version 1.0.0, the API can change in any release, as [Semantic Versioning](https://semver.org/spec/v2.0.0.html#spec-item-4) allows; the CHANGELOG lists each change. Version 1.0.0 will fix the public API. The command and the JSON format follow their own rules above.

## Limits

- **Measurements and simulations, not people.** No calculation replaces testing with the people concerned. The color blindness simulations are models of dichromacy, which disagree with each other and approximate the vision of each person; that is why a pair must stay distinct with all of them.
- **Thresholds are project rules.** WCAG sets the contrast minimums. The color distinction threshold (ΔE2000 of 7) and the minimums for selections are practical rules, not standards. A configuration can change four thresholds, and ignore checks with a reason: a report made with one says so (see [Configuration](#configuration)).
- **JSON themes only.** TextMate theme files (`.tmTheme`), an older format, are not read yet. Product icon and file icon themes are not color themes and are not read.
- **Open VSX, not the Visual Studio Marketplace.** Extensions are downloaded from Open VSX only (see [Usage](#usage)). A `.vsix` must take less than 200 MB once extracted, in 10,000 files at most: a limit against archives made to fill the disk; theme extensions take a few megabytes.
- **Default settings of VS Code.** The terminal is measured with its default minimum contrast (`terminal.integrated.minimumContrastRatio`: 4.5), and the selected text of the terminal without the adjustments of xterm.js.
- **Settings of the user are not read.** The audit measures the theme as published, without `workbench.colorCustomizations`, `editor.tokenColorCustomizations` or `editor.semanticTokenColorCustomizations`. The semantic token types and scopes added by extensions other than the built-in JavaScript and TypeScript ones are not read either.
- **Defaults of one version of VS Code.** The defaults change from one version to the next, a few keys at a time. The version used is written in the report (`vscode`) and in the package (`VSCODE_SOURCE`).
- **Colors of the theme, not choices made in the code of a view.** When a key has no color, some views choose another one in their own code: the terminal, for example, takes the background of the panel when `terminal.background` has none. The audit gives the color of the key, except for the terminal and the notebook cells, whose replacement it follows.
- **Colors, not rendering.** The audit reads the theme files. It does not look at a rendered window, antialiasing or a display. Its token colors were checked against the editor of VS Code itself on five themes (see [CONTRIBUTING](CONTRIBUTING.md#checked-in-the-editor-of-vs-code)).

## Pilot with theme authors

The [pilot](https://github.com/mickaellherminez/vscode-theme-audit/issues/19) is recruiting 3 to 10 theme authors. Each participant receives their own report privately and answers the same questions about correctness, clarity, CI use and missing features. The public summary will contain aggregated findings only, without identifying individual themes or authors.

See the [pilot protocol](docs/pilot.md) for the questions, reproducible reports and completion criteria. At least three distinct authors must provide feedback before the pilot can be completed; running the corpus alone does not meet that requirement.

## Uninstall

| Installed with | Remove with |
| --- | --- |
| `npx vscode-theme-audit` | Nothing is installed. npx keeps a copy in its cache, `~/.npm/_npx/` (`%LocalAppData%\npm-cache\_npx\` on Windows), which `npm cache clean --force` empties with the rest of the npm cache. To remove only this package, delete the folder of `~/.npm/_npx/` whose `package.json` names `vscode-theme-audit` |
| `npm install --global vscode-theme-audit` | `npm uninstall --global vscode-theme-audit` |
| `npm install --save-dev vscode-theme-audit` | `npm uninstall vscode-theme-audit`, which also removes it from `package.json` and `package-lock.json`. Remove the scripts of `package.json` that call it |
| From the sources | Delete the clone |

To remove it from a CI, delete the steps that run it (or the whole workflow file, such as `.github/workflows/theme-audit.yml` in the example above), and the artifact step if you kept the JSON report. Nothing else is left: the command writes nothing on disk except the report you redirect, and a temporary folder for a `.vsix` or an Open VSX id, deleted before it ends. It uses the network only to download an `open-vsx:` id.

The GitHub Action also keeps a Markdown copy in the runner temporary folder for the rest of the job (`report-path`), alongside the job summary. GitHub manages those job files; a self-hosted runner's owner manages its cleanup. Removing the workflow does not delete summaries or artifacts of earlier runs.

## Development

Requires Node.js 22.18 or later, which runs the TypeScript sources directly.

```sh
npm ci
npm run check         # lint, type check, tests, then build to dist/
npm run test:corpus   # the 178 themes of 20 Open VSX extensions, downloaded once
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Parts ported from Visual Studio Code, vscode-textmate and xterm.js keep their MIT notices: see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Trademarks

An independent project by Mickaël Lherminez.

Visual Studio, Visual Studio Code, and VS Code are trademarks of Microsoft Corporation.

npm is a registered trademark of npm, Inc.

Eclipse Open VSX™ is a trademark of Eclipse Foundation AISBL.
