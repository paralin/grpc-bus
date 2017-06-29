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
import * as ProtoBuf from 'protobufjs';

export class Client {
  private serviceIdCounter: number = 1;
  private services: { [id: number]: Service } = {};

  public constructor(private protoRoot: ProtoBuf.Root,
                     private send: (message: IGBClientMessage) => void) {
    this.recurseBuildTree(protoRoot, null);
  }

  public handleMessage(message: IGBServerMessage) {
    if (message.serviceCreate) {
      this.handleServiceCreate(message.serviceCreate);
    }
    if (message.callCreate) {
      this.handleCallCreate(message.callCreate);
    }
    if (message.callEvent) {
      this.handleCallEvent(message.callEvent);
    }
    if (message.callEnded) {
      this.handleCallEnded(message.callEnded);
    }
    if (message.serviceRelease) {
      this.handleServiceRelease(message.serviceRelease);
    }
  }

  /*
   * Returns the ProtoBuf.Root containing service constructor functions.
   */
  public get root(): ProtoBuf.Root {
    return this.protoRoot;
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

  private recurseBuildTree(tree: any, identifier: string): any {
    let nextIdentifier: string = tree.name;
    if (identifier && identifier.length) {
      nextIdentifier = identifier + '.' + nextIdentifier;
    }
    if (tree.methods && Object.keys(tree.methods).length) {
      return (endpoint: string) => {
        return this.buildService(tree, nextIdentifier, endpoint);
      };
    }
    if (tree.nested) {
      for (let childName in tree.nested) {
        if (!tree.nested.hasOwnProperty(childName)) {
          continue;
        }
        tree.nested[childName] = this.recurseBuildTree(tree.nested[childName], nextIdentifier);
      }
    }
    return tree;
  }

  // Build a service and return a service handle promise.
  private buildService(serviceMeta: ProtoBuf.Service,
                       method: string,
                       endpoint: string): Promise<IServiceHandle> {
    return new Promise((resolve, reject) => {
      let sid = this.serviceIdCounter++;
      let info: IGBServiceInfo = {
        serviceId: method,
        endpoint: endpoint,
      };
      let service = new Service(serviceMeta, sid, info, {
        resolve: resolve,
        reject: reject,
      }, this.send);
      service.initStub();
      this.services[sid] = service;
      service.disposed.subscribe(() => {
        delete this.services[sid];
      });
      this.send({
        serviceCreate: {
          serviceId: sid,
          serviceInfo: info,
        },
      });
    });
  }

  private handleServiceCreate(msg: IGBCreateServiceResult) {
    let service = this.services[msg.serviceId];
    if (!service) {
      return;
    }
    service.handleCreateResponse(msg);
  }

  private handleCallCreate(msg: IGBCreateCallResult) {
    let service = this.services[msg.serviceId];
    if (!service) {
      return;
    }
    service.handleCallCreateResponse(msg);
  }

  private handleServiceRelease(msg: IGBReleaseServiceResult) {
    let svc = this.services[msg.serviceId];
    if (!svc) {
      return;
    }
    svc.handleServiceRelease(msg);
  }

  private handleCallEnded(msg: IGBCallEnded) {
    let svc = this.services[msg.serviceId];
    if (!svc) {
      return;
    }
    svc.handleCallEnded(msg);
  }

  private handleCallEvent(msg: IGBCallEvent) {
    let service = this.services[msg.serviceId];
    if (!service) {
      return;
    }
    service.handleCallEvent(msg);
  }
}
