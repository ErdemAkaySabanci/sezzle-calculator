# Design review and polish

This is a polish pass on the calculator UI. The existing direction stays: minimalist and fintech-inspired, with cool sage neutrals, evergreen ink and one emerald accent. Nothing was redesigned. The review used the Impeccable skill's `critique`, `audit` and `polish` workflows. Changes were verified in Chrome with Playwright CLI at 320, 390, 768 and 1440 px, in light and dark.

## Critique (before changes)

The critique ran as two isolated assessments. Assessment A was a design review: source files plus live screenshots at four widths, in both themes and every state. Assessment B was the automated detector plus a browser overlay.

**Assessment A: 29/40 on Nielsen's heuristics ("Good").**

| Heuristic | Score | Main issue |
|---|---|---|
| Visibility of system status | 3 | Keys typed while a request was pending left no visible trace |
| Match with the real world | 3 | `e+21` is programmer notation |
| User control and freedom | 3 | No clear-entry key; no way to recall the previous result |
| Consistency and standards | 3 | Hover tints stuck after taps on touch screens |
| Error prevention | 3 | The 15-digit cap is silent |
| Recognition over recall | 3 | Some shortcuts (`x`, `,`, Delete, `=`) are undiscoverable |
| Flexibility and efficiency | 2 | No copy/paste, repeat-equals or history |
| Aesthetic and minimalist design | 3 | Hole between expression and long values; dark operators outshine the result |
| Error recovery | 3 | The value stayed full-strength in errors; error text shifted the keypad at 320 px |
| Help and documentation | 3 | Keyboard hint shown on touch devices |

**Assessment B: 0 findings.**

- The in-page detector ran all 61 rules with computed styles, at 1440 and 390 px, in light and dark, in the result and error states.
- The static CLI scan was degraded for `index.html` (htmlparser2, css-select, css-tree and domutils are not installed).
- The URL scan needs puppeteer, which is not installed, so it did not run.

## Audit (code-level)

| Dimension | Before | After | Notes |
|---|---|---|---|
| Accessibility | 3 | 3 | axe reports 0 violations and AA contrast holds everywhere. Not scored 4, because no real screen reader was tested |
| Performance | 4 | 4 | Only short opacity, transform and colour transitions; no `will-change`; 228 kB JS (72 kB gzipped) |
| Responsive | 3 | 4 | The 320 px layout shifts are gone; touch-aware hint, hover and placement |
| Theming | 3 | 4 | Every colour is a token. The dark operator column no longer outweighs the result |
| Implementation integrity | 4 | 4 | Coherent token system; 0 detector findings |
| **Total** | **17/20** | **19/20** | |

I did not rerun the full critique after the changes, so no "after" heuristic score is claimed.

## Changes and reasons

1. **Long numbers are sized from glyph widths** (`fitWidthEm` in `src/calculator/format.ts`). The old estimate charged every character 0.6 em. In the system font, commas and periods measure only 0.221 em and digits 0.535 em. As a result, grouped numbers filled only 66–78 % of the row. The new weights sit just above the measured widths, so other operating systems' fonts still fit. Unit tests check two things: the estimate never falls below the measured widths, and the longest possible value fits the 320 px layout at the 18 px floor. Long values now render larger: at 390 px the longest entry went from 25.8 to 29.1 px.
2. **The display is a fixed-height column with its content at the bottom.** Spare room now collects above the expression instead of between the expression and the value. The expression always rests on the number, and a shrinking value or a two-line message never moves the keypad.
3. **The expression stays on one line.** It is fit-shrunk with the same method (13–16 px). Each operator and `=` is now joined to the number before it with a non-breaking space, so in the extreme case the line wraps before the second number, never before a lone `=`.
4. **Keys typed while a request is pending are visible.** The status line now reads "Calculating… 2 keys waiting". This closes the "every state is visible" gap left by the Stage 5 typing-queue fix.
5. **In dark mode, the operators are mid-tone evergreen with ink labels** (`#335247`, 7.26:1). The pale operators were the brightest objects on screen and outshone the result. The selected-operator ring now uses ink (12.71:1 dark, 13.91:1 light) so it stays visible on the new colour.
6. **The value is muted in the error state**, as it already was while pending. The eye goes to the red message, which carries the information.
7. **The response time is hidden from screen readers.** "Answered by the server in N ms" is still shown, but it is no longer announced after every `=`. Screen readers now hear only "12 × 3 = 36."
8. **The keyboard hint was shortened to one line on desktop** ("Type to calculate: Enter for =, Esc for AC, F9 for ±"). It maps each key to its on-screen label. Each shortcut is kept on one line, and the hint is hidden on touch-only devices, where it does not apply.
9. **Touch fixes.** Hover tints only apply on devices that can hover, so a tapped key no longer stays tinted. On narrow touch screens the keypad rests at the bottom, in the thumb zone.
10. **A modest desktop scale-up.** The card goes from 380 to 416 px wide, keys from 60 to 64 px tall at viewports of 480 px and up, and the maximum value size from 56 to 64 px. On a 1440×900 screen the old card read as undersized. The new size is still well within the 380–420 px range the brief allowed.

## Considered and declined

| Suggestion | Why it was declined |
|---|---|
| Copy/paste of results, repeat-equals, history, a clear-entry key | New features, outside a polish pass |
| A Mac-friendly letter alternative for ± (F9 needs Fn on Mac laptops) | Changes the keyboard contract; listed as a known limitation |
| Rendering `e+21` as `× 10²¹` | Changes what the user can copy, for a rare case; e-notation is unambiguous |
| A 3 px focus ring | The 2 px emerald ring with 2 px offset is at least 5.9:1, which meets AA |
| An idle "Ready" cue in the status line | Adds noise to the resting state without adding information |

## Trade-offs

- The display is now about 1.4 rem taller, to reserve room for a two-line message. At idle this shows as headroom above the expression.
- At 320×640 on a desktop browser the page scrolls slightly, because the hint is still shown there. Real phones hide the hint and anchor the card to the bottom.
- The fit estimate is measured for Segoe UI and padded for other system fonts. A font much wider than these padded weights could still trigger the wrap safety net. It would not overflow the display.

## Annual Report redesign

Stage 6 left a clean but quiet interface, so the owner asked for a more recognisable identity. I proposed three directions: A "Annual Report", B "Columnar Ledger" and C "Typeset". The owner approved **A**, without the proposed double-underline animation.

### Direction

**Concept.** The result is set like the lead figure in an annual report: an evergreen display field next to a familiar keypad on paper.

**Desktop (56rem / 896 px and wider).** A split card:
- the left panel holds a visible "Calculator" masthead, with a hairline rule under it;
- the result is set at headline scale, up to 7 rem (112 px);
- the right column holds the 4×5 keypad.

**Narrower screens.** The same parts stack: an evergreen band on top, the keypad below. On touch phones the keypad rests in the thumb zone and the keyboard hint is hidden.

**Typeface: Schibsted Grotesk.**
- **Why this face:** it is a grotesk commissioned by a Scandinavian news-media group, so it suits an editorial look without the usual AI-default typefaces.
- **Packaging:** it is self-hosted as a single 46.7 kB variable WOFF2 (latin subset, weights 400–900, SIL OFL; licence in `frontend/src/assets/fonts/OFL.txt`). There is no new npm dependency and no third-party request.
- **Weights:** 800 for the title and 500 for the figure.

**Proportional figures in the display.** The display uses the font's proportional digits, not its fixed-width (tabular) ones. In this face, tabular mode also makes commas and periods as wide as a digit (0.615 em), which leaves a headline figure looking gappy. A single right-aligned figure does not need column alignment.

**Sizing.** `fitWidthEm` was re-measured for the new face. The widest digit, `0`, is 0.618 em, so the digit weight rose from 0.6 to 0.63 and the minimum figure size dropped to 17 px. Unit tests now check the estimate against glyph widths measured in both Schibsted Grotesk and the system-font fallback.

**Palette.** All text pairs pass AA:

| Element | Colour | Contrast |
|---|---|---|
| Field | `#12352C` | — |
| Figure and title on the field | `#F2F5EE` | 12.1:1 |
| Muted text on the field | `#A9C3B6` | 7.1:1 |
| Error on the field | `#FFB4A9` | 7.9:1 |
| Keypad paper | `#F1F3EE` | — |
| `=` key, light | `#0E7C57` | 5.2:1 |
| `=` key, dark | `#3AAE86` | 5.95:1 |

The evergreen field is kept in both themes.

### Focused critique and fixes (one round)

Impeccable's critique ran once as two isolated subagents.
- **Design review (A):** 31/40, up from 29/40 before the redesign. Verdict: "authored, not an AI default… distinctive and professional".
- **Detector (B):** 0 findings. The CLI scan of `index.html` was still degraded; the in-page detector ran fully at 1440 and 390 px, light and dark, in the result and error states.

The findings were fixed in a single batch:

| Finding | Fix |
|---|---|
| Decorative "settle" animation on every result | Removed, as the brief asks for no decorative animation; the colour transition and the delayed "Calculating…" remain |
| In an error, a dimmed 112 px "0" outranked the message | The figure is capped at 3 rem (4.5 rem on desktop) during an error; the message grows to 16 px (20 px on desktop) |
| Long results: the expression nearly matched the shrunken figure | The expression is capped at half the figure's size |
| Light function keys and key outlines looked faint, like disabled keys | Darker function-key fill (`#CCD5CD`) and outline (`#BFC9C2`) |
| The title did not relate to the figure; the desktop panel looked empty | A hairline rule under the title, like a report masthead (no all-caps label) |
| The selected operator turned white and read as a digit key | Its sign now uses the accent colour |
| In dark mode, the mint `=` was brighter than the result | Dark accent deepened to `#3AAE86` |
| On a 320×568 phone, the `=` row fell below the fold | A short-screen rule tightens padding, display height and key height; `=` now ends at y = 530 |

**Declined:** `×10ⁿ` notation (declined in Stage 6 as well) and listing every keyboard alias in the hint.

### API status indicator

The "Answered by the server in N ms" line under the result became a small indicator in the masthead's top-right corner. It is a dot and a label, with no animation.

**How it works.**
- It is derived only from the requests the user makes, so nothing polls the server. A page load sends no API request.
- A server that answers with an error, such as a 422 for division by zero, is still shown as online.
- Network failures, timeouts and 5xx responses count as offline. That includes the dev proxy's 502 when the Go server is stopped.

| State | Dot | Label |
|---|---|---|
| No request yet | empty ring | "Go API" |
| Request in flight | amber | "Calculating…", plus "N queued" when keys are waiting |
| Last answer succeeded | green | "Go API N ms" |
| Server answered with an error | green | "Go API online" |
| Server unreachable | coral | "Go API offline" |

**Contrast.** Every dot and label is at least 7.1:1 against the field, which is the same colour in both themes.

**Screen readers.** The status line under the figure is still the only live region. It announces progress ("Calculating… N keys waiting"), the calculation ("12 × 3 = 36.") and errors, but now shows only errors on screen.

**Layout bug found during verification.** At 320 px, "Calculating… 2 keys waiting" widened the whole card beyond the screen. Two fixes:
- the card's grid column is now `minmax(0, 1fr)`, so text can never widen it;
- the corner label uses compact wording ("2 queued") and drops to 12 px below 22 rem. At that size it measures exactly 140 px of the 140 px available.
