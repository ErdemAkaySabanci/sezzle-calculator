# AI Usage

> **Status:** written as development happens and updated at the end of each stage. The final summary and assessment are added in the documentation stage.

This project was built with an AI coding assistant working under my direction. This document records what the assistant was, which prompts I gave it (verbatim), what it did, and which decisions were mine.

## Tools

- **Assistant:** Claude Code (model: Claude Opus 5.5), running in the VS Code extension on Windows 11.
- **Agent skills actually invoked so far:**
  - Superpowers `using-superpowers`, `test-driven-development` and `verification-before-completion`.
  - Frontend Design (`frontend-design:frontend-design`).
  - Impeccable.
  - `playwright-cli`.

  The Superpowers plugin was installed but did not load at first. I ran `/reload-plugins`, and its skills were invoked only after that.

## How the work was divided

- **Me:**
  - Wrote the brief.
  - Chose between the options the assistant presented: UI model, floating-point policy and plugin handling.
  - Revised the plan: incremental commits, no AI co-author trailers, scope discipline, and loading Superpowers before coding.
  - Reviewed every stage and approved each push individually.
- **Assistant:**
  - Inspected the toolchain and proposed the architecture, API contract and staged plan.
  - Wrote the code and tests test-first, ran all checks, and reported the actual results, including limitations such as the race detector being unavailable on this machine.
  - Made commits only after each stage was verified.
  - Never pushed without my explicit approval for that commit.

## Prompt log (verbatim)

### 1. Initial brief (planning mode)

```text
You are my senior full-stack engineering partner. We are building a take-home technical assignment for Sezzle.

WORKSPACE
The project root is C:\Users\erdem\Sezzle.
Work inside this directory. Do not modify unrelated files or delete existing configurations.

IMPORTANT: START IN PLANNING MODE
Do NOT implement the application yet. First inspect the workspace, identify installed skills and available development tools, then produce a detailed implementation plan for my approval. Ask before making major architectural decisions that are not covered below.

ASSIGNMENT
Build a full-stack calculator application with a React frontend and a Go backend microservice. The React frontend must call the backend REST API to perform arithmetic calculations.

Required operations:
- Addition, subtraction, multiplication, division

Optional operations, only after mandatory requirements are complete:
- Exponentiation, square root, percentage

REQUIREMENTS
- Intuitive, responsive user interface
- Input validation and robust error handling
- Clean, idiomatic, maintainable code
- Frontend and backend unit tests
- Test coverage reports
- README documentation
- Git repository ready for submission
- AI prompt documentation

TECH STACK
- React + TypeScript + Vite
- Go with standard net/http
- Plain CSS, minimal dependencies
- Vitest + React Testing Library
- Go standard testing package
- Playwright CLI for browser verification
- Git and GitHub

ARCHITECTURE
Use a simple monorepo with frontend/ and backend/.
Separate arithmetic business logic from HTTP handlers.
Prefer POST /api/calculate, accepting an operation and operands, returning JSON.
Validate malformed JSON, missing or invalid input, division by zero, and non-finite results.
Use consistent JSON errors and appropriate HTTP status codes.
Document floating-point assumptions.
Configure local development communication without hard-coded production URLs.
Avoid unnecessary frameworks, databases, authentication, state management, or premature abstractions.

FRONTEND
Create an elegant, distinctive, premium fintech-inspired calculator.
Prioritize accessibility, usability, responsive layout, keyboard support, clear results, and useful error feedback.
Support decimal and negative inputs.
All arithmetic results must come from the Go API, not a duplicate JavaScript calculation engine.
Handle network/API failures gracefully.
Avoid excessive animations and decorative complexity.

SKILLS
Inspect which skills are installed and available.
- Superpowers: planning, TDD, debugging, verification, review
- Frontend Design: initial visual direction, if available
- Impeccable: design critique, audit, and polish
- Playwright CLI: real-browser verification

Actually invoke appropriate skills; do not merely claim to use them.
Keep the workflow proportionate to a 2–4 hour assignment.

TESTS AND VERIFICATION
Meaningful backend unit tests for required operations and edge cases.
Frontend component and interaction tests for API success/failure behavior.
Generate real, reproducible coverage results for both layers.
Run Go formatting/static checks, TypeScript build/typecheck, and frontend lint.
Verify application behavior in Chrome.
Never invent test results or coverage percentages.

DOCUMENTATION
README.md must include:
- Overview and architecture
- Stack and prerequisites
- Installation and startup commands
- API request/response examples
- Testing and coverage commands
- Validation and errors
- Design decisions and assumptions
- Tradeoffs and improvements

Create AI_USAGE.md containing prompts actually used, including this initial prompt, and an honest description of AI assistance. Never fabricate prompt history.
Configure .gitignore appropriately.
Prepare for GitHub submission, but do not push without my approval.

PRIORITIES
1. Correctness
2. Maintainability
3. Testing
4. Documentation
5. UI/UX
6. Optional features

TIME BUDGET
Keep the scope appropriate for a focused 2–4 hour take-home assignment.

YOUR FIRST RESPONSE
Do not write application code yet.
1. Inspect the workspace and toolchain.
2. Confirm installed skills.
3. Propose architecture and folder structure.
4. Define the API contract and error cases.
5. Create an implementation plan with stages and acceptance criteria.
6. Identify blockers or decisions needing attention.
7. Stop and wait for my approval.
```

While inspecting the workspace, the assistant's session was interrupted once. My follow-up message was:

```text
Retry
```

### 2. Answers to the assistant's clarifying questions

The assistant asked three multiple-choice questions. I chose:

| Question | My choice |
|---|---|
| Superpowers is installed but not loaded. How should we handle it? | Reload, then invoke |
| Calculator interaction model | Keypad calculator (immediate execution, every step is one API call) |
| Floating-point noise (0.1 + 0.2) | Raw float64 from the API, rounded to 15 significant digits for display only |

### 3. Plan revision (I rejected the first plan with this feedback)

```text
The implementation plan looks good overall. Before implementation, please update it with these decisions:

1. Go has now been installed, and the local Git repository has been initialized and connected to our public GitHub repository. Recheck the environment instead of relying on the earlier inspection.

2. We want an incremental Git workflow. After each completed and verified major stage, create a meaningful commit. Push to GitHub only when I explicitly approve that stage's push.

3. Keep the solution proportionate to Sezzle's 2–4 hour assignment. Prioritize the four required operations, robust validation, meaningful unit tests, coverage reports, documentation, and responsive UI. Avoid overengineering.

4. Do not require Co-Authored-By trailers on every commit. Document actual AI usage transparently in AI_USAGE.md.

5. Make sure the initial development focuses on the four mandatory operations. Optional operations should only be implemented if all required functionality, tests, and documentation are complete.

6. Reload Superpowers before implementation and verify that its skills are actually available.

Please update the plan accordingly. Then we can proceed with implementation.
```

The assistant's reply was cut off once mid-stream during this step. A continuation message asked it to resume from where it stopped.

### 4. Stage 1: calculator core

I ran `/reload-plugins` (output: `Reloaded: 4 plugins · 41 skills · 14 agents · 1 hook · 0 plugin LSP servers`), then sent:

```text
Plugins have been reloaded. Please check whether the Superpowers skills are now available and invoke superpowers:using-superpowers. If successful, proceed with Stage 1: implement the Go calculator core using test-driven development. Focus on the four required arithmetic operations and edge cases. Run the relevant tests and commit the verified stage. Stop before pushing and report the implementation, test results, and commit hash for my review.
```

### 5. Stage 2: HTTP API

```text
Approved. You can push commit `dbf5116` to `origin/main`.

Regarding your two questions:

1. **Race detector:** Skip `-race` locally for now. Do not install a C compiler solely for this assignment. Keep the standard Go tests and static analysis checks. Document the limitation in the README and do not claim race detection passed.

2. **Line endings:** Add a minimal `.gitattributes` file in Stage 2 to ensure consistent cross-platform line endings.

After pushing Stage 1, proceed with **Stage 2: HTTP REST API implementation** using Superpowers' test-driven-development skill.

Please ensure:
- `POST /api/calculate` supports all four required operations.
- Requests use the agreed `operation`, `a`, and `b` JSON fields.
- Input validation and consistent JSON error responses are implemented.
- Division by zero and invalid/non-finite values are handled correctly.
- HTTP handlers remain separate from calculator business logic.
- Unit tests cover successful requests, malformed JSON, invalid operations, and edge cases.
- Run formatting, tests, coverage, and static analysis.
- Keep the solution simple and maintainable.

Once Stage 2 is complete, create a meaningful commit, report the test results and coverage, and **stop before pushing** so I can review it.
```

### 6. Stage 3: frontend foundation

```text
Approved. You may push commit `63a0843` to `origin/main`.

Stage 2 looks good based on the reported test and verification results.

Please proceed with **Stage 3: React + TypeScript frontend foundation**, following the approved implementation plan.

Requirements for Stage 3:

1. Scaffold the frontend using React, TypeScript, and Vite.
2. Configure Vitest, React Testing Library, and the relevant testing environment.
3. Implement a typed API client for the Go REST API using `POST /api/calculate`.
4. Implement calculator input handling and state management without duplicating arithmetic logic in JavaScript.
5. Implement display formatting for floating-point results.
6. Configure the Vite development proxy to communicate with the Go backend.
7. Write meaningful unit tests using Superpowers' test-driven-development workflow.
8. Run linting, TypeScript checks, build, tests, and coverage.

Please also:
- Preserve the existing backend architecture.
- Keep dependencies and abstractions minimal.
- Ensure the frontend supports the agreed keypad calculator model.
- Document package-level backend coverage accurately in the final README.
- Verify that malformed or out-of-range JSON numbers are handled at the appropriate API validation layer.
- Save important AI prompts and development decisions for AI_USAGE.md.

**Do not build the polished calculator interface yet.** That belongs to Stage 4, where we will use Frontend Design and Impeccable.

After completing Stage 3, create a meaningful commit, report the actual test results and coverage, and stop before pushing so I can review the work.
```

### 7. Stage 4: calculator interface

```text
Stage 3 is approved. You may push commit `d27cf03` to `origin/main`.

Please proceed with Stage 4: Build the actual calculator user interface.

Use the installed Frontend Design skill to establish the initial design direction. Then use Impeccable for appropriate design guidance and consistency checks.

Requirements:
- Create a polished, modern, premium fintech-inspired calculator UI.
- Integrate the existing API client, reducer, and useCalculator hook.
- Ensure all arithmetic is performed by the Go backend.
- Support mouse interaction and keyboard input.
- Make the design responsive and accessible.
- Provide clear loading states and error messages.
- Preserve all existing tests and add meaningful component tests.
- Keep the frontend simple, clean, and maintainable.

Important: I want to manually test the calculator in Chrome as soon as Stage 4 is complete.

After implementing the UI:
1. Run lint, typecheck, build, and frontend tests.
2. Tell me exactly how to launch the frontend and backend locally.
3. Create a commit for Stage 4, but do not push until I approve.
4. Stop and let me manually inspect and test the application before proceeding to Stage 5.

Also, continue maintaining AI_USAGE.md incrementally. Record this prompt exactly as sent, preserve existing prompt history, and do not fabricate missing prompts.
```

Impeccable's setup asks a short product interview before any design work. The assistant asked three multiple-choice questions, and I chose:

| Question | My choice |
|---|---|
| Who should the UI be designed for first? | Reviewers, as end users |
| Should the UI carry Sezzle's brand? | Neutral, own identity |
| Which accessibility standard? | WCAG 2.2 AA |

The answers were recorded in `PRODUCT.md`.

### 8. Stage 5: browser verification and QA

```text
Stage 4 is approved. I manually tested the calculator in Chrome and confirmed that it works correctly.

You may now push commit `cfa7694` to `origin/main`.

After confirming that the push succeeded, proceed with **Stage 5: Comprehensive Browser Verification & Quality Assurance**.

### 1. Browser testing

Use the installed Playwright CLI skill to test the actual running application in Chrome, with both the React frontend and Go backend running.

Test the following scenarios:

**Arithmetic functionality**
- Addition, subtraction, multiplication, and division
- Decimal calculations (0.1 + 0.2 = 0.3 in the UI)
- Negative numbers and sign changes
- Chained operations (2 + 3 × 4 = 20)
- Repeated calculations and clearing the calculator
- Large numbers and scientific notation

**Error handling**
- Division by zero
- Recovery after an error
- Backend unavailable or stopped
- Network failures and appropriate error messages
- Prevention of duplicate requests during pending calculations

**User interactions**
- All calculator buttons
- Keyboard shortcuts and keyboard-only navigation
- Backspace, Escape, Enter, and F9
- Focus behavior and visible focus indicators
- Loading and disabled states

### 2. Responsive design

Verify the UI at multiple viewport sizes:
- Mobile: 320px and 390px
- Tablet: 768px
- Desktop: 1440px

Check for horizontal overflow, clipping, unreadable text, overlapping buttons, and broken layouts.

### 3. Accessibility

Evaluate the application against relevant WCAG 2.2 AA requirements.

Check:
- Text and control contrast
- Keyboard accessibility
- Visible focus indicators
- Accessible button names
- Screen-reader announcements for results and errors
- Reduced-motion preferences

Use automated checks where available and supplement them with manual inspection. Do not claim full WCAG compliance without sufficient verification.

### 4. Quality verification

Run all existing frontend and backend tests.

Verify:
- ESLint
- TypeScript typechecking
- Production frontend build
- Go formatting and go vet
- Backend unit tests
- Frontend unit tests
- Test coverage

Report actual results and identify any failures or limitations.

### 5. Bug fixing

If browser verification reveals genuine functional or accessibility bugs, fix them using the appropriate Superpowers debugging and TDD workflows.

Add regression tests for fixed defects.

Do not redesign the interface, introduce optional arithmetic operations, or add unrelated features in this stage. Visual refinement belongs to Stage 6.

### 6. Documentation

Update AI_USAGE.md with this prompt and the AI tools actually used during Stage 5.

Record meaningful QA findings and any known limitations for the final README.

### 7. Git workflow

If code or documentation changes are necessary, create a conventional commit for Stage 5.

Do not create an empty commit if no changes are needed.

Do not push any Stage 5 changes without my approval.

### Final report

When finished, provide:
1. Browser scenarios tested and pass/fail results
2. Screenshots or their local file locations
3. Accessibility findings
4. Bugs discovered and fixed
5. Frontend and backend test results and coverage
6. Any remaining known issues
7. Commit hash, if a commit was created

Stop after Stage 5 and wait for my review before starting Stage 6.
```

**AI tools used in Stage 5:**
- **`playwright-cli`:** drove real Chrome. It ran scripted sessions, used request routing to simulate slow and failed networks, and took screenshots.
- **axe-core 4.10.2:** loaded from cdnjs into the page at test time. It is not a project dependency.
- **Superpowers `systematic-debugging`:** used for the dropped-keystroke bug. Phase 1 was an instrumented reproduction showing keys arriving while `aria-busy=true`.
- **Superpowers `test-driven-development`:** failing regression tests were written before each fix.
- **Superpowers `verification-before-completion`:** used before the commit.

The QA results, defects and known limitations are in [`docs/qa-report.md`](docs/qa-report.md).

### 9. Stage 6: Impeccable design review and UI polish

```text
Stage 5 is approved. You may push commit `7fb3b52` to `origin/main`.

After confirming that the push succeeded, proceed with **Stage 6: Impeccable Design Review & UI/UX Polish**.

The calculator is functionally complete, manually tested, and has passed comprehensive browser QA. The goal of this stage is to improve its visual presentation and usability without compromising the existing functionality, accessibility, or test coverage.

### 1. Design audit

Use the installed Impeccable skill to conduct a structured critique and accessibility-aware design review of the existing application.

Where available, use its critique, audit, and polish workflows. If a tool is unavailable or operating in degraded mode, report that honestly.

Preserve the existing visual direction: minimalist, premium fintech-inspired design with sage neutrals and evergreen accents.

Do not redesign the application from scratch.

### 2. Areas to investigate

Evaluate and improve the following where appropriate:

- **Desktop visual balance:** The calculator currently appears relatively small on large screens. Consider a modest increase in width, approximately 380–420px, if visual testing supports it.
- **Whitespace and composition:** Improve the overall balance without introducing unnecessary decorative elements.
- **320px expression wrapping:** Fix the issue where the equals sign moves to a second line for long expressions.
- **Long-number display:** Reduce awkward empty space caused by shrinking large results.
- **Keyboard shortcut hint:** Evaluate whether the hint can be integrated more elegantly without harming discoverability.
- **Typography and hierarchy:** Ensure the result remains the visual focal point.
- **Button states:** Review hover, focus, selected-operator, loading, and error states.
- **Mobile usability:** Preserve comfortable touch targets, readable text, and zero horizontal overflow.

Treat these as design hypotheses, not mandatory changes. Explain your reasoning for each adjustment.

### 3. Design quality constraints

- Preserve the current React architecture and Go API integration.
- Do not introduce unnecessary dependencies.
- Maintain light and dark themes.
- Maintain accessibility and keyboard support.
- Respect reduced-motion settings.
- Do not add calculation history, optional arithmetic operations, or unrelated features.
- Avoid decorative animations and unnecessary visual complexity.

### 4. Visual verification

Use Playwright CLI to inspect the application at 320px, 390px, 768px, and 1440px.

Capture before-and-after screenshots where possible.

Verify that improvements work in both light and dark modes.

Check that no layout regressions, contrast issues, or keyboard interaction problems were introduced.

### 5. Testing

After making changes, rerun:

- Frontend lint
- TypeScript typecheck
- Production build
- Frontend unit tests and coverage
- Relevant browser and accessibility checks

Fix regressions before completion.

### 6. Documentation

Update AI_USAGE.md with this exact prompt and the tools actually used.

Record meaningful design decisions and tradeoffs. Preserve the existing QA report and accurate test history.

### 7. Git workflow

Create a conventional commit for verified Stage 6 changes.

Do not push the Stage 6 commit without my approval.

### Final report

Summarize:
1. Impeccable findings
2. Visual changes made and why
3. Before-and-after observations
4. Responsive and accessibility verification
5. Test results and coverage
6. Remaining design limitations
7. Commit hash

Stop after Stage 6 and wait for my review before continuing.
```

**AI tools used in Stage 6:**
- **Impeccable `critique`:** run as its workflow requires, with two isolated subagents.
  - Assessment A, the design review, read the source and took 37 live screenshots with Playwright CLI.
  - Assessment B ran the detector. The static CLI scan was degraded for `index.html` because parser modules are missing, and the URL scan needs puppeteer, which is not installed. The in-page overlay detector ran all 61 rules through Impeccable's live server and found 0 issues.
  - The snapshot was saved under `.impeccable/critique/` (gitignored) and closed after the polish pass.
- **Impeccable `audit`** (a code-level report) and **`polish`**, which read the critique snapshot and cleared all of its priority issues.
- **Impeccable design hook:** ran on every UI file edit and found nothing.
- **`playwright-cli`:**
  - before and after screenshots at 320, 390, 768 and 1440 px in light and dark;
  - glyph-width measurement of the display font;
  - a touch-emulation session using a Pixel profile;
  - the Stage 5 functional, responsive and axe suites, rerun.
- **Superpowers `test-driven-development`:** the fit-width estimate, the non-breaking expression binding and the new status behaviour were each test-first.
- **Superpowers `verification-before-completion`:** used before the commit.

The design decisions and trade-offs are recorded in [`docs/design-review.md`](docs/design-review.md).

### 10. Stage 6B direction proposal

After reviewing Stage 6 in Chrome, I asked for a stronger identity:

```text
I reviewed the current calculator UI in Chrome.

The application looks clean, but the visual changes are relatively subtle, and I want the final submission to have a more distinctive identity than a typical AI-generated calculator.

Please finish and summarize the current Stage 6 design verification first, without discarding any completed work.

Then, before making further major visual changes, propose a Stage 6B design direction focused on a distinctive **Editorial Fintech** aesthetic.

I want:
- A more recognizable visual identity
- Stronger and more intentional typography
- A more distinctive desktop composition
- A premium, product-quality appearance
- A familiar and intuitive calculator keypad
- Excellent mobile responsiveness and accessibility

Use Frontend Design for the new visual direction and Impeccable for critique and polish.

Do not modify the backend, remove existing features, or sacrifice test coverage.

Present two or three concrete design alternatives, explain their differences, and recommend one. Wait for my approval before implementing a major redesign.

Also plan a separate subsequent stage for implementing the three optional arithmetic operations: exponentiation, square root, and percentage, including backend API support, frontend integration, and unit tests.

Keep the assignment focused and avoid unnecessary complexity.
```

The assistant proposed three directions: A "Annual Report", B "Columnar Ledger" and C "Typeset". It recommended A, plus an accounting double underline borrowed from B. It also flagged that README.md was still missing and that, under my own plan rule, it should come before the optional operations.

### 11. Stage 6B: Annual Report redesign

```text
I approve pushing Stage 6 commit `aca351b` to `origin/main`.

Here are my decisions:

1. **Design direction: Option A — Annual Report.** I want the distinctive split-panel desktop layout and evergreen display area. Use Schibsted Grotesk as proposed. Keep the familiar keypad and create a cohesive mobile adaptation.

2. **No double-underline animation for now.** The new composition and typography should provide enough visual identity without additional decorative effects.

3. **Stage order approved:** Stage 6B redesign, Stage 7 README/documentation, Stage 8 optional operations, Stage 9 final verification.

4. **Percentage:** Use the binary "a percent of b" model. For example, 20% of 150 = 30. Ensure this behavior is clearly explained in the UI and README.

5. **Square root API:** Reject requests containing an unnecessary b operand with HTTP 400.

6. **Keyboard shortcuts:** Approve ^ for exponentiation, % for percentage, and @ for square root. Document these shortcuts.

Please proceed with Stage 6B after confirming the Stage 6 push succeeded.

Requirements for Stage 6B:
- Use Frontend Design to implement the Annual Report visual direction.
- Maintain all existing calculator functionality and API integration.
- Preserve accessibility, keyboard navigation, responsive behavior, and existing test coverage.
- Verify the split-panel layout at desktop sizes and the stacked layout on mobile.
- Test both light and dark themes.
- Avoid unnecessary animations and dependencies.
- Keep the design distinctive but professional and appropriate for Sezzle's technical assignment.
- Use Impeccable for a focused design critique and Playwright for browser verification.
- Time-box design exploration and avoid lengthy repeated review cycles.
- Update AI_USAGE.md with this prompt and the actual tools used.

Create a Stage 6B commit after implementation and successful verification, but do not push it without my approval.

Stop after Stage 6B and provide screenshots, test results, design decisions, and the commit hash for review.
```

**AI tools used in Stage 6B:**
- **Frontend Design (`frontend-design:frontend-design`):** set the direction's token system and checked it against the AI-default looks.
- **Impeccable:**
  - `critique`, one focused round with two isolated subagents. The design review took 14 screenshots. The detector ran the CLI scan (its `index.html` pass is still degraded) and an in-page overlay at 1440 and 390 px, light and dark, in the result and error states, finding 0 issues.
  - The design hook ran on every UI edit and found nothing.
- **`playwright-cli`:**
  - font-loading and glyph-width measurement;
  - 34 after screenshots at 5 widths in both themes, plus a 320×568 short-screen check;
  - touch emulation;
  - reruns of the functional, responsive and axe-core suites.
- **Superpowers `test-driven-development`:** test-first for the visible heading and the re-measured `fitWidthEm`.
- **Superpowers `verification-before-completion`:** used before the commit.
- **Font:** Schibsted Grotesk was downloaded from Google Fonts (SIL OFL) and self-hosted.

The design decisions are recorded in [`docs/design-review.md`](docs/design-review.md), under "Annual Report redesign".

### 12. Refinement: API status indicator

```text
Stage 6B is approved. You may push commit `aa58cdf` to `origin/main`.

The Annual Report redesign is a substantial improvement, and the verification results look good.

However, before beginning Stage 7, please check one previously requested UI refinement:

I asked to move the "Answered by the server in N ms" message away from the large result area and replace it with a small, subtle API status indicator near the upper-right corner of the evergreen display panel.

Please verify whether that change has actually been implemented.

If it has not, implement it now while preserving:
- Accurate connection, loading, and error states
- No unnecessary polling or additional API requests
- Existing accessibility announcements
- All calculation functionality
- Responsive layout in both themes
- Existing tests and coverage

Do not change the overall Annual Report design.

Run the relevant tests and browser checks after the adjustment. If changes are needed, create a separate small fix commit, but do not push it without my approval.

Then stop and report the result. We will begin Stage 7 documentation after this refinement is resolved.

Continue maintaining AI_USAGE.md with the actual prompts used.
```

The assistant searched this log and the code before acting:
- None of the prompts recorded above asks for this change, so the earlier request is not part of this session's history.
- The change was not implemented: the timing still sat under the result.

It was implemented in response to this prompt.

## Decision log

Each row notes who made the decision.

| Stage | Decision | By |
|---|---|---|
| Plan | Monorepo `backend/` and `frontend/`; arithmetic in `internal/calculator`, HTTP in `internal/api` | Brief, then proposed by the assistant |
| Plan | Request shape `{"operation","a","b"}`, chosen over an operands array because it is simpler for the four binary operations | Assistant proposed; I approved |
| Plan | 400 for invalid requests, 422 for well-formed requests with no finite answer | Assistant proposed; I approved |
| Plan | Keypad UI with immediate execution (no operator precedence) | Me (from presented options) |
| Plan | Raw float64 from the API; the UI rounds to 15 significant digits for display only | Me (from presented options) |
| Plan | Incremental commits per verified stage; push only on explicit approval; no AI co-author trailers | Me |
| 1 | `go.mod` declares `go 1.22`, the minimum needed for method-based routing, rather than the installed 1.27 | Assistant |
| 1 | The calculator core also rejects NaN/±Inf operands and normalises `-0` to `0` | Assistant |
| 1 | Skip `go test -race` locally (it needs cgo and a C compiler); document the limitation | Me |
| 2 | Add `.gitattributes` (`* text=auto eol=lf`) | Me |
| 2 | JSON 404/405 via method-less fallback routes instead of net/http plain-text defaults | Assistant |
| 2 | `ADDR` env var (default `localhost:8080`) instead of the planned `PORT`, to avoid a Windows firewall prompt on every `go run` | Assistant; reported to me |
| 2 | Out-of-range numbers such as `1e400` are rejected by the JSON decoding layer as `INVALID_JSON`. The calculator's own NaN/Inf check is a second line of defence: during TDD, before decode errors were handled, `1e400` reached the core as `+Inf` and was caught there | Assistant |
| 3 | Vite 8 template with ESLint (the template's new default is Oxlint) | Assistant |
| 3 | The reducer is pure and only records a `pending` request. A `useCalculator` hook sends it, and request ids let stale responses be ignored | Assistant |
| 3 | The API client refuses non-finite operands, because `JSON.stringify(Infinity)` would silently send `null` | Assistant |
| 3 | The Vite proxy returns **502** with an empty body when the Go server is down (observed against the real servers). The client maps any non-envelope 5xx to "service unavailable" | Assistant (verified empirically) |
| 3 | The README must report backend coverage per package, because `cmd/server` (0%) lowers the overall number | Me |
| 4 | Audience: reviewers as real end users. Neutral, unbranded identity. WCAG 2.2 AA | Me (Impeccable interview) |
| 4 | Frontend Design set the visual direction; Impeccable supplied the product interview (`PRODUCT.md`), its quality floor, and its design-detector hook. Impeccable's own concept roll, comps, and reviewer subagents were skipped, because the brief assigned direction to Frontend Design and to keep the work proportionate | Assistant (disclosed to me) |
| 4 | Visual direction: restrained cool-sage neutrals, evergreen ink, one emerald accent; system UI font with tabular figures; a single dark-mode token set; no Sezzle branding | Assistant |
| 4 | The status line shows the server round trip ("Calculating…", then "Answered by the server in N ms", or a plain-language error) to make the "no arithmetic in the browser" architecture visible | Assistant |
| 4 | Keyboard: digits, `.` or `,`, `+ - * /` (also `x`), Enter or `=`, Backspace, Esc or Delete, F9 for ±. Modified keys (Ctrl, Cmd, Alt) are left to the browser. Enter on a focused button presses that button rather than also triggering equals | Assistant |
| 4 | The selected operator is shown with `aria-pressed` and an inverted style until the second number is typed. Results and errors are announced through one `role="status"` region | Assistant |
| 4 | Error copy names the recovery step (for example "Can't divide by zero. Enter a different number.") | Assistant |
| 4 | WCAG contrast was computed for every text/background token pair in both themes: lowest text pair 5.01:1, focus ring at least 5.92:1. Impeccable's detector ran in degraded mode (its HTML/CSS parser modules are not installed), so its empty result is an undercount, not a pass | Assistant (verified) |
| 5 | Keys typed while a request is pending are queued and replayed after the result, instead of being discarded. This fixes lost keystrokes such as a fast `2+3*4⏎` showing 5. They are dropped after a failure and on AC | Assistant (bug found in browser QA) |
| 5 | The display grid items get `min-width: 0`, and the value's font-size floor drops from 1.5 rem to 1.125 rem, so the longest values fit at 320 px | Assistant (bug found in browser QA) |
| 5 | The pending value uses the muted ink colour rather than 40 % opacity (2.29:1 → 5.81:1). The value may wrap only as a safety net for text-spacing overrides | Assistant (axe finding) |
| 5 | Browser QA scripts stay outside the repository; their results are recorded in `docs/qa-report.md`. A committed end-to-end suite remains a listed improvement | Assistant |
| 6 | The value and expression are sized from measured glyph widths (`fitWidthEm`) instead of a flat 0.6 em per character | Assistant (Impeccable critique P1; measured in Chrome) |
| 6 | The display is a fixed-height, bottom-aligned column, so slack goes above the expression and the keypad never shifts | Assistant (critique P1/P2) |
| 6 | The operator and `=` are joined to the preceding number with a non-breaking space | Assistant (fixes the 320 px orphaned `=` you flagged) |
| 6 | The status line shows queued keys ("Calculating… 2 keys waiting"); the response time is shown but hidden from screen readers | Assistant (critique P1; screen-reader persona) |
| 6 | Dark-mode operators are mid-tone (`#335247`, ink labels); the selected-operator ring uses ink; the value is muted in the error state | Assistant (critique P2) |
| 6 | Card width 416 px, keys 64 px at viewports of 480 px and up, value up to 64 px | Assistant, within your 380–420 px range |
| 6 | The keyboard hint is one line, mapped to on-screen labels, and hidden on touch-only devices. Hover tints apply only on devices that hover. The keypad sits at the bottom on narrow touch screens | Assistant (critique P3; mobile persona) |
| 6 | Declined: copy/paste, repeat-equals, history, clear-entry, a Mac alternative for ±, `×10ⁿ` notation, a 3 px focus ring, an idle "Ready" cue | Assistant (features outside a polish pass, or not needed for AA) |
| 6B | The "Annual Report" direction: split evergreen field and keypad on desktop, stacked on mobile, set in Schibsted Grotesk; no double-underline animation | Me (from three proposed options) |
| 6B | Schibsted Grotesk self-hosted (46.7 kB latin variable WOFF2, OFL) instead of an npm font package or Google Fonts at runtime | Assistant |
| 6B | Proportional rather than tabular figures in the display: tabular mode makes this face's commas and periods digit-wide | Assistant (measured in Chrome) |
| 6B | `fitWidthEm` digit weight 0.6 → 0.63 and the figure's minimum size 18 → 17 px, after measuring the new face; tests now cover both fonts | Assistant (TDD; the first samples were too forgiving and were strengthened) |
| 6B | Visible "Calculator" title with a masthead rule (it replaces the visually hidden `h1`) | Assistant |
| 6B | Critique fixes: settle animation removed; error message leads; expression capped at half the figure; stronger light function keys; emerald sign on the selected operator; deeper dark `=`; short-screen rule | Assistant (Impeccable critique, one round) |
| 6B | Next stages agreed: 7 README, 8 optional operations (binary "a % of b"; √ rejects `b` with 400; keys `^`, `%`, `@`), 9 final verification | Me |
| 6B+ | The response time moves from under the result to a small API status in the masthead's top-right corner | Me |
| 6B+ | The indicator is derived only from requests the user makes, with no polling. Each state shows a dot and a label: an empty ring with "Go API" (not contacted), amber "Calculating… N queued", green "Go API N ms", green "Go API online" (the server answered with an error such as 422), red "Go API offline" (network failure, timeout or 5xx/proxy 502) | Assistant |
| 6B+ | The indicator is not a live region. The status line keeps announcing the calculation, progress and errors to screen readers, but visibly shows only errors | Assistant |
| 6B+ | The card's grid column is `minmax(0, 1fr)`, and the indicator gets compact wording and a 12 px size below 22 rem. This fixes a 320 px overflow found in the browser check | Assistant (found by verification) |
