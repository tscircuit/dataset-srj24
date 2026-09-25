import React, { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { convertSrjToGraphicsObject } from "@tscircuit/capacity-autorouter"
import { PCBViewer } from "@tscircuit/pcb-viewer"
import { getSvgFromGraphicsObject } from "graphics-debug"
import sourceFiles from "../source-files.json"
import "./styles.css"

const sampleLoaders = import.meta.glob("../samples/*.json", {
  query: "?raw",
  import: "default",
})
const circuitJsonLoaders = import.meta.glob("../circuit-json/*.json", {
  query: "?raw",
  import: "default",
})

const getBoardArea = (bounds) => {
  if (!bounds) return 0
  return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)
}

const makeSrjSvg = (sample, width = 900, height = 640) =>
  getSvgFromGraphicsObject(convertSrjToGraphicsObject(sample), {
    backgroundColor: "#11161b",
    svgWidth: width,
    svgHeight: height,
    hideInlineLabels: true,
  })

function SvgPreview({ svg, title }) {
  return (
    <div className="svgBox" aria-label={title}>
      <div className="svgFrame" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}

function SampleButton({ source, item, index, selected, thumbnailSvg, onClick }) {
  const sample = item?.sample

  return (
    <button className={`sampleButton ${selected ? "selected" : ""}`} onClick={onClick}>
      {thumbnailSvg ? (
        <div className="thumb" dangerouslySetInnerHTML={{ __html: thumbnailSvg }} />
      ) : (
        <div className="thumb thumbPlaceholder">
          <span>{source.sample}</span>
        </div>
      )}
      <div className="sampleText">
        <div className="sampleName">{source.board}</div>
        <div className="sampleMeta">
          {String(index + 1).padStart(2, "0")} ·{" "}
          {sample
            ? `${sample.connections.length} nets · ${sample.obstacles.length} obs`
            : `${source.stats.components} cmp · ${source.stats.pads} pads`}
        </div>
      </div>
    </button>
  )
}

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [viewMode, setViewMode] = useState("split")
  const [selected, setSelected] = useState(null)
  const [loadError, setLoadError] = useState("")
  const sampleCache = useRef(new Map())
  const thumbnailCache = useRef(new Map())

  useEffect(() => {
    let cancelled = false
    const source = sourceFiles[selectedIndex]
    const cached = sampleCache.current.get(selectedIndex)

    if (cached) {
      setSelected(cached)
      setLoadError("")
      return () => {
        cancelled = true
      }
    }

    setSelected(null)
    setLoadError("")

    const loadSelectedSample = async () => {
      const sampleLoader = sampleLoaders[`../samples/${source.sample}.json`]
      if (!sampleLoader) throw new Error(`Missing SRJ loader for ${source.sample}`)

      const sample = JSON.parse(await sampleLoader())
      const circuitJsonLoader = circuitJsonLoaders[`../${sample.sourceCircuitJson}`]
      if (!circuitJsonLoader) throw new Error(`Missing Circuit JSON loader for ${source.sample}`)

      const item = {
        ...source,
        sample,
        circuitJson: JSON.parse(await circuitJsonLoader()),
      }

      sampleCache.current.set(selectedIndex, item)
      thumbnailCache.current.set(selectedIndex, makeSrjSvg({ ...sample, connections: [], traces: [] }, 240, 150))

      if (!cancelled) setSelected(item)
    }

    loadSelectedSample().catch((error) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error))
    })

    return () => {
      cancelled = true
    }
  }, [selectedIndex])

  const selectedSrjSvg = useMemo(() => (selected ? makeSrjSvg(selected.sample) : ""), [selected])

  const nextSample = () => setSelectedIndex((current) => (current + 1) % sourceFiles.length)
  const previousSample = () => setSelectedIndex((current) => (current - 1 + sourceFiles.length) % sourceFiles.length)

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div>
            <h1>dataset-srj24</h1>
            <p>{sourceFiles.length} KiCad and Altium boards</p>
          </div>
        </div>
        <div className="sampleList">
          {sourceFiles.map((source, index) => (
            <SampleButton
              key={source.sample}
              source={source}
              item={sampleCache.current.get(index)}
              index={index}
              selected={index === selectedIndex}
              thumbnailSvg={thumbnailCache.current.get(index)}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </div>
      </aside>

      <section className="workspace">
        {loadError && <div className="loadingState errorState">Unable to load sample: {loadError}</div>}
        {!loadError && !selected && <div className="loadingState">Loading board data…</div>}
        {selected && (
          <>
            <header className="topbar">
              <div className="titleBlock">
                <div className="eyebrow">{selected.sample.id}</div>
                <h2>{selected.board}</h2>
                <p>{selected.repository}</p>
              </div>

              <div className="controls">
                <div className="segmented" role="tablist" aria-label="View mode">
                  <button className={viewMode === "split" ? "active" : ""} onClick={() => setViewMode("split")}>
                    Split
                  </button>
                  <button className={viewMode === "pcb" ? "active" : ""} onClick={() => setViewMode("pcb")}>
                    PCB
                  </button>
                  <button className={viewMode === "srj" ? "active" : ""} onClick={() => setViewMode("srj")}>
                    SRJ
                  </button>
                </div>
                <button
                  className="iconButton"
                  onClick={previousSample}
                  aria-label="Previous sample"
                  title="Previous sample"
                >
                  ‹
                </button>
                <button className="iconButton" onClick={nextSample} aria-label="Next sample" title="Next sample">
                  ›
                </button>
              </div>
            </header>

            <div className="stats">
              <div>
                <span>Connections</span>
                <strong>{selected.sample.connections.length}</strong>
              </div>
              <div>
                <span>Obstacles</span>
                <strong>{selected.sample.obstacles.length}</strong>
              </div>
              <div>
                <span>Layers</span>
                <strong>{selected.sample.layerCount}</strong>
              </div>
              <div>
                <span>Area</span>
                <strong>{Math.round(getBoardArea(selected.sample.bounds)).toLocaleString()} mm²</strong>
              </div>
            </div>

            <div className={`viewerGrid ${viewMode}`}>
              {(viewMode === "split" || viewMode === "pcb") && (
                <section className="viewerPane">
                  <div className="paneHeader">
                    <h3>Circuit JSON PCB</h3>
                    <span>pcb-viewer</span>
                  </div>
                  <div className="pcbViewerBox">
                    <PCBViewer circuitJson={selected.circuitJson} />
                  </div>
                </section>
              )}

              {(viewMode === "split" || viewMode === "srj") && (
                <section className="viewerPane">
                  <div className="paneHeader">
                    <h3>Simple Route JSON</h3>
                    <span>capacity-autorouter</span>
                  </div>
                  <SvgPreview svg={selectedSrjSvg} title={`${selected.board} SRJ preview`} />
                </section>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  )
}

createRoot(document.getElementById("root")).render(<App />)
