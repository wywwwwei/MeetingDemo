# WebRTC Multi-Party Video Conferencing Demo

<p align="left">
  <a href="./README.md">简体中文</a> | <b>English</b>
</p>

> 📖 **Companion Technical Blog**:  
> [**Core WebRTC Mechanisms and Practical Video Conferencing Analysis \| Wu Yongwei's Blog**](https://wywwwwei.github.io/2026/09/01/webrtc-intro/)  
> *(Local copy available in this repository: [webrtc_en.md](./webrtc_en.md) | [webrtc.md](./webrtc.md))*

---

This repository is the companion project and interactive lab for the technical article [**"Core WebRTC Mechanisms and Practical Video Conferencing Analysis"**](https://wywwwwei.github.io/2026/09/01/webrtc-intro/).

Unlike trivial "two-peer chat" tutorials, this project is built as an **Observability-First Multi-Party Video Conferencing System**. While delivering real-time multi-party audio, video, and screen sharing, it exposes critical WebRTC internals directly into interactive visual panels: **Signaling & SDP Negotiation**, **ICE Candidate Pools (Host vs. STUN Reflexive)**, **RTCP QoS Telemetry**, **Simulcast Multi-Stream Encoding**, **Dynamic Degradation Preferences**, and **Keyframe Recovery (PLI/FIR)**.

---

## Core Blog Topics & Engineering Mapping

Every visual inspection drawer and control panel in this demo corresponds directly to the architectural concepts analyzed in the technical blog [**"Core WebRTC Mechanisms and Practical Video Conferencing Analysis"**](https://wywwwwei.github.io/2026/09/01/webrtc-intro/):

| Blog Chapter | Core Architectural Mechanism | Demo Implementation & Interactive Feature |
| :--- | :--- | :--- |
| **1. Multi-Party Video Architecture** | Why pure P2P fails ($O(N^2)$ uplink and CPU explosion), Mesh vs. SFU star topology trade-offs | Multi-client room orchestration, dynamic participant lifecycle management (`join-room`, `peer-joined`, `peer-left`). |
| **2. Connection Establishment** | Out-of-band signaling control plane, SDP offer/answer negotiation, DTLS fingerprint anti-tampering, ICE candidate harvesting (`host` / `srflx`), Trickle ICE | **"SDP / ICE Inspector"** drawer: live parsing of negotiated codecs, DTLS certificate fingerprints, and categorized Host vs. STUN reflexive candidates. |
| **3. Media Transmission & Security** | RTP header semantics (Sequence, Timestamp, SSRC), RTCP SR/RR feedback, Lip-Sync (AV Sync), DTLS-SRTP media encryption | **"RTCP QoS Dashboard"**: periodic `pc.getStats()` polling to extract real-time RTT, Jitter, Fraction Lost, and dedicated audio/video SSRCs. |
| **4. QoS & Weak-Network Adaptation** | Keyframe fast recovery (PLI / FIR), `degradationPreference` (resolution vs. framerate), Simulcast multi-streaming (`f`, `h`, `q` layers) | **"Strategy Console"** & **"⚡ Request Keyframe (PLI)"** button: dynamic degradation preference switching, live PLI triggering, and multi-encoding transceiver configuration. |
| **5. Practical Observability & Pacing** | Real-time throughput estimation, RTT latency fluctuation, packet pacing | Built-in **HTML5 Canvas Real-Time Chart** (rolling 30s bitrate & RTT curves) + native `chrome://webrtc-internals` diagnostic integration. |
| **6. End-to-End Lifecycle Sequence** | Join Room → ICE Gathering → DTLS Handshake → SRTP Media Flow → Render | Complete frontend/server implementation following the full state-machine transition flow. |

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

We recommend opening **two browser windows** (or one regular window + one incognito window) side-by-side to conduct live multi-party experiments:

1. **Join the Meeting**:
   - Open `http://localhost:3000` in both windows.
   - Keep the default room ID (e.g., `demo-room-888`), enter two different names (e.g., "Alice" and "Bob"), and click **"Enter Lab"**.
   - Allow camera and microphone permissions *(an animated fallback canvas stream is automatically generated if no hardware camera is present)*.

2. **Inspect SDP & ICE Candidate Pools** *(Maps to [Blog Chapter 2: Connection Establishment](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#2-Connection-Establishment))*:
   - Click **"SDP / ICE Inspector"** in the bottom control bar.
   - Inspect gathered ICE candidates: observe `Host` (LAN IP) and `srflx` (public reflexive IP discovered via Google STUN).
   - Review negotiated codecs (e.g., VP8, H.264, Opus) and DTLS certificate fingerprints.

3. **Monitor RTCP QoS Metrics in Real-Time** *(Maps to [Blog Chapter 3: Media Transmission](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#3-Media-Transmission-and-Security-Substrate))*:
   - Click **"RTCP QoS Dashboard"** in the bottom control bar.
   - Observe Round-Trip Time (RTT), Interarrival Jitter, Packet Loss, and real-time bitrate.
   - Watch the dynamic Canvas chart reflect throughput and latency trends over a rolling 30-second window.

4. **Test Dynamic Adaptation Strategies (`degradationPreference`)** *(Maps to [Blog Chapter 4: QoS & Adaptation](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#4-QoS-and-Dynamic-Adaptation-Strategies-in-Weak-Network-Conditions))*:
   - Click **"Strategy Console"** in the bottom bar.
   - Click **"Share Screen"**: notice how the system automatically switches degradation preference to `maintain-resolution` (prioritizing text and slide clarity); stopping screen share reverts to `maintain-framerate`.
   - You can also manually toggle between `maintain-resolution`, `maintain-framerate`, and `balanced`.

5. **Trigger Keyframe Recovery via PLI** *(Maps to [Blog Chapter 4.2: PLI and FIR](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#3-Keyframe-Fast-Recovery-PLI-and-FIR))*:
   - In any remote participant video card or in the Strategy Console, click **"⚡ Request Keyframe (PLI)"**.
   - Observe the instant PLI signaling dispatched to the sender and logged in the console.

6. **Inspect via Browser Diagnostics** *(Maps to [Blog Chapter 5: chrome://webrtc-internals](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#Industrial-Grade-Browser-Inspection-chrome-webrtc-internals))*:
   - Open `chrome://webrtc-internals` in a separate tab to inspect WebRTC engine graphs (`RTCIceCandidatePair`, `outbound-rtp`, `inbound-rtp`).

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
