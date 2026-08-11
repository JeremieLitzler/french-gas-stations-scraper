# Test Cases: Discontinue `release.yml`

**Issue:** #148

This is a structural/cleanup task — removing a workflow file, a config file, npm dependencies, an orphaned script, and updating ADR documentation. It has no runtime-observable behaviour in the Vue application (no component, composable, or util changes).

No runtime tests — verified by `vue-tsc`.

status: ready
