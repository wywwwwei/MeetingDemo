# WebRTC Multi-Party Video Conferencing Demo & Lab

<p align="left">
  <a href="./README.md">简体中文</a> | <b>English</b>
</p>

This repository is the official companion project for the technical blog post: **"Deep Dive into WebRTC Core Mechanisms and Multi-Party Video Conferencing"**.

Unlike trivial "two-peer chat" demos, this project is built as an **Observability-First Video Conferencing System**. While delivering multi-party audio/video and screen sharing, it exposes critical WebRTC internals directly into interactive visual panels: **SDP Negotiation**, **ICE Candidate Pools**, **RTCP QoS Telemetry**, **Simulcast Multi-Stream Encoding**, **Dynamic Degradation Preferences**, and **Keyframe Recovery (PLI/FIR)**.

---

## Core Blog Topics & Engineering Mapping

| Blog Topic | Core Mechanism | Demo Location & Interactive Feature |
| :--- | :--- | :--- |
| **2. Connection & NAT Traversal** | SDP offer/answer, codec matching, DTLS fingerprint, ICE candidate harvesting (`host` / `srflx`) | **"SDP / ICE Inspector"** drawer: live codec parsing, fingerprint display, and automatic categorization of Host vs. STUN Reflexive candidates. |
| **3. Media Transport & Telemetry** | RTP sequence numbers, RTCP SR/RR reports, Lip-sync (AV Sync) | **"RTCP QoS Dashboard"**: periodic `pc.getStats()` polling to extract RTT, Jitter, Fraction Lost, and respective audio/video SSRCs. |
| **4. Packet Loss & Recovery** | Keyframe loss & fast decoding recovery (PLI / FIR) | **"⚡ Request Keyframe (PLI)"** button in video tiles and control panel to trigger signaling and record refresh logs. |
| **5. Congestion Control & Pacing** | TCC bandwidth estimation, packet pacing, queuing delay | **Real-time HTML5 Canvas chart**: renders rolling 30s bitrate throughput and RTT fluctuation curves. |
| **6. Dynamic Adaptation** | `degradationPreference` (Resolution vs. Framerate) | Interactive preference switcher: Screen share defaults to `maintain-resolution`; camera defaults to `maintain-framerate`. |
| **6. Multi-Stream Architecture** | Simulcast (High / Mid / Low layers) | Sender uses `addTransceiver` with 3 separate encoding layers (`rid: f, h, q`). |

---

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### One-Command Launch (Signaling + Frontend)

From the project root:
```bash
npm run dev
```

Endpoints:
- Frontend App: `http://localhost:3000`
- Signaling Server: `ws://localhost:3001`

---

## Interactive Experiment Guide

We recommend using two browser windows (or one regular window + one incognito window) for side-by-side verification:

1. **Join the Meeting**:
   - Open `http://localhost:3000` in both windows.
   - Keep the default room ID (e.g. `demo-room-888`), enter two different names (e.g., "Alice" and "Bob"), and click "Enter Lab".
   - Allow camera/microphone access (an animated fallback canvas stream is automatically generated if no hardware camera is present).
2. **Inspect SDP & ICE Candidate Pools**:
   - Click **"SDP / ICE Inspector"** in the bottom bar.
   - Observe gathered ICE candidates: identify `Host` (LAN IP) and `srflx` (public reflexive IP discovered via Google STUN).
   - Review negotiated codecs (e.g., VP8, H.264, Opus) and DTLS certificates.
3. **Monitor RTCP QoS Metrics**:
   - Click **"RTCP QoS Dashboard"** in the bottom bar.
   - Observe Round-Trip Time (RTT), Interarrival Jitter, Packet Loss, and real-time bitrate.
   - Watch the dynamic Canvas chart reflect throughput and latency trends.
4. **Test Dynamic Adaptation (`degradationPreference`)**:
   - Click **"Strategy Console"** in the bottom bar.
   - Toggle **"Screen Share"**: notice the adaptation automatically switches to `maintain-resolution`; stopping it restores `maintain-framerate`.
   - Manually switch between `maintain-resolution`, `maintain-framerate`, and `balanced` to observe behavior.
5. **Simulate Keyframe Recovery (PLI / FIR)**:
   - Click **"⚡ Request Keyframe (PLI)"** on any participant tile or within the Strategy Console.
   - Verify that the signaling server and the sender console log the keyframe request and trigger encoder refresh.

---

## Repository Architecture

```text
MeetingDemo/
├── server/                    # Lightweight Node.js + WebSocket signaling server
│   ├── src/
│   │   ├── server.ts          # Room management, SDP/ICE relay, and PLI event dispatching
│   │   └── types.ts           # Protocol message interfaces
│   └── tsconfig.json
├── client/                    # Modern React 18 + TypeScript + Vite frontend
│   ├── src/
│   │   ├── rtc/
│   │   │   ├── RtcRoom.ts     # Core WebRTC engine (PeerConnection, Simulcast, degradation management)
│   │   │   ├── statsMonitor.ts# RTCP getStats poller & metric calculus
│   │   │   └── types.ts       # Type definitions for stats and peer states
│   │   ├── components/
│   │   │   ├── VideoTile.tsx  # Video container with live resolution/FPS badges
│   │   │   ├── Controls.tsx   # Media controls and panel toggles
│   │   │   ├── QosPanel.tsx   # RTCP QoS metrics & real-time Canvas wave chart
│   │   │   ├── SdpInspector.tsx # SDP details and categorized ICE candidates drawer
│   │   │   └── StrategyCtrl.tsx # Degradation preference and PLI experiment console
│   │   ├── App.tsx            # Main stage layout and drawer dispatcher
│   │   └── main.tsx
│   └── vite.config.ts
└── package.json               # Root scripts for concurrent development
```
