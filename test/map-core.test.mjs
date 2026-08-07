import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
	MAP_CORE_CONTRACT,
	MAP_CONTROL_ICONS,
	MAP_ACTION_ICONS,
	chartCandidates,
	chartCycleShortcut,
	chartCycleResultMessage,
	chartCycleStatusMessage,
	chartId,
	createChartSelectorControl,
	createChartCycleState,
	formatCoordinate,
	floatingPanelHeight,
	isChartCycleShortcutEvent,
	labelLeafletZoomControls,
	mapActionState,
	normalizeChartResources,
	normalizeFolderResponse,
	setMapControlHoverHelp,
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
	assert.match(css, /\.ajrm-map-panel\{[^}]*overflow-x:hidden;[^}]*overflow-y:auto;[^}]*touch-action:pan-y;/);
	assert.match(css, /\[data-ajrm-map-help\]::after\{/);
	assert.match(css, /\[data-ajrm-map-help\]:hover::after/);
});

test("map control hover help labels buttons and Leaflet zoom controls", () => {
	function element() {
		const attributes = new Map();
		return {
			setAttribute: (name, value) => attributes.set(name, value),
			getAttribute: (name) => attributes.get(name) ?? null,
			removeAttribute: (name) => attributes.delete(name),
			attributes,
		};
	}
	const button = element();
	setMapControlHoverHelp(button, "Show voyages");
	assert.equal(button.title, "Show voyages");
	assert.equal(button.attributes.get("data-ajrm-map-help"), "Show voyages");
	assert.equal(button.attributes.get("aria-label"), "Show voyages");

	const zoomIn = element();
	const zoomOut = element();
	const labelled = labelLeafletZoomControls({
		getContainer: () => ({
			querySelector: (selector) => selector.endsWith("zoom-in") ? zoomIn : zoomOut,
		}),
	});
	assert.equal(labelled.zoomIn.attributes.get("data-ajrm-map-help"), "Zoom in");
	assert.equal(labelled.zoomOut.attributes.get("data-ajrm-map-help"), "Zoom out");
});

test("chart selector releases browser, DOM and map listeners", () => {
	const calls = [];
	const element = (tagName = "div") => ({
		tagName: tagName.toUpperCase(),
		hidden: false,
		style: {},
		setAttribute() {},
		getAttribute() { return null; },
		addEventListener: (name, handler) => calls.push(["dom-on", name, handler]),
		removeEventListener: (name, handler) => calls.push(["dom-off", name, handler]),
	});
	const L = {
		Control: {
			extend: (definition) => class {
				constructor() { Object.assign(this, definition); }
			},
		},
		DomUtil: { create: (tagName) => element(tagName) },
		DomEvent: { disableClickPropagation() {}, disableScrollPropagation() {}, on() {}, stop() {} },
	};
	const map = {
		on: (name, handler) => calls.push(["map-on", name, handler]),
		off: (name, handler) => calls.push(["map-off", name, handler]),
	};
	const windowObject = {
		addEventListener: (name, handler) => calls.push(["window-on", name, handler]),
		removeEventListener: (name, handler) => calls.push(["window-off", name, handler]),
	};
	const selector = createChartSelectorControl({
		L,
		map,
		baseMaps: { Blank: {} },
		getBaseMap: () => "Blank",
		setBaseMap() {},
		windowObject,
	});
	selector.control.onAdd();
	selector.control.onRemove();
	for (const source of ["dom", "map", "window"]) {
		const added = calls.find(([kind]) => kind === `${source}-on`);
		const removed = calls.find(([kind]) => kind === `${source}-off`);
		assert.ok(added, `${source} listener registered`);
		assert.ok(removed, `${source} listener removed`);
		assert.equal(removed[2], added[2], `${source} removes the registered handler`);
	}
});

test("floating selector height uses only the viewport space below the control", () => {
	assert.equal(floatingPanelHeight({ top: 170, viewportHeight: 600 }), 418);
	assert.equal(floatingPanelHeight({ top: 80, viewportHeight: 900 }), 560);
	assert.equal(floatingPanelHeight({ top: 170, viewportHeight: 210 }), 48);
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

test("chart-cycle status wording is shared by map consumers", () => {
	const charts = [
		{ __ajrmMapChartId: "detail", name: "Detailed harbour" },
		{ __ajrmMapChartId: "broad", name: "Approaches" },
	];
	assert.equal(chartCycleStatusMessage({ selected: charts[0], candidates: charts }), "Automatic chart: Detailed harbour");
	assert.equal(chartCycleStatusMessage({ selected: charts[1], candidates: charts, manualChartId: "broad" }), "Chart 2 of 2: Approaches");
	assert.equal(chartCycleStatusMessage({ selected: null, candidates: [] }), "No enabled chart covers the map centre");
	assert.equal(chartCycleResultMessage({ mode: "disabled" }), "Auto Charts is switched off");
	assert.equal(chartCycleResultMessage(null), "Chart selection unavailable");
	const css = readFileSync(new URL("../styles/map-core.css", import.meta.url), "utf8");
	assert.match(css, /\.ajrm-map-chart-cycle-status\{position:fixed;top:12px;left:50%;z-index:1100/);
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
