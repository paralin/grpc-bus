import { ServiceStore } from './store';
import { CallStore } from './call_store';
import {
  IGBServerMessage,
  IGBClientMessage,
  IGBCreateService,
  IGBCreateServiceResult,
  IGBReleaseService,
} from '../proto';

// A server for a remote client.
export class Server {
  // Store of remote services
  // tslint:disable-next-line
  private store: ServiceStore;

  // Map of known client IDs to services.
  private clientIdToService: { [id: number]: CallStore } = {};

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
  }

  private releaseLocalService(serviceId: number, sendGratuitous: boolean = true) {
    let srv = this.clientIdToService[serviceId];
    if (srv) {
      sendGratuitous = true;
      // Kill all ongoing calls, inform the client they are ended
      srv.dispose();
      delete this.clientIdToService[serviceId];
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
        // Realistically this will never happen.
        serv.disposed.subscribe(() => {
          this.releaseLocalService(serviceId);
        });
        this.clientIdToService[serviceId] = new CallStore(serv, this.send);
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
}
