GRPC Bus [![codecov](https://codecov.io/gh/paralin/grpc-bus/branch/master/graph/badge.svg)](https://codecov.io/gh/paralin/grpc-bus) [![Build Status](https://travis-ci.org/paralin/grpc-bus.svg?branch=master)](https://travis-ci.org/paralin/grpc-bus) [![npm version](https://badge.fury.io/js/grpc-bus.svg)](https://badge.fury.io/js/grpc-bus) [![dependencies Status](https://david-dm.org/paralin/grpc-bus/status.svg)](https://david-dm.org/paralin/grpc-bus) [![devDependencies Status](https://david-dm.org/paralin/grpc-bus/dev-status.svg)](https://david-dm.org/paralin/grpc-bus?type=dev)
========

GRPC-bus is a mechanism to call GRPC services from the browser using a Node.JS server as a proxy. The link between the browser and Node.JS is defined by the user, but could be something like a websocket.

The server and client are expected to share the same / similar protobuf tree. For example, the same result should come from the following code on both the client and server:

```js
builder.Build("mynamespace.MyType");
```

In this way the client can implement the ProtoBuf.JS RPC interfaces in the browser. Then, the grpc-bus package does the following:

 - Keep track of connections to desired remote servers
 - Make service calls on behalf of the client
 - Keep track of streaming calls and pipe these back to the client accordingly.

Thus, we can call GRPC servers from the browser via a Node.JS websocket stream.

Example
=======

A full example can be found in the end-to-end tests under `./src/index.spec.ts`.

First, create your client, and give it a way to communicate with the server:

```js
var protoTree = ProtobufJS.load('...');
var grpcBus = require('grpc-bus');
// MySendFunction takes a message object.
// This message should be passed to handleMessage on the server.
var client = new grpcBus.Client(protoTree, mySendFunction);
var tree = client.buildTree();
tree.MyService('localhost:3000').then(function(service) {
  service.MyMethod({hello: 'world'}, function(err, resp) {
    console.log(resp);
    service.end();
  });
});
```

You should always call `service.end()` when you are done with a service handle, so the server knows it's safe to dispose it.

You'll notice that inside the `then` block the API is exactly the same as the Node GRPC api.

Internals
=========

A client must first be instantiated. The client object has to be given a function to send a message to the server, and should be called when the server sends a message to it. In this way, the user can implement their own transport, for example, websockets.

Next, the client can instantiate a service object, similar to the GRPC Node API. This returns a promise, resolved with a service handle with stubs for the methods on the service. The server will de-duplicate and re-use multiple service objects internally.

The client can then make calls against the remote service with the same API as the GRPC Node implementation.

When the client is done with a service object, it should dispose it. When all service objects are disposed, the server will disconnect from the service and forget the credentials used.
