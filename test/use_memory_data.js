import QuickAPI from '../src/QuickAPI.js';

/**
 * 演示如何使用内存数据（无文件生成）
 */

console.log('='.repeat(70));
console.log('内存数据使用示例 - 无中间文件');
console.log('='.repeat(70));

const api = new QuickAPI();

// ============================================================
// 示例 1: 获取方法列表
// ============================================================
console.log('\n示例 1: 获取方法列表\n');

const methods = api.analyzeLocalDirectory('.', { verbose: false });

console.log(`获取到 ${methods.length} 个方法（数据在内存中）\n`);

// 直接使用数据
console.log('前 5 个方法:');
methods.slice(0, 5).forEach((method, index) => {
    console.log(`  [${index + 1}] ${method}`);
});

// ============================================================
// 示例 2: 筛选特定语言
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('示例 2: 筛选 JavaScript 方法');
console.log('='.repeat(70) + '\n');

const jsMethods = api.filterByLanguage(methods, 'javascript');
console.log(`找到 ${jsMethods.length} 个 JavaScript 方法`);

// ============================================================
// 示例 3: 筛选有注释的方法
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('示例 3: 筛选有注释的方法');
console.log('='.repeat(70) + '\n');

const methodsWithDocs = methods.filter(m => m.includes('doc='));
console.log(`找到 ${methodsWithDocs.length} 个有注释的方法\n`);

// 显示几个有注释的方法
console.log('示例（前 3 个）:');
methodsWithDocs.slice(0, 3).forEach((method, index) => {
    const docMatch = method.match(/doc="([^"]+)"/);
    const doc = docMatch ? docMatch[1].substring(0, 60) : '';
    const methodPart = method.split(' doc=')[0];
    
    console.log(`  [${index + 1}] ${methodPart}`);
    console.log(`      注释: ${doc}...`);
});

// ============================================================
// 示例 4: 分批处理（用于发送给 LLM）
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('示例 4: 分批处理（用于 LLM）');
console.log('='.repeat(70) + '\n');

const batches = api.batchMethods(methods, 30);
console.log(`共 ${batches.length} 批，每批最多 30 个方法\n`);

// 模拟发送给 LLM
function sendToLLM(batch, batchIndex) {
    console.log(`批次 ${batchIndex + 1}:`);
    console.log(`  方法数: ${batch.length}`);
    console.log(`  Token 估算: ~${api.estimateTokens(batch)}`);
    
    // 这里可以调用实际的 LLM API
    // await openai.chat.completions.create({ ... })
    
    return { success: true, count: batch.length };
}

// 处理前 3 批作为演示
console.log('模拟处理:');
batches.slice(0, 3).forEach((batch, index) => {
    sendToLLM(batch, index);
});

console.log(`\n... 还有 ${batches.length - 3} 批待处理`);

// ============================================================
// 示例 5: 获取完整分析结果
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('示例 5: 获取完整分析结果');
console.log('='.repeat(70) + '\n');

const fullResult = api.analyzeLocalDirectoryFull('.', { verbose: false });

console.log('完整结果包含:');
console.log(`  - methodTexts: ${fullResult.methodTexts.length} 个方法`);
console.log(`  - allTexts: ${fullResult.allTexts.length} 个元素`);
console.log(`  - parseResults: ${fullResult.parseResults.length} 个文件`);
console.log(`  - stats: 统计信息`);

// ============================================================
// 示例 6: 直接处理 JSON 数据
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('示例 6: 直接处理 JSON 数据');
console.log('='.repeat(70) + '\n');

// 提取所有类名
const classNames = new Set();
fullResult.parseResults.forEach(item => {
    if (item.result.classes) {
        item.result.classes.forEach(cls => {
            classNames.add(cls.name);
        });
    }
});

console.log(`找到 ${classNames.size} 个类:`);
Array.from(classNames).slice(0, 10).forEach((name, index) => {
    console.log(`  [${index + 1}] ${name}`);
});

// ============================================================
// 示例 7: 生成统计信息
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('示例 7: 生成统计信息');
console.log('='.repeat(70) + '\n');

const stats = api.generateStats(fullResult);

console.log('项目统计:');
console.log(`  总文件数: ${stats.totalFiles}`);
console.log(`  解析成功: ${stats.parsedFiles}`);
console.log(`  方法总数: ${stats.methodCount}`);
console.log(`  估算 Token: ${stats.estimatedTokens}`);
console.log('\n语言分布:', stats.languages);

// ============================================================
// 示例 8: 自定义数据处理
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('示例 8: 自定义数据处理');
console.log('='.repeat(70) + '\n');

// 找出方法最多的文件
const fileMethodCounts = {};
fullResult.parseResults.forEach(item => {
    let count = 0;
    if (item.result.classes) {
        item.result.classes.forEach(cls => {
            count += (cls.methods || []).length;
        });
    }
    if (item.result.functions) {
        count += item.result.functions.length;
    }
    if (count > 0) {
        fileMethodCounts[item.file] = count;
    }
});

const topFiles = Object.entries(fileMethodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

console.log('方法最多的 5 个文件:');
topFiles.forEach(([file, count], index) => {
    console.log(`  [${index + 1}] ${file}: ${count} 个方法`);
});

// ============================================================
// 总结
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('✅ 演示完成');
console.log('='.repeat(70));

console.log(`
核心要点:
  ✅ 所有数据都在内存中（变量中）
  ✅ 无需生成任何中间文件
  ✅ 可以直接处理、筛选、转换数据
  ✅ 可以直接发送给 LLM 或其他服务
  ✅ 如需保存，可随时调用 saveResults()
  
数据结构:
  - methods (数组)          - 方法文本列表
  - fullResult.methodTexts  - 方法文本数组
  - fullResult.allTexts     - 完整文本数组
  - fullResult.parseResults - JSON 解析结果
  - fullResult.stats        - 统计信息
  
使用场景:
  1. 发送给 LLM API
  2. 实时数据分析
  3. 动态筛选和过滤
  4. 与其他系统集成
  5. 构建 Web API 服务
`);
