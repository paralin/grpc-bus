// GRPC methods copied from the GRPC codebase.
// This is to not have a dependence on grpc at runtime in this library.
import * as _ from 'lodash';
import * as ProtoBuf from 'protobufjs';

// Service object passed to makeClientConstructor
// https://github.com/grpc/grpc/issues/8727
export interface IGRPCMethodObject {
  path: string;
  requestStream: boolean;
  responseStream: boolean;
  requestType: any;
  responseType: any;
  requestSerialize: (msg: any) => any;
  requestDeserialize: (msg: any) => any;
  responseSerialize: (msg: any) => any;
  responseDeserialize: (msg: any) => any;
}

export interface IGRPCServiceObject {
  [methodName: string]: IGRPCMethodObject;
}

export function fullyQualifiedName(meta: any): string {
  if (meta === null || meta === undefined) {
    return '';
  }
  let name = meta.name;
  let parentName = fullyQualifiedName(meta.parent);
  if (parentName && parentName.length) {
    name = parentName + '.' + name;
  }
  return name;
}

function ensureBuffer(inp: any): Buffer {
  if (typeof inp === 'string') {
    return new Buffer(inp);
  }
  if (typeof inp === 'object') {
    // detect ByteBuffer
    if (inp.constructor !== Buffer) {
      return inp.toBuffer();
    }
  }
  return inp;
}

export function getPassthroughServiceAttrs(service: ProtoBuf.Service,
                                           options: any): IGRPCServiceObject {
  let prefix = '/' + fullyQualifiedName(service) + '/';
  let res: IGRPCServiceObject = {};
  if (!service.resolved) {
    service.resolveAll();
  }
  for (let methodName in service.methods) {
    if (!service.methods.hasOwnProperty(methodName)) {
      continue;
    }
    let method = service.methods[methodName];
    res[_.camelCase(method.name)] = {
      path: prefix + method.name,
      requestStream: !!method.requestStream,
      responseStream: !!method.responseStream,
      requestType: method.resolvedRequestType,
      responseType: method.resolvedResponseType,
      requestSerialize: ensureBuffer,
      requestDeserialize: _.identity,
      responseSerialize: ensureBuffer,
      responseDeserialize: _.identity,
    };
  }
  return res;
}

export function makePassthroughClientConstructor(grpc: any, service: any, options?: any): any {
  let methodAttrs = getPassthroughServiceAttrs(service, options);
  let Client = grpc.makeGenericClientConstructor(
    methodAttrs, fullyQualifiedName(service),
    false,
  );
  Client.service = service;
  Client.service.grpc_options = options;
  return Client;
}
