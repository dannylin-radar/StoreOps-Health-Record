/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSelect, TweakSlider */
const { useState, useMemo, useEffect, useRef } = React;

// ============================================================
// DATA — single store: Whole Foods Market #1247, Cambridge MA
// ============================================================
const STORE = {
  id: "WFM-1247",
  retailer: "Whole Foods Market",
  retailerCode: "WFM",
  storeNum: "1247",
  name: "Cambridge — Charles Sq",
  address: "200 Alewife Brook Pkwy, Cambridge MA 02138",
  phase: "COI",
  health: "yellow",
  owner: "Implementation",
  ownerPerson: "Priya Shah",
  nextAction: "Retailer to return signed COI rev. 3",
  due: "May 6",
  dueDelta: "+5d",
  risk: "medium",
  openedOn: "Mar 14, 2026",
  scheduledLive: "May 18, 2026",
  sqft: "48,200",
  region: "Northeast / NE-04",
  fixtureCount: 142,
  skus: 38
};

const PHASES = ["Planning", "Scheduled", "COI", "Deployment", "Live"];
function trackState(name, d) {
  const total = d.subtasks.length;
  const done = d.subtasks.filter(s => s.done).length;
  const blocked = d.subtasks.some(s => !s.done && s.flag === "blocker");
  const watch = d.subtasks.some(s => !s.done && s.flag === "watch");
  const state = done === total ? "complete" : done === 0 ? "not-started" : "active";
  return { total, done, blocked, watch, state };
}

const PHASE_DETAIL = {
  Planning: {
    summary: "Scoping, retailer agreement, region + format selection.",
    owner: "Implementation",
    completed: "Mar 14 — Apr 1",
    subtasks: [
      { label: "Retailer MSA on file", done: true, team: "Legal" },
      { label: "Region + format confirmed", done: true, team: "Implementation" },
      { label: "Initial scope sign-off", done: true, team: "Implementation" },
      { label: "Internal kickoff held", done: true, team: "Implementation" },
    ],
  },
  Scheduled: {
    summary: "Site survey, planogram, install date.",
    owner: "Store Planning",
    completed: "Apr 1 — Apr 22",
    subtasks: [
      { label: "Site survey complete", done: true, team: "Deployment" },
      { label: "Planogram approved", done: true, team: "Store Planning" },
      { label: "Install date booked", done: true, team: "Deployment" },
      { label: "Day-of contact tree confirmed", done: true, team: "Support" },
    ],
  },
  COI: {
    summary: "Certificate of insurance + permits + retailer ops sign-off.",
    owner: "Implementation",
    completed: "Apr 22 — in progress (day 10)",
    subtasks: [
      { label: "COI rev. 1 submitted", done: true, team: "Legal" },
      { label: "COI rev. 2 reviewed by retailer", done: true, team: "Legal" },
      { label: "COI rev. 3 signed by retailer", done: false, team: "Legal", flag: "blocker" },
      { label: "20A circuit work order filed", done: false, team: "Deployment", flag: "watch" },
      { label: "Retailer ops sign-off", done: false, team: "Support" },
    ],
  },
  Deployment: {
    summary: "Install, validation, day-of support.",
    owner: "Deployment",
    completed: "— scheduled May 18",
    subtasks: [
      { label: "Pre-install walkthrough scheduled", done: false, team: "Deployment" },
      { label: "Install crew reserved", done: true, team: "Deployment" },
      { label: "Shipping manifest validated", done: true, team: "Store Planning" },
      { label: "Day-of install", done: false, team: "Deployment" },
      { label: "Post-install QA pass", done: false, team: "Support" },
    ],
  },
  Live: {
    summary: "Store live; first-week performance + handoff to ops.",
    owner: "Support",
    completed: "— target May 18",
    subtasks: [
      { label: "Go-live confirmation", done: false, team: "Deployment" },
      { label: "Week-1 performance review", done: false, team: "Support" },
      { label: "Handoff to retail ops", done: false, team: "Support" },
    ],
  },
};

const TIMELINE = [
{ t: "Apr 30 · 14:22", who: "Priya Shah", team: "Implementation", kind: "note", sev: "blocker", title: "COI rev. 3 sent — awaiting retailer signature",
  body: "Sent updated COI to Marcus (WFM legal) reflecting the additional named insured ask from rev. 2. ETA on return is Mon May 4 per Marcus.", action: true, due: "May 6", mentions: ["@deployment"] },
{ t: "Apr 30 · 11:08", who: "system", team: "—", kind: "status", title: "Health changed: green → yellow", body: "Auto-flag: COI in-flight >10 days." },
{ t: "Apr 29 · 16:50", who: "Jordan Reyes", team: "Deployment", kind: "task", title: "Reserved install crew (3p) for May 18 0500–1100", body: "Holding; will release May 12 if COI not cleared.", action: false },
{ t: "Apr 28 · 09:14", who: "Alex Chen", team: "Support", kind: "comm", title: "Email from Marcus Webb (WFM) — re: insurance language",
  body: "Marcus wants \"each location\" instead of \"site-specific\" in the additional insured clause. Looped legal.", attachment: "RE_ COI rev2 review.eml" },
{ t: "Apr 27 · 13:02", who: "Priya Shah", team: "Implementation", kind: "note", sev: "watch", title: "Power audit complete — 2 of 6 fixtures need 20A circuits",
  body: "Existing panel has capacity. Electrician quoted $2,400, falls under retailer-side per MSA §4.2. Flagged Marcus.", attachment: "audit_WFM-1247.pdf" },
{ t: "Apr 24 · 10:30", who: "Sam Okafor", team: "Store Planning", kind: "note", sev: "info", title: "Planogram approved by category mgr",
  body: "Final planogram signed off by Lena (WFM grocery). 142 fixtures, endcap at aisle 7 confirmed." },
{ t: "Apr 22 · 09:00", who: "system", team: "—", kind: "status", title: "Track started: COI" },
{ t: "Apr 18 · 15:45", who: "Jordan Reyes", team: "Deployment", kind: "note", sev: "info", title: "Site survey complete",
  body: "Loading dock access confirmed for overnight delivery. No freight elevator restrictions." },
{ t: "Mar 14 · 08:00", who: "system", team: "—", kind: "status", title: "Store opened in StoreOps" }];


const TASKS = [
{ id: "T-1042", title: "Get signed COI rev. 3 from WFM legal", state: "Waiting", owner: "Priya S.", due: "May 6", flag: "blocker" },
{ id: "T-1041", title: "Confirm install crew availability May 18", state: "Done", owner: "Jordan R.", due: "Apr 29", flag: null },
{ id: "T-1043", title: "File 20A circuit work order with retailer ops", state: "Open", owner: "Priya S.", due: "May 8", flag: null },
{ id: "T-1044", title: "Schedule pre-install walkthrough w/ store mgr", state: "Open", owner: "Jordan R.", due: "May 14", flag: null },
{ id: "T-1040", title: "Validate planogram against shipping manifest", state: "Done", owner: "Sam O.", due: "Apr 26", flag: null }];


const TEAM = [
  { name: "Priya Shah", role: "Implementation lead", team: "Implementation", load: "primary", initials: "PS", since: "Mar 14" },
  { name: "Jordan Reyes", role: "Deployment manager", team: "Deployment", load: "active", initials: "JR", since: "Apr 1" },
  { name: "Sam Okafor", role: "Store planning", team: "Store Planning", load: "active", initials: "SO", since: "Apr 8" },
  { name: "Alex Chen", role: "Support eng", team: "Support", load: "watching", initials: "AC", since: "Apr 22" },
  { name: "Mei Tanaka", role: "Legal", team: "Legal", load: "watching", initials: "MT", since: "Apr 24" },
];

const CONTACTS = [
{ name: "Marcus Webb", role: "Legal counsel", org: "Whole Foods Market", email: "m.webb@wfm.example", primary: true },
{ name: "Lena Park", role: "Category mgr — Grocery", org: "Whole Foods Market", email: "l.park@wfm.example" },
{ name: "Dan Ortiz", role: "Store manager", org: "WFM #1247", email: "d.ortiz@wfm.example" },
{ name: "Priya Shah", role: "Implementation lead", org: "Internal", email: "priya@storeops.internal", internal: true },
{ name: "Jordan Reyes", role: "Deployment", org: "Internal", email: "jordan@storeops.internal", internal: true }];


const FLAGS = [
{ label: "COI in-flight", tone: "blocker", since: "10d", team: "Implementation" },
{ label: "Retailer response needed", tone: "watch", since: "2d", team: "Support" },
{ label: "Install risk: tight", tone: "watch", since: "—", team: "Deployment" }];


const TEAMS = [
{ id: "Implementation", short: "Impl" },
{ id: "Deployment", short: "Deploy" },
{ id: "Support", short: "Spt" },
{ id: "Store Planning", short: "Plan" },
{ id: "Legal", short: "Legal" },
{ id: "Leadership", short: "Lead" }];


const FILES = [
{ name: "COI_WFM-1247_rev3.pdf", size: "412 KB", who: "Priya S.", when: "Apr 30" },
{ name: "audit_WFM-1247.pdf", size: "2.1 MB", who: "Priya S.", when: "Apr 27" },
{ name: "planogram_v_final.pdf", size: "5.6 MB", who: "Sam O.", when: "Apr 24" },
{ name: "site_survey_photos.zip", size: "18 MB", who: "Jordan R.", when: "Apr 18" },
{ name: "MSA_WFM_2026.pdf", size: "880 KB", who: "system", when: "Mar 14" }];


const AI_SUGGESTIONS = [
{ q: "What's blocking this store?", icon: "blocker" },
{ q: "Summarize the last 7 days", icon: "summary" },
{ q: "Draft a status email to retailer", icon: "draft" },
{ q: "What's the install risk?", icon: "risk" }];


// ============================================================
// PRIMITIVES
// ============================================================
const cx = (...c) => c.filter(Boolean).join(" ");

function Dot({ tone = "neutral", size = 8 }) {
  const map = {
    green: "var(--ok)", yellow: "var(--warn)", red: "var(--bad)",
    blocker: "var(--bad)", watch: "var(--warn)", info: "var(--muted-fg)",
    neutral: "var(--muted-fg)", accent: "var(--accent)"
  };
  return <span className="dot" style={{ width: size, height: size, background: map[tone] || map.neutral }} />;
}

function Pill({ children, tone = "neutral", mono, style }) {
  return <span className={cx("pill", `pill-${tone}`, mono && "mono")} style={style}>{children}</span>;
}

function Kbd({ children }) {
  return <kbd className="kbd">{children}</kbd>;
}

function HRule() {return <div className="hrule" />;}

// Tiny inline icons (geometric only — no figurative SVG)
const Icon = {
  search: () => <svg viewBox="0 0 16 16" width="13" height="13"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  chev: () => <svg viewBox="0 0 16 16" width="11" height="11"><path d="M5 6l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  chevR: () => <svg viewBox="0 0 16 16" width="11" height="11"><path d="M6 4l3 4-3 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  plus: () => <svg viewBox="0 0 16 16" width="12" height="12"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  spark: () => <svg viewBox="0 0 16 16" width="12" height="12"><path d="M8 2l1.4 4.2L13.6 8 9.4 9.4 8 14l-1.4-4.6L2 8l4.6-1.8z" fill="currentColor" /></svg>,
  dot3: () => <svg viewBox="0 0 16 16" width="12" height="12"><circle cx="3" cy="8" r="1.2" fill="currentColor" /><circle cx="8" cy="8" r="1.2" fill="currentColor" /><circle cx="13" cy="8" r="1.2" fill="currentColor" /></svg>,
  link: () => <svg viewBox="0 0 16 16" width="11" height="11"><path d="M6 9.5L9.5 6M6.5 4h2a3 3 0 010 6h-1m1 2h-2a3 3 0 010-6h1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
  paper: () => <svg viewBox="0 0 16 16" width="11" height="11"><path d="M4 2h5l3 3v9H4z" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M9 2v3h3" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>,
  arrowU: () => <svg viewBox="0 0 16 16" width="11" height="11"><path d="M8 13V4M5 7l3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  close: () => <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  check: () => <svg viewBox="0 0 16 16" width="11" height="11"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
  flag: () => <svg viewBox="0 0 16 16" width="11" height="11"><path d="M4 14V3h7l-1.5 2.5L11 8H4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>,
  filter: () => <svg viewBox="0 0 16 16" width="12" height="12"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  send: () => <svg viewBox="0 0 16 16" width="12" height="12"><path d="M2 8l12-5-4 12-2-5z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
};

// ============================================================
// LEFT NAV
// ============================================================
function LeftNav() {
  const items = [
  { label: "Dashboard", k: "D" },
  { label: "Retailers", k: "R", count: 7 },
  { label: "Stores", k: "S", count: 248, active: true },
  { label: "Flags", k: "F", count: 31 },
  { label: "Tasks", k: "T", count: 84 },
  { label: "AI chat", k: "A" },
  { label: "Reports", k: "P" }];

  return (
    <nav className="leftnav">
      <div className="leftnav-head">
        <div className="brand">
          <span className="brand-mark"></span>
          <span className="brand-word">storeops</span>
        </div>
        <button className="iconbtn" title="Command menu (⌘K)"><Icon.search /></button>
      </div>
      <div className="nav-section-label">Workspaces</div>
      <ul className="nav-list">
        {items.map((i) =>
        <li key={i.label} className={cx("nav-item", i.active && "is-active")}>
            <span className="nav-label">{i.label}</span>
            {i.count != null && <span className="nav-count mono">{i.count}</span>}
            <Kbd>{i.k}</Kbd>
          </li>
        )}
      </ul>
      <div className="nav-section-label">Pinned stores</div>
      <ul className="nav-list nav-pinned">
        {[
        { id: "WFM-1247", label: "Cambridge — Charles Sq", h: "yellow", active: true },
        { id: "TGT-0883", label: "Austin — Mueller", h: "red" },
        { id: "WFM-1102", label: "Brooklyn — Bedford", h: "green" },
        { id: "KRG-2210", label: "Cincinnati — Hyde Park", h: "green" },
        { id: "TGT-1455", label: "Seattle — Northgate", h: "yellow" }].
        map((s) =>
        <li key={s.id} className={cx("nav-item nav-store", s.active && "is-active")}>
            <Dot tone={s.h} />
            <span className="mono nav-store-id">{s.id}</span>
            <span className="nav-store-name">{s.label}</span>
          </li>
        )}
      </ul>
      <div className="leftnav-foot">
        <div className="me">
          <span className="avatar mono">PS</span>
          <div className="me-text">
            <div>Priya Shah</div>
            <div className="me-sub">Implementation · Acme</div>
          </div>
        </div>
      </div>
    </nav>);

}

// ============================================================
// HEADER (breadcrumb, store id, track strip, snapshot row)
// ============================================================
function StoreHeader({ tweaks, onNewNote, onFlag, onPhaseSelect }) {
  return (
    <header className="store-header">
      <div className="crumbs">
        <span>Stores</span>
        <Icon.chevR />
        <span>{STORE.retailer}</span>
        <Icon.chevR />
        <span className="crumb-current mono">{STORE.id}</span>
        <span className="crumb-tail">· {STORE.name}</span>
        <div className="header-actions">
          <button className="btn ghost" onClick={onFlag}><Icon.flag /> Flag <Kbd>F</Kbd></button>
          <button className="btn ghost"><Icon.link /> Copy link</button>
          <button className="btn ghost"><Icon.dot3 /></button>
          <button className="btn primary" onClick={onNewNote}><Icon.plus /> New note <Kbd>N</Kbd></button>
        </div>
      </div>

      <div className="store-title-row">
        <div className="store-title-left">
          <Dot tone={STORE.health} size={10} />
          <h1 className="store-title">{STORE.retailer} #{STORE.storeNum}</h1>
          <span className="store-sub mono">{STORE.id}</span>
          <span className="addr-sep">·</span>
          <span className="store-addr">{STORE.address}</span>
        </div>
        <div className="store-title-right">
          <span className="meta-stat"><span className="meta-k">INSTALL DATE</span> <span className="mono">{STORE.openedOn}</span></span>
          <span className="meta-stat"><span className="meta-k">SITE SURVEY</span> <span className="mono">{STORE.scheduledLive}</span></span>
          <span className="meta-stat"><span className="meta-k">Sqft</span> <span className="mono">{STORE.sqft}</span></span>
          <span className="meta-stat"><span className="meta-k">Region</span> <span className="mono">{STORE.region}</span></span>
        </div>
      </div>

      {tweaks.showPhase && <PhaseStrip onSelect={onPhaseSelect} />}
    </header>);

}

function PhaseStrip({ onSelect }) {
  return (
    <div className="phase-strip" role="list" aria-label="Workstream tracks">
      {PHASES.map((p) => {
        const d = PHASE_DETAIL[p];
        const { total, done, blocked, watch, state } = trackState(p, d);
        const pct = total ? Math.round((done / total) * 100) : 0;
        return (
          <button key={p} role="listitem"
            className={cx("phase-seg", `is-${state}`, blocked && "is-blocked", watch && !blocked && state === "active" && "is-watch")}
            onClick={() => onSelect(p)}
            title={`${p} — ${done}/${total} subtasks${blocked?" · blocker":watch?" · watch":""}`}>
            <div className="phase-bar"><div className="phase-bar-fill" style={{ width: pct + "%" }} /></div>
            <div className="phase-label">
              <span>{p}</span>
              {state === "complete" && <span className="phase-check"><Icon.check /></span>}
              {blocked && <Dot tone="red" />}
              {!blocked && watch && state === "active" && <Dot tone="yellow" />}
              <span className="phase-open mono" data-state={state}>{done}/{total}</span>
            </div>
          </button>);
      })}
    </div>);
}

// ============================================================
// TRACK DRAWER
// ============================================================
function PhaseDrawer({ phase, onClose, onPostNote, onCreateTask, onToggleSub, subState, phaseTasks, phaseNotes }) {
  const [tab, setTab] = useState("checklist");
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTeam, setTaskTeam] = useState("Implementation");
  const [taskDue, setTaskDue] = useState("");

  useEffect(() => {
    if (!phase) return;
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onClose]);

  if (!phase) return null;
  const d = PHASE_DETAIL[phase];
  const subs = d.subtasks.map((s, i) => ({ ...s, done: subState[`${phase}:${i}`] ?? s.done, _i: i }));
  const completed = subs.filter(s => s.done).length;
  const liveBlocked = subs.some(s => !s.done && s.flag === "blocker");
  const liveWatch = subs.some(s => !s.done && s.flag === "watch");
  const state = completed === subs.length ? "complete" : completed === 0 ? "not-started" : "active";
  const stateLabel = state === "complete" ? "complete" : state === "not-started" ? "not started" : (liveBlocked ? "blocked" : liveWatch ? "at risk" : "active");

  const submitNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onPostNote(phase, noteText.trim());
    setNoteText("");
  };
  const submitTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onCreateTask(phase, { title: taskTitle.trim(), team: taskTeam, due: taskDue.trim() || "—" });
    setTaskTitle(""); setTaskDue("");
  };

  return (
    <div className="drawer-scrim" onMouseDown={onClose}>
      <aside className="phase-drawer" onMouseDown={e => e.stopPropagation()}>
        <header className="drawer-head">
          <div className="drawer-crumb mono">
            <span className="muted-tx">Track</span>
            <Icon.chevR/>
            <span>{phase}</span>
            <Pill tone={state==="complete"?"info":liveBlocked?"blocker":liveWatch?"watch":state==="not-started"?"info":"watch"}>{stateLabel}</Pill>
          </div>
          <div className="grow"/>
          <span className="muted-tx mono"><Kbd>esc</Kbd></span>
          <button className="iconbtn" onClick={onClose}><Icon.close/></button>
        </header>
        <div className="drawer-meta">
          <p className="drawer-summary">{d.summary}</p>
          <div className="drawer-meta-row">
            <span className="meta-stat"><span className="meta-k">Owner</span> <span>{d.owner}</span></span>
            <span className="meta-stat"><span className="meta-k">When</span> <span className="mono">{d.completed}</span></span>
            <span className="meta-stat"><span className="meta-k">Progress</span> <span className="mono">{completed}/{subs.length}</span></span>
          </div>
        </div>
        <div className="drawer-tabs">
          {[
            { id: "checklist", label: "Checklist", n: subs.length },
            { id: "notes", label: "Notes", n: phaseNotes.length },
            { id: "tasks", label: "Tasks", n: phaseTasks.length },
          ].map(t => (
            <button key={t.id} className={cx("drawer-tab", tab===t.id && "is-active")} onClick={()=>setTab(t.id)}>
              {t.label} <span className="mono tab-count">{t.n}</span>
            </button>
          ))}
        </div>
        <div className="drawer-body">
          {tab === "checklist" && (
            <ul className="checklist drawer-checklist">
              {subs.map((s) => (
                <li key={s._i} className={cx("check-row", s.done && "is-done")}>
                  <button className={cx("check-box", s.done && "is-on")} onClick={() => onToggleSub(phase, s._i)}>
                    {s.done && <Icon.check/>}
                  </button>
                  <span className="mono check-num">{String(s._i+1).padStart(2,"0")}</span>
                  <span className="check-label">{s.label}</span>
                  <span className="flag-team mono">{s.team}</span>
                  {s.flag && !s.done && <Pill tone={s.flag}>{s.flag}</Pill>}
                </li>
              ))}
            </ul>
          )}
          {tab === "notes" && (
            <div className="drawer-notes">
              <form className="drawer-mini-composer" onSubmit={submitNote}>
                <textarea
                  rows={2}
                  placeholder={`Add a note for ${phase}…`}
                  value={noteText}
                  onChange={e=>setNoteText(e.target.value)}
                  onKeyDown={e=>{ if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){ submitNote(e);} }}
                />
                <div className="drawer-comp-foot">
                  <span className="muted-tx mono"><Kbd>⌘</Kbd>+<Kbd>↵</Kbd> post</span>
                  <div className="grow"/>
                  <button className="btn primary" disabled={!noteText.trim()}><Icon.arrowU/> Post</button>
                </div>
              </form>
              {phaseNotes.length === 0 ? (
                <div className="drawer-empty">No notes scoped to this phase yet.</div>
              ) : (
                <ol className="timeline drawer-timeline">
                  {phaseNotes.map((e, i) => <TimelineItem key={i} e={e}/>)}
                </ol>
              )}
            </div>
          )}
          {tab === "tasks" && (
            <div className="drawer-tasks">
              <form className="drawer-task-form" onSubmit={submitTask}>
                <input placeholder={`New task for ${phase}…`} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}/>
                <div className="drawer-task-row">
                  <span className="comp-label">assign</span>
                  <select className="select-ish mono" value={taskTeam} onChange={e=>setTaskTeam(e.target.value)}>
                    {TEAMS.map(t => <option key={t.id}>{t.id}</option>)}
                  </select>
                  <span className="comp-label">due</span>
                  <input className="due-inline mono" placeholder="May 6" value={taskDue} onChange={e=>setTaskDue(e.target.value)}/>
                  <div className="grow"/>
                  <button className="btn primary" disabled={!taskTitle.trim()}><Icon.plus/> Create task</button>
                </div>
              </form>
              {phaseTasks.length === 0 ? (
                <div className="drawer-empty">No tasks scoped to this phase yet.</div>
              ) : (
                <ul className="drawer-task-list">
                  {phaseTasks.map((t, i) => (
                    <li key={i} className="drawer-task-row-item">
                      <Dot tone={t.state==="Done"?"green":t.state==="Waiting"?"yellow":"neutral"}/>
                      <span className="mono task-id">{t.id}</span>
                      <span className="drawer-task-title">{t.title}</span>
                      <span className="flag-team mono">{t.team || t.owner}</span>
                      <span className="muted-tx mono">{t.due}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ============================================================
// TABS
// ============================================================
const TABS = [
{ id: "overview", label: "Overview", k: "1" },
{ id: "timeline", label: "Timeline", k: "2", count: TIMELINE.length },
{ id: "notes", label: "Notes", k: "3", count: 18 },
{ id: "tasks", label: "Tasks", k: "4", count: TASKS.filter((t) => t.state !== "Done").length },
{ id: "comms", label: "Comms", k: "5", count: 6 },
{ id: "files", label: "Files", k: "6", count: FILES.length },
{ id: "audit", label: "Audit", k: "7" }];


function TabBar({ active, onSelect }) {
  return (
    <div className="tabs">
      {TABS.map((t) =>
      <button key={t.id} className={cx("tab", active === t.id && "is-active")} onClick={() => onSelect(t.id)}>
          {t.label}
          {t.count != null && <span className="tab-count mono">{t.count}</span>}
          <Kbd>{t.k}</Kbd>
        </button>
      )}
      <div className="tabs-spacer" />
      <button className="btn ghost sm"><Icon.filter /> Filter</button>
      <div className="tabs-search">
        <Icon.search />
        <input placeholder="Search this store…" />
        <Kbd>/</Kbd>
      </div>
    </div>);

}

// ============================================================
// OVERVIEW (snapshot blocks)
// ============================================================
function Overview() {
  return (
    <div className="overview">
      <div className="snap-grid">
        <SnapBlock label="Active tracks" value="COI · Deployment" sub="2 of 5 in flight" tone="yellow" />
        <SnapBlock label="Health" value="Yellow" sub="Auto-flagged Apr 30" tone="yellow" />
        <SnapBlock label="Owner" value="Implementation" sub="Priya Shah" />
        <SnapBlock label="Next action" value="Sign COI rev. 3" sub={`Due ${STORE.due} · ${STORE.dueDelta}`} tone="yellow" wide />
        <SnapBlock label="Risk level" value="Medium" sub="Install crew held until May 12" tone="yellow" />
        <SnapBlock label="Days to go-live" value="18" sub={`${STORE.scheduledLive}`} mono />
      </div>

      <section className="block">
        <header className="block-head">
          <h3>Active blockers</h3>
          <span className="block-meta mono">2 open · 1 awaiting external</span>
        </header>
        <div className="blocker-list">
          <BlockerRow num="01" title="COI rev. 3 — awaiting retailer signature" who="Marcus Webb · WFM Legal" age="3d" tone="blocker" />
          <BlockerRow num="02" title="20A circuit work order — needs retailer ops sign-off" who="Dan Ortiz · WFM Store mgr" age="—" tone="watch" />
        </div>
      </section>

      <section className="block">
        <header className="block-head">
          <h3>Readiness checklist</h3>
          <span className="block-meta mono">2/3 complete</span>
        </header>
        <ul className="checklist">
          {[
          ["Site Survey", true],
          ["Store Design", true],
          ["COI/Permits", false, "blocker"]].
          map(([label, done, tone], i) =>
          <li key={i} className={cx("check-row", done && "is-done")}>
              <span className={cx("check-box", done && "is-on")}>{done && <Icon.check />}</span>
              <span className="mono check-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="check-label">{label}</span>
              {tone && !done && <Pill tone={tone}>{tone === "blocker" ? "blocker" : "watch"}</Pill>}
            </li>
          )}
        </ul>
      </section>
    </div>);

}

function SnapBlock({ label, value, sub, tone, wide, mono }) {
  return (
    <div className={cx("snap", wide && "snap-wide")}>
      <div className="snap-label">{label}</div>
      <div className={cx("snap-value", mono && "mono")}>
        {tone && <Dot tone={tone} />}
        <span>{value}</span>
      </div>
      <div className="snap-sub">{sub}</div>
    </div>);

}

function BlockerRow({ num, title, who, age, tone }) {
  return (
    <div className="blocker-row">
      <span className="mono blocker-num">{num}</span>
      <Dot tone={tone} />
      <div className="blocker-body">
        <div className="blocker-title">{title}</div>
        <div className="blocker-meta">{who}</div>
      </div>
      <span className="mono blocker-age">{age}</span>
      <button className="btn ghost sm">Resolve</button>
    </div>);

}

// ============================================================
// TIMELINE
// ============================================================
function Timeline({ entries }) {
  const [filter, setFilter] = useState("all");
  const filters = [
  { id: "all", label: "All", n: entries.length },
  { id: "note", label: "Notes", n: entries.filter((e) => e.kind === "note").length },
  { id: "task", label: "Tasks", n: entries.filter((e) => e.kind === "task").length },
  { id: "comm", label: "Comms", n: entries.filter((e) => e.kind === "comm").length },
  { id: "status", label: "Status", n: entries.filter((e) => e.kind === "status").length }];

  const list = filter === "all" ? entries : entries.filter((e) => e.kind === filter);
  return (
    <div className="timeline-wrap">
      <div className="timeline-filter">
        {filters.map((f) =>
        <button key={f.id} className={cx("chip", filter === f.id && "is-on")} onClick={() => setFilter(f.id)}>
            {f.label} <span className="mono chip-n">{f.n}</span>
          </button>
        )}
        <div className="grow" />
        <span className="muted-tx mono">Sorted: newest first</span>
      </div>
      <ol className="timeline">
        {list.map((e, i) => <TimelineItem key={i} e={e} />)}
      </ol>
    </div>);

}

function TimelineItem({ e }) {
  const KIND_LABEL = { note: "NOTE", task: "TASK", comm: "COMM", status: "STATUS" };
  return (
    <li className={cx("tl-item", `tl-${e.kind}`)}>
      <div className="tl-rail">
        <span className="tl-dot">
          <Dot tone={e.sev === "blocker" ? "blocker" : e.sev === "watch" ? "watch" : e.kind === "status" ? "neutral" : "accent"} size={9} />
        </span>
      </div>
      <div className="tl-body">
        <div className="tl-meta">
          <span className="mono tl-time">{e.t}</span>
          <span className="tl-kind mono">{KIND_LABEL[e.kind]}</span>
          {e.who !== "system" ?
          <><span className="avatar avatar-xs mono">{e.who.split(" ").map((s) => s[0]).join("").slice(0, 2)}</span>
            <span className="tl-who">{e.who}</span>
            <span className="muted-tx">·</span>
            <span className="muted-tx">{e.team}</span></> :
          <span className="muted-tx">system</span>}
          {e.sev && e.sev !== "info" && <Pill tone={e.sev}>{e.sev}</Pill>}
          {e.action && <Pill tone="accent">action · due {e.due}</Pill>}
          <div className="grow" />
          <button className="iconbtn xs" title="More"><Icon.dot3 /></button>
        </div>
        <div className="tl-title">{e.title}</div>
        {e.body && <div className="tl-text">{e.body}</div>}
        {e.attachment &&
        <div className="tl-attach">
            <Icon.paper />
            <span className="mono">{e.attachment}</span>
          </div>
        }
        {e.mentions &&
        <div className="tl-mentions">
            {e.mentions.map((m) => <span key={m} className="mention mono">{m}</span>)}
          </div>
        }
      </div>
    </li>);

}

// ============================================================
// AUDIT
// ============================================================
function Audit() {
  const rows = [
  ["Apr 30 14:22:11", "priya@", "note.create", "id=N-2241 sev=blocker action=true"],
  ["Apr 30 11:08:02", "system", "health.change", "from=green to=yellow reason=coi_age>10"],
  ["Apr 29 16:50:43", "jordan@", "task.update", "id=T-1041 state=Open→Done"],
  ["Apr 28 09:14:20", "alex@", "comm.ingest", "src=email msg-id=<webb@wfm…>"],
  ["Apr 27 13:02:09", "priya@", "file.upload", "name=audit_WFM-1247.pdf size=2.1MB"],
  ["Apr 24 10:30:00", "sam@", "note.create", "id=N-2188 sev=info"],
  ["Apr 22 09:00:00", "system", "phase.change", "from=Scheduled to=COI"]];

  return (
    <div className="audit">
      <div className="files-head">
        <h3>Audit log <span className="muted-tx mono">{rows.length} of 312</span></h3>
        <span className="muted-tx mono">immutable · exportable</span>
      </div>
      <table className="audit-tbl mono">
        <tbody>
          {rows.map((r, i) =>
          <tr key={i}>
              <td className="audit-t">{r[0]}</td>
              <td className="audit-u">{r[1]}</td>
              <td className="audit-a">{r[2]}</td>
              <td className="audit-d">{r[3]}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

}

// ============================================================
// RIGHT RAIL
// ============================================================
function RightRail({ onAskAI, flags, onFlag }) {
  return (
    <aside className="rail">
      <section className="rail-section">
        <div className="rail-head">
          <h4>AI summary</h4>
          <span className="muted-tx mono">updated 3m ago</span>
        </div>
        <p className="ai-summary-text">
          Store is in <b>COI day 10</b> (target ≤7), health auto-flagged yellow Apr 30. Single
          external blocker: <b>signed COI rev. 3</b> from WFM legal (Marcus Webb), expected back Mon May 4.
          Install crew is held for May 18; release date is May 12 if COI doesn't clear.
        </p>
        <div className="ai-cite">
          <span className="muted-tx mono">sources:</span>
          <a className="cite mono">N-2241</a>
          <a className="cite mono">N-2235</a>
          <a className="cite mono">T-1041</a>
        </div>
        <button className="btn primary full" onClick={onAskAI}>
          <Icon.spark /> Ask about this store <Kbd>⌘J</Kbd>
        </button>
      </section>

      <section className="rail-section">
        <div className="rail-head"><h4>Snapshot</h4></div>
        <dl className="kv">
          <dt>Tracks</dt><dd className="track-mini">
            <span className="trk trk-complete" title="Planning · complete">P</span>
            <span className="trk trk-complete" title="Scheduled · complete">S</span>
            <span className="trk trk-blocked" title="COI · blocked">C</span>
            <span className="trk trk-active" title="Deployment · active">D</span>
            <span className="trk trk-idle" title="Live · not started">L</span>
          </dd>
          <dt>Owner</dt><dd>Implementation · Priya S.</dd>
          <dt>Next action</dt><dd>Sign COI rev. 3</dd>
          <dt>Due</dt><dd className="mono">May 6 <span className="muted-tx">· +5d</span></dd>
          <dt>Risk</dt><dd><Dot tone="yellow" /> Medium</dd>
          <dt>Go-live</dt><dd className="mono">May 18, 2026</dd>
          <dt>Last activity</dt><dd className="mono">3m ago</dd>
        </dl>
      </section>

      <section className="rail-section">
        <div className="rail-head">
          <h4>Flags <span className="muted-tx mono">{flags.length}</span></h4>
          <button className="linkbtn" onClick={onFlag}><Icon.plus /> Raise</button>
        </div>
        <ul className="flag-list">
          {flags.map((f, i) =>
          <li key={i} className="flag-row">
              <Dot tone={f.tone} />
              <span className="flag-label">{f.label}</span>
              <span className="flag-team mono">{f.team}</span>
              <span className="muted-tx mono">{f.since}</span>
            </li>
          )}
        </ul>
      </section>

      <section className="rail-section">
        <div className="rail-head"><h4>Team <span className="muted-tx mono">{TEAM.length}</span></h4></div>
        <ul className="contacts">
          {TEAM.map((m) =>
          <li key={m.name} className="contact-row">
              <span className={cx("avatar avatar-sm mono", "avatar-internal")}>
                {m.initials}
              </span>
              <div className="contact-text">
                <div className="contact-name">{m.name} {m.load === "primary" && <span className="muted-tx mono">· lead</span>}</div>
                <div className="contact-sub">{m.role} · <span className="mono muted-tx">since {m.since}</span></div>
              </div>
              <Pill tone={m.load === "primary" ? "watch" : m.load === "active" ? "info" : "info"}>{m.load}</Pill>
            </li>
          )}
        </ul>
      </section>
    </aside>);

}

// ============================================================
// AI MODAL (on-demand)
// ============================================================
function AIModal({ open, onClose }) {
  const [messages, setMessages] = useState([
  { role: "ai", text: `Asking about ${STORE.retailer} #${STORE.storeNum}. I have access to all notes, tasks, comms, and files for this store.` }]
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = async (q) => {
    const text = (q ?? input).trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const ctx = `You are StoreOps AI, an assistant grounded in a single store's records. Answer concisely (3-6 sentences max), in plain prose, and cite specific records by inline tag like [N-2241] or [T-1041] when relevant. Never invent records.

STORE: ${STORE.retailer} #${STORE.storeNum} (${STORE.id}) — ${STORE.address}
PHASE: COI day 10 (target ≤7), health=yellow auto-flagged Apr 30
OWNER: Implementation / Priya Shah
NEXT: Signed COI rev. 3 from WFM legal due May 6
RISK: Medium. Install crew reserved May 18 0500-1100, releases May 12 if COI not cleared.

KEY RECORDS:
- [N-2241] Apr 30: COI rev. 3 sent to Marcus Webb (WFM legal); expected back Mon May 4. action=true sev=blocker
- [N-2235] Apr 27: Power audit — 2/6 fixtures need 20A circuits; retailer-side per MSA §4.2; quoted $2,400. sev=watch
- [N-2230] Apr 24: Planogram approved by Lena Park (WFM grocery cat mgr). 142 fixtures.
- [T-1041] Apr 29: Install crew reserved for May 18. state=Done
- [T-1042] OPEN: Get signed COI rev. 3 from WFM legal. due=May 6. flag=blocker
- [T-1043] OPEN: File 20A circuit work order with retailer ops. due=May 8
- [C-0418] Apr 28: Email from Marcus Webb re: insurance language ("each location" vs "site-specific")

CONTACTS: Marcus Webb (WFM legal, primary), Lena Park (WFM grocery cat mgr), Dan Ortiz (WFM #1247 store mgr), Priya Shah (impl lead), Jordan Reyes (deployment)

Question: ${text}`;

      // ── Call the Anthropic API ─────────────────────────────────────────────
      // In production, proxy through a Supabase Edge Function so your key
      // stays server-side.  Set window.__STOREOPS_CONFIG__.anthropicKey for
      // local dev, or deploy /supabase/functions/ai-proxy/index.ts (see the
      // README) and leave anthropicKey blank.
      // ──────────────────────────────────────────────────────────────────────
      const cfg   = window.__STOREOPS_CONFIG__ || {};
      const apiKey = cfg.anthropicKey || "";
      const proxyUrl = cfg.supabaseUrl
        ? `${cfg.supabaseUrl}/functions/v1/ai-proxy`
        : null;

      let reply;
      if (apiKey) {
        // Direct dev call (key in browser config — never do this in production)
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 800,
            messages: [{ role: "user", content: ctx }],
          }),
        });
        if (!res.ok) throw new Error("anthropic_error");
        const data = await res.json();
        reply = data.content?.[0]?.text ?? "(empty response)";
      } else if (proxyUrl) {
        // Production path: Supabase Edge Function proxy
        const res = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            apikey: cfg.supabaseAnonKey || "",
            Authorization: `Bearer ${cfg.supabaseAnonKey || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: ctx }),
        });
        if (!res.ok) throw new Error("proxy_error");
        const data = await res.json();
        reply = data.content?.[0]?.text ?? "(empty response)";
      } else {
        // Fallback: demo mode
        reply = "AI is not configured yet. Add your Supabase URL + anon key, then deploy the ai-proxy Edge Function (or set anthropicKey for local dev). See supabase.js for instructions.";
      }

      setMessages((m) => [...m, { role: "ai", text: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "ai", text: `Couldn't reach the model just now (${err.message}). Try again in a moment.` }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <div className="ai-modal-scrim" onMouseDown={onClose}>
      <div className="ai-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="ai-modal-head">
          <div className="ai-modal-title">
            <Icon.spark />
            <span>StoreOps AI</span>
            <span className="muted-tx">·</span>
            <span className="muted-tx mono">scope: {STORE.id}</span>
          </div>
          <div className="grow" />
          <span className="muted-tx mono"><Kbd>esc</Kbd> to close</span>
          <button className="iconbtn" onClick={onClose}><Icon.close /></button>
        </header>

        <div className="ai-modal-body" ref={scrollRef}>
          {messages.map((m, i) =>
          <div key={i} className={cx("ai-msg", `ai-msg-${m.role}`)}>
              <div className="ai-msg-role mono">{m.role === "ai" ? "AI" : "YOU"}</div>
              <div className="ai-msg-text">{renderWithCitations(m.text)}</div>
            </div>
          )}
          {busy &&
          <div className="ai-msg ai-msg-ai">
              <div className="ai-msg-role mono">AI</div>
              <div className="ai-msg-text"><span className="ai-typing"><i /><i /><i /></span></div>
            </div>
          }
        </div>

        <div className="ai-modal-suggest">
          {AI_SUGGESTIONS.map((s) =>
          <button key={s.q} className="chip" onClick={() => send(s.q)} disabled={busy}>{s.q}</button>
          )}
        </div>

        <form className="ai-modal-input" onSubmit={(e) => {e.preventDefault();send();}}>
          <input
            placeholder="Ask anything about this store…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            disabled={busy} />
          
          <button className="btn primary" type="submit" disabled={busy || !input.trim()}>
            <Icon.send /> Send <Kbd>↵</Kbd>
          </button>
        </form>
      </div>
    </div>);

}

function renderWithCitations(text) {
  // wrap [X-1234] tags in monospace cite chips
  const parts = text.split(/(\[[A-Z]-\d+\])/g);
  return parts.map((p, i) =>
  /^\[[A-Z]-\d+\]$/.test(p) ?
  <a key={i} className="cite mono">{p.slice(1, -1)}</a> :
  <span key={i}>{p}</span>
  );
}

// ============================================================
// COMMS
// ============================================================
function Comms() {
  const items = [
  { from: "Marcus Webb <m.webb@wfm.example>", subj: "RE: COI rev. 2 — language tweak", t: "Apr 28 09:14", snippet: "Hi Priya — small ask: in §3 can we say \"each location\" rather than \"site-specific\"? Otherwise looks good. Will sign once updated.", tags: ["legal", "coi"] },
  { from: "Lena Park <l.park@wfm.example>", subj: "Planogram v_final — approved", t: "Apr 24 10:28", snippet: "Approved. Endcap at aisle 7 confirmed. Loop me when install dates are firm.", tags: ["category"] },
  { from: "Call summary · Dan Ortiz", subj: "Pre-install logistics — 18 min", t: "Apr 22 15:00", snippet: "Confirmed loading dock access overnight, parking after 9pm. No freight elevator restrictions. Day-of contact tree via Lena.", tags: ["call", "logistics"] },
  { from: "Marcus Webb <m.webb@wfm.example>", subj: "COI rev. 1 — feedback", t: "Apr 18 11:02", snippet: "Need WFM listed as additional insured per location, not blanket. Attaching their template.", tags: ["legal"] },
  { from: "Sam Okafor → category team", subj: "Planogram draft v3", t: "Apr 16 09:40", snippet: "v3 attached. 142 fixtures total, removed the 6-fixture run on north wall per Lena's note.", tags: ["planning"] },
  { from: "Jordan Reyes → ops", subj: "Site survey scheduled", t: "Apr 15 17:22", snippet: "On for Thu Apr 18 morning. Will cover dock, panel, sightlines, refrigeration adjacency.", tags: ["deployment"] }];

  return (
    <div className="comms">
      <div className="files-head"><h3>Comms <span className="muted-tx mono">{items.length}</span></h3>
        <span className="muted-tx mono">ingested · email + call summaries</span>
      </div>
      <ul className="comms-list">
        {items.map((c, i) =>
        <li key={i} className="comm-row">
            <span className="mono comm-t">{c.t}</span>
            <div className="comm-body">
              <div className="comm-line1">
                <span className="comm-from">{c.from}</span>
                <div className="grow" />
                {c.tags.map((t) => <span key={t} className="tag mono">{t}</span>)}
              </div>
              <div className="comm-subj">{c.subj}</div>
              <div className="comm-snip muted-tx">{c.snippet}</div>
            </div>
          </li>
        )}
      </ul>
    </div>);

}

// ============================================================
// NOTES (composer + list filtered to notes)
// ============================================================
function Notes({ notes, composerRef, onPost }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sev, setSev] = useState("info");
  const [team, setTeam] = useState("Implementation");
  const [action, setAction] = useState(false);
  const [due, setDue] = useState("");
  const taRef = useRef();

  const post = () => {
    const t = title.trim() || body.trim().split("\n")[0].slice(0, 80) || "(untitled note)";
    onPost({
      kind: "note",
      who: "Priya Shah",
      team,
      sev,
      title: t,
      body: body.trim(),
      action,
      due: action ? due || "—" : undefined,
      mentions: action ? [`@${team.toLowerCase().replace(/ /g, "")}`] : undefined
    });
    setTitle("");setBody("");setSev("info");setAction(false);setDue("");
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {e.preventDefault();post();}
  };

  return (
    <div className="notes">
      <div className="note-composer" ref={composerRef}>
        <div className="note-comp-head">
          <span className="avatar avatar-sm mono">PS</span>
          <span>New note</span>
          <span className="muted-tx">· Priya Shah</span>
          <div className="grow" />
          <span className="comp-label">severity</span>
          <div className="sev-seg">
            {["info", "watch", "blocker"].map((s) =>
            <button key={s} className={cx("sev-btn", `sev-${s}`, sev === s && "is-on")} onClick={() => setSev(s)}>
                <Dot tone={s === 'info' ? 'neutral' : s} /> {s}
              </button>
            )}
          </div>
        </div>
        <input className="note-title-in" placeholder="Title (optional)…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onKeyDown} />
        <textarea
          ref={taRef}
          placeholder="Write a note. Use @mentions to notify. Attach files with ⌘U."
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown} />
        
        <div className="note-comp-foot">
          <label className={cx("check-inline action-toggle", action && "is-on")}>
            <input type="checkbox" checked={action} onChange={(e) => setAction(e.target.checked)} />
            <span className={cx("check-box-sm", action && "is-on")}>{action && <Icon.check />}</span>
            Action required
          </label>
          {action &&
          <>
              <span className="comp-label">assign</span>
              <select className="select-ish mono" value={team} onChange={(e) => setTeam(e.target.value)}>
                {TEAMS.map((t) => <option key={t.id}>{t.id}</option>)}
              </select>
              <span className="comp-label">due</span>
              <input className="due-inline mono" placeholder="May 6" value={due} onChange={(e) => setDue(e.target.value)} />
            </>
          }
          <div className="grow" />
          <span className="muted-tx mono"><Kbd>⌘</Kbd>+<Kbd>↵</Kbd> post</span>
          <button className="btn primary" onClick={post} disabled={!body.trim() && !title.trim()}>
            <Icon.arrowU /> Post note
          </button>
        </div>
      </div>
      <ol className="timeline">
        {notes.map((e, i) => <TimelineItem key={i} e={e} />)}
      </ol>
    </div>);

}

// ============================================================
// FLAG MODAL
// ============================================================
function FlagModal({ open, onClose, onSubmit }) {
  const [label, setLabel] = useState("");
  const [tone, setTone] = useState("watch");
  const [team, setTeam] = useState("Implementation");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const submit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSubmit({ label: label.trim(), tone, team, reason: reason.trim() });
    setLabel("");setTone("watch");setTeam("Implementation");setReason("");
  };

  return (
    <div className="ai-modal-scrim" onMouseDown={onClose}>
      <form className="ai-modal flag-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="ai-modal-head">
          <div className="ai-modal-title"><Icon.flag /> <span>Raise a flag</span><span className="muted-tx">·</span><span className="muted-tx mono">scope: {STORE.id}</span></div>
          <div className="grow" />
          <span className="muted-tx mono"><Kbd>esc</Kbd></span>
          <button type="button" className="iconbtn" onClick={onClose}><Icon.close /></button>
        </header>
        <div className="flag-body">
          <label className="field">
            <span className="field-l">Flag</span>
            <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Refrigeration adjacency unclear" />
          </label>
          <label className="field">
            <span className="field-l">Severity</span>
            <div className="sev-seg">
              {["info", "watch", "blocker"].map((s) =>
              <button type="button" key={s} className={cx("sev-btn", `sev-${s}`, tone === s && "is-on")} onClick={() => setTone(s)}>
                  <Dot tone={s === 'info' ? 'neutral' : s} /> {s}
                </button>
              )}
            </div>
          </label>
          <label className="field">
            <span className="field-l">Assign team</span>
            <select className="select-ish mono" value={team} onChange={(e) => setTeam(e.target.value)}>
              {TEAMS.map((t) => <option key={t.id}>{t.id}</option>)}
            </select>
          </label>
          <label className="field field-tall">
            <span className="field-l">Context</span>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's going on, what's needed, by when…" />
          </label>
        </div>
        <div className="flag-foot">
          <span className="muted-tx mono">Adds to flags + posts to timeline + notifies assigned team</span>
          <div className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!label.trim()}><Icon.flag /> Raise flag</button>
        </div>
      </form>
    </div>);

}


// ============================================================
// SUPABASE HELPER
// Thin fetch wrapper — no SDK needed. Reads credentials from
// window.__STOREOPS_CONFIG__ set in index.html.
// ============================================================
const SB = (() => {
  const cfg  = () => window.__STOREOPS_CONFIG__ || {};
  const url  = () => cfg().supabaseUrl      || "";
  const key  = () => cfg().supabaseAnonKey  || "";
  const configured = () => !!(url() && key());

  async function req(path, opts = {}) {
    if (!configured()) throw new Error("supabase_not_configured");
    const res = await fetch(`${url()}/rest/v1${path}`, {
      method: opts.method || "GET",
      headers: {
        apikey: key(),
        Authorization: `Bearer ${key()}`,
        "Content-Type": "application/json",
        Prefer: opts.prefer || "return=representation",
        ...opts.headers,
      },
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || data?.error || "supabase_error");
    return data;
  }

  return {
    configured,
    async getEntries(storeId) {
      return req(`/timeline_entries?store_id=eq.${storeId}&order=created_at.desc&limit=200`);
    },
    async insertEntry(row) {
      const rows = await req("/timeline_entries", { method: "POST", body: row });
      return Array.isArray(rows) ? rows[0] : rows;
    },
    async getTasks(storeId) {
      return req(`/tasks?store_id=eq.${storeId}&order=created_at.desc`);
    },
    async insertTask(row) {
      const rows = await req("/tasks", { method: "POST", body: row });
      return Array.isArray(rows) ? rows[0] : rows;
    },
    async patchTask(id, fields) {
      return req(`/tasks?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: fields });
    },
    async getFlags(storeId) {
      return req(`/flags?store_id=eq.${storeId}&resolved=eq.false&order=created_at.desc`);
    },
    async insertFlag(row) {
      const rows = await req("/flags", { method: "POST", body: row });
      return Array.isArray(rows) ? rows[0] : rows;
    },
    async getFiles(storeId) {
      return req(`/files?store_id=eq.${storeId}&order=created_at.desc`);
    },
    async insertFile(row) {
      const rows = await req("/files", { method: "POST", body: row });
      return Array.isArray(rows) ? rows[0] : rows;
    },
    async uploadFile(storeId, file, uploadedBy) {
      const bucket = "storeops-files";
      const path   = `${storeId}/${Date.now()}_${file.name}`;
      const upRes  = await fetch(`${url()}/storage/v1/object/${bucket}/${path}`, {
        method: "POST",
        headers: { apikey: key(), Authorization: `Bearer ${key()}`, "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!upRes.ok) throw new Error("upload_failed");
      const size = file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      return SB.insertFile({ store_id: storeId, name: file.name, size, who: uploadedBy, bucket_path: path });
    },
  };
})();

function dbRowToEntry(r) {
  return { id: r.id, t: r.t, who: r.who, team: r.team, kind: r.kind,
    sev: r.sev, title: r.title, body: r.body, action: r.action,
    due: r.due, mentions: r.mentions, attachment: r.attachment };
}
function dbRowToTask(r) {
  return { id: r.id, title: r.title, state: r.state, owner: r.owner, due: r.due, flag: r.flag };
}
function dbRowToFlag(r) {
  return { id: r.id, label: r.label, tone: r.tone, team: r.team, since: r.since || "—" };
}
function dbRowToFile(r) {
  return { id: r.id, name: r.name, size: r.size, who: r.who,
    when: r.created_at ? new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—" };
}

// ============================================================
// TASKS — now accepts props from App
// ============================================================
function Tasks({ tasks, onCreate, onStateChange }) {
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newDue,   setNewDue]   = useState("");
  const cols = [
    { id: "Open",    tone: "info" },
    { id: "Waiting", tone: "watch" },
    { id: "Done",    tone: "ok" },
  ];

  const submit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreate({ title: newTitle.trim(), owner: newOwner.trim(), due: newDue.trim() || "—" });
    setNewTitle(""); setNewOwner(""); setNewDue("");
  };

  return (
    <div className="tasks">
      <div className="tasks-head">
        <h3>Tasks <span className="muted-tx mono">{tasks.length}</span></h3>
      </div>

      {/* New task form */}
      <form className="new-task-form" onSubmit={submit}>
        <input
          className="new-task-title"
          placeholder="New task title…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <input
          className="new-task-field"
          placeholder="Owner"
          value={newOwner}
          onChange={(e) => setNewOwner(e.target.value)}
        />
        <input
          className="new-task-field mono"
          placeholder="Due date"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={!newTitle.trim()}>
          <Icon.plus /> Add task
        </button>
      </form>

      <div className="task-cols">
        {cols.map((c) => {
          const items = tasks.filter((t) => t.state === c.id);
          return (
            <div key={c.id} className="task-col">
              <div className="task-col-head">
                <Dot tone={c.tone === "ok" ? "green" : c.tone === "watch" ? "yellow" : "neutral"} />
                <span>{c.id}</span>
                <span className="mono task-col-n">{items.length}</span>
              </div>
              {items.map((t) => (
                <div key={t.id} className={cx("task-card", t.flag === "blocker" && "is-blocker")}>
                  <div className="task-card-top">
                    <span className="mono task-id">{t.id}</span>
                    {t.flag && <Pill tone="blocker">blocker</Pill>}
                  </div>
                  <div className="task-card-title">{t.title}</div>
                  <div className="task-card-foot">
                    <span className="avatar avatar-xs mono">{(t.owner||"?").split(" ").map((s)=>s[0]).join("")}</span>
                    <span className="muted-tx">{t.owner}</span>
                    <div className="grow" />
                    <span className="mono">{t.due}</span>
                  </div>
                  {/* State controls */}
                  <div className="task-card-actions">
                    {c.id !== "Open"    && <button className="btn ghost sm" onClick={() => onStateChange(t.id, "Open")}>Open</button>}
                    {c.id !== "Waiting" && <button className="btn ghost sm" onClick={() => onStateChange(t.id, "Waiting")}>Waiting</button>}
                    {c.id !== "Done"    && <button className="btn ghost sm" onClick={() => onStateChange(t.id, "Done")}>Done</button>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// FILES — now accepts props from App
// ============================================================
function Files({ files, onUpload }) {
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  return (
    <div className="files">
      <div className="files-head">
        <h3>Files <span className="muted-tx mono">{files.length}</span></h3>
        <button className="btn ghost sm" onClick={() => fileInputRef.current?.click()}>
          <Icon.plus /> Upload
        </button>
        <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={handleFileChange} />
      </div>
      <table className="ftbl">
        <thead><tr>
          <th style={{ width: "6%" }}>#</th>
          <th>Name</th><th>Size</th><th>Uploaded by</th><th>When</th><th></th>
        </tr></thead>
        <tbody>
          {files.map((f, i) => (
            <tr key={f.id || f.name}>
              <td className="mono muted-tx">{String(i + 1).padStart(2, "0")}</td>
              <td><span className="ftbl-name"><Icon.paper /> {f.name}</span></td>
              <td className="mono">{f.size}</td>
              <td>{f.who}</td>
              <td className="mono">{f.when}</td>
              <td className="ftbl-actions"><button className="iconbtn xs"><Icon.dot3 /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// APP
// ============================================================
function App() {
  const [tweaks, setTweak] = useTweaks(window.__TWEAK_DEFAULTS__ || {});
  const [tab, setTab]           = useState("overview");
  const [aiOpen, setAiOpen]     = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [phaseOpen, setPhaseOpen] = useState(null);
  const [subState, setSubState]   = useState({});
  const [phaseTasks, setPhaseTasks] = useState({});

  const [entries,   setEntries]   = useState(TIMELINE);
  const [liveTasks, setLiveTasks] = useState(TASKS);
  const [liveFlags, setLiveFlags] = useState(FLAGS);
  const [liveFiles, setLiveFiles] = useState(FILES);
  const [loading,   setLoading]   = useState(false);
  const [dbError,   setDbError]   = useState(null);
  const [toast,     setToast]     = useState(null);
  const composerRef = useRef();

  // ── Load from Supabase on mount ──────────────────────────
  useEffect(() => {
    if (!SB.configured()) return;
    setLoading(true);
    Promise.all([
      SB.getEntries(STORE.id),
      SB.getTasks(STORE.id),
      SB.getFlags(STORE.id),
      SB.getFiles(STORE.id),
    ]).then(([dbEntries, dbTasks, dbFlags, dbFiles]) => {
      if (dbEntries?.length) setEntries(dbEntries.map(dbRowToEntry));
      if (dbTasks?.length)   setLiveTasks(dbTasks.map(dbRowToTask));
      if (dbFlags?.length)   setLiveFlags(dbFlags.map(dbRowToFlag));
      if (dbFiles?.length)   setLiveFiles(dbFiles.map(dbRowToFile));
    }).catch((e) => setDbError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const flashToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3200);
  };

  const nowStamp = () => {
    const now = new Date();
    return `${now.toLocaleString("en-US",{month:"short",day:"numeric"})} · ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  };

  const goToNotes = () => {
    setTab("notes");
    setTimeout(() => {
      const ta = composerRef.current?.querySelector("textarea");
      ta?.focus();
      composerRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    }, 30);
  };

  // ── Post note ────────────────────────────────────────────
  const postNote = async (n) => {
    const t = nowStamp();
    setEntries((es) => [{ ...n, t }, ...es]);
    flashToast(n.action
      ? `Note posted · assigned to ${n.team}${n.due && n.due !== "—" ? ` · due ${n.due}` : ""}`
      : "Note posted");
    if (!SB.configured()) return;
    try {
      await SB.insertEntry({
        store_id: STORE.id, t, who: n.who || "Priya Shah",
        team: n.team, kind: n.kind || "note", sev: n.sev,
        title: n.title, body: n.body, action: n.action || false,
        due: n.due, mentions: n.mentions, attachment: n.attachment,
      });
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Create task ──────────────────────────────────────────
  const createTask = async (taskData) => {
    const id = `T-${Date.now()}`;
    const newTask = { id, state: "Open", flag: null, ...taskData };
    setLiveTasks((ts) => [newTask, ...ts]);
    flashToast(`Task created`);
    if (!SB.configured()) return;
    try {
      const row = await SB.insertTask({
        id, store_id: STORE.id, title: taskData.title,
        state: "Open", owner: taskData.owner || "", due: taskData.due || "—", flag: null,
      });
      if (row?.id && row.id !== id)
        setLiveTasks((ts) => ts.map((t) => t.id === id ? dbRowToTask(row) : t));
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Update task state ────────────────────────────────────
  const updateTaskState = async (taskId, newState) => {
    setLiveTasks((ts) => ts.map((t) => t.id === taskId ? { ...t, state: newState } : t));
    flashToast(`Task → ${newState}`);
    if (!SB.configured()) return;
    try {
      await SB.patchTask(taskId, { state: newState, updated_at: new Date().toISOString() });
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Raise flag ───────────────────────────────────────────
  const submitFlag = async ({ label, tone, team, reason }) => {
    const t = nowStamp();
    setLiveFlags((fs) => [{ label, tone, team, since: "just now" }, ...fs]);
    setEntries((es) => [{
      kind: "note", who: "Priya Shah", team, sev: tone,
      title: `Flag raised: ${label}`, body: reason || "—",
      action: true, due: "—", mentions: [`@${team.toLowerCase().replace(/ /g,"")}`], t,
    }, ...es]);
    setFlagOpen(false);
    flashToast(`Flag raised · assigned to ${team}`);
    if (!SB.configured()) return;
    try {
      await Promise.all([
        SB.insertFlag({ store_id: STORE.id, label, tone, team, since: "just now" }),
        SB.insertEntry({ store_id: STORE.id, t, who: "Priya Shah", team, kind: "note", sev: tone,
          title: `Flag raised: ${label}`, body: reason || "—",
          action: true, due: "—", mentions: [`@${team.toLowerCase().replace(/ /g,"")}`] }),
      ]);
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Upload file ──────────────────────────────────────────
  const uploadFile = async (file) => {
    const optimistic = { name: file.name, size: "…", who: "me", when: "just now" };
    setLiveFiles((fs) => [optimistic, ...fs]);
    if (!SB.configured()) { flashToast("Configure Supabase to persist files"); return; }
    try {
      const row = await SB.uploadFile(STORE.id, file, "Priya Shah");
      setLiveFiles((fs) => fs.map((f) => f === optimistic ? dbRowToFile(row) : f));
      flashToast(`${file.name} uploaded`);
    } catch (e) {
      setLiveFiles((fs) => fs.filter((f) => f !== optimistic));
      flashToast("Upload failed: " + e.message, true);
    }
  };

  // ── Phase helpers ─────────────────────────────────────────
  const toggleSub = (phase, i) => {
    const k = `${phase}:${i}`;
    const prevDone = subState[k] ?? PHASE_DETAIL[phase].subtasks[i].done;
    setSubState((s) => ({ ...s, [k]: !prevDone }));
    flashToast(`${PHASE_DETAIL[phase].subtasks[i].label} → ${!prevDone ? "done" : "open"}`);
  };
  const postPhaseNote = (phase, text) => postNote({
    kind: "note", who: "Priya Shah", team: PHASE_DETAIL[phase].owner, sev: "info",
    title: `[${phase}] ${text.split("\n")[0].slice(0, 80)}`, body: text, action: false,
  });
  const createPhaseTask = async (phase, { title, team, due }) => {
    const id = `T-${Date.now()}`;
    setPhaseTasks((pt) => ({ ...pt, [phase]: [...(pt[phase] || []), { id, title, team, due, state: "Open" }] }));
    const t = nowStamp();
    const entry = { kind: "task", who: "Priya Shah", team, sev: "info",
      title: `[${phase}] Task created: ${title}`,
      body: `Assigned to ${team} · due ${due}`, action: true, due, t };
    setEntries((es) => [entry, ...es]);
    flashToast(`Task created · assigned to ${team}`);
    if (!SB.configured()) return;
    try {
      await Promise.all([
        SB.insertTask({ id, store_id: STORE.id, title, state: "Open", owner: team, due: due || "—" }),
        SB.insertEntry({ store_id: STORE.id, ...entry }),
      ]);
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Hotkeys ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches?.("input, textarea, select")) return;
      const map = { "1":"overview","2":"timeline","3":"notes","4":"tasks","5":"comms","6":"files","7":"audit" };
      if (map[e.key]) setTab(map[e.key]);
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); goToNotes(); }
      if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setFlagOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setAiOpen((o) => !o); }
      if (e.key === "Escape") { setAiOpen(false); setFlagOpen(false); setPhaseOpen(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Tweaks → CSS ──────────────────────────────────────────
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme   = tweaks.dark    ? "dark" : "light";
    r.dataset.density = tweaks.density;
    r.dataset.showKbd = tweaks.showKbd ? "true" : "false";
    r.style.setProperty("--accent-h", tweaks.accentHue);
  }, [tweaks]);

  return (
    <div className="app">
      <LeftNav />
      <main className="main">
        <StoreHeader tweaks={tweaks} onNewNote={goToNotes} onFlag={() => setFlagOpen(true)} onPhaseSelect={setPhaseOpen} />
        <TabBar active={tab} onSelect={setTab} />

        {!SB.configured() && (
          <div className="config-banner">
            ⚠ Supabase not configured — changes won't persist after refresh.
            Fill in <code>window.__STOREOPS_CONFIG__</code> in index.html.
          </div>
        )}
        {dbError && (
          <div className="config-banner config-banner-error">
            ⚠ Supabase error: {dbError}
          </div>
        )}

        <div className="content">
          <div className="content-main">
            {loading && <div className="loading-bar" />}
            {tab === "overview" && <Overview flags={liveFlags} tasks={liveTasks} />}
            {tab === "timeline" && <Timeline entries={entries} />}
            {tab === "notes"    && <Notes notes={entries.filter((e) => e.kind === "note")} composerRef={composerRef} onPost={postNote} />}
            {tab === "tasks"    && <Tasks tasks={liveTasks} onCreate={createTask} onStateChange={updateTaskState} />}
            {tab === "comms"    && <Comms />}
            {tab === "files"    && <Files files={liveFiles} onUpload={uploadFile} />}
            {tab === "audit"    && <Audit />}
          </div>
          {tweaks.showRail && <RightRail onAskAI={() => setAiOpen(true)} flags={liveFlags} onFlag={() => setFlagOpen(true)} />}
        </div>
      </main>

      <button className={cx("ai-fab", aiOpen && "is-open")} onClick={() => setAiOpen((o) => !o)} title="Ask AI (⌘J)">
        <Icon.spark /><span>Ask AI</span><Kbd>⌘J</Kbd>
      </button>

      <AIModal open={aiOpen} onClose={() => setAiOpen(false)} />
      <FlagModal open={flagOpen} onClose={() => setFlagOpen(false)} onSubmit={submitFlag} />
      <PhaseDrawer
        phase={phaseOpen}
        onClose={() => setPhaseOpen(null)}
        subState={subState}
        onToggleSub={toggleSub}
        onPostNote={postPhaseNote}
        onCreateTask={createPhaseTask}
        phaseTasks={phaseOpen ? (phaseTasks[phaseOpen] || []) : []}
        phaseNotes={phaseOpen ? entries.filter((e) => e.kind === "note" && e.title?.startsWith(`[${phaseOpen}]`)) : []}
      />

      {toast && (
        <div className={cx("toast", toast.isError && "toast-error")}>
          {toast.isError ? <Icon.flag /> : <Icon.check />}
          <span>{toast.msg}</span>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Appearance">
          <TweakToggle label="Dark mode"  value={tweaks.dark}      onChange={(v) => setTweak("dark", v)} />
          <TweakRadio  label="Density"    value={tweaks.density}   options={[{value:"compact",label:"Compact"},{value:"comfy",label:"Comfy"}]} onChange={(v) => setTweak("density", v)} />
          <TweakSlider label="Accent hue" value={tweaks.accentHue} min={0} max={360} step={5} onChange={(v) => setTweak("accentHue", v)} />
        </TweakSection>
        <TweakSection title="Layout">
          <TweakToggle label="Show right rail"     value={tweaks.showRail}  onChange={(v) => setTweak("showRail", v)} />
          <TweakToggle label="Show keyboard hints" value={tweaks.showKbd}   onChange={(v) => setTweak("showKbd", v)} />
          <TweakToggle label="Show phase strip"    value={tweaks.showPhase} onChange={(v) => setTweak("showPhase", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
