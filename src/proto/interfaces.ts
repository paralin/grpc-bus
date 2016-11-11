export interface IGBClientMessage {
  service_create?: IGBCreateService;
  service_release?: IGBReleaseService;
  call_create?: IGBCreateCall;
  call_end?: IGBCallEnd;
  call_send?: IGBSendCall;
}

export interface IGBServerMessage {
  service_create?: IGBCreateServiceResult;
  service_release?: IGBReleaseServiceResult;
  call_create?: IGBCreateCallResult;
  call_event?: IGBCallEvent;
  call_ended?: IGBCallEnded;
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

export interface IGBCallInfo {
  method_id?: string;
  bin_argument?: any;
}

export interface IGBCreateCall {
  service_id?: number;
  call_id?: number;
  info?: IGBCallInfo;
}

export interface IGBCallEnded {
  call_id?: number;
  service_id?: number;
}

export interface IGBEndCall {
  call_id?: number;
  service_id?: number;
}

export interface IGBSendCall {
  call_id?: number;
  service_id?: number;
  bin_data?: any;
  is_end?: boolean;
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
  service_id?: number;
  result?: ECreateCallResult;
  error_details?: string;
}

export const enum ECreateCallResult {
  SUCCESS = 0,
  INVALID_ID = 1,
  GRPC_ERROR = 2,
}

export interface IGBCallEvent {
  call_id?: number;
  service_id?: number;
  event?: string;
  json_data?: string;
  bin_data?: any;
}

export interface IGBCallEnd {
  call_id?: number;
  service_id?: number;
}


