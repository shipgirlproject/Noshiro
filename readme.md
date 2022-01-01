<p align="center">
  <img src="http://i.imgur.com/trYFXTz.png"/>
</p>
<p align="center">
  <a href="https://gitlab.com/arbauman/vndbjs-core"><img src="https://img.shields.io/badge/Developed%20on-GitLab-orange.svg?style=flat-square" alt="Developed on Gitlab"></a>
  <a href="https://www.npmjs.com/package/vndbjs"><img src="https://img.shields.io/npm/v/vndbjs-core.svg?style=flat-square" alt="npm" /></a>
  <a href="https://gitlab.com/arbauman/vndbjs-core/commits/master"><img alt="build status" src="https://gitlab.com/arbauman/vndbjs-core/badges/master/build.svg" /></a>
  <a href="https://gitlab.com/arbauman/vndbjs-core/commits/master"><img alt="coverage report" src="https://gitlab.com/arbauman/vndbjs-core/badges/master/coverage.svg" /></a>
  <a href="https://arbauman.gitlab.io/vndbjs-core/"><img src="https://img.shields.io/badge/docs-latest-brightgreen.svg?style=flat-square" alt="Documentation Status" /></a>
</p>

A lightweight client for communicating with the Visual Novel Database

This library is intended to provide a thin interface for the TCP API that VNDB.org offers.  For more advanced data transformation options, check out [vndbjs](https://gitlab.com/arbauman/vndbjs).

> Refactoring and rebranding soon:tm:

# Features

* Send VNDB-compatible command strings and let vndbjs-core handle the rest
* TLS-secure connections and user login
* Configurable ratelimiting
* Automatic connection pooling

## Connection Pooling

Vndbjs will automatically create a pool of up to 10 connections to VNDB, allowing you to maintain long-lived connections so that your commands can be sent at a moments notice while offering concurrency.

# Installation
**Node v8.9.4 or newer**

`npm install --save vndbjs-core`

# Usage

```js
const Vndb = require('vndbjs');

const clientName = 'DemoApp'; // used to identify your app to VNDB.org

const config = {
  rateLimit: 20, // allows {rateLimit} writes within {rateInterval} milliseconds
  rateInterval: 60000,
  password: '********', // optional, required to perform `set` commands.
  poolMin: 2, // this many connections will be maintained at all times
  poolTimeout: 30000, // excess idle connections will be destroyed after this many milliseconds
  username: 'yourusername555' // optional, required to perform `set` commands.
}

const vndb = new Vndb(clientName, config);

vndb.send('get vn basic,details (id = 17)')
  .then((response) => {
    // data
  })
```

# Links
[Official VNDB.org Documentation](https://vndb.org/d11)

[Vndbjs - Enhanced data processing and transformation](https:/npmjs.com/package/vndbjs/)

# License
Vndbjs is licensed under the [MIT](license) license.  This library is not associated with VNDB.org
