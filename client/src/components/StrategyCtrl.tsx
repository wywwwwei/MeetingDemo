import React from 'react';
import { DegradationPreferenceType, PeerConnectionState } from '../rtc/types';
import { Sliders, Zap, Layers, X } from 'lucide-react';

interface StrategyCtrlProps {
  currentPreference: DegradationPreferenceType;
  onPreferenceChange: (pref: DegradationPreferenceType) => void;
  onRequestKeyframe: (targetPeerId: string) => void;
  peers: Map<string, PeerConnectionState>;
  keyframeLogs: Array<{ from: string; reason: string; timestamp: number }>;
  onClose: () => void;
}

export const StrategyCtrl: React.FC<StrategyCtrlProps> = ({
  currentPreference,
  onPreferenceChange,
  onRequestKeyframe,
  peers,
  keyframeLogs,
  onClose
}) => {
  const peerList = Array.from(peers.values());

  return (
    <aside className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-sm text-white">动态自适应策略控制台</h2>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* 1. 降级偏好 (degradationPreference) */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-3">
          <div className="font-medium text-slate-200 flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>降级偏好 (degradationPreference)</span>
            </span>
            <span className="text-[10px] text-blue-300 font-mono bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800/40">
              WebRTC RFC
            </span>
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'maintain-resolution',
                title: 'maintain-resolution (保分辨率)',
                desc: '适用屏幕共享/PPT：严禁模糊文字，网络劣化时优先大幅降低帧率 (降至5~10fps)。'
              },
              {
                id: 'maintain-framerate',
                title: 'maintain-framerate (保帧率)',
                desc: '适用人物摄像头：保障口型连贯与手势流畅，网络劣化时优先降分辨率 (如720p->360p)。'
              },
              {
                id: 'balanced',
                title: 'balanced (平衡模式)',
                desc: '系统在分辨率和帧率之间交替阶梯微调。'
              }
            ].map(item => (
              <label
                key={item.id}
                className={`flex items-start p-2.5 rounded-lg border cursor-pointer transition ${
                  currentPreference === item.id
                    ? 'bg-blue-950/40 border-blue-500/70 text-white'
                    : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <input
                  type="radio"
                  name="degradationPref"
                  value={item.id}
                  checked={currentPreference === item.id}
                  onChange={() => onPreferenceChange(item.id as DegradationPreferenceType)}
                  className="mt-1 mr-2.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-[11px] mb-0.5">{item.title}</div>
                  <div className="text-[10px] text-slate-400 leading-normal">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 2. 多码流 Simulcast 发送策略 */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-3">
          <div className="font-medium text-slate-200 flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Simulcast 多码流架构</span>
            </span>
            <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/40">
              3 Encodings
            </span>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            推流端本地通过 `addTransceiver` 注入 3 组分层编码，解决不同参会者的“木桶效应”：
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-blue-400 font-bold mr-2">[High/f]</span>
                <span className="text-slate-200">1080p/720p @ 30fps</span>
              </div>
              <span className="text-slate-400 text-[10px]">1.5 Mbps</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-amber-400 font-bold mr-2">[Mid/h]</span>
                <span className="text-slate-200">360p (1/2缩放)</span>
              </div>
              <span className="text-slate-400 text-[10px]">500 Kbps</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-emerald-400 font-bold mr-2">[Low/q]</span>
                <span className="text-slate-200">180p (1/4缩放)</span>
              </div>
              <span className="text-slate-400 text-[10px]">150 Kbps</span>
            </div>
          </div>
        </div>

        {/* 3. 关键帧刷新快速恢复 (PLI / FIR) */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-3">
          <div className="font-medium text-slate-200 flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-rose-400" />
              <span>关键帧异常恢复 (PLI / FIR)</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            当参考帧链在弱网下彻底损毁，或新入会需要“画面秒开”时，接收端发送 RTCP PLI/FIR 强制发端重新编码 IDR 帧：
          </div>

          {peerList.length === 0 ? (
            <div className="text-center py-2 text-slate-500">连接其他参会者后可触发关键帧请求</div>
          ) : (
            <div className="space-y-1.5">
              {peerList.map(peer => (
                <button
                  key={peer.peerId}
                  onClick={() => onRequestKeyframe(peer.peerId)}
                  className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  向 {peer.peerName} 请求关键帧 (Send PLI)
                </button>
              ))}
            </div>
          )}

          {/* 关键帧事件日志 */}
          <div className="mt-2 pt-2 border-t border-slate-700/60">
            <div className="text-[11px] font-medium text-slate-300 mb-1">PLI 事件触发记录:</div>
            <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[10px]">
              {keyframeLogs.map((log, idx) => (
                <div key={idx} className="bg-slate-950 p-1.5 rounded border border-slate-800 text-slate-300">
                  <div className="text-amber-400">⚡ {new Date(log.timestamp).toLocaleTimeString()} 收到 PLI 请求</div>
                  <div className="text-slate-500">{log.reason}</div>
                </div>
              ))}
              {keyframeLogs.length === 0 && (
                <div className="text-slate-600 text-center py-2">暂无触发记录</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
