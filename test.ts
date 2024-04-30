import * as net from 'net';
import * as stream from 'stream';
import { expect } from 'chai';

import { makeDestroyable } from './index';

const delay = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

describe("Destroyable server", () => {

    it("can shut down a server even with active connections", async () => {
        const rawServer = new net.Server((_socket) => { /* Do nothing, keep socket open forever */ });
        const server = makeDestroyable(rawServer);

        await new Promise((resolve) => server.listen(resolve));

        // Connect to the server, opening a socket that we never close
        net.connect({ host: '127.0.0.1', port: (server.address() as any).port });

        await delay(100);

        server.destroy(); // Without this or with just `.close()`, the process doesn't exit
    });

    it("can shut down a server with duplicate connections", async () => {
        // This can happen when using a server (like Mockttp) that handles its own tunnelled connections,
        // which means it may have multiple connections on the same incoming ip:port.

        const rawServer = new net.Server((_socket) => { /* Do nothing, keep socket open forever */ });
        const server = makeDestroyable(rawServer);

        const stream1 = new stream.PassThrough();
        const stream2 = new stream.PassThrough();

        [stream1, stream2].forEach((stream) => {
            Object.assign(stream, { remoteAddress: '1.2.3.4', remotePort: 1234 });
        });

        server.emit('connection', stream1);
        server.emit('connection', stream2);

        expect(stream1.destroyed).to.equal(false);
        expect(stream2.destroyed).to.equal(false);

        server.destroy();

        // expect(stream1.destroyed).to.equal(true);
        expect(stream2.destroyed).to.equal(true);
    });

});