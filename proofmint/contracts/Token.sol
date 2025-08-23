// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Token {
    string public name;
    string public symbol;
    address public minter;
    mapping(address => uint256) public balanceOf;

    constructor(string memory n, string memory s) { name = n; symbol = s; }
    function setMinter(address m) external { minter = m; }
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "not minter");
        balanceOf[to] += amount;
    }
}
