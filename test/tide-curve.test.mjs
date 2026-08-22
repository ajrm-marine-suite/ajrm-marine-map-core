/** Verifies the shared tide-curve event window and SVG contract. */

import assert from "node:assert/strict";
import test from "node:test";
import {
	interpolatedTideHeight,
	tideEventCapabilities,
	tideCurveEventsForDays,
	tideCurveSvg,
	tideGraphDays,
} from "../src/tide-curve.mjs";

const events = [
	{ at: "2026-08-18T00:00:00Z", heightM: 4, type: "high" },
	{ at: "2026-08-18T06:00:00Z", heightM: 1, type: "low" },
	{ at: "2026-08-18T12:00:00Z", heightM: 3.8, type: "high" },
];

test("normalizes graph range and retains the preceding event", () => {
	assert.equal(tideGraphDays("3"), 3);
	assert.equal(tideGraphDays("9"), 7);
	assert.deepEqual(
		tideCurveEventsForDays(events, "2026-08-18T01:00:00Z", 1).map((event) => event.at),
		events.map((event) => event.at),
	);
});

test("renders the Display tide-curve contract with datum references", () => {
	const svg = tideCurveSvg(events, "2026-08-18T03:00:00Z", {
		mhws: 4.1, mhwn: 3.2, mlwn: 1.7, mlws: 0.8,
	});
	assert.match(svg, /aria-label="Predicted tide curve"/);
	assert.match(svg, />0 m</);
	for (const label of ["MHWS 4.1 m", "MHWN 3.2 m", "MLWN 1.7 m", "MLWS 0.8 m"]) {
		assert.match(svg, new RegExp(label));
	}
	assert.match(svg, /class="tide-hover-target"/);
	assert.ok(Number(interpolatedTideHeight(events, "2026-08-18T03:00:00Z")) > 1);
	assert.match(tideCurveSvg(events, "2026-08-18T03:00:00Z", null, { timeZone: "UTC" }), /Predicted tide curve/);
});

test("renders an explicit empty state", () => {
	assert.match(tideCurveSvg([]), /No full tidal curve is available/);
});

test("refuses to invent a curve between events of only one extreme type", () => {
	const highOnly = events.filter((event) => event.type === "high");
	assert.deepEqual(tideEventCapabilities(highOnly), {
		highWater: true,
		lowWater: false,
		completeExtrema: false,
		curve: false,
	});
	assert.match(tideCurveSvg(highOnly), /high-water events only/);
	assert.doesNotMatch(tideCurveSvg(highOnly), /<svg/);
});
