/* tslint:disable:trailing-comma */
/* tslint:disable:quotemark */
/* tslint:disable:max-line-length */
export const PROTO_DEFINITIONS = {
  "nested": {
    "mock": {
      "nested": {
        "Greeter": {
          "methods": {
            "SayHello": {
              "requestType": "HelloRequest",
              "responseType": "HelloReply"
            },
            "SayHelloClientStream": {
              "requestType": "HelloRequest",
              "requestStream": true,
              "responseType": "HelloReply"
            },
            "SayHelloServerStream": {
              "requestType": "HelloRequest",
              "responseType": "HelloReply",
              "responseStream": true
            },
            "SayHelloBidiStream": {
              "requestType": "HelloRequest",
              "requestStream": true,
              "responseType": "HelloReply",
              "responseStream": true
            }
          }
        },
        "EDummyEnum": {
          "values": {
            "DUMMY": 0
          }
        },
        "HelloRequest": {
          "fields": {
            "name": {
              "type": "string",
              "id": 1
            }
          }
        },
        "HelloReply": {
          "fields": {
            "message": {
              "type": "string",
              "id": 1
            }
          }
        }
      }
    }
  }
};
