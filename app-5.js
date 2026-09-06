function openRequirementDrawer(id){
  const r=state.data.requirements.find(x=>x.id===id);if(!r)return;
  state.currentRequirementId=id;
  const docs=docsForReq(id);
  modalRoot.innerHTML=`<div class="modal-backdrop" id="drawerBackdrop"><aside class="drawer">
    <div class="drawer-head"><div style="display:flex;justify-content:space-between;gap:10px"><div><div class="kicker">${esc(r.category)}</div><h2 style="margin:5px 0 0;font-size:19px">${esc(r.title)}</h2></div><button class="icon-btn" id="drawerClose">✕</button></div></div>
    <div class="drawer-body">
      <div class="detail-grid">
        <div class="detail"><label>Project</label><strong>${esc(projectById(r.projectId)?.name||"—")}</strong></div>
        <div class="detail"><label>Assigned to</label><strong>${esc(contactName(r.contactId))}</strong></div>
        <div class="detail"><label>Due</label><strong>${fmtDate(r.due)}</strong></div>
        <div class="detail"><label>Status</label><strong>${esc(isOverdue(r)?"Overdue":r.status)}</strong></div>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-primary btn-sm" id="editReq">Edit requirement</button><button class="btn btn-danger btn-sm" id="deleteReq">Delete</button></div>
      <div class="kicker" style="margin-top:22px">Document revisions</div>
      ${docs.length?docs.map(d=>`<div class="file-card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><strong>${esc(d.name)}</strong><span>v${d.version} • ${formatBytes(d.size)} • ${fmtTime(d.uploadedAt)}</span></div>${d.localFileId?`<button class="btn btn-secondary btn-sm" data-download="${d.localFileId}">Download</button>`:""}</div></div>`).join(""):`<div class="tiny" style="margin-top:8px">No uploaded documents.</div>`}
      <div class="field-wrap" style="margin-top:10px"><label>Upload a new revision</label><input class="field" type="file" id="docFile" accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png"></div>
      <button class="btn btn-green btn-sm" id="uploadDoc" style="margin-top:7px">Upload revision</button>
    </div>
  </aside></div>`;
  document.getElementById("drawerClose").onclick=closeModal;
  document.getElementById("drawerBackdrop").onclick=e=>{if(e.target.id==="drawerBackdrop")closeModal()};
  document.getElementById("editReq").onclick=()=>{closeModal();openRequirementModal(id)};
  document.getElementById("deleteReq").onclick=()=>{if(confirm("Delete this requirement and its document metadata?")){state.data.requirements=state.data.requirements.filter(x=>x.id!==id);state.data.documents=state.data.documents.filter(d=>d.requirementId!==id);activity(`Requirement deleted: ${r.title}`);saveState();closeModal();render()}};
  document.getElementById("uploadDoc").onclick=()=>uploadDocument(id);
  modalRoot.querySelectorAll("[data-download]").forEach(b=>b.onclick=()=>downloadLocalFile(b.dataset.download));
}
async function uploadDocument(reqId){
  const input=document.getElementById("docFile"),file=input.files[0];if(!file)return toast("Choose a file first.");
  const allowedExt=/\.(pdf|docx|xlsx|csv|jpe?g|png)$/i;if(!allowedExt.test(file.name))return toast("Unsupported file type.");
  if(file.size>15*1024*1024)return toast("Maximum file size is 15 MB.");
  const fileId=uid("file");await saveFileBlob(fileId,file);
  const versions=docsForReq(reqId).map(d=>d.version||1),version=Math.max(0,...versions)+1;
  state.data.documents.push({id:uid("d"),requirementId:reqId,name:file.name,size:file.size,mime:file.type||"application/octet-stream",version,uploadedAt:new Date().toISOString(),localFileId:fileId});
  const r=state.data.requirements.find(x=>x.id===reqId);activity(`Document uploaded: ${file.name} for ${r?.title||"requirement"}`);saveState();openRequirementDrawer(reqId);toast("Document revision saved.");
}
function reminderText(contactId){
  const c=contactById(contactId),rs=state.data.requirements.filter(r=>r.contactId===contactId&&(isOverdue(r)||dueSoon(r)));
  return `Subject: Closeout items requiring attention\n\nHi ${c?.name||c?.company||"there"},\n\nPlease provide an update on the following closeout items:\n\n${rs.map(r=>`• ${projectById(r.projectId)?.name||"Project"} — ${r.title} — due ${fmtDate(r.due)} — ${isOverdue(r)?"Overdue":r.status}`).join("\n")}\n\nPlease send the current documents or confirm the expected delivery date.\n\nThank you.`;
}
async function copyReminder(contactId){
  const text=reminderText(contactId);
  try{await navigator.clipboard.writeText(text);toast("Reminder copied.")}catch{prompt("Copy this reminder:",text)}
}
function emailReminder(contactId){
  const c=contactById(contactId),text=reminderText(contactId);if(!c?.email)return;
  const parts=text.split("\n\n"),subject=parts.shift().replace("Subject: ","");
  location.href=`mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(parts.join("\n\n"))}`;
}
function openCsvImportModal(){
  modal("Import requirements CSV",`
    <div class="notice">Accepted columns: project_name, title, category, priority, due_date, company, contact_name, email.</div>
    <div class="field-wrap" style="margin-top:10px"><label>CSV file</label><input class="field" type="file" id="csvFile" accept=".csv,text/csv"></div>`,
    `<button class="btn btn-secondary" id="cancelCsv">Cancel</button><button class="btn btn-primary" id="runCsv">Import</button>`
  );
  document.getElementById("cancelCsv").onclick=closeModal;
  document.getElementById("runCsv").onclick=async()=>{
    const file=document.getElementById("csvFile").files[0];if(!file)return toast("Choose a CSV file.");
    try{const rows=parseCsv(await file.text());importCsvRows(rows);closeModal();toast(`${rows.length} CSV rows processed.`);render()}catch(e){toast(e.message)}
  };
}
function parseCsv(text){
  const lines=text.replace(/\r/g,"").split("\n").filter(x=>x.trim());if(lines.length<2)throw new Error("CSV has no data rows.");
  const parse=line=>{let out=[],cur="",q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'){cur+='"';i++;continue}if(c==='"'){q=!q;continue}if(c===","&&!q){out.push(cur);cur="";continue}cur+=c}out.push(cur);return out};
  const headers=parse(lines[0]).map(h=>h.trim());return lines.slice(1).map(line=>{const vals=parse(line);return Object.fromEntries(headers.map((h,i)=>[h,(vals[i]||"").trim()]))});
}
function importCsvRows(rows){
  rows.forEach(row=>{
    if(!row.title)return;
    let p=state.data.projects.find(x=>x.name.toLowerCase()===(row.project_name||"Imported Project").toLowerCase());
    if(!p){p={id:uid("p"),name:row.project_name||"Imported Project",client:"",number:"",manager:"",address:"",target:"",status:"active"};state.data.projects.push(p)}
    let c=null;
    if(row.company){
      c=state.data.contacts.find(x=>x.company.toLowerCase()===row.company.toLowerCase());
      if(!c){c={id:uid("c"),company:row.company,name:row.contact_name||"",email:row.email||"",phone:"",trade:""};state.data.contacts.push(c)}
    }
    state.data.requirements.push({id:uid("r"),projectId:p.id,title:row.title,category:CATEGORIES.includes(row.category)?row.category:"Other",priority:PRIORITIES.includes(row.priority)?row.priority:"Normal",due:row.due_date||"",status:"Missing",contactId:c?.id||"",notes:""});
  });
  activity(`CSV imported: ${rows.length} rows`);saveState();
}
function exportCsv(){
  const rows=[["Requirement","Project","Category","Assigned To","Due Date","Priority","Status"],...filteredRequirements().map(r=>[r.title,projectById(r.projectId)?.name||"",r.category,contactName(r.contactId),r.due||"",r.priority,r.status])];
  downloadText(rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n"),"closeout-register.csv","text/csv");
}
function exportBackup(){downloadText(JSON.stringify(state.data,null,2),"closeoutdesk-backup.json","application/json")}
function downloadText(text,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function formatBytes(n=0){if(!n)return"0 B";const units=["B","KB","MB","GB"];let i=0,x=n;while(x>=1024&&i<units.length-1){x/=1024;i++}return`${x.toFixed(i?1:0)} ${units[i]}`}
