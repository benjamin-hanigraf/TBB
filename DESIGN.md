# Thin Black Brush: Design Guide (website and Manager app)

**Read this whole file before adding or changing anything visual.** Follow it exactly and a new page, picture or button will look like it was always part of the site. If something is not covered here, copy the closest existing example (they are named below) instead of inventing a new style.

Stack: Next.js (App Router) + plain CSS. No Tailwind, no UI library. All website styles live in `app/globals.css`; all Manager (admin app) styles live in `app/admin.css`.

---

## 1. The look in one paragraph

Minimal, Apple-like, white and black. Lots of white space. Big calm headings, grey supporting text, rounded cards, pill-shaped buttons, thin outline icons. Colour comes only from photographs. Nothing is decorative: no gradients, no shadows except a soft lift on hovering a card, no borders thicker than 1px, no emoji, no doodles.

## 2. Colour (use these tokens only)

Defined as CSS variables at the top of `app/globals.css`.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#1d1d1f` | Main text, primary buttons, selected states |
| `--mute` | `#6e6e73` | Secondary text, captions, prices, icons in lists |
| `--soft` | `#f5f5f7` | Alternate section background, card background, footer |
| `--line` | `#d2d2d7` | Input borders, dividers |
| white | `#fff` | Page background, cards placed on `--soft` |
| black | `#000` | Hover state of ink buttons, "dark" sections, active menu item in Manager |
| error red | `#c00` / bg `#fdecec` text `#7a1f1f` | Required-field star, error notices |
| success green | bg `#eaf7ee` text `#14532d` | Success notices |

Rules
- Never add a new accent colour. Never use brand colours for buttons.
- Sections alternate **white → `.soft` → white**. A black `.dark` section is allowed at most once per page.
- Photographs are the only colourful thing on the page.

## 3. Typography

Font stack (already set): SF Pro on Apple devices, Inter/system fonts elsewhere. Never import another font.

| Role | Class / tag | Size | Weight | Notes |
|---|---|---|---|---|
| Page title | `h1` | `clamp(40px, 6.4vw, 72px)` | 600 | Line-height 1.05, letter-spacing -0.03em, balanced wrapping |
| Section title | `h2` | `clamp(28px, 4vw, 44px)` | 600 | letter-spacing -0.025em |
| Card/item title | `h3` | 21px | 600 | |
| Body | `p` | 17px / 1.6 | 400 | colour `--ink` |
| Lead paragraph | `.lead` | 18-21px | 400 | colour `--mute`, max-width 620px, centred |
| Eyebrow (small label above a heading) | `.eyebrow` | 15px | 500 | colour `--mute` |
| Small / caption | `.small` | 14px | 400 | colour `--mute` |
| Tag pill | `.tag` | 12px | 500 | black pill, white text. `.tag.off` = grey pill (ended/closed) |

Rules
- Hierarchy comes from **size, weight and grey only**. No italics, no underlines (links are not underlined, except body links inside legal text), no ALL CAPS, no colour for emphasis.
- Headings are written in sentence case ("Pick up a brush or a pen."), never Title Case.
- Use `<br />` in a heading only to split it into two balanced lines.
- Legal pages (`.prose`) are justified with hyphenation; everything else is centred or left-aligned, never justified.
- Wrap body text in the `Typeset` component (`components/Typeset.js`). It glues short words ("a", "of", "the") and numbers to their neighbours with non-breaking spaces so that **no line ends with a lonely short word and no last line has one word**. Prices and ₹ amounts must never split.

## 4. Layout and spacing

- Page container: `<div className="wrap">` → max-width 1080px, 24px side padding. Nav uses 1200px.
- Every page body is a sequence of `<section className="section">` blocks. Vertical padding **104px** desktop, **72px** at ≤700px. Do not add custom margins between sections.
- Page header block: `<section className="pagehead"><div className="wrap"><p className="eyebrow">…</p><h1>…</h1></div></section>`. Then `<section className="section">`.
- Section header block: `<div className="head">` containing `.eyebrow` + `h2` + optional `.lead`. Centred, max-width 760px.
- Cards are in `<div className="cards">`: a centred, wrapping flex row (gap 24px). Odd counts stay centred. Each card is `flex: 1 1 280px; max-width: 336px`.
- Two-column detail pages use `<div className="split">` (photo left, info right; stacks at ≤860px).
- Everything is **centred** in sections and cards, except forms (labels left-aligned) and long text in `.split .info`.
- Breakpoints: **960px** (nav turns into burger menu), **860px** (split stacks), **700px** (smaller section padding, forms and cards single column). Test at 360, 390, 768, 1024 and 1440px.
- No horizontal scrolling at any width. Long words must wrap (`overflow-wrap`).
- **No visible scrollbars anywhere** (website or Manager). The global rule `* { scrollbar-width: none }` plus `::-webkit-scrollbar { display: none }` is at the bottom of both CSS files. Scrolling itself still works. Do not remove it.

## 5. Shape

| Thing | Radius |
|---|---|
| Buttons, tags, quantity pill, badges | `980px` (fully round pill) |
| Cards, big photos, modals | `22px` (`--r`) |
| Small photos, logo tiles | `18px` |
| Inputs, selects, notices | `14-16px` |
| Thumbnails | `12px` |

Shadows: only `a.card:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(0,0,0,.08) }`. Nothing else.

## 6. Buttons

Always use the `Btn` component (`components/Btn.js`) or `<button className="btn …">`.

- **Primary** `.btn`: black pill, white text, 16px/500, min-height 46px, padding 0 24px. Hover `#000`.
- **Secondary** `.btn.ghost`: transparent, ink text, 1px `#86868b` border; hover turns black with white text.
- **On dark** `.btn.light`: white pill.
- Disabled: opacity .35.
- Optional 17px icon on the left, 8px gap.
- **Labels are as short as possible: one or two words.** Good: "Pay ₹1,200", "Shop", "Send link", "Checkout", "Save", "Enquire". Bad: "Click here to enrol now".
- A button that changes text depending on state (price, "Pay", "Sending…") must not change width. Add `className="fixw"` (min-width 176px, centred).
- Inside forms the submit button is full width (`.form .btn`).
- One primary button per section. Extra actions are `ghost`.

### Quantity pill (add to bag)
`AddToCart` shows a normal `.btn.fixw` "Add to bag". After the first tap it turns into a pill of the **same size**: `[ − 1 + ]` (`.qty.big`), with a small grey "View bag" link beside it. Pressing − at 1 removes the item and the "Add to bag" button returns. Maximum 10 (or the stock, whichever is lower). In the bag the compact `.qty` pill is used.

## 7. Icons

One component: `components/Icons.js`, used as `<Icon n="bag" size={18} />`.
- 24×24 viewBox, **outline only**: stroke `currentColor`, width 1.7, round caps and joins, no fill (exceptions: `send` is a filled paper plane with a cut-out fold line; `chair` is a filled glyph).
- Sizes: 17-18px inside buttons, 20-22px in the nav, 15px for ticks in lists.
- To add an icon: add a new key to the `P` object in `Icons.js`, drawn on the 24×24 grid with the same stroke style. Never add an icon library and never use emoji.
- Meaning is fixed, do not reuse for something else: `bag` = shopping bag (everywhere, including the Store menu item), `chair` = writing classes, `calendar` = workshops, `calendardays` = calendar tool, `wallet` = pay (cash, UPI and card alike), `note` = rupee note (Accounts), `rupee` = price, `listcheck` = to-do, `grip` = drag handle, `gear` = settings, `logout` = log out, `send` = send/submit, `fileout` = export, `filein` = import, `user` = login/account.
- The bag icon is also available as a standalone file: `public/icons/bag.svg`.
- The word is **"bag"** everywhere (never "basket" or "cart"). The page is `/bag`.

## 8. Forms

- Wrapper `<form className="form">`: single column, max-width 520px, gap 18px, centred on the page.
- Each field is `<label><span>Label <i>*</i></span><input …/></label>`. Label 14px/500 above the field. Required fields carry a red `*` and must really be `required`.
- Every input and select is **52px tall**, 16px text (stops iPhone zoom), 1px `--line` border, 14px radius, white background. Focus = 2px ink outline. Invalid = red border.
- Dates are plain simple inputs. Placeholders are light grey `#a1a1a6`.
- `autoComplete="off"` on everything (the owner does not want browser suggestions).
- Input cleaning rules are in `lib/rules.js` and `lib/format.js` (use `ruleProps('name' | 'email' | 'phone' | 'digits' …)`): names get a capital first letter but keep deliberate capitals ("IIT"), emails and Instagram handles are lowercase, phone numbers keep digits only.
- Messages: `.notice` (grey), `.notice.ok` (green), `.notice.err` (red), centred, 16px radius.

## 9. Photographs

- **Where they live:** `public/img/<id>.webp` (full size, max 1600px wide) plus `public/img/<id>-640.webp` (phone size). Photos added from the Manager app are stored in Supabase Storage (bucket `media`) and the app creates the small version automatically.
- **Format:** WebP, quality about 82. Never PNG for photos, never above 1600px.
- **Always use the `Pic` component** (`components/Pic.js`), never a bare `<img>`: it sets width, height, lazy loading and the phone-size `srcSet`. Pass `eager` only for the first photo on a page.
- **Crops (fixed aspect ratios, `object-fit: cover`):** hero 16:8 (4:3 on phones), cards 4:5, product gallery 4:5, wide banner 16:7 (4:3 on phones), grid photos 1:1, logo tiles 3:2 with the logo `object-fit: contain` on white.
- **Look:** all photos are colour-graded to one consistent brightness, contrast and soft warm white. New photos must be graded the same way with `python3 tools/grade_photos.py <input folder> <output folder>`. (Screenshots, logos and drawings are excluded from grading, see `NOT_PHOTO` in that script.)
- **Alt text:** every photo has a short descriptive `alt` ("Hands practising modern calligraphy"). Logos use the business name.
- **Owner workflow:** she changes website photos in the Manager app → Website photos. Each slot there is a named place on the site (hero, classes banner, etc.). Do not hard-code a new photo path if a slot exists; add a new slot in `lib/data.js` (`images`) and the `site_images` table instead.
- Photos on cards sit flush at the top of the card with the card's rounded top corners; text below, centred, 22px padding.

## 10. Components and patterns to copy

| Need | Copy this |
|---|---|
| New page | `app/(site)/services/page.js` (pagehead + sections) |
| Card grid | Home page workshops block (`.cards` / `a.card`) |
| Product / detail page | `app/(site)/store/[slug]/page.js` and `components/Gallery.js` |
| Selectable option cards | `components/LevelPicker.js` (`.levels`, `.level.sel`) |
| Form | `components/Form.js` |
| Back button | `components/BackNav.js`. Only on detail pages (workshop, product, bag, checkout), never on main pages |
| Footer | `components/Footer.js` |

## 11. Navigation and footer

- **Nav:** sticky, 64px high, white at 82% opacity with blur and a hairline bottom border. Logo left. Links 14px `#424245`, active link black + 600. Right side: **bag icon (with a black count badge), login icon, burger**. Below 960px the links collapse into a full-screen white menu (links 19px, hairline separators). The burger is a black three-line icon.
- **Footer:** `--soft` background, 14px grey text, compact. Top row: logo + one-line description on the left; "Studio" on the right (address, then phone, email, Instagram, Facebook on one wrapping line). Bottom row, below a hairline: copyright on the left, Terms · Privacy · Refunds on the right. No "Explore" column. The address is a link to the map and is **not underlined**.

## 11b. Small rules added later
- Workshop tags: upcoming workshops show **Book now**, past ones **Ended**.
- Children are **5 to 15**. Forms say "Participant", never "Student".
- The class form shows only the fields that apply: a child needs participant name, age and parent or guardian name; an adult needs just their name.
- Checkboxes are always black (square, 6px radius, white tick). Never the browser's blue.
- Footer contact links are four round icon buttons (phone, email, Instagram, Facebook), 40px, 1px border.
- Prices: GST is set per product (No GST / Add 18% / Includes 18%). Shop pages show "+ 18% GST" or "incl. GST" beside the price when it applies.
- Use **Bag** everywhere, never basket or cart.
- **One message form.** Every enquiry (message, invitation, service, collaboration, job application) uses `components/ContactForm.js` on `/contact`. Other pages never contain a form of their own: they show a button to `/contact?topic=<message|invitation|service|collaboration|hiring>#message-form` (optionally `&for=<option>` to pre-select the second drop-down). To add a topic, add it to `TOPICS` in that file and to `KINDS` in `app/api/enquiry/route.js`.
- Checkout fills the address from the customer's last order. There are no saved-address forms.

## 12. Motion

Subtle only: 0.2s colour/opacity fades, card lift on hover, smooth scrolling to the form when a class level is chosen on phones. Respect `prefers-reduced-motion`. No animations on load, no parallax, no carousels that auto-play.

## 13. Accessibility (do not break)

- Tap targets at least 44px. Visible focus ring (`:focus-visible` 2px ink).
- Every icon-only button has an `aria-label`. Decorative icons are `aria-hidden` (the `Icon` component does this).
- Text colour on white is `--ink` or `--mute` (never lighter than `#6e6e73`, except placeholders).
- Forms use real `<label>`s and `required`.

## 14. The Manager app (`/manager`)

A phone-first PWA in the same visual language but on a **grey `#f5f5f7` page with white cards** (the reverse of the website's soft sections). Styles: `app/admin.css`, all classes start with `ad-`. Components: `components/admin/*`, building blocks in `components/admin/kit.js`.

- **Layout:** desktop = 240px white sidebar (black pill for the active item) + content, max-width 1000px. Phone (≤900px) = content + a fixed bottom tab bar of 5 icons (white, blurred, 11px labels). The rest sit under "More".
- **Page header:** `.ad-head` = back circle (if needed) + `h1` (26-34px) + actions (`.ad-act`).
- **Cards:** `.ad-card` white, 20px radius, 20px padding. Stat tiles `.ad-stat` (label 13px grey, number 22-28px/600). Money in = green `#14532d`, out = red `#9b1c1c`.
- **Lists:** `.ad-list` of `.ad-row` (title 600, small grey line under it, value or badge on the right, hairline separators). Thumbnails `.ad-thumb` 52px, 12px radius.
- **Badges:** `.ad-badge` (grey), `.ok` green, `.warn` amber, `.bad` red. Pill shaped, 12px.
- **Buttons:** `.ad-btn` black pill 44px; `.ghost` white with grey border; `.danger` red; `.sm` 34px. Same short-label rule as the website. Always use `Btn` from `kit.js`.
- **Forms/modals:** "Add / edit" windows are large. On phones they are **full screen** with a sticky Save bar; on desktop they are centred up to 760px (`.ad-modal`) or 1040px (`.ad-modal.wide`) wide, 22px radius. Fields use `.ad-field` in a two-column `.ad-form` grid (one column on phones). Same field height and rules as the website.
- **Toasts:** black pill, bottom centre, 3.5 seconds.
- **Loading:** three small black dots that pulse (`<Dots />`). Never the word "Loading".
- **Words:** Income and Expense (never money in/out), Participants (never students), Log out (never lock), Bag.
- **Buttons at the bottom of a form** (`.ad-actions.full`) share one row of equal-width buttons: Save, a ghost action, Delete. Delete asks "Sure? Tap again" on the same button so the size never changes.
- **Drag to reorder** (store products, class levels, product photos): a grip handle (`Icon n="grip"`) or the photo itself; use `<Sortable>` from `components/admin/kit.js`. The new order is saved when the finger or mouse is released.
- **Class types** are greys only: the type's boxes use `#f5f5f7`, `#e8e8ed`, `#dcdce1`, `#d0d0d6` in order. Same on the website's level cards.
- **Lists with unread items** (Inbox) are highlighted with a light grey row, a black dot and bold name, like Gmail.
- **Calendar, To-do, Invoices, Label printer** are Home buttons: icon above a short label in a white card.
- **Invoices** print on A4 portrait with the stacked logo, in a fixed-size header (`components/admin/InvoiceSheet.js`). **Labels** are A4 portrait strips 35 mm tall across the 190 mm printable width, black and white only, 7 per page.
- **Access:** PIN keypad only (`PinGate`). No email login. Never show the PIN anywhere.
- **Tables of data** (orders, customers, workshops, products, classes, money) always have: search, a bulk "Import" (CSV) and "Export" (CSV) in the header, one row per item.

## 15. Content rules

- Currency is `₹` with Indian grouping: `₹1,25,000` (use `rupees()` from `lib/data.js`). Dates: "14 December 2025" (`fmtDate`). Time zone: Asia/Kolkata.
- Voice: warm, short, plain. No exclamation marks, no jargon.
- Business facts (name, address, phone, WhatsApp, Instagram, Facebook, tagline) live in `business` in `lib/data.js`. Change them there, never inside a page.
- Brand name is always **Thin Black Brush**; the shop is **TBB Kadai**; the tagline is **The Artists' Commonroom**.

## 16. Checklist before you finish any change

1. Uses only tokens, radii and type sizes above.
2. Button labels are one or two words; changing labels do not change button width.
3. Photos go through `Pic`, are WebP, and graded.
4. Looks right at 360, 390, 768, 1024, 1440px with no sideways scroll and nothing overlapping (open the menu and check it too).
5. No scrollbars visible.
6. Run `npm run build` and `npm test`. Both must pass.
