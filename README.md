# AJRM Marine Map Core

Internal, versioned map UI used by AJRM Marine Display, DR Plotter, Voyage
Viewer and Harbour Editor. It is a library rather than a Signal K application.

The package owns the common Charts button and selector, basemap and overlay
presentation, Auto Charts catalogue normalization and ranking, Charts Provider
Simple folder controls, coordinate formatting and cursor readout helpers.

Applications retain ownership of their operational layers and actions.

## GUI contract

- Common controls use the same icons, labels, ordering, tooltips and keyboard
  behaviour.
- Auto Charts is the final principal overlay and chart folders are nested below
  it.
- Coordinate format is browser-global; basemap, overlay, cursor visibility and
  map position remain application-specific.
- Application controls use common buttons only when their semantics match.
- Native `+ / −` zoom remains first in the upper-left Leaflet stack; chart
  controls follow it and application actions form a vertical column below.
- Map buttons use Display's 38 px button size, approximately 25 px SVG icons,
  shared control glyphs, and a uniform 10 px vertical gap.
