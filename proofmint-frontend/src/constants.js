export const CROWDSALE_ADDRESS = import.meta.env.VITE_CROWDSALE_ADDRESS;
export const PROOFNFT_ADDRESS  = import.meta.env.VITE_PROOFNFT_ADDRESS;

// point these to your actual jsons
import crowdsaleAbi from "./abi/Crowdsale.json";
import proofNftAbi  from "./abi/ProofNFT.json";

export const ABIS = {
  crowdsale: crowdsaleAbi.abi ?? crowdsaleAbi,
  proofNft:  proofNftAbi.abi  ?? proofNftAbi,
};
