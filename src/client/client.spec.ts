import { Client } from './client';
import { IServiceHandle } from './service';
import {
  IGBClientMessage,
} from '../proto';
import {
  buildTree,
} from '../mock';

describe('Client', () => {
  let client: Client;
  let recvQueue: IGBClientMessage[] = [];
  let lookupTree: any;
  let serviceTree: any;

  beforeEach(() => {
    lookupTree = buildTree();
    client = new Client(lookupTree, (msg: IGBClientMessage) => {
      recvQueue.push(msg);
    });
    serviceTree = client.buildTree();
  });

  it('should build the tree correctly', () => {
    let tree = client.buildTree();
    expect(typeof tree).toBe('object');
    expect(typeof tree['mock']).toBe('object');
    expect(typeof tree['mock']['Greeter']).toBe('function');

    let greeter = tree['mock']['Greeter']('localhost:3000');
    expect(typeof greeter).toBe('object');
    expect(greeter.constructor).toBe(Promise);
    expect(recvQueue.length).toBe(1);
    expect(recvQueue[0]).toEqual({
      service_create: {
        service_id: 1,
        service_info: {
          service_id: 'mock.Greeter',
          endpoint: 'localhost:3000',
        },
      },
    });
  });

  it('should start a rpc call correctly', (done) => {
    let servicePromise: Promise<IServiceHandle> = serviceTree.mock.Greeter('localhost:3000');
    let serviceCreateMsg = recvQueue[0];
    expect(serviceCreateMsg.service_create.service_id).toBe(1);
    client.handleMessage({
      service_create: {
        result: 0,
        service_id: serviceCreateMsg.service_create.service_id,
      },
    });
    recvQueue.length = 0;
    servicePromise.then((mockService) => {
      expect(mockService).not.toBe(null);
      mockService['sayHello']({name: 'test'}, (err: any, response: any) => {
        expect(response).toEqual({test: [1, 2, 3]});
        done();
      });
      expect(recvQueue.length).toBe(1);
      let msg = recvQueue[0];
      recvQueue.length = 0;
      expect(msg).toEqual({
        call_create: {
          call_id: 1,
          info: {
            method_id: 'SayHello',
            arguments: '{"name":"test"}',
          },
          service_id: 1,
        },
      });
      client.handleMessage({
        call_event: {
          call_id: 1,
          service_id: 1,
          event: 'data',
          data: '{"test":[1,2,3]}',
        },
      });
      client.handleMessage({
        call_ended: {
          call_id: 1,
          service_id: 1,
        },
      });
      expect(recvQueue.length).toBe(0);
    });
  });
});
