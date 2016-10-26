import { Service } from './store';
import {
  IGBServerMessage,
} from '../proto';

// Store of all active calls for a client service.
export class CallStore {
  public constructor(private service: Service,
                     private send: (msg: IGBServerMessage) => void) {
  }

  // Kill all ongoing calls, cleanup.
  public dispose() {
    //
  }
}
