import { PROTO_DEFINITIONS } from './definitions';

let ProtoBuf = require('protobufjs');
export function buildTree(): any {
  return ProtoBuf.loadJson(JSON.stringify(PROTO_DEFINITIONS));
}
