# WebRTC 多人视频会议教学与实战 Demo

<p align="left">
  <b>简体中文</b> | <a href="./README_EN.md">English</a>
</p>

> 📖 **官方配套技术博客**：  
> [**Core WebRTC Mechanisms and Practical Video Conferencing Analysis \| Wu Yongwei's Blog**](https://wywwwwei.github.io/2026/09/01/webrtc-intro/)  
> *(本仓库内附完整本地备份：[中文版 webrtc.md](./webrtc.md) | [英文版 webrtc_en.md](./webrtc_en.md))*

---

本项目是深度技术解析博客 [**《Core WebRTC Mechanisms and Practical Video Conferencing Analysis》**](https://wywwwwei.github.io/2026/09/01/webrtc-intro/) 的官方配套工程与交互式实验环境。

不同于普通的“两点视频通话”教程，本项目定位于 **“透视型（Observability-First）多人视频会议系统”**：在实现多人音视频互通与屏幕共享的同时，将 WebRTC 底层的 **信令控制面与 SDP 协商**、**ICE 打洞候选池（Host 与 STUN 反射型）**、**RTCP QoS 指标监控**、**Simulcast 多码流分层推流**、**降级偏好动态控制** 与 **关键帧快速恢复（PLI/FIR）** 等核心机制完整呈现在前端可视化面板中，做到“看得见、摸得着、可交互实验”。

---

## 对应博客核心知识点与工程映射

Demo 中的每一个可视化抽屉与控制面板，均与[官方博客](https://wywwwwei.github.io/2026/09/01/webrtc-intro/)中的架构原理严格一一对应：

| 博客章节 | 核心机制原理 | Demo 落地位置与可视化交互 |
| :--- | :--- | :--- |
| **1. 多人视频会议业务与架构选型** | 纯 P2P 为何必然失效（$O(N^2)$ 带宽与算力爆炸）、Mesh 与 SFU 星型拓扑选型 | 多人房间调度与动态生命周期管理（`join-room`、`peer-joined`、`peer-left`）。 |
| **2. 连接建立全流程** | 带外信令控制面、SDP Offer/Answer 协商与交集裁剪、DTLS 指纹防篡改、ICE 候选收集（Host 与 STUN srflx）、Trickle ICE 增量打洞 | 侧边栏 **「SDP / ICE 透视」** 抽屉：实时解析协商 Codec 列表、DTLS 证书指纹，并将 Candidate 自动归类为内网 Host 与 STUN 公网映射 srflx。 |
| **3. 媒体传输与安全基石** | RTP 报头语义（Sequence、Timestamp、SSRC）、RTCP SR/RR 反向报告、声画唇音同步（AV Sync）、DTLS-SRTP 媒体加密 | 侧边栏 **「RTCP 监控看板」**：周期调用 `pc.getStats()` 提取真实 RTT、Jitter、丢包率，展示视频/音频各自的独立 SSRC 标识。 |
| **4. 弱网 QoS 与动态自适应策略** | 关键帧快速恢复（PLI / FIR）、`degradationPreference`（保清晰 vs 保流畅）、Simulcast 多码流推流（High/Mid/Low 分层） | **「策略控制台」** 与 **「⚡ 请求关键帧 (PLI)」**：屏幕共享自动保清晰（`maintain-resolution`）、人像自动保流畅（`maintain-framerate`），以及 `addTransceiver` 注入 3 组分层编码。 |
| **5. 真实工程可观测性与发包平滑** | 实时吞吐码率与时延抖动监控、发包平滑（Pacing） | 看板内置 **HTML5 Canvas 实时平滑折线图**（30s 吞吐与 RTT 波动曲线），并与 `chrome://webrtc-internals` 工业级诊断树一一对应。 |
| **6. 端到端全生命周期时序** | Join Room → ICE 打洞 → DTLS 握手 → SRTP 发包 → 解码渲染完整状态流转 | 前端核心引擎 `RtcRoom.ts` 与信令服务 `server.ts` 的完整闭环状态机实现。 |

---

## 快速启动

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 一键启动（同时启动信令服务与前端界面）

在项目根目录下执行：
```bash
npm run dev
```

启动后：
- 前端页面：`http://localhost:3000`
- 信令服务：`ws://localhost:3001`

---

## 交互实验测试指南

建议使用两个浏览器窗口进行双端协同实验（或一个正常窗口 + 一个无痕隐身窗口）：

1. **进入会议**：
   - 打开两个浏览器窗口，均访问 `http://localhost:3000`。
   - 保持默认房间号（如 `demo-room-888`），输入两个不同的昵称（如“参会者A”与“参会者B”），点击“进入会议实验室”。
   - 允许浏览器调用摄像头与麦克风权限（若无摄像头设备，系统会自动启用内置的 Canvas 模拟动态流）。

2. **观察 SDP 与 ICE 候选收集** *（对应[博客第 2 章：连接建立全流程](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#2-Connection-Establishment)）*：
   - 点击底部栏的 **「SDP / ICE 透视」** 按钮。
   - 观察收集到的 ICE 候选池：识别 `Host`（局域网网卡 IP）和 `srflx`（经由 Google STUN 反射出的公网映射出口 IP）。
   - 查看协商出的 Codecs（如 VP8、H264、Opus）与 DTLS 证书指纹。

3. **观察 RTCP 实时监控面板** *（对应[博客第 3 章与第 5 章：媒体传输与可观测性](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#3-Media-Transmission-and-Security-Substrate)）*：
   - 点击底部栏的 **「RTCP 监控看板」**。
   - 实时查看链路 RTT 时延、到达间隔抖动（Jitter）、丢包统计以及瞬时码率。
   - 观察 Canvas 动态图表中黄色（RTT）与蓝色（码率）曲线在 30 秒滑动窗口内的波动。

4. **测试自适应降级策略（degradationPreference）** *（对应[博客第 4 章：弱网 QoS 与自适应策略](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#4-QoS-and-Dynamic-Adaptation-Strategies-in-Weak-Network-Conditions)）*：
   - 点击底部栏的 **「策略控制台」**。
   - 点击底部的 **「屏幕共享」** 按钮，观察降级偏好自动切换为 `maintain-resolution`（优先保文字/PPT清晰）；关闭后自动恢复为 `maintain-framerate`（优先保人像流畅）。
   - 也可手动单选切换 `maintain-resolution`、`maintain-framerate` 与 `balanced`。

5. **测试关键帧快速恢复（PLI / FIR）** *（对应[博客第 4.2 节：关键帧快速恢复](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#3-Keyframe-Fast-Recovery-PLI-and-FIR)）*：
   - 在参会者视频卡片右上角或控制台中点击 **「⚡ 请求关键帧 (PLI)」**。
   - 观察信令服务端及本地日志中收到的 PLI 请求与时间戳记录，触发推流端即时刷新 I 帧。

6. **浏览器底层诊断面板观察** *（对应[博客第 5 节：chrome://webrtc-internals](https://wywwwwei.github.io/2026/09/01/webrtc-intro/#Industrial-Grade-Browser-Inspection-chrome-webrtc-internals)）*：
   - 在新标签页打开 `chrome://webrtc-internals`，实时审查 WebRTC 引擎的底层状态图表（`RTCIceCandidatePair`、`outbound-rtp`、`inbound-rtp`）。

---

## 项目工程架构

```text
MeetingDemo/
├── server/                    # Node.js + WebSocket 极简轻量信令服务
│   ├── src/
│   │   ├── server.ts          # 房间管理、SDP/ICE 转发与 PLI 事件通知
│   │   └── types.ts           # 信令报文类型定义
│   └── tsconfig.json
├── client/                    # React 18 + TypeScript + Vite 现代化会议客户端
│   ├── src/
│   │   ├── rtc/
│   │   │   ├── RtcRoom.ts     # WebRTC 客户端核心引擎 (PeerConnection, Simulcast, 偏好调度)
│   │   │   ├── statsMonitor.ts# RTCP / getStats 周期采样器与指标算法
│   │   │   └── types.ts       # 监控指标与连接状态接口
│   │   ├── components/
│   │   │   ├── VideoTile.tsx  # 视频画面与分辨率/FPS实时徽标
│   │   │   ├── Controls.tsx   # 设备底栏与看板切换
│   │   │   ├── QosPanel.tsx   # RTCP QoS 数据看板与 Canvas 走势折线图
│   │   │   ├── SdpInspector.tsx # SDP 参数与 ICE 候选解析抽屉
│   │   │   └── StrategyCtrl.tsx # 降级偏好与 PLI 交互控制台
│   │   ├── App.tsx            # 会议主布局与视窗调度
│   │   └── main.tsx
│   └── vite.config.ts
└── package.json               # 根目录并发联跑脚本
```
