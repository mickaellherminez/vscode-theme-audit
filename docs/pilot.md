# Theme-author pilot

This is the protocol for [#19](https://github.com/mickaellherminez/vscode-theme-audit/issues/19), not a report of completed research. Status on November 25, 2026: recruitment. Invitations have been sent; no participant feedback has been collected yet. The pilot asks whether the audit is correct, understandable and useful before deciding whether to pursue scores, rankings or badges.

## If you were invited

- You receive only the report of your own theme, through a private channel you choose.
- You answer four questions; your report and answers stay private.
- The public summary contains aggregate counts only, without naming or ranking themes or authors.
- You can decline, or withdraw before the agreed publication date, by replying in the invitation thread or the private channel. Your contact details and feedback are then deleted on request.

## Participants and consent

Recruit 3 to 10 distinct theme authors or maintainer representatives. Seek different theme types and maintenance workflows, rather than selecting authors by audit failure counts. A team nominates one representative; count the same author only once, even if they maintain several themes. Responses from the same project or maintainer group do not count as independent authors.

Invite people through their stated contact channels. If only a public issue tracker is available, an authorized invitation may ask for opt-in and a private contact channel; it must contain no report, audit totals or assessment of the theme.

Before sharing, agree privately on:

- The theme version or commit, the report recipient and the private delivery channel.
- Participation in the four-question review, and whether the response may be included in an aggregate summary.
- A review date before publication. The author can withdraw before publication; exclude their response and delete their contact details and feedback if requested. Do not promise that already published aggregate counts can be attributed back to an author and removed precisely.

Send each author only the report of their own theme. Keep invitations, identities, consent records, raw reports, theme archives and replies outside Git and public CI logs or artifacts. Do not publish named results, comparisons, quotations or screenshots. Review a delivery copy for irrelevant private paths; retain the original and record any redaction.

The invitation sent to theme maintainers; only the theme name changed between invitations:

> I maintain [vscode-theme-audit](https://github.com/mickaellherminez/vscode-theme-audit), an MIT-licensed accessibility audit for VS Code color themes.
>
> Would you be interested in reviewing a private report for an agreed version of [theme] as part of a small pilot, and answering four short questions about correctness, clarity, CI usefulness and missing features?
>
> I would send only your own reports through a private channel you choose. Audit reports and questionnaire answers would stay private; any public summary would contain aggregate findings without identifying or ranking participants or themes. There is no expectation that you change your theme or adopt the tool.
>
> If interested, which theme version and private delivery channel would you prefer? Please feel free to decline or close this invitation if it is not appropriate here.

## Prepare a reproducible report

Use **vscode-theme-audit 0.2.0**, whose engine follows VS Code **1.147.0**, with Node.js 22.18 or later. Start in general mode: do not pass `--strict`, which applies the rules of 365 Day & Night. Record any discovered configuration; a configured report is not the default audit. Do not change thresholds or exceptions silently between participants.

The frozen corpus contains 20 extensions and 178 declared themes. Run it as a technical baseline using the versions and SHA-256 values in [the corpus list](../test/corpus/extensions.json). It is a historical snapshot, not evidence of current theme quality or author feedback. Confirm the input version with each participant and audit it again if they choose a different version.

Keep one private record per audited input:

| Record | Required evidence |
| --- | --- |
| Input | Extension id, version or commit, source URL, file list and SHA-256 of the `.vsix` or input files |
| Tool | Exact audit package version, npm package integrity or source commit, and the report's VS Code version/commit |
| Environment | Date, operating system, Node.js/npm versions and complete command |
| Configuration | General/strict mode, configuration contents and SHA-256 or absence, effective thresholds and exceptions |
| Output | JSON, Markdown, standard error, exit codes and report SHA-256 values |
| Review | Private participant id, consent, report revision and dates of delivery and response |

Run from a private working folder. This Bash example accepts an agreed extension folder, theme file or `.vsix`; replace the placeholder input. An Open VSX input must include its version, such as `open-vsx:publisher.name@1.2.3`.

```sh
input='/path/to/theme.vsix'
json_exit=0
npx --yes vscode-theme-audit@0.2.0 "$input" --format json > report.json 2> report-json.stderr || json_exit=$?
markdown_exit=0
npx --yes vscode-theme-audit@0.2.0 "$input" --format markdown > report.md 2> report-markdown.stderr || markdown_exit=$?
printf '%s\n' "$json_exit" > report-json.exit
printf '%s\n' "$markdown_exit" > report-markdown.exit
```

If an agreed configuration is required, add `--config /path/to/config.json` to both commands and retain that file. See [configuration](../README.md#configuration) for discovery and exceptions.

Exit `0` means the checks pass; `1` means an audit finding; `2` means an input, configuration or usage error. Inspect standard error and require a valid JSON report before treating a nonzero `npx` result as an audit finding. Resolve execution errors before asking an author to assess results. The JSON retains every result; Markdown can truncate details at 60,000 UTF-8 bytes and says when it does. See [report format](report-format.md) and [check definitions and limits](checks.md).

Give the author the input/version, mode and configuration with both reports. Explain the difference between WCAG contrast requirements, project thresholds, simulated vision and observed rendering. Ask them to point to concrete examples; an author's disagreement is feedback to investigate, not automatically a confirmed engine defect.

## Ask the same four questions

Use these exact questions for every participant and retain their answers privately. Clarifying follow-ups may request evidence, but must not steer the answer.

1. **Correctness** — Does the report describe your theme correctly? Please point to a result you agree with or dispute, with its theme/check label and your reason. **Yes / Partly / No / Not sure**.
2. **Clarity** — Can you understand what the results mean and what you would change, if anything? Which wording or example needs improvement? **Yes / Partly / No / Not sure**.
3. **CI usefulness** — Would you use this audit in your CI? Why or why not, and what would you need before doing so? **Yes / Maybe / No / Not sure**.
4. **Missing** — What is missing, unnecessary or misleading for your theme-author workflow? If nothing, say so. **Free text**.

“Not sure” is an answered question. A blank answer is missing, not “No”. Ask once for clarification if needed; record unanswered questions as missing. An explicit “nothing” answers question 4. Count a complete response only when all four questions are answered, including “Not sure”. Distinguish consent to participate from consent to include the response in the public aggregate.

## Aggregate findings and write the decision

Use authors as the unit of analysis, not theme variants or number of findings. Report the counts invited, opted in, sent a usable report, responded, withdrawn and included, with the denominator for each question. Do not infer an answer from a nonresponse or count multiple revisions as new participants.

Publish aggregate counts and broad recurring needs only. Remove identities, extension names, input links and combinations that could identify someone in this small group. Do not publish a theme leaderboard or aggregate failure totals that invite one. Paraphrase feedback without distinctive details; keep raw evidence private.

Fill this summary template only after real feedback exists; replace every placeholder with a verified count or an explicit missing value:

| Measure | Result |
| --- | --- |
| Authors invited / opted in / sent a usable report | `<counts>` |
| Complete responses included / withdrawn / incomplete | `<counts>` |
| Q1: Yes / Partly / No / Not sure / missing | `<counts and denominator>` |
| Q2: Yes / Partly / No / Not sure / missing | `<counts and denominator>` |
| Q3: Yes / Maybe / No / Not sure / missing | `<counts and denominator>` |
| Q4: Broad needs and responses saying nothing is missing | `<aggregate counts and denominator>` |
| Reproduced audit defects / unresolved disagreements | `<aggregate counts and investigation status>` |

State the tested tool versions, modes, recruitment method, review period and exclusions. This small, voluntary sample can guide development; it does not estimate adoption, prove accessibility, represent all authors or validate a numerical score. Separate intended CI use from a CI installation actually observed.

In #19, write the evidence, limitations and decision: keep the current approach, fix reporting or engine problems, investigate additional checks, or separately evaluate a score or badge. Explain what evidence supports the choice, what remains uncertain and the next work. Finishing a pilot does not automatically approve a score, ranking or badge.

Keep #19 open until at least **three distinct, independent authors have given complete feedback**, the aggregate summary is published, and the decision is written in the issue. If fewer respond, record the incomplete pilot and continue recruitment; corpus runs or invitations do not satisfy this condition.

## Leave the pilot or undo an integration

An author may decline or withdraw before the agreed publication date without changing their theme or adopting the audit. Stop contact after a decline. Remove an optional audit dependency or workflow using [the uninstall instructions](../README.md#uninstall) and [the action removal guide](github-action.md#update-or-remove-it). Delete local report copies when no longer needed. Removing a workflow does not delete reports from earlier GitHub runs; keep pilot data out of public runs from the start.
