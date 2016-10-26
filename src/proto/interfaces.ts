export interface IGBClientMessage {
  service_create?: IGBCreateService;
  service_release?: IGBReleaseService;
  call_create?: IGBCreateCall;
  call_cancel?: IGBCancelCall;
  call_send?: IGBSendCall;
}

export interface IGBServerMessage {
  service_create?: IGBCreateServiceResult;
  service_release?: IGBReleaseServiceResult;
  call_create?: IGBCreateCallResult;
  call_receive?: IGBCallReceive;
  call_result?: IGBCallResult;
}

export interface IGBServiceInfo {
  endpoint?: string;
  service_id?: string;
}

export interface IGBCreateService {
  service_id?: number;
  service_info?: IGBServiceInfo;
}

export interface IGBReleaseService {
  service_id?: number;
}

export interface IGBCreateCall {
  service_id?: number;
  call_id?: number;
  method_id?: string;
}

export interface IGBCancelCall {
  call_id?: number;
}

export interface IGBSendCall {
  call_id?: number;
}

export interface IGBCreateServiceResult {
  service_id?: number;
  result?: ECreateServiceResult;
  error_details?: string;
}

export const enum ECreateServiceResult {
  SUCCESS = 0,
  INVALID_ID = 1,
  GRPC_ERROR = 2,
}

export interface IGBReleaseServiceResult {
  service_id?: number;
}

export interface IGBCreateCallResult {
  call_id?: number;
  result?: ECreateCallResult;
}

export const enum ECreateCallResult {
  SUCCESS = 0,
  INVALID_ID = 1,
  GRPC_ERROR = 2,
}

export interface IGBCallReceive {
  call_id?: number;
}

export interface IGBCallResult {
  call_id?: number;
}


