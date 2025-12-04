import { createWriteStream, readdirSync, statSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = join(__dirname, "../publishDir");
const outputPath = join(__dirname, "../extension.zip");

// 需要排除的文件和目录
const excludePatterns = [
  /\.git/,
  /node_modules/,
  /\.DS_Store/,
  /Thumbs\.db/,
  /\.zip$/,
];

/**
 * 检查文件是否应该被排除
 */
function shouldExclude(filePath) {
  return excludePatterns.some((pattern) => pattern.test(filePath));
}

/**
 * 创建 zip 包
 */
function createZip() {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // 最高压缩级别
    });

    output.on("close", () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`[打包] 完成！文件大小: ${sizeInMB} MB`);
      console.log(`[打包] 输出路径: ${outputPath}`);
      resolve();
    });

    archive.on("error", (err) => {
      console.error("[打包] 错误:", err);
      reject(err);
    });

    archive.pipe(output);

    // 添加 publishDir 目录中的所有文件
    function addDirectory(dir, baseDir = dir) {
      const files = readdirSync(dir);

      for (const file of files) {
        const filePath = join(dir, file);
        const relativePath = relative(baseDir, filePath);

        if (shouldExclude(relativePath)) {
          console.log(`[打包] 跳过: ${relativePath}`);
          continue;
        }

        const stat = statSync(filePath);

        if (stat.isDirectory()) {
          addDirectory(filePath, baseDir);
        } else {
          archive.file(filePath, { name: relativePath });
          console.log(`[打包] 添加: ${relativePath}`);
        }
      }
    }

    addDirectory(sourceDir, sourceDir);

    archive.finalize();
  });
}

createZip().catch((error) => {
  console.error("[打包] 失败:", error);
  // eslint-disable-next-line no-undef
  process.exit(1);
});

