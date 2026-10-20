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
