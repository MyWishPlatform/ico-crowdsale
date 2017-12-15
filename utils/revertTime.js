const ganache = require("ganache-cli");
const to = require('./to.js');
const utils = require('ethereumjs-util');
const async = require("async");

StateManager.prototype.snapshot = function (callback) {
    var self = this;

    this.blockchain.getHeight(function (err, blockNumber) {
        if (err) return callback(err);

        self.snapshots.push({
            blockNumber: blockNumber,
            timeAdjustment: self.blockchain.timeAdjustment
        });

        self.logger.log("Saved snapshot #" + self.snapshots.length);

        callback(null, to.hex(self.snapshots.length));
    });
};

StateManager.prototype.revert = function (snapshot_id, callback) {
    var self = this;

    // Convert from hex.
    snapshot_id = utils.bufferToInt(snapshot_id);

    this.logger.log("Reverting to snapshot #" + snapshot_id);

    if (snapshot_id > this.snapshots.length) {
        callback(new Error("Wrong snapshot number, max is " + (this.snapshots.length - 1)), false);
        return false;
    }

    // Convert to zero based.
    snapshot_id = snapshot_id - 1;
    var timeAdjustment = this.snapshots[snapshot_id].timeAdjustment;

    // Loop through each snapshot with a higher id than the current one.
    async.whilst(function () {
        return self.snapshots.length > snapshot_id
    }, function (nextSnapshot) {
        var snapshot = self.snapshots.pop();

        // For each snapshot, asynchronously pop off the blocks it represents.
        async.during(function (doneWithTest) {
            self.blockchain.getHeight(function (err, blockNumber) {
                if (err) return doneWithTest(err);

                doneWithTest(null, blockNumber > snapshot.blockNumber)
            });
        }, function (nextBlock) {
            self.blockchain.popBlock(function (err) {
                if (err) return nextBlock(err);
                nextBlock();
            });
        }, nextSnapshot);


    }, function (err) {
        if (err) return callback(err);

        // Pending transactions are removed when you revert.
        self.blockchain.clearPendingTransactions();
        // The time adjustment is restored to its prior state
        self.blockchain.timeAdjustment = timeAdjustment;

        callback(null, true);
    });
};

module.exports = {};