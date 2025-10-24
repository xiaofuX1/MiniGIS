@echo off
chcp 65001
gh release create v0.5.0 --title "MiniGIS v0.5.0" --notes-file release_notes.md --latest target\release\bundle\msi\MiniGIS_0.5.0_x64_zh-CN.msi
pause
