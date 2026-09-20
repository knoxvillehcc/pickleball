'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/ClientLayout';

function UploadInner() {
  const { isDark } = useTheme();
  const params = useSearchParams();
  const token = params.get('token');

  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const fetchRegistration = useCallback(async () => {
    if (!token) { setError('Missing upload token. Please use the link from your confirmation email.'); setLoading(false); return; }
    try {
      const res = await fetch(`/api/led-ads/upload?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRegistration(data.registration);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRegistration(); }, [fetchRegistration]);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10 MB.');
      return;
    }
    setError('');
    setSelectedFile(file);

    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setPreview('video');
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !token) return;
    setUploading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('file', selectedFile);

      const res = await fetch('/api/led-ads/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setUploadSuccess(true);
      fetchRegistration(); // refresh to show uploaded media
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  // Loading
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <p style={{ color: 'var(--text-secondary)' }}>Verifying your upload link...</p>
    </div>
  );

  // Error (invalid token, etc.)
  if (error && !registration) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Upload Link Invalid</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{error}</p>
      </div>
    </div>
  );

  // Already uploaded — show success + re-upload option
  const hasMedia = registration?.media_url;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '560px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📺</div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Upload Your Ad Media
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Navratri 2026 — LED Screen Advertisement
          </p>
        </div>

        {/* Registration info card */}
        <div style={{
          padding: '20px', borderRadius: '16px', marginBottom: '24px',
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>REGISTRATION</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#FF9933' }}>{registration.registration_number}</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{registration.business_name}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{registration.contact_name}</div>
        </div>

        {/* Media requirement */}
        <div style={{
          padding: '14px 18px', borderRadius: '12px', marginBottom: '24px',
          background: isDark ? 'rgba(255,153,51,0.06)' : '#FFF8F0',
          border: '1px solid rgba(255,153,51,0.2)',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#FF9933', marginBottom: '4px' }}>📐 MEDIA REQUIREMENT</div>
          <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>1080 × 1920 pixels (portrait, high resolution)</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Max file size: 10 MB · Any file type accepted</div>
        </div>

        {/* Already uploaded */}
        {hasMedia && !uploadSuccess && (
          <div style={{
            padding: '16px 20px', borderRadius: '12px', marginBottom: '20px',
            background: isDark ? 'rgba(34,197,94,0.06)' : '#F0FDF4',
            border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#22C55E', marginBottom: '6px' }}>✅ MEDIA ALREADY UPLOADED</div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{registration.media_filename}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Uploaded: {new Date(registration.media_uploaded_at).toLocaleString()}
            </div>
            {registration.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
              <img src={registration.media_url} alt="Uploaded ad" style={{ marginTop: '12px', maxWidth: '200px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            )}
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>You can upload a new file to replace the current one.</p>
          </div>
        )}

        {/* Upload success */}
        {uploadSuccess && (
          <div style={{
            padding: '24px', borderRadius: '16px', marginBottom: '20px', textAlign: 'center',
            background: isDark ? 'rgba(34,197,94,0.06)' : '#F0FDF4',
            border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Upload Successful!</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Your ad media has been received. Thank you!</div>
          </div>
        )}

        {/* Drop zone */}
        {!uploadSuccess && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
              style={{
                padding: '40px 24px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer',
                border: `2px dashed ${dragOver ? '#FF9933' : selectedFile ? '#22C55E' : 'var(--border)'}`,
                background: dragOver ? (isDark ? 'rgba(255,153,51,0.06)' : '#FFF8F0') : 'var(--bg-secondary)',
                transition: 'all 0.2s ease',
              }}
            >
              <input id="file-input" type="file" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />

              {selectedFile ? (
                <div>
                  {preview && preview !== 'video' && (
                    <img src={preview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '300px', borderRadius: '10px', marginBottom: '12px', border: '1px solid var(--border)' }} />
                  )}
                  {preview === 'video' && (
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎬</div>
                  )}
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to change
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📁</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Drop your file here or click to browse
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Max 10 MB · 1080×1920 recommended
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', marginTop: '12px' }}>
                ❌ {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', border: 'none', marginTop: '20px',
                background: selectedFile ? 'linear-gradient(135deg, #22C55E, #16A34A)' : '#ccc',
                color: 'white', fontWeight: '800', fontSize: '16px',
                cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed',
                opacity: uploading ? 0.6 : 1,
                boxShadow: selectedFile ? '0 4px 16px rgba(34,197,94,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {uploading ? '⏳ Uploading...' : hasMedia ? '🔄 Replace Media' : '📤 Upload Media'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LedAdsUploadPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <UploadInner />
    </Suspense>
  );
}
