// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ExtPlane } = require('./dist');

const extPlane = new ExtPlane({
    host: '192.168.1.100',
    port: 51000,
    broadcast: true,
    debug: true,
});

extPlane
    .interval(1000)
    .observe([
        'sim/flightmodel/position/latitude',
        'sim/flightmodel/position/longitude',
        'sim/time/framerate_period',
    ])
    .subscribe({
        next: ([dataRef, value]) => {
            switch (dataRef) {
                case 'sim/flightmodel/position/latitude':
                    console.warn('Lat', value);
                    break;
                case 'sim/flightmodel/position/longitude':
                    console.warn('Long', value);
                    break;
                case 'sim/time/framerate_period':
                    console.warn('FPS', Math.floor(1 / value));
                    break;
            }
        },
    });
