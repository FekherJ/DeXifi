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
  "DEXRouter.sol": "swap_abi.json",
  "LiquidityPool.sol": "LiquidityPool_abi.json",
  "Staking.sol": "staking_abi.json"
};

// Function to copy ABI files with renaming support
const copyAbiFiles = (dir) => {
  const files = readdirSync(dir);
  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      copyAbiFiles(filePath);
    } else if (file.endsWith(".json")) {
      const fileContent = JSON.parse(readFileSync(filePath, "utf8"));

      if (fileContent.abi) {
        // Determine the correct filename
        const contractName = basename(file, ".json");
        let abiFileName = `${contractName}_abi.json`;

        // Rename based on the mapping
        Object.keys(abiMapping).forEach((contractFile) => {
          if (filePath.includes(contractFile)) {
            abiFileName = abiMapping[contractFile];
          }
        });

        const abiFilePath = join(abiDir, abiFileName);

        writeFileSync(abiFilePath, JSON.stringify(fileContent.abi, null, 2));
        console.log(`✅ Copied ABI: ${abiFileName}`);
      }
    }
  });
};

// Start copying
copyAbiFiles(artifactsDir);
console.log("✅ ABI copying completed.");
