const net = require("net");

class McPing {
    constructor(address, port) {
        this.address = address;
        this.port = port;
    }

    getData(callback) {
        const start_time = new Date();
        const client = net.connect(this.port, this.address, () => {
            this.latency = Math.round(new Date() - start_time);
            client.write(Buffer.from([0xfe, 0x01]));
        });

        client.setTimeout(5000);

        client.on("data", (data) => {
            if (data != null && data != "") {
                const server_info = data.toString().split("\x00\x00\x00");
                if (server_info != null && server_info.length >= 6) {
                    this.online = true;
                    this.version = server_info[2].replace(/\u0000/g, "");
                    this.motd = server_info[3].replace(/\u0000/g, "");
                    this.current_players = server_info[4].replace(
                        /\u0000/g,
                        ""
                    );
                    this.max_players = server_info[5].replace(/\u0000/g, "");
                } else {
                    this.online = false;
                }
            }
            callback({
                address: this.address,
                port: this.port,
                isOnline: this.online,
                latency: this.latency,
                version: this.version,
                motd: this.motd,
                current_players: this.current_players,
                max_players: this.max_players
            });
            client.end();
        });

        client.on("timeout", () => {
            callback({
                error: { message: "Timed out" }
            });
            client.end();
        });

        client.on("end", () => {});

        client.on("error", (err) => {
            callback({ error: err });
        });
    }
}

const url = require("url");
const server = require("http").createServer((req, res) => {
    try {
        res.setHeader("Content-Type", "application/json");
        const query = url.parse(req.url, true).query;
        if (!query || !query.ip || !query.port) {
            res.end(
                JSON.stringify({
                    error: { message: "IP or PORT invalid!" }
                })
            );
        }

        new McPing(query.ip, query.port).getData((response) => {
            res.end(JSON.stringify(response));
        });
    } catch (err) {
        console.log(err);
        res.end(
            JSON.stringify({
                error: { message: "An error occurred!" }
            })
        );
    }
});

server.listen(3000, () => {
    console.log("running");
});
