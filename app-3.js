function render(){
  const hash=location.hash.replace("#","")||"/";
  if(hash==="/"){app.innerHTML=landing();bindLanding();return}
  if(hash!=="/app"){location.hash="#/";return}
  const map={dashboard,projects,requirements,contacts,documents,reminders,analytics,templates,settings};
  app.innerHTML=(map[state.section]||dashboard)();
  bindApp();
}
function bindLanding(){}

function bindApp(){
  document.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>{state.section=b.dataset.nav;state.sidebarOpen=false;render()});
  document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>handleAction(b.dataset.action));
  document.querySelectorAll("[data-open-project]").forEach(b=>b.onclick=()=>{state.currentProjectId=b.dataset.openProject;state.projectFilter=b.dataset.openProject;state.section="requirements";render()});
  document.querySelectorAll("[data-edit-project]").forEach(b=>b.onclick=e=>{e.stopPropagation();openProjectModal(b.dataset.editProject)});
  document.querySelectorAll("[data-open-register]").forEach(b=>b.onclick=e=>{e.stopPropagation();state.currentProjectId=b.dataset.openRegister;state.projectFilter=b.dataset.openRegister;state.section="requirements";render()});
  document.querySelectorAll("[data-open-req]").forEach(b=>b.onclick=()=>openRequirementDrawer(b.dataset.openReq));
  document.querySelectorAll("[data-edit-contact]").forEach(b=>b.onclick=()=>openContactModal(b.dataset.editContact));
  document.querySelectorAll("[data-use-template]").forEach(b=>b.onclick=()=>openApplyTemplateModal(b.dataset.useTemplate));
  document.querySelectorAll("[data-copy-reminder]").forEach(b=>b.onclick=()=>copyReminder(b.dataset.copyReminder));
  document.querySelectorAll("[data-email-reminder]").forEach(b=>b.onclick=()=>emailReminder(b.dataset.emailReminder));
  document.querySelectorAll("[data-download]").forEach(b=>b.onclick=()=>downloadLocalFile(b.dataset.download));

  const ps=document.getElementById("projectSearch");if(ps)ps.oninput=()=>{const q=ps.value.toLowerCase();document.querySelectorAll("#projectGrid .project-card").forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?"":"none")};
  const rq=document.getElementById("reqSearch");if(rq)rq.oninput=()=>{state.query=rq.value;render()};
  const pf=document.getElementById("projectFilter");if(pf)pf.onchange=()=>{state.projectFilter=pf.value;render()};
  const sf=document.getElementById("statusFilter");if(sf)sf.onchange=()=>{state.statusFilter=sf.value;render()};
  const cf=document.getElementById("categoryFilter");if(cf)cf.onchange=()=>{state.categoryFilter=cf.value;render()};
  const org=document.getElementById("saveOrg");if(org)org.onclick=()=>{state.data.org.name=document.getElementById("orgName").value.trim()||"My Company";saveState();toast("Workspace name saved.");render()};
}
function handleAction(action){
  if(action==="goLanding"){location.hash="#/";return}
  if(action==="openSidebar"){state.sidebarOpen=true;render();return}
  if(action==="closeSidebar"){state.sidebarOpen=false;render();return}
  if(action==="newProject")return openProjectModal();
  if(action==="newRequirement")return openRequirementModal();
  if(action==="newContact")return openContactModal();
  if(action==="newTemplate")return openTemplateModal();
  if(action==="applyTemplate")return openApplyTemplateModal();
  if(action==="importCsv")return openCsvImportModal();
  if(action==="exportCsv")return exportCsv();
  if(action==="exportBackup")return exportBackup();
  if(action==="importBackup")return document.getElementById("backupFile").click();
  if(action==="resetData"){if(confirm("Reset all projects, requirements, contacts and documents to the original demo data?")){localStorage.removeItem(STORAGE_KEY);deleteAllFiles().then(()=>{loadState();toast("Data reset.");render()})}return}
}
function modal(title,body,footer){
  modalRoot.innerHTML=`<div class="modal-backdrop"><section class="modal"><div class="modal-head"><div><div class="kicker">CloseoutDesk</div><h2 style="margin:5px 0 0;font-size:18px">${title}</h2></div><button class="icon-btn" id="modalClose">✕</button></div><div class="modal-body">${body}</div><div class="modal-foot">${footer}</div></section></div>`;
  document.getElementById("modalClose").onclick=closeModal;
  modalRoot.querySelector(".modal-backdrop").onclick=e=>{if(e.target.classList.contains("modal-backdrop"))closeModal()}
}
function closeModal(){modalRoot.innerHTML=""}

function openProjectModal(existingId=null){
  const p=existingId?projectById(existingId):null;
  modal(p?"Edit project":"Create project",`
    <div class="form-grid">
      <div class="field-wrap span-2"><label>Project name</label><input class="field" id="p_name" value="${esc(p?.name||"")}" placeholder="Lincoln Medical Center"></div>
      <div class="field-wrap"><label>Client</label><input class="field" id="p_client" value="${esc(p?.client||"")}"></div>
      <div class="field-wrap"><label>Project number</label><input class="field" id="p_number" value="${esc(p?.number||"")}"></div>
      <div class="field-wrap"><label>Project manager</label><input class="field" id="p_manager" value="${esc(p?.manager||"")}"></div>
      <div class="field-wrap"><label>Target closeout date</label><input class="field" type="date" id="p_target" value="${esc(p?.target||"")}"></div>
      <div class="field-wrap span-2"><label>Address</label><input class="field" id="p_address" value="${esc(p?.address||"")}"></div>
    </div>`,
    `${p?'<button class="btn btn-danger" id="deleteProject">Delete project</button>':''}<button class="btn btn-secondary" id="cancelProject">Cancel</button><button class="btn btn-primary" id="saveProject">${p?"Save changes":"Create project"}</button>`
  );
  document.getElementById("cancelProject").onclick=closeModal;
  if(p){
    document.getElementById("deleteProject").onclick=()=>{
      const assigned=reqsForProject(p.id).length;
      if(!confirm(`Delete "${p.name}" and its ${assigned} requirements?`))return;
      const reqIds=new Set(reqsForProject(p.id).map(r=>r.id));
      state.data.projects=state.data.projects.filter(x=>x.id!==p.id);
      state.data.requirements=state.data.requirements.filter(r=>r.projectId!==p.id);
      state.data.documents=state.data.documents.filter(d=>!reqIds.has(d.requirementId));
      activity(`Project deleted: ${p.name}`);
      saveState();closeModal();render();
    };
  }
  document.getElementById("saveProject").onclick=()=>{
    const name=document.getElementById("p_name").value.trim();if(!name)return toast("Project name is required.");
    const data={name,client:document.getElementById("p_client").value.trim(),number:document.getElementById("p_number").value.trim(),manager:document.getElementById("p_manager").value.trim(),target:document.getElementById("p_target").value,address:document.getElementById("p_address").value.trim(),status:"active"};
    if(p){Object.assign(p,data);activity(`Project updated: ${name}`)}else{const row={id:uid("p"),...data};state.data.projects.unshift(row);state.currentProjectId=row.id;activity(`Project created: ${name}`)}
    saveState();closeModal();render();
  };
}
