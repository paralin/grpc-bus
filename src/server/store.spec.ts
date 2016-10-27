import { ServiceStore } from './store';
import { IGBServiceInfo } from '../proto';
import {
  buildTree,
} from '../mock';

describe('ServiceStore', () => {
  let store: ServiceStore;
  let info: IGBServiceInfo = {
    endpoint: 'localhost:3000',
    service_id: 'mock.Greeter',
  };

  beforeEach(() => {
    store = new ServiceStore(buildTree());
  });

  it('should get a service correctly', () => {
    let serv = store.getService(1, info);
    expect(serv).not.toBe(null);
  });

  it('should dispose a service correctly', () => {
    let spai = jasmine.createSpy('Dispose Func');
    let serv = store.getService(10, info);
    let servb = store.getService(11, info);
    serv.initStub();
    expect(servb).toBe(serv);
    serv.disposed.subscribe(spai);
    serv.clientRelease(10);
    expect(spai).not.toHaveBeenCalled();
    serv.clientRelease(11);
    expect(spai).toHaveBeenCalled();
  });
});
