import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  console.log("🚀 Deploying FairLaunchFactory...");

  // ===== CONFIG =====

  const defaultRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
  const soltToken = "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";
  const treasuryWallet = "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";
  const platformFeeWallet = "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";

  const antiBotBlocks = 2;
  const platformFeePercent = 2;
  const maxClaimDelay = 30;
  const slippagePercent = 2;

  // ===================

  const FairLaunchFactory =
    await ethers.getContractFactory("FairLaunchFactory");

  const fairLaunchFactory = await FairLaunchFactory.deploy(
    defaultRouter,
    soltToken,
    treasuryWallet,
    platformFeeWallet,
    antiBotBlocks,
    platformFeePercent,
    maxClaimDelay,
    slippagePercent
  );

  await fairLaunchFactory.waitForDeployment();

  const address = await fairLaunchFactory.getAddress();

  console.log("✅ FairLaunchFactory deployed successfully!");
  console.log("📍Address:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});