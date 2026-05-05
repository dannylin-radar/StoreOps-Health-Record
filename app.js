
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;width:100%;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({ title = 'Tweaks', children }) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  React.useEffect(() => {
    const onMsg = (e) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;
  return (
    <>
      <style>{__TWEAKS_STYLE}</style>
      <div ref={dragRef} className="twk-panel" data-noncommentable=""
           style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={dismiss}>✕</button>
        </div>
        <div className="twk-body">{children}</div>
      </div>
    </>
  );
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({ label, children }) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

function TweakRow({ label, value, children, inline = false }) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
             value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'}
              role="switch" aria-checked={!!value}
              onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

function TweakRadio({ label, value, options, onChange }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;

  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const segAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPointerDown = (e) => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = (ev) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown}
           className={dragging ? 'twk-seg dragging' : 'twk-seg'}>
        <div className="twk-seg-thumb"
             style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                      width: `calc((100% - 4px) / ${n})` }} />
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}>
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

function TweakSelect({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <select className="twk-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </TweakRow>
  );
}

function TweakText({ label, value, placeholder, onChange }) {
  return (
    <TweakRow label={label}>
      <input className="twk-field" type="text" value={value} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} />
    </TweakRow>
  );
}

function TweakNumber({ label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = (n) => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({ x: 0, val: 0 });
  const onScrubStart = (e) => {
    e.preventDefault();
    startRef.current = { x: e.clientX, val: value };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = (ev) => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="twk-num">
      <span className="twk-num-lbl" onPointerDown={onScrubStart}>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
             onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      {unit && <span className="twk-num-unit">{unit}</span>}
    </div>
  );
}

function TweakColor({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <input type="color" className="twk-swatch" value={value}
             onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TweakButton({ label, onClick, secondary = false }) {
  return (
    <button type="button" className={secondary ? 'twk-btn secondary' : 'twk-btn'}
            onClick={onClick}>{label}</button>
  );
}

Object.assign(window, {
  useTweaks, TweaksPanel, TweakSection, TweakRow,
  TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakText, TweakNumber, TweakColor, TweakButton,
});
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


const TEAM = []; // No default team members — add via the Team editor

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
// DATE PICKER — calendar input wrapper
// ============================================================
function DatePicker({ value, onChange, placeholder = "Pick a date", className = "" }) {
  const inputRef = useRef();

  // Convert display string (e.g. "May 7") to YYYY-MM-DD for input
  const toInputVal = (v) => {
    if (!v) return "";
    try {
      const d = new Date(v + ", " + new Date().getFullYear());
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    } catch {}
    try {
      const d = new Date(v);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    } catch {}
    return "";
  };

  // Convert YYYY-MM-DD back to a readable label
  const fromInputVal = (v) => {
    if (!v) return "";
    const d = new Date(v + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
      <input
        ref={inputRef}
        type="date"
        className={cx("date-picker-input", className)}
        value={toInputVal(value)}
        onChange={(e) => onChange(fromInputVal(e.target.value))}
        title={placeholder}
      />
      {!value && (
        <span className="date-picker-placeholder" onClick={() => inputRef.current?.showPicker?.()}>
          {placeholder}
        </span>
      )}
    </div>
  );
}

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
// ============================================================
// HEADER (breadcrumb, store id, track strip, snapshot row)
// ============================================================
function StoreHeader({ store = STORE, tweaks, onNewNote, onFlag, onPhaseSelect, onEdit, onShowAll }) {
  return (
    <header className="store-header">
      <div className="crumbs">
        <span style={{cursor:"pointer",color:"var(--accent)"}} onClick={onShowAll}>Stores</span>
        <Icon.chevR />
        <span style={{cursor:"pointer",color:"var(--accent)"}} onClick={onShowAll}>{store.retailer}</span>
        <Icon.chevR />
        <span className="crumb-current mono">{store.id}</span>
        <span className="crumb-tail">· {store.name}</span>
        <div className="header-actions">
          <button className="btn ghost" onClick={onEdit}><Icon.paper /> Edit store</button>
          <button className="btn ghost" onClick={onFlag}><Icon.flag /> Flag <Kbd>F</Kbd></button>
          <button className="btn ghost"><Icon.link /> Copy link</button>
          <button className="btn primary" onClick={onNewNote}><Icon.plus /> New note <Kbd>N</Kbd></button>
        </div>
      </div>

      <div className="store-title-row">
        <div className="store-title-left">
          <Dot tone={store.health} size={10} />
          <h1 className="store-title">{store.retailer} #{store.storeNum}</h1>
          <span className="store-sub mono">{store.id}</span>
          <span className="addr-sep">·</span>
          <span className="store-addr">{store.address}</span>
        </div>
        <div className="store-title-right">
          <span className="meta-stat"><span className="meta-k">INSTALL DATE</span> <span className="mono">{store.openedOn}</span></span>
          <span className="meta-stat"><span className="meta-k">GO-LIVE</span> <span className="mono">{store.scheduledLive}</span></span>
          <span className="meta-stat"><span className="meta-k">Sqft</span> <span className="mono">{store.sqft}</span></span>
          <span className="meta-stat"><span className="meta-k">Region</span> <span className="mono">{store.region}</span></span>
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
                  <DatePicker value={taskDue} onChange={setTaskDue} placeholder="Due date" />
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
// DATE PICKER — native calendar, formatted display
// ============================================================
// ============================================================
// TABS
// ============================================================
const TAB_DEFS = [
  { id:"overview", label:"Overview", k:"1" },
  { id:"timeline", label:"Timeline", k:"2" },
  { id:"notes",    label:"Notes",    k:"3" },
  { id:"tasks",    label:"Tasks",    k:"4" },
  { id:"comms",    label:"Comms",    k:"5" },
  { id:"files",    label:"Files",    k:"6" },
  { id:"audit",    label:"Audit",    k:"7" },
];

function TabBar({ active, onSelect, counts = {} }) {
  return (
    <div className="tabs">
      {TAB_DEFS.map((t) =>
        <button key={t.id} className={cx("tab", active===t.id && "is-active")} onClick={() => onSelect(t.id)}>
          {t.label}
          {counts[t.id] != null && counts[t.id] > 0 && (
            <span className="tab-count mono">{counts[t.id]}</span>
          )}
        </button>
      )}
      <div className="tabs-spacer" />
      <div className="tabs-search">
        <Icon.search />
        <input placeholder="Search this store…" />
      </div>
    </div>
  );
}

// ============================================================
// GLOBAL CHECKLIST — stored in localStorage, same across stores
// ============================================================
const CHECKLIST_KEY = "storeops_checklist_items";
const CHECKLIST_DONE_KEY = "storeops_checklist_done";

function getChecklistItems() {
  try {
    const stored = localStorage.getItem(CHECKLIST_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return ["Site Survey", "Store Design", "COI/Permits", "Install crew confirmed", "Day-of contact tree"];
}
function saveChecklistItems(items) {
  try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(items)); } catch {}
}
function getChecklistDone(storeId) {
  try {
    const stored = localStorage.getItem(`${CHECKLIST_DONE_KEY}_${storeId}`);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}
function saveChecklistDone(storeId, done) {
  try { localStorage.setItem(`${CHECKLIST_DONE_KEY}_${storeId}`, JSON.stringify(done)); } catch {}
}

// ============================================================
// OVERVIEW (snapshot blocks) — editable fields
// ============================================================
function Overview({ store = STORE, onSaveStore }) {
  // Editable snap fields
  const [editField, setEditField] = useState(null); // which field is being edited
  const [editVal, setEditVal]     = useState("");

  // Checklist
  const [checkItems, setCheckItems] = useState(getChecklistItems);
  const [checkDone, setCheckDone]   = useState(() => getChecklistDone(store.id));
  const [newItem, setNewItem]       = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const doneCount = checkItems.filter((_, i) => checkDone[i]).length;

  const startEdit = (field, currentVal) => { setEditField(field); setEditVal(currentVal || ""); };
  const saveField = (field, directVal) => {
    const val = directVal !== undefined ? directVal : editVal.trim();
    if (onSaveStore) onSaveStore({ ...store, [field]: val });
    setEditField(null);
    setEditVal("");
  };
  const cancelEdit = () => setEditField(null);

  const toggleCheck = (i) => {
    const next = { ...checkDone, [i]: !checkDone[i] };
    setCheckDone(next);
    saveChecklistDone(store.id, next);
  };
  const addCheckItem = () => {
    if (!newItem.trim()) return;
    const next = [...checkItems, newItem.trim()];
    setCheckItems(next);
    saveChecklistItems(next);
    setNewItem(""); setAddingItem(false);
  };
  const removeCheckItem = (i) => {
    const next = checkItems.filter((_, idx) => idx !== i);
    setCheckItems(next);
    saveChecklistItems(next);
    const nextDone = { ...checkDone };
    delete nextDone[i];
    // re-index done state
    const reindexed = {};
    next.forEach((_, newIdx) => {
      const oldIdx = checkItems.indexOf(next[newIdx]);
      if (checkDone[oldIdx]) reindexed[newIdx] = true;
    });
    setCheckDone(reindexed);
    saveChecklistDone(store.id, reindexed);
  };

  const EditableSnap = ({ label, field, value, sub, tone, wide, mono, multiLine, type="text", options=[] }) => {
    const isEditing = editField === field;
    const rawVal = store[field] || "";
    return (
      <div className={cx("snap snap-editable", wide && "snap-wide")} onClick={() => !isEditing && startEdit(field, rawVal)}>
        <div className="snap-label">{label}</div>
        {isEditing ? (
          <div className="snap-edit-form" onClick={(e) => e.stopPropagation()}>
            {type === "select" ? (
              <select className="snap-edit-input select-ish mono" autoFocus value={editVal}
                onChange={(e) => { setEditVal(e.target.value); saveField(field, e.target.value); }}>
                {options.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
              </select>
            ) : type === "date" ? (
              <input className="snap-edit-input" type="date" autoFocus
                value={editVal ? (() => { try { const d = new Date(editVal+"T12:00:00"); return isNaN(d)?"":(d.toISOString().slice(0,10)); } catch{return "";} })() : ""}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const d = new Date(e.target.value + "T12:00:00");
                  const str = d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
                  setEditVal(str); saveField(field, str);
                }} />
            ) : multiLine ? (
              <textarea className="snap-edit-input" rows={2} autoFocus value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();saveField(field);} if(e.key==="Escape")cancelEdit(); }} />
            ) : (
              <input className="snap-edit-input" autoFocus value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => { if(e.key==="Enter")saveField(field); if(e.key==="Escape")cancelEdit(); }} />
            )}
            {type !== "select" && type !== "date" && (
              <div style={{display:"flex",gap:4,marginTop:4}}>
                <button className="btn primary sm" onClick={() => saveField(field)}><Icon.check /></button>
                <button className="btn ghost sm" onClick={cancelEdit}>✕</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={cx("snap-value", mono && "mono")}>
              {tone && <Dot tone={tone} />}
              <span>{value}</span>
            </div>
            <div className="snap-sub">{sub}</div>
            <div className="snap-edit-hint">click to edit</div>
          </>
        )}
      </div>
    );
  };


  return (
    <div className="overview">
      <div className="snap-grid">
        <EditableSnap label="Phase" field="phase" value={store.phase} sub={`Health: ${store.health}`} tone={store.health==="yellow"?"yellow":store.health==="red"?"red":"green"}
          type="select" options={["Planning","Scheduled","COI","Deployment","Live"]} />
        <EditableSnap label="Health" field="health" value={store.health?.charAt(0).toUpperCase()+store.health?.slice(1)} sub="Select health status" tone={store.health}
          type="select" options={["green","yellow","red"]} />
        <EditableSnap label="Owner" field="ownerPerson" value={store.ownerPerson||"—"} sub={store.owner||""}
          type="select" options={TEAMS.map(t=>t.id)} optionLabel="Team" secondField="owner" secondOptions={TEAMS.map(t=>t.id)} />
        <EditableSnap label="Next action" field="nextAction" value={store.nextAction||"No action set"} sub={store.due ? `Due ${store.due}` : "No due date"} tone={store.nextAction?"yellow":null} wide multiLine />
        <EditableSnap label="Risk level" field="risk" value={store.risk?.charAt(0).toUpperCase()+store.risk?.slice(1)||"Low"} sub="Click to change"
          tone={store.risk==="high"?"red":store.risk==="medium"?"yellow":"green"}
          type="select" options={["low","medium","high"]} />
        <EditableSnap label="Go-live target" field="scheduledLive" value={store.scheduledLive||"Not set"} sub={store.openedOn?`Opened ${store.openedOn}`:""} mono type="date" />
      </div>

      <section className="block">
        <header className="block-head">
          <h3>Readiness checklist</h3>
          <span className="block-meta mono">{doneCount}/{checkItems.length} complete</span>
        </header>
        <ul className="checklist">
          {checkItems.map((label, i) => (
            <li key={i} className={cx("check-row checklist-editable", checkDone[i] && "is-done")}>
              <button className={cx("check-box", checkDone[i] && "is-on")} onClick={() => toggleCheck(i)}>
                {checkDone[i] && <Icon.check />}
              </button>
              <span className="mono check-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="check-label">{label}</span>
              <button className="iconbtn xs" style={{opacity:0.4,marginLeft:"auto"}} title="Remove"
                onClick={() => removeCheckItem(i)}>✕</button>
            </li>
          ))}
          {addingItem ? (
            <li className="check-row">
              <span className="check-box" />
              <span className="mono check-num">{String(checkItems.length + 1).padStart(2,"0")}</span>
              <input className="checklist-new-input" autoFocus placeholder="New checklist item…"
                value={newItem} onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key==="Enter") addCheckItem(); if (e.key==="Escape") { setAddingItem(false); setNewItem(""); } }} />
              <button className="btn primary sm" onClick={addCheckItem} disabled={!newItem.trim()}><Icon.check /></button>
              <button className="btn ghost sm" onClick={() => { setAddingItem(false); setNewItem(""); }}>✕</button>
            </li>
          ) : (
            <li className="check-row" style={{borderBottom:0}}>
              <button className="btn ghost sm" style={{margin:"4px var(--pad-3)"}} onClick={() => setAddingItem(true)}>
                <Icon.plus /> Add item
              </button>
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
function Timeline({ entries, onEdit, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [actionOnly, setActionOnly] = useState(false);

  // All teams that appear in entries
  const teams = ["all", ...new Set(entries.map(e => e.team).filter(Boolean).filter(t => t !== "—"))];

  const filters = [
    { id: "all",    label: "All",    n: entries.length },
    { id: "note",   label: "Notes",  n: entries.filter((e) => e.kind === "note").length },
    { id: "task",   label: "Tasks",  n: entries.filter((e) => e.kind === "task").length },
    { id: "comm",   label: "Comms",  n: entries.filter((e) => e.kind === "comm").length },
    { id: "status", label: "Status", n: entries.filter((e) => e.kind === "status").length },
  ];

  const list = entries
    .filter((e) => filter === "all" || e.kind === filter)
    .filter((e) => teamFilter === "all" || e.team === teamFilter)
    .filter((e) => !actionOnly || e.action);

  return (
    <div className="timeline-wrap">
      <div className="timeline-filter">
        {filters.map((f) =>
          <button key={f.id} className={cx("chip", filter === f.id && "is-on")} onClick={() => setFilter(f.id)}>
            {f.label} <span className="mono chip-n">{f.n}</span>
          </button>
        )}
        <div className="grow" />
        {/* Team filter */}
        {teams.length > 1 && (
          <select className="select-ish mono" style={{height:26,fontSize:"var(--t12)"}}
            value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            {teams.map(t => <option key={t} value={t}>{t === "all" ? "All teams" : t}</option>)}
          </select>
        )}
        {/* Action required filter */}
        <label style={{display:"flex",alignItems:"center",gap:5,fontSize:"var(--t12)",color:"var(--fg-2)",cursor:"pointer",whiteSpace:"nowrap"}}>
          <input type="checkbox" checked={actionOnly} onChange={e => setActionOnly(e.target.checked)} />
          Actions only
        </label>
        <span className="muted-tx mono">newest first</span>
      </div>
      <ol className="timeline">
        {list.map((e, i) => <TimelineItem key={e.id || i} e={e} onEdit={onEdit} onDelete={onDelete} />)}
      </ol>
    </div>);

}

function TimelineItem({ e, onEdit, onDelete }) {
  const KIND_LABEL = { note: "NOTE", task: "TASK", comm: "COMM", status: "STATUS" };
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [editBody, setEditBody] = useState(e.body || "");
  const [editTitle, setEditTitle] = useState(e.title || "");
  const canEdit = e.kind === "note" && onEdit;

  const saveEdit = () => {
    onEdit && onEdit(e, { title: editTitle.trim() || editBody.trim().slice(0,80), body: editBody.trim() });
    setEditing(false);
    setMenuOpen(false);
  };

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
          {canEdit && (
            <div style={{position:"relative"}}>
              <button className="iconbtn xs" onClick={() => setMenuOpen((o) => !o)}><Icon.dot3 /></button>
              {menuOpen && (
                <div className="note-menu">
                  <button className="note-menu-item" onClick={() => { setEditing(true); setEditBody(e.body||""); setEditTitle(e.title||""); setMenuOpen(false); }}>Edit</button>
                  <button className="note-menu-item note-menu-delete" onClick={() => { onDelete && onDelete(e); setMenuOpen(false); }}>Delete</button>
                </div>
              )}
            </div>
          )}
        </div>
        {editing ? (
          <div className="note-edit-form">
            <input className="note-title-in" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title…" />
            <textarea rows={3} value={editBody} onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey||e.ctrlKey) && e.key==="Enter") { e.preventDefault(); saveEdit(); } }} />
            <div style={{display:"flex",gap:6,justifyContent:"flex-end",padding:"6px 0"}}>
              <button className="btn ghost sm" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn primary sm" onClick={saveEdit}><Icon.check /> Save</button>
            </div>
          </div>
        ) : (
          <>
            <div className="tl-title">{e.title}</div>
            {e.body && <div className="tl-text">{e.body}</div>}
          </>
        )}
        {e.attachment && <div className="tl-attach"><Icon.paper /><span className="mono">{e.attachment}</span></div>}
        {e.mentions && <div className="tl-mentions">{e.mentions.map((m) => <span key={m} className="mention mono">{m}</span>)}</div>}
      </div>
    </li>);
}

// ============================================================
// AUDIT
// ============================================================
function Audit({ entries = [], tasks = [], files = [] }) {
  // Build audit rows from real activity across entries, tasks, files
  const rows = [];

  entries.forEach((e) => {
    const actor = e.who === "system" ? "system" : (e.who || "").split(" ").map((w,i) => i===0 ? w.toLowerCase().slice(0,6)+"@" : "").join("").replace("@","@");
    const shortWho = e.who === "system" ? "system" : (e.who||"").split(" ").map(w=>w[0]).join("").toLowerCase()+"@";
    const ts = e.created_at ? new Date(e.created_at).toISOString().replace("T"," ").slice(0,19) : (e.t || "—");
    rows.push([ts, shortWho, `${e.kind}.create`, `sev=${e.sev||"info"}${e.action?" action=true":""}`]);
  });

  tasks.forEach((t) => {
    rows.push(["—", (t.owner||"?").split(" ").map(w=>w[0]).join("").toLowerCase()+"@", "task.create", `id=${t.id} state=${t.state}`]);
  });

  files.forEach((f) => {
    rows.push([f.when||"—", (f.who||"system"), "file.upload", `name=${f.name} size=${f.size||"?"}`]);
  });

  // Sort newest first by timestamp string
  rows.sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="audit">
      <div className="files-head">
        <h3>Audit log <span className="muted-tx mono">{rows.length}</span></h3>
        <span className="muted-tx mono">immutable · auto-generated</span>
      </div>
      {rows.length === 0 ? (
        <div style={{padding:"48px 20px",textAlign:"center",color:"var(--muted-fg)",fontSize:"var(--t13)"}}>
          No activity yet. The audit log will populate as notes, tasks, and files are added.
        </div>
      ) : (
        <table className="audit-tbl mono">
          <thead>
            <tr style={{background:"var(--panel)"}}>
              <th className="audit-t" style={{padding:"6px 8px",fontWeight:600,fontSize:"var(--t11)",color:"var(--muted-fg)",textTransform:"uppercase"}}>Timestamp</th>
              <th className="audit-u" style={{padding:"6px 8px",fontWeight:600,fontSize:"var(--t11)",color:"var(--muted-fg)",textTransform:"uppercase"}}>User</th>
              <th className="audit-a" style={{padding:"6px 8px",fontWeight:600,fontSize:"var(--t11)",color:"var(--muted-fg)",textTransform:"uppercase"}}>Action</th>
              <th className="audit-d" style={{padding:"6px 8px",fontWeight:600,fontSize:"var(--t11)",color:"var(--muted-fg)",textTransform:"uppercase"}}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="audit-t">{r[0]}</td>
                <td className="audit-u">{r[1]}</td>
                <td className="audit-a">{r[2]}</td>
                <td className="audit-d">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ============================================================
// RIGHT RAIL
// ============================================================
function RightRail({ onAskAI, flags, onFlag, team = TEAM, onEditTeam, store, tasks=[], blockers=[] }) {
  return (
    <aside className="rail">
      <section className="rail-section">
        <div className="rail-head">
          <h4>AI summary</h4>
          <span className="pill pill-accent" style={{fontSize:"10px"}}>coming soon</span>
        </div>
        <div className="ai-coming-soon">
          <span className="ai-coming-icon"><Icon.spark /></span>
          <p className="ai-coming-title">Store Intelligence</p>
          <p className="ai-coming-desc">
            The AI assistant will automatically summarize each store's health status, surface
            blockers, flag overdue actions, and answer questions about notes, tasks, and comms —
            all grounded in real records. Ask things like "What's blocking this store?" or
            "Draft a status email to the retailer."
          </p>
        </div>
        <button className="btn primary full" onClick={onAskAI}>
          <Icon.spark /> Ask about this store <Kbd>⌘J</Kbd>
        </button>
      </section>

      <section className="rail-section">
        <div className="rail-head"><h4>Snapshot</h4></div>
        {store ? (
          <dl className="kv">
            <dt>Phase</dt><dd className="mono">{store.phase||"—"}</dd>
            <dt>Owner</dt><dd>{store.ownerPerson||store.owner||"—"}</dd>
            <dt>Next action</dt><dd>{store.nextAction||"—"}</dd>
            <dt>Due</dt><dd className="mono">{store.due||"—"} {store.dueDelta && <span className="muted-tx">· {store.dueDelta}</span>}</dd>
            <dt>Risk</dt><dd><Dot tone={store.risk==="high"?"red":store.risk==="medium"?"yellow":"green"} /> {store.risk?.charAt(0).toUpperCase()+store.risk?.slice(1)||"Low"}</dd>
            <dt>Go-live</dt><dd className="mono">{store.scheduledLive||"—"}</dd>
            <dt>Region</dt><dd>{store.region||"—"}</dd>
          </dl>
        ) : <p className="muted-tx" style={{fontSize:"var(--t12)",padding:"0 0 8px"}}>No store selected</p>}
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
        <div className="rail-head">
          <h4>Team <span className="muted-tx mono">{team.length}</span></h4>
          <button className="linkbtn" onClick={onEditTeam}><Icon.plus /> Edit</button>
        </div>
        <ul className="contacts">
          {team.map((m, i) =>
          <li key={i} className="contact-row">
              <span className={cx("avatar avatar-sm mono", "avatar-internal")}>
                {m.initials}
              </span>
              <div className="contact-text">
                <div className="contact-name">{m.name} {m.load === "primary" && <span className="muted-tx mono">· lead</span>}</div>
                <div className="contact-sub">{m.role} · <span className="mono muted-tx">{m.team}</span></div>
              </div>
              <Pill tone={m.load === "primary" ? "watch" : "info"}>{m.load}</Pill>
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
function Comms({ entries = [] }) {
  const items = entries.filter((e) => e.kind === "comm");
  return (
    <div className="comms">
      <div className="files-head">
        <h3>Comms <span className="muted-tx mono">{items.length}</span></h3>
        <span className="muted-tx mono">email + call summaries</span>
      </div>
      {items.length === 0 ? (
        <div style={{padding:"48px 20px",textAlign:"center",color:"var(--muted-fg)",fontSize:"var(--t13)"}}>
          No comms yet for this store.
          <span style={{fontSize:"var(--t12)",marginTop:4,display:"block",color:"var(--muted-fg)"}}>
            Comms appear here when timeline entries of type "comm" are added.
          </span>
        </div>
      ) : (
        <ul className="comms-list">
          {items.map((c, i) => (
            <li key={c.id || i} className="comm-row">
              <span className="mono comm-t">{c.t}</span>
              <div className="comm-body">
                <div className="comm-line1">
                  <span className="comm-from">{c.who}{c.team ? ` · ${c.team}` : ""}</span>
                  <div className="grow" />
                  {c.sev && c.sev !== "info" && <span className="tag mono">{c.sev}</span>}
                </div>
                <div className="comm-subj">{c.title}</div>
                {c.body && <div className="comm-snip muted-tx">{c.body}</div>}
                {c.attachment && <div className="tl-attach" style={{marginTop:4}}><Icon.paper /><span className="mono">{c.attachment}</span></div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// NOTES (composer + list filtered to notes)
// ============================================================
function Notes({ notes, composerRef, onPost, onEdit, onDelete, activeUser }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sev, setSev] = useState("info");
  const [team, setTeam] = useState("Implementation");
  const [action, setAction] = useState(false);
  const [due, setDue] = useState("");
  const taRef = useRef();

  const post = () => {
    const t = title.trim() || body.trim().split("\n")[0].slice(0, 80) || "(untitled note)";
    if (!body.trim() && !title.trim()) return;
    onPost({
      kind: "note",
      who: activeUser,          // use the prop, not the App-level ref
      team,
      sev,
      title: t,
      body: body.trim(),
      action,
      due: action ? due || "—" : undefined,
      mentions: action ? [`@${team.toLowerCase().replace(/ /g, "")}`] : undefined
    });
    setTitle(""); setBody(""); setSev("info"); setAction(false); setDue("");
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {e.preventDefault();post();}
  };

  // Team filter for action items
  const [teamFilter, setTeamFilter] = useState("all");
  const actionTeams = ["all", ...new Set(notes.filter(n=>n.action && n.team).map(n=>n.team))];
  const filteredNotes = teamFilter === "all" ? notes : notes.filter(n => !n.action || n.team === teamFilter);

  return (
    <div className="notes">
      <div className="note-composer" ref={composerRef}>
        <div className="note-comp-head">
          <span className="avatar avatar-sm mono">{(activeUser||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</span>
          <span>New note</span>
          <span className="muted-tx">· {activeUser}</span>
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
              <DatePicker value={due} onChange={setDue} placeholder="Pick date" />
            </>
          }
          <div className="grow" />
          <span className="muted-tx mono"><Kbd>⌘</Kbd>+<Kbd>↵</Kbd> post</span>
          <button className="btn primary" onClick={post} disabled={!body.trim() && !title.trim()}>
            <Icon.arrowU /> Post note
          </button>
        </div>
      </div>
      {actionTeams.length > 1 && (
        <div style={{display:"flex",gap:6,padding:"8px 0",flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:"var(--t12)",color:"var(--muted-fg)"}}>Filter by assigned team:</span>
          {actionTeams.map((t) => (
            <button key={t} className={cx("chip", teamFilter===t && "is-on")} onClick={() => setTeamFilter(t)}>
              {t === "all" ? "All notes" : t}
              {t !== "all" && <span className="mono" style={{marginLeft:4,fontSize:10}}>
                {notes.filter(n=>n.action && n.team===t).length}
              </span>}
            </button>
          ))}
        </div>
      )}
      <ol className="timeline">
        {filteredNotes.map((e, i) => <TimelineItem key={e.id || i} e={e} onEdit={onEdit} onDelete={onDelete} />)}
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
              {[["info","Flag","neutral"], ["watch","Watcher","yellow"], ["blocker","Blocker","red"]].map(([val, label, dot]) =>
                <button type="button" key={val} className={cx("sev-btn", `sev-${val}`, tone===val && "is-on")} onClick={() => setTone(val)}>
                  <Dot tone={dot} /> {label}
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
    const method = opts.method || "GET";
    // PATCH and DELETE return 204 no-content by default; use return=minimal to avoid parse errors
    const defaultPrefer = (method === "PATCH" || method === "DELETE") ? "return=minimal" : "return=representation";
    const res = await fetch(`${url()}/rest/v1${path}`, {
      method,
      headers: {
        apikey: key(),
        Authorization: `Bearer ${key()}`,
        "Content-Type": "application/json",
        Prefer: opts.prefer || defaultPrefer,
        ...opts.headers,
      },
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 204 || res.headers.get("content-length") === "0") return null;
    const text = await res.text();
    if (!text) return null;
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data?.message || data?.error || `supabase_error_${res.status}`);
    return data;
  }

  return {
    configured,
    req,  // expose for direct use
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
      return req(`/tasks?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", prefer: "return=minimal", body: fields });
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
    // Stores
    async listStores() {
      return req("/stores?order=created_at.desc&limit=200");
    },
    async insertStore(row) {
      const rows = await req("/stores", { method: "POST", body: row });
      return Array.isArray(rows) ? rows[0] : rows;
    },
    async patchStore(id, fields) {
      return req(`/stores?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", prefer: "return=minimal", body: fields });
    },
    // Team members
    async replaceTeam(storeId, members) {
      // Delete ALL team members then re-insert (global team, no store scoping)
      await req(`/team_members?id=gt.0`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
      if (!members.length) return [];
      const rows = await req("/team_members", {
        method: "POST",
        body: members.map((m) => ({
          name: m.name, role: m.role || "", team: m.team || "",
          load: m.load || "active", initials: m.initials || "",
          since: m.since || "", store_id: null
        }))
      });
      return rows;
    },
    async getTeam(storeId) {
      // Fetch all team members (store-specific + global null ones)
      return req(`/team_members?order=created_at.asc&limit=200`);
    },
    async getAllTeamMembers() {
      return req(`/team_members?order=created_at.asc&limit=200`);
    },
    // Blockers
    async getBlockers(storeId) {
      return req(`/blockers?store_id=eq.${encodeURIComponent(storeId)}&order=created_at.desc`);
    },
    async getAllTasks() { return req(`/tasks?order=created_at.desc&limit=500`); },
    async getAllFlags() { return req(`/flags?resolved=eq.false&order=created_at.desc&limit=500`); },
    async getAllBlockers() { return req(`/blockers?resolved=eq.false&order=created_at.desc&limit=500`); },
    async insertBlocker(row) {
      const rows = await req("/blockers", { method: "POST", body: row });
      return Array.isArray(rows) ? rows[0] : rows;
    },
    async resolveBlocker(id) {
      return req(`/blockers?id=eq.${id}`, { method: "PATCH", prefer: "return=minimal", body: { resolved: true, updated_at: new Date().toISOString() } });
    },
    // Resolve flag
    async resolveFlag(id) {
      return req(`/flags?id=eq.${id}`, { method: "PATCH", prefer: "return=minimal", body: { resolved: true } });
    },
    // Delete store
    async deleteStore(id) {
      return req(`/stores?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    },
    // Task notes
    async getTaskNotes(taskId) {
      return req(`/task_notes?task_id=eq.${encodeURIComponent(taskId)}&order=created_at.desc`);
    },
    async insertTaskNote(row) {
      const rows = await req("/task_notes", { method: "POST", body: row });
      return Array.isArray(rows) ? rows[0] : rows;
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
function dbRowToBlocker(r) {
  return { id: r.id, title: r.title, description: r.description, tone: r.tone,
    team: r.team, taskId: r.task_id, resolved: r.resolved };
}
function rowToStore(r) {
  return {
    id: r.id, retailer: r.retailer, retailerCode: r.retailer_code,
    storeNum: r.store_num, name: r.name, address: r.address,
    phase: r.phase, health: r.health, owner: r.owner, ownerPerson: r.owner_person,
    nextAction: r.next_action, due: r.due, dueDelta: r.due_delta,
    risk: r.risk, openedOn: r.opened_on, scheduledLive: r.scheduled_live,
    sqft: r.sqft, region: r.region, fixtureCount: r.fixture_count, skus: r.skus,
  };
}
function dbRowToFile(r) {
  return { id: r.id, name: r.name, size: r.size, who: r.who,
    when: r.created_at ? new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—" };
}

// ============================================================
// TASK DETAIL DRAWER
// Open a task, see its notes, add notes, edit blocker status
// ============================================================
function TaskDrawer({ task, open, onClose, onStateChange, storeId, flashToast, activeUser }) {
  const [notes, setNotes]     = useState([]);
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading]  = useState(false);
  const [tab, setTab]          = useState("notes");

  useEffect(() => {
    if (!open || !task) return;
    setNotes([]); setNoteText(""); setTab("notes");
    if (!SB.configured()) return;
    setLoading(true);
    SB.getTaskNotes(task.id)
      .then((rows) => setNotes(rows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, task]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open || !task) return null;

  const postNote = async () => {
    if (!noteText.trim()) return;
    const now = new Date();
    const t   = `${now.toLocaleString("en-US",{month:"short",day:"numeric"})} · ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const optimistic = { id: Date.now(), who: activeUser || "Me", body: noteText.trim(), created_at: new Date().toISOString(), t };
    setNotes((ns) => [optimistic, ...ns]);
    setNoteText("");
    if (!SB.configured()) return;
    try {
      const [tn] = await Promise.all([
        SB.insertTaskNote({ task_id: task.id, store_id: storeId, who: optimistic.who, body: optimistic.body }),
        SB.insertEntry({
          store_id: storeId, t, who: optimistic.who,
          team: "—", kind: "task", sev: "info",
          title: `Note on task ${task.id}: ${optimistic.body.slice(0,80)}${optimistic.body.length>80?"…":""}`,
          body: task.title, action: false,
        }),
      ]);
      if (tn?.id) setNotes((ns) => ns.map((n) => n===optimistic ? {...optimistic, id: tn.id} : n));
    } catch (e) { flashToast("Note sync failed: " + e.message, true); }
  };

  const states = ["Open", "Waiting", "Done"];

  return (
    <div className="drawer-scrim" onMouseDown={onClose}>
      <aside className="phase-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div className="drawer-crumb mono">
            <span className="muted-tx">Task</span>
            <Icon.chevR />
            <span className="mono task-id">{task.id}</span>
          </div>
          <div className="grow" />
          <span className="muted-tx mono"><Kbd>esc</Kbd></span>
          <button className="iconbtn" onClick={onClose}><Icon.close /></button>
        </header>

        <div className="drawer-meta">
          <p style={{margin:"0 0 8px",fontSize:"var(--t14)",fontWeight:500,color:"var(--fg)"}}>{task.title}</p>
          <div className="drawer-meta-row">
            <span className="meta-stat"><span className="meta-k">Owner</span> <span>{task.owner || "—"}</span></span>
            <span className="meta-stat"><span className="meta-k">Due</span> <span className="mono">{task.due || "—"}</span></span>
            <span className="meta-stat"><span className="meta-k">Status</span>
              <span style={{display:"inline-flex",gap:4}}>
                {states.map((s) => (
                  <button key={s}
                    className={cx("btn sm", task.state === s ? "primary" : "ghost")}
                    onClick={() => onStateChange(task.id, s)}>{s}</button>
                ))}
              </span>
            </span>
          </div>
          {task.flag && <div style={{marginTop:8}}><Pill tone="blocker">blocker</Pill></div>}
        </div>

        <div className="drawer-tabs">
          {[{id:"notes",label:"Notes"},{id:"info",label:"Details"}].map((t) => (
            <button key={t.id} className={cx("drawer-tab", tab===t.id && "is-active")} onClick={()=>setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {tab === "notes" && (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div className="drawer-mini-composer">
                <textarea rows={3} placeholder="Add a note to this task…"
                  value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => { if ((e.metaKey||e.ctrlKey) && e.key==="Enter") { e.preventDefault(); postNote(); } }}
                />
                <div className="drawer-comp-foot">
                  <span className="muted-tx mono"><Kbd>⌘</Kbd>+<Kbd>↵</Kbd> post</span>
                  <div className="grow" />
                  <button className="btn primary" disabled={!noteText.trim()} onClick={postNote}><Icon.arrowU /> Post</button>
                </div>
              </div>
              {loading && <div className="loading-bar" />}
              {notes.length === 0 && !loading && (
                <div className="drawer-empty">No notes yet. Add the first one above.</div>
              )}
              <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:8}}>
                {notes.map((n, i) => (
                  <li key={n.id || i} style={{borderRadius:"var(--radius)",border:"1px solid var(--border)",background:"var(--bg-elev)",padding:"8px var(--pad-3)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,fontSize:"var(--t12)",color:"var(--muted-fg)"}}>
                      <span className="avatar avatar-xs mono">{(n.who||"?").split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
                      <span style={{color:"var(--fg-2)",fontWeight:500}}>{n.who}</span>
                      <span>·</span>
                      <span className="mono">{n.t || new Date(n.created_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                    <div style={{fontSize:"var(--t13)",color:"var(--fg)",lineHeight:1.5}}>{n.body}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === "info" && (
            <dl className="kv" style={{marginTop:8}}>
              <dt>Task ID</dt><dd className="mono">{task.id}</dd>
              <dt>Title</dt><dd>{task.title}</dd>
              <dt>Owner</dt><dd>{task.owner || "—"}</dd>
              <dt>Due</dt><dd className="mono">{task.due || "—"}</dd>
              <dt>State</dt><dd>{task.state}</dd>
              <dt>Flag</dt><dd>{task.flag ? <Pill tone="blocker">{task.flag}</Pill> : <span className="muted-tx">none</span>}</dd>
            </dl>
          )}
        </div>
      </aside>
    </div>
  );
}

// ============================================================
// BLOCKERS PANEL
// View all blockers, add new ones, resolve them, add notes
// ============================================================
function BlockersPanel({ blockers, onAdd, onResolve, storeId, flashToast }) {
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState({ title: "", description: "", tone: "blocker", team: "Implementation" });
  const [filterTeam, setFilterTeam] = useState("all");
  const teams = ["all", ...new Set(blockers.map((b) => b.team).filter(Boolean))];

  const filtered = filterTeam === "all" ? blockers : blockers.filter((b) => b.team === filterTeam);
  const open     = filtered.filter((b) => !b.resolved);
  const resolved = filtered.filter((b) =>  b.resolved);

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd({ ...form });
    setForm({ title: "", description: "", tone: "blocker", team: "Implementation" });
    setAdding(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <h3 style={{margin:0,fontSize:"var(--t14)",fontWeight:600}}>
          Blockers <span className="muted-tx mono">{open.length} open</span>
        </h3>
        <div className="grow" />
        {/* Sort by team */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {teams.map((t) => (
            <button key={t} className={cx("chip", filterTeam===t && "is-on")} onClick={() => setFilterTeam(t)}>
              {t === "all" ? "All teams" : t}
            </button>
          ))}
        </div>
        <button className="btn primary sm" onClick={() => setAdding((v) => !v)}>
          <Icon.plus /> Add blocker
        </button>
      </div>

      {adding && (
        <form className="blocker-add-form" onSubmit={submit}>
          <input className="new-task-title" placeholder="Blocker title *" autoFocus
            value={form.title} onChange={(e) => setForm((f) => ({...f, title: e.target.value}))} />
          <textarea className="blocker-desc-input" rows={2} placeholder="Description / context…"
            value={form.description} onChange={(e) => setForm((f) => ({...f, description: e.target.value}))} />
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div className="sev-seg">
              {["blocker","watch"].map((s) => (
                <button type="button" key={s} className={cx("sev-btn",`sev-${s}`,form.tone===s&&"is-on")} onClick={() => setForm((f) => ({...f, tone:s}))}>
                  <Dot tone={s==="blocker"?"red":"yellow"} /> {s}
                </button>
              ))}
            </div>
            <select className="select-ish mono" value={form.team} onChange={(e) => setForm((f) => ({...f, team:e.target.value}))}>
              {TEAMS.map((t) => <option key={t.id}>{t.id}</option>)}
            </select>
            <div className="grow" />
            <button type="button" className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!form.title.trim()}><Icon.flag /> Add</button>
          </div>
        </form>
      )}

      {open.length === 0 && !adding && (
        <div className="drawer-empty">No open blockers. Click "Add blocker" to raise one.</div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {open.map((b, i) => (
          <div key={b.id || i} className={cx("blocker-card", `blocker-card-${b.tone}`)}>
            <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
              <Dot tone={b.tone === "blocker" ? "red" : "yellow"} style={{marginTop:4,flexShrink:0}} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:500,fontSize:"var(--t13)",color:"var(--fg)"}}>{b.title}</div>
                {b.description && <div style={{fontSize:"var(--t13)",color:"var(--fg-2)",marginTop:2,lineHeight:1.45}}>{b.description}</div>}
                <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                  {b.team && <span className="flag-team mono">{b.team}</span>}
                  <Pill tone={b.tone}>{b.tone}</Pill>
                </div>
              </div>
              <button className="btn ghost sm" onClick={() => onResolve(b.id)} style={{flexShrink:0}}>Resolve</button>
            </div>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <details style={{fontSize:"var(--t12)",color:"var(--muted-fg)"}}>
          <summary style={{cursor:"pointer",userSelect:"none",marginBottom:6}}>{resolved.length} resolved</summary>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {resolved.map((b, i) => (
              <div key={b.id || i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px var(--pad-3)",border:"1px solid var(--border)",borderRadius:"var(--radius)",opacity:0.6}}>
                <Dot tone="neutral" />
                <span style={{textDecoration:"line-through",fontSize:"var(--t13)"}}>{b.title}</span>
                <span className="flag-team mono">{b.team}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ============================================================
// TASKS — full featured with drawer + blockers
// ============================================================
function Tasks({ tasks, onCreate, onStateChange, blockers, onAddBlocker, onResolveBlocker, storeId, flashToast, activeUser }) {
  const [newTitle, setNewTitle]   = useState("");
  const [newOwner, setNewOwner]   = useState("");
  const [newDue,   setNewDue]     = useState("");
  const [newFlag,  setNewFlag]    = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [taskTab, setTaskTab]     = useState("kanban"); // kanban | blockers
  const [sortTeam, setSortTeam]   = useState("all");

  const cols = [
    { id: "Open",    tone: "info" },
    { id: "Waiting", tone: "watch" },
    { id: "Done",    tone: "ok" },
  ];

  const allOwners = ["all", ...new Set(tasks.map((t) => t.owner).filter(Boolean))];
  const filtered  = sortTeam === "all" ? tasks : tasks.filter((t) => t.owner === sortTeam);

  const submit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreate({ title: newTitle.trim(), owner: newOwner.trim(), due: newDue.trim() || "—", flag: newFlag ? "blocker" : null });
    setNewTitle(""); setNewOwner(""); setNewDue(""); setNewFlag(false);
  };

  return (
    <div className="tasks">
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:2}}>
          {[{id:"kanban",label:"Kanban"},{id:"blockers",label:`Blockers ${blockers.filter(b=>!b.resolved).length > 0 ? `(${blockers.filter(b=>!b.resolved).length})` : ""}`}].map((t) => (
            <button key={t.id} className={cx("tab", taskTab===t.id && "is-active")} style={{height:30}} onClick={() => setTaskTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="grow" />
        {taskTab === "kanban" && (
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {allOwners.map((o) => (
              <button key={o} className={cx("chip", sortTeam===o && "is-on")} onClick={() => setSortTeam(o)}>
                {o === "all" ? "All" : o}
              </button>
            ))}
          </div>
        )}
      </div>

      {taskTab === "kanban" && (
        <>
          <form className="new-task-form" onSubmit={submit}>
            <input className="new-task-title" placeholder="New task title…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <input className="new-task-field" placeholder="Owner" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
            <DatePicker value={newDue} onChange={setNewDue} placeholder="Due date" />
            <label style={{display:"flex",alignItems:"center",gap:5,fontSize:"var(--t12)",color:"var(--fg-2)",cursor:"pointer",whiteSpace:"nowrap"}}>
              <input type="checkbox" checked={newFlag} onChange={(e) => setNewFlag(e.target.checked)} />
              Mark as blocker
            </label>
            <button className="btn primary" type="submit" disabled={!newTitle.trim()}><Icon.plus /> Add task</button>
          </form>

          <div className="task-cols">
            {cols.map((c) => {
              const items = filtered.filter((t) => t.state === c.id);
              return (
                <div key={c.id} className="task-col">
                  <div className="task-col-head">
                    <Dot tone={c.tone==="ok"?"green":c.tone==="watch"?"yellow":"neutral"} />
                    <span>{c.id}</span>
                    <span className="mono task-col-n">{items.length}</span>
                  </div>
                  {items.length === 0 && (
                    <div style={{padding:"20px 10px",textAlign:"center",color:"var(--muted-fg)",fontSize:"var(--t12)",border:"1px dashed var(--border)",borderRadius:"var(--radius)",margin:"4px 0"}}>
                      No {c.id.toLowerCase()} tasks
                    </div>
                  )}
                  {items.map((t) => (
                    <div key={t.id} className={cx("task-card", t.flag==="blocker" && "is-blocker")}
                      onClick={() => setActiveTask(t)} style={{cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:4}}>
                        <span className="mono task-id" style={{fontSize:"var(--t11)",color:"var(--muted-fg)",flexShrink:0,paddingTop:1}}>{t.id}</span>
                        {t.flag && <Pill tone="blocker" style={{flexShrink:0,fontSize:10}}>blocker</Pill>}
                      </div>
                      <div className="task-card-title" style={{fontSize:"var(--t13)",fontWeight:500,color:"var(--fg)",lineHeight:1.4,marginBottom:8}}>{t.title}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:"var(--t12)",color:"var(--muted-fg)"}}>
                        <span className="avatar avatar-xs mono">{(t.owner||"?").split(" ").map(s=>s[0]).join("")}</span>
                        <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.owner||"Unassigned"}</span>
                        <span className="mono" style={{flexShrink:0}}>{t.due}</span>
                      </div>
                      <div className="task-card-actions" onClick={(e)=>e.stopPropagation()}>
                        {c.id!=="Open"    && <button className="btn ghost sm" onClick={()=>onStateChange(t.id,"Open")}>Open</button>}
                        {c.id!=="Waiting" && <button className="btn ghost sm" onClick={()=>onStateChange(t.id,"Waiting")}>Waiting</button>}
                        {c.id!=="Done"    && <button className="btn ghost sm" onClick={()=>onStateChange(t.id,"Done")}>Done</button>}
                        <button className="btn ghost sm" onClick={()=>setActiveTask(t)}><Icon.paper /> Notes</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {taskTab === "blockers" && (
        <BlockersPanel
          blockers={blockers} onAdd={onAddBlocker} onResolve={onResolveBlocker}
          storeId={storeId} flashToast={flashToast}
        />
      )}

      <TaskDrawer
        task={activeTask} open={!!activeTask}
        onClose={() => setActiveTask(null)}
        onStateChange={onStateChange}
        storeId={storeId} flashToast={flashToast}
        activeUser={activeUser}
      />
    </div>
  );
}

// ============================================================
// FILES
// ============================================================
function Files({ files, onUpload }) {
  const fileInputRef = useRef();
  return (
    <div className="files">
      <div className="files-head">
        <h3>Files <span className="muted-tx mono">{files.length}</span></h3>
        <button className="btn ghost sm" onClick={() => fileInputRef.current?.click()}><Icon.plus /> Upload</button>
        <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value=""; }} />
      </div>
      <table className="ftbl">
        <thead><tr>
          <th style={{width:"6%"}}>#</th><th>Name</th><th>Size</th><th>Uploaded by</th><th>When</th><th></th>
        </tr></thead>
        <tbody>
          {files.map((f, i) => (
            <tr key={f.id || f.name}>
              <td className="mono muted-tx">{String(i+1).padStart(2,"0")}</td>
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
// LEFT NAV — shows live counts, blockers, tasks, flags
// ============================================================
function LeftNav({ stores=[], allTasks=[], allFlags=[], allBlockers=[], onAddStore, onImportCSV, onNavSelect, navView, activeStoreId, onSelectStore, onDeleteStore, activeUser, onChangeUser }) {
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // store id pending delete
  const openTasks    = allTasks.filter((t) => t.state !== "Done");
  const openFlags    = allFlags.filter((f) => !f.resolved);
  const openBlockers = allBlockers.filter((b) => !b.resolved);

  const navItems = [
    { id: "store",    label: "Store view"  },
    { id: "tasks",    label: "Tasks",    count: openTasks.length    },
    { id: "flags",    label: "Flags",    count: openFlags.length    },
    { id: "blockers", label: "Blockers", count: openBlockers.length },
  ];

  const filtered = stores.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.id.toLowerCase().includes(q) || (s.name||"").toLowerCase().includes(q) || (s.retailer||"").toLowerCase().includes(q) || (s.storeNum||"").includes(q);
  });

  return (
    <nav className="leftnav">
      <div className="leftnav-head">
        <div className="brand">
          <span className="brand-mark"></span>
          <span className="brand-word">storeops</span>
        </div>
      </div>

      <div className="nav-section-label">Views</div>
      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.id} className={cx("nav-item", navView===item.id && "is-active")}
            onClick={() => onNavSelect(item.id)}>
            <span className="nav-label">{item.label}</span>
            {item.count > 0 && (
              <span className={cx("nav-count mono", item.id==="blockers" && item.count > 0 && "nav-count-blocker")}>{item.count}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="nav-section-label">
        Stores <span className="nav-count mono">{stores.length}</span>
      </div>

      {/* Search */}
      <div className="nav-search-wrap">
        <Icon.search />
        <input
          className="nav-search-input"
          placeholder="Search by store # or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <button className="nav-search-clear" onClick={() => setSearch("")}>×</button>}
      </div>

      <ul className="nav-list nav-pinned" style={{flex:1,overflowY:"auto"}}>
        {filtered.length === 0 && (
          <li style={{padding:"8px 12px",color:"var(--muted-fg)",fontSize:"var(--t12)"}}>No stores match</li>
        )}
        {filtered.map((s) => (
          <li key={s.id}
            className={cx("nav-item nav-store", s.id===activeStoreId && navView==="store" && "is-active")}
            onClick={() => onSelectStore(s)}
            style={{gap:6}}>
            <Dot tone={s.health||"neutral"} />
            <span className="mono nav-store-id" style={{flex:1,fontSize:"var(--t12)"}}>{s.id}</span>
            <button className="nav-store-delete iconbtn xs"
              title="Delete store"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(s.id); }}
              style={{opacity:0,transition:"opacity .15s",color:"var(--bad)",flexShrink:0}}>×</button>
          </li>
        ))}
      </ul>

      <div style={{padding:"6px 8px",borderTop:"1px solid var(--border)",display:"flex",gap:4}}>
        <button className="btn ghost sm" style={{flex:1,justifyContent:"center"}} onClick={onAddStore}>
          <Icon.plus /> Add
        </button>
        <button className="btn ghost sm" style={{flex:1,justifyContent:"center"}} onClick={onImportCSV}>
          <Icon.arrowU /> CSV
        </button>
      </div>

      <div className="leftnav-foot" style={{cursor:"pointer"}} onClick={onChangeUser} title="Click to switch active user">
        <div className="me">
          <span className="avatar mono">{(activeUser||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</span>
          <div className="me-text">
            <div style={{fontWeight:500}}>{activeUser || "Select user"}</div>
            <div className="me-sub">Click to switch ↕</div>
          </div>
        </div>
      </div>

      {/* Delete confirm overlay */}
      {confirmDelete && (
        <div className="ai-modal-scrim" style={{zIndex:200}} onMouseDown={() => setConfirmDelete(null)}>
          <div className="ai-modal" style={{width:"min(380px,90vw)",padding:0}} onMouseDown={(e) => e.stopPropagation()}>
            <header className="ai-modal-head">
              <div className="ai-modal-title" style={{color:"var(--bad)"}}>Delete store</div>
            </header>
            <div style={{padding:"16px 20px",fontSize:"var(--t13)",color:"var(--fg-2)"}}>
              Are you sure you want to delete <strong className="mono">{confirmDelete}</strong>? This will also delete all its tasks, flags, notes, and files. This cannot be undone.
            </div>
            <div className="flag-foot">
              <div className="grow" />
              <button className="btn ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn primary" style={{background:"var(--bad)",borderColor:"var(--bad)"}}
                onClick={() => { onDeleteStore(confirmDelete); setConfirmDelete(null); }}>
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ============================================================
// WELCOME DASHBOARD — shown when no store is selected
// ============================================================
function WelcomeDashboard({ stores, onSelectStore, onAddStore, onImportCSV }) {
  const [sortField, setSortField] = useState("id");
  const [sortDir,   setSortDir]   = useState("asc");
  const [filter,    setFilter]    = useState("");

  const sorted = [...stores]
    .filter((s) => {
      const q = filter.toLowerCase();
      return !q || s.id.toLowerCase().includes(q) || (s.retailer||"").toLowerCase().includes(q)
        || (s.name||"").toLowerCase().includes(q) || (s.region||"").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = (a[sortField]||"").toString().toLowerCase();
      const bv = (b[sortField]||"").toString().toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortTh = ({ field, label }) => (
    <th onClick={() => toggleSort(field)} style={{cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}>
      {label} {sortField===field ? (sortDir==="asc" ? "↑" : "↓") : ""}
    </th>
  );

  const healthCounts = { green: stores.filter(s=>s.health==="green").length, yellow: stores.filter(s=>s.health==="yellow").length, red: stores.filter(s=>s.health==="red").length };

  return (
    <div className="welcome-dash">
      {/* Header */}
      <div className="welcome-head">
        <div>
          <h1 className="welcome-title">StoreOps</h1>
          <p className="welcome-sub">Select a store to open its health record, or add a new one.</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="btn ghost" onClick={onImportCSV}><Icon.arrowU /> Import CSV</button>
          <button className="btn primary" onClick={onAddStore}><Icon.plus /> Add store</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="welcome-stats">
        <div className="welcome-stat">
          <span className="welcome-stat-n">{stores.length}</span>
          <span className="welcome-stat-l">Total stores</span>
        </div>
        <div className="welcome-stat">
          <Dot tone="green" />
          <span className="welcome-stat-n">{healthCounts.green}</span>
          <span className="welcome-stat-l">Healthy</span>
        </div>
        <div className="welcome-stat">
          <Dot tone="yellow" />
          <span className="welcome-stat-n">{healthCounts.yellow}</span>
          <span className="welcome-stat-l">Watch</span>
        </div>
        <div className="welcome-stat">
          <Dot tone="red" />
          <span className="welcome-stat-n">{healthCounts.red}</span>
          <span className="welcome-stat-l">Blocked</span>
        </div>
      </div>

      {/* Search */}
      <div className="welcome-search-wrap">
        <Icon.search />
        <input className="welcome-search" placeholder="Filter by ID, retailer, name, region…"
          value={filter} onChange={(e) => setFilter(e.target.value)} autoFocus />
        {filter && <button style={{border:0,background:"transparent",cursor:"pointer",color:"var(--muted-fg)"}} onClick={() => setFilter("")}>×</button>}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="welcome-empty">
          {stores.length === 0
            ? <><p style={{fontSize:"var(--t16)",fontWeight:600,marginBottom:8}}>No stores yet</p><p style={{color:"var(--fg-2)"}}>Add a store or import a CSV to get started.</p></>
            : <p>No stores match "{filter}"</p>
          }
        </div>
      ) : (
        <div className="welcome-table-wrap">
          <table className="welcome-table">
            <thead>
              <tr>
                <th style={{width:16}}></th>
                <SortTh field="id"           label="Store ID" />
                <SortTh field="retailer"     label="Retailer" />
                <SortTh field="phase"        label="Phase" />
                <SortTh field="ownerPerson"  label="Owner" />
                <SortTh field="scheduledLive" label="Go-live" />
                <SortTh field="region"       label="Region" />
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="welcome-row" onClick={() => onSelectStore(s)}>
                  <td><Dot tone={s.health||"neutral"} /></td>
                  <td className="mono" style={{fontWeight:500}}>{s.id}</td>
                  <td>{s.retailer}</td>
                  <td><span className="pill pill-neutral mono" style={{fontSize:10}}>{s.phase}</span></td>
                  <td>{s.ownerPerson || s.owner || "—"}</td>
                  <td className="mono">{s.scheduledLive || "—"}</td>
                  <td>{s.region || "—"}</td>
                  <td>
                    <span className={cx("pill", s.health==="green"?"pill-ok":s.health==="red"?"pill-bad":"pill-watch")}>
                      {s.health || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ============================================================
// GLOBAL TASKS VIEW — sortable list of all tasks
// ============================================================
function GlobalTasksView({ tasks, onStateChange, storeId, flashToast, allStores=[], onSelectStore }) {
  const [sortTeam, setSortTeam]   = useState("all");
  const [sortState, setSortState] = useState("all");
  const [activeTask, setActiveTask] = useState(null);

  const owners = ["all", ...new Set(tasks.map((t) => t.owner).filter(Boolean))];
  const states = ["all", "Open", "Waiting", "Done"];

  const filtered = tasks
    .filter((t) => sortTeam  === "all" || t.owner === sortTeam)
    .filter((t) => sortState === "all" || t.state === sortState);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <h2 style={{margin:0,fontSize:"var(--t18)",fontWeight:600}}>All tasks</h2>
        <span className="muted-tx mono">{filtered.length} of {tasks.length}</span>
        <div className="grow" />
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {states.map((s) => (
            <button key={s} className={cx("chip", sortState===s && "is-on")} onClick={() => setSortState(s)}>
              {s === "all" ? "All states" : s}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {owners.map((o) => (
            <button key={o} className={cx("chip", sortTeam===o && "is-on")} onClick={() => setSortTeam(o)}>
              {o === "all" ? "All owners" : o}
            </button>
          ))}
        </div>
      </div>

      <div style={{border:"1px solid var(--border)",borderRadius:"var(--radius)",background:"var(--bg-elev)",overflow:"hidden"}}>
        {filtered.length === 0 && <div className="drawer-empty">No tasks match this filter.</div>}
        {filtered.map((t, i) => (
          <div key={t.id} style={{
            display:"flex",alignItems:"center",gap:12,
            padding:"10px 16px",
            borderBottom: i < filtered.length-1 ? "1px solid var(--border)" : "none",
            cursor:"pointer",
          }} onClick={() => setActiveTask(t)}>
            <span className="mono task-id" style={{flexShrink:0,width:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.id}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"var(--t13)",color:"var(--fg)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
              <div style={{fontSize:"var(--t12)",color:"var(--muted-fg)",marginTop:2}}>
                {t.owner} {t.due && t.due!=="—" ? `· due ${t.due}` : ""}
                {t.store_id && <span className="mono" style={{color:"var(--accent)",marginLeft:6}}>{t.store_id}</span>}
              </div>
            </div>
            {t.flag && <Pill tone="blocker" style={{flexShrink:0}}>blocker</Pill>}
            <Pill tone={t.state==="Done"?"info":t.state==="Waiting"?"watch":"info"} style={{flexShrink:0}}>{t.state}</Pill>
            <div style={{display:"flex",gap:4,flexShrink:0}} onClick={(e)=>e.stopPropagation()}>
              {t.state !== "Done" && <button className="btn ghost sm" onClick={() => onStateChange(t.id,"Done")}>Done</button>}
              {t.state === "Done" && <button className="btn ghost sm" onClick={() => onStateChange(t.id,"Open")}>Reopen</button>}
              {t.store_id && onSelectStore && (() => { const s = allStores.find(x=>x.id===t.store_id); return s ? <button className="btn ghost sm" onClick={() => onSelectStore(s)}>Open store</button> : null; })()}
            </div>
          </div>
        ))}
      </div>

      <TaskDrawer task={activeTask} open={!!activeTask} onClose={() => setActiveTask(null)}
        onStateChange={onStateChange} storeId={storeId} flashToast={flashToast} activeUser="Me" />
    </div>
  );
}

// ============================================================
// GLOBAL FLAGS VIEW
// ============================================================
function GlobalFlagsView({ flags, onResolve, allStores=[], onSelectStore, allBlockerFlags=[] }) {
  const [sortTeam, setSortTeam] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const teams = ["all", ...new Set(flags.map((f) => f.team).filter(Boolean))];
  const filtered = sortTeam === "all" ? flags : flags.filter((f) => f.team === sortTeam);
  const open     = filtered.filter((f) => !f.resolved && f.tone !== "blocker");
  const resolved = filtered.filter((f) =>  f.resolved && f.tone !== "blocker");
  const displayed = showResolved ? [...open, ...resolved] : open;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <h2 style={{margin:0,fontSize:"var(--t18)",fontWeight:600}}>All flags</h2>
        <span className="muted-tx mono">{open.length} open</span>
        <div className="grow" />
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {teams.map((t) => (
            <button key={t} className={cx("chip", sortTeam===t && "is-on")} onClick={() => setSortTeam(t)}>
              {t === "all" ? "All teams" : t}
            </button>
          ))}
        </div>
        {resolved.length > 0 && (
          <button className="btn ghost sm" onClick={() => setShowResolved(v => !v)}>
            {showResolved ? "Hide resolved" : `Show ${resolved.length} resolved`}
          </button>
        )}
      </div>

      <div style={{border:"1px solid var(--border)",borderRadius:"var(--radius)",background:"var(--bg-elev)",overflow:"hidden"}}>
        {displayed.length === 0 && <div className="drawer-empty">No open flags.</div>}
        {displayed.map((f, i) => {
          const store = allStores.find(s => s.id === f.store_id);
          return (
            <div key={f.id || i} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"10px 14px",
              borderBottom: i < displayed.length-1 ? "1px solid var(--border)" : "none",
              opacity: f.resolved ? 0.55 : 1,
              background: "var(--bg)",
            }}>
              <Dot tone={f.tone==="blocker"?"red":f.tone==="watch"?"yellow":"neutral"} style={{flexShrink:0}} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"var(--t13)",fontWeight:500,color:"var(--fg)",
                  textDecoration: f.resolved ? "line-through" : "none",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {f.label}
                </div>
                <div style={{fontSize:"var(--t12)",color:"var(--muted-fg)",marginTop:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  {f.team && <span>{f.team}</span>}
                  {f.since && <><span>·</span><span>{f.since}</span></>}
                  {f.store_id && (
                    <span className="mono" style={{
                      color:"var(--accent)",background:"var(--accent-soft)",
                      padding:"1px 5px",borderRadius:3,fontSize:10,fontWeight:600,
                    }}>{f.store_id}</span>
                  )}
                </div>
              </div>
              <Pill tone={f.tone==="blocker"?"blocker":f.tone==="watch"?"watch":"info"} style={{flexShrink:0}}>
                {f.tone}
              </Pill>
              {store && (
                <button className="btn ghost sm" style={{flexShrink:0}}
                  onClick={() => onSelectStore(store)}>
                  Open store
                </button>
              )}
              {!f.resolved && (
                <button className="btn ghost sm" style={{flexShrink:0}}
                  onClick={() => onResolve && onResolve(f.id)}>
                  Resolve
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// GLOBAL BLOCKERS VIEW
// ============================================================
function GlobalBlockersView({ blockers, onAdd, onResolve, storeId, flashToast, allStores=[], onSelectStore, flagBlockers=[] }) {
  const [sortTeam, setSortTeam] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title:"", description:"", tone:"blocker", team:"Implementation" });

  // Combine blockers table + flag-tone blockers
  const allItems = [
    ...blockers,
    ...flagBlockers.filter((f) => f.tone==="blocker" && !blockers.some((b) => b.id===f.id)),
  ];

  const teams = ["all", ...new Set(allItems.map((b) => b.team).filter(Boolean))];
  const filtered = sortTeam === "all" ? allItems : allItems.filter((b) => b.team === sortTeam);
  const open     = filtered.filter((b) => !b.resolved);
  const resolved = filtered.filter((b) =>  b.resolved);
  const displayed = showResolved ? [...open, ...resolved] : open;

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd({ ...form });
    setForm({ title:"", description:"", tone:"blocker", team:"Implementation" });
    setAdding(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <h2 style={{margin:0,fontSize:"var(--t18)",fontWeight:600}}>All blockers</h2>
        <span className="muted-tx mono">{open.length} open</span>
        <div className="grow" />
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {teams.map((t) => (
            <button key={t} className={cx("chip", sortTeam===t && "is-on")} onClick={() => setSortTeam(t)}>
              {t === "all" ? "All teams" : t}
            </button>
          ))}
        </div>
        {resolved.length > 0 && (
          <button className="btn ghost sm" onClick={() => setShowResolved(v => !v)}>
            {showResolved ? "Hide resolved" : `Show ${resolved.length} resolved`}
          </button>
        )}
        <button className="btn primary sm" onClick={() => setAdding(v => !v)}>
          <Icon.plus /> Add blocker
        </button>
      </div>

      {adding && (
        <form className="blocker-add-form" onSubmit={submit}>
          <input className="new-task-title" placeholder="Blocker title *" autoFocus
            value={form.title} onChange={(e) => setForm(f=>({...f,title:e.target.value}))} />
          <textarea className="blocker-desc-input" rows={2} placeholder="Description / context…"
            value={form.description} onChange={(e) => setForm(f=>({...f,description:e.target.value}))} />
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <div className="sev-seg">
              {[["blocker","red"],["watch","yellow"]].map(([s,dot]) => (
                <button type="button" key={s} className={cx("sev-btn",`sev-${s}`,form.tone===s&&"is-on")} onClick={() => setForm(f=>({...f,tone:s}))}>
                  <Dot tone={dot} /> {s}
                </button>
              ))}
            </div>
            <select className="select-ish mono" value={form.team} onChange={(e) => setForm(f=>({...f,team:e.target.value}))}>
              {TEAMS.map((t) => <option key={t.id}>{t.id}</option>)}
            </select>
            <div className="grow" />
            <button type="button" className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!form.title.trim()}>
              <Icon.flag /> Add
            </button>
          </div>
        </form>
      )}

      <div style={{border:"1px solid var(--border)",borderRadius:"var(--radius)",background:"var(--bg-elev)",overflow:"hidden"}}>
        {displayed.length === 0 && !adding && (
          <div className="drawer-empty">No open blockers. Click "Add blocker" to raise one.</div>
        )}
        {displayed.map((b, i) => {
          const store = allStores.find(s => s.id === b.store_id);
          return (
            <div key={b.id || i} style={{
              display:"flex", alignItems:"flex-start", gap:12,
              padding:"12px 14px",
              borderBottom: i < displayed.length-1 ? "1px solid var(--border)" : "none",
              opacity: b.resolved ? 0.55 : 1,
              background: b.tone==="blocker" && !b.resolved ? "color-mix(in oklab, var(--bad) 4%, var(--bg))" : "var(--bg)",
            }}>
              <Dot tone={b.tone==="blocker"?"red":"yellow"} style={{marginTop:3,flexShrink:0}} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"var(--t13)",fontWeight:500,color:"var(--fg)",
                  textDecoration:b.resolved?"line-through":"none",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {b.title}
                </div>
                {b.description && (
                  <div style={{fontSize:"var(--t12)",color:"var(--fg-2)",marginTop:2,lineHeight:1.45}}>
                    {b.description}
                  </div>
                )}
                <div style={{fontSize:"var(--t12)",color:"var(--muted-fg)",marginTop:4,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  {b.team && <span>{b.team}</span>}
                  {b.store_id && (
                    <span className="mono" style={{
                      color:"var(--bad)",background:"var(--bad-soft)",
                      padding:"1px 5px",borderRadius:3,fontSize:10,fontWeight:600,
                    }}>{b.store_id}</span>
                  )}
                  <Pill tone={b.tone}>{b.tone}</Pill>
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0}}>
                {store && (
                  <button className="btn ghost sm" onClick={() => onSelectStore(store)}>
                    Open store
                  </button>
                )}
                {!b.resolved && (
                  <button className="btn ghost sm" onClick={() => onResolve(b.id)}>
                    Resolve
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// STORE EDIT MODAL
// ============================================================
function StoreEditModal({ store, open, onClose, onSave }) {
  const blank = { id:"",retailer:"",storeNum:"",name:"",address:"",region:"",phase:"Planning",health:"green",owner:"Implementation",ownerPerson:"",nextAction:"",due:"",sqft:"",scheduledLive:"",risk:"low" };
  const [form, setForm] = useState(blank);
  useEffect(() => { if (open && store) setForm(store); }, [open, store]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open || !store) return null;
  const set = (k, v) => setForm((f) => ({...f, [k]: v}));
  return (
    <div className="ai-modal-scrim" onMouseDown={onClose}>
      <form className="ai-modal store-edit-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <header className="ai-modal-head">
          <div className="ai-modal-title"><Icon.paper /><span>Edit store</span><span className="muted-tx mono">· {store.id}</span></div>
          <div className="grow" /><span className="muted-tx mono"><Kbd>esc</Kbd></span>
          <button type="button" className="iconbtn" onClick={onClose}><Icon.close /></button>
        </header>
        <div className="flag-body">
          {[["Store ID","id"],["Retailer","retailer"],["Store #","storeNum"],["Name","name"],["Address","address"],["Region","region"],["Owner person","ownerPerson"],["Next action","nextAction"],["Due","due"],["Sqft","sqft"],["Go-live","scheduledLive"]].map(([label,key]) => (
            <label key={key} className="field">
              <span className="field-l">{label}</span>
              <input value={form[key]||""} onChange={(e) => set(key, e.target.value)} />
            </label>
          ))}
          <div className="field">
            <span className="field-l">Phase</span>
            <select className="select-ish mono" value={form.phase} onChange={(e) => set("phase", e.target.value)}>
              {["Planning","Scheduled","COI","Deployment","Live"].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <span className="field-l">Health</span>
            <div className="sev-seg">
              {["green","yellow","red"].map((v) => (
                <button type="button" key={v} className={cx("sev-btn", form.health===v && "is-on")} onClick={() => set("health", v)}>
                  <Dot tone={v} /> {v}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-l">Owner team</span>
            <select className="select-ish mono" value={form.owner} onChange={(e) => set("owner", e.target.value)}>
              {TEAMS.map((t) => <option key={t.id}>{t.id}</option>)}
            </select>
          </div>
        </div>
        <div className="flag-foot">
          <div className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary"><Icon.check /> Save changes</button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// ADD STORE MODAL
// ============================================================
function AddStoreModal({ open, onClose, onAdd }) {
  const blank = { id:"", retailer:"", storeNum:"", name:"", address:"", region:"",
    phase:"Planning", health:"green", owner:"Implementation", ownerPerson:"",
    nextAction:"", due:"", sqft:"", scheduledLive:"", openedOn: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
    dueDelta:"", risk:"low", fixtureCount:0, skus:0, retailerCode:"" };
  const [form, setForm] = useState(blank);
  useEffect(() => { if (open) setForm(blank); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  const set = (k, v) => setForm((f) => ({...f, [k]: v}));
  return (
    <div className="ai-modal-scrim" onMouseDown={onClose}>
      <form className="ai-modal store-edit-modal" onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (!form.id.trim()||!form.retailer.trim()) return; onAdd({...form,id:form.id.trim().toUpperCase()}); }}>
        <header className="ai-modal-head">
          <div className="ai-modal-title"><Icon.plus /><span>Add new store</span></div>
          <div className="grow" /><span className="muted-tx mono"><Kbd>esc</Kbd></span>
          <button type="button" className="iconbtn" onClick={onClose}><Icon.close /></button>
        </header>
        <div className="flag-body">
          <label className="field"><span className="field-l">Store ID *</span><input autoFocus value={form.id} onChange={(e) => set("id",e.target.value)} placeholder="e.g. WFM-1248" /></label>
          <label className="field"><span className="field-l">Retailer *</span><input value={form.retailer} onChange={(e) => set("retailer",e.target.value)} placeholder="e.g. Whole Foods Market" /></label>
          <label className="field"><span className="field-l">Store #</span><input value={form.storeNum} onChange={(e) => set("storeNum",e.target.value)} placeholder="e.g. 1248" /></label>
          <label className="field"><span className="field-l">Name</span><input value={form.name} onChange={(e) => set("name",e.target.value)} placeholder="e.g. Boston — Back Bay" /></label>
          <label className="field"><span className="field-l">Address</span><input value={form.address} onChange={(e) => set("address",e.target.value)} /></label>
          <label className="field"><span className="field-l">Region</span><input value={form.region} onChange={(e) => set("region",e.target.value)} /></label>
          <div className="field"><span className="field-l">Phase</span>
            <select className="select-ish mono" value={form.phase} onChange={(e) => set("phase",e.target.value)}>
              {["Planning","Scheduled","COI","Deployment","Live"].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <label className="field"><span className="field-l">Owner person</span><input value={form.ownerPerson} onChange={(e) => set("ownerPerson",e.target.value)} /></label>
          <label className="field"><span className="field-l">Go-live target</span><DatePicker value={form.scheduledLive} onChange={(v) => set("scheduledLive", v)} placeholder="Pick go-live date" /></label>
        </div>
        <div className="flag-foot">
          <span className="muted-tx mono">* required</span>
          <div className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!form.id.trim()||!form.retailer.trim()}><Icon.plus /> Add store</button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// TEAM MODAL
// ============================================================
function TeamModal({ open, onClose, team, onSave }) {
  const [members, setMembers] = useState(team);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm]       = useState(null);
  useEffect(() => { if (open) { setMembers(team); setEditIdx(null); setForm(null); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key==="Escape") { if (editIdx!==null) { setEditIdx(null); setForm(null); } else onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose, editIdx]);
  if (!open) return null;

  const startEdit = (i) => { setEditIdx(i); setForm(i==="new" ? {name:"",role:"",team:"Implementation",load:"active",initials:"",since:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})} : {...members[i]}); };
  const saveEdit  = () => {
    if (!form.name.trim()) return;
    const initials = form.initials.trim() || form.name.trim().split(" ").map((w)=>w[0]).join("").slice(0,2).toUpperCase();
    const member = {...form, initials};
    if (editIdx==="new") setMembers((m) => [...m, member]);
    else setMembers((m) => m.map((x,i) => i===editIdx ? member : x));
    setEditIdx(null); setForm(null);
  };

  return (
    <div className="ai-modal-scrim" onMouseDown={onClose}>
      <div className="ai-modal team-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="ai-modal-head">
          <div className="ai-modal-title"><span>Team members</span></div>
          <div className="grow" /><button className="iconbtn" onClick={onClose}><Icon.close /></button>
        </header>
        <div className="team-modal-body">
          <ul className="team-edit-list">
            {members.map((m, i) => (
              <li key={i} className={cx("team-edit-row", editIdx===i && "is-editing")}>
                {editIdx===i ? (
                  <div className="team-inline-form">
                    <input className="team-field" placeholder="Full name *" value={form.name} onChange={(e) => setForm((f)=>({...f,name:e.target.value}))} autoFocus />
                    <input className="team-field" placeholder="Role / title" value={form.role} onChange={(e) => setForm((f)=>({...f,role:e.target.value}))} />
                    <select className="select-ish mono" value={form.team} onChange={(e) => setForm((f)=>({...f,team:e.target.value}))}>
                      {TEAMS.map((t) => <option key={t.id}>{t.id}</option>)}
                    </select>
                    <select className="select-ish mono" value={form.load} onChange={(e) => setForm((f)=>({...f,load:e.target.value}))}>
                      {["primary","active","watching"].map((l) => <option key={l}>{l}</option>)}
                    </select>
                    <div className="team-form-actions">
                      <button className="btn primary sm" onClick={saveEdit} disabled={!form.name.trim()}><Icon.check /> Save</button>
                      <button className="btn ghost sm" onClick={() => { setEditIdx(null); setForm(null); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="avatar avatar-sm mono">{m.initials}</span>
                    <div className="contact-text">
                      <div className="contact-name">{m.name}</div>
                      <div className="contact-sub">{m.role} · {m.team}</div>
                    </div>
                    <Pill tone={m.load==="primary"?"watch":"info"}>{m.load}</Pill>
                    <button className="btn ghost sm" onClick={() => startEdit(i)}>Edit</button>
                    <button className="btn ghost sm" style={{color:"var(--bad)"}} onClick={() => setMembers((ms) => ms.filter((_,idx)=>idx!==i))}>Remove</button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {editIdx === "new" ? (
            <div className="team-inline-form team-new-form">
              <input className="team-field" placeholder="Full name *" value={form.name} onChange={(e) => setForm((f)=>({...f,name:e.target.value}))} autoFocus />
              <input className="team-field" placeholder="Role / title" value={form.role} onChange={(e) => setForm((f)=>({...f,role:e.target.value}))} />
              <select className="select-ish mono" value={form.team} onChange={(e) => setForm((f)=>({...f,team:e.target.value}))}>
                {TEAMS.map((t) => <option key={t.id}>{t.id}</option>)}
              </select>
              <select className="select-ish mono" value={form.load} onChange={(e) => setForm((f)=>({...f,load:e.target.value}))}>
                {["primary","active","watching"].map((l) => <option key={l}>{l}</option>)}
              </select>
              <div className="team-form-actions">
                <button className="btn primary sm" onClick={saveEdit} disabled={!form.name.trim()}><Icon.plus /> Add</button>
                <button className="btn ghost sm" onClick={() => { setEditIdx(null); setForm(null); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn ghost" style={{marginTop:8}} onClick={() => startEdit("new")}><Icon.plus /> Add team member</button>
          )}
        </div>
        <div className="flag-foot">
          <span className="muted-tx mono">{members.length} members</span>
          <div className="grow" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(members)}><Icon.check /> Save team</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CSV IMPORT MODAL
// ============================================================
function ImportCSVModal({ open, onClose, existingStores, onImport }) {
  const [preview, setPreview]   = useState(null); // parsed rows
  const [errors,  setErrors]    = useState([]);
  const [step,    setStep]      = useState("upload"); // upload | preview | done
  const fileRef = useRef();

  useEffect(() => { if (open) { setPreview(null); setErrors([]); setStep("upload"); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const downloadTemplate = () => {
    const cols = ["id","retailer","store_num","name","address","region","phase","health","owner_person","go_live","sqft","risk"];
    const example = ["WFM-1248","Whole Foods Market","1248","Boston — Back Bay","123 Newbury St Boston MA 02116","Northeast","Planning","green","Jordan Reyes","Aug 1 2026","42000","low"];
    const csv = [cols.join(","), example.join(",")].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "storeops_import_template.csv";
    a.click();
  };

  const parseCSV = (text) => {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) return { rows: [], errs: ["File must have a header row and at least one data row."] };
    const headers = lines[0].split(",").map(s => s.trim().toLowerCase().replace(/\s+/g,"_"));
    const get = (row, ...keys) => { for (const k of keys) { const i = headers.indexOf(k); if (i >= 0 && row[i]?.trim()) return row[i].trim(); } return ""; };
    const rows = []; const errs = [];
    const existingIds = new Set(existingStores.map(s => s.id));
    for (let i = 1; i < lines.length; i++) {
      // handle quoted CSV fields
      const row = lines[i].match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g)?.map(v => v.replace(/^"|"$/g,"").trim()) || lines[i].split(",");
      const id  = (get(row,"id","store_id") || "").toUpperCase();
      if (!id) { errs.push(`Row ${i+1}: missing ID — skipped`); continue; }
      const retailer = get(row,"retailer","retailer_name");
      if (!retailer) { errs.push(`Row ${i+1} (${id}): missing retailer — skipped`); continue; }
      // Duplicate check: same id AND same retailer = duplicate
      const isDup = existingStores.some(s => s.id === id && s.retailer.toLowerCase() === retailer.toLowerCase());
      if (isDup) { errs.push(`Row ${i+1} (${id}): duplicate — skipped`); continue; }
      rows.push({
        id, retailer, retailerCode: id.split("-")[0],
        storeNum: get(row,"store_num","store_number","num"),
        name: get(row,"name","store_name"),
        address: get(row,"address"),
        region: get(row,"region"),
        phase: get(row,"phase") || "Planning",
        health: get(row,"health") || "green",
        owner: "Implementation", ownerPerson: get(row,"owner_person","owner"),
        scheduledLive: get(row,"go_live","go-live","golive","scheduled_live"),
        sqft: get(row,"sqft","square_feet"),
        risk: get(row,"risk") || "low",
        openedOn: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
        dueDelta:"", due:"", nextAction:"", fixtureCount:0, skus:0,
      });
    }
    return { rows, errs };
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows, errs } = parseCSV(e.target.result);
      setPreview(rows); setErrors(errs);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  return (
    <div className="ai-modal-scrim" onMouseDown={onClose}>
      <div className="ai-modal store-edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="ai-modal-head">
          <div className="ai-modal-title"><Icon.arrowU /><span>Import stores from CSV</span></div>
          <div className="grow" />
          <button className="iconbtn" onClick={onClose}><Icon.close /></button>
        </header>

        {step === "upload" && (
          <div className="flag-body" style={{alignItems:"flex-start",gap:16}}>
            <div style={{fontSize:"var(--t13)",color:"var(--fg-2)",lineHeight:1.6}}>
              Upload a CSV file to create multiple stores at once. Stores with the same ID <em>and</em> retailer will be skipped. Different retailers can share a store number.
            </div>
            <button className="btn ghost" onClick={downloadTemplate}><Icon.paper /> Download CSV template</button>
            <div className="csv-drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}>
              <Icon.arrowU />
              <span>Drop CSV file here or click to browse</span>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{display:"none"}}
                onChange={(e) => handleFile(e.target.files[0])} />
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flag-body" style={{padding:0,maxHeight:"60vh",overflowY:"auto"}}>
            {errors.length > 0 && (
              <div style={{padding:"10px 20px",background:"var(--warn-soft)",borderBottom:"1px solid var(--border)"}}>
                <div style={{fontWeight:600,fontSize:"var(--t12)",color:"var(--warn)",marginBottom:4}}>⚠ {errors.length} row(s) skipped</div>
                {errors.map((e,i) => <div key={i} style={{fontSize:"var(--t12)",color:"var(--fg-2)"}}>{e}</div>)}
              </div>
            )}
            {preview.length === 0 ? (
              <div style={{padding:"20px",textAlign:"center",color:"var(--muted-fg)"}}>No new stores to import (all were duplicates or had errors).</div>
            ) : (
              <table className="ftbl" style={{margin:0,border:0,borderRadius:0}}>
                <thead><tr>
                  <th>ID</th><th>Retailer</th><th>Name</th><th>Phase</th><th>Region</th><th>Go-live</th>
                </tr></thead>
                <tbody>
                  {preview.map((s) => (
                    <tr key={s.id}>
                      <td className="mono">{s.id}</td>
                      <td>{s.retailer}</td>
                      <td>{s.name || "—"}</td>
                      <td>{s.phase}</td>
                      <td>{s.region || "—"}</td>
                      <td className="mono">{s.scheduledLive || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="flag-foot">
          {step === "preview" && (
            <button className="btn ghost sm" onClick={() => setStep("upload")}><Icon.chevR style={{transform:"rotate(180deg)"}} /> Back</button>
          )}
          <div className="grow" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          {step === "preview" && preview.length > 0 && (
            <button className="btn primary" onClick={() => { onImport(preview); }}>
              <Icon.check /> Import {preview.length} store{preview.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// USER PICKER MODAL
// ============================================================
function UserPickerModal({ open, onClose, team, activeUser, onSelect }) {
  const [custom, setCustom] = useState("");
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;

  const allUsers = team.map(m=>m.name).filter(Boolean);

  return (
    <div className="ai-modal-scrim" onMouseDown={onClose}>
      <div className="ai-modal" style={{width:"min(360px,90vw)"}} onMouseDown={(e) => e.stopPropagation()}>
        <header className="ai-modal-head">
          <div className="ai-modal-title"><span>Switch active user</span></div>
          <div className="grow" />
          <button className="iconbtn" onClick={onClose}><Icon.close /></button>
        </header>
        <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
          <div style={{fontSize:"var(--t12)",color:"var(--muted-fg)",marginBottom:4}}>
            All notes, tasks, and actions will be attributed to the selected user.
          </div>
          {allUsers.map((name) => (
            <button key={name}
              className={cx("btn", activeUser===name ? "primary" : "ghost")}
              style={{justifyContent:"flex-start",gap:10}}
              onClick={() => onSelect(name)}>
              <span className="avatar avatar-xs mono">{name.split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
              {name}
              {activeUser===name && <span style={{marginLeft:"auto",fontSize:"var(--t12)"}}>✓ active</span>}
            </button>
          ))}
          <div style={{borderTop:"1px solid var(--border)",paddingTop:8,marginTop:4}}>
            <div style={{fontSize:"var(--t12)",color:"var(--muted-fg)",marginBottom:6}}>Or enter a custom name:</div>
            <div style={{display:"flex",gap:6}}>
              <input className="new-task-title" style={{flex:1}} placeholder="Custom name…"
                value={custom} onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => { if (e.key==="Enter" && custom.trim()) onSelect(custom.trim()); }} />
              <button className="btn primary" disabled={!custom.trim()} onClick={() => {
                onSelect(custom.trim());
                try { localStorage.setItem("storeops_active_user", custom.trim()); } catch {}
              }}>
                <Icon.check />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// APP
// ============================================================
function App() {
  const [tweaks, setTweak] = useTweaks(window.__TWEAK_DEFAULTS__ || {});
  const [tab, setTab]             = useState("overview");
  const [navView, setNavView]     = useState("store");
  const [aiOpen, setAiOpen]       = useState(false);
  const [flagOpen, setFlagOpen]   = useState(false);
  const [phaseOpen, setPhaseOpen] = useState(null);
  const [subState, setSubState]   = useState({});
  const [phaseTasks, setPhaseTasks] = useState({});

  const [entries,    setEntries]    = useState([]);
  const [liveTasks,  setLiveTasks]  = useState([]);
  const [liveFlags,  setLiveFlags]  = useState([]);
  const [liveFiles,  setLiveFiles]  = useState([]);
  const [liveTeam,   setLiveTeam]   = useState(TEAM);
  const [blockers,   setBlockers]   = useState([]);
  const [allStoreTasks,    setAllStoreTasks]    = useState([]);
  const [allStoreFlags,    setAllStoreFlags]    = useState([]);
  const [allStoreBlockers, setAllStoreBlockers] = useState([]);
  const [storeData,  setStoreData]  = useState(null);
  const [allStores,  setAllStores]  = useState([]);

  const [loading,        setLoading]        = useState(false);
  const [dbError,        setDbError]        = useState(null);
  const [toast,          setToast]          = useState(null);
  const [editStoreOpen,  setEditStoreOpen]  = useState(false);
  const [addStoreOpen,   setAddStoreOpen]   = useState(false);
  const [teamOpen,       setTeamOpen]       = useState(false);
  const [importOpen,     setImportOpen]     = useState(false);
  const [navW,           setNavW]           = useState(220);
  const [railW,          setRailW]          = useState(300);
  const [activeStoreId,  setActiveStoreId]  = useState(null); // null = no store selected
  const [activeUser,     setActiveUser]     = useState(() => {
    try {
      return localStorage.getItem("storeops_active_user")
          || sessionStorage.getItem("storeops_active_user")
          || "";
    } catch { return ""; }
  });
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const composerRef = useRef();
  const activeStoreIdRef = useRef(null);

  // ── Load from Supabase ────────────────────────────────────
  useEffect(() => {
    if (!SB.configured()) return; // no Supabase, start blank
    setLoading(true);
    Promise.all([SB.listStores(), SB.getAllTasks(), SB.getAllFlags(), SB.getAllBlockers(), SB.getTeam(null)])
      .then(([dbStores, dbAllTasks, dbAllFlags, dbAllBlockers, dbTeam]) => {
        if (dbStores?.length)      setAllStores(dbStores.map(rowToStore));
        if (dbAllTasks?.length)    setAllStoreTasks(dbAllTasks.map(dbRowToTask).map(t=>({...t, store_id: dbAllTasks[dbAllTasks.findIndex(r=>r.id===t.id)]?.store_id})));
        if (dbAllFlags?.length)    setAllStoreFlags(dbAllFlags.map(dbRowToFlag).map((f,i)=>({...f, store_id: dbAllFlags[i]?.store_id})));
        if (dbAllBlockers?.length) setAllStoreBlockers(dbAllBlockers.map(dbRowToBlocker).map((b,i)=>({...b, store_id: dbAllBlockers[i]?.store_id})));
        if (dbTeam?.length)        setLiveTeam(dbTeam.map((r) => ({
          name:r.name, role:r.role, team:r.team, load:r.load, initials:r.initials, since:r.since
        })));
      })
      .catch((e) => setDbError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const flashToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3200);
  };

  const activeUserRef = useRef(activeUser || "");
  useEffect(() => {
    activeUserRef.current = activeUser;
    try {
      if (activeUser) {
        localStorage.setItem("storeops_active_user", activeUser);
        sessionStorage.setItem("storeops_active_user", activeUser);
      }
    } catch {}
  }, [activeUser]);

  const nowStamp = () => {
    const now = new Date();
    return `${now.toLocaleString("en-US",{month:"short",day:"numeric"})} · ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  };

  const goToNotes = () => {
    setNavView("store"); setTab("notes");
    setTimeout(() => {
      const ta = composerRef.current?.querySelector("textarea");
      ta?.focus();
      composerRef.current?.scrollIntoView?.({ block:"start", behavior:"smooth" });
    }, 30);
  };

  // ── Post note ────────────────────────────────────────────
  const postNote = async (n) => {
    const t = nowStamp();
    const noteWithUser = { ...n, who: n.who || activeUserRef.current, t };
    setEntries((es) => [noteWithUser, ...es]);
    flashToast(n.action ? `Note posted · assigned to ${n.team}` : "Note posted");
    if (!SB.configured()) return;
    if (!activeStoreIdRef.current) {
      flashToast("Select a store before posting notes", true);
      return;
    }
    try {
      await SB.insertEntry({
        store_id: activeStoreIdRef.current, t, who: noteWithUser.who,
        team: n.team, kind: n.kind || "note", sev: n.sev,
        title: n.title, body: n.body, action: n.action || false,
        due: n.due, mentions: n.mentions, attachment: n.attachment,
      });
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Create task ──────────────────────────────────────────
  const createTask = async (taskData) => {
    const id = `T-${Date.now()}`;
    const newTask = { id, state:"Open", ...taskData };
    setLiveTasks((ts) => [newTask, ...ts]);
    flashToast("Task created");

    // Track creation in timeline
    const t = nowStamp();
    const entry = {
      kind: "task", who: activeUserRef.current, team: taskData.owner || "—",
      sev: "info", t,
      title: `Task created: ${taskData.title}`,
      body: taskData.due && taskData.due !== "—" ? `Due ${taskData.due}${taskData.owner ? ` · assigned to ${taskData.owner}` : ""}` : taskData.owner ? `Assigned to ${taskData.owner}` : "",
      action: !!taskData.flag,
    };
    setEntries((es) => [entry, ...es]);

    if (!SB.configured()) return;
    try {
      await Promise.all([
        SB.insertTask({ id, store_id:activeStoreIdRef.current, title:taskData.title,
          state:"Open", owner:taskData.owner||"", due:taskData.due||"—", flag:taskData.flag||null }),
        SB.insertEntry({
          store_id: activeStoreIdRef.current, t, who: entry.who,
          team: entry.team, kind: "task", sev: "info",
          title: entry.title, body: entry.body, action: entry.action,
        }),
      ]);
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Update task state ────────────────────────────────────
  const updateTaskState = async (taskId, newState) => {
    const prevTask = liveTasks.find((t) => t.id === taskId);
    const prevState = prevTask?.state || "?";
    setLiveTasks((ts) => ts.map((t) => t.id === taskId ? { ...t, state:newState } : t));
    flashToast(`Task → ${newState}`);

    // Track state change in timeline
    const t = nowStamp();
    const entry = {
      kind: "task", who: activeUserRef.current, team: prevTask?.owner || "—",
      sev: "info", t,
      title: `Task ${taskId} moved: ${prevState} → ${newState}`,
      body: prevTask?.title || "",
      action: false,
    };
    setEntries((es) => [entry, ...es]);

    if (!SB.configured()) return;
    try {
      await Promise.all([
        SB.patchTask(taskId, { state:newState, updated_at:new Date().toISOString() }),
        SB.insertEntry({
          store_id: activeStoreIdRef.current, t, who: entry.who,
          team: entry.team, kind: "task", sev: "info",
          title: entry.title, body: entry.body, action: false,
        }),
      ]);
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Raise flag ───────────────────────────────────────────
  const submitFlag = async ({ label, tone, team, reason }) => {
    const t = nowStamp();
    const newFlag = { label, tone, team, since:"just now", resolved:false, store_id: activeStoreIdRef.current };
    setLiveFlags((fs) => [newFlag, ...fs]);
    setAllStoreFlags((fs) => [newFlag, ...fs]); // keep global view in sync
    setEntries((es) => [{ kind:"note", who:activeUserRef.current, team, sev:tone,
      title:`Flag raised: ${label}`, body:reason||"—",
      action:true, due:"—", mentions:[`@${team.toLowerCase().replace(/ /g,"")}`], t }, ...es]);
    setFlagOpen(false);
    flashToast(`Flag raised · assigned to ${team}`);
    if (!SB.configured()) return;
    try {
      const [flagRow] = await Promise.all([
        SB.insertFlag({ store_id:activeStoreIdRef.current, label, tone, team, since:"just now" }),
        SB.insertEntry({ store_id:activeStoreIdRef.current, t, who:activeUserRef.current, team, kind:"note", sev:tone,
          title:`Flag raised: ${label}`, body:reason||"—",
          action:true, due:"—", mentions:[`@${team.toLowerCase().replace(/ /g,"")}`] }),
      ]);
      if (flagRow?.id) {
        const withId = { ...newFlag, id: flagRow.id };
        setLiveFlags((fs) => fs.map((f) => f===newFlag ? withId : f));
        setAllStoreFlags((fs) => fs.map((f) => f===newFlag ? withId : f));
      }
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Resolve flag ─────────────────────────────────────────
  const resolveFlag = async (flagId) => {
    setLiveFlags((fs) => fs.map((f) => f.id===flagId ? {...f, resolved:true} : f));
    setAllStoreFlags((fs) => fs.map((f) => f.id===flagId ? {...f, resolved:true} : f));
    flashToast("Flag resolved");
    if (!SB.configured()) return;
    try { await SB.resolveFlag(flagId); } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Add blocker ───────────────────────────────────────────
  const addBlocker = async (data) => {
    const optimistic = { id: Date.now(), ...data, resolved:false, store_id: activeStoreIdRef.current };
    setBlockers((bs) => [optimistic, ...bs]);
    setAllStoreBlockers((bs) => [optimistic, ...bs]); // keep global view in sync
    flashToast("Blocker added");
    if (!SB.configured()) return;
    try {
      const row = await SB.insertBlocker({ store_id:activeStoreIdRef.current, ...data });
      if (row?.id) {
        const real = dbRowToBlocker(row);
        setBlockers((bs) => bs.map((b) => b.id===optimistic.id ? real : b));
        setAllStoreBlockers((bs) => bs.map((b) => b.id===optimistic.id ? real : b));
      }
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Resolve blocker ───────────────────────────────────────
  const resolveBlocker = async (blockerId) => {
    setBlockers((bs) => bs.map((b) => b.id===blockerId ? {...b, resolved:true} : b));
    setAllStoreBlockers((bs) => bs.map((b) => b.id===blockerId ? {...b, resolved:true} : b));
    flashToast("Blocker resolved");
    if (!SB.configured()) return;
    try { await SB.resolveBlocker(blockerId); } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Upload file ──────────────────────────────────────────
  const uploadFile = async (file) => {
    const optimistic = { name:file.name, size:"…", who:"me", when:"just now" };
    setLiveFiles((fs) => [optimistic, ...fs]);
    if (!SB.configured()) { flashToast("Configure Supabase to persist files"); return; }
    try {
      const row = await SB.uploadFile(STORE.id, file, "Priya Shah");
      setLiveFiles((fs) => fs.map((f) => f===optimistic ? dbRowToFile(row) : f));
      flashToast(`${file.name} uploaded`);
    } catch (e) {
      setLiveFiles((fs) => fs.filter((f) => f!==optimistic));
      flashToast("Upload failed: " + e.message, true);
    }
  };

  // ── Save store ────────────────────────────────────────────
  const saveStore = async (updated) => {
    setStoreData(updated);
    setAllStores((ss) => ss.map((s) => s.id===updated.id ? updated : s));
    setEditStoreOpen(false);
    flashToast("Store details saved");
    if (!SB.configured()) return;
    try {
      await SB.patchStore(updated.id, {
        retailer:updated.retailer, store_num:updated.storeNum, name:updated.name,
        address:updated.address, region:updated.region, phase:updated.phase,
        health:updated.health, owner:updated.owner, owner_person:updated.ownerPerson,
        next_action:updated.nextAction, due:updated.due,
        sqft:updated.sqft, scheduled_live:updated.scheduledLive,
        updated_at:new Date().toISOString(),
      });
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Add store ─────────────────────────────────────────────
  const addStore = async (newStore) => {
    setAllStores((ss) => [newStore, ...ss]);
    setAddStoreOpen(false);
    // Auto-select the new store with a clean slate
    setActiveStoreId(newStore.id);
    activeStoreIdRef.current = newStore.id;
    setStoreData(newStore);
    setNavView("store");
    setTab("overview");
    setEntries([]); setLiveTasks([]); setLiveFlags([]); setLiveFiles([]); setBlockers([]); setLiveTeam([]);
    flashToast(`Store ${newStore.id} added`);
    if (!SB.configured()) return;
    try {
      await SB.insertStore({
        id:newStore.id, retailer:newStore.retailer,
        retailer_code:newStore.id.split("-")[0],
        store_num:newStore.storeNum, name:newStore.name,
        address:newStore.address, region:newStore.region,
        phase:newStore.phase, health:newStore.health,
        owner:newStore.owner, owner_person:newStore.ownerPerson,
        next_action:newStore.nextAction, due:newStore.due,
        sqft:newStore.sqft, scheduled_live:newStore.scheduledLive,
        opened_on:newStore.openedOn, risk:newStore.risk,
      });
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Save team ─────────────────────────────────────────────
  const saveTeam = async (members) => {
    setLiveTeam(members);
    setTeamOpen(false);
    flashToast("Team saved");
    if (!SB.configured()) return;
    try {
      await SB.replaceTeam(null, members);
      // Reload to confirm
      const rows = await SB.getTeam(null);
      if (rows?.length) setLiveTeam(rows.map((r) => ({
        name:r.name, role:r.role, team:r.team, load:r.load, initials:r.initials, since:r.since
      })));
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Phase helpers ─────────────────────────────────────────
  const toggleSub = (phase, i) => {
    const k = `${phase}:${i}`;
    const prevDone = subState[k] ?? PHASE_DETAIL[phase].subtasks[i].done;
    setSubState((s) => ({...s, [k]: !prevDone}));
    flashToast(`${PHASE_DETAIL[phase].subtasks[i].label} → ${!prevDone ? "done" : "open"}`);
  };
  const postPhaseNote = (phase, text) => postNote({
    kind:"note", who:activeUserRef.current, team:PHASE_DETAIL[phase].owner, sev:"info",
    title:`[${phase}] ${text.split("\n")[0].slice(0,80)}`, body:text, action:false,
  });
  const createPhaseTask = async (phase, { title, team, due }) => {
    const id = `T-${Date.now()}`;
    setPhaseTasks((pt) => ({...pt, [phase]: [...(pt[phase]||[]), {id,title,team,due,state:"Open"}]}));
    const t = nowStamp();
    const entry = { kind:"task", who:activeUserRef.current, team, sev:"info",
      title:`[${phase}] Task created: ${title}`,
      body:`Assigned to ${team} · due ${due}`, action:true, due, t };
    setEntries((es) => [entry, ...es]);
    flashToast(`Task created · assigned to ${team}`);
    if (!SB.configured()) return;
    try {
      await Promise.all([
        SB.insertTask({ id, store_id:activeStoreIdRef.current, title, state:"Open", owner:team, due:due||"—" }),
        SB.insertEntry({ store_id:activeStoreIdRef.current, ...entry }),
      ]);
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Select store ─────────────────────────────────────────
  const selectStore = (s) => {
    setActiveStoreId(s.id);
    activeStoreIdRef.current = s.id;
    setStoreData(s);
    setNavView("store");
    setTab("overview");
    setEntries([]); setLiveTasks([]); setLiveFlags([]); setLiveFiles([]); setBlockers([]); setLiveTeam([]);
    // reload data for this store
    if (!SB.configured()) return;
    setLoading(true);
    Promise.all([
      SB.getEntries(s.id),
      SB.getTasks(s.id),
      SB.getFlags(s.id),
      SB.getFiles(s.id),
      SB.getTeam(s.id),
      SB.getBlockers(s.id),
    ]).then(([dbEntries, dbTasks, dbFlags, dbFiles, dbTeam, dbBlockers]) => {
      setEntries(dbEntries?.length ? dbEntries.map(dbRowToEntry) : []);
      setLiveTasks(dbTasks?.length   ? dbTasks.map(dbRowToTask)   : []);
      setLiveFlags(dbFlags?.length   ? dbFlags.map(dbRowToFlag)   : []);
      setLiveFiles(dbFiles?.length   ? dbFiles.map(dbRowToFile)   : []);
      setBlockers(dbBlockers?.length ? dbBlockers.map(dbRowToBlocker) : []);
      if (dbTeam?.length) setLiveTeam(dbTeam.map((r) => ({name:r.name,role:r.role,team:r.team,load:r.load,initials:r.initials,since:r.since})));
    }).catch((e) => setDbError(e.message))
      .finally(() => setLoading(false));
  };

  // ── Delete store ──────────────────────────────────────────
  const deleteStore = async (storeId) => {
    setAllStores((ss) => ss.filter((s) => s.id !== storeId));
    // If we deleted the active store, switch to first remaining
    if (storeId === activeStoreId) {
      const remaining = allStores.filter((s) => s.id !== storeId);
      if (remaining.length > 0) selectStore(remaining[0]);
    }
    flashToast(`Store ${storeId} deleted`);
    if (!SB.configured()) return;
    try { await SB.deleteStore(storeId); } catch (e) { flashToast("Delete failed: " + e.message, true); }
  };


  // ── Drag-to-resize ───────────────────────────────────────
  const startNavResize = (e) => {
    e.preventDefault();
    const startX = e.clientX, startW = navW;
    const onMove = (ev) => setNavW(Math.max(160, Math.min(380, startW + ev.clientX - startX)));
    const onUp   = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const startRailResize = (e) => {
    e.preventDefault();
    const startX = e.clientX, startW = railW;
    const onMove = (ev) => setRailW(Math.max(240, Math.min(480, startW - ev.clientX + startX)));
    const onUp   = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Edit note ─────────────────────────────────────────────
  const editNote = async (entry, updates) => {
    setEntries((es) => es.map((e) => e === entry ? { ...e, ...updates } : e));
    flashToast("Note updated");
    if (!SB.configured() || !entry.id) return;
    try {
      await SB.req(`/timeline_entries?id=eq.${entry.id}`, { method: "PATCH", prefer: "return=minimal", body: { title: updates.title, body: updates.body } });
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Delete note ───────────────────────────────────────────
  const deleteNote = async (entry) => {
    if (!window.confirm("Delete this note?")) return;
    setEntries((es) => es.filter((e) => e !== entry));
    flashToast("Note deleted");
    if (!SB.configured() || !entry.id) return;
    try {
      await SB.req(`/timeline_entries?id=eq.${entry.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    } catch (e) { flashToast("Sync failed: " + e.message, true); }
  };

  // ── Hotkeys ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches?.("input, textarea, select")) return;
      const map = {"1":"overview","2":"timeline","3":"notes","4":"tasks","5":"comms","6":"files","7":"audit"};
      if (map[e.key]) { setNavView("store"); setTab(map[e.key]); }
      if (e.key.toLowerCase()==="n" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); goToNotes(); }
      if (e.key.toLowerCase()==="f" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setFlagOpen(true); }
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="j") { e.preventDefault(); setAiOpen((o) => !o); }
      if (e.key==="Escape") { setAiOpen(false); setFlagOpen(false); setPhaseOpen(null); }
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

  const isStoreView = navView === "store" && activeStoreId !== null && storeData !== null;

  return (
    <div className="app" style={{"--nav-w": navW+"px", "--rail-w": railW+"px"}}>
      <div style={{display:"flex",flexShrink:0,width:"var(--nav-w)",position:"relative"}}>
      <LeftNav
        stores={allStores}
        allTasks={liveTasks}
        allFlags={liveFlags}
        allBlockers={blockers}
        onAddStore={() => setAddStoreOpen(true)}
        onImportCSV={() => setImportOpen(true)}
        onNavSelect={setNavView}
        navView={navView}
        activeStoreId={activeStoreId}
        onSelectStore={selectStore}
        onDeleteStore={deleteStore}
        activeUser={activeUser}
        onChangeUser={() => setUserPickerOpen(true)}
      />
      <div className="resize-handle resize-handle-right" onMouseDown={startNavResize} />
      </div>

      <main className="main">
        {isStoreView && (
          <StoreHeader store={storeData} tweaks={tweaks}
            onNewNote={goToNotes} onFlag={() => setFlagOpen(true)}
            onPhaseSelect={setPhaseOpen} onEdit={() => setEditStoreOpen(true)}
            onShowAll={() => { setActiveStoreId(null); activeStoreIdRef.current=null; setStoreData(null); setNavView("store"); }} />
        )}
        {isStoreView && <TabBar active={tab} onSelect={setTab} counts={{
  timeline: entries.length,
  notes: entries.filter((e) => e.kind==="note").length,
  tasks: liveTasks.filter((t) => t.state!=="Done").length,
  comms: entries.filter((e) => e.kind==="comm").length,
  files: liveFiles.length,
}} />}

        {!SB.configured() && (
          <div className="config-banner">
            ⚠ Supabase not configured — changes won't persist. Add credentials to index.html.
          </div>
        )}
        {dbError && <div className="config-banner config-banner-error">⚠ Supabase error: {dbError}</div>}

        <div className="content">
          <div className="content-main">
            {loading && <div className="loading-bar" />}

            {/* No store selected → welcome dashboard */}
            {!activeStoreId && navView === "store" && (
              <WelcomeDashboard stores={allStores} onSelectStore={selectStore} onAddStore={() => setAddStoreOpen(true)} onImportCSV={() => setImportOpen(true)} />
            )}

            {/* Global nav views */}
            {navView === "tasks"    && <GlobalTasksView tasks={SB.configured() ? allStoreTasks : liveTasks} onStateChange={updateTaskState} storeId={activeStoreId} flashToast={flashToast} allStores={allStores} onSelectStore={selectStore} />}
            {navView === "flags"    && <GlobalFlagsView flags={SB.configured() ? allStoreFlags : liveFlags} onResolve={resolveFlag} allStores={allStores} onSelectStore={selectStore} />}
            {navView === "blockers" && <GlobalBlockersView blockers={SB.configured() ? allStoreBlockers : blockers} flagBlockers={SB.configured() ? allStoreFlags : liveFlags} onAdd={addBlocker} onResolve={resolveBlocker} storeId={activeStoreId} flashToast={flashToast} allStores={allStores} onSelectStore={selectStore} />}

            {/* Store tabs */}
            {isStoreView && tab === "overview"  && <Overview store={storeData} onSaveStore={saveStore} flags={liveFlags} tasks={liveTasks} />}
            {isStoreView && tab === "timeline"  && <Timeline entries={entries} onEdit={editNote} onDelete={deleteNote} />}
            {isStoreView && tab === "notes"     && <Notes notes={entries.filter((e) => e.kind==="note")} composerRef={composerRef} onPost={postNote} onEdit={editNote} onDelete={deleteNote} activeUser={activeUser} />}
            {isStoreView && tab === "tasks"     && (
              <Tasks tasks={liveTasks} onCreate={createTask} onStateChange={updateTaskState}
                blockers={blockers} onAddBlocker={addBlocker} onResolveBlocker={resolveBlocker}
                storeId={activeStoreId} flashToast={flashToast} activeUser={activeUser} />
            )}
            {isStoreView && tab === "comms"     && <Comms entries={entries} />}
            {isStoreView && tab === "files"     && <Files files={liveFiles} onUpload={uploadFile} />}
            {isStoreView && tab === "audit"     && <Audit entries={entries} tasks={liveTasks} files={liveFiles} />}
          </div>
          {tweaks.showRail && isStoreView && (
            <div style={{display:"flex",flexShrink:0,width:"var(--rail-w)",position:"relative"}}>
              <div className="resize-handle resize-handle-left" onMouseDown={startRailResize} />
              <RightRail onAskAI={() => setAiOpen(true)} flags={liveFlags} onFlag={() => setFlagOpen(true)} team={liveTeam} onEditTeam={() => setTeamOpen(true)} tasks={liveTasks} blockers={blockers} store={storeData} />
            </div>
          )}
        </div>
      </main>

      <button className={cx("ai-fab", aiOpen && "is-open")} onClick={() => setAiOpen((o) => !o)} title="Ask AI (⌘J)">
        <Icon.spark /><span>Ask AI</span><Kbd>⌘J</Kbd>
      </button>

      <AIModal open={aiOpen} onClose={() => setAiOpen(false)} />
      <ImportCSVModal open={importOpen} onClose={() => setImportOpen(false)} existingStores={allStores} onImport={(stores) => { stores.forEach(addStore); setImportOpen(false); flashToast(`${stores.length} store(s) imported`); }} />
      <UserPickerModal open={userPickerOpen} onClose={() => setUserPickerOpen(false)} team={liveTeam} activeUser={activeUser} onSelect={(u) => { setActiveUser(u); setUserPickerOpen(false); flashToast(`Active user: ${u}`); }} />
      <FlagModal open={flagOpen} onClose={() => setFlagOpen(false)} onSubmit={submitFlag} />
      <StoreEditModal store={storeData} open={editStoreOpen} onClose={() => setEditStoreOpen(false)} onSave={saveStore} />
      <AddStoreModal open={addStoreOpen} onClose={() => setAddStoreOpen(false)} onAdd={addStore} />
      <TeamModal open={teamOpen} onClose={() => setTeamOpen(false)} team={liveTeam} onSave={saveTeam} />
      <PhaseDrawer
        phase={phaseOpen} onClose={() => setPhaseOpen(null)}
        subState={subState} onToggleSub={toggleSub}
        onPostNote={postPhaseNote} onCreateTask={createPhaseTask}
        phaseTasks={phaseOpen ? (phaseTasks[phaseOpen]||[]) : []}
        phaseNotes={phaseOpen ? entries.filter((e) => e.kind==="note" && e.title?.startsWith(`[${phaseOpen}]`)) : []}
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
