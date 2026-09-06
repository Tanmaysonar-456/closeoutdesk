function openFileDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(FILE_DB,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(FILE_STORE))db.createObjectStore(FILE_STORE)};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function saveFileBlob(id,file){const db=await openFileDb();return new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,"readwrite");tx.objectStore(FILE_STORE).put(file,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function getFileBlob(id){const db=await openFileDb();return new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,"readonly"),req=tx.objectStore(FILE_STORE).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function downloadLocalFile(id){const file=await getFileBlob(id);if(!file)return toast("Local file is unavailable.");const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=file.name||"document";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function deleteAllFiles(){const db=await openFileDb();return new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,"readwrite");tx.objectStore(FILE_STORE).clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}

window.addEventListener("hashchange",render);
document.addEventListener("change",e=>{
  if(e.target?.id==="backupFile"){
    const file=e.target.files[0];if(!file)return;
    file.text().then(text=>{try{const data=JSON.parse(text);if(!data.projects||!data.requirements||!data.contacts)throw new Error("Invalid backup file.");state.data=data;saveState();toast("Backup imported.");render()}catch(err){toast(err.message)}})
  }
});

loadState();
if(!location.hash)location.hash="#/";
render();
