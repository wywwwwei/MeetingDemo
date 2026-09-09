export type SignalingMessage =
  | { type: 'join-room'; roomId: string; peerId: string; peerName: string }
  | { type: 'existing-peers'; peers: Array<{ peerId: string; peerName: string }> }
  | { type: 'peer-joined'; peerId: string; peerName: string }
  | { type: 'peer-left'; peerId: string }
  | { type: 'offer'; targetPeerId: string; senderPeerId: string; sdp: any }
  | { type: 'answer'; targetPeerId: string; senderPeerId: string; sdp: any }
  | { type: 'ice-candidate'; targetPeerId: string; senderPeerId: string; candidate: any }
  | { type: 'request-keyframe'; targetPeerId: string; senderPeerId: string; reason?: string }
  | { type: 'keyframe-requested'; senderPeerId: string; reason?: string };

export interface PeerInfo {
  peerId: string;
  peerName: string;
  roomId: string;
}
