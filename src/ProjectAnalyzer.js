import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import CompleteExtractorFactory from './CompleteExtractorFactory.js';
import TextGenerator from './TextGenerator.js';

// 动态导入语言解析器
import Java from 'tree-sitter-java';
import Python from 'tree-sitter-python';
import CSharp from 'tree-sitter-c-sharp';
import JavaScript from 'tree-sitter-javascript';

/**
 * 项目分析器
 * 从 Git 仓库下载项目并递归解析所有代码文件
 */
class ProjectAnalyzer {
    constructor() {
        // 支持的语言及其配置
        this.languageMap = {
            '.java': { name: 'java', parser: Java },
            '.py': { name: 'python', parser: Python },
            '.cs': { name: 'csharp', parser: CSharp },
            '.js': { name: 'javascript', parser: JavaScript },
            '.jsx': { name: 'javascript', parser: JavaScript },
            '.ts': { name: 'javascript', parser: JavaScript },
            '.tsx': { name: 'javascript', parser: JavaScript }
        };
        
        // 需要忽略的目录
        this.ignoreDirs = new Set([
            'node_modules',
            '.git',
            '.svn',
            'dist',
            'build',
            'target',
            '__pycache__',
            '.pytest_cache',
            'coverage',
            '.idea',
            '.vscode',
            'bin',
            'obj'
        ]);
        
        // 需要忽略的文件模式
        this.ignorePatterns = [
            /\.min\.js$/,
            /\.test\.js$/,
            /\.spec\.js$/,
            /\.d\.ts$/
        ];
    }
    
    /**
     * 从 Git 仓库克隆项目
     * @param {string} gitUrl - Git 仓库 URL
     * @param {string} targetDir - 目标目录（可选，默认自动生成）
     * @returns {string} 克隆后的项目路径
     */
    cloneRepository(gitUrl, targetDir = null) {
        // 如果没有指定目标目录，从 URL 提取项目名
        if (!targetDir) {
            const match = gitUrl.match(/\/([^\/]+?)(\.git)?$/);
            const projectName = match ? match[1] : 'project';
            targetDir = path.join(process.cwd(), 'downloads', projectName);
        }
        
        // 如果目录已存在，先删除
        if (fs.existsSync(targetDir)) {
            console.log(`目录已存在，删除: ${targetDir}`);
            fs.rmSync(targetDir, { recursive: true, force: true });
        }
        
        // 创建父目录
        const parentDir = path.dirname(targetDir);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        
        console.log(`正在克隆仓库: ${gitUrl}`);
        console.log(`目标路径: ${targetDir}`);
        
        try {
            execSync(`git clone ${gitUrl} "${targetDir}"`, {
                stdio: 'inherit'
            });
            console.log('✅ 克隆完成');
            return targetDir;
        } catch (error) {
            throw new Error(`克隆失败: ${error.message}`);
        }
    }
    
    /**
     * 递归遍历目录，收集所有代码文件
     * @param {string} dirPath - 目录路径
     * @param {string} basePath - 基础路径（用于生成相对路径）
     * @returns {Array} 文件信息数组 [{path, ext, relativePath}]
     */
    collectCodeFiles(dirPath, basePath = null) {
        if (!basePath) basePath = dirPath;
        
        const files = [];
        
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    // 检查是否需要忽略此目录
                    if (this.ignoreDirs.has(entry.name)) {
                        continue;
                    }
                    
                    // 递归处理子目录
                    const subFiles = this.collectCodeFiles(fullPath, basePath);
                    files.push(...subFiles);
                    
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    
                    // 检查是否是支持的文件类型
                    if (this.languageMap[ext]) {
                        // 检查是否匹配忽略模式
                        const shouldIgnore = this.ignorePatterns.some(pattern => 
                            pattern.test(entry.name)
                        );
                        
                        if (!shouldIgnore) {
                            const relativePath = path.relative(basePath, fullPath);
                            files.push({
                                path: fullPath,
                                ext: ext,
                                relativePath: relativePath.replace(/\\/g, '/'),
                                name: entry.name
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`读取目录失败: ${dirPath}`, error.message);
        }
        
        return files;
    }
    
    /**
     * 根据文件后缀判断语言类型
     * @param {string} ext - 文件扩展名
     * @returns {Object|null} {name, parser} 或 null
     */
    detectLanguage(ext) {
        return this.languageMap[ext.toLowerCase()] || null;
    }
    
    /**
     * 解析单个文件
     * @param {string} filePath - 文件路径
     * @param {string} relativePath - 相对路径
     * @returns {Object|null} JSON 分析结果
     */
    parseFile(filePath, relativePath) {
        try {
            // 读取文件内容
            const code = fs.readFileSync(filePath, 'utf-8');
            
            // 检测语言
            const ext = path.extname(filePath);
            const language = this.detectLanguage(ext);
            
            if (!language) {
                console.warn(`不支持的文件类型: ${ext}`);
                return null;
            }
            
            // 创建提取器
            const extractor = CompleteExtractorFactory.createExtractor(
                language.name,
                language.parser
            );
            
            // 提取 JSON
            const result = extractor.extractComplete(code, relativePath, language.name);
            
            return result;
            
        } catch (error) {
            console.error(`解析文件失败: ${filePath}`, error.message);
            return null;
        }
    }
    
    /**
     * 批量解析文件列表
     * @param {Array} fileInfos - 文件信息数组
     * @param {Function} progressCallback - 进度回调函数(current, total, file)
     * @returns {Array} JSON 结果数组
     */
    parseFiles(fileInfos, progressCallback = null) {
        const results = [];
        const total = fileInfos.length;
        
        fileInfos.forEach((fileInfo, index) => {
            if (progressCallback) {
                progressCallback(index + 1, total, fileInfo);
            }
            
            const result = this.parseFile(fileInfo.path, fileInfo.relativePath);
            
            if (result) {
                results.push({
                    file: fileInfo.relativePath,
                    result: result
                });
            }
        });
        
        return results;
    }
    
    /**
     * 生成所有文件的方法文本列表
     * @param {Array} parseResults - 解析结果数组
     * @returns {Array} 方法文本列表
     */
    generateMethodTexts(parseResults) {
        const allMethods = [];
        
        parseResults.forEach(item => {
            const methods = TextGenerator.generateMethodTexts(item.result);
            allMethods.push(...methods);
        });
        
        return allMethods;
    }
    
    /**
     * 生成所有文件的完整文本列表
     * @param {Array} parseResults - 解析结果数组
     * @returns {Array} 完整文本列表
     */
    generateAllTexts(parseResults) {
        const allTexts = [];
        
        parseResults.forEach(item => {
            const texts = TextGenerator.generateAllTexts(item.result);
            allTexts.push(...texts);
            allTexts.push(''); // 文件之间添加空行
        });
        
        return allTexts;
    }
    
    /**
     * 分析整个项目（完整流程，内存处理）
     * @param {string} gitUrl - Git 仓库 URL
     * @param {Object} options - 选项
     * @returns {Object} 分析结果（纯数据，不保存文件）
     */
    analyzeProject(gitUrl, options = {}) {
        const {
            targetDir = null,
            progressCallback = null,
            generateTexts = true,
            verbose = true,  // 是否显示日志
            saveToLocal = true  // Git 项目默认保存到本地
        } = options;
        
        if (verbose) {
            console.log('='.repeat(70));
            console.log('开始项目分析');
            console.log('='.repeat(70));
        }
        
        // 1. 克隆仓库
        const projectDir = this.cloneRepository(gitUrl, targetDir);
        
        // 2. 收集代码文件
        if (verbose) console.log('\n正在收集代码文件...');
        const files = this.collectCodeFiles(projectDir);
        if (verbose) console.log(`✅ 找到 ${files.length} 个代码文件`);
        
        // 按语言分组统计
        const langStats = {};
        files.forEach(f => {
            const lang = this.detectLanguage(f.ext);
            if (lang) {
                langStats[lang.name] = (langStats[lang.name] || 0) + 1;
            }
        });
        if (verbose) console.log('文件统计:', langStats);
        
        // 3. 解析所有文件
        if (verbose) console.log('\n正在解析文件...');
        const parseResults = this.parseFiles(files, progressCallback);
        if (verbose) console.log(`✅ 成功解析 ${parseResults.length} 个文件`);
        
        // 4. 生成文本（可选）
        let methodTexts = [];
        let allTexts = [];
        
        if (generateTexts) {
            if (verbose) console.log('\n正在生成文本描述...');
            methodTexts = this.generateMethodTexts(parseResults);
            allTexts = this.generateAllTexts(parseResults);
            if (verbose) console.log(`✅ 生成 ${methodTexts.length} 个方法描述`);
        }
        
        if (verbose) {
            console.log('\n' + '='.repeat(70));
            console.log('项目分析完成（数据已在内存中）');
            console.log('='.repeat(70));
        }
        
        const result = {
            projectDir: projectDir,
            files: files,
            parseResults: parseResults,
            methodTexts: methodTexts,
            allTexts: allTexts,
            stats: {
                totalFiles: files.length,
                parsedFiles: parseResults.length,
                methodCount: methodTexts.length,
                languageStats: langStats
            },
            isGitProject: true  // 标记为 Git 项目
        };
        
        // Git 项目默认保存到本地
        if (saveToLocal) {
            if (verbose) {
                console.log('\nGit 项目已保存到本地:', projectDir);
                console.log('如需保存分析结果，请调用: analyzer.saveResults(result, "./output")');
            }
        }
        
        return result;
    }
    
    /**
     * 分析本地目录（不使用 Git，纯内存处理，不生成任何文件）
     * @param {string} dirPath - 目录路径
     * @param {Object} options - 选项
     * @returns {Object} 分析结果（纯数据，不保存文件）
     */
    analyzeDirectory(dirPath, options = {}) {
        const {
            progressCallback = null,
            generateTexts = true,
            verbose = true,
            saveToLocal = false  // 本地目录默认不保存文件
        } = options;
        
        if (verbose) {
            console.log('='.repeat(70));
            console.log('开始目录分析');
            console.log('='.repeat(70));
        }
        
        // 1. 收集代码文件
        if (verbose) console.log('\n正在收集代码文件...');
        const files = this.collectCodeFiles(dirPath);
        if (verbose) console.log(`✅ 找到 ${files.length} 个代码文件`);
        
        // 按语言分组统计
        const langStats = {};
        files.forEach(f => {
            const lang = this.detectLanguage(f.ext);
            if (lang) {
                langStats[lang.name] = (langStats[lang.name] || 0) + 1;
            }
        });
        if (verbose) console.log('文件统计:', langStats);
        
        // 2. 解析所有文件
        if (verbose) console.log('\n正在解析文件...');
        const parseResults = this.parseFiles(files, progressCallback);
        if (verbose) console.log(`✅ 成功解析 ${parseResults.length} 个文件`);
        
        // 3. 生成文本
        let methodTexts = [];
        let allTexts = [];
        
        if (generateTexts) {
            if (verbose) console.log('\n正在生成文本描述...');
            methodTexts = this.generateMethodTexts(parseResults);
            allTexts = this.generateAllTexts(parseResults);
            if (verbose) console.log(`✅ 生成 ${methodTexts.length} 个方法描述`);
        }
        
        if (verbose) {
            console.log('\n' + '='.repeat(70));
            console.log('目录分析完成（数据已在内存中，无文件生成）');
            console.log('='.repeat(70));
        }
        
        const result = {
            projectDir: dirPath,
            files: files,
            parseResults: parseResults,
            methodTexts: methodTexts,
            allTexts: allTexts,
            stats: {
                totalFiles: files.length,
                parsedFiles: parseResults.length,
                methodCount: methodTexts.length,
                languageStats: langStats
            },
            isGitProject: false  // 标记为本地目录
        };
        
        // 本地目录不保存文件，数据仅在内存中
        if (verbose) {
            console.log('\n✅ 本地目录分析完成');
            console.log('📝 所有数据在内存中，无中间文件生成');
            console.log('💾 如需保存，请调用: analyzer.saveResults(result, "./output")');
        }
        
        return result;
    }
    
    /**
     * 保存分析结果到文件
     * @param {Object} analysisResult - 分析结果
     * @param {string} outputDir - 输出目录
     */
    saveResults(analysisResult, outputDir) {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 保存方法列表
        const methodsFile = path.join(outputDir, 'methods.txt');
        fs.writeFileSync(methodsFile, analysisResult.methodTexts.join('\n'));
        console.log(`✅ 方法列表已保存: ${methodsFile}`);
        
        // 保存完整列表
        const allFile = path.join(outputDir, 'all.txt');
        fs.writeFileSync(allFile, analysisResult.allTexts.join('\n'));
        console.log(`✅ 完整列表已保存: ${allFile}`);
        
        // 保存 JSON 结果
        const jsonFile = path.join(outputDir, 'analysis.json');
        fs.writeFileSync(jsonFile, JSON.stringify(analysisResult.parseResults, null, 2));
        console.log(`✅ JSON 结果已保存: ${jsonFile}`);
        
        // 保存统计信息
        const statsFile = path.join(outputDir, 'stats.json');
        fs.writeFileSync(statsFile, JSON.stringify(analysisResult.stats, null, 2));
        console.log(`✅ 统计信息已保存: ${statsFile}`);
    }
    
    /**
     * 获取支持的文件类型列表
     * @returns {Array} 支持的扩展名列表
     */
    getSupportedExtensions() {
        return Object.keys(this.languageMap);
    }
    
    /**
     * 添加自定义忽略目录
     * @param {string|Array} dirs - 目录名或目录名数组
     */
    addIgnoreDirs(dirs) {
        const dirsArray = Array.isArray(dirs) ? dirs : [dirs];
        dirsArray.forEach(dir => this.ignoreDirs.add(dir));
    }
    
    /**
     * 添加自定义忽略模式
     * @param {RegExp|Array} patterns - 正则表达式或数组
     */
    addIgnorePatterns(patterns) {
        const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
        this.ignorePatterns.push(...patternsArray);
    }
}

export default ProjectAnalyzer;
