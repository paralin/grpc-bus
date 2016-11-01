import {
  IGBCallInfo,
  IGBCreateCallResult,
  IGBCallEvent,
  IGBCallEnded,
  IGBClientMessage,
} from '../proto';
import { Subject } from 'rxjs/Subject';

export interface ICallHandle {
  // Send a message on a streaming call
  write?(msg: any): void;

  // Register a callback handler on a streaming call.
  on?(eventId: string, callback: (arg: any) => void): void;

  // Remove all handlers for an event on a streaming call.
  off?(eventId: string): void;

  // Call to send the 'end' on a client-side streaming call.
  end?(): void;

  // Call to terminate this call on a streaming call.
  terminate?(): void;
}

export class Call implements ICallHandle {
  public disposed: Subject<Call> = new Subject<Call>();
  private eventHandlers: { [id: string]: ((arg: any) => void)[] } = {};
  private endEmitted: boolean = false;

  constructor(public clientId: number,
              public clientServiceId: number,
              private info: IGBCallInfo,
              private callMeta: any,
              private callback: (error?: any, response?: any) => void,
              private send: (message: IGBClientMessage) => void) {
  }

  public on(eventId: string, callback: (arg: any) => void): void {
    let handlers = this.eventHandlers[eventId];
    if (!handlers) {
      handlers = [];
      this.eventHandlers[eventId] = handlers;
    }
    handlers.push(callback);
  }

  public off(eventId: string) {
    delete this.eventHandlers[eventId];
  }

  public handleCreateResponse(msg: IGBCreateCallResult) {
    if (msg.result === 0) {
      return;
    }
    if (msg.error_details) {
      this.terminateWithError(msg.error_details);
    } else {
      this.terminateWithError('Error ' + msg.result);
    }
  }

  public handleEnded(msg: IGBCallEnded) {
    this.dispose();
  }

  public handleEvent(msg: IGBCallEvent) {
    let data: any;
    if (msg.data && typeof msg.data === 'string') {
      data = JSON.parse(msg.data);
    }
    this.emit(msg.event, data);
    if (this.callback) {
      if (msg.event === 'error') {
        this.terminateWithError(data);
      } else if (msg.event === 'data') {
        this.terminateWithData(data);
      }
    }
  }

  public end() {
    this.send({
      call_send: {
        call_id: this.clientId,
        service_id: this.clientServiceId,
        is_end: true,
      },
    });
  }

  public terminate() {
    this.send({
      call_end: {
        call_id: this.clientId,
        service_id: this.clientServiceId,
      },
    });
    this.dispose();
  }

  public write(msg: any) {
    if (!this.callMeta.requestStream) {
      throw new Error('Cannot write to a non-streaming request.');
    }
    if (typeof msg !== 'object') {
      throw new Error('Can only write objects to streaming requests.');
    }
    this.send({
      call_send: {
        call_id: this.clientId,
        service_id: this.clientServiceId,
        body: JSON.stringify(msg),
      },
    });
  }

  public dispose() {
    if (!this.endEmitted) {
      this.emit('end', null);
    }
    this.disposed.next(this);
  }

  private terminateWithError(error: any) {
    if (this.callback) {
      this.callback(error, null);
    } else {
      this.emit('error', error);
    }
    this.dispose();
  }

  private terminateWithData(data: any) {
    this.callback(null, data);
    this.dispose();
  }

  private emit(eventId: string, arg: any) {
    if (eventId === 'end') {
      this.endEmitted = true;
    }

    let handlers = this.eventHandlers[eventId];
    if (!handlers) {
      return;
    }
    for (let handler of handlers) {
      handler(arg);
    }
  }
}
