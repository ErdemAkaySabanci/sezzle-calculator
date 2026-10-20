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
