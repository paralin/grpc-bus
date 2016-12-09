import { Server } from './server';
import {
  IGBServiceInfo,
  IGBServerMessage,
} from '../proto';
import {
  buildTree,
} from '../mock';

describe('Server', () => {
  let server: Server;
  let serviceInfo: IGBServiceInfo = {
    endpoint: 'localhost:5000',
    serviceId: 'mock.Greeter',
  };
  let recvQueue: IGBServerMessage[] = [];
  let lookupTree: any;
  // An encoded sample request
  let encodedData: any;
  // An encoded sample response
  let encodedResponseData: any;

  beforeEach(() => {
    lookupTree = buildTree();
    server = new Server(lookupTree, (msg: IGBServerMessage) => {
      recvQueue.push(msg);
    }, require('grpc'));
    recvQueue.length = 0;
    encodedData = lookupTree.lookup('mock.HelloRequest').encode({'name': 'hello'}).finish();
    encodedResponseData = lookupTree.lookup('mock.HelloReply').encode({message: 'hello'}).finish();
  });

  it('should create a service correctly', () => {
    server.handleMessage({serviceCreate: {
      serviceId: 1,
      serviceInfo: serviceInfo,
    }});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.serviceCreate).not.toBe(null);
    if (msg.serviceCreate.errorDetails) {
      throw new Error(msg.serviceCreate.errorDetails);
    }
    expect(msg.serviceCreate.result).toBe(0);

    expect(recvQueue.length).toBe(0);
    server.handleMessage({serviceRelease: {
      serviceId: 1,
    }});
    expect(recvQueue.length).toBe(1);
    msg = recvQueue.splice(0, 1)[0];
    expect(msg.serviceRelease).not.toBe(null);
    expect(msg.serviceRelease.serviceId).toBe(1);
  });

  it('should respond with gratuitous releases', () => {
    server.handleMessage({serviceRelease: {
      serviceId: 50,
    }});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.serviceRelease).not.toBe(null);
    expect(msg.serviceRelease.serviceId).toBe(50);
  });

  it('should filter empty service ids', () => {
    server.handleMessage({serviceCreate: {}});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.serviceCreate).not.toBe(null);
    expect(msg.serviceCreate.errorDetails).toBe('ID is not set or is already in use.');
  });

  it('should filter invalid service ids', () => {
    server.handleMessage({serviceCreate: {
      serviceId: 1,
      serviceInfo: {
        endpoint: 'localhost:3000',
        serviceId: 'mock',
      },
    }});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.serviceCreate).not.toBe(null);
    expect(msg.serviceCreate.errorDetails).toBe('TypeError: mock is not a Service.');
  });

  it('should filter unknown service ids', () => {
    server.handleMessage({serviceCreate: {
      serviceId: 1,
      serviceInfo: {
        endpoint: 'localhost:3000',
        serviceId: 'mock.wow.NotExist',
      },
    }});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.serviceCreate).not.toBe(null);
    expect(msg.serviceCreate.errorDetails).toBe('TypeError: mock.wow.NotExist was not found.');
  });

  it('should start a call correctly', () => {
    server.handleMessage({serviceCreate: {
      serviceId: 1,
      serviceInfo: {
        endpoint: 'localhost:3000',
        serviceId: 'mock.Greeter',
      },
    }});
    recvQueue.length = 0;
    server.handleMessage({
      callCreate: {
        callId: 1,
        serviceId: 1,
        info: {
          methodId: 'SayHello',
          binArgument: encodedData,
        },
      },
    });
    expect(recvQueue).toEqual([{
      callCreate: {
        callId: 1,
        serviceId: 1,
        result: 0,
      },
    }]);
    recvQueue.length = 0;
  });

  it('should start a streaming call correctly', () => {
    server.handleMessage({serviceCreate: {
      serviceId: 1,
      serviceInfo: {
        endpoint: 'localhost:3000',
        serviceId: 'mock.Greeter',
      },
    }});
    recvQueue.length = 0;
    server.handleMessage({
      callCreate: {
        callId: 1,
        serviceId: 1,
        info: {
          methodId: 'SayHelloBidiStream',
        },
      },
    });
    expect(recvQueue).toEqual([{
      callCreate: {
        callId: 1,
        serviceId: 1,
        result: 0,
      },
    }]);
    recvQueue.length = 0;
    server.handleMessage({
      callSend: {
        callId: 1,
        serviceId: 1,
        binData: encodedData,
      },
    });
    expect(recvQueue.length).toBe(0);
  });

  it('should dispose properly', () => {
    server.handleMessage({serviceCreate: {
      serviceId: 1,
      serviceInfo: {
        endpoint: 'localhost:3000',
        serviceId: 'mock.Greeter',
      },
    }});
    server.handleMessage({
      callCreate: {
        callId: 1,
        info: {
          methodId: 'SayHelloBidiStream',
        },
        serviceId: 1,
      },
    });
    recvQueue.length = 0;
    server.dispose();
    expect(recvQueue).toEqual([{
      callEnded: {
        callId: 1,
        serviceId: 1,
      },
    }, {
      serviceRelease: {
        serviceId: 1,
      },
    }]);
  });
});
