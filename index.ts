import * as net from 'net';

export type DestroyableServer<S extends net.Server> = S & {
    /**
     * Forcibly shut down the server - destroying all active connections, and then
     * calling `.close()``
     */
    destroy(): Promise<void>;
}

/**
 * Makes a server 'destroyable': tracks all active server connections, and adds a
 * `.destroy()` method to the server, which destroys all active server connections
 * and then shuts the server down cleanly.
 *
 * The server is mutated (adding the new method) and also returned from this method
 * for convenience.
 *
 * `.destroy()` returns a promise, which you can wait on to ensure the server has
 * been fully destroyed.
 */
export function makeDestroyable<S extends net.Server>(server: S): DestroyableServer<S>  {
    const connections: { [key: string]: net.Socket } = {};

    server.on('connection', function(conn: net.Socket) {
        const key = conn.remoteAddress + ':' + conn.remotePort;
        connections[key] = conn;
        conn.on('close', function() {
            delete connections[key];
        });
    });

    server.on('secureConnection', function(conn: net.Socket) {
        const key = conn.remoteAddress + ':' + conn.remotePort;
        connections[key] = conn;
        conn.on('close', function() {
            delete connections[key];
        });
    });

    return Object.assign(server, {
        destroy: () => {
            return new Promise<void>((resolve, reject) => {
                server.close((err: any) => {
                    if (err) reject(err);
                    else resolve();
                });

                for (let key in connections) {
                    connections[key].destroy();
                }
            });
        }
    });
}