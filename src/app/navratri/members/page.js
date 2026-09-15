'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';
import { colors, spacing, type, radii, btn, input as dsInput, card, chip, table as tableStyle, keyframes, alert as alertStyle } from '@/lib/navratri/designSystem';

export default function MembersPage() {
  const { theme } = useTheme();
  const c = colors(theme);
  const t = tableStyle(theme);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventId, setEventId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/navratri/events');
      const data = await res.json();
      if (data.events?.length) setEventId(data.events[0].id);
    })();
  }, []);

  useEffect(() => { if (eventId) loadMembers(); }, [eventId]);

  const loadMembers = async (searchTerm) => {
    setLoading(true);
    try {
      let url = `/api/navratri/members?eventId=${eventId}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const res = await fetch(url);
      const data = await res.json();
      setMembers(data.members || []);
    } catch { }
    finally { setLoading(false); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch('/api/navratri/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', eventId }),
      });
      const data = await res.json();
      if (data.success) { setSyncResult(data); loadMembers(); }
      else { setSyncResult({ error: data.error }); }
    } catch (err) { setSyncResult({ error: err.message }); }
    finally { setSyncing(false); }
  };

  const handleToggleCommittee = async (member) => {
    try {
      await fetch('/api/navratri/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_committee', eventId, odooPartnerId: member.odoo_partner_id, isCommittee: !member.is_committee }),
      });
      loadMembers(search);
    } catch { }
  };

  const filteredMembers = members.filter(m => {
    if (filter === 'general') return m.membership_type === 'general';
    if (filter === 'pioneer') return m.membership_type === 'pioneer';
    if (filter === 'committee') return m.is_committee;
    return true;
  });

  const generalCount = members.filter(m => m.membership_type === 'general').length;
  const pioneerCount = members.filter(m => m.membership_type === 'pioneer').length;
  const committeeCount = members.filter(m => m.is_committee).length;

  return (
    <div style={{ padding: `${spacing.xl}px`, color: c.text, fontFamily: type.fontFamily }}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h1 style={{ ...type.pageTitle, color: c.text, margin: 0 }}>👥 Members</h1>
          <p style={{ ...type.secondary, color: c.muted, marginTop: spacing.xs }}>
            {members.length} total · {generalCount} general · {pioneerCount} pioneer · {committeeCount} committee
          </p>
        </div>
        <div style={{ display: 'flex', gap: spacing.md }}>
          <a href="/navratri" style={{ ...btn('secondary', theme), textDecoration: 'none', ...type.caption }}>← Dashboard</a>
          <button onClick={handleSync} disabled={syncing}
            style={{ ...btn('primary', theme), width: 'auto', ...type.caption, opacity: syncing ? 0.5 : 1 }}>
            {syncing ? '🔄 Syncing…' : '🔄 Sync from Odoo'}
          </button>
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div style={{ ...alertStyle(syncResult.error ? 'error' : 'success', theme), marginBottom: spacing.base }}>
          {syncResult.error ? `❌ ${syncResult.error}` : `✅ Synced ${syncResult.synced} members (${syncResult.generals} general, ${syncResult.pioneers} pioneer)`}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadMembers(search)}
          placeholder="Search by name, phone, or email…"
          style={{ ...dsInput(theme), flex: 1, minWidth: '200px' }} />
        <button onClick={() => loadMembers(search)} style={{ ...btn('primary', theme), width: 'auto', padding: `${spacing.md}px ${spacing.xl}px` }}>Search</button>

        <div style={{ display: 'flex', gap: '3px', background: c.inputBg, borderRadius: `${radii.sm}px`, padding: '3px' }}>
          {[
            { key: 'all', label: `All (${members.length})` },
            { key: 'general', label: `General (${generalCount})` },
            { key: 'pioneer', label: `Pioneer (${pioneerCount})` },
            { key: 'committee', label: `Committee (${committeeCount})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: `${spacing.sm}px ${spacing.md}px`, borderRadius: `${radii.xs}px`, border: 'none',
              ...type.caption,
              background: filter === f.key ? c.primary : 'transparent',
              color: filter === f.key ? '#fff' : c.muted, cursor: 'pointer', transition: 'all 0.15s',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Members table */}
      <div style={{ ...card(theme), overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: spacing['3xl'], textAlign: 'center' }}>
            <div style={{ width: '32px', height: '32px', border: `3px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ ...type.body, color: c.muted }}>Loading members…</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: spacing['3xl'], textAlign: 'center', ...type.body, color: c.muted }}>
            {members.length === 0 ? 'No members synced yet. Click "Sync from Odoo" to import.' : 'No members match your filter.'}
          </div>
        ) : (
          <div style={t.wrapper}>
            <table style={t.table}>
              <thead>
                <tr>
                  {['Name', 'Type', 'Phone', 'Email', 'Odoo ID', 'Committee', 'Last Synced'].map(h => (
                    <th key={h} style={t.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m, i) => (
                  <tr key={m.id || i} style={t.row}>
                    <td style={{ ...t.td, ...type.bodyMedium }}>{m.name}</td>
                    <td style={t.td}>
                      <span style={chip(m.membership_type === 'pioneer' ? 'active' : 'valid', theme)}>
                        {m.membership_type === 'pioneer' ? '🏆 Pioneer' : '👤 General'}
                      </span>
                    </td>
                    <td style={{ ...t.tdMuted, fontFamily: 'monospace' }}>{m.phone}</td>
                    <td style={t.tdMuted}>{m.email}</td>
                    <td style={{ ...t.tdMuted, fontFamily: 'monospace', fontSize: '12px' }}>{m.odoo_partner_id}</td>
                    <td style={t.td}>
                      <button onClick={() => handleToggleCommittee(m)} style={{
                        ...chip(m.is_committee ? 'active' : 'pending', theme),
                        cursor: 'pointer', border: 'none',
                      }}>
                        {m.is_committee ? '✅ Yes' : 'No'}
                      </button>
                    </td>
                    <td style={t.tdMuted}>
                      {m.synced_at ? new Date(m.synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
