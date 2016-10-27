import { Subject } from 'rxjs/Subject';
import { IGBServiceInfo } from '../proto';

import * as _ from 'lodash';
let grpc: any = require('grpc');

// A stored service.
export class Service {
  // Subject called when disposed.
  public disposed: Subject<Service> = new Subject<Service>();
  // Service info
  private info: IGBServiceInfo;
  // GRPC service stub
  private stub: any;
  // List of client service IDs corresponding to this service.
  private clientIds: number[];

  constructor(private protoTree: any,
              clientId: number,
              info: IGBServiceInfo) {
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
    let stubctr = grpc.loadObject(serv);
    this.stub = new stubctr(this.info.endpoint, grpc.credentials.createInsecure());
  }

  public clientAdd(id: number) {
    if (this.clientIds.indexOf(id) === -1) {
      this.clientIds.push(id);
    }
  }

  public clientRelease(id: number) {
    this.clientIds = _.without(this.clientIds, id);
    if (this.clientIds.length === 0) {
      this.destroy();
    }
  }

  private destroy() {
    this.disposed.next(this);
    this.clientIds = null;
    if (this.stub) {
      grpc.getClientChannel(this.stub).close();
    }
    this.stub = null;
    this.info = null;
  }
}
