import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Activity, FlipHorizontal } from 'lucide-react';
import { RtcMetrics } from '../rtc/types';

interface VideoTileProps {
  stream?: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isScreenShare?: boolean;
  metrics?: RtcMetrics;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  onRequestKeyframe?: () => void;
  mirrored?: boolean;
  onToggleMirror?: () => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  isLocal = false,
  isScreenShare = false,
  metrics,
  isAudioMuted = false,
  isVideoMuted = false,
  onRequestKeyframe,
  mirrored,
  onToggleMirror
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [internalMirrored, setInternalMirrored] = useState(false); // 默认不镜像，保持与远端画面完全同向一致

  // 优先采用外部传入的镜像控制，否则使用内部状态
  const isMirrored = isScreenShare ? false : (mirrored !== undefined ? mirrored : internalMirrored);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      // 显式触发 play()，防止部分浏览器在未静音或双窗口切换时由于自动播放策略阻断画面渲染
      videoRef.current.play().catch(err => {
        console.warn('[VideoTile] 浏览器自动播放限制，将在用户交互后播放:', err);
      });
    }
  }, [stream]);

  const handleToggleMirror = () => {
    if (onToggleMirror) {
      onToggleMirror();
    } else {
      setInternalMirrored(prev => !prev);
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-800/80 border border-slate-700/60 shadow-lg flex flex-col items-center justify-center aspect-video group">
      {/* 视频流元素 */}
      {stream && !isVideoMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // 本地预览必须静音防啸叫
          className={`w-full h-full object-cover transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`}
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
              {isLocal ? (isScreenShare ? '屏幕共享中' : '本地流') : '正在建立连接...'}
            </>
          )}
        </span>

        {metrics && metrics.bitrateKbps > 0 && (
          <span className="bg-slate-900/80 backdrop-blur text-[11px] px-2 py-0.5 rounded-full text-blue-300 font-mono border border-slate-700/50">
            {metrics.bitrateKbps} Kbps
          </span>
        )}
      </div>

      {/* 右上角操作区：关键帧请求 (远端) 或 镜像切换 (本地) */}
      <div className="absolute top-2 right-2 flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
        {isLocal && !isScreenShare && (
          <button
            onClick={handleToggleMirror}
            title={isMirrored ? "当前为镜面视角，点击切换为相机原视角" : "当前为相机原视角，点击切换为镜面视角"}
            className={`text-[11px] px-2 py-0.5 rounded shadow flex items-center gap-1 transition backdrop-blur border ${
              isMirrored 
                ? 'bg-blue-600/90 hover:bg-blue-700 text-white border-blue-400/50' 
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
            }`}
          >
            <FlipHorizontal className="w-3 h-3" />
            <span>{isMirrored ? '镜像翻转' : '真实视角'}</span>
          </button>
        )}

        {!isLocal && onRequestKeyframe && (
          <button
            onClick={onRequestKeyframe}
            title="手动触发 RTCP PLI/FIR 关键帧刷新请求"
            className="text-[11px] bg-amber-500/90 hover:bg-amber-600 text-white px-2 py-0.5 rounded shadow flex items-center gap-1 transition"
          >
            ⚡ 请求关键帧 (PLI)
          </button>
        )}
      </div>

      {/* 底部信息栏 */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs">
        <div className="bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-md text-white font-medium flex items-center space-x-1.5 border border-slate-700/50">
          <span>{name}</span>
          {isLocal && <span className="text-[10px] text-blue-400 font-semibold">({isScreenShare ? '共享中' : '我'})</span>}
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
