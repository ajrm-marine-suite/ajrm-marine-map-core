import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
	MAP_CORE_CONTRACT,
	MAP_CONTROL_ICONS,
	MAP_ACTION_ICONS,
	chartCandidates,
	chartCycleShortcut,
	chartId,
	createChartCycleState,
	formatCoordinate,
	isChartCycleShortcutEvent,
	mapActionState,
	normalizeChartResources,
	normalizeFolderResponse,
} from "../src/index.mjs";

test("map core publishes the versioned shell contract", () => {
	assert.equal(MAP_CORE_CONTRACT, "ajrm-marine-map-shell-v1");
});

test("common action toolbar exposes Display-style icon and state contracts", () => {
	assert.match(MAP_ACTION_ICONS.settings, /class="ajrm-marine-control-icon"/);
	assert.equal(MAP_ACTION_ICONS.settings, MAP_CONTROL_ICONS.settings);
	assert.equal(MAP_ACTION_ICONS.follow, MAP_CONTROL_ICONS.follow);
	assert.equal(MAP_ACTION_ICONS.list, MAP_CONTROL_ICONS.targets);
	assert.match(MAP_CONTROL_ICONS.layers, /viewBox="0 0 16 16"/);
	assert.match(MAP_CONTROL_ICONS.cycleCharts, /viewBox="0 0 16 16"/);
	assert.deepEqual(mapActionState({
		isVisible: () => false,
		isDisabled: () => true,
		isPressed: () => true,
	}), { visible: false, disabled: true, pressed: true });
});

test("common action toolbar is a vertical map-control stack", () => {
	const css = readFileSync(new URL("../styles/map-core.css", import.meta.url), "utf8");
	assert.match(css, /\.ajrm-map-actions\{display:flex;flex-direction:column;gap:10px;/);
	assert.match(css, /\.ajrm-map-button\{[^}]*width:38px;[^}]*height:38px;[^}]*font-size:24px;[^}]*line-height:38px;/);
	assert.match(css, /\.ajrm-map-panel\{[^}]*left:44px;/);
	assert.match(css, /\.ajrm-map-option input,\.ajrm-map-folder input\{[^}]*flex:0 0 16px;[^}]*width:16px;[^}]*height:16px;/);
	assert.match(css, /\.ajrm-map-option span,\.ajrm-map-folder span\{[^}]*display:block;[^}]*min-width:0/);
});

test("chart catalogue uses Display native-zoom and overzoom ranking", () => {
	const charts = normalizeChartResources({
		broad: { bounds: [-6, 55, -4, 57], minzoom: 8, maxzoom: 14 },
		detail: { bounds: [-5.8, 55.8, -5.4, 56.2], minzoom: 13, maxzoom: 18 },
	});
	assert.deepEqual(chartCandidates(charts, { lat: 56, lng: -5.6, zoom: 16, maxZoom: 22 }).map((chart) => chart.__ajrmMapChartId), ["detail", "broad"]);
	assert.deepEqual(chartCandidates(charts, { lat: 56, lng: -5.6, zoom: 20, maxZoom: 22 }).map((chart) => chart.__ajrmMapChartId), ["detail", "broad"]);
});

test("overlapping charts cycle from Auto through alternatives and back", () => {
	const charts = normalizeChartResources({
		broad: { bounds: [-5, 55, -4, 56], minzoom: 8, maxzoom: 14 },
		detail: { bounds: [-4.6, 55.4, -4.4, 55.6], minzoom: 12, maxzoom: 18 },
		extra: { bounds: [-4.55, 55.45, -4.45, 55.55], minzoom: 12, maxzoom: 19 },
	});
	const map = {
		getCenter: () => ({ lat: 55.5, lng: -4.5 }),
		getZoom: () => 15,
		getMaxZoom: () => 22,
	};
	const cycle = createChartCycleState();
	const automatic = cycle.choose(charts, map);
	const second = cycle.cycle(charts, map);
	const third = cycle.cycle(charts, map);
	const backToAutomatic = cycle.cycle(charts, map);
	assert.equal(chartId(automatic), "detail");
	assert.equal(chartId(second), "extra");
	assert.equal(chartId(third), "broad");
	assert.equal(chartId(backToAutomatic), "detail");
	assert.equal(cycle.manualChartId, null);
});

test("chart cycling uses Display's shared browser shortcut and ignores form editing", () => {
	const storage = { getItem: (key) => key === "chartCycleShortcut" ? "x" : null };
	assert.equal(chartCycleShortcut(storage), "X");
	assert.equal(chartCycleShortcut({ getItem: () => null }), "C");
	assert.equal(isChartCycleShortcutEvent({ key: "x", target: { tagName: "DIV" } }, storage), true);
	assert.equal(isChartCycleShortcutEvent({ key: "x", target: { tagName: "INPUT" } }, storage), false);
	assert.equal(isChartCycleShortcutEvent({ key: "x", ctrlKey: true, target: { tagName: "DIV" } }, storage), false);
	assert.equal(isChartCycleShortcutEvent({ key: "c", target: { tagName: "DIV" } }, storage), false);
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
