pragma solidity ^0.4.18;


import "zeppelin-solidity/contracts/token/StandardToken.sol";


contract FreezableToken is StandardToken {
    mapping (address => uint64) internal roots;

    mapping (bytes32 => uint64) internal chains;

    event Freezed(address indexed to, uint64 release, uint amount);
    event Released(address indexed owner, uint amount);

    /**
     * @dev gets summary information about all freeze tokens for the specified address.
     * @param _addr Address of freeze tokens owner.
     */
    function getFreezingSummaryOf(address _addr) public constant returns (uint tokenAmount, uint freezingCount) {
        uint count;
        uint total;
        uint64 release = roots[_addr];
        while (release != 0) {
            count ++;
            total += balanceOf(address(keccak256(toKey(_addr, release))));
            release = chains[toKey(_addr, release)];
        }

        return (total, count);
    }

    /**
     * @dev gets freezing end date and freezing balance for the freezing portion specified by index.
     * @param _addr Address of freeze tokens owner.
     * @param _index Freezing portion index. It ordered by release date descending.
     */
    function getFreezing(address _addr, uint _index) public constant returns (uint64 _release, uint _balance) {
        uint64 release = roots[_addr];
        for (uint i = 0; i < _index; i ++) {
            release = chains[toKey(_addr, release)];
        }
        return (release, balanceOf(address(keccak256(toKey(_addr, release)))));
    }

    /**
     * @dev freeze your tokens to the specified address.
     *      Be careful, gas usage is not deterministic,
     *      and depends on how many freezes _to address already has.
     * @param _to Address to which token will be freeze.
     * @param _amount Amount of token to freeze.
     * @param _until Release date, must be in future.
     */
    function freezeTo(address _to, uint _amount, uint64 _until) public {
        bytes32 currentKey = toKey(_to, _until);
        transfer(address(keccak256(currentKey)), _amount);

        freeze(_to, _until);
        Freezed(_to, _until, _amount);
    }

    /**
     * @dev release first available freezing tokens.
     */
    function releaseOnce() public {
        uint64 head = roots[msg.sender];
        require(head != 0);
        require(uint64(block.timestamp) > head);
        bytes32 currentKey = toKey(msg.sender, head);

        uint64 next = chains[currentKey];

        address currentAddress = address(keccak256(currentKey));
        uint amount = balances[currentAddress];
        delete balances[currentAddress];

        balances[msg.sender] += amount;

        if (next == 0) {
            delete roots[msg.sender];
        }
        else {
            roots[msg.sender] = next;
        }
        Released(msg.sender, amount);
    }

    /**
     * @dev release all available for release freezing tokens. Gas usage is not deterministic!
     * @return how many tokens was released
     */
    function releaseAll() public returns (uint tokens) {
        uint release;
        uint balance;
        (release, balance) = getFreezing(msg.sender, 0);
        while (release != 0 && block.timestamp > release) {
            releaseOnce();
            tokens += balance;
            (release, balance) = getFreezing(msg.sender, 0);
        }
    }

    function toKey(address _addr, uint _release) internal constant returns (bytes32 result) {
        // WISH masc to increase entropy
        result = 0x5749534800000000000000000000000000000000000000000000000000000000;
        assembly {
            result := or(result, mul(_addr, 0x10000000000000000))
            result := or(result, _release)
        }
    }

    function freeze(address _to, uint64 _until) internal {
        require(_until > block.timestamp);
        uint64 head = roots[_to];

        if (head == 0) {
            roots[_to] = _until;
            return;
        }

        bytes32 headKey = toKey(_to, head);
        uint parent;
        bytes32 parentKey;

        while (head != 0 && _until > head) {
            parent = head;
            parentKey = headKey;

            head = chains[headKey];
            headKey = toKey(_to, head);
        }

        if (_until == head) {
            return;
        }

        if (head != 0) {
            chains[toKey(_to, _until)] = head;
        }

        if (parent == 0) {
            roots[_to] = _until;
        }
        else {
            chains[parentKey] = _until;
        }
    }
}