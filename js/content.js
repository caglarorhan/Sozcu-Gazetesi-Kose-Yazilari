console.log('SGKY attached.')

function sadelestir(){
    let sayac = 0;
    let isTargetLoaded = setInterval(
        ()=>{
            //console.log(sayac);
            if(document.querySelector('div.detail-content')){
                let haberMetni = document.querySelector('div.detail-content');
                let clone = haberMetni.cloneNode(true);
                document.querySelectorAll('div').forEach(item=>{item.style.display='none';});
                document.body.style.marginLeft='10%';
                document.body.style.marginRight='10%';
                document.body.append(clone);
                console.log('Sadelestirildi!');
                clearInterval(isTargetLoaded);
                return;
            }else{
                if(sayac>4) clearInterval(isTargetLoaded);
            }

            sayac++;
        },
        1000
    )
}


//Sending message to popup side
function m2p(outgoingMessage){
    chrome.runtime.sendMessage(outgoingMessage);
}
//AND Listener
// expected full message structure is:
// {value:'', action:'runRequest', payload:{}, callBack:null ,echo:true} // if echo is true so give the just ran functions name as callback
chrome.runtime.onMessage.addListener(  async (request)=>{
    let pL = request.payload;
    switch (request.action) {
        case 'runRequest':
            let results={};
            if(request.payload){
                console.log('Simdi fonksiyona gonderilecek');
                let results = await window[request.value](pL);
            }else{
                results = window[request.value]();
            }
            if(request.callBack && request.callBack.callBackName){
                m2p({value:request.callBack.callBackName, action:'runRequest',payload: results})
            }

            break;
        default:
            console.log(request.value);
            break;
    }
    return true;
});
