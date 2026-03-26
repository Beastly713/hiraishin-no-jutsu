export type DeviceInfo = {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  mobileVendor: string;
  mobileModel: string;
};

export type TransferInfoPayload = {
  files: {
    name: string;
    size: number;
    type: string;
  }[];
};

export type TransferStartPayload = {
  fileName: string;
  offset: number;
};

export type TransferChunkPayload = {
  fileName: string;
  offset: number;
  bytes: ArrayBuffer;
  final: boolean;
};

export type TransferChunkAckPayload = {
  fileName: string;
  offset: number;
  bytesReceived: number;
};

export type TransferErrorPayload = {
  message: string;
};

export type TransferPasswordPayload = {
  password: string;
};

export type TransferRequestInfoMessage = {
  type: "request_info";
  payload: DeviceInfo;
};

export type TransferInfoMessage = {
  type: "info";
  payload: TransferInfoPayload;
};

export type TransferStartMessage = {
  type: "start";
  payload: TransferStartPayload;
};

export type TransferChunkMessage = {
  type: "chunk";
  payload: TransferChunkPayload;
};

export type TransferChunkAckMessage = {
  type: "chunk_ack";
  payload: TransferChunkAckPayload;
};

export type TransferDoneMessage = {
  type: "done";
  payload: null;
};

export type TransferErrorMessage = {
  type: "error";
  payload: TransferErrorPayload;
};

export type TransferMessage =
  | TransferRequestInfoMessage
  | TransferInfoMessage
  | TransferStartMessage
  | TransferChunkMessage
  | TransferChunkAckMessage
  | TransferDoneMessage
  | TransferErrorMessage;