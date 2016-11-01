import {
  IGBServerMessage,
  IGBClientMessage,
  IGBReleaseServiceResult,
  IGBCreateCallResult,
  IGBCallEnded,
  IGBCallEvent,
  IGBCreateServiceResult,
  IGBServiceInfo,
} from '../proto';
import { Service } from './service';
import { IServiceHandle } from './service';

export interface IGRPCTree {
  [id: string]: IGRPCTree | ((endpoint: string) => Promise<IServiceHandle>);
}

// Hack: see if something is *probably* a namespace.
// This is due to the extreme bugginess around namespaces in pbjs.
function likelyNamespace(tree: any): boolean {
  if (tree.className === 'Namespace') {
    return true;
  }
  if (tree.className !== 'Message' ||
      !tree.children ||
      tree.children.length < 1) {
    return false;
  }
  for (let child of tree.children) {
    // Messages never have services as children.
    if (child.className === 'Service') {
      return true;
    }
    // Namespaces never have fields as children.
    if (child.className === 'Message.Field') {
      return false;
    }
  }
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
    if (message.call_ended) {
      this.handleCallEnded(message.call_ended);
    }
    if (message.service_release) {
      this.handleServiceRelease(message.service_release);
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
    for (let serviceId in this.services) {
      /* istanbul ignore next */
      if (!this.services.hasOwnProperty(serviceId)) {
        continue;
      }
      let service = this.services[serviceId];
      service.end();
    }
    this.services = {};
  }

  private recurseBuildTree(tree: any, identifier: string): IGRPCTree |
    ((endpoint: string) => Promise<IServiceHandle>) {
    let result: IGRPCTree = {};
    let nextIdentifier: string = tree.name;
    if (identifier.length) {
      nextIdentifier = identifier + '.' + nextIdentifier;
    }
    // Bit of a hack here, detect namespace several ways.
    if (likelyNamespace(tree)) {
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

  private handleServiceRelease(msg: IGBReleaseServiceResult) {
    let svc = this.services[msg.service_id];
    if (!svc) {
      return;
    }
    svc.handleServiceRelease(msg);
  }

  private handleCallEnded(msg: IGBCallEnded) {
    let svc = this.services[msg.service_id];
    if (!svc) {
      return;
    }
    svc.handleCallEnded(msg);
  }

  private handleCallEvent(msg: IGBCallEvent) {
    let service = this.services[msg.service_id];
    if (!service) {
      return;
    }
    service.handleCallEvent(msg);
  }
}
