'use client';
import Icon from './Icons';
export default function PrintButton({ label = 'Print or save as PDF' }) { return <button className="btn ghost no-print" onClick={() => window.print()}><Icon n="send" size={17} /><span>{label}</span></button>; }
