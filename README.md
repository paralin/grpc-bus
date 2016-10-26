GRPC Bus [![codecov](https://codecov.io/gh/paralin/grpc-bus/branch/master/graph/badge.svg)](https://codecov.io/gh/paralin/grpc-bus) [![Build Status](https://travis-ci.org/paralin/grpc-bus.svg?branch=master)](https://travis-ci.org/paralin/grpc-bus)
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

API
===

A client must first be instantiated. The client object has to be given a function to send a message to the server, and should be called when the server sends a message to it. In this way, the user can implement their own transport, for example, websockets.

Next, the client can be used to request a connection to a remote service. The client has a function to create a connection given a endpoint and security options. These options are used server-side to deduplicate connections to a service. If the client requests 3 connections with identical properties, the server will only dial once. This allows the client to request one-off connections when needed and not experience significant disconnect / connect churn on the server.

A connection object has a connection state. The server will actively try to maintain an open connection with the service, and will reconnect if necessary.

When the client is done with a connection object, it should dispose it. When all connection objects are disposed, the server will disconnect from the service and forget the credentials used.

The connection object can then be used to hit services on the remote. A function on the connection object returns a [Protobuf.JS Service Instance](https://github.com/dcodeIO/protobuf.js/wiki/Services) that uses the client and connection to hit the remote service.

Calls using this service instance will be proxied through the grpc-bus connection.
