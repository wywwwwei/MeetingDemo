import { 
  CandidateInfo, 
  DegradationPreferenceType, 
  PeerConnectionState, 
  RtcMetrics, 
  SdpAnalysis, 
  SimulcastLayerConfig 
} from './types';
import { StatsMonitor } from './statsMonitor';

export interface RtcRoomCallbacks {
  onPeersChange: (peers: Map<string, PeerConnectionState>) => void;
  onLocalStreamChange: (stream: MediaStream | null) => void;
  onScreenStreamChange: (stream: MediaStream | null) => void;
  onKeyframeEvent: (info: { from: string; reason: string; timestamp: number }) => void;
  onSignalingStateChange: (connected: boolean) => void;
}

export class RtcRoom {
  public peerId: string;
  public peerName: string;
  public roomId: string;

  private ws: WebSocket | null = null;
  private wsUrl: string;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private isScreenSharing: boolean = false;

  private peers: Map<string, {
    pc: RTCPeerConnection;
    state: PeerConnectionState;
    monitor: StatsMonitor;
    videoSender?: RTCRtpSender;
    pendingCandidates?: RTCIceCandidate[];
  }> = new Map();

  // 暂存对端 PeerConnection 建立前提前到达的 ICE Candidates
  private earlyIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  private callbacks: RtcRoomCallbacks;
  private degradationPreference: DegradationPreferenceType = 'maintain-framerate';
  public simulcastEnabled: boolean = true;
  private simulcastLayers: SimulcastLayerConfig[] = [
    { rid: 'f', active: true, maxBitrate: 1500000, maxFramerate: 30 },
    { rid: 'h', active: true, maxBitrate: 500000, scaleResolutionDownBy: 2.0 },
    { rid: 'q', active: true, maxBitrate: 150000, scaleResolutionDownBy: 4.0 }
  ];

  // 默认使用 Google 公共 STUN 服务器进行 NAT 穿透演示
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor(
    roomId: string, 
    peerName: string, 
    wsUrl: string = 'ws://localhost:3001',
    callbacks: RtcRoomCallbacks
  ) {
    this.roomId = roomId;
    this.peerName = peerName;
    this.peerId = 'peer_' + Math.random().toString(36).substring(2, 9);
    this.wsUrl = wsUrl;
    this.callbacks = callbacks;
  }

  // 1. 本地媒体采集
  public async initMedia(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: true
      });
      this.localStream = stream;
      this.callbacks.onLocalStreamChange(stream);
      return stream;
    } catch (err) {
      console.warn('摄像头/麦克风权限受限，生成测试媒体画布...', err);
      const canvasStream = this.createMockCanvasStream();
      this.localStream = canvasStream;
      this.callbacks.onLocalStreamChange(canvasStream);
      return canvasStream;
    }
  }

  // 2. 连接信令服务器并加入房间
  public connect() {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('[Signaling] 已连接到信令服务器');
      this.callbacks.onSignalingStateChange(true);
      this.sendSignaling({
        type: 'join-room',
        roomId: this.roomId,
        peerId: this.peerId,
        peerName: this.peerName
      });
    };

    this.ws.onmessage = async (evt) => {
      try {
        const data = JSON.parse(evt.data);
        await this.handleSignalingMessage(data);
      } catch (e) {
        console.error('处理信令失败:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[Signaling] 与信令服务器断开');
      this.callbacks.onSignalingStateChange(false);
    };

    this.ws.onerror = (e) => {
      console.error('[Signaling Error]', e);
    };
  }

  private sendSignaling(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // 3. 信令调度
  private async handleSignalingMessage(msg: any) {
    switch (msg.type) {
      case 'existing-peers': {
        // 作为新加入者，向房间内已有的每个成员主动发起连接 (Create Offer)
        for (const peer of msg.peers) {
          await this.createPeerConnection(peer.peerId, peer.peerName, true);
        }
        break;
      }

      case 'peer-joined': {
        // 新成员加入，等待对方发送 Offer
        console.log(`[Meeting] 成员加入: ${msg.peerName} (${msg.peerId})`);
        break;
      }

      case 'offer': {
        // 收到对端的 Offer
        let peerObj = this.peers.get(msg.senderPeerId);
        if (!peerObj) {
          peerObj = await this.createPeerConnection(msg.senderPeerId, '参会者', false);
        }
        const pc = peerObj.pc;

        // 解析远端 SDP
        peerObj.state.remoteSdp = this.parseSdp(msg.sdp.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));

        // 如果在此之前收到了 ICE Candidate，现在将其加入
        if (peerObj.pendingCandidates && peerObj.pendingCandidates.length > 0) {
          for (const cand of peerObj.pendingCandidates) {
            await pc.addIceCandidate(cand).catch(e => console.warn('addIceCandidate error:', e));
          }
          peerObj.pendingCandidates = [];
        }

        // 生成并回复 Answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        peerObj.state.localSdp = this.parseSdp(answer.sdp || '');

        this.sendSignaling({
          type: 'answer',
          targetPeerId: msg.senderPeerId,
          senderPeerId: this.peerId,
          sdp: answer
        });
        this.notifyPeersChange();
        break;
      }

      case 'answer': {
        const peerObj = this.peers.get(msg.senderPeerId);
        if (peerObj) {
          peerObj.state.remoteSdp = this.parseSdp(msg.sdp.sdp);
          await peerObj.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));

          if (peerObj.pendingCandidates && peerObj.pendingCandidates.length > 0) {
            for (const cand of peerObj.pendingCandidates) {
              await peerObj.pc.addIceCandidate(cand).catch(e => console.warn('addIceCandidate error:', e));
            }
            peerObj.pendingCandidates = [];
          }

          this.notifyPeersChange();
        }
        break;
      }

      case 'ice-candidate': {
        const peerObj = this.peers.get(msg.senderPeerId);
        if (msg.candidate) {
          if (peerObj) {
            const cand = new RTCIceCandidate(msg.candidate);
            
            if (peerObj.pc.remoteDescription && peerObj.pc.remoteDescription.type) {
              await peerObj.pc.addIceCandidate(cand).catch(e => console.warn('addIceCandidate error:', e));
            } else {
              if (!peerObj.pendingCandidates) peerObj.pendingCandidates = [];
              peerObj.pendingCandidates.push(cand);
            }

            const parsed = this.parseCandidate(msg.candidate.candidate, true);
            if (parsed) {
              peerObj.state.remoteCandidates.push(parsed);
              this.notifyPeersChange();
            }
          } else {
            // 对端尚未创建 PeerConnection，暂存 Candidate 防止丢包
            if (!this.earlyIceCandidates.has(msg.senderPeerId)) {
              this.earlyIceCandidates.set(msg.senderPeerId, []);
            }
            this.earlyIceCandidates.get(msg.senderPeerId)!.push(msg.candidate);
          }
        }
        break;
      }

      case 'keyframe-requested': {
        // 远端请求关键帧 (PLI / FIR)
        console.log(`[PLI/FIR] 收到 ${msg.senderPeerId} 的关键帧刷新请求，原因: ${msg.reason}`);
        this.callbacks.onKeyframeEvent({
          from: msg.senderPeerId,
          reason: msg.reason || '网络丢包或画面刷新 (PLI/FIR)',
          timestamp: Date.now()
        });

        // 如果支持，通知底层编码器生成关键帧
        this.triggerLocalKeyframe();
        break;
      }

      case 'peer-left': {
        this.closePeer(msg.peerId);
        break;
      }
    }
  }

  // 4. 创建 RTCPeerConnection 实例
  private async createPeerConnection(remotePeerId: string, remotePeerName: string, isInitiator: boolean) {
    const pc = new RTCPeerConnection(this.rtcConfig);

    const state: PeerConnectionState = {
      peerId: remotePeerId,
      peerName: remotePeerName,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      localCandidates: [],
      remoteCandidates: [],
      metricsHistory: []
    };

    const monitor = new StatsMonitor(pc, (metrics: RtcMetrics) => {
      const peer = this.peers.get(remotePeerId);
      if (peer) {
        peer.state.latestMetrics = metrics;
        peer.state.metricsHistory.push(metrics);
        if (peer.state.metricsHistory.length > 30) {
          peer.state.metricsHistory.shift(); // 保持最近 30 秒数据
        }
        this.notifyPeersChange();
      }
    });

    let videoSender: RTCRtpSender | undefined;

    // 添加本地音视频轨道
    const activeStream = this.isScreenSharing ? this.screenStream : this.localStream;
    if (activeStream) {
      const audioTrack = activeStream.getAudioTracks()[0];
      const videoTrack = activeStream.getVideoTracks()[0];

      if (audioTrack) {
        pc.addTrack(audioTrack, activeStream);
      }

      if (videoTrack) {
        // 在标准 P2P 模式下使用标准的 addTrack，保证双向视频流 100% 顺畅建立
        videoSender = pc.addTrack(videoTrack, activeStream);

        // 应用当前的降级偏好 (degradationPreference)
        if (videoSender) {
          this.applyDegradationPreference(videoSender, this.degradationPreference);
        }
      }
    }

    // 监听对端媒体轨道 (健壮的多轨道汇聚与流更新)
    pc.ontrack = (evt) => {
      console.log(`[WebRTC] 收到来自 ${remotePeerId} 的媒体轨道:`, evt.track.kind, evt.track.id);
      const peer = this.peers.get(remotePeerId);
      if (peer) {
        let stream = peer.state.stream;
        if (!stream) {
          stream = evt.streams && evt.streams[0] ? evt.streams[0] : new MediaStream();
        }
        if (!stream.getTracks().some(t => t.id === evt.track.id)) {
          stream.addTrack(evt.track);
        }
        // 生成新的 MediaStream 实例浅拷贝，触发 React state 浅比较感知并重新渲染画面
        peer.state.stream = new MediaStream(stream.getTracks());
        this.notifyPeersChange();
      }
    };

    // ICE Candidate 收集事件
    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        const parsed = this.parseCandidate(evt.candidate.candidate, false);
        if (parsed) {
          state.localCandidates.push(parsed);
          this.notifyPeersChange();
        }
        this.sendSignaling({
          type: 'ice-candidate',
          targetPeerId: remotePeerId,
          senderPeerId: this.peerId,
          candidate: evt.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      state.connectionState = pc.connectionState;
      this.notifyPeersChange();
    };

    pc.oniceconnectionstatechange = () => {
      state.iceConnectionState = pc.iceConnectionState;
      this.notifyPeersChange();
    };

    const peerEntry = { pc, state, monitor, videoSender, pendingCandidates: [] as RTCIceCandidate[] };

    // 检查并消费在此之前提前到达的 earlyIceCandidates
    const early = this.earlyIceCandidates.get(remotePeerId);
    if (early && early.length > 0) {
      for (const candInit of early) {
        const cand = new RTCIceCandidate(candInit);
        peerEntry.pendingCandidates.push(cand);
        const parsed = this.parseCandidate(candInit.candidate || '', true);
        if (parsed) {
          state.remoteCandidates.push(parsed);
        }
      }
      this.earlyIceCandidates.delete(remotePeerId);
    }

    this.peers.set(remotePeerId, peerEntry);
    monitor.start(1000);

    // 如果是发起方，创建并发送 Offer
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      state.localSdp = this.parseSdp(offer.sdp || '');

      this.sendSignaling({
        type: 'offer',
        targetPeerId: remotePeerId,
        senderPeerId: this.peerId,
        sdp: offer
      });
      this.notifyPeersChange();
    }

    return peerEntry;
  }

  // 5. 动态降级偏好管理 (degradationPreference)
  public async setDegradationPreference(pref: DegradationPreferenceType) {
    this.degradationPreference = pref;
    for (const [, peer] of this.peers) {
      if (peer.videoSender) {
        await this.applyDegradationPreference(peer.videoSender, pref);
      }
    }
  }

  private async applyDegradationPreference(sender: RTCRtpSender, pref: DegradationPreferenceType) {
    try {
      const params = sender.getParameters();
      if (!params.encodings) return;
      (params as any).degradationPreference = pref;
      await sender.setParameters(params);
      console.log(`[QoS Strategy] 降级偏好已更新为: ${pref}`);
    } catch (err) {
      console.error('更新 degradationPreference 失败:', err);
    }
  }

  // 6. Simulcast 分层动态激活/停用
  public async setSimulcastLayerActive(rid: string, active: boolean) {
    const layer = this.simulcastLayers.find(l => l.rid === rid);
    if (layer) layer.active = active;

    for (const [, peer] of this.peers) {
      if (peer.videoSender) {
        const params = peer.videoSender.getParameters();
        if (params.encodings) {
          const enc = params.encodings.find(e => e.rid === rid);
          if (enc) {
            enc.active = active;
            await peer.videoSender.setParameters(params);
            console.log(`[Simulcast] 分层 ${rid} 状态更新为: ${active ? '激活' : '停用'}`);
          }
        }
      }
    }
  }

  // 7. 发送关键帧刷新请求 (PLI / FIR)
  public requestKeyframe(targetPeerId: string, reason: string = '手动请求刷新或画质恢复') {
    this.sendSignaling({
      type: 'request-keyframe',
      targetPeerId,
      senderPeerId: this.peerId,
      reason
    });
  }

  private triggerLocalKeyframe() {
    // 现代浏览器支持对于发送端生成关键帧
    for (const [, peer] of this.peers) {
      if (peer.videoSender && (peer.videoSender as any).generateKeyFrame) {
        (peer.videoSender as any).generateKeyFrame();
        console.log('[Encoder] 本地视频编码器已触发 IDR 关键帧生成');
      }
    }
  }

  // 8. 屏幕共享管理
  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15 } },
        audio: false
      });
      this.screenStream = stream;
      this.isScreenSharing = true;
      this.callbacks.onScreenStreamChange(stream);

      // 屏幕共享场景：强制配置为 maintain-resolution (保分辨率，降帧率)
      await this.setDegradationPreference('maintain-resolution');

      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      // 替换当前所有 peer 的发送视频轨
      for (const [, peer] of this.peers) {
        if (peer.videoSender) {
          await peer.videoSender.replaceTrack(videoTrack);
        }
      }
      return stream;
    } catch (err) {
      console.warn('开启屏幕共享失败或用户取消:', err);
      return null;
    }
  }

  public async stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    this.isScreenSharing = false;
    this.callbacks.onScreenStreamChange(null);

    // 恢复摄像头降级偏好 (maintain-framerate 保流畅)
    await this.setDegradationPreference('maintain-framerate');

    if (this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      for (const [, peer] of this.peers) {
        if (peer.videoSender && cameraTrack) {
          await peer.videoSender.replaceTrack(cameraTrack);
        }
      }
    }
  }

  // 9. 音视频轨道启停
  public toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = enabled);
    }
  }

  public toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = enabled);
    }
  }

  // 10. 解析 SDP 与 Candidate 辅助方法
  private parseCandidate(candStr: string, isRemote: boolean): CandidateInfo | null {
    if (!candStr) return null;
    // 形如: candidate:842163049 1 udp 1677729535 192.168.1.100 54321 typ host generation 0
    const parts = candStr.split(' ');
    if (parts.length < 8) return null;
    const type = parts[7] as any;
    return {
      id: parts[0].replace('candidate:', ''),
      protocol: parts[2],
      priority: parseInt(parts[3]),
      ip: parts[4],
      port: parseInt(parts[5]),
      type: ['host', 'srflx', 'relay', 'prflx'].includes(type) ? type : 'unknown',
      raw: candStr,
      isRemote
    };
  }

  private parseSdp(rawSdp: string): SdpAnalysis {
    const codecs: string[] = [];
    let dtlsFingerprint: string | undefined;
    let iceUfrag: string | undefined;
    let direction = 'sendrecv';
    let simulcastEnabled = false;

    rawSdp.split('\r\n').forEach(line => {
      if (line.startsWith('a=rtpmap:')) {
        // a=rtpmap:96 VP8/90000
        const parts = line.substring(9).split(' ');
        if (parts[1]) codecs.push(parts[1]);
      } else if (line.startsWith('a=fingerprint:')) {
        dtlsFingerprint = line.substring(14);
      } else if (line.startsWith('a=ice-ufrag:')) {
        iceUfrag = line.substring(12);
      } else if (line.startsWith('a=sendonly') || line.startsWith('a=recvonly') || line.startsWith('a=sendrecv')) {
        direction = line.substring(2);
      } else if (line.startsWith('a=simulcast:')) {
        simulcastEnabled = true;
      }
    });

    return {
      codecs: Array.from(new Set(codecs)),
      dtlsFingerprint,
      iceUfrag,
      direction,
      simulcastEnabled,
      rawSdp
    };
  }

  private createMockCanvasStream(): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    let count = 0;
    setInterval(() => {
      count++;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(320 + Math.sin(count * 0.1) * 150, 180, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`WebRTC 模拟视频源 (${this.peerName})`, 320, 120);
      ctx.fillText(`帧序号: ${count}`, 320, 260);
    }, 50);

    return canvas.captureStream(25);
  }

  private closePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.monitor.stop();
      peer.pc.close();
      this.peers.delete(peerId);
      this.notifyPeersChange();
    }
  }

  public leave() {
    for (const [id] of this.peers) {
      this.closePeer(id);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
    }
    if (this.ws) {
      this.ws.close();
    }
  }

  private notifyPeersChange() {
    const map = new Map<string, PeerConnectionState>();
    for (const [id, peer] of this.peers) {
      map.set(id, { ...peer.state });
    }
    this.callbacks.onPeersChange(map);
  }
}
