'use client';

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportPdfWithNativeShare } from '@/lib/pdfShareHelper';

// Crisp SVG Icons (Strictly NO cartoon emojis per HCC specifications)
function BankIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronDownIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function RefreshIcon({ spinning }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function ShoppingCartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function RotateCcwIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

export default function StripeDepositPosMatchTab({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  fmt,
  card,
  kpiCard,
  btnPrimary,
  btnSecondary,
  inputStyle,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedPayouts, setExpandedPayouts] = useState({});
  const [showReceiptsMap, setShowReceiptsMap] = useState({});
  const [showOnlineListMap, setShowOnlineListMap] = useState({});
  const [filterQuery, setFilterQuery] = useState('');

  // Quick Date Presets
  const applyPreset = (preset) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (preset === 'navratri') {
      setStartDate('2026-10-09');
      setEndDate('2026-10-20');
    } else if (preset === 'month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      setStartDate(monthAgo);
      setEndDate(todayStr);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stripe/deposit-pos-match?start=${startDate}&end=${endDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.payouts && json.payouts.length > 0) {
          setExpandedPayouts({ [json.payouts[0].id]: true });
        }
      }
    } catch (err) {
      console.error('[StripeDepositPosMatch] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (payoutId) => {
    setExpandedPayouts(prev => ({ ...prev, [payoutId]: !prev[payoutId] }));
  };

  const toggleReceipts = (payoutId) => {
    setShowReceiptsMap(prev => ({ ...prev, [payoutId]: !prev[payoutId] }));
  };

  const toggleOnlineList = (payoutId) => {
    setShowOnlineListMap(prev => ({ ...prev, [payoutId]: !prev[payoutId] }));
  };

  // CSV Export with Dedicated Refund Columns
  const downloadCSV = () => {
    if (!data?.payouts?.length) return;

    const rows = [
      [
        'Deposit Date (MM-DD-YYYY)',
        'Arrival Date (MM-DD-YYYY)',
        'Payout ID',
        'Deposit Gross',
        'Deposit Refunds',
        'Deposit Fees',
        'Net Deposited',
        'Odoo Bank Clearance',
        'Channel',
        'Type (Charge/Refund)',
        'Refund Reason',
        'Original Sale Date (MM-DD-YYYY)',
        'Product / Service Description',
        'Quantity',
        'Line Amount'
      ]
    ];

    for (const po of data.payouts) {
      const odooStatus = po.isOdooCleared ? 'Cleared' : (po.odooReconciledCount > 0 ? 'Partial' : 'Pending');

      // POS Products Summary & Transactions
      if (po.posTransactions?.length) {
        for (const tx of po.posTransactions) {
          const typeStr = tx.isRefund ? 'Refund' : 'Charge';
          const reasonStr = tx.refundReason || '';
          const origDateStr = tx.originalDate || '';
          const itemsStr = tx.items?.map(it => `${it.productName} (x${it.qty})`).join('; ') || tx.orderName;

          rows.push([
            po.payoutDate, po.arrivalDate, po.id,
            po.gross.toFixed(2), (po.refunds || 0).toFixed(2), po.fees.toFixed(2), po.net.toFixed(2),
            odooStatus, 'POS Register', typeStr, reasonStr, origDateStr,
            itemsStr, tx.items?.reduce((s, i) => s + (i.qty || 1), 0) || 1, tx.amount.toFixed(2)
          ]);
        }
      } else if (po.posProductSummary?.length) {
        for (const item of po.posProductSummary) {
          rows.push([
            po.payoutDate, po.arrivalDate, po.id,
            po.gross.toFixed(2), (po.refunds || 0).toFixed(2), po.fees.toFixed(2), po.net.toFixed(2),
            odooStatus, 'POS Register', item.isRefund ? 'Refund' : 'Charge', '', '',
            item.productName, item.qty, item.amount.toFixed(2)
          ]);
        }
      }

      // Online Web Transactions
      if (po.onlineTransactions?.length) {
        for (const tx of po.onlineTransactions) {
          const typeStr = tx.isRefund ? 'Refund' : 'Charge';
          const reasonStr = tx.refundReason || '';
          const origDateStr = tx.originalDate || '';

          rows.push([
            po.payoutDate, po.arrivalDate, po.id,
            po.gross.toFixed(2), (po.refunds || 0).toFixed(2), po.fees.toFixed(2), po.net.toFixed(2),
            odooStatus, 'Online Web', typeStr, reasonStr, origDateStr,
            tx.productName || tx.description, 1, tx.amount.toFixed(2)
          ]);
        }
      } else if (po.onlineSummary?.length) {
        for (const item of po.onlineSummary) {
          rows.push([
            po.payoutDate, po.arrivalDate, po.id,
            po.gross.toFixed(2), (po.refunds || 0).toFixed(2), po.fees.toFixed(2), po.net.toFixed(2),
            odooStatus, 'Online Web', item.isRefund ? 'Refund' : 'Charge', '', '',
            item.name, item.count, item.amount.toFixed(2)
          ]);
        }
      }
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stripe-deposits-pos-match-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Professional PDF Statement Export with Dedicated Refund Metrics
  const downloadPDF = async () => {
    if (!data?.payouts?.length) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryOrange = [234, 88, 12];
    const darkSlate = [30, 41, 59];

    // Header Branding
    doc.setFillColor(...primaryOrange);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...darkSlate);
    doc.text('HINDU COMMUNITY CENTER', 14, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Stripe Bank Deposits vs POS Product Sales & Refunds Reconciliation', 14, 26);
    doc.text(`Period: ${data.startDate} to ${data.endDate} | Generated: ${new Date().toLocaleDateString('en-US')}`, 14, 32);

    // KPI Summary Box with Dedicated Refunds Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 36, 182, 22, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 36, 182, 22, 2, 2, 'S');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('NET DEPOSITED', 18, 43);
    doc.text('GROSS CHARGES', 60, 43);
    doc.text('TOTAL REFUNDS', 105, 43);
    doc.text('STRIPE FEES', 148, 43);

    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(fmt(data.kpis.totalNet), 18, 52);

    doc.setTextColor(15, 23, 42);
    doc.text(fmt(data.kpis.totalGross), 60, 52);

    doc.setTextColor(239, 68, 68); // Red
    doc.text(fmt(data.kpis.totalRefunds || 0), 105, 52);

    doc.setTextColor(245, 158, 11); // Amber
    doc.text(fmt(data.kpis.totalFees), 148, 52);

    let currentY = 64;

    // Table of Deposits
    const tableBody = [];
    data.payouts.forEach(po => {
      const posProductsText = po.posProductSummary?.map(p => `${p.productName} (x${p.qty})`).join(', ') || 'None';
      const odooBadge = po.isOdooCleared ? 'Cleared' : (po.odooReconciledCount > 0 ? 'Partial' : 'Pending');

      tableBody.push([
        po.arrivalDate,
        po.id,
        fmt(po.gross),
        fmt(po.refunds || 0),
        fmt(po.fees),
        fmt(po.net),
        odooBadge,
        posProductsText
      ]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Arrival Date', 'Payout Ref', 'Gross', 'Refunds', 'Fees', 'Net', 'Odoo Status', 'POS Products Sold']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 22, fontSize: 8 },
        1: { cellWidth: 26, fontSize: 7, font: 'courier' },
        2: { cellWidth: 16, halign: 'right', fontSize: 8 },
        3: { cellWidth: 16, halign: 'right', fontSize: 8, textColor: [239, 68, 68] },
        4: { cellWidth: 14, halign: 'right', fontSize: 8, textColor: [245, 158, 11] },
        5: { cellWidth: 18, halign: 'right', fontSize: 8, fontStyle: 'bold', textColor: [16, 185, 129] },
        6: { cellWidth: 18, halign: 'center', fontSize: 7.5 },
        7: { cellWidth: 'auto', fontSize: 7.5 },
      },
      styles: { cellPadding: 3, overflow: 'linebreak' },
    });

    // Share / Save
    await exportPdfWithNativeShare(doc, `stripe-deposit-pos-statement-${data.startDate}-to-${data.endDate}.pdf`);
  };

  // Filter payouts by user query
  const filteredPayouts = (data?.payouts || []).filter(po => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    const matchesId = po.id.toLowerCase().includes(q);
    const matchesDate = po.arrivalDate.includes(q) || po.payoutDate.includes(q);
    const matchesPos = po.posProductSummary?.some(p => p.productName.toLowerCase().includes(q));
    const matchesOnline = po.onlineSummary?.some(p => p.name.toLowerCase().includes(q));
    return matchesId || matchesDate || matchesPos || matchesOnline;
  });

  return (
    <div>
      {/* ── TOP ACTION BAR: PRESETS & ACTIONS ───────────────────────────── */}
      <div style={{ ...card, padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
              Quick Presets
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => applyPreset('navratri')}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid #F59E0B',
                  background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <span>Navratri 2026 (10-09 to 10-20)</span>
              </button>
              <button
                onClick={() => applyPreset('month')}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--bg-button-secondary)', color: 'var(--text-primary)',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                This Month
              </button>
              <button
                onClick={() => applyPreset('30days')}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--bg-button-secondary)', color: 'var(--text-primary)',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Last 30 Days
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                ...btnPrimary,
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 22px', fontSize: '13px', opacity: loading ? 0.7 : 1
              }}
            >
              <RefreshIcon spinning={loading} />
              <span>{loading ? 'Reconciling...' : 'Match Deposits'}</span>
            </button>

            {data?.payouts?.length > 0 && (
              <>
                <button
                  onClick={downloadCSV}
                  style={{
                    ...btnSecondary,
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 16px', fontSize: '13px'
                  }}
                >
                  <DownloadIcon />
                  <span>CSV</span>
                </button>
                <button
                  onClick={downloadPDF}
                  style={{
                    ...btnSecondary,
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 16px', fontSize: '13px'
                  }}
                >
                  <FileTextIcon />
                  <span>PDF Statement</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI STATS CARDS WITH DEDICATED REFUND CARD ───────────────────── */}
      {data?.kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 'clamp(10px, 1.8vw, 16px)', marginBottom: '24px' }}>
          <div style={{ ...kpiCard, borderTop: '3.5px solid #10B981' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Net Deposited</span>
            <span className="kpi-stat-value" style={{ color: '#10B981', fontSize: 'clamp(20px, 3.2vw, 26px)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(data.kpis.totalNet)}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{data.kpis.payoutsCount} bank deposits</span>
          </div>

          <div style={{ ...kpiCard, borderTop: '3.5px solid #0284C7' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Gross Volume</span>
            <span className="kpi-stat-value" style={{ color: '#0284C7', fontSize: 'clamp(20px, 3.2vw, 26px)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(data.kpis.totalGross)}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Before Stripe fees &amp; returns</span>
          </div>

          <div style={{ ...kpiCard, borderTop: '3.5px solid #EF4444' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Refunds</span>
            <span className="kpi-stat-value" style={{ color: '#EF4444', fontSize: 'clamp(20px, 3.2vw, 26px)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(data.kpis.totalRefunds || 0)}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{data.kpis.totalRefundsCount || 0} returned transactions</span>
          </div>

          <div style={{ ...kpiCard, borderTop: '3.5px solid #F59E0B' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Stripe CC Fees</span>
            <span className="kpi-stat-value" style={{ color: '#F59E0B', fontSize: 'clamp(20px, 3.2vw, 26px)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(data.kpis.totalFees)}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Deducted automatically</span>
          </div>

          <div style={{ ...kpiCard, borderTop: '3.5px solid #8B5CF6' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>POS Products Sold</span>
            <span className="kpi-stat-value" style={{ color: '#8B5CF6', fontSize: 'clamp(20px, 3.2vw, 26px)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
              {data.kpis.totalPosItems} items
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>across {data.kpis.totalPosOrders} register orders</span>
          </div>
        </div>
      )}

      {/* ── SEARCH & TABLE CONTROLS ─────────────────────────────────────── */}
      {data?.payouts?.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ maxWidth: '340px', width: '100%' }}>
            <input
              type="text"
              placeholder="Filter by product, refund, payout ID, or date..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              style={{ ...inputStyle, padding: '8px 14px', fontSize: '13px' }}
            />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {filteredPayouts.length} of {data.payouts.length} Stripe deposits
          </div>
        </div>
      )}

      {/* ── DEPOSITS LIST & PRODUCT BREAKDOWNS ──────────────────────────── */}
      {filteredPayouts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredPayouts.map(po => {
            const isExpanded = !!expandedPayouts[po.id];
            const showReceipts = !!showReceiptsMap[po.id];
            const showOnline = !!showOnlineListMap[po.id];

            return (
              <div key={po.id} style={{ ...card, overflow: 'hidden', border: isExpanded ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border)' }}>
                {/* Deposit Row Header */}
                <div
                  onClick={() => toggleExpand(po.id)}
                  style={{
                    padding: '16px 20px', background: isExpanded ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg-card)',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '12px', transition: 'background 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: 'var(--accent)' }}>
                      <ChevronDownIcon open={isExpanded} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {po.arrivalDate}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          (Initiated: {po.payoutDate})
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          {po.id}
                        </span>
                        {/* Odoo Bank Feed Match Badge */}
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                          background: po.isOdooCleared ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: po.isOdooCleared ? '#10B981' : '#F59E0B',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                          {po.isOdooCleared ? <CheckIcon /> : null}
                          {po.isOdooCleared ? 'Cleared in Odoo Bank Feed' : `Odoo Matched: ${po.odooReconciledCount}/${po.chargeCount}`}
                        </span>

                        {po.refundCount > 0 && (
                          <span style={{
                            fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <RotateCcwIcon />
                            <span>{po.refundCount} Refund{po.refundCount > 1 ? 's' : ''} ({fmt(po.refunds)})</span>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {po.chargeCount} card transactions {po.refundCount > 0 ? `· ${po.refundCount} refund(s)` : ''} · {po.destination}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: '600' }}>{fmt(po.gross)}</div>
                    </div>
                    {po.refunds < 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Refunds</div>
                        <div style={{ fontSize: '14px', color: '#EF4444', fontFamily: 'monospace', fontWeight: '700' }}>{fmt(po.refunds)}</div>
                      </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fees</div>
                      <div style={{ fontSize: '14px', color: '#F59E0B', fontFamily: 'monospace', fontWeight: '600' }}>{fmt(po.fees)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Deposited</div>
                      <div style={{ fontSize: '17px', color: '#10B981', fontFamily: 'monospace', fontWeight: '700' }}>{fmt(po.net)}</div>
                    </div>
                  </div>
                </div>

                {/* Expanded Hybrid Breakdown */}
                {isExpanded && (
                  <div style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card-secondary, var(--bg-card))' }}>
                    {/* SECTION A: POS PRODUCT SALES */}
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#10B981' }}><ShoppingCartIcon /></span>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            POS Register Product Sales
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            ({po.posProductSummary?.length || 0} product types)
                          </span>
                        </div>

                        {po.posTransactions?.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleReceipts(po.id); }}
                            style={{
                              padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                              background: showReceipts ? 'var(--accent)' : 'var(--bg-button-secondary)',
                              color: showReceipts ? '#FFFFFF' : 'var(--text-primary)',
                              fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s'
                            }}
                          >
                            {showReceipts ? 'Hide POS Receipts' : `Show Individual Receipts (${po.posTransactions.length})`}
                          </button>
                        )}
                      </div>

                      {po.posProductSummary?.length > 0 ? (
                        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product Name</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity Sold</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {po.posProductSummary.map((item, idx) => {
                                const isRef = item.isRefund || item.amount < 0;
                                return (
                                  <tr key={item.productId || idx} style={{ borderTop: '1px solid var(--border)', background: isRef ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                                    <td style={{ padding: '10px 16px', color: isRef ? '#EF4444' : 'var(--text-primary)', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {isRef && <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>REFUND</span>}
                                      <span>{item.productName}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', color: isRef ? '#EF4444' : 'var(--text-primary)', fontSize: '13px', fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>
                                      {item.qty}
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', color: isRef ? '#EF4444' : '#10B981', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700' }}>
                                      {fmt(item.amount)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                          No in-person POS terminal transactions in this deposit bundle.
                        </div>
                      )}

                      {/* INDIVIDUAL POS RECEIPTS TABLE (TOGGLEABLE) */}
                      {showReceipts && po.posTransactions?.length > 0 && (
                        <div style={{ marginTop: '14px', borderRadius: '10px', border: '1px solid rgba(2, 132, 199, 0.3)', overflow: 'hidden' }}>
                          <div style={{ padding: '10px 16px', background: 'rgba(2, 132, 199, 0.08)', fontSize: '12px', fontWeight: '700', color: '#0284C7' }}>
                            Individual Register Receipts &amp; Item Breakdown
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Order / Receipt</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Customer</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Card</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Items / Reason</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {po.posTransactions.map((tx, tIdx) => {
                                  const isRef = tx.isRefund || tx.amount < 0;
                                  return (
                                    <tr key={tx.id || tx.orderId || tIdx} style={{ borderTop: '1px solid var(--border)', background: isRef ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                      <td style={{ padding: '8px 12px', fontWeight: '600', color: isRef ? '#EF4444' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                        {isRef ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>REFUND</span>
                                            <span>{tx.orderName}</span>
                                          </div>
                                        ) : (
                                          tx.orderName
                                        )}
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.date} {tx.time}</div>
                                      </td>
                                      <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                                        {tx.customer}
                                      </td>
                                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {tx.cardBrand} ···{tx.last4}
                                      </td>
                                      <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                                        {isRef && tx.refundReason && (
                                          <div style={{ color: '#EF4444', fontWeight: '600', fontSize: '11px', marginBottom: '2px' }}>
                                            Reason: {tx.refundReason} {tx.originalDate ? `(Sale: ${tx.originalDate})` : ''}
                                          </div>
                                        )}
                                        {tx.items?.map((it, iIdx) => (
                                          <div key={iIdx}>
                                            <span style={{ fontWeight: '600' }}>{it.productName}</span> &times; {it.qty} ({fmt(it.amount)})
                                          </div>
                                        ))}
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: isRef ? '#EF4444' : '#10B981', whiteSpace: 'nowrap' }}>
                                        {fmt(tx.amount)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION B: ONLINE / WEB TRANSACTIONS */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#0284C7' }}><GlobeIcon /></span>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            Online &amp; Website Transactions
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            (Website passes, memberships, donations, refunds)
                          </span>
                        </div>

                        {po.onlineTransactions?.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleOnlineList(po.id); }}
                            style={{
                              padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                              background: showOnline ? '#0284C7' : 'var(--bg-button-secondary)',
                              color: showOnline ? '#FFFFFF' : 'var(--text-primary)',
                              fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s'
                            }}
                          >
                            {showOnline ? 'Hide Transactions' : `Show Individual Online Items (${po.onlineTransactions.length})`}
                          </button>
                        )}
                      </div>

                      {po.onlineSummary?.length > 0 ? (
                        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category / Source</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Count</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {po.onlineSummary.map((item, idx) => {
                                const isRef = item.isRefund || item.amount < 0;
                                return (
                                  <tr key={idx} style={{ borderTop: '1px solid var(--border)', background: isRef ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                                    <td style={{ padding: '10px 16px', color: isRef ? '#EF4444' : 'var(--text-primary)', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {isRef && <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>REFUND</span>}
                                      <span>{item.name}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', color: isRef ? '#EF4444' : 'var(--text-primary)', fontSize: '13px', fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>
                                      {item.count}
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', color: isRef ? '#EF4444' : '#0284C7', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700' }}>
                                      {fmt(item.amount)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                          No online web payments in this deposit bundle.
                        </div>
                      )}

                      {/* INDIVIDUAL ONLINE TRANSACTIONS TABLE (TOGGLEABLE) */}
                      {showOnline && po.onlineTransactions?.length > 0 && (
                        <div style={{ marginTop: '14px', borderRadius: '10px', border: '1px solid rgba(2, 132, 199, 0.3)', overflow: 'hidden' }}>
                          <div style={{ padding: '10px 16px', background: 'rgba(2, 132, 199, 0.08)', fontSize: '12px', fontWeight: '700', color: '#0284C7' }}>
                            Individual Online Registrations &amp; Refund Details
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item / Service</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Customer</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Card</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date &amp; Details</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {po.onlineTransactions.map((tx, tIdx) => {
                                  const isRef = tx.isRefund || tx.amount < 0;
                                  return (
                                    <tr key={tx.id || tIdx} style={{ borderTop: '1px solid var(--border)', background: isRef ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                      <td style={{ padding: '8px 12px', fontWeight: '600', color: isRef ? '#EF4444' : 'var(--text-primary)' }}>
                                        {isRef ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>REFUND</span>
                                            <span>{tx.productName || tx.description}</span>
                                          </div>
                                        ) : (
                                          tx.productName || tx.description
                                        )}
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{tx.id}</div>
                                      </td>
                                      <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                                        <div>{tx.customer}</div>
                                        {tx.email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.email}</div>}
                                      </td>
                                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {tx.cardBrand} ···{tx.last4}
                                      </td>
                                      <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                                        <div>{tx.date} {tx.time}</div>
                                        {isRef && tx.refundReason && (
                                          <div style={{ color: '#EF4444', fontSize: '11px', fontWeight: '600' }}>
                                            Reason: {tx.refundReason} {tx.originalDate ? `(Sale: ${tx.originalDate})` : ''}
                                          </div>
                                        )}
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: isRef ? '#EF4444' : '#0284C7', whiteSpace: 'nowrap' }}>
                                        {fmt(tx.amount)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        !loading && (
          <div style={{ ...card, padding: '70px 20px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
              <BankIcon />
            </div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              No Stripe Deposits Loaded
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 18px' }}>
              Select a date range or choose a quick preset (like <strong>Navratri 2026</strong>), then click <strong>Match Deposits</strong> to view exact product sales and refunds per bank payout.
            </p>
            <button onClick={fetchData} style={btnPrimary}>
              Match Deposits Now
            </button>
          </div>
        )
      )}
    </div>
  );
}
