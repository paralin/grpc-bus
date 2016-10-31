import { Service } from './service';
import { Call } from './call';
import {
  IGBServerMessage,
  IGBCreateCall,
  IGBCreateCallResult,
  IGBEndCall,
} from '../proto';

// Store of all active calls for a client service.
export class CallStore {
  private calls: { [id: number]: Call } = {};

  public constructor(private service: Service,
                     private clientId: number,
                     private send: (msg: IGBServerMessage) => void) {
  }

  public initCall(msg: IGBCreateCall) {
    let result: IGBCreateCallResult = {
      call_id: msg.call_id,
      service_id: msg.service_id,
      result: 0,
    };
    if (typeof msg.call_id !== 'number' || this.calls[msg.call_id]) {
      // todo: fix enums
      result.result = 1;
      result.error_details = 'ID is not set or is already in use.';
    } else {
      try {
        let callId = msg.call_id;
        let call = new Call(this.service, msg.call_id, msg.info, this.send);
        call.initCall();
        this.calls[msg.call_id] = call;
        call.disposed.subscribe(() => {
          this.releaseLocalCall(callId);
        });
      } catch (e) {
        result.result = 2;
        result.error_details = e.toString();
      }
    }

    this.send({
      call_create: result,
    });
  }

  public handleCallEnd(msg: IGBEndCall) {
    let call = this.calls[msg.call_id];
    if (!call) {
      return;
    }
    call.dispose();
  }

  public releaseLocalCall(id: number) {
    delete this.calls[id];
  }

  // Kill all ongoing calls, cleanup.
  public dispose() {
    for (let callId in this.calls) {
      if (!this.calls.hasOwnProperty(callId)) {
        continue;
      }
      this.calls[callId].dispose();
    }
    this.service.clientRelease(this.clientId);
    this.calls = {};
  }
}
