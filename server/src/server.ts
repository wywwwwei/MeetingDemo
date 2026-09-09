import { WebSocketServer, WebSocket } from 'ws';
import { SignalingMessage, PeerInfo } from './types.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const wss = new WebSocketServer({ port: PORT });

// 维护 peerId -> { ws, info }
const clients = new Map<string, { ws: WebSocket; info: PeerInfo }>();
// 维护 roomId -> Set<peerId>
const rooms = new Map<string, Set<string>>();

console.log(`[Signaling Server] WebRTC 会议信令服务正在运行，监听端口: ${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  let currentPeerId: string | null = null;
  let currentRoomId: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const msg: SignalingMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case 'join-room': {
          currentPeerId = msg.peerId;
          currentRoomId = msg.roomId;

          // 记录客户端连接
          clients.set(msg.peerId, {
            ws,
            info: { peerId: msg.peerId, peerName: msg.peerName, roomId: msg.roomId }
          });

          if (!rooms.has(msg.roomId)) {
            rooms.set(msg.roomId, new Set());
          }
          const roomPeers = rooms.get(msg.roomId)!;

          // 获取当前房间内已存在的其他成员
          const existing = Array.from(roomPeers)
            .filter(id => id !== msg.peerId)
            .map(id => {
              const client = clients.get(id);
              return {
                peerId: id,
                peerName: client?.info.peerName || '参会者'
              };
            });

          // 告知新成员当前房间已有的 peers
          ws.send(JSON.stringify({
            type: 'existing-peers',
            peers: existing
          }));

          // 广播通知房间内其他人有新成员加入
          roomPeers.forEach(id => {
            const client = clients.get(id);
            if (client && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({
                type: 'peer-joined',
                peerId: msg.peerId,
                peerName: msg.peerName
              }));
            }
          });

          roomPeers.add(msg.peerId);
          console.log(`[Room ${msg.roomId}] 成员加入: ${msg.peerName} (${msg.peerId})，当前人数: ${roomPeers.size}`);
          break;
        }

        case 'offer':
        case 'answer':
        case 'ice-candidate': {
          const target = clients.get(msg.targetPeerId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify(msg));
            console.log(`[Signaling] 转发 ${msg.type.toUpperCase()}: ${msg.senderPeerId} -> ${msg.targetPeerId}`);
          }
          break;
        }

        case 'request-keyframe': {
          // 观众端向主讲人发起关键帧请求 (PLI / FIR 模拟)
          const target = clients.get(msg.targetPeerId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
              type: 'keyframe-requested',
              senderPeerId: msg.senderPeerId,
              reason: msg.reason || 'PLI: 图像参考丢失或入会画面秒开'
            }));
            console.log(`[PLI/FIR] 收到来自 ${msg.senderPeerId} 的关键帧刷新请求，目标发送端: ${msg.targetPeerId}`);
          }
          break;
        }
      }
    } catch (err) {
      console.error('[Signaling Error] 解析消息失败:', err);
    }
  });

  const handleDisconnect = () => {
    if (currentPeerId && currentRoomId) {
      clients.delete(currentPeerId);
      const roomPeers = rooms.get(currentRoomId);
      if (roomPeers) {
        roomPeers.delete(currentPeerId);
        if (roomPeers.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          // 广播成员离开
          roomPeers.forEach(id => {
            const client = clients.get(id);
            if (client && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({
                type: 'peer-left',
                peerId: currentPeerId
              }));
            }
          });
        }
      }
      console.log(`[Room ${currentRoomId}] 成员断开: ${currentPeerId}`);
    }
  };

  ws.on('close', handleDisconnect);
  ws.on('error', handleDisconnect);
});
