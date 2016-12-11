import {
  Client,
  Server,
  IGBClientMessage,
  IGBServerMessage,
  IServiceHandle,
} from './index';
import { buildTree, MockServer } from './mock';
import * as ProtoBuf from 'protobufjs';

let grpc = require('grpc');
let mockProto = grpc.loadObject(buildTree());
let localAddress = '127.0.0.1:50235';

describe('e2e', () => {
  let grpcServer: any;
  let mockServer: MockServer;

  let gbClient: Client;
  let gbServer: Server;

  let gbClientService: IServiceHandle;
  let gbTree: ProtoBuf.Root;

  beforeEach((done) => {
    grpcServer = new grpc.Server();
    mockServer = new MockServer();

    grpcServer.addProtoService((<any>mockProto.lookup('mock.Greeter')).service, mockServer);
    grpcServer.bind(localAddress, grpc.ServerCredentials.createInsecure());
    grpcServer.start();

    gbClient = new Client(buildTree(), (msg: IGBClientMessage) => {
      gbServer.handleMessage(msg);
    });
    gbServer = new Server(buildTree(), (msg: IGBServerMessage) => {
      gbClient.handleMessage(msg);
    }, require('grpc'));

    gbTree = gbClient.root;
    let svcPromise: Promise<IServiceHandle> =
      (<any>gbTree.lookup('mock.Greeter'))(localAddress);
    svcPromise.then((svc) => {
      gbClientService = svc;
      done();
    }, (err) => {
      throw err;
    });
  });

  afterEach((done) => {
    gbClientService.end();
    gbClient.reset();
    gbServer.dispose();
    grpcServer.forceShutdown();
    mockServer = grpcServer = null;
    setTimeout(() => {
      done();
    }, 100);
  });

  it('should make a non-streaming call properly', (done) => {
    mockServer.callReceived.subscribe((call: string) => {
      expect(call).toBe('sayHello');
    });
    gbClientService['sayHello']({name: 'kappa'}, (err: any, res: any) => {
      if (err) {
        throw err;
      }
      done();
    });
  }, 5000);

  it('should make a client-side streaming call properly', (done) => {
    mockServer.callReceived.subscribe((call: string) => {
      expect(call).toBe('sayHelloClientStream');
    });
    let call = gbClientService['sayHelloClientStream']((err: any, res: any) => {
      if (err) {
        throw err;
      }
      done();
    });
    call.write({name: 'FailFish'});
    call.end();
  }, 5000);

  it('should make a bidirectional streaming call properly', (done) => {
    mockServer.callReceived.subscribe((call: string) => {
      expect(call).toBe('sayHelloBidiStream');
    });
    let call = gbClientService['sayHelloBidiStream']();
    call.on('data', (data) => {
      // buggy expect
      expect(data.asJSON()).toEqual({message: 'FailFish'});
    });
    call.on('error', done);
    call.on('end', () => {
      done();
    });
    call.write({name: 'FailFish'});
    call.end();
  }, 5000);

  it('should make a server-side streaming call properly', (done) => {
    mockServer.callReceived.subscribe((call: string) => {
      expect(call).toBe('sayHelloServerStream');
    });
    let call = gbClientService['sayHelloServerStream']({name: 'FailFish'});
    call.on('data', (data) => {
      expect(data.asJSON()).toEqual({message: 'Hello'});
    });
    call.on('error', (err) => {
      throw err;
    });
    call.on('end', () => {
      done();
    });
  }, 5000);
});
