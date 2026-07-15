import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

async function main() {

  const contractAddress =
    "0x600845d7Aa5753dd154A958fc6F1125a3f3D490C";

  const defaultRouter =
    "0x10ED43C718714eb63d5aA57B78B54704E256024E";

  const soltToken =
    "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";

  const treasuryWallet =
    "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";

  const platformFeeWallet =
    "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";

  const antiBotBlocks = 2;
  const platformFeePercent = 2;
  const maxClaimDelay = 30;
  const slippagePercent = 2;

  console.log("Verifying FairLaunchFactory...");

  await verifyContract(
    {
      address: contractAddress,
      constructorArgs: [
        defaultRouter,
        soltToken,
        treasuryWallet,
        platformFeeWallet,
        antiBotBlocks,
        platformFeePercent,
        maxClaimDelay,
        slippagePercent
      ],
      provider: "etherscan",
    },
    hre
  );

  console.log("✅ FairLaunchFactory verified successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});