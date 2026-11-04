#!/usr/bin/env bash
# Renders docs/images/src/<name>.html to docs/images/<name>.png with headless Chrome.
# Usage: docs/images/src/render.sh cover 2560 1280
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size="$2,$3" --screenshot="$here/../$1.png" "file://$here/$1.html" 2>/dev/null
echo "docs/images/$1.png"
