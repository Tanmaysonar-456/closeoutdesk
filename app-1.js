const CFG = window.CLOSEOUTDESK_CONFIG || {};
const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");

const STORAGE_KEY = "closeoutdesk_final_state_v1";
const FILE_DB = "closeoutdesk_final_files";
const FILE_STORE = "files";

const STATUSES = ["Missing","Requested","Submitted","Needs Revision","Approved","Not Required"];
const PRIORITIES = ["Normal","Important","Critical"];
const CATEGORIES = ["Warranty","O&M Manual","As-Built","Equipment Data","Commissioning","Training","Lien Waiver","Certificate","Inspection","Subcontractor Closeout","Product Data","Attic Stock","Other"];

const state = {
  section:"dashboard",
  currentProjectId:null,
  currentRequirementId:null,
  query:"",
  projectFilter:"all",
  statusFilter:"all",
  categoryFilter:"all",
  sidebarOpen:false,
  data:null
};

const seed = {
  org:{name:"Northstar Contracting"},
  projects:[
    {id:"p1",name:"Northside Community Center",client:"City Facilities Department",number:"NCC-2408",manager:"Alex Morgan",address:"742 Northside Ave, Denver, CO",target:"2026-10-24",status:"active"},
    {id:"p2",name:"Oak Street Offices",client:"Oak Street Partners",number:"OSO-112",manager:"Jamie Lee",address:"88 Oak Street, Denver, CO",target:"2026-09-18",status:"active"},
    {id:"p3",name:"Warehouse Renovation",client:"Western Logistics",number:"WR-91",manager:"Taylor Reid",address:"1900 Industrial Way, Aurora, CO",target:"2026-11-02",status:"active"}
  ],
  contacts:[
    {id:"c1",company:"BrightWire Electric",name:"Sarah Miller",email:"sarah@example.com",phone:"(303) 555-0182",trade:"Electrical"},
    {id:"c2",company:"Peak Mechanical",name:"John Carter",email:"john@example.com",phone:"(303) 555-0165",trade:"HVAC"},
    {id:"c3",company:"Summit Roofing",name:"Mike Turner",email:"mike@example.com",phone:"(303) 555-0130",trade:"Roofing"},
    {id:"c4",company:"ClearFlow Plumbing",name:"Olivia Brooks",email:"olivia@example.com",phone:"(303) 555-0124",trade:"Plumbing"}
  ],
  requirements:[
    {id:"r1",projectId:"p1",title:"HVAC O&M Manuals",category:"O&M Manual",priority:"Important",due:"2026-09-08",status:"Approved",contactId:"c2",notes:"Final approved manuals."},
    {id:"r2",projectId:"p1",title:"Electrical Panel Schedules",category:"As-Built",priority:"Normal",due:"2026-09-07",status:"Approved",contactId:"c1",notes:""},
    {id:"r3",projectId:"p1",title:"Roof Warranty",category:"Warranty",priority:"Critical",due:"2026-09-11",status:"Approved",contactId:"c3",notes:"20-year manufacturer warranty."},
    {id:"r4",projectId:"p1",title:"Fire Alarm Test Report",category:"Inspection",priority:"Important",due:"2026-09-12",status:"Submitted",contactId:"c1",notes:"Awaiting PM review."},
    {id:"r5",projectId:"p1",title:"Final As-Builts",category:"As-Built",priority:"Critical",due:"2026-09-05",status:"Missing",contactId:"c1",notes:""},
    {id:"r6",projectId:"p1",title:"Owner Training Record",category:"Training",priority:"Important",due:"2026-09-13",status:"Needs Revision",contactId:"c2",notes:"Need attendee signatures."},
    {id:"r7",projectId:"p2",title:"Electrical O&M Manuals",category:"O&M Manual",priority:"Important",due:"2026-09-03",status:"Approved",contactId:"c1",notes:""},
    {id:"r8",projectId:"p2",title:"Final Lien Waiver",category:"Lien Waiver",priority:"Critical",due:"2026-09-10",status:"Submitted",contactId:"c1",notes:""},
    {id:"r9",projectId:"p2",title:"Plumbing Warranty",category:"Warranty",priority:"Important",due:"2026-09-05",status:"Missing",contactId:"c4",notes:""},
    {id:"r10",projectId:"p3",title:"Rooftop Unit Data",category:"Equipment Data",priority:"Normal",due:"2026-09-20",status:"Requested",contactId:"c2",notes:""},
    {id:"r11",projectId:"p3",title:"Final As-Builts",category:"As-Built",priority:"Critical",due:"2026-09-23",status:"Missing",contactId:"c1",notes:""}
  ],
  documents:[
    {id:"d1",requirementId:"r1",name:"HVAC-OM-Manuals-v2.pdf",size:178344,mime:"application/pdf",version:2,uploadedAt:"2026-09-03T10:30:00.000Z",localFileId:null}
  ],
  templates:[
    {id:"t1",name:"General Contractor Basic Closeout",trade:"General",items:["Final As-Builts","O&M Manuals","Warranties","Training Records","Inspection Reports","Attic Stock / Spare Materials","Final Lien Waiver"]},
    {id:"t2",name:"Electrical Closeout",trade:"Electrical",items:["Electrical As-Builts","Panel Schedules","O&M Manuals","Equipment Warranties","Test Reports","Training Record","Final Lien Waiver"]},
    {id:"t3",name:"HVAC Closeout",trade:"HVAC",items:["HVAC O&M Manuals","Controls As-Builts","Startup Reports","Commissioning Report","Equipment Warranties","Training Record","Spare Filters"]},
    {id:"t4",name:"Plumbing Closeout",trade:"Plumbing",items:["Plumbing As-Builts","Fixture Data","O&M Manuals","Warranties","Test Certificates","Training Record","Final Lien Waiver"]}
  ],
  activity:[
    {id:"a1",text:"Fire Alarm Test Report changed to Submitted",at:"2026-09-06T06:30:00.000Z"},
    {id:"a2",text:"HVAC O&M Manuals approved",at:"2026-09-05T12:15:00.000Z"},
    {id:"a3",text:"Final As-Builts is overdue",at:"2026-09-05T08:20:00.000Z"}
  ]
};

function clone(v){return JSON.parse(JSON.stringify(v))}
function uid(prefix="id"){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function esc(v=""){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    state.data=raw?JSON.parse(raw):clone(seed);
  }catch{
    state.data=clone(seed);
  }
  state.currentProjectId=state.data.projects[0]?.id||null;
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.data))}
function toast(msg){
  toastRoot.innerHTML=`<div class="toast">${esc(msg)}</div>`;
  setTimeout(()=>toastRoot.innerHTML="",2500);
}
function today(){return new Date().toISOString().slice(0,10)}
function fmtDate(v){
  if(!v)return "—";
  const d=new Date(v+"T00:00:00");
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
function fmtTime(v){try{return new Date(v).toLocaleString()}catch{return v}}
function isOverdue(r){return Boolean(r.due && r.due<today() && !["Approved","Not Required"].includes(r.status))}
function dueSoon(r){
  if(!r.due || ["Approved","Not Required"].includes(r.status))return false;
  const diff=Math.ceil((new Date(r.due+"T00:00:00")-new Date())/86400000);
  return diff>=0&&diff<=7;
}
function projectById(id){return state.data.projects.find(p=>p.id===id)}
function contactById(id){return state.data.contacts.find(c=>c.id===id)}
function contactName(id){const c=contactById(id);return c?`${c.company}${c.name?" • "+c.name:""}`:"Unassigned"}
function reqsForProject(projectId){return state.data.requirements.filter(r=>r.projectId===projectId)}
function completion(projectId){
  const rs=reqsForProject(projectId);if(!rs.length)return 0;
  return Math.round(rs.filter(r=>["Approved","Not Required"].includes(r.status)).length/rs.length*100);
}
function docsForReq(reqId){return state.data.documents.filter(d=>d.requirementId===reqId).sort((a,b)=>b.version-a.version)}
function activity(text){state.data.activity.unshift({id:uid("a"),text,at:new Date().toISOString()});state.data.activity=state.data.activity.slice(0,100);saveState()}
function brand(){return `<a class="brand" href="#/"><span class="brand-mark">CD</span><span>${esc(CFG.brand||"CloseoutDesk")}</span></a>`}

function statusChip(r){
  const s=isOverdue(r)?"Overdue":r.status;
  const map={"Approved":"st-approved","Submitted":"st-submitted","Requested":"st-requested","Missing":"st-missing","Needs Revision":"st-needs-revision","Not Required":"st-requested","Overdue":"st-overdue"};
  return `<span class="status ${map[s]||"st-requested"}">${esc(s)}</span>`;
}

function landing(){
  return `
  <header class="nav">
    <div class="container nav-inner">
      ${brand()}
      <nav class="nav-links">
        <a href="#features">Features</a>
        <a href="#workflow">Workflow</a>
        <a href="#pricing">Pricing</a>
        <a href="#/app">Workspace</a>
      </nav>
      <div class="nav-actions">
        <a class="btn btn-secondary btn-sm" href="#/app">Open demo</a>
        <a class="btn btn-primary btn-sm" href="#/app">Start tracking</a>
      </div>
    </div>
  </header>
  <main>
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <div class="kicker">Construction closeout tracking</div>
          <h1>Know exactly what is <span class="gradient-text">missing, overdue and approved.</span></h1>
          <p>CloseoutDesk gives small contractors one place to manage warranties, O&M manuals, as-builts, subcontractor responsibilities, document revisions and final project turnover.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/app">Open interactive workspace →</a>
            <a class="btn btn-secondary" href="#workflow">See the workflow</a>
          </div>
          <div class="trust-row">
            <span class="trust-pill">No setup required for demo</span>
            <span class="trust-pill">Works on desktop & mobile</span>
            <span class="trust-pill">Exports CSV & printable reports</span>
          </div>
        </div>

        <div class="hero-stage">
          <div class="float-card one">
            <h4>Reminder Center</h4>
            <p>BrightWire Electric — 3 closeout items need attention.</p>
          </div>
          <div class="hero-window">
            <div class="window-bar"><span class="window-dot"></span><span class="window-dot"></span><span class="window-dot"></span></div>
            <div class="window-body">
              <aside class="window-side">
                <div class="window-side-item active">Dashboard</div>
                <div class="window-side-item">Projects</div>
                <div class="window-side-item">Requirements</div>
                <div class="window-side-item">Reminders</div>
                <div class="window-side-item">Analytics</div>
              </aside>
              <div class="window-main">
                <div class="kicker">Portfolio</div>
                <h3 style="margin:6px 0 0;font-size:22px">Closeout Dashboard</h3>
                <div class="mock-metrics">
                  <div class="mock-metric"><label>Projects</label><strong>3</strong></div>
                  <div class="mock-metric"><label>Overdue</label><strong>2</strong></div>
                  <div class="mock-metric"><label>Approved</label><strong>4</strong></div>
                </div>
                <div class="mock-list">
                  <div class="mock-row"><div><strong>Northside Community Center</strong><small>67% complete</small></div><span class="status st-overdue">1 overdue</span></div>
                  <div class="mock-row"><div><strong>Oak Street Offices</strong><small>33% complete</small></div><span class="status st-submitted">In review</span></div>
                  <div class="mock-row"><div><strong>Warehouse Renovation</strong><small>0% complete</small></div><span class="status st-requested">Open</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="float-card two">
            <h4>Project turnover</h4>
            <p>Generate a clean closeout register and print a project status report for the PM or owner.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-alt" id="features">
      <div class="container">
        <div class="section-head">
          <div><div class="kicker">Built around the actual closeout workflow</div><h2>Useful features, not dashboard decoration.</h2></div>
          <p>The product focuses on the last mile of construction: collecting the right documents, from the right company, on time, with the right revision.</p>
        </div>
        <div class="grid-3">
          ${[
            ["✓","Requirement register","Track title, category, subcontractor, due date, priority, status and internal notes."],
            ["↻","Revision-aware files","Upload multiple versions of a closeout document and download the exact revision later."],
            ["✉","Reminder Center","See what each subcontractor owes and generate a ready-to-send follow-up message."],
            ["▣","Trade templates","Apply GC, electrical, HVAC or plumbing closeout checklists to a project in seconds."],
            ["⇧","CSV import & export","Bring in spreadsheet data, export the live closeout register and avoid retyping."],
            ["◫","Portfolio analytics","See project completion, overdue work and vendor risk across the portfolio."]
          ].map(x=>`<article class="feature-card"><div class="feature-icon">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join("")}
        </div>
      </div>
    </section>

    <section class="section" id="workflow">
      <div class="container">
        <div class="section-head">
          <div><div class="kicker">Workflow</div><h2>From kickoff to turnover in five clear steps.</h2></div>
        </div>
        <div class="workflow">
          ${[
            ["01","Create project","Add project, client, manager and target closeout date."],
            ["02","Apply template","Start with a trade-specific closeout checklist."],
            ["03","Assign owners","Tie every item to a subcontractor or contact."],
            ["04","Collect & review","Upload revisions and move items through status."],
            ["05","Turn over","Export the register or print a clean closeout report."]
          ].map(x=>`<div class="step"><b>${x[0]}</b><strong>${x[1]}</strong><p>${x[2]}</p></div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section section-alt" id="pricing">
      <div class="container">
        <div class="section-head">
          <div><div class="kicker">Planned pricing</div><h2>Priced around project value, not random features.</h2></div>
          <p>Payments are not enabled in this beta. These tiers are for product validation and customer interviews.</p>
        </div>
        <div class="price-grid">
          <article class="price-card"><h3>Free</h3><div class="price-value">$0</div><ul><li>1 active project</li><li>Requirement tracking</li><li>Contacts</li><li>CSV export</li></ul><a class="btn btn-secondary btn-block" href="#/app">Try workspace</a></article>
          <article class="price-card featured"><h3>Pro</h3><div class="price-value">$29</div><ul><li>10 active projects</li><li>Templates</li><li>Reminder Center</li><li>Document revisions</li><li>Analytics</li></ul><a class="btn btn-primary btn-block" href="#/app">Preview Pro</a></article>
          <article class="price-card"><h3>Business</h3><div class="price-value">$79</div><ul><li>Unlimited projects</li><li>Higher storage</li><li>Advanced reporting</li><li>Team features later</li></ul><a class="btn btn-secondary btn-block" href="#/app">Preview Business</a></article>
        </div>
      </div>
    </section>
  </main>
  <footer class="footer"><div class="container footer-inner">${brand()}<span class="tiny">Construction closeout tracking for small contractors.</span></div></footer>`;
}
