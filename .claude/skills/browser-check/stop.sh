#!/usr/bin/env bash
# Stop what start.sh started (by PID: never pkill the engine by pattern, it
# also matches the shell that runs this).
WORK="${1:-/tmp/chrysalis-check}"
[ -f "$WORK/env" ] || { echo "no $WORK/env"; exit 0; }
# shellcheck disable=SC1091
source "$WORK/env"
kill "$ENGINE_PID" "$MOCK_PID" 2>/dev/null || true
# Git Bash on Windows: $! is the MSYS wrapper's PID and killing it can leave
# bun.exe running on its port. Stop whatever still listens on our two ports.
if command -v taskkill >/dev/null 2>&1; then
  for url in "$ENGINE_URL" "$MOCK_URL"; do
    port="${url##*:}"; port="${port%%/*}"
    [ -n "$port" ] || continue
    for pid in $(netstat -ano 2>/dev/null | awk -v p=":$port" '$2 ~ p"$" && $4 == "LISTENING" { print $5 }' | sort -u); do
      taskkill //PID "$pid" //T //F >/dev/null 2>&1 && echo "stopped Windows process $pid on port $port"
    done
  done
fi
echo "stopped engine $ENGINE_PID and mock $MOCK_PID"
