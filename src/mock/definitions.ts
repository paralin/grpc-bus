/* tslint:disable:trailing-comma */
/* tslint:disable:quotemark */
/* tslint:disable:max-line-length */
export const PROTO_DEFINITIONS = {
    "package": "mock",
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
            ]
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
            ]
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
            ]
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
    ]
};
