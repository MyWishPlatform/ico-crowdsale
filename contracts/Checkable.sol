pragma solidity ^0.4.23;


contract Checkable {
    address private serviceAccount;
    /**
     * Flag means that contract accident already occurs.
     */
    bool private triggered = false;

    /**
     * Occurs when accident happened.
     */
    event Triggered(uint balance);
    /**
     * Occurs when check finished.
     */
    event Checked(bool isAccident);

    constructor() public {
        serviceAccount = msg.sender;
    }

    /**
     * @dev Replace service account with new one.
     * @param _account Valid service account address.
     */
    function changeServiceAccount(address _account) public onlyService {
        assert(_account != 0);
        serviceAccount = _account;
    }

    /**
     * @dev Is caller (sender) service account.
     */
    function isServiceAccount() public view returns (bool) {
        return msg.sender == serviceAccount;
    }

    /**
     * Public check method.
     */
    function check() public onlyService notTriggered payable {
        if (internalCheck()) {
            emit Triggered(address(this).balance);
            triggered = true;
            internalAction();
        }
    }

    /**
     * @dev Do inner check.
     * @return bool true of accident triggered, false otherwise.
     */
    function internalCheck() internal returns (bool);

    /**
     * @dev Do inner action if check was success.
     */
    function internalAction() internal;

    modifier onlyService {
        require(msg.sender == serviceAccount);
        _;
    }

    modifier notTriggered() {
        require(!triggered);
        _;
    }
}
