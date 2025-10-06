import ASTExtractor from './ASTExtractor.js';
import { getLanguageConfig } from './LanguageConfig.js';

/**
 * Java 特定的提取器
 */
class JavaExtractor extends ASTExtractor {
    _extractFieldInfo(fieldNode, index) {
        const typeNode = fieldNode.childForFieldName('type');
        const declarator = fieldNode.childForFieldName('declarator');
        
        if (!declarator) {
            return null;
        }
        
        const nameNode = declarator.childForFieldName('name');
        const modifiers = this._getModifiers(fieldNode);
        const parentClass = this._getParentClassName(fieldNode);
        
        return {
            index: index + 1,
            name: nameNode ? nameNode.text : 'unknown',
            type: typeNode ? typeNode.text : 'unknown',
            nodeType: fieldNode.type,
            parentClass: parentClass,
            modifiers: modifiers,
            location: {
                startLine: fieldNode.startPosition.row + 1,
                startColumn: fieldNode.startPosition.column + 1,
                endLine: fieldNode.endPosition.row + 1,
                endColumn: fieldNode.endPosition.column + 1
            },
            text: fieldNode.text.trim()
        };
    }
}

/**
 * Python 特定的提取器
 */
class PythonExtractor extends ASTExtractor {
    _extractFieldInfo(fieldNode, index) {
        // Python 的字段主要是在类中的赋值语句
        const parentClass = this._getParentClassName(fieldNode);
        
        // 只处理类中的赋值
        if (!parentClass) {
            return null;
        }
        
        let fieldName = 'unknown';
        let fieldType = 'unknown';
        
        if (fieldNode.type === 'assignment') {
            const left = fieldNode.child(0);
            fieldName = left ? left.text : 'unknown';
            
            const right = fieldNode.child(2); // 跳过 =
            fieldType = right ? right.type : 'unknown';
        } else if (fieldNode.type === 'expression_statement') {
            // 处理类中的简单表达式语句
            const child = fieldNode.child(0);
            if (child && child.type === 'assignment') {
                const left = child.child(0);
                fieldName = left ? left.text : 'unknown';
                
                const right = child.child(2);
                fieldType = right ? right.type : 'unknown';
            }
        }
        
        // 过滤掉非字段（如方法调用等）
        if (fieldName === 'unknown' || !fieldName.includes('self.')) {
            return null;
        }
        
        return {
            index: index + 1,
            name: fieldName,
            type: fieldType,
            nodeType: fieldNode.type,
            parentClass: parentClass,
            modifiers: [],
            location: {
                startLine: fieldNode.startPosition.row + 1,
                startColumn: fieldNode.startPosition.column + 1,
                endLine: fieldNode.endPosition.row + 1,
                endColumn: fieldNode.endPosition.column + 1
            },
            text: fieldNode.text.trim()
        };
    }

    _isStaticMethod(methodNode, modifiers) {
        // 检查装饰器
        const parent = methodNode.parent?.parent;
        if (parent && parent.type === 'decorated_definition') {
            const decorators = this.findNodesByType(parent, 'decorator');
            for (const decorator of decorators) {
                const name = decorator.childForFieldName('name');
                const decoratorName = name ? name.text : decorator.text;
                if (decoratorName.includes('staticmethod')) {
                    return true;
                }
            }
        }
        return false;
    }
}

/**
 * C# 特定的提取器
 */
class CSharpExtractor extends ASTExtractor {
    _extractFieldInfo(fieldNode, index) {
        const fields = [];
        
        if (fieldNode.type === 'field_declaration') {
            const typeNode = fieldNode.childForFieldName('type');
            const declaration = fieldNode.childForFieldName('declaration');
            const modifiers = this._getModifiers(fieldNode);
            const parentClass = this._getParentClassName(fieldNode);
            
            if (declaration) {
                const variables = this.findNodesByType(declaration, 'variable_declarator');
                variables.forEach((v, vIndex) => {
                    const nameNode = v.childForFieldName('name');
                    fields.push({
                        index: index + vIndex + 1,
                        name: nameNode ? nameNode.text : 'unknown',
                        type: typeNode ? typeNode.text : 'unknown',
                        nodeType: fieldNode.type,
                        parentClass: parentClass,
                        modifiers: modifiers,
                        location: {
                            startLine: fieldNode.startPosition.row + 1,
                            startColumn: fieldNode.startPosition.column + 1,
                            endLine: fieldNode.endPosition.row + 1,
                            endColumn: fieldNode.endPosition.column + 1
                        },
                        text: v.text.trim()
                    });
                });
            }
        } else if (fieldNode.type === 'property_declaration') {
            const nameNode = fieldNode.childForFieldName('name');
            const typeNode = fieldNode.childForFieldName('type');
            const modifiers = this._getModifiers(fieldNode);
            const parentClass = this._getParentClassName(fieldNode);
            
            fields.push({
                index: index + 1,
                name: nameNode ? nameNode.text : 'unknown',
                type: typeNode ? typeNode.text : 'unknown',
                nodeType: fieldNode.type,
                parentClass: parentClass,
                modifiers: modifiers,
                isProperty: true,
                location: {
                    startLine: fieldNode.startPosition.row + 1,
                    startColumn: fieldNode.startPosition.column + 1,
                    endLine: fieldNode.endPosition.row + 1,
                    endColumn: fieldNode.endPosition.column + 1
                },
                text: fieldNode.text.trim()
            });
        }
        
        return fields.length === 1 ? fields[0] : fields;
    }
}

/**
 * JavaScript 特定的提取器
 */
class JavaScriptExtractor extends ASTExtractor {
    _extractFieldInfo(fieldNode, index) {
        const parentClass = this._getParentClassName(fieldNode);
        
        if (fieldNode.type === 'public_field_definition') {
            const nameNode = fieldNode.childForFieldName('name');
            const valueNode = fieldNode.childForFieldName('value');
            
            return {
                index: index + 1,
                name: nameNode ? nameNode.text : 'unknown',
                type: valueNode ? valueNode.type : 'undefined',
                nodeType: fieldNode.type,
                parentClass: parentClass,
                modifiers: [],
                location: {
                    startLine: fieldNode.startPosition.row + 1,
                    startColumn: fieldNode.startPosition.column + 1,
                    endLine: fieldNode.endPosition.row + 1,
                    endColumn: fieldNode.endPosition.column + 1
                },
                text: fieldNode.text.trim()
            };
        } else if (fieldNode.type === 'lexical_declaration' || fieldNode.type === 'variable_declaration') {
            // 只处理类中的声明
            if (!parentClass) {
                return null;
            }
            
            const kind = fieldNode.child(0); // const/let/var
            const declarators = this.findNodesByType(fieldNode, 'variable_declarator');
            
            return declarators.map((declarator, dIndex) => {
                const nameNode = declarator.childForFieldName('name');
                const valueNode = declarator.childForFieldName('value');
                
                return {
                    index: index + dIndex + 1,
                    name: nameNode ? nameNode.text : 'unknown',
                    type: valueNode ? valueNode.type : 'undefined',
                    nodeType: fieldNode.type,
                    parentClass: parentClass,
                    modifiers: kind ? [kind.text] : [],
                    location: {
                        startLine: fieldNode.startPosition.row + 1,
                        startColumn: fieldNode.startPosition.column + 1,
                        endLine: fieldNode.endPosition.row + 1,
                        endColumn: fieldNode.endPosition.column + 1
                    },
                    text: declarator.text.trim()
                };
            });
        }
        
        return null;
    }
}

/**
 * 提取器工厂类
 * 根据语言类型创建相应的提取器实例
 */
class ExtractorFactory {
    /**
     * 创建语言特定的提取器
     * @param {string} languageName - 语言名称
     * @param {Object} languageParser - tree-sitter 语言解析器
     * @returns {ASTExtractor} 提取器实例
     */
    static createExtractor(languageName, languageParser) {
        const config = getLanguageConfig(languageName);
        const normalizedName = languageName.toLowerCase();
        
        switch (normalizedName) {
            case 'java':
                return new JavaExtractor(languageParser, config);
            case 'python':
                return new PythonExtractor(languageParser, config);
            case 'csharp':
                return new CSharpExtractor(languageParser, config);
            case 'javascript':
            case 'js':
                return new JavaScriptExtractor(languageParser, config);
            default:
                // 默认返回基础提取器
                return new ASTExtractor(languageParser, config);
        }
    }

    /**
     * 获取所有可用的语言
     * @returns {Array} 语言列表
     */
    static getSupportedLanguages() {
        return ['java', 'python', 'csharp', 'javascript'];
    }
}

export default ExtractorFactory;
export { JavaExtractor, PythonExtractor, CSharpExtractor, JavaScriptExtractor };

