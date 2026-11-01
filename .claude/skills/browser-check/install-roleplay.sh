#!/usr/bin/env bash
# Put a Roleplay checkout into a throwaway engine started by start.sh, as the user's installed app, and install its
# own node_modules (the in-browser build needs them). The shell builds the app on its first open (about 40 s).
#   .claude/skills/browser-check/install-roleplay.sh <WORK> <roleplay checkout>
set -euo pipefail
WORK="${1:?usage: install-roleplay.sh WORK ROLEPLAY_CHECKOUT}"
SRC="${2:?usage: install-roleplay.sh WORK ROLEPLAY_CHECKOUT}"
[ -f "$WORK/env" ] || { echo "no $WORK/env: run start.sh first"; exit 1; }
[ -f "$SRC/manifest.json" ] || { echo "$SRC is not a Roleplay checkout (no manifest.json)"; exit 1; }
# shellcheck disable=SC1091
source "$WORK/env"
DEST="$DATA/apps/roleplay"
rm -rf "$DEST"; mkdir -p "$DEST"
tar --exclude=.git --exclude=node_modules -cf - -C "$SRC" . | tar -xf - -C "$DEST"
(cd "$DEST" && bun install --frozen-lockfile >/dev/null 2>&1)
echo "roleplay $(grep -m1 '"version"' "$DEST/manifest.json" | tr -d ' ,') installed in $DEST"
