# Design System Strategy: The Editorial Architect

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Academic Curator."** 

Standard technical apps often feel cold, mechanical, and overly complex. This system rejects that "dashboard" aesthetic in favor of a high-end editorial experience. We treat a learning roadmap not as a database, but as a prestigious publication. By utilizing intentional white space, sophisticated tonal layering, and a rigid "No-Shadow" philosophy, we create a digital environment that feels as tactile and authoritative as a physical textbook from a luxury press. 

The goal is to provide a sense of "Calm Focus." We move beyond the template look by using aggressive typographic scales and an asymmetrical approach to layout that guides the eye through a curriculum like a curated story.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a warm, sophisticated cream foundation. It is designed to reduce eye strain during long technical study sessions while providing high-contrast "Focus Types" to denote progress.

### Tonal Hierarchy
*   **Surface (Background):** `#F4F0E6` – The primary canvas.
*   **Surface-Container-Low (Sidebar):** `#EDE8DC` – Used for persistent navigation to provide a subtle "recessed" look.
*   **Surface-Container-Lowest (Cards/Main Surface):** `#FFFFFF` – Used to make active content "pop" without shadows.
*   **Outline-Variant:** `#E8E2D4` – Only for essential structural separation.

### The "No-Line" Rule
Standard UI relies on borders to separate content. This system prohibits the use of 1px solid borders for sectioning. Boundaries must be defined through **Background Color Shifts**. For example, a learning module (Pure White) sits on the background (Warm Cream). The shift in tone creates the edge, not a line. This keeps the interface breathable and high-end.

### Signature Semantic Tokens (Focus Types)
Use these to categorize the "soul" of the technical path:
*   **Main (Coral):** `#E84F3C` (Text) | `#FDF0EE` (Surface) — Use for critical path items.
*   **Secondary (Blue):** `#2B6CB0` (Text) | `#EEF4FB` (Surface) — Use for deep-dive documentation.
*   **Continuous (Green):** `#3D9E6B` (Text) | `#EDF7F2` (Surface) — Use for labs and coding exercises.
*   **Milestones (Purple):** `#A855F7` (Text) | `#F5EDFF` (Surface) — Use for certifications and project completions.

---

## 3. Typography: The Editorial Voice
We use **Plus Jakarta Sans** exclusively. It provides a geometric clarity that feels technical yet approachable.

*   **Display (Bold 700):** Used for roadmap titles. Large, unapologetic, and primary-text colored (`#1A1A1A`).
*   **Headline & Title (Bold 700):** Used for module names. Significant letter spacing (tracking) should be avoided to keep the "heavy" editorial feel.
*   **Labels (SemiBold 600):** Used for metadata, tags, and sidebar items. These should often be in all-caps when used as secondary "eyebrow" text.
*   **Body (Regular 400):** Used for descriptions. The line height should be generous (1.6x) to maintain the "fine print" aesthetic of high-end journals.

---

## 4. Elevation & Depth: Tonal Layering
Since we have banned shadows and gradients, depth is achieved through **Stacking and Nesting.**

*   **The Layering Principle:** Think of the UI as sheets of paper. The lowest layer is the Sidebar (`#EDE8DC`), the middle layer is the Background (`#F4F0E6`), and the highest layer—where the work happens—is the Card (`#FFFFFF`).
*   **The Ghost Border:** For high-density data where a background shift isn't enough, use the "Ghost Border"—the `#E8E2D4` border token at **50% opacity**. It should feel felt, not seen.
*   **Interactive Depth:** On hover, instead of a shadow, a card should shift its background color from `#FFFFFF` to a semantic background (e.g., `#FDF0EE`) or simply display a 2px interior stroke in the primary color.

---

## 5. Components

### Buttons
*   **Primary:** Solid `#1A1A1A` with White text. Radius: `999px` (Pill). No gradient.
*   **Secondary:** Solid `#FFFFFF` with `#E84F3C` (Coral) text and a `#E8E2D4` ghost border.
*   **Tertiary:** Ghost style. No background, just SemiBold 600 text with a Phosphor icon.

### Cards & Progress Lists
*   **The "No-Divider" Rule:** Vertical white space is your divider. Use `24px` or `32px` gaps between list items rather than a grey line. 
*   **Module Cards:** Use a `12px` radius. Content should be padded by at least `24px` to maintain the editorial feel.
*   **Status Pills:** Use the Focus Type semantic colors. For "In Progress," use the Blue variant. For "Completed," use the Green variant. Radius: `999px`.

### Inputs
*   **Field Style:** Pure white background, `12px` radius.
*   **Focus State:** A 2px solid border of Coral `#E84F3C`. No "glow" or shadow.
*   **Labels:** Always sit above the input in `label-sm` (SemiBold 600), colored in Muted Text `#7A746A`.

### The Roadmap Path (Custom Component)
*   The path itself is a `4px` solid line in `#E8E2D4`. 
*   Active segments of the path are colored based on the Focus Type.
*   Nodes are `16px` circles. Completed nodes are filled; upcoming nodes are outlined.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Align text to the left but allow images or code snippets to bleed off the right edge of a container.
*   **Embrace "Empty" Space:** If a screen feels crowded, increase the background-color gutter. Space is a luxury.
*   **Use Phosphor Icons (Outlined):** Keep stroke weights consistent (Regular or Light) to match the typography's "SemiBold" weight.

### Don’t:
*   **Don't use Shadows:** Even for modals. Use a high-contrast border or a dark backdrop overlay (`#1A1A1A` at 40% opacity) instead.
*   **Don't use Gradients:** Even "subtle" ones. If you need visual interest, use a pattern of dots or a solid block of a Focus Type color.
*   **Don't Center-Align Everything:** High-end editorial design is almost always left-aligned to mimic the flow of a printed page.
*   **Don't use 100% Black:** Always use the Primary Text `#1A1A1A` to maintain the warmth of the cream background.