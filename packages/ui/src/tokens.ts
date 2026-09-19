/** Design-token metadata for documentation (Storybook Foundations).
 *
 *  Values are NEVER stored here — they render live from the CSS custom
 *  properties in styles/globals.css. This file only records what each token
 *  is FOR, plus the name it carries in the Figma variable collection, so the
 *  two sides can be diffed by name.
 *
 *  Point `figma` at your own collection: the strings must match Figma
 *  byte-for-byte, since name-matching is what makes the sync work. A name is
 *  only unique within a collection, so every group also declares which
 *  `collection` its names resolve against — without that, `Border/Selected
 *  Border` is ambiguous between a colour and a border width.
 *
 *  Tokens that exist only in Figma are listed in FIGMA_ONLY_VARIABLES, so
 *  drift in that direction is recorded rather than invisible.
 *
 *  Component variant-prop convention for anything you add on top:
 *  - `tone`    = semantic color intent: `neutral` | `info` | `warning` | `positive`
 *  - `variant` = structural appearance, e.g. `card` | `surface` | `ghost`
 *  shadcn primitives keep their upstream `variant`s. Props like `status` or
 *  `layout` name genuinely different concepts and are not appearance variants.
 */
export type TokenKind = "color" | "size" | "radius" | "font"

/** The Figma variable collection a group's `figma` names live in. Required
 *  because a name is only unique WITHIN a collection — `Border/Selected Border`
 *  legitimately exists in both `Color` (a colour) and `Dimensions` (a width). */
export type FigmaCollection = "Color" | "Dimensions" | "Fonts"

export type TokenMeta = {
  /** CSS custom property, without leading -- */
  cssVar: string
  /** Name in the Figma variable collection. Omitted when the token exists in
   *  code only — see FIGMA_ONLY_VARIABLES for the reverse case. */
  figma?: string
  usage: string
}

export type TokenGroup = {
  title: string
  kind: TokenKind
  /** Which Figma collection `figma` names in this group resolve against. */
  collection: FigmaCollection
  tokens: TokenMeta[]
}

// `figma` names mirror the Figma variable collection EXACTLY. Keep them
// byte-identical to Figma: name-matching breaks if they diverge.
export const SEMANTIC_COLOR_GROUPS: TokenGroup[] = [
  { title: "Surface", kind: "color", collection: "Color", tokens: [
    { cssVar: "surface-page", figma: "Surface/Page Background", usage: "App/page background" },
    { cssVar: "surface-header", figma: "Surface/Header", usage: "Header bars" },
    { cssVar: "surface", figma: "Surface/Surface", usage: "Default raised surface" },
    { cssVar: "surface-card", figma: "Surface/Surface Card", usage: "Cards" },
    { cssVar: "surface-input", figma: "Surface/Surface Input", usage: "Input fields" },
    { cssVar: "surface-popover", figma: "Surface/Surface Popover", usage: "Popovers, dialogs, menus" },
    { cssVar: "surface-hover", figma: "Surface/Surface Hover", usage: "Menu/list item hover scrim (translucent)" },
    { cssVar: "surface-secondary", figma: "Surface/Surface Secondary", usage: "Muted / secondary surfaces" },
    { cssVar: "surface-tertiary", figma: "Surface/Surface Tertiary", usage: "Deeper muted surfaces" },
    { cssVar: "surface-tooltip", figma: "Surface/Tooltip", usage: "Tooltip chip (constant dark)" },
    { cssVar: "surface-sidebar", figma: "Sidebar/Sidebar", usage: "Sidebar panel background" },
  ]},
  { title: "Text", kind: "color", collection: "Color", tokens: [
    { cssVar: "text-primary", figma: "Text/Text Primary", usage: "Default text" },
    { cssVar: "text-secondary", figma: "Text/Text Secondary", usage: "Supporting / helper text" },
    { cssVar: "text-tertiary", figma: "Text/Text Tertiary", usage: "Least-prominent text" },
    { cssVar: "text-inverted", figma: "Text/Text Inverted", usage: "Text on dark/inverse surfaces" },
    { cssVar: "text-popover", figma: "Text/Text Popover", usage: "Text inside popovers" },
    { cssVar: "text-accent", figma: "Text/Text Accent", usage: "Accent text" },
    { cssVar: "text-on-accent", usage: "Label on an accent fill (primary buttons, sidebar active item)" },
    { cssVar: "text-disabled", figma: "Text/Text Disabled", usage: "Disabled labels" },
    { cssVar: "text-destructive", figma: "Text/Text Destructive", usage: "Error text" },
  ]},
  { title: "Icon", kind: "color", collection: "Color", tokens: [
    { cssVar: "icon-primary", figma: "Icon/Icon Primary", usage: "Default icons" },
    { cssVar: "icon-secondary", figma: "Icon/Icon Secondary", usage: "Muted icons" },
    { cssVar: "icon-accent", figma: "Icon/Icon Accent", usage: "Accent icons" },
    { cssVar: "icon-inverted", figma: "Icon/Icon Inverted", usage: "Icons on inverse surfaces" },
    { cssVar: "icon-destructive", figma: "Icon/Icon Destructive", usage: "Error icons" },
  ]},
  { title: "Button", kind: "color", collection: "Color", tokens: [
    { cssVar: "button-primary", figma: "Button/Button Primary", usage: "Primary button fill" },
    { cssVar: "button-secondary", figma: "Button/Button Secondary", usage: "Secondary button fill" },
    { cssVar: "button-tertiary", figma: "Button/Button Tertiary", usage: "Tertiary (transparent) fill" },
    { cssVar: "button-tertiary-foreground", figma: "Button/Button Tertiary Foreground", usage: "Tertiary button label" },
    { cssVar: "button-destructive", figma: "Button/Button Destructive", usage: "Destructive button fill" },
    { cssVar: "button-select-state", figma: "Button/Select State", usage: "Selected control highlight" },
  ]},
  { title: "Accent", kind: "color", collection: "Color", tokens: [
    { cssVar: "secondary-accent", figma: "Accent/Secondary Accent", usage: "Soft accent SURFACE (neutral tint)" },
    { cssVar: "accent-color", figma: "Accent/Accent Color", usage: "Neutral strong accent" },
    { cssVar: "accent-bold", figma: "Accent/Accent Bold", usage: "Bold accent (light); neutral in dark" },
    { cssVar: "accent-secondary", figma: "Accent/Accent Secondary", usage: "Warm amber accent (NOT the soft surface)" },
    { cssVar: "accent-info", figma: "Accent/Accent Info", usage: "Informational blue" },
    { cssVar: "accent-critical", figma: "Accent/Accent Critical", usage: "Critical red" },
    { cssVar: "accent-alert", figma: "Accent/Accent Alert", usage: "Alert orange" },
  ]},
  { title: "Border", kind: "color", collection: "Color", tokens: [
    { cssVar: "border", figma: "Border/border", usage: "Default borders (also shadcn --border)" },
    { cssVar: "border-hover", figma: "Border/border hover", usage: "Hovered borders" },
    { cssVar: "input", figma: "Border/input", usage: "Input borders (also shadcn --input)" },
    { cssVar: "border-focus-ring", figma: "Border/Focus Ring", usage: "Focus rings (shadcn --ring)" },
    { cssVar: "border-selected", figma: "Border/Selected Border", usage: "Selected-state borders (accent light, sky/600 dark)" },
  ]},
  { title: "Charts", kind: "color", collection: "Color", tokens: [
    { cssVar: "chart-1", figma: "Charts/chart-1", usage: "Series 1 (blue/500)" },
    { cssVar: "chart-2", figma: "Charts/chart-2", usage: "Series 2 (sky/500)" },
    { cssVar: "chart-3", figma: "Charts/chart-3", usage: "Series 3 (teal/500)" },
    { cssVar: "chart-4", figma: "Charts/chart-4", usage: "Series 4 (violet/500)" },
    { cssVar: "chart-5", figma: "Charts/chart-5", usage: "Series 5 (pink/500)" },
  ]},
  { title: "Status", kind: "color", collection: "Color", tokens: [
    { cssVar: "status-approved", figma: "Status/Status Approved", usage: "Approved" },
    { cssVar: "status-pending", figma: "Status/Status Pending", usage: "Pending review" },
    { cssVar: "status-action", figma: "Status/Status Action", usage: "Action needed (= --required)" },
    { cssVar: "status-rejected", figma: "Status/Status Rejected", usage: "Rejected" },
    { cssVar: "status-expired", figma: "Status/Status Expired", usage: "Expired" },
    { cssVar: "status-draft", figma: "Status/Status Draft", usage: "Draft chip surface" },
    { cssVar: "status-approved-soft", figma: "Status/Status Approved Soft", usage: "Approved chip/callout fill" },
    { cssVar: "status-approved-border", figma: "Status/Status Approved Border", usage: "Approved chip/callout border" },
    { cssVar: "status-pending-soft", figma: "Status/Status Pending Soft", usage: "Pending chip/callout fill" },
    { cssVar: "status-pending-border", figma: "Status/Status Pending Border", usage: "Pending chip/callout border" },
    { cssVar: "status-action-soft", figma: "Status/Status Action Soft", usage: "Action-needed chip/callout fill" },
    { cssVar: "status-action-border", figma: "Status/Status Action Border", usage: "Action-needed chip/callout border" },
  ]},
]

/** shadcn compatibility aliases (Layer 3) — documented so the mapping isn't tribal knowledge.
 *  A few aliases hold a literal value because Layer 2 has no equivalent; those
 *  carry a `note` instead of a `target`. */
export const SHADCN_ALIASES: { cssVar: string; target?: string; note?: string }[] = [
  { cssVar: "accent-foreground", note: "literal — no Layer 2 source (label on an accent fill)" },
  { cssVar: "background", target: "surface-page" },
  { cssVar: "foreground", target: "text-primary" },
  { cssVar: "card", target: "surface-card" },
  { cssVar: "card-foreground", target: "text-primary" },
  { cssVar: "popover", target: "surface-popover" },
  { cssVar: "popover-foreground", target: "text-popover" },
  { cssVar: "primary", target: "button-primary" },
  { cssVar: "secondary", target: "button-secondary" },
  { cssVar: "muted", target: "surface-secondary" },
  { cssVar: "muted-foreground", target: "text-secondary" },
  { cssVar: "accent", target: "button-primary" },
  { cssVar: "destructive", target: "button-destructive" },
  { cssVar: "ring", target: "border-focus-ring" },
  { cssVar: "required", target: "status-action" },
]

export const RADIUS_GROUP: TokenGroup = {
  title: "Radius", kind: "radius", collection: "Dimensions", tokens: [
    { cssVar: "radius-button", figma: "Radius/Button Radius", usage: "Buttons, inputs, menus (rounded-lg)" },
    { cssVar: "radius-control", figma: "Radius/Control Corner Radius", usage: "Small controls" },
    { cssVar: "radius-card", figma: "Radius/Card Radius", usage: "Cards (rounded-xl)" },
    { cssVar: "radius-popup", figma: "Radius/Popup Corner Radius", usage: "Dialogs (rounded-2xl)" },
    { cssVar: "radius-rounded", figma: "Radius/Rounded", usage: "Pills / fully rounded" },
    { cssVar: "radius-none", figma: "Radius/No Corners", usage: "Square corners" },
  ],
}

export const SIZE_GROUPS: TokenGroup[] = [
  { title: "Space", kind: "size", collection: "Dimensions", tokens: [
    { cssVar: "space-hairline", figma: "Space/Hairline 2", usage: "Hairline gaps" },
    { cssVar: "space-micro", figma: "Space/Micro 4", usage: "Micro gaps" },
    { cssVar: "space-tiny", figma: "Space/Tiny 6", usage: "Tiny gaps" },
    { cssVar: "space-between-small", figma: "Space/Between Elements Small 8", usage: "Tight gaps" },
    { cssVar: "space-between", figma: "Space/Between Elements 12", usage: "Default gaps" },
    { cssVar: "space-vertical", figma: "Space/Vertical Space", usage: "Vertical rhythm" },
    { cssVar: "space-section-vert", figma: "Space/Section Vert Margin", usage: "Section spacing" },
    { cssVar: "space-title-hero", figma: "Space/Title Hero Spacing", usage: "Hero title gap" },
    { cssVar: "space-hero-margin", figma: "Space/Hero Margin", usage: "Hero margins" },
  ]},
  { title: "Control", kind: "size", collection: "Dimensions", tokens: [
    { cssVar: "button-height-small", figma: "Button/Button Small", usage: "Small button (h-7)" },
    { cssVar: "button-height-normal", figma: "Button/Button Normal", usage: "Normal button (h-8, = control default)" },
    { cssVar: "button-height-big", figma: "Button/Button Big", usage: "Big button (h-10, = control big)" },
    { cssVar: "button-big-margin", figma: "Button/Big Button Margin", usage: "Big button inner margin" },
    { cssVar: "control-height-default", figma: "Control/Control Height Default", usage: "Default control (h-8)" },
    { cssVar: "control-height-big", figma: "Control/Control Height Big", usage: "Big control (h-10)" },
    { cssVar: "control-header-nav", figma: "Control/Header Navigation", usage: "Header nav height" },
    { cssVar: "control-height-mega", figma: "Control/Control Mega", usage: "Mega control / hero input" },
    { cssVar: "control-input-max", figma: "Control/Input Width Max", usage: "Max input width" },
    { cssVar: "control-margin", figma: "Control/Control Margin", usage: "Control inner margin" },
    { cssVar: "control-button-margin", figma: "Control/Button Margin", usage: "Button inner margin" },
    { cssVar: "control-popup-margin", figma: "Control/Popup Margin", usage: "Dialog padding" },
  ]},
  { title: "Card & Table", kind: "size", collection: "Dimensions", tokens: [
    { cssVar: "card-margin", figma: "Card/Card Margin", usage: "Card padding" },
    { cssVar: "card-list-spacing", figma: "Card/List Spacing", usage: "List row gap in cards" },
    { cssVar: "table-line-normal", figma: "Table Line/Table Line Normal", usage: "Table row height" },
    { cssVar: "table-line-big", figma: "Table Line/Table Line Big", usage: "Big table row height" },
  ]},
  { title: "Icons", kind: "size", collection: "Dimensions", tokens: [
    { cssVar: "icon-tiny", figma: "Icons/Icon Tiny", usage: "16px inline icons" },
    { cssVar: "icon-small", figma: "Icons/Icon Small", usage: "20px icons" },
    { cssVar: "icon-medium", figma: "Icons/Icon Medium", usage: "24px icons" },
    { cssVar: "icon-hero", figma: "Icons/Icon Hero", usage: "40px hero icons" },
  ]},
  { title: "Border widths", kind: "size", collection: "Dimensions", tokens: [
    { cssVar: "border-width-default", figma: "Border/Border", usage: "Hairlines" },
    { cssVar: "border-width-selected", figma: "Border/Selected Border", usage: "Selected outline" },
    { cssVar: "icon-stroke-small", figma: "Border/Icon Stroke Small", usage: "Icon stroke 1" },
    { cssVar: "icon-stroke-bold", figma: "Border/Icon Stroke Bold", usage: "Icon stroke 2" },
    { cssVar: "icon-stroke-hero", figma: "Border/Icon Stroke Hero", usage: "Icon stroke 3" },
  ]},
  { title: "Page", kind: "size", collection: "Dimensions", tokens: [
    { cssVar: "page-form-width", figma: "Page/Form Width", usage: "Form column width" },
    { cssVar: "page-sheet-width", figma: "Page/Big Sheet Width", usage: "Big sheet width" },
  ]},
]

/** Size tokens present in styles/globals.css but not yet mapped to a Figma
 *  variable name. Add entries here as you introduce tokens ahead of Figma. */
export const UNMAPPED_SIZE_TOKENS: { cssVar: string; usage: string }[] = []

/** The same, for colour: tokens code has that Figma does not yet. This is the
 *  OTHER direction of drift, and it needs recording for the same reason the
 *  Figma-only list does — the difference is that closing these is a Figma
 *  chore, not a code decision. */
export const UNMAPPED_COLOR_TOKENS: { cssVar: string; usage: string }[] = [
  {
    cssVar: "text-on-accent",
    usage:
      "Label on an accent fill. Create in Figma as Text/Text On Accent. Distinct from Text/Text Inverted, whose dark value follows the ink ramp (#09090b) rather than the accent's (#171717)",
  },
]

/** What a gap MEANS. Recording the reason as prose was not enough: "Tailwind
 *  owns breakpoints, deliberately" and "nobody has decided this yet" rendered
 *  as the same grey row, so the list read as 25 units of debt when most of it
 *  was settled policy. A list that cannot separate the two becomes wallpaper,
 *  which is exactly what happened between 2026-07-28 and 2026-08-10. */
export type DriftStatus =
  /** Figma-only on purpose. The concept belongs to Figma, Tailwind or the
   *  consuming app, and code is never going to carry it. Not debt — the
   *  `note` says who owns it instead. */
  | "by-design"
  /** A duplicate or superseded name. The fix is in Figma (delete it, or alias
   *  it to the variable code actually mirrors), never a new code token. */
  | "delete-in-figma"
  /** Genuinely open. Someone has to choose adopt-or-drop; until they do this
   *  is the only category that should feel uncomfortable. */
  | "undecided"

/** The reverse drift: variables that exist in the Figma file but have no
 *  counterpart in globals.css. Recorded so the gap is visible rather than
 *  silent. Verified against the live file 2026-07-28; triaged 2026-08-10.
 *
 *  Direction of travel matters: code → Figma matches except for the entries in
 *  UNMAPPED_COLOR_TOKENS / UNMAPPED_SIZE_TOKENS, which are tokens introduced
 *  ahead of Figma. It is Figma → code that has the holes below. */
export const FIGMA_ONLY_VARIABLES: {
  figma: string
  collection: FigmaCollection
  status: DriftStatus
  note: string
}[] = [
  // The sidebar set. `Sidebar/Sidebar` is NOT here any more — it became
  // --surface-sidebar (see the Surface group). The remaining seven are Layer 3
  // shadcn aliases: they resolve to Layer 2 tokens that already carry their own
  // Figma names, so mirroring them again in tokens.ts would document the alias
  // layer twice. The note records what each one lands on.
  { figma: "Sidebar/Sidebar Foreground", collection: "Color", status: "by-design", note: "--sidebar-foreground → --text-primary" },
  { figma: "Sidebar/Sidebar Primary", collection: "Color", status: "by-design", note: "--sidebar-primary → --button-primary" },
  { figma: "Sidebar/Sidebar Primary Foreground", collection: "Color", status: "by-design", note: "--sidebar-primary-foreground → --text-on-accent" },
  { figma: "Sidebar/Sidebar Accent", collection: "Color", status: "by-design", note: "--sidebar-accent → --secondary-accent" },
  { figma: "Sidebar/Sidebar Accent Foreground", collection: "Color", status: "by-design", note: "--sidebar-accent-foreground → --accent-color" },
  { figma: "Sidebar/Sidebar Border", collection: "Color", status: "by-design", note: "--sidebar-border → --border" },
  { figma: "Sidebar/Sidebar Ring", collection: "Color", status: "by-design", note: "--sidebar-ring → --border-focus-ring" },
  // Categorical chip colours. The old note claimed chart-* covered these; it
  // does not — chart-1..5 are blue/sky/teal/violet/pink, so amber and green
  // have no equivalent at all. Adopt as tokens or drop from Figma.
  { figma: "Chips/Chip Amber", collection: "Color", status: "undecided", note: "no code token; chart-* is blue/sky/teal/violet/pink, so amber is uncovered" },
  { figma: "Chips/Chip Blue", collection: "Color", status: "undecided", note: "closest is --chart-1, but the chips are a separate palette" },
  { figma: "Chips/Chip Green", collection: "Color", status: "undecided", note: "uncovered by chart-*" },
  { figma: "Chips/Chip Purple", collection: "Color", status: "undecided", note: "closest is --chart-4" },
  // Names code deliberately consolidated away from. The fix is in Figma.
  { figma: "Border/Divider Soft", collection: "Color", status: "delete-in-figma", note: "code consolidated on --border; alias it there" },
  { figma: "Border/Header Border", collection: "Color", status: "delete-in-figma", note: "already aliased to Border/border during cleanup — a dead name" },
  { figma: "Text/Text Header", collection: "Color", status: "delete-in-figma", note: "duplicate of Text/Text Primary; code uses --text-primary in headers" },
  { figma: "Text/Text Header Secondary", collection: "Color", status: "delete-in-figma", note: "duplicate of Text/Text Secondary" },
  // Composed in code rather than tokenised.
  { figma: "Surface/Surface Input Disabled", collection: "Color", status: "by-design", note: "code composes --surface-input + opacity rather than a second token" },
  { figma: "Shadow/Shadow Color", collection: "Color", status: "undecided", note: "code shadows use Tailwind defaults; themed shadow colour is unadopted" },
  { figma: "Status/Status Todo", collection: "Color", status: "undecided", note: "code has six statuses — check whether this is --status-draft under another name" },
  // Layout scaffolding that belongs to an app, not a component library.
  { figma: "Breakpoints/Minimal", collection: "Dimensions", status: "by-design", note: "Tailwind breakpoints own this in code" },
  { figma: "Breakpoints/Fit", collection: "Dimensions", status: "by-design", note: "as above" },
  { figma: "Breakpoints/Full Layout", collection: "Dimensions", status: "by-design", note: "as above" },
  { figma: "Containers/Content Default", collection: "Dimensions", status: "by-design", note: "app-level layout, not a DS token" },
  { figma: "Containers/Left Menu", collection: "Dimensions", status: "by-design", note: "as above" },
  { figma: "Space/List Indent", collection: "Dimensions", status: "undecided", note: "no code counterpart; adopt into the space scale or drop" },
]

export const FONT_GROUP: TokenGroup = {
  title: "Fonts", kind: "font", collection: "Fonts", tokens: [
    { cssVar: "font-sans", figma: "Font Families/font-sans", usage: "Geist — body + UI (swap per project)" },
    { cssVar: "font-site", figma: "Font Families/Main Font", usage: "Outfit — marketing/site (swap per project)" },
    { cssVar: "font-serif", figma: "Font Families/font-serif", usage: "Georgia — editorial" },
    { cssVar: "font-mono", figma: "Font Families/font-mono", usage: "Geist Mono — code" },
    { cssVar: "weight-regular", figma: "Weights/Regular", usage: "500 — default weight" },
    { cssVar: "weight-medium", figma: "Weights/Medium", usage: "600 — emphasis" },
    { cssVar: "weight-heavy", figma: "Weights/Heavy", usage: "700 — headings" },
  ],
}
