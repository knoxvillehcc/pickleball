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
    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</label>
    <input
      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-5 py-4 text-white font-medium placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all"
      {...props}
    />
    {hint && <p className="text-xs text-slate-500 mt-2 font-medium">{hint}</p>}
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
      <div className="glass-panel flex justify-center items-center py-40 rounded-2xl max-w-3xl mx-auto">
        <div className="flex flex-col items-center gap-4">
           <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-700 border-t-indigo-500"></div>
           <div className="text-lg font-bold text-slate-400">Loading Configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Page Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
           System <span className="text-gradient-primary">Settings</span>
        </h1>
        <p className="text-slate-400 mt-3 text-base leading-relaxed">
           Configure your Odoo instance connection to enable live database access.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Connection Config Card */}
        <div className="glass-panel rounded-2xl overflow-hidden">
           <div className="px-8 py-6 border-b border-slate-800/50 bg-slate-900/30 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400"><ServerIcon /></div>
              <div>
                 <h2 className="text-lg font-bold text-white leading-tight">Odoo Connection</h2>
                 <p className="text-slate-500 text-xs">Instance URL, database name and credentials</p>
              </div>
           </div>
           <div className="p-8 space-y-6">
              <InputField
                label="Odoo URL"
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                placeholder="https://your-company.odoo.com"
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="glass-card rounded-2xl p-6 flex items-start gap-4 border-indigo-500/10">
           <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 mt-0.5"><ShieldIcon /></div>
           <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">Security Notice</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                 Credentials are stored locally in your environment file and are never transmitted to third parties. Use a dedicated API key with least-privilege access for enhanced security.
              </p>
           </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`p-5 rounded-xl border font-medium flex items-start gap-3 ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
            <span className="text-xl mt-0.5">{testResult.success ? '✓' : '✗'}</span>
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Save Success */}
        {saveSuccess && (
          <div className="p-5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-medium flex items-center gap-3">
            <span className="text-xl">✓</span>
            <span>Settings saved successfully!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4">
           <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !formData.url || !formData.db || !formData.username || !formData.password}
              className="flex-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-base cursor-pointer"
           >
              {testing ? (
                <><div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-500 border-t-white"></div> Testing...</>
              ) : (
                <><WifiIcon /> Test Connection</>
              )}
           </button>
           
           <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.7)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 text-base cursor-pointer"
           >
              {saving ? (
                <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> Saving...</>
              ) : (
                <><SaveIcon /> Save Configuration</>
              )}
           </button>
        </div>

      </form>
    </div>
  );
}