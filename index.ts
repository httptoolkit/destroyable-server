import * as net from 'net';

export type DestroyableServer<S extends net.Server = net.Server> = S & {
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
    const connections: { [key: string]: Array<net.Socket> } = {};

    const addConnection = (key: string, conn: net.Socket) => {
        if (connections[key]) {
            connections[key].push(conn);
        } else {
            connections[key] = [conn];
        }
    }

    const removeConnection = (key: string, conn: net.Socket) => {
        const conns = connections[key];
        if (!conns) return;

        const index = conns.indexOf(conn);
        if (conns.length === 1 && index === 0) {
            delete connections[key];
        } else if (index !== -1) {
            conns.splice(index, 1);
        }
    };

    server.on('connection', function(conn: net.Socket) {
        const key = conn.remoteAddress + ':' + conn.remotePort;
        addConnection(key, conn);
        conn.on('close', function() {
            removeConnection(key, conn);
        });
    });

    server.on('secureConnection', function(conn: net.Socket) {
        const key = conn.remoteAddress + ':' + conn.remotePort;
        addConnection(key, conn);
        conn.on('close', function() {
            removeConnection(key, conn);
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
                    for (let conn of connections[key]) {
                        conn.destroy();
                    }
                }
            });
        }
    });
}