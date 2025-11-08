/** Event type definitions for PeerManager */
export interface PeerManagerEvents {
  "peer-list": (peers: string[]) => void;
  "peer-connected": (peerId: string) => void;
  data: (peerId: string, data: any) => void;
}
