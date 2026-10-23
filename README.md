# .github

Organization-wide defaults for Senzu Labs repositories.

- `pull_request_template.md`: default pull request body for every repository without its own template. A repository's own template overrides it.

The GitHub web form fills the template in. `gh pr create --body` and `--fill` skip it, so agents write these six sections explicitly.

## PR description check

`.github/workflows/pr-description.yml` validates each of the six template sections.
HTML comments do not count as content; headings inside code fences do not count
as sections. Write `None` for sections that do not apply. Outcome must explain
the change in plain English; the check validates structure, not writing quality.

The local `pr-description-check.yml` caller runs on this repository's pull requests; the validator exposes `workflow_call`
for other repositories. Call it from a workflow with these events and no path or
branch filters:

```yaml
name: PR description
on:
  pull_request:
    types: [opened, edited, synchronize, reopened, ready_for_review]
permissions:
  pull-requests: read
jobs:
  description:
    uses: senzu-labs/.github/.github/workflows/pr-description.yml@<full-commit-sha>
```

Pin the caller to the reviewed workflow commit. Require the reported check
`description / PR description` from GitHub Actions in the organization ruleset.
Drafts skip the validator job; `ready_for_review` runs real validation. The check
reads the latest PR body through the API, without checkout or executing PR code.
Edits revalidate the body even when the head commit does not change.

GitHub Team supports organization-required status checks, but organization-required
workflows require Enterprise Cloud. Required workflows also ignore activity-type
filters and do not trigger on body edits or readiness changes. Use repository
callers plus a required status check on Team. Merge callers everywhere before
enabling the ruleset; requiring a check does not install its workflow. Existing
open PRs need a new event after rollout.

Sources: [ruleset workflow events](https://docs.github.com/en/enterprise-cloud@latest/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules#supported-ruleset-workflow-events),
[required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-status-checks-to-pass-before-merging).

Local checks: `bun test` and `actionlint .github/workflows/*.yml`.
