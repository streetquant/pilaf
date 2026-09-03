# Post-submission development notice

This source tree is the **ForkRoom v1.1.0-post.1 hardening candidate**.

The official WebMCP Challenge submission is frozen at:

- repository: https://github.com/streetquant/forkroom-webmcp
- release: https://github.com/streetquant/forkroom-webmcp/releases/tag/v1.0.2
- commit: `9b42593ac2cb03d645cda5dc1dbb910fd859a0ac`

This candidate was developed after the submission deadline in an isolated lab. It must not replace or modify the judged repository, live application, release, Devpost entry, or video during judging.

## Candidate scope

- deep snapshot validation;
- optimistic revision preconditions on all seven proposal tools;
- execution receipts with invocation ID, effect, and before/after model revision;
- forward-compatible `consequentialHint` annotations for proposal tools;
- expanded deterministic verification.

The candidate preserves the same 16 tools and the same rule: an agent may stage a proposal, but only a visible human action can approve or reject it.
