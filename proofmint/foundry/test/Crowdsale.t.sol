// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// adjust imports if your filenames differ
import {Token} from "../../contracts/Token.sol";
import {ProofNFT} from "../../contracts/ProofNFT.sol";
import {Crowdsale} from "../../contracts/Crowdsale.sol";

interface IAccessControlLike {
  function MINTER_ROLE() external view returns (bytes32);
  function grantRole(bytes32 role, address account) external;
}

contract CrowdsaleTest is Test {
  Token token;
  ProofNFT nft;
  Crowdsale sale;
  address buyer = address(0xB0B);

  function setUp() public {
    token = new Token("Proofmint Token", "PMT");
    nft   = new ProofNFT("Proofmint Proof", "PRF", "https://your-base-uri/{id}");

    uint256 rateScaled = 1000 ether; // 1000 tokens / 1 ETH (scaled 1e18)
    uint256 capWei     = 10 ether;

    sale = new Crowdsale(address(token), rateScaled, capWei, address(nft));

    // --- Grant NFT minter to Crowdsale (AccessControl or custom) ---
    try IAccessControlLike(address(nft)).MINTER_ROLE() returns (bytes32 roleNft) {
      IAccessControlLike(address(nft)).grantRole(roleNft, address(sale));
    } catch {
      // fallback if your NFT exposes a custom grant method instead
      // nft.grantMinter(address(sale));
    }

    // --- Grant TOKEN minter to Crowdsale (this fixes the revert) ---
    try IAccessControlLike(address(token)).MINTER_ROLE() returns (bytes32 roleTok) {
      IAccessControlLike(address(token)).grantRole(roleTok, address(sale));
    } catch {
      // if your Token uses ownership instead of roles, use this instead:
      // token.transferOwnership(address(sale));
    }

    vm.deal(buyer, 1 ether);
  }

  function testBuyMintsTokensAndRaisesWei() public {
    uint256 preBal = IERC20(address(token)).balanceOf(buyer);

    vm.prank(buyer);
    sale.buyTokens{value: 0.001 ether}();

    uint256 postBal = IERC20(address(token)).balanceOf(buyer);
    assertGt(postBal, preBal, "buyer should receive tokens");
    assertEq(sale.weiRaised(), 0.001 ether, "weiRaised should update");
  }

  function testRevertOnZeroValue() public {
    vm.expectRevert();
    vm.prank(buyer);
    sale.buyTokens{value: 0}();
  }
}
