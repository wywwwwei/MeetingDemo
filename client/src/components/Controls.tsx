import React from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  ScreenShare, 
  PhoneOff, 
  BarChart3, 
  FileCode2, 
  Sliders, 
  Users 
} from 'lucide-react';

interface ControlsProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  activeTab: 'qos' | 'sdp' | 'strategy' | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onSelectTab: (tab: 'qos' | 'sdp' | 'strategy' | null) => void;
  onLeave: () => void;
  peerCount: number;
}

export const Controls: React.FC<ControlsProps> = ({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  activeTab,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onSelectTab,
  onLeave,
  peerCount
}) => {
  return (
    <footer className="h-16 bg-slate-900/95 border-t border-slate-800 px-6 flex items-center justify-between z-20">
      {/* 会议房间信息 */}
      <div className="flex items-center space-x-3 text-slate-300">
        <div className="flex items-center space-x-1.5 text-xs bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>当前参会人数: {peerCount + 1}</span>
        </div>
      </div>

      {/* 核心音视频设备控制 */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleAudio}
          className={`p-3 rounded-xl transition flex items-center justify-center ${
            isAudioMuted 
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30' 
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
          }`}
          title={isAudioMuted ? '解除静音' : '静音麦克风'}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleVideo}
          className={`p-3 rounded-xl transition flex items-center justify-center ${
            isVideoMuted 
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30' 
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
          }`}
          title={isVideoMuted ? '开启摄像头' : '关闭摄像头'}
        >
          {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleScreenShare}
          className={`p-3 rounded-xl transition flex items-center justify-center ${
            isScreenSharing 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500' 
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
          }`}
          title={isScreenSharing ? '停止共享' : '开始屏幕共享 (触发 maintain-resolution 偏好)'}
        >
          <ScreenShare className="w-5 h-5" />
        </button>

        <button
          onClick={onLeave}
          className="p-3 rounded-xl bg-red-600 hover:bg-red-500 text-white transition flex items-center justify-center shadow-lg shadow-red-600/30 ml-2"
          title="退出会议"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* 博客教学与机制透视面板切换 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onSelectTab(activeTab === 'qos' ? null : 'qos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 border transition ${
            activeTab === 'qos'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          <span>RTCP 监控看板</span>
        </button>

        <button
          onClick={() => onSelectTab(activeTab === 'sdp' ? null : 'sdp')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 border transition ${
            activeTab === 'sdp'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>SDP / ICE 透视</span>
        </button>

        <button
          onClick={() => onSelectTab(activeTab === 'strategy' ? null : 'strategy')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 border transition ${
            activeTab === 'strategy'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>策略控制台</span>
        </button>
      </div>
    </footer>
  );
};
