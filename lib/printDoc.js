'use client';
// Printing and PDFs for the Manager.
//  printHtml: prints only the given page (not the whole app) in a hidden frame, so the device's own print dialog opens with exactly that document.
//  htmlToPdf: turns A4 pages into a real PDF file.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pageStyles = () => [...document.querySelectorAll('link[rel="stylesheet"],style')].map((n) => n.outerHTML).join('');
export async function printHtml(html, { title = 'Print' } = {}) {
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.title = title;
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(f); const d = f.contentDocument;
  d.open(); d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${pageStyles()}<style>@page{size:A4;margin:0}html,body{margin:0;background:#fff!important;overflow:visible!important;-webkit-user-select:auto;user-select:auto}</style></head><body>${html}</body></html>`); d.close();
  const sheets = [...d.querySelectorAll('link[rel="stylesheet"]')]; const imgs = [...d.images];
  await Promise.race([Promise.all([...sheets.map((l) => (l.sheet ? 1 : new Promise((r) => { l.onload = l.onerror = r; }))), ...imgs.map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))]), wait(4000)]);
  try { await Promise.race([d.fonts?.ready, wait(1200)]); } catch {}
  const w = f.contentWindow; w.focus(); w.print();                  // opens the device's print dialog
  setTimeout(() => f.remove(), 120000);
}
export const printElement = (el, opts) => printHtml(el.outerHTML, opts);

/** html: the A4 pages (each an element with class "inv-sheet", about 794 x 1123 px). Returns a PDF Blob.
 *  The pages are drawn in a small hidden frame of their own, so none of the app's scripts or menus are in the picture. */
export async function htmlToPdf(html) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1200px;border:0';
  document.body.appendChild(f); const d = f.contentDocument;
  try {
    d.open(); d.write(`<!doctype html><html><head><meta charset="utf-8">${pageStyles()}<style>html,body{margin:0;background:#fff!important;overflow:visible!important}</style></head><body>${html}</body></html>`); d.close();
    const sheets = [...d.querySelectorAll('link[rel="stylesheet"]')]; const imgs = [...d.images];
    await Promise.race([Promise.all([...sheets.map((l) => (l.sheet ? 1 : new Promise((r) => { l.onload = l.onerror = r; }))), ...imgs.map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))]), wait(5000)]);
    try { await Promise.race([d.fonts?.ready, wait(1200)]); } catch {}
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }); let first = true;
    for (const n of d.querySelectorAll('.inv-sheet')) {
      const c = await html2canvas(n, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false }); const img = c.toDataURL('image/jpeg', 0.92);
      const h = (210 * c.height) / c.width; const pages = Math.max(1, Math.ceil(h / 297 - 0.01));          // a long page continues on the next sheet
      for (let p = 0; p < pages; p++) { if (!first) pdf.addPage(); first = false; pdf.addImage(img, 'JPEG', 0, -p * 297, 210, h); }
    }
    return pdf.output('blob');
  } finally { f.remove(); }
}
