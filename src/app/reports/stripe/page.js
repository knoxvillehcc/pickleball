'use client';
import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const card = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  transition: 'all 0.3s',
};

const kpiCard = {
  ...card,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const inputStyle = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
};

const btnPrimary = {
  background: 'linear-gradient(135deg, #FF9933, #e6852e)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 28px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  letterSpacing: '0.3px',
};

const btnSecondary = {
  backgroundColor: 'var(--bg-button-secondary)',
  border: '1px solid var(--border-button-secondary)',
  borderRadius: '10px',
  color: 'var(--text-button-secondary)',
  padding: '10px 20px',
  fontWeight: '500',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

export default function StripeStatementPage() {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('daily'); // 'daily' | 'transactions'
  const [topTab, setTopTab] = useState('statement'); // 'statement' | 'deposits' | 'cashcheck' | 'invoices' | 'fullreport'
  const [depositData, setDepositData] = useState(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [cashCheckData, setCashCheckData] = useState(null);
  const [cashCheckLoading, setCashCheckLoading] = useState(false);
  const [cashCheckView, setCashCheckView] = useState('monthly'); // 'monthly' | 'daily' | 'transactions'
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [fullReport, setFullReport] = useState(null);
  const [fullReportLoading, setFullReportLoading] = useState(false);

  const fetchStatement = async (refresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stripe/statement?start=${startDate}&end=${endDate}${refresh ? '&refresh=true' : ''}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '';
    const [y, m, dd] = d.split('-');
    return `${m}-${dd}-${y.slice(2)}`;
  };

  const fmt = (n) => '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // ── Deposit Breakdown fetch ───────────────────────────────────────────────
  const fetchDeposits = async (refresh = false) => {
    setDepositLoading(true);
    try {
      const res = await fetch(`/api/stripe/deposit-breakdown?start=${startDate}&end=${endDate}${refresh ? '&refresh=true' : ''}`);
      const json = await res.json();
      if (json.success) setDepositData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setDepositLoading(false);
    }
  };

  // ── Cash/Check fetch ───────────────────────────────────────────────────────
  const fetchCashCheck = async (refresh = false) => {
    setCashCheckLoading(true);
    try {
      const res = await fetch(`/api/reports/cash-check?start=${startDate}&end=${endDate}${refresh ? '&refresh=true' : ''}`);
      const json = await res.json();
      if (json.success) setCashCheckData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setCashCheckLoading(false);
    }
  };

  // ── Invoices fetch ────────────────────────────────────────────────────────
  const fetchInvoices = async () => {
    setInvoiceLoading(true);
    try {
      const res = await fetch(`/api/reports/invoices?start=${startDate}&end=${endDate}`);
      const json = await res.json();
      if (json.success) setInvoiceData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // ── Invoice PDF ───────────────────────────────────────────────────────────
  const downloadInvoicePDF = () => {
    if (!invoiceData) return;
    const doc = new jsPDF('landscape');

    const pdfDate = (d) => {
      if (!d) return '';
      const dt = new Date(d + 'T12:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('Non-POS Invoice Report', 10, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${pdfDate(startDate)} to ${pdfDate(endDate)}  |  Generated: ${pdfDate(new Date().toISOString().split('T')[0])}`, 10, 22);

    // Summary
    autoTable(doc, {
      startY: 30,
      head: [['Status', '# Invoices', 'Amount']],
      body: [
        ['Paid', invoiceData.totals.countPaid.toString(), fmt(invoiceData.totals.paid)],
        ['Unpaid', invoiceData.totals.countUnpaid.toString(), fmt(invoiceData.totals.unpaid)],
      ],
      foot: [['TOTAL', invoiceData.totals.countAll.toString(), fmt(invoiceData.totals.all)]],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
      footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Category summary
    if (invoiceData.categorySummary.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Category', '# Invoices', 'Paid', 'Unpaid', 'Total']],
        body: invoiceData.categorySummary.map(c => [
          c.category, c.count.toString(), fmt(c.paid), c.unpaid > 0 ? fmt(c.unpaid) : '-', fmt(c.total),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
      });
    }

    // Invoice list
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(`All Invoices (${invoiceData.invoices.length})`, 10, 15);

    autoTable(doc, {
      startY: 22,
      head: [['Date', 'Invoice #', 'Customer', 'Amount', 'Balance', 'Status', 'Category']],
      body: invoiceData.invoices.map(inv => [
        pdfDate(inv.date),
        inv.number,
        inv.customer || '-',
        fmt(inv.amount),
        inv.residual > 0 ? fmt(inv.residual) : '-',
        inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Unpaid',
        inv.category,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 7 },
      columnStyles: { 2: { cellWidth: 50 } },
    });

    doc.save(`invoices-${startDate}-to-${endDate}.pdf`);
  };

  // ── Invoice CSV ───────────────────────────────────────────────────────────
  const downloadInvoiceCSV = () => {
    if (!invoiceData) return;
    const rows = [
      ['Date', 'Invoice #', 'Customer', 'Amount', 'Balance', 'Status', 'Category', 'Origin'],
      ...invoiceData.invoices.map(inv => [
        inv.date, inv.number, inv.customer, inv.amount.toFixed(2),
        inv.residual.toFixed(2), inv.status, inv.category, inv.origin,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  // ── Full Monthly Report ───────────────────────────────────────────────────
  const fetchFullReport = async () => {
    setFullReportLoading(true);
    try {
      const [stripeRes, cashCheckRes, invoiceRes] = await Promise.all([
        fetch(`/api/stripe/statement?start=${startDate}&end=${endDate}`).then(r => r.json()),
        fetch(`/api/reports/cash-check?start=${startDate}&end=${endDate}`).then(r => r.json()),
        fetch(`/api/reports/invoices?start=${startDate}&end=${endDate}`).then(r => r.json()),
      ]);

      // Build monthly combined data
      const months = {};

      // Stripe data by month
      let stripeGross = 0, stripeFees = 0, stripeNet = 0, stripeCount = 0;
      if (stripeRes?.charges) {
        for (const ch of stripeRes.charges) {
          const mk = ch.date?.substring(0, 7) || '';
          if (!months[mk]) months[mk] = { stripe: { gross: 0, fees: 0, net: 0, count: 0 }, cash: 0, check: 0, invoices: { paid: 0, unpaid: 0, count: 0 }, cashCount: 0, checkCount: 0 };
          months[mk].stripe.gross += ch.amount || 0;
          months[mk].stripe.fees += ch.fee || 0;
          months[mk].stripe.net += ch.net || 0;
          months[mk].stripe.count++;
          stripeGross += ch.amount || 0;
          stripeFees += ch.fee || 0;
          stripeNet += ch.net || 0;
          stripeCount++;
        }
      }

      // Cash/Check data by month
      let totalCash = 0, totalCheck = 0, cashCount = 0, checkCount = 0;
      let cashCheckCategories = [];
      if (cashCheckRes?.success) {
        totalCash = cashCheckRes.totals?.cash || 0;
        totalCheck = cashCheckRes.totals?.check || 0;
        cashCount = cashCheckRes.totals?.cashCount || 0;
        checkCount = cashCheckRes.totals?.checkCount || 0;
        cashCheckCategories = cashCheckRes.summary || [];

        if (cashCheckRes.months) {
          for (const [mk, mo] of Object.entries(cashCheckRes.months)) {
            if (!months[mk]) months[mk] = { stripe: { gross: 0, fees: 0, net: 0, count: 0 }, cash: 0, check: 0, invoices: { paid: 0, unpaid: 0, count: 0 }, cashCount: 0, checkCount: 0 };
            months[mk].cash = mo.cashTotal || 0;
            months[mk].check = mo.checkTotal || 0;
            months[mk].cashCount = mo.cashCount || 0;
            months[mk].checkCount = mo.checkCount || 0;
          }
        }
      }

      // Invoice data by month
      let invPaid = 0, invUnpaid = 0, invCount = 0;
      let invoiceCategories = [];
      let invoiceList = [];
      if (invoiceRes?.success) {
        invPaid = invoiceRes.totals?.paid || 0;
        invUnpaid = invoiceRes.totals?.unpaid || 0;
        invCount = invoiceRes.totals?.countAll || 0;
        invoiceCategories = invoiceRes.categorySummary || [];
        invoiceList = invoiceRes.invoices || [];

        if (invoiceRes.monthlySummary) {
          for (const mo of invoiceRes.monthlySummary) {
            const mk = mo.month;
            if (!months[mk]) months[mk] = { stripe: { gross: 0, fees: 0, net: 0, count: 0 }, cash: 0, check: 0, invoices: { paid: 0, unpaid: 0, count: 0 }, cashCount: 0, checkCount: 0 };
            months[mk].invoices.paid = mo.paid || 0;
            months[mk].invoices.unpaid = mo.unpaid || 0;
            months[mk].invoices.count = mo.count || 0;
          }
        }
      }

      const grandTotal = stripeGross + totalCash + totalCheck + invPaid + invUnpaid;

      setFullReport({
        months,
        totals: { stripeGross, stripeFees, stripeNet, stripeCount, totalCash, totalCheck, cashCount, checkCount, invPaid, invUnpaid, invCount, grandTotal },
        cashCheckCategories,
        invoiceCategories,
        invoiceList,
      });
    } catch (err) {
      console.error('Full report error:', err);
    } finally {
      setFullReportLoading(false);
    }
  };

  const downloadFullReportPDF = () => {
    if (!fullReport) return;
    const doc = new jsPDF('landscape');
    const t = fullReport.totals;

    const pdfDate = (d) => {
      if (!d) return '';
      const dt = new Date(d + 'T12:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Title
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('HCC Full Monthly Revenue Report', 10, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${pdfDate(startDate)} to ${pdfDate(endDate)}  |  Generated: ${pdfDate(new Date().toISOString().split('T')[0])}`, 10, 22);

    // Grand Summary
    autoTable(doc, {
      startY: 30,
      head: [['Revenue Source', 'Count', 'Gross', 'Fees', 'Net / Amount']],
      body: [
        ['Stripe (Card)', t.stripeCount.toString(), fmt(t.stripeGross), fmt(t.stripeFees), fmt(t.stripeNet)],
        ['Cash (POS)', t.cashCount.toString(), fmt(t.totalCash), '-', fmt(t.totalCash)],
        ['Check (POS)', t.checkCount.toString(), fmt(t.totalCheck), '-', fmt(t.totalCheck)],
        ['Invoices (Paid)', '', fmt(t.invPaid), '-', fmt(t.invPaid)],
        ['Invoices (Unpaid)', '', fmt(t.invUnpaid), '-', fmt(t.invUnpaid)],
      ],
      foot: [['GRAND TOTAL', '', fmt(t.grandTotal), fmt(t.stripeFees), fmt(t.grandTotal - t.stripeFees)]],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
      footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Monthly breakdown
    const sortedMonths = Object.entries(fullReport.months).sort(([a], [b]) => b.localeCompare(a));
    for (const [mk, mo] of sortedMonths) {
      const dt = new Date(mk + '-15');
      const label = dt.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const moTotal = mo.stripe.gross + mo.cash + mo.check + mo.invoices.paid + mo.invoices.unpaid;

      if (doc.lastAutoTable && doc.lastAutoTable.finalY > 155) doc.addPage();

      autoTable(doc, {
        startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 30,
        head: [[{ content: `${label} - Total: ${fmt(moTotal)}`, colSpan: 5, styles: { fillColor: [30, 41, 59] } }]],
        body: [
          ['Stripe', mo.stripe.count.toString(), fmt(mo.stripe.gross), fmt(mo.stripe.fees), fmt(mo.stripe.net)],
          ['Cash', mo.cashCount.toString(), fmt(mo.cash), '-', fmt(mo.cash)],
          ['Check', mo.checkCount.toString(), fmt(mo.check), '-', fmt(mo.check)],
          ['Invoices (Paid)', '', fmt(mo.invoices.paid), '-', fmt(mo.invoices.paid)],
          ['Invoices (Unpaid)', '', fmt(mo.invoices.unpaid), '-', fmt(mo.invoices.unpaid)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
      });
    }

    // Cash/Check Categories
    if (fullReport.cashCheckCategories.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('POS Categories (Cash/Check)', 10, 15);

      autoTable(doc, {
        startY: 22,
        head: [['Category', 'Cash #', 'Cash Amount', 'Check #', 'Check Amount', 'Total']],
        body: fullReport.cashCheckCategories.map(c => [
          c.category, c.cashCount.toString(), fmt(c.cashAmount), c.checkCount.toString(), fmt(c.checkAmount), fmt(c.totalAmount),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [255, 153, 51], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
      });
    }

    // Invoice Categories
    if (fullReport.invoiceCategories.length > 0) {
      if (doc.lastAutoTable && doc.lastAutoTable.finalY > 155) doc.addPage();

      autoTable(doc, {
        startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 22,
        head: [['Invoice Category', '# Invoices', 'Paid', 'Unpaid', 'Total']],
        body: fullReport.invoiceCategories.map(c => [
          c.category, c.count.toString(), fmt(c.paid), c.unpaid > 0 ? fmt(c.unpaid) : '-', fmt(c.total),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
      });
    }

    // Invoice List
    if (fullReport.invoiceList.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(`Non-POS Invoices (${fullReport.invoiceList.length})`, 10, 15);

      autoTable(doc, {
        startY: 22,
        head: [['Date', 'Invoice #', 'Customer', 'Amount', 'Status', 'Paid Via', 'Category']],
        body: fullReport.invoiceList.map(inv => [
          pdfDate(inv.date), inv.number, inv.customer || '-', fmt(inv.amount),
          inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Unpaid',
          inv.paymentJournal || '-', inv.category,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 7 },
        columnStyles: { 2: { cellWidth: 45 } },
      });
    }

    doc.save(`full-monthly-report-${startDate}-to-${endDate}.pdf`);
  };

  const downloadPDF = () => {
    if (topTab === 'cashcheck' && cashCheckData) return downloadCashCheckPDF();
    if (topTab === 'deposits' && depositData) return downloadDepositPDF();
    if (topTab === 'invoices' && invoiceData) return downloadInvoicePDF();
    if (!data) return;
    const doc = new jsPDF('landscape');
    const dateStr = fmtDate(new Date().toISOString().split('T')[0]);

    doc.setFontSize(20);
    doc.text('Stripe CC Payment Statement', 10, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${fmtDate(startDate)} to ${fmtDate(endDate)}  |  Generated: ${dateStr}`, 10, 22);

    // Summary
    autoTable(doc, {
      startY: 30,
      head: [['Total Charges', 'Gross Amount', 'Processing Fees', 'Net Amount']],
      body: [[
        data.totals.count.toString(),
        fmt(data.totals.gross),
        fmt(data.totals.fee),
        fmt(data.totals.net),
      ]],
      theme: 'grid',
      headStyles: { fillColor: [255, 153, 51] },
    });

    // Daily breakdown
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Date', 'Charges', 'Gross', 'Fees', 'Net']],
      body: data.dailySummary.map(d => [
        fmtDate(d.date),
        d.count.toString(),
        fmt(d.gross),
        fmt(d.fee),
        fmt(d.net),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`stripe-statement-${startDate}-to-${endDate}.pdf`);
  };

  // ── Deposit Breakdown PDF ─────────────────────────────────────────────────
  const downloadDepositPDF = () => {
    if (!depositData) return;
    const doc = new jsPDF('landscape');
    const dateStr = fmtDate(new Date().toISOString().split('T')[0]);

    doc.setFontSize(20);
    doc.text('Stripe Deposit Breakdown', 10, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${fmtDate(startDate)} to ${fmtDate(endDate)}  |  Generated: ${dateStr}`, 10, 22);

    // Overall category summary
    autoTable(doc, {
      startY: 30,
      head: [['Category', 'Charges', 'Gross', 'Fees', 'Net']],
      body: depositData.summary.map(s => [
        s.category,
        s.charges.toString(),
        fmt(s.gross),
        fmt(s.fees),
        fmt(s.net),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [255, 153, 51] },
      foot: [['TOTAL', depositData.totals.charges.toString(), fmt(depositData.totals.gross), fmt(depositData.totals.fees), fmt(depositData.totals.deposited)]],
      footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Per-payout breakdown
    for (const po of depositData.payouts) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        head: [[
          { content: `Payout ${fmtDate(po.date)} — Deposited ${fmt(po.net)}`, colSpan: 5, styles: { fillColor: [30, 41, 59] } },
        ]],
        body: po.categories.map(c => [
          c.category + (c.source === 'unmatched' ? ' ⚠️' : ''),
          c.charges.toString(),
          fmt(c.gross),
          fmt(c.fees),
          fmt(c.net),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
      });
    }

    doc.save(`stripe-deposits-${startDate}-to-${endDate}.pdf`);
  };

  // ── Deposit Breakdown CSV ─────────────────────────────────────────────────
  const downloadDepositCSV = () => {
    if (!depositData) return;
    const rows = [
      ['Payout Date', 'Payout Amount', 'Category', 'Charges', 'Gross', 'Fees', 'Net'],
      ...depositData.payouts.flatMap(po =>
        po.categories.map(c => [
          po.date, po.net.toFixed(2), c.category, c.charges,
          c.gross.toFixed(2), c.fees.toFixed(2), c.net.toFixed(2),
        ])
      ),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stripe-deposits-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  // ── Unmatched Charges CSV ─────────────────────────────────────────────────
  const downloadUnmatchedCSV = () => {
    if (!depositData?.unmatchedCharges?.length) return;
    const rows = [
      ['Charge ID', 'Payout ID', 'Date', 'Amount', 'Fee', 'Customer', 'Description', 'Payment Intent'],
      ...depositData.unmatchedCharges.map(u => [
        u.chargeId, u.payoutId, u.date, u.amount.toFixed(2),
        u.fee.toFixed(2), u.customer, u.description, u.paymentIntent,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stripe-unmatched-charges-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const downloadCSV = () => {
    if (topTab === 'cashcheck' && cashCheckData) return downloadCashCheckCSV();
    if (topTab === 'invoices' && invoiceData) return downloadInvoiceCSV();
    if (!data) return;
    const rows = view === 'daily'
      ? [['Date', 'Charges', 'Gross', 'Fees', 'Net'],
         ...data.dailySummary.map(d => [d.date, d.count, d.gross.toFixed(2), d.fee.toFixed(2), d.net.toFixed(2)])]
      : [['Date', 'Time', 'ID', 'Customer', 'Amount', 'Fee', 'Net', 'Card', 'Description'],
         ...data.charges.map(c => [c.date, c.time, c.id, c.customer, c.amount.toFixed(2), c.fee.toFixed(2), c.net.toFixed(2), `${c.card_brand} ${c.card_last4}`, c.description])];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stripe-${view}-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  // ── Cash/Check PDF ─────────────────────────────────────────────────────────
  const downloadCashCheckPDF = () => {
    if (!cashCheckData) return;
    const doc = new jsPDF('landscape');

    // Readable date formatter for PDF
    const pdfDate = (d) => {
      if (!d) return '';
      const dt = new Date(d + 'T12:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const generatedDate = pdfDate(new Date().toISOString().split('T')[0]);

    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('Cash & Check Transaction Report', 10, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${pdfDate(startDate)} to ${pdfDate(endDate)}  |  Generated: ${generatedDate}  |  Source: ${cashCheckData.source || 'live'}`, 10, 22);

    // Overall summary
    autoTable(doc, {
      startY: 30,
      head: [['Payment Type', '# Payments', 'Amount']],
      body: [
        ['Cash', cashCheckData.totals.cashCount.toString(), fmt(cashCheckData.totals.cash)],
        ['Check', cashCheckData.totals.checkCount.toString(), fmt(cashCheckData.totals.check)],
      ],
      foot: [['TOTAL', cashCheckData.totals.totalCount.toString(), fmt(cashCheckData.totals.total)]],
      theme: 'grid',
      headStyles: { fillColor: [255, 153, 51], textColor: [255, 255, 255] },
      footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Category summary
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Category', 'Cash #', 'Cash Amount', 'Check #', 'Check Amount', 'Total']],
      body: [
        ...cashCheckData.summary.map(s => [
          s.category,
          s.cashCount.toString(),
          fmt(s.cashAmount),
          s.checkCount.toString(),
          fmt(s.checkAmount),
          fmt(s.totalAmount),
        ]),
        // Totals row
        [
          { content: 'TOTAL', styles: { fontStyle: 'bold' } },
          { content: cashCheckData.totals.cashCount.toString(), styles: { fontStyle: 'bold' } },
          { content: fmt(cashCheckData.totals.cash), styles: { fontStyle: 'bold' } },
          { content: cashCheckData.totals.checkCount.toString(), styles: { fontStyle: 'bold' } },
          { content: fmt(cashCheckData.totals.check), styles: { fontStyle: 'bold' } },
          { content: fmt(cashCheckData.totals.total), styles: { fontStyle: 'bold' } },
        ],
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    });

    // Per-month breakdown
    const sortedMonths = Object.entries(cashCheckData.months).sort(([a], [b]) => b.localeCompare(a));
    for (const [, mo] of sortedMonths) {
      const allCats = [
        ...mo.cashCategories.map(c => ({ ...c, type: 'Cash' })),
        ...mo.checkCategories.map(c => ({ ...c, type: 'Check' })),
      ].sort((a, b) => b.amount - a.amount);

      if (allCats.length === 0) continue;

      // Check if we need a new page (if close to bottom)
      if (doc.lastAutoTable && doc.lastAutoTable.finalY > 160) {
        doc.addPage();
      }

      autoTable(doc, {
        startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 30,
        head: [[
          { content: `${mo.label} - ${mo.totalCount} payments = ${fmt(mo.total)}`, colSpan: 4, styles: { fillColor: [30, 41, 59] } },
        ]],
        body: allCats.map(c => [
          c.type,
          c.category,
          c.count.toString(),
          fmt(c.amount),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 30 },
        },
      });
    }

    // Daily Summary page
    if (cashCheckData.dailySummary && cashCheckData.dailySummary.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('Daily Summary', 10, 15);

      autoTable(doc, {
        startY: 22,
        head: [['Date', 'Cash #', 'Cash Amount', 'Check #', 'Check Amount', 'Total #', 'Total Amount']],
        body: [
          ...cashCheckData.dailySummary.map(d => [
            pdfDate(d.date),
            d.cashCount.toString(),
            d.cashAmount > 0 ? fmt(d.cashAmount) : '-',
            d.checkCount.toString(),
            d.checkAmount > 0 ? fmt(d.checkAmount) : '-',
            d.totalCount.toString(),
            fmt(d.total),
          ]),
          // Totals row
          [
            { content: 'TOTAL', styles: { fontStyle: 'bold' } },
            { content: cashCheckData.totals.cashCount.toString(), styles: { fontStyle: 'bold' } },
            { content: fmt(cashCheckData.totals.cash), styles: { fontStyle: 'bold' } },
            { content: cashCheckData.totals.checkCount.toString(), styles: { fontStyle: 'bold' } },
            { content: fmt(cashCheckData.totals.check), styles: { fontStyle: 'bold' } },
            { content: cashCheckData.totals.totalCount.toString(), styles: { fontStyle: 'bold' } },
            { content: fmt(cashCheckData.totals.total), styles: { fontStyle: 'bold' } },
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [255, 153, 51], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
      });
    }

    // All Transactions pages
    if (cashCheckData.transactions && cashCheckData.transactions.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(`All Transactions (${cashCheckData.transactions.length} payments)`, 10, 15);

      autoTable(doc, {
        startY: 22,
        head: [['Date', 'Time', 'Customer', 'Method', 'Amount', 'Category', 'Order Ref']],
        body: cashCheckData.transactions.map(tx => [
          pdfDate(tx.date),
          tx.time ? tx.time.substring(0, 5) : '-',
          tx.customer || '-',
          tx.method,
          fmt(tx.amount),
          tx.category,
          tx.orderRef || '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 7 },
        columnStyles: {
          2: { cellWidth: 50 },  // Customer
          5: { cellWidth: 40 },  // Category
        },
      });
    }

    doc.save(`cash-check-report-${startDate}-to-${endDate}.pdf`);
  };

  // ── Cash/Check CSV ─────────────────────────────────────────────────────────
  const downloadCashCheckCSV = () => {
    if (!cashCheckData) return;
    const rows = [
      ['Month', 'Payment Type', 'Category', '# Payments', 'Amount'],
      ...Object.entries(cashCheckData.months)
        .sort(([a], [b]) => b.localeCompare(a))
        .flatMap(([, mo]) => [
          ...mo.cashCategories.map(c => [mo.label, 'Cash', c.category, c.count, c.amount.toFixed(2)]),
          ...mo.checkCategories.map(c => [mo.label, 'Check', c.category, c.count, c.amount.toFixed(2)]),
        ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-check-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          💳 Payment Reports
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px' }}>
          View charges, deposits, fees, and category breakdown
        </p>
      </div>

      {/* Top-level Tab Bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', ...card, padding: '4px', width: 'fit-content' }}>
        <button onClick={() => setTopTab('statement')}
          style={{ ...btnSecondary, padding: '10px 24px', fontSize: '14px', borderRadius: '12px',
            backgroundColor: topTab === 'statement' ? 'var(--accent)' : 'transparent',
            color: topTab === 'statement' ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: '600' }}>
          📊 Statement
        </button>
        <button onClick={() => setTopTab('deposits')}
          style={{ ...btnSecondary, padding: '10px 24px', fontSize: '14px', borderRadius: '12px',
            backgroundColor: topTab === 'deposits' ? 'var(--accent)' : 'transparent',
            color: topTab === 'deposits' ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: '600' }}>
          🏦 Deposit Breakdown
        </button>
        <button onClick={() => setTopTab('cashcheck')}
          style={{ ...btnSecondary, padding: '10px 24px', fontSize: '14px', borderRadius: '12px',
            backgroundColor: topTab === 'cashcheck' ? 'var(--accent)' : 'transparent',
            color: topTab === 'cashcheck' ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: '600' }}>
          💵 Cash/Check
        </button>
        <button onClick={() => setTopTab('invoices')}
          style={{ ...btnSecondary, padding: '10px 24px', fontSize: '14px', borderRadius: '12px',
            backgroundColor: topTab === 'invoices' ? 'var(--accent)' : 'transparent',
            color: topTab === 'invoices' ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: '600' }}>
          📋 Invoices
        </button>
        <button onClick={() => setTopTab('fullreport')}
          style={{ ...btnSecondary, padding: '10px 24px', fontSize: '14px', borderRadius: '12px',
            backgroundColor: topTab === 'fullreport' ? 'var(--accent)' : 'transparent',
            color: topTab === 'fullreport' ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: '600' }}>
          📈 Full Report
        </button>
      </div>

      {/* Date Range Picker */}
      <div style={{ ...card, padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
              Start Date
            </label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
              End Date
            </label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          {topTab === 'statement' ? (
            <>
              <button onClick={() => fetchStatement(false)} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1, minWidth: '140px' }}>
                {loading ? '⏳ Loading...' : '🔍 Generate'}
              </button>
              {data && (
                <>
                  <button onClick={downloadPDF} style={btnSecondary}>📄 PDF</button>
                  <button onClick={downloadCSV} style={btnSecondary}>📊 CSV</button>
                  <button onClick={() => fetchStatement(true)} disabled={loading} style={{ ...btnSecondary, borderColor: 'rgba(99,102,241,0.4)', color: '#818CF8' }}>
                    🔄 Refresh
                  </button>
                  <span style={{ fontSize: '11px', color: data.source === 'cache' ? '#10B981' : '#818CF8', alignSelf: 'center', fontWeight: '600' }}>
                    {data.source === 'cache' ? '⚡ Cached' : '☁️ Live'}
                  </span>
                </>
              )}
            </>
          ) : topTab === 'deposits' ? (
            <>
              <button onClick={() => fetchDeposits(false)} disabled={depositLoading} style={{ ...btnPrimary, opacity: depositLoading ? 0.6 : 1, minWidth: '160px' }}>
                {depositLoading ? '⏳ Resolving...' : '🏦 Load Deposits'}
              </button>
              {depositData && (
                <>
                  <button onClick={downloadDepositPDF} style={btnSecondary}>📄 PDF</button>
                  <button onClick={downloadDepositCSV} style={btnSecondary}>📊 CSV</button>
                  {depositData.unmatchedCharges?.length > 0 && (
                    <button onClick={downloadUnmatchedCSV} style={{ ...btnSecondary, borderColor: 'rgba(251,191,36,0.4)', color: '#FBBF24' }}>
                      ⚠️ Unmatched ({depositData.unmatchedCharges.length})
                    </button>
                  )}
                  <button onClick={() => fetchDeposits(true)} disabled={depositLoading} style={{ ...btnSecondary, borderColor: 'rgba(99,102,241,0.4)', color: '#818CF8' }}>
                    🔄 Refresh
                  </button>
                </>
              )}
            </>
          ) : topTab === 'invoices' ? (
            <>
              <button onClick={fetchInvoices} disabled={invoiceLoading} style={{ ...btnPrimary, opacity: invoiceLoading ? 0.6 : 1, minWidth: '160px' }}>
                {invoiceLoading ? '⏳ Loading...' : '📋 Load Invoices'}
              </button>
              {invoiceData && (
                <>
                  <button onClick={downloadInvoicePDF} style={btnSecondary}>📄 PDF</button>
                  <button onClick={downloadInvoiceCSV} style={btnSecondary}>📊 CSV</button>
                </>
              )}
            </>
          ) : topTab === 'fullreport' ? (
            <>
              <button onClick={fetchFullReport} disabled={fullReportLoading} style={{ ...btnPrimary, opacity: fullReportLoading ? 0.6 : 1, minWidth: '200px' }}>
                {fullReportLoading ? '⏳ Loading all sources...' : '📈 Generate Full Report'}
              </button>
              {fullReport && (
                <button onClick={downloadFullReportPDF} style={btnSecondary}>📄 Full PDF</button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => fetchCashCheck(false)} disabled={cashCheckLoading} style={{ ...btnPrimary, opacity: cashCheckLoading ? 0.6 : 1, minWidth: '160px' }}>
                {cashCheckLoading ? '⏳ Loading...' : '💵 Generate Report'}
              </button>
              {cashCheckData && (
                <>
                  <button onClick={downloadCashCheckPDF} style={btnSecondary}>📄 PDF</button>
                  <button onClick={downloadCashCheckCSV} style={btnSecondary}>📊 CSV</button>
                  <button onClick={() => fetchCashCheck(true)} disabled={cashCheckLoading} style={{ ...btnSecondary, borderColor: 'rgba(99,102,241,0.4)', color: '#818CF8' }}>
                    🔄 Refresh
                  </button>
                  <span style={{ fontSize: '11px', color: cashCheckData.source === 'cache' ? '#10B981' : '#818CF8', alignSelf: 'center', fontWeight: '600' }}>
                    {cashCheckData.source === 'cache' ? '⚡ Cached' : '☁️ Live'}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Quick Ranges */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Today', start: today, end: today },
            { label: 'Last 7 Days', start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], end: today },
            { label: 'Last 30 Days', start: monthAgo, end: today },
            { label: 'This Month', start: `${today.slice(0, 7)}-01`, end: today },
            { label: 'Last Month', start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return `${d.toISOString().slice(0, 7)}-01`; })(), end: (() => { const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]; })() },
          ].map(r => (
            <button key={r.label} onClick={() => { setStartDate(r.start); setEndDate(r.end); }}
              style={{ ...btnSecondary, padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ STATEMENT TAB ═══ */}
      {topTab === 'statement' && (
        <>
          {/* Loading */}
          {loading && (
            <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>💳</div>
              <p style={{ color: 'var(--text-muted)' }}>Fetching charges from Stripe...</p>
            </div>
          )}

          {/* Results */}
          {data && !loading && (
            <>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Charges</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: '700' }}>{data.totals.count}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{data.dailySummary.length} days</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross Amount</span>
                  <span style={{ color: '#4ade80', fontSize: '28px', fontWeight: '700' }}>{fmt(data.totals.gross)}</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Processing Fees</span>
                  <span style={{ color: '#f87171', fontSize: '28px', fontWeight: '700' }}>{fmt(data.totals.fee)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {data.totals.gross > 0 ? ((data.totals.fee / data.totals.gross) * 100).toFixed(2) : '0'}% effective rate
                  </span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Deposited</span>
                  <span style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: '700' }}>{fmt(data.totals.net)}</span>
                </div>
              </div>

              {/* View Toggle */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', ...card, padding: '4px', width: 'fit-content' }}>
                <button onClick={() => setView('daily')}
                  style={{ ...btnSecondary, padding: '8px 20px', fontSize: '13px', borderRadius: '10px',
                    backgroundColor: view === 'daily' ? 'var(--accent)' : 'transparent',
                    color: view === 'daily' ? '#fff' : 'var(--text-muted)', border: 'none' }}>
                  📅 Daily Summary
                </button>
                <button onClick={() => setView('transactions')}
                  style={{ ...btnSecondary, padding: '8px 20px', fontSize: '13px', borderRadius: '10px',
                    backgroundColor: view === 'transactions' ? 'var(--accent)' : 'transparent',
                    color: view === 'transactions' ? '#fff' : 'var(--text-muted)', border: 'none' }}>
                  💳 All Transactions
                </button>
              </div>

              {/* Daily Summary Table */}
              {view === 'daily' && (
                <div style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                          {['Date', 'Charges', 'Gross', 'Fees', 'Net'].map(h => (
                            <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Date' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.dailySummary.map((d, i) => (
                          <tr key={d.date} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                            <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>
                              {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>{d.count}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(d.gross)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#f87171', fontSize: '14px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(d.fee)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(d.net)}</td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr style={{ backgroundColor: 'rgba(255, 153, 51, 0.08)' }}>
                          <td style={{ padding: '14px 16px', color: 'var(--accent)', fontSize: '14px', fontWeight: '700' }}>TOTAL</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontWeight: '700', fontSize: '14px' }}>{data.totals.count}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#4ade80', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(data.totals.gross)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#f87171', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(data.totals.fee)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(data.totals.net)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* All Transactions Table */}
              {view === 'transactions' && (
                <div style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                          {['Date', 'Time', 'Customer', 'Card', 'Amount', 'Fee', 'Net', 'Description'].map(h => (
                            <th key={h} style={{ padding: '14px 16px', textAlign: ['Amount', 'Fee', 'Net'].includes(h) ? 'right' : 'left', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.charges.map((c, i) => (
                          <tr key={c.id} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                            <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                              {new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{c.time}</td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.customer || '—'}</td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                              {c.card_brand ? `${c.card_brand.toUpperCase()} ••${c.card_last4}` : '—'}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: '#4ade80', fontSize: '13px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.amount)}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: '#f87171', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.fee)}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.net)}</td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '12px', borderBottom: '1px solid var(--border-table)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!data && !loading && (
            <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Select a date range</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Choose start and end dates, then click Generate to view your Stripe statement</p>
            </div>
          )}
        </>
      )}

      {/* ═══ DEPOSIT BREAKDOWN TAB ═══ */}
      {topTab === 'deposits' && (
        <>
          {/* Loading */}
          {depositLoading && (
            <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>🏦</div>
              <p style={{ color: 'var(--text-muted)' }}>Resolving deposits and product categories...</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>First load may take 30-60s while querying Stripe + Odoo POS</p>
            </div>
          )}

          {/* Deposit Results */}
          {depositData && !depositLoading && (
            <>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payouts</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: '700' }}>{depositData.totals.payouts}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{depositData.totals.charges} charges</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross</span>
                  <span style={{ color: '#4ade80', fontSize: '28px', fontWeight: '700' }}>{fmt(depositData.totals.gross)}</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fees</span>
                  <span style={{ color: '#f87171', fontSize: '28px', fontWeight: '700' }}>{fmt(depositData.totals.fees)}</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deposited</span>
                  <span style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: '700' }}>{fmt(depositData.totals.deposited)}</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolved</span>
                  <span style={{ color: '#4ade80', fontSize: '28px', fontWeight: '700' }}>{depositData.totals.resolved}</span>
                  <span style={{ color: depositData.totals.unmatched > 0 ? '#FBBF24' : 'var(--text-muted)', fontSize: '12px' }}>
                    {depositData.totals.unmatched > 0 ? `${depositData.totals.unmatched} unmatched` : 'All matched ✓'}
                  </span>
                </div>
              </div>

              {/* Overall Category Summary */}
              <div style={{ ...card, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>📊 Category Summary</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{depositData.summary.length} categories</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                        {['Category', 'Source', 'Charges', 'Gross', 'Fees', 'Net'].map(h => (
                          <th key={h} style={{ padding: '14px 16px', textAlign: ['Charges', 'Gross', 'Fees', 'Net'].includes(h) ? 'right' : 'left', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {depositData.summary.map((s, i) => (
                        <tr key={s.category} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                          <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>
                            {s.category === 'Unmatched' ? '⚠️ ' : ''}{s.category}
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-table)' }}>
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: '600',
                              backgroundColor: s.source === 'pos' ? 'rgba(16,185,129,0.15)' : s.source === 'checkout' ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)',
                              color: s.source === 'pos' ? '#10B981' : s.source === 'checkout' ? '#818CF8' : '#FBBF24' }}>
                              {s.source === 'pos' ? 'POS' : s.source === 'checkout' ? 'Online' : 'Unknown'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>{s.charges}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(s.gross)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#f87171', fontSize: '14px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(s.fees)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(s.net)}</td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: 'rgba(255, 153, 51, 0.08)' }}>
                        <td colSpan="2" style={{ padding: '14px 16px', color: 'var(--accent)', fontSize: '14px', fontWeight: '700' }}>TOTAL</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontWeight: '700', fontSize: '14px' }}>{depositData.totals.charges}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#4ade80', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(depositData.totals.gross)}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#f87171', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(depositData.totals.fees)}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(depositData.totals.deposited)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per-Payout Cards */}
              {depositData.payouts.map(po => (
                <div key={po.payoutId} style={{ ...card, overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        🏦 {new Date(po.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
                        {po.chargeCount} charges
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#4ade80', fontFamily: 'monospace', fontWeight: '500' }}>Gross: {fmt(po.gross)}</span>
                      <span style={{ fontSize: '13px', color: '#f87171', fontFamily: 'monospace' }}>Fees: {fmt(po.fees)}</span>
                      <span style={{ fontSize: '15px', color: 'var(--accent)', fontFamily: 'monospace', fontWeight: '700' }}>Deposited: {fmt(po.net)}</span>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                          {['Category', 'Charges', 'Gross', 'Fees', 'Net'].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Category' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {po.categories.map((c, i) => (
                          <tr key={c.category} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent' }}>
                            <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>
                              {c.source === 'unmatched' ? '⚠️ ' : c.source === 'pos' ? '🏪 ' : '🌐 '}{c.category}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{c.charges}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: '#4ade80', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.gross)}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: '#f87171', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.fees)}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Empty State */}
          {!depositData && !depositLoading && (
            <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏦</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Deposit Breakdown</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Select a date range and click "Load Deposits" to see how each bank deposit breaks down by product category</p>
            </div>
          )}
        </>
      )}

      {/* ═══ CASH/CHECK TAB ═══ */}
      {topTab === 'cashcheck' && (
        <>
          {/* Loading */}
          {cashCheckLoading && (
            <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>💵</div>
              <p style={{ color: 'var(--text-muted)' }}>Loading cash & check payments from Odoo POS...</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>Resolving product categories from order lines</p>
            </div>
          )}

          {/* Cash/Check Results */}
          {cashCheckData && !cashCheckLoading && (
            <>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💵 Cash</span>
                  <span style={{ color: '#4ade80', fontSize: '28px', fontWeight: '700' }}>{fmt(cashCheckData.totals.cash)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{cashCheckData.totals.cashCount} payments</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📝 Check</span>
                  <span style={{ color: '#818CF8', fontSize: '28px', fontWeight: '700' }}>{fmt(cashCheckData.totals.check)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{cashCheckData.totals.checkCount} payments</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grand Total</span>
                  <span style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: '700' }}>{fmt(cashCheckData.totals.total)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{cashCheckData.totals.totalCount} payments</span>
                </div>
              </div>

              {/* Sub-tab toggle: Monthly / Daily / Transactions */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', ...card, padding: '4px', width: 'fit-content' }}>
                {[['monthly', '📅 Monthly'], ['daily', '📆 Daily Summary'], ['transactions', '💳 All Transactions']].map(([key, label]) => (
                  <button key={key} onClick={() => setCashCheckView(key)}
                    style={{ ...btnSecondary, padding: '8px 18px', fontSize: '13px', borderRadius: '10px',
                      backgroundColor: cashCheckView === key ? 'var(--accent)' : 'transparent',
                      color: cashCheckView === key ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: '600' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── MONTHLY VIEW ── */}
              {cashCheckView === 'monthly' && (
                <>
                  {/* Category Summary Table */}
                  <div style={{ ...card, overflow: 'hidden', marginBottom: '24px' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>📊 Category Summary</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cashCheckData.summary.length} categories</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                            {['Category', 'Cash #', 'Cash $', 'Check #', 'Check $', 'Total'].map(h => (
                              <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Category' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cashCheckData.summary.map((s, i) => (
                            <tr key={s.category} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                              <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>
                                {s.category}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>{s.cashCount || '—'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{s.cashAmount > 0 ? fmt(s.cashAmount) : '—'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>{s.checkCount || '—'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: '#818CF8', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{s.checkAmount > 0 ? fmt(s.checkAmount) : '—'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(s.totalAmount)}</td>
                            </tr>
                          ))}
                          <tr style={{ backgroundColor: 'rgba(255, 153, 51, 0.08)' }}>
                            <td style={{ padding: '14px 16px', color: 'var(--accent)', fontSize: '14px', fontWeight: '700' }}>TOTAL</td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>{cashCheckData.totals.cashCount}</td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', color: '#4ade80', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(cashCheckData.totals.cash)}</td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>{cashCheckData.totals.checkCount}</td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', color: '#818CF8', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(cashCheckData.totals.check)}</td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(cashCheckData.totals.total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Per-Month Breakdown */}
                  {Object.entries(cashCheckData.months)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([monthKey, mo]) => (
                    <div key={monthKey} style={{ ...card, overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            📅 {mo.label}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
                            {mo.totalCount} payments
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#4ade80', fontFamily: 'monospace', fontWeight: '500' }}>💵 {fmt(mo.cashTotal)}</span>
                          <span style={{ fontSize: '13px', color: '#818CF8', fontFamily: 'monospace' }}>📝 {fmt(mo.checkTotal)}</span>
                          <span style={{ fontSize: '15px', color: 'var(--accent)', fontFamily: 'monospace', fontWeight: '700' }}>Total: {fmt(mo.total)}</span>
                        </div>
                      </div>

                      {mo.cashCategories.length > 0 && (
                        <div style={{ padding: '12px 20px 0' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💵 Cash — {mo.cashCount} payments</span>
                        </div>
                      )}
                      {mo.cashCategories.length > 0 && (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                                {['Category', 'Payments', 'Amount'].map(h => (
                                  <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Category' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {mo.cashCategories.map((c, i) => (
                                <tr key={c.category} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent' }}>
                                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>{c.category}</td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{c.count}</td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#4ade80', fontSize: '13px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {mo.checkCategories.length > 0 && (
                        <div style={{ padding: '12px 20px 0' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📝 Check — {mo.checkCount} payments</span>
                        </div>
                      )}
                      {mo.checkCategories.length > 0 && (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                                {['Category', 'Payments', 'Amount'].map(h => (
                                  <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Category' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {mo.checkCategories.map((c, i) => (
                                <tr key={c.category} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent' }}>
                                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>{c.category}</td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{c.count}</td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#818CF8', fontSize: '13px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* ── DAILY SUMMARY VIEW ── */}
              {cashCheckView === 'daily' && cashCheckData.dailySummary && (
                <div style={{ ...card, overflow: 'hidden', marginBottom: '24px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>📆 Daily Summary</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cashCheckData.dailySummary.length} days</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                          {['Date', 'Cash #', 'Cash $', 'Check #', 'Check $', 'Total #', 'Total $'].map(h => (
                            <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Date' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cashCheckData.dailySummary.map((d, i) => (
                          <tr key={d.date} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                            <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>{fmtDate(d.date)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>{d.cashCount || '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{d.cashAmount > 0 ? fmt(d.cashAmount) : '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>{d.checkCount || '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#818CF8', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{d.checkAmount > 0 ? fmt(d.checkAmount) : '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--border-table)' }}>{d.totalCount}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(d.total)}</td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: 'rgba(255, 153, 51, 0.08)' }}>
                          <td style={{ padding: '14px 16px', color: 'var(--accent)', fontSize: '14px', fontWeight: '700' }}>TOTAL</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>{cashCheckData.totals.cashCount}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#4ade80', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(cashCheckData.totals.cash)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>{cashCheckData.totals.checkCount}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#818CF8', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(cashCheckData.totals.check)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>{cashCheckData.totals.totalCount}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(cashCheckData.totals.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── ALL TRANSACTIONS VIEW ── */}
              {cashCheckView === 'transactions' && cashCheckData.transactions && (
                <div style={{ ...card, overflow: 'hidden', marginBottom: '24px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>💳 All Transactions</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cashCheckData.transactions.length} payments</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                          {['Date', 'Time', 'Customer', 'Method', 'Amount', 'Category', 'Order Ref'].map(h => (
                            <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Amount' ? 'right' : 'left', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cashCheckData.transactions.map((tx, i) => (
                          <tr key={tx.id} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                            <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{fmtDate(tx.date)}</td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{tx.time ? tx.time.substring(0, 5) : '—'}</td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.customer || '—'}</td>
                            <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '6px',
                                backgroundColor: tx.method === 'Cash' ? 'rgba(74, 222, 128, 0.12)' : 'rgba(129, 140, 248, 0.12)',
                                color: tx.method === 'Cash' ? '#4ade80' : '#818CF8' }}>
                                {tx.method === 'Cash' ? '💵' : '📝'} {tx.method}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{fmt(tx.amount)}</td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{tx.category}</td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{tx.orderRef || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!cashCheckData && !cashCheckLoading && (
            <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💵</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Cash & Check Report</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Select a date range and click &quot;Generate Report&quot; to see cash and check payments grouped by month and product category</p>
            </div>
          )}
        </>
      )}

      {/* ═══ INVOICES TAB ═══ */}
      {topTab === 'invoices' && (
        <>
          {invoiceLoading && (
            <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>📋</div>
              <p style={{ color: 'var(--text-muted)' }}>Loading non-POS invoices from Odoo...</p>
            </div>
          )}

          {invoiceData && !invoiceLoading && (
            <>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✅ Paid</span>
                  <span style={{ color: '#4ade80', fontSize: '28px', fontWeight: '700' }}>{fmt(invoiceData.totals.paid)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{invoiceData.totals.countPaid} invoices</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏳ Unpaid</span>
                  <span style={{ color: '#f87171', fontSize: '28px', fontWeight: '700' }}>{fmt(invoiceData.totals.unpaid)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{invoiceData.totals.countUnpaid} invoices</span>
                </div>
                <div style={kpiCard}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Invoiced</span>
                  <span style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: '700' }}>{fmt(invoiceData.totals.all)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{invoiceData.totals.countAll} invoices (excl. {invoiceData.excluded?.posInvoices || 0} POS)</span>
                </div>
              </div>

              {/* Category Summary */}
              {invoiceData.categorySummary && invoiceData.categorySummary.length > 0 && (
                <div style={{ ...card, overflow: 'hidden', marginBottom: '24px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>📊 Category Summary</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{invoiceData.categorySummary.length} categories</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                          {['Category', '# Invoices', 'Paid', 'Unpaid', 'Total'].map(h => (
                            <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Category' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.categorySummary.map((c, i) => (
                          <tr key={c.category} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                            <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>{c.category}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>{c.count}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.paid)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#f87171', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{c.unpaid > 0 ? fmt(c.unpaid) : '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invoice List */}
              <div style={{ ...card, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>📋 All Invoices</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{invoiceData.invoices.length} invoices</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                        {['Date', 'Invoice #', 'Customer', 'Amount', 'Balance', 'Status', 'Paid Via', 'Category'].map(h => (
                          <th key={h} style={{ padding: '14px 16px', textAlign: ['Amount', 'Balance'].includes(h) ? 'right' : 'left', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.invoices.map((inv, i) => (
                        <tr key={inv.id} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{fmtDate(inv.date)}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{inv.number}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customer || '—'}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{fmt(inv.amount)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: inv.residual > 0 ? '#f87171' : '#4ade80', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{inv.residual > 0 ? fmt(inv.residual) : '—'}</td>
                          <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '6px',
                              backgroundColor: ['paid', 'in_payment'].includes(inv.status) ? 'rgba(74, 222, 128, 0.12)' : inv.status === 'partial' ? 'rgba(251, 191, 36, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                              color: ['paid', 'in_payment'].includes(inv.status) ? '#4ade80' : inv.status === 'partial' ? '#FBBF24' : '#f87171' }}>
                              {inv.status === 'paid' ? 'Paid' : inv.status === 'in_payment' ? 'In Payment' : inv.status === 'partial' ? 'Partial' : 'Unpaid'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>{inv.paymentJournal || '—'}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{inv.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!invoiceData && !invoiceLoading && (
            <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Non-POS Invoices</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Shows invoices not captured by POS or Stripe — sale orders, facility rentals, manual invoices</p>
            </div>
          )}
        </>
      )}

      {/* ═══ FULL MONTHLY REPORT TAB ═══ */}
      {topTab === 'fullreport' && (
        <>
          {fullReportLoading && (
            <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>📈</div>
              <p style={{ color: 'var(--text-muted)' }}>Loading Stripe + Cash/Check + Invoices...</p>
            </div>
          )}

          {fullReport && !fullReportLoading && (() => {
            const t = fullReport.totals;
            const sortedMonths = Object.entries(fullReport.months).sort(([a], [b]) => b.localeCompare(a));
            return (
              <>
                {/* Grand Summary KPI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  <div style={kpiCard}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💳 Stripe Gross</span>
                    <span style={{ color: '#818CF8', fontSize: '24px', fontWeight: '700' }}>{fmt(t.stripeGross)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t.stripeCount} charges</span>
                  </div>
                  <div style={kpiCard}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stripe Fees</span>
                    <span style={{ color: '#f87171', fontSize: '24px', fontWeight: '700' }}>-{fmt(t.stripeFees)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t.stripeGross > 0 ? ((t.stripeFees / t.stripeGross) * 100).toFixed(2) : 0}% rate</span>
                  </div>
                  <div style={kpiCard}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💵 Cash</span>
                    <span style={{ color: '#4ade80', fontSize: '24px', fontWeight: '700' }}>{fmt(t.totalCash)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t.cashCount} payments</span>
                  </div>
                  <div style={kpiCard}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📝 Check</span>
                    <span style={{ color: '#FBBF24', fontSize: '24px', fontWeight: '700' }}>{fmt(t.totalCheck)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t.checkCount} payments</span>
                  </div>
                  <div style={kpiCard}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 Invoices</span>
                    <span style={{ color: '#38BDF8', fontSize: '24px', fontWeight: '700' }}>{fmt(t.invPaid + t.invUnpaid)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t.invCount} invoices ({t.invUnpaid > 0 ? fmt(t.invUnpaid) + ' unpaid' : 'all paid'})</span>
                  </div>
                  <div style={{ ...kpiCard, borderColor: 'var(--accent)', borderWidth: '2px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grand Total</span>
                    <span style={{ color: 'var(--accent)', fontSize: '24px', fontWeight: '700' }}>{fmt(t.grandTotal)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Net: {fmt(t.grandTotal - t.stripeFees)}</span>
                  </div>
                </div>

                {/* Revenue Source Breakdown Table */}
                <div style={{ ...card, overflow: 'hidden', marginBottom: '24px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>📊 Revenue by Source</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                          {['Source', 'Count', 'Gross', 'Fees', 'Net / Amount'].map(h => (
                            <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Source' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { src: '💳 Stripe (Card)', count: t.stripeCount, gross: t.stripeGross, fees: t.stripeFees, net: t.stripeNet, color: '#818CF8' },
                          { src: '💵 Cash (POS)', count: t.cashCount, gross: t.totalCash, fees: 0, net: t.totalCash, color: '#4ade80' },
                          { src: '📝 Check (POS)', count: t.checkCount, gross: t.totalCheck, fees: 0, net: t.totalCheck, color: '#FBBF24' },
                          { src: '📋 Invoices (Paid)', count: '', gross: t.invPaid, fees: 0, net: t.invPaid, color: '#38BDF8' },
                          { src: '📋 Invoices (Unpaid)', count: '', gross: t.invUnpaid, fees: 0, net: t.invUnpaid, color: '#f87171' },
                        ].map((r, i) => (
                          <tr key={r.src} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent' }}>
                            <td style={{ padding: '12px 16px', color: r.color, fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--border-table)' }}>{r.src}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>{r.count}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(r.gross)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: r.fees > 0 ? '#f87171' : 'var(--text-muted)', fontSize: '14px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{r.fees > 0 ? '-' + fmt(r.fees) : '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(r.net)}</td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--border-table)' }}>GRAND TOTAL</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', borderBottom: '1px solid var(--border-table)' }}></td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontSize: '14px', fontWeight: '700', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(t.grandTotal)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#f87171', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>-{fmt(t.stripeFees)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontSize: '14px', fontWeight: '700', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(t.grandTotal - t.stripeFees)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Month-by-Month Sections */}
                {sortedMonths.map(([mk, mo]) => {
                  const dt = new Date(mk + '-15');
                  const label = dt.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                  const moTotal = mo.stripe.gross + mo.cash + mo.check + mo.invoices.paid + mo.invoices.unpaid;

                  return (
                    <div key={mk} style={{ ...card, overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>📅 {label}</h3>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)', fontFamily: 'monospace' }}>{fmt(moTotal)}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                              {['Source', 'Count', 'Gross', 'Fees', 'Net'].map(h => (
                                <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Source' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: '10px 16px', color: '#818CF8', fontSize: '13px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>Stripe</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{mo.stripe.count}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(mo.stripe.gross)}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: '#f87171', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{mo.stripe.fees > 0 ? '-' + fmt(mo.stripe.fees) : '—'}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(mo.stripe.net)}</td>
                            </tr>
                            <tr style={{ backgroundColor: 'var(--bg-table-stripe)' }}>
                              <td style={{ padding: '10px 16px', color: '#4ade80', fontSize: '13px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>Cash</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{mo.cashCount}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(mo.cash)}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>—</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(mo.cash)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '10px 16px', color: '#FBBF24', fontSize: '13px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>Check</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{mo.checkCount}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(mo.check)}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>—</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(mo.check)}</td>
                            </tr>
                            <tr style={{ backgroundColor: 'var(--bg-table-stripe)' }}>
                              <td style={{ padding: '10px 16px', color: '#38BDF8', fontSize: '13px', fontWeight: '500', borderBottom: '1px solid var(--border-table)' }}>Invoices</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{mo.invoices.count}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(mo.invoices.paid + mo.invoices.unpaid)}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>—</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(mo.invoices.paid + mo.invoices.unpaid)}</td>
                            </tr>
                            <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                              <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '700' }}>TOTAL</td>
                              <td style={{ padding: '10px 16px' }}></td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--accent)', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' }}>{fmt(moTotal)}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: '#f87171', fontSize: '13px', fontFamily: 'monospace' }}>{mo.stripe.fees > 0 ? '-' + fmt(mo.stripe.fees) : '—'}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--accent)', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' }}>{fmt(moTotal - mo.stripe.fees)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}

          {!fullReport && !fullReportLoading && (
            <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Full Monthly Revenue Report</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Combines Stripe + Cash/Check + Invoices into one unified report with month-by-month breakdown</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
