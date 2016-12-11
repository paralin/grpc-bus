import { PROTO_DEFINITIONS } from './definitions';
import * as ProtoBuf from 'protobufjs';

export function buildTree(): ProtoBuf.Root {
  return ProtoBuf.Root.fromJSON(PROTO_DEFINITIONS);
}
