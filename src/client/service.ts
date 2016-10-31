import {
  IGBClientMessage,
  IGBServiceInfo,
  IGBCreateCallResult,
  IGBCallEnded,
  IGBCallEvent,
  IGBCreateServiceResult,
} from '../proto';
import {
  Subject,
} from 'rxjs/Subject';
import { Call, ICallHandle } from './call';

export interface IServicePromise {
  resolve: (handle: IServiceHandle) => void;
  reject: (error?: any) => void;
}

export interface IServiceHandle {
  // Call when done using this service.
  end(): void;

  // All the available stub calls
  [id: string]: (argument?: any,
                 callback?: (error?: any, response?: any) => void)
                 => ICallHandle | void;
}

export class Service {
  public disposed: Subject<Service> = new Subject<Service>();
  public handle: IServiceHandle;
  private serviceMeta: any;

  private calls: { [id: number]: Call } = {};
  private callIdCounter: number = 1;

  constructor(private protoTree: any,
              private clientId: number,
              private info: IGBServiceInfo,
              private promise: IServicePromise,
              private send: (message: IGBClientMessage) => void) {
  }

  public initStub() {
    this.serviceMeta = this.protoTree.lookup(this.info.service_id);
    this.handle = {
      end: () => {
        this.end();
      },
    };
    if (!this.serviceMeta) {
      throw new Error('Cannot find identifier ' + this.info.service_id + '.');
    }
    if (this.serviceMeta.className !== 'Service') {
      throw new Error('Identifier '
                      + this.info.service_id
                      + ' is a '
                      + this.serviceMeta.className
                      + ' not a Service.');
    }
    for (let method of this.serviceMeta.children) {
      if (method.className !== 'Service.RPCMethod') {
        continue;
      }
      this.buildStubMethod(method);
    }
  }

  public handleCreateResponse(msg: IGBCreateServiceResult) {
    /* istanbul ignore next */
    if (!this.promise) {
      return;
    }

    if (msg.result === 0) {
      this.promise.resolve(this.handle);
      return;
    }

    if (msg.error_details) {
      this.promise.reject(msg.error_details);
    } else {
      this.promise.reject('Error ' + msg.result);
    }

    this.disposed.next(this);
  }

  public handleCallCreateResponse(msg: IGBCreateCallResult) {
    let call = this.calls[msg.call_id];
    /* istanbul ignore next */
    if (!call) {
      return;
    }
    call.handleCreateResponse(msg);
  }

  public handleCallEnded(msg: IGBCallEnded) {
    let call = this.calls[msg.call_id];
    /* istanbul ignore next */
    if (!call) {
      return;
    }
    call.handleEnded(msg);
  }

  public handleCallEvent(msg: IGBCallEvent) {
    let call = this.calls[msg.call_id];
    /* istanbul ignore next */
    if (!call) {
      return;
    }
    call.handleEvent(msg);
  }

  public end() {
    this.dispose();
  }

  public dispose() {
    for (let callId in this.calls) {
      /* istanbul ignore next */
      if (!this.calls.hasOwnProperty(callId)) {
        continue;
      }
      this.calls[callId].dispose();
    }
    this.calls = {};
    this.disposed.next(this);
  }

  private buildStubMethod(methodMeta: any) {
    // lowercase first letter
    let methodName = methodMeta.name.charAt(0).toLowerCase() + methodMeta.name.slice(1);
    this.handle[methodName] = (argument?: any,
                               callback?: (error?: any, response?: any) => void) => {
      if (typeof argument === 'function' && !callback) {
        callback = argument;
        argument = undefined;
      }
      return this.startCall(methodMeta, argument, callback);
    };
  }

  private startCall(methodMeta: any,
                    argument?: any,
                    callback?: (error?: any, response?: any) => void): ICallHandle {
    let callId = this.callIdCounter++;
    let args: string;
    if (argument) {
      args = JSON.stringify(argument);
    }
    let info = {
      method_id: methodMeta.name,
      arguments: args,
    };
    if (methodMeta.requestStream && argument) {
      throw new Error('Argument should not be specified for a request stream.');
    }
    if (!methodMeta.requestStream && !argument) {
      throw new Error('Argument must be specified for a non-streaming request.');
    }
    if (methodMeta.responseStream && callback) {
      throw new Error('Callback should not be specified for a response stream.');
    }
    if (!methodMeta.responseStream && !callback) {
      throw new Error('Callback should be specified for a non-streaming response.');
    }
    let call = new Call(callId, info, methodMeta, callback);
    this.calls[callId] = call;
    call.disposed.subscribe(() => {
      delete this.calls[callId];
    });
    this.send({
      call_create: {
        call_id: callId,
        info: info,
        service_id: this.clientId,
      },
    });
    return call;
  }
}
