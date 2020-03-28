import { ExtPlane } from '../src';

jest.mock('net');

describe('ExtPlane', () => {
    let extPlane: ExtPlane;

    beforeEach(() => {
        jest.clearAllMocks();
        extPlane = new ExtPlane();
    });

    it('Connect to ExtPlane', async done => {
        extPlane.connect();
        const isConnected = await extPlane.connected;
        expect(isConnected).toBe(true);
        done();
    });

    it('Close Connection', async done => {
        extPlane.connect();
        extPlane.disconnect();
        expect(await extPlane.connected).toBe(false);
        done();
    });
});
