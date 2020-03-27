const { ExtPlane } = require('./dist');

const extPlane = new ExtPlane({
    host: '192.168.1.100',
    port: 51000,
    broadcast: true,
    debug: true,
});

extPlane.on('loaded', () => {
    extPlane.client.interval(0.33);
    extPlane.client.subscribe(
        'sim/cockpit2/gauges/indicators/airspeed_kts_pilot'
    );
    extPlane.on('data-ref', (dataRef, value) => {
        console.log(dataRef, value);
    });
});
