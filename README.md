# extplane-ts #

![License](https://img.shields.io/github/license/lookapanda/extplane-ts)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/lookapanda/extplane-ts)
![Build Status](https://img.shields.io/github/workflow/status/lookapanda/extplane-ts/Release)

A TypeScript client library for nodeJs that uses the [ExtPlane plugin](https://github.com/vranki/ExtPlane).

Based on [ExtPlaneJs](https://github.com/wadedos/ExtPlaneJs)

## Prerequisites
1. You obviously need X-Plane with the [ExtPlane plugin](https://github.com/vranki/ExtPlane) installed.
2. [NodeJs](https://nodejs.org) >= 10.18


## Installation
Install via npm

```
$ npm install --save @lookapanda/extplane-js
```

Install via yarn

```
$ yarn add @lookapanda/extplane-js
```


# Usage


```typescript
const { ExtPlane } = '@lookapanda/extplane-js';

const extPlane = new ExtPlane({
    host: '127.0.0.1',
    port: 51000,
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
```


# API

### ExtPlane(config: ExtPlaneOptions)
Instantiates extplane-ts. Does not connect until an observer is added! 

### ExtPlane.connect()
Connects to ExtPlane

### ExtPlane.disconnect()
Disconnects ExtPlane

### ExtPlane.observe(dataRefs: string[])
Connects to ExtPlane (if not already connected) and subscribes to one or more datarefs

### ExtPlane.unobserve(dataRefs: string[])
Unsubscribes one or more datarefs, but does not close the connection
