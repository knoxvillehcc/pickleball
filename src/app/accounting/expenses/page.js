'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { HCC_ACCOUNT_CATEGORIES } from '@/lib/expensesDb';

function formatMMDDYYYY(d) {
  if (!d) return '—';
  const str = String(d);
  if (str.includes('T')) {
    const [ymd] = str.split('T');
    const [y, m, day] = ymd.split('-');
    return `${m}-${day}-${y}`;
  }
  const parts = str.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[1]}-${parts[2]}-${parts[0]}`;
    return str;
  }
  return str;
}

const SAFFRON = '#FF6B35';
const SKY_BLUE = '#0284C7';
const EMERALD = '#10B981';

export default function ExpensesManagementPage() {
  const [activeTab, setActiveTab] = useState('event'); // 'event' | 'utilities' | 'all'
  const [expenses, setExpenses] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('Navratri 2026');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Multi-select for utilities
  const [selectedExpenseIds, setSelectedExpenseIds] = useState(new Set());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Form State
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formVendor, setFormVendor] = useState('');
  const [formAccountCode, setFormAccountCode] = useState('30008');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('check');
  const [formRef, setFormRef] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formEventTag, setFormEventTag] = useState('Navratri 2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newEventAnalytic, setNewEventAnalytic] = useState('');
  const [newEventType, setNewEventType] = useState('festival');

  // Odoo posting state
  const [isPostingOdoo, setIsPostingOdoo] = useState(false);
  const [odooPostMsg, setOdooPostMsg] = useState('');

  // Live Revenue for Event (Navratri 2026 fallback / aggregated)
  const [eventRevenue, setEventRevenue] = useState({
    boothsGross: 0,
    adsGross: 0,
    ticketsGross: 0,
    feesTotal: 0,
    netBank: 0,
    loading: false,
  });

  // Load registered events
  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/accounting/expenses/events');
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch (e) {
      console.warn('Failed to load events:', e.message);
    }
  }, []);

  // Load expenses
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/accounting/expenses');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load expenses');
      setExpenses(data.expenses || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load live event revenue if in event mode
  const loadEventRevenue = useCallback(async (eventName) => {
    if (eventName === 'Navratri 2026') {
      setEventRevenue(prev => ({ ...prev, loading: true }));
      try {
        const [vendorRes, adsRes] = await Promise.all([
          fetch('/api/navratri/vendors/registrations').then(r => r.json()).catch(() => ({})),
          fetch('/api/led-ads/registrations').then(r => r.json()).catch(() => ({})),
        ]);

        const paidVendors = (vendorRes.registrations || []).filter(r => r.payment_status === 'paid');
        const paidAds = (adsRes.registrations || []).filter(r => r.payment_status === 'paid');

        const boothsGross = paidVendors.reduce((sum, r) => sum + ((r.amount_paid || 0) / 100), 0);
        const adsGross = paidAds.reduce((sum, r) => sum + ((r.amount_paid || 0) / 100), 0);
        const totalGross = boothsGross + adsGross;
        const totalFees = (boothsGross * 0.029 + paidVendors.length * 0.30) + (adsGross * 0.029 + paidAds.length * 0.30);

        setEventRevenue({
          boothsGross,
          adsGross,
          ticketsGross: 0,
          totalGross,
          feesTotal: totalFees,
          netBank: totalGross - totalFees,
          loading: false,
        });
      } catch {
        setEventRevenue(prev => ({ ...prev, loading: false }));
      }
    } else {
      setEventRevenue({ boothsGross: 0, adsGross: 0, ticketsGross: 0, totalGross: 0, feesTotal: 0, netBank: 0, loading: false });
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadExpenses();
  }, [loadEvents, loadExpenses]);

  useEffect(() => {
    if (activeTab === 'event' && selectedEvent) {
      loadEventRevenue(selectedEvent);
    }
  }, [activeTab, selectedEvent, loadEventRevenue]);

  // Open Add Modal
  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormVendor('');
    setFormAccountCode(activeTab === 'utilities' ? '4001' : '30008');
    setFormAmount('');
    setFormMethod('check');
    setFormRef('');
    setFormDesc('');
    setFormEventTag(activeTab === 'event' ? selectedEvent : 'general');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditExpenseModal = (exp) => {
    setEditingExpense(exp);
    setFormDate(exp.expense_date ? exp.expense_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormVendor(exp.vendor_name || '');
    setFormAccountCode(exp.account_code || '30008');
    setFormAmount(String(exp.amount || ''));
    setFormMethod(exp.payment_method || 'check');
    setFormRef(exp.payment_ref || '');
    setFormDesc(exp.description || '');
    setFormEventTag(exp.event_tag || 'general');
    setShowAddModal(true);
  };

  // Save Expense (Create or Edit)
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!formVendor || !formAmount || Number(formAmount) <= 0) {
      alert('Please provide a valid vendor name and positive dollar amount.');
      return;
    }

    const selectedCategory = HCC_ACCOUNT_CATEGORIES.find(c => c.code === formAccountCode);
    const accountName = selectedCategory ? selectedCategory.name.split(' (')[0] : 'Expense';

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        // Edit existing
        const res = await fetch('/api/accounting/expenses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingExpense.id,
            expense_date: formDate,
            vendor_name: formVendor,
            account_code: formAccountCode,
            account_name: accountName,
            amount: formAmount,
            payment_method: formMethod,
            payment_ref: formRef,
            description: formDesc,
            event_tag: formEventTag,
            analytic_account: formEventTag !== 'general' ? formEventTag : '',
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to update expense');
      } else {
        // Create new
        const res = await fetch('/api/accounting/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expense_date: formDate,
            vendor_name: formVendor,
            account_code: formAccountCode,
            account_name: accountName,
            amount: formAmount,
            payment_method: formMethod,
            payment_ref: formRef,
            description: formDesc,
            event_tag: formEventTag,
            analytic_account: formEventTag !== 'general' ? formEventTag : '',
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to create expense');
      }

      setShowAddModal(false);
      loadExpenses();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id, vendor) => {
    if (!confirm(`Are you sure you want to delete expense for "${vendor}"?`)) return;
    try {
      const res = await fetch(`/api/accounting/expenses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete');
      loadExpenses();
    } catch (err) {
      alert('Delete error: ' + err.message);
    }
  };

  // Create Custom Event
  const handleCreateCustomEvent = async (e) => {
    e.preventDefault();
    if (!newEventName) return;
    try {
      const res = await fetch('/api/accounting/expenses/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: newEventName,
          analyticName: newEventAnalytic || newEventName,
          eventType: newEventType,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add event');
      await loadEvents();
      setSelectedEvent(newEventName);
      setShowNewEventModal(false);
      setNewEventName('');
      setNewEventAnalytic('');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Multi-select toggle
  const toggleSelectExpense = (id) => {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Post Selected Utility Bills to Odoo (Option A)
  const handlePostSelectedToOdoo = async () => {
    if (selectedExpenseIds.size === 0) return;
    setIsPostingOdoo(true);
    setOdooPostMsg('');
    try {
      const res = await fetch('/api/accounting/expenses/sync-odoo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'batch_utilities',
          expenseIds: Array.from(selectedExpenseIds),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success: ${data.message}`);
        setSelectedExpenseIds(new Set());
        loadExpenses();
      } else {
        alert(`Odoo Posting Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Posting Error: ${err.message}`);
    } finally {
      setIsPostingOdoo(false);
    }
  };

  // Post Event Settlement to Odoo
  const handlePostEventSettlement = async () => {
    setIsPostingOdoo(true);
    setOdooPostMsg('');
    try {
      const targetExpenses = expenses.filter(e => e.event_tag === selectedEvent);
      const res = await fetch('/api/accounting/expenses/sync-odoo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'event_settlement',
          eventTag: selectedEvent,
          analyticName: selectedEvent,
          expenseIds: targetExpenses.map(e => e.id),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOdooPostMsg(`Settlement posted successfully to Odoo: ${data.moveName}`);
        loadExpenses();
      } else {
        setOdooPostMsg(data.error || 'Settlement posting failed');
      }
    } catch (err) {
      setOdooPostMsg(`Error: ${err.message}`);
    } finally {
      setIsPostingOdoo(false);
    }
  };

  // Filtered expenses based on active tab and search
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Tab filter
      if (activeTab === 'event') {
        if (exp.event_tag !== selectedEvent) return false;
      } else if (activeTab === 'utilities') {
        if (exp.event_tag !== 'general') return false;
      }

      // Status filter
      if (statusFilter !== 'all' && exp.status !== statusFilter) return false;

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        return (
          exp.vendor_name?.toLowerCase().includes(q) ||
          exp.account_name?.toLowerCase().includes(q) ||
          exp.account_code?.includes(q) ||
          exp.payment_ref?.toLowerCase().includes(q) ||
          exp.description?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [expenses, activeTab, selectedEvent, statusFilter, search]);

  // Financial aggregates
  const eventExpensesTotal = useMemo(() => {
    return expenses
      .filter(e => e.event_tag === selectedEvent)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, selectedEvent]);

  const eventNetProfit = (eventRevenue.totalGross || 0) - eventExpensesTotal - (eventRevenue.feesTotal || 0);

  const selectedTotalAmount = useMemo(() => {
    return expenses
      .filter(e => selectedExpenseIds.has(e.id))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, selectedExpenseIds]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 28px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>

        {/* ── TOP HEADER ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: SAFFRON,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
                Expenses & Accounts
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
              Record event vendor bills, facility utility payments, and post clean settlements to Odoo with full bank reconciliation support.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={openAddExpenseModal}
              style={{
                padding: '9px 16px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #FF6B35, #E85D04)', color: '#FFFFFF',
                fontWeight: '700', fontSize: '13.5px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px',
                boxShadow: '0 2px 8px rgba(255,107,53,0.3)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ Add Expense</span>
            </button>

            <button
              onClick={loadExpenses}
              style={{
                padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-primary)',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── MODE TABS ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '8px' }}>
          {[
            { id: 'event', label: 'Event Settlement & P&L', count: expenses.filter(e => e.event_tag !== 'general').length },
            { id: 'utilities', label: 'Utilities & Operating Bills', count: expenses.filter(e => e.event_tag === 'general').length },
            { id: 'all', label: 'All Expenses Log', count: expenses.length },
          ].map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: active ? `3px solid ${SAFFRON}` : '3px solid transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? '800' : '600', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: '2px 7px', borderRadius: '99px', fontSize: '11px', fontWeight: '700',
                  background: active ? 'rgba(255,107,53,0.15)' : 'var(--bg-secondary)',
                  color: active ? SAFFRON : 'var(--text-muted)',
                }}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* ── EVENT MODE: EVENT SELECTOR & LIVE P&L CARDS ─────────────────────── */}
        {activeTab === 'event' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderRadius: '14px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', marginBottom: '20px', flexWrap: 'wrap', gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Target Event:
                </span>
                <select
                  value={selectedEvent}
                  onChange={e => setSelectedEvent(e.target.value)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1.5px solid var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  {events.map(ev => (
                    <option key={ev.event_name} value={ev.event_name}>{ev.event_name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewEventModal(true)}
                  style={{
                    padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  }}
                >
                  + Add Custom Event
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setShowSettlementModal(true)}
                  style={{
                    padding: '10px 18px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #0284C7, #0369A1)', color: '#FFFFFF',
                    fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '7px',
                    boxShadow: '0 2px 8px rgba(2,132,199,0.3)',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Post Final Settlement to Odoo</span>
                </button>
              </div>
            </div>

            {/* Live Financial P&L Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '20px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3.5px solid ${EMERALD}`, boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Total Event Revenue</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: EMERALD }}>${(eventRevenue.totalGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Booths: ${eventRevenue.boothsGross?.toFixed(2)} · Ads: ${eventRevenue.adsGross?.toFixed(2)}
                </div>
              </div>

              <div style={{ padding: '20px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '3.5px solid #EF4444', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Total Event Expenses</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#EF4444' }}>${eventExpensesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {expenses.filter(e => e.event_tag === selectedEvent).length} logged receipts/bills
                </div>
              </div>

              <div style={{ padding: '20px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3.5px solid ${eventNetProfit >= 0 ? SKY_BLUE : '#EF4444'}`, boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Projected Net Profit / (Loss)</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: eventNetProfit >= 0 ? SKY_BLUE : '#EF4444' }}>
                  ${eventNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Less ${eventRevenue.feesTotal?.toFixed(2) || '0.00'} Stripe CC fees
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── UTILITIES MODE: BATCH ACTIONS ───────────────────────────────────── */}
        {activeTab === 'utilities' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderRadius: '12px', background: 'var(--bg-card)',
            border: '1px solid var(--border)', marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Select entered utility bills below to post in batch to Odoo. Check numbers and card last-4 are preserved for bank reconciliation.
            </div>

            {selectedExpenseIds.size > 0 && (
              <button
                onClick={handlePostSelectedToOdoo}
                disabled={isPostingOdoo}
                style={{
                  padding: '9px 18px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFFFFF',
                  fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Post {selectedExpenseIds.size} Bill(s) to Odoo (${selectedTotalAmount.toFixed(2)})</span>
              </button>
            )}
          </div>
        )}

        {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search vendor, account, check #, memo..."
              style={{
                width: '100%', padding: '10px 14px 10px 36px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {['all', 'draft', 'posted_odoo', 'adjustment_pending'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--border)',
                background: statusFilter === st ? SAFFRON : 'var(--bg-card)',
                color: statusFilter === st ? '#FFFFFF' : 'var(--text-primary)',
                fontWeight: '700', fontSize: '12.5px', cursor: 'pointer',
              }}
            >
              {st === 'all' ? 'All Status' : st === 'posted_odoo' ? 'Posted to Odoo' : st === 'adjustment_pending' ? 'Adjustment Pending' : 'Draft / Unposted'}
            </button>
          ))}
        </div>

        {/* ── EXPENSES TABLE ──────────────────────────────────────────────────── */}
        <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: 'var(--shadow)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                {activeTab === 'utilities' && <th style={{ padding: '12px 14px', width: '30px' }} />}
                {['Date (MM-DD-YYYY)', 'Vendor / Payee', 'Account Category', 'Target / Event', 'Payment Method & Ref', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', letterSpacing: '0.6px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={activeTab === 'utilities' ? 9 : 8} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses recorded under this view.</td></tr>
              ) : filteredExpenses.map(exp => {
                const isSelected = selectedExpenseIds.has(exp.id);
                return (
                  <tr key={exp.id} style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                    {activeTab === 'utilities' && (
                      <td style={{ padding: '12px 14px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectExpense(exp.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                    )}
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {formatMMDDYYYY(exp.expense_date)}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      <div>{exp.vendor_name}</div>
                      {exp.description && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{exp.description}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: '11.5px', fontWeight: '700' }}>
                        {exp.account_code} · {exp.account_name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                      <span style={{ color: exp.event_tag === 'general' ? 'var(--text-muted)' : SAFFRON }}>
                        {exp.event_tag === 'general' ? 'General Operations' : exp.event_tag}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      <div style={{ textTransform: 'capitalize', fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px' }}>
                        {exp.payment_method === 'check' ? 'Bank Check' : exp.payment_method === 'card' ? 'Debit/Credit Card' : exp.payment_method === 'reimbursable' ? 'Reimbursable' : 'Cash'}
                      </div>
                      {exp.payment_ref && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{exp.payment_ref}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
                      ${Number(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {exp.status === 'posted_odoo' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                          {exp.odoo_move_name || 'Posted to Odoo'}
                        </span>
                      ) : exp.status === 'adjustment_pending' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', background: 'rgba(245,158,11,0.1)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }} />
                          Adjustment Pending
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', background: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          Draft
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => openEditExpenseModal(exp)}
                          style={{
                            padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.vendor_name)}
                          style={{
                            padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* ── MODAL: ADD / EDIT EXPENSE ─────────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ maxWidth: '520px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 22px', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {editingExpense?.status === 'posted_odoo' && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '12px', color: '#D97706', fontWeight: '600' }}>
                Notice: This expense was previously posted to Odoo under {editingExpense.odoo_move_name}. Saving edits will update the record and mark status as Adjustment Pending.
              </div>
            )}

            <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Date Paid</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '700', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Vendor / Payee</label>
                <input
                  type="text"
                  placeholder="e.g. KUB Electric, DJ Amit, Knox County Sheriff"
                  value={formVendor}
                  onChange={e => setFormVendor(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Expense Category (Odoo Account)</label>
                <select
                  value={formAccountCode}
                  onChange={e => setFormAccountCode(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <optgroup label="Event Expenses">
                    {HCC_ACCOUNT_CATEGORIES.filter(c => c.group === 'events').map(c => (
                      <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Utilities & Facility Bills">
                    {HCC_ACCOUNT_CATEGORIES.filter(c => c.group === 'utilities').map(c => (
                      <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Temple & Kitchen">
                    {HCC_ACCOUNT_CATEGORIES.filter(c => c.group === 'temple').map(c => (
                      <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Target / Event Tag</label>
                  <select
                    value={formEventTag}
                    onChange={e => setFormEventTag(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', cursor: 'pointer' }}
                  >
                    <option value="general">General Operations / Utilities</option>
                    {events.map(ev => (
                      <option key={ev.event_name} value={ev.event_name}>{ev.event_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Payment Method</label>
                  <select
                    value={formMethod}
                    onChange={e => setFormMethod(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', cursor: 'pointer' }}
                  >
                    <option value="check">HCC Bank Check (101401)</option>
                    <option value="card">HCC Debit/Credit Card (101401)</option>
                    <option value="cash">Petty Cash on Hand (100100)</option>
                    <option value="reimbursable">Volunteer Reimbursable (201100)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {formMethod === 'check' ? 'Check Number' : formMethod === 'card' ? 'Card Last 4 / Memo' : formMethod === 'reimbursable' ? 'Volunteer Name' : 'Receipt / Cash Ref'}
                </label>
                <input
                  type="text"
                  placeholder={formMethod === 'check' ? 'e.g. Check #1042' : formMethod === 'card' ? 'e.g. Card ending 4190' : 'Reference note'}
                  value={formRef}
                  onChange={e => setFormRef(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Description / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. September electric bill, Garba sound deposit"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: SAFFRON, color: '#FFFFFF', fontWeight: '700', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Saving...' : editingExpense ? 'Save Changes' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD CUSTOM EVENT ───────────────────────────────────────────── */}
      {showNewEventModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ maxWidth: '440px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 22px', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Add Custom Event
              </h3>
              <button onClick={() => setShowNewEventModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleCreateCustomEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Event Name</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Mela 2026, Holi 2026"
                  value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Odoo Analytic Account Name</label>
                <input
                  type="text"
                  placeholder="Defaults to event name if empty"
                  value={newEventAnalytic}
                  onChange={e => setNewEventAnalytic(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Event Type</label>
                <select
                  value={newEventType}
                  onChange={e => setNewEventType(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <option value="festival">Festival</option>
                  <option value="sports">Sports Tournament</option>
                  <option value="fundraiser">Fundraiser / Cultural</option>
                  <option value="general">General Program</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: SAFFRON, color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: POST FINAL EVENT SETTLEMENT ───────────────────────────────── */}
      {showSettlementModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ maxWidth: '540px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 22px', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(2,132,199,0.1)', color: SKY_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Odoo Event Settlement & P&L
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    {selectedEvent} Final Settlement Entry
                  </div>
                </div>
              </div>
              <button onClick={() => setShowSettlementModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Event / Analytic Account:</span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{selectedEvent}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Odoo Journal:</span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>MISC (General Operations)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Event Expenses:</span>
                <span style={{ fontWeight: '700', color: '#EF4444' }}>${eventExpensesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Event Revenue:</span>
                <span style={{ fontWeight: '700', color: EMERALD }}>${(eventRevenue.totalGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Net Event Profit / (Loss):</span>
                <span style={{ fontWeight: '700', color: eventNetProfit >= 0 ? SKY_BLUE : '#EF4444' }}>
                  ${eventNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
              This creates a confirmed General Journal Entry in Odoo tagging all revenue and expense accounts with the <strong>{selectedEvent}</strong> analytic account. Check numbers and card last-4 are included on lines for seamless bank reconciliation.
            </div>

            {odooPostMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700',
                background: odooPostMsg.startsWith('Success') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: odooPostMsg.startsWith('Success') ? '#10B981' : '#EF4444',
                border: `1px solid ${odooPostMsg.startsWith('Success') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {odooPostMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowSettlementModal(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={handlePostEventSettlement}
                disabled={isPostingOdoo}
                style={{
                  flex: 1, padding: '11px', borderRadius: '10px', border: 'none',
                  background: isPostingOdoo ? 'rgba(2,132,199,0.5)' : 'linear-gradient(135deg, #0284C7, #0369A1)',
                  color: '#FFFFFF', fontWeight: '700', cursor: isPostingOdoo ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {isPostingOdoo ? 'Posting to Odoo...' : 'Confirm & Post Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
