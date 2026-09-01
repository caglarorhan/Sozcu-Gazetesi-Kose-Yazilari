let creatingOffscreenDocument;
let sidePanelRequests = new Map();

async function ensureOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) return;
    if (!creatingOffscreenDocument) {
        let offscreenPath = chrome.runtime.getManifest().side_panel.default_path.startsWith('dist/') ? 'dist/offscreen.html' : 'offscreen.html';
        creatingOffscreenDocument = chrome.offscreen.createDocument({
            url: offscreenPath,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Generate and play Turkish column audio after the popup closes.'
        }).finally(() => {
            creatingOffscreenDocument = null;
        });
    }
    await creatingOffscreenDocument;
}

chrome.action.onClicked.addListener(async tab => {
    await chrome.sidePanel.open({tabId: tab.id});
});

function isPiperCommand(message) {
    return message.type === 'piper-start' || message.type === 'piper-cancel' || message.type === 'piper-pause' || message.type === 'piper-resume' || message.type === 'piper-speed';
}

async function sendToOffscreen(message) {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({...message, target: 'offscreen'});
}

chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'sgky-side-panel') return;
    port.onMessage.addListener(async message => {
        if (!isPiperCommand(message)) return;
        if (message.type === 'piper-start') sidePanelRequests.set(port, message.requestId);
        if (message.type === 'piper-cancel') sidePanelRequests.delete(port);
        try {
            await sendToOffscreen(message);
        } catch (error) {
            port.postMessage({type: 'piper-port-error', error: error.message});
        }
    });
    port.onDisconnect.addListener(() => {
        let requestId = sidePanelRequests.get(port);
        sidePanelRequests.delete(port);
        if (requestId) sendToOffscreen({type: 'piper-cancel', requestId});
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target === 'offscreen' || !isPiperCommand(message)) return;
    (async () => {
        await sendToOffscreen(message);
        sendResponse({ok: true});
    })().catch(error => sendResponse({ok: false, error: error.message}));
    return true;
});