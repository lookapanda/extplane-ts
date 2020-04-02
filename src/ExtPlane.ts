import { Socket, connect } from 'net';
import Debug from 'debug';
import { fromEvent, Observable, from, BehaviorSubject } from 'rxjs';
import {
    first,
    takeUntil,
    map,
    filter,
    mergeMap,
    flatMap,
    skipWhile,
} from 'rxjs/operators';

const debug = Debug('extplane');

export interface ExtPlaneOptions {
    host?: string;
    port?: number;
    debug?: boolean;
    broadcast?: boolean;
}

export class ExtPlane {
    private readonly host?: string;
    private readonly port?: number;
    private readonly debug?: boolean;
    private socket: Socket;
    private _isConnected = new BehaviorSubject<boolean>(false);
    private _isReady = new BehaviorSubject<boolean>(false);
    private subscriptions: string[] = [];
    private data$: Observable<[string, any]>;

    constructor(options: ExtPlaneOptions = {}) {
        this.host = options?.host || '127.0.0.1';
        this.port = options?.port || 51000;
        this.debug = options?.debug;
    }

    /**
     * Starts listening for one or more dataRefs
     * @param dataRef string | string[]
     * @param accuracy number optional
     */
    observe(dataRef: string, accuracy?: number): Observable<[string, any]>;
    observe(
        dataRef: string[] | Array<string | [string, number]>
    ): Observable<[string, any]>;
    observe(
        dataRef: string | string[] | Array<string | [string, number]>,
        accuracy?: number
    ) {
        if (!this.data$) {
            this.data$ = this.getObservable();
        }

        if (Array.isArray(dataRef)) {
            dataRef.forEach((dref: string | [string, number]) => {
                if (Array.isArray(dref)) {
                    this.subscribe(dref[0], dref[1]);
                    this.subscriptions = [...this.subscriptions, dref[0]];
                    return;
                }
                this.subscribe(dref);
                this.subscriptions = [...this.subscriptions, dref];
            });
        } else {
            this.subscribe(dataRef, accuracy);
            this.subscriptions = [...this.subscriptions, dataRef];
        }

        return this.data$;
    }

    /**
     * Deregisters the given dataRef or dataRefs
     * @param dataRef string | string[]
     */
    unobserve(dataRef: string | string[]) {
        if (Array.isArray(dataRef)) {
            dataRef.forEach(dref => {
                this.unsubscribe(dref);
            });
            this.subscriptions = this.subscriptions.filter(
                sub => !dataRef.includes(sub)
            );
        } else {
            this.unsubscribe(dataRef);
            this.subscriptions = this.subscriptions.filter(
                sub => sub !== dataRef
            );
        }

        if (this.subscriptions.length === 0) {
            this.disconnect();
        }
    }

    /**
     * Creates a new connection and returns ExtPlane
     */
    connect() {
        if (this.socket) {
            this.disconnect();
        }

        this._isConnected = new BehaviorSubject<boolean>(false);
        this._isReady = new BehaviorSubject<boolean>(false);
        this.socket = connect({
            host: this.host,
            port: this.port,
        });

        fromEvent(this.socket, 'connect')
            .pipe(first())
            .subscribe({
                complete: () => {
                    this._isConnected.next(true);
                },
            });

        fromEvent(this.socket, 'end')
            .pipe(first())
            .subscribe({
                complete: () => {
                    this.disconnect(true);
                },
            });

        fromEvent(this.socket, 'error')
            .pipe(first())
            .subscribe({
                next: (error: Error) => {
                    this.disconnect(true);
                    throw error;
                },
            });

        if (this.debug) {
            this.log(`Connected to ${this.host}:${this.port}`);
        }

        return this;
    }

    /**
     * Disconnects the client
     */
    disconnect(fromSocket?: boolean) {
        if (!fromSocket) {
            this.socketWrite('disconnect');
            this.socket.end();
        }
        this.socket = undefined;
        this.subscriptions = [];
        this._isConnected.complete();
        this._isReady.complete();
    }

    /**
     * How often ExtPlane should update ist data from X-Plane in milliseconds
     * @default 333
     * @param interval number
     */
    interval(interval: number) {
        if (typeof interval !== 'number') {
            throw new Error(
                `Invalid type '${typeof interval}' of argument 'interval'!`
            );
        }
        this.socketWrite(`extplane-set update_interval ${interval / 1000}`);

        return this;
    }

    private getObservable() {
        if (!this.socket) {
            throw new Error('You need to connect first!');
        }

        const end$ = fromEvent(this.socket, 'end').pipe(first());
        const data$ = fromEvent(this.socket, 'data').pipe(
            map((data: any) => {
                const dataStr = data.toString();
                if (dataStr.includes('EXTPLANE')) {
                    this._isReady.next(true);
                    return;
                }

                const commands = dataStr.trim().split('\n');

                const map = commands.map((command: string) => {
                    const params = command.split(' ');

                    if (params[0][0] !== 'u') {
                        return;
                    }

                    const ref = params[1];

                    if (!this.subscriptions.includes(ref)) {
                        return;
                    }
                    const type = params[0].substring(1);
                    const value = this.parseValue(type, params[2]);

                    return [ref, value];
                });

                return map;
            }),
            takeUntil(end$)
        );

        return from<Observable<[string, any]>>(data$).pipe(
            mergeMap(value => (value ? value : [])),
            filter(a => a !== true || !Array.isArray(a))
        );
    }

    get connected() {
        return new Promise(resolve => {
            this._isConnected.subscribe({
                next: () => resolve(true),
                complete: () => resolve(false),
            });
        });
    }

    get ready() {
        return new Promise(resolve => {
            this._isReady.subscribe({
                next: () => resolve(true),
                complete: () => resolve(false),
            });
        });
    }

    private socketWrite(value: string) {
        if (!this.socket) {
            this.connect();
        }
        if (this.debug) {
            this.log('Writing to Socket:', value);
        }
        this.socket.write(`${value}\r\n`);
    }

    private subscribe = (dataRef: string, accuracy?: number) => {
        this.socketWrite(
            `sub ${dataRef}${
                typeof accuracy !== 'undefined' ? ` ${accuracy}` : ''
            }`
        );
    };

    private unsubscribe = (dataRef: string) => {
        this.socketWrite(`unsub ${dataRef}`);
    };

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
