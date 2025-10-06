/**
 * JSON 转文本生成器
 * 将代码分析结果转换为简洁的文本描述，用于 LLM 输入
 */
class TextGenerator {
    /**
     * 将完整的JSON分析结果转换为方法文本列表
     * @param {Object} jsonResult - CompleteExtractor 生成的 JSON 结果
     * @returns {Array<string>} 方法描述文本列表
     */
    static generateMethodTexts(jsonResult) {
        const methods = [];
        
        // 提取文件和语言信息
        const file = jsonResult.file || 'unknown';
        const language = jsonResult.language || 'unknown';
        
        // 处理类中的方法
        if (jsonResult.classes && jsonResult.classes.length > 0) {
            jsonResult.classes.forEach(cls => {
                if (cls.methods && cls.methods.length > 0) {
                    cls.methods.forEach(method => {
                        const text = this._formatMethodText(method, cls, file, language);
                        methods.push(text);
                    });
                }
            });
        }
        
        // 处理顶层函数
        if (jsonResult.functions && jsonResult.functions.length > 0) {
            jsonResult.functions.forEach(func => {
                const text = this._formatMethodText(func, null, file, language);
                methods.push(text);
            });
        }
        
        return methods;
    }
    
    /**
     * 格式化单个方法的文本描述
     * @private
     */
    static _formatMethodText(method, parentClass, file, language) {
        const parts = [];
        
        // 基本信息: 文件.类.方法名
        if (parentClass) {
            parts.push(`${file}:${parentClass.name}.${method.name}`);
        } else {
            parts.push(`${file}:${method.name}`);
        }
        
        // 语言
        parts.push(`lang=${language}`);
        
        // 返回类型
        if (method.return_type && method.return_type !== 'void') {
            parts.push(`returns=${method.return_type}`);
        }
        
        // 参数
        if (method.parameters && method.parameters.length > 0) {
            const params = method.parameters.map(p => {
                if (p.type && p.type !== 'any') {
                    return p.default_value 
                        ? `${p.name}:${p.type}=${p.default_value}`
                        : `${p.name}:${p.type}`;
                }
                return p.default_value 
                    ? `${p.name}=${p.default_value}`
                    : p.name;
            }).join(',');
            parts.push(`params=(${params})`);
        } else {
            parts.push('params=()');
        }
        
        // 修饰符
        if (method.modifiers && method.modifiers.length > 0) {
            const mods = method.modifiers.filter(m => 
                ['public', 'private', 'protected', 'static', 'async', 'override'].includes(m)
            );
            if (mods.length > 0) {
                parts.push(`modifiers=${mods.join(',')}`);
            }
        }
        
        // 文档
        if (method.documentation && method.documentation.has_doc && method.documentation.docstring) {
            const doc = method.documentation.docstring
                .replace(/\/\*\*|\*\/|\/\/|#|"""|'''/g, '')
                .trim()
                .replace(/\s+/g, ' ')
                .substring(0, 100);
            if (doc) {
                parts.push(`doc="${doc}"`);
            }
        }
        
        return parts.join(' ');
    }
    
    /**
     * 生成类的文本描述
     * @param {Object} jsonResult - JSON 结果
     * @returns {Array<string>} 类描述文本列表
     */
    static generateClassTexts(jsonResult) {
        const classes = [];
        
        if (!jsonResult.classes || jsonResult.classes.length === 0) {
            return classes;
        }
        
        const file = jsonResult.file || 'unknown';
        const language = jsonResult.language || 'unknown';
        
        jsonResult.classes.forEach(cls => {
            const parts = [];
            
            // 基本信息
            parts.push(`${file}:${cls.name}`);
            parts.push(`type=class`);
            parts.push(`lang=${language}`);
            
            // 继承和接口
            if (cls.superclass) {
                parts.push(`extends=${cls.superclass}`);
            }
            if (cls.interfaces && cls.interfaces.length > 0) {
                parts.push(`implements=${cls.interfaces.join(',')}`);
            }
            
            // 修饰符
            if (cls.modifiers && cls.modifiers.length > 0) {
                const mods = cls.modifiers.filter(m => 
                    ['public', 'private', 'protected', 'abstract', 'final'].includes(m)
                );
                if (mods.length > 0) {
                    parts.push(`modifiers=${mods.join(',')}`);
                }
            }
            
            // 成员统计
            if (cls.metrics) {
                parts.push(`methods=${cls.metrics.method_count}`);
                parts.push(`fields=${cls.metrics.field_count}`);
            }
            
            // 文档
            if (cls.documentation && cls.documentation.has_doc && cls.documentation.docstring) {
                const doc = cls.documentation.docstring
                    .replace(/\/\*\*|\*\/|\/\/|#|"""|'''/g, '')
                    .trim()
                    .replace(/\s+/g, ' ')
                    .substring(0, 100);
                if (doc) {
                    parts.push(`doc="${doc}"`);
                }
            }
            
            classes.push(parts.join(' '));
        });
        
        return classes;
    }
    
    /**
     * 生成字段的文本描述
     * @param {Object} jsonResult - JSON 结果
     * @returns {Array<string>} 字段描述文本列表
     */
    static generateFieldTexts(jsonResult) {
        const fields = [];
        
        if (!jsonResult.classes || jsonResult.classes.length === 0) {
            return fields;
        }
        
        const file = jsonResult.file || 'unknown';
        const language = jsonResult.language || 'unknown';
        
        jsonResult.classes.forEach(cls => {
            if (!cls.fields || cls.fields.length === 0) return;
            
            cls.fields.forEach(field => {
                const parts = [];
                
                // 基本信息
                parts.push(`${file}:${cls.name}.${field.name}`);
                parts.push(`type=field`);
                parts.push(`lang=${language}`);
                
                // 字段类型
                if (field.type) {
                    parts.push(`fieldType=${field.type}`);
                }
                
                // 修饰符
                if (field.modifiers && field.modifiers.length > 0) {
                    const mods = field.modifiers.filter(m => 
                        ['public', 'private', 'protected', 'static', 'final', 'const'].includes(m)
                    );
                    if (mods.length > 0) {
                        parts.push(`modifiers=${mods.join(',')}`);
                    }
                }
                
                // 默认值
                if (field.default_value) {
                    parts.push(`default=${field.default_value}`);
                }
                
                fields.push(parts.join(' '));
            });
        });
        
        return fields;
    }
    
    /**
     * 生成完整的文本描述（包含所有元素）
     * @param {Object} jsonResult - JSON 结果
     * @returns {Array<string>} 所有元素的文本描述列表
     */
    static generateAllTexts(jsonResult) {
        const texts = [];
        
        // 文件信息
        const fileParts = [];
        fileParts.push(`file=${jsonResult.file}`);
        fileParts.push(`lang=${jsonResult.language}`);
        
        if (jsonResult.imports && jsonResult.imports.length > 0) {
            fileParts.push(`imports=${jsonResult.imports.join(',')}`);
        }
        
        texts.push(fileParts.join(' '));
        
        // 添加类
        texts.push(...this.generateClassTexts(jsonResult));
        
        // 添加字段
        texts.push(...this.generateFieldTexts(jsonResult));
        
        // 添加方法
        texts.push(...this.generateMethodTexts(jsonResult));
        
        return texts;
    }
    
    /**
     * 生成单行紧凑格式（最节省token）
     * @param {Object} jsonResult - JSON 结果
     * @returns {string} 单行文本描述
     */
    static generateCompactText(jsonResult) {
        const elements = [];
        
        // 文件基本信息
        elements.push(`FILE:${jsonResult.file}[${jsonResult.language}]`);
        
        // 导入
        if (jsonResult.imports && jsonResult.imports.length > 0) {
            elements.push(`IMPORTS:${jsonResult.imports.join(',')}`);
        }
        
        // 类
        if (jsonResult.classes) {
            jsonResult.classes.forEach(cls => {
                const classInfo = [`CLASS:${cls.name}`];
                if (cls.superclass) classInfo.push(`<${cls.superclass}`);
                if (cls.interfaces && cls.interfaces.length > 0) {
                    classInfo.push(`+${cls.interfaces.join(',')}`);
                }
                elements.push(classInfo.join(''));
                
                // 类的方法
                if (cls.methods) {
                    cls.methods.forEach(m => {
                        const params = m.parameters.map(p => 
                            p.type ? `${p.name}:${p.type}` : p.name
                        ).join(',');
                        elements.push(`  METHOD:${m.name}(${params})->${m.return_type}`);
                    });
                }
            });
        }
        
        // 顶层函数
        if (jsonResult.functions) {
            jsonResult.functions.forEach(f => {
                const params = f.parameters.map(p => 
                    p.type ? `${p.name}:${p.type}` : p.name
                ).join(',');
                elements.push(`FUNCTION:${f.name}(${params})->${f.return_type}`);
            });
        }
        
        return elements.join(' | ');
    }
}

export default TextGenerator;
