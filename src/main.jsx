import React, { useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { convertSrjToGraphicsObject } from "@tscircuit/capacity-autorouter"
import { PCBViewer } from "@tscircuit/pcb-viewer"
import { getSvgFromGraphicsObject } from "graphics-debug"
import sourceFiles from "../source-files.json"
import "./styles.css"

const sampleModules = import.meta.glob("../samples/*.json", { eager: true })
const circuitJsonModules = import.meta.glob("../circuit-json/*.json", { eager: true })

const getJsonDefault = (module) => module.default ?? module

const samples = sourceFiles.map((source) => {
  const sample = getJsonDefault(sampleModules[`../samples/${source.sample}.json`])
  const circuitJson = getJsonDefault(circuitJsonModules[`../${sample.sourceCircuitJson}`])

  return {
    ...source,
    sample,
    circuitJson,
  }
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

function SampleButton({ item, index, selected, thumbnailSvg, onClick }) {
  const { sample } = item

  return (
    <button className={`sampleButton ${selected ? "selected" : ""}`} onClick={onClick}>
      <div className="thumb" dangerouslySetInnerHTML={{ __html: thumbnailSvg }} />
      <div className="sampleText">
        <div className="sampleName">{item.board}</div>
        <div className="sampleMeta">
          {String(index + 1).padStart(2, "0")} · {sample.connections.length} nets · {sample.obstacles.length} obs
        </div>
      </div>
    </button>
  )
}

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [viewMode, setViewMode] = useState("split")

  const selected = samples[selectedIndex]

  const thumbnails = useMemo(
    () =>
      samples.map((item) =>
        makeSrjSvg(
          {
            ...item.sample,
            connections: [],
            traces: [],
          },
          240,
          150,
        ),
      ),
    [],
  )

  const selectedSrjSvg = useMemo(() => makeSrjSvg(selected.sample), [selected])

  const nextSample = () => setSelectedIndex((current) => (current + 1) % samples.length)
  const previousSample = () => setSelectedIndex((current) => (current - 1 + samples.length) % samples.length)

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div>
            <h1>dataset-srj24</h1>
            <p>{samples.length} KiCad boards</p>
          </div>
        </div>
        <div className="sampleList">
          {samples.map((item, index) => (
            <SampleButton
              key={item.sample.id}
              item={item}
              index={index}
              selected={index === selectedIndex}
              thumbnailSvg={thumbnails[index]}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </div>
      </aside>

      <section className="workspace">
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
            <button className="iconButton" onClick={previousSample} aria-label="Previous sample" title="Previous sample">
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
      </section>
    </main>
  )
}

createRoot(document.getElementById("root")).render(<App />)
