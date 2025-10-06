import Parser from 'tree-sitter';

/**
 * AST 抽象提取器基类
 * 提供统一的代码解析和元素提取接口，支持多种编程语言
 */
class ASTExtractor {
    /**
     * 构造函数
     * @param {Object} language - tree-sitter 语言对象
     * @param {Object} config - 语言特定的节点类型配置
     */
    constructor(language, config) {
        this.parser = new Parser();
        this.parser.setLanguage(language);
        this.config = config;
    }

    /**
     * 解析源代码
     * @param {string} code - 源代码字符串
     * @returns {Object} 解析后的语法树
     */
    parse(code) {
        return this.parser.parse(code);
    }

    /**
     * 通用节点查找方法
     * @param {Object} node - 根节点
     * @param {string|string[]} targetTypes - 目标节点类型（支持单个或多个）
     * @param {Array} results - 结果数组
     * @returns {Array} 匹配的节点数组
     */
    findNodesByType(node, targetTypes, results = []) {
        const types = Array.isArray(targetTypes) ? targetTypes : [targetTypes];
        
        if (types.includes(node.type)) {
            results.push(node);
        }
        
        for (let i = 0; i < node.childCount; i++) {
            this.findNodesByType(node.child(i), targetTypes, results);
        }
        
        return results;
    }

    /**
     * 核心方法1: 提取类信息
     * @param {string} code - 源代码
     * @returns {Array} 类信息数组
     */
    extractClasses(code) {
        const tree = this.parse(code);
        const rootNode = tree.rootNode;
        const classNodes = this.findNodesByType(rootNode, this.config.classTypes);
        
        return classNodes.map((classNode, index) => {
            const className = this._getNodeName(classNode, this.config.classNameField);
            const modifiers = this._getModifiers(classNode);
            const body = classNode.childForFieldName('body');
            
            // 统计类内部的方法和字段数量
            const methodCount = body ? this.findNodesByType(body, this.config.methodTypes).length : 0;
            const fieldCount = body ? this.findNodesByType(body, this.config.fieldTypes).length : 0;
            
            return {
                index: index + 1,
                name: className,
                type: classNode.type,
                modifiers: modifiers,
                methodCount: methodCount,
                fieldCount: fieldCount,
                location: {
                    startLine: classNode.startPosition.row + 1,
                    startColumn: classNode.startPosition.column + 1,
                    endLine: classNode.endPosition.row + 1,
                    endColumn: classNode.endPosition.column + 1
                },
                text: classNode.text
            };
        });
    }

    /**
     * 核心方法2: 提取方法信息（增强版）
     * @param {string} code - 源代码
     * @param {boolean} includeClassMethods - 是否包含类方法（默认true）
     * @returns {Array} 方法信息数组
     */
    extractMethods(code, includeClassMethods = true) {
        const tree = this.parse(code);
        const rootNode = tree.rootNode;
        const methodNodes = this.findNodesByType(rootNode, this.config.methodTypes);
        
        return methodNodes.map((methodNode, index) => {
            const methodName = this._getNodeName(methodNode, this.config.methodNameField);
            const parametersText = this._getParametersText(methodNode);
            const parametersDetailed = this._getParametersDetailed(methodNode);
            const returnType = this._getReturnType(methodNode);
            const modifiers = this._getModifiers(methodNode);
            const accessControl = this._getAccessControl(modifiers);
            const isAsync = this._isAsyncMethod(methodNode);
            const isStatic = this._isStaticMethod(methodNode, modifiers);
            const parentClass = this._getParentClassName(methodNode);
            const parentInfo = this._getParentInfo(methodNode);
            const isOverride = this._isOverrideMethod(methodNode, modifiers);
            const decorators = this._getDecorators(methodNode);
            
            // 根据配置决定是否包含类方法
            if (!includeClassMethods && parentClass) {
                return null;
            }
            
            return {
                index: index + 1,
                name: methodName,
                identifier: methodName,
                type: methodNode.type,
                
                // 访问控制
                accessControl: accessControl,
                modifiers: modifiers,
                visibility: accessControl, // 别名
                
                // 静态/实例
                isStatic: isStatic,
                isInstance: !isStatic,
                
                // 异步
                isAsync: isAsync,
                
                // 返回类型
                returnType: returnType,
                
                // 参数信息
                parameters: parametersText,           // 简单文本格式
                parametersText: parametersText,       // 简单文本格式（别名）
                parametersList: parametersDetailed,   // 详细参数列表
                parametersDetailed: parametersDetailed, // 详细参数列表（别名）
                
                // 所属信息
                parentClass: parentClass,
                className: parentClass,               // 别名
                parentInfo: parentInfo,               // 包含类/接口/模块信息
                
                // 继承关系
                isOverride: isOverride,
                isImplementation: isOverride,         // 别名
                
                // 装饰器（Python/TypeScript）
                decorators: decorators,
                
                // 位置信息
                location: {
                    startLine: methodNode.startPosition.row + 1,
                    startColumn: methodNode.startPosition.column + 1,
                    endLine: methodNode.endPosition.row + 1,
                    endColumn: methodNode.endPosition.column + 1
                },
                
                // 方法签名
                signature: this._getMethodSignature(methodNode, methodName, parametersText, returnType)
            };
        }).filter(method => method !== null);
    }

    /**
     * 核心方法3: 提取类变量/字段信息
     * @param {string} code - 源代码
     * @returns {Array} 字段信息数组
     */
    extractFields(code) {
        const tree = this.parse(code);
        const rootNode = tree.rootNode;
        const fieldNodes = this.findNodesByType(rootNode, this.config.fieldTypes);
        
        const fields = [];
        
        fieldNodes.forEach((fieldNode, index) => {
            const fieldInfo = this._extractFieldInfo(fieldNode, index);
            
            if (Array.isArray(fieldInfo)) {
                fields.push(...fieldInfo);
            } else if (fieldInfo) {
                fields.push(fieldInfo);
            }
        });
        
        return fields;
    }

    // ============ 辅助方法 ============
    
    /**
     * 获取节点名称
     * @private
     */
    _getNodeName(node, fieldName) {
        const nameNode = node.childForFieldName(fieldName || 'name');
        return nameNode ? nameNode.text : 'anonymous';
    }

    /**
     * 获取修饰符
     * @private
     */
    _getModifiers(node) {
        const modifiers = this.findNodesByType(node, 'modifier');
        return modifiers.map(m => m.text);
    }

    /**
     * 获取参数信息（文本格式）
     * @private
     */
    _getParametersText(methodNode) {
        const params = methodNode.childForFieldName('parameters');
        return params ? params.text : '()';
    }

    /**
     * 获取详细参数信息（数组格式）
     * @private
     */
    _getParametersDetailed(methodNode) {
        const paramsNode = methodNode.childForFieldName('parameters');
        if (!paramsNode) {
            return [];
        }

        const parameters = [];
        
        // 遍历参数节点
        for (let i = 0; i < paramsNode.childCount; i++) {
            const child = paramsNode.child(i);
            
            // 跳过标点符号
            if (child.type === ',' || child.type === '(' || child.type === ')') {
                continue;
            }
            
            const paramInfo = this._extractParameterInfo(child);
            if (paramInfo) {
                parameters.push(paramInfo);
            }
        }
        
        return parameters;
    }

    /**
     * 提取单个参数的信息
     * @private
     */
    _extractParameterInfo(paramNode) {
        // 不同语言的参数节点类型不同
        const paramTypes = [
            'formal_parameter',           // Java
            'parameter',                  // Python, JavaScript
            'identifier',                 // 简单情况
            'typed_parameter',            // Python with type
            'typed_default_parameter',    // Python with type and default
            'default_parameter',          // Python with default
            'required_parameter',         // Ruby
            'optional_parameter',         // C#
        ];

        if (!paramTypes.includes(paramNode.type) && 
            paramNode.type !== 'identifier' &&
            !paramNode.type.includes('parameter')) {
            return null;
        }

        let name = 'unknown';
        let type = null;
        let defaultValue = null;

        // 尝试获取参数名
        const nameNode = paramNode.childForFieldName('name') || 
                        paramNode.childForFieldName('pattern');
        if (nameNode) {
            name = nameNode.text;
        } else if (paramNode.type === 'identifier') {
            name = paramNode.text;
        }

        // 尝试获取参数类型
        const typeNode = paramNode.childForFieldName('type');
        if (typeNode) {
            type = typeNode.text;
        }

        // 尝试获取默认值
        const valueNode = paramNode.childForFieldName('value') ||
                         paramNode.childForFieldName('default_value');
        if (valueNode) {
            defaultValue = valueNode.text;
        }

        return {
            name: name,
            type: type,
            defaultValue: defaultValue,
            hasDefault: defaultValue !== null,
            text: paramNode.text
        };
    }

    /**
     * 获取访问控制修饰符
     * @private
     */
    _getAccessControl(modifiers) {
        const accessModifiers = ['public', 'private', 'protected', 'internal'];
        const found = modifiers.find(m => accessModifiers.includes(m));
        return found || 'default';
    }

    /**
     * 获取父类/接口/模块信息
     * @private
     */
    _getParentInfo(node) {
        let parent = node.parent;
        const info = {
            className: null,
            interfaceName: null,
            moduleName: null,
            type: null
        };

        while (parent) {
            // 检查是否是类
            if (this.config.classTypes.includes(parent.type)) {
                const nameNode = parent.childForFieldName(this.config.classNameField || 'name');
                info.className = nameNode ? nameNode.text : null;
                info.type = 'class';
                
                // 检查父类是否实现接口（C#/Java）
                const superclass = parent.childForFieldName('superclass');
                if (superclass) {
                    info.extends = superclass.text;
                }
                
                const interfaces = parent.childForFieldName('interfaces');
                if (interfaces) {
                    info.implements = interfaces.text;
                }
                
                break;
            }
            
            // 检查是否是接口
            if (parent.type === 'interface_declaration') {
                const nameNode = parent.childForFieldName('name');
                info.interfaceName = nameNode ? nameNode.text : null;
                info.type = 'interface';
                break;
            }
            
            // 检查是否是模块/命名空间
            if (parent.type === 'module' || parent.type === 'namespace_declaration') {
                const nameNode = parent.childForFieldName('name');
                info.moduleName = nameNode ? nameNode.text : null;
                info.type = 'module';
            }
            
            parent = parent.parent;
        }

        return info;
    }

    /**
     * 检查是否为重写/实现方法
     * @private
     */
    _isOverrideMethod(methodNode, modifiers) {
        // 检查 override 修饰符（C#）
        if (modifiers.includes('override')) {
            return true;
        }
        
        // 检查装饰器（Python）
        const parent = methodNode.parent?.parent;
        if (parent && parent.type === 'decorated_definition') {
            const decorators = this.findNodesByType(parent, 'decorator');
            for (const decorator of decorators) {
                const text = decorator.text.toLowerCase();
                if (text.includes('override') || text.includes('overrides')) {
                    return true;
                }
            }
        }
        
        // 检查注释中的 @Override（Java）
        // 这需要更复杂的分析，暂时返回 false
        return false;
    }

    /**
     * 获取装饰器列表
     * @private
     */
    _getDecorators(methodNode) {
        const decorators = [];
        
        // 检查是否有装饰器（Python/TypeScript）
        const parent = methodNode.parent?.parent;
        if (parent && parent.type === 'decorated_definition') {
            const decoratorNodes = this.findNodesByType(parent, 'decorator');
            decoratorNodes.forEach(d => {
                const nameNode = d.childForFieldName('name');
                decorators.push({
                    name: nameNode ? nameNode.text : d.text,
                    text: d.text
                });
            });
        }
        
        // 检查注解（Java）
        let sibling = methodNode.previousNamedSibling;
        while (sibling) {
            if (sibling.type === 'marker_annotation' || 
                sibling.type === 'annotation') {
                decorators.push({
                    name: sibling.text,
                    text: sibling.text
                });
            }
            sibling = sibling.previousNamedSibling;
        }
        
        return decorators;
    }

    /**
     * 获取返回类型
     * @private
     */
    _getReturnType(methodNode) {
        const typeNode = methodNode.childForFieldName('type') || 
                        methodNode.childForFieldName('return_type');
        return typeNode ? typeNode.text : 'void';
    }

    /**
     * 判断是否为异步方法
     * @private
     */
    _isAsyncMethod(methodNode) {
        return methodNode.text.trim().startsWith('async');
    }

    /**
     * 判断是否为静态方法
     * @private
     */
    _isStaticMethod(methodNode, modifiers) {
        if (modifiers.includes('static')) {
            return true;
        }
        
        // Python 特殊处理：检查 @staticmethod 装饰器
        const parent = methodNode.parent?.parent;
        if (parent && parent.type === 'decorated_definition') {
            const decorators = this.findNodesByType(parent, 'decorator');
            return decorators.some(d => d.text.includes('staticmethod'));
        }
        
        return false;
    }

    /**
     * 获取父类名称
     * @private
     */
    _getParentClassName(node) {
        let parent = node.parent;
        while (parent) {
            if (this.config.classTypes.includes(parent.type)) {
                const nameNode = parent.childForFieldName(this.config.classNameField || 'name');
                return nameNode ? nameNode.text : null;
            }
            parent = parent.parent;
        }
        return null;
    }

    /**
     * 获取方法签名
     * @private
     */
    _getMethodSignature(methodNode, name, parameters, returnType) {
        return `${returnType} ${name}${parameters}`;
    }

    /**
     * 提取字段信息（可被子类重写以适应不同语言）
     * @private
     */
    _extractFieldInfo(fieldNode, index) {
        const fieldName = this._getNodeName(fieldNode, this.config.fieldNameField);
        const fieldType = this._getFieldType(fieldNode);
        const modifiers = this._getModifiers(fieldNode);
        const parentClass = this._getParentClassName(fieldNode);
        
        return {
            index: index + 1,
            name: fieldName,
            type: fieldType,
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

    /**
     * 获取字段类型
     * @private
     */
    _getFieldType(fieldNode) {
        const typeNode = fieldNode.childForFieldName('type');
        return typeNode ? typeNode.text : 'unknown';
    }

    /**
     * 获取完整的提取结果
     * @param {string} code - 源代码
     * @returns {Object} 包含类、方法、字段的完整信息
     */
    extractAll(code) {
        return {
            classes: this.extractClasses(code),
            methods: this.extractMethods(code),
            fields: this.extractFields(code)
        };
    }

    /**
     * 打印提取结果
     * @param {Object} results - 提取结果对象
     */
    printResults(results) {
        console.log('=== 类列表 ===');
        console.log(`总计: ${results.classes.length} 个类`);
        results.classes.forEach(cls => {
            console.log(`\n类 ${cls.index}:`);
            console.log(`  名称: ${cls.name}`);
            console.log(`  修饰符: ${cls.modifiers.join(' ') || 'none'}`);
            console.log(`  方法数: ${cls.methodCount}`);
            console.log(`  字段数: ${cls.fieldCount}`);
            console.log(`  位置: 第 ${cls.location.startLine} 行`);
        });

        console.log('\n=== 方法列表 ===');
        console.log(`总计: ${results.methods.length} 个方法`);
        results.methods.forEach(method => {
            console.log(`\n方法 ${method.index}:`);
            console.log(`  名称: ${method.name}`);
            console.log(`  所属类: ${method.parentClass || '顶层函数'}`);
            console.log(`  访问控制: ${method.accessControl}`);
            console.log(`  修饰符: ${method.modifiers.join(' ') || 'none'}`);
            console.log(`  静态/实例: ${method.isStatic ? '静态' : '实例'}`);
            console.log(`  异步: ${method.isAsync ? '是' : '否'}`);
            console.log(`  返回类型: ${method.returnType}`);
            
            // 参数列表
            if (method.parametersList && method.parametersList.length > 0) {
                console.log(`  参数列表:`);
                method.parametersList.forEach((param, idx) => {
                    let paramStr = `    ${idx + 1}. ${param.name}`;
                    if (param.type) paramStr += `: ${param.type}`;
                    if (param.defaultValue) paramStr += ` = ${param.defaultValue}`;
                    console.log(paramStr);
                });
            } else {
                console.log(`  参数列表: 无参数`);
            }
            
            // 装饰器
            if (method.decorators && method.decorators.length > 0) {
                console.log(`  装饰器: ${method.decorators.map(d => d.name).join(', ')}`);
            }
            
            // 继承关系
            if (method.isOverride) {
                console.log(`  继承: Override/实现方法`);
            }
            
            console.log(`  签名: ${method.signature}`);
            console.log(`  位置: 第 ${method.location.startLine} 行`);
        });

        console.log('\n=== 字段列表 ===');
        console.log(`总计: ${results.fields.length} 个字段`);
        results.fields.forEach(field => {
            console.log(`\n字段 ${field.index}:`);
            console.log(`  名称: ${field.name}`);
            console.log(`  类型: ${field.type}`);
            console.log(`  所属类: ${field.parentClass || '顶层变量'}`);
            console.log(`  修饰符: ${field.modifiers.join(' ') || 'none'}`);
            console.log(`  位置: 第 ${field.location.startLine} 行`);
        });
    }
}

export default ASTExtractor;

