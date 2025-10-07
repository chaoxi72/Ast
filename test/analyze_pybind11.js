import ProjectAnalyzer from '../src/ProjectAnalyzer.js';
import TextGenerator from '../src/TextGenerator.js';
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * 分析项目（精简版）：
 * 必需：--git-url 或环境变量 GIT_URL（完整克隆地址）
 * 可选：GIT_USERNAME / GIT_PASSWORD（若 URL 未含认证信息，将自动注入）
 * 可选：--output-dir / OUTPUT_DIR（分析输出目录；默认按仓库名生成）
 */

console.log('='.repeat(70));
console.log('pybind11 项目分析');
console.log('='.repeat(70));

const analyzer = new ProjectAnalyzer();

// 解析参数与环境变量（仅支持完整地址与凭据注入）
const argv = process.argv.slice(2);
const argMap = Object.fromEntries(
	argv
		.filter(a => a.startsWith('--'))
		.map(a => {
			const eqIndex = a.indexOf('=');
			if (eqIndex === -1) return [a.replace(/^--/, ''), 'true'];
			const k = a.slice(2, eqIndex);
			const v = a.slice(eqIndex + 1);
			return [k, v];
		})
);

// 兼容位置参数形式（如通过 npm run 传参时 URL 作为第一个非 -- 开头参数）
const positionalUrl = (argv.find(a => !a.startsWith('--')) || '').trim();
const providedGitUrl = (argMap['git-url'] || process.env.GIT_URL || positionalUrl || '').trim();
const username = (process.env.GIT_USERNAME || '').trim();
const password = (process.env.GIT_PASSWORD || '').trim();

function urlHasAuthInfo(urlString) {
	try {
		const u = new URL(urlString);
		return Boolean(u.username || u.password);
	} catch (_) {
		return /:\/\//.test(urlString) && /@/.test(urlString);
	}
}

let gitUrl = providedGitUrl;
if (!gitUrl) {
	throw new Error('缺少 GIT_URL（或 --git-url）。请提供完整克隆地址。');
}
if (username && password && !urlHasAuthInfo(gitUrl)) {
	try {
		const u = new URL(gitUrl);
		u.username = encodeURIComponent(username);
		u.password = encodeURIComponent(password);
		gitUrl = u.toString();
	} catch (_) {
		const match = gitUrl.match(/^(https?):\/\/(.*)$/i);
		if (match) {
			gitUrl = `${match[1]}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${match[2]}`;
		}
	}
}

function deriveRepoName(urlOrPath) {
	try {
		const u = new URL(urlOrPath);
		const last = u.pathname.split('/').filter(Boolean).pop() || 'repo';
		return last.replace(/\.git$/i, '');
	} catch (_) {
		const last = (urlOrPath || '').split('/').filter(Boolean).pop() || 'repo';
		return last.replace(/\.git$/i, '');
	}
}

const defaultRepoName = deriveRepoName(providedGitUrl);
const outputDir = (argMap['output-dir'] || process.env.OUTPUT_DIR || `./downloads/${defaultRepoName}`).trim();

console.log(`\nGit URL: ${gitUrl}`);
console.log(`下载目录: ${outputDir}\n`);

// 构造强化提示词（在外部定义，避免重复创建）
const analysisInstruction =
    '请使用中文系统分析以下提供的方法/函数，按如下步骤执行：' +
    '1️.【功能概述】简述该方法/函数的核心作用、输入参数、返回值、关键逻辑流程，以及它在项目中可能承担的角色；' +
    '2️.【调用上下文分析（必须）】在分析前，先检索并理解该方法在整个项目或所在类中的调用关系，明确它的调用方、被调用方及依赖模块，' +
    '以判断该方法的实际用途、逻辑位置是否合理，以及上下游接口是否匹配。若项目上下文不完整，请说明分析受限部分；' +
    '3️.【实现审查】结合调用上下文，严格检查实现中可能存在的任何问题，包括但不限于：' +
    '逻辑错误、边界条件遗漏、空指针或空值风险、异常处理不当、资源未释放、并发竞争、未初始化变量、类型不匹配、性能隐患、平台兼容性问题等；' +
    '4️.【功能与设计完善】除发现错误外，请从可维护性、可扩展性、性能优化、代码可读性、安全性、异常鲁棒性等角度，' +
    '提出该方法在功能或设计上的改进建议；' +
    '5️.【结论与建议】最后，汇总审查结果，明确指出：是否存在问题、风险等级（低/中/高）、修改或优化建议及理由。' +
    '请按照以下格式输出：\n' +
    '【功能概述】\n' +
    '（简述功能、参数、返回值）\n\n' +
    '【调用上下文分析】\n' +
    '（说明调用关系、上下游依赖及合理性）\n\n' +
    '【实现审查】\n' +
    '（列出问题与原因）\n\n' +
    '【功能与设计完善】\n' +
    '（提出优化与增强建议）\n\n' +
    '【结论与建议】\n' +
    '（总结风险等级与修改方向）';

/**
 * 执行 himile 分析并返回结果
 * @param {string} methodText - 方法的文本描述
 * @param {string} cwd - 执行命令的工作目录
 * @returns {string} himile 分析输出
 */
async function analyzeMethodWithHimile(methodText, cwd) {
    try {
        // 先对 methodText 做转义，避免特殊字符破坏命令行
        const escapedMethod = String(methodText)
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\r?\n/g, ' ');
        // 说明：escapedMethod 是将原始方法文本进行必要的转义与压平成单行后的安全字符串，
        // 仅改变表示形式以便安全传入命令行，不改变其语义内容。

        const enhancedPrompt = `${analysisInstruction}${escapedMethod}`;

        // 执行 himile 命令并捕获输出
        const output = execSync(`himile -p "${enhancedPrompt}"`, {
            encoding: 'utf8',
            stdio: 'pipe',
            cwd: cwd // 将 bash 工作目录切换到下载的 Git 项目目录
        });
        return output;
    } catch (error) {
        console.error(`❌ 方法分析失败: ${error.message}`);
        return `分析失败: ${error.message}`; // 返回错误信息而非抛出，以便继续处理其他方法
    }
}

(async () => {
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
        
        console.log(`
开始执行 himile 分析，结果将保存到: ${resultsDir}
`);
        
        // 执行 himile 分析并保存结果
        const allFileAnalysisResults = {}; // 存储按文件、类分组的分析结果

        for (const fileResult of result.parseResults) {
            const relativeFilePath = fileResult.file;
            allFileAnalysisResults[relativeFilePath] = {
                functions: {},
                classes: {}
            };
            const fileContent = fileResult.result; // CompleteExtractor 的原始 JSON 结果

            console.log(`
--- 正在分析文件: ${relativeFilePath} ---`);

            // 分析顶层函数
            if (fileContent.functions && fileContent.functions.length > 0) {
                for (const func of fileContent.functions) {
                    const funcName = func.name;
                    const funcText = TextGenerator._formatMethodText(func, null, relativeFilePath, fileContent.language);
                    console.log(`  正在分析顶层函数: ${funcName}`);
                    const analysisOutput = await analyzeMethodWithHimile(funcText, outputDir);
                    allFileAnalysisResults[relativeFilePath].functions[funcName] = analysisOutput;
                }
            }

            // 分析类中的方法
            if (fileContent.classes && fileContent.classes.length > 0) {
                for (const cls of fileContent.classes) {
                    const className = cls.name;
                    allFileAnalysisResults[relativeFilePath].classes[className] = {};
                    if (cls.methods && cls.methods.length > 0) {
                        for (const method of cls.methods) {
                            const methodName = method.name;
                            const methodText = TextGenerator._formatMethodText(method, cls, relativeFilePath, fileContent.language);
                            console.log(`  正在分析类 ${className} 的方法: ${methodName}`);
                            const analysisOutput = await analyzeMethodWithHimile(methodText, outputDir);
                            allFileAnalysisResults[relativeFilePath].classes[className][methodName] = analysisOutput;
                        }
                    }
                }
            }
        }

        // 将所有分析结果合并并保存
        for (const [filePath, fileAnalysis] of Object.entries(allFileAnalysisResults)) {
            let fileOutputContent = `文件: ${filePath}
${'='.repeat(70)}

`;

            // 合并顶层函数结果
            for (const [funcName, output] of Object.entries(fileAnalysis.functions)) {
                fileOutputContent += `【顶层函数】: ${funcName}
`;
                fileOutputContent += `${output}

`;
            }

            // 合并类及其方法结果
            for (const [className, classMethods] of Object.entries(fileAnalysis.classes)) {
                fileOutputContent += `【类】: ${className}
${'-'.repeat(60)}
`;
                for (const [methodName, output] of Object.entries(classMethods)) {
                    fileOutputContent += `  【方法】: ${methodName}
`;
                    fileOutputContent += `  ${output.replace(/\n/g, '\n  ')}

`; // 格式化输出，保持缩进
                }
                fileOutputContent += `
`;
            }

            const resultFile = path.join(resultsDir, `${filePath.replace(/\\/g, '_').replace(/\//g, '_')}_analysis.txt`);
            fs.writeFileSync(resultFile, fileOutputContent, 'utf8');
            console.log(`✅ 文件 ${filePath} 的分析结果已保存到: ${resultFile}`);
        }

        console.log(`
🎉 所有 himile 分析完成！结果已保存到: ${resultsDir}`);
        
    } catch (error) {
        console.error('\n❌ 分析失败:', error.message);
        console.error('\n错误详情:');
        console.error(error.stack);
        process.exit(1);
    }
})();
