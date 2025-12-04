import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = join(__dirname, "../dist");
const targetDir = join(__dirname, "../publishDir");

// 确保目标目录存在
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

// 复制文件的辅助函数
function copyRecursive(src, dest) {
  const stat = statSync(src);

  if (stat.isDirectory()) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }

    const files = readdirSync(src);
    for (const file of files) {
      copyRecursive(join(src, file), join(dest, file));
    }
  } else {
    copyFileSync(src, dest);
  }
}

// 复制 dist 目录中的所有文件到 publishDir 目录
function copyDistFiles() {
  if (!existsSync(sourceDir)) {
    console.error("[构建脚本] 错误: dist 目录不存在，请先运行构建命令");
    // eslint-disable-next-line no-undef
    process.exit(1);
  }

  console.log("[构建脚本] 开始复制文件到 publishDir 目录...");

  // 复制所有文件（除了 manifest.json，保留原有的）
  const files = readdirSync(sourceDir);
  for (const file of files) {
    const srcPath = join(sourceDir, file);
    const destPath = join(targetDir, file);

    // 跳过 manifest.json，保留 publishDir 目录中的原有版本
    if (file === "manifest.json") {
      console.log("[构建脚本] 跳过 manifest.json（保留原有版本）");
      continue;
    }

    copyRecursive(srcPath, destPath);
    console.log(`[构建脚本] 已复制: ${file}`);
  }

  console.log("[构建脚本] 文件复制完成！");
}

copyDistFiles();
