export const MAP_CORE_CONTRACT = "ajrm-marine-map-shell-v1";
export const MAP_CORE_VERSION = "0.6.1";
export const AUTO_CHARTS_NAME = "Auto Charts";
export const OPEN_SEA_MAP_NAME = "OpenSeaMap";
export const CHART_FOLDER_API_BASE = "/plugins/signalk-charts-provider-simple";

const ZOOM_TOLERANCE = 0.1;

function finiteNumber(value, fallback) {
	const number = Number(value ?? fallback);
	return Number.isFinite(number) ? number : fallback;
}

function boundsSource(chart) {
	return chart?.bounds ?? chart?.boundingBox ?? chart?.extent ?? chart?.bbox ?? null;
}

function rawBounds(source) {
	if (Array.isArray(source)) return source.flat(2).slice(0, 4).map(Number);
	if (typeof source === "string") return source.split(/[\s,]+/).slice(0, 4).map(Number);
	if (source && typeof source === "object") {
		return [
			source.west ?? source.minLon ?? source.minLongitude,
			source.south ?? source.minLat ?? source.minLatitude,
			source.east ?? source.maxLon ?? source.maxLongitude,
			source.north ?? source.maxLat ?? source.maxLatitude,
		].map(Number);
	}
	return [];
}

function validBounds(bounds) {
	return bounds.length === 4 && bounds.every(Number.isFinite) &&
		bounds[0] >= -180 && bounds[2] <= 180 && bounds[1] >= -90 && bounds[3] <= 90 &&
		bounds[0] < bounds[2] && bounds[1] < bounds[3];
}

export function chartBoundsCandidates(chart) {
	const [a, b, c, d] = rawBounds(boundsSource(chart));
	const candidates = [
		[Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)],
		[Math.min(b, d), Math.min(a, c), Math.max(b, d), Math.max(a, c)],
	].filter(validBounds);
	return candidates.filter((candidate, index) =>
		candidates.findIndex((other) => other.join(",") === candidate.join(",")) === index);
}

export function chartZoom(chart) {
	return chart?.__ajrmMapZoom ?? chart?.__autoChartZoom ?? {
		min: finiteNumber(chart?.minzoom ?? chart?.minZoom, 0),
		max: finiteNumber(chart?.maxzoom ?? chart?.maxZoom, 24),
	};
}

export function normalizeChartResources(resources) {
	return Object.entries(resources || {}).map(([id, chart]) => {
		const normalized = { ...chart, __ajrmMapChartId: id };
		Object.defineProperties(normalized, {
			__ajrmMapBounds: { value: chartBoundsCandidates(chart) },
			__ajrmMapZoom: { value: chartZoom(chart) },
		});
		return normalized;
	});
}

export function chartBounds(chart, lat, lon) {
	const candidates = chart?.__ajrmMapBounds ?? chart?.__autoChartBoundsCandidates ??
		chartBoundsCandidates(chart);
	return candidates.find((bounds) =>
		lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3]) ??
		candidates[0] ?? null;
}

export function chartContains(chart, lat, lon) {
	const bounds = chartBounds(chart, lat, lon);
	return !!bounds && lon >= bounds[0] && lon <= bounds[2] &&
		lat >= bounds[1] && lat <= bounds[3];
}

function chartArea(chart, lat, lon) {
	const bounds = chartBounds(chart, lat, lon);
	return bounds ? Math.abs((bounds[2] - bounds[0]) * (bounds[3] - bounds[1])) : Infinity;
}

export function chartCandidates(charts, { lat, lng, zoom, maxZoom = 22 }) {
	return charts
		.filter((chart) => chartContains(chart, lat, lng))
		.filter((chart) => {
			const range = chartZoom(chart);
			return zoom >= range.min - ZOOM_TOLERANCE && zoom <= maxZoom + ZOOM_TOLERANCE;
		})
		.sort((left, right) => {
			const leftZoom = chartZoom(left);
			const rightZoom = chartZoom(right);
			const leftNative = leftZoom.max >= zoom;
			const rightNative = rightZoom.max >= zoom;
			if (leftNative !== rightNative) return leftNative ? -1 : 1;
			const zoomOrder = leftNative
				? leftZoom.max - rightZoom.max
				: rightZoom.max - leftZoom.max;
			return zoomOrder || chartArea(left, lat, lng) - chartArea(right, lat, lng) ||
				rightZoom.min - leftZoom.min;
		});
}

export function chooseChart(charts, map, position = map.getCenter()) {
	return chartCandidates(charts, {
		lat: position.lat,
		lng: position.lng,
		zoom: map.getZoom(),
		maxZoom: map.getMaxZoom(),
	})[0] ?? null;
}

export function chartUrl(chart) {
	return chart?.tilemapUrl || chart?.url || chart?.tileUrl || chart?.href || "";
}

export function makeRasterChartLayer({ L, chart, maxZoom = 22, pane = "tilePane" }) {
	const url = chartUrl(chart);
	if (!url) return null;
	const range = chartZoom(chart);
	return L.tileLayer(url, {
		minZoom: range.min,
		maxNativeZoom: range.max,
		maxZoom,
		pane,
		attribution: chart.attribution || chart.description || chart.name || "",
	});
}

export function escapeHtml(value) {
	return String(value ?? "")
		.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function normalizeFolderResponse(payload) {
	const states = payload?.folderStates ?? {};
	return (Array.isArray(payload?.folders) ? payload.folders : [])
		.filter((path) => path && path !== "/")
		.map((path) => ({
			path,
			name: path.split("/").filter(Boolean).at(-1) || path,
			depth: Math.max(0, path.split("/").filter(Boolean).length - 1),
			enabled: states[path]?.enabled !== false,
			effectiveEnabled: states[path]?.effectiveEnabled !== false,
		}))
		.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}

export function createFolderClient(fetchFn = (...args) => globalThis.fetch(...args)) {
	return {
		async list() {
			const response = await fetchFn(`${CHART_FOLDER_API_BASE}/local-charts`, {
				credentials: "same-origin",
			});
			if (response.status === 404) return { supported: false, folders: [] };
			if (!response.ok) throw new Error(`Could not load chart folders (HTTP ${response.status})`);
			return { supported: true, folders: normalizeFolderResponse(await response.json()) };
		},
		async setEnabled(path, enabled) {
			const response = await fetchFn(`${CHART_FOLDER_API_BASE}/folders/toggle`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ folderPath: path, enabled }),
			});
			if (!response.ok) {
				if (response.status === 401 || response.status === 403) {
					throw new Error("Sign in as a Signal K administrator to change chart folders.");
				}
				throw new Error(`Could not change chart folder (HTTP ${response.status})`);
			}
			return response.json().catch(() => ({}));
		},
	};
}

function renderOption({ name, type, checked }) {
	return `<label class="ajrm-map-option"><input type="${type}" value="${escapeHtml(name)}"${checked ? " checked" : ""}><span>${escapeHtml(name)}</span></label>`;
}

function renderFolders(folders) {
	return folders.map((folder) => `<label class="ajrm-map-folder${folder.enabled && !folder.effectiveEnabled ? " inherited-disabled" : ""}" style="--folder-depth:${folder.depth}" title="${escapeHtml(folder.path)}"><input type="checkbox" data-chart-folder value="${escapeHtml(folder.path)}"${folder.enabled ? " checked" : ""}><span>${escapeHtml(folder.name)}</span></label>`).join("");
}

export function createChartSelectorControl({
	L,
	map,
	baseMaps,
	getBaseMap,
	setBaseMap,
	overlays = [],
	folderClient = createFolderClient(),
	onFoldersChanged = () => {},
	position = "topleft",
}) {
	let panel;
	const definition = L.Control.extend({
		options: { position },
		onAdd() {
			const container = L.DomUtil.create("div", "leaflet-bar ajrm-map-selector");
			const button = L.DomUtil.create("button", "ajrm-map-button", container);
			button.type = "button";
			button.title = "Charts";
			button.setAttribute("aria-label", "Charts");
			button.setAttribute("aria-expanded", "false");
			button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-6-3-6 3 6 3 6-3Zm6 4-6-3-6 3-6-3v4l6 3 6-3 6 3V9Zm0 5-6-3-6 3-6-3v4l6 3 6-3 6 3v-4Z"/></svg>';
			panel = L.DomUtil.create("div", "ajrm-map-panel", container);
			panel.hidden = true;
			const render = () => {
				const base = Object.keys(baseMaps).map((name) => renderOption({ name, type: "radio", checked: getBaseMap() === name })).join("");
				const normal = overlays.filter((item) => item.name !== AUTO_CHARTS_NAME);
				const automatic = overlays.find((item) => item.name === AUTO_CHARTS_NAME);
				panel.innerHTML = `<div class="ajrm-map-title">Basemap</div>${base}<div class="ajrm-map-title">Overlays</div>${normal.map((item) => renderOption({ name: item.name, type: "checkbox", checked: item.isEnabled() })).join("")}${automatic ? renderOption({ name: automatic.name, type: "checkbox", checked: automatic.isEnabled() }) : ""}${automatic ? '<details data-folders hidden><summary>Chart folders</summary><div data-folder-list>Loading chart folders…</div></details>' : ""}`;
			};
			const refreshFolders = async () => {
				const details = panel.querySelector("[data-folders]");
				if (!details) return;
				try {
					const result = await folderClient.list();
					details.hidden = !result.supported || result.folders.length === 0;
					const list = details.querySelector("[data-folder-list]");
					if (list) list.innerHTML = renderFolders(result.folders);
				} catch (error) {
					details.hidden = false;
					details.querySelector("[data-folder-list]").textContent = error.message;
				}
			};
			render();
			L.DomEvent.disableClickPropagation(container);
			L.DomEvent.disableScrollPropagation(container);
			L.DomEvent.on(button, "click", (event) => {
				L.DomEvent.stop(event);
				panel.hidden = !panel.hidden;
				button.setAttribute("aria-expanded", String(!panel.hidden));
				if (!panel.hidden) void refreshFolders();
			});
			panel.addEventListener("change", async (event) => {
				const input = event.target;
				if (!(input instanceof HTMLInputElement)) return;
				if (input.dataset.chartFolder !== undefined) {
					input.disabled = true;
					try {
						await folderClient.setEnabled(input.value, input.checked);
						await onFoldersChanged();
						await refreshFolders();
					} catch (error) {
						input.checked = !input.checked;
						input.disabled = false;
						globalThis.alert?.(error.message);
					}
					return;
				}
				if (input.type === "radio") setBaseMap(input.value);
				else overlays.find((item) => item.name === input.value)?.setEnabled(input.checked);
				render();
			});
			map.on("click", () => {
				panel.hidden = true;
				button.setAttribute("aria-expanded", "false");
			});
			return container;
		},
	});
	const control = new definition();
	return { control, addTo: (target = map) => control.addTo(target), update: () => panel && undefined };
}

export function normalizeCoordinateFormat(value, fallback = "dms") {
	return ["dms", "degrees-minutes", "decimal"].includes(value) ? value : fallback;
}

export function formatCoordinate(value, axis, format = "dms") {
	if (!Number.isFinite(value)) return "—";
	const hemisphere = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
	const absolute = Math.abs(value);
	if (format === "decimal") return `${absolute.toFixed(6)}°${hemisphere}`;
	const degrees = Math.floor(absolute);
	const minutesValue = (absolute - degrees) * 60;
	if (format === "degrees-minutes") return `${degrees}° ${minutesValue.toFixed(3)}′ ${hemisphere}`;
	const minutes = Math.floor(minutesValue);
	const seconds = (minutesValue - minutes) * 60;
	return `${degrees}° ${minutes}′ ${seconds.toFixed(1)}″ ${hemisphere}`;
}
