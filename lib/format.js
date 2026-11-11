// Automatic tidy-up rules for typed text. Used in the browser (as people type) and again on the server.
const collapse = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const capWord = (w) => w.replace(/^([("'‘“]*)(\p{L})(.*)$/u, (_, pre, first, rest) => pre + first.toUpperCase() + (rest === rest.toUpperCase() && rest.length > 0 && /\p{L}/u.test(rest) ? rest.toLowerCase() : rest));
const capParts = (w) => w.split(/([-'’/])/).map((p, i) => (i % 2 ? p : capWord(p))).join('');

/** "rahi sharma" -> "Rahi Sharma", "JOHN o'neil" -> "John O'Neil" (all-caps words are softened, mixed case such as "DSouza" is kept) */
export const titleCase = (s) => collapse(s).split(' ').map(capParts).join(' ');
export const cleanEmail = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
/** accepts "@Thin.Black.Brush", "instagram.com/thin.black.brush/" or "thin black brush" -> "@thin.black.brush" */
export function cleanInstagram(s) {
  let v = String(s ?? '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/[/?#].*$/, '').replace(/\s+/g, '').replace(/[^a-z0-9._@]/g, '').replace(/@/g, '');
  v = v.slice(0, 30); return v ? '@' + v : '';
}
/** keeps digits, +, spaces and dashes while typing */
export const typingPhone = (s) => String(s ?? '').replace(/[^0-9+\s-]/g, '').replace(/\+(?=.)/g, (m, off) => (off === 0 ? m : '')).slice(0, 16);
/** final form: 10 digits -> "98765 43210", with country code -> "+91 98765 43210" */
export function cleanPhone(s) {
  const d = String(s ?? '').replace(/[^\d+]/g, ''); const digits = d.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 11 && digits.startsWith('0')) return `${digits.slice(1, 6)} ${digits.slice(6)}`;
  return collapse(s);
}
export const cleanPin = (s) => String(s ?? '').replace(/\D/g, '').slice(0, 6);
export const upperCode = (s) => String(s ?? '').replace(/\s+/g, '').toUpperCase();           // GSTIN, codes
/** first letter of each sentence capitalised; other text left as typed */
export const sentenceCase = (s) => String(s ?? '').replace(/(^\s*|[.!?]\s+|\n\s*)(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase());
export const digitsOnly = (s, max = 20) => String(s ?? '').replace(/\D/g, '').slice(0, max);
export const money = (s) => { const v = String(s ?? '').replace(/[^0-9.]/g, ''); const [a, ...b] = v.split('.'); return b.length ? `${a}.${b.join('').slice(0, 2)}` : a; };

export const RULES = {
  name: { typing: (v) => v.replace(/\s{2,}/g, ' ').replace(/^\s+/, ''), done: titleCase, cap: 'words', spell: false },
  email: { typing: cleanEmail, done: cleanEmail, cap: 'none', spell: false },
  instagram: { typing: (v) => v.toLowerCase().replace(/\s+/g, ''), done: cleanInstagram, cap: 'none', spell: false },
  phone: { typing: typingPhone, done: cleanPhone, cap: 'none', spell: false },
  pin: { typing: cleanPin, done: cleanPin, cap: 'none', spell: false },
  code: { typing: upperCode, done: upperCode, cap: 'characters', spell: false },
  text: { typing: (v) => v.replace(/^\s+/, ''), done: titleCase, cap: 'words', spell: true },       // addresses, cities, labels
  sentence: { typing: (v) => v.replace(/^\s+/, ''), done: (v) => sentenceCase(v.trim()), cap: 'sentences', spell: true },
  title: { typing: (v) => v.replace(/^\s+/, ''), done: (v) => collapse(v).replace(/^(\p{Ll})/u, (c) => c.toUpperCase()), cap: 'sentences', spell: true },   // product / workshop titles
  money: { typing: money, done: money, cap: 'none', spell: false },
  digits: { typing: (v) => digitsOnly(v), done: (v) => digitsOnly(v), cap: 'none', spell: false },
};
/** guess the right rule from a field name */
export const ruleFor = (name = '') => {
  const n = name.toLowerCase();
  if (/email/.test(n)) return 'email'; if (/insta/.test(n)) return 'instagram'; if (/phone|mobile|whatsapp/.test(n)) return 'phone';
  if (/pin(code)?$|zip/.test(n)) return 'pin'; if (/gstin|code$/.test(n)) return 'code';
  if (/^(name|recipient|organisation|organization|company|party|customer_name|customer)$/.test(n)) return 'name';
  if (/city|state|label|line1|line2|address|venue/.test(n)) return 'text';
  if (/message|experience|notes|description|idea/.test(n)) return 'sentence';
  return null;
};
