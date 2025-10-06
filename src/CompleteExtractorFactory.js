import CompleteExtractor from './CompleteExtractor.js';
import { getLanguageConfig } from './LanguageConfig.js';

/**
 * 完整提取器工厂类
 */
class CompleteExtractorFactory {
    /**
     * 创建语言特定的完整提取器
     * @param {string} languageName - 语言名称
     * @param {Object} languageParser - tree-sitter 语言解析器
     * @returns {CompleteExtractor} 提取器实例
     */
    static createExtractor(languageName, languageParser) {
        const config = getLanguageConfig(languageName);
        return new CompleteExtractor(languageParser, config);
    }
}

export default CompleteExtractorFactory;

