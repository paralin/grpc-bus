import { Subject } from 'rxjs/Subject';
import { Service } from './service';
import {
  IGBCallInfo,
  IGBCallEvent,
  IGBServerMessage,
} from '../proto';

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
    if (!this.callInfo || !this.callInfo.method_id) {
      throw new Error('Call info, method ID must be given');
    }
    let args: any = this.callInfo.bin_argument;
    let rpcMeta = this.service.lookupMethod(this.callInfo.method_id);
    if (!rpcMeta) {
      throw new Error('Method ' + this.callInfo.method_id + ' not found.');
    }
    this.rpcMeta = rpcMeta;
    if (rpcMeta.className !== 'Service.RPCMethod') {
      throw new Error('Method ' +
                      this.callInfo.method_id +
                      ' is a ' +
                      rpcMeta.className +
                      ' not a Service.RPCMethod');
    }
    let camelMethod = _.camelCase(rpcMeta.name);
    if (!this.service.stub[camelMethod] || typeof this.service.stub[camelMethod] !== 'function') {
      throw new Error('Method ' + camelMethod + ' not defined by grpc.');
    }
    if (rpcMeta.requestStream && !rpcMeta.responseStream) {
      this.streamHandle = this.service.stub[camelMethod]((error: any, response: any) => {
        this.handleCallCallback(error, response);
      });
    } else if (rpcMeta.requestStream && rpcMeta.responseStream) {
      this.streamHandle = this.service.stub[camelMethod]();
      this.setCallHandlers(this.streamHandle);
    } else if (!rpcMeta.requestStream && rpcMeta.responseStream) {
      this.streamHandle = this.service.stub[camelMethod](args);
      this.setCallHandlers(this.streamHandle);
    } else if (!rpcMeta.requestStream && !rpcMeta.responseStream) {
      if (!args) {
        throw new Error('Method ' +
                        this.callInfo.method_id +
                        ' requires an argument object of type ' +
                        rpcMeta.requestName + '.');
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
      call_ended: {
        call_id: this.clientId,
        service_id: this.clientServiceId,
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
      if (eventId === 'error') {
        // An error's message is not enumerable, so doesn't get included
        // by JSON.stringify(). Copy error info to a new, serializable object
        let enumerableError: any = {};
        Object.getOwnPropertyNames(data).forEach(key => {
          enumerableError[key] = data[key];
        });
        data = enumerableError;
      }
      let callEvent: IGBCallEvent = {
        service_id: this.clientServiceId,
        call_id: this.clientId,
        json_data: !isBin ? JSON.stringify(data) : undefined,
        bin_data: isBin ? data : undefined,
        event: eventId,
      };
      if (!callEvent.json_data) {
        delete callEvent.json_data;
      }
      if (!callEvent.bin_data) {
        delete callEvent.bin_data;
      }
      this.send({
        call_event: callEvent,
      });
    };
  }
}
