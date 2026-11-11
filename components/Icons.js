const P = {
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
  bag: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  chat: <path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.1-4.4A8.5 8.5 0 1 1 20.5 12Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 8 8 6 8-6" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21Z" /><circle cx="12" cy="9.500" r="2.500" /></>,
  send: <><path d="M21 3 10 14" /><path d="m21 3-6.500 18-3.500-7.500L3.500 10 21 3Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.500 20a7.500 7.500 0 0 1 15 0" /></>,
  ticket: <><path d="M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1.500A1.500 1.500 0 0 0 5.500 19h13a1.500 1.500 0 0 0 1.500-1.500V16a2 2 0 0 1 0-4v0a2 2 0 0 0 0-4V6.500A1.500 1.500 0 0 0 18.500 5h-13A1.500 1.500 0 0 0 4 6.500Z" /><path d="M14 5v14" strokeDasharray="2 2.500" /></>,
  check: <path d="m5 13 4 4L19 7" />,
  left: <path d="m15 5-7 7 7 7" />, right: <path d="m9 5 7 7-7 7" />,
  instagram: <><rect x="3.500" y="3.500" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r=".6" /></>,
};
export default function Icon({ n, size = 18 }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ic">{P[n]}</svg>);
}
