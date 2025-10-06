import ProjectAnalyzer from './ProjectAnalyzer.js';

/**
 * 快速 API - 简化版本，专注于数据处理
 * 所有数据在内存中传递，无中间文件
 */
class QuickAPI {
    constructor() {
        this.analyzer = new ProjectAnalyzer();
    }
    
    /**
     * 快速分析 Git 仓库（仅返回方法列表）
     * @param {string} gitUrl - Git 仓库 URL
     * @returns {Array<string>} 方法文本数组
     */
    async analyzeGitRepo(gitUrl) {
        const result = this.analyzer.analyzeProject(gitUrl, {
            generateTexts: true,
            verbose: false
        });
        
        return result.methodTexts;
    }
    
    /**
     * 快速分析本地目录（仅返回方法列表，无文件生成）
     * @param {string} dirPath - 目录路径
     * @param {Object} options - 选项
     * @returns {Array<string>} 方法文本数组
     */
    analyzeLocalDirectory(dirPath, options = {}) {
        const result = this.analyzer.analyzeDirectory(dirPath, {
            generateTexts: true,
            verbose: options.verbose !== false,
            saveToLocal: false  // 本地目录不保存文件
        });
        
        return result.methodTexts;
    }
    
    /**
     * 完整分析 Git 仓库（返回所有数据）
     * @param {string} gitUrl - Git 仓库 URL
     * @param {Object} options - 选项
     * @returns {Object} 完整分析结果
     */
    async analyzeGitRepoFull(gitUrl, options = {}) {
        return this.analyzer.analyzeProject(gitUrl, {
            generateTexts: true,
            verbose: options.verbose !== false,
            ...options
        });
    }
    
    /**
     * 完整分析本地目录（返回所有数据，无文件生成）
     * @param {string} dirPath - 目录路径
     * @param {Object} options - 选项
     * @returns {Object} 完整分析结果
     */
    analyzeLocalDirectoryFull(dirPath, options = {}) {
        return this.analyzer.analyzeDirectory(dirPath, {
            generateTexts: true,
            verbose: options.verbose !== false,
            saveToLocal: false,  // 本地目录不保存文件
            ...options
        });
    }
    
    /**
     * 筛选特定语言的方法
     * @param {Array<string>} methodTexts - 方法文本数组
     * @param {string} language - 语言名称 (java, python, csharp, javascript)
     * @returns {Array<string>} 筛选后的方法
     */
    filterByLanguage(methodTexts, language) {
        return methodTexts.filter(text => 
            text.includes(`lang=${language}`)
        );
    }
    
    /**
     * 分批处理方法列表
     * @param {Array<string>} methodTexts - 方法文本数组
     * @param {number} batchSize - 每批大小
     * @returns {Array<Array<string>>} 分批后的数组
     */
    batchMethods(methodTexts, batchSize = 50) {
        const batches = [];
        for (let i = 0; i < methodTexts.length; i += batchSize) {
            batches.push(methodTexts.slice(i, i + batchSize));
        }
        return batches;
    }
    
    /**
     * 估算 Token 数量
     * @param {Array<string>} texts - 文本数组
     * @returns {number} 估算的 token 数
     */
    estimateTokens(texts) {
        const totalChars = texts.join('\n').length;
        return Math.ceil(totalChars / 4); // 简单估算：平均 4 个字符 = 1 token
    }
    
    /**
     * 生成简要统计
     * @param {Object} result - 分析结果
     * @returns {Object} 统计信息
     */
    generateStats(result) {
        return {
            totalFiles: result.stats.totalFiles,
            parsedFiles: result.stats.parsedFiles,
            methodCount: result.stats.methodCount,
            languages: result.stats.languageStats,
            estimatedTokens: this.estimateTokens(result.methodTexts)
        };
    }
}

export default QuickAPI;
