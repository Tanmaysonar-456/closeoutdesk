function sideLink(id,icon,label){
  return `<button class="side-link ${state.section===id?"active":""}" data-nav="${id}"><span class="side-icon">${icon}</span>${label}</button>`;
}
function shell(content){
  return `<div class="app-shell">
    <aside class="sidebar ${state.sidebarOpen?"open":""}" id="sidebar">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">${brand()}<button class="icon-btn" data-action="closeSidebar">✕</button></div>
      <div class="side-org"><small>Workspace</small><strong>${esc(state.data.org.name)}</strong></div>
      <div class="side-group">Workspace</div>
      ${sideLink("dashboard","▦","Dashboard")}
      ${sideLink("projects","◫","Projects")}
      ${sideLink("requirements","≣","Requirements")}
      ${sideLink("contacts","◎","Contacts")}
      ${sideLink("documents","▤","Documents")}
      ${sideLink("reminders","✉","Reminder Center")}
      ${sideLink("analytics","◒","Analytics")}
      ${sideLink("templates","▣","Templates")}
      ${sideLink("settings","⚙","Settings")}
      <div class="side-bottom"><button class="btn btn-secondary btn-block" data-action="goLanding">← Public website</button></div>
    </aside>
    <main class="workspace">
      <div class="mobile-bar"><button class="icon-btn" data-action="openSidebar">☰</button><span class="tiny">CloseoutDesk workspace</span></div>
      ${content}
    </main>
  </div>`;
}
function head(kicker,title,desc,actions=""){
  return `<div class="page-head"><div><div class="kicker">${kicker}</div><h1>${title}</h1><p>${desc}</p></div><div class="page-actions">${actions}</div></div>`;
}
function metric(label,value,note){return `<div class="metric"><label>${label}</label><strong>${value}</strong><small>${note}</small></div>`}

function dashboard(){
  const rs=state.data.requirements, ps=state.data.projects;
  const over=rs.filter(isOverdue).length, soon=rs.filter(dueSoon).length, approved=rs.filter(r=>r.status==="Approved").length;
  const avg=ps.length?Math.round(ps.reduce((s,p)=>s+completion(p.id),0)/ps.length):0;
  const sorted=[...ps].sort((a,b)=>reqsForProject(b.id).filter(isOverdue).length-reqsForProject(a.id).filter(isOverdue).length);
  return shell(`
    ${head("Portfolio","Closeout Dashboard","See the items most likely to delay turnover.",`<button class="btn btn-secondary" data-action="importCsv">⇧ Import CSV</button><button class="btn btn-primary" data-action="newProject">+ New project</button>`)}
    <div class="metric-grid">
      ${metric("Active projects",ps.length,"current portfolio")}
      ${metric("Overdue items",over,"needs attention")}
      ${metric("Due this week",soon,"next 7 days")}
      ${metric("Approved",approved,"requirements")}
      ${metric("Avg. completion",avg+"%","across projects")}
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head"><h2>Projects needing attention</h2><button class="btn btn-secondary btn-sm" data-nav="projects">View all</button></div>
        <div class="panel-body list">
          ${sorted.length?sorted.map(p=>{
            const prs=reqsForProject(p.id), ov=prs.filter(isOverdue).length, miss=prs.filter(r=>r.status==="Missing").length;
            return `<div class="list-row"><div><strong>${esc(p.name)}</strong><span>${completion(p.id)}% complete • ${miss} missing</span></div>${ov?`<span class="status st-overdue">${ov} overdue</span>`:`<span class="status st-approved">On track</span>`}</div>`
          }).join(""):`<div class="empty">No projects yet.</div>`}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Recent activity</h2></div>
        <div class="panel-body list">
          ${state.data.activity.slice(0,7).map(a=>`<div class="list-row"><div><strong>${esc(a.text)}</strong><span>${fmtTime(a.at)}</span></div></div>`).join("")}
        </div>
      </section>
    </div>
    <div class="project-grid">${ps.map(projectCard).join("")}</div>
  `);
}
function projectCard(p){
  const rs=reqsForProject(p.id), ov=rs.filter(isOverdue).length, pc=completion(p.id);
  return `<article class="project-card" data-open-project="${p.id}">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
      <div><h3>${esc(p.name)}</h3><p>${esc(p.client||"No client")} • ${esc(p.number||"No project #")}<br>${esc(p.manager||"No project manager")}</p></div>
      ${ov?`<span class="status st-overdue">${ov} overdue</span>`:`<span class="status st-approved">On track</span>`}
    </div>
    <div class="progress"><span style="width:${pc}%"></span></div>
    <div class="progress-meta"><span>${pc}% complete</span><span>${rs.length} items</span></div>
    <div style="display:flex;gap:7px;margin-top:10px"><button class="btn btn-secondary btn-sm" data-edit-project="${p.id}">Edit</button><button class="btn btn-secondary btn-sm" data-open-register="${p.id}">Open register</button></div>
  </article>`;
}
function projects(){
  return shell(`
    ${head("Projects","Project portfolio","Create projects, open closeout registers and review completion.",`<button class="btn btn-secondary" data-action="applyTemplate">Apply template</button><button class="btn btn-primary" data-action="newProject">+ New project</button>`)}
    <div class="toolbar"><div class="toolbar-left"><input class="search" id="projectSearch" placeholder="Search project, client or project number"></div><div class="toolbar-right"><span class="tiny">${state.data.projects.length} projects</span></div></div>
    <div class="project-grid" id="projectGrid">${state.data.projects.map(projectCard).join("")}</div>
  `);
}
function filteredRequirements(){
  return state.data.requirements.filter(r=>{
    const q=state.query.trim().toLowerCase();
    const matchesQ=!q||[r.title,r.category,contactName(r.contactId),projectById(r.projectId)?.name||""].join(" ").toLowerCase().includes(q);
    const matchesProject=state.projectFilter==="all"||r.projectId===state.projectFilter;
    const matchesStatus=state.statusFilter==="all"||(state.statusFilter==="overdue"&&isOverdue(r))||r.status===state.statusFilter;
    const matchesCategory=state.categoryFilter==="all"||r.category===state.categoryFilter;
    return matchesQ&&matchesProject&&matchesStatus&&matchesCategory;
  });
}
function requirements(){
  const list=filteredRequirements();
  return shell(`
    ${head("Closeout register","Requirements","Track ownership, deadlines, status and documents from one register.",`<button class="btn btn-secondary" data-action="exportCsv">Export CSV</button><button class="btn btn-primary" data-action="newRequirement">+ Requirement</button>`)}
    <div class="toolbar">
      <div class="toolbar-left">
        <input class="search" id="reqSearch" value="${esc(state.query)}" placeholder="Search requirement, project or company">
        <select id="projectFilter"><option value="all">All projects</option>${state.data.projects.map(p=>`<option value="${p.id}" ${state.projectFilter===p.id?"selected":""}>${esc(p.name)}</option>`).join("")}</select>
        <select id="statusFilter"><option value="all">All statuses</option><option value="overdue" ${state.statusFilter==="overdue"?"selected":""}>Overdue</option>${STATUSES.map(s=>`<option value="${s}" ${state.statusFilter===s?"selected":""}>${s}</option>`).join("")}</select>
        <select id="categoryFilter"><option value="all">All categories</option>${CATEGORIES.map(c=>`<option value="${c}" ${state.categoryFilter===c?"selected":""}>${c}</option>`).join("")}</select>
      </div>
      <div class="toolbar-right"><span class="tiny">${list.length} visible</span></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Requirement</th><th>Project</th><th>Category</th><th>Assigned to</th><th>Due</th><th>Priority</th><th>Status</th><th>Files</th></tr></thead>
      <tbody>${list.length?list.map(r=>`<tr data-open-req="${r.id}">
        <td><div class="primary">${esc(r.title)}</div><div class="secondary">${esc(r.notes||"")}</div></td>
        <td>${esc(projectById(r.projectId)?.name||"—")}</td>
        <td>${esc(r.category)}</td><td>${esc(contactName(r.contactId))}</td><td>${fmtDate(r.due)}</td><td>${esc(r.priority)}</td><td>${statusChip(r)}</td><td>${docsForReq(r.id).length}</td>
      </tr>`).join(""):`<tr><td colspan="8"><div class="empty">No requirements match these filters.</div></td></tr>`}</tbody>
    </table></div>
  `);
}
function contacts(){
  return shell(`
    ${head("Subcontractors","Contacts","Keep the companies and people responsible for closeout work in one place.",`<button class="btn btn-primary" data-action="newContact">+ Add contact</button>`)}
    <div class="cards-3">
      ${state.data.contacts.length?state.data.contacts.map(c=>{
        const count=state.data.requirements.filter(r=>r.contactId===c.id).length;
        const over=state.data.requirements.filter(r=>r.contactId===c.id&&isOverdue(r)).length;
        return `<article class="contact-card"><div style="display:flex;justify-content:space-between;gap:10px"><div><h3>${esc(c.company)}</h3><p>${esc(c.name||"")} • ${esc(c.trade||"")}<br>${esc(c.email||"")}<br>${esc(c.phone||"")}</p></div>${over?`<span class="status st-overdue">${over} overdue</span>`:`<span class="status st-submitted">${count} assigned</span>`}</div><div style="margin-top:10px"><button class="btn btn-secondary btn-sm" data-edit-contact="${c.id}">Edit</button></div></article>`
      }).join(""):`<div class="empty">No contacts yet.</div>`}
    </div>
  `);
}
function documents(){
  const docs=[...state.data.documents].sort((a,b)=>new Date(b.uploadedAt)-new Date(a.uploadedAt));
  return shell(`
    ${head("File register","Documents","Review uploaded closeout files and revisions across projects.",`<button class="btn btn-secondary" data-nav="requirements">Open requirements</button>`)}
    <div class="table-wrap"><table>
      <thead><tr><th>Document</th><th>Requirement</th><th>Project</th><th>Version</th><th>Uploaded</th><th>Size</th><th></th></tr></thead>
      <tbody>${docs.length?docs.map(d=>{
        const r=state.data.requirements.find(x=>x.id===d.requirementId);
        return `<tr><td class="primary">${esc(d.name)}</td><td>${esc(r?.title||"—")}</td><td>${esc(projectById(r?.projectId)?.name||"—")}</td><td>v${d.version}</td><td>${fmtTime(d.uploadedAt)}</td><td>${formatBytes(d.size)}</td><td>${d.localFileId?`<button class="btn btn-secondary btn-sm" data-download="${d.localFileId}">Download</button>`:`<span class="tiny">Seed example</span>`}</td></tr>`
      }).join(""):`<tr><td colspan="7"><div class="empty">No documents uploaded yet.</div></td></tr>`}</tbody>
    </table></div>
  `);
}
function reminders(){
  const groups=state.data.contacts.map(c=>({c,rs:state.data.requirements.filter(r=>r.contactId===c.id&&(isOverdue(r)||dueSoon(r)))})).filter(g=>g.rs.length);
  return shell(`
    ${head("Follow-up","Reminder Center","Group closeout follow-ups by subcontractor instead of writing each email from scratch.","")}
    ${groups.length?groups.map(g=>`<article class="reminder-card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
        <div><h3>${esc(g.c.company)}</h3><p>${esc(g.c.name||"")} • ${esc(g.c.email||"No email")} • ${g.rs.length} items</p></div>
        <div style="display:flex;gap:7px"><button class="btn btn-secondary btn-sm" data-copy-reminder="${g.c.id}">Copy reminder</button>${g.c.email?`<button class="btn btn-primary btn-sm" data-email-reminder="${g.c.id}">Open email</button>`:""}</div>
      </div>
      <div class="mini-list">${g.rs.map(r=>`<div class="mini-item"><strong>${esc(r.title)}</strong><br><span class="tiny">${esc(projectById(r.projectId)?.name||"")} • due ${fmtDate(r.due)} • ${isOverdue(r)?"Overdue":r.status}</span></div>`).join("")}</div>
    </article>`).join(""):`<div class="empty">No overdue or due-soon items right now.</div>`}
  `);
}
function analytics(){
  const projectRows=state.data.projects.map(p=>({name:p.name,val:completion(p.id)}));
  const vendorRows=state.data.contacts.map(c=>{
    const total=state.data.requirements.filter(r=>r.contactId===c.id).length, over=state.data.requirements.filter(r=>r.contactId===c.id&&isOverdue(r)).length;
    return {name:c.company,total,over,pct:total?Math.round(over/total*100):0}
  }).filter(x=>x.total);
  return shell(`
    ${head("Portfolio analytics","Analytics","See where closeout work is progressing and where vendor follow-up is weak.","")}
    <div class="cols-2">
      <section class="panel"><div class="panel-head"><h2>Project completion</h2></div><div class="panel-body bar-list">${projectRows.map(x=>bar(x.name,x.val,x.val+"%")).join("")}</div></section>
      <section class="panel"><div class="panel-head"><h2>Overdue by subcontractor</h2></div><div class="panel-body bar-list">${vendorRows.map(x=>bar(x.name,x.pct,x.over+"/"+x.total)).join("")}</div></section>
    </div>
  `);
}
function bar(label,val,end){return `<div class="bar-row"><span class="tiny">${esc(label)}</span><div class="bar-track"><span style="width:${Math.min(100,val)}%"></span></div><span class="tiny" style="text-align:right">${esc(end)}</span></div>`}
function templates(){
  return shell(`
    ${head("Reusable checklists","Templates","Apply standard closeout lists to new or existing projects.",`<button class="btn btn-primary" data-action="newTemplate">+ New template</button>`)}
    <div class="cards-3">${state.data.templates.map(t=>`<article class="template-card"><h3>${esc(t.name)}</h3><p>${esc(t.trade)} • ${t.items.length} items</p><div class="mini-list">${t.items.slice(0,6).map(i=>`<div class="mini-item">${esc(i)}</div>`).join("")}${t.items.length>6?`<div class="mini-item">+ ${t.items.length-6} more</div>`:""}</div><div style="margin-top:10px"><button class="btn btn-primary btn-sm" data-use-template="${t.id}">Apply</button></div></article>`).join("")}</div>
  `);
}
function settings(){
  return shell(`
    ${head("Workspace","Settings","Manage company name and local backup data.","")}
    <div class="cols-2">
      <section class="panel"><div class="panel-head"><h2>Company</h2></div><div class="panel-body">
        <div class="field-wrap"><label>Workspace name</label><input class="field" id="orgName" value="${esc(state.data.org.name)}"></div>
        <button class="btn btn-primary" id="saveOrg" style="margin-top:10px">Save company name</button>
      </div></section>
      <section class="panel"><div class="panel-head"><h2>Backup & restore</h2></div><div class="panel-body">
        <div class="notice">Export a JSON backup before making major changes. This local build stores project data in your browser.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-secondary" data-action="exportBackup">Export backup</button><button class="btn btn-secondary" data-action="importBackup">Import backup</button><button class="btn btn-danger" data-action="resetData">Reset data</button></div>
        <input type="file" id="backupFile" accept=".json,application/json" class="hidden">
      </div></section>
    </div>
  `);
}
