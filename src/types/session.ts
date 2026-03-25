export type TransferFileSummary = {
  name: string;
  size: number;
  type: string;
};

export type TransferSessionStatus = "ready" | "closed";

export type SenderSessionKeepaliveStatus = "idle" | "active" | "error";

export type TransferSession = {
  id: string;
  senderPeerId: string;
  shareUrl: string;
  files: TransferFileSummary[];
  fileCount: number;
  totalSize: number;
  createdAt: string;
  expiresAt: string;
  status: TransferSessionStatus;
};

export type CreateTransferSessionInput = {
  senderPeerId: string;
  files: TransferFileSummary[];
  origin: string;
};