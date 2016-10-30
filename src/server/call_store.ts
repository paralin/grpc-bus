import { Service } from './service';
import { Call } from './call';
import {
  IGBServerMessage,
  IGBCreateCall,
} from '../proto';

// Store of all active calls for a client service.
export class CallStore {
  private calls: { [id: number]: Call } = {};

  public constructor(private service: Service,
                     private clientId: number,
                     private send: (msg: IGBServerMessage) => void) {
  }

  public initCall(msg: IGBCreateCall): Call {
    let call = new Call(this.service, msg.call_id, msg.info, this.send);
    call.initCall();
    this.calls[msg.call_id] = call;
    return call;
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
