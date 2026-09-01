
let SGKY = {
    speechSpeed: 1,
    speechLanguage:'tr-TR',
    piperVoiceId: 'tr_TR-dfki-medium',
    currentColumn:{
        columnistName:'',
        title:'',
        date:'',
        text:''
    },
    columnsData:[],
    articleRequestController: null,
    turkishVoice: null,
    piperRequestId: null,
    piperState: 'idle',
    sidePanelPort: null,
    init(){
        this.loadTurkishVoice();
        speechSynthesis.addEventListener('voiceschanged', () => this.loadTurkishVoice());
        this.sidePanelPort = chrome.runtime.connect({name: 'sgky-side-panel'});
        this.sidePanelPort.onDisconnect.addListener(() => {
            this.sidePanelPort = null;
        });
        chrome.runtime.onMessage.addListener(message => this.handlePiperStatus(message));
        this.getColumnistsList().then(r=>r);
    },
    sendPiperCommand(message){
        if (this.sidePanelPort) {
            this.sidePanelPort.postMessage(message);
            return;
        }
        chrome.runtime.sendMessage(message);
    },
    setSpeechOverlay(visible, progress = 0){
        document.querySelector('#speechOverlay').hidden = !visible;
        document.querySelector('#speechOverlayProgress').textContent = `${progress}%`;
    },
    setChunkIndicator(visible, text = ''){
        document.querySelector('#chunkIndicator').hidden = !visible;
        if (text) document.querySelector('#chunkIndicatorText').textContent = text;
    },
    setReadButtonState(label, state = 'idle', disabled = false){
        let readButton = document.querySelector('#readButton');
        if (!readButton) return;
        readButton.textContent = label;
        readButton.disabled = disabled;
        readButton.classList.remove('blue', 'green', 'orange');
        readButton.classList.add(state === 'reading' ? 'green' : state === 'paused' ? 'orange' : 'blue');
    },
    handlePiperStatus(message){
        if (message.type !== 'piper-status' || message.requestId !== this.piperRequestId) return;
        if (message.state === 'preparing') {
            this.piperState = 'preparing';
            this.setSpeechOverlay(true, message.progress);
            this.setChunkIndicator(false);
            this.setReadButtonState('HAZIRLANIYOR', 'idle', true);
            return;
        }
        this.setSpeechOverlay(false);
        if (message.state === 'reading') {
            this.piperState = 'reading';
            this.setChunkIndicator(false);
            this.setReadButtonState('OKUNUYOR...', 'reading');
        }
        if (message.state === 'preparing-next') {
            this.setChunkIndicator(true, `Sonraki bolum hazirlaniyor (${message.chunk}/${message.total})`);
            this.setReadButtonState('OKUNUYOR...', 'reading');
        }
        if (message.state === 'paused') {
            this.piperState = 'paused';
            this.setChunkIndicator(false);
            this.setReadButtonState('DURAKLATILDI', 'paused');
        }
        if (message.state === 'finished' || message.state === 'cancelled') {
            this.piperRequestId = null;
            this.piperState = 'idle';
            this.setChunkIndicator(false);
            this.setReadButtonState('YAZIYI OKU');
        }
        if (message.state === 'error') {
            this.piperRequestId = null;
            this.piperState = 'idle';
            this.setChunkIndicator(false);
            this.setReadButtonState('TURKCE SES HATASI');
        }
    },
    cancelPiperSpeech(){
        if (!this.piperRequestId) return;
        this.sendPiperCommand({type: 'piper-cancel', requestId: this.piperRequestId});
        this.setSpeechOverlay(false);
        this.setChunkIndicator(false);
        this.piperRequestId = null;
        this.piperState = 'idle';
        this.setReadButtonState('YAZIYI OKU');
    },
    loadTurkishVoice(){
        let voices = speechSynthesis.getVoices();
        this.turkishVoice = voices.find(voice => voice.lang.toLowerCase() === 'tr-tr') ||
            voices.find(voice => voice.lang.toLowerCase().startsWith('tr')) || null;
    },
    async getColumnistsList(){
        this.columnsData = [];
        let response = await fetch(`https://www.sozcu.com.tr/yazarlar/`);
        let tempHTML = await response.text();
        let dP = new DOMParser();
        let doc = dP.parseFromString(tempHTML, "text/html");
        let columnistList
        doc.querySelectorAll('.authors  a').forEach((columnistCard)=>{
            if(!columnistCard.href.toString().includes('korkusuz.com.tr')){
                let thatColumn={};
                thatColumn.columnLink = columnistCard.href;
                thatColumn.theColumnistName = columnistCard.querySelector('.author-name').textContent;
                thatColumn.dateOfColumn = columnistCard.querySelector('.text-secondary').textContent;
                thatColumn.headerOfColumn = columnistCard.querySelector('.author-content-title').textContent;
                thatColumn.newsImg = columnistCard.querySelector('.author-photo img').src;
                this.columnsData.push(thatColumn);
            }
        })
        this.createColumnistListOnPopup({columnArray: this.columnsData, orderBy:null, orderDirection:null});
    },
    createColumnistListOnPopup(payload){
        let columnistList = document.getElementById('columnistList');
        let columnCounter=0
        switch (payload.orderBy){
            case "columnist":
                payload.columnArray.sort((a, b) => {
                    let comparison =   a.theColumnistName.toUpperCase()>b.theColumnistName.toUpperCase()? 1: -1;
                    return payload.orderDirection==='desc'? -1*comparison : comparison;
                })
                break;
            default:
                break;
        }
        let columnistListMarkup = `
<span style="position: fixed">
<a class="waves-effect waves-light btn-small" id="columnOrderByColumnistName">A-Z</a>
<a class="waves-effect waves-light btn-small purple" style="margin-left:5px;" id="configModalOpener" >Ayarlar</a>
</span>
`;

        payload.columnArray.forEach(({columnLink, newsImg, theColumnistName, dateOfColumn, headerOfColumn})=>{
            columnistListMarkup += `<a href="#!" id="columnId_${columnCounter}" class="collection-item converted-collection-item ${(columnCounter<1)?'first-item-margin':''}" title="Yaziyi okumak icin tiklayin." style="background-repeat: no-repeat; background-position: top right; background-size: 50px; background-attachment: scroll; background-image: url('${newsImg}')"><h6 class="red-text h6Margin">${theColumnistName}</h6><span class="blue-grey-text">${dateOfColumn}</span> <br><span class="black-text">${headerOfColumn}</span></a>`;
            columnCounter++;
        });
        columnistList.innerHTML = columnistListMarkup;

        payload.columnArray.forEach((columnItem,i)=>{
            document.querySelector(`#columnId_${i}`).addEventListener('click',()=>{
                document.querySelectorAll('.collection-item').forEach(collectionItem=>collectionItem.classList.remove('activeItem'));
                document.querySelector(`#columnId_${i}`).classList.add('activeItem');
                this.getTheColumn(columnItem.columnLink).then();
            })
        })

        document.querySelector('#columnOrderByColumnistName').addEventListener('click',()=>{
            let orderDirection = payload.orderDirection==='asc' ? 'desc': 'asc';
            this.createColumnistListOnPopup({columnArray: payload.columnArray, orderBy:'columnist', orderDirection:orderDirection});
        })
        document.querySelector('#configModalOpener').addEventListener("click", ()=>{
            this.openConfigModal('configModal');
        })
    },
    async getTheColumn(linkAddress){
        if(speechSynthesis.speaking) speechSynthesis.cancel();
        this.cancelPiperSpeech();
        if (this.articleRequestController) this.articleRequestController.abort();
        this.articleRequestController = new AbortController();
        let requestController = this.articleRequestController;
        Object.keys(this.currentColumn).forEach(oKey=>{this.currentColumn[oKey] = ''});
        let preloader = `<div class="progress center-align">
                                        <div class="indeterminate"></div>
                                </div>`;
        document.querySelector('#columnText').classList.add('has-article');
        document.querySelector('#columnText').innerHTML='';
        document.querySelector('#columnText').innerHTML=preloader;
        let response;
        try {
            response = await fetch(linkAddress, {signal: requestController.signal});
        } catch (error) {
            if (error.name !== 'AbortError') {
                document.querySelector('#columnText').textContent = 'Yazi yuklenemedi.';
            }
            return;
        }
        if (requestController !== this.articleRequestController) return;
        if (response.status !== 200) {return}
        let tempHTML = await response.text();
        if (requestController !== this.articleRequestController) return;

        let dP = new DOMParser();
        let doc = dP.parseFromString(tempHTML, "text/html");
        let columnLoadArea = doc.querySelector('article')
        let theColumn = columnLoadArea.querySelectorAll('.article-body>p');
        this.currentColumn.title = columnLoadArea.querySelector('h1.author-content-title').textContent;
        this.currentColumn.columnistName = columnLoadArea.querySelector('.content-meta-name').textContent;
        this.currentColumn.date = columnLoadArea.querySelector('time').textContent;

        let columnMarkup = `<span class="fixPosition" id="buttonContainer"><button class="btn btn-small blue" id="redirectButton" alt="Bu dugme gazetedeki orijinal yazi sayfasini acar.">YAZIYA GIT!</button><button class="btn btn-small green" style="margin-left:5px;" id="readButton" alt="Bu dugme kose yazisini okumayi baslatir.">YAZIYI DINLE</button><span class="speed-control" id="speedControl"><button class="btn btn-small red speed-toggle" id="speechSpeedToggle" type="button" title="Okuma hizini ayarla" aria-label="Okuma hizini ayarla" aria-expanded="false">&#128266;</button><span class="speed-panel" id="speedPanel" hidden><output id="speechSpeedValue">100%</output><input id="speechSpeed" name="speedSpeech" type="range" min="0.5" max="2" step="0.1" value="1" title="100%" aria-label="Okuma hizi"></span></span></span>`;
        columnMarkup += `<h4>${this.currentColumn.columnistName}, tarih:${this.currentColumn.date}</h4>`;
        columnMarkup += `<h3>${this.currentColumn.title}</h3>`;
        theColumn.forEach(oP=>{
            columnMarkup += `<p class="pStatic">${oP.textContent}</p>`;
            this.currentColumn.text+=oP.textContent;
        });
        document.querySelector('#columnText').innerHTML = columnMarkup;
        document.querySelector('#redirectButton').addEventListener('click',(address)=>{
            chrome.tabs.update({url: linkAddress});
        })
        document.querySelector('#readButton').addEventListener('click',(address)=>{
            if (this.piperState === 'reading') {
                this.pausePiperSpeech();
                return;
            }
            if (this.piperState === 'paused') {
                this.resumePiperSpeech();
                return;
            }
            this.readAloud(`${this.currentColumn.columnistName},${this.currentColumn.date},${this.currentColumn.title},${this.currentColumn.text}`);
        })

        let speedControl = document.querySelector('#speedControl');
        let speedToggle = document.querySelector('#speechSpeedToggle');
        let speedPanel = document.querySelector('#speedPanel');
        let speechSpeed = document.querySelector('#speechSpeed');
        let speechSpeedValue = document.querySelector('#speechSpeedValue');
        let setSpeedPanelVisible = visible => {
            speedPanel.hidden = !visible;
            speedToggle.setAttribute('aria-expanded', String(visible));
        };
        speedControl.addEventListener('mouseenter', () => setSpeedPanelVisible(true));
        speedControl.addEventListener('mouseleave', () => setSpeedPanelVisible(false));
        speedControl.addEventListener('focusin', () => setSpeedPanelVisible(true));
        speedToggle.addEventListener('click', event => {
            event.stopPropagation();
            setSpeedPanelVisible(speedPanel.hidden);
        });
        document.addEventListener('pointerdown', event => {
            if (!speedControl.contains(event.target)) setSpeedPanelVisible(false);
        });
        speechSpeed.addEventListener('input',()=>{
            this.speechSpeed = parseFloat(speechSpeed.value);
            let speedPercentage = Math.round(this.speechSpeed * 100);
            speechSpeedValue.textContent = `${speedPercentage}%`;
            speechSpeed.title = `${speedPercentage}%`;
            if (this.piperRequestId) {
                this.sendPiperCommand({
                    type: 'piper-speed',
                    requestId: this.piperRequestId,
                    speed: this.speechSpeed
                });
            }
        })
    },
    readAloud(textToSpeech){
        this.loadTurkishVoice();
        if (this.turkishVoice) {
            let utterance = new SpeechSynthesisUtterance(textToSpeech);
            utterance.lang = this.turkishVoice.lang;
            utterance.voice = this.turkishVoice;
            utterance.rate = this.speechSpeed;
            speechSynthesis.speak(utterance);
            return;
        }
        this.readWithPiper(textToSpeech);
    },
    pausePiperSpeech(){
        this.sendPiperCommand({type: 'piper-pause', requestId: this.piperRequestId});
    },
    resumePiperSpeech(){
        this.sendPiperCommand({type: 'piper-resume', requestId: this.piperRequestId});
    },
    async readWithPiper(textToSpeech){
        this.piperRequestId = crypto.randomUUID();
        this.piperState = 'preparing';
        this.setSpeechOverlay(true);
        this.setReadButtonState('HAZIRLANIYOR', 'idle', true);
        try {
            this.sendPiperCommand({
                type: 'piper-start',
                requestId: this.piperRequestId,
                text: textToSpeech,
                speed: this.speechSpeed
            });
        } catch (error) {
            console.error('Turkce Piper sesi baslatilamadi.', error);
            this.piperRequestId = null;
            this.piperState = 'idle';
            this.setSpeechOverlay(false);
            this.setReadButtonState('TURKCE SES HATASI');
        }
    },
    openConfigModal(whichModal){
        console.log("modal acici cagrildi: " + whichModal);
        let modalInstances = document.querySelectorAll('.modal');

        M.Modal.init(modalInstances,{dismissible:false, onOpenEnd: ()=>{
            console.log('Modal opened');
                let tabInstances = document.querySelectorAll('.tabs');
                let tabInstance = M.Tabs.init(tabInstances,{})
        }});

        // Open the modal programmatically
        let myModal = document.getElementById('mainModal');
        let responseModalData = this.getModalData(whichModal);

        myModal.querySelector('.modal-content').innerHTML=responseModalData.body;
        myModal.querySelector('.modal-footer').innerHTML=responseModalData.footer;
        let modalInstance = M.Modal.getInstance(myModal);
        // Call the open method when you want to open the modal
        modalInstance.open();
        let selectInstances = document.querySelectorAll('select');
        let selectInstance = M.FormSelect.init(selectInstances, {});
    },
    getModalData(whichModal){
        let data = {body:'TEST MODAL BODY', footer:'TEST MODAL FOOTER'};
        switch(whichModal){
            case 'configModal':
                let options = '';
                this.columnsData.forEach(columnist=>{options+=`<option value="${columnist.theColumnistName}">${columnist.theColumnistName}</option>`})

                data.body = `        
                                  <div class="row">
                                    <div class="col s12">
                                      <ul class="tabs">
                                        <li class="tab col s4"><a href="#favs" class="active">Favorilerim</a></li>
                                        <li class="tab col s4"><a href="#reading">Okuma Sesi</a></li>
                                        <li class="tab col s4"><a href="#other">Diger</a></li>
                                      </ul>
                                    </div>
                                    <div id="favs" class="col s12">
                                   Yazar sec: <select id="columnistList" class="multiple select-modified">${options}</select>
                                    </div>
                                    <div id="reading" class="col s12">Test 2</div>
                                    <div id="other" class="col s12">Test 3</div>
                                  </div>
                                `;
                data.footer=`<a href="#!" class="modal-close waves-effect waves-green btn-flat">Close</a>`;
                break;
            case 'sourceSelectModal':
                break
            default:

        }

console.log(data)
        return data;
    },
    saveConfigs(){
        console.log('Configs saved!')
    }
}



window.addEventListener('load',()=>{
    SGKY.init();
})

window.addEventListener('pagehide', () => {
    if (!SGKY.piperRequestId) return;
    SGKY.sendPiperCommand({type: 'piper-cancel', requestId: SGKY.piperRequestId});
});

