# Implementation rules

- Work only on the paths allowed by the current work package. Request approval
  in the PR before changing another path. WP1's two legacy fixture fixes were
  approved in https://github.com/liyun95/md2md/pull/1#issuecomment-6310296529
  and must remain in their own commit.
- Use a separate worktree outside the main checkout, e.g.
  `~/worktrees/md2md/<branch>`. Do not touch uncommitted files in other checkouts.
- One agent owns one work package, branch and worktree. Concurrent packages must
  not edit the same files. Shared contracts have one owner; discuss changes in
  the PR. Start from the latest master, do not stack unmerged packages, and
  synchronize master after a dependency merges.
- Keep parsing pure: no filesystem, network or Git access in parsing code.
  If introducing `core/`, keep all external access in `adapters/`, and never
  import `lark/` from `core/`.
- Do not edit `test/spec/requirements.json`; it is an unchanged copy from the
  design repository, including its `prd_commit`.
- Do not change baseline output unless the task explicitly requires it; explain
  every such change in the PR. Do not change existing test expectations.
- Do not edit product requirements or technical designs. Raise contradictions
  and missing decisions in the PR for the coordinator to resolve.
- Run the required L1 checks before review and record commands and results,
  including anything skipped or unfinished.
- PR descriptions use these five sections: Summary, Requirements covered, Tests,
  Golden output changes, Deviations from the design. Reply to review comments
  with the changes and validation performed.
- All content intended for upstream must be in English, including code,
  comments, test names, commit messages, `AGENTS.md`, and PR titles and
  descriptions. Use the upstream conventional commit style for PR titles.
  Review discussions in the fork may be in Chinese. Code must depend only on
  requirement IDs and `area_id`, not on the Chinese descriptions retained in
  the copied `requirements.json`.
- WP1 does not change the existing release workflow, open upstream PRs, or
  merge PRs. Mark the fork PR ready only after verification. R1 version pinning
  is a coordinator-owned merge prerequisite.
