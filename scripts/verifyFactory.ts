import hre from "hardhat";
import { ethers } from "ethers";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

async function main() {

  const contractAddress =
    "0x1f0881A554783E810202F5A15f5149d8a1557D64";

  const treasuryWallet =
    "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";

  const feeToken =
    "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";

  const feeAmount =
    ethers.parseEther("100");


  console.log("Verifying contract...");


  await verifyContract(
    {
      address: contractAddress,
      constructorArgs: [
        treasuryWallet,
        feeToken,
        feeAmount
      ],
      provider: "etherscan",
    },
    hre
  );


  console.log("✅ Verified successfully");
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});