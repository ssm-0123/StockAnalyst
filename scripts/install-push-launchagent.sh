#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/ssm/Documents/Investment Analyst"
LABEL="com.ssm.investment-analyst.push-pages"
SOURCE_PLIST="$ROOT/launchd/$LABEL.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$ROOT/logs"

cp "$SOURCE_PLIST" "$TARGET_PLIST"

launchctl bootout "$DOMAIN" "$TARGET_PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "$DOMAIN" "$TARGET_PLIST"
launchctl enable "$DOMAIN/$LABEL"
launchctl kickstart -k "$DOMAIN/$LABEL"

echo "Installed and started $LABEL"
echo "Logs:"
echo "  $ROOT/logs/push-pages.launchd.log"
echo "  $ROOT/logs/push-pages.launchd.err.log"
