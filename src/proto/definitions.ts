/* tslint:disable:trailing-comma */
/* tslint:disable:quotemark */
/* tslint:disable:max-line-length */
export const PROTO_DEFINITIONS = {
    "package": "grpcbus",
    "messages": [
        {
            "name": "GBClientMessage",
            "fields": [
                {
                    "rule": "optional",
                    "type": "GBCreateService",
                    "name": "service_create",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "GBReleaseService",
                    "name": "service_release",
                    "id": 2
                },
                {
                    "rule": "optional",
                    "type": "GBCreateCall",
                    "name": "call_create",
                    "id": 3
                },
                {
                    "rule": "optional",
                    "type": "GBCancelCall",
                    "name": "call_cancel",
                    "id": 4
                },
                {
                    "rule": "optional",
                    "type": "GBSendCall",
                    "name": "call_send",
                    "id": 5
                }
            ]
        },
        {
            "name": "GBServerMessage",
            "fields": [
                {
                    "rule": "optional",
                    "type": "GBCreateServiceResult",
                    "name": "service_create",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "GBReleaseServiceResult",
                    "name": "service_release",
                    "id": 2
                },
                {
                    "rule": "optional",
                    "type": "GBCreateCallResult",
                    "name": "call_create",
                    "id": 3
                },
                {
                    "rule": "optional",
                    "type": "GBCallReceive",
                    "name": "call_receive",
                    "id": 5
                },
                {
                    "rule": "optional",
                    "type": "GBCallResult",
                    "name": "call_result",
                    "id": 4
                }
            ]
        },
        {
            "name": "GBServiceInfo",
            "fields": [
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "endpoint",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "service_id",
                    "id": 2
                }
            ]
        },
        {
            "name": "GBCreateService",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "service_id",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "GBServiceInfo",
                    "name": "service_info",
                    "id": 2
                }
            ]
        },
        {
            "name": "GBReleaseService",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "service_id",
                    "id": 1
                }
            ]
        },
        {
            "name": "GBCreateCall",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "service_id",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "call_id",
                    "id": 2
                },
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "method_id",
                    "id": 3
                }
            ]
        },
        {
            "name": "GBCancelCall",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "call_id",
                    "id": 1
                }
            ]
        },
        {
            "name": "GBSendCall",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "call_id",
                    "id": 1
                }
            ]
        },
        {
            "name": "GBCreateServiceResult",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "service_id",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "ECreateServiceResult",
                    "name": "result",
                    "id": 2
                },
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "error_details",
                    "id": 3
                }
            ],
            "enums": [
                {
                    "name": "ECreateServiceResult",
                    "values": [
                        {
                            "name": "SUCCESS",
                            "id": 0
                        },
                        {
                            "name": "INVALID_ID",
                            "id": 1
                        },
                        {
                            "name": "GRPC_ERROR",
                            "id": 2
                        }
                    ]
                }
            ]
        },
        {
            "name": "GBReleaseServiceResult",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "service_id",
                    "id": 1
                }
            ]
        },
        {
            "name": "GBCreateCallResult",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "call_id",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "ECreateCallResult",
                    "name": "result",
                    "id": 2
                }
            ],
            "enums": [
                {
                    "name": "ECreateCallResult",
                    "values": [
                        {
                            "name": "SUCCESS",
                            "id": 0
                        },
                        {
                            "name": "INVALID_ID",
                            "id": 1
                        },
                        {
                            "name": "GRPC_ERROR",
                            "id": 2
                        }
                    ]
                }
            ]
        },
        {
            "name": "GBCallReceive",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "call_id",
                    "id": 1
                }
            ]
        },
        {
            "name": "GBCallResult",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "call_id",
                    "id": 1
                }
            ]
        }
    ]
};