import ProjectAnalyzer from '../src/ProjectAnalyzer.js';
import path from 'path';
import fs from 'fs';

/**
 * 分析本地项目（不需要 Git）
 * 使用方法: node test/analyze_local_project.js <项目路径>
 */

// 从命令行获取项目路径
const args = process.argv.slice(2);
let projectPath = args[0];

if (!projectPath) {
    console.error('❌ 请提供项目路径');
    console.log('\n用法: node test/analyze_local_project.js <项目路径>');
    console.log('\n示例:');
    console.log('  node test/analyze_local_project.js ./my-project');
    console.log('  node test/analyze_local_project.js D:\\Projects\\pybind11');
    console.log('  node test/analyze_local_project.js ../');
    process.exit(1);
}

// 检查路径是否存在
if (!fs.existsSync(projectPath)) {
    console.error(`❌ 路径不存在: ${projectPath}`);
    process.exit(1);
}

console.log('='.repeat(70));
console.log('项目代码分析');
console.log('='.repeat(70));

const analyzer = new ProjectAnalyzer();
projectPath = path.resolve(projectPath);

console.log(`\n项目路径: ${projectPath}\n`);

try {
    // 分析项目
    const result = analyzer.analyzeDirectory(projectPath, {
        progressCallback: (current, total, file) => {
            // 每 20 个文件显示一次进度
            if (current % 20 === 0 || current === total) {
                process.stdout.write(`\r  解析进度: ${current}/${total} 文件 (${Math.round(current/total*100)}%)`);
            }
        },
        generateTexts: true,
        verbose: true
    });
    
    console.log('\n');
    
    // 显示详细统计
    console.log('='.repeat(70));
    console.log('分析统计:');
    console.log('='.repeat(70));
    console.log(`\n总文件数: ${result.stats.totalFiles}`);
    console.log(`解析成功: ${result.stats.parsedFiles}`);
    console.log(`方法总数: ${result.stats.methodCount}`);
    
    if (Object.keys(result.stats.languageStats).length > 0) {
        console.log('\n语言分布:');
        Object.entries(result.stats.languageStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([lang, count]) => {
                console.log(`  ${lang.padEnd(12)}: ${count} 文件`);
            });
        
        // 按语言分组统计方法数
        console.log('\n方法分布:');
        const methodsByLang = {};
        result.methodTexts.forEach(text => {
            const match = text.match(/lang=(\w+)/);
            if (match) {
                const lang = match[1];
                methodsByLang[lang] = (methodsByLang[lang] || 0) + 1;
            }
        });
        
        Object.entries(methodsByLang)
            .sort((a, b) => b[1] - a[1])
            .forEach(([lang, count]) => {
                console.log(`  ${lang.padEnd(12)}: ${count} 个方法`);
            });
    }
    
    // 显示前 20 个方法示例
    if (result.methodTexts.length > 0) {
        console.log('\n' + '='.repeat(70));
        console.log('方法示例（前 20 个）:');
        console.log('='.repeat(70));
        console.log('');
        
        result.methodTexts.slice(0, 20).forEach((text, index) => {
            console.log(`[${(index + 1).toString().padStart(2, '0')}] ${text}`);
        });
        
        if (result.methodTexts.length > 20) {
            console.log(`\n... 还有 ${result.methodTexts.length - 20} 个方法`);
        }
        
        // 筛选有注释的方法
        console.log('\n' + '='.repeat(70));
        console.log('有注释的方法示例（前 10 个）:');
        console.log('='.repeat(70));
        console.log('');
        
        const methodsWithComments = result.methodTexts.filter(text => text.includes('doc='));
        console.log(`找到 ${methodsWithComments.length} 个有注释的方法\n`);
        
        if (methodsWithComments.length > 0) {
            methodsWithComments.slice(0, 10).forEach((text, index) => {
                // 提取注释部分
                const docMatch = text.match(/doc="([^"]+)"/);
                const docText = docMatch ? docMatch[1] : '';
                const methodPart = text.split(' doc=')[0];
                
                console.log(`[${(index + 1).toString().padStart(2, '0')}] ${methodPart}`);
                if (docText) {
                    console.log(`     注释: ${docText.substring(0, 80)}${docText.length > 80 ? '...' : ''}`);
                }
            });
        }
        
        // 按文件统计
        console.log('\n' + '='.repeat(70));
        console.log('文件分析（方法数最多的前 10 个文件）:');
        console.log('='.repeat(70));
        console.log('');
        
        const fileMethodCount = {};
        result.parseResults.forEach(item => {
            let methodCount = 0;
            
            if (item.result.classes) {
                item.result.classes.forEach(cls => {
                    methodCount += (cls.methods || []).length;
                });
            }
            
            if (item.result.functions) {
                methodCount += item.result.functions.length;
            }
            
            if (methodCount > 0) {
                fileMethodCount[item.file] = methodCount;
            }
        });
        
        const sortedFiles = Object.entries(fileMethodCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        sortedFiles.forEach(([file, count], index) => {
            const displayFile = file.length > 50 ? '...' + file.slice(-47) : file;
            console.log(`[${(index + 1).toString().padStart(2, '0')}] ${displayFile.padEnd(50)} : ${count} 个方法`);
        });
    }
    
    // 数据已在内存中，无需保存文件
    console.log('\n' + '='.repeat(70));
    console.log('数据访问方式:');
    console.log('='.repeat(70));
    
    console.log(`\n所有数据已在内存中，可直接访问：`);
    console.log('  - result.methodTexts      (方法文本数组)');
    console.log('  - result.allTexts         (完整文本数组)');
    console.log('  - result.parseResults     (JSON 解析结果)');
    console.log('  - result.stats            (统计信息)');
    console.log('\n如需保存文件，可调用：');
    console.log('  analyzer.saveResults(result, "./output")');
    
    // Token 估算
    if (result.methodTexts.length > 0) {
        console.log('\n' + '='.repeat(70));
        console.log('Token 估算（用于 LLM）:');
        console.log('='.repeat(70));
        
        const totalChars = result.methodTexts.join('\n').length;
        const estimatedTokens = Math.ceil(totalChars / 4);
        
        console.log(`\n方法文本总字符数: ${totalChars.toLocaleString()}`);
        console.log(`估算 Token 数: ${estimatedTokens.toLocaleString()}`);
        console.log(`平均每个方法: ${Math.ceil(estimatedTokens / result.methodTexts.length)} tokens`);
        
        // 分批建议
        const batchSize = 50;
        const totalBatches = Math.ceil(result.methodTexts.length / batchSize);
        console.log(`\n建议分批处理:`);
        console.log(`  批次大小: ${batchSize} 个方法/批`);
        console.log(`  总批次数: ${totalBatches} 批`);
        console.log(`  每批约: ${Math.ceil(estimatedTokens / totalBatches)} tokens`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ 项目分析完成！');
    console.log('='.repeat(70));
    
} catch (error) {
    console.error('\n❌ 分析失败:', error.message);
    console.error('\n错误详情:');
    console.error(error.stack);
    process.exit(1);
}
