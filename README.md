# 代码分析工具 - AST Extractor 🚀

一个强大的代码分析工具，可以从 Git 仓库或本地项目中提取代码结构信息，生成 LLM 友好的文本格式。

## ✨ 核心特性

- ✅ **多语言支持** - Java、Python、C#、JavaScript、TypeScript
- ✅ **注释提取** - 自动提取方法注释（JavaDoc、docstring、JSDoc等）
- ✅ **内存处理** - 无中间文件，数据直接在内存中传递
- ✅ **LLM 优化** - 生成简洁文本格式，节省 92% Token
- ✅ **Git 集成** - 支持直接从 Git 仓库分析
- ✅ **批量处理** - 自动递归扫描所有代码文件
- ✅ **详细统计** - 提供文件、方法、注释等统计信息

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 运行示例

```bash
# 分析当前项目
npm start

# 或分析指定目录
node test/analyze_local_project.js <项目路径>
```

---

## 📋 使用示例

### 示例 1: 分析本地项目

```bash
# 分析 pybind11 项目（假设已下载）
node test/analyze_local_project.js D:\Projects\pybind11

# 分析当前目录
node test/analyze_local_project.js .

# 分析父目录
node test/analyze_local_project.js ..
```

**输出示例**：
```
======================================================================
项目代码分析
======================================================================

总文件数: 250
解析成功: 245
方法总数: 1500

语言分布:
  cpp         : 180 文件
  python      : 65 文件

方法分布:
  cpp         : 1200 个方法
  python      : 300 个方法

结果已保存到: ./analysis_result
  - methods.txt     (所有方法列表)
  - all.txt         (完整分析列表)
  - analysis.json   (完整 JSON 数据)
  - stats.json      (统计信息)
```

---

### 示例 2: 使用 QuickAPI

```javascript
import QuickAPI from './src/QuickAPI.js';

const api = new QuickAPI();

// 一行代码获取所有方法
const methods = api.analyzeLocalDirectory('./my-project');

// 筛选 Python 方法
const pythonMethods = api.filterByLanguage(methods, 'python');

// 分批处理
const batches = api.batchMethods(methods, 50);

// 估算 Token
const tokens = api.estimateTokens(methods);
```

---

## 📊 输出格式

### 1. methods.txt（方法列表）

简洁格式，适合发送给 LLM，节省 92% Token：

```
src/Calculator.java:Calculator.add lang=java returns=int params=(a:int,b:int) doc="计算两数之和"
src/utils.py:parse_args lang=python params=(argv) doc="Parse command line arguments"
src/main.cpp:Calculator.multiply lang=cpp returns=int params=(a:int,b:int)
```

**格式说明**：
- `文件路径:类名.方法名` - 方法位置
- `lang=xxx` - 编程语言
- `returns=xxx` - 返回类型（如有）
- `params=(...)` - 参数列表
- `doc="..."` - 注释内容（如有）

---

### 2. all.txt（完整列表）

包含文件、类、字段、方法的完整信息：

```
file=src/Calculator.java lang=java imports=java.util.List
src/Calculator.java:Calculator type=class lang=java methods=3 fields=2
src/Calculator.java:Calculator.result type=field lang=java fieldType=int
src/Calculator.java:Calculator.add lang=java returns=int params=(a:int,b:int)
```

---

### 3. analysis.json（完整 JSON）

标准 JSON 格式，包含所有详细信息：

```json
{
  "file": "src/Calculator.java",
  "language": "java",
  "classes": [
    {
      "name": "Calculator",
      "methods": [
        {
          "name": "add",
          "return_type": "int",
          "parameters": [
            { "name": "a", "type": "int" },
            { "name": "b", "type": "int" }
          ],
          "documentation": {
            "docstring": "/** 计算两数之和 */",
            "has_doc": true
          }
        }
      ]
    }
  ]
}
```

---

### 4. stats.json（统计信息）

```json
{
  "totalFiles": 150,
  "parsedFiles": 145,
  "methodCount": 850,
  "languageStats": {
    "java": 80,
    "python": 45,
    "javascript": 20
  }
}
```

---

## 🎯 核心功能

### ✅ 注释提取

自动提取方法注释，支持多种格式：

- **Java** - JavaDoc (`/** ... */`)
- **Python** - Docstring (`"""..."""`)
- **C#** - XML 注释 (`/// ...`)
- **JavaScript** - JSDoc (`/** ... */`)
- **单行注释** - `//`, `#`
- **多行注释** - `/* ... */`

**示例**：
```java
/**
 * 计算两个数的和
 * @param a 第一个数
 * @param b 第二个数
 * @return 两数之和
 */
public int add(int a, int b) {
    return a + b;
}
```

**提取结果**：
```
test.java:Calculator.add lang=java returns=int params=(a:int,b:int) doc="计算两个数的和 @param a 第一个数 @param b 第二个数 @return 两数之和"
```

---

### ✅ 内存处理

所有数据在内存中处理，无中间文件生成：

```javascript
// 传统方式 ❌
parse() → save to file → read file → process

// 内存处理 ✅
parse() → process → (optional save)
```

**优势**：
- 更快的处理速度
- 无需清理临时文件
- 更低的磁盘 IO
- 代码更简洁

---

### ✅ Token 优化

生成的文本格式专为 LLM 优化，大幅节省 Token：

| 格式 | Token 数 | 节省比例 |
|------|---------|---------|
| JSON 原始 | ~874 | 基准 |
| 完整列表 | ~154 | 82% ⬇️ |
| 方法列表 | ~75 | **92% ⬇️** |
| 紧凑格式 | ~58 | 93% ⬇️ |

---

## 🛠️ 核心 API

### ProjectAnalyzer

完整的项目分析器：

```javascript
import ProjectAnalyzer from './src/ProjectAnalyzer.js';

const analyzer = new ProjectAnalyzer();

// 分析本地目录
const result = analyzer.analyzeDirectory('./project', {
    generateTexts: true,
    verbose: true
});

// 分析 Git 仓库（需要 Git）
const result2 = analyzer.analyzeProject('https://github.com/user/repo.git');

// 保存结果（可选）
analyzer.saveResults(result, './output');
```

---

### QuickAPI

简化的 API，最适合快速使用：

```javascript
import QuickAPI from './src/QuickAPI.js';

const api = new QuickAPI();

// 获取方法列表
const methods = api.analyzeLocalDirectory('./project');

// 筛选语言
const javaMethods = api.filterByLanguage(methods, 'java');

// 分批处理
const batches = api.batchMethods(methods, 50);

// 估算 Token
const tokens = api.estimateTokens(methods);

// 生成统计
const stats = api.generateStats(result);
```

---

## 📚 支持的语言

| 语言 | 扩展名 | 类 | 方法 | 字段 | 注释 |
|------|--------|----|----|------|------|
| Java | `.java` | ✅ | ✅ | ✅ | ✅ |
| Python | `.py` | ✅ | ✅ | ✅ | ✅ |
| C# | `.cs` | ✅ | ✅ | ✅ | ✅ |
| JavaScript | `.js`, `.jsx` | ✅ | ✅ | ✅ | ✅ |
| TypeScript | `.ts`, `.tsx` | ✅ | ✅ | ✅ | ✅ |

---

## 💡 使用场景

### 1. LLM 应用

```javascript
// 分析项目
const methods = api.analyzeLocalDirectory('./my-project');

// 发送给 LLM
const batches = api.batchMethods(methods, 50);
for (const batch of batches) {
    await openai.chat.completions.create({
        messages: [{ role: "user", content: batch.join('\n') }]
    });
}
```

### 2. 代码质量分析

```javascript
const result = analyzer.analyzeDirectory('./project');

console.log('总方法数:', result.stats.methodCount);
console.log('有注释的方法:', 
    result.methodTexts.filter(t => t.includes('doc=')).length
);
```

### 3. 文档生成

```javascript
const methods = api.analyzeLocalDirectory('./project');
const withDocs = methods.filter(m => m.includes('doc='));

// 生成文档...
```

---

## 📖 详细文档

- **使用说明** - 查看 `使用说明.md`
- **API 文档** - 查看各源文件的 JSDoc 注释
- **示例代码** - 查看 `test/` 目录

---

## 🎯 测试 pybind11 项目

### 步骤 1: 下载项目

```bash
# 使用 Git
git clone https://gitee.com/chaoxi72/pybind11.git

# 或手动下载
# 访问 https://gitee.com/chaoxi72/pybind11
# 下载 ZIP 并解压
```

### 步骤 2: 分析

```bash
node test/analyze_local_project.js ./pybind11
```

### 步骤 3: 查看结果

```bash
# 查看方法列表
type analysis_result\methods.txt

# 查看统计
type analysis_result\stats.json

# 查看有注释的方法
type analysis_result\methods.txt | findstr "doc="
```

---

## 🔧 自定义配置

### 忽略目录

编辑 `src/ProjectAnalyzer.js`：

```javascript
this.ignoreDirs = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'your_dir'  // 添加你的目录
]);
```

### 忽略文件

```javascript
this.ignorePatterns = [
    /\.min\.js$/,
    /\.test\.js$/,
    /\.backup$/  // 添加你的模式
];
```

---

## 📊 项目结构

```
Ast/
├── src/
│   ├── ASTExtractor.js              - 基础提取器
│   ├── CompleteExtractor.js         - 完整提取器（带注释）
│   ├── TextGenerator.js             - 文本生成器
│   ├── ProjectAnalyzer.js           - 项目分析器
│   ├── QuickAPI.js                  - 简化 API
│   ├── LanguageConfig.js            - 语言配置
│   ├── ExtractorFactory.js          - 工厂模式
│   └── CompleteExtractorFactory.js  - 完整提取器工厂
├── test/
│   ├── analyze_local_project.js     - 本地项目分析脚本
│   └── analyze_pybind11.js          - pybind11 分析脚本
├── analysis_result/                 - 分析结果目录
│   ├── methods.txt                  - 方法列表
│   ├── all.txt                      - 完整列表
│   ├── analysis.json                - JSON 数据
│   └── stats.json                   - 统计信息
├── package.json                     - 项目配置
├── README.md                        - 本文件
└── 使用说明.md                      - 详细使用说明
```

---

## 🎉 特色亮点

1. **注释提取** ✅
   - 自动提取源代码注释
   - 支持多种注释格式
   - 完整保留注释内容

2. **内存处理** ✅
   - 无中间文件生成
   - 数据直接在内存中传递
   - 可选择性保存结果

3. **Token 优化** ✅
   - 节省 92% Token 消耗
   - LLM 友好的文本格式
   - 支持分批处理

4. **批量分析** ✅
   - 递归扫描所有文件
   - 自动识别文件类型
   - 智能过滤无关文件

5. **详细统计** ✅
   - 文件/语言分布
   - 方法数量统计
   - 注释覆盖率
   - Token 估算

---

## 📞 快速命令

```bash
# 安装依赖
npm install

# 分析当前项目
npm start

# 分析指定目录
node test/analyze_local_project.js <路径>

# 分析 Git 仓库（需要 Git）
npm run analyze:git
```

---

## 🚀 开始使用

```bash
# 1. 克隆或下载你要分析的项目
git clone https://gitee.com/chaoxi72/pybind11.git

# 2. 运行分析
node test/analyze_local_project.js ./pybind11

# 3. 查看结果
type analysis_result\methods.txt
```

**一键分析，快速上手！** 🎉