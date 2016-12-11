import {
  IGBClientMessage,
  IGBServiceInfo,
  IGBCreateCallResult,
  IGBCallEnded,
  IGBCallEvent,
  IGBCreateServiceResult,
  IGBReleaseServiceResult,
  IGBCallInfo,
} from '../proto';
import {
  Subject,
} from 'rxjs/Subject';
import { Call, ICallHandle } from './call';
import * as ProtoBuf from 'protobufjs';

export interface IServicePromise {
  resolve: (handle: IServiceHandle) => void;
  reject: (error?: any) => void;
}

export interface IServiceHandle {
  // Call when done using this service.
  end(): ICallHandle;

  // All the available stub calls
  [id: string]: (argument?: any,
                 callback?: (error?: any, response?: any) => void)
                 => ICallHandle;
}

export class Service {
  public disposed: Subject<Service> = new Subject<Service>();
  public handle: IServiceHandle;

  private calls: { [id: number]: Call } = {};
  private callIdCounter: number = 1;
  private serverReleased: boolean = false;

  constructor(private serviceMeta: ProtoBuf.Service,
              private clientId: number,
              private info: IGBServiceInfo,
              private promise: IServicePromise,
              private send: (message: IGBClientMessage) => void) {
    serviceMeta.resolveAll();
  }

  public initStub() {
    this.handle = {
      end: () => {
        return this.end();
      },
    };
    for (let methodId in this.serviceMeta.methods) {
      if (!this.serviceMeta.methods.hasOwnProperty(methodId)) {
        continue;
      }
      this.buildStubMethod(this.serviceMeta.methods[methodId]);
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

    if (msg.errorDetails) {
      this.promise.reject(msg.errorDetails);
    } else {
      this.promise.reject('Error ' + msg.result);
    }

    this.disposed.next(this);
  }

  public handleCallCreateResponse(msg: IGBCreateCallResult) {
    let call = this.calls[msg.callId];
    /* istanbul ignore next */
    if (!call) {
      return;
    }
    call.handleCreateResponse(msg);
  }

  public handleCallEnded(msg: IGBCallEnded) {
    let call = this.calls[msg.callId];
    /* istanbul ignore next */
    if (!call) {
      return;
    }
    call.handleEnded(msg);
  }

  public handleCallEvent(msg: IGBCallEvent) {
    let call = this.calls[msg.callId];
    /* istanbul ignore next */
    if (!call) {
      return;
    }
    call.handleEvent(msg);
  }

  public handleServiceRelease(msg: IGBReleaseServiceResult) {
    this.serverReleased = true;
    this.end();
  }

  public end() {
    this.dispose();
    return this;
  }

  public dispose() {
    for (let callId in this.calls) {
      /* istanbul ignore next */
      if (!this.calls.hasOwnProperty(callId)) {
        continue;
      }
      this.calls[callId].terminate();
    }
    this.calls = {};
    if (!this.serverReleased) {
      this.send({
        serviceRelease: {
          serviceId: this.clientId,
        },
      });
    }
    this.disposed.next(this);
  }

  private buildStubMethod(methodMeta: ProtoBuf.Method) {
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

  private startCall(methodMeta: ProtoBuf.Method,
                    argument?: any,
                    callback?: (error?: any, response?: any) => void): ICallHandle {
    let callId = this.callIdCounter++;
    let args: any;
    if (argument) {
      let requestBuilder = methodMeta.resolvedRequestType;
      args = requestBuilder.encode(argument).finish();
    }
    let info: IGBCallInfo = {
      methodId: methodMeta.name,
      binArgument: args,
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
    let call = new Call(callId, this.clientId, info, methodMeta, callback, this.send);
    this.calls[callId] = call;
    call.disposed.subscribe(() => {
      delete this.calls[callId];
    });
    this.send({
      callCreate: {
        callId: callId,
        info: info,
        serviceId: this.clientId,
      },
    });
    return call;
  }
}
