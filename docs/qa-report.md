# Browser QA report

This report covers the calculator running locally: the Go API on `localhost:8080` and the Vite dev server on `localhost:5173`. It was driven in Chrome on Windows 11 with [Playwright CLI](https://github.com/microsoft/playwright-cli). Each check below ran against the real application. Nothing was taken from unit tests.

## How it was tested

- Scripted Playwright sessions drove both the mouse and the keyboard. To simulate failures, the scripts used Playwright request routing to delay or abort `/api/calculate`. For the stopped-backend case, the real Go process was killed.
- Accessibility was checked with axe-core 4.10.2, injected at test time and not a project dependency. It ran the WCAG 2.0/2.1/2.2 A and AA rules plus best practices.
- Layout, contrast, motion and live-region behaviour were measured directly in the page.

## Functional results (24/24 pass)

| Area | Scenario | Result |
|---|---|---|
| Arithmetic | 12 + 30, 5 − 8, 2.5 × 4, 7 ÷ 2 by mouse | pass |
| | 0.1 + 0.2 shows `0.3`; the API returned `0.30000000000000004` | pass |
| | −4 × −2.5 = 10 with F9; ± on a result gives −10 | pass |
| | 2 + 3 × 4 = 20, as two API calls evaluated left to right | pass (after fix 1) |
| | Repeated calculations continue from the result; Esc and AC clear | pass |
| | A 16th digit is ignored; 999,999,999,999,999 × 9,999,999 = `9.99999899999999e+21`; 0.000001 ÷ 1000 = `1e-9` | pass |
| | Repeated multiplication overflows: "Result is too large to calculate. Try smaller numbers." | pass |
| Errors | 8 ÷ 0: "Can't divide by zero. Enter a different number."; operands are kept | pass |
| | Recovery by typing a new divisor, or with AC | pass |
| | Connection refused: "Can't reach the calculator service…"; `=` retries | pass |
| | Server slower than 10 s: "…took too long to respond. Try again." | pass |
| | Go server stopped: "The calculator service is unavailable. Try again."; `=` works after restart | pass |
| | While pending: one request only; `aria-busy`; "Calculating…"; keys typed ahead apply after the result | pass (after fix 1) |
| Interaction | All 19 buttons by mouse | pass |
| | Keyboard: digits, `.` `,` `+ - * / x`, Enter, `=`, Backspace, Esc, Delete, F9 | pass |
| | Ctrl, Alt and Cmd shortcuts are left to the browser | pass |
| | Selected operator is marked (`aria-pressed`) until the second number | pass |
| | Tab reaches all 19 keys in visual order with a 2px focus ring; 8 + 5 = 13 using Tab, Enter and Space only | pass |
| | Mouse clicks do not show the keyboard focus ring | pass |

## Responsive results (12/12 pass)

Each width was tested with the longest typed entry (`-999,999,999,999,999`), the longest result (`-9.99999899999999e+21`), and the longest error message. The checks were: no horizontal page overflow, no text outside the display's padding, no overlapping or out-of-bounds keys, and readable sizes.

| Viewport | Smallest key | Smallest text | Result |
|---|---|---|---|
| 320 × 640 | 58 × 60 px | 13 px | pass (after fix 2) |
| 390 × 844 | 76 × 60 px | 13 px | pass |
| 768 × 1024 | 81 × 60 px | 13 px | pass |
| 1440 × 900 | 81 × 60 px | 13 px | pass |

## Accessibility (WCAG 2.2 AA, partial verification)

| Check | Result |
|---|---|
| axe-core in 7 states (initial, result, error, pending, dark with operator selected, dark result, 320 px) | 0 violations. The one "incomplete" item, the `−` glyph, was checked manually at 13.17:1 |
| Text contrast in both themes (computed per token pair) | lowest 5.01:1 (muted hint on page ground) |
| Focus indicator contrast | at least 5.92:1 |
| Accessible names | every key is named ("Divide", "Toggle sign", "Decimal point", …); the page has an `h1` |
| Screen-reader announcements | one `role="status"` region announces "12 × 3 = 36. Answered by the server in 9 ms" and the error messages. The typed value is not live, so typing is not read out digit by digit |
| Target size (2.5.8) | smallest key is 58 × 60 px |
| Reflow (1.4.10) at 320 px; 200 % text size | no loss of content |
| Text spacing override (1.4.12) | no loss of content (after fix 3) |
| Reduced motion | result animation and key transitions are disabled |
| Forced colours | the selected operator keeps a 3 px outline |

**Not verified:** no testing with a real screen reader (NVDA or VoiceOver), and no testing in Firefox or Safari. Announcements were verified from the live-region semantics and the accessibility tree. These results support AA conformance for what was tested; they are not a full WCAG audit.

## Defects found and fixed

1. **Keys typed during an API call were lost (functional).**
   - Symptom: typing `2+3*4` and Enter quickly showed 5, not 20.
   - Cause: the reducer discarded every key while a request was pending.
   - Fix: keys are queued and applied in order once the result arrives. They are dropped if the calculation fails, and on AC. Pressing `=` again still sends no duplicate request.
   - Regression tests: in `reducer.test.ts` and `Calculator.test.tsx`.
2. **Long values overflowed the display at 320 px (layout).**
   - Cause: a grid item defaulted to `min-width: auto`, and the font-size floor was too large for 21–22 characters.
   - Fix: `min-width: 0`, and a floor of 1.125 rem.
   - Regression check: the browser layout script, since jsdom has no layout engine.
3. **Low contrast while pending (WCAG 1.4.3).**
   - Cause: the waiting value was faded to 40 % opacity (2.29:1).
   - Fix: it now uses the muted ink colour (5.81:1 light, 7.35:1 dark).
   - The same change lets a value wrap, as a last resort only, under user text-spacing overrides (1.4.12).
   - Regression check: axe in the pending state.

## Known limitations

- `go test -race` was not run, because it requires cgo and a C toolchain, which were not installed on the development machine.
- Graceful shutdown (Ctrl+C) was not exercised by the automated checks.
- Browser verification was scripted ad hoc with Playwright CLI. It is not a committed end-to-end suite.
- Keys typed while a request is pending are not shown until the result arrives, because they are queued.
- The design uses the system font stack, so glyph widths differ by OS. The display's fit-to-width estimate (0.6 em per character) was only measured with Segoe UI.
- At 320 px the longest expression line wraps its trailing `=` onto a second line. This is readable and is a visual-polish item.

## Re-verification after the design polish

The browser suites were rerun after the visual changes described in [design-review.md](design-review.md). Results:

- **Functional:** 24/24 pass. The expression check now treats the operator's non-breaking space as a space.
- **Responsive:** 12/12 pass at 320, 390, 768 and 1440 px. Long values render larger than before; for example, the longest entry at 390 px went from 25.8 px to 29.1 px. The smallest key is 58 × 60 px.
- **axe-core 4.10.2:** 0 violations in all 7 states. The only "incomplete" item is the `−` glyph, which was checked manually.
- **Other accessibility checks:** text spacing (1.4.12), 200 % text, reduced motion and forced colours all pass.
- **Touch emulation (Pixel profile, coarse pointer):**
  - the keyboard hint is hidden;
  - the calculator rests at the bottom, 32 px from the edge;
  - a tapped key returns to its resting colour, so hover tints no longer stick.

**Known limitations:** the 320 px wrapped `=` listed above is resolved. Each operator and `=` now stays with the number before it, and the expression is sized to fit on one line. The other limitations still apply.

## Re-verification after the Annual Report redesign

Re-checked on the new design at 320, 390, 768, 1024 and 1440 px, in light and dark:

| Check | Result |
|---|---|
| Functional scenarios | 24/24 pass |
| Responsive checks | 12/12 pass. The largest figure is 112 px on desktop; the longest value is 18.7 px at 320 px and 35.5 px at 1440 px |
| Smallest key | 58 × 52 px on a 320 × 640 screen, where the short-screen rule applies |
| Smallest text | 13 px |
| axe-core 4.10.2 | 0 violations in 7 states. The only "incomplete" item is again the `−` glyph |
| Lowest text contrast | 4.94:1 (the hint on the light page background) |
| Light focus ring | 4.65:1 |
| Text spacing (1.4.12), 200 % text, reduced motion, forced colours | pass |
| Touch emulation | pass: hint hidden, card resting at the bottom, no stuck hover |
| Short screen (320 × 568) | the `=` row ends at y = 530, inside the 568 px viewport |

## Stage 8: power, square root and percentage

Tested in Chrome with Playwright CLI against the real Go API, mainly at 1440 × 900 desktop. Desktop is the review target.

| Check | Result |
|---|---|
| Functional scenarios | 37/37 pass: the 24 earlier scenarios (updated for the 22-key keypad and tab order) plus 13 new ones |
| New scenarios | `2 ^ 10 = 1,024`; `√9 = 3` sent without `b`; `20% of 150 = 30` with the "of" wording announced; `2 + √9 = 5`; chaining across old and new operations; keyboard `^ @ %`; AltGr+`@`; `√-4`, `0 ^ -1` and `-8 ^ 0.5` explained (422 `DOMAIN_ERROR`); `10 ^ 400` reported as too large; `sqrt` with `b` rejected with 400; xʸ and % shown as selected |
| axe-core 4.10.2 | 0 violations in 14 states, light and dark, including the new selected keys, a mid-calculation √ and the domain-error message. The "incomplete" items are the glyph-only `−` and `√` keys |
| Contrast of the new keys | xʸ and √ 8.89:1 light, 10.58:1 dark; selected % 5.2:1 light, 5.44:1 dark (measured after the 120 ms colour transition) |
| Forced colours | the selected % keeps its 3 px outline |
| Text spacing (1.4.12) and 200 % text | pass, no clipped content and no horizontal scroll |
| Phones | no horizontal scroll at any width. The sixth keypad row makes the page taller than short screens: it scrolls by 46 px at 360 × 640 and 115 px at 375 × 667. Accepted, because desktop is the review target |

## Stage 8B: "Signal" redesign

Tested in Chrome with Playwright CLI against the real Go API, in light and dark, at 1440 × 900 and at phone sizes.

| Check | Result |
|---|---|
| Functional scenarios | 37/37 pass on the new design |
| axe-core 4.10.2 | 0 violations in 14 states, light and dark. "Incomplete" items are the glyph-only keys, as before |
| New contrast pairs | Mint result 5.36:1 (light) and 10.81:1 (dark); selected key 5.49:1 and 6.73:1; lowest text pair 5.13:1 (error on white) |
| Signal rail | Each API state checked: idle, pending (sweep; still dashed amber with reduced motion), online, offline (dashed coral). After ÷0 it stays online |
| Forced colours | The selected key keeps its 3 px outline; the decorative rail is hidden |
| Text spacing (1.4.12), 200 % text | Pass, no clipped content |
| Phones (touch emulation) | 320 × 568, 360 × 640 and 375 × 667 fit with no scroll; keys 46–50 px tall; `=` fully visible |
| Font | Archivo loads from the self-hosted file in every view; no horizontal scroll at any width |
