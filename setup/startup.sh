#!/bin/bash

# manual steps
# chmod +x setup/startup.sh
# chmod +x setup/autostart.desktop
# mv setup/autostart.desktop /home/adamd/.config/

# Define the URL
URL="https://faithoflifedev.github.io/updates-display/"

# Try to launch in full-screen using Google Chrome, Chromium, or Firefox
if command -v google-chrome > /dev/null; then
  google-chrome --start-fullscreen "$URL"
elif command -v chromium-browser > /dev/null; then
  chromium-browser --start-fullscreen "$URL"
elif command -v firefox > /dev/null; then
  firefox --kiosk "$URL"
else
  echo "No supported browser found (Chrome, Chromium, or Firefox). Falling back to xdg-open."
  xdg-open "$URL"
fi
