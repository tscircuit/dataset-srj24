import { AutoroutingPipelineSolver } from "@tscircuit/capacity-autorouter";
import { getSvgFromGraphicsObject } from "graphics-debug";
import { useEffect, useMemo, useState } from "react";

function normalizeSample(raw) {
	if (
		raw &&
		typeof raw === "object" &&
		"simpleRouteJson" in raw &&
		raw.simpleRouteJson
	) {
		return raw.simpleRouteJson;
	}
	return raw;
}

function getSampleIdFromPath(path) {
	const filename =
		path
			.split("/")
			.pop()
			?.replace(/\.json$/, "") ?? path;
	return filename.match(/sample\d+|circuit\d+|example-\d+/i)?.[0] ?? filename;
}

const samples = Object.entries(
	import.meta.glob("../samples/sample*.json", {
		eager: true,
		import: "default",
	}),
)
	.map(([path, raw]) => ({
		id: getSampleIdFromPath(path),
		data: normalizeSample(raw),
	}))
	.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
const defaultSampleId = samples[0]?.id ?? "";

function getUrlWindow() {
	if (typeof window === "undefined") return null;
	try {
		if (
			window.parent !== window &&
			window.parent.location.origin === window.location.origin
		) {
			return window.parent;
		}
	} catch {
		// Fall back to the fixture window when the parent is not same-origin.
	}
	return window;
}

function getSampleIdFromUrl() {
	const urlWindow = getUrlWindow();
	if (!urlWindow) return defaultSampleId;
	const requestedId = new URL(urlWindow.location.href).searchParams.get(
		"sample",
	);
	return samples.some(({ id }) => id === requestedId)
		? requestedId
		: defaultSampleId;
}

function writeSampleIdToUrl(sampleId, mode) {
	const urlWindow = getUrlWindow();
	if (!urlWindow) return;
	const url = new URL(urlWindow.location.href);
	if (url.searchParams.get("sample") === sampleId) return;
	url.searchParams.set("sample", sampleId);
	urlWindow.history[mode]({}, "", url);
}

function getSvgDimensions(data) {
	const bounds = data?.bounds;
	const boundsWidth = Math.abs((bounds?.maxX ?? 1) - (bounds?.minX ?? 0));
	const boundsHeight = Math.abs((bounds?.maxY ?? 1) - (bounds?.minY ?? 0));
	const svgHeight = 1000;
	const aspectRatio =
		boundsWidth > 0 && boundsHeight > 0 ? boundsWidth / boundsHeight : 1.5;
	return {
		svgHeight,
		svgWidth: Math.max(
			360,
			Math.min(4000, Math.round(svgHeight * aspectRatio)),
		),
	};
}

export default function SampleFixture() {
	const [selectedSampleId, setSelectedSampleId] = useState(getSampleIdFromUrl);
	const selectedIndex = Math.max(
		0,
		samples.findIndex(({ id }) => id === selectedSampleId),
	);
	const selectedSample = samples[selectedIndex] ?? samples[0];

	useEffect(() => {
		if (!selectedSample) return undefined;
		writeSampleIdToUrl(selectedSample.id, "replaceState");
		const urlWindow = getUrlWindow();
		if (!urlWindow) return undefined;
		const handlePopState = () => setSelectedSampleId(getSampleIdFromUrl());
		urlWindow.addEventListener("popstate", handlePopState);
		return () => urlWindow.removeEventListener("popstate", handlePopState);
	}, [selectedSample?.id]);

	const svg = useMemo(() => {
		if (!selectedSample) return "";
		const solver = new AutoroutingPipelineSolver(
			structuredClone(selectedSample.data),
		);
		return getSvgFromGraphicsObject(solver.visualize(), {
			backgroundColor: "#ffffff",
			...getSvgDimensions(selectedSample.data),
		});
	}, [selectedSample]);

	const selectSample = (sampleId) => {
		if (!sampleId || sampleId === selectedSample?.id) return;
		setSelectedSampleId(sampleId);
		writeSampleIdToUrl(sampleId, "pushState");
	};

	const selectSampleNumber = (sampleNumber) => {
		if (
			!Number.isInteger(sampleNumber) ||
			sampleNumber < 1 ||
			sampleNumber > samples.length
		) {
			return;
		}
		selectSample(samples[sampleNumber - 1].id);
	};

	if (!selectedSample) {
		return <main style={{ padding: 24 }}>No samples found.</main>;
	}

	return (
		<main className="srj-browser">
			<style>
				{
					"html, body, #root {\n  width: 100%;\n  height: 100%;\n  margin: 0;\n}\n* { box-sizing: border-box; }\n.srj-browser {\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n  width: 100%;\n  height: 100vh;\n  min-height: 420px;\n  padding: clamp(12px, 2.5vw, 24px);\n  overflow: hidden;\n  background: #f3f5f7;\n  color: #17202a;\n  font-family: Inter, ui-sans-serif, system-ui, sans-serif;\n}\n.srj-header {\n  display: flex;\n  flex: 0 0 auto;\n  flex-wrap: wrap;\n  align-items: end;\n  justify-content: space-between;\n  gap: 12px 20px;\n}\n.srj-heading {\n  margin: 0;\n  font-size: clamp(20px, 3vw, 30px);\n  line-height: 1.1;\n}\n.srj-summary {\n  margin: 5px 0 0;\n  color: #59636e;\n  font-size: 14px;\n}\n.srj-controls {\n  display: flex;\n  align-items: end;\n  gap: 8px;\n}\n.srj-input-label {\n  display: grid;\n  gap: 4px;\n  color: #59636e;\n  font-size: 12px;\n  font-weight: 650;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n}\n.srj-input, .srj-button {\n  height: 38px;\n  border: 1px solid #c7cdd4;\n  border-radius: 8px;\n  background: #ffffff;\n  color: #17202a;\n  font: inherit;\n}\n.srj-input {\n  width: 78px;\n  padding: 0 8px;\n  font-variant-numeric: tabular-nums;\n}\n.srj-button {\n  width: 38px;\n  padding: 0;\n  font-size: 20px;\n  line-height: 1;\n  cursor: pointer;\n}\n.srj-button:hover:not(:disabled), .srj-input:hover { border-color: #74808c; }\n.srj-button:focus-visible, .srj-input:focus-visible {\n  outline: 3px solid rgba(37, 99, 235, 0.25);\n  outline-offset: 1px;\n}\n.srj-button:disabled { cursor: default; opacity: 0.35; }\n.srj-canvas {\n  flex: 1 1 auto;\n  min-width: 0;\n  min-height: 0;\n  overflow: hidden;\n  border: 1px solid #d9dee3;\n  border-radius: 12px;\n  background: #ffffff;\n  box-shadow: 0 3px 14px rgba(23, 32, 42, 0.07);\n}\n.srj-svg, .srj-svg > svg {\n  display: block;\n  width: 100%;\n  height: 100%;\n  max-width: none;\n}\n@media (max-width: 560px) {\n  .srj-header, .srj-controls { align-items: stretch; }\n  .srj-controls { width: 100%; }\n  .srj-input-label { flex: 1; }\n  .srj-input { width: 100%; min-width: 0; }\n}"
				}
			</style>
			<header className="srj-header">
				<div>
					<h1 className="srj-heading">
						SRJ24 · Dual I-PEX CSI interposer examples
					</h1>
					<p className="srj-summary" aria-live="polite">
						{selectedSample.id} · {selectedSample.data.obstacles?.length ?? 0}{" "}
						obstacles · {selectedSample.data.connections?.length ?? 0}{" "}
						connections
						{selectedSample.data.layerCount ? (
							<> · {selectedSample.data.layerCount} layers</>
						) : null}
						{selectedSample.data.traces ? (
							<> · {selectedSample.data.traces.length} traces</>
						) : null}
					</p>
				</div>
				<div className="srj-controls">
					<button
						className="srj-button"
						type="button"
						disabled={selectedIndex === 0}
						onClick={() => selectSample(samples[selectedIndex - 1]?.id)}
						aria-label="Previous sample"
					>
						‹
					</button>
					<label className="srj-input-label">
						Sample
						<input
							className="srj-input"
							type="number"
							min="1"
							max={samples.length}
							step="1"
							inputMode="numeric"
							value={selectedIndex + 1}
							onChange={(event) =>
								selectSampleNumber(event.target.valueAsNumber)
							}
						/>
					</label>
					<button
						className="srj-button"
						type="button"
						disabled={selectedIndex === samples.length - 1}
						onClick={() => selectSample(samples[selectedIndex + 1]?.id)}
						aria-label="Next sample"
					>
						›
					</button>
				</div>
			</header>
			<div
				className="srj-canvas"
				role="img"
				aria-label={selectedSample.id + " visualization"}
			>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: This SVG is generated locally from checked-in SRJ data. */}
				<div className="srj-svg" dangerouslySetInnerHTML={{ __html: svg }} />
			</div>
		</main>
	);
}
