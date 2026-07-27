import { useEffect, useRef, useState } from 'react';
import { InfoIcon } from '@/assets/icons';
import './InfoTooltip.css';

/** Small tap/click-to-reveal info popover — used next to field labels whose
 * meaning isn't obvious from the label alone (e.g. ELP Type, ELP Tier). */
export default function InfoTooltip({ label, text }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <span className="info-tooltip" ref={containerRef}>
      <button
        type="button"
        className="info-tooltip__trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={label}
        aria-expanded={open}
      >
        <InfoIcon />
      </button>
      {open && (
        <span className="info-tooltip__bubble" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}
