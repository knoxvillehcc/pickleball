'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AartiLiveTicker from '@/components/AartiLiveTicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportPdfWithNativeShare } from '@/lib/pdfShareHelper';
import { useAuth } from '@/components/ClientLayout';

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
  pdf: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
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
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  globe: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  globeOff: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M4.93 4.93 19.07 19.07" />
    </svg>
  ),
  lock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  edit: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
};

export default function NavratriAartiAdminPage() {
  const { canEdit: authCanEdit, isViewOnly: authIsViewOnly } = useAuth();
  const [data, setData] = useState(null);
  const isViewOnly = data?.isViewOnly ?? (authIsViewOnly ? authIsViewOnly('navratri_aarti') : false);
  const canEdit = data?.canEdit ?? (authCanEdit ? authCanEdit('navratri_aarti') : !isViewOnly);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tier1Max, setTier1Max] = useState(3000);
  const [tier1Increment, setTier1Increment] = useState(500);
  const [tier2Increment, setTier2Increment] = useState(250);
  const [isPublished, setIsPublished] = useState(false);
  const [showBidderNames, setShowBidderNames] = useState(true);
  const [dailyCutoffTime, setDailyCutoffTime] = useState('21:45');
  const [applyCutoffToDays, setApplyCutoffToDays] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [togglingNames, setTogglingNames] = useState(false);
  const [togglingPublished, setTogglingPublished] = useState(false);

  // Edit Day & Sponsor Lock Modal State
  const [editDayModal, setEditDayModal] = useState(null);
  const [editEventDate, setEditEventDate] = useState('');
  const [editDayTitle, setEditDayTitle] = useState('');
  const [editBaseBid, setEditBaseBid] = useState(500);
  const [editIsMaha, setEditIsMaha] = useState(false);
  const [editDayCutoffTime, setEditDayCutoffTime] = useState('21:45');
  const [editIsLocked, setEditIsLocked] = useState(false);
  const [editLockedName, setEditLockedName] = useState('');
  const [editLockedAmount, setEditLockedAmount] = useState('');
  const [editLockedPhone, setEditLockedPhone] = useState('');
  const [editLockedEmail, setEditLockedEmail] = useState('');
  const [editLockedPayStatus, setEditLockedPayStatus] = useState('pending');
  const [editLockedPayMethod, setEditLockedPayMethod] = useState('cash');
  const [editLockedNotes, setEditLockedNotes] = useState('');
  const [savingEditDay, setSavingEditDay] = useState(false);

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
          setShowBidderNames(json.settings.show_bidder_names !== false);
          setDailyCutoffTime(json.settings.daily_cutoff_time || '21:45');
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

  // Quick 1-click toggle for public bidder names
  const handleToggleBidderNames = async () => {
    const nextVal = !showBidderNames;
    setShowBidderNames(nextVal);
    try {
      setTogglingNames(true);
      const res = await fetch('/api/navratri/aarti/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_bidder_names: nextVal,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setShowBidderNames(!nextVal); // revert
        alert(json.error || 'Failed to update setting');
      } else {
        await fetchData();
      }
    } catch {
      setShowBidderNames(!nextVal);
      alert('Network error updating setting');
    } finally {
      setTogglingNames(false);
    }
  };

  // Quick 1-click toggle for Dashboard Display (Public Landing Tile)
  const handleTogglePublished = async () => {
    const nextVal = !isPublished;
    setIsPublished(nextVal);
    try {
      setTogglingPublished(true);
      const res = await fetch('/api/navratri/aarti/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_published: nextVal,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setIsPublished(!nextVal); // revert
        alert(json.error || 'Failed to update dashboard visibility');
      } else {
        await fetchData();
      }
    } catch {
      setIsPublished(!nextVal);
      alert('Network error updating dashboard visibility');
    } finally {
      setTogglingPublished(false);
    }
  };

  // Open Edit Day & Sponsor Lock Modal
  const openEditDayModal = (day) => {
    setEditDayModal(day);
    setEditEventDate(day.event_date || '');
    setEditDayTitle(day.day_title || '');
    setEditBaseBid(day.base_bid || 500);
    setEditIsMaha(Boolean(day.is_maha_aarti));
    setEditIsLocked(Boolean(day.is_locked));
    setEditLockedName(day.locked_sponsor_name || day.current_winner_name || '');
    setEditLockedAmount(day.locked_sponsor_amount || day.current_highest_bid || day.base_bid || 500);
    setEditLockedPhone(day.locked_sponsor_phone || day.current_winner_phone || '');
    setEditLockedEmail(day.locked_sponsor_email || day.current_winner_email || '');
    setEditLockedPayStatus(day.payment_status || 'pending');
    setEditLockedPayMethod(day.payment_method || 'cash');
    setEditLockedNotes(day.locked_notes || '');

    // Extract HH:MM cutoff time
    let cutoffHHMM = '21:45';
    if (day.cutoff_time) {
      try {
        const d = new Date(day.cutoff_time);
        const hours = d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit' }).padStart(2, '0');
        const mins = d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', minute: '2-digit' }).padStart(2, '0');
        cutoffHHMM = `${hours}:${mins}`;
      } catch {}
    }
    setEditDayCutoffTime(cutoffHHMM);
  };

  // Save Day Edits & Sponsor Lock
  const handleSaveEditDay = async (e) => {
    e.preventDefault();
    if (!editDayModal) return;
    try {
      setSavingEditDay(true);
      const res = await fetch('/api/navratri/aarti/admin/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_number: editDayModal.day_number,
          event_date: editEventDate,
          day_title: editDayTitle,
          base_bid: Number(editBaseBid),
          is_maha_aarti: editIsMaha,
          is_locked: editIsLocked,
          locked_sponsor_name: editLockedName,
          locked_sponsor_amount: editLockedAmount ? Number(editLockedAmount) : Number(editBaseBid),
          locked_sponsor_phone: editLockedPhone,
          locked_sponsor_email: editLockedEmail,
          payment_status: editLockedPayStatus,
          payment_method: editLockedPayMethod,
          locked_notes: editLockedNotes,
          cutoff_time: editDayCutoffTime ? `${editEventDate}T${editDayCutoffTime}:00-04:00` : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to update day configuration');
      } else {
        setEditDayModal(null);
        await fetchData();
      }
    } catch {
      alert('Network error updating day configuration');
    } finally {
      setSavingEditDay(false);
    }
  };

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
      const hasWinnerOrLock = (day.bids_count > 0 && day.current_winner_name) || day.is_locked;
      if (hasWinnerOrLock) {
        const amt = Number(day.current_highest_bid || day.locked_sponsor_amount || 0);
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
          show_bidder_names: showBidderNames,
          daily_cutoff_time: dailyCutoffTime,
          apply_to_open_days: applyCutoffToDays,
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

  // Executive Master PDF Report Export with Universal Native Share & Print Modal
  const handleExportPDF = async () => {
    if (!data?.days || data.days.length === 0) {
      alert('No festival days available to generate report.');
      return;
    }

    try {
      // Landscape A4 orientation for full multi-column festival reconciliation
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const now = new Date();
      // Rule 1: Strict MM-DD-YYYY date format
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const yyyy = now.getFullYear();
      const dateStr = `${mm}-${dd}-${yyyy}`;
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      // ── 1. Top Organization & Branding Header ──
      doc.setFillColor(232, 120, 12); // HCC Saffron Accent Bar
      doc.rect(14, 10, 3.5, 15, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(232, 120, 12);
      doc.text('HINDU COMMUNITY CENTER OF KNOXVILLE (HCC)', 21, 15);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Navratri 2026 — Daily Maha Aarti Master Festival Roster & Reconciliation', 21, 21);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Report Date: ${dateStr} at ${timeStr} EST   |   Official Mandir Board & Puja Committee Document`, 21, 26);

      // Executive KPI Summary Ribbon Strip
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 29, 269, 7.5, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, 29, 269, 7.5, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `Total Pledged: $${stats.pledged.toLocaleString()}      •      Collected: $${stats.paid.toLocaleString()}      •      Pending Collection: $${stats.pending.toLocaleString()}      •      Verified Bids: ${stats.bidsCount}      •      Festival Duration: 10 Days`,
        20,
        34
      );

      // ── 2. Table Rows Construction ──
      const tableRows = data.days.map((day) => {
        let themeTitle = day.day_title || '';
        if (day.is_maha_aarti && !themeTitle.toLowerCase().includes('maha aarti')) {
          themeTitle += ' (Maha Aarti)';
        }

        const isLocked = Boolean(day.is_locked);
        let sponsorName = '— Open (No Bids) —';
        if (isLocked) {
          sponsorName = `[LOCKED] ${day.locked_sponsor_name || day.current_winner_name || 'Sponsor'}`;
        } else if (day.bids_count > 0 && day.current_winner_name) {
          sponsorName = day.current_winner_name;
        }

        const phone = day.locked_sponsor_phone || day.current_winner_phone || '';
        const email = day.locked_sponsor_email || day.current_winner_email || '';
        let contact = '—';
        if (phone && email) {
          contact = `${phone}\n${email}`;
        } else if (phone) {
          contact = phone;
        } else if (email) {
          contact = email;
        }

        const bids = isLocked ? 'Lock' : `${day.bids_count || 0}`;
        const amt = (day.bids_count > 0 || isLocked)
          ? Number(day.current_highest_bid || day.locked_sponsor_amount || 0)
          : 0;
        const amountStr = amt > 0 ? `$${amt.toLocaleString()}` : '$0';

        let payStatusDisplay = '—';
        if (amt > 0) {
          payStatusDisplay = (day.payment_status || 'pending').toUpperCase();
        }

        let payDetails = '—';
        if (day.payment_status === 'paid') {
          const m = (day.payment_method || '').toUpperCase();
          const col = day.payment_collector || '';
          const ref = day.payment_ref || '';
          const parts = [];
          if (m) parts.push(m);
          if (col) parts.push(`By: ${col}`);
          if (ref) parts.push(`Ref: ${ref}`);
          payDetails = parts.join(' | ') || 'PAID';
        } else if (day.payment_status === 'waived') {
          payDetails = 'WAIVED SEVA';
        } else if (amt > 0) {
          payDetails = 'Awaiting payment at event';
        }

        const isClosed = day.status === 'closed' || day.is_past_cutoff;
        let statusBadge = isClosed ? 'CLOSED' : 'ACTIVE';
        const rawNote = (day.locked_notes || day.admin_notes || '').replace(/\s+/g, ' ').trim();
        let noteText = statusBadge;
        if (rawNote) {
          const compactNote = rawNote.length > 35 ? rawNote.substring(0, 32) + '...' : rawNote;
          noteText = `${statusBadge}: ${compactNote}`;
        }

        return [
          `Day ${day.day_number}`,
          day.formatted_date || '',
          themeTitle,
          sponsorName,
          contact,
          bids,
          amountStr,
          payStatusDisplay,
          payDetails,
          noteText,
        ];
      });

      // ── 3. Summary Footer Row ──
      const footerRow = [
        'TOTAL',
        '10 Days',
        'Master Festival Reconciliation',
        '',
        '',
        `${stats.bidsCount}`,
        `$${stats.pledged.toLocaleString()}`,
        stats.paid > 0 ? 'PAID' : 'DUE',
        `Collected: $${stats.paid.toLocaleString()}`,
        `Due: $${stats.pending.toLocaleString()}`,
      ];

      // ── 4. Render Table with autoTable ──
      autoTable(doc, {
        startY: 38.5,
        head: [[
          'Day',
          'Date',
          'Festival Day & Sacred Theme',
          'Winning Devotee / Sponsor',
          'Contact Info',
          'Bids',
          'Pledged',
          'Status',
          'Payment / Collector',
          'Notes / Remarks',
        ]],
        body: tableRows,
        foot: [footerRow],
        theme: 'striped',
        headStyles: {
          fillColor: [232, 120, 12],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
        },
        styles: {
          fontSize: 7.2,
          cellPadding: 2,
          valign: 'middle',
          textColor: [30, 41, 59],
          overflow: 'linebreak',
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 44 },
          3: { cellWidth: 40, fontStyle: 'bold' },
          4: { cellWidth: 36, fontSize: 6.8 },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 18, halign: 'center' },
          8: { cellWidth: 35, fontSize: 6.8 },
          9: { cellWidth: 30, fontSize: 6.8 },
        },
        alternateRowStyles: {
          fillColor: [250, 250, 252],
        },
        margin: { top: 38.5, bottom: 12, left: 14, right: 14 },
        didParseCell: (hookData) => {
          if (hookData.section === 'body' && hookData.column.index === 7) {
            const val = String(hookData.cell.raw || '').toUpperCase();
            if (val === 'PAID') {
              hookData.cell.styles.textColor = [16, 185, 129];
              hookData.cell.styles.fontStyle = 'bold';
            } else if (val === 'PENDING') {
              hookData.cell.styles.textColor = [217, 119, 6];
              hookData.cell.styles.fontStyle = 'bold';
            } else if (val === 'WAIVED') {
              hookData.cell.styles.textColor = [100, 116, 139];
            }
          }
        },
        didDrawPage: (hookData) => {
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height || pageSize.getHeight();
          const pageWidth = pageSize.width || pageSize.getWidth();

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(14, pageHeight - 9, pageWidth - 14, pageHeight - 9);

          doc.setFontSize(7);
          doc.setTextColor(140);
          doc.text(
            'Hindu Community Center of Knoxville (HCC) · Navratri 2026 Daily Maha Aarti Roster & Reconciliation',
            14,
            pageHeight - 5
          );
          doc.text(
            `Page ${hookData.pageNumber} of ${doc.internal.getNumberOfPages()} · Confidential Mandir Board Document`,
            pageWidth - 14,
            pageHeight - 5,
            { align: 'right' }
          );
        },
      });

      // ── 5. Open Universal Review & Native Share Modal ──
      const filename = `Navratri_Maha_Aarti_Roster_${dateStr}.pdf`;
      await exportPdfWithNativeShare(doc, filename);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF report: ' + (err?.message || err));
    }
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
              Daily Maha Aarti Management
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

            <Link
              href="/navratri-aarti/display"
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, rgba(232, 120, 12, 0.12) 0%, rgba(232, 120, 12, 0.04) 100%)',
                border: '1px solid rgba(232, 120, 12, 0.35)',
                color: 'var(--accent, #E8780C)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: '700',
                textDecoration: 'none',
                boxShadow: 'var(--shadow)',
              }}
              title="Launch Live Stage / TV Screen with QR Code"
            >
              {Icons.external} Live Stage / TV View
            </Link>

            {/* Quick 1-Click Toggle for Dashboard Display (Public Landing Tile) */}
            <button
              onClick={handleTogglePublished}
              disabled={togglingPublished}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: isPublished ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                border: isPublished ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(100, 116, 139, 0.3)',
                color: isPublished ? '#059669' : '#64748B',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: togglingPublished ? 'wait' : 'pointer',
                boxShadow: 'var(--shadow)',
                transition: 'all 0.2s ease',
              }}
              title="Click to toggle whether the Navratri Maha Aarti tile appears on the main public dashboard (dashboard.knoxvillemandir.org)"
            >
              {isPublished ? Icons.globe : Icons.globeOff}
              <span>{isPublished ? 'Dashboard: Visible (Live)' : 'Dashboard: Hidden'}</span>
            </button>

            {/* Quick 1-Click Toggle for Public Bidder Names */}
            <button
              onClick={handleToggleBidderNames}
              disabled={togglingNames}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: showBidderNames ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: showBidderNames ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)',
                color: showBidderNames ? '#059669' : '#DC2626',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: togglingNames ? 'wait' : 'pointer',
                boxShadow: 'var(--shadow)',
                transition: 'all 0.2s ease',
              }}
              title="Click to toggle whether bidder names are publicly displayed or masked on the TV screen and website"
            >
              {showBidderNames ? Icons.eye : Icons.eyeOff}
              <span>{showBidderNames ? 'Public Names: Shown' : 'Public Names: Hidden'}</span>
            </button>

            {canEdit && (
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
            )}
          </div>
        </div>

        {/* View Only Mode Banner */}
        {isViewOnly && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 18px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            fontWeight: '600',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <strong>View-Only Access Mode:</strong> You can inspect daily bids, search winners, view bid histories, and export official PDF & CSV reports. Modifying bids, updating settings, changing payment status, and locking days are disabled.
            </div>
          </div>
        )}

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
              Total Pledged Maha Aarti
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
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #86868B)', marginLeft: '8px' }}>
                Daily {(() => {
                  try {
                    const [hStr, mStr] = dailyCutoffTime.split(':');
                    const h = parseInt(hStr, 10);
                    const m = parseInt(mStr, 10);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 === 0 ? 12 : h % 12;
                    return `${h12}:${isNaN(m) ? '00' : m.toString().padStart(2, '0')} ${ampm}`;
                  } catch {
                    return '9:45 PM';
                  }
                })()} EST cutoff
              </span>
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
                onClick={handleExportPDF}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, rgba(232, 120, 12, 0.12) 0%, rgba(232, 120, 12, 0.05) 100%)',
                  border: '1px solid rgba(232, 120, 12, 0.35)',
                  color: 'var(--accent, #E8780C)',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow)',
                  transition: 'all 0.2s ease',
                }}
                title="Generate and review executive Master Maha Aarti PDF Roster & Reconciliation report"
              >
                {Icons.pdf} PDF Roster Report
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
                    const hasWinnerOrLock = hasWinner || day.is_locked;

                    return (
                      <tr
                        key={day.day_number}
                        id={`admin-day-row-${day.day_number}`}
                        style={{
                          borderBottom: '1px solid var(--border-table, rgba(0,0,0,0.06))',
                          background: day.is_locked
                            ? 'rgba(232, 120, 12, 0.05)'
                            : day.is_maha_aarti
                            ? 'rgba(232, 120, 12, 0.03)'
                            : 'transparent',
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
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '3px' }}>
                            {day.is_maha_aarti && (
                              <span style={{ fontSize: '10.5px', color: 'var(--accent, #E8780C)', fontWeight: '700' }}>
                                ★ Maha Aarti (Aatham)
                              </span>
                            )}
                            {day.base_bid && Number(day.base_bid) !== 500 && (
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #86868B)', fontWeight: '600' }}>
                                Reserve: ${Number(day.base_bid).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Winner */}
                        <td style={{ padding: '12px 16px' }}>
                          {day.is_locked ? (
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--accent, #E8780C)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {Icons.lock} {day.locked_sponsor_name || day.current_winner_name || 'Devotee Sponsor'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary, #515154)' }}>
                                {day.locked_sponsor_phone ? `${day.locked_sponsor_phone} · ` : ''}Manual Sponsor Lock
                              </div>
                            </div>
                          ) : hasWinner ? (
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
                          <div style={{ fontWeight: '800', color: hasWinnerOrLock ? 'var(--accent, #E8780C)' : 'var(--text-secondary, #515154)' }}>
                            ${day.current_highest_bid?.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)' }}>
                            {day.is_locked ? 'Pledged Sponsor' : `${day.bids_count} ${day.bids_count === 1 ? 'bid' : 'bids'}`}
                          </div>
                        </td>

                        {/* Cutoff Status */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {day.is_locked ? (
                            <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', background: 'rgba(232, 120, 12, 0.12)', color: 'var(--accent, #E8780C)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              {Icons.lock} Reserved
                            </span>
                          ) : isClosed ? (
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
                          {hasWinnerOrLock ? (
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
                            {/* Edit Day & Sponsor Lock Action Button */}
                            {canEdit && (
                            <button
                              onClick={() => openEditDayModal(day)}
                              title="Edit Day Date, Title, Starting Bid & Sponsor Lock"
                              style={{
                                background: day.is_locked ? 'rgba(232, 120, 12, 0.12)' : 'var(--bg-input, #F2F2F5)',
                                border: day.is_locked ? '1px solid rgba(232, 120, 12, 0.35)' : '1px solid var(--border)',
                                color: day.is_locked ? 'var(--accent, #E8780C)' : 'var(--text-primary)',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {day.is_locked ? Icons.lock : Icons.edit}
                              <span>{day.is_locked ? 'Locked' : 'Edit & Lock'}</span>
                            </button>
                            )}

                            {canEdit && hasWinnerOrLock && (
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

                                {hasWinner && !day.is_locked && (
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
                                )}
                              </>
                            )}

                            {canEdit && (
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
                            )}

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
          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.1))', borderRadius: '18px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>Increments & Configuration</h3>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #515154)', marginTop: '2px' }}>
                  Daily Cutoff Time, Tier Limits & Visibility
                </div>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{Icons.close}</button>
            </div>

            <form onSubmit={handleSaveSettings}>
              {/* Daily Bidding End Time (Cutoff) */}
              <div style={{ marginBottom: '16px', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary, #1D1D1F)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent, #E8780C)' }}>{Icons.clock}</span>
                    Daily Bidding End Time (Cutoff)
                  </label>
                  <span style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--accent, #E8780C)', background: 'rgba(232, 120, 12, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                    {(() => {
                      try {
                        const [hStr, mStr] = dailyCutoffTime.split(':');
                        const h = parseInt(hStr, 10);
                        const m = parseInt(mStr, 10);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 === 0 ? 12 : h % 12;
                        return `${h12}:${isNaN(m) ? '00' : m.toString().padStart(2, '0')} ${ampm}`;
                      } catch {
                        return '9:45 PM';
                      }
                    })()} EST
                  </span>
                </div>

                <input
                  type="time"
                  required
                  value={dailyCutoffTime}
                  onChange={(e) => setDailyCutoffTime(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' }}
                />

                {/* Preset Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {[
                    { label: '9:30 PM', val: '21:30' },
                    { label: '9:45 PM', val: '21:45' },
                    { label: '10:00 PM', val: '22:00' },
                    { label: '10:15 PM', val: '22:15' },
                    { label: '10:30 PM', val: '22:30' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setDailyCutoffTime(preset.val)}
                      style={{
                        background: dailyCutoffTime === preset.val ? 'var(--accent, #E8780C)' : 'var(--bg-card, #FFFFFF)',
                        color: dailyCutoffTime === preset.val ? '#FFFFFF' : 'var(--text-secondary, #515154)',
                        border: dailyCutoffTime === preset.val ? '1px solid var(--accent, #E8780C)' : '1px solid var(--border)',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Checkbox to apply to all open days */}
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="applyCutoffDays"
                    checked={applyCutoffToDays}
                    onChange={(e) => setApplyCutoffToDays(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent, #E8780C)', cursor: 'pointer' }}
                  />
                  <label htmlFor="applyCutoffDays" style={{ fontSize: '11.5px', color: 'var(--text-secondary, #515154)', fontWeight: '600', cursor: 'pointer', lineHeight: 1.3 }}>
                    Apply new cutoff to all open festival days (updates countdowns on TV &amp; website)
                  </label>
                </div>
              </div>
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

              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--bg-input, #F2F2F5)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  id="showNamesCheck"
                  checked={showBidderNames}
                  onChange={(e) => setShowBidderNames(e.target.checked)}
                  style={{ width: '17px', height: '17px', accentColor: 'var(--accent, #E8780C)', marginTop: '2px' }}
                />
                <div>
                  <label htmlFor="showNamesCheck" style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary, #1D1D1F)', fontWeight: '700', cursor: 'pointer' }}>
                    Show Bidder Names on Public Links & TV
                  </label>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #6E6E73)', marginTop: '2px', lineHeight: 1.35 }}>
                    When unchecked, winning names are masked as &ldquo;Devotee Sponsor&rdquo; on the public portal and TV screen to protect devotee privacy.
                  </div>
                </div>
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

      {/* ── EDIT DAY & SPONSOR LOCK MODAL ─────────────────────────────── */}
      {editDayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, rgba(0,0,0,0.1))', borderRadius: '20px', maxWidth: '480px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '24px', boxShadow: '0 24px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent, #E8780C)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Festival Schedule & Sponsorship Lock
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>
                  Configure Day {editDayModal.day_number}
                </h3>
              </div>
              <button onClick={() => setEditDayModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{Icons.close}</button>
            </div>

            <form onSubmit={handleSaveEditDay}>
              {/* Event Date (Strict MM-DD-YYYY preview) */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>
                  Event Date (Displays as MM-DD-YYYY)
                </label>
                <input
                  type="date"
                  required
                  value={editEventDate}
                  onChange={(e) => setEditEventDate(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}
                />
                {editEventDate && (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #86868B)', marginTop: '3px' }}>
                    Standard Display: <strong>{(() => { const [y, m, d] = editEventDate.split('-'); return `${m}-${d}-${y}`; })()}</strong>
                  </div>
                )}
              </div>

              {/* Day Cutoff Time (Bidding End Time) */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary, #515154)' }}>
                    Bidding End Time (Cutoff)
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent, #E8780C)' }}>
                    {(() => {
                      try {
                        const [hStr, mStr] = editDayCutoffTime.split(':');
                        const h = parseInt(hStr, 10);
                        const m = parseInt(mStr, 10);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 === 0 ? 12 : h % 12;
                        return `${h12}:${isNaN(m) ? '00' : m.toString().padStart(2, '0')} ${ampm}`;
                      } catch {
                        return '9:45 PM';
                      }
                    })()} EST
                  </span>
                </div>
                <input
                  type="time"
                  required
                  value={editDayCutoffTime}
                  onChange={(e) => setEditDayCutoffTime(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}
                />
              </div>

              {/* Day Title / Description */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>
                  Day Title & Sacred Theme
                </label>
                <input
                  type="text"
                  required
                  value={editDayTitle}
                  onChange={(e) => setEditDayTitle(e.target.value)}
                  placeholder="e.g. Day 1 — Ghatasthapana (Prathama)"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13.5px' }}
                />
              </div>

              {/* Base Opening Bid */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>
                  Starting Reserve Bid ($)
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={editBaseBid}
                  onChange={(e) => setEditBaseBid(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700' }}
                />
              </div>

              {/* Maha Aarti Toggle */}
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isMahaCheck"
                  checked={editIsMaha}
                  onChange={(e) => setEditIsMaha(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent, #E8780C)' }}
                />
                <label htmlFor="isMahaCheck" style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}>
                  Mark as Maha Aarti (Special High-Priority Gold Styling)
                </label>
              </div>

              {/* Lock Bid / Manual Sponsor Card */}
              <div style={{ background: editIsLocked ? 'rgba(232, 120, 12, 0.08)' : 'var(--bg-input, #F2F2F5)', border: editIsLocked ? '1.5px solid var(--accent, #E8780C)' : '1px solid var(--border)', borderRadius: '14px', padding: '14px', marginBottom: '18px', transition: 'all 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editIsLocked ? '12px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="lockCheck"
                      checked={editIsLocked}
                      onChange={(e) => setEditIsLocked(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent, #E8780C)', cursor: 'pointer' }}
                    />
                    <div>
                      <label htmlFor="lockCheck" style={{ fontSize: '13.5px', fontWeight: '800', color: editIsLocked ? 'var(--accent, #E8780C)' : 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {Icons.lock} Lock Bidding & Assign Sponsor
                      </label>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary, #6E6E73)', marginTop: '2px' }}>
                        {editIsLocked ? 'Bidding is locked. Only the designated sponsor below will be registered.' : 'When locked, public bidding is disabled and prior bids are archived.'}
                      </div>
                    </div>
                  </div>
                </div>

                {editIsLocked && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(232, 120, 12, 0.2)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Sponsor Devotee Name (Required)
                      </label>
                      <input
                        type="text"
                        required={editIsLocked}
                        value={editLockedName}
                        onChange={(e) => setEditLockedName(e.target.value)}
                        placeholder="e.g. Ramesh & Suman Patel"
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          Pledge Amount ($)
                        </label>
                        <input
                          type="number"
                          min="1"
                          required={editIsLocked}
                          value={editLockedAmount}
                          onChange={(e) => setEditLockedAmount(e.target.value)}
                          placeholder="500"
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          Payment Status
                        </label>
                        <select
                          value={editLockedPayStatus}
                          onChange={(e) => setEditLockedPayStatus(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: 'var(--text-primary)' }}
                        >
                          <option value="pending">Pending Collection</option>
                          <option value="paid">Paid & Confirmed</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          Phone (Private)
                        </label>
                        <input
                          type="tel"
                          value={editLockedPhone}
                          onChange={(e) => setEditLockedPhone(e.target.value)}
                          placeholder="(865) 555-0199"
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontSize: '12.5px', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          Payment Method
                        </label>
                        <select
                          value={editLockedPayMethod}
                          onChange={(e) => setEditLockedPayMethod(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontSize: '12.5px', color: 'var(--text-primary)' }}
                        >
                          <option value="cash">Cash</option>
                          <option value="check">Check</option>
                          <option value="card_pos">Card POS Swipe</option>
                          <option value="zelle">Zelle / Online</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Email (Private)
                      </label>
                      <input
                        type="email"
                        value={editLockedEmail}
                        onChange={(e) => setEditLockedEmail(e.target.value)}
                        placeholder="sponsor@example.com"
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontSize: '12.5px', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Admin Notes
                      </label>
                      <input
                        type="text"
                        value={editLockedNotes}
                        onChange={(e) => setEditLockedNotes(e.target.value)}
                        placeholder="e.g. VIP sponsor confirmed at temple committee meeting"
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontSize: '12.5px', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditDayModal(null)}
                  style={{ flex: 1, background: 'var(--bg-input, #F2F2F5)', border: '1px solid var(--border)', borderRadius: '10px', padding: '11px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditDay}
                  style={{ flex: 1.6, background: 'var(--accent, #E8780C)', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '13.5px', fontWeight: '700', color: '#FFFFFF', cursor: savingEditDay ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow)' }}
                >
                  {savingEditDay ? 'Saving Changes...' : 'Save Configuration ✓'}
                </button>
              </div>
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
