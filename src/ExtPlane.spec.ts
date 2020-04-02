import { ExtPlane } from '../src';

jest.mock('net');

describe('ExtPlane', () => {
    let extPlane: ExtPlane;

    beforeEach(() => {
        jest.clearAllMocks();
        extPlane = new ExtPlane();
    });

    it('Connects to ExtPlane', async done => {
        extPlane.connect();
        const isConnected = await extPlane.connected;
        expect(isConnected).toBe(true);
        done();
    });

    it('Adds an observer', async done => {
        extPlane.connect();
        const observer$ = extPlane.observe(['sim/time/framerate_period']);
        // @ts-ignore ignore private fields for test
        expect(extPlane.subscriptions.length).toBe(1);
        expect(await extPlane.connected).toBe(true);
        observer$.subscribe({
            next: ([dataRef, value]) => {
                expect(typeof dataRef).toBe('string');
                expect(value).not.toBeFalsy();
                done();
            },
        });
    });

    it('Should throw an error if observer is added and connect has not been called yet', async done => {
        try {
            extPlane.observe(['sim/time/framerate_period']);
        } catch (e) {
            expect(extPlane.observe).toThrowError();
            done();
        }
    });

    it('Subscribes with accuracy', async done => {
        extPlane.connect();
        const observer$ = extPlane.observe('sim/time/framerate_period', 1);
        // @ts-ignore ignore private fields for test
        expect(extPlane.subscriptions.length).toBe(1);
        expect(await extPlane.connected).toBe(true);
        observer$.subscribe({
            next: ([dataRef, value]) => {
                expect(typeof dataRef).toBe('string');
                expect(value).not.toBeFalsy();
                done();
            },
        });
    });

    it('Subscribes with accuracy array', async done => {
        extPlane.connect();
        const observer$ = extPlane.observe([['sim/time/framerate_period', 1]]);
        // @ts-ignore ignore private fields for test
        expect(extPlane.subscriptions.length).toBe(1);
        expect(await extPlane.connected).toBe(true);
        observer$.subscribe({
            next: ([dataRef, value]) => {
                expect(typeof dataRef).toBe('string');
                expect(value).not.toBeFalsy();
                done();
            },
        });
    });

    it('Unobserves', async done => {
        extPlane.connect();
        const observer$ = extPlane.observe('sim/time/framerate_period');
        // @ts-ignore ignore private fields for test
        expect(extPlane.subscriptions.length).toBe(1);
        expect(await extPlane.connected).toBe(true);
        observer$.subscribe({
            next: ([dataRef, value]) => {
                expect(typeof dataRef).toBe('string');
                expect(value).not.toBeFalsy();
                extPlane.unobserve('sim/time/framerate_period');
                // @ts-ignore ignore private fields for test
                expect(extPlane.subscriptions.length).toBe(0);
                done();
            },
        });
    });

    it('Disconnects the socket if a new connection is created', async done => {
        const spy = spyOn(extPlane, 'disconnect');
        extPlane.connect();
        expect(await extPlane.connected).toBe(true);
        extPlane.connect();
        expect(spy).toHaveBeenCalled();
        done();
    });

    it('Disconnects after a socket error', async done => {
        const spy = spyOn(extPlane, 'disconnect');
        extPlane.connect();
        // @ts-ignore mock emit error
        extPlane.socket.emit('error', new Error('foo'));
        expect(spy).toHaveBeenCalledWith(true);
        expect(extPlane.connect).toThrowError();
        done();
    });

    it('Should log when debug is enabled', async done => {
        extPlane = new ExtPlane({ debug: true });
        const spy = spyOn(extPlane as any, 'log');
        extPlane.connect();
        expect(spy).toHaveBeenCalled();
        done();
    });

    it('Should check for a valid interval value', async done => {
        extPlane.connect();
        try {
            extPlane.interval('not a number' as any);
        } catch (e) {
            expect(extPlane.interval).toThrowError();
            done();
        }
    });

    it('Should write interval', async done => {
        const spy = spyOn(extPlane as any, 'socketWrite');
        extPlane.connect();
        extPlane.interval(333);
        expect(spy).toHaveBeenCalledWith(
            `extplane-set update_interval ${333 / 1000}`
        );
        done();
    });

    it('Closes connection', async done => {
        extPlane.connect();
        extPlane.disconnect();
        expect(await extPlane.connected).toBe(false);
        done();
    });

    it('Closes the connection when last observer is removed', async done => {
        extPlane.connect();
        extPlane.observe(['sim/time/framerate_period']);
        expect(await extPlane.connected).toBe(true);
        extPlane.unobserve(['sim/time/framerate_period']);
        expect(await extPlane.connected).toBe(false);
        done();
    });
});
