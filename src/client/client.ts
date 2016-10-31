import {
  IGBServerMessage,
  IGBClientMessage,
  IGBCreateCallResult,
  IGBCallEvent,
  IGBCreateServiceResult,
  IGBServiceInfo,
} from '../proto';
import { Service } from './service';
import { IServiceHandle } from './service';

export interface IGRPCTree {
  [id: string]: IGRPCTree | ((endpoint: string) => Promise<IServiceHandle>);
}

export class Client {
  private serviceIdCounter: number = 1;
  private services: { [id: number]: Service } = {};

  public constructor(private protoTree: any,
                     private send: (message: IGBClientMessage) => void) {
  }

  public handleMessage(message: IGBServerMessage) {
    if (message.service_create) {
      this.handleServiceCreate(message.service_create);
    }
    if (message.call_create) {
      this.handleCallCreate(message.call_create);
    }
    if (message.call_event) {
      this.handleCallEvent(message.call_event);
    }
  }

  public buildTree(base: string = '') {
    let meta = this.protoTree.lookup(base);
    if (!meta) {
      throw new Error('Base identifier ' + base + ' not found.');
    }
    return this.recurseBuildTree(meta, base);
  }

  // Clears all ongoing calls + services, etc
  public reset() {
    //
  }

  private recurseBuildTree(tree: any, identifier: string): IGRPCTree |
    ((endpoint: string) => Promise<IServiceHandle>) {
    let result: IGRPCTree = {};
    let nextIdentifier: string = tree.name;
    if (identifier.length) {
      nextIdentifier = identifier + '.' + nextIdentifier;
    }
    if (tree.className === 'Namespace') {
      for (let child of tree.children) {
        result[child.name] = this.recurseBuildTree(child, nextIdentifier);
      }
      return result;
    }
    if (tree.className === 'Service') {
      return (endpoint: string) => {
        return this.buildService(nextIdentifier, endpoint);
      };
    }
    if (tree.className === 'Message' || tree.className === 'Enum') {
      return tree.build();
    }
    return tree;
  }

  // Build a service and return a service handle promise.
  private buildService(method: string, endpoint: string): Promise<IServiceHandle> {
    return new Promise((resolve, reject) => {
      let sid = this.serviceIdCounter++;
      let info: IGBServiceInfo = {
        service_id: method,
        endpoint: endpoint,
      };
      let service = new Service(this.protoTree, sid, info, {
        resolve: resolve,
        reject: reject,
      }, this.send);
      service.initStub();
      this.services[sid] = service;
      service.disposed.subscribe(() => {
        delete this.services[sid];
      });
      this.send({
        service_create: {
          service_id: sid,
          service_info: info,
        },
      });
    });
  }

  private handleServiceCreate(msg: IGBCreateServiceResult) {
    let service = this.services[msg.service_id];
    if (!service) {
      return;
    }
    service.handleCreateResponse(msg);
  }

  private handleCallCreate(msg: IGBCreateCallResult) {
    let service = this.services[msg.service_id];
    if (!service) {
      return;
    }
    service.handleCallCreateResponse(msg);
  }

  private handleCallEvent(msg: IGBCallEvent) {
    let service = this.services[msg.service_id];
    if (!service) {
      return;
    }
    service.handleCallEvent(msg);
  }
}
