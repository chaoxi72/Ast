import ASTExtractor from './ASTExtractor.js';
import crypto from 'crypto';

/**
 * 完整的代码分析提取器
 * 按照指定的 JSON 结构输出详细的分析结果
 */
class CompleteExtractor extends ASTExtractor {
    /**
     * 完整提取文件信息
     * @param {string} code - 源代码
     * @param {string} filePath - 文件路径
     * @param {string} language - 语言名称
     * @returns {Object} 完整的分析结果
     */
    extractComplete(code, filePath, language) {
        const tree = this.parse(code);
        const rootNode = tree.rootNode;
        
        // 提取导入语句
        const imports = this._extractImports(rootNode, code);
        
        // 提取类信息
        const classes = this._extractClassesComplete(rootNode, filePath, language, code);
        
        // 提取顶层函数
        const functions = this._extractTopLevelFunctions(rootNode, filePath, language, code);
        
        // 计算文件级别的指标
        const metrics = this._calculateFileMetrics(rootNode, code, classes, functions);
        
        return {
            file: filePath,
            language: language,
            imports: imports,
            classes: classes,
            functions: functions,
            metrics: metrics
        };
    }

    /**
     * 提取导入语句
     * @private
     */
    _extractImports(rootNode, code) {
        const imports = [];
        const importTypes = [
            'import_statement',
            'import_from_statement',
            'import_declaration',
            'using_directive'
        ];
        
        const importNodes = this.findNodesByType(rootNode, importTypes);
        
        importNodes.forEach(node => {
            const importText = node.text.trim();
            // 提取实际导入的模块名
            const match = importText.match(/import\s+([^\s;]+)|from\s+([^\s]+)|using\s+([^\s;]+)/);
            if (match) {
                imports.push(match[1] || match[2] || match[3]);
            }
        });
        
        return imports;
    }

    /**
     * 完整提取类信息
     * @private
     */
    _extractClassesComplete(rootNode, filePath, language, code) {
        const classNodes = this.findNodesByType(rootNode, this.config.classTypes);
        
        return classNodes.map(classNode => {
            const className = this._getNodeName(classNode, this.config.classNameField);
            const modifiers = this._getModifiers(classNode);
            
            // 提取继承和接口信息
            const superclass = this._getSuperclass(classNode);
            const interfaces = this._getInterfaces(classNode);
            
            // 提取字段
            const fields = this._extractClassFields(classNode);
            
            // 提取方法
            const methods = this._extractClassMethodsComplete(classNode, filePath, language, className, code);
            
            // 计算类的指标
            const metrics = this._calculateClassMetrics(classNode, code, fields, methods);
            
            // 提取文档
            const documentation = this._extractDocumentation(classNode);
            
            // 计算位置
            const location = {
                file: filePath,
                start_line: classNode.startPosition.row + 1,
                end_line: classNode.endPosition.row + 1
            };
            
            return {
                id: `${className}`,
                name: className,
                qualified_name: className,
                modifiers: modifiers,
                type: 'class',
                location: location,
                superclass: superclass,
                interfaces: interfaces,
                attributes: [],
                fields: fields,
                methods: methods,
                metrics: metrics,
                documentation: documentation,
                analysis: { issues: [] }
            };
        });
    }

    /**
     * 提取父类信息
     * @private
     */
    _getSuperclass(classNode) {
        const superclassNode = classNode.childForFieldName('superclass');
        if (superclassNode) {
            return superclassNode.text.replace(/extends\s+|:\s+/g, '').trim();
        }
        return null;
    }

    /**
     * 提取接口信息
     * @private
     */
    _getInterfaces(classNode) {
        const interfaces = [];
        const interfacesNode = classNode.childForFieldName('interfaces');
        
        if (interfacesNode) {
            const text = interfacesNode.text.replace(/implements\s+|:\s+/g, '').trim();
            interfaces.push(...text.split(',').map(i => i.trim()));
        }
        
        return interfaces;
    }

    /**
     * 提取类字段
     * @private
     */
    _extractClassFields(classNode) {
        const body = classNode.childForFieldName('body');
        if (!body) return [];
        
        const fieldNodes = this.findNodesByType(body, this.config.fieldTypes);
        const fields = [];
        
        fieldNodes.forEach(fieldNode => {
            const fieldInfo = this._extractFieldInfo(fieldNode, 0);
            if (fieldInfo) {
                if (Array.isArray(fieldInfo)) {
                    fieldInfo.forEach(f => {
                        fields.push({
                            name: f.name,
                            type: f.type,
                            modifiers: f.modifiers,
                            default_value: null
                        });
                    });
                } else {
                    fields.push({
                        name: fieldInfo.name,
                        type: fieldInfo.type,
                        modifiers: fieldInfo.modifiers,
                        default_value: null
                    });
                }
            }
        });
        
        return fields;
    }

    /**
     * 完整提取类方法
     * @private
     */
    _extractClassMethodsComplete(classNode, filePath, language, className, code) {
        const body = classNode.childForFieldName('body');
        if (!body) return [];
        
        const methodNodes = this.findNodesByType(body, this.config.methodTypes);
        
        return methodNodes.map(methodNode => {
            const methodName = this._getNodeName(methodNode, this.config.methodNameField);
            const modifiers = this._getModifiers(methodNode);
            const returnType = this._getReturnType(methodNode);
            const parametersDetailed = this._getParametersDetailed(methodNode);
            
            // 计算方法指标
            const metrics = this._calculateMethodMetrics(methodNode, code);
            
            // 提取文档
            const documentation = this._extractDocumentation(methodNode);
            
            // 提取方法体
            const body = this._extractMethodBody(methodNode);
            
            // 计算位置
            const location = {
                file: filePath,
                start_line: methodNode.startPosition.row + 1,
                end_line: methodNode.endPosition.row + 1
            };
            
            // 构建方法ID
            const paramTypes = parametersDetailed.map(p => p.type || 'any').join(',');
            const methodId = `${className}.${methodName}(${paramTypes})->${returnType}`;
            
            return {
                id: methodId,
                name: methodName,
                qualified_name: `${className}.${methodName}`,
                language: language,
                location: location,
                modifiers: modifiers,
                return_type: returnType,
                parameters: parametersDetailed.map(p => ({
                    name: p.name,
                    type: p.type || 'any',
                    default_value: p.defaultValue
                })),
                parent: {
                    type: 'class',
                    name: className
                },
                metrics: metrics,
                documentation: documentation,
                body: body,
                analysis: { issues: [] }
            };
        });
    }

    /**
     * 提取顶层函数
     * @private
     */
    _extractTopLevelFunctions(rootNode, filePath, language, code) {
        const allMethods = this.findNodesByType(rootNode, this.config.methodTypes);
        const topLevelMethods = allMethods.filter(methodNode => {
            return !this._getParentClassName(methodNode);
        });
        
        return topLevelMethods.map(methodNode => {
            const methodName = this._getNodeName(methodNode, this.config.methodNameField);
            const modifiers = this._getModifiers(methodNode);
            const returnType = this._getReturnType(methodNode);
            const parametersDetailed = this._getParametersDetailed(methodNode);
            
            const metrics = this._calculateMethodMetrics(methodNode, code);
            const documentation = this._extractDocumentation(methodNode);
            const body = this._extractMethodBody(methodNode);
            
            const location = {
                file: filePath,
                start_line: methodNode.startPosition.row + 1,
                end_line: methodNode.endPosition.row + 1
            };
            
            const paramTypes = parametersDetailed.map(p => p.type || 'any').join(',');
            const methodId = `${methodName}(${paramTypes})->${returnType}`;
            
            return {
                id: methodId,
                name: methodName,
                qualified_name: methodName,
                language: language,
                location: location,
                modifiers: modifiers,
                return_type: returnType,
                parameters: parametersDetailed.map(p => ({
                    name: p.name,
                    type: p.type || 'any',
                    default_value: p.defaultValue
                })),
                parent: null,
                metrics: metrics,
                documentation: documentation,
                body: body,
                analysis: { issues: [] }
            };
        });
    }

    /**
     * 提取文档字符串（增强版 - 支持多种注释格式）
     * @private
     */
    _extractDocumentation(node) {
        let docstring = null;
        let hasDoc = false;
        const comments = [];
        
        // 1. 检查节点前面的所有注释（包括 previousSibling）
        let sibling = node.previousSibling;
        const commentTypes = ['comment', 'line_comment', 'block_comment'];
        
        while (sibling) {
            if (commentTypes.includes(sibling.type)) {
                comments.unshift(sibling.text);
            } else if (sibling.type !== 'ERROR' && sibling.text.trim() !== '') {
                // 遇到非空、非错误节点，停止
                break;
            }
            sibling = sibling.previousSibling;
        }
        
        // 2. 也检查 previousNamedSibling
        let prevNamed = node.previousNamedSibling;
        while (prevNamed && commentTypes.includes(prevNamed.type)) {
            if (!comments.includes(prevNamed.text)) {
                comments.unshift(prevNamed.text);
            }
            prevNamed = prevNamed.previousNamedSibling;
        }
        
        // 3. 检查父节点前的注释（适用于某些语言结构）
        if (comments.length === 0 && node.parent) {
            let parentSibling = node.parent.previousSibling;
            while (parentSibling) {
                if (commentTypes.includes(parentSibling.type)) {
                    comments.unshift(parentSibling.text);
                } else if (parentSibling.type !== 'ERROR' && parentSibling.text.trim() !== '') {
                    break;
                }
                parentSibling = parentSibling.previousSibling;
            }
        }
        
        // 4. Python docstring（函数/类内部的字符串）
        if (node.type === 'function_definition' || node.type === 'class_definition') {
            const body = node.childForFieldName('body');
            if (body) {
                // 查找第一个语句
                for (let i = 0; i < body.childCount; i++) {
                    const child = body.child(i);
                    if (child.type === 'expression_statement') {
                        const stringNode = child.child(0);
                        if (stringNode && stringNode.type === 'string') {
                            comments.push(stringNode.text);
                            break;
                        }
                    } else if (child.type !== 'ERROR' && child.text.trim() !== '') {
                        break;
                    }
                }
            }
        }
        
        // 5. 合并所有注释
        if (comments.length > 0) {
            docstring = comments.join('\n').trim();
            hasDoc = true;
        }
        
        return {
            docstring: docstring,
            has_doc: hasDoc
        };
    }

    /**
     * 提取方法体
     * @private
     */
    _extractMethodBody(methodNode) {
        const text = methodNode.text;
        const hash = crypto.createHash('md5').update(text).digest('hex');
        
        return {
            text: text.length > 200 ? text.substring(0, 200) + '...' : text,
            hash: hash
        };
    }

    /**
     * 计算方法指标
     * @private
     */
    _calculateMethodMetrics(methodNode, code) {
        const lines = methodNode.text.split('\n');
        const lineCount = methodNode.endPosition.row - methodNode.startPosition.row + 1;
        
        // 统计语句数（简化版）
        const statements = this.findNodesByType(methodNode, [
            'expression_statement',
            'return_statement',
            'if_statement',
            'for_statement',
            'while_statement'
        ]);
        
        // 统计分支
        const branches = this.findNodesByType(methodNode, [
            'if_statement',
            'switch_statement',
            'case_clause'
        ]);
        
        // 统计循环
        const loops = this.findNodesByType(methodNode, [
            'for_statement',
            'while_statement',
            'do_statement'
        ]);
        
        // 统计返回语句
        const returns = this.findNodesByType(methodNode, ['return_statement', 'yield']);
        
        // 获取参数数量
        const params = methodNode.childForFieldName('parameters');
        let paramCount = 0;
        if (params) {
            paramCount = this._getParametersDetailed(methodNode).length;
        }
        
        // 计算圈复杂度（简化版：1 + 分支数 + 循环数）
        const cyclomaticComplexity = 1 + branches.length + loops.length;
        
        return {
            line_count: lineCount,
            statement_count: statements.length,
            branch_count: branches.length,
            loop_count: loops.length,
            nesting_depth: this._calculateNestingDepth(methodNode),
            cyclomatic_complexity: cyclomaticComplexity,
            return_count: returns.length,
            param_count: paramCount
        };
    }

    /**
     * 计算嵌套深度
     * @private
     */
    _calculateNestingDepth(node, currentDepth = 0) {
        let maxDepth = currentDepth;
        
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            const nestingTypes = [
                'if_statement',
                'for_statement',
                'while_statement',
                'switch_statement',
                'try_statement'
            ];
            
            if (nestingTypes.includes(child.type)) {
                const childDepth = this._calculateNestingDepth(child, currentDepth + 1);
                maxDepth = Math.max(maxDepth, childDepth);
            } else {
                const childDepth = this._calculateNestingDepth(child, currentDepth);
                maxDepth = Math.max(maxDepth, childDepth);
            }
        }
        
        return maxDepth;
    }

    /**
     * 计算类指标
     * @private
     */
    _calculateClassMetrics(classNode, code, fields, methods) {
        const lineCount = classNode.endPosition.row - classNode.startPosition.row + 1;
        
        // 统计注释行（简化版）
        const comments = this.findNodesByType(classNode, ['comment', 'block_comment', 'line_comment']);
        const commentLines = comments.reduce((sum, c) => {
            return sum + (c.endPosition.row - c.startPosition.row + 1);
        }, 0);
        
        return {
            method_count: methods.length,
            field_count: fields.length,
            line_count: lineCount,
            comment_lines: commentLines
        };
    }

    /**
     * 计算文件级别指标
     * @private
     */
    _calculateFileMetrics(rootNode, code, classes, functions) {
        const lines = code.split('\n');
        const lineCount = lines.length;
        
        // 统计注释行
        const comments = this.findNodesByType(rootNode, ['comment', 'block_comment', 'line_comment']);
        const commentLines = comments.reduce((sum, c) => {
            return sum + (c.endPosition.row - c.startPosition.row + 1);
        }, 0);
        
        return {
            class_count: classes.length,
            function_count: functions.length,
            line_count: lineCount,
            comment_lines: commentLines
        };
    }
}

export default CompleteExtractor;

