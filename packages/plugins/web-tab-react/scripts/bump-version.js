import { readFileSync, writeFileSync, appendFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const manifestPath = join(__dirname, "../publishDir/manifest.json");

/**
 * 递增版本号（patch 版本）
 * @param {string} version - 当前版本号，格式：x.y.z
 * @returns {string} - 递增后的版本号
 */
function bumpVersion(version) {
  const parts = version.split(".").map(Number);
  
  if (parts.length !== 3) {
    throw new Error(`无效的版本号格式: ${version}，应为 x.y.z`);
  }
  
  // 递增 patch 版本
  parts[2] += 1;
  
  return parts.join(".");
}

/**
 * 读取并更新 manifest.json 中的版本号
 */
function updateVersion() {
  try {
    // 读取 manifest.json
    const manifestContent = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);
    
    const currentVersion = manifest.version;
    if (!currentVersion) {
      throw new Error("manifest.json 中未找到 version 字段");
    }
    
    console.log(`[版本递增] 当前版本: ${currentVersion}`);
    
    // 递增版本号
    const newVersion = bumpVersion(currentVersion);
    manifest.version = newVersion;
    
    // 写回文件
    writeFileSync(
      manifestPath,
      JSON.stringify(manifest, null, 4) + "\n",
      "utf-8"
    );
    
    console.log(`[版本递增] 新版本: ${newVersion}`);
    
    // 输出新版本号供 workflow 使用（GitHub Actions 新格式）
    const githubOutput = process.env.GITHUB_OUTPUT;
    if (githubOutput) {
      appendFileSync(githubOutput, `version=${newVersion}\n`);
    }
    
    return newVersion;
  } catch (error) {
    console.error("[版本递增] 错误:", error.message);
    process.exit(1);
  }
}

updateVersion();

