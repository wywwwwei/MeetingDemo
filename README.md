# WebRTC 多人视频会议教学与实战 Demo

<p align="left">
  <b>简体中文</b> | <a href="./README_EN.md">English</a>
</p>

本项目是博客 **《WebRTC 核心机制与视频会议实战解析》** 的官方配套工程 Demo。

不同于普通的“两点视频通话”示例，本项目定位于 **“透视型（Observability-First）视频会议系统”**：在实现多人音视频互通与屏幕共享的同时，将 WebRTC 底层的 **SDP 协商**、**ICE 打洞候选池**、**RTCP QoS 指标监控**、**Simulcast 多码流推流**、**降级偏好动态控制** 与 **关键帧请求（PLI/FIR）** 等核心机制完整呈现在前端可视化面板中，做到“看得见、摸得着、可交互实验”。

---

## 对应博客核心知识点

| 博客章节 | 核心机制 | Demo 落地位置与可视化交互 |
| :--- | :--- | :--- |
| **二、连接建立与 NAT 穿透** | SDP 协商、编解码器匹配、DTLS 指纹、ICE Candidate 收集（Host/srflx） | 侧边栏 **「SDP / ICE 透视」** 抽屉，实时解析展示 Codec 列表、指纹，并将 Candidate 自动归类为内网 Host 与 STUN 公网映射 srflx |
| **三、媒体传输与监控协议** | RTP 序列号与时间戳、RTCP SR/RR 反向报告、声画唇音同步（AV Sync） | 侧边栏 **「RTCP 监控看板」**，周期调用 `pc.getStats()` 提取 RTT、Jitter、丢包率，展示视频/音频各自的 SSRC 标识 |
| **四、弱网对抗机制** | 关键帧损坏与秒开画面恢复（PLI / FIR） | 视频窗口与策略控制台提供 **「⚡ 请求关键帧 (PLI)」** 交互按钮，触发信令并记录触发日志 |
| **五、拥塞控制与平滑发包** | TCC 吞吐探测、发包速率与时延波动 | 监控看板内置 **HTML5 Canvas 实时平滑折线图**，实时绘制 30s 吞吐码率与 RTT 波动曲线 |
| **六、动态自适应降级策略** | `degradationPreference`（保清晰 vs 保流畅） | 控制台提供动态单选切换：屏幕共享默认启用 `maintain-resolution`（保 PPT/文字清晰）；摄像头启用 `maintain-framerate`（保人像口型） |
| **六、多码流方案** | Simulcast 多码流并发（High / Mid / Low） | 推流端通过 `addTransceiver` 注入 3 组不同分辨率与码率的 Encoding 分层 |

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
2. **观察 SDP 与 ICE 候选收集**：
   - 点击底部栏的 **「SDP / ICE 透视」** 按钮。
   - 观察收集到的 ICE 候选池：识别 `Host`（局域网网卡 IP）和 `srflx`（经由 Google STUN 反射出的公网映射出口 IP）。
   - 查看协商出的 Codecs（如 VP8、H264、Opus）与 DTLS 指纹。
3. **观察 RTCP 实时监控面板**：
   - 点击底部栏的 **「RTCP 监控看板」**。
   - 实时查看链路 RTT 时延、到达间隔抖动（Jitter）、丢包统计以及瞬时码率。
   - 观察 Canvas 动态图表中黄色（RTT）与蓝色（码率）曲线的波动。
4. **测试自适应降级策略（degradationPreference）**：
   - 点击底部栏的 **「策略控制台」**。
   - 点击底部的 **「屏幕共享」** 按钮，观察降级偏好自动切换为 `maintain-resolution`；关闭后自动恢复为 `maintain-framerate`。
   - 也可手动单选切换 `maintain-resolution`、`maintain-framerate` 与 `balanced`。
5. **测试关键帧快速恢复（PLI / FIR）**：
   - 在参会者视频卡片右上角或控制台中点击 **「⚡ 请求关键帧 (PLI)」**。
   - 观察信令服务端及本地日志中收到的 PLI 请求与时间戳记录。

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
