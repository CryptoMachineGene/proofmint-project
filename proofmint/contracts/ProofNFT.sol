// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract ProofNFT is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;

    event ReceiptMinted(address indexed to, uint256 indexed tokenId);
    event MinterGranted(address indexed minter);
    event MinterRevoked(address indexed minter);
    event BaseURISet(string newBase);

    constructor(string memory name_, string memory symbol_, string memory baseURI_)
        ERC721(name_, symbol_)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _baseTokenURI = baseURI_;
    }

    // ---- PUBLIC/EXTERNAL API (both delegate) ----

    function mintReceipt(address to, string calldata tokenURI_)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        return _mintReceipt(to, tokenURI_);
    }

    function mintTo(address to)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        return _mintReceipt(to, "");
    }

    // ---- SINGLE SOURCE OF TRUTH ----

    function _mintReceipt(address to, string memory tokenURI_)
        internal
        returns (uint256 tokenId)
    {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);                 // may call onERC721Received on receivers
        if (bytes(tokenURI_).length != 0) {
            _setTokenURI(tokenId, tokenURI_);
        }
        emit ReceiptMinted(to, tokenId);
    }

    // ---- Admin & overrides ----

    function grantMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _grantRole(MINTER_ROLE, minter);
    emit MinterGranted(minter);
    }

    function revokeMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
        emit MinterRevoked(minter);
    }

    function totalSupply() external view returns (uint256) { 
        return _nextTokenId - 1; 
    }

    function setBaseURI(string calldata newBase) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = newBase;
        emit BaseURISet(newBase);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
