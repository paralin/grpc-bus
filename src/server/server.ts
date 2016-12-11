import { ServiceStore } from './store';
import { CallStore } from './call_store';
import {
  IGBServerMessage,
  IGBClientMessage,
  IGBSendCall,
  IGBCreateService,
  IGBCreateServiceResult,
  IGBReleaseService,
  IGBCreateCall,
  IGBEndCall,
} from '../proto';

import * as ProtoBuf from 'protobufjs';

// A server for a remote client.
export class Server {
  // Store of remote services
  private store: ServiceStore;

  // Map of known client IDs to services.
  private clientIdToService: { [id: number]: CallStore } = {};

  public constructor(private protoRoot: ProtoBuf.Root,
                     private send: (message: IGBServerMessage) => void,
                     // Pass require('grpc')
                     private grpc: any) {
    this.store = new ServiceStore(protoRoot, this.grpc);
  }

  public handleMessage(message: IGBClientMessage) {
    if (message.serviceCreate) {
      this.handleServiceCreate(message.serviceCreate);
    }
    if (message.serviceRelease) {
      this.handleServiceRelease(message.serviceRelease);
    }
    if (message.callCreate) {
      this.handleCallCreate(message.callCreate);
    }
    if (message.callEnd) {
      this.handleCallEnd(message.callEnd);
    }
    if (message.callSend) {
      this.handleCallSend(message.callSend);
    }
  }

  public dispose() {
    for (let servId in this.clientIdToService) {
      if (!this.clientIdToService.hasOwnProperty(servId)) {
        continue;
      }
      this.clientIdToService[servId].dispose();
    }
    this.clientIdToService = {};
  }

  private releaseLocalService(serviceId: number, sendGratuitous: boolean = true) {
    let srv = this.clientIdToService[serviceId];
    if (srv) {
      sendGratuitous = true;
      // Kill all ongoing calls, inform the client they are ended
      delete this.clientIdToService[serviceId];
      srv.dispose();
    }
    if (sendGratuitous) {
      // Inform the client the service has been released
      this.send({
        serviceRelease: {
          serviceId: serviceId,
        },
      });
    }
  }

  private handleServiceCreate(msg: IGBCreateService) {
    let serviceId = msg.serviceId;
    let result: IGBCreateServiceResult = {
      serviceId: msg.serviceId,
      result: 0,
    };
    if (typeof msg.serviceId !== 'number' || this.clientIdToService[msg.serviceId]) {
      // todo: fix enums
      result.result = 1;
      result.errorDetails = 'ID is not set or is already in use.';
    } else {
      try {
        let serv = this.store.getService(msg.serviceId, msg.serviceInfo);
        // Here, we may get an error thrown if the info is invalid.
        serv.initStub();
        // When the service is disposed, also dispose the client service.
        serv.disposed.subscribe(() => {
          this.releaseLocalService(serviceId, false);
        });
        this.clientIdToService[serviceId] = new CallStore(serv, msg.serviceId, this.send);
      } catch (e) {
        result.result = 2;
        result.errorDetails = e.toString();
      }
    }

    this.send({
      serviceCreate: result,
    });
  }

  private handleServiceRelease(msg: IGBReleaseService) {
    this.releaseLocalService(msg.serviceId);
  }

  private handleCallSend(msg: IGBSendCall) {
    let svc = this.clientIdToService[msg.serviceId];
    if (!svc) {
      this.releaseLocalService(msg.serviceId, true);
      return;
    }
    svc.handleCallWrite(msg);
  }

  private handleCallCreate(msg: IGBCreateCall) {
    let svc = this.clientIdToService[msg.serviceId];
    if (!svc) {
      this.send({
        callCreate: {
          result: 1,
          serviceId: msg.serviceId,
          callId: msg.callId,
          errorDetails: 'Service ID not found.',
        },
      });
      return;
    }
    svc.initCall(msg);
  }

  private handleCallEnd(msg: IGBEndCall) {
    let svc = this.clientIdToService[msg.serviceId];
    if (svc) {
      svc.handleCallEnd(msg);
    }
  }
}
