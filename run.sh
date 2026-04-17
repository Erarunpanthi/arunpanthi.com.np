#!/bin/bash
bash manager.sh

# Auto-open the report in default browser
if command -v start &>/dev/null; then
    start report.html          # Windows Git Bash
elif command -v xdg-open &>/dev/null; then
    xdg-open report.html       # Linux
elif command -v open &>/dev/null; then
    open report.html           # Mac
fi