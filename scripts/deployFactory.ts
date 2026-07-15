import hre from "hardhat";

async function main() {

  const { ethers } = await hre.network.connect();

  const treasuryWallet =
    "0x5516806DB3b02bE4699225CeEF5a14dd087315fF";

  // SOLT Token Address डालो यहां
  const feeToken =
    "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";

  // Fee amount (SOLT decimals 18 मानकर)
  const feeAmount =
    ethers.parseEther("100");

  console.log("Deploying PresaleFactory...");

  const factory = await ethers.deployContract(
    "PresaleFactory",
    [
      treasuryWallet,
      feeToken,
      feeAmount
    ]
  );


  await factory.waitForDeployment();

  const address = await factory.getAddress();


  console.log("====================================");
  console.log("PresaleFactory deployed:");
  console.log(address);
  console.log("====================================");


  const tx = factory.deploymentTransaction();

  if(tx){
    console.log("Waiting confirmations...");
    await tx.wait(10);
  }


  console.log("Deployment completed");
}


main().catch((error)=>{
  console.error(error);
  process.exitCode = 1;
});