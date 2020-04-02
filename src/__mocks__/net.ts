import { EventEmitter } from 'events';
import { NetConnectOpts } from 'net';

const net = jest.genMockFromModule('net') as any;

class MockTcpSocket extends EventEmitter {
    constructor() {
        super();

        setTimeout(() => {
            this.emit('connect');
            this.emit('data', 'EXTPLANE');
            this.emit('data', 'uf sim/time/framerate_period 0.02');
        });
    }

    write = jest.fn((data: Buffer) => {
        this.emit('write', data);
    });

    end() {
        this.emit('end');
    }
}

net.Socket = MockTcpSocket;
net.connect = (options: NetConnectOpts) => new MockTcpSocket();

module.exports = net;
