# GD Toolkit — Garden Workspace

Design review: 20 October 2026. Garden Workspace replaces Graphite Studio with a complete visual system inspired by the current [Buffer website](https://buffer.com/) and its public product-interface images. This is an original GD Toolkit interface; no Buffer logo, screenshot or proprietary font is shipped.

## What was inspected

The public homepage HTML and its linked stylesheets were inspected, then the following actual product images were downloaded and visually reviewed:

| Primary reference | Concrete observation used in GD Toolkit |
| --- | --- |
| [Buffer homepage](https://buffer.com/) | Warm cream surfaces, dark forest-green text, fresh pale-green action/selection color, rounded controls, restrained borders and tight heading tracking. Its current palette is green/cream, rather than the older blue branding. |
| [Publish composer](https://buffer.com/img/homepage/publish-composer.webp) | A white rounded work panel, quiet borders, readable field labels and pale-green active date/time and scheduling controls. Apply this hierarchy to editable panels, selections and primary actions. |
| [Create ideas board](https://buffer.com/img/homepage/create-ideas.webp) | Warm neutral columns, white cards, a filled view switch and pastel metadata tags. Apply filled task tabs, separate summary cards and a clearer persistent tool rail. |
| [Insights](https://buffer.com/img/homepage/insights.webp) | Readable analytics groups with soft colored chart/card accents and clear typographic hierarchy. Keep dense numeric tables and charts legible without making every figure the same accent color. |

The observed CSS uses a near-white warm neutral (`hsl(40 43% 99%)`), cream neutral layers, pale green (`hsl(105 68% 77%)`) and dark green text (`hsl(176 20% 16%)`). The homepage uses Figtree and Stolzl; product Insights styling also references Inter. A live in-app browser was unavailable during this review, so observations above come from the actual downloaded public HTML/CSS and inspected image pixels, not an assumed interactive session.

The earlier Pic1s reference-directory study informed the general workflow, but the active visual direction is now the user's explicit Buffer reference. Buffer's marketing-page scale is adapted to an editor: no large promotional hero, decorative artwork or oversized navigation.

## Design system

**Garden Workspace** pairs a warm light workspace with a derived forest-green dark theme. The dark palette is our adaptation, not a claim that Buffer's site provides this dark theme. Both modes use the same hierarchy, dimensions and interactions; the user's saved theme choice is preserved.

| Role | Light | Dark |
| --- | --- | --- |
| Application ground | `#f7f7f2` | `#152b28` |
| Main surface | `#ffffff` | `#203a35` |
| Raised/context surface | `#f0f1e9` | `#29463f` |
| Divider | `#dddfd5` | `#456359` |
| Main text | `#243c37` | `#f3f5ec` |
| Supporting text | `#647169` | `#bdcdc0` |
| Primary-action fill | `#b1e995` | `#b1e995` |
| Primary-action text | `#203d30` | `#203d30` |
| Selected surface | `#e1f2d6` | `#33533c` |

- **Typography:** bundled Inter Variable, body/inputs 14px, normal controls 13px, panel titles 16–18px, page headings 28px. Inter supports the full Vietnamese character set and is licensed under the SIL Open Font License. It avoids mixing a Latin-only font with Vietnamese fallback glyphs. Dense tree toolbars use 12px, with smaller secondary metadata where needed. Numeric values use tabular figures.
- **Navigation:** a soft persistent rail with a pale-green filled active tool; a compact profile/banner context strip; rounded segmented task tabs. Economy retains distinct task tabs and Canvas/Table view controls.
- **Panels and summaries:** rounded 13px cards, separated pastel summary cards, 9px buttons and 8px inputs, consistent readable title/label spacing, restrained borders and shadow. Long forms remain structured into sections.
- **Canvas:** cream/forest graph ground with a functional alignment grid, distinct resource/source/drain/crafting colors, rounded node cards, an adjacent property inspector and compact zoom controls. Node ports retain their own hit geometry and connector behavior.
- **Settings:** appearance, updates, randomness and data are explicit sections. Light/dark previews show their actual colors with a visible selected border. Update status/actions are inline rather than an extra top-level pop-up.
- **Meaningful color:** hard-pity gold highlighting and user-selected item-tier colors remain intact. Resource, source, drain and crafting nodes keep distinct colors plus labels and symbols. Multi-series chart colors are not flattened into the green brand accent.
- **States:** keyboard focus remains visible, selected controls have fill/border cues, disabled controls remain distinguishable, and reduced-motion preference is respected. CSS does not change focus, scroll position or saved application data.

The main/supporting text contrast against the main surface is approximately 11.82/5.11 in light mode and 11.11/7.37 in dark mode. Primary-action text against its pale-green fill is 8.44. These are checks of these token pairs, not a complete accessibility audit.

## Implementation and verification

`ui/studio-theme.css` retains its filename for compatibility but is fully rewritten for Garden Workspace. It loads after feature styles; `ui/fonts/fonts.css` supplies the local Inter font. Original feature styles continue to own semantic pity/tier behavior and node-port geometry. Settings interactions remain in `ui/settings.mjs`.

Visual verification uses an isolated Electron profile at `test-output/garden-preview-profile`, never the installed user's data. Actual 1440px and 900px viewport renders were reviewed in both themes; the test explicitly lowers the preview window minimum so the 900px result is not silently clamped. There is no horizontal page overflow. The first setup tree row starts at about 683px at 1440 width and 691px at 900 width, keeping editable content within a 960px preview. Inter was verified loaded in both modes.

Both themes were also reviewed on the Economy canvas and Settings. Canvas-port dimensions remain 27×32px with transparent hit areas and the required vertical-centering transform; zoom buttons remain compact. Local evidence is in ignored `test-output/garden-*.png` and `test-output/buffer-*.webp`; reference images are not application assets.
