'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Constants ─────────────────────────────────────────────────────────────────
const PERMISSIONS = {
  VIEW:         'pnl',
  PRODUCT:      'pnl-product-detail',
  INVOICE:      'pnl-invoice-detail',
  EXPORT:       'pnl-export',
  COSTS:        'pnl-costs',
  REFRESH:      'pnl-refresh',
  SETTINGS:     'pnl-settings',
};

const CURRENCY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const NUM      = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INT      = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function fmtCur(v)  { return v == null ? '—' : CURRENCY.format(v); }
function fmtNum(v)  { return v == null ? '—' : NUM.format(v); }
function fmtInt(v)  { return v == null ? '—' : INT.format(v); }
function fmtPct(v)  { return v == null ? '—' : NUM.format(v) + '%'; }

function hasPerm(user, slug) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const pages = Array.isArray(user.allowedPages) ? user.allowedPages : [];
  return pages.includes('*') || pages.includes(slug);
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function today()    { return new Date().toISOString().slice(0, 10); }
function yyyyMmDd(d){ return d.toISOString().slice(0, 10); }

function getPresetRange(preset) {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = now.getMonth();
  const d    = now.getDate();

  switch (preset) {
    case 'today':
      return { start: today(), end: today() };
    case 'yesterday': {
      const y2 = new Date(now); y2.setDate(d - 1);
      return { start: yyyyMmDd(y2), end: yyyyMmDd(y2) };
    }
    case 'this_week': {
      const dow = now.getDay(); // 0=Sun
      const s   = new Date(now); s.setDate(d - dow);
      return { start: yyyyMmDd(s), end: today() };
    }
    case 'this_month':
      return { start: `${y}-${String(m + 1).padStart(2,'0')}-01`, end: today() };
    case 'last_month': {
      const lm  = new Date(y, m, 0); // last day of prev month
      const lms = new Date(y, m - 1, 1);
      return { start: yyyyMmDd(lms), end: yyyyMmDd(lm) };
    }
    case 'this_quarter': {
      const q  = Math.floor(m / 3);
      const qs = new Date(y, q * 3, 1);
      return { start: yyyyMmDd(qs), end: today() };
    }
    case 'this_year':
      return { start: `${y}-01-01`, end: today() };
    default:
      return { start: `${y}-${String(m + 1).padStart(2,'0')}-01`, end: today() };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

const Spinner = ({ size = 24 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: `${size > 20 ? 3 : 2}px solid var(--accent-glow)`,
    borderTop: `${size > 20 ? 3 : 2}px solid var(--accent)`,
    animation: 'pnl-spin 0.75s linear infinite',
    flexShrink: 0,
  }} />
);

const Badge = ({ children, color = 'var(--accent)', bg = 'var(--accent-glow)' }) => (
  <span style={{
    fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '9999px',
    background: bg, color, border: `1px solid ${color}22`,
    whiteSpace: 'nowrap',
  }}>
    {children}
  </span>
);

function SummaryCard({ label, value, icon, color = 'var(--accent)', sublabel, negative = false }) {
  const displayColor = negative && typeof value === 'string' && value.startsWith('-')
    ? 'var(--text-error)' : color;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderTop: `3px solid ${color}`,
      borderRadius: '14px', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color, fontSize: '18px', lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '26px', fontWeight: '950', color: displayColor, lineHeight: 1, letterSpacing: '-0.5px' }}>
        {value ?? <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>—</span>}
      </div>
      {sublabel && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{sublabel}</div>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderTop: '3px solid var(--border)', borderRadius: '14px', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ height: 12, width: '60%', borderRadius: 6, background: 'var(--border)', animation: 'pnl-pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 28, width: '80%', borderRadius: 6, background: 'var(--border)', animation: 'pnl-pulse 1.5s ease-in-out infinite 0.2s' }} />
    </div>
  );
}

// ── Simple bar chart using SVG ────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = 'var(--accent)', formatValue = fmtCur, title }) {
  if (!data || data.length === 0) return null;
  const max     = Math.max(...data.map(d => Math.abs(d[valueKey] || 0)));
  const barH    = 28;
  const gap     = 8;
  const labelW  = 140;
  const chartW  = 280;
  const totalH  = data.length * (barH + gap);

  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        {title}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={labelW + chartW + 80} height={totalH} style={{ display: 'block', minWidth: labelW + chartW + 80 }}>
          {data.map((item, i) => {
            const val    = item[valueKey] || 0;
            const barLen = max > 0 ? (Math.abs(val) / max) * chartW : 0;
            const y      = i * (barH + gap);
            const isNeg  = val < 0;
            const barColor = isNeg ? 'var(--text-error)' : color;
            return (
              <g key={item[labelKey] || i}>
                <text x={labelW - 8} y={y + barH / 2 + 5} textAnchor="end"
                  style={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                  {(item[labelKey] || '').slice(0, 18)}{(item[labelKey] || '').length > 18 ? '…' : ''}
                </text>
                <rect x={labelW} y={y + 4} width={Math.max(barLen, 2)} height={barH - 8}
                  rx={4} fill={barColor} opacity={0.85} />
                <text x={labelW + barLen + 6} y={y + barH / 2 + 5}
                  style={{ fontSize: 10, fill: isNeg ? 'var(--text-error)' : 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                  {formatValue(val)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Warning Banner ────────────────────────────────────────────────────────────
function WarningSection({ warnings }) {
  const [open, setOpen] = useState(false);
  if (!warnings || warnings.length === 0) return null;
  return (
    <div style={{
      background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: '12px', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 20px', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
          color: '#D97706', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '18px' }}>⚠️</span>
        <span style={{ fontWeight: '700', fontSize: '14px' }}>
          {warnings.length} Data Quality Warning{warnings.length !== 1 ? 's' : ''}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '18px', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {warnings.map((w, i) => (
            <div key={i} style={{
              padding: '10px 14px', background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px',
              fontSize: '13px', color: 'var(--text-secondary)',
            }}>
              <span style={{ fontWeight: '700', color: '#D97706', marginRight: '6px' }}>
                {w.type === 'no_cost' ? '💰' : w.type === 'no_cogs' ? '📊' : '⚠️'}
              </span>
              {w.message}
              {w.productName && <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>({w.productName})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PnLPage() {
  // Auth / user
  const [user,         setUser]         = useState(null);
  const [userLoading,  setUserLoading]  = useState(true);

  // Data state
  const [reportData,   setReportData]   = useState(null);
  const [filters,      setFilters]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [filterLoading,setFilterLoading]= useState(true);
  const [lastSync,     setLastSync]     = useState(null);
  const [error,        setError]        = useState(null);

  // Date & filters
  const initial = getPresetRange('this_month');
  const [startDate,  setStartDate]  = useState(initial.start);
  const [endDate,    setEndDate]    = useState(initial.end);
  const [preset,     setPreset]     = useState('this_month');
  const [basis,      setBasis]      = useState('accrual');
  const [activeFilters, setActiveFilters] = useState({
    categoryIds: [], productIds: [], customerIds: [],
    salespersonIds: [], companyIds: [], paymentStatus: [],
  });
  const [filterSearch, setFilterSearch] = useState('');

  // Table state
  const [sortCol,    setSortCol]    = useState('netSales');
  const [sortDir,    setSortDir]    = useState('desc');
  const [page,       setPage]       = useState(1);
  const [pageSize]                  = useState(20);
  const [expandedCats, setExpandedCats] = useState(new Set());
  const [expandedProds, setExpandedProds] = useState(new Set());

  // Comparison
  const [compareMode,  setCompareMode]  = useState(false);
  const [comparePreset, setComparePreset] = useState('previous_period');
  const [compareData,  setCompareData]  = useState(null);

  // Export & PDF
  const [exporting,    setExporting]    = useState(false);
  const [pdfModal,     setPdfModal]     = useState(false);
  const [pdfOptions,   setPdfOptions]   = useState({ detailLevel: 'category', orientation: 'landscape' });
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Column visibility
  const [hiddenCols, setHiddenCols] = useState(new Set());
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const allCols = [
    { key: 'catName',         label: 'Category' },
    { key: 'parentCatName',   label: 'Parent' },
    { key: 'qtySold',         label: 'Qty Sold' },
    { key: 'qtyReturned',     label: 'Returned' },
    { key: 'netQty',          label: 'Net Qty' },
    { key: 'grossSales',      label: 'Gross Sales' },
    { key: 'discounts',       label: 'Discounts' },
    { key: 'refunds',         label: 'Refunds' },
    { key: 'netSales',        label: 'Net Sales' },
    { key: 'cogs',            label: 'COGS',        costGated: true },
    { key: 'grossProfit',     label: 'Gross Profit', costGated: true },
    { key: 'grossMargin',     label: 'Margin %',     costGated: true },
    { key: 'taxes',           label: 'Taxes' },
    { key: 'invoiceCount',    label: 'Invoices' },
    { key: 'pctOfTotalSales', label: '% Sales' },
    { key: 'pctOfTotalProfit',label: '% Profit',    costGated: true },
  ];

  // ── Fetch current user ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { setUser(d.user || null); setUserLoading(false); })
      .catch(() => setUserLoading(false));
  }, []);

  // ── Fetch filter options ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetch('/api/pnl/filters')
      .then(r => r.json())
      .then(d => { if (d.success) setFilters(d.filters); })
      .catch(console.error)
      .finally(() => setFilterLoading(false));
  }, [user]);

  // ── Fetch P&L data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async (opts = {}) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: opts.startDate || startDate,
        endDate:   opts.endDate   || endDate,
        basis:     opts.basis     || basis,
        page:      String(opts.page || page),
        pageSize:  String(pageSize),
      });
      for (const id of activeFilters.categoryIds)    params.append('categoryId',    String(id));
      for (const id of activeFilters.productIds)     params.append('productId',     String(id));
      for (const id of activeFilters.customerIds)    params.append('customerId',    String(id));
      for (const id of activeFilters.salespersonIds) params.append('salespersonId', String(id));
      for (const id of activeFilters.companyIds)     params.append('companyId',     String(id));
      for (const s  of activeFilters.paymentStatus)  params.append('paymentStatus', s);
      if (hasPerm(user, PERMISSIONS.INVOICE)) params.set('includeDetail', 'true');

      const res  = await fetch(`/api/pnl/data?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load data');
      setReportData(data);
      setLastSync(data.lastSync || new Date().toISOString());

      // Log the view
      logAudit('view_report', { dateRangeStart: startDate, dateRangeEnd: endDate, accountingBasis: basis });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, startDate, endDate, basis, page, pageSize, activeFilters]);

  // Initial load
  useEffect(() => {
    if (user && hasPerm(user, PERMISSIONS.VIEW)) {
      fetchData();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audit logger ─────────────────────────────────────────────────────────────
  const logAudit = useCallback(async (action, extra = {}) => {
    try {
      await fetch('/api/pnl/audit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, dateRangeStart: startDate, dateRangeEnd: endDate, ...extra }),
      });
    } catch { /* non-fatal */ }
  }, [startDate, endDate]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const applyFilter = () => {
    setPage(1);
    fetchData({ page: 1 });
    logAudit('change_date_range', { dateRangeStart: startDate, dateRangeEnd: endDate, accountingBasis: basis });
  };

  const resetFilter = () => {
    const r = getPresetRange('this_month');
    setStartDate(r.start);
    setEndDate(r.end);
    setPreset('this_month');
    setBasis('accrual');
    setActiveFilters({ categoryIds: [], productIds: [], customerIds: [], salespersonIds: [], companyIds: [], paymentStatus: [] });
    setPage(1);
    fetchData({ startDate: r.start, endDate: r.end, basis: 'accrual', page: 1 });
  };

  const handlePreset = (p) => {
    const r = getPresetRange(p);
    setPreset(p);
    setStartDate(r.start);
    setEndDate(r.end);
  };

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const toggleExpand = (catId) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) { next.delete(catId); } else {
        next.add(catId);
        logAudit('view_invoice_detail', { category: catId });
      }
      return next;
    });
  };

  const toggleExpandProd = (prodId) => {
    setExpandedProds(prev => {
      const next = new Set(prev);
      if (next.has(prodId)) { next.delete(prodId); } else { next.add(prodId); }
      return next;
    });
  };

  // ── Sorted & displayed categories ────────────────────────────────────────────
  const displayCats = reportData?.categories ? [...reportData.categories].sort((a, b) => {
    const aVal = a[sortCol] ?? -Infinity;
    const bVal = b[sortCol] ?? -Infinity;
    const n    = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
    return sortDir === 'desc' ? -n : n;
  }) : [];

  // ── Export handlers ───────────────────────────────────────────────────────────
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = buildExportParams('csv', 'category');
      const res = await fetch(`/api/pnl/export?${params}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url;
      a.download = `HCC_PNL_${startDate}_to_${endDate}.csv`;
      a.click(); URL.revokeObjectURL(url);
      logAudit('export_csv', { exportType: 'csv', detailLevel: 'category' });
    } catch (e) { alert('CSV export failed: ' + e.message); } finally { setExporting(false); }
  };

  const handleExportExcel = async (detailLevel = 'category') => {
    setExporting(true);
    try {
      const params = buildExportParams('excel', detailLevel);
      const res = await fetch(`/api/pnl/export?${params}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url;
      a.download = `HCC_PNL_${startDate}_to_${endDate}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      logAudit('export_excel', { exportType: 'excel', detailLevel });
    } catch (e) { alert('Excel export failed: ' + e.message); } finally { setExporting(false); }
  };

  function buildExportParams(format, detailLevel) {
    const p = new URLSearchParams({ format, startDate, endDate, basis, detailLevel });
    for (const id of activeFilters.categoryIds)    p.append('categoryId',    String(id));
    for (const id of activeFilters.customerIds)    p.append('customerId',    String(id));
    for (const id of activeFilters.salespersonIds) p.append('salespersonId', String(id));
    return p.toString();
  }

  // ── PDF Export ────────────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    setPdfGenerating(true);
    try {
      // Fetch all data for export (no pagination)
      const params = new URLSearchParams({ startDate, endDate, basis, pageSize: '9999', page: '1' });
      for (const id of activeFilters.categoryIds)    params.append('categoryId',    String(id));
      for (const id of activeFilters.customerIds)    params.append('customerId',    String(id));
      for (const id of activeFilters.salespersonIds) params.append('salespersonId', String(id));
      if (pdfOptions.detailLevel === 'full' || pdfOptions.detailLevel === 'product') {
        params.set('includeDetail', 'true');
      }

      const res  = await fetch(`/api/pnl/data?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const canViewCosts = hasPerm(user, PERMISSIONS.COSTS);
      const orient = pdfOptions.orientation || 'landscape';
      const doc    = new jsPDF(orient);
      const pW     = doc.internal.pageSize.getWidth();

      // ── Page header helper ────────────────────────────────────────────────────
      const addPageHeader = () => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('CONFIDENTIAL — Financial Report', pW / 2, 8, { align: 'center' });
        try {
          const img = document.querySelector('img[alt="HCC Logo"]');
          if (img) doc.addImage(img, 'PNG', 10, 10, 20, 10);
        } catch { /* logo optional */ }
        doc.setTextColor(40);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('HCC Product Category Profit & Loss', pW / 2, 22, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Period: ${startDate}  to  ${endDate}`, pW / 2, 29, { align: 'center' });
        doc.text(`Accounting Basis: ${basis === 'accrual' ? 'Accrual' : 'Cash'}`, pW / 2, 34, { align: 'center' });
        doc.text(
          `Generated: ${new Date().toLocaleString()}  |  By: ${user?.name || user?.email || 'Admin'}`,
          pW / 2, 39, { align: 'center' }
        );
        if (lastSync) doc.text(`Data Last Refreshed: ${new Date(lastSync).toLocaleString()}`, pW / 2, 44, { align: 'center' });
      };

      // ── Active filters summary ────────────────────────────────────────────────
      const filterLines = [];
      if (activeFilters.categoryIds.length) filterLines.push(`Categories: ${activeFilters.categoryIds.join(', ')}`);
      if (activeFilters.customerIds.length) filterLines.push(`Customers: ${activeFilters.customerIds.join(', ')}`);
      if (activeFilters.paymentStatus.length) filterLines.push(`Payment Status: ${activeFilters.paymentStatus.join(', ')}`);

      // ── Page 1: Header + Summary ──────────────────────────────────────────────
      addPageHeader();
      let curY = 52;

      if (filterLines.length) {
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text('Applied Filters: ' + filterLines.join(' | '), 10, curY);
        curY += 6;
      }

      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
      doc.text('Executive Summary', 10, curY + 6);
      curY += 10;

      const sumCols = ['Metric', 'Value'];
      const sumBody = [
        ['Gross Sales',   fmtCur(data.summary.grossSales)],
        ['Discounts',     fmtCur(data.summary.discounts)],
        ['Refunds',       fmtCur(data.summary.refunds)],
        ['Net Sales',     fmtCur(data.summary.netSales)],
        ...(canViewCosts ? [
          ['COGS',         fmtCur(data.summary.cogs)],
          ['Gross Profit', fmtCur(data.summary.grossProfit)],
          ['Gross Margin', fmtPct(data.summary.grossMargin)],
        ] : []),
        ['Taxes',        fmtCur(data.summary.taxes)],
        ['Net Qty Sold', fmtInt(data.summary.netQty)],
        ['Invoice Count', String(data.summary.invoiceCount)],
      ];

      autoTable(doc, {
        startY: curY,
        head: [sumCols],
        body: sumBody,
        theme: 'grid',
        headStyles: { fillColor: [139, 30, 63], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 60, halign: 'right' } },
        margin: { left: 10, right: 10 },
        didParseCell: d => {
          if (d.section === 'body') {
            const val = String(d.cell.raw || '');
            if (val.startsWith('-')) d.cell.styles.textColor = [180, 0, 0];
            if (['COGS', 'Gross Profit', 'Gross Margin'].includes(d.row.raw?.[0])) {
              d.cell.styles.fillColor = [255, 250, 240];
            }
          }
        },
      });

      curY = doc.lastAutoTable.finalY + 14;

      // ── Category P&L Table ────────────────────────────────────────────────────
      if (pdfOptions.detailLevel !== 'summary') {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
        doc.text('Product Category Profit & Loss', 10, curY);
        curY += 6;

        const catCols = ['Category', 'Parent', 'Net Qty', 'Gross Sales', 'Discounts', 'Refunds', 'Net Sales'];
        if (canViewCosts) catCols.push('COGS', 'Gross Profit', 'Margin %');
        catCols.push('Taxes', 'Invoices', '% Sales');

        const catBody = data.categories.map(cat => {
          const row = [
            cat.catName, cat.parentCatName || '—', fmtInt(cat.netQty),
            fmtCur(cat.grossSales), fmtCur(cat.discounts), fmtCur(cat.refunds), fmtCur(cat.netSales),
          ];
          if (canViewCosts) row.push(fmtCur(cat.cogs), fmtCur(cat.grossProfit), fmtPct(cat.grossMargin));
          row.push(fmtCur(cat.taxes), String(cat.invoiceCount), fmtPct(cat.pctOfTotalSales));
          return row;
        });

        // Grand total
        const grandRow = [
          'GRAND TOTAL', '', fmtInt(data.summary.netQty),
          fmtCur(data.summary.grossSales), fmtCur(data.summary.discounts),
          fmtCur(data.summary.refunds), fmtCur(data.summary.netSales),
        ];
        if (canViewCosts) {
          grandRow.push(fmtCur(data.summary.cogs), fmtCur(data.summary.grossProfit), fmtPct(data.summary.grossMargin));
        }
        grandRow.push(fmtCur(data.summary.taxes), String(data.summary.invoiceCount), '100.00%');
        catBody.push(grandRow);

        autoTable(doc, {
          startY: curY,
          head: [catCols],
          body: catBody,
          theme: 'striped',
          headStyles: { fillColor: [139, 30, 63], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [253, 248, 240] },
          margin: { left: 10, right: 10 },
          didParseCell: d => {
            if (d.section === 'body') {
              const val = String(d.cell.raw || '');
              if (val.startsWith('-')) d.cell.styles.textColor = [180, 0, 0];
            }
            if (d.section === 'body' && d.row.index === catBody.length - 1) {
              d.cell.styles.fillColor  = [240, 240, 240];
              d.cell.styles.fontStyle  = 'bold';
              d.cell.styles.textColor  = [20, 20, 20];
            }
          },
          showHead: 'everyPage',
          rowPageBreak: 'avoid',
          didDrawPage: (d) => {
            // Page number
            doc.setFontSize(7); doc.setTextColor(150);
            doc.text(
              `Page ${doc.internal.getNumberOfPages()}`,
              pW / 2,
              doc.internal.pageSize.getHeight() - 6,
              { align: 'center' }
            );
            doc.text('CONFIDENTIAL — Financial Report', pW - 10, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
          },
        });
        curY = doc.lastAutoTable.finalY + 14;
      }

      // ── Data quality warnings ─────────────────────────────────────────────────
      if (data.warnings && data.warnings.length > 0) {
        if (curY > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); curY = 15; }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 100, 0);
        doc.text('⚠  Data Quality Warnings', 10, curY);
        curY += 6;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80);
        for (const w of data.warnings.slice(0, 10)) {
          doc.text(`• ${w.message}`, 14, curY); curY += 5;
        }
      }

      // Page numbers on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(150);
        doc.text(`Page ${i} of ${totalPages}`, pW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
        doc.text('CONFIDENTIAL — Financial Report', pW - 10, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
      }

      // Build filename
      const catFilter = activeFilters.categoryIds.length === 1
        ? '_' + (data.categories[0]?.catName || '').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)
        : '';
      const filename = `HCC_PNL${catFilter}_${startDate}_to_${endDate}.pdf`;
      doc.save(filename);

      setPdfModal(false);
      logAudit('export_pdf', { exportType: 'pdf', detailLevel: pdfOptions.detailLevel, fileName: filename });
    } catch (e) {
      alert('PDF generation failed: ' + e.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  // ── Permission gate ───────────────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 16 }}>
        <Spinner size={36} />
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading...</span>
      </div>
    );
  }

  if (!user || !hasPerm(user, PERMISSIONS.VIEW)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>
          You do not have permission to view the HCC P&L report. Contact your administrator.
        </p>
      </div>
    );
  }

  const canViewCosts  = hasPerm(user, PERMISSIONS.COSTS);
  const canViewProd   = hasPerm(user, PERMISSIONS.PRODUCT);
  const canViewInv    = hasPerm(user, PERMISSIONS.INVOICE);
  const canExport     = hasPerm(user, PERMISSIONS.EXPORT);
  const canRefresh    = hasPerm(user, PERMISSIONS.REFRESH);

  const s  = reportData?.summary;
  const totalCats = reportData?.totalCategories || 0;
  const totalPages = Math.ceil(totalCats / pageSize);

  // ── Visible columns ───────────────────────────────────────────────────────────
  const visibleCols = allCols.filter(c => {
    if (c.costGated && !canViewCosts) return false;
    if (hiddenCols.has(c.key)) return false;
    return true;
  });

  // ── Cell value helper ─────────────────────────────────────────────────────────
  function cellVal(cat, key) {
    const v = cat[key];
    if (v == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    if (key === 'catName')         return <strong>{v}</strong>;
    if (key === 'parentCatName')   return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v || '—'}</span>;
    if (key === 'grossMargin' || key === 'pctOfTotalSales' || key === 'pctOfTotalProfit') return fmtPct(v);
    if (key === 'qtySold' || key === 'qtyReturned' || key === 'netQty' || key === 'invoiceCount') return fmtInt(v);
    // Currency
    const isNeg = typeof v === 'number' && v < 0;
    return <span style={{ color: isNeg ? 'var(--text-error)' : undefined }}>{fmtCur(v)}</span>;
  }

  const thStyle = (col) => ({
    padding: '12px 14px', fontSize: '11px', fontWeight: '700',
    color: sortCol === col ? 'var(--accent)' : 'var(--text-table-header)',
    textTransform: 'uppercase', letterSpacing: '1px',
    textAlign: ['catName', 'parentCatName'].includes(col) ? 'left' : 'right',
    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
    background: 'var(--bg-table-header)',
    position: 'sticky', top: 0, zIndex: 2,
    borderBottom: '2px solid var(--border-table)',
  });

  const tdStyle = (col, isStripe) => ({
    padding: '11px 14px', fontSize: '13px',
    textAlign: ['catName', 'parentCatName'].includes(col) ? 'left' : 'right',
    background: isStripe ? 'var(--bg-table-stripe)' : 'transparent',
    borderBottom: '1px solid var(--border-table)',
    whiteSpace: 'nowrap',
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      <style>{`
        @keyframes pnl-spin    { to { transform: rotate(360deg); } }
        @keyframes pnl-pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes pnl-fadein  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .pnl-row-hover:hover td { background: var(--accent-glow) !important; }
        .pnl-btn { transition: opacity 0.15s, background 0.15s; }
        .pnl-btn:hover { opacity: 0.85; }
        .pnl-btn:active { opacity: 0.7; }
        @media (max-width: 768px) { .pnl-filter-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '28px 32px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', gap: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              HCC{' '}
              <span style={{ background: 'linear-gradient(135deg, var(--accent) 30%, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                P&L Report
              </span>
            </h1>
            <Badge color="#6366F1" bg="rgba(99,102,241,0.1)">
              {basis === 'accrual' ? 'Accrual Basis' : 'Cash Basis'}
            </Badge>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
            Product Category Profit & Loss &nbsp;·&nbsp; {startDate} → {endDate}
            {lastSync && (
              <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontSize: 11 }}>
                Last sync: {new Date(lastSync).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {canRefresh && (
            <button
              className="pnl-btn"
              onClick={() => { fetchData(); logAudit('refresh_data'); }}
              disabled={loading}
              style={{
                padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text-secondary)',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {loading ? <Spinner size={14} /> : '↻'} Refresh
            </button>
          )}
          {canExport && (
            <>
              <button
                className="pnl-btn"
                onClick={handleExportCsv}
                disabled={exporting || !reportData}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--bg-input)', color: 'var(--text-secondary)',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {exporting ? '…' : '⬇ CSV'}
              </button>
              <button
                className="pnl-btn"
                onClick={() => handleExportExcel('product')}
                disabled={exporting || !reportData}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--bg-input)', color: 'var(--text-secondary)',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {exporting ? '…' : '⬇ Excel'}
              </button>
              <button
                className="pnl-btn"
                onClick={() => setPdfModal(true)}
                disabled={!reportData}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'var(--accent)', color: 'white',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 12px var(--accent-glow)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Export PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Date Range & Filters ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '14px', padding: '20px 24px',
      }}>
        {/* Quick presets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[
            ['today','Today'],['yesterday','Yesterday'],['this_week','This Week'],
            ['this_month','This Month'],['last_month','Last Month'],
            ['this_quarter','This Quarter'],['this_year','This Year'],
          ].map(([p, label]) => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className="pnl-btn"
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1px solid ${preset === p ? 'var(--accent)' : 'var(--border)'}`,
                background: preset === p ? 'var(--accent-glow)' : 'var(--bg-input)',
                color: preset === p ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Date inputs + basis + apply */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Start Date</label>
            <input
              type="date" value={startDate}
              onChange={e => { setStartDate(e.target.value); setPreset('custom'); }}
              style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>End Date</label>
            <input
              type="date" value={endDate}
              onChange={e => { setEndDate(e.target.value); setPreset('custom'); }}
              style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Basis</label>
            <select
              value={basis} onChange={e => setBasis(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            >
              <option value="accrual">Accrual</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <button
            className="pnl-btn"
            onClick={applyFilter}
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: 'white',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {loading ? <Spinner size={14} /> : null} Apply Filter
          </button>
          <button
            className="pnl-btn"
            onClick={resetFilter}
            style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--bg-input)', color: 'var(--text-secondary)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>

        {/* Report filters */}
        {filters && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-table)' }}>
            <div className="pnl-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {/* Category filter */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                  Product Category
                </label>
                <select
                  multiple size={3}
                  value={activeFilters.categoryIds.map(String)}
                  onChange={e => {
                    const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                    setActiveFilters(f => ({ ...f, categoryIds: vals }));
                  }}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit' }}
                >
                  {(filters.categories || []).map(c => <option key={c.id} value={c.id}>{c.complete_name || c.name}</option>)}
                </select>
              </div>
              {/* Customer filter */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                  Customer
                </label>
                <select
                  multiple size={3}
                  value={activeFilters.customerIds.map(String)}
                  onChange={e => {
                    const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                    setActiveFilters(f => ({ ...f, customerIds: vals }));
                  }}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit' }}
                >
                  {(filters.customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {/* Salesperson filter */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                  Salesperson
                </label>
                <select
                  multiple size={3}
                  value={activeFilters.salespersonIds.map(String)}
                  onChange={e => {
                    const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                    setActiveFilters(f => ({ ...f, salespersonIds: vals }));
                  }}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit' }}
                >
                  {(filters.salespersons || []).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
              </div>
              {/* Payment status */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                  Payment Status
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(filters.paymentStatuses || []).map(ps => (
                    <label key={ps.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={activeFilters.paymentStatus.includes(ps.id)}
                        onChange={e => {
                          setActiveFilters(f => ({
                            ...f,
                            paymentStatus: e.target.checked
                              ? [...f.paymentStatus, ps.id]
                              : f.paymentStatus.filter(x => x !== ps.id),
                          }));
                        }}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {ps.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ padding: '14px 20px', background: 'var(--bg-error)', border: '1px solid var(--border-error)', borderRadius: 12, color: 'var(--text-error)', fontSize: 14, fontWeight: 600, display: 'flex', gap: 10 }}>
          ⚠️ {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {loading ? (
          Array.from({ length: canViewCosts ? 10 : 7 }).map((_, i) => <SkeletonCard key={i} />)
        ) : s ? (
          <>
            <SummaryCard label="Gross Sales"   value={fmtCur(s.grossSales)}  icon="💰" color="var(--accent)" />
            <SummaryCard label="Discounts"     value={fmtCur(-s.discounts)}  icon="🏷" color="#6366F1" negative />
            <SummaryCard label="Refunds"       value={fmtCur(-s.refunds)}    icon="↩" color="var(--text-error)" negative />
            <SummaryCard label="Net Sales"     value={fmtCur(s.netSales)}    icon="📈" color="var(--text-success)" />
            {canViewCosts && <>
              <SummaryCard label="Cost of Goods" value={fmtCur(s.cogs)}        icon="📦" color="#8B5CF6" />
              <SummaryCard label="Gross Profit"  value={fmtCur(s.grossProfit)} icon="🏆" color={s.grossProfit >= 0 ? 'var(--text-success)' : 'var(--text-error)'} negative />
              <SummaryCard label="Gross Margin"  value={fmtPct(s.grossMargin)} icon="%" color={s.grossMargin >= 0 ? '#10B981' : 'var(--text-error)'} />
            </>}
            <SummaryCard label="Taxes"         value={fmtCur(s.taxes)}       icon="🧾" color="#F59E0B" />
            <SummaryCard label="Net Qty Sold"  value={fmtInt(s.netQty)}      icon="📦" color="var(--text-secondary)" sublabel="units" />
            <SummaryCard label="Invoice Count" value={fmtInt(s.invoiceCount)} icon="📄" color="var(--text-secondary)" sublabel="invoices & credit notes" />
          </>
        ) : (
          <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Apply a date filter to load the P&L report.
          </div>
        )}
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      {!loading && reportData?.categories?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          {/* Net Sales by Category */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
            <BarChart
              title="Net Sales by Category"
              data={[...reportData.categories].sort((a,b) => b.netSales - a.netSales).slice(0, 10)}
              valueKey="netSales" labelKey="catName"
              color="var(--accent)" formatValue={fmtCur}
            />
          </div>

          {canViewCosts && (
            <>
              {/* Gross Profit by Category */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
                <BarChart
                  title="Gross Profit by Category"
                  data={[...reportData.categories].sort((a,b) => (b.grossProfit||0) - (a.grossProfit||0)).slice(0, 10)}
                  valueKey="grossProfit" labelKey="catName"
                  color="#10B981" formatValue={fmtCur}
                />
              </div>

              {/* Gross Margin % by Category */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
                <BarChart
                  title="Gross Margin % by Category"
                  data={[...reportData.categories].filter(c => c.grossMargin != null).sort((a,b) => (b.grossMargin||0) - (a.grossMargin||0)).slice(0, 10)}
                  valueKey="grossMargin" labelKey="catName"
                  color="#6366F1" formatValue={v => fmtPct(v)}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Warnings ─────────────────────────────────────────────────────────── */}
      {!loading && reportData?.warnings?.length > 0 && (
        <WarningSection warnings={reportData.warnings} />
      )}

      {/* ── Category P&L Table ───────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Table toolbar */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-table)',
          background: 'var(--bg-table-header)',
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              Category P&L
            </h2>
            {!loading && totalCats > 0 && (
              <Badge>{totalCats} categories</Badge>
            )}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Column visibility */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setColMenuOpen(o => !o)}
                className="pnl-btn"
                style={{
                  padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-input)', color: 'var(--text-secondary)',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Columns ▾
              </button>
              {colMenuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
                  background: 'var(--bg-modal)', border: '1px solid var(--border-modal)',
                  borderRadius: 12, padding: 12, minWidth: 200,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  {allCols.filter(c => !c.costGated || canViewCosts).map(c => (
                    <label key={c.key} style={{ display: 'flex', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!hiddenCols.has(c.key)}
                        onChange={e => {
                          setHiddenCols(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.delete(c.key); else next.add(c.key);
                            return next;
                          });
                        }}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {c.label}
                    </label>
                  ))}
                  <button onClick={() => setColMenuOpen(false)} style={{ marginTop: 6, padding: '6px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive" style={{ maxHeight: 600, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', fontSize: 13 }}>
            <thead>
              <tr>
                {/* Expand col */}
                <th style={{ ...thStyle(''), width: 40 }} />
                {visibleCols.map(c => (
                  <th key={c.key} style={thStyle(c.key)} onClick={() => handleSort(c.key)}>
                    {c.label}
                    {sortCol === c.key && <span style={{ marginLeft: 4 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {visibleCols.map((c, j) => (
                      <td key={c.key} style={tdStyle(c.key, i % 2)}>
                        <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, width: j === 0 ? '70%' : '50%', animation: 'pnl-pulse 1.5s ease-in-out infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayCats.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 1} style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {reportData ? 'No categories found for the selected filters.' : 'Apply a date range to load the report.'}
                  </td>
                </tr>
              ) : (
                displayCats.map((cat, i) => {
                  const isExp = expandedCats.has(cat.catId);
                  return (
                    <>
                      <tr
                        key={cat.catId}
                        className="pnl-row-hover"
                        style={{ cursor: canViewProd ? 'pointer' : 'default' }}
                        onClick={() => canViewProd && toggleExpand(cat.catId)}
                      >
                        <td style={{ ...tdStyle('', i % 2 === 1), textAlign: 'center', padding: '11px 8px', color: 'var(--text-muted)', fontSize: 16 }}>
                          {canViewProd ? (isExp ? '▼' : '▶') : ''}
                        </td>
                        {visibleCols.map(c => (
                          <td key={c.key} style={tdStyle(c.key, i % 2 === 1)}>
                            {cellVal(cat, c.key)}
                          </td>
                        ))}
                      </tr>

                      {/* Expanded: Product rows */}
                      {isExp && canViewProd && cat.products?.map((prod, pi) => {
                        const isProdExp = expandedProds.has(`${cat.catId}-${prod.productId}`);
                        return (
                          <>
                            <tr
                              key={`prod-${prod.productId}`}
                              className="pnl-row-hover"
                              onClick={() => canViewInv && toggleExpandProd(`${cat.catId}-${prod.productId}`)}
                              style={{ background: 'var(--accent-glow)', cursor: canViewInv ? 'pointer' : 'default' }}
                            >
                              <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, borderBottom: '1px solid var(--border-table)' }}>
                                {canViewInv ? (isProdExp ? '▼' : '▶') : ''}
                              </td>
                              {visibleCols.map(c => {
                                const prodKeyMap = {
                                  catName: 'productName', parentCatName: 'sku',
                                  qtySold: 'qtySold', qtyReturned: 'qtyReturned', netQty: 'netQty',
                                  grossSales: 'grossSales', discounts: 'discounts', refunds: 'refunds', netSales: 'netSales',
                                  cogs: 'cogs', grossProfit: 'grossProfit', grossMargin: 'grossMargin',
                                  taxes: 'taxes', invoiceCount: 'invoiceCount',
                                  pctOfTotalSales: null, pctOfTotalProfit: null,
                                };
                                const pk = prodKeyMap[c.key];
                                if (pk === null) return <td key={c.key} style={{ ...tdStyle(c.key, false), fontSize: 12, padding: '9px 14px', borderBottom: '1px solid var(--border-table)' }}>—</td>;
                                const v = pk ? prod[pk] : undefined;
                                if (c.key === 'catName') return <td key={c.key} style={{ ...tdStyle(c.key, false), paddingLeft: 28, fontWeight: 600, fontSize: 12, borderBottom: '1px solid var(--border-table)' }}>{prod.productName}</td>;
                                if (c.key === 'parentCatName') return <td key={c.key} style={{ ...tdStyle(c.key, false), fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-table)' }}>{prod.sku || '—'}</td>;
                                if (c.key === 'grossMargin') return <td key={c.key} style={{ ...tdStyle(c.key, false), fontSize: 12, borderBottom: '1px solid var(--border-table)' }}>{fmtPct(v)}</td>;
                                if (['qtySold','qtyReturned','netQty','invoiceCount'].includes(c.key)) return <td key={c.key} style={{ ...tdStyle(c.key, false), fontSize: 12, borderBottom: '1px solid var(--border-table)' }}>{fmtInt(v)}</td>;
                                return <td key={c.key} style={{ ...tdStyle(c.key, false), fontSize: 12, color: v < 0 ? 'var(--text-error)' : undefined, borderBottom: '1px solid var(--border-table)' }}>{fmtCur(v)}</td>;
                              })}
                            </tr>

                            {/* Invoice lines */}
                            {isProdExp && canViewInv && (prod.invoiceLines || []).map((line, li) => (
                              <tr key={`inv-${li}`} style={{ background: 'rgba(0,0,0,0.03)', fontSize: 11 }}>
                                <td colSpan={2} style={{ paddingLeft: 44, padding: '7px 14px 7px 44px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                                  {line.isCreditNote && <Badge color="var(--text-error)" bg="var(--bg-error)">CN</Badge>}
                                  {' '}{line.invoiceDate}
                                </td>
                                <td colSpan={visibleCols.length - 1} style={{ padding: '7px 14px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                                  <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: 12 }}>{line.invoiceNumber}</span>
                                  <span style={{ color: 'var(--text-secondary)', marginRight: 12 }}>{line.customer}</span>
                                  <span style={{ color: 'var(--text-muted)', marginRight: 12 }}>Qty: {fmtNum(line.qty)}</span>
                                  <span style={{ color: 'var(--text-muted)', marginRight: 12 }}>Price: {fmtCur(line.unitPrice)}</span>
                                  {line.discount > 0 && <span style={{ color: '#F59E0B', marginRight: 12 }}>Disc: {fmtPct(line.discount)}</span>}
                                  <span style={{ marginRight: 12, fontWeight: 700 }}>Net: {fmtCur(line.netRevenue)}</span>
                                  {canViewCosts && <>
                                    <span style={{ color: 'var(--text-muted)', marginRight: 12 }}>Cost: {fmtCur(line.unitCost)}</span>
                                    <span style={{ color: line.grossProfit >= 0 ? 'var(--text-success)' : 'var(--text-error)', fontWeight: 700 }}>GP: {fmtCur(line.grossProfit)}</span>
                                  </>}
                                  <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>{line.paymentStatus}</span>
                                </td>
                              </tr>
                            ))}
                          </>
                        );
                      })}
                    </>
                  );
                })
              )}

              {/* Grand total row */}
              {!loading && s && (
                <tr style={{ background: 'var(--bg-table-header)', fontWeight: 900, fontSize: 13, position: 'sticky', bottom: 0 }}>
                  <td style={{ padding: '13px 8px', borderTop: '2px solid var(--border)' }} />
                  {visibleCols.map(c => {
                    const v = s[c.key];
                    const isFirst = c.key === 'catName';
                    if (isFirst) return <td key={c.key} style={{ padding: '13px 14px', borderTop: '2px solid var(--border)', fontWeight: 900, color: 'var(--text-primary)' }}>GRAND TOTAL</td>;
                    if (c.key === 'parentCatName') return <td key={c.key} style={{ padding: '13px 14px', borderTop: '2px solid var(--border)' }} />;
                    if (c.key === 'grossMargin' || c.key === 'pctOfTotalSales' || c.key === 'pctOfTotalProfit') {
                      return <td key={c.key} style={{ padding: '13px 14px', textAlign: 'right', borderTop: '2px solid var(--border)', color: 'var(--text-primary)' }}>{fmtPct(c.key === 'pctOfTotalSales' || c.key === 'pctOfTotalProfit' ? 100 : s.grossMargin)}</td>;
                    }
                    if (['qtySold','qtyReturned','netQty','invoiceCount'].includes(c.key)) {
                      return <td key={c.key} style={{ padding: '13px 14px', textAlign: 'right', borderTop: '2px solid var(--border)', color: 'var(--text-primary)' }}>{fmtInt(s[c.key])}</td>;
                    }
                    return (
                      <td key={c.key} style={{ padding: '13px 14px', textAlign: 'right', borderTop: '2px solid var(--border)', color: typeof s[c.key] === 'number' && s[c.key] < 0 ? 'var(--text-error)' : 'var(--text-primary)' }}>
                        {s[c.key] != null ? fmtCur(s[c.key]) : '—'}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-table)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages} ({totalCats} categories)
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); fetchData({ page: page - 1 }); }}
                disabled={page === 1 || loading}
                className="pnl-btn"
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}
              >‹ Prev</button>
              <button
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchData({ page: page + 1 }); }}
                disabled={page === totalPages || loading}
                className="pnl-btn"
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}
              >Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── PDF Export Modal ──────────────────────────────────────────────────── */}
      {pdfModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        }}
          onClick={e => { if (e.target === e.currentTarget) setPdfModal(false); }}
        >
          <div style={{
            background: 'var(--bg-modal)', border: '1px solid var(--border-modal)',
            borderRadius: 20, width: '100%', maxWidth: 480, padding: 32,
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Export PDF</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>HCC Product Category P&L Report</p>
              </div>
              <button onClick={() => setPdfModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Detail Level */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Detail Level</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['summary', 'Summary Only', 'Executive metrics only'],
                    ['category', 'Category Report', 'Category P&L table + summary'],
                    ['product', 'Category + Products', 'Includes product-level rows'],
                    ['full', 'Full Report', 'Includes invoice-line details'],
                  ].map(([val, label, desc]) => (
                    <label key={val} style={{
                      display: 'flex', gap: 12, cursor: 'pointer', padding: '12px 14px', borderRadius: 10,
                      border: `1px solid ${pdfOptions.detailLevel === val ? 'var(--accent)' : 'var(--border)'}`,
                      background: pdfOptions.detailLevel === val ? 'var(--accent-glow)' : 'var(--bg-input)',
                    }}>
                      <input
                        type="radio" name="detailLevel" value={val}
                        checked={pdfOptions.detailLevel === val}
                        onChange={() => setPdfOptions(o => ({ ...o, detailLevel: val }))}
                        style={{ accentColor: 'var(--accent)', marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: pdfOptions.detailLevel === val ? 'var(--accent)' : 'var(--text-primary)' }}>{label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Orientation</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['landscape','🖥 Landscape (recommended)'],['portrait','📄 Portrait']].map(([val, label]) => (
                    <label key={val} style={{
                      flex: 1, display: 'flex', gap: 8, cursor: 'pointer', padding: '10px 12px', borderRadius: 10, justifyContent: 'center',
                      border: `1px solid ${pdfOptions.orientation === val ? 'var(--accent)' : 'var(--border)'}`,
                      background: pdfOptions.orientation === val ? 'var(--accent-glow)' : 'var(--bg-input)',
                      fontSize: 13, fontWeight: 700,
                      color: pdfOptions.orientation === val ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                      <input
                        type="radio" name="orientation" value={val}
                        checked={pdfOptions.orientation === val}
                        onChange={() => setPdfOptions(o => ({ ...o, orientation: val }))}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Report info */}
              <div style={{ padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Filename:</strong>{' '}
                HCC_PNL_{startDate}_to_{endDate}.pdf<br />
                <strong style={{ color: 'var(--text-secondary)' }}>Period:</strong> {startDate} → {endDate}<br />
                <strong style={{ color: 'var(--text-secondary)' }}>Basis:</strong> {basis === 'accrual' ? 'Accrual' : 'Cash'}<br />
                <strong style={{ color: 'var(--text-secondary)' }}>Generated by:</strong> {user?.name || user?.email}
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPdfModal(false)}
                className="pnl-btn"
                style={{
                  padding: '11px 24px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--bg-input)', color: 'var(--text-secondary)',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExportPdf}
                disabled={pdfGenerating}
                className="pnl-btn"
                style={{
                  padding: '11px 28px', borderRadius: 10, border: 'none',
                  background: 'var(--accent)', color: 'white',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 4px 12px var(--accent-glow)',
                  opacity: pdfGenerating ? 0.7 : 1,
                }}
              >
                {pdfGenerating ? <><Spinner size={16} /> Generating…</> : '⬇ Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
