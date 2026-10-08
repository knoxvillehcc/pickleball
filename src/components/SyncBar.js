'use client';
import { useState, useEffect, useCallback } from 'react';

function formatStamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd}-${d.getFullYear()} ${h}:${min} ${ap}`;
}

/**
 * Sync button + "Last synced" stamp.
 * scope: 'membership' | 'monthly' | 'pnl'
 * onSynced: called after a successful sync so the page can reload its data.
 * externalStamp: optional ISO timestamp supplied by the page's own data load.
 */
export default function SyncBar({ scope = 'membership', onSynced, externalStamp }) {
  const [stamp, setStamp] = useState(externalStamp || null);
  const [by, setBy] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch(`/api/membership/sync?scope=${scope}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setStamp(d.lastSyncedAt); setBy(d.syncedBy); }
        if (d.tablesMissing) setMsg({ type: 'warn', text: 'Snapshot tables not created yet (run the Supabase SQL once).' });
      })
      .catch(() => {});
  }, [scope]);

  useEffect(() => { if (externalStamp) setStamp(externalStamp); }, [externalStamp]);

  const sync = useCallback(async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/membership/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const d = await res.json();
      if (!d.success) {
        setMsg({ type: 'err', text: d.tablesMissing ? 'Snapshot tables not created yet (run the Supabase SQL once).' : (d.error || 'Sync failed') });
      } else {
        setStamp(d.lastSyncedAt); setBy(d.syncedBy);
        setMsg({ type: 'ok', text: 'Synced from Odoo' });
        if (onSynced) await onSynced();
        setTimeout(() => setMsg(null), 4000);
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  }, [scope, onSynced]);

  const colors = { ok: 'var(--text-success)', err: '#dc2626', warn: '#d97706' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'right', lineHeight: 1.35 }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Last synced</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {stamp ? formatStamp(stamp) : 'Never'}{by ? <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}> · {by}</span> : null}
        </div>
        {msg && <div style={{ fontSize: '11.5px', fontWeight: 700, color: colors[msg.type] }}>{msg.text}</div>}
      </div>
      <button
        id={`sync-btn-${scope}`}
        onClick={sync}
        disabled={busy}
        style={{
          background: 'transparent', color: 'var(--accent)', fontWeight: 800, fontSize: '14px',
          padding: '11px 22px', borderRadius: '12px', border: '2px solid var(--accent)',
          cursor: busy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
          opacity: busy ? 0.7 : 1, position: 'relative', zIndex: 1,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={busy ? { animation: 'hccSyncSpin 0.8s linear infinite' } : undefined}>
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" />
        </svg>
        {busy ? 'Syncing...' : 'Sync from Odoo'}
      </button>
      <style>{`@keyframes hccSyncSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
