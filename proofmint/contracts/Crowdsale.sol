// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IToken {
    function mint(address to, uint256 amount) external;
}

interface IReceiptNFT {
    function mintTo(address to) external returns (uint256);
    function grantMinter(address minter) external;
}

contract Crowdsale is ReentrancyGuard {
    IToken public immutable token;
    IReceiptNFT public immutable receiptNFT;

    address  public immutable owner;
    uint256  public immutable rate; // tokens per 1 ETH (18 decimals)
    uint256  public immutable cap;  // max wei to raise
    uint256  public weiRaised;

    event TokensPurchased(address indexed buyer, uint256 value, uint256 amount);
    event Withdrawn(address indexed to, uint256 value);
    event ReceiptMinted(address indexed to, uint256 indexed tokenId, uint256 paidWei, uint256 tokensOut);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address tokenAddress, uint256 _rate, uint256 _cap, address nftAddress) {
        require(tokenAddress != address(0), "token addr=0");
        require(_rate != 0, "rate=0");
        require(_cap  != 0, "cap=0");
        require(nftAddress != address(0), "nft addr=0");

        token = IToken(tokenAddress);
        receiptNFT = IReceiptNFT(nftAddress);
        owner = msg.sender;
        rate  = _rate;
        cap   = _cap;
    }

    // Plain ETH sends are treated as buys
    receive() external payable {
        buyTokens();
    }

    function buyTokens() public payable nonReentrant {
        uint256 tokens = _buy(msg.sender, msg.value);       // effects first
        uint256 tokenId = receiptNFT.mintTo(msg.sender);    // then external call (guarded by nonReentrant)
        emit ReceiptMinted(msg.sender, tokenId, msg.value, tokens);
    }

    function withdraw() external nonReentrant onlyOwner {
        uint256 amt = address(this).balance;
        (bool ok, ) = payable(owner).call{ value: amt }("");
        require(ok, "withdraw fail");
        emit Withdrawn(owner, amt);
    }

    function _buy(address beneficiary, uint256 weiAmount) internal returns (uint256 tokens) {
        require(weiAmount > 0, "no ETH sent");
        require(weiRaised + weiAmount <= cap, "cap reached");

        tokens = (weiAmount * rate) / 1e18;

        weiRaised += weiAmount;
        token.mint(beneficiary, tokens);

        emit TokensPurchased(beneficiary, weiAmount, tokens);
    }
}
