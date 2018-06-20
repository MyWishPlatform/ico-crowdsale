const estimateConstructGasWithValue = (target, value, ...args) => {
    return new Promise((resolve, reject) => {
        const web3contract = target.web3.eth.contract(target.abi);
        args.push({
            data: target.unlinked_binary,
        });
        const constructData = web3contract.new.getData.apply(web3contract.new, args);
        web3.eth.estimateGas({ data: constructData, value: value }, function (err, gas) {
            if (err) {
                reject(err);
            } else {
                resolve(gas);
            }
        });
    });
};

module.exports = {
    web3async: (that, func, ...args) => {
        return new Promise((resolve, reject) => {
            args.push(
                function (error, result) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            func.apply(that, args);
        });
    },
    estimateConstructGas: (target, ...args) => {
        args.unshift(0);
        args.unshift(target);
        return estimateConstructGasWithValue.apply(this, args);
    },

    estimateConstructGasWithValue: estimateConstructGasWithValue,
};
