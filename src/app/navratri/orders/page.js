'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';

const T = (theme) => ({
  bg: theme === 'dark' ? '#0f172a' : '#F8FAFC', card: theme === 'dark' ? '#1e293b' : '#FFFFFF',
  border: theme === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
  text: theme === 'dark' ? '#F8FAFC' : '#0f172a', muted: theme === 'dark' ? '#94A3B8' : '#64748B',
  primary: '#FF6B35', green: '#34D399', red: '#EF4444', accent: '#FFD700', blue: '#60A5FA',
});

const STATUS_COLORS = {
  paid: { bg: 'rgba(52,211,153,0.1)', color: '#34D399', label: '✅ Paid' },
  pending: { bg: 'rgba(255,215,0,0.1)', color: '#FFD700', label: '⏳ Pending' },
  cancelled: { bg: 'rgba(148,163,184,0.1)', color: '#94A3B8', label: '❌ Cancelled' },
  refunded: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: '↩️ Refunded' },
  partial_refund: { bg: 'rgba(255,107,53,0.1)', color: '#FF6B35', label: '⚠️ Partial Refund' },
};

export default function OrdersPage() {
  const { theme } = useTheme();
  const t = T(theme);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventId, setEventId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/navratri/events');
      const data = await res.json();
      if (data.events?.length) setEventId(data.events[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!eventId) return;
    loadOrders();
  }, [eventId, statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/navratri/orders?eventId=${eventId}&limit=100`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { }
    finally { setLoading(false); }
  };

  const handleSearch = () => loadOrders();

  const handleRefund = async () => {
    if (!refundModal || !refundReason) return;
    setRefundLoading(true);
    try {
      const res = await fetch('/api/navratri/refunds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: refundModal.id, reason: refundReason }),
      });
      const data = await res.json();
      if (data.success) {
        setRefundModal(null);
        setRefundReason('');
        loadOrders();
      } else {
        alert(data.error || 'Refund failed');
      }
    } catch { alert('Refund failed'); }
    finally { setRefundLoading(false); }
  };

  const fmt = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`;

  return (
    <div style={{ padding: '24px 28px', color: t.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>🎫 Orders</h1>
        <a href="/navratri" style={{ color: t.primary, fontSize: '14px', textDecoration: 'none' }}>← Back to Dashboard</a>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name, phone, or order #..."
          style={{ flex: 1, minWidth: '200px', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: '14px', outline: 'none' }} />
        <button onClick={handleSearch} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: t.primary, color: 'white', fontWeight: '700', cursor: 'pointer' }}>Search</button>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: '14px', cursor: 'pointer' }}>
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Orders table */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.muted }}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.muted }}>No orders found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {['Order #', 'Name', 'Phone', 'Type', 'Method', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: t.muted, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => {
                const sc = STATUS_COLORS[order.payment_status] || STATUS_COLORS.pending;
                return (
                  <tr key={order.id} style={{ borderBottom: `1px solid ${t.border}`, cursor: 'pointer' }}
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' }}>{order.order_number}</td>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>{order.purchaser_name}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: t.muted }}>{order.purchaser_phone}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,107,53,0.1)', color: t.primary, fontWeight: '600', textTransform: 'capitalize' }}>
                        {(order.order_type || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', textTransform: 'capitalize' }}>{order.payment_method}</td>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '700' }}>{fmt(order.total_amount)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: sc.bg, color: sc.color, fontWeight: '600' }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: t.muted }}>
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {(order.payment_status === 'paid' || order.payment_status === 'partial_refund') && (
                        <button onClick={e => { e.stopPropagation(); setRefundModal(order); }}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid rgba(239,68,68,0.3)`, background: 'transparent', color: t.red, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Order detail panel */}
      {selectedOrder && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px', marginTop: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Order Detail — {selectedOrder.order_number}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '14px' }}>
            <div><span style={{ color: t.muted }}>Name:</span> <strong>{selectedOrder.purchaser_name}</strong></div>
            <div><span style={{ color: t.muted }}>Email:</span> {selectedOrder.purchaser_email}</div>
            <div><span style={{ color: t.muted }}>Phone:</span> {selectedOrder.purchaser_phone}</div>
            <div><span style={{ color: t.muted }}>Customer:</span> <span style={{ textTransform: 'capitalize' }}>{selectedOrder.customer_type}</span></div>
            <div><span style={{ color: t.muted }}>Stripe Fee:</span> {fmt(selectedOrder.stripe_fee)}</div>
            <div><span style={{ color: t.muted }}>Stripe Session:</span> <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{selectedOrder.stripe_session_id?.substring(0, 20)}...</span></div>
          </div>
          {selectedOrder.items?.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: t.muted, marginBottom: '8px' }}>LINE ITEMS</h4>
              {selectedOrder.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}`, fontSize: '13px' }}>
                  <span>{item.ticket_type} × {item.quantity}</span>
                  <span style={{ fontWeight: '700' }}>{fmt(item.total_price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refund modal */}
      {refundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={() => setRefundModal(null)}>
          <div style={{ background: t.card, borderRadius: '20px', padding: '32px', maxWidth: '440px', width: '100%', border: `1px solid ${t.border}` }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>↩️ Issue Refund</h3>
            <p style={{ color: t.muted, fontSize: '14px', marginBottom: '20px' }}>
              {refundModal.order_number} — {refundModal.purchaser_name} — {fmt(refundModal.total_amount)}
            </p>
            <label style={{ fontSize: '13px', fontWeight: '600', color: t.muted }}>Reason *</label>
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)}
              rows={3} placeholder="Why are you issuing this refund?"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${t.border}`, background: 'rgba(255,255,255,0.05)', color: t.text, fontSize: '14px', resize: 'vertical', marginTop: '6px', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setRefundModal(null)}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRefund} disabled={!refundReason || refundLoading}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: t.red, color: 'white', fontWeight: '800', cursor: 'pointer', opacity: !refundReason || refundLoading ? 0.5 : 1 }}>
                {refundLoading ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
