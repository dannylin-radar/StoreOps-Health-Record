/**
 * supabase.js — StoreOps data layer
 *
 * Set your project credentials in .env (or pass via Vite / your bundler):
 *
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 *
 * For the vanilla-HTML build served via index.html the values are read from
 * window.__STOREOPS_CONFIG__ which is injected by the <script> block at the
 * top of index.html.  See index.html for the exact shape.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SUPABASE SCHEMA (run in the SQL editor — project > SQL editor > New query)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * -- Enable Row Level Security on every table and add policies for your auth
 * -- users / service role. The DDL below creates the tables; RLS policies are
 * -- intentionally omitted so you can tailor them to your auth model.
 *
 * create table stores (
 *   id            text primary key,          -- e.g. "WFM-1247"
 *   retailer      text not null,
 *   retailer_code text not null,
 *   store_num     text not null,
 *   name          text not null,
 *   address       text not null,
 *   phase         text not null default 'Planning',
 *   health        text not null default 'green' check (health in ('green','yellow','red')),
 *   owner         text,
 *   owner_person  text,
 *   next_action   text,
 *   due           text,
 *   due_delta     text,
 *   risk          text default 'low',
 *   opened_on     text,
 *   scheduled_live text,
 *   sqft          text,
 *   region        text,
 *   fixture_count int default 0,
 *   skus          int default 0,
 *   created_at    timestamptz default now(),
 *   updated_at    timestamptz default now()
 * );
 *
 * create table timeline_entries (
 *   id         bigserial primary key,
 *   store_id   text not null references stores(id) on delete cascade,
 *   t          text not null,           -- display timestamp string
 *   who        text not null,
 *   team       text,
 *   kind       text not null check (kind in ('note','task','comm','status')),
 *   sev        text,
 *   title      text not null,
 *   body       text,
 *   action     boolean default false,
 *   due        text,
 *   mentions   text[],
 *   attachment text,
 *   created_at timestamptz default now()
 * );
 *
 * create table tasks (
 *   id         text primary key,           -- e.g. "T-1042"
 *   store_id   text not null references stores(id) on delete cascade,
 *   title      text not null,
 *   state      text not null default 'Open' check (state in ('Open','Waiting','Done')),
 *   owner      text,
 *   due        text,
 *   flag       text,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 *
 * create table flags (
 *   id         bigserial primary key,
 *   store_id   text not null references stores(id) on delete cascade,
 *   label      text not null,
 *   tone       text not null check (tone in ('blocker','watch','info')),
 *   team       text,
 *   since      text,
 *   resolved   boolean default false,
 *   created_at timestamptz default now()
 * );
 *
 * create table files (
 *   id         bigserial primary key,
 *   store_id   text not null references stores(id) on delete cascade,
 *   name       text not null,
 *   size       text,
 *   who        text,
 *   bucket_path text,   -- path inside your Supabase Storage bucket
 *   created_at timestamptz default now()
 * );
 *
 * -- Handy view for the right-rail snapshot
 * create view store_summary as
 *   select
 *     s.*,
 *     (select count(*) from timeline_entries e where e.store_id = s.id) as entry_count,
 *     (select count(*) from tasks t where t.store_id = s.id and t.state <> 'Done') as open_tasks,
 *     (select count(*) from flags f where f.store_id = s.id and not f.resolved) as open_flags
 *   from stores s;
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REALTIME (optional but recommended)
 * ─────────────────────────────────────────────────────────────────────────────
 * In Supabase dashboard → Database → Replication, enable replication for:
 *   timeline_entries, tasks, flags
 * Then the subscribeToStore() helper below will push live updates into the UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const cfg = (typeof window !== 'undefined' && window.__STOREOPS_CONFIG__) || {};

const SUPABASE_URL     = cfg.supabaseUrl     || import.meta?.env?.VITE_SUPABASE_URL     || '';
const SUPABASE_ANON_KEY = cfg.supabaseAnonKey || import.meta?.env?.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[StoreOps] Supabase credentials not found. ' +
    'Set window.__STOREOPS_CONFIG__.supabaseUrl / supabaseAnonKey ' +
    'or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars. ' +
    'The app will run with local mock data.'
  );
}

// ─── Tiny fetch wrapper (no SDK dep — works in plain HTML) ───────────────────

async function sb(path, opts = {}) {
  if (!SUPABASE_URL) throw new Error('supabase_not_configured');
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...opts.headers,
    },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw Object.assign(new Error(err.message || 'supabase_error'), { status: res.status, detail: err });
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  /** Sign in with magic link (passwordless). */
  async signInWithOtp(email) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error((await res.json()).error_description || 'otp_failed');
  },

  /** Sign in with email + password. */
  async signInWithPassword(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || 'signin_failed');
    return data; // { access_token, refresh_token, user }
  },

  /** Sign out. */
  async signOut(accessToken) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    });
  },
};

// ─── Stores ──────────────────────────────────────────────────────────────────

export const stores = {
  /** Fetch a single store by ID. Returns null if not found. */
  async get(storeId) {
    const rows = await sb(`/stores?id=eq.${encodeURIComponent(storeId)}&limit=1`);
    return rows?.[0] ?? null;
  },

  /** List all stores, optionally filtered by health / phase. */
  async list({ health, phase, limit = 100 } = {}) {
    let qs = `?limit=${limit}&order=created_at.desc`;
    if (health) qs += `&health=eq.${health}`;
    if (phase)  qs += `&phase=eq.${phase}`;
    return sb(`/stores${qs}`);
  },

  /** Upsert (create-or-update) a store record. */
  async upsert(data) {
    return sb('/stores', { method: 'POST', prefer: 'return=representation,resolution=merge-duplicates', body: data });
  },

  /** Patch specific fields. */
  async patch(storeId, fields) {
    return sb(`/stores?id=eq.${encodeURIComponent(storeId)}`, { method: 'PATCH', body: fields });
  },
};

// ─── Timeline entries ────────────────────────────────────────────────────────

export const timeline = {
  /** Fetch timeline entries for a store, newest first. */
  async list(storeId, { limit = 50, kind } = {}) {
    let qs = `?store_id=eq.${encodeURIComponent(storeId)}&order=created_at.desc&limit=${limit}`;
    if (kind) qs += `&kind=eq.${kind}`;
    return sb(`/timeline_entries${qs}`);
  },

  /** Insert a new entry. */
  async insert(entry) {
    return sb('/timeline_entries', { method: 'POST', body: entry });
  },
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasks = {
  async list(storeId) {
    return sb(`/tasks?store_id=eq.${encodeURIComponent(storeId)}&order=created_at.desc`);
  },

  async insert(task) {
    return sb('/tasks', { method: 'POST', body: task });
  },

  async patch(taskId, fields) {
    return sb(`/tasks?id=eq.${encodeURIComponent(taskId)}`, { method: 'PATCH', body: fields });
  },
};

// ─── Flags ───────────────────────────────────────────────────────────────────

export const flags = {
  async list(storeId) {
    return sb(`/flags?store_id=eq.${encodeURIComponent(storeId)}&resolved=eq.false&order=created_at.desc`);
  },

  async insert(flag) {
    return sb('/flags', { method: 'POST', body: flag });
  },

  async resolve(flagId) {
    return sb(`/flags?id=eq.${flagId}`, { method: 'PATCH', body: { resolved: true } });
  },
};

// ─── Files ───────────────────────────────────────────────────────────────────

export const files = {
  async list(storeId) {
    return sb(`/files?store_id=eq.${encodeURIComponent(storeId)}&order=created_at.desc`);
  },

  /**
   * Upload a file to Supabase Storage then record it in the files table.
   * bucketName defaults to 'storeops-files'.
   */
  async upload(storeId, file, { bucketName = 'storeops-files', uploadedBy = '' } = {}) {
    if (!SUPABASE_URL) throw new Error('supabase_not_configured');
    const path = `${storeId}/${Date.now()}_${file.name}`;
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucketName}/${path}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      }
    );
    if (!uploadRes.ok) throw new Error('upload_failed');

    return files.insert({
      store_id: storeId,
      name: file.name,
      size: formatFileSize(file.size),
      who: uploadedBy,
      bucket_path: path,
    });
  },

  async insert(record) {
    return sb('/files', { method: 'POST', body: record });
  },

  /** Get a public or signed URL for a stored file. */
  publicUrl(bucketName, path) {
    return `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${path}`;
  },
};

// ─── Realtime ────────────────────────────────────────────────────────────────

/**
 * Subscribe to live changes for a store's timeline, tasks, and flags.
 *
 * Usage:
 *   const unsub = subscribeToStore('WFM-1247', {
 *     onTimelineInsert: (entry) => ...,
 *     onTaskUpdate:     (task)  => ...,
 *     onFlagInsert:     (flag)  => ...,
 *   });
 *   // later:
 *   unsub();
 *
 * Requires the @supabase/supabase-js client library for WebSocket support.
 * If you're using the plain-HTML build without the SDK, this is a no-op and
 * you should poll instead (see pollStore below).
 */
export function subscribeToStore(storeId, callbacks = {}) {
  if (typeof window === 'undefined' || !window.supabase) {
    console.warn('[StoreOps] supabase-js not loaded; realtime unavailable.');
    return () => {};
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const channel = client
    .channel(`store:${storeId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'timeline_entries', filter: `store_id=eq.${storeId}` },
      (payload) => callbacks.onTimelineInsert?.(payload.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `store_id=eq.${storeId}` },
      (payload) => callbacks.onTaskUpdate?.(payload.new))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flags', filter: `store_id=eq.${storeId}` },
      (payload) => callbacks.onFlagInsert?.(payload.new))
    .subscribe();

  return () => client.removeChannel(channel);
}

/**
 * Fallback polling for environments without WebSocket support.
 * Polls timeline_entries every `intervalMs` and calls onNew for new entries.
 */
export function pollStore(storeId, { intervalMs = 15_000, onNew } = {}) {
  let lastId = null;
  const tick = async () => {
    try {
      const rows = await timeline.list(storeId, { limit: 5 });
      if (!rows?.length) return;
      const newest = rows[0];
      if (lastId !== null && newest.id !== lastId) onNew?.(newest);
      lastId = newest.id;
    } catch { /* silent */ }
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}

// ─── AI / Anthropic helper ───────────────────────────────────────────────────

/**
 * Ask the Anthropic Messages API.
 * Called by the AIModal in app.jsx.
 *
 * For local development set window.__STOREOPS_CONFIG__.anthropicKey.
 * In production, proxy this through an Edge Function so the key is never
 * exposed in the browser (see /supabase/functions/ai-proxy/index.ts).
 */
export async function askAI(prompt, { model = 'claude-sonnet-4-20250514', maxTokens = 800 } = {}) {
  const key = cfg.anthropicKey || '';

  // Production path: use your Supabase Edge Function proxy
  if (!key && SUPABASE_URL) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, model, max_tokens: maxTokens }),
    });
    if (!res.ok) throw new Error('ai_proxy_error');
    const data = await res.json();
    return data.content?.[0]?.text ?? '';
  }

  // Dev path: direct Anthropic API call (key in config)
  if (key) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error('anthropic_api_error');
    const data = await res.json();
    return data.content?.[0]?.text ?? '';
  }

  throw new Error('ai_not_configured');
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Convert a Supabase row (snake_case) to the STORE shape expected by app.jsx.
 * Call this when you fetch a store from Supabase and want to pass it to <App />.
 */
export function rowToStore(row) {
  return {
    id:            row.id,
    retailer:      row.retailer,
    retailerCode:  row.retailer_code,
    storeNum:      row.store_num,
    name:          row.name,
    address:       row.address,
    phase:         row.phase,
    health:        row.health,
    owner:         row.owner,
    ownerPerson:   row.owner_person,
    nextAction:    row.next_action,
    due:           row.due,
    dueDelta:      row.due_delta,
    risk:          row.risk,
    openedOn:      row.opened_on,
    scheduledLive: row.scheduled_live,
    sqft:          row.sqft,
    region:        row.region,
    fixtureCount:  row.fixture_count,
    skus:          row.skus,
  };
}

/**
 * Convert an app.jsx timeline entry object to a Supabase row shape.
 */
export function entryToRow(storeId, entry) {
  return {
    store_id:   storeId,
    t:          entry.t,
    who:        entry.who,
    team:       entry.team,
    kind:       entry.kind,
    sev:        entry.sev,
    title:      entry.title,
    body:       entry.body,
    action:     entry.action ?? false,
    due:        entry.due,
    mentions:   entry.mentions,
    attachment: entry.attachment,
  };
}
