# Workshop Toolkit

Offline, ad-free workshop and handyman reference, built as an installable web app (PWA) for Android.

## Planned sections (v1)
- Drill and tap charts: metric coarse/fine, UNC/UNF, BSP/NPT, tap drill and clearance sizes
- Drill size conversions: fractional, number, letter, metric
- Thread reference: pitch, major/minor diameters, thread engagement
- Automotive table
- Welding settings: MIG, TIG, stick starting points

## Structure (planned)
- `data/` – reference tables as plain JSON, separate from UI (portable to a native app later)
- `js/calc/` – pure calculation functions, no UI code
- `index.html`, `css/`, `js/` – plain HTML/CSS/JS, no framework

## Install
Open the GitHub Pages URL in Chrome on Android → menu → Install app.
