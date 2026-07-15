import hre from "hardhat";
import { ethers } from "ethers";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

async function main() {

  const contractAddress =
    "0x69047Ea4b6AF31774ce6fA0A4299155D928540b9";

  const treasuryWallet =
    "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";

  const feeToken =
    "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";

  // 6000 SOLT
  const feeAmount = ethers.parseUnits("6000", 18);

  console.log("🔍 Verifying LockFactory...");

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

  console.log("✅ LockFactory verified successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});