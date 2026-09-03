# ForkRoom post-judging hardening lab

This branch verifies `ForkRoom v1.1.0-post.1` without modifying the frozen WebMCP Challenge repository.

## Immutable challenge entry

- Public repository: https://github.com/streetquant/forkroom-webmcp
- Canonical release: https://github.com/streetquant/forkroom-webmcp/releases/tag/v1.0.2
- Frozen source commit: `9b42593ac2cb03d645cda5dc1dbb910fd859a0ac`

## Candidate

The patch in this directory applies to the `v1.0.2` tag and adds:

- deep, bounded snapshot validation;
- `expected_revision` optimistic-concurrency guards on all seven proposal tools;
- `basedOnRevision` proposal provenance;
- structured invocation/effect/model-revision receipts;
- incubator-main `consequentialHint` annotations;
- 35 deterministic tests across five files.

The workflow on this branch clones the public `v1.0.2` tag, applies the patch, installs exact dependencies, runs the static WebMCP contract audit, lint, all tests, production build, standalone syntax validation, and executable standalone boot. It then packages a candidate artifact. This branch is development evidence only and is not the judged submission.
