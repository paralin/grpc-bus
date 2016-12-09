import { Subject } from 'rxjs/Subject';
import {
  IGBServiceInfo,
} from '../proto';
import {
  makePassthroughClientConstructor,
} from './grpc';

import * as ProtoBuf from 'protobufjs';
import * as _ from 'lodash';

// A stored service.
export class Service {
  // Subject called when disposed.
  public disposed: Subject<Service> = new Subject<Service>();
  // GRPC service stub
  public stub: any;
  // Service metadata
  public serviceMeta: ProtoBuf.Service;
  // Service info
  private info: IGBServiceInfo;
  // List of client service IDs corresponding to this service.
  private clientIds: number[];

  constructor(private protoRoot: ProtoBuf.Root,
              clientId: number,
              info: IGBServiceInfo,
              // Pass require('grpc') as an argument.
              private grpc: any) {
    this.clientIds = [clientId];
    this.info = info;
  }

  public initStub() {
    let serv: ProtoBuf.Service = <any>this.protoRoot.lookup(this.info.serviceId);
    if (!serv) {
      throw new TypeError(this.info.serviceId + ' was not found.');
    }
    if (!serv.methods || !Object.keys(serv.methods).length) {
      throw new TypeError(this.info.serviceId + ' is not a Service.');
    }
    let stubctr = makePassthroughClientConstructor(this.grpc, serv);
    this.stub = new stubctr(this.info.endpoint, this.grpc.credentials.createInsecure());
    this.serviceMeta = serv;
  }

  public clientAdd(id: number) {
    if (this.clientIds.indexOf(id) === -1) {
      this.clientIds.push(id);
    }
  }

  public clientRelease(id: number) {
    if (!this.clientIds) {
      return;
    }
    this.clientIds = _.without(this.clientIds, id);
    if (this.clientIds.length === 0) {
      this.destroy();
    }
  }

  private destroy() {
    this.clientIds = null;
    this.disposed.next(this);
    if (this.stub) {
      this.grpc.getClientChannel(this.stub).close();
    }
    this.stub = null;
    this.info = null;
  }
}
