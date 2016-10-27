import { buildServiceInfoIdentifier } from './service_info';
import {
  IGBServiceInfo,
} from '../proto';
import { Service } from './service';

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
