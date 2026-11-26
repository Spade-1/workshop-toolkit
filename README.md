# Workshop Toolkit

Offline, ad-free workshop and handyman reference, built as an installable web app (PWA) for Android.

## Planned sections (v1)
- Drill and tap charts: metric coarse/fine, UNC/UNF, BSP/NPT, tap drill and clearance sizes
- Drill size conversions: fractional, number, letter, metric
- Thread reference: pitch, major/minor diameters, thread engagement
- Automotive table
- Welding settings: MIG, TIG, stick starting points

## V2 (planned)
- Cutting speed → RPM
- Bolt grades / identification, screw heads and drives
- Bar, tube and sheet metal weights
- Sheet metal gauges and bend allowance
- Counterbore / countersink sizes, drill point geometry
- Hardness conversion

## Data sources
Values are built from the relevant standards (ISO 261/724, ASME B1.1, BS EN 10226, ASME B1.20.1) and manufacturer data, cross-checked against reference charts. Discrepancies are flagged for review before inclusion.

## Structure (planned)
- `data/` – reference tables as plain JSON, separate from UI (portable to a native app later)
- `js/calc/` – pure calculation functions, no UI code
- `index.html`, `css/`, `js/` – plain HTML/CSS/JS, no framework

## Install
Open the GitHub Pages URL in Chrome on Android → menu → Install app.
