# AJRM Marine Map Core

Version `0.7.13` refuses to interpolate a tidal curve unless both high- and low-water events are present, exposes explicit station event capabilities to every consumer, and distinguishes an empty dataset from a one-extreme station.

Version `0.7.11` gives the centred chart-cycle status banner a stable,
responsive width so long chart names do not collapse into a narrow column.

Version `0.7.9` restores automatic selection when Auto Charts is switched back
on after the basemap-only cycle step. Version `0.7.8` makes the shared chart-cycle control include an explicit
basemap-only step before it returns to automatic chart selection. Version `0.7.7` adds an explicit UTC/local label option to the shared
tide-curve renderer introduced in `0.7.6` for Display and Marine
Planning. Version `0.7.3` disables manual chart cycling whenever Auto Charts is off.
Version `0.7.2` adds the shared COG-oriented own-vessel follow calculation and
browser setting while retaining the reviewed shared-map control baseline.

Internal, versioned map UI used by AJRM Marine Display, DR Plotter, Voyage
Viewer and Harbour Editor. It is a library rather than a Signal K application.

The package owns the common Charts button and selector, tide-curve rendering, basemap and overlay
presentation, Auto Charts catalogue normalization and ranking, chart-cycle
status display, Charts Provider Simple folder controls, coordinate formatting
and cursor readout helpers.

Applications retain ownership of their operational layers and actions.

## GUI contract

- Common controls use the same icons, labels, ordering, tooltips and keyboard
  behaviour.
- Auto Charts is the final principal overlay and chart folders are nested below
  it.
- Coordinate format is browser-global; basemap, overlay, cursor visibility and
  map position remain application-specific.
- Own-vessel follow look-ahead is browser-global: 66% of the visible chart is
  ahead along COG by default and 34% behind. A missing COG centres the vessel.
- Application controls use common buttons only when their semantics match.
- Native `+ / −` zoom remains first in the upper-left Leaflet stack; chart
  controls follow it and application actions form a vertical column below.
- Map buttons use Display's 38 px button size, approximately 25 px SVG icons,
  shared control glyphs, and a uniform 10 px vertical gap.
- Selector radios and checkboxes have explicit local dimensions so an owning
  application's general form-input CSS cannot hide their labels.
- The chart-cycle control uses Display's origin-wide `chartCycleShortcut`
  browser setting (`C` by default), while ignoring keystrokes in form fields.
- Consumers provide their Auto Charts enabled state so the cycle button and
  keyboard shortcut remain inactive whenever automatic chart display is off.
- Chart cycling runs through automatic selection, each alternative chart, a
  basemap-only step, then back to automatic selection. Result wording is shared
  with Display, including disabled, unavailable, automatic, manual and basemap
  states.
- Chart-selector height is measured against the space actually remaining below
  the control, with touch/momentum scrolling so folders remain reachable in
  short windows and on iPadOS.
