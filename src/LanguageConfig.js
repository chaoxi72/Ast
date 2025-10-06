/**
 * 语言配置模块
 * 定义不同编程语言的 AST 节点类型映射
 * 支持高扩展性，可轻松添加新语言
 */

/**
 * Java 语言配置
 */
export const JavaConfig = {
    classTypes: ['class_declaration'],
    classNameField: 'name',
    methodTypes: ['method_declaration', 'constructor_declaration'],
    methodNameField: 'name',
    fieldTypes: ['field_declaration'],
    fieldNameField: 'declarator'
};

/**
 * Python 语言配置
 */
export const PythonConfig = {
    classTypes: ['class_definition'],
    classNameField: 'name',
    methodTypes: ['function_definition'],
    methodNameField: 'name',
    fieldTypes: ['assignment', 'expression_statement'],
    fieldNameField: 'left'
};

/**
 * C# 语言配置
 */
export const CSharpConfig = {
    classTypes: ['class_declaration'],
    classNameField: 'name',
    methodTypes: ['method_declaration', 'constructor_declaration'],
    methodNameField: 'name',
    fieldTypes: ['field_declaration', 'property_declaration'],
    fieldNameField: 'name'
};

/**
 * JavaScript 语言配置
 */
export const JavaScriptConfig = {
    classTypes: ['class_declaration'],
    classNameField: 'name',
    methodTypes: ['method_definition', 'function_declaration', 'arrow_function'],
    methodNameField: 'name',
    fieldTypes: ['public_field_definition', 'lexical_declaration', 'variable_declaration'],
    fieldNameField: 'name'
};

/**
 * TypeScript 语言配置（预留，与 JavaScript 类似）
 */
export const TypeScriptConfig = {
    classTypes: ['class_declaration'],
    classNameField: 'name',
    methodTypes: ['method_definition', 'function_declaration', 'arrow_function'],
    methodNameField: 'name',
    fieldTypes: ['public_field_definition', 'property_signature', 'lexical_declaration'],
    fieldNameField: 'name'
};

/**
 * 语言配置映射表
 * 通过语言名称快速获取配置
 */
export const LanguageConfigMap = {
    java: JavaConfig,
    python: PythonConfig,
    csharp: CSharpConfig,
    javascript: JavaScriptConfig,
    typescript: TypeScriptConfig
};

/**
 * 获取指定语言的配置
 * @param {string} languageName - 语言名称
 * @returns {Object} 语言配置对象
 */
export function getLanguageConfig(languageName) {
    const config = LanguageConfigMap[languageName.toLowerCase()];
    if (!config) {
        throw new Error(`不支持的语言: ${languageName}`);
    }
    return config;
}

/**
 * 获取所有支持的语言列表
 * @returns {Array} 语言名称数组
 */
export function getSupportedLanguages() {
    return Object.keys(LanguageConfigMap);
}

