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
    let columnistList
        doc.querySelectorAll('.columnist-card').forEach((columnistCard)=>{
            if(!columnistCard.href.toString().includes('korkusuz.com.tr')){
                let thatColumn={};
                thatColumn.columnLink = columnistCard.href;
                thatColumn.theColumnistName = columnistCard.querySelector('.columnist-name').textContent;
                thatColumn.dateOfColumn = columnistCard.querySelector('.columnist-date').textContent;
                thatColumn.headerOfColumn = columnistCard.querySelector('.columnist-title').textContent;
                thatColumn.newsImg = columnistCard.querySelector('.img-holder>img').src;
                columnsArray.push(thatColumn);
            }
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
        columnistList.innerHTML+=`<a href="#!" id="columnId_${columnCounter}" class="collection-item no-padding" title="Click to read the column" style="background-repeat: no-repeat; background-position: top right; background-size: 50px; background-attachment: scroll ;background-image: url('${newsImg}')"><h6 class="red-text h6Margin">${theColumnistName}</h6><span class="blue-grey-text">${dateOfColumn}</span> <br><span class="black-text">${headerOfColumn}</span></a>`;
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
    document.querySelector('#columnText').innerHTML=`<button class="btn btn-small blue" id="redirectButton">Yaziya git!</button>`;
    let columnLoadArea = doc.querySelector('#author_load_area')
    let theColumn = columnLoadArea.querySelectorAll('p');
    let columnTitle = columnLoadArea.querySelector('h1');
    document.querySelector('#columnText').innerHTML+=`<h3>${columnTitle.textContent}</h3>`
    theColumn.forEach(oP=>{
        document.querySelector('#columnText').innerHTML+=`<p class="pStatic">${oP.textContent}</p>`
    })
    document.querySelector('#redirectButton').addEventListener('click',(address)=>{
        chrome.tabs.update({url: linkAddress});
    })
}
