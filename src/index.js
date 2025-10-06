/**
 * AST 代码提取器 - 主入口文件
 * 
 * 这是一个统一的代码分析工具，支持多种编程语言的 AST 解析和信息提取
 * 
 * 核心功能：
 * 1. extractClasses(code)  - 提取类信息
 * 2. extractMethods(code)  - 提取方法/函数信息
 * 3. extractFields(code)   - 提取字段/变量信息
 * 
 * 支持的语言：Java, Python, C#, JavaScript
 * 
 * 使用示例：
 * ```
 * import ExtractorFactory from './ExtractorFactory.js';
 * import Java from 'tree-sitter-java';
 * 
 * const extractor = ExtractorFactory.createExtractor('java', Java);
 * const results = extractor.extractAll(sourceCode);
 * extractor.printResults(results);
 * ```
 */

// 导出核心类
export { default as ASTExtractor } from './ASTExtractor.js';
export { default as ExtractorFactory } from './ExtractorFactory.js';

// 导出语言配置
export {
    JavaConfig,
    PythonConfig,
    CSharpConfig,
    JavaScriptConfig,
    TypeScriptConfig,
    LanguageConfigMap,
    getLanguageConfig,
    getSupportedLanguages
} from './LanguageConfig.js';

// 导出特定语言的提取器
export {
    JavaExtractor,
    PythonExtractor,
    CSharpExtractor,
    JavaScriptExtractor
} from './ExtractorFactory.js';

// 默认导出工厂类
export { default } from './ExtractorFactory.js';

