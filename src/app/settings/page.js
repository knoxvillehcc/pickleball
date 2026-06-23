'use client';
import { useState, useEffect } from 'react';

const ServerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
);
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);
const WifiIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>
);

const InputField = ({ label, hint, ...props }) => (
  <div>
    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>{label}</label>
    <input
      style={{
        width: '100%',
        padding: '14px 20px',
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        color: 'var(--text-primary)',
        fontSize: '14px',
        fontWeight: '500',
        outline: 'none',
        fontFamily: 'inherit',
      }}
      {...props}
    />
    {hint && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '500' }}>{hint}</p>}
  </div>
);

export default function SettingsPage() {
  const [formData, setFormData] = useState({ url: '', db: '', username: '', password: '', environment: 'production', dryRunDefault: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d.url) setFormData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      alert('Error saving settings');
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.success ? data.message : data.error });
    } catch (error) {
      setTestResult({ success: false, message: error.message || 'Network error.' });
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <div style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '15px' }}>Loading Configuration...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>
      
      {/* Page Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '38px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
           System <span style={{ background: 'linear-gradient(135deg, #818CF8, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Settings</span>
        </h1>
        <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>
           Configure your Odoo instance connection to enable live database access.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Connection Config Card */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
           <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-table-header)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', color: '#818CF8', justifyContent: 'center' }}><ServerIcon /></div>
              <div>
                 <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Odoo Connection</h2>
                 <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '12px' }}>Instance URL, database name and credentials</p>
              </div>
           </div>
           <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <InputField
                label="Odoo URL"
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                placeholder="https://your-company.odoo.com"
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <InputField
                  label="Database Name"
                  type="text"
                  value={formData.db}
                  onChange={(e) => setFormData({...formData, db: e.target.value})}
                  placeholder="your-company-db"
                  required
                />
                <InputField
                  label="Email / Username"
                  type="email"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="admin@company.com"
                  required
                />
              </div>
              <InputField
                label="Password / API Key"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter API key or password"
                hint="Use your Odoo App API Key for maximum security."
                required
              />
           </div>
        </div>

        {/* Security Note Card */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
           <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}><ShieldIcon /></div>
           <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Security Notice</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                 Credentials are stored locally in your environment file and are never transmitted to third parties. Use a dedicated API key with least-privilege access for enhanced security.
              </p>
           </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid ' + (testResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'), backgroundColor: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: testResult.success ? '#10B981' : '#F43F5E', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>{testResult.success ? '✓' : '✗'}</span>
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Save Success */}
        {saveSuccess && (
          <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>✓</span>
            <span>Settings saved successfully!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', flexWrap: 'wrap' }}>
           <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !formData.url || !formData.db || !formData.username || !formData.password}
              style={{
                flex: 1, minWidth: '200px', backgroundColor: 'var(--bg-button-secondary)', border: '1px solid var(--border-button-secondary)',
                color: 'var(--text-button-secondary)', fontWeight: '700', padding: '14px 28px', borderRadius: '12px',
                cursor: (testing || !formData.url || !formData.db || !formData.username || !formData.password) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px', transition: 'all 0.3s',
              }}
           >
              {testing ? (
                <><span style={{ display:'inline-block', width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></span> Testing...</>
              ) : (
                <><WifiIcon /> Test Connection</>
              )}
           </button>
           
           <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, minWidth: '200px', background: 'linear-gradient(135deg, #6366F1, #22D3EE)',
                color: 'white', fontWeight: '700', padding: '14px 28px', borderRadius: '12px', border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px', transition: 'all 0.3s',
                boxShadow: '0 0 30px -8px rgba(99,102,241,0.4)',
              }}
           >
              {saving ? (
                <><span style={{ display:'inline-block', width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></span> Saving...</>
              ) : (
                <><SaveIcon /> Save Configuration</>
              )}
           </button>
        </div>

      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}