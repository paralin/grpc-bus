import { Subject } from 'rxjs/Subject';
import {
  IHelloRequest,
} from './interfaces';

export class MockServer {
  public callReceived: Subject<string> = new Subject<string>();

  public sayHello(request: IHelloRequest, callback: any) {
    this.callReceived.next('sayHello');
    callback(null, {message: 'Hello'});
  }

  public sayHelloClientStream(call: any, callback: any) {
    call.on('data', (data: any) => {
      this.callReceived.next('sayHelloClientStream');
    });
    call.on('end', () => {
      callback(null, {message: 'Hello'});
    });
  }

  public sayHelloServerStream(call: any) {
    this.callReceived.next('sayHelloServerStream');
    call.write({
      message: 'Hello',
    });
    call.end();
  }

  public sayHelloBidiStream(call: any) {
    this.callReceived.next('sayHelloBidiStream');
    call.on('data', (data: any) => {
      call.write({message: data.name});
    });
    call.on('end', () => {
      call.end();
    });
  }
}
