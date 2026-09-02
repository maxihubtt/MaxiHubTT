---
name: Workspace package linking
description: A package added to a nested pnpm workspace may need a full offline install to create local links.
---

When a new workspace package is added and the dependency store already contains the needed packages, use pnpm offline installation with a non-frozen lockfile to refresh workspace links.

**Why:** The Replit package helper can interpret a nested package request as an unsafe workspace-root add, while the existing pnpm store is already sufficient.

**How to apply:** Confirm packages are present in the pnpm store, then synchronize the workspace before diagnosing missing-module or missing-binary errors.