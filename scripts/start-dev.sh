#!/bin/bash
# Start the EduTrack dev server detached from the calling shell.
cd /home/z/my-project
setsid nohup bun run dev >/dev/null 2>&1 < /dev/null &
echo "started"
