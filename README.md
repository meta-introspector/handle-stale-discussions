# "Handle Stale Discussions" Action for Github Action

This Github action checks the **answerable discussions** in your repository for an answer with the keyword `@bot proposed-answer`. If a positive reaction (thumbsup, laughing, rocket, heart, hooray) is received on the proposed answer, the discussion is marked answered and closed. Otherwise if a negative reaction (thumbsdown, confused) is added, a label (`attention` by default) is added so the discussion can gain attention from the repository maintainers. In case of no reaction on proposed answer for 7 days, a reminder is sent to discussion author to provide their response. If there is still no response after 4 days, the discussion will close as being stale.

## Steps to enable this action in your repository

1. Generate GitHub token with repo scope access in [Settings](https://github.com/settings/tokens) if you do not already have one.
2. Make sure your repo contains a label named `attention`, or a different label that can be provided as input.
3. Include this action in a GitHub workflow. Just below you can find an example workflow file you can put in `.github/workflows` that 
will run this action every 4 hours.

### Example workflow file

```yaml
name: "Handle stale discussions"
on:
  schedule:
    - cron: '0 */6 * * *'

jobs:
  run-action:
    name: Handle stale discussions
    runs-on: ubuntu-latest
    steps:
      - uses: aws-github-ops/handle-stale-discussions@main
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          attention-label: needs-attention
```

## Contributing 

We welcome community contributions and pull requests. See [CONTRIBUTING.md](https://github.com/aws-github-ops/handle-stale-discussions/blob/main/CONTRIBUTING.md) for information on how to submit code.
