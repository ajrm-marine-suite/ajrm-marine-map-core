# AJRM Marine Map Core

Version `0.7.2` adds the shared COG-oriented own-vessel follow calculation and
browser setting while retaining the reviewed shared-map control baseline.

Internal, versioned map UI used by AJRM Marine Display, DR Plotter, Voyage
Viewer and Harbour Editor. It is a library rather than a Signal K application.

The package owns the common Charts button and selector, basemap and overlay
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
- Chart-cycle result wording is shared with Display, including disabled,
  unavailable, automatic and manually selected chart states.
- Chart-selector height is measured against the space actually remaining below
  the control, with touch/momentum scrolling so folders remain reachable in
  short windows and on iPadOS.
