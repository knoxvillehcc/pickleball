'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

const SAFFRON = '#FF6B35';
const GOLD = '#FFB800';
const MAROON = '#500E2B';

// ── Festival Dates ─────────────────────────────────────────────────────────────
const FESTIVAL_DATES = [
  { date: '2026-10-11', label: 'Day 1 — Sun, Oct 11', isWeekend: false, rate: 201 },
  { date: '2026-10-12', label: 'Day 2 — Mon, Oct 12', isWeekend: false, rate: 201 },
  { date: '2026-10-13', label: 'Day 3 — Tue, Oct 13', isWeekend: false, rate: 201 },
  { date: '2026-10-14', label: 'Day 4 — Wed, Oct 14', isWeekend: false, rate: 201 },
  { date: '2026-10-15', label: 'Day 5 — Thu, Oct 15', isWeekend: false, rate: 201 },
  { date: '2026-10-16', label: 'Day 6 — Fri, Oct 16', isWeekend: true,  rate: 351 },
  { date: '2026-10-17', label: 'Day 7 — Sat, Oct 17', isWeekend: true,  rate: 351 },
  { date: '2026-10-18', label: 'Day 8 — Sun, Oct 18', isWeekend: false, rate: 201 },
  { date: '2026-10-19', label: 'Day 9 — Mon, Oct 19', isWeekend: false, rate: 201 },
  { date: '2026-10-20', label: 'Day 10 — Tue, Oct 20', isWeekend: false, rate: 201 },
  { date: '2026-10-25', label: 'Day 11 — Sun, Oct 25 (Sharad Purnima)', isWeekend: false, rate: 201 },
];

// ── Status Badges ──────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    paid:               { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', color: '#10B981', label: '✓ Paid' },
    pending:            { bg: 'rgba(255,184,0,0.15)',  border: 'rgba(255,184,0,0.4)',  color: GOLD,      label: '⏳ Pending' },
    partially_refunded: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: '#F59E0B', label: '↩ Partial Refund' },
    refunded:           { bg: 'rgba(148,163,184,0.15)',border: 'rgba(148,163,184,0.4)',color: '#94A3B8', label: '↩ Refunded' },
    failed:             { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: '#EF4444', label: '✗ Failed' },
    cancelled:          { bg: 'rgba(148,163,184,0.15)',border: 'rgba(148,163,184,0.4)',color: '#94A3B8', label: 'Cancelled' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: '99px',
      fontSize: '11px', fontWeight: '800',
      backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

// ── Category Badges ────────────────────────────────────────────────────────────
function CategoryBadge({ category }) {
  const icons = {
    clothing: '👗 Clothing',
    jewelry: '💎 Jewelry',
    food: '🍲 Food',
    henna: '🎨 Henna',
    handicrafts: '🪔 Handicrafts',
    services: '💼 Services',
    other: '🛍️ Retail',
  };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
      fontSize: '11px', fontWeight: '700',
      backgroundColor: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)',
      color: SAFFRON,
    }}>
      {icons[category] || category || 'Vendor'}
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
      alert(`✅ ${data.message}`);
      setRefundingReg(null);
      loadData(); // reload fresh state
    } catch (e) {
      alert('Refund failed: ' + e.message);
    } finally {
      setIsRefunding(false);
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
        r.registration_date ? new Date(r.registration_date).toLocaleDateString() : '',
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `navratri-vendors-${dateFilter === 'all' ? 'all-dates' : dateFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Print Full Festival Report
  const printFullReport = () => {
    const rowsHtml = filtered.map(r => {
      const activeDates = (r.dates || []).filter(d => d.status !== 'refunded');
      const datesDetail = activeDates.map(d => `<div>• <strong>${d.day_label}:</strong> ${d.booth_count} booth(s) ${d.booth_spot_number ? `[Spot: ${d.booth_spot_number}]` : ''}</div>`).join('');
      const statusColor = r.payment_status === 'paid' ? '#10B981' : r.payment_status === 'partially_refunded' ? '#F59E0B' : '#EF4444';
      return `
        <tr>
          <td><strong>${r.registration_number}</strong></td>
          <td><strong>${r.business_name}</strong><br/><span style="color:#64748B;font-size:11px;">${r.contact_name}</span></td>
          <td><span style="font-size:11px;padding:2px 6px;background:#FFF3EB;color:#FF6B35;border-radius:4px;font-weight:700;">${r.category.toUpperCase()}</span></td>
          <td>${r.email}<br/><span style="font-size:11px;color:#64748B;">${r.phone || '—'}</span></td>
          <td style="font-size:11px;">${datesDetail || 'No active dates'}</td>
          <td>${r.electrical_needed ? '⚡ Yes' : 'No'}</td>
          <td>$${((r.amount_paid || 0) / 100).toFixed(2)}</td>
          <td><span style="color:${statusColor};font-weight:800;">${r.payment_status.toUpperCase()}</span></td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Navratri 2026 — Master Vendor Report</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; color: #0F172A; padding: 32px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #FF6B35; padding-bottom: 16px; margin-bottom: 24px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .stat { background: #F8FAFC; border: 1px solid #E2E8F0; border-top: 3px solid #FF6B35; border-radius: 8px; padding: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
          th { background: #FFF6EE; padding: 8px 10px; text-align: left; border-bottom: 2px solid #FF6B35; color: #64748B; font-size: 10px; text-transform: uppercase; }
          td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
          tr:nth-child(even) { background: #FAFCFF; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin:0;font-size:22px;color:#0F172A;">🪔 Navratri 2026 — Master Vendor Report</h1>
            <p style="margin:4px 0 0;color:#64748B;font-size:12px;">Knoxville Hindu Community Center · 8580 Hickory Creek Rd, Lenoir City, TN 37771</p>
          </div>
          <div style="text-align:right;font-size:11px;color:#64748B;">
            Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}<br/>
            Total Records: ${filtered.length}
          </div>
        </div>
        <div class="stats">
          <div class="stat"><div style="color:#64748B;font-size:10px;font-weight:700;">TOTAL VENDORS</div><div style="font-size:20px;font-weight:900;">${registrations.length}</div></div>
          <div class="stat"><div style="color:#64748B;font-size:10px;font-weight:700;">CONFIRMED PAID</div><div style="font-size:20px;font-weight:900;color:#10B981;">${paidRegs.length}</div></div>
          <div class="stat"><div style="color:#64748B;font-size:10px;font-weight:700;">TOTAL BOOTHS BOOKED</div><div style="font-size:20px;font-weight:900;color:#FFB800;">${totalBoothsBooked}</div></div>
          <div class="stat"><div style="color:#64748B;font-size:10px;font-weight:700;">TOTAL REVENUE</div><div style="font-size:20px;font-weight:900;color:#FF6B35;">$${(totalRevenue / 100).toLocaleString()}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Reg #</th><th>Business & Contact</th><th>Category</th><th>Contact Info</th><th>Booked Dates & Spots</th><th>Power</th><th>Amount</th><th>Status</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  };

  // Print Individual Day Report (Management Roster for Event Day)
  const printDayReport = (selectedDateStr) => {
    const dateObj = FESTIVAL_DATES.find(d => d.date === selectedDateStr);
    const dateTitle = dateObj ? dateObj.label : selectedDateStr;

    // Gather all vendors who have a booth on this date
    const dayVendors = [];
    for (const r of registrations) {
      const matchDate = (r.dates || []).find(d => d.event_date === selectedDateStr && d.status !== 'refunded');
      if (matchDate) {
        dayVendors.push({
          reg: r,
          dateInfo: matchDate,
        });
      }
    }

    const dayRows = dayVendors.map((item, idx) => {
      const { reg, dateInfo } = item;
      const isPaid = reg.payment_status === 'paid' || reg.payment_status === 'partially_refunded';
      return `
        <tr>
          <td style="text-align:center;font-weight:900;font-size:13px;color:#FF6B35;">${dateInfo.booth_spot_number || `Spot #${idx + 1}`}</td>
          <td><strong>${reg.business_name}</strong><br/><span style="font-size:10px;color:#64748B;">Reg #${reg.registration_number}</span></td>
          <td><span style="font-size:10px;font-weight:700;padding:2px 6px;background:#FFF3EB;color:#FF6B35;border-radius:4px;">${reg.category.toUpperCase()}</span></td>
          <td>${reg.contact_name}<br/><strong>${reg.phone || '—'}</strong></td>
          <td>${reg.email}</td>
          <td style="text-align:center;font-weight:800;">${dateInfo.booth_count} Booth(s)</td>
          <td>${reg.electrical_needed ? '⚡ 110V Needed' : 'Standard'}</td>
          <td><span style="color:${isPaid ? '#10B981' : '#F59E0B'};font-weight:800;">${isPaid ? '✓ PAID' : '⏳ PENDING'}</span></td>
          <td style="border:1px dashed #CBD5E1;width:120px;"></td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Navratri 2026 — Day Vendor Roster (${dateTitle})</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; color: #0F172A; padding: 28px; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #FF6B35; padding-bottom: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th { background: #FFF6EE; padding: 8px 10px; text-align: left; border-bottom: 2px solid #FF6B35; color: #64748B; font-size: 10px; text-transform: uppercase; }
          td { padding: 9px 10px; border-bottom: 1px solid #E2E8F0; vertical-align: middle; }
          tr:nth-child(even) { background: #FAFCFF; }
          .summary-box { display: flex; gap: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin:0;font-size:20px;color:#0F172A;">🪔 Event Day Vendor Roster: ${dateTitle}</h1>
            <p style="margin:3px 0 0;color:#64748B;font-size:12px;">Knoxville Hindu Community Center · Setup: 5:30 PM – 6:45 PM · Event: 7:00 PM – 11:00 PM</p>
          </div>
          <div style="text-align:right;font-size:11px;color:#64748B;">
            <strong>Gate / Check-in Copy</strong><br/>
            Printed: ${new Date().toLocaleTimeString()}
          </div>
        </div>

        <div class="summary-box">
          <div><strong>Total Vendors:</strong> ${dayVendors.length}</div>
          <div><strong>Total Booths Assigned:</strong> ${dayVendors.reduce((s, v) => s + (v.dateInfo.booth_count || 1), 0)}</div>
          <div><strong>Electrical Outlets:</strong> ${dayVendors.filter(v => v.reg.electrical_needed).length} required</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:70px;text-align:center;">Assigned Spot</th>
              <th>Business / Vendor</th>
              <th>Category</th>
              <th>Contact Person & Phone</th>
              <th>Email</th>
              <th style="text-align:center;">Count</th>
              <th>Power</th>
              <th>Payment</th>
              <th>Check-in Signature</th>
            </tr>
          </thead>
          <tbody>${dayRows || '<tr><td colspan="9" style="text-align:center;padding:20px;">No vendors registered for this date.</td></tr>'}</tbody>
        </table>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🪔</span>
            <h1 style={{ fontSize: '26px', fontWeight: '950', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Navratri 2026 — Vendor Booths
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage daily booth reservations ($201 Sun–Thu / $351 Fri–Sat), spot assignments, reports, and refunds.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Public Link Copy Button */}
          <button
            onClick={copyPublicUrl}
            style={{
              padding: '10px 16px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: urlCopied ? '#10B981' : 'var(--text-primary)',
              fontWeight: '800', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <span>{urlCopied ? '✓ Copied!' : '🔗 Public Link'}</span>
          </button>

          {/* Toggle Public Registration */}
          <button
            onClick={handleTogglePublish}
            disabled={isPublishing}
            style={{
              padding: '10px 16px', borderRadius: '10px',
              border: `1.5px solid ${settings.is_published === 'true' ? '#10B981' : '#EF4444'}`,
              background: settings.is_published === 'true' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: settings.is_published === 'true' ? '#10B981' : '#EF4444',
              fontWeight: '800', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <span>{settings.is_published === 'true' ? '🟢 Registration Open' : '🔴 Registration Closed'}</span>
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              padding: '10px 14px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-primary)', fontWeight: '800', fontSize: '13px', cursor: 'pointer',
            }}
          >
            ⚙️ Capacity Settings
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            style={{
              padding: '10px 14px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-primary)', fontWeight: '800', fontSize: '13px', cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

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
          sub="Across all 11 festival dates"
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
          <div style={{ flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              placeholder="🔍 Search vendor, contact, email, phone, spot #, reg number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: '1.5px solid var(--border)', background: 'var(--bg-input)',
                color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box',
              }}
            />
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
              <option value="all">📅 All Dates (Master View)</option>
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
                padding: '9px 16px', borderRadius: '10px', border: '1px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              📥 Export CSV
            </button>

            {dateFilter === 'all' ? (
              <button
                onClick={printFullReport}
                style={{
                  padding: '9px 18px', borderRadius: '10px', border: 'none',
                  background: SAFFRON, color: '#FFFFFF',
                  fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 4px 12px rgba(255,107,53,0.3)',
                }}
              >
                🖨️ Print Master Report
              </button>
            ) : (
              <button
                onClick={() => printDayReport(dateFilter)}
                style={{
                  padding: '9px 18px', borderRadius: '10px', border: 'none',
                  background: `linear-gradient(135deg, ${SAFFRON} 0%, #D4501F 100%)`, color: '#FFFFFF',
                  fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 4px 12px rgba(255,107,53,0.3)',
                }}
              >
                📋 Print Day Roster ({FESTIVAL_DATES.find(d => d.date === dateFilter)?.label.split('—')[0].trim() || 'Day'})
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
          <div style={{ padding: '60px', textAlign: 'center', color: SAFFRON, fontSize: '16px', fontWeight: '800' }}>
            Loading Navratri registrations…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px' }}>No registrations match your search</h3>
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
                          {reg.registration_date ? new Date(reg.registration_date).toLocaleDateString() : ''}
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
                            ⚡ 110V Power Required
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
                                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{d.day_label || d.event_date}</span>
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
                              ↩ {refundedDates.length} date(s) cancelled/refunded
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
                              padding: '6px 10px', borderRadius: '8px',
                              border: '1px solid var(--border)', background: 'var(--bg-input)',
                              color: resendStatus[reg.registration_number] ? '#10B981' : 'var(--text-primary)',
                              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                            }}
                          >
                            {resendingId === reg.registration_number ? '⏳' : resendStatus[reg.registration_number] ? '✓ Sent' : '📧 Resend'}
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => setEditingReg(JSON.parse(JSON.stringify(reg)))}
                            title="Edit Vendor Details & Spots"
                            style={{
                              padding: '6px 10px', borderRadius: '8px',
                              border: '1px solid var(--border)', background: 'var(--bg-input)',
                              color: 'var(--text-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                            }}
                          >
                            ✏️ Edit
                          </button>

                          {/* Refund Button (if paid) */}
                          {(reg.payment_status === 'paid' || reg.payment_status === 'partially_refunded') && (
                            <button
                              onClick={() => handleOpenRefundModal(reg)}
                              title="Process Refund (Full or Partial)"
                              style={{
                                padding: '6px 10px', borderRadius: '8px',
                                border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)',
                                color: '#F59E0B', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                              }}
                            >
                              ↩️ Refund
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
                            🗑️
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>
                ⚙️ Booth Capacity Settings
              </h2>
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
    </div>
  );
}
