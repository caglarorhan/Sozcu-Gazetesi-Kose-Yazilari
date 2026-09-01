import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';

await mkdir('dist', {recursive: true});
let manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
delete manifest.action.default_popup;
manifest.side_panel.default_path = 'popup.html';
manifest.background.service_worker = 'js/background.js';
await Promise.all([
    cp('css', 'dist/css', {recursive: true}),
    cp('img', 'dist/img', {recursive: true}),
    cp('js/content.js', 'dist/js/content.js'),
    cp('js/background.js', 'dist/js/background.js'),
    cp('js/materialize.min.js', 'dist/js/materialize.min.js'),
    cp('node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm', 'dist/assets/ort-wasm-simd.wasm'),
    cp('node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.wasm', 'dist/assets/piper-phonemize.wasm'),
    cp('node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.data', 'dist/assets/piper-phonemize.data'),
    cp('vendor/piper-voice', 'dist/assets/piper-voice', {recursive: true}),
    cp('THIRD_PARTY_NOTICES.md', 'dist/THIRD_PARTY_NOTICES.md')
]);
await writeFile('dist/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);