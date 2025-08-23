// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockMintableToken is ERC20 {
    constructor() ERC20("MockToken", "MOCK") {}

    // no roles: any caller can mint (fine for tests)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
