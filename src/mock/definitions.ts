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
    "services": [
        {
            "name": "Greeter",
            "options": {},
            "rpc": {
                "SayHello": {
                    "request": "HelloRequest",
                    "response": "HelloReply",
                    "options": {}
                }
            }
        }
    ]
};
