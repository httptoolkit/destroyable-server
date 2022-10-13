import * as net from 'net';
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

});