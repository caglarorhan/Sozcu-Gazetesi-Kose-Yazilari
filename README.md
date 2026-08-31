# SGKY

A Chrome extension for reading the latest Sozcu Gazetesi columns.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this project folder.

## Package for distribution

From the project root, create a ZIP whose root contains `manifest.json`, `popup.html`, `css/`, `img/`, and `js/`. Do not include `.git/`, `.idea/`, or an existing ZIP file.

The extension requests access to `https://www.sozcu.com.tr/*` to retrieve the columnist list and article pages.