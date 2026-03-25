export type TransferFileSummary = {
  name: string;
  size: number;
  type: string;
};

export type TransferSessionStatus = "ready";

export type TransferSession = {
  id: string;
  shareUrl: string;
  files: TransferFileSummary[];
  fileCount: number;
  totalSize: number;
  createdAt: string;
  expiresAt: string;
  status: TransferSessionStatus;
};

export type CreateTransferSessionInput = {
  files: TransferFileSummary[];
  origin: string;
};