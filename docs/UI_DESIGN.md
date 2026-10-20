# GD Toolkit — LongVest theme

GD Toolkit now follows the established visual system of the user's LongVest project. The reference is the local LongVest UI source: `web/style.css` (the later reference-theme and Manrope rules), `web/themes.css`, `web/etf-theme.css`, and the UI-continuity convention in `AGENTS.md`. LongVest is read only during this work; no financial records, application data or credentials are needed.

## Shared visual language

The defining elements are **Manrope, cream paper, orange actions, pastel cards, dark ink borders and solid offset shadows**. The dark counterpart uses the same typography and component shapes on charcoal surfaces. This replaces the prior Buffer-inspired Garden theme.

| Role | Light | Dark |
| --- | --- | --- |
| Application ground | `#f8f7f3` | `#191a1d` |
| Sidebar | `#f3eee8` | `#202124` |
| Main surface | `#ffffff` | `#24262a` |
| Main text | `#191917` | `#f2eee6` |
| Supporting text | `#707068` | `#b4b0a7` |
| Primary action | `#ff781f` | `#ff8a38` |
| Blue card | `#e8eef9` | `#29384a` |
| Yellow card | `#fff4bf` | `#433a24` |
| Pink card | `#fce4e8` | `#452e36` |
| Mint card | `#ddf9e8` | `#253e34` |
| Ink outline | `#191917` | `#73716a` |
| Inner divider | `#deded5` | `#424347` |
| Solid shadow | `3px 4px 0 #191917` | `3px 4px 0 #090a0c` |

Manrope is bundled locally under the SIL Open Font License, using the same unmodified variable font file as LongVest. Body weight 500, prominent headings 800 and action weight 700 follow the reference. Inputs and body text remain readable at 14px, standard buttons at 13px, with tabular numeric values. Font loading does not require a network connection.

## Application mapping

- The sidebar has the reference's clear ink divider and orange active tool. The profile/banner context remains compact and distinct from task navigation.
- Task buttons are individual outlined tabs with a solid active shadow. Main actions use orange and dark text; secondary controls use paper surfaces and ink outlines.
- Panels, result cards, history cards and dialogs share the outlined paper treatment. Pastel summaries distinguish information groups. Dense tables retain subtle inner separators so a large grid does not become visually noisy.
- Forms use the shared input surface, clear outlines and restrained offset shadows. Focus is visible, labels wrap, and reduced-motion preferences are respected.
- Economy uses the same system for its canvas, toolbar, nodes, connections and Inspector. Node type colors and symbols remain meaningful; ports retain their interaction geometry and centering transform.
- User-defined tier colors and strong gold hard-pity styling remain owned by their feature styles. Series colors remain distinct in charts.
- Appearance and updates remain in General Settings. The theme previews show the actual paper/charcoal backgrounds and orange accents. No top-bar theme or update controls are restored.

`ui/studio-theme.css` is the final shared stylesheet; `ui/fonts/fonts.css` declares Manrope. CSS does not mutate configurations, history, canvas layout, scroll position or focus. Both modes preserve existing theme preferences and all tool behavior.

## Verification

Visual checks used synthetic fixtures and isolated Electron profiles under ignored `test-output`, never the installed user's data. Both themes were reviewed at 1440px and an actual 900px viewport, including Setup, Calculate, Simulate, Compare, Players, Balance, Settings, dialogs and the Economy canvas. There was no horizontal page overflow; the first Setup tree row starts near 695px at 1440 width and 702px at 900 width. The final light background was confirmed as `rgb(248, 247, 243)` after replacing inherited legacy theme aliases.

The desktop suite passed with the loaded Manrope face, theme persistence, updater interactions, selection/scroll stability and tool workflows. All 108 core tests passed. The font was checked for Vietnamese glyph coverage and actual Chromium shaping of both NFC and NFD text without fallback. Local comparison images use LongVest's actual styles with synthetic labels and numbers; the source app was never launched against personal data. Evidence is stored in ignored `test-output/longvest-*.png`. The release pipeline additionally verifies silent installation and automatic restart.
