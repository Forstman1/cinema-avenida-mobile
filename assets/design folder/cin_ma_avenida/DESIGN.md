---
name: Cinéma Avenida
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e2beba'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#aa8986'
  outline-variant: '#5a403e'
  surface-tint: '#ffb4ac'
  primary: '#ffb4ac'
  on-primary: '#690007'
  primary-container: '#b22222'
  on-primary-container: '#ffc8c2'
  inverse-primary: '#b52424'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#8fcdff'
  on-tertiary: '#003450'
  tertiary-container: '#006292'
  on-tertiary-container: '#b1daff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ac'
  on-primary-fixed: '#410003'
  on-primary-fixed-variant: '#92030f'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#cbe6ff'
  tertiary-fixed-dim: '#8fcdff'
  on-tertiary-fixed: '#001e30'
  on-tertiary-fixed-variant: '#004b71'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: EB Garamond
    fontSize: 42px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 38px
  headline-md:
    fontFamily: EB Garamond
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 28px
  headline-sm:
    fontFamily: EB Garamond
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 34px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 20px
---

## Brand & Style
The design system for this boutique cinema application is built on a foundation of "Cinematic Immersion." It targets a sophisticated audience of cinephiles who value curation and a premium viewing experience.

The style is a fusion of **Modern Minimalism** and **Glassmorphism**, set against a deep, theatrical backdrop. By utilizing high-contrast accents and translucent layers, the UI mimics the experience of a darkened theater where the content is the protagonist. The emotional response should be one of exclusivity, warmth, and high-end cultural engagement.

## Colors
The palette is anchored by the "Avenida Crimson," a warm, authoritative red that signals action and passion. 

- **Primary:** `#B22222` (Warm Crimson) used for primary calls-to-action, seat selection, and active states.
- **Background:** `#0A0A0A` (Deep Noir) provides the infinite depth required for a high-fidelity mobile experience.
- **Surface:** `#1A1A1A` is used for card backgrounds and elevated containers to provide subtle separation from the base.
- **Accents:** Use glassmorphic overlays with a white-tinted transparency for navigation bars and modal headers to maintain context of the underlying movie posters.

## Typography
The typographic system utilizes a classic "Serif-on-Sans" pairing to bridge the gap between historical cinema and modern technology.

- **Headlines:** `EB Garamond` is used for all editorial content, movie titles, and brand headers. Its literary quality evokes the feeling of a film program. Use `display-lg` sparingly for hero movie titles.
- **UI & Body:** `Inter` provides maximum legibility for functional data such as showtimes, seat numbers, and synopses. 
- **Language:** All microcopy should follow French typographic conventions (e.g., non-breaking spaces before colons).

## Layout & Spacing
This design system employs a **fluid-width layout** for mobile, centered around a 4-column grid.

- **Margins:** A generous 20px horizontal margin is required for all screen edges to ensure the UI feels airy and premium.
- **Gutters:** 16px between grid items.
- **Vertical Rhythm:** Components are spaced in multiples of 8px. Use 32px (xl) to separate distinct sections (e.g., "A l'affiche" vs "Prochainement").
- **Content Reflow:** On larger devices (tablets), the grid expands to 8 columns, while maintaining the fixed 20px outer margin to keep content focused.

## Elevation & Depth
Depth in this design system is achieved through **Glassmorphism** and **Tonal Layering** rather than traditional heavy shadows.

- **Level 0 (Base):** `#0A0A0A` - The void. Used for the main app background.
- **Level 1 (Cards):** `#1A1A1A` with a subtle 1px border of `rgba(255,255,255,0.05)`.
- **Level 2 (Overlays):** Background blur (20px) with a `rgba(255,255,255,0.08)` fill. This is used for the bottom navigation bar and top headers.
- **Shadows:** Use a very soft, diffused shadow (`0 8px 32px rgba(0,0,0,0.5)`) only for floating elements like the "Réserver" button to make it appear as if it's floating above the content.

## Shapes
The shape language is sophisticated and soft, moving away from aggressive sharp corners to reflect the comfort of luxury cinema seating.

- **Base Radius:** 8px (0.5rem) for small elements like input fields and small chips.
- **Large Radius:** 16px (1rem) for movie poster cards and modal sheets.
- **Extra Large Radius:** 24px (1.5rem) for promotional hero sections and large container elements.
- **Interactive Elements:** Buttons should use the 8px radius to maintain a professional, structured look.

## Components
Consistent application of these components ensures a premium feel across the application.

- **Buttons:** Primary buttons use a solid `#B22222` fill with white `Inter` Bold text. Secondary buttons use a transparent background with a 1.5px white border.
- **Movie Cards:** Must feature a 16px corner radius. Apply a subtle gradient overlay at the bottom of posters to ensure movie titles remain legible.
- **Glass Sheets:** Use for seat selection and checkout. These sheets should slide up from the bottom, utilizing a 20px background blur to keep the movie poster visible behind the transaction.
- **Chips (Showtimes):** Small, rounded containers (8px) with a `#1A1A1A` fill. The "Active" showtime chip uses the Crimson accent.
- **Input Fields:** Minimalist design with only a bottom border of `rgba(255,255,255,0.2)`. Focus state shifts the border color to Crimson.
- **Status Indicators:** Use refined, small dots for carousel pagination, with the active dot elongated into a small pill shape.