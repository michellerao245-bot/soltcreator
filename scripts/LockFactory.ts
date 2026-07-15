import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  console.log("🚀 Deploying LockFactory...");

  const treasuryWallet = "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";
  const feeToken = "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";
  const feeAmount = ethers.parseUnits("6000", 18);

  const LockFactory = await ethers.getContractFactory("LockFactory");

  const lockFactory = await LockFactory.deploy(
    treasuryWallet,
    feeToken,
    feeAmount
  );

  await lockFactory.waitForDeployment();

  const address = await lockFactory.getAddress();

  console.log("✅ LockFactory deployed successfully!");
  console.log("📍Address:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});