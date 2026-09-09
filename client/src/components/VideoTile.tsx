import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Activity } from 'lucide-react';
import { RtcMetrics } from '../rtc/types';

interface VideoTileProps {
  stream?: MediaStream | null;
  name: string;
  isLocal?: boolean;
  metrics?: RtcMetrics;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  onRequestKeyframe?: () => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  isLocal = false,
  metrics,
  isAudioMuted = false,
  isVideoMuted = false,
  onRequestKeyframe
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-800/80 border border-slate-700/60 shadow-lg flex flex-col items-center justify-center aspect-video group">
      {/* 视频流元素 */}
      {stream && !isVideoMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // 本地预览必须静音防啸叫
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xl text-slate-200">
            {name.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs text-slate-400">摄像头已关闭</span>
        </div>
      )}

      {/* 顶部实时流状态徽标 (分辨率与帧率) */}
      <div className="absolute top-2 left-2 flex items-center space-x-1.5 pointer-events-none">
        <span className="bg-slate-900/80 backdrop-blur text-[11px] px-2 py-0.5 rounded-full text-slate-300 font-mono border border-slate-700/50 flex items-center gap-1">
          {metrics && metrics.width > 0 ? (
            <>
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              {metrics.width}x{metrics.height} @ {metrics.fps}fps
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              {isLocal ? '本地流' : '正在建立连接...'}
            </>
          )}
        </span>

        {metrics && metrics.bitrateKbps > 0 && (
          <span className="bg-slate-900/80 backdrop-blur text-[11px] px-2 py-0.5 rounded-full text-blue-300 font-mono border border-slate-700/50">
            {metrics.bitrateKbps} Kbps
          </span>
        )}
      </div>

      {/* 右上角快捷操作：请求关键帧 (PLI/FIR) */}
      {!isLocal && onRequestKeyframe && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRequestKeyframe}
            title="手动触发 RTCP PLI/FIR 关键帧刷新请求"
            className="text-[11px] bg-amber-500/90 hover:bg-amber-600 text-white px-2 py-0.5 rounded shadow flex items-center gap-1 transition"
          >
            ⚡ 请求关键帧 (PLI)
          </button>
        </div>
      )}

      {/* 底部信息栏 */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs">
        <div className="bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-md text-white font-medium flex items-center space-x-1.5 border border-slate-700/50">
          <span>{name}</span>
          {isLocal && <span className="text-[10px] text-blue-400 font-semibold">(我)</span>}
        </div>

        <div className="flex items-center space-x-1">
          <div className={`p-1.5 rounded-md backdrop-blur ${isAudioMuted ? 'bg-red-500/80 text-white' : 'bg-slate-900/80 text-emerald-400'}`}>
            {isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </div>
          <div className={`p-1.5 rounded-md backdrop-blur ${isVideoMuted ? 'bg-red-500/80 text-white' : 'bg-slate-900/80 text-emerald-400'}`}>
            {isVideoMuted ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>
    </div>
  );
};
