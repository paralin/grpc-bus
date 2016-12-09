/* tslint:disable:trailing-comma */
/* tslint:disable:quotemark */
/* tslint:disable:max-line-length */
export const PROTO_DEFINITIONS = {
  "nested": {
    "grpcbus": {
      "nested": {
        "GBClientMessage": {
          "fields": {
            "serviceCreate": {
              "type": "GBCreateService",
              "id": 1
            },
            "serviceRelease": {
              "type": "GBReleaseService",
              "id": 2
            },
            "callCreate": {
              "type": "GBCreateCall",
              "id": 3
            },
            "callEnd": {
              "type": "GBCallEnd",
              "id": 4
            },
            "callSend": {
              "type": "GBSendCall",
              "id": 5
            }
          }
        },
        "GBServerMessage": {
          "fields": {
            "serviceCreate": {
              "type": "GBCreateServiceResult",
              "id": 1
            },
            "serviceRelease": {
              "type": "GBReleaseServiceResult",
              "id": 2
            },
            "callCreate": {
              "type": "GBCreateCallResult",
              "id": 3
            },
            "callEvent": {
              "type": "GBCallEvent",
              "id": 4
            },
            "callEnded": {
              "type": "GBCallEnded",
              "id": 5
            }
          }
        },
        "GBServiceInfo": {
          "fields": {
            "endpoint": {
              "type": "string",
              "id": 1
            },
            "serviceId": {
              "type": "string",
              "id": 2
            }
          }
        },
        "GBCreateService": {
          "fields": {
            "serviceId": {
              "type": "int32",
              "id": 1
            },
            "serviceInfo": {
              "type": "GBServiceInfo",
              "id": 2
            }
          }
        },
        "GBReleaseService": {
          "fields": {
            "serviceId": {
              "type": "int32",
              "id": 1
            }
          }
        },
        "GBCallInfo": {
          "fields": {
            "methodId": {
              "type": "string",
              "id": 1
            },
            "binArgument": {
              "type": "bytes",
              "id": 2
            }
          }
        },
        "GBCreateCall": {
          "fields": {
            "serviceId": {
              "type": "int32",
              "id": 1
            },
            "callId": {
              "type": "int32",
              "id": 2
            },
            "info": {
              "type": "GBCallInfo",
              "id": 3
            }
          }
        },
        "GBCallEnded": {
          "fields": {
            "callId": {
              "type": "int32",
              "id": 1
            },
            "serviceId": {
              "type": "int32",
              "id": 2
            }
          }
        },
        "GBEndCall": {
          "fields": {
            "callId": {
              "type": "int32",
              "id": 1
            },
            "serviceId": {
              "type": "int32",
              "id": 2
            }
          }
        },
        "GBSendCall": {
          "fields": {
            "callId": {
              "type": "int32",
              "id": 1
            },
            "serviceId": {
              "type": "int32",
              "id": 2
            },
            "binData": {
              "type": "bytes",
              "id": 3
            },
            "isEnd": {
              "type": "bool",
              "id": 4
            }
          }
        },
        "GBCreateServiceResult": {
          "fields": {
            "serviceId": {
              "type": "int32",
              "id": 1
            },
            "result": {
              "type": "ECreateServiceResult",
              "id": 2
            },
            "errorDetails": {
              "type": "string",
              "id": 3
            }
          },
          "nested": {
            "ECreateServiceResult": {
              "values": {
                "SUCCESS": 0,
                "INVALID_ID": 1,
                "GRPC_ERROR": 2
              }
            }
          }
        },
        "GBReleaseServiceResult": {
          "fields": {
            "serviceId": {
              "type": "int32",
              "id": 1
            }
          }
        },
        "GBCreateCallResult": {
          "fields": {
            "callId": {
              "type": "int32",
              "id": 1
            },
            "serviceId": {
              "type": "int32",
              "id": 4
            },
            "result": {
              "type": "ECreateCallResult",
              "id": 2
            },
            "errorDetails": {
              "type": "string",
              "id": 3
            }
          },
          "nested": {
            "ECreateCallResult": {
              "values": {
                "SUCCESS": 0,
                "INVALID_ID": 1,
                "GRPC_ERROR": 2
              }
            }
          }
        },
        "GBCallEvent": {
          "fields": {
            "callId": {
              "type": "int32",
              "id": 1
            },
            "serviceId": {
              "type": "int32",
              "id": 4
            },
            "event": {
              "type": "string",
              "id": 2
            },
            "jsonData": {
              "type": "string",
              "id": 3
            },
            "binData": {
              "type": "bytes",
              "id": 5
            }
          }
        },
        "GBCallEnd": {
          "fields": {
            "callId": {
              "type": "int32",
              "id": 1
            },
            "serviceId": {
              "type": "int32",
              "id": 2
            }
          }
        }
      }
    }
  }
};
