import { Subject } from 'rxjs/Subject';
import {
  IGBServiceInfo,
} from '../proto';

import * as _ from 'lodash';

// A stored service.
export class Service {
  // Subject called when disposed.
  public disposed: Subject<Service> = new Subject<Service>();
  // GRPC service stub
  public stub: any;
  // Service metadata
  public serviceTree: any;
  // Service info
  private info: IGBServiceInfo;
  // List of client service IDs corresponding to this service.
  private clientIds: number[];

  constructor(private protoTree: any,
              clientId: number,
              info: IGBServiceInfo,
              // Pass require('grpc') as an argument.
              private grpc: any) {
    this.clientIds = [clientId];
    this.info = info;
  }

  public initStub() {
    let serv = this.protoTree.lookup(this.info.service_id);
    if (!serv) {
      throw new TypeError(this.info.service_id + ' was not found.');
    }
    if (serv.className !== 'Service') {
      throw new TypeError(this.info.service_id + ' is a ' + serv.className + ' not a Service.');
    }
    let stubctr = this.grpc.loadObject(serv);
    this.stub = new stubctr(this.info.endpoint, this.grpc.credentials.createInsecure());
    this.serviceTree = serv;
  }

  public lookupMethod(methodId: string): any {
    for (let child of this.serviceTree.children) {
      if (child.name === methodId) {
        return child;
      }
    }
    return null;
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
