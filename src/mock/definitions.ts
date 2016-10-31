/* tslint:disable:trailing-comma */
/* tslint:disable:quotemark */
/* tslint:disable:max-line-length */
export const PROTO_DEFINITIONS = {
    "package": "mock",
    "syntax": "proto3",
    "messages": [
        {
            "name": "HelloRequest",
            "fields": [
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "name",
                    "id": 1
                }
            ],
            "syntax": "proto3"
        },
        {
            "name": "HelloReply",
            "fields": [
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "message",
                    "id": 1
                }
            ],
            "syntax": "proto3"
        }
    ],
    "enums": [
        {
            "name": "EDummyEnum",
            "values": [
                {
                    "name": "DUMMY",
                    "id": 0
                }
            ],
            "syntax": "proto3"
        }
    ],
    "services": [
        {
            "name": "Greeter",
            "options": {},
            "rpc": {
                "SayHello": {
                    "request": "HelloRequest",
                    "request_stream": false,
                    "response": "HelloReply",
                    "response_stream": false,
                    "options": {}
                },
                "SayHelloClientStream": {
                    "request": "HelloRequest",
                    "request_stream": true,
                    "response": "HelloReply",
                    "response_stream": false,
                    "options": {}
                },
                "SayHelloServerStream": {
                    "request": "HelloRequest",
                    "request_stream": false,
                    "response": "HelloReply",
                    "response_stream": true,
                    "options": {}
                },
                "SayHelloBidiStream": {
                    "request": "HelloRequest",
                    "request_stream": true,
                    "response": "HelloReply",
                    "response_stream": true,
                    "options": {}
                }
            }
        }
    ],
    "isNamespace": true
};
