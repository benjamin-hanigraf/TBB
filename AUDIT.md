# Thin Black Brush: scenario audit, user-testing and Apple design review

This file holds (1) the scenario list that was run through the app and the database, (2) what was found and what was fixed, (3) what is only reported (it would change the visual design or structure), and (4) the review of the Manager app against Apple's Human Interface Guidelines.

## 1. Scenario list

**Store orders**
1. Customer pays online for an in-stock item (stock drops by the quantity, money in, fee out, receipt emailed, order appears in To ship).
2. Two customers pay for the last item; the second finds stock short.
3. Customer opens payment, closes it, and never pays (order stays hidden as "pending", no stock taken).
4. Customer pays, the browser closes before confirmation (the provider's webhook confirms it).
5. Payment confirmed twice (browser and webhook): must count once.
6. Payment amount differs from the order total (rejected).
7. Owner cancels a pending order, then the customer pays anyway.
8. Owner marks a pending order as paid by hand (UPI / cash), then the webhook also arrives.
9. Manual order added: paid, not paid yet, more than is in stock, a product with pre-order on, edited later, GST items.
10. Mark shipped by mistake; add tracking later; email tracking; print label for a paid order.
11. Refund a shipped order online; refund by hand; put items back / not put back in stock; refund twice (double tap).
12. Cancel an unpaid order; try to cancel a paid one (must go through Refund).
13. Free-shipping threshold and flat shipping; invalid pincode; item removed from the shop while in a bag.
14. Product stock edited by hand while an order is in flight; product deleted that has past orders.

**Workshops**
15. Book 1 seat, several seats, bring-a-friend price, early-bird price on the last day and the day after.
16. Last seats: two people at once; hold expires after 30 minutes; pays after the hold expired and the seats were taken.
17. Pays for a workshop that was cancelled or has started.
18. Workshop full: waitlist sign-up; a seat frees (refund / transfer); book from the waitlist; waitlisted person contacted.
19. Manual sign-up (paid, not paid yet, discount, over capacity); confirm a "not paid" sign-up when the workshop is now full.
20. Cancel workshop with paid bookings: refund all online / by hand / "cancel without refunds"; cancel with nobody paid.
21. Change date or venue after people have paid; change the number of seats below the number sold; publish a past date; delete a workshop with bookings; copy a workshop.
22. Transfer a booking to another date (seat count both sides, ledger stays single); transfer to a full workshop; transfer a refunded booking.
23. Participant refunded after a transfer; message everyone; message the waitlist when email is not set up.

**Classes (one-on-one)**
24. Child (age 5–15) and adult enrolment online; child under 5 / over 15; same student twice; pays after owner cancelled.
25. Paid enrolment with no dates yet ("to schedule"); add all classes; add more than the course has; add a class in the past; same day and time as another class or a workshop (clash).
26. Move a class; cancel a class; restore it (over the total); delete it; renumbering after changes.
27. Mark attended: a future class (must not be allowed); undo attended; unmarked past classes ("Needs attention" on Home).
28. Refund an enrolment (coming classes must leave the calendar); status switched by hand.
29. Level price changed after enrolments; level hidden; level deleted with students.

**Money and records**
30. Every payment type creates exactly one income entry; refunds create exactly one expense entry; an entry deleted by hand is restored by the safety net.
31. Financial-year boundary (31 March / 1 April), India time near midnight.
32. GST on / off; "added" vs "included"; GST on refunds; zero-rupee items (free) never create ledger rows.
33. Invoices: draft, sent, part payment, over-payment, reminder, quotation to invoice, number format changes, number start changed lower than the last used.
34. Rent-outs: paid / unpaid, edit, delete (income entry follows), clash with a class.
35. Reports (Home tiles, Accounts, Customers totals) agree with each other after every scenario above.

**People**
36. Same person with two emails / same phone; customer with no email; customer merge; deleting a customer with history.
37. Import of old data (CSV) twice; import with bad rows; export and backup.
38. Owner PIN: wrong PIN many times; session expiry; signed in on two devices; PIN changed.

**Calendar**
39. Planner shows only live things: cancelled workshops, cancelled classes and refunded students never appear; rent-outs; events; clashes warn but never block.
40. A workshop that spans several days; month picker across years.

**Website**
41. Every page on iPhone / iPad / desktop sizes; cart, checkout, account; cancelled workshops hidden everywhere (list, direct link, sitemap).

## 2. Found and fixed (no visual change)

| # | Problem found | Fix |
|---|---|---|
| 1 | A paid workshop booking or class enrolment could be switched to "Cancelled" or "Not paid" from its Status box. The money stayed in the accounts with nothing against it. | A paid item can now only be Confirmed (or refunded through Refund). A cancelled one can only be reopened as "Not paid yet". |
| 2 | Confirming a "not paid" sign-up could put a workshop over its seat limit. | Confirming is refused when there are not enough seats left. |
| 3 | A customer paying after the 30-minute seat hold, or after the workshop was cancelled / started, got a paid booking silently over capacity. | The booking is kept (the money is real) but it is flagged in its notes and you are emailed. |
| 4 | A customer paying for an order / booking / enrolment the owner had already cancelled: money taken, nothing recorded, nobody told. | Flagged on the record ("ATTENTION: paid after it was cancelled") and you are emailed once. |
| 5 | Two customers paid for the last item: stock went to zero but the second order looked normal. | Order is flagged "not enough stock for every item" with the item names, and you are emailed. |
| 6 | Refunding a class enrolment left the student's coming classes on the calendar, in Today, and in "Needs attention". | Coming classes are cancelled automatically when the enrolment is refunded (attended ones stay as history). |
| 7 | Workshop seats could be lowered below the seats already sold. | Refused, with the number sold in the message. |
| 8 | A past date could be published. | Refused with a clear message. |
| 9 | Changing a workshop's date or venue after people had paid was silent. | A reminder appears: "N bookings paid. Tell them: Participants, then Message all." |
| 10 | A manual paid order could sell more than the stock on the shelf. | Refused unless pre-order is on for that product (or save as "Not paid yet"). |
| 11 | "Mark as shipped" could not be undone after a slip of the finger. | "Undo shipped" (asks first) moves it back to To ship. |
| 12 | A class could be marked "attended" before it happened; more classes than the course has could be added; a cancelled class could be restored past the total. | Each is refused with a plain message. |
| 13 | If the payment window showed a failed attempt (e.g. one UPI app) the app treated it as final, although the customer could retry inside the window and succeed. A successful retry then never reached the shop. | A failed attempt no longer ends the flow. |
| 14 | Customers' totals ignored bookings and enrolments marked Transferred. | Counted. |
| 15 | Notes written on a record (transfer note, the new warnings) were never shown. | Shown on the booking, enrolment and order screens (red if it needs attention). |
| 16 | On an iPhone with the app installed, the page title, top buttons, the full-screen pop-up headers and the PIN screen sat under the clock / notch / Dynamic Island, and landscape sides under the notch. | Space for the notch and sides is now added (no change on desktop, tablet or Safari). |
| 17 | **Pop-ups cut off on phones.** Every "wide" pop-up (edit workshop, participants, students, edit product, orders, add order, and more) was pushed 56 px down on phones, so its bottom 56 px, including Save and other buttons, was off the screen. A website style named "wide" was also being applied to the Manager. | The Manager's style is renamed so the website style no longer touches it. |
| 18 | A long unbroken email or name widened a pop-up past the screen edge, pushing the close button and buttons off-screen. | Long text now wraps inside pop-ups, lists and cards; amounts never split across lines. |
| 19 | The Accounts "Month by month" table could scroll sideways on phones when GST is on. | Slightly tighter on phones so it fits. |

The database itself held up: seats cannot be oversold by two people at once, expiry of holds frees seats, stock cannot go below zero or be taken or given back twice, a payment can only create one ledger row, zero or negative money is refused, deleting records the accounts need is refused.

## 3. Reported only (would change visual design or structure, or needs your decision)

- Tap targets: several small buttons (Participants / Edit / Students / Classes, the round close and back buttons, small tags) are 34–36 px tall. Apple asks for 44 px. Making them taller changes the look of lists.
- Workshop capacity: when you add a paid sign-up by hand you are protected, but the database does not itself block going over (needed so a real late payment is never rejected). The warnings above cover it.
- Moving a workshop to a different price: transferring a booking does not adjust the amount if the new workshop costs more or less.
- Partial refunds are not supported (a refund is the full amount).
- If a seat frees up (refund / transfer) the waitlist is not told automatically; you see "N seats are free" and use the Book / WhatsApp buttons.
- Someone can book the same workshop twice (e.g. two friends using one phone). This is allowed on purpose; a duplicate warning would be a new screen.
- An income entry deleted by hand for an online payment is added back by the safety net the next time Accounts or Orders opens. To remove one for good, refund it.
- Extreme amounts: a receivable above about one crore rupees makes one Home tile slightly too narrow at 1024 px wide. Normal amounts fit everywhere.
- Pinch-zoom is switched off in the Manager as you asked. This is the one thing Apple's accessibility guidance discourages (see section 4).

## 4. The Manager app against Apple's Human Interface Guidelines

**Done well**
- Navigation: a bottom tab bar with four destinations and a "More" tab is exactly the iOS pattern; labels and icons together; the current tab is clear.
- Sheets: pop-ups slide up as full-height sheets on a phone and as centred cards on tablets and desktop; a clear close button; the main action stays visible at the bottom.
- Safe areas: the bottom tab bar and sheets already respect the home indicator; this round the top and sides were added.
- Typography and colour: system font (San Francisco on iPhone), clear hierarchy, black / white / grey with colour kept for meaning (green = good, red = problem), generous white space, large rounded cards.
- Inputs are 16 px so iOS never zooms when typing; numeric keyboards are used for phone, amounts and dates; dates auto-format as you type.
- Clarity and deference: plain words, no jargon, one main action per screen, destructive actions ask first ("Delete" and "Cancel" confirm), undo for the slips that matter.
- Feedback: toasts for every save, loading and empty states everywhere, errors explain what to do.
- App feel: installable, standalone, opens to Home, offline page, no text selection or magnifier, no rubber-banding.
- PIN screen: four large boxes with dots, the numeric keypad opens by itself, shake on a wrong PIN, signs in as soon as the fourth digit is typed.
- Mobile-first layouts with no sideways scrolling at any width (iPhone SE to desktop).

**To improve (needs your decision because it changes how things look)**
1. Tap targets under 44 px (see above).
2. Dark Mode: the app is light only. iPhones set to dark will show a white app, and the status bar style is fixed.
3. Dynamic Type: sizes are fixed in pixels, so the iPhone "Larger Text" setting does nothing. Switching to relative sizes would change the look slightly.
4. Pinch-zoom is disabled. Apple expects zoom to remain available; people with low vision cannot enlarge anything.
5. Swipe-back: pop-ups and sub-screens do not close with the iOS edge-swipe or the hardware back gesture (the Back control is on screen). Wiring the browser history to sheets is a larger change.
6. Haptics and pull-to-refresh: none (a web app cannot do haptics; refresh is currently a reload).
7. Reduce Motion: only the loading dots honour the iPhone setting; the PIN shake and the sheet / toast animations do not (the website honours it).
8. Large titles: Apple uses a large title that shrinks on scroll; here the title scrolls away. Optional.
9. Icons and splash: a splash image for each iPhone size is missing, so the app shows a white flash on launch.
10. Contrast: grey helper text (#6e6e73) on white passes for body text but is near the limit on the lightest tags; the "Automatic" and status chips could be a shade darker.

## 5. How the screens were checked

Every Manager page and every website page was opened in a phone-sized browser (iPhone SE, iPhone 14, iPhone Plus / Max sizes), tablet sizes (iPad mini, iPad, iPad landscape) and desktop (1280, 1440), 126 page and size combinations per round. Each pop-up and its first level of buttons was also opened on a phone. Two kinds of data were used: normal sample data, and a "stress" set with very long names, long emails and amounts above one crore, because real data is never as tidy as sample data. The iPhone status bar and home-bar spacing was simulated. The checks look for: anything wider than the screen, anything overlapping something else, text clipped or poking out of its box, pop-ups taller than the screen, and the bottom tab bar covering the last item. Result after the fixes: nothing found with normal data; one extreme-amount case (see section 3).
