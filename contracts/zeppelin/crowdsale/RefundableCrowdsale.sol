pragma solidity ^0.4.11;


import '../math/SafeMath.sol';
import './FinalizableCrowdsale.sol';
import './RefundVault.sol';


/**
 * @title RefundableCrowdsale
 * @dev Extension of Crowdsale contract that adds a funding goal, and
 * the possibility of users getting a refund if goal is not met.
 * Uses a RefundVault as the crowdsale's vault.
 */
contract RefundableCrowdsale is FinalizableCrowdsale {
    using SafeMath for uint256;

    // minimum amount of funds to be raised in weis
    uint public goal;

    // refund vault used to hold funds while crowdsale is running
    RefundVault public vault;

    function RefundableCrowdsale(uint32 _startTime, uint32 _endTime, uint _hardCap, address _wallet, uint _goal)
            FinalizableCrowdsale(_startTime, _endTime, _hardCap, _wallet) {
        require(_goal > 0);
        vault = new RefundVault(wallet);
        goal = _goal;
    }

    // We're overriding the fund forwarding from Crowdsale.
    // In addition to sending the funds, we want to call
    // the RefundVault deposit function
    function forwardFunds(uint amountWei) internal {
        if (goalReached()) {
            wallet.transfer(amountWei);
        }
        else {
            vault.deposit.value(amountWei)(msg.sender);
        }
    }

    // if crowdsale is unsuccessful, investors can claim refunds here
    function claimRefund() public {
        require(isFinalized);
        require(!goalReached());

        vault.refund(msg.sender);
    }

    /**
     * @dev Close vault only if goal was reached.
     */
    function closeVault() public onlyOwner {
        require(goalReached());
        vault.close();
    }

    // vault finalization task, called when owner calls finalize()
    function finalization() internal {
        super.finalization();

        if (goalReached()) {
            vault.close();
        }
        else {
            vault.enableRefunds();
        }
    }

    function goalReached() public constant returns (bool) {
        return weiRaised >= goal;
    }

}
