import { Subject } from 'rxjs/Subject';
import { buildServiceInfoIdentifier } from './service_info';
import {
  IGBServiceInfo,
} from '../proto';

import * as _ from 'lodash';
let grpc: any = require('grpc');

// A store of active services.
export class ServiceStore {
  private services: { [id: string]: Service } = {};

  // Get service for a client.
  public getService(clientId: number, info: IGBServiceInfo): Service {
    let identifier = buildServiceInfoIdentifier(info);
    let serv: Service = this.services[identifier];
    if (!serv) {
      serv = new Service(clientId, info);
      serv.disposed.subscribe(() => {
        if (this.services) {
          delete this.services[identifier];
        }
      });
      this.services[identifier] = serv;
    } else {
      serv.clientAdd(clientId);
    }
    return serv;
  }
}

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

  constructor(clientId: number, info: IGBServiceInfo) {
    this.clientIds = [clientId];
    this.info = info;
  }

  public initStub() {
    //
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
