import * as piperTts from '@mintplex-labs/piper-tts-web';

let currentRequestId = null;
let currentAudio = null;
let piperSession = null;
let currentSpeed = 1;
let audioWaitResolver = null;

function notify(message) {
    chrome.runtime.sendMessage(message).catch(() => {});
}

function splitTextForSpeech(text, maximumLength = 350) {
    let chunks = [];
    let currentChunk = '';
    text.split(/(?<=[.!?])\s+/).forEach(sentence => {
        if ((currentChunk.length + sentence.length + 1) > maximumLength && currentChunk) {
            chunks.push(currentChunk);
            currentChunk = sentence;
            return;
        }
        currentChunk = `${currentChunk} ${sentence}`.trim();
    });
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

function waitForAudioEnd(audio) {
    return new Promise(resolve => {
        audioWaitResolver = resolve;
        audio.onended = () => {
            audioWaitResolver = null;
            resolve();
        };
    });
}

async function synthesizeAndPlay(message) {
    currentRequestId = message.requestId;
    currentSpeed = message.speed;
    if (currentAudio) currentAudio.pause();
    notify({type: 'piper-status', requestId: message.requestId, state: 'preparing', progress: 0});
    try {
        if (!piperSession) {
            piperSession = await piperTts.TtsSession.create({voiceId: 'tr_TR-dfki-medium'});
        }
        let chunks = splitTextForSpeech(message.text);
        let wav = await piperSession.predict(chunks[0]);
        for (let index = 0; index < chunks.length; index++) {
            if (currentRequestId !== message.requestId) return;
            currentAudio = new Audio(URL.createObjectURL(wav));
            currentAudio.playbackRate = currentSpeed;
            await currentAudio.play();
            notify({type: 'piper-status', requestId: message.requestId, state: 'reading', chunk: index + 1, total: chunks.length});

            let nextWavPromise = null;
            if (index < chunks.length - 1) {
                notify({
                    type: 'piper-status',
                    requestId: message.requestId,
                    state: 'preparing-next',
                    chunk: index + 2,
                    total: chunks.length
                });
                nextWavPromise = piperSession.predict(chunks[index + 1]);
            }
            await waitForAudioEnd(currentAudio);
            if (currentRequestId !== message.requestId) return;
            if (nextWavPromise) wav = await nextWavPromise;
        }
        notify({type: 'piper-status', requestId: message.requestId, state: 'finished'});
    } catch (error) {
        if (currentRequestId === message.requestId) notify({type: 'piper-status', requestId: message.requestId, state: 'error'});
    }
}

chrome.runtime.onMessage.addListener(message => {
    if (message.target !== 'offscreen') return;
    if (message.type === 'piper-start') synthesizeAndPlay(message);
    if (message.type === 'piper-cancel') {
        currentRequestId = null;
        if (currentAudio) currentAudio.pause();
        if (audioWaitResolver) audioWaitResolver();
        audioWaitResolver = null;
        notify({type: 'piper-status', requestId: message.requestId, state: 'cancelled'});
    }
    if (message.type === 'piper-pause' && message.requestId === currentRequestId && currentAudio) {
        currentAudio.pause();
        notify({type: 'piper-status', requestId: message.requestId, state: 'paused'});
    }
    if (message.type === 'piper-resume' && message.requestId === currentRequestId && currentAudio) {
        currentAudio.play();
        notify({type: 'piper-status', requestId: message.requestId, state: 'reading'});
    }
    if (message.type === 'piper-speed' && message.requestId === currentRequestId) {
        currentSpeed = message.speed;
        if (currentAudio) currentAudio.playbackRate = currentSpeed;
    }
});