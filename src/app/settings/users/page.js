'use client';
import { useState, useEffect, useCallback } from 'react';

// ── HCC Pages that can be assigned ───────────────────────────────────────────
const HCC_PAGES = [
  { key: 'dashboard',  label: 'Dashboard',      desc: 'Main overview dashboard' },
  { key: 'reports',    label: 'Membership',      desc: 'Member reports & data' },
  { key: 'monthly',    label: 'Monthly Report',  desc: 'Monthly activity report' },
  { key: 'banner',     label: 'Banner In',       desc: 'Banner management' },
  { key: 'pickleball', label: 'Pickleball',      desc: 'Tournament registrations' },
  { key: 'settings',   label: 'Settings',        desc: 'App settings' },
];

const ROLE_COLORS = {
  super_admin: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)', text: '#A78BFA' },
  staff:       { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)',  text: '#60A5FA' },
};

const C = {
  bg:     '#060D1A', card:   '#0D1627', border: 'rgba(51,65,85,0.6)',
  gold:   '#F4A40B', text:   '#E2E8F0', muted:  '#64748B',
  green:  '#10B981', red:    '#EF4444', indigo: '#818CF8',
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const isErr = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px', zIndex: 100,
      padding: '12px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
      background: isErr ? 'rgba(127,29,29,0.95)' : 'rgba(13,20,38,0.97)',
      border: `1px solid ${isErr ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.3)'}`,
      color: isErr ? '#FCA5A5' : '#6EE7B7', fontSize: '14px', fontWeight: '600',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {isErr ? '⚠️' : '✅'} {toast.msg}
    </div>
  );
}

// ── Manage Access Modal ───────────────────────────────────────────────────────
function ManageAccessModal({ targetUser, onClose, onSave, onToast }) {
  const currentPages = Array.isArray(targetUser.allowed_pages)
    ? targetUser.allowed_pages
    : (typeof targetUser.allowed_pages === 'string' ? JSON.parse(targetUser.allowed_pages) : []);

  const isAll = currentPages.includes('*');
  const [allAccess, setAllAccess]     = useState(isAll);
  const [selected,  setSelected]      = useState(isAll ? HCC_PAGES.map(p => p.key) : currentPages);
  const [saving,    setSaving]        = useState(false);

  const toggle = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    setSaving(true);
    const pages = allAccess ? ['*'] : selected;
    const res = await fetch(`/api/auth/users/${targetUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowedPages: pages }),
    });
    if (res.ok) {
      onToast(`Access updated for ${targetUser.email}`);
      onSave({ ...targetUser, allowed_pages: pages });
      onClose();
    } else {
      onToast('Failed to update access', 'error');
    }
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: '16px',
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: '20px', width: '100%', maxWidth: '540px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: C.text }}>Manage Access</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.muted }}>{targetUser.email}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '20px', padding: '0 4px' }}>✕</button>
        </div>

        {/* All Access Toggle */}
        <div style={{ padding: '20px 28px 0' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
            background: allAccess ? 'rgba(244,164,11,0.08)' : 'rgba(30,41,59,0.5)',
            border: `1px solid ${allAccess ? 'rgba(244,164,11,0.25)' : C.border}`,
            borderRadius: '12px', padding: '14px 16px',
          }}>
            <input
              type="checkbox"
              checked={allAccess}
              onChange={e => { setAllAccess(e.target.checked); if (e.target.checked) setSelected(HCC_PAGES.map(p => p.key)); }}
              style={{ width: '18px', height: '18px', accentColor: C.gold, cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px', color: allAccess ? C.gold : C.text }}>
                👑 Full Access (Super Admin equivalent)
              </div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
                Grant access to all current and future pages
              </div>
            </div>
          </label>
        </div>

        {/* Individual Pages */}
        <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: allAccess ? 0.5 : 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
            Individual Pages
          </div>
          {HCC_PAGES.map(page => {
            const on = selected.includes(page.key);
            return (
              <label key={page.key} style={{
                display: 'flex', alignItems: 'center', gap: '12px', cursor: allAccess ? 'default' : 'pointer',
                background: on ? 'rgba(129,140,248,0.08)' : 'rgba(30,41,59,0.3)',
                border: `1px solid ${on ? 'rgba(129,140,248,0.25)' : C.border}`,
                borderRadius: '10px', padding: '12px 14px', transition: 'all 0.15s',
              }}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={allAccess}
                  onChange={() => toggle(page.key)}
                  style={{ width: '16px', height: '16px', accentColor: C.indigo, cursor: allAccess ? 'default' : 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: on ? C.text : C.muted }}>{page.label}</div>
                  <div style={{ fontSize: '12px', color: C.muted }}>{page.desc}</div>
                </div>
                {on && <span style={{ fontSize: '11px', fontWeight: '700', color: C.indigo, background: 'rgba(129,140,248,0.15)', padding: '2px 8px', borderRadius: '20px' }}>✓ On</span>}
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={btnStyle('#1E293B', C.border, C.muted)}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={btnStyle(C.gold, 'transparent', '#000', true)}>
            {saving ? '⏳ Saving…' : '💾 Save Access'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reset PIN Modal ───────────────────────────────────────────────────────────
function ResetPinModal({ targetUser, onClose, onToast }) {
  const [pin,   setPin]   = useState('');
  const [saving,setSaving]= useState(false);

  const handleReset = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) { onToast('PIN must be exactly 6 digits', 'error'); return; }
    setSaving(true);
    const res = await fetch(`/api/auth/users/${targetUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) { onToast('PIN reset successfully'); onClose(); }
    else        { onToast('Failed to reset PIN', 'error'); }
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: '16px',
    }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '360px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '800', color: C.text }}>Reset PIN</h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: C.muted }}>{targetUser.email}</p>
        <input
          type="text" inputMode="numeric" maxLength={6} value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="New 6-digit PIN"
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', marginBottom: '16px',
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
            color: C.text, fontSize: '24px', textAlign: 'center', letterSpacing: '8px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ ...btnStyle('#1E293B', C.border, C.muted), flex: 1 }}>Cancel</button>
          <button onClick={handleReset} disabled={saving || pin.length !== 6} style={{ ...btnStyle(C.gold, 'transparent', '#000', true), flex: 1, opacity: pin.length !== 6 ? 0.5 : 1 }}>
            {saving ? 'Resetting…' : 'Reset PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add User Modal ────────────────────────────────────────────────────────────
function AddUserModal({ onClose, onCreated, onToast }) {
  const [form,   setForm]   = useState({ email: '', pin: '', name: '', role: 'staff', allowedPages: [] });
  const [saving, setSaving] = useState(false);
  const [allAccess, setAllAccess] = useState(false);

  const togglePage = (key) => setForm(f => ({
    ...f,
    allowedPages: f.allowedPages.includes(key) ? f.allowedPages.filter(k => k !== key) : [...f.allowedPages, key],
  }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.pin)) { onToast('PIN must be 6 digits', 'error'); return; }
    setSaving(true);
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, allowedPages: allAccess ? ['*'] : form.allowedPages }),
    });
    const data = await res.json();
    if (res.ok) { onToast('User created'); onCreated(data.user); onClose(); }
    else        { onToast(data.error || 'Failed to create user', 'error'); }
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: '16px',
    }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: C.text }}>Add User</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        <form onSubmit={handleCreate} style={{ padding: '20px 28px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Sarah Jones" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="user@example.com" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>PIN (6 digits)</label>
            <input type="text" inputMode="numeric" maxLength={6} value={form.pin}
              onChange={e => setForm(f => ({...f, pin: e.target.value.replace(/\D/g,'').slice(0,6)}))}
              placeholder="123456" required style={{ ...inputStyle, textAlign: 'center', letterSpacing: '6px', fontSize: '20px' }} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="staff">Staff</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {/* Page Access */}
          <div>
            <label style={labelStyle}>Page Access</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
              background: allAccess ? 'rgba(244,164,11,0.08)' : 'rgba(30,41,59,0.4)',
              border: `1px solid ${allAccess ? 'rgba(244,164,11,0.25)' : C.border}`,
              borderRadius: '10px', padding: '10px 12px', marginBottom: '8px' }}>
              <input type="checkbox" checked={allAccess} onChange={e => { setAllAccess(e.target.checked); if(e.target.checked) setForm(f=>({...f,allowedPages:HCC_PAGES.map(p=>p.key)})); }}
                style={{ width:'16px',height:'16px',accentColor:C.gold,cursor:'pointer' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: allAccess ? C.gold : C.muted }}>👑 All pages (Full Access)</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', opacity: allAccess ? 0.5 : 1 }}>
              {HCC_PAGES.map(page => {
                const on = form.allowedPages.includes(page.key);
                return (
                  <label key={page.key} style={{ display:'flex',alignItems:'center',gap:'10px',cursor:allAccess?'default':'pointer',
                    background: on?'rgba(129,140,248,0.08)':'rgba(30,41,59,0.3)',
                    border:`1px solid ${on?'rgba(129,140,248,0.2)':C.border}`,
                    borderRadius:'8px',padding:'9px 12px' }}>
                    <input type="checkbox" checked={on} disabled={allAccess} onChange={() => togglePage(page.key)}
                      style={{ width:'15px',height:'15px',accentColor:C.indigo,cursor:allAccess?'default':'pointer' }} />
                    <span style={{ fontSize:'13px',fontWeight:'600',color:on?C.text:C.muted }}>{page.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ ...btnStyle('#1E293B', C.border, C.muted), flex: 1 }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...btnStyle(C.gold, 'transparent', '#000', true), flex: 1 }}>
              {saving ? 'Creating…' : '+ Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Shared style helpers ──────────────────────────────────────────────────────
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(51,65,85,0.6)`, color: '#E2E8F0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' };
function btnStyle(bg, borderColor, color, bold = false) {
  return { padding: '11px 20px', borderRadius: '10px', border: `1px solid ${borderColor}`, background: bg, color, fontSize: '13px', fontWeight: bold ? '800' : '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' };
}

// ── Main Users Page ───────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [managingUser, setManagingUser] = useState(null);
  const [resetPinUser, setResetPinUser] = useState(null);
  const [me,           setMe]           = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/auth/users');
    if (res.ok) { const d = await res.json(); setUsers(d.users || []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMe(d.user)).catch(() => {});
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (user) => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    const res = await fetch(`/api/auth/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) { showToast('User deleted'); setUsers(u => u.filter(x => x.id !== user.id)); }
    else        { const d = await res.json(); showToast(d.error || 'Delete failed', 'error'); }
  };

  const handleToggleActive = async (user) => {
    const res = await fetch(`/api/auth/users/${user.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) {
      setUsers(us => us.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
      showToast(`User ${!user.active ? 'activated' : 'deactivated'}`);
    }
  };

  const isSA = me?.role === 'super_admin';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toast toast={toast} />

      {showAdd      && <AddUserModal onClose={() => setShowAdd(false)} onCreated={u => setUsers(us => [...us, u])} onToast={showToast} />}
      {managingUser && <ManageAccessModal targetUser={managingUser} onClose={() => setManagingUser(null)} onSave={updated => setUsers(us => us.map(u => u.id === updated.id ? updated : u))} onToast={showToast} />}
      {resetPinUser && <ResetPinModal targetUser={resetPinUser} onClose={() => setResetPinUser(null)} onToast={showToast} />}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👥</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#F1F5F9', letterSpacing: '-0.5px' }}>User Management</h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: C.muted }}>{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
          </div>
        </div>
        {isSA && (
          <button onClick={() => setShowAdd(true)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366F1, #818CF8)', color: 'white', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit',
          }}>
            + Add User
          </button>
        )}
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.muted }}>
          <div style={{ width: '28px', height: '28px', border: '2px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['User', 'Role', 'Page Access', 'Status', 'Joined', isSA ? 'Actions' : ''].map((h, i) => (
                  <th key={i} style={{ padding: '16px 20px', textAlign: i >= 4 ? 'center' : 'left', fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const roleColor = ROLE_COLORS[u.role] || ROLE_COLORS.staff;
                const pages = Array.isArray(u.allowed_pages) ? u.allowed_pages : (typeof u.allowed_pages === 'string' ? JSON.parse(u.allowed_pages) : []);
                const isFullAccess = pages.includes('*');
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid rgba(51,65,85,0.4)`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,41,59,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {/* User */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1.5px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: C.indigo, flexShrink: 0 }}>
                          {(u.name || u.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#F1F5F9' }}>{u.name || '—'}</div>
                          <div style={{ fontSize: '12px', color: C.muted }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: roleColor.bg, border: `1px solid ${roleColor.border}`, color: roleColor.text }}>
                        {u.role === 'super_admin' ? '👑 Super Admin' : '👤 Staff'}
                      </span>
                    </td>
                    {/* Pages */}
                    <td style={{ padding: '16px 20px', maxWidth: '220px' }}>
                      {isFullAccess ? (
                        <span style={{ fontSize: '12px', fontWeight: '700', color: C.gold }}>All Pages ✦</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {pages.length === 0 ? (
                            <span style={{ fontSize: '12px', color: C.muted }}>No access</span>
                          ) : pages.map(pk => {
                            const page = HCC_PAGES.find(p => p.key === pk);
                            return (
                              <span key={pk} style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.2)', color: C.indigo }}>
                                {page?.label || pk}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: u.active ? C.green : C.muted, boxShadow: u.active ? `0 0 6px ${C.green}` : 'none' }}/>
                        <span style={{ fontSize: '13px', color: u.active ? C.green : C.muted, fontWeight: '600' }}>{u.active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </td>
                    {/* Joined */}
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '12px', color: C.muted }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    {/* Actions */}
                    {isSA && (
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <ActionBtn onClick={() => setManagingUser(u)} color="#818CF8" bg="rgba(129,140,248,0.1)" label="🔑 Access" />
                          <ActionBtn onClick={() => setResetPinUser(u)} color={C.muted} bg="rgba(30,41,59,0.6)" label="🔢 PIN" />
                          {u.role !== 'super_admin' && (
                            <ActionBtn onClick={() => handleToggleActive(u)} color={u.active ? '#F59E0B' : C.green} bg={u.active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'} label={u.active ? '⏸ Disable' : '▶ Enable'} />
                          )}
                          {String(u.id) !== String(me?.id) && u.role !== 'super_admin' && (
                            <ActionBtn onClick={() => handleDelete(u)} color="#FC8181" bg="rgba(239,68,68,0.1)" label="🗑 Delete" />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: C.muted }}>No users yet. Click + Add User to create one.</div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');`}</style>
    </div>
  );
}

function ActionBtn({ onClick, color, bg, label }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: '8px', border: `1px solid ${color}33`,
      background: bg, color, fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
      whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}>{label}</button>
  );
}
