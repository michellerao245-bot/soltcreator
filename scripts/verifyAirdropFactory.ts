import hre from "hardhat";
import { ethers } from "ethers";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

async function main() {
  const contractAddress =
    "0xB2b62aB7916BE0577a9b47590d8392b8a63dB2B2";

  const treasuryWallet =
    "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";

  const feeToken =
    "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";

  // 500 SOLT
  const feeAmount =
    ethers.parseUnits("500", 18);

  console.log("🔍 Verifying AirdropFactory...");

  await verifyContract(
    {
      address: contractAddress,
      constructorArgs: [
        treasuryWallet,
        feeToken,
        feeAmount,
      ],
      provider: "etherscan",
    },
    hre
  );

  console.log("✅ AirdropFactory verified successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});