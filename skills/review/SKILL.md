---
name: review
description: Review a Kaylo plan or implemented changes against the agreed outcome. Use before building uncertain work or before closing completed work.
---

# Review the work

Review either `plan` or `changes`. If unspecified, inspect `PLAN.md` and the working changes to choose the relevant target; ask only if the target remains ambiguous.

1. Prefer a fresh reviewer conversation or subagent when available within the user's tools and budget. Give it this package's `agents/reviewer.md` brief, the objective, plan, relevant repository instructions, and the exact files or diff being reviewed, including untracked files in scope. Include requirements and facts, not the author's defense of the approach. Without a fresh context, perform the review and disclose that limitation.
2. For a plan, check whether it delivers the requested outcome, uses existing capabilities, has executable tasks and correct dependencies, and specifies meaningful verification. Identify decisions that a small-model builder would otherwise have to guess.
3. For changes, inspect the actual implementation and relevant callers against acceptance criteria. Check correctness, regressions, and applicable security, accessibility, or data-handling concerns. Also look for duplicated capability, unnecessary dependencies, and speculative abstractions. Fewer lines alone is not a reason to change readable, correct code. Read recorded verification and run a focused missing check when useful. Do not blindly rerun passing checks for unchanged inputs.
4. Report concrete issues with a file or task reference, an observable failure or unmet requirement, and the smallest useful correction. Separate blockers from optional improvements. Do not make preferences or hypothetical future features release blockers.
5. Check existing findings before adding another. Rechecking a fix should focus on the finding and affected behavior; widen review only when new evidence warrants it.
6. Record the review target, findings, coverage, and limitations in the review section of `PLAN.md`. A delegated reviewer returns its report without editing shared plan state; the guiding assistant records it. Keep unresolved findings visible until fixed or explicitly accepted by the user.

Do not implement fixes during review. A valid result can be no findings; never invent a problem to justify the review. Passing tests alone do not establish that the intended behavior is wired into the product.

Finish with whether the target is ready, the concrete blockers if any, and one next step: `/kaylo:plan` for plan corrections, `/kaylo:build` for implementation fixes, or `/kaylo:close` when the implementation is ready. A successful plan review leads to agreement if still needed, then build.
