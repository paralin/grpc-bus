// GRPC methods copied from the GRPC codebase.
// This is to not have a dependence on grpc at runtime in this library.
import * as _ from 'lodash';

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

export function getPassthroughServiceAttrs(service: any, options: any): IGRPCServiceObject {
  let prefix = '/' + fullyQualifiedName(service) + '/';
  let res: IGRPCServiceObject = {};
  for (let method of service.children) {
    res[_.camelCase(method.name)] = {
      path: prefix + method.name,
      requestStream: method.requestStream,
      responseStream: method.responseStream,
      requestType: method.requestType,
      responseType: method.responseType,
      requestSerialize: ensureBuffer,
      requestDeserialize: _.identity,
      responseSerialize: ensureBuffer,
      responseDeserialize: _.identity,
    };
  }
  return res;
}

export function makePassthroughClientConstructor(grpc: any, service: any, options: any): any {
  let methodAttrs = getPassthroughServiceAttrs(service, options);
  let Client = grpc.makeGenericClientConstructor(
    methodAttrs, fullyQualifiedName(service),
    false,
  );
  Client.service = service;
  Client.service.grpc_options = options;
  return Client;
}

// Modified loadObject that removes deserialization.
export function loadObject(grpc: any, meta: any, options?: any): any {
  let result: any = {};
  if (meta.className === 'Namespace') {
    _.each(meta.children, (child: any) => {
      result[child.name] = loadObject(grpc, child, options);
    });
    return result;
  } else if (meta.className === 'Service') {
    return makePassthroughClientConstructor(grpc, meta, options);
  } else if (meta.className === 'Message' || meta.className === 'Enum') {
    return meta.build();
  } else {
    return meta;
  }
}
