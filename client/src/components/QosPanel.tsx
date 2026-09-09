import React, { useEffect, useRef } from 'react';
import { PeerConnectionState } from '../rtc/types';
import { Activity, Clock, Layers, WifiOff, X } from 'lucide-react';

interface QosPanelProps {
  peers: Map<string, PeerConnectionState>;
  selectedPeerId?: string;
  onSelectPeer: (peerId: string) => void;
  onClose: () => void;
}

export const QosPanel: React.FC<QosPanelProps> = ({
  peers,
  selectedPeerId,
  onSelectPeer,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const peerList = Array.from(peers.values());
  const currentPeer = peers.get(selectedPeerId || '') || peerList[0];
  const metrics = currentPeer?.latestMetrics;
  const history = currentPeer?.metricsHistory || [];

  // 在 Canvas 上绘制实时的 RTT 与 码率 走势曲线
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 绘制背景网格
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    for (let y = 20; y < height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const maxRtt = Math.max(...history.map(h => h.rttMs), 100);
    const maxBitrate = Math.max(...history.map(h => h.bitrateKbps), 1000);

    // 1. 绘制 Bitrate (蓝色填充区域)
    ctx.beginPath();
    history.forEach((point, i) => {
      const x = (i / Math.max(history.length - 1, 1)) * width;
      const y = height - (point.bitrateKbps / maxBitrate) * (height - 20) - 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. 绘制 RTT (黄色线条)
    ctx.beginPath();
    history.forEach((point, i) => {
      const x = (i / Math.max(history.length - 1, 1)) * width;
      const y = height - (point.rttMs / maxRtt) * (height - 20) - 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [history]);

  return (
    <aside className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-sm text-white">RTCP QoS 实时监控看板</h2>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 对端节点选择器 */}
        {peerList.length > 1 && (
          <div className="flex items-center space-x-2 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
            <span className="text-xs text-slate-400">观测目标:</span>
            <select
              value={currentPeer?.peerId}
              onChange={(e) => onSelectPeer(e.target.value)}
              className="bg-slate-700 text-xs text-slate-200 rounded px-2 py-1 outline-none border border-slate-600 flex-1"
            >
              {peerList.map(p => (
                <option key={p.peerId} value={p.peerId}>
                  {p.peerName} ({p.peerId.substring(0, 6)})
                </option>
              ))}
            </select>
          </div>
        )}

        {!currentPeer ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            等待对端参会者连接以收集 RTCP 指标...
          </div>
        ) : (
          <>
            {/* 核心指标 4 宫格卡片 */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* RTT 往返时延 */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> RTT 时延
                  </span>
                  <span className="text-[10px] text-slate-500">RTCP RR</span>
                </div>
                <div className="text-xl font-bold text-amber-300 font-mono">
                  {metrics?.rttMs ?? 0} <span className="text-xs font-normal text-slate-400">ms</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {((metrics?.rttMs ?? 0) < 50) ? '优秀 (<50ms)' : '一般'}
                </div>
              </div>

              {/* Jitter 网络抖动 */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" /> Jitter 抖动
                  </span>
                  <span className="text-[10px] text-slate-500">到达间隔</span>
                </div>
                <div className="text-xl font-bold text-indigo-300 font-mono">
                  {metrics?.jitterMs ?? 0} <span className="text-xs font-normal text-slate-400">ms</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">JitterBuffer 调节基准</div>
              </div>

              {/* 实时码率 */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-400" /> 吞吐码率
                  </span>
                  <span className="text-[10px] text-slate-500">TCC/Pacer</span>
                </div>
                <div className="text-xl font-bold text-blue-300 font-mono">
                  {metrics?.bitrateKbps ?? 0} <span className="text-xs font-normal text-slate-400">Kbps</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {metrics ? `${metrics.width}x${metrics.height} @ ${metrics.fps}fps` : '无视频'}
                </div>
              </div>

              {/* 丢包统计 */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="flex items-center gap-1">
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" /> 丢包统计
                  </span>
                  <span className="text-[10px] text-slate-500">NACK/FEC</span>
                </div>
                <div className="text-xl font-bold text-rose-300 font-mono">
                  {metrics?.fractionLostRate ?? 0}% <span className="text-xs font-normal text-slate-400">({metrics?.packetsLost ?? 0}包)</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">累计丢包数</div>
              </div>
            </div>

            {/* 实时趋势折线图 */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-slate-300 font-medium">实时 QoS 波动趋势 (30s)</span>
                <div className="flex items-center space-x-3 text-[10px]">
                  <span className="flex items-center gap-1 text-blue-400">
                    <span className="w-2 h-0.5 bg-blue-400"></span> 码率 (Kbps)
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2 h-0.5 bg-amber-400"></span> RTT (ms)
                  </span>
                </div>
              </div>
              <canvas
                ref={canvasRef}
                width={330}
                height={120}
                className="w-full h-28 bg-slate-900/90 rounded border border-slate-700/50"
              />
            </div>

            {/* SSRC 与同步信息 */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-2 text-xs">
              <div className="text-slate-300 font-medium border-b border-slate-700 pb-1 flex justify-between items-center">
                <span>媒体流与时钟基准 (SSRC)</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  声画同步 (AV Sync)
                </span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>Video SSRC:</span>
                <span className="text-slate-200">{metrics?.videoSsrc || '协商中...'}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>Audio SSRC:</span>
                <span className="text-slate-200">{metrics?.audioSsrc || '协商中...'}</span>
              </div>
              <div className="text-[11px] text-slate-500 leading-relaxed pt-1">
                📌 博客对照：接收端利用 RTCP SR 中记录的 NTP 绝对时间戳与 RTP 时间戳的映射关系，实现不同 SSRC 间的声画唇音对齐。
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
