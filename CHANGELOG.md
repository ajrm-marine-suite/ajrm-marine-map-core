# Changelog

## 0.7.13 - 2026-08-22

- Keep the normal empty-curve message distinct from the new high-only and
  low-only station warning.

## 0.7.12 - 2026-08-22

- Refuse to interpolate a tidal curve unless both high- and low-water events
  are present, and expose the station event-capability classification.

## 0.7.11 - 2026-08-19

- Give the chart-cycle banner a stable responsive width and keep the exported
  runtime version aligned with the package release.

## 0.7.9 - 2026-08-19

- Restore automatic chart selection when Auto Charts is switched off and back
  on after the basemap-only cycle step.

## 0.7.8 - 2026-08-19

- Add a basemap-only step to the shared chart-cycle control before returning to
  automatic chart selection.

## 0.7.7

- Let shared tide-curve consumers explicitly request UTC labels and hover
  times while Display continues to use the browser's civil timezone.

## 0.7.6

- Add the shared tidal-event window, chart-datum SVG tide curve, station
  reference levels and interactive hover renderer used by Display and Marine
  Planning.

## 0.7.5

- Keep nested chart-folder controls visible and preserve their expanded state
  when Auto Charts or another map-selector option changes.
- Keep the exported runtime version aligned with the package release.

## 0.7.3

- Disable the chart-cycle button and keyboard shortcut whenever Auto Charts is
  off, with shared hover help explaining how to enable it.

## 0.7.2

- Add the shared COG-oriented own-vessel follow calculation and browser setting.
- Default follow mode to 66% visible chart ahead and 34% behind, with safe
  centred fallback when COG is unavailable.

## 0.7.1

- Document the shared map module's purpose and the responsibilities it provides
  to Display, Voyages, Navigation Integrity, and Harbour Editor.
- Keep the runtime contract unchanged while publishing an explicit module
  version for the documentation-only release.
