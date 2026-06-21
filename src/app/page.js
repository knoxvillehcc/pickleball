'use client';
import { useState } from 'react';

const card = {
  backgroundColor: 'rgba(13, 20, 38, 0.8)',
  border: '1px solid rgba(51,65,85,0.6)',
  borderRadius: '16px',
  transition: 'all 0.3s',
};

export default function Home() {
  const [loading,   setLoading]   = useState(false);
  const [executing, setExecuting] = useState(false);
  const [results,   setResults]   = useState(null);
  const [summary,   setSummary]   = useState(null);
  const [logs,      setLogs]      = useState([]);

  const runScan = async () => {
    setLoading(true);
    setLogs([]);
    try {
      const res  = await fetch('/api/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        setSummary(data.summary);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Network error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const executeFixes = async () => {
    const toFix = (results || []).filter(r => r.status === 'would_fix');
    if (toFix.length === 0) return;
    if (!window.confirm('Execute ' + toFix.length + ' live fixes in Production Odoo?')) return;
    setExecuting(true);
    try {
      const res  = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: toFix, environment: 'production' }),
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        alert('Execution complete! Check logs below.');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  const missingCount = summary ? summary.wouldFix : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>

      {/* --- Hero Header --- */}
      <div style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(13,20,38,0.95) 0%, rgba(30,27,75,0.3) 100%)',
        borderColor: 'rgba(99,102,241,0.2)',
        padding: '48px',
        boxShadow: '0 0 80px -20px rgba(99,102,241,0.15)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ margin: 0, fontSize: '42px', fontWeight: '900', color: 'white', lineHeight: 1.1, letterSpacing: '-1px' }}>
            System{' '}
            <span style={{ background: 'linear-gradient(135deg, #818CF8, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Scanner
            </span>
          </h1>
          <p style={{ margin: '12px 0 0', color: '#64748B', fontSize: '15px', maxWidth: '480px', lineHeight: 1.6 }}>
            Deep-scan Odoo live database to identify POS orders missing active recurring subscriptions.
          </p>
        </div>

        <button
          onClick={runScan}
          disabled={loading}
          style={{
            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366F1, #22D3EE)',
            color: 'white', fontWeight: '700', fontSize: '15px',
            padding: '14px 32px', borderRadius: '12px', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: '0 0 40px -10px rgba(99,102,241,0.5)',
            transition: 'all 0.3s', whiteSpace: 'nowrap', position: 'relative',
          }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
              Scanning...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Run Diagnostics
            </>
          )}
        </button>
      </div>

      {/* --- Stat Cards --- */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {[
            { label: 'Active Subs',       value: summary.totalActiveSubscriptions, color: '#6366F1', glow: false },
            { label: 'POS Sub Orders',    value: summary.posOrdersWithSubs,        color: '#38BDF8', glow: false },
            { label: 'Valid (Skipped)',    value: summary.skipped,                  color: '#10B981', glow: false },
            { label: 'Missing Subs',      value: summary.wouldFix,                 color: '#F43F5E', glow: true  },
          ].map(({ label, value, color, glow }) => (
            <div key={label} style={{
              ...card,
              padding: '28px',
              borderTop: '2px solid ' + color,
              boxShadow: glow ? '0 0 30px -10px rgba(244,63,94,0.25)' : 'none',
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>{label}</div>
              <div style={{ fontSize: '48px', fontWeight: '900', color: color, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* --- Results Table --- */}
      {results && results.length > 0 && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>

          {/* Table Header */}
          <div style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(51,65,85,0.5)',
            backgroundColor: 'rgba(8,12,20,0.6)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>Analysis Results</h2>
              <span style={{ backgroundColor: 'rgba(51,65,85,0.8)', color: '#94A3B8', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '9999px', border: '1px solid rgba(71,85,105,0.5)' }}>
                {results.length} records
              </span>
            </div>

            {/* Execute Fixes Button - shows when there are missing subs */}
            {missingCount > 0 && (
              <button
                onClick={executeFixes}
                disabled={executing}
                style={{
                  background: executing ? 'rgba(244,63,94,0.4)' : 'linear-gradient(135deg, #F43F5E, #E11D48)',
                  color: 'white', fontWeight: '700', fontSize: '14px',
                  padding: '12px 28px', borderRadius: '10px', border: 'none',
                  cursor: executing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 0 30px -8px rgba(244,63,94,0.6)',
                  transition: 'all 0.3s',
                }}
              >
                {executing ? (
                  <>
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                    Deploying Fixes...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Execute {missingCount} Fixes Now
                  </>
                )}
              </button>
            )}
          </div>

          {/* Table Body */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(8,12,20,0.4)', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                  {[['Order Ref','left'],['Customer','left'],['Product','left'],['Amount','right'],['Status','center']].map(([h, align]) => (
                    <th key={h} style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: align }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: '1px solid rgba(51,65,85,0.3)', backgroundColor: i % 2 !== 0 ? 'rgba(15,23,42,0.4)' : 'transparent', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 !== 0 ? 'rgba(15,23,42,0.4)' : 'transparent'}
                  >
                    <td style={{ padding: '15px 24px' }}>
                      <div style={{ fontWeight: '700', color: 'white', fontSize: '13px' }}>{r.posOrder || '-'}</div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontFamily: 'monospace' }}>{r.invoiceNo || '-'}</div>
                    </td>
                    <td style={{ padding: '15px 24px', color: '#CBD5E1', fontWeight: '600' }}>{r.customerName}</td>
                    <td style={{ padding: '15px 24px', color: '#818CF8' }}>{r.product}</td>
                    <td style={{ padding: '15px 24px', color: 'white', fontWeight: '700', textAlign: 'right' }}>${r.amount?.toFixed(2)}</td>
                    <td style={{ padding: '15px 24px', textAlign: 'center' }}>
                      {r.status === 'would_fix' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '9999px', padding: '4px 12px', fontSize: '11px', fontWeight: '700', color: '#F43F5E' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F43F5E', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                          Missing Sub
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '9999px', padding: '4px 12px', fontSize: '11px', fontWeight: '700', color: '#10B981' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                          Valid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Execution Logs --- */}
      {logs.length > 0 && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(51,65,85,0.4)', backgroundColor: 'rgba(8,12,20,0.6)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'white' }}>Execution Logs</h3>
            <span style={{ backgroundColor: 'rgba(51,65,85,0.8)', color: '#94A3B8', fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '9999px' }}>{logs.length}</span>
          </div>
          <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'monospace', fontSize: '13px' }}>
              {logs.map((log, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '16px', flexWrap: 'wrap',
                  padding: '12px 16px', borderRadius: '10px',
                  backgroundColor: log.status === 'fixed' ? 'rgba(16,185,129,0.05)' : 'rgba(244,63,94,0.05)',
                  border: '1px solid ' + (log.status === 'fixed' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'),
                }}>
                  <span style={{ fontWeight: '700', width: '70px', flexShrink: 0, color: log.status === 'fixed' ? '#10B981' : '#F43F5E' }}>[{(log.status || '').toUpperCase()}]</span>
                  <span style={{ color: '#64748B', width: '90px', flexShrink: 0 }}>{log.id}</span>
                  <span style={{ color: '#CBD5E1', flex: 1 }}>{log.message || log.error}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}