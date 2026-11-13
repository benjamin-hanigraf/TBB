// The studio address, written exactly like this everywhere (website, receipts, invoices, labels).
export const ADDRESS_LINES = ['2nd Floor, Berachah Building, 13/7, 1st Cross St,', 'Trustpuram, Kodambakkam, Chennai - 600024.'];
export const ADDRESS_TEXT = ADDRESS_LINES.join('\n');
// The 'Visit the studio' box on the contact page breaks the address into three lines.
export const CONTACT_LINES = ['2nd Floor, Berachah Building,', '13/7, 1st Cross St, Trustpuram,', 'Kodambakkam, Chennai - 600024.'];

/** Splits an address typed or picked as text into the customer's address fields. Understands "line 1 / line 2 / city - 600024 / state" (the way a picked customer is written) and loose text with a 6-digit pincode. */
export function parseAddress(text) {
  const lines = String(text || '').split(/\n|;/).map((l) => l.trim()).filter(Boolean); if (!lines.length) return {};
  const joined = lines.join(' '); const pin = (joined.match(/\b\d{6}\b/) || [])[0] || '';
  const pinAt = lines.findIndex((l) => pin && l.includes(pin));
  if (lines.length === 1) { const one = lines[0].replace(pin, '').replace(/[\s,\-–]+$/, '').trim(); return { address_line1: one, pincode: pin }; }
  const out = { address_line1: lines[0], pincode: pin };
  if (pinAt > 0) { out.city = lines[pinAt].replace(pin, '').replace(/[\s,\-–]+$/, '').replace(/^[\s,\-–]+/, '').trim(); if (lines[pinAt + 1]) out.state = lines[pinAt + 1]; if (pinAt > 1) out.address_line2 = lines.slice(1, pinAt).join(', '); }
  else { if (lines.length > 3) out.address_line2 = lines.slice(1, -2).join(', '); out.city = lines.length > 2 ? lines[lines.length - 2] : ''; out.state = lines[lines.length - 1]; if (lines.length === 2) { out.city = ''; out.address_line2 = lines[1]; out.state = ''; } }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}
