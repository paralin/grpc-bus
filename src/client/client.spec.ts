import { Client } from './client';
import { IServiceHandle } from './service';
import {
  IGBClientMessage,
} from '../proto';
import {
  buildTree,
} from '../mock';
import * as ProtoBuf from 'protobufjs';

describe('Client', () => {
  let client: Client;
  let recvQueue: IGBClientMessage[] = [];
  let lookupTree: ProtoBuf.Root;
  // An encoded sample request
  let encodedData: any;
  // An encoded sample response
  let encodedResponseData: any;

  beforeEach((done) => {
    lookupTree = buildTree();
    client = new Client(lookupTree, (msg: IGBClientMessage) => {
      recvQueue.push(msg);
    });
    lookupTree = client.root;
    encodedData = (<any>lookupTree.lookup('mock.HelloRequest'))
      .encode({'name': 'hello'}).finish();
    encodedResponseData = (<any>lookupTree.lookup('mock.HelloReply'))
      .encode({message: 'hello'}).finish();
    recvQueue.length = 0;
    done();
  });

  it('should build the tree correctly', () => {
    let tree = client.root;
    expect(typeof tree).toBe('object');
    expect(typeof tree.lookup('mock')).toBe('object');
    expect(typeof tree.lookup('mock.Greeter')).toBe('function');

    let greeter = (<any>tree.lookup('mock.Greeter'))('localhost:3000');
    expect(typeof greeter).toBe('object');
    expect(greeter.constructor).toBe(Promise);
    expect(recvQueue.length).toBe(1);
    expect(recvQueue[0]).toEqual({
      serviceCreate: {
        serviceId: 1,
        serviceInfo: {
          serviceId: 'mock.Greeter',
          endpoint: 'localhost:3000',
        },
      },
    });
  });

  it('should handle service creation errors', (done) => {
    let servicePromise: Promise<IServiceHandle> =
      (<any>lookupTree.lookup('mock.Greeter'))('localhost:3000');
    servicePromise.then(() => {
      throw new Error('Did not reject promise.');
    }, (err) => {
      expect(err).toBe('Error here');
      done();
    });
    client.handleMessage({
      serviceCreate: {
        result: 2,
        serviceId: 1,
        errorDetails: 'Error here',
      },
    });
  });

  it('should handle service creation errors without details', (done) => {
    let servicePromise: Promise<IServiceHandle> =
      (<any>lookupTree.lookup('mock.Greeter'))('localhost:3000');
    servicePromise.then(() => {
      throw new Error('Did not reject promise.');
    }, (err) => {
      expect(err).toBe('Error 2');
      done();
    });
    client.handleMessage({
      serviceCreate: {
        result: 2,
        serviceId: 1,
      },
    });
  });

  it('should not allow invalid callback/argument combos', (done) => {
    let servicePromise: Promise<IServiceHandle> =
      (<any>lookupTree.lookup('mock.Greeter'))('localhost:3000');
    client.handleMessage({
      serviceCreate: {
        result: 0,
        serviceId: 1,
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

  it('should start a streaming rpc call correctly', (done) => {
    let servicePromise: Promise<IServiceHandle> =
      (<any>lookupTree.lookup('mock.Greeter'))('localhost:3000');
    client.handleMessage({
      serviceCreate: {
        result: 0,
        serviceId: 1,
      },
    });
    servicePromise.then((mockService) => {
      expect(mockService).not.toBe(null);
      recvQueue.length = 0;
      let call = mockService['sayHelloBidiStream']();
      expect(recvQueue.length).toBe(1);
      let msg = recvQueue[0];
      let throwOnData = false;
      recvQueue.length = 0;
      call.on('data', (data: ProtoBuf.Message) => {
        expect(throwOnData).toBe(false);
        expect(data.asJSON()).toEqual({message: 'hello'});
      });
      expect(msg).toEqual({
        callCreate: {
          callId: 1,
          info: {
            methodId: 'SayHelloBidiStream',
            binArgument: undefined,
          },
          serviceId: 1,
        },
      });
      client.handleMessage({
        callCreate: {
          callId: 1,
          result: 0,
          serviceId: 1,
        },
      });
      // encode test data
      client.handleMessage({
        callEvent: {
          callId: 1,
          serviceId: 1,
          event: 'data',
          binData: encodedResponseData,
        },
      });
      call.off('data');
      throwOnData = true;
      client.handleMessage({
        callEvent: {
          callId: 1,
          serviceId: 1,
          event: 'data',
          binData: encodedResponseData,
        },
      });
      call.on('end', () => {
        done();
      });
      client.handleMessage({
        callEnded: {
          callId: 1,
          serviceId: 1,
        },
      });
    });
  });

  it('should start a rpc call correctly', (done) => {
    let servicePromise: Promise<IServiceHandle> =
      (<any>lookupTree.lookup('mock.Greeter'))('localhost:3000');
    let serviceCreateMsg = recvQueue[0];
    expect(serviceCreateMsg.serviceCreate.serviceId).toBe(1);
    client.handleMessage({
      serviceCreate: {
        result: 0,
        serviceId: serviceCreateMsg.serviceCreate.serviceId,
      },
    });
    recvQueue.length = 0;
    let resultAsserted = false;
    servicePromise.then((mockService) => {
      expect(mockService).not.toBe(null);
      mockService['sayHello']({name: 'test'}, (err: any, response: ProtoBuf.Message) => {
        expect(response.asJSON()).toEqual({message: 'hello'});
        resultAsserted = true;
      });
      expect(recvQueue.length).toBe(1);
      let msg: any = recvQueue[0];
      recvQueue.length = 0;
      msg.callCreate.info.binArgument = !!msg.callCreate.info.binArgument;
      expect(msg).toEqual({
        callCreate: {
          callId: 1,
          info: {
            methodId: 'SayHello',
            binArgument: true,
          },
          serviceId: 1,
        },
      });
      client.handleMessage({
        callCreate: {
          callId: 1,
          result: 0,
          serviceId: 1,
        },
      });
      client.handleMessage({
        callEvent: {
          callId: 1,
          serviceId: 1,
          event: 'data',
          binData: encodedData,
        },
      });
      client.handleMessage({
        callEnded: {
          callId: 1,
          serviceId: 1,
        },
      });
      expect(resultAsserted).toBe(true);
      done();
    });
  });

  it('should cancel all calls when calling reset', (done) => {
    let servicePromise: Promise<IServiceHandle> =
      (<any>lookupTree.lookup('mock.Greeter'))('localhost:3000');
    client.handleMessage({
      serviceCreate: {
        result: 0,
        serviceId: 1,
      },
    });
    servicePromise.then((mockService) => {
      expect(mockService).not.toBe(null);
      mockService['sayHelloBidiStream']();
      client.handleMessage({
        callCreate: {
          callId: 1,
          result: 0,
          serviceId: 1,
        },
      });
      client.handleMessage({
        callEvent: {
          callId: 1,
          serviceId: 1,
          event: 'data',
          binData: encodedData,
        },
      });
      recvQueue.length = 0;
      client.reset();
      expect(recvQueue).toEqual([{
        callEnd: {
          callId: 1,
          serviceId: 1,
        },
      }, {
        serviceRelease: {
          serviceId: 1,
        },
      }]);
      done();
    });
  });

  it('should handle a create error properly', (done) => {
    let servicePromise: Promise<IServiceHandle> =
      (<any>lookupTree.lookup('mock.Greeter'))('localhost:3000');
    client.handleMessage({
      serviceCreate: {
        result: 0,
        serviceId: 1,
      },
    });
    recvQueue.length = 0;
    servicePromise.then((mockService) => {
      expect(mockService).not.toBe(null);
      mockService['sayHello']({name: 'test'}, (err: any, response: any) => {
        expect(response).toBe(null);
        expect(err).toBe('Error on server side.');
        done();
      });
      client.handleMessage({
        callCreate: {
          callId: 1,
          serviceId: 1,
          result: 2,
          errorDetails: 'Error on server side.',
        },
      });
    });
  });
});
