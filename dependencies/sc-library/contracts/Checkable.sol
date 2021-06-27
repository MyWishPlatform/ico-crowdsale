//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


abstract contract Checkable {
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
   * isAccident is accident occurred
   */
  event Checked(bool isAccident);

  constructor() {
    serviceAccount = msg.sender;
  }

  /**
   * @dev Replace service account with new one.
   * @param _account Valid service account address.
   */
  function changeServiceAccount(address _account) public onlyService {
    require(_account != address(0));
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
  function check() public payable onlyService notTriggered {
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
  function internalCheck() internal virtual returns (bool);

  /**
   * @dev Do inner action if check was success.
   */
  function internalAction() internal virtual;

  modifier onlyService {
    require(msg.sender == serviceAccount);
    _;
  }

  modifier notTriggered {
    require(!triggered);
    _;
  }
}
