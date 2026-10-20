# GD Toolkit — Graphite Studio

Design review: 20 October 2026. This is an original UI theme for a Windows game-design workbench. Reference sites were used to study hierarchy and interaction patterns; their logos, screenshots and proprietary assets are not bundled in the application.

## Reference research

The starting directory was [Pic1s: 9 Trang Web Thiết Kế UI/UX](https://pic1s.com/blog/9-trang-web-thiet-ke-ui-ux-hang-dau-ban-nen-biet-23). The useful references were evaluated for a dense desktop editor, rather than copied as landing-page styling.

| Reference inspected | Observation and decision |
| --- | --- |
| [Dark Mode Design](https://www.darkmodedesign.com/) and its linked [ToDowl](https://todowl.com/) example | Inspected the gallery visually, then ToDowl's interactive Board preview in both light and dark themes. Its workspace separates persistent navigation, board/list views and content. Adopt a persistent tool rail, quiet neutral layers and a clear active state; reserve saturated color for actions and meaning. Use lighter graphite layers than the almost-black preview so numeric fields, connectors and dense labels remain visible. |
| [Lookup navigation examples](https://lookup.design/search?query=navigation) | Inspected the component search and navigation examples indexed for Linear, Mixpanel, Voiceflow, Airtable and others. This reinforces choosing a familiar navigation pattern before decoration. Some enlarged image assets did not load, so those unavailable details were not treated as visual evidence. Apply one stable left rail, restrained tab underlines and a compact profile/banner context strip. |
| [Mobbin](https://mobbin.com/) | Inspected the live gallery and visible real-app onboarding examples; checked its separate Screens, Flows and UI Elements categories and publicly listed dashboard references. The dashboard image endpoint for Linear was blocked in this environment. Use task context and controls close to the relevant content; do not claim to have copied or inspected that unavailable dashboard. |
| [Page Flows: Productboard CSV import](https://pageflows.com/post/desktop-web/csv-import/product-board/) and [Notion document creation](https://pageflows.com/post/desktop-web/creating-a-document/notion/) | Search-indexed step lists expose the progression from a creation action to an editor and subsequent changes. Direct page access returned HTTP 403. Apply the general interaction lesson: create a model, edit it, then run/analyze; distinguish the Canvas/Form view switch from the Design/Results/History task switch. No protected screenshot or flow was accessed. |
| [Chamjo](https://chamjo.design/) | Reviewed the public description of regional real-app screens and flows. Its current focus is local UX research; the Pic1s description should not be interpreted as a promise of an animation kit. Keep Vietnamese instructions, explicit action labels and recognizable controls. |
| [Appshot Gallery](https://www.appshot.gallery/) | Inspected its Functional, Minimalist, Dark Mode, tone-of-voice and color filters. This is primarily an App Store screenshot collection. Reject the large advertising compositions for the workbench; use compact headings and content-first panels. Its Dark Mode category link returned 404 during the review. |

CodeSandbox is a prototyping/development environment, not the neumorphism generator implied by the duplicated entry in the source article. Pattern backgrounds and promotional artwork are deliberately not part of the theme; the only pattern is the functional canvas alignment grid.

## Selected direction

**Graphite Studio:** neutral graphite backgrounds, a restrained teal interaction color, a clear density hierarchy, and semantic node colors. This is appropriate for long editing sessions with a canvas, nested gacha trees, probability charts and data tables. The light theme uses the same hierarchy and spacing with white/pale-slate surfaces. It is a counterpart of the same theme, not a separate visual design.

| Role | Dark | Light |
| --- | --- | --- |
| Application ground | `#101316` | `#f3f6f8` |
| Main surface | `#171c20` | `#ffffff` |
| Raised/context surface | `#20272d` | `#edf2f5` |
| Divider | `#303b43` | `#d7e0e5` |
| Main text | `#edf3f6` | `#1c2a32` |
| Supporting text | `#9caeb9` | `#596e7a` |
| Interaction accent | `#62dbc4` | `#087e70` |
| Selected surface | `#183b35` | `#e0f2ec` |

Resource/source/drain/crafting nodes use blue/teal/rose/amber with labels and distinct symbols, so color is supplementary. Hard pity keeps its strong gold badge and tinted row, and item tier colors remain user-controlled.

## Implementation contract

- `ui/studio-theme.css` is the last stylesheet and provides the shared color/spacing/control system. Existing CSS continues to own feature layout and semantic pity/tier styling.
- The sidebar identifies the tool. The context strip identifies the profile/banner. Underlined Gacha tabs select tasks. Economy uses separate task and view switches, with actions on the canvas toolbar and properties beside the selection.
- No marketing hero or decorative gradients. Heading 24px, body and inputs 13px, key controls 12px; dense toolbar actions/supporting text may be 10–11px. Numeric columns use tabular figures.
- Base controls have 5–7px corners and visible borders, selected states include a border/underline, and keyboard focus has a 2px accent outline. Canvas ports keep their own geometry and hit targets.
- Dark primary/supporting/accent text against the panel has approximately 15.3/7.5/10.2 contrast; light equivalents exceed 4.5. These are token checks, not a claim of a complete accessibility audit.
- Theme preference, data persistence and scroll/focus restoration are unchanged. Styles do not set focus or scroll positions.
- Respect `prefers-reduced-motion`; no decorative motion or blurred translucent work surfaces.

## Visual verification

Reviewed isolated Electron renders at 1440px and 900px, in both dark and light themes. The workspace used `test-output/studio-preview-profile`, never the installed user's data. Verified no horizontal page overflow, readable profile/tree/inspector controls, consistent surfaces, and the Economy canvas in both themes. Screenshots are generated locally under `test-output/studio-*.png` and are not shipped.
