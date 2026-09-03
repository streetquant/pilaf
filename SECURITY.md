# Security policy

ForkRoom is a public, time-bounded WebMCP Challenge project.

## Report a vulnerability

Please open a GitHub issue for non-sensitive defects and include:

- affected commit or live build;
- browser and WebMCP host;
- minimal reproduction steps;
- expected versus observed authority or data transition;
- whether the issue permits silent mutation, self-approval, injection, or disclosure.

Do not include confidential decision data, credentials, tokens, personal information, or a weaponized proof of concept in a public issue. For a sensitive report, contact the repository owner privately through the GitHub profile.

## Supported version

The supported challenge version is the latest commit on `main` whose **Verify ForkRoom** and **Publish live judge build** workflows both pass. The `live/SOURCE_COMMIT` file identifies the source revision used to produce the deployed artifact.

## Security model

The principal enforced property is decision-authority integrity: agents can inspect, analyze, navigate, and stage proposals but cannot approve or reject their own proposals or directly mutate normative model inputs.

The challenge preview is not intended for confidential production decisions. Read the complete threat model, controls, residual risks, and production hardening plan in [`docs/SECURITY.md`](./docs/SECURITY.md).
