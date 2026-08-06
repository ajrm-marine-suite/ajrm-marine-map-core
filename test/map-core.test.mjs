import assert from "node:assert/strict";
import test from "node:test";
import {
	MAP_CORE_CONTRACT,
	chartCandidates,
	formatCoordinate,
	normalizeChartResources,
	normalizeFolderResponse,
} from "../src/index.mjs";

test("map core publishes the versioned shell contract", () => {
	assert.equal(MAP_CORE_CONTRACT, "ajrm-marine-map-shell-v1");
});

test("chart catalogue uses Display native-zoom and overzoom ranking", () => {
	const charts = normalizeChartResources({
		broad: { bounds: [-6, 55, -4, 57], minzoom: 8, maxzoom: 14 },
		detail: { bounds: [-5.8, 55.8, -5.4, 56.2], minzoom: 13, maxzoom: 18 },
	});
	assert.deepEqual(chartCandidates(charts, { lat: 56, lng: -5.6, zoom: 16, maxZoom: 22 }).map((chart) => chart.__ajrmMapChartId), ["detail", "broad"]);
	assert.deepEqual(chartCandidates(charts, { lat: 56, lng: -5.6, zoom: 20, maxZoom: 22 }).map((chart) => chart.__ajrmMapChartId), ["detail", "broad"]);
});

test("folder response preserves nesting and inherited state", () => {
	assert.deepEqual(normalizeFolderResponse({ folders: ["/", "Admiralty", "Admiralty/West"], folderStates: { Admiralty: { enabled: false, effectiveEnabled: false }, "Admiralty/West": { enabled: true, effectiveEnabled: false } } }), [
		{ path: "Admiralty", name: "Admiralty", depth: 0, enabled: false, effectiveEnabled: false },
		{ path: "Admiralty/West", name: "West", depth: 1, enabled: true, effectiveEnabled: false },
	]);
});

test("coordinate formatting is common across consumers", () => {
	assert.equal(formatCoordinate(56.25, "lat", "degrees-minutes"), "56° 15.000′ N");
	assert.equal(formatCoordinate(-5.5, "lon", "decimal"), "5.500000°W");
});
