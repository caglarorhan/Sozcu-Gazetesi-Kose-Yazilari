window.addEventListener('load',()=>{
    total();
})



function total(){
    getColumnistList().then();
}


let getColumnistList = async ()=>{
    let columnsArray = [];
    let response = await fetch(`https://www.sozcu.com.tr/kategori/yazarlar/`);
    if (response.status !== 200) {return}
    let tempHTML = await response.text();


    let dP = new DOMParser();
    let doc = dP.parseFromString(tempHTML, "text/html");
        doc.querySelectorAll('.news-box.case-25').forEach((item)=>{
            let thatColumn={};
            thatColumn.columnLink = item.querySelector('a:first-child').href;
            thatColumn.theColumnistName = item.querySelector('.columnist-name').textContent;
            thatColumn.dateOfColumn = item.querySelector('.date').textContent;
            thatColumn.headerOfColumn = item.querySelector('.c-text').textContent;
            thatColumn.newsImg = item.querySelector('.news-img').style.backgroundImage.toString().replace('"','');
            columnsArray.push(thatColumn);
})

    createColumnistListOnPopup({columnArray: columnsArray, orderBy:null, orderDirection:null});

}

function createColumnistListOnPopup(payload){
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



    columnistList.innerHTML=`<a class="waves-effect waves-light btn-small" id="columnOrderByColumnistName">A-Z</a>`;
    payload.columnArray.forEach(({columnLink, newsImg, theColumnistName, dateOfColumn, headerOfColumn})=>{
        columnistList.innerHTML+=`<a href="#!" id="columnId_${columnCounter}" class="collection-item no-padding" title="Click to read the column" style="background-repeat: no-repeat; background-position: top right; background-size: 50px; background-attachment: scroll ;background-image: ${newsImg}"><h6 class="red-text h6Margin">${theColumnistName}</h6><span class="blue-grey-text">${dateOfColumn}</span> <br><span class="black-text">${headerOfColumn}</span></a>`;
        columnCounter++;
    })

    payload.columnArray.forEach((columnItem,i)=>{
        document.querySelector(`#columnId_${i}`).addEventListener('click',()=>{getTheColumn(columnItem.columnLink).then()})
    })

    document.querySelector('#columnOrderByColumnistName').addEventListener('click',()=>{
        let orderDirection = payload.orderDirection==='asc' ? 'desc': 'asc';
        createColumnistListOnPopup({columnArray: payload.columnArray, orderBy:'columnist', orderDirection:orderDirection});
    })



}


let getTheColumn = async (linkAddress)=>{
    document.querySelector('#columnText').innerHTML='';
    let response = await fetch(`${linkAddress}`);
    if (response.status !== 200) {return}
    let tempHTML = await response.text();

    let dP = new DOMParser();
    let doc = dP.parseFromString(tempHTML, "text/html");

    document.querySelector('#columnText').innerHTML=`<button class="btn btn-small blue" id="sadelestirButton">Yerinde tek kolon oku</button>`;

    let theColumn = doc.querySelectorAll('.author-the-content.content-element p');
    theColumn.forEach(oP=>{
        document.querySelector('#columnText').innerHTML+=`<p class="pStatic">${oP.textContent}</p>`
    })

    document.querySelector('#sadelestirButton').addEventListener('click',(address)=>{
        chrome.tabs.update({url: linkAddress});
        window.setTimeout(()=>{
            m2c({value:'sadelestir', action: 'runRequest'});
        },2000)
    })

}





//Sending message to content side
function m2c(messageToContentSide){
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, messageToContentSide);
    });
}
//Receiving message from the content side
//AND Listener
// expected full message structure is:
// {value:'', action:'runRequest', payload:{}, callBack:null ,echo:true} // if echo is true so give the just ran functions name as callback
chrome.runtime.onMessage.addListener(  (request)=>{
    switch (request.action) {
        case 'runRequest':
            let results={};
            if(typeof request.payload ==='object' && request.payload.constructor===Object && Object.keys(request.payload).length>0){
                results = window[request.value](request.payload);
            }else{
                results = window[request.value]();
            }
            if(request.callBack && request.callBack.callBackName){
                m2c({value:request.callBack.callBackName, action:'runRequest',payload: results})
            }

            break;
        default:
            break;
    }
    return true;
});
