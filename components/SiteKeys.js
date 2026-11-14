'use client';
import { useEffect } from 'react';
/** Extra keyboard controls for the public website (everything else uses normal Tab, Enter, Space and arrow keys):
 *  - quantity pills (bag, seats): Up or Right = one more, Down or Left = one less
 *  - the menu (Nav.js) and the photo viewer (PhotoWall.js) handle their own keys: Esc, arrows, Home and End */
export default function SiteKeys() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      const q = e.target instanceof Element ? e.target.closest('.qty') : null; if (!q) return;
      const more = e.key === 'ArrowUp' || e.key === 'ArrowRight', less = e.key === 'ArrowDown' || e.key === 'ArrowLeft'; if (!more && !less) return;
      const b = q.querySelector(`button[aria-label="One ${more ? 'more' : 'less'}"]`); if (!b || b.disabled) return;
      e.preventDefault(); b.click();
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
