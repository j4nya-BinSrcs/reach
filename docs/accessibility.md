# REACH — Accessibility

Accessibility (a11y) expectations and current patterns for the REACH web
UI (`apps/client`). REACH v0.1 is a research workspace prototype; this
document records **what is already implemented**, **targets**, and
**known gaps**.

Related: [SRS.md](SRS.md) · [development.md](development.md) · [limitations.md](limitations.md).

## 1. Goals

| Priority | Goal |
| --- | --- |
| P0 | Keyboard operation of primary research flows (submit, navigate history, open session, expand sources, star/save) |
| P0 | Meaningful names for icon-only controls (`aria-label`, `aria-pressed`) |
| P1 | Status and progress announced or exposed to assistive tech (`role="status"`, progress semantics) |
| P1 | External links disclose new-tab behavior |
| P2 | Consistent focus visibility and heading hierarchy |
| P2 | Reduced-motion respect where intentional animations exist |

Target reference: **WCAG 2.2 Level AA** as an aspiration for interactive
surfaces; v0.1 does not claim certified conformance.

## 2. Current patterns (implemented)

Patterns observed in the React UI:

### Controls & icons

- Icon-only buttons use `aria-label` (e.g. star, save, summarize, clear tag).
- Toggle controls expose `aria-pressed` (starred/saved, filter chips).
- Decorative icons use `aria-hidden="true"`.
- Expand/collapse uses `aria-expanded` where applicable.

### Progress & status

- Research progress steps are grouped with an accessible label
  (`aria-label="Research progress steps"`).
- Relevance is exposed as `role="meter"` with `aria-valuenow` /
  `aria-valuemin` / `aria-valuemax` / `aria-label`.
- Common states use `role="alert"` or `role="status"` in error/loading
  components where present.

### Navigation & landmarks

- Home sections label major regions (`How REACH works`, `Recent research`).
- Session history list items convey status with text + icons (icons hidden
  from AT trees when decorative).

### Links

- `ExternalLink` announces that the destination opens in a new tab
  (accessible name includes that cue).

### Forms

- Tag and note inputs carry `aria-label`s when visible labels are compact.
- Objective entry should remain associated with a visible label or
  accessible name (keep this intact when restyling).

## 3. Keyboard expectations

| Flow | Expectation |
| --- | --- |
| Home objective | Focusable textarea/input; submit via button or Enter (as implemented) |
| History list | Each session is a focusable link/control to `/research/:id` |
| Source cards | Star/save/summarize reachable without pointer; expand toggle keyboard-activable |
| Comparison | Source selectors and compare action operable via keyboard |
| Workspace filters | Filter chips toggled with keyboard (`aria-pressed`) |

Tab order should follow visual reading order. Avoid `tabIndex > 0`.

## 4. Color & contrast

- Prefer CSS variables from the app theme (`--text-*`, semantic status
  colors) rather than hard-coded low-contrast grays for critical text.
- Do not convey status by color alone — pair with text or icons that have
  accessible names (complete / failed / partial retrieval already do this
  in source cards).
- When changing the visual system, re-check contrast for body text, links,
  and disabled controls against WCAG AA (4.5:1 normal text, 3:1 large/UI).

## 5. Motion

- Use motion for hierarchy/presence, not essential information.
- Prefer `prefers-reduced-motion: reduce` to dampen non-essential
  transitions when adding new animations.
- Progress must remain understandable with motion disabled (text status +
  percent/message from the API).

## 6. Content & language

- Error and empty states must be plain language (already patterned via
  `ErrorState` / `EmptyState` / `LoadingState`).
- Open questions are framed as questions, not as product failures
  (product copy rule; aids cognitive clarity).
- Avoid relying on placeholder-only instructions for required fields.

## 7. Testing checklist (manual)

Before releasing UI changes that touch interaction:

- [ ] Keyboard-only pass on Home → start → progress → session
- [ ] Screen reader spot-check (VoiceOver/NVDA/Orca): star/save names, progress, external link cue
- [ ] Zoom 200%: primary layout remains usable without clipping critical controls
- [ ] Forced colors / high contrast (where available): controls still identifiable
- [ ] No keyboard traps in modals/panels if introduced

Automated: oxlint/build do **not** replace a11y review. Consider adding
eslint-plugin-jsx-a11y or axe CI in a later milestone.

## 8. Known gaps (v0.1)

| Gap | Notes |
| --- | --- |
| No formal WCAG audit | Prototype; treat AA as target, not certification |
| Limited live-region strategy | Long polls may not announce every progress tick |
| Focus management on route change | May need explicit focus move to main heading on `/research/:id` |
| Modal summarize UX | If a modal/dialog is added, requires focus trap + `role="dialog"` + Esc |
| Skip link | No “skip to main content” control yet |
| i18n / RTL | English-only; RTL not validated |
| Automated a11y CI | Not configured |

## 9. Guidance for new components

1. Prefer native elements (`button`, `a`, `input`) over clickable `div`s.
2. Every icon-only control needs an accessible name.
3. Expose expansion and pressed state to AT.
4. Keep heading levels sequential within a page.
5. Pair status colors with text.
6. Document any intentional exception in this file.

## 10. Ownership

Frontend changes that alter interaction affordances should update this
document and the accessibility requirements in [SRS.md](SRS.md) when the
normative bar moves.
