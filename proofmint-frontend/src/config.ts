export const CHAIN_ID_HEX: string = import.meta.env.VITE_CHAIN_ID_HEX;
export const CROWDSALE_ADDR: string = import.meta.env.VITE_CROWDSALE_ADDR;
export const TOKEN_ADDR: string = import.meta.env.VITE_TOKEN_ADDR;
export const NFT_ADDR: string = import.meta.env.VITE_NFT_ADDR;   // was PROOFNFT_ADDRESS

// point these to your actual jsons
import crowdsaleAbi from "./abi/Crowdsale.json";
import proofNftAbi  from "./abi/ProofNFT.json";

export const ABIS = {
  crowdsale: crowdsaleAbi.abi ?? crowdsaleAbi,
  proofNft:  proofNftAbi.abi  ?? proofNftAbi,
};
