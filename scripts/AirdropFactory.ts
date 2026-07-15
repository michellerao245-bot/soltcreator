import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  const { ethers: hhEthers } = await hre.network.connect();

  console.log("🚀 Deploying AirdropFactory...");

  const treasuryWallet = "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";
  const feeToken = "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";

  // 6000 SOLT
  const feeAmount = ethers.parseUnits("6000", 18);

  const Factory = await hhEthers.getContractFactory("AirdropFactory");

  const factory = await Factory.deploy(
    treasuryWallet,
    feeToken,
    feeAmount
  );

  await factory.waitForDeployment();

  console.log("✅ AirdropFactory deployed successfully!");
  console.log("📍Address:", await factory.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});