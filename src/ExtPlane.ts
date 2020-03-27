import { EventEmitter } from 'events';
import { Socket, connect } from 'net';
import Debug from 'debug';

const debug = Debug('extplane');

export interface ExtPlaneOptions {
    host?: string;
    port?: number;
    debug?: boolean;
    broadcast?: boolean;
}

export class ExtPlane extends EventEmitter {
    private readonly host?: string;
    private readonly port?: number;
    private readonly debug?: boolean;
    private readonly broadcast?: boolean;
    private readonly socket: Socket;
    private _isConnected = false;

    constructor(options: ExtPlaneOptions = {}) {
        super();

        this.host = options?.host || '127.0.0.1';
        this.port = options?.port || 51000;
        this.debug = options?.debug;
        this.broadcast = options?.broadcast;

        this.socket = connect({
            host: this.host,
            port: this.port,
        });

        this.setupListeners();

        if (this.debug) {
            this.log(`Connected to ${this.host}:${this.port}`, 'bar');
        }
    }

    get isConnected() {
        return this._isConnected;
    }

    get client() {
        return {
            key: this.clientKey,
            cmd: this.clientCmd,
            begin: this.clientBegin,
            end: this.clientEnd,
            button: this.clientButton,
            release: this.clientRelease,
            set: this.clientSet,
            subscribe: this.clientSubscribe,
            unsubscribe: this.clientUnsubscribe,
            interval: this.clientInterval,
            disconnect: this.clientDisconnect,
        };
    }

    private socketWrite(value: string) {
        this.socket.write(`${value}\r\n`);
    }

    private clientKey = (keyId: string) => {
        this.socketWrite(`key${keyId}`);
    };

    private clientWriteCmd = (type: string, value: string) => {
        this.socketWrite(`cmd ${type} ${value}`);
    };

    private clientCmd = (cmd: string) => {
        this.clientWriteCmd('once', cmd);
    };

    private clientBegin = (cmd: string) => {
        this.clientWriteCmd('begin', cmd);
    };

    private clientEnd = (cmd: string) => {
        this.clientWriteCmd('end', cmd);
    };

    private clientButton = (buttonId: string) => {
        this.socketWrite(`but ${buttonId}`);
    };

    private clientRelease = (buttonId: string) => {
        this.socketWrite(`rel ${buttonId}`);
    };

    private clientSet = (dataRef: string, value: string) => {
        this.socketWrite(`set ${dataRef} ${value}`);
    };

    private clientSubscribe = (dataRef: string, accuracy?: number) => {
        this.socketWrite(
            `sub ${dataRef}${
                typeof accuracy !== 'undefined' ? ` ${accuracy}` : ''
            }`
        );
    };

    private clientUnsubscribe = (dataRef: string) => {
        this.socketWrite(`unsub ${dataRef}`);
    };

    private clientInterval = (value: number) => {
        this.socketWrite(`extplane-set update_interval ${value}`);
    };

    private clientDisconnect = () => {
        this.socketWrite('disconnect');
        this.socket.end();
    };

    private setupListeners() {
        const onSocketEnd = () => {
            this._isConnected = false;
            if (this.debug) {
                this.log('Disconnected from server');
            }
        };

        const onSocketError = (error: Error) => {
            if (this.debug) {
                this.log('An error occurred:', error);
            }
        };

        const onSocketData = (data: any) => {
            this.emit('data', data);
        };

        this.socket.on('end', onSocketEnd);
        this.socket.on('error', onSocketError);
        this.socket.on('data', onSocketData);

        this.on('loaded', this.onLoaded);
        this.on('data', this.onData);
        this.on('parse', this.onParse);
    }

    private onLoaded = () => {
        this._isConnected = true;
        if (this.debug) {
            this.log('ExtPlane is ready!');
        }
    };

    private onData = (data: any) => {
        const dataStr = data.toString();
        if (dataStr.includes('EXTPLANE')) {
            this.emit('loaded');
            return;
        }

        this.emit('parse', dataStr);
    };

    private onParse = (data: string) => {
        const commands = data.trim().split('\n');

        commands.forEach(async command => {
            try {
                await this.parseDataRef(command);
            } catch (e) {
                if (this.debug) {
                    this.log(e);
                }
            }
        });
    };

    private async parseDataRef(dataRef: string) {
        const params = dataRef.split(' ');

        if (params[0][0] !== 'u') {
            return Promise.reject();
        }

        const ref = params[1];
        const type = params[0].substring(1);
        const value = this.parseValue(type, params[2]);

        if (!this.broadcast) {
            this.emit(ref, ref, value);
        } else {
            this.emit('data-ref', ref, value);
        }

        return Promise.resolve();
    }

    private parseValue(type: string, value: string) {
        switch (type) {
            case 'i':
                return parseInt(value, 10);
            case 'f':
                return parseFloat(value);
            case 'ia':
                return JSON.parse(value);
            case 'fa':
                return JSON.parse(value);
            case 'b':
                return Buffer.from(value, 'base64').toString('utf-8');
            default:
                return value;
        }
    }

    private log(...args: any[]) {
        debug('%O', ...args);
    }
}
