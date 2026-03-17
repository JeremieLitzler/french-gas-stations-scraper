# Pipeline Fix — Reduce Agent Verbosity and Repetition (#32)

## Problem

Two pipeline agents produce outputs that are too long and repeat information across every issue run.

### agent-1-specs (business-specifications.md)

- Writes 3–6 examples per rule in the Example Mapping section; most are obvious corollaries of the rule itself.
- Adds a standalone "Edge Cases" section that duplicates content already in the Rules section.
- Outputs 130–190+ lines per spec when 60 would suffice.

### agent-5-security (security-guidelines.md)

- Includes project-wide boilerplate in every issue (e.g. "No new external dependencies", "No v-html") even when the feature does not introduce those risks. "No v-html" is already governed by ADR-007.
- Restates constraints already present in `business-specifications.md`.
- Writes 2–3 sentence Why explanations when one sentence is enough.

## Fix

### agent-1-specs.md

Add the following conciseness rules to the agent instructions:

- Write at most **1 example per rule**. Omit the example if the rule is self-evident.
- Integrate edge cases directly into the rule they qualify — no standalone Edge Cases section.
- Do not repeat content from CLAUDE.md, existing ADRs, or the README; reference them by name.
- Target **60 lines maximum** for the output file.

### agent-5-security.md

Add the following conciseness rules to the agent instructions:

- Skip any scope area (dependencies, secrets, CORS, etc.) not touched by this feature — no "N/A" rules.
- Do not include rules already covered by an existing ADR — cite the ADR number if relevant.
- Do not restate constraints already present in `business-specifications.md`.
- Keep each Why to **one sentence**.
- Target **4–6 rules maximum**; a small-surface feature may need only 2–3.

## Files changed

- `.claude/agents/agent-1-specs.md`
- `.claude/agents/agent-5-security.md`
