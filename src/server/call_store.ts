import { Service } from './service';
import { Call } from './call';
import {
  IGBServerMessage,
  IGBCreateCall,
  IGBCreateCallResult,
  IGBSendCall,
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
      callId: msg.callId,
      serviceId: msg.serviceId,
      result: 0,
    };
    if (typeof msg.callId !== 'number' || this.calls[msg.callId]) {
      // todo: fix enums
      result.result = 1;
      result.errorDetails = 'ID is not set or is already in use.';
    } else {
      try {
        let callId = msg.callId;
        let call = new Call(this.service, msg.callId, msg.serviceId, msg.info, this.send);
        call.initCall();
        this.calls[msg.callId] = call;
        call.disposed.subscribe(() => {
          this.releaseLocalCall(callId);
        });
      } catch (e) {
        result.result = 2;
        result.errorDetails = e.toString();
      }
    }

    this.send({
      callCreate: result,
    });
  }

  public handleCallEnd(msg: IGBEndCall) {
    let call = this.calls[msg.callId];
    if (!call) {
      return;
    }
    call.dispose();
  }

  public handleCallWrite(msg: IGBSendCall) {
    let call = this.calls[msg.callId];
    if (!call) {
      return;
    }
    if (msg.isEnd) {
      call.sendEnd();
    } else {
      call.write(msg.binData);
    }
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
