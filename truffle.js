const ganache = require("ganache-cli");
const ether = '0000000000000000000';

module.exports = {
    networks: {
        test: {
            network_id: "*",
            provider: ganache.provider({
                total_accounts: 100,
                time: new Date("2017-10-10T15:00:00Z"),
                debug: false
            })
        }
    },
    network: 'test',
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};