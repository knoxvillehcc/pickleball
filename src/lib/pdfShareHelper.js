/**
 * pdfShareHelper.js
 * Utility to export jsPDF documents with native mobile file sharing support.
 * On iPhone / iOS Safari and Android devices supporting Web Share API files,
 * it opens the native Share Sheet with the ACTUAL PDF file attached (iMessage, Mail, WhatsApp, AirDrop, Save to Files).
 * On desktop browsers, it cleanly falls back to standard doc.save() download.
 */

export async function exportPdfWithNativeShare(doc, filename) {
  if (!doc) throw new Error('No PDF document provided');
  if (!filename) filename = `document-${new Date().toISOString().split('T')[0]}.pdf`;
  if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

  try {
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });

    // Check if the device browser supports Web Share API with files (iOS Safari 15+, Android Chrome)
    if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
      try {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename.replace(/\.pdf$/i, ''),
          });
          return { success: true, method: 'share' };
        }
      } catch (shareErr) {
        // If user cancelled / dismissed the iOS share sheet, don't trigger download
        if (shareErr.name === 'AbortError') {
          return { success: true, method: 'cancelled' };
        }
        console.warn('Native share failed, falling back to download:', shareErr);
      }
    }

    // Fallback: standard doc.save() download for desktop or unsupported browsers
    doc.save(filename);
    return { success: true, method: 'save' };
  } catch (err) {
    console.error('Error exporting PDF:', err);
    // Last resort fallback
    try {
      doc.save(filename);
      return { success: true, method: 'save_fallback' };
    } catch (saveErr) {
      throw new Error(err.message || 'Failed to export PDF');
    }
  }
}
