import { ServiceStore } from './store';
import { CallStore } from './call_store';
import {
  IGBServerMessage,
  IGBClientMessage,
  IGBCreateService,
  IGBCreateServiceResult,
  IGBCreateCallResult,
  IGBReleaseService,
  IGBCreateCall,
  IGBEndCall,
} from '../proto';

// A server for a remote client.
export class Server {
  // Store of remote services
  // tslint:disable-next-line
  private store: ServiceStore;

  // Map of known client IDs to services.
  private clientIdToService: { [id: number]: CallStore } = {};

  // Map of known call IDs to services.
  private callIdToService: { [id: number]: CallStore } = {};

  public constructor(private protoTree: any,
                     private send: (message: IGBServerMessage) => void) {
    this.store = new ServiceStore(protoTree);
  }

  public handleMessage(message: IGBClientMessage) {
    if (message.service_create) {
      this.handleServiceCreate(message.service_create);
    }
    if (message.service_release) {
      this.handleServiceRelease(message.service_release);
    }
    if (message.call_create) {
      this.handleCallCreate(message.call_create);
    }
    if (message.call_end) {
      this.handleCallEnd(message.call_end);
    }
  }

  public dispose() {
    this.callIdToService = {};
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
        service_release: {
          service_id: serviceId,
        },
      });
    }
  }

  private releaseLocalCall(callId: number) {
    delete this.callIdToService[callId];
  }

  private handleServiceCreate(msg: IGBCreateService) {
    let serviceId = msg.service_id;
    let result: IGBCreateServiceResult = {
      service_id: msg.service_id,
      result: 0,
    };
    if (typeof msg.service_id !== 'number' || this.clientIdToService[msg.service_id]) {
      // todo: fix enums
      result.result = 1;
      result.error_details = 'ID is not set or is already in use.';
    } else {
      try {
        let serv = this.store.getService(msg.service_id, msg.service_info);
        // Here, we may get an error thrown if the info is invalid.
        serv.initStub();
        // When the service is disposed, also dispose the client service.
        serv.disposed.subscribe(() => {
          this.releaseLocalService(serviceId, false);
        });
        this.clientIdToService[serviceId] = new CallStore(serv, msg.service_id, this.send);
      } catch (e) {
        result.result = 2;
        result.error_details = e.toString();
      }
    }

    this.send({
      service_create: result,
    });
  }

  private handleServiceRelease(msg: IGBReleaseService) {
    this.releaseLocalService(msg.service_id);
  }

  private handleCallCreate(msg: IGBCreateCall) {
    let result: IGBCreateCallResult = {
      call_id: msg.call_id,
      result: 0,
    };

    let svc = this.clientIdToService[msg.service_id];
    if (!svc) {
      result.result = 1;
      result.error_details = 'Service ID not found.';
    } else if (typeof msg.call_id !== 'number' || this.callIdToService[msg.call_id]) {
      // todo: fix enums
      result.result = 1;
      result.error_details = 'ID is not set or is already in use.';
    } else {
      try {
        let callId = msg.call_id;
        let call = svc.initCall(msg);
        this.callIdToService[callId] = svc;
        call.disposed.subscribe(() => {
          this.releaseLocalCall(callId);
        });
      } catch (e) {
        result.result = 2;
        result.error_details = e.toString();
      }
    }

    this.send({
      call_create: result,
    });
  }

  private handleCallEnd(msg: IGBEndCall) {
    let call = this.callIdToService[msg.call_id];
    if (call) {
      call.dispose();
    }
  }
}
