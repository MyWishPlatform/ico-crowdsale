const mineBlock = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync(
            { jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 },
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
    timeTo: absoluteTime => {
        return new Promise((resolve, reject) => {
            return web3.eth.getBlockNumber((e, blockNumber) => {
                return web3.eth.getBlock(blockNumber, (e, block) => {
                    const blockTs = block.timestamp;
                    if (blockTs >= absoluteTime) {
                        if (blockTs > absoluteTime) {
                            console.warn('Block time already is in future:', blockTs, '>', absoluteTime);
                        }
                        resolve(true);
                    }
                    const delta = absoluteTime - blockTs;
                    return web3.currentProvider.sendAsync(
                        [{ jsonrpc: '2.0', method: 'evm_increaseTime', params: [delta], id: 0 },
                            { jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 }],
                        function (error, result) {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }
                    );
                });
            });
        });
    },
    increaseTime: addSeconds => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync(
                [{ jsonrpc: '2.0', method: 'evm_increaseTime', params: [addSeconds], id: 0 },
                    { jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 }],
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
                { jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 },
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
                { jsonrpc: '2.0', method: 'evm_revert', params: [id], id: 0 },
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
    mine: mineBlock,
};
