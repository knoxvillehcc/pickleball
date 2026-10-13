'use client';
import { useState } from 'react';

// ── Crisp Inline SVG Icons (Lucide-style) ────────────────────────────────────
const DiyaIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2c.5 2 2 3.5 2 5.5 0 2.5-2 3.5-2 3.5s-2-1-2-3.5C10 5.5 11.5 4 12 2z" fill={color} fillOpacity="0.35" />
    <path d="M4 14c0 4 3.5 7 8 7s8-3 8-7c0-2-3-3-8-3s-8 1-8 3z" />
  </svg>
);

const LockIcon = ({ size = 11, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ChevronRightIcon = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default function AartiLiveTicker({
  days = [],
  mode = 'public', // 'public' | 'admin'
  onSelectDay = null,
}) {
  const [isPaused, setIsPaused] = useState(false);

  if (!days || days.length === 0) return null;

  // Seamless infinite loop: duplicate track
  const tickerItems = [...days, ...days];

  const handleDayClick = (day) => {
    if (onSelectDay) {
      onSelectDay(day);
      return;
    }

    const targetId = mode === 'admin'
      ? `admin-day-row-${day.day_number}`
      : `day-card-${day.day_number}`;

    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      const origShadow = el.style.boxShadow;
      const origBorder = el.style.borderColor;
      el.style.boxShadow = '0 0 0 4px rgba(232, 120, 12, 0.45)';
      el.style.borderColor = 'var(--accent, #E8780C)';
      setTimeout(() => {
        el.style.boxShadow = origShadow;
        el.style.borderColor = origBorder;
      }, 1800);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: 'var(--bg-card, rgba(255, 255, 255, 0.85))',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid var(--border, rgba(0,0,0,0.08))',
        borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        height: '46px',
        userSelect: 'none',
        zIndex: 20,
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif)",
      }}
      aria-label="Daily Maha Aarti Live Bidding Ticker"
    >
      <style>{`
        @keyframes aartiMarqueeScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .aarti-ticker-track {
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
          width: max-content;
          animation: aartiMarqueeScroll 48s linear infinite;
        }
        .aarti-ticker-track:hover {
          animation-play-state: paused;
        }
        .aarti-ticker-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 500;
          text-decoration: none;
          color: var(--text-primary, #1D1D1F);
          background: var(--bg-input, #F2F2F5);
          border: 1px solid var(--border, rgba(0,0,0,0.08));
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
        .aarti-ticker-pill:hover {
          background: var(--bg-card, #FFFFFF);
          border-color: var(--accent, #E8780C);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(232, 120, 12, 0.2);
        }
        .aarti-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
          animation: aartiPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes aartiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.2); }
        }
        @media (max-width: 640px) {
          .aarti-ticker-header-desktop { display: none !important; }
          .aarti-ticker-header-mobile { display: flex !important; }
          .aarti-ticker-track { animation-duration: 38s; }
        }
        @media (min-width: 641px) {
          .aarti-ticker-header-desktop { display: flex !important; }
          .aarti-ticker-header-mobile { display: none !important; }
        }
      `}</style>

      {/* Pinned Left Header Tag (Desktop) */}
      <div
        className="aarti-ticker-header-desktop"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          padding: '0 16px',
          height: '100%',
          background: 'var(--bg-card, #FFFFFF)',
          borderRight: '1px solid var(--border, rgba(0,0,0,0.08))',
          zIndex: 3,
          flexShrink: 0,
        }}
      >
        <span style={{ display: 'flex', color: 'var(--accent, #E8780C)' }}>
          <DiyaIcon size={16} color="var(--accent, #E8780C)" />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.6px', color: 'var(--accent, #E8780C)', textTransform: 'uppercase' }}>
            Maha Aarti
          </span>
          <span style={{ fontSize: '9.5px', fontWeight: '600', color: 'var(--text-secondary, #6E6E73)' }}>
            10-Day Feed
          </span>
        </div>
      </div>

      {/* Pinned Left Header Tag (Mobile) */}
      <div
        className="aarti-ticker-header-mobile"
        style={{
          display: 'none',
          alignItems: 'center',
          gap: '6px',
          padding: '0 10px',
          height: '100%',
          background: 'var(--bg-card, #FFFFFF)',
          borderRight: '1px solid var(--border, rgba(0,0,0,0.08))',
          zIndex: 3,
          flexShrink: 0,
        }}
      >
        <span style={{ display: 'flex', color: 'var(--accent, #E8780C)' }}>
          <DiyaIcon size={14} color="var(--accent, #E8780C)" />
        </span>
        <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', color: 'var(--accent, #E8780C)', textTransform: 'uppercase' }}>
          Live
        </span>
      </div>

      {/* Gradient Edge Masks Container */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          maskImage: 'linear-gradient(to right, transparent 0%, black 28px, black calc(100% - 28px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28px, black calc(100% - 28px), transparent 100%)',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="aarti-ticker-track"
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
        >
          {tickerItems.map((day, idx) => {
            const hasBid = day.bids_count > 0 && day.current_winner_name;
            const isClosed = day.status === 'closed' || day.is_past_cutoff;
            const isMaha = day.is_maha_aarti;

            return (
              <button
                key={`${day.day_number}-${idx}`}
                onClick={() => handleDayClick(day)}
                className="aarti-ticker-pill"
                type="button"
                style={{
                  borderColor: isMaha ? 'rgba(232, 120, 12, 0.45)' : undefined,
                  background: isMaha ? 'linear-gradient(90deg, rgba(232, 120, 12, 0.12), var(--bg-input, #F2F2F5))' : undefined,
                }}
                title={`Click to view Day ${day.day_number} (${day.formatted_date}) details`}
              >
                {/* Day Identifier */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {isClosed ? (
                    <span style={{ color: 'var(--text-secondary, #6E6E73)' }}><LockIcon size={11} /></span>
                  ) : (
                    <span className="aarti-live-dot" />
                  )}
                  <strong style={{ fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>
                    Day {day.day_number}
                  </strong>
                  <span style={{ color: 'var(--text-secondary, #86868B)', fontSize: '11px' }}>
                    ({day.formatted_date})
                  </span>
                </span>

                {/* Maha Aarti Badge */}
                {isMaha && (
                  <span
                    style={{
                      background: 'rgba(232, 120, 12, 0.16)',
                      color: 'var(--accent, #E8780C)',
                      fontSize: '9.5px',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '5px',
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    ★ Maha Aarti
                  </span>
                )}

                <span style={{ color: 'var(--border, rgba(0,0,0,0.15))', fontSize: '10px' }}>•</span>

                {/* Highest Bid or Opening Reserve */}
                {hasBid ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        color: 'var(--text-success, #10B981)',
                        fontWeight: '800',
                        fontSize: '12.5px',
                      }}
                    >
                      ${Number(day.current_highest_bid).toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--text-secondary, #6E6E73)', fontSize: '11.5px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mode === 'public' && day.show_bidder_names === false ? 'Devotee Sponsor' : day.current_winner_name}
                    </span>
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary, #6E6E73)', fontSize: '11.5px' }}>
                    <span>Opening:</span>
                    <strong style={{ color: 'var(--text-primary, #1D1D1F)', fontWeight: '700' }}>
                      ${Number(day.base_bid || 500).toLocaleString()}
                    </strong>
                    <span style={{ fontSize: '10.5px', color: 'var(--accent, #E8780C)', fontWeight: '600' }}>(Reserve)</span>
                  </span>
                )}

                {/* Subtle Jump Arrow */}
                <span style={{ color: 'var(--text-secondary, #86868B)', display: 'flex', opacity: 0.65 }}>
                  <ChevronRightIcon size={11} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
