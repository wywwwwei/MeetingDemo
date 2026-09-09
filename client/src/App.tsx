import React, { useState, useEffect, useRef } from 'react';
import { RtcRoom } from './rtc/RtcRoom';
import { DegradationPreferenceType, PeerConnectionState } from './rtc/types';
import { VideoTile } from './components/VideoTile';
import { Controls } from './components/Controls';
import { QosPanel } from './components/QosPanel';
import { SdpInspector } from './components/SdpInspector';
import { StrategyCtrl } from './components/StrategyCtrl';
import { Video, Sparkles, BookOpen, Layers, Activity } from 'lucide-react';

export const App: React.FC = () => {
  // 入会状态
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [roomId, setRoomId] = useState('demo-room-888');
  const [userName, setUserName] = useState('参会者_' + Math.floor(100 + Math.random() * 900));

  // 媒体与对端状态
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerConnectionState>>(new Map());
  const [signalingConnected, setSignalingConnected] = useState(false);

  // 控制状态
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'qos' | 'sdp' | 'strategy' | null>('qos');
  const [selectedPeerId, setSelectedPeerId] = useState<string>('');
  const [preference, setPreference] = useState<DegradationPreferenceType>('maintain-framerate');
  const [keyframeLogs, setKeyframeLogs] = useState<Array<{ from: string; reason: string; timestamp: number }>>([]);

  const rtcRoomRef = useRef<RtcRoom | null>(null);

  // 加入会议
  const handleJoin = async () => {
    if (!roomId || !userName) return;

    const room = new RtcRoom(roomId, userName, 'ws://localhost:3001', {
      onPeersChange: (newPeers) => {
        setPeers(new Map(newPeers));
      },
      onLocalStreamChange: (stream) => {
        setLocalStream(stream);
      },
      onScreenStreamChange: (stream) => {
        setScreenStream(stream);
        setIsScreenSharing(!!stream);
      },
      onKeyframeEvent: (log) => {
        setKeyframeLogs(prev => [log, ...prev.slice(0, 19)]);
      },
      onSignalingStateChange: (connected) => {
        setSignalingConnected(connected);
      }
    });

    rtcRoomRef.current = room;
    await room.initMedia();
    room.connect();
    setIsInMeeting(true);
  };

  // 离开会议
  const handleLeave = () => {
    if (rtcRoomRef.current) {
      rtcRoomRef.current.leave();
      rtcRoomRef.current = null;
    }
    setLocalStream(null);
    setScreenStream(null);
    setPeers(new Map());
    setIsInMeeting(false);
    setIsScreenSharing(false);
  };

  // 切换麦克风
  const handleToggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    rtcRoomRef.current?.toggleAudio(!next);
  };

  // 切换摄像头
  const handleToggleVideo = () => {
    const next = !isVideoMuted;
    setIsVideoMuted(next);
    rtcRoomRef.current?.toggleVideo(!next);
  };

  // 切换屏幕共享
  const handleToggleScreenShare = async () => {
    if (!rtcRoomRef.current) return;
    if (isScreenSharing) {
      await rtcRoomRef.current.stopScreenShare();
      setPreference('maintain-framerate');
    } else {
      const stream = await rtcRoomRef.current.startScreenShare();
      if (stream) {
        setPreference('maintain-resolution');
      }
    }
  };

  // 调整降级偏好
  const handlePreferenceChange = async (pref: DegradationPreferenceType) => {
    setPreference(pref);
    if (rtcRoomRef.current) {
      await rtcRoomRef.current.setDegradationPreference(pref);
    }
  };

  // 请求关键帧
  const handleRequestKeyframe = (targetPeerId: string) => {
    if (rtcRoomRef.current) {
      rtcRoomRef.current.requestKeyframe(targetPeerId);
    }
  };

  // 卸载清理
  useEffect(() => {
    return () => {
      rtcRoomRef.current?.leave();
    };
  }, []);

  const peerList = Array.from(peers.values());

  // 未加入会议时的科技风入口页
  if (!isInMeeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 mb-2">
              <Video className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              WebRTC 视频会议实战实验室
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              基于博客《WebRTC 核心机制与视频会议实战解析》设计，内置全链路透视与实验调试能力。
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">会议房间号 (Room ID)</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="请输入房间号"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">我的昵称 (User Name)</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="请输入参会昵称"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleJoin}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>进入会议实验室</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Demo 包含的博客核心机制：</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">🔹 SDP 编解码与指纹</span>
              <span className="flex items-center gap-1">🔹 ICE Host/srflx 候选</span>
              <span className="flex items-center gap-1">🔹 RTCP RTT/Jitter 曲线</span>
              <span className="flex items-center gap-1">🔹 Simulcast 3层推流</span>
              <span className="flex items-center gap-1">🔹 degradationPreference</span>
              <span className="flex items-center gap-1">🔹 PLI/FIR 关键帧重刷</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 会议主界面
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden select-none">
      {/* 顶部状态栏 */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-xs z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${signalingConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></div>
            <span className="font-semibold text-slate-200">会议室: {roomId}</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono">My ID: {rtcRoomRef.current?.peerId}</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* 当前降级偏好徽标 */}
          <div className="flex items-center space-x-1.5 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700/60">
            <span className="text-slate-400">自适应降级:</span>
            <span className="text-blue-400 font-medium font-mono">{preference}</span>
          </div>

          {/* Simulcast 状态 */}
          <div className="flex items-center space-x-1.5 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700/60 text-emerald-400">
            <Layers className="w-3.5 h-3.5" />
            <span>Simulcast (f/h/q)</span>
          </div>
        </div>
      </header>

      {/* 中部核心区域：左侧视频舞台 + 右侧透视抽屉 */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* 视频区域 */}
        <section className="flex-1 p-4 overflow-y-auto flex flex-col justify-center">
          {/* 若处于屏幕共享模式，展示演讲者主视窗 + 缩略视窗 */}
          {screenStream ? (
            <div className="flex flex-col h-full space-y-3">
              <div className="flex-1 rounded-xl overflow-hidden bg-black border border-slate-800 shadow-2xl relative">
                <VideoTile
                  stream={screenStream}
                  name={`${userName} (正在进行桌面屏幕共享 - maintain-resolution)`}
                  isLocal={true}
                />
              </div>
              <div className="h-44 flex space-x-3 overflow-x-auto pb-1">
                <div className="w-72 flex-shrink-0">
                  <VideoTile
                    stream={localStream}
                    name={userName}
                    isLocal={true}
                    isAudioMuted={isAudioMuted}
                    isVideoMuted={isVideoMuted}
                  />
                </div>
                {peerList.map(peer => (
                  <div key={peer.peerId} className="w-72 flex-shrink-0">
                    <VideoTile
                      stream={peer.stream}
                      name={peer.peerName}
                      metrics={peer.latestMetrics}
                      onRequestKeyframe={() => handleRequestKeyframe(peer.peerId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 普通画廊视图 Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
              {/* 本地画面 */}
              <VideoTile
                stream={localStream}
                name={userName}
                isLocal={true}
                isAudioMuted={isAudioMuted}
                isVideoMuted={isVideoMuted}
              />

              {/* 远端参会者画面 */}
              {peerList.map(peer => (
                <VideoTile
                  key={peer.peerId}
                  stream={peer.stream}
                  name={peer.peerName}
                  metrics={peer.latestMetrics}
                  onRequestKeyframe={() => handleRequestKeyframe(peer.peerId)}
                />
              ))}

              {/* 空房间等待占位 */}
              {peerList.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-2 text-slate-500 aspect-video">
                  <Activity className="w-8 h-8 text-slate-600 animate-bounce" />
                  <p className="text-xs">可在另一个浏览器标签页加入同一房间（{roomId}）体验多人双向通信</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 右侧抽屉：RTCP / SDP / 策略看板 */}
        {activeTab === 'qos' && (
          <QosPanel
            peers={peers}
            selectedPeerId={selectedPeerId}
            onSelectPeer={setSelectedPeerId}
            onClose={() => setActiveTab(null)}
          />
        )}

        {activeTab === 'sdp' && (
          <SdpInspector
            peers={peers}
            selectedPeerId={selectedPeerId}
            onSelectPeer={setSelectedPeerId}
            onClose={() => setActiveTab(null)}
          />
        )}

        {activeTab === 'strategy' && (
          <StrategyCtrl
            currentPreference={preference}
            onPreferenceChange={handlePreferenceChange}
            onRequestKeyframe={handleRequestKeyframe}
            peers={peers}
            keyframeLogs={keyframeLogs}
            onClose={() => setActiveTab(null)}
          />
        )}
      </main>

      {/* 底部交互控制栏 */}
      <Controls
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        isScreenSharing={isScreenSharing}
        activeTab={activeTab}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onSelectTab={setActiveTab}
        onLeave={handleLeave}
        peerCount={peerList.length}
      />
    </div>
  );
};
