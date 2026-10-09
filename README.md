# .github

Organization-wide defaults for Senzu Labs repositories.

- `pull_request_template.md`: default pull request body for every repository without its own template. A repository's own template overrides it.

The GitHub web form fills the template in. `gh pr create --body` and `--fill` skip it, so agents write these six sections explicitly.
