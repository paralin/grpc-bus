import { Subject } from 'rxjs/Subject';
import { Service } from './service';
import {
  IGBCallInfo,
  IGBCallEvent,
  IGBServerMessage,
} from '../proto';

import * as ProtoBuf from 'protobufjs';
import * as _ from 'lodash';

// An ongoing call against a service.
export class Call {
  // Subject called when disposed.
  public disposed: Subject<Call> = new Subject<Call>();
  // Handle returned by a client-side streaming call.
  private streamHandle: any;
  private rpcMeta: any;

  public constructor(private service: Service,
                     private clientId: number,
                     private clientServiceId: number,
                     private callInfo: IGBCallInfo,
                     private send: (msg: IGBServerMessage) => void) {
  }

  public initCall() {
    if (!this.callInfo || !this.callInfo.methodId) {
      throw new Error('Call info, method ID must be given');
    }
    let args: any = this.callInfo.binArgument;
    let rpcMeta: ProtoBuf.Method =
      <any>this.service.serviceMeta.lookup(this.callInfo.methodId);
    if (!rpcMeta) {
      throw new Error('Method ' + this.callInfo.methodId + ' not found.');
    }
    this.rpcMeta = rpcMeta;
    let camelMethod = _.camelCase(rpcMeta.name);
    if (!this.service.stub[camelMethod] || typeof this.service.stub[camelMethod] !== 'function') {
      throw new Error('Method ' + camelMethod + ' not defined by grpc.');
    }
    if (rpcMeta.requestStream && !rpcMeta.responseStream) {
      this.streamHandle = this.service.stub[camelMethod]((error: any, response: any) => {
        this.handleCallCallback(error, response);
      });
      // If they sent some args (shouldn't happen usually) send it off anyway
      if (args) {
        this.streamHandle.write(args);
      }
    } else if (rpcMeta.requestStream && rpcMeta.responseStream) {
      this.streamHandle = this.service.stub[camelMethod]();
      this.setCallHandlers(this.streamHandle);
    } else if (!rpcMeta.requestStream && rpcMeta.responseStream) {
      this.streamHandle = this.service.stub[camelMethod](args);
      this.setCallHandlers(this.streamHandle);
    } else if (!rpcMeta.requestStream && !rpcMeta.responseStream) {
      if (!args) {
        throw new Error('Method ' +
                        this.callInfo.methodId +
                        ' requires an argument object of type ' +
                        rpcMeta.resolvedRequestType.name + '.');
      }
      this.service.stub[camelMethod](args, (error: any, response: any) => {
        this.handleCallCallback(error, response);
      });
    }
  }

  public write(msg: any) {
    if (!this.rpcMeta.requestStream ||
        !this.streamHandle ||
        typeof this.streamHandle['write'] !== 'function') {
      return;
    }
    this.streamHandle.write(msg);
  }

  public sendEnd() {
    if (!this.rpcMeta.requestStream ||
        !this.streamHandle ||
        typeof this.streamHandle['end'] !== 'function') {
      return;
    }
    this.streamHandle.end();
  }

  public dispose() {
    this.send({
      callEnded: {
        callId: this.clientId,
        serviceId: this.clientServiceId,
      },
    });
    if (this.streamHandle && typeof this.streamHandle['end'] === 'function') {
      this.streamHandle.end();
      this.streamHandle = null;
    }
    this.disposed.next(this);
  }

  private handleCallCallback(error: any, response: any) {
    if (error) {
      this.callEventHandler('error')(error);
    }
    if (response) {
      this.callEventHandler('data', true)(response);
    }
    this.dispose();
  }

  private setCallHandlers(streamHandle: any) {
    let dataHandler = this.callEventHandler('data', true);
    this.streamHandle.on('data', (data: any) => {
      dataHandler(data);
    });
    this.streamHandle.on('status', this.callEventHandler('status'));
    this.streamHandle.on('error', this.callEventHandler('error'));
    this.streamHandle.on('end', this.callEventHandler('end'));
  }

  private callEventHandler(eventId: string, isBin: boolean = false) {
    return (data: any) => {
      let callEvent: IGBCallEvent = {
        serviceId: this.clientServiceId,
        callId: this.clientId,
        jsonData: !isBin ? JSON.stringify(data) : undefined,
        binData: isBin ? data : undefined,
        event: eventId,
      };
      if (!callEvent.jsonData) {
        delete callEvent.jsonData;
      }
      if (!callEvent.binData) {
        delete callEvent.binData;
      }
      this.send({
        callEvent: callEvent,
      });
    };
  }
}
