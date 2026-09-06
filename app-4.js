function openRequirementModal(existingId=null){
  const r=existingId?state.data.requirements.find(x=>x.id===existingId):null;
  modal(r?"Edit requirement":"Add requirement",`
    <div class="form-grid">
      <div class="field-wrap span-2"><label>Requirement</label><input class="field" id="r_title" value="${esc(r?.title||"")}" placeholder="Final As-Builts"></div>
      <div class="field-wrap"><label>Project</label><select id="r_project">${state.data.projects.map(p=>`<option value="${p.id}" ${(r?.projectId||state.projectFilter)===p.id?"selected":""}>${esc(p.name)}</option>`).join("")}</select></div>
      <div class="field-wrap"><label>Category</label><select id="r_category">${CATEGORIES.map(c=>`<option ${r?.category===c?"selected":""}>${c}</option>`).join("")}</select></div>
      <div class="field-wrap"><label>Priority</label><select id="r_priority">${PRIORITIES.map(p=>`<option ${r?.priority===p?"selected":""}>${p}</option>`).join("")}</select></div>
      <div class="field-wrap"><label>Due date</label><input class="field" type="date" id="r_due" value="${esc(r?.due||"")}"></div>
      <div class="field-wrap"><label>Assigned contact</label><select id="r_contact"><option value="">Unassigned</option>${state.data.contacts.map(c=>`<option value="${c.id}" ${r?.contactId===c.id?"selected":""}>${esc(c.company)}${c.name?" • "+esc(c.name):""}</option>`).join("")}</select></div>
      <div class="field-wrap"><label>Status</label><select id="r_status">${STATUSES.map(s=>`<option ${r?.status===s?"selected":""}>${s}</option>`).join("")}</select></div>
      <div class="field-wrap span-2"><label>Notes</label><textarea id="r_notes">${esc(r?.notes||"")}</textarea></div>
    </div>`,
    `<button class="btn btn-secondary" id="cancelReq">Cancel</button><button class="btn btn-primary" id="saveReq">${r?"Save changes":"Add requirement"}</button>`
  );
  document.getElementById("cancelReq").onclick=closeModal;
  document.getElementById("saveReq").onclick=()=>{
    const title=document.getElementById("r_title").value.trim();if(!title)return toast("Requirement title is required.");
    const data={title,projectId:document.getElementById("r_project").value,category:document.getElementById("r_category").value,priority:document.getElementById("r_priority").value,due:document.getElementById("r_due").value,contactId:document.getElementById("r_contact").value,status:document.getElementById("r_status").value,notes:document.getElementById("r_notes").value.trim()};
    if(r){Object.assign(r,data);activity(`${title} updated to ${data.status}`)}else{state.data.requirements.unshift({id:uid("r"),...data});activity(`Requirement added: ${title}`)}
    saveState();closeModal();render();
  };
}
function openContactModal(existingId=null){
  const c=existingId?contactById(existingId):null;
  modal(c?"Edit contact":"Add contact",`
    <div class="form-grid">
      <div class="field-wrap"><label>Company</label><input class="field" id="c_company" value="${esc(c?.company||"")}"></div>
      <div class="field-wrap"><label>Contact name</label><input class="field" id="c_name" value="${esc(c?.name||"")}"></div>
      <div class="field-wrap"><label>Email</label><input class="field" type="email" id="c_email" value="${esc(c?.email||"")}"></div>
      <div class="field-wrap"><label>Phone</label><input class="field" id="c_phone" value="${esc(c?.phone||"")}"></div>
      <div class="field-wrap span-2"><label>Trade</label><input class="field" id="c_trade" value="${esc(c?.trade||"")}"></div>
    </div>`,
    `${c?'<button class="btn btn-danger" id="deleteContact">Delete contact</button>':''}<button class="btn btn-secondary" id="cancelContact">Cancel</button><button class="btn btn-primary" id="saveContact">${c?"Save changes":"Add contact"}</button>`
  );
  document.getElementById("cancelContact").onclick=closeModal;
  if(c){
    document.getElementById("deleteContact").onclick=()=>{
      if(!confirm(`Delete ${c.company}? Requirements will become unassigned.`))return;
      state.data.contacts=state.data.contacts.filter(x=>x.id!==c.id);
      state.data.requirements.forEach(r=>{if(r.contactId===c.id)r.contactId=""});
      activity(`Contact deleted: ${c.company}`);saveState();closeModal();render();
    };
  }
  document.getElementById("saveContact").onclick=()=>{
    const company=document.getElementById("c_company").value.trim();if(!company)return toast("Company is required.");
    const data={company,name:document.getElementById("c_name").value.trim(),email:document.getElementById("c_email").value.trim(),phone:document.getElementById("c_phone").value.trim(),trade:document.getElementById("c_trade").value.trim()};
    if(c){Object.assign(c,data);activity(`Contact updated: ${company}`)}else{state.data.contacts.unshift({id:uid("c"),...data});activity(`Contact added: ${company}`)}
    saveState();closeModal();render();
  };
}
function openTemplateModal(){
  modal("Create template",`
    <div class="field-wrap"><label>Template name</label><input class="field" id="t_name" placeholder="Standard Fire Alarm Closeout"></div>
    <div class="field-wrap" style="margin-top:10px"><label>Trade</label><input class="field" id="t_trade" placeholder="Fire Alarm"></div>
    <div class="field-wrap" style="margin-top:10px"><label>Requirements — one per line</label><textarea id="t_items" placeholder="Final as-builts&#10;O&M manual&#10;Warranty&#10;Test report"></textarea></div>`,
    `<button class="btn btn-secondary" id="cancelTemplate">Cancel</button><button class="btn btn-primary" id="saveTemplate">Create template</button>`
  );
  document.getElementById("cancelTemplate").onclick=closeModal;
  document.getElementById("saveTemplate").onclick=()=>{
    const name=document.getElementById("t_name").value.trim(),items=document.getElementById("t_items").value.split("\n").map(x=>x.trim()).filter(Boolean);if(!name||!items.length)return toast("Add a template name and at least one requirement.");
    state.data.templates.unshift({id:uid("t"),name,trade:document.getElementById("t_trade").value.trim()||"Custom",items});saveState();activity(`Template created: ${name}`);closeModal();render();
  };
}
function openApplyTemplateModal(templateId=null){
  if(!state.data.projects.length)return toast("Create a project first.");
  modal("Apply template",`
    <div class="form-grid">
      <div class="field-wrap"><label>Project</label><select id="apply_project">${state.data.projects.map(p=>`<option value="${p.id}" ${state.currentProjectId===p.id?"selected":""}>${esc(p.name)}</option>`).join("")}</select></div>
      <div class="field-wrap"><label>Template</label><select id="apply_template">${state.data.templates.map(t=>`<option value="${t.id}" ${templateId===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}</select></div>
    </div>
    <div class="notice" style="margin-top:10px">Each template item becomes a new Missing requirement in the selected project.</div>`,
    `<button class="btn btn-secondary" id="cancelApply">Cancel</button><button class="btn btn-primary" id="runApply">Apply template</button>`
  );
  document.getElementById("cancelApply").onclick=closeModal;
  document.getElementById("runApply").onclick=()=>{
    const pid=document.getElementById("apply_project").value,tid=document.getElementById("apply_template").value,t=state.data.templates.find(x=>x.id===tid);if(!t)return;
    t.items.forEach(item=>state.data.requirements.push({id:uid("r"),projectId:pid,title:item,category:"Other",priority:"Normal",due:"",status:"Missing",contactId:"",notes:""}));
    activity(`Template applied: ${t.name} to ${projectById(pid)?.name||"project"}`);saveState();closeModal();state.projectFilter=pid;state.section="requirements";render();
  };
}
