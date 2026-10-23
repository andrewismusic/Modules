# Moment · Prism · Relay

A product line of three Eurorack modules and a desktop instrument:

| Device | What it is |
|---|---|
| **Moment** | Freezer |
| **Prism** | Spectral processor |
| **Relay** | Macro multi-effect, as a module and as a desktop pyramid |

## Status

The design is complete as a browser prototype, `prototype/moment-prism-relay-v30.html`. Open it in a desktop
browser and press Play.

The repository is being set up to split that prototype into shared code and per-device demos, then port the DSP to
C++ for hardware and plugins. See `docs/HANDOFF.md`.

## Where to look

| What | Where |
|---|---|
| Handoff and plan | `docs/HANDOFF.md` |
| Shared design language and controls | `docs/design-language.md` |
| Device specs | `devices/relay/SPEC.md`, `devices/moment/SPEC.md`, `devices/prism/SPEC.md` |
| What was tried and removed | `docs/decisions.md` |

## Setting up the repository

1. Unzip this package into an empty folder.
2. Create a new, empty GitHub repository. Don't add a README or licence when GitHub offers to.
3. Put the folder's contents into that repository, either way:
   - **Claude Code on your computer:** open Claude Code in the unzipped folder and ask it to make the first commit and
     push to the new repository.
   - **GitHub website:** on the new repository's page choose "uploading an existing file", drag in everything inside
     the unzipped folder, keeping the folder structure, and commit.
4. Start Claude Code on the repository with: "Read docs/HANDOFF.md and CLAUDE.md, then plan Phase 1 starting with
   the Relay web demo. Ask me anything that's unclear before building."
