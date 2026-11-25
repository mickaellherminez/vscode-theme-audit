# Contributing

## Setup

Node.js 22.18 or later runs the TypeScript files directly, by removing the types: no build is needed to run the tests or the command. Only syntax that can be removed this way is allowed (no `enum`, no `namespace`), and imports between source files use the `.ts` extension. The build rewrites them to `.js`.

```sh
npm ci
node src/cli.ts --help   # run the command from the sources
```

## Measuring tools

`src/color.ts`, `src/simulation.ts` and `src/difference.ts` are ported from [`colorlib.py`](https://github.com/mickaellherminez/365-daynight-vscode-theme-ext/blob/main/scripts/themes/colorlib.py) of 365 Day & Night, and must give the same results. Where Python rounds, they round like Python: a value exactly halfway goes to the even neighbor (`roundHalfEven`).

`test/color.test.ts` checks them against published data, and `test/python-parity.test.ts` against the results of `colorlib.py`. The data and their sources are described in [test/data/README.md](test/data/README.md). After a change of `colorlib.py`, rebuild its reference file from a clone of 365 Day & Night:

```sh
python3 -I test/data/colorlib_reference.py ../365-daynight-vscode-theme-ext > test/data/colorlib-reference.json
```

## Reading a theme

`src/theme.ts` follows how VS Code loads a color theme: `_loadColorTheme` in [`colorThemeData.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/themes/common/colorThemeData.ts) and `convertSettings` in [`themeCompatibility.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/themes/common/themeCompatibility.ts), as of VS Code 1.147.0 (commit `8a14f0cc1b`, November 18, 2026). When VS Code changes them, update the code, its comments and `test/theme.test.ts`.

What VS Code does, and the package with it:

- JSON with comments and trailing commas is accepted; any other syntax error refuses the theme.
- An `include` is read first. The theme then replaces its colors and adds its TextMate rules after the included ones. `"default"` removes an included color.
- A color without `#`, or with a length other than 3, 4, 6 or 8 digits, is shown in red (`#FF0000`); an empty string too. A character that is not a hexadecimal digit counts as 0. A value that is not a string is ignored. The package gives a warning for each case.
- A file with a `settings` array uses the old format: its rules without scope set some workbench colors, and the rest of the file is ignored.
- In an extension, a theme without `uiTheme` is dark (`vs-dark`), and a theme without `label` takes its file name.

Where the package departs from VS Code, so that the audit gives the same result on every system:

- A theme file or an `include` whose path differs from the file name only by case (`theme.json` for `Theme.json`) is found by VS Code on macOS and Windows, where file names usually ignore case, but not on Linux. The package reads it on every system, with a warning. Bearded Theme 10.1.0, in the corpus, has one. A folder that exists without being listed, such as a short 8.3 name on Windows (`RUNNER~1` for `runneradmin`), is kept as written, and the names after it are still checked.

## Packaged extensions and Open VSX

`src/vsix.ts` extracts a `.vsix` as VS Code installs it (`extract()` of [`zip.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/base/node/zip.ts), 1.147.0): with [yauzl](https://github.com/thejoshwolfe/yauzl), the zip library of VS Code, a dependency of the package, only the entries under `extension`, without this prefix. A `.vsix` can come from anywhere, so the extraction refuses an entry outside the target folder (yauzl refuses absolute names and `..` too), more than 10,000 entries, more than 200 MB of extracted files (`VSIX_LIMITS`), and a file larger than its declared size.

`src/open-vsx.ts` downloads an extension through the public API of [Open VSX](https://open-vsx.org/): `GET /api/{namespace}/{name}[/{version}]` gives the version, the address of the `.vsix` and that of its SHA-256, which the download must match. The id is checked before any request. It is the only code of the package that uses the network, and the tests replace `fetch` with a stand-in (`test/open-vsx.test.ts`); the corpus test downloads one extension for real.

`auditInputs()` in `src/report.ts` extracts each `.vsix` and Open VSX id into a temporary folder, audits it with the rest, and deletes the folder, even after an error. The report names these themes by the `.vsix` or the id, then their path inside the extension. The Visual Studio Marketplace is not supported: its download API is not documented ([#16](https://github.com/mickaellherminez/vscode-theme-audit/issues/16)).

`test/vsix.test.ts` writes its `.vsix` files with a small zip writer (`test/zip.ts`), valid or broken. The corpus test audits each `.vsix` of the corpus directly too, and checks that it gives the same themes and warnings as the extracted folder.

## Configuration

`src/config.ts` reads `.vscode-theme-audit.json` (or the file of `--config`), checks it with the same rules as [`schema/config-v1.schema.json`](schema/config-v1.schema.json), and applies it to the audit of each theme (`applyConfig()`): the four thresholds replace the minimums 4.5, 7 and 3 of the checks and the CIEDE2000 minimum of the pairs, and each exception gives an `ignored` field, its reason, to the checks and pairs it names. `isFailure()` never counts an ignored check. `auditEntries()` in `src/report.ts` finds the file of each input, reads it once, warns about a lowered threshold, and at the end about each exception that named nothing or only checks that pass.

`test/config.test.ts` checks every rule on a copy of `test/data/oracle-extension`, and that the package and the schema refuse the same invalid files. When a field is added to the configuration, add it to the schema, to `loadConfig()` and to that test in the same pull request. Version 1 of the configuration can gain optional fields; removing one or changing its meaning means a new schema file, `config-v2.schema.json`.

## Token colors

VS Code does not choose the color of a token itself: it gives the TextMate rules of the theme to [vscode-textmate](https://github.com/microsoft/vscode-textmate), which colors the code. `src/textmate.ts` ports how vscode-textmate matches a scope (`src/theme.ts`, commit `98cc6331dc`), with its tests in `test/textmate.test.ts`. `src/tokens.ts` adds what VS Code does before (`tokenColors` in `colorThemeData.ts`): a first rule with the editor colors, or their defaults; rules without scope left out; colors written in full and in uppercase; colors for log files when the theme sets none.

`test/textmate-oracle.test.ts` compares the port with vscode-textmate itself, a development dependency, on themes and scope paths generated at random with a fixed seed. vscode-textmate does not export its theme: a grammar with one pattern gives each scope path to its tokenizer, and the style is read back from the token metadata. If you change `src/textmate.ts`, this test must still pass.

## Semantic tokens

In many languages, a language server classifies names (a read-only `variable`, a `parameter`...) and VS Code styles them over the TextMate colors, when the theme sets `"semanticHighlighting": true`. `src/semantic.ts` ports how VS Code finds that style (`getTokenStyle` in `colorThemeData.ts`, `tokenClassificationRegistry.ts`):

1. Each rule of `semanticTokenColors` that matches the token gets a score: 100 for its type (minus 1 per super type level), 100 per modifier, 10 for a language. For each property (color, bold, italic, underline, strikethrough), the best score wins, and the last rule wins a tie.
2. For the properties still unset, VS Code probes TextMate scopes, such as `variable.other.constant` for `variable.readonly`, with the scope selectors of `textMateScopeMatcher.ts`. The built-in JavaScript and TypeScript extensions add their own scopes for their languages.
3. A property that is still unset keeps the TextMate style of the token: `withSemantic()` combines both.

`test/semantic.test.ts` starts with the tests of VS Code (`tokenStyleResolving.test.ts`). The `semanticTokenScopes` and token types of other extensions, and the user setting `editor.semanticTokenColorCustomizations`, are not read.

### Checked in the editor of VS Code

The tests above compare the ports with vscode-textmate and with the tests of VS Code. `scripts/vscode-inspect.ts` checks the whole chain in the editor itself: the grammars of VS Code, the semantic tokens of its TypeScript server, and the themes as VS Code loads them. It starts VS Code as `scripts/vscode-oracle.ts` does (`scripts/vscode-run.ts`: a temporary profile, deleted at the end, and extension copies without their code), opens the samples of [`test/data/inspect/`](test/data/inspect/) (TypeScript, Python, JSON with comments and Markdown), and opens the widget of **Developer: Inspect Editor Tokens and Scopes**. It then clicks the start of each word, and of each other run of characters, and checks in the status bar that the cursor is there. For each place, it records the TextMate scopes and the semantic token type and modifiers that the widget shows, the color of the widget, and the color and font style of the text on screen.

```sh
# macOS, with VS Code in /Applications; elsewhere, give the executable with --code. The window must stay open,
# without clicks, until the script ends (about 3 minutes per theme).
npm run corpus
mkdir -p ../vti && for id in zhuangtongfa.material-theme sdras.night-owl Catppuccin.catppuccin-vsc enkia.tokyo-night GitHub.github-vscode-theme; do
  mkdir -p ../vti/$id && unzip -qo .cache/corpus/$id-*.vsix 'extension/*' -d ../vti/$id; done
node scripts/vscode-inspect.ts --work ../vti/tmp \
  --theme 'One Dark Pro' --theme 'Night Owl' --theme 'Catppuccin Latte' --theme 'Tokyo Night Light' --theme 'GitHub Dark High Contrast' \
  test/data/vscode-inspect.json test/data/inspect ../vti/*/extension
```

`test/corpus/inspect.test.ts`, part of `npm run test:corpus`, gives these scopes and semantic tokens to the package (`TokenColors`, `SemanticTokenColors`, `withSemantic`) and checks that it finds the same color, bold, italic, underline and strikethrough. The five themes cover a dark theme with semantic rules (One Dark Pro), a dark theme without semantic highlighting (Night Owl), a light theme with semantic rules (Catppuccin Latte), a light theme whose semantic rules are off because it does not enable semantic highlighting (Tokyo Night Light), and a high contrast theme with semantic highlighting but no rules, where VS Code probes TextMate scopes (GitHub Dark High Contrast). The record gives each distinct token once per theme.

On November 22, 2026, with VS Code 1.147.0 on macOS: 2,921 places in the five themes, 1,556 distinct tokens, 0 difference. On 20 of these places, the semantic token changes the TextMate style, and the package finds it too.

The script turns off what VS Code draws over the token colors, so that the text shows the token style alone: bracket pair colors, faded unused code, struck through deprecated code, inlay hints, links and the other settings written in the record. With the default settings, they change some tokens on screen, over the token colors that the audit measures. What this check does not cover:

- the package does not tokenize code: the scopes come from the grammars of VS Code, and the check shows that, given these scopes, the package finds the style of VS Code;
- only the TypeScript server gives semantic tokens here: Python, JSON and Markdown have none without other extensions;
- the record comes from the version of VS Code that ran the script, which must be the pinned release (the test checks it). To record again after a change of the pinned release, run the script, read the diff of `test/data/vscode-inspect.json`, and run `npm run test:corpus`. To go back, check out the previous file from git.

## Default colors

A theme almost never sets all the workbench colors. For a key it leaves out, VS Code shows the default that the key was registered with (`registerColor` in its sources): one value per theme type (light, dark, high contrast dark, high contrast light), which is a color, the id of another color, a transform of other colors (`transparent`, `darken`, `oneOf`...), or nothing. `src/colors.ts` ports how VS Code resolves them: `Color` of `color.ts`, `resolveColorValue` and `executeTransform` of `colorUtils.ts`, `getColor` and `defines` of `colorThemeData.ts`, and the `contributes.colors` of an extension (`colorExtensionPoint.ts`).

The defaults themselves are data, in `src/vscode-colors.ts`, generated by `scripts/vscode-colors.ts` from the sources of a pinned release of VS Code: 1.147.0 (commit `8a14f0cc1b`, November 18, 2026). The other ported files of this package follow the same release. Do not edit this file by hand. To generate it again, from a partial clone of VS Code next to this repository (about 260 MB):

```sh
git init ../vscode && cd ../vscode
git remote add origin https://github.com/microsoft/vscode.git
git sparse-checkout set --no-cone '/src/vs/**/*.ts' '/extensions/*/package.json' '/package.json'
git fetch --depth 1 --filter=blob:none origin tag 1.147.0
git checkout 1.147.0
cd -
node scripts/vscode-colors.ts ../vscode   # writes src/vscode-colors.ts, then prints a summary
```

The script:

- follows the static imports of the desktop workbench from `src/vs/workbench/workbench.desktop.main.ts`, in the order the modules run, and leaves out an import that only brings types, as the TypeScript compiler does. A file that registers colors but that the workbench does not load (today, two files of the Agents window in `src/vs/sessions/`) is listed in the summary;
- evaluates each call of `registerColor` in these modules, including the calls inside `for ... in` and `for ... of` loops (the ANSI colors of the terminal), and the colors written as `Color` objects. It stops with an error, and the line, on any code it cannot evaluate, rather than guess;
- adds the colors that the built-in extensions contribute in their `package.json` (today, the `gitDecoration.*` colors of Git), with the rules of VS Code: the high contrast defaults fall back to the dark and light ones;
- writes the version and the commit of VS Code in `VSCODE_SOURCE`, which the audit can report.

To move to another release of VS Code: check it out, run the script, read the diff of `src/vscode-colors.ts`, update the version in the test `the defaults come from the pinned release of VS Code`, in this file and in the comments of the ported files (after checking that those files did not change), and run `npm run check`. To go back, check out the previous `src/vscode-colors.ts` from git, or run the script again on the previous release.

### Checked against VS Code itself

`scripts/vscode-oracle.ts` records the colors that a real VS Code shows: for every registered color, the workbench writes a CSS variable `--vscode-<id>` with `theme.getColor(id, true)`, the same function. The script starts VS Code with a temporary profile (deleted at the end), loads the given extensions from copies without their code, selects each theme through the settings of that profile, and reads the variables through the remote debugging port of the window.

```sh
# macOS, with VS Code in /Applications; elsewhere, give the executable with --code
node scripts/vscode-oracle.ts --keys test/data/oracle-keys.txt test/data/vscode-oracle.json test/data/oracle-extension
```

The test `the colors that VS Code shows for the test themes` compares the package with this record: four themes of `test/data/oracle-extension`, one per theme type, and the 251 keys of `test/data/oracle-keys.txt`. The record comes from the version of VS Code that ran the script (it is written in the file), so the keys must have the same defaults in that version and in the pinned release: when you record again, check that the test still passes, and remove from the list a key whose default changed between the two. Without `--keys`, the script records every variable, to compare a larger set of themes. On November 21, 2026, the 178 themes of 20 of the most downloaded theme extensions on Open VSX and the 48 themes of 365 Day & Night gave 0 difference with VS Code 1.146.0 on 226,726 colors, with the defaults of that version.

What this does not cover: some views of VS Code choose another color in their own code when a key has no color, such as the terminal, which uses the background of the panel when `terminal.background` has none. The package gives the color of the key, as the theme and the defaults set it.

The code ported from Microsoft keeps its MIT license notice: see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## What the audit checks

`src/audit.ts` ports the checks of [`audit.py`](https://github.com/mickaellherminez/365-daynight-vscode-theme-ext/blob/main/scripts/themes/audit.py) and [`variety.py`](https://github.com/mickaellherminez/365-daynight-vscode-theme-ext/blob/main/scripts/themes/variety.py) of 365 Day & Night. `auditTheme()` checks one theme, `auditVariety()` compares the themes of one type in an extension. Every check, with its keys and its minimum, is listed for users in [docs/checks.md](docs/checks.md): a check added, removed or changed updates that page in the same pull request.

| Check | What it measures | Why |
| --- | --- | --- |
| Contrast | The WCAG 2 contrast ratio of a text color on its background: the editor and its selections, find matches, line numbers, the terminal and its ANSI colors, the debug console, the side bar, lists, tabs, the status bar, buttons, inputs, widgets, notifications, menus, Git decorations, chat, testing, notebooks, merge editor, symbols, Git graph, command center, agent sessions, each syntax category and each semantic rule, on the background and on the selection. A transparent color is composed on what is under it | [WCAG 2.2](https://www.w3.org/TR/WCAG22/#contrast-minimum): 4.5:1 for text (AA), 3:1 for indicators, borders and icons. In high contrast themes, text needs 7:1 (AAA), and in strict mode the main text too (editor, terminal, side bar, notebook cells) |
| Visible selection | The contrast between a selection, or the current line, and the background | Lower minimums (1.2 to 1.35; 2 or 3 in high contrast): project rules, to see where the selection is |
| Styles (WCAG 1.4.1) | Comments in italics, invalid code underlined, deprecated code struck through (TextMate, and the semantic rule `*.deprecated`), links underlined, Markdown headings and bold in bold, Markdown italics in italics | [WCAG 1.4.1, use of color](https://www.w3.org/TR/WCAG22/#use-of-color): this information must not rely on color alone. A failure in strict mode only; otherwise information, since the syntax also shows these tokens (`//`, `#`...) and VS Code itself strikes through deprecated code and underlines errors (`editor.showDeprecated`, diagnostics) |
| Color blindness | The CIEDE2000 difference between colors that must stay distinct: keyword, function, string, number, class, comment and variable; error, warning and info; added, modified and deleted; passed and failed tests; the 5 lines of the Git graph. In normal vision, and with every model of each deficiency (Machado 2009, Brettel 1997, Viénot 1999 for protanopia and deuteranopia, Brettel 1997 for tritanopia): the closest one counts | A difference of at least 7 is a project rule, not a standard. Models disagree, so a pair must stay distinct with all of them |
| Achromatopsia | The same difference between the syntax colors, seen without color | Information only: without color, syntax colors often differ only in lightness |

By default, the checks read the colors that VS Code shows: the theme, then the defaults of VS Code (see [Default colors](#default-colors)). A check whose color VS Code does not show at all is `missing`, which is information. Some views replace a missing color in their own code, and the checks do too: the terminal takes the background of the panel, and the cells of a notebook the editor background in high contrast. The terminal of VS Code also changes the color of each character until it reaches a contrast of 4.5:1 on the terminal background (`terminal.integrated.minimumContrastRatio`, 4.5 by default): the checks of the terminal text and of its ANSI colors measure that color, computed as xterm.js does (`terminalColor()`, ported from `rgba.ensureContrastRatio` of xterm.js 6.1.0-beta.337, the version of VS Code 1.147.0). In high contrast, where text needs 7:1, an ANSI color can still fail. The selected text of the terminal is measured on the selection as the theme writes it: xterm.js also turns an opaque selection into a transparent one and adjusts the selected text, which the package does not do yet. The semantic checks apply when the theme enables semantic highlighting, as VS Code shows semantic colors only then.

**Strict mode** (`{ strict: true }`) applies the rules of 365 Day & Night:

- the main text needs 7:1 (editor, terminal, side bar, notebook cells), the styles of WCAG 1.4.1 are failures, and the terminal is measured with the colors of the theme, without the minimum contrast of VS Code;
- the checks read only the colors that the theme sets, and a missing one is a failure. The inline chat, notebook, command center and agent session colors still follow the defaults that VS Code derives from other keys, as `audit.py` does;
- a syntax category that no rule of the theme colors is missing, except variables, which take the editor color;
- the keys of `PRIORITY_KEYS` (recent surfaces whose defaults in VS Code ignore the theme) and the semantic rules of `SEMANTIC_ROLES` must be set; the status bar button of the extension (`365DayNight.statusBarButton`) must be readable, and distinct from the status bar text (CIE76 of at least 15);
- the semantic checks apply even when the theme does not enable semantic highlighting;
- `auditVariety()` (strict mode only, since its thresholds are those of the project): the themes of one type must look different from each other. Each pair is compared on the editor background (CIE76 of at least 8, 4 in high contrast), the side bar (7, 4 in high contrast), the accent of the activity bar badge (25), and the mean of 6 syntax colors (18); at most 3 themes may share a hue family (8 sectors of 45° of the CIELAB hue, or neutral). The status bar, the CIEDE2000 means and the color blindness simulations are information.

Where the package and `audit.py` read a theme differently, the package follows VS Code: a rule for `keyword` also colors `keyword.operator`, while `audit.py` only takes the rules whose scope is exactly the one probed; the package also checks the symbol icons and ANSI colors that VS Code knows when the theme does not set them (not in strict mode). On the 48 themes of 365 Day & Night, these differences do not change any result.

### Same results as 365 Day & Night

`test/audit-parity.test.ts` runs the checks in strict mode on the 48 themes of 365 Day & Night and compares them with the results of `audit.py` and `variety.py` (`test/data/audit-reference.json`): the same checks in the same order, with the same status and minimum, the same pairs and models, and the same values to 0.01. The themes are copied in `test/data/365/`, under the MIT license of 365 Day & Night. To rebuild both from a clone of 365 Day & Night, at the commit to compare with:

```sh
python3 -I test/data/audit_reference.py ../365-daynight-vscode-theme-ext test/data
```

The script gives the labels in English, as the package writes them, and stops on a label it cannot translate: after a change of `audit.py`, add the translation, port the change to `src/audit.ts`, then run `npm test`. To go back to the previous results, check out `test/data/365/` and `test/data/audit-reference.json` from git.

## The command

`src/main.ts` reads the options, `src/report.ts` audits the paths and writes the report. `auditPaths()` gives the report as an object, in the JSON format; `textReport()` writes it for people, and `exitCode()` gives the exit code. `--format text|json|markdown` selects the renderer, with `--json` kept as an alias for `--format json`; contradictory formats fail with exit code 2. Both the space and equals forms take a value.

`src/markdown.ts` exports `markdownReport()`: the same audit, as GitHub Markdown for PR comments and job summaries. It escapes untrusted theme data and neutralizes mentions, preserves configuration reasons and information, and limits the output to 60,000 UTF-8 bytes. A truncation notice explains that the global totals still cover the complete audit. `test/markdown.test.ts` checks real audits, ignored results, unreadable themes, strict variety, hostile strings and large reports. To return to the text output, omit `--format` or use `--format text`; no JSON schema changes are involved.

The JSON format is described by [`schema/report-v1.schema.json`](schema/report-v1.schema.json) (JSON Schema 2020-12), published with the package. The schema refuses unknown fields, so a field added to the report must be added to the schema in the same pull request. Format 1 can gain fields; removing a field or changing its meaning means format 2: a new schema file, `REPORT_FORMAT` in `src/report.ts`, and a line in the CHANGELOG. `test/cli.test.ts` checks every option and exit code, and validates each JSON report against the schema with [Ajv](https://ajv.js.org/), a development dependency.

## The corpus

The package is also tested on real themes: the 20 most downloaded extensions of the Themes category of [Open VSX](https://open-vsx.org/) on 20 November 2026, 178 theme files. [`test/corpus/extensions.json`](test/corpus/extensions.json) fixes the version of each one and the SHA-256 of its `.vsix`, so that the test does not change when an extension publishes a new version.

The `.vsix` files are not committed: not every license of these extensions allows it, some have terms of their own and one gives no license. `npm run corpus` (`scripts/corpus.ts`) downloads those that are missing from Open VSX into `.cache/corpus/`, ignored by git, and checks their SHA-256. It needs the network once; after that, the files come from the cache.

```sh
npm run test:corpus   # download what is missing, then run test/corpus/*.test.ts
```

The test extracts each `.vsix` into a temporary folder as VS Code installs it: with [yauzl](https://github.com/thejoshwolfe/yauzl), the zip library of VS Code (a development dependency), only the entries under `extension`. It audits each extension in both modes and checks that nothing crashes, that each report is valid against its schema, and that the themes and warnings are those of [`test/corpus/expected.json`](test/corpus/expected.json): the empty colors of Monokai Pro, the `null` values of Night Owl, the arrays of GitHub Theme. It does not compare the measures: the other tests do that. `npm test` does not run it, so that it stays offline.

To move an extension of the corpus to another version, in a pull request of its own:

```sh
node scripts/corpus.ts --update <publisher.name>@<version>
npm run test:corpus
```

The script downloads that version and checks its SHA-256 against the one that Open VSX publishes. It then writes the version and the SHA-256 in `extensions.json` and writes `expected.json` again. The pull request shows the change of the themes and the warnings, to be explained in its description. After a change of the package that changes the themes or the warnings on purpose, `node scripts/corpus.ts --expected` writes `expected.json` again.

To go back, check out `test/corpus/` from git and run `npm run test:corpus`: the previous version is downloaded again. To free the space (about 23 MB), delete `.cache/corpus/`.

## Checks

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint, with the strict type-checked rules of typescript-eslint |
| `npm run typecheck` | TypeScript, without writing files |
| `npm test` | The tests of `test/*.test.ts`, with the test runner of Node.js, without the network |
| `npm run build` | Compiles `src/` to `dist/`, the only folder of code published to npm |
| `npm run build:action` | Bundles the GitHub Action and its licenses into `action/dist/`, tracked in Git and excluded from the npm package |
| `npm run check:action` | Builds the action in memory and compares it with the shipped files without changing them |
| `npm run test:action` | Runs the shipped action from an isolated folder without `node_modules` or the repository sources; also checks VSIX extraction and licenses |
| `npm run test:package` | Builds, then checks the content of the package that npm would publish (`test/package/`): `dist/`, the JSON schema, README, LICENSE, CHANGELOG and THIRD-PARTY-NOTICES only, under 120 kB (500 kB unpacked) |
| `npm run check` | Lint, types, source tests, npm build and package tests, then action reproducibility and isolated action tests; it does not rewrite the shipped action |
| `npm run test:corpus` | The corpus test, after downloading what the cache lacks |

The [CI workflow](.github/workflows/ci.yml) runs them on every push and pull request, on Linux, Windows and macOS, with Node.js 22 and 24: theme authors use all three, and paths (`include`, `tokenColors` as a file, extension folders) differ between them. It also runs the built command. Its corpus job runs on the same systems, and keeps the `.vsix` files in a GitHub Actions cache, downloaded again only when `extensions.json` changes. `.gitattributes` keeps line feeds in every text file, so that Windows checks out the same bytes as the other systems.

The size limit of the package is in `test/package/package.test.ts` (`MAX_SIZE`, `MAX_UNPACKED_SIZE`). When the package grows on purpose, raise it in the same pull request and say why; `npm pack --dry-run` gives the sizes. A file added to the package (`files` in `package.json`) is added to the list of that test.

The [CodeQL workflow](.github/workflows/codeql.yml) looks for security problems in the TypeScript code and in the workflows, on every pull request to `main`, on `main` and every Monday. Its results are in the Security tab.

## The GitHub Action

`action.yml` starts `action/dist/index.cjs` with the Node.js 24 runtime of GitHub Actions. `action/index.ts` embeds the package version at build time and starts `action/run.ts`, which reads literal inputs from the environment, calls `auditInputs()` directly, writes Markdown to `GITHUB_STEP_SUMMARY` and a copy in `RUNNER_TEMP`, sets its outputs, and returns 0, 1 or 2. It uses no shell, npm install, token or PR-comment API. The source tests inject an environment and output functions; each test file has its own temporary folder.

After changing anything used by the action, including its embedded package version or third-party notices:

```sh
npm run build:action
npm run check
```

Include `action/dist/index.cjs` and `action/dist/LICENSES.txt` in the same change. `scripts/action.ts` uses the pinned esbuild development dependency and records all bundled dependencies' license files, the project license and the existing third-party notices. It prefers the ESM entry of `jsonc-parser`: the UMD factory hides relative `require()` calls from the bundler. The isolated VSIX and configuration tests check that the action actually contains its dependencies. To undo a change, restore its sources, manifest/lockfile and generated action files together, then run the checks. The npm `dist/` stays generated and ignored; the action's `action/dist/` is deliberately tracked in Git.

The [action workflow](.github/workflows/action.yml) demonstrates the action in this repository on Linux, Windows and macOS, with the committed bundle of the checked-out revision and existing theme fixtures. It does not install dependencies or rebuild the action before calling it. Expected failures use `continue-on-error` and are asserted afterward; a production audit should fail its job normally. The existing CI also checks bundle reproducibility and isolated execution on both supported Node.js versions. This demonstration replaces a separate sample repository; it does not claim adoption by another repository.

The [public action workflow](.github/workflows/action-public.yml) verifies download of the reviewed 0.2.0 action commit `0f287bd6b42642f5c5f5d1c5e8c497630f695a57` on Ubuntu. A non-cone sparse checkout keeps only the theme fixtures, their configuration and the assertion script; a guard checks that the local action, engine sources and npm dependencies are absent. It calls the public action for the same success and expected failures, then checks the outputs and saved reports. This tests a fixed public revision; the three-system local demonstration tests the candidate commit. No new repository is needed.

To update the public test, commit and review the action changes, then replace all three public `uses` references and the matching SHA references in the README, action guide and this file with that commit's full SHA. The action commit and the reference update can be pushed together: the referenced commit is then in the branch history before the workflow starts. Rerun the workflow and inspect the actual job summary. Restore the previous references to go back. Before the first Marketplace listing, verify that the public test names the intended version and has passed. The owner publishes the listing on github.com; see [the action guide](docs/github-action.md#publication-on-the-marketplace) for requirements, the release/tag interaction and removal. Never create a version tag merely to test the listing: it triggers the npm release workflow.

## Pilot with theme authors

Follow the [pilot protocol](docs/pilot.md) for issue #19. It fixes the four feedback questions, records the audited input and tool version, and separates the corpus baseline from actual author feedback. Participant records, reports, contact details and replies stay outside the public repository and public CI artifacts. Only aggregated findings and the resulting decision belong in the public summary.

An invitation asks for participation and a private delivery channel before sharing a report. Keep drafts local until the maintainer authorizes outreach; do not post audit results in public issue trackers. A verified problem can become a separate, reproducible issue after removing identifying details or obtaining permission. The protocol also explains withdrawal and how to remove an optional audit workflow.

## Releases

Versions are published to npm only by the [release workflow](.github/workflows/release.yml), when a version tag is pushed. npm authenticates the workflow with OpenID Connect ([trusted publishing](https://docs.npmjs.com/trusted-publishers)): no npm token is stored in the repository. npm publishes the [provenance](https://docs.npmjs.com/generating-provenance-statements) of each version with it, which links the package to the workflow run and the commit it was built from; the npm page of the package shows it. `publishConfig` in `package.json` makes the package public and asks for this provenance.

To release a version:

1. **A pull request for the release**, from a branch such as `release/0.2.0`. It changes the version with `npm version 0.2.0 --no-git-tag-version`, which writes `package.json` and `package-lock.json`, then runs `npm run build:action` to update the version embedded in the shipped action. In the CHANGELOG, it renames `## [Unreleased]` to `## [0.2.0] - YYYY-MM-DD`, with the planned day of the release, and adds an empty `## [Unreleased]` above it. It also updates the README and the examples in `docs/` to describe the new version, without claiming that npm serves it before publication. Include the generated action files in the version commit. A second commit pins the public action test and the matching documentation to that reviewed version commit's full SHA; push both commits together and run the test. The pinned action bundle must be identical to the candidate bundle after this documentation update. Merge once the CI passes and the release has been approved. If publication moves to another day, update the CHANGELOG date before pushing the version tag.
2. **The tag**, on the merged commit of `main`:

   ```sh
   git switch main && git pull --ff-only
   git tag -a v0.2.0 -m "0.2.0"
   git push origin v0.2.0
   ```

3. **The workflow** then runs, in the `npm` environment of the repository. It checks that the tag is on `main` and names the version of `package.json`, and that npm is recent enough for trusted publishing (11.5.1 or later). It then runs `npm run check` and publishes to npm. Last, it creates the GitHub release, whose notes are the section of the CHANGELOG for that version (`scripts/release-notes.ts`). A failed step stops the release before anything is published, except the GitHub release, which comes last: if it fails, run its command again from the workflow file.
4. **The published package** is then checked by [`published.yml`](.github/workflows/published.yml), which the release workflow calls: on Linux, Windows and macOS, with Node.js 22 and 24, it waits until npm serves the version, then runs `npx vscode-theme-audit@<version> --version` in an empty folder and audits the 48 themes of `test/data/365`, which must pass every check, in text and in JSON. Check also the npm page of the version, which shows its provenance.

The same check runs by hand on any published version, `latest` by default: `gh workflow run published.yml -f version=0.1.0`, or **Actions**, **Published package**, **Run workflow**. A pull request that changes `published.yml` runs it on the latest version.

Only release versions (`v1.2.3`) start the workflow: a prerelease would need its own npm dist-tag, which the workflow does not set.

### The first version

npm can configure a trusted publisher only for a package that already exists. The first version, 0.1.0, is therefore published once with a short-lived token, by the same workflow, so that it still has its provenance:

1. On npmjs.com, **Access Tokens**, **Generate New Token**: a granular access token with the permission *Read and write (publish and stage)* on *All Packages* (the package does not exist yet), *Bypass two-factor authentication* checked (the workflow cannot type a code), and the shortest expiration (1 day).
2. On GitHub, in the settings of the repository, **Environments**, `npm`: a secret `NPM_TOKEN` with this token. The workflow gives it to npm as `NODE_AUTH_TOKEN`.
3. Push the tag `v0.1.0`, as above.
4. Once 0.1.0 is on npm: in the settings of the package on npmjs.com, **Trusted Publisher**, GitHub Actions, with the user `mickaellherminez`, the repository `vscode-theme-audit`, the workflow `release.yml` and the environment `npm`. Under **Allowed actions**, check *Allow `npm publish`*: the workflow publishes directly. npm advises against it and prefers staged publishing, where each version waits for a maintainer to approve it with two-factor authentication; the workflow would then run `npm stage publish`. Then **Set up connection**. In **Publishing access**, choose *Require two-factor authentication and disallow bypass 2fa tokens*, then **Update Package Settings**.
5. Delete the secret `NPM_TOKEN` on GitHub and the token on npmjs.com.

From then on, the workflow publishes without a token. A new trusted publisher stays *Pending validation* until a version is published with it, which must happen within 2 days: 0.1.1 was published for that, without a token. If a connection expires before a release, delete it and create it again with the same fields, just before pushing the tag.

### Going back

npm never allows a version number to be used again, even after it is removed. To withdraw a version, publish a fixed one, then mark the bad one with `npm deprecate vscode-theme-audit@<version> "<reason>"`: npm warns whoever installs it. `npm unpublish vscode-theme-audit@<version>` removes it only under the [conditions of npm](https://docs.npmjs.com/policies/unpublish), such as within 72 hours of its publication. A GitHub release can be deleted with `gh release delete v<version>`, and its tag with `git push origin --delete v<version>`. A tag pushed by mistake, before the workflow publishes, can be stopped by cancelling the workflow run.

## Documentation

| File | For | Content |
| --- | --- | --- |
| [README.md](README.md) | Theme authors | Every way to run it, the options and exit codes, how to read the report, the CI, the API, the limits, how to uninstall |
| [docs/checks.md](docs/checks.md) | Theme authors | Every check, its keys, its minimum and its references |
| [docs/report-format.md](docs/report-format.md) | CI and scripts | The JSON report, field by field |
| [docs/github-action.md](docs/github-action.md) | Theme authors and maintainers | Action inputs, outputs, demonstration, fixed versions, Marketplace publication and removal |
| [docs/pilot.md](docs/pilot.md) | Pilot participants and maintainers | Private reports, shared questions, aggregate findings, completion and withdrawal |
| [CHANGELOG.md](CHANGELOG.md) | Everyone | The changes of each release |
| This file | Contributors | How the package follows VS Code, and how it is tested |

The examples of the README and of `docs/` are real outputs of the command on the test themes of `test/data/oracle-extension/`: after a change of the checks or of the report, run the command again and update them. The README is published on npm with the package, and links to the other files of the repository.

## Pull requests

Each change starts from an issue, and its pull request links to it. Describe what changes, what you checked, and update the [CHANGELOG](CHANGELOG.md) and the documentation that the change touches.
