# ForkRoom v1.1.0-post.2 clean-room migration

This directory reconstructs one checksum-pinned patch against the verified public `forkroom-v1.1.0-post.1-source` branch.

The migration workflow applies the patch in a fresh clone, installs the exact lockfile, audits runtime dependencies, runs the static WebMCP authority/integrity audit, lint, all 59 tests, the TypeScript/Vite production build, standalone generation, and executable standalone boot. Only a passing candidate is pushed to `forkroom-v1.1.0-post.2-source`.

That exact source commit independently triggers:

1. the verification workflow;
2. verified live publication to `forkroom-v1.1.0-post.2-live`;
3. release packaging with SPDX and CycloneDX SBOMs, SLSA provenance, and GitHub/Sigstore attestations.

The frozen competition repository `streetquant/forkroom-webmcp` is not modified.
