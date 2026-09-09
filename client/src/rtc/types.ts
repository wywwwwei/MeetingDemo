export type DegradationPreferenceType = 'maintain-resolution' | 'maintain-framerate' | 'balanced';

export interface SimulcastLayerConfig {
  rid: string;
  active: boolean;
  maxBitrate?: number;
  scaleResolutionDownBy?: number;
  maxFramerate?: number;
}

export interface CandidateInfo {
  id: string;
  type: 'host' | 'srflx' | 'relay' | 'prflx' | 'unknown';
  protocol: string;
  ip: string;
  port: number;
  priority: number;
  raw: string;
  isRemote?: boolean;
}

export interface SdpAnalysis {
  codecs: string[];
  dtlsFingerprint?: string;
  iceUfrag?: string;
  direction?: string;
  simulcastEnabled: boolean;
  rawSdp: string;
}

export interface RtcMetrics {
  timestamp: number;
  // 链路指标 (RTCP RR / CandidatePair)
  rttMs: number;
  jitterMs: number;
  packetsLost: number;
  fractionLostRate: number; // 0 ~ 100%
  // 发送/接收指标 (RTP Outbound / Inbound)
  bitrateKbps: number;
  fps: number;
  width: number;
  height: number;
  // 音视频标识与同步
  videoSsrc?: number;
  audioSsrc?: number;
}

export interface PeerConnectionState {
  peerId: string;
  peerName: string;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  stream?: MediaStream;
  localCandidates: CandidateInfo[];
  remoteCandidates: CandidateInfo[];
  selectedCandidatePair?: {
    local: string;
    remote: string;
    currentRttMs: number;
  };
  metricsHistory: RtcMetrics[];
  latestMetrics?: RtcMetrics;
  localSdp?: SdpAnalysis;
  remoteSdp?: SdpAnalysis;
}
