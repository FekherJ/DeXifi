// used for front end integration
import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, basename } from "path";

// Paths
const artifactsDir = join(process.cwd(), "artifacts/contracts");
const abiDir = join(process.cwd(), "abi");

// Ensure the ABI directory exists
if (!existsSync(abiDir)) {
  mkdirSync(abiDir);
}

// Explicit mapping for renaming ABIs
const abiMapping = {
  "DEXRouter.sol": "DEXRouter_abi.json",
  "LiquidityPool.sol": "LiquidityPool_abi.json",
  "Staking.sol": "staking_abi.json",
  "ERC20Mock.sol": "ERC20Mock_abi.json",
};

// Function to copy ABI files with renaming support
const copyAbiFiles = (dir) => {
  const files = readdirSync(dir);
  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      copyAbiFiles(filePath); // Recursively search subdirectories
    } else if (file.endsWith(".json") && !file.endsWith(".dbg.json")) { // Skip debug files
      try {
        const fileContent = JSON.parse(readFileSync(filePath, "utf8"));

        if (fileContent.abi) {
          const contractName = basename(file, ".json");
          let abiFileName = `${contractName}_abi.json`;

          // Apply custom naming if the contract is mapped
          Object.keys(abiMapping).forEach((contractFile) => {
            if (filePath.includes(contractFile)) {
              abiFileName = abiMapping[contractFile];
            }
          });

          const abiFilePath = join(abiDir, abiFileName);
          writeFileSync(abiFilePath, JSON.stringify(fileContent.abi, null, 2));

          console.log(`✅ Copied ABI: ${abiFileName}`);
        } else {
          console.warn(`⚠️ No ABI found in ${file}`);
        }
      } catch (error) {
        console.error(`❌ Error reading ABI from ${file}:`, error.message);
      }
    }
  });
};

// Start copying
copyAbiFiles(artifactsDir);
console.log("✅ ABI copying completed.");
