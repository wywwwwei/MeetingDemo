import React, { useState } from 'react';
import { PeerConnectionState } from '../rtc/types';
import { FileCode2, ShieldCheck, Network, Copy, Check, X } from 'lucide-react';

interface SdpInspectorProps {
  peers: Map<string, PeerConnectionState>;
  selectedPeerId?: string;
  onSelectPeer: (peerId: string) => void;
  onClose: () => void;
}

export const SdpInspector: React.FC<SdpInspectorProps> = ({
  peers,
  selectedPeerId,
  onSelectPeer,
  onClose
}) => {
  const [sdpViewMode, setSdpViewMode] = useState<'local' | 'remote'>('local');
  const [copied, setCopied] = useState(false);

  const peerList = Array.from(peers.values());
  const currentPeer = peers.get(selectedPeerId || '') || peerList[0];

  const sdpData = sdpViewMode === 'local' ? currentPeer?.localSdp : currentPeer?.remoteSdp;

  const handleCopy = () => {
    if (sdpData?.rawSdp) {
      navigator.clipboard.writeText(sdpData.rawSdp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <aside className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileCode2 className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-sm text-white">SDP 与 ICE 连通性透视</h2>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 对端节点选择器 */}
        {peerList.length > 1 && (
          <div className="flex items-center space-x-2 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
            <span className="text-slate-400">选择连接:</span>
            <select
              value={currentPeer?.peerId}
              onChange={(e) => onSelectPeer(e.target.value)}
              className="bg-slate-700 text-slate-200 rounded px-2 py-1 outline-none border border-slate-600 flex-1"
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
          <div className="text-center py-12 text-slate-500">
            暂无连接，请等待双方进入房间建立 PeerConnection
          </div>
        ) : (
          <>
            {/* 1. 编解码能力与安全参数 */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-2.5">
              <div className="font-medium text-slate-200 flex items-center gap-1.5 border-b border-slate-700 pb-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SDP 协商参数摘要</span>
              </div>

              <div>
                <div className="text-slate-400 text-[11px] mb-1">协商支持的音视频编解码 (Codecs):</div>
                <div className="flex flex-wrap gap-1">
                  {sdpData?.codecs.map((codec, idx) => (
                    <span 
                      key={idx} 
                      className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-600"
                    >
                      {codec}
                    </span>
                  )) || <span className="text-slate-500">暂无数据</span>}
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">媒体方向 (Direction):</span>
                <span className="bg-blue-950 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-800/50">
                  {sdpData?.direction || 'sendrecv'}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Simulcast 多码流协商:</span>
                <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                  sdpData?.simulcastEnabled 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' 
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {sdpData?.simulcastEnabled ? '已启用 (a=simulcast)' : '未显式声明'}
                </span>
              </div>

              {sdpData?.dtlsFingerprint && (
                <div>
                  <div className="text-slate-400 text-[11px] mb-0.5">DTLS 安全证书指纹 (SRTP 加密依据):</div>
                  <div className="bg-slate-900/90 text-slate-300 font-mono text-[10px] p-1.5 rounded border border-slate-800 break-all">
                    {sdpData.dtlsFingerprint}
                  </div>
                </div>
              )}
            </div>

            {/* 2. ICE Candidate 候选收集透视 */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-2">
              <div className="font-medium text-slate-200 flex items-center justify-between border-b border-slate-700 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-blue-400" />
                  <span>ICE Candidate 候选池</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  收集数: {currentPeer.localCandidates.length}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed">
                按照博客机制收集不同类型的连通候选地址：
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {currentPeer.localCandidates.map((cand, idx) => (
                  <div 
                    key={idx} 
                    className="p-2 bg-slate-900/90 rounded border border-slate-800 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        cand.type === 'host' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' 
                          : cand.type === 'srflx' 
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/40' 
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800/40'
                      }`}>
                        {cand.type === 'host' ? 'Host (局域网内网)' : cand.type === 'srflx' ? 'srflx (STUN外网映射)' : cand.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{cand.protocol.toUpperCase()}</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-300">
                      {cand.ip}:{cand.port}
                    </div>
                  </div>
                ))}
                {currentPeer.localCandidates.length === 0 && (
                  <div className="text-center py-4 text-slate-500">正在收集本地 Candidate...</div>
                )}
              </div>
            </div>

            {/* 3. 原始 SDP 查看与切换 */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    onClick={() => setSdpViewMode('local')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      sdpViewMode === 'local' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Local SDP
                  </button>
                  <button
                    onClick={() => setSdpViewMode('remote')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      sdpViewMode === 'remote' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Remote SDP
                  </button>
                </div>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-700"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? '已复制' : '复制SDP'}</span>
                </button>
              </div>

              <textarea
                readOnly
                value={sdpData?.rawSdp || '// 尚未生成 SDP 数据'}
                className="w-full h-36 bg-slate-950 text-slate-400 font-mono text-[10px] p-2 rounded border border-slate-800 outline-none resize-none leading-normal"
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
