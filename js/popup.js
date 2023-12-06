

let SGKY = {
    utterance:new SpeechSynthesisUtterance(),
    speechSpeed: 1,
    speechLanguage:'tr-TR',
    currentColumn:{
        columnistName:'',
        title:'',
        date:'',
        text:''
    },
    init(){
        this.getColumnistsList().then(r=>r);
    },
    async getColumnistsList(){
        let columnsArray = [];
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
                columnsArray.push(thatColumn);
            }
        })
        this.createColumnistListOnPopup({columnArray: columnsArray, orderBy:null, orderDirection:null});
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
        columnistList.innerHTML=`<a class="waves-effect waves-light btn-small" style="position: fixed" id="columnOrderByColumnistName">A-Z</a>`;
        payload.columnArray.forEach(({columnLink, newsImg, theColumnistName, dateOfColumn, headerOfColumn})=>{
            columnistList.innerHTML+=`<a href="#!" id="columnId_${columnCounter}" class="collection-item converted-collection-item ${(columnCounter<1)?'first-item-margin':''}" title="Yaziyi okumak icin tiklayin." style="background-repeat: no-repeat; background-position: top right; background-size: 50px; background-attachment: scroll; background-image: url('${newsImg}')"><h6 class="red-text h6Margin">${theColumnistName}</h6><span class="blue-grey-text">${dateOfColumn}</span> <br><span class="black-text">${headerOfColumn}</span></a>`;
            columnCounter++;
        })

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
    },
    async getTheColumn(linkAddress){
        if(speechSynthesis.speaking) speechSynthesis.cancel();
        Object.keys(this.currentColumn).forEach(oKey=>{this.currentColumn[oKey] = ''});
        let preloader = `<div class="progress center-align">
                                        <div class="indeterminate"></div>
                                </div>`;
        document.querySelector('#columnText').innerHTML='';
        document.querySelector('#columnText').innerHTML=preloader;
        let response = await fetch(`${linkAddress}`);
        if (response.status !== 200) {return}
        let tempHTML = await response.text();

        let dP = new DOMParser();
        let doc = dP.parseFromString(tempHTML, "text/html");
        document.querySelector('#columnText').innerHTML=`<span class="fixPosition" id="buttonContainer"></span>`;
        document.querySelector('#buttonContainer').innerHTML+=`<button class="btn btn-small blue" id="redirectButton" alt="Bu dugme gazetedeki orijinal yazi sayfasini acar.">Yaziya git!</button>`;
        document.querySelector('#buttonContainer').innerHTML+=`<button class="btn btn-small green" style="margin-left:5px;" id="readButton" alt="Bu dugme kose yazisini okumayi baslatir.">Yaziyi Oku</button>`;
        document.querySelector('#buttonContainer').innerHTML+=`<button class="btn btn-small red" style="width:150px; margin-left:5px;"><input id="speechSpeed" name="speedSpeech" type="range" min="0" max="10" step="0.1" value="1" title="1" alt="Bu hiz ayarlayici okuma hizini belirler, okumayi bastan baslatir."></button>`;

        let columnLoadArea = doc.querySelector('article')
        let theColumn = columnLoadArea.querySelectorAll('.article-body>p');
        this.currentColumn.title = columnLoadArea.querySelector('h1.author-content-title').textContent;
        this.currentColumn.columnistName = columnLoadArea.querySelector('.content-meta-name').textContent;
        this.currentColumn.date = columnLoadArea.querySelector('time').textContent;

        document.querySelector('#columnText').innerHTML+=`<h4>${this.currentColumn.columnistName}, tarih:${this.currentColumn.date}</h4>`
        document.querySelector('#columnText').innerHTML+=`<h3>${this.currentColumn.title}</h3>`
        theColumn.forEach(oP=>{
            document.querySelector('#columnText').innerHTML+=`<p class="pStatic">${oP.textContent}</p>`;
            this.currentColumn.text+=oP.textContent;
        })
        document.querySelector('#redirectButton').addEventListener('click',(address)=>{
            chrome.tabs.update({url: linkAddress});
        })
        document.querySelector('#readButton').addEventListener('click',(address)=>{
            this.readAloud(`${this.currentColumn.columnistName},${this.currentColumn.date},${this.currentColumn.title},${this.currentColumn.text}`);
        })

        document.querySelector("#speechSpeed").addEventListener('input',()=>{
            this.speechSpeed = parseFloat(document.querySelector("#speechSpeed").value);
            document.querySelector("#speechSpeed").title = this.speechSpeed;
            speechSynthesis.cancel();
            this.readAloud(this.currentColumn.text);

        })
    },
    readAloud(textToSpeech){
        this.utterance.text=textToSpeech;
        this.utterance.lang = this.speechLanguage;
        this.utterance.rate = this.speechSpeed;
            speechSynthesis.speak(this.utterance);
    }
}



window.addEventListener('load',()=>{
    SGKY.init();
})
