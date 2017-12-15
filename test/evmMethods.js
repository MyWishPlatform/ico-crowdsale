const mineBlock = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync(
            {jsonrpc: "2.0", method: "evm_mine", params: [], id: 0},
            function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
    });
};

module.exports = {
    increaseTime: addSeconds => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync(
                [{jsonrpc: "2.0", method: "evm_increaseTime", params: [addSeconds], id: 0},
                    {jsonrpc: "2.0", method: "evm_mine", params: [], id: 0}],
                function (error, result) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
    },
    snapshot: () => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync(
                {jsonrpc: "2.0", method: "evm_snapshot", params: [], id: 0},
                function (error, result) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
    },
    revert: id => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync(
                {jsonrpc: "2.0", method: "evm_revert", params: [id], id: 0},
                function (error, result) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
    },
    mine: mineBlock
};