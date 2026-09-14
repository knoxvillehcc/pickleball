'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';

const T = (theme) => ({
  card: theme === 'dark' ? '#1e293b' : '#FFFFFF',
  border: theme === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
  text: theme === 'dark' ? '#F8FAFC' : '#0f172a', muted: theme === 'dark' ? '#94A3B8' : '#64748B',
  primary: '#FF6B35', green: '#34D399', red: '#EF4444', accent: '#FFD700', blue: '#60A5FA',
});

export default function MembersPage() {
  const { theme } = useTheme();
  const t = T(theme);
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
      if (data.success) {
        setSyncResult(data);
        loadMembers();
      } else {
        setSyncResult({ error: data.error });
      }
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
    <div style={{ padding: '24px 28px', color: t.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>👥 Members</h1>
          <p style={{ color: t.muted, fontSize: '13px', marginTop: '4px' }}>
            {members.length} total • {generalCount} general • {pioneerCount} pioneer • {committeeCount} committee
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/navratri" style={{ padding: '10px 18px', borderRadius: '10px', border: `1px solid ${t.border}`, color: t.text, textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>← Dashboard</a>
          <button onClick={handleSync} disabled={syncing}
            style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: t.primary, color: 'white', fontWeight: '700', cursor: 'pointer', opacity: syncing ? 0.5 : 1 }}>
            {syncing ? '🔄 Syncing...' : '🔄 Sync from Odoo'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '16px',
          background: syncResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${syncResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}`,
          color: syncResult.error ? t.red : t.green, fontSize: '14px',
        }}>
          {syncResult.error ? `❌ ${syncResult.error}` : `✅ Synced ${syncResult.synced} members (${syncResult.generals} general, ${syncResult.pioneers} pioneer)`}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadMembers(search)}
          placeholder="Search by name, phone, or email..."
          style={{ flex: 1, minWidth: '200px', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: '14px', outline: 'none' }} />
        <button onClick={() => loadMembers(search)} style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: t.primary, color: 'white', fontWeight: '700', cursor: 'pointer' }}>Search</button>

        <div style={{ display: 'flex', gap: '4px', background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: '10px', padding: '3px' }}>
          {[
            { key: 'all', label: `All (${members.length})` },
            { key: 'general', label: `General (${generalCount})` },
            { key: 'pioneer', label: `Pioneer (${pioneerCount})` },
            { key: 'committee', label: `Committee (${committeeCount})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '600',
              background: filter === f.key ? t.primary : 'transparent',
              color: filter === f.key ? 'white' : t.muted, cursor: 'pointer',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Members table */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.muted }}>Loading members...</div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.muted }}>
            {members.length === 0 ? 'No members synced yet. Click "Sync from Odoo" to import.' : 'No members match your filter.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {['Name', 'Type', 'Phone', 'Email', 'Odoo ID', 'Committee', 'Last Synced'].map(h => (
                  <th key={h} style={{ padding: '14px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: t.muted, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m, i) => (
                <tr key={m.id || i} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>{m.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      fontSize: '12px', padding: '3px 10px', borderRadius: '8px', fontWeight: '700',
                      background: m.membership_type === 'pioneer' ? 'rgba(255,215,0,0.1)' : 'rgba(96,165,250,0.1)',
                      color: m.membership_type === 'pioneer' ? t.accent : t.blue,
                    }}>
                      {m.membership_type === 'pioneer' ? '🏆 Pioneer' : '👤 General'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: t.muted, fontFamily: 'monospace' }}>{m.phone}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: t.muted }}>{m.email}</td>
                  <td style={{ padding: '12px', fontSize: '12px', fontFamily: 'monospace', color: t.muted }}>{m.odoo_partner_id}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => handleToggleCommittee(m)} style={{
                      padding: '4px 12px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                      background: m.is_committee ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                      color: m.is_committee ? t.green : t.muted,
                    }}>
                      {m.is_committee ? '✅ Yes' : 'No'}
                    </button>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: t.muted }}>
                    {m.synced_at ? new Date(m.synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
