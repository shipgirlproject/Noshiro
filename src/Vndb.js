const genericPool = require('generic-pool');
const { RateLimiter } = require('limiter');
const defaults = require('defaults-shallow');
const Connection = require('./Connection');
const debug = require('debug')('vndbjs:Vndb');

const defaultSettings = {
    rateLimit: 20,
    rateInterval: 60000,
    password: null,
    poolMin: 1,
    poolTimeout: 30000,
    username: null
};

/**
 * A connection pool of connections to VNDB
 * @class
 * @prop {String} clientName A string representing the client application, used as part of the socketID
 * @prop {Number} rateLimit The number of queries vndbjs will perform every [rateInterval] milliseconds
 * @prop {Number} rateInterval The number of milliseconds during which [rateLimit] queries can be performed.  String values may be 'second', 'minute', 'hour', or 'day'
 * @prop {String} password The password for a user's VNDB account.  If set, username must also be set.  Stored in memory as plaintext, so use caution
 * @prop {String} username The username for a user's VNDB account. If set, password must also be set.  Stored in memory as plaintext, so use caution
 * @prop {Object} poolConfig An object of configurations for the connection pool
 * @prop {RateLimiter} limiter A ratelimiter to prevent throttling from VNDB
 * @prop {Pool} pool A pool of Connections
 */
class Vndb {
    /**
     * Creates pool of connections
     * @param {String} clientName A string representing the client application, used as part of the socketID
     * @param {Object} settings A map containing configuration settings
     * @param {Number} [settings.rateLimit = 20] The number of queries vndbjs will perform every [rateInterval] milliseconds
     * @param {(Number|String)} [settings.rateInterval = 60000] The number of milliseconds during which [rateLimit] queries can be performed.  String values may be 'second', 'minute', 'hour', or 'day'
     * @param {String} [settings.password = null] The password for a user's VNDB account.  If set, username must also be set.  Stored in memory as plaintext, so use caution
     * @param {Number} [settings.poolMin = 1] How many connections the pool should maintain
     * @param {Number} [settings.poolTimeout = 30000] The number of milliseconds a connection can remain idle before being destroyed
     * @param {String} [settings.username = null] The username for a user's VNDB account. If set, password must also be set.  Stored in memory as plaintext, so use caution
     */
    constructor(clientName, settings = {}) {
        defaults(settings, defaultSettings);
        this.clientName = clientName;
        this.rateLimit = settings.rateLimit;
        this.rateInterval = settings.rateInterval;
        this.password = settings.password;
        this.username = settings.username;
        this.poolConfig = {
            min: settings.poolMin,
            max: 10, // VNDB permits a maximum of 10 connections per IP address
            evictionRunIntervalMillis: 1000,
            numTestsPerRun:10,
            softIdleTimeoutMillis: settings.poolTimeout,
            idleTimeoutMillis: 0,
            acquireTimeoutMillis: 2000
        };
        this.limiter = new RateLimiter(this.rateLimit, this.rateInterval);
        this.pool = genericPool.createPool({
            create: () => {
                debug('Creating socket');
                return new Promise(async (resolve, reject) => {
                    try {
                        const client = new Connection(this.clientName);
                        await client.connect();
                        await client.login(this.username, this.password);
                        debug(`Socket ${client.socketID} created successfully`);
                        resolve(client);
                    } catch(err) {
                        debug('Socket creation failed');
                        reject(err);
                    }
                });
            },
            destroy(client) {
                debug(`Destroying socket ${client.socketID}`);
                return new Promise(async (resolve) => {
                    await client.destroy();
                    debug('Socket destroyed');
                    resolve(client);
                });
            }
        }, this.poolConfig);
    }

    /**
     * Send a command to VNDB
     * @param {String} message A VNDB-compatible command string
     * @returns {Promise<String>} Response string from VNDB 
     */
    send(message) {
        debug(`Sending message "${message}"`);
        return new Promise((resolve, reject) => {
            
            this.limiter.removeTokens(1, async () => {
                let client;
                try {
                    client = await this.pool.acquire();
                } catch(err) {
                    reject(err);
                }
                try {
                    debug(`Acquired socket ${client.socketID} from pool`);
                    client.write(message);
                    const response = await client.read();
                    debug('Send successful');
                    resolve(response);
                } catch(err) {
                    debug('Send failed');
                    reject(err);
                } finally {
                    debug(`Socket ${client.socketID} released to pool`);
                    this.pool.release(client);
                }
            });
        });
    }

    /**
     * Destroy the connection pool
     * @returns {Promise<String>} 'ok'
     */
    destroy() {
        debug('Destroying connection pool...');
        return new Promise(async (resolve) => {
            await this.pool.drain();
            this.pool.clear();
            debug('Connection pool destroyed');
            resolve('ok');
        });
    }
}

module.exports = Vndb;