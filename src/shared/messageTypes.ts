export type SignalType =
  | "register"
  | "offer"
  | "answer"
  | "candidate"
  | "peer-list";

export type SignalMessage = {
  type: SignalType;
  clientId?: string;
  targetId?: string;
  payload?: any;
};

export type PeerListMessage = {
  type: "peer-list";
  peers: string[];
};
