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
    }
};