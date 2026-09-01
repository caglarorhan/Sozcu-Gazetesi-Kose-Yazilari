# SGKY

A Chrome extension for reading the latest Sozcu Gazetesi columns.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this project folder.

## Package for distribution

From the project root, create a ZIP whose root contains `manifest.json`, `popup.html`, `css/`, `img/`, and `js/`. Do not include `.git/`, `.idea/`, or an existing ZIP file.

The extension requests access to `https://www.sozcu.com.tr/*` to retrieve the columnist list and article pages.

## Turkish speech

The extension uses an installed Turkish browser/operating-system voice when available. Otherwise, it uses the bundled MIT-licensed Piper `tr_TR-dfki-medium` Turkish voice. The extension package includes the approximately 63 MB model, ONNX Runtime WebAssembly binary, and Piper phonemizer assets, so no voice download or external TTS service is required.

Build the distributable extension with:

```bash
npm install
npm run build
```

Load the generated `dist/` folder in Chrome, or create a ZIP whose root is the contents of `dist/`.