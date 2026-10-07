/**
 * pdfShareHelper.js
 * Universal PDF Review, Desktop Save As, and Mobile Share Manager.
 *
 * Workflow:
 * 1. Opens an in-app PDF Review Modal showing the rendered report first.
 * 2. On iPhone / iOS & Android: Users review the report, then tap "Share to Any App"
 *    to open the native iOS Share Sheet with the PDF file attached (WhatsApp, Messages, Mail, AirDrop, etc.).
 * 3. On Desktop (Chrome/Edge): Users review the report, then tap "Save to Desktop" which triggers
 *    the Windows native "Save As" file picker (window.showSaveFilePicker) allowing them to pick
 *    the Desktop folder directly.
 * 4. Supports 1-click Print and Fullscreen view in browser tab.
 */

/**
 * Saves a PDF blob directly to the user's chosen folder (Desktop) on modern desktop browsers,
 * or downloads via standard link fallback.
 */
export async function savePdfToDesktop(blob, filename) {
  if (!filename) filename = `report-${new Date().toISOString().split('T')[0]}.pdf`;
  if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

  // 1. Modern Desktop Chrome / Edge / Brave: Native "Save As" dialog (lets user select Desktop)
  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'PDF Document (*.pdf)',
            accept: { 'application/pdf': ['.pdf'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { success: true, method: 'file_picker' };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }
      console.warn('Native SaveFilePicker failed, falling back to standard download:', err);
    }
  }

  // 2. Fallback: Standard browser download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { success: true, method: 'download' };
}

/**
 * Shares a PDF file using the native Mobile Web Share API with file attachment.
 */
export async function sharePdfFile(file, filename) {
  if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename.replace(/\.pdf$/i, ''),
        });
        return { success: true, method: 'share' };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }
      console.warn('Navigator share error:', err);
    }
  }
  return { success: false, method: 'unsupported' };
}

/**
 * Opens an in-app executive Review & Share modal for the generated PDF.
 * This is the primary function invoked across all dashboard reports.
 */
export async function exportPdfWithNativeShare(doc, filename) {
  if (!doc) throw new Error('No PDF document provided');
  if (!filename) filename = `report-${new Date().toISOString().split('T')[0]}.pdf`;
  if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob = doc instanceof Blob ? doc : doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const fileSizeKb = Math.max(1, Math.round(blob.size / 1024));

  // Remove existing modal if already open
  const existing = document.getElementById('hcc-pdf-preview-modal-root');
  if (existing) {
    try { document.body.removeChild(existing); } catch (_) {}
  }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  // Create Modal Root
  const modalRoot = document.createElement('div');
  modalRoot.id = 'hcc-pdf-preview-modal-root';
  modalRoot.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${isMobile ? '8px' : '20px'};
    box-sizing: border-box;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #F8FAFC;
    animation: hccFadeIn 0.2s ease-out;
  `;

  const keyframeStyle = document.createElement('style');
  keyframeStyle.textContent = `
    @keyframes hccFadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    @keyframes hccToastIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  `;
  modalRoot.appendChild(keyframeStyle);

  // Modal Container Card
  const card = document.createElement('div');
  card.style.cssText = `
    width: 100%;
    max-width: 960px;
    height: ${isMobile ? '96vh' : '90vh'};
    max-height: 96vh;
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.75);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  // ── Header Bar ─────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 14px 18px;
    background: #1E293B;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    flex-wrap: wrap;
  `;

  const headerLeft = document.createElement('div');
  headerLeft.style.cssText = 'display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;';
  headerLeft.innerHTML = `
    <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(2, 132, 199, 0.15); border: 1px solid rgba(2, 132, 199, 0.35); display: flex; align-items: center; justify-content: center; color: #38BDF8; flex-shrink: 0;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
    </div>
    <div style="min-width: 0;">
      <div style="font-weight: 800; font-size: 14px; color: #F8FAFC; letter-spacing: -0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        Review Report: <span style="color: #38BDF8;">${filename}</span>
      </div>
      <div style="font-size: 11px; color: #94A3B8; margin-top: 1px;">
        Size: ${fileSizeKb} KB &nbsp;·&nbsp; Knoxville Hindu Community Center
      </div>
    </div>
  `;

  const headerRight = document.createElement('div');
  headerRight.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0;';

  // Fullscreen / Native Tab button
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.title = 'Open full-page in new browser tab';
  fullscreenBtn.style.cssText = `
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
    color: #E2E8F0;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  `;
  fullscreenBtn.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    <span>${isMobile ? 'Full View' : 'New Tab'}</span>
  `;
  fullscreenBtn.onclick = () => window.open(blobUrl, '_blank');

  // Close Button
  const closeBtn = document.createElement('button');
  closeBtn.title = 'Close Review';
  closeBtn.style.cssText = `
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
    color: #94A3B8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `;
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  headerRight.appendChild(fullscreenBtn);
  headerRight.appendChild(closeBtn);
  header.appendChild(headerLeft);
  header.appendChild(headerRight);

  // ── Body: High performance PDF Viewer ──────────────────────────────────────
  const body = document.createElement('div');
  body.style.cssText = `
    flex: 1;
    min-height: 0;
    background: #020617;
    position: relative;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    overflow: hidden;
  `;

  const iframe = document.createElement('iframe');
  iframe.src = `${blobUrl}#toolbar=0&navpanes=0&view=FitH`;
  iframe.title = filename;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: #FFFFFF;
    -webkit-overflow-scrolling: touch;
  `;
  body.appendChild(iframe);

  // ── Footer Action Bar ──────────────────────────────────────────────────────
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 14px 18px;
    background: #1E293B;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    flex-wrap: wrap;
  `;

  const footerLeft = document.createElement('div');
  footerLeft.style.cssText = 'font-size: 12px; color: #94A3B8; display: flex; align-items: center; gap: 8px; flex: 1; min-width: 160px;';
  footerLeft.innerHTML = `
    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
    <span>Review report details before sharing or saving.</span>
  `;

  const footerActions = document.createElement('div');
  footerActions.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap;';

  // 1. Share Button (Highlighted for iPhone / Mobile)
  const shareBtn = document.createElement('button');
  shareBtn.style.cssText = `
    padding: 10px 18px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #10B981, #059669);
    color: #FFFFFF;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    transition: all 0.2s;
  `;
  shareBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    <span>Share to Any App</span>
  `;
  shareBtn.onclick = async () => {
    if (canNativeShare) {
      await sharePdfFile(file, filename);
    } else {
      // Desktop fallback: save first, then notify
      await savePdfToDesktop(blob, filename);
      showToast('PDF downloaded! You can now attach or share it in any app.');
    }
  };

  // 2. Save to Desktop / Download Button
  const saveBtn = document.createElement('button');
  saveBtn.style.cssText = `
    padding: 10px 18px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #0284C7, #0369A1);
    color: #FFFFFF;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    transition: all 0.2s;
  `;
  saveBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    <span>${isMobile ? 'Save to Files' : 'Save to Desktop'}</span>
  `;
  saveBtn.onclick = async () => {
    const res = await savePdfToDesktop(blob, filename);
    if (res.success) {
      showToast('✓ PDF saved successfully!');
    }
  };

  // 3. Print Button
  const printBtn = document.createElement('button');
  printBtn.style.cssText = `
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
    color: #E2E8F0;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  `;
  printBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    <span>Print</span>
  `;
  printBtn.onclick = () => {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.print();
        return;
      }
    } catch (_) {}
    window.open(blobUrl, '_blank')?.print();
  };

  // Toast feedback container
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: absolute;
    bottom: 74px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    background: #10B981;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 700;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: none;
    z-index: 10;
    animation: hccToastIn 0.2s ease-out;
  `;
  card.appendChild(toast);

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2600);
  }

  footerActions.appendChild(printBtn);
  footerActions.appendChild(saveBtn);
  footerActions.appendChild(shareBtn);
  footer.appendChild(footerLeft);
  footer.appendChild(footerActions);

  // Assemble Card
  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(footer);
  modalRoot.appendChild(card);

  // Close Handler
  const handleClose = () => {
    try {
      document.removeEventListener('keydown', handleKeyDown);
      if (modalRoot.parentNode) {
        modalRoot.parentNode.removeChild(modalRoot);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (_) {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') handleClose();
  };

  closeBtn.onclick = handleClose;
  modalRoot.onclick = (e) => {
    if (e.target === modalRoot) handleClose();
  };
  document.addEventListener('keydown', handleKeyDown);

  document.body.appendChild(modalRoot);
  return { success: true, method: 'preview_opened' };
}
