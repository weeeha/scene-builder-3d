#!/usr/bin/env bash
set -euo pipefail

# scripts/sync-ui.sh [path-to-Minimal-Design-System-checkout]
#
# Vendors @weeeha/ui into packages/ui at the upstream checkout's current
# commit. Never edit files under packages/ui by hand: a fix goes upstream,
# in the Minimal Design System repo, then this script runs again.

SRC="${1:-/Users/nickv/ClaudeCode Projects/Minimal Design System}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_DIR="$REPO_ROOT/packages/ui"

if [ ! -f "$SRC/package.json" ]; then
  echo "Error: no package.json at $SRC. Pass the Minimal Design System checkout path as the first argument." >&2
  exit 1
fi

if ! git -C "$SRC" rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Error: $SRC is not a git checkout." >&2
  exit 1
fi

# Scoped to exactly what this script reads: src/, package.json,
# postcss.config.mjs, LICENSE. The upstream checkout regularly carries
# unrelated untracked docs (review notes, spec drafts) outside those paths;
# a whole-tree dirty check would block every run over files this script
# never touches.
SCOPED_STATUS="$(git -C "$SRC" status --porcelain -- src package.json postcss.config.mjs LICENSE)"

if [ -n "$SCOPED_STATUS" ]; then
  echo "Error: $SRC has uncommitted or untracked changes in the files this script vendors (src, package.json, postcss.config.mjs, LICENSE). Commit or stash them upstream, then re-run." >&2
  echo "$SCOPED_STATUS" >&2
  exit 1
fi

UPSTREAM_SHA="$(git -C "$SRC" rev-parse HEAD)"
UPSTREAM_DATE="$(git -C "$SRC" log -1 --format=%cd --date=short)"

if [ -n "$(git -C "$SRC" status --porcelain)" ]; then
  REST_DIRTY="yes (outside the vendored files, not blocking)"
else
  REST_DIRTY="no"
fi

mkdir -p "$PKG_DIR"

rsync -a --delete \
  --exclude='*.stories.tsx' \
  --exclude='*.test.ts' \
  --exclude='*.test.tsx' \
  --exclude='*.mdx' \
  "$SRC/src/" "$PKG_DIR/src/"

cp "$SRC/postcss.config.mjs" "$PKG_DIR/postcss.config.mjs"
cp "$SRC/LICENSE" "$PKG_DIR/LICENSE"

SRC="$SRC" PKG_DIR="$PKG_DIR" node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const src = process.env.SRC;
const pkgDir = process.env.PKG_DIR;

const upstream = JSON.parse(readFileSync(join(src, "package.json"), "utf8"));

const exportsOut = {};
for (const [key, value] of Object.entries(upstream.exports ?? {})) {
  if (key.includes(".stories")) continue;
  exportsOut[key] = value;
}

const out = {
  name: upstream.name,
  version: upstream.version,
  exports: exportsOut,
  dependencies: upstream.dependencies,
  peerDependencies: upstream.peerDependencies,
};

writeFileSync(
  join(pkgDir, "package.json"),
  JSON.stringify(out, null, 2) + "\n"
);
NODE

SYNCED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$PKG_DIR/VENDORED.md" <<EOF
# Vendored: @weeeha/ui

- Source: $SRC
- Upstream commit: $UPSTREAM_SHA
- Upstream commit date: $UPSTREAM_DATE
- Synced: $SYNCED_AT
- Rest of checkout dirty at sync time (outside src, package.json, postcss.config.mjs, LICENSE): $REST_DIRTY

Command used:

\`\`\`
scripts/sync-ui.sh "$SRC"
\`\`\`

Never edit files under \`packages/ui\` by hand. A fix goes upstream, in the
Minimal Design System repo, followed by a re-sync with this script.
EOF

echo "Vendored @weeeha/ui from $SRC at $UPSTREAM_SHA ($UPSTREAM_DATE)"
