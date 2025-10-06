import ProjectAnalyzer from '../src/ProjectAnalyzer.js';
import TextGenerator from '../src/TextGenerator.js';
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * 分析 pybind11 项目
 * Git URL: https://gitee.com/chaoxi72/pybind11.git
 */

console.log('='.repeat(70));
console.log('pybind11 项目分析');
console.log('='.repeat(70));

const analyzer = new ProjectAnalyzer();
// 直接在 URL 中写入 Git 账户与密码（注意：请替换为实际账户与密码）
const gitUsername = 'chaoxi72';
const gitPassword = 'infinite021227';
const gitUrl = `https://${encodeURIComponent(gitUsername)}:${encodeURIComponent(gitPassword)}@gitee.com/chaoxi72/pybind11.git`;
const outputDir = './downloads/pybind11';

console.log(`\nGit URL: ${gitUrl}`);
console.log(`下载目录: ${outputDir}\n`);

try {
    // 分析项目
    const result = analyzer.analyzeProject(gitUrl, {
        targetDir: outputDir,
        progressCallback: (current, total, file) => {
            // 每 20 个文件显示一次进度
            if (current % 20 === 0 || current === total) {
                process.stdout.write(`\r  解析进度: ${current}/${total} 文件 (${Math.round(current/total*100)}%)`);
            }
        },
        generateTexts: true,
        verbose: true
    });
    
    // 创建结果保存目录
    const resultsDir = path.join(outputDir, 'himile_results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    console.log(`\n开始执行 himile 分析，结果将保存到: ${resultsDir}\n`);
    
    // 执行 himile 分析并保存结果
    result.methodTexts.forEach((method, index) => {
        try {
            console.log(`正在分析第 ${index + 1}/${result.methodTexts.length} 个方法...`);
            
            // 先对 method 做转义，避免特殊字符破坏命令行
            const escapedMethod = String(method)
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\r?\n/g, ' ');

            // 执行 himile 命令并捕获输出
            const output = execSync(`himile -p "${escapedMethod}"`, {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            // 保存结果到文件
            const resultFile = path.join(resultsDir, `method_${index + 1}_result.txt`);
            const resultContent = `方法描述:\n${method}\n\n分析结果:\n${output}\n\n---\n`;
            
            fs.writeFileSync(resultFile, resultContent, 'utf8');
            console.log(`✅ 第 ${index + 1} 个方法分析完成，结果已保存到: ${resultFile}`);
            
        } catch (error) {
            console.error(`❌ 第 ${index + 1} 个方法分析失败: ${error.message}`);
            
            // 即使失败也保存错误信息
            const errorFile = path.join(resultsDir, `method_${index + 1}_error.txt`);
            const errorContent = `方法描述:\n${method}\n\n错误信息:\n${error.message}\n\n---\n`;
            fs.writeFileSync(errorFile, errorContent, 'utf8');
        }
    });
    
    console.log(`\n🎉 所有 himile 分析完成！结果已保存到: ${resultsDir}`);
    
} catch (error) {
    console.error('\n❌ 分析失败:', error.message);
    console.error('\n错误详情:');
    console.error(error.stack);
    process.exit(1);
}
