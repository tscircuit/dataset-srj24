# dataset-srj24

Simple Route JSON dataset generated from 26 production-oriented KiCad and
Altium boards. The first 20 sources are pinned to immutable Git commits,
redistributed under Apache-2.0, and retained byte-for-byte in `kicad_pcb/`.
The six Texas Instruments Altium sources are pinned by SHA-256 to official TI
design-resource archives; their PcbDoc files are not redistributed here.

The selection excludes testbeds, simulation boards, ICT fixtures, archived
projects, and repositories described upstream as experimental. The designs are
complete hardware projects intended for their documented functional use. This
dataset validates source integrity and conversion, but it is not an independent
electrical-safety or manufacturing certification.

## Board summary

| Sample | Board | Complexity | Copper layers | Components | Pads | Traces | Vias | SRJ connections |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sample001` | Jetson Nano Baseboard | Very high | 8 | 391 | 1,516 | 1,759 | 794 | 828 |
| `sample002` | HDMI to MIPI CSI-2 Bridge | High | 4 | 121 | 498 | 513 | 312 | 250 |
| `sample003` | SDI to MIPI CSI-2 Bridge | High | 6 | 190 | 638 | 706 | 374 | 321 |
| `sample004` | Thunderbolt to PCIe Adapter | High | 6 | 272 | 1,111 | 1,088 | 833 | 462 |
| `sample005` | M.2 to PCIe x4 Adapter | Medium | 4 | 20 | 163 | 157 | 92 | 93 |
| `sample006` | CM4 Baseboard LVDS Adapter | High | 6 | 155 | 519 | 545 | 254 | 248 |
| `sample007` | PMOD I3C Sensor Board | Medium | 4 | 96 | 233 | 284 | 71 | 96 |
| `sample008` | D1600E PSU Breakout Board | High | 4 | 237 | 727 | 525 | 903 | 288 |
| `sample009` | M.2 to OCuLink Adapter | Low | 4 | 25 | 150 | 173 | 183 | 91 |
| `sample010` | Dual I-PEX CSI Interposer | Low | 4 | 29 | 152 | 131 | 107 | 96 |
| `sample011` | DC-SCM Breakout Board | High | 6 | 167 | 787 | 838 | 380 | 449 |
| `sample012` | OV9281 Dual Camera Board | Medium | 4 | 82 | 365 | 383 | 233 | 180 |
| `sample013` | SDI-MIPI Video Converter | Very high | 8 | 396 | 1,460 | 1,543 | 1,093 | 735 |
| `sample014` | USB-C Power Delivery Adapter | Medium | 4 | 124 | 344 | 317 | 229 | 129 |
| `sample015` | Audio Latency Tester Board | High | 4 | 240 | 803 | 834 | 302 | 356 |
| `sample016` | PDM Microphone Board | Low | 4 | 13 | 34 | 24 | 28 | 14 |
| `sample017` | OCuLink to PCIe Adapter | High | 4 | 165 | 714 | 687 | 583 | 295 |
| `sample018` | Programmable LED Panel | High | 6 | 315 | 1,069 | 1,250 | 741 | 465 |
| `sample019` | HDMI EDID Debug Board | Medium | 4 | 110 | 409 | 460 | 175 | 154 |
| `sample020` | PoE to USB-C PD Converter | High | 4 | 276 | 811 | 694 | 767 | 409 |
| `sample021` | PMP23595 Four-Phase GaN Buck Converter | High | 6 | 236 | 538 | 944 | 735 | 75 |
| `sample022` | PMP23653 25 W Isolated USB-C Supply | Medium | 4 | 89 | 277 | 367 | 82 | 44 |
| `sample023` | PMP23653 Planar Transformer | Low | 6 | 6 | 18 | 0 | 29 | 2 |
| `sample024` | PMP22650 6.6 kW Bidirectional GaN Onboard Charger | Very high | 8 | 633 | 2,494 | 5,970 | 1,993 | 409 |
| `sample025` | PMP22712 Auxiliary Power Board | Low | 4 | 30 | 80 | 111 | 8 | 23 |
| `sample026` | PMP22773 Sensing Auxiliary Board | Low | 4 | 34 | 106 | 199 | 30 | 28 |

## Board descriptions and properties

### `sample001` — Jetson Nano Baseboard

Production-capable carrier for NVIDIA Jetson Nano, Xavier NX, and TX2 NX
modules. This is the intentionally high-complexity sample, with eight copper
layers and 828 routing connections.

Properties: Jetson SO-DIMM connector, Gigabit Ethernet, USB-C host, Micro USB
debug, Micro HDMI, Mini DisplayPort, M.2 Key M PCIe x4, two 50-pin MIPI CSI-2
FFC connectors, and a 6–36 VDC input.

[Pinned KiCad source](https://github.com/antmicro/jetson-nano-baseboard/blob/d8d0b2d71ab4cc4bcdb204a09f78be40d4c8cda3/jetson-nano-baseboard.kicad_pcb)

### `sample002` — HDMI to MIPI CSI-2 Bridge

Dual-channel video bridge that converts two HDMI streams to independent
four-lane MIPI CSI-2 outputs.

Properties: two HDMI inputs, two four-lane MIPI CSI-2 outputs, Toshiba
TC358743XBG bridge ICs, and Antmicro's 50-pin FFC host interface.

[Pinned KiCad source](https://github.com/antmicro/hdmi-mipi-bridge/blob/6c683289a3191ee6c92cf4f9065ca9b6cb2c0784/antmicro-hdmi-mipi-bridge-hw.kicad_pcb)

### `sample003` — SDI to MIPI CSI-2 Bridge

3G-SDI video bridge with loopback, FPGA-based conversion, dual MIPI CSI-2
outputs, and audio extraction.

Properties: 3G-SDI input and loopback output, two four-lane MIPI CSI-2 outputs,
Semtech GS2971A deserializer, Lattice CrossLink FPGA, and eight-channel I2S
audio output.

[Pinned KiCad source](https://github.com/antmicro/sdi-mipi-bridge-hw/blob/0d08a865eba70ac02bfe16601bbf6d719d5c9d41/sdi-mipi-bridge.kicad_pcb)

### `sample004` — Thunderbolt to PCIe Adapter

Thunderbolt 3 adapter that exposes a PCIe Gen3 x4 expansion slot and supplies
the 12 V rail required by add-in cards.

Properties: Intel JHL6340 Thunderbolt 3 controller, PCIe Gen3 x4 slot, and an
on-board 12 V step-up converter.

[Pinned KiCad source](https://github.com/antmicro/thunderbolt-pcie-adapter/blob/0ae5bbe967dff2b973bcf84522a081cee28a156c/thunderbolt-pcie-adapter.kicad_pcb)

### `sample005` — M.2 to PCIe x4 Adapter

Passive adapter routing an M.2 Key M PCIe x4 interface to a standard PCIe x4
card socket.

Properties: M.2 Key M edge connector, PCIe x4 card socket, external power
connector, and a 0.8 mm target PCB thickness.

[Pinned KiCad source](https://github.com/antmicro/m2-pcie-adapter/blob/11844f18ce14393043affde9e7aa8d51c0cd3ba7/m2-pcie-adapter.kicad_pcb)

### `sample006` — CM4 Baseboard LVDS Adapter

Display adapter converting MIPI DSI from Antmicro's CM4 baseboard to LVDS while
powering an LCD panel and its backlight.

Properties: TI SN65DSI84 MIPI DSI-to-LVDS bridge, I2C touchscreen interface,
18 V, 9.6 V, 3.9 V, and 3.3 V display rails, and an integrated backlight
driver.

[Pinned KiCad source](https://github.com/antmicro/cm4-baseboard-lvds-adapter/blob/4af945ed558e58e4b8aea6fe909fc33d78b63f6f/cm4-lvds-adapter.kicad_pcb)

### `sample007` — PMOD I3C Sensor Board

PMOD-compatible sensor module combining temperature, magnetic, and acceleration
sensing on a shared I3C bus.

Properties: P3T1755 temperature sensor, MMC5603NJ three-axis magnetometer,
BMA580 three-axis accelerometer, I2C/I3C support, and two configurable
push-pull or open-drain output stages.

[Pinned KiCad source](https://github.com/antmicro/pmod-i3c-sensor-board/blob/5ee5d34ff918422fe7af59f7ffdc9d4bdabf18a7/pmod-i3c-sensor-board.kicad_pcb)

### `sample008` — D1600E PSU Breakout Board

Managed breakout for a Dell D1600E-S0 supply with five independently measured
and switched 12 V outputs.

Properties: five output channels, up to 220 W per output, Hall-effect current
sensing with a 12-bit ADC, I2C GPIO power switching, and opto-isolated FT4232H
USB control.

[Pinned KiCad source](https://github.com/antmicro/d1600e-psu-breakout/blob/3802831dcd6c9c6e278216771e92ca7fe3f9ae41/d1600e-psu-breakout-board.kicad_pcb)

### `sample009` — M.2 to OCuLink Adapter

Passive adapter carrying four PCIe lanes from an M.2 Key M socket to an OCuLink
cable interface.

Properties: M.2 Key M edge connector, OCuLink PCIe x4 connector, support for
2280, 2260, and 2242 mechanical formats, and Jetson Orin Baseboard
compatibility.

[Pinned KiCad source](https://github.com/antmicro/m2-oculink-adapter/blob/067f60727046cd0c0db1d39c51c9396f89f48b65/antmicro-m2-oculink-adapter-hw.kicad_pcb)

### `sample010` — Dual I-PEX CSI Interposer

Two-to-one camera interposer joining a pair of four-lane I-PEX MIPI CSI-2 links
to Antmicro's 50-pin FFC host interface.

Properties: two 30-pin I-PEX camera connectors, four MIPI CSI-2 lanes per
camera, one 50-pin host FFC connector, and I2C plus camera-power pass-through.

[Pinned KiCad source](https://github.com/antmicro/dual-ipex-csi-interposer/blob/6b6bd0af5aafe13c02377d534a23a6373922f350/dual-ipex-csi-interposer.kicad_pcb)

### `sample011` — DC-SCM Breakout Board

Six-layer development breakout exposing the high-speed and low-speed
interfaces of Data Center Secure Control Modules.

Properties: 168-pin DC-SCM connector, two OCuLink PCIe connectors, USB host,
client, and serial console interfaces, LTPI, low-speed debug headers, and
on-board temperature sensors.

[Pinned KiCad source](https://github.com/antmicro/dc-scm-breakout-board/blob/45ac35961a9cc3a03c2cf1bdbb1840e0e9f67999/bmc-breakout-board.kicad_pcb)

### `sample012` — OV9281 Dual Camera Board

Dual monochrome global-shutter camera module with independently controlled
MIPI CSI-2 image sensors.

Properties: two OmniVision OV9281 sensors, two independent two-lane MIPI CSI-2
interfaces, separate I2C buses, a unified 50-pin FFC host connector, and M12
lens-holder mounting.

[Pinned KiCad source](https://github.com/antmicro/ov9281-camera-board/blob/ea69666fa06f66a0691e50eebff9356cc2a08e32/ov9281-dual-camera-board.kicad_pcb)

### `sample013` — SDI-MIPI Video Converter

Eight-layer FPGA video converter combining 3G-SDI input and loopback with
multiple MIPI CSI-2 inputs and outputs.

Properties: Lattice CrossLink-NX FPGA, 3G-SDI input and loopback, three
four-lane MIPI CSI-2 interfaces, 2 Gbit DDR3L memory, and dual-source power.

[Pinned KiCad source](https://github.com/antmicro/sdi-mipi-video-converter-hw/blob/5e181748d4a3a20ef88889025bc3085ef7652e36/sdi-mipi-video-converter.kicad_pcb)

### `sample014` — USB-C Power Delivery Adapter

USB-C Power Delivery sink and buck-converter module providing a regulated
12 V output for high-power peripherals.

Properties: 12 V 55 W output, STUSB4500 PD sink controller, SIC477 buck
regulator, auxiliary 5 V and 3.3 V rails, and a QWIIC configuration interface.

[Pinned KiCad source](https://github.com/antmicro/usb-c-power-adapter/blob/4d3e9e289a294f7953bf48dde6c96af8327a0611/usb-c-power-adapter.kicad_pcb)

### `sample015` — Audio Latency Tester Board

Mixed-signal audio platform that drives a speaker and captures synchronized
PDM or I2S microphone data.

Properties: two RP2040 microcontrollers, an I2S class-D amplifier, PDM and I2S
microphone inputs, 32 Mbit serial RAM, and configurable trigger signals.

[Pinned KiCad source](https://github.com/antmicro/audio-latency-tester-board/blob/cf6d05479603d389196fdf30fa8023efb569793a/audio-latency-tester-board.kicad_pcb)

### `sample016` — PDM Microphone Board

Compact circular microphone module routing a single PDM microphone through
filtering and ESD protection to an FFC connector.

Properties: Knowles SPH0644LM4H-1 microphone, five-pin FFC, selectable left or
right audio channel, protected power input, and an 11 mm mounting profile.

[Pinned KiCad source](https://github.com/antmicro/pdm-microphone-board/blob/20813e2bc99f52837a780334b16a30c2afb7644c/microphone-board.kicad_pcb)

### `sample017` — OCuLink to PCIe Adapter

High-speed adapter routing four PCIe lanes from OCuLink to a mechanically
full-size PCIe card slot with flexible power input.

Properties: PCIe x4 over OCuLink, x16 mechanical card slot, USB-C PD, EPS-12V,
or Nano-Fit power, optional clock generation, and dual-slot card clearance.

[Pinned KiCad source](https://github.com/antmicro/oculink-pcie-adapter/blob/6dbb2afa5311c425ac2d3057646f83c626d0f8a2/oculink-to-pcie-adapter.kicad_pcb)

### `sample018` — Programmable LED Panel

Six-layer 10-by-14 LED matrix with alternate MCU and FPGA control paths for
machine-vision latency testing.

Properties: 140 individually controlled LEDs, RP2040 and iCE40UP5K control
options, external synchronization, and a VESA-compatible mounting pattern.

[Pinned KiCad source](https://github.com/antmicro/programmable-led-panel/blob/1222b9447923657204ecf1d73e3b02683ad8c133/led-panel.kicad_pcb)

### `sample019` — HDMI EDID Debug Board

HDMI pass-through debug board for intercepting, replacing, and programming
display EDID data over selectable I2C paths.

Properties: HDMI pass-through, source, sink, EEPROM, and FTDI I2C selection,
on-board EDID EEPROM, USB-C USB-to-I2C, and selectable EEPROM power.

[Pinned KiCad source](https://github.com/antmicro/hdmi-edid-debug-board/blob/615be304c1d2a9ef7a1195692e9f67fb8a41cab3/hdmi-edid-debug-board.kicad_pcb)

### `sample020` — PoE to USB-C PD Converter

Power and data adapter that extracts negotiated PoE++ power into a monitored
USB-C Power Delivery source while passing Ethernet through.

Properties: IEEE 802.3bt PoE++ input, Ethernet pass-through, USB-C PD output up
to 60 W, power monitoring, programmable power profiles, and a fan driver.

[Pinned KiCad source](https://github.com/antmicro/poe-usb-c-pd-converter/blob/f9fdd79ce0428b7c195dcbecbb56e55076da3324/antmicro-poe-to-usbc-pd-adapter.kicad_pcb)

### `sample021` — PMP23595 Four-Phase GaN Buck Converter

TI 960 W reference design converting a nominal 48 V input to 12 V with four
interleaved GaN buck phases on a six-layer board.

[TI design resource](https://www.ti.com/tool/PMP23595) ·
[Altium/SRJ comparison](snapshots/sample021-pmp23595-comparison.svg)

### `sample022` — PMP23653 25 W Isolated USB-C Supply

Main four-layer PCB for TI's 25 W isolated USB-C supply incorporating the
separately modeled planar transformer.

[TI design resource](https://www.ti.com/tool/PMP23653) ·
[Altium/SRJ comparison](snapshots/sample022-pmp23653-main-comparison.svg)

### `sample023` — PMP23653 Planar Transformer

Six-layer PCB transformer whose plated holes and copper pours implement two
electrical winding nets.

[TI design resource](https://www.ti.com/tool/PMP23653) ·
[Altium/SRJ comparison](snapshots/sample023-pmp23653-planar-transformer-comparison.svg)

### `sample024` — PMP22650 6.6 kW Bidirectional GaN Onboard Charger

Eight-layer, water-cooled main board for TI's 6.6 kW bidirectional automotive
onboard-charger design.

[TI design resource](https://www.ti.com/tool/PMP22650) ·
[Altium/SRJ comparison](snapshots/sample024-pmp22650-main-comparison.svg)

### `sample025` — PMP22712 Auxiliary Power Board

Four-layer isolated auxiliary-power board included in the PMP22650 design
package.

[TI design resource](https://www.ti.com/tool/PMP22650) ·
[Altium/SRJ comparison](snapshots/sample025-pmp22712-comparison.svg)

### `sample026` — PMP22773 Sensing Auxiliary Board

Four-layer voltage- and current-sensing auxiliary board included in the
PMP22650 design package.

[TI design resource](https://www.ti.com/tool/PMP22650) ·
[Altium/SRJ comparison](snapshots/sample026-pmp22773-comparison.svg)

## Repository structure

- `kicad_pcb/` contains the exact upstream KiCad boards.
- `circuit-json/` contains converter output for each board.
- `samples/` contains Simple Route JSON with existing top-level routing removed.
- `snapshots/` contains labeled, side-by-side original Altium and SRJ SVGs for
  the TI samples.
- `source-files.json` records immutable provenance, license links, descriptions,
  features, statistics, converter warnings, compatibility normalizations, and
  any unambiguous missing-port repairs.
- `src/` and `index.html` provide the same local viewer structure as
  `dataset-srj18`.

Compatibility normalization is applied only to the in-memory conversion input.
It removes unsupported graphic UUIDs or routing-state fields that do not affect
the unrouted SRJ problem. Missing PCB ports are repaired only when a connected
source port has exactly one pad or plated-hole candidate with the matching pin
hint. The checked-in `.kicad_pcb` files are never rewritten.

## Licensing

Original code and documentation in this repository are licensed under the MIT
License unless otherwise stated. The unmodified boards in `kicad_pcb/` and
their generated board data remain under Apache-2.0. The TI-derived Circuit
JSON, SRJ, and comparison snapshots are subject to the applicable
[TI Terms of Use](https://www.ti.com/legal/terms-conditions/terms-of-use.html);
the native PcbDoc files are downloaded only during regeneration and are not
redistributed by this repository. The repository-level MIT license does not
relicense third-party materials. The full policy is in `LICENSE`, the
Apache-2.0 text is in
`LICENSES/Apache-2.0.txt`, and immutable source attribution is in
`THIRD_PARTY_NOTICES.md` and `source-files.json`. None of the pinned upstream
revisions contains a root `NOTICE` file.

## Usage

```js
const { sample001, dataset } = require("@tscircuit/dataset-srj24")
```

## Regenerate and validate

```sh
bun install
bun run generate
bun run test
bun run build
```

The generators download each pinned source, verify its commit or SHA-256,
convert it to Circuit JSON, and then produce Simple Route JSON. For Altium
sources, native pad-to-net assignments, pad positions, copper-layer count, and
per-net trace widths are copied into Circuit JSON before SRJ generation. The
validator checks that every SRJ connection contains exactly the PCB ports from
its corresponding Altium net.
