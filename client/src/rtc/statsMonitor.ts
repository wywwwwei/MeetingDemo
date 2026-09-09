import { RtcMetrics } from './types';

export class StatsMonitor {
  private pc: RTCPeerConnection;
  private prevTimestamp: number = 0;
  private prevBytes: number = 0;
  private timer: number | null = null;
  private onMetricsUpdate: (metrics: RtcMetrics) => void;

  constructor(pc: RTCPeerConnection, onMetricsUpdate: (metrics: RtcMetrics) => void) {
    this.pc = pc;
    this.onMetricsUpdate = onMetricsUpdate;
  }

  public start(intervalMs: number = 1000) {
    this.stop();
    this.timer = window.setInterval(async () => {
      try {
        const metrics = await this.sample();
        if (metrics) {
          this.onMetricsUpdate(metrics);
        }
      } catch (e) {
        console.error('getStats sampling error:', e);
      }
    }, intervalMs);
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async sample(): Promise<RtcMetrics | null> {
    if (this.pc.signalingState === 'closed') {
      return null;
    }

    const stats = await this.pc.getStats();
    const now = Date.now();

    let rttMs = 0;
    let jitterMs = 0;
    let packetsLost = 0;
    let fractionLostRate = 0;
    let currentBytes = 0;
    let bitrateKbps = 0;
    let fps = 0;
    let width = 0;
    let height = 0;
    let videoSsrc: number | undefined;
    let audioSsrc: number | undefined;

    stats.forEach(report => {
      // 1. 链路候选对获取真实往返时延 RTT
      if (report.type === 'candidate-pair' && (report.selected || report.state === 'succeeded')) {
        if (typeof report.currentRoundTripTime === 'number') {
          rttMs = Math.round(report.currentRoundTripTime * 1000);
        }
      }

      // 2. 视频入站流 (作为接收方收到远端视频的统计)
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        videoSsrc = report.ssrc;
        currentBytes += report.bytesReceived || 0;
        packetsLost = report.packetsLost || 0;
        // Jitter 单位为秒，转换为毫秒
        if (typeof report.jitter === 'number') {
          jitterMs = Math.round(report.jitter * 1000);
        }
        fps = Math.round(report.framesPerSecond || 0);
        width = report.frameWidth || 0;
        height = report.frameHeight || 0;
      }

      // 3. 视频出站流 (作为发送方本地推流的统计)
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        if (!videoSsrc) videoSsrc = report.ssrc;
        currentBytes += report.bytesSent || 0;
        fps = Math.max(fps, Math.round(report.framesPerSecond || 0));
        width = Math.max(width, report.frameWidth || 0);
        height = Math.max(height, report.frameHeight || 0);
      }

      // 4. RTCP 反向接收端报告 (从 remote-inbound-rtp 获取发端视角的丢包和抖动)
      if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
        if (typeof report.fractionLost === 'number') {
          fractionLostRate = Math.round(report.fractionLost * 100);
        }
        if (typeof report.roundTripTime === 'number' && !rttMs) {
          rttMs = Math.round(report.roundTripTime * 1000);
        }
        if (typeof report.jitter === 'number' && !jitterMs) {
          jitterMs = Math.round(report.jitter * 1000);
        }
      }

      // 5. 音频流 SSRC
      if ((report.type === 'inbound-rtp' || report.type === 'outbound-rtp') && report.kind === 'audio') {
        audioSsrc = report.ssrc;
      }
    });

    // 计算瞬时吞吐码率 (Kbps)
    if (this.prevTimestamp > 0 && currentBytes >= this.prevBytes) {
      const deltaBytes = currentBytes - this.prevBytes;
      const deltaMs = now - this.prevTimestamp;
      if (deltaMs > 0) {
        bitrateKbps = Math.round((deltaBytes * 8) / deltaMs);
      }
    }

    this.prevTimestamp = now;
    this.prevBytes = currentBytes;

    return {
      timestamp: now,
      rttMs,
      jitterMs,
      packetsLost,
      fractionLostRate,
      bitrateKbps,
      fps,
      width,
      height,
      videoSsrc,
      audioSsrc
    };
  }
}
