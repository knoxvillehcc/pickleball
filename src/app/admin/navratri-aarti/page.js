'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AartiLiveTicker from '@/components/AartiLiveTicker';

// Clean SVG Icons (Lucide Style)
const Icons = {
  diya: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c.5 2 2 3.5 2 5.5 0 2.5-2 3.5-2 3.5s-2-1-2-3.5C10 5.5 11.5 4 12 2z" />
      <path d="M4 14c0 4 3.5 7 8 7s8-3 8-7c0-2-3-3-8-3s-8 1-8 3z" />
    </svg>
  ),
  copy: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  external: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  settings: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  download: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  printer: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect width="12" height="8" x="6" y="14" />
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  history: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  trash: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  alertCircle: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
};

export default function NavratriAartiAdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);

  // Settings Form State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tier1Max, setTier1Max] = useState(3000);
  const [tier1Increment, setTier1Increment] = useState(500);
  const [tier2Increment, setTier2Increment] = useState(250);
  const [isPublished, setIsPublished] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Payment Modal State
  const [paymentModalDay, setPaymentModalDay] = useState(null);
  const [payStatus, setPayStatus] = useState('paid');
  const [payCollector, setPayCollector] = useState('iPad 1');
  const [payMethod, setPayMethod] = useState('cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Cutoff / Status Modal State
  const [cutoffModalDay, setCutoffModalDay] = useState(null);
  const [newStatus, setNewStatus] = useState('open');
  const [extendMinutes, setExtendMinutes] = useState(15);
  const [savingCutoff, setSavingCutoff] = useState(false);

  // History Drawer State
  const [historyDay, setHistoryDay] = useState(null);

  // Void / Remove Bid Modal State
  const [voidModalData, setVoidModalData] = useState(null);
  const [voidReason, setVoidReason] = useState('Devotee backed out / withdrew pledge');
  const [savingVoid, setSavingVoid] = useState(false);

  // Fetch Admin Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/navratri/aarti/admin/data', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.settings) {
          setTier1Max(json.settings.tier1_max || 3000);
          setTier1Increment(json.settings.tier1_increment || 500);
          setTier2Increment(json.settings.tier2_increment || 250);
          setIsPublished(json.settings.is_published ?? false);
        }
        setHistoryDay((prev) => {
          if (!prev) return null;
          return json.days?.find((d) => d.day_number === prev.day_number) || null;
        });
      } else {
        setError(json.error || 'Failed to load data.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Copy Link Handler
  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://dashboard.knoxvillemandir.org/navratri-aarti');
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  // KPI Computations
  const stats = useMemo(() => {
    if (!data?.days) return { pledged: 0, paid: 0, pending: 0, bidsCount: 0 };
    let pledged = 0;
    let paid = 0;
    let pending = 0;
    let bidsCount = 0;

    data.days.forEach((day) => {
      bidsCount += Number(day.bids_count || 0);
      if (day.bids_count > 0 && day.current_winner_name) {
        const amt = Number(day.current_highest_bid || 0);
        pledged += amt;
        if (day.payment_status === 'paid') {
          paid += amt;
        } else {
          pending += amt;
        }
      }
    });

    return { pledged, paid, pending, bidsCount };
  }, [data]);

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await fetch('/api/navratri/aarti/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier1_max: tier1Max,
          tier1_increment: tier1Increment,
          tier2_increment: tier2Increment,
          is_published: isPublished,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowSettingsModal(false);
        fetchData();
      } else {
        alert(json.error || 'Failed to update settings');
      }
    } catch {
      alert('Network error updating settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (day) => {
    setPaymentModalDay(day);
    setPayStatus(day.payment_status || 'paid');
    setPayCollector(day.payment_collector || 'iPad 1');
    setPayMethod(day.payment_method || 'cash');
    setPayRef(day.payment_ref || '');
    setPayNotes(day.admin_notes || '');
  };

  // Save Payment
  const handleSavePayment = async (e) => {
    e.preventDefault();
    try {
      setSavingPayment(true);
      const res = await fetch('/api/navratri/aarti/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_number: paymentModalDay.day_number,
          payment_status: payStatus,
          payment_collector: payCollector,
          payment_method: payMethod,
          payment_ref: payRef,
          admin_notes: payNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPaymentModalDay(null);
        fetchData();
      } else {
        alert(json.error || 'Failed to update payment');
      }
    } catch {
      alert('Network error saving payment');
    } finally {
      setSavingPayment(false);
    }
  };

  // Open Cutoff Modal
  const openCutoffModal = (day) => {
    setCutoffModalDay(day);
    setNewStatus(day.status || 'open');
    setExtendMinutes(15);
  };

  // Save Cutoff Extension or Status Toggle
  const handleSaveCutoff = async (e) => {
    e.preventDefault();
    try {
      setSavingCutoff(true);
      const body = {
        day_number: cutoffModalDay.day_number,
        status: newStatus,
      };

      if (extendMinutes > 0 && newStatus === 'open') {
        const currentCutoff = new Date(cutoffModalDay.cutoff_time).getTime();
        const newCutoff = new Date(Math.max(Date.now(), currentCutoff) + extendMinutes * 60 * 1000).toISOString();
        body.cutoff_time = newCutoff;
      }

      const res = await fetch('/api/navratri/aarti/admin/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        setCutoffModalDay(null);
        fetchData();
      } else {
        alert(json.error || 'Failed to update cutoff');
      }
    } catch {
      alert('Network error updating cutoff');
    } finally {
      setSavingCutoff(false);
    }
  };

  // Open Void Modal for specific bid in audit drawer
  const openVoidModalForBid = (bid, day) => {
    setVoidModalData({
      bid_id: bid.id,
      day_number: day.day_number,
      day_title: day.day_title,
      bidder_name: bid.bidder_name,
      bid_amount: bid.bid_amount,
      is_highest: Boolean(bid.is_highest),
    });
    setVoidReason('Devotee backed out / withdrew pledge');
  };

  // Open Void Modal for winner from main table
  const openVoidModalForWinner = (day) => {
    const topBid = (day.bids || []).find((b) => b.is_highest) || (day.bids || [])[0];
    setVoidModalData({
      bid_id: topBid?.id || null,
      day_number: day.day_number,
      day_title: day.day_title,
      bidder_name: day.current_winner_name,
      bid_amount: day.current_highest_bid,
      is_highest: true,
    });
    setVoidReason('Devotee backed out / withdrew pledge');
  };

  // Confirm Void Bid Action
  const handleConfirmVoid = async (e) => {
    e.preventDefault();
    if (!voidModalData) return;
    try {
      setSavingVoid(true);
      const res = await fetch('/api/navratri/aarti/admin/bid/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bid_id: voidModalData.bid_id || null,
          day_number: voidModalData.day_number,
          reason: voidReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setVoidModalData(null);
        await fetchData();
      } else {
        alert(json.error || 'Failed to void bid');
      }
    } catch {
      alert('Network error voiding bid');
    } finally {
      setSavingVoid(false);
    }
  };

  // CSV Export (strict MM-DD-YYYY dates)
  const handleExportCSV = () => {
    if (!data?.days) return;
    const headers = ['Day #', 'Date (MM-DD-YYYY)', 'Festival Day', 'Winning Sponsor', 'Phone', 'Email', 'Amount ($)', 'Bids Count', 'Cutoff Status', 'Payment Status', 'Collector', 'Method', 'Reference Note'];
    const rows = data.days.map((d) => [
      d.day_number,
      d.formatted_date,
      `"${d.day_title.replace(/"/g, '""')}"`,
      `"${(d.current_winner_name || '').replace(/"/g, '""')}"`,
      d.current_winner_phone || '',
      d.current_winner_email || '',
      d.bids_count > 0 ? d.current_highest_bid : 0,
      d.bids_count,
      d.status,
      d.payment_status,
      d.payment_collector || '',
      d.payment_method || '',
      `"${(d.payment_ref || d.admin_notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Navratri_Aarti_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #F5F5F7)',
      color: 'var(--text-primary, #1D1D1F)',
      fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif)",
      padding: '24px 20px 48px',
      transition: 'background-color 0.25s, color 0.25s',
    }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        
        {/* Executive Header Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent, #E8780C)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px' }}>
              HCC · Navratri 2026
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)', letterSpacing: '-0.4px' }}>
              Aarti Seva Management
            </h1>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: urlCopied ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card, #FFFFFF)',
                border: urlCopied ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border, rgba(0,0,0,0.09))',
                color: urlCopied ? '#059669' : 'var(--text-primary, #1D1D1F)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: 'var(--shadow)',
              }}
            >
              {urlCopied ? Icons.check : Icons.copy}
              {urlCopied ? 'Copied' : 'Copy Public Link'}
            </button>

            <Link
              href="/navratri-aarti"
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border, rgba(0,0,0,0.09))',
                color: 'var(--text-primary, #1D1D1F)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: '600',
                textDecoration: 'none',
                boxShadow: 'var(--shadow)',
              }}
            >
              {Icons.external} View Public Page
            </Link>

            <button
              onClick={() => setShowSettingsModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--accent, #E8780C)',
                border: 'none',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: 'var(--shadow)',
              }}
            >
              {Icons.settings} Increments & Config
            </button>
          </div>
        </div>

        {/* Live Scrolling Ticker Bar */}
        <div style={{ marginBottom: '18px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border, rgba(0,0,0,0.08))' }}>
          <AartiLiveTicker days={data?.days || []} mode="admin" />
        </div>

        {/* Compact, Clean Executive KPI Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}>
          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.09))', borderRadius: '12px', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #515154)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Total Pledged Seva
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent, #E8780C)', marginTop: '2px' }}>
              ${stats.pledged.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)', marginTop: '2px' }}>Across all 10 festival days</div>
          </div>

          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.09))', borderRadius: '12px', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #515154)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Collected (iPads)
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#10B981', marginTop: '2px' }}>
              ${stats.paid.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)', marginTop: '2px' }}>Cash / Check / POS Swipe</div>
          </div>

          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.09))', borderRadius: '12px', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #515154)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Pending Collection
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#F59E0B', marginTop: '2px' }}>
              ${stats.pending.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)', marginTop: '2px' }}>Awaiting payment at event</div>
          </div>

          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.09))', borderRadius: '12px', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #515154)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Verified Bids
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0284C7', marginTop: '2px' }}>
              {stats.bidsCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)', marginTop: '2px' }}>OTP verified submissions</div>
          </div>
        </div>

        {/* Master Management Table */}
        <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.09))', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          
          {/* Table Header Strip */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>Festival Days & Reconciliation</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #86868B)', marginLeft: '8px' }}>Daily 9:30 PM cutoff</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleExportCSV}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-input, #F2F2F5)',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  color: 'var(--text-primary, #1D1D1F)',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {Icons.download} Export CSV
              </button>

              <button
                onClick={() => window.print()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-input, #F2F2F5)',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  color: 'var(--text-primary, #1D1D1F)',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {Icons.printer} Print Roster
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #86868B)', fontSize: '13px' }}>Loading schedule...</div>
          ) : error ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-error, #D70015)', fontSize: '13px' }}>{error}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header, #FAFAFC)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))', color: 'var(--text-secondary, #6E6E73)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Day & Theme</th>
                    <th style={{ padding: '12px 16px' }}>Winning Sponsor</th>
                    <th style={{ padding: '12px 16px' }}>Bid</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Payment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.days?.map((day) => {
                    const isClosed = day.status === 'closed' || day.is_past_cutoff;
                    const hasWinner = day.bids_count > 0 && day.current_winner_name;
                    const isPaid = day.payment_status === 'paid';

                    return (
                      <tr
                        key={day.day_number}
                        id={`admin-day-row-${day.day_number}`}
                        style={{
                          borderBottom: '1px solid var(--border-table, rgba(0,0,0,0.06))',
                          background: day.is_maha_aarti ? 'rgba(232, 120, 12, 0.03)' : 'transparent',
                        }}
                      >
                        {/* Date */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>{day.formatted_date}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)' }}>Day {day.day_number}</div>
                        </td>

                        {/* Title */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary, #1D1D1F)' }}>{day.day_title}</div>
                          {day.is_maha_aarti && (
                            <span style={{ fontSize: '10.5px', color: 'var(--accent, #E8780C)', fontWeight: '700' }}>
                              ★ Maha Aarti (Aatham)
                            </span>
                          )}
                        </td>

                        {/* Winner */}
                        <td style={{ padding: '12px 16px' }}>
                          {hasWinner ? (
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>{day.current_winner_name}</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #515154)' }}>{day.current_winner_phone || '—'} · {day.current_winner_email || ''}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted, #86868B)' }}>No bids yet</span>
                          )}
                        </td>

                        {/* Bid */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '800', color: hasWinner ? 'var(--accent, #E8780C)' : 'var(--text-secondary, #515154)' }}>
                            ${day.current_highest_bid?.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)' }}>
                            {day.bids_count} {day.bids_count === 1 ? 'bid' : 'bids'}
                          </div>
                        </td>

                        {/* Cutoff Status */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {isClosed ? (
                            <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary, #515154)' }}>
                              Closed
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                              Open
                            </span>
                          )}
                        </td>

                        {/* Payment */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {hasWinner ? (
                            isPaid ? (
                              <div>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                                  ✓ Paid
                                </span>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary, #515154)', marginTop: '2px' }}>
                                  {day.payment_collector || 'iPad'} ({day.payment_method || 'Cash'}{day.payment_ref ? ` #${day.payment_ref}` : ''})
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#B45309' }}>
                                Pending
                              </span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-muted, #86868B)' }}>—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {hasWinner && (
                              <>
                                <button
                                  onClick={() => openPaymentModal(day)}
                                  style={{
                                    background: isPaid ? 'var(--bg-input, #F2F2F5)' : 'rgba(16, 185, 129, 0.12)',
                                    border: isPaid ? '1px solid var(--border)' : '1px solid rgba(16, 185, 129, 0.3)',
                                    color: isPaid ? 'var(--text-primary)' : '#059669',
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    fontSize: '11.5px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isPaid ? 'Edit' : 'Mark Paid'}
                                </button>

                                <button
                                  onClick={() => openVoidModalForWinner(day)}
                                  title="Void / Remove Winner (Devotee backed out)"
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    color: '#DC2626',
                                    padding: '5px 8px',
                                    borderRadius: '8px',
                                    fontSize: '11.5px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  {Icons.trash} Void
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => openCutoffModal(day)}
                              title="Extend Cutoff or Status"
                              style={{
                                background: 'var(--bg-input, #F2F2F5)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                                padding: '5px 8px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              {Icons.clock}
                            </button>

                            <button
                              onClick={() => setHistoryDay(day)}
                              title="Bid History"
                              style={{
                                background: 'var(--bg-input, #F2F2F5)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                                padding: '5px 8px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              {Icons.history}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── SETTINGS MODAL ──────────────────────────────────────────────── */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.1))', borderRadius: '18px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>Increment Rules & Visibility</h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{Icons.close}</button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>
                  Tier 1 Threshold Limit ($)
                </label>
                <input
                  type="number"
                  value={tier1Max}
                  onChange={(e) => setTier1Max(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>
                  Tier 1 Increment Step ($ below limit)
                </label>
                <input
                  type="number"
                  value={tier1Increment}
                  onChange={(e) => setTier1Increment(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>
                  Tier 2 Increment Step ($ above limit)
                </label>
                <input
                  type="number"
                  value={tier2Increment}
                  onChange={(e) => setTier2Increment(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input, #F2F2F5)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  id="pubCheck"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  style={{ width: '17px', height: '17px', accentColor: 'var(--accent, #E8780C)' }}
                />
                <label htmlFor="pubCheck" style={{ fontSize: '13px', color: 'var(--text-primary, #1D1D1F)', fontWeight: '600', cursor: 'pointer' }}>
                  Publish Live (Show tile on landing page)
                </label>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                style={{
                  width: '100%',
                  background: 'var(--accent, #E8780C)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: savingSettings ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow)',
                }}
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL ──────────────────────────────────────────────── */}
      {paymentModalDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.1))', borderRadius: '18px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>Record Payment</h3>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #515154)', marginTop: '2px' }}>
                  Day {paymentModalDay.day_number} · {paymentModalDay.current_winner_name} (${paymentModalDay.current_highest_bid?.toLocaleString()})
                </div>
              </div>
              <button onClick={() => setPaymentModalDay(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{Icons.close}</button>
            </div>

            <form onSubmit={handleSavePayment}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>Status</label>
                <select
                  value={payStatus}
                  onChange={(e) => setPayStatus(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="waived">Waived / Sponsored</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>Collected At</label>
                <select
                  value={payCollector}
                  onChange={(e) => setPayCollector(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                >
                  <option value="iPad 1">iPad 1 (Main Hall)</option>
                  <option value="iPad 2">iPad 2 (Front Lobby)</option>
                  <option value="Front Desk">Front Desk</option>
                  <option value="Treasurer">Treasurer Direct</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="card_pos">Card POS Swipe</option>
                  <option value="zelle">Zelle / Online</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>Check # / Card Last 4</label>
                <input
                  type="text"
                  placeholder="e.g. Check #1042"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>Notes</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                />
              </div>

              <button
                type="submit"
                disabled={savingPayment}
                style={{
                  width: '100%',
                  background: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: savingPayment ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow)',
                }}
              >
                {savingPayment ? 'Saving...' : 'Save Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── CUTOFF / EXTEND MODAL ──────────────────────────────────────── */}
      {cutoffModalDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.1))', borderRadius: '18px', maxWidth: '380px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>Bidding Window</h3>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #515154)', marginTop: '2px' }}>Day {cutoffModalDay.day_number} ({cutoffModalDay.formatted_date})</div>
              </div>
              <button onClick={() => setCutoffModalDay(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{Icons.close}</button>
            </div>

            <form onSubmit={handleSaveCutoff}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                >
                  <option value="open">Open (Accepting Bids)</option>
                  <option value="closed">Closed (Lock Winner)</option>
                </select>
              </div>

              {newStatus === 'open' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>Extend Cutoff Time</label>
                  <select
                    value={extendMinutes}
                    onChange={(e) => setExtendMinutes(Number(e.target.value))}
                    style={{ width: '100%', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                  >
                    <option value={15}>+15 Minutes</option>
                    <option value={30}>+30 Minutes</option>
                    <option value={60}>+1 Hour</option>
                    <option value={0}>Keep Existing Cutoff</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={savingCutoff}
                style={{
                  width: '100%',
                  background: 'var(--accent, #E8780C)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: savingCutoff ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow)',
                }}
              >
                {savingCutoff ? 'Updating...' : 'Update Status'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── BID HISTORY DRAWER ─────────────────────────────────────────── */}
      {historyDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.1))', borderRadius: '18px', maxWidth: '580px', width: '100%', padding: '24px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>Bid Audit Log</h3>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #515154)', marginTop: '2px' }}>
                  Day {historyDay.day_number}: {historyDay.day_title} ({historyDay.formatted_date})
                </div>
              </div>
              <button onClick={() => setHistoryDay(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{Icons.close}</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {(!historyDay.bids || historyDay.bids.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted, #86868B)', fontSize: '13px' }}>No verified bids placed yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary, #6E6E73)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px' }}>Time</th>
                      <th style={{ padding: '8px' }}>Bidder</th>
                      <th style={{ padding: '8px' }}>Contact</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyDay.bids.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border-table, rgba(0,0,0,0.06))' }}>
                        <td style={{ padding: '8px', color: 'var(--text-secondary, #515154)' }}>
                          {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '8px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>
                          {b.bidder_name}
                          {b.is_highest && (
                            <span style={{ marginLeft: '4px', fontSize: '9px', background: 'rgba(232, 120, 12, 0.15)', color: 'var(--accent, #E8780C)', padding: '2px 5px', borderRadius: '4px', fontWeight: '700' }}>
                              TOP
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary, #515154)' }}>
                          <div>{b.bidder_phone}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)' }}>{b.bidder_email}</div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '800', color: 'var(--accent, #E8780C)' }}>
                          ${Number(b.bid_amount).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => openVoidModalForBid(b, historyDay)}
                            title="Void this bid"
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#DC2626',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {Icons.trash} Void
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VOID / REMOVE BID MODAL ────────────────────────────────────── */}
      {voidModalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 10000 }}>
          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.1))', borderRadius: '18px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#DC2626' }}>Void / Remove Aarti Bid</h3>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #515154)', marginTop: '2px' }}>
                  Day {voidModalData.day_number} · {voidModalData.day_title}
                </div>
              </div>
              <button onClick={() => setVoidModalData(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{Icons.close}</button>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {voidModalData.bidder_name} · ${Number(voidModalData.bid_amount).toLocaleString()}
              </div>
              {voidModalData.is_highest && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: '#B91C1C', marginTop: '6px', lineHeight: 1.4 }}>
                  <span style={{ flexShrink: 0, marginTop: '2px' }}>{Icons.alertCircle}</span>
                  <span>
                    This is currently the <strong>winning bid</strong>. Voiding it will automatically promote the runner-up bidder (or cleanly reset the day to opening reserve if no other bids exist).
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmVoid}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Reason for Withdrawal / Removal
                </label>
                <input
                  type="text"
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Devotee backed out / withdrew pledge"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setVoidModalData(null)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-input, #F2F2F5)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVoid}
                  style={{
                    flex: 1.5,
                    background: '#DC2626',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    cursor: savingVoid ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingVoid ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
