# Host access

Reuse the current session's access when normal file operations succeed. Do not create probe files, rescan all permissions every stage or treat a second project as permission for the current conversation. Keep the materials directory separate from repository roots and set the correct working directory for engineering commands.

When access is missing, name the exact delivery/repository path and the needed operation. Retain the original request and continuation context. Do not disable host permission controls, grant the entire home directory or silently move materials into the repository.

- Codex: explicitly select Aimship (CLI `$aimship`). If CLI startup is needed, verify the executable/version/help and use its supported `--cd` and repeated `--add-dir` syntax for the needed writable directories. For desktop, rely on the actual current interface or official guidance; never invent a directory button or claim a prepared path has been granted access.
- Cursor: explicitly use `/aimship`. When useful, prepare `host/cursor.code-workspace` inside the delivery with `folders` entries only, referencing materials and repositories; preserve an existing workspace's settings. The user opens/adds folders when necessary. For CLI verify the exact executable (do not assume bare `agent` is Cursor) and current `--workspace` / `--add-dir` support.
- Claude Code: explicitly use `/aimship`; verify current `/add-dir` or `--add-dir` behavior when additional access is needed. Do not fork the skill or start a subagent.

Installation discovery, actual selection, model behavior, directory access and continuation are separate evidence levels. Codex/Cursor share the managed `.agents/skills/aimship` entry; Claude Code uses `.claude/skills/aimship`. A host may discover both, including when it is not registered with Aimship. Registration controls installer-managed connections, not another host’s compatibility scanning. Managed entries must point to the same stable installation; do not assume duplicate precedence or delete unrelated entries. Record duplicates as observed, and consult the published support matrix for tested surfaces.

After compaction or manual switching, reload the fixed-version core, state and current-stage inputs if missing. Do not rely on a host retaining all skill text. If even the binding location is absent, request the delivery path. Re-invoking an entry to restore context continues the existing delivery; it does not create another one.

When changing hosts, use the same delivery directory and state; do not duplicate requirements, Scope or design to establish a new session. Permissions must be granted separately in each host. Keep one writing host/session for the delivery. User-facing entry/reload and lifecycle instructions are in [the installation guide](../../../docs/installation.md).
