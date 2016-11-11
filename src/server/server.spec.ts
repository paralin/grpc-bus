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
    service_id: 'mock.Greeter',
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
    let serviceTree = require('grpc').loadObject(lookupTree).build();
    encodedData = serviceTree.mock.HelloRequest.encode({'name': 'hello'}).toBase64();
    encodedResponseData = serviceTree.mock.HelloReply.encode({message: 'hello'}).toBase64();
  });

  it('should create a service correctly', () => {
    server.handleMessage({service_create: {
      service_id: 1,
      service_info: serviceInfo,
    }});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.service_create).not.toBe(null);
    if (msg.service_create.error_details) {
      throw new Error(msg.service_create.error_details);
    }
    expect(msg.service_create.result).toBe(0);

    expect(recvQueue.length).toBe(0);
    server.handleMessage({service_release: {
      service_id: 1,
    }});
    expect(recvQueue.length).toBe(1);
    msg = recvQueue.splice(0, 1)[0];
    expect(msg.service_release).not.toBe(null);
    expect(msg.service_release.service_id).toBe(1);
  });

  it('should respond with gratuitous releases', () => {
    server.handleMessage({service_release: {
      service_id: 50,
    }});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.service_release).not.toBe(null);
    expect(msg.service_release.service_id).toBe(50);
  });

  it('should filter empty service ids', () => {
    server.handleMessage({service_create: {}});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.service_create).not.toBe(null);
    expect(msg.service_create.error_details).toBe('ID is not set or is already in use.');
  });

  it('should filter invalid service ids', () => {
    server.handleMessage({service_create: {
      service_id: 1,
      service_info: {
        endpoint: 'localhost:3000',
        service_id: 'mock',
      },
    }});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.service_create).not.toBe(null);
    expect(msg.service_create.error_details).toBe('TypeError: mock is a Namespace not a Service.');
  });

  it('should filter unknown service ids', () => {
    server.handleMessage({service_create: {
      service_id: 1,
      service_info: {
        endpoint: 'localhost:3000',
        service_id: 'mock.wow.NotExist',
      },
    }});
    expect(recvQueue.length).toBe(1);
    let msg = recvQueue.splice(0, 1)[0];
    expect(msg.service_create).not.toBe(null);
    expect(msg.service_create.error_details).toBe('TypeError: mock.wow.NotExist was not found.');
  });

  it('should start a call correctly', () => {
    server.handleMessage({service_create: {
      service_id: 1,
      service_info: {
        endpoint: 'localhost:3000',
        service_id: 'mock.Greeter',
      },
    }});
    recvQueue.length = 0;
    server.handleMessage({
      call_create: {
        call_id: 1,
        service_id: 1,
        info: {
          method_id: 'SayHello',
          bin_argument: encodedData,
        },
      },
    });
    expect(recvQueue).toEqual([{
      call_create: {
        call_id: 1,
        service_id: 1,
        result: 0,
      },
    }]);
    recvQueue.length = 0;
  });

  it('should start a streaming call correctly', () => {
    server.handleMessage({service_create: {
      service_id: 1,
      service_info: {
        endpoint: 'localhost:3000',
        service_id: 'mock.Greeter',
      },
    }});
    recvQueue.length = 0;
    server.handleMessage({
      call_create: {
        call_id: 1,
        service_id: 1,
        info: {
          method_id: 'SayHelloBidiStream',
        },
      },
    });
    expect(recvQueue).toEqual([{
      call_create: {
        call_id: 1,
        service_id: 1,
        result: 0,
      },
    }]);
    recvQueue.length = 0;
    server.handleMessage({
      call_send: {
        call_id: 1,
        service_id: 1,
        bin_data: encodedData,
      },
    });
    expect(recvQueue.length).toBe(0);
  });

  it('should dispose properly', () => {
    server.handleMessage({service_create: {
      service_id: 1,
      service_info: {
        endpoint: 'localhost:3000',
        service_id: 'mock.Greeter',
      },
    }});
    server.handleMessage({
      call_create: {
        call_id: 1,
        info: {
          method_id: 'SayHelloBidiStream',
        },
        service_id: 1,
      },
    });
    recvQueue.length = 0;
    server.dispose();
    expect(recvQueue).toEqual([{
      call_ended: {
        call_id: 1,
        service_id: 1,
      },
    }, {
      service_release: {
        service_id: 1,
      },
    }]);
  });
});
