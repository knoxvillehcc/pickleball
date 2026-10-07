'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportPdfWithNativeShare } from '@/lib/pdfShareHelper';

const SAFFRON = '#FF6B35';
const GOLD = '#FFB800';
const MAROON = '#500E2B';

// ── Festival Dates (13 Dates — Format MM-DD-YYYY) ──────────────────────────────
const FESTIVAL_DATES = [
  { date: '2026-10-09', dateFormatted: '10-09-2026', label: 'Extra Day — Fri, 10-09-2026', isWeekend: true,  rate: 351 },
  { date: '2026-10-10', dateFormatted: '10-10-2026', label: 'Extra Day — Sat, 10-10-2026', isWeekend: true,  rate: 351 },
  { date: '2026-10-11', dateFormatted: '10-11-2026', label: 'Day 1 — Sun, 10-11-2026',      isWeekend: false, rate: 201 },
  { date: '2026-10-12', dateFormatted: '10-12-2026', label: 'Day 2 — Mon, 10-12-2026',      isWeekend: false, rate: 201 },
  { date: '2026-10-13', dateFormatted: '10-13-2026', label: 'Day 3 — Tue, 10-13-2026',      isWeekend: false, rate: 201 },
  { date: '2026-10-14', dateFormatted: '10-14-2026', label: 'Day 4 — Wed, 10-14-2026',      isWeekend: false, rate: 201 },
  { date: '2026-10-15', dateFormatted: '10-15-2026', label: 'Day 5 — Thu, 10-15-2026',      isWeekend: false, rate: 201 },
  { date: '2026-10-16', dateFormatted: '10-16-2026', label: 'Day 6 — Fri, 10-16-2026', isWeekend: true,  rate: 351 },
  { date: '2026-10-17', dateFormatted: '10-17-2026', label: 'Day 7 — Sat, 10-17-2026', isWeekend: true,  rate: 351 },
  { date: '2026-10-18', dateFormatted: '10-18-2026', label: 'Day 8 — Sun, 10-18-2026', isWeekend: true,  rate: 351 },
  { date: '2026-10-19', dateFormatted: '10-19-2026', label: 'Day 9 — Mon, 10-19-2026', isWeekend: false, rate: 201 },
  { date: '2026-10-20', dateFormatted: '10-20-2026', label: 'Day 10 — Tue, 10-20-2026 (Vijayadashami)', isWeekend: false, rate: 201 },
  { date: '2026-10-25', dateFormatted: '10-25-2026', label: 'Special — Sun, 10-25-2026 (Sharad Purnima)', isWeekend: false, rate: 201 },
];

function formatMMDDYYYY(d) {
  if (!d) return '—';
  const str = String(d).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, day] = str.split('-');
    return `${m}-${day}-${y}`;
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${m}-${day}-${dt.getFullYear()}`;
}

// ── Status Badges (Clean Professional UI) ─────────────────────────────────────
function Badge({ status }) {
  const map = {
    paid:               { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#10B981', label: 'Paid' },
    pending:            { bg: 'rgba(255,184,0,0.12)',  border: 'rgba(255,184,0,0.35)',  color: '#D97706', label: 'Pending' },
    partially_refunded: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#F59E0B', label: 'Partial Refund' },
    refunded:           { bg: 'rgba(148,163,184,0.12)',border: 'rgba(148,163,184,0.35)',color: '#64748B', label: 'Refunded' },
    failed:             { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  color: '#EF4444', label: 'Failed' },
    cancelled:          { bg: 'rgba(148,163,184,0.12)',border: 'rgba(148,163,184,0.35)',color: '#64748B', label: 'Cancelled' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '99px',
      fontSize: '11px', fontWeight: '800',
      backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }} />
      {s.label}
    </span>
  );
}

// ── Category Badges ────────────────────────────────────────────────────────────
function CategoryBadge({ category }) {
  const labels = {
    clothing: 'Clothing & Apparel',
    jewelry: 'Jewelry & Accessories',
    food: 'Food & Refreshments',
    henna: 'Henna & Beauty',
    handicrafts: 'Handicrafts & Decor',
    services: 'Community Services',
    other: 'Retail & Merchandise',
  };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 9px', borderRadius: '6px',
      fontSize: '11px', fontWeight: '700',
      backgroundColor: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.22)',
      color: SAFFRON,
    }}>
      {labels[category] || category || 'Vendor'}
    </span>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '22px 20px', borderTop: `3.5px solid ${accent}`,
      boxShadow: 'var(--shadow)', width: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '950', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '600' }}>{sub}</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function NavratriVendorsDashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [bookedCounts, setBookedCounts] = useState({});
  const [settings, setSettings] = useState({ is_published: 'true', default_capacity_per_night: '10' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' or 'YYYY-MM-DD'

  // Modals & Actions
  const [expandedId, setExpandedId] = useState(null);
  const [editingReg, setEditingReg] = useState(null);
  const [refundingReg, setRefundingReg] = useState(null); // reg object to refund
  const [refundMode, setRefundMode] = useState('full'); // 'full' | 'partial'
  const [selectedRefundDateIds, setSelectedRefundDateIds] = useState([]);
  const [isRefunding, setIsRefunding] = useState(false);

  const [resendingId, setResendingId] = useState(null);
  const [resendStatus, setResendStatus] = useState({});
  const [urlCopied, setUrlCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [capacityInput, setCapacityInput] = useState('10');

  // Odoo General Entry Sync
  const [odooSyncStatus, setOdooSyncStatus] = useState(null);
  const [showOdooModal, setShowOdooModal] = useState(false);
  const [isSyncingOdoo, setIsSyncingOdoo] = useState(false);
  const [odooSyncMsg, setOdooSyncMsg] = useState('');
  const [forceOdooSync, setForceOdooSync] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const PUBLIC_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/register/navratri/vendor`
    : '/register/navratri/vendor';

  // Load Data
  const loadData = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/navratri/vendors/registrations');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load registrations');
      setRegistrations(data.registrations || []);

      // Fetch Odoo sync status
      fetch('/api/navratri/vendors/sync-odoo')
        .then(r => r.json())
        .then(d => { if (d.success && d.syncInfo) setOdooSyncStatus(d.syncInfo); })
        .catch(() => {});
      setBookedCounts(data.bookedCounts || {});
      if (data.settings) {
        setSettings(data.settings);
        setCapacityInput(data.settings.default_capacity_per_night || '10');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch('/api/navratri/vendors/registrations');
        const data = await res.json();
        if (!ignore && data.success) {
          setRegistrations(data.registrations || []);
          setBookedCounts(data.bookedCounts || {});
          if (data.settings) {
            setSettings(data.settings);
            setCapacityInput(data.settings.default_capacity_per_night || '10');
          }
        }
      } catch (e) {
        if (!ignore) setError(e.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setCurrentUser(d.user || null))
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  // Copy public registration URL
  const copyPublicUrl = () => {
    navigator.clipboard.writeText(PUBLIC_URL);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2200);
  };

  // Toggle Public Registration Open/Closed
  const handleTogglePublish = async () => {
    setIsPublishing(true);
    const nextVal = settings.is_published === 'true' ? 'false' : 'true';
    try {
      const res = await fetch('/api/navratri/vendors/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'is_published', value: nextVal }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, is_published: nextVal }));
      }
    } catch (e) {
      alert('Error updating status: ' + e.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      await fetch('/api/navratri/vendors/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'default_capacity_per_night', value: capacityInput }),
      });
      setSettings(prev => ({ ...prev, default_capacity_per_night: capacityInput }));
      setShowSettingsModal(false);
      alert('Settings updated successfully!');
    } catch (e) {
      alert('Failed to save settings: ' + e.message);
    }
  };

  // Resend Email
  const handleResendEmail = async (reg) => {
    setResendingId(reg.registration_number);
    try {
      const res = await fetch('/api/navratri/vendors/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_number: reg.registration_number }),
      });
      const data = await res.json();
      if (data.success) {
        setResendStatus(prev => ({ ...prev, [reg.registration_number]: 'success' }));
        setTimeout(() => setResendStatus(prev => ({ ...prev, [reg.registration_number]: null })), 3000);
      } else {
        alert('Resend failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Resend error: ' + e.message);
    } finally {
      setResendingId(null);
    }
  };

  // Delete Registration
  const handleDeleteReg = async (reg) => {
    if (!confirm(`Are you sure you want to delete registration ${reg.registration_number} for ${reg.business_name}? All booked dates and records will be permanently removed.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/navratri/vendors/registrations?id=${reg.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete');
      setRegistrations(prev => prev.filter(r => r.id !== reg.id));
      setExpandedId(null);
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  // Process Refund (Full or Partial)
  const handleExecuteRefund = async () => {
    if (!refundingReg) return;
    setIsRefunding(true);
    try {
      const res = await fetch('/api/navratri/vendors/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_number: refundingReg.registration_number,
          mode: refundMode,
          date_ids: selectedRefundDateIds,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Refund failed');
      alert(data.message || 'Refund processed successfully');
      setRefundingReg(null);
      loadData(); // reload fresh state
    } catch (e) {
      alert('Refund failed: ' + e.message);
    } finally {
      setIsRefunding(false);
    }
  };

  // Post General Entry to Odoo
  const handlePostToOdoo = async (isForced = false) => {
    setIsSyncingOdoo(true);
    setOdooSyncMsg('');
    try {
      const res = await fetch('/api/navratri/vendors/sync-odoo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: isForced }),
      });
      const data = await res.json();
      if (data.success) {
        setOdooSyncStatus(data.syncInfo);
        setOdooSyncMsg(`Success: General Entry ${data.syncInfo.moveName} posted to Odoo.`);
        setForceOdooSync(false);
      } else {
        setOdooSyncMsg(data.message || data.error || 'Failed to post General Entry to Odoo');
      }
    } catch (err) {
      setOdooSyncMsg(`Error: ${err.message}`);
    } finally {
      setIsSyncingOdoo(false);
    }
  };

  // Save Edit (including Booth Spot numbers)
  const handleSaveEdit = async () => {
    if (!editingReg) return;
    try {
      const res = await fetch('/api/navratri/vendors/registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReg),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save');
      setRegistrations(prev => prev.map(r => r.id === editingReg.id ? { ...editingReg } : r));
      setEditingReg(null);
      alert('Registration details and booth spots updated successfully!');
    } catch (e) {
      alert('Update failed: ' + e.message);
    }
  };

  // Quick Booth Spot update
  const handleQuickSpotChange = async (regId, dateId, newSpot) => {
    try {
      await fetch('/api/navratri/vendors/registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: regId,
          dates: [{ id: dateId, booth_spot_number: newSpot }],
        }),
      });
      setRegistrations(prev => prev.map(r => {
        if (r.id !== regId) return r;
        return {
          ...r,
          dates: (r.dates || []).map(d => d.id === dateId ? { ...d, booth_spot_number: newSpot } : d),
        };
      }));
    } catch (e) {
      console.error('Quick spot update failed:', e);
    }
  };

  // Metrics
  const paidRegs = registrations.filter(r => r.payment_status === 'paid' || r.payment_status === 'partially_refunded');
  const pendingRegs = registrations.filter(r => r.payment_status === 'pending');
  const totalRevenue = paidRegs.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
  const totalBoothsBooked = registrations
    .flatMap(r => r.dates || [])
    .filter(d => d.status !== 'refunded' && d.status !== 'cancelled')
    .reduce((sum, d) => sum + (d.booth_count || 1), 0);

  // Filter & Search logic
  const filtered = useMemo(() => {
    return registrations.filter(r => {
      const matchStatus = statusFilter === 'all' || r.payment_status === statusFilter;
      const matchCategory = categoryFilter === 'all' || r.category === categoryFilter;

      let matchDate = true;
      if (dateFilter !== 'all') {
        const hasDate = (r.dates || []).some(d => d.event_date === dateFilter && d.status !== 'refunded');
        if (!hasDate) matchDate = false;
      }

      const q = search.toLowerCase();
      const matchSearch = !q || [
        r.registration_number,
        r.business_name,
        r.contact_name,
        r.email,
        r.phone,
        r.city,
        r.notes,
        ...(r.dates || []).map(d => d.booth_spot_number),
      ].some(val => val?.toLowerCase().includes(q));

      return matchStatus && matchCategory && matchDate && matchSearch;
    });
  }, [registrations, statusFilter, categoryFilter, dateFilter, search]);

  // CSV Export
  const exportCSV = () => {
    const headers = [
      'Reg #', 'Business Name', 'Contact Name', 'Category', 'Email', 'Phone',
      'Address', 'City', 'State', 'ZIP', 'Status', 'Amount Paid', 'Booked Dates Count',
      'Dates Breakdown', 'Booth Spots', 'Electrical Needed', 'Date Registered',
    ];

    const rows = filtered.map(r => {
      const activeDates = (r.dates || []).filter(d => d.status !== 'refunded');
      const datesStr = activeDates.map(d => `${d.day_label || d.event_date} (${d.booth_count} booth)`).join('; ');
      const spotsStr = activeDates.map(d => `${d.day_label}: ${d.booth_spot_number || 'TBD'}`).join('; ');

      return [
        r.registration_number,
        r.business_name,
        r.contact_name,
        r.category,
        r.email,
        r.phone,
        r.address,
        r.city,
        r.state,
        r.zip,
        r.payment_status,
        `$${((r.amount_paid || 0) / 100).toFixed(2)}`,
        activeDates.length,
        datesStr,
        spotsStr,
        r.electrical_needed ? 'Yes' : 'No',
        r.registration_date ? formatMMDDYYYY(r.registration_date) : '',
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `navratri-vendors-${dateFilter === 'all' ? 'all-dates' : dateFilter}-${formatMMDDYYYY(new Date())}.csv`;
    a.click();
  };

  // Print / Export Full Festival Report
  const printFullReport = async () => {
    try {
      const doc = new jsPDF('landscape');
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
      const timeStr = now.toLocaleTimeString();
      const userName = currentUser?.name || currentUser?.email || 'Admin';

      // Strictly filter out pending or unpaid registrations
      const paidOnly = filtered.filter(r => (r.payment_status === 'paid' || r.payment_status === 'partially_refunded') && r.payment_status !== 'pending' && r.payment_status !== 'unpaid');

      const paidReportBooths = paidOnly
        .flatMap(r => r.dates || [])
        .filter(d => d.status !== 'refunded' && d.status !== 'cancelled')
        .reduce((sum, d) => sum + (d.booth_count || 1), 0);
      const paidReportRevenue = paidOnly.reduce((sum, r) => sum + (r.amount_paid || 0), 0);

      doc.setFontSize(18);
      doc.setTextColor(255, 107, 53); // SAFFRON #FF6B35
      doc.text('Navratri 2026 — Master Vendor Space Registrations', 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        `Printed by: ${userName}  |  Date: ${dateStr} ${timeStr}  |  Paid Vendors: ${paidOnly.length}  |  Total Booths: ${paidReportBooths}  |  Revenue: $${(paidReportRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        14, 22
      );

      const tableBody = paidOnly.map(r => {
        const activeDates = (r.dates || []).filter(d => d.status !== 'refunded');
        const datesDetail = activeDates.map(d => `${d.day_label || d.event_date} (${d.booth_count}b${d.booth_spot_number ? `, Spot ${d.booth_spot_number}` : ''})`).join('; ');
        return [
          r.registration_number || '',
          r.business_name || '',
          r.contact_name || '',
          (r.category || '').toUpperCase(),
          r.email || '',
          r.phone || '—',
          datesDetail || 'No active dates',
          r.electrical_needed ? '110V Yes' : 'No',
          `$${((r.amount_paid || 0) / 100).toFixed(2)}`,
          r.payment_status === 'partially_refunded' ? 'PARTIAL' : 'PAID',
        ];
      });

      autoTable(doc, {
        startY: 28,
        head: [['Reg #', 'Business Name', 'Contact Name', 'Category', 'Email', 'Phone', 'Booked Dates & Spots', 'Power', 'Amount Paid', 'Status']],
        body: tableBody.length ? tableBody : [['', 'No paid vendor registrations found', '', '', '', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [255, 107, 53], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        margin: { top: 10, bottom: 10, left: 14, right: 14 },
      });

      await exportPdfWithNativeShare(doc, `Navratri_Vendors_Master_${dateStr}.pdf`);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    }
  };

  // Print / Export Individual Day Report (Management Roster for Event Day)
  const printDayReport = async (selectedDateStr) => {
    try {
      const doc = new jsPDF('landscape');
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
      const timeStr = now.toLocaleTimeString();
      const userName = currentUser?.name || currentUser?.email || 'Admin';

      const dateObj = FESTIVAL_DATES.find(d => d.date === selectedDateStr);
      const dateTitle = dateObj ? dateObj.label : formatMMDDYYYY(selectedDateStr);

      // Gather all paid vendors who have a booth on this date (skip pending/unpaid)
      const dayVendors = [];
      for (const r of registrations) {
        if (r.payment_status !== 'paid' && r.payment_status !== 'partially_refunded') continue;
        const matchDate = (r.dates || []).find(d => d.event_date === selectedDateStr && d.status !== 'refunded');
        if (matchDate) {
          dayVendors.push({
            reg: r,
            dateInfo: matchDate,
          });
        }
      }

      const totalBoothsOnDay = dayVendors.reduce((s, v) => s + (v.dateInfo.booth_count || 1), 0);
      const powerCount = dayVendors.filter(v => v.reg.electrical_needed).length;

      doc.setFontSize(18);
      doc.setTextColor(255, 107, 53); // SAFFRON #FF6B35
      doc.text(`Navratri 2026 — Day Vendor Roster: ${dateTitle}`, 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        `Printed by: ${userName}  |  Setup: 5:30 PM - 6:45 PM  |  Event: 7:00 PM - 11:00 PM  |  Paid Vendors: ${dayVendors.length}  |  Booths: ${totalBoothsOnDay}  |  Power Required: ${powerCount}`,
        14, 22
      );

      const tableBody = dayVendors.map((item, idx) => {
        const { reg, dateInfo } = item;
        return [
          dateInfo.booth_spot_number || `Spot #${idx + 1}`,
          reg.registration_number || '',
          reg.business_name || '',
          (reg.category || '').toUpperCase(),
          `${reg.contact_name || ''}\n${reg.phone || '—'}`,
          reg.email || '',
          `${dateInfo.booth_count || 1} Booth(s)`,
          reg.electrical_needed ? '110V Yes' : 'Standard',
          reg.payment_status === 'partially_refunded' ? 'PARTIAL' : 'PAID',
          '', // Signature box
        ];
      });

      autoTable(doc, {
        startY: 28,
        head: [['Spot', 'Reg #', 'Business Name', 'Category', 'Contact & Phone', 'Email', 'Booths', 'Power', 'Status', 'Check-In Signature']],
        body: tableBody.length ? tableBody : [['', 'No paid vendors registered for this date', '', '', '', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [255, 107, 53], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          9: { cellWidth: 35 }, // signature box
        },
        margin: { top: 10, bottom: 10, left: 14, right: 14 },
      });

      await exportPdfWithNativeShare(doc, `Navratri_Vendors_Roster_${selectedDateStr}_${dateStr}.pdf`);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    }
  };

  // Open refund modal
  const handleOpenRefundModal = (reg) => {
    setRefundingReg(reg);
    setRefundMode('full');
    const activeDateIds = (reg.dates || []).filter(d => d.status !== 'refunded').map(d => d.id);
    setSelectedRefundDateIds(activeDateIds);
  };

  return (
    <div style={{ padding: '32px 28px', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>
      {/* ── TOP HEADER BAR ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: SAFFRON,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/><path d="M2 9h20"/></svg>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '950', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Navratri 2026 — Vendor Booths
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage daily booth reservations ($201 Standard / $351 Peak & Weekends), spot assignments, reports, and refunds.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Public Link Copy Button */}
          <button
            onClick={copyPublicUrl}
            style={{
              padding: '9px 15px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: urlCopied ? '#10B981' : 'var(--text-primary)',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span>{urlCopied ? 'Link Copied!' : 'Public Link'}</span>
          </button>

          {/* Toggle Public Registration */}
          <button
            onClick={handleTogglePublish}
            disabled={isPublishing}
            style={{
              padding: '9px 15px', borderRadius: '10px',
              border: `1.5px solid ${settings.is_published === 'true' ? '#10B981' : '#EF4444'}`,
              background: settings.is_published === 'true' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: settings.is_published === 'true' ? '#10B981' : '#EF4444',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: settings.is_published === 'true' ? '#10B981' : '#EF4444' }} />
            <span>{settings.is_published === 'true' ? 'Registration Open' : 'Registration Closed'}</span>
          </button>

          {/* Capacity Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              padding: '9px 14px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-primary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '7px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Capacity Settings</span>
          </button>

          {/* Post General Entry to Odoo */}
          <button
            onClick={() => { setOdooSyncMsg(''); setForceOdooSync(false); setShowOdooModal(true); }}
            style={{
              padding: '9px 15px', borderRadius: '10px',
              border: odooSyncStatus ? '1.5px solid rgba(16,185,129,0.5)' : '1px solid rgba(14,165,233,0.4)',
              background: odooSyncStatus ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.08)',
              color: odooSyncStatus ? '#10B981' : '#0284C7',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '7px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg>
            <span>{odooSyncStatus ? `Posted to Odoo (${odooSyncStatus.moveName || 'Synced'})` : 'Post General Entry to Odoo'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            style={{
              padding: '9px 14px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-primary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '7px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Odoo Synced Notice Pill */}
      {odooSyncStatus && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderRadius: '12px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
          color: '#10B981', fontSize: '12.5px', fontWeight: '700', marginBottom: '20px',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Odoo General Entry Confirmed:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: '800' }}>{odooSyncStatus.moveName}</span>
          <span>· Gross: ${Number(odooSyncStatus.totalGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <span>· Analytic: Navratri 2026</span>
          {odooSyncStatus.date && <span>· Date: {formatMMDDYYYY(odooSyncStatus.date)}</span>}
        </div>
      )}

      {/* ── STATS ROW ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          label="Total Vendors"
          value={registrations.length}
          accent={SAFFRON}
          sub={`${paidRegs.length} paid · ${pendingRegs.length} pending`}
        />
        <StatCard
          label="Total Revenue"
          value={`$${(totalRevenue / 100).toLocaleString()}`}
          accent="#10B981"
          sub="Collected via Stripe Checkout"
        />
        <StatCard
          label="Booths Booked"
          value={totalBoothsBooked}
          accent={GOLD}
          sub="Across all 13 festival dates"
        />
        <StatCard
          label="Confirmed (Paid)"
          value={paidRegs.length}
          accent="#10B981"
          sub={`${((paidRegs.length / Math.max(1, registrations.length)) * 100).toFixed(0)}% completion rate`}
        />
      </div>

      {/* ── CONTROLS, SEARCH & REPORT GENERATION ──────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '20px', marginBottom: '24px',
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search vendor, contact, email, phone, spot #, reg number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px',
                border: '1.5px solid var(--border)', background: 'var(--bg-input)',
                color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box',
              }}
            />
            <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>

          {/* Date Filter Dropdown */}
          <div style={{ minWidth: '220px' }}>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: `1.5px solid ${dateFilter !== 'all' ? SAFFRON : 'var(--border)'}`,
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              }}
            >
              <option value="all">All Dates (Master View)</option>
              {FESTIVAL_DATES.map(d => (
                <option key={d.date} value={d.date}>
                  {d.label} {d.isWeekend ? '($351)' : '($201)'}
                </option>
              ))}
            </select>
          </div>

          {/* Report Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={exportCSV}
              style={{
                padding: '9px 15px', borderRadius: '10px', border: '1px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export CSV</span>
            </button>

            {dateFilter === 'all' ? (
              <button
                onClick={printFullReport}
                style={{
                  padding: '9px 17px', borderRadius: '10px', border: 'none',
                  background: SAFFRON, color: '#FFFFFF',
                  fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '7px',
                  boxShadow: '0 4px 12px rgba(255,107,53,0.3)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                <span>Print Master Report</span>
              </button>
            ) : (
              <button
                onClick={() => printDayReport(dateFilter)}
                style={{
                  padding: '9px 17px', borderRadius: '10px', border: 'none',
                  background: `linear-gradient(135deg, ${SAFFRON} 0%, #D4501F 100%)`, color: '#FFFFFF',
                  fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '7px',
                  boxShadow: '0 4px 12px rgba(255,107,53,0.3)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                <span>Print Day Roster ({FESTIVAL_DATES.find(d => d.date === dateFilter)?.label.split('—')[0].trim() || 'Day'})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills (Status & Category) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          {/* Status Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginRight: '4px' }}>Status:</span>
            {['all', 'paid', 'pending', 'partially_refunded', 'refunded'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '5px 12px', borderRadius: '8px',
                  border: `1px solid ${statusFilter === st ? SAFFRON : 'var(--border)'}`,
                  background: statusFilter === st ? 'rgba(255,107,53,0.12)' : 'transparent',
                  color: statusFilter === st ? SAFFRON : 'var(--text-secondary)',
                  fontWeight: '800', fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginRight: '4px' }}>Category:</span>
            {['all', 'clothing', 'jewelry', 'food', 'henna', 'handicrafts', 'services'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '5px 10px', borderRadius: '8px',
                  border: `1px solid ${categoryFilter === cat ? GOLD : 'var(--border)'}`,
                  background: categoryFilter === cat ? 'rgba(255,184,0,0.12)' : 'transparent',
                  color: categoryFilter === cat ? GOLD : 'var(--text-secondary)',
                  fontWeight: '700', fontSize: '11.5px', cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── REGISTRATIONS TABLE ──────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow)',
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: SAFFRON, fontSize: '15px', fontWeight: '700' }}>
            Loading Navratri registrations…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-input)',
              border: '1px solid var(--border)', margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 6px' }}>No registrations match your search</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Try clearing filters or search terms</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: `2px solid ${SAFFRON}` }}>
                  <th style={{ padding: '14px 16px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>Reg #</th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>Business & Category</th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>Contact Info</th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>Booked Dates & Spot #</th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>Amount Paid</th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg, idx) => {
                  const isExpanded = expandedId === reg.id;
                  const activeDates = (reg.dates || []).filter(d => d.status !== 'refunded');
                  const refundedDates = (reg.dates || []).filter(d => d.status === 'refunded');

                  return (
                    <tr
                      key={reg.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Reg Number */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: '900', color: SAFFRON, fontSize: '13px' }}>
                          {reg.registration_number}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {reg.registration_date ? formatMMDDYYYY(reg.registration_date) : ''}
                        </div>
                      </td>

                      {/* Business & Category */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '900', fontSize: '14px', color: 'var(--text-primary)' }}>
                          {reg.business_name}
                        </div>
                        <div style={{ marginTop: '6px' }}>
                          <CategoryBadge category={reg.category} />
                        </div>
                        {reg.electrical_needed && (
                          <div style={{ fontSize: '11px', fontWeight: '700', color: GOLD, marginTop: '4px' }}>
                            110V Power Required
                          </div>
                        )}
                      </td>

                      {/* Contact Info */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {reg.contact_name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {reg.phone || '—'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {reg.email}
                        </div>
                        {reg.city && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {reg.city}, {reg.state}
                          </div>
                        )}
                      </td>

                      {/* Booked Dates & Spots */}
                      <td style={{ padding: '16px', verticalAlign: 'top', maxWidth: '320px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {activeDates.map(d => (
                            <div
                              key={d.id}
                              style={{
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                borderRadius: '8px', padding: '6px 10px', fontSize: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{d.day_label || formatMMDDYYYY(d.event_date)}</span>
                                <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({d.booth_count} booth)</span>
                              </div>
                              {/* Inline spot editor */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: GOLD, fontWeight: '800' }}>Spot:</span>
                                <input
                                  type="text"
                                  defaultValue={d.booth_spot_number || ''}
                                  placeholder="e.g. #3"
                                  onBlur={e => handleQuickSpotChange(reg.id, d.id, e.target.value)}
                                  style={{
                                    width: '60px', padding: '2px 6px', borderRadius: '4px',
                                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                                    color: 'var(--text-primary)', fontSize: '11px', fontWeight: '800', textAlign: 'center',
                                  }}
                                />
                              </div>
                            </div>
                          ))}

                          {refundedDates.length > 0 && (
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                              {refundedDates.length} date(s) cancelled/refunded
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Amount Paid */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '16px', fontWeight: '950', color: reg.amount_paid > 0 ? '#10B981' : 'var(--text-primary)' }}>
                          ${((reg.amount_paid || 0) / 100).toFixed(2)}
                        </div>
                        {reg.amount_due !== reg.amount_paid && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Due: ${((reg.amount_due || 0) / 100).toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <Badge status={reg.payment_status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Resend Confirmation Email */}
                          <button
                            onClick={() => handleResendEmail(reg)}
                            disabled={resendingId === reg.registration_number}
                            title="Resend Confirmation Email"
                            style={{
                              padding: '6px 11px', borderRadius: '8px',
                              border: '1px solid var(--border)', background: 'var(--bg-input)',
                              color: resendStatus[reg.registration_number] ? '#10B981' : 'var(--text-primary)',
                              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                            }}
                          >
                            {resendingId === reg.registration_number ? 'Sending…' : resendStatus[reg.registration_number] ? 'Sent' : 'Resend'}
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => setEditingReg(JSON.parse(JSON.stringify(reg)))}
                            title="Edit Vendor Details & Spots"
                            style={{
                              padding: '6px 11px', borderRadius: '8px',
                              border: '1px solid var(--border)', background: 'var(--bg-input)',
                              color: 'var(--text-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>

                          {/* Refund Button (if paid) */}
                          {(reg.payment_status === 'paid' || reg.payment_status === 'partially_refunded') && (
                            <button
                              onClick={() => handleOpenRefundModal(reg)}
                              title="Process Refund (Full or Partial)"
                              style={{
                                padding: '6px 11px', borderRadius: '8px',
                                border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)',
                                color: '#F59E0B', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                              }}
                            >
                              Refund
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteReg(reg)}
                            title="Delete Registration"
                            style={{
                              padding: '6px 10px', borderRadius: '8px',
                              border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                              color: '#EF4444', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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

      {/* ── MODAL: REFUND (FULL OR PARTIAL) ─────────────────────────────────── */}
      {refundingReg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ maxWidth: '520px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>
                Issue Refund — {refundingReg.business_name}
              </h2>
              <button onClick={() => setRefundingReg(null)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Registration: <strong>{refundingReg.registration_number}</strong><br/>
              Total Paid Balance: <strong style={{ color: '#10B981' }}>${((refundingReg.amount_paid || 0) / 100).toFixed(2)}</strong>
            </div>

            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setRefundMode('full')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  border: `2px solid ${refundMode === 'full' ? SAFFRON : 'var(--border)'}`,
                  background: refundMode === 'full' ? 'rgba(255,107,53,0.12)' : 'var(--bg-input)',
                  color: refundMode === 'full' ? SAFFRON : 'var(--text-primary)',
                  fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                }}
              >
                Full Refund (${((refundingReg.amount_paid || 0) / 100).toFixed(2)})
              </button>

              <button
                type="button"
                onClick={() => setRefundMode('partial')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  border: `2px solid ${refundMode === 'partial' ? '#F59E0B' : 'var(--border)'}`,
                  background: refundMode === 'partial' ? 'rgba(245,158,11,0.12)' : 'var(--bg-input)',
                  color: refundMode === 'partial' ? '#F59E0B' : 'var(--text-primary)',
                  fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                }}
              >
                Partial Date Refund
              </button>
            </div>

            {/* Partial Date Selection */}
            {refundMode === 'partial' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Select Date(s) to Cancel & Refund:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {(refundingReg.dates || []).filter(d => d.status !== 'refunded').map(d => {
                    const isChecked = selectedRefundDateIds.includes(d.id);
                    return (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedRefundDateIds(prev =>
                                isChecked ? prev.filter(id => id !== d.id) : [...prev, d.id]
                              );
                            }}
                            style={{ width: '16px', height: '16px', accentColor: '#F59E0B' }}
                          />
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{d.day_label || d.event_date}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#F59E0B' }}>
                          ${((d.total_cents || 0) / 100).toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRefundingReg(null)}
                style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRefund}
                disabled={isRefunding || (refundMode === 'partial' && selectedRefundDateIds.length === 0)}
                style={{
                  padding: '10px 22px', borderRadius: '10px', border: 'none',
                  background: '#EF4444', color: '#FFFFFF', fontWeight: '800',
                  cursor: isRefunding ? 'not-allowed' : 'pointer',
                }}
              >
                {isRefunding ? 'Processing Stripe Refund…' : 'Confirm Stripe Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT REGISTRATION & SPOTS ─────────────────────────────────── */}
      {editingReg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>
                Edit Vendor — {editingReg.registration_number}
              </h2>
              <button onClick={() => setEditingReg(null)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Business Name</label>
                <input
                  type="text"
                  value={editingReg.business_name || ''}
                  onChange={e => setEditingReg({ ...editingReg, business_name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Contact Person</label>
                <input
                  type="text"
                  value={editingReg.contact_name || ''}
                  onChange={e => setEditingReg({ ...editingReg, contact_name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  value={editingReg.email || ''}
                  onChange={e => setEditingReg({ ...editingReg, email: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</label>
                <input
                  type="text"
                  value={editingReg.phone || ''}
                  onChange={e => setEditingReg({ ...editingReg, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Assigned Spot Numbers */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: GOLD, textTransform: 'uppercase', marginBottom: '8px' }}>
                Assigned Booth Spot Numbers:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(editingReg.dates || []).map((d, index) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{d.day_label || d.event_date}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Booth Spot:</span>
                      <input
                        type="text"
                        placeholder="e.g. Booth #5"
                        value={d.booth_spot_number || ''}
                        onChange={e => {
                          const nextDates = [...editingReg.dates];
                          nextDates[index] = { ...d, booth_spot_number: e.target.value };
                          setEditingReg({ ...editingReg, dates: nextDates });
                        }}
                        style={{ width: '110px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '800' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Staff Notes</label>
              <textarea
                rows={3}
                value={editingReg.notes || ''}
                onChange={e => setEditingReg({ ...editingReg, notes: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingReg(null)}
                style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: SAFFRON, color: '#FFFFFF', fontWeight: '800', cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CAPACITY SETTINGS ─────────────────────────────────────────── */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ maxWidth: '440px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SAFFRON} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>
                  Booth Capacity Settings
                </h2>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Default Booth Capacity Per Night
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={capacityInput}
                onChange={e => setCapacityInput(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '800' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                When total booths booked on a given date reach this limit, the public form automatically flags that night as Sold Out.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: SAFFRON, color: '#FFFFFF', fontWeight: '800', cursor: 'pointer' }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ODOO GENERAL ENTRY SYNC ───────────────────────────────────── */}
      {showOdooModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ maxWidth: '540px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(14,165,233,0.1)', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>
                    Odoo General Entry
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Navratri 2026 Vendor Booths Final Settlement
                  </div>
                </div>
              </div>
              <button onClick={() => setShowOdooModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Already Synced Warning */}
            {odooSyncStatus && !forceOdooSync ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontWeight: '800', fontSize: '14px', marginBottom: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>Duplicate Blocked: Already Posted to Odoo</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                    Event revenue was previously posted to Odoo under journal entry:
                  </p>
                  <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontWeight: '800', fontSize: '13.5px', color: '#0284C7' }}>
                    <span>{odooSyncStatus.moveName}</span>
                    <span>${Number(odooSyncStatus.totalGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Reference: {odooSyncStatus.ref || 'NAVRATRI-2026-VENDORS-FINAL'} · Date: {odooSyncStatus.date ? formatMMDDYYYY(odooSyncStatus.date) : 'N/A'}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  To avoid double-counting revenue, posting again is restricted. If you made corrections and strictly require re-posting, use Force Re-sync below.
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowOdooModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}>
                    Close
                  </button>
                  <button onClick={() => setForceOdooSync(true)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #D97706', background: 'rgba(245,158,11,0.1)', color: '#D97706', fontWeight: '800', cursor: 'pointer' }}>
                    Force Re-sync
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {forceOdooSync && (
                  <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid #F59E0B', color: '#D97706', fontSize: '12px', fontWeight: '700' }}>
                    Force Re-sync mode active. A new General Entry will be created.
                  </div>
                )}

                <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Event / Analytic Account:</span>
                    <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>Navratri 2026</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Odoo Journal:</span>
                    <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>MISC (General Operations)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Paid Vendors:</span>
                    <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{paidRegs.length} vendors</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Credit Revenue (Acct 2007):</span>
                    <span style={{ fontWeight: '800', color: '#10B981' }}>+${(totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Debit CC Fees (Acct 950):</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>+${(totalRevenue / 100 * 0.029 + paidRegs.length * 0.30).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Debit HCC Bank (Acct 101401):</span>
                    <span style={{ fontWeight: '950', color: '#0284C7' }}>${((totalRevenue / 100) - (totalRevenue / 100 * 0.029 + paidRegs.length * 0.30)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                  This creates and confirms a balanced General Journal Entry in Odoo tagged with the <strong>Navratri 2026</strong> analytic account. Strict duplicate checks ensure this reference can only be submitted once.
                </div>

                {odooSyncMsg && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700',
                    background: odooSyncMsg.startsWith('Success') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: odooSyncMsg.startsWith('Success') ? '#10B981' : '#EF4444',
                    border: `1px solid ${odooSyncMsg.startsWith('Success') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    {odooSyncMsg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowOdooModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => handlePostToOdoo(forceOdooSync)} disabled={isSyncingOdoo || paidRegs.length === 0} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: isSyncingOdoo ? 'rgba(14,165,233,0.5)' : 'linear-gradient(135deg, #0284C7, #0369A1)', color: '#FFFFFF', fontWeight: '800', cursor: isSyncingOdoo || paidRegs.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {isSyncingOdoo ? 'Posting to Odoo...' : 'Confirm & Post General Entry'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
