import { ExtPlane } from '../src';

jest.mock('net');

describe('ExtPlane', () => {
    let extPlane: ExtPlane;

    beforeEach(() => {
        jest.clearAllMocks();
        extPlane = new ExtPlane();
    });

    it('Connect to ExtPlane', done => {
        extPlane.on('loaded', () => {
            expect(extPlane.isConnected).toBe(true);
            done();
        });
    });

    it('Close Connection', done => {
        extPlane.on('loaded', () => {
            extPlane.client.disconnect();
            expect(extPlane.isConnected).toBe(false);
            done();
        });
    });
});
