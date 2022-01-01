const tls = require('tls');
const shortid = require('shortid');
const debug = require('debug')('vndbjs:Connection');

const { version } = require('../package.json'); 

const NO_CONNECTION = 'No connection to destroy';
const UNAUTHORIZED_CONNECTION = 'Secure connection could not be established';

/**
 * A secure TLS connection to the VNDB API
 * @class
 * @prop {String} eot The End of Transmission character used by VNDB
 * @prop {String} uri The URI of the VNDB API
 * @prop {number} port The port of the VNDB API
 * @prop {TLSSocket} socket The secure socket
 * @prop {String} encoding The encoding standard used for communcations
 * @prop {String} socketID The unique identifier of this connection
 */
class Connection {
    /**
     * Creates a connection
     * @constructor
     * @param {String} client A string representing the client application, used as part of the socketID
     */
    constructor(client) {
        this.eot = '\x04';
        this.uri = 'api.vndb.org';
        this.port = 19535;
        this.socket;
        this.encoding = 'utf8';
        this.socketID = `vndbjs-${client}-${shortid.generate()}`;
    }

    /**
     * Establishes a connection with VNDB API
     * @returns {Promise<String>} 'ok'
     */
    connect() {
        debug(`Socket ${this.socketID} connecting to ${this.uri}:${this.port}`);
        return new Promise((resolve, reject) => {
            this.socket = tls.connect({
                host: this.uri,
                port: this.port,
                rejectUnauthorized: true
            }, () => {
                this.socket.removeAllListeners('error');
                if (this.socket.authorized) {
                    this.socket.setEncoding(this.encoding);
                    debug('Connection authorized');
                    resolve('ok');
                } else {
                    debug('Connection unauthorized');
                    reject(UNAUTHORIZED_CONNECTION);
                }
            }).once('error', (err) => reject(err));
        });
    }

    /**
     * Destroys the socket for this connection
     * @returns {Promise<String>} 'ok'
     */
    destroy() {
        debug(`Destroying socket ${this.socketID}`);
        return new Promise((resolve, reject) => {
            if (this.socket === undefined) reject(NO_CONNECTION);
            this.socket.once('end', () => {
                debug(`${this.socketID} destroyed`);
                resolve('ok');
            });
            this.socket.end();
        });
    }
    
    /**
     * Authenticates with VNDB API
     * @param {String} [username] Either both or neither must be present
     * @param {String} [password] Either both or neither must be present
     * @returns {Promise<String>} Authorization response from VNDB
     */
    login(username, password) {
        debug(`Socket ${this.socketID} logging in`);
        return new Promise(async (resolve, reject) => {
            const data = {
                protocol: 1,
                client: this.socketID,
                clientver: version,
                username,
                password
            };
            this.write(`login ${JSON.stringify(data, replacer)}`);
            try {
                const response = await this.read();
                if (response === `ok${this.eot}`) {
                    debug('Login succcessful');
                    resolve(response);
                } else {
                    debug('Login failed');
                    reject(response);
                }
            } catch(err) {
                reject(err);
            }
        });
    }

    /**
     * Listens to socket for data
     * @returns {Promise<String>} Data from VNDB
     */
    read() {
        debug(`Socket ${this.socketID} reading for response`);
        return new Promise((resolve, reject) => {
            this.socket.once('error', err => reject(err));
            let chunk = '';
            this.socket.on('data', (data) => {
                debug('Response received...');
                chunk += data.toString();
                if (chunk.endsWith(this.eot)) {
                    debug('EoT found, read successful');
                    this.socket.removeAllListeners('error');
                    this.socket.removeAllListeners('data');
                    resolve(chunk);
                }
            });
        });
    }

    /**
     * Writes data to socket
     * @param {String} message A VNDB-compatible command string
     * @returns {void} 
     */
    write(message) {
        debug(`Socket ${this.socketID} writing to ${this.uri}:${this.port}`);
        this.socket.write(`${message}${this.eot}`);
    }
}

function replacer(key, value) {
    if (value === null) {
        return undefined;
    }
    return value;
}

module.exports = Connection;