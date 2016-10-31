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
    recvQueue.length = 0;
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

  it('should handle service creation errors', (done) => {
    let servicePromise: Promise<IServiceHandle> = serviceTree.mock.Greeter('localhost:3000');
    servicePromise.then(() => {
      done('Did not reject promise.');
    }, (err) => {
      expect(err).toBe('Error here');
      done();
    });
    client.handleMessage({
      service_create: {
        result: 2,
        service_id: 1,
        error_details: 'Error here',
      },
    });
  });

  it('should handle service creation errors without details', (done) => {
    let servicePromise: Promise<IServiceHandle> = serviceTree.mock.Greeter('localhost:3000');
    servicePromise.then(() => {
      done('Did not reject promise.');
    }, (err) => {
      expect(err).toBe('Error 2');
      done();
    });
    client.handleMessage({
      service_create: {
        result: 2,
        service_id: 1,
      },
    });
  });

  it('should not allow invalid callback/argument combos', (done) => {
    let servicePromise: Promise<IServiceHandle> = serviceTree.mock.Greeter('localhost:3000');
    client.handleMessage({
      service_create: {
        result: 0,
        service_id: 1,
      },
    });
    servicePromise.then((service) => {
      recvQueue.length = 0;
      expect(() => {
        service['sayHelloClientStream']({}, () => {
          //
        });
      }).toThrow(new Error('Argument should not be specified for a request stream.'));
      expect(() => {
        service['sayHello'](() => {
          //
        });
      }).toThrow(new Error('Argument must be specified for a non-streaming request.'));
      expect(() => {
        service['sayHello']({});
      }).toThrow(new Error('Callback should be specified for a non-streaming response.'));
      expect(() => {
        service['sayHelloServerStream']({}, () => {
          //
        });
      }).toThrow(new Error('Callback should not be specified for a response stream.'));
      expect(service['sayHelloServerStream']({})).not.toBe(null);
      service.end();
      done();
    }, done);
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
    let resultAsserted = false;
    servicePromise.then((mockService) => {
      expect(mockService).not.toBe(null);
      mockService['sayHello']({name: 'test'}, (err: any, response: any) => {
        expect(response).toEqual({test: [1, 2, 3]});
        resultAsserted = true;
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
        call_create: {
          call_id: 1,
          result: 0,
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
      expect(resultAsserted).toBe(true);
      done();
    });
  });

  it('should cancel all calls when calling reset', (done) => {
    let servicePromise: Promise<IServiceHandle> = serviceTree.mock.Greeter('localhost:3000');
    client.handleMessage({
      service_create: {
        result: 0,
        service_id: 1,
      },
    });
    servicePromise.then((mockService) => {
      expect(mockService).not.toBe(null);
      mockService['sayHelloBidiStream']();
      client.handleMessage({
        call_create: {
          call_id: 1,
          result: 0,
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
      recvQueue.length = 0;
      client.reset();
      expect(recvQueue).toEqual([{
        call_end: {
          call_id: 1,
          service_id: 1,
        },
      }]);
      done();
    });
  });

  it('should handle a create error properly', (done) => {
    let servicePromise: Promise<IServiceHandle> = serviceTree.mock.Greeter('localhost:3000');
    client.handleMessage({
      service_create: {
        result: 0,
        service_id: 1,
      },
    });
    recvQueue.length = 0;
    servicePromise.then((mockService) => {
      expect(mockService).not.toBe(null);
      mockService['sayHello']({name: 'test'}, (err: any, response: any) => {
        expect(response).toBe(undefined);
        expect(err).toBe('Error on server side.');
        done();
      });
      client.handleMessage({
        call_create: {
          call_id: 1,
          service_id: 1,
          result: 2,
          error_details: 'Error on server side.',
        },
      });
    });
  });
});
