'use client';
import { useEffect } from 'react';
// Replaces the browser's own grey "Please fill out this field" bubble with a small red message under the field, in the site's style.
const say = (el) => {
  const v = el.validity;
  if (el.type === 'checkbox' && v.valueMissing) return 'Please tick this box.';
  if (v.valueMissing) return el.tagName === 'SELECT' ? 'Please choose an option.' : 'Please fill this in.';
  if (v.typeMismatch) return el.type === 'email' ? 'Please enter a valid email address.' : el.type === 'url' ? 'Please enter a valid web address.' : 'Please check this field.';
  if (v.patternMismatch) return el.title || 'Please check this field.';
  if (v.tooShort) return `Please write at least ${el.minLength} characters.`;
  if (v.tooLong) return `Please keep this under ${el.maxLength} characters.`;
  if (v.rangeUnderflow) return `Please enter ${el.min} or more.`;
  if (v.rangeOverflow) return `Please enter ${el.max} or less.`;
  return el.validationMessage || 'Please check this field.';
};
const box = (el) => el.closest('label, .ad-field, .ad-check') || el.parentElement;
const clear = (el) => { el.classList.remove('is-invalid'); el.removeAttribute('aria-invalid'); box(el)?.querySelectorAll(':scope > .field-err').forEach((n) => n.remove()); };
export default function FormErrors() {
  useEffect(() => {
    let first = true;
    const onInvalid = (e) => {
      const el = e.target; if (!(el instanceof HTMLElement) || !('validity' in el)) return;
      e.preventDefault();                                              // no browser bubble
      clear(el); el.classList.add('is-invalid'); el.setAttribute('aria-invalid', 'true');
      const p = document.createElement('span'); p.className = 'field-err'; p.setAttribute('role', 'alert'); p.textContent = say(el); box(el)?.appendChild(p);
      if (first) { first = false; setTimeout(() => { first = true; }, 0); el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    };
    const onFix = (e) => { const el = e.target; if (el?.classList?.contains('is-invalid') && el.checkValidity()) clear(el); };
    document.addEventListener('invalid', onInvalid, true); document.addEventListener('input', onFix, true); document.addEventListener('change', onFix, true);
    return () => { document.removeEventListener('invalid', onInvalid, true); document.removeEventListener('input', onFix, true); document.removeEventListener('change', onFix, true); };
  }, []);
  return null;
}
