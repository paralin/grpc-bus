GRPC Bus
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
