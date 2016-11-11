import {
  Client,
  Server,
  IGBClientMessage,
  IGBServerMessage,
  IServiceHandle,
  IGRPCTree,
} from './index';
import { buildTree, MockServer } from './mock';

let grpc = require('grpc');
let mockProtoDefs = buildTree();
let mockProto = grpc.loadObject(mockProtoDefs.lookup(''));

describe('e2e', () => {
  let grpcServer: any;
  let mockServer: MockServer;

  let gbClient: Client;
  let gbServer: Server;

  let gbClientService: IServiceHandle;
  let gbTree: IGRPCTree;

  beforeEach((done) => {
    grpcServer = new grpc.Server();
    mockServer = new MockServer();
    grpcServer.addProtoService(mockProto.mock.Greeter.service, mockServer);
    grpcServer.bind('0.0.0.0:50053', grpc.ServerCredentials.createInsecure());
    grpcServer.start();

    gbClient = new Client(mockProtoDefs, (msg: IGBClientMessage) => {
      gbServer.handleMessage(msg);
    });
    gbServer = new Server(mockProtoDefs, (msg: IGBServerMessage) => {
      gbClient.handleMessage(msg);
    }, require('grpc'));

    gbTree = <IGRPCTree>gbClient.buildTree();
    let svcPromise: Promise<IServiceHandle> = gbTree['mock']['Greeter']('localhost:50053');
    svcPromise.then((svc) => {
      gbClientService = svc;
      done();
    }, done);
  });

  afterEach(() => {
    gbClientService.end();
    grpcServer.forceShutdown();
    mockServer = grpcServer = null;
    gbClient.reset();
    gbServer.dispose();
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
      expect(data.toRaw()).toEqual({message: 'FailFish'});
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
      expect(data.toRaw()).toEqual({message: 'Hello'});
    });
    call.on('error', (err) => {
      throw err;
    });
    call.on('end', () => {
      done();
    });
  }, 5000);
});
