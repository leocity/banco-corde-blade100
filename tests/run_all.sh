#!/usr/bin/env bash
# Ricostruisce la pagina ed esegue tutte le suite: pytest, node --test (moduli puri) e Playwright (UI). Ultima riga = riepilogo.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m pipeline.build_page > /dev/null
py=$(python3 -m pytest -q 2>&1 | tail -1)
nd=$(node --test web/*.test.mjs 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ')
e2e=$(node tests/e2e/ui.cjs 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ')
echo "pytest: $py | node: $nd| e2e: $e2e"
case "$py$nd$e2e" in *"# fail 0"*"# fail 0"*) [[ "$py" == *failed* ]] && exit 1; exit 0;; *) exit 1;; esac
