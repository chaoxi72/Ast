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
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\r?\n/g, ' ');
            // 说明：escapedMethod 是将原始方法文本进行必要的转义与压平成单行后的安全字符串，
            // 仅改变表示形式以便安全传入命令行，不改变其语义内容。

            // 构造强化提示词：
            // 1) 先要求用中文描述该方法/函数的含义（功能、参数、返回值、关键流程）
            // 2) 明确要求检查是否存在编写错误与风险点（逻辑/边界/空值/异常/资源/并发/类型等）
            // 3) 给出修改建议与风险等级
            const analysisInstruction =
                '请用中文先概述下面方法/函数的核心含义（功能、参数、返回值、关键流程），' +
                '再严格审查其实现是否存在任何编写错误或风险点，包括但不限于：逻辑错误、边界条件遗漏、' +
                '空指针/空值风险、异常处理不当、资源泄漏、并发竞争、未初始化变量、类型不匹配、平台差异等；' +
                '最后给出明确的修改建议与风险等级。方法内容：';

            const enhancedPrompt = `${analysisInstruction}${escapedMethod}`;

            // 执行 himile 命令并捕获输出
            const output = execSync(`himile -p "${enhancedPrompt}"`, {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            // 保存结果到文件
            const resultFile = path.join(resultsDir, `method_${index + 1}_result.txt`);
            const resultContent = `方法描述:\n${method}\n\n分析结果:\n${output}\n\n---\n`;
            
            fs.writeFileSync(resultFile, resultContent, 'utf8');
            const preview = (output || '').slice(0, 200).replace(/\r?\n/g, ' ');
            console.log(`✅ 第 ${index + 1} 个方法分析完成，结果已保存到: ${resultFile} | 输出预览: ${preview}`);
            
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
