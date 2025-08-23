// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICrowdsale { function buyTokens() external payable; }

contract MockTokenReenter {
    address public minter;
    address public target; // crowdsale
    mapping(address => uint256) public balanceOf;

    function setMinter(address m) external { minter = m; }
    function setCrowdsaleTarget(address t) external { target = t; }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "not minter");
        if (target != address(0)) {
            ICrowdsale(target).buyTokens{ value: 1 wei }();
        }
        balanceOf[to] += amount;
    }
}
