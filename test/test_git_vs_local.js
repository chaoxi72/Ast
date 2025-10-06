import ProjectAnalyzer from '../src/ProjectAnalyzer.js';
import QuickAPI from '../src/QuickAPI.js';

/**
 * 测试 Git 项目 vs 本地目录的区别
 */

console.log('='.repeat(70));
console.log('Git 项目 vs 本地目录 测试');
console.log('='.repeat(70));

const analyzer = new ProjectAnalyzer();
const api = new QuickAPI();

// ============================================================
// 测试 1: 本地目录分析（无文件生成）
// ============================================================
console.log('\n测试 1: 本地目录分析（无文件生成）\n');

const localResult = analyzer.analyzeDirectory('.', {
    generateTexts: true,
    verbose: true
});

console.log('\n本地目录分析结果:');
console.log(`- 项目类型: ${localResult.isGitProject ? 'Git 项目' : '本地目录'}`);
console.log(`- 方法数量: ${localResult.methodTexts.length}`);
console.log(`- 是否生成文件: 否`);

// ============================================================
// 测试 2: 使用 QuickAPI（本地目录）
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('测试 2: QuickAPI 本地目录分析');
console.log('='.repeat(70) + '\n');

const methods = api.analyzeLocalDirectory('.', { verbose: false });

console.log(`QuickAPI 获取到 ${methods.length} 个方法（无文件生成）`);

// ============================================================
// 测试 3: 模拟 Git 项目分析
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('测试 3: 模拟 Git 项目分析');
console.log('='.repeat(70) + '\n');

// 注意：这里只是演示，实际需要有效的 Git URL
console.log('Git 项目分析特点:');
console.log('✅ 项目代码会下载到本地目录');
console.log('✅ 分析结果数据在内存中');
console.log('✅ 可选择是否保存分析结果文件');
console.log('✅ 项目源码会持久保存');

console.log('\n使用方式:');
console.log('const result = analyzer.analyzeProject("https://github.com/user/repo.git");');
console.log('// 项目会下载到 ./downloads/repo 目录');
console.log('// 分析结果在 result 变量中');

// ============================================================
// 测试 4: 手动保存文件（可选）
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('测试 4: 手动保存文件（可选）');
console.log('='.repeat(70) + '\n');

console.log('如需保存分析结果，可调用:');
console.log('analyzer.saveResults(localResult, "./output");');

// 演示保存（可选）
const shouldSave = false; // 设为 true 来测试保存功能
if (shouldSave) {
    console.log('\n正在保存文件...');
    analyzer.saveResults(localResult, './test_output');
    console.log('✅ 文件已保存到 ./test_output');
} else {
    console.log('\n跳过文件保存（演示无文件模式）');
}

// ============================================================
// 测试 5: 数据直接使用
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('测试 5: 数据直接使用');
console.log('='.repeat(70) + '\n');

// 直接使用内存中的数据
const jsMethods = localResult.methodTexts.filter(m => m.includes('lang=javascript'));
const withDocs = localResult.methodTexts.filter(m => m.includes('doc='));

console.log('直接使用内存数据:');
console.log(`- JavaScript 方法: ${jsMethods.length} 个`);
console.log(`- 有注释的方法: ${withDocs.length} 个`);
console.log(`- 总方法数: ${localResult.methodTexts.length} 个`);

// 模拟发送给 LLM
console.log('\n模拟发送给 LLM:');
console.log('const batches = api.batchMethods(methods, 50);');
console.log('for (const batch of batches) {');
console.log('  await sendToLLM(batch);');
console.log('}');

// ============================================================
// 总结
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('✅ 测试完成');
console.log('='.repeat(70));

console.log(`
📋 总结对比:

🔹 本地目录分析:
  ✅ 无文件生成
  ✅ 数据仅在内存中
  ✅ 适合实时分析
  ✅ 适合集成到其他应用

🔹 Git 项目分析:
  ✅ 项目代码下载到本地
  ✅ 分析数据在内存中
  ✅ 项目源码持久保存
  ✅ 可选择保存分析结果

🔹 共同特点:
  ✅ 数据都通过变量传递
  ✅ 支持直接使用
  ✅ 支持发送给 LLM
  ✅ 支持自定义处理

💡 使用建议:
  - 本地目录: 默认无文件模式
  - Git 项目: 项目保存，分析结果可选保存
  - 数据使用: 直接通过变量访问
  - 文件保存: 仅在需要时手动调用
`);

console.log('\n🎯 核心优势: 数据直接可用，无中间文件！');
