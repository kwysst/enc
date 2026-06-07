import { toast } from '/web-utils/utils-scripts/components/Toast/Toast.js';

// Генератор зашифрованных файлов
const ConfigGenerator = (() => {
    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }
    
    async function createEncryptedConfig(passphrase, configData) {
        if (!passphrase || passphrase.length < 4) {
            throw new Error('Pass-фраза должна содержать минимум 4 символа');
        }
        
        // Валидация по схеме
        if (typeof ENC_SCHEMA !== 'undefined') {
            const validation = EncCore.validate(configData, ENC_SCHEMA);
            if (!validation.valid) {
                throw new Error(`Ошибка валидации:\n${validation.errors.join('\n')}`);
            }
        }
        
        // Шифрование с метаданными и схемой
        const encrypted = await EncCore.encrypt(configData, passphrase, {
            includeMeta: true,
            version: ENC_SCHEMA?.version || '1.0',
            schema: ENC_SCHEMA
        });
        
        const filename = await EncCore.generateFilename(passphrase);
        downloadFile(`${filename}.enc`, JSON.stringify(encrypted, null, 2));
        
        return {
            filename: `${filename}.enc`,
            success: true
        };
    }
    
    function parseConfigFromText(jsonText) {
        try {
            const config = JSON.parse(jsonText);
            
            // Базовая проверка структуры
            if (!config.buttons || !Array.isArray(config.buttons)) {
                throw new Error('Отсутствует поле "buttons" или оно не является массивом');
            }
            
            if (config.buttons.length === 0) {
                throw new Error('Массив "buttons" не может быть пустым');
            }
            
            // Проверка каждой кнопки
            for (let i = 0; i < config.buttons.length; i++) {
                const btn = config.buttons[i];
                if (!btn.text || typeof btn.text !== 'string') {
                    throw new Error(`Кнопка ${i + 1}: отсутствует поле "text"`);
                }
                if (!btn.message || typeof btn.message !== 'string') {
                    throw new Error(`Кнопка ${i + 1}: отсутствует поле "message"`);
                }
            }
            
            return config;
        } catch (e) {
            if (e instanceof SyntaxError) {
                throw new Error(`Ошибка парсинга JSON: ${e.message}`);
            }
            throw e;
        }
    }
    
    function init() {
        const passphraseInput = document.getElementById('generatorPassphrase');
        const configTextarea = document.getElementById('generatorConfigJson');
        const generateBtn = document.getElementById('generatorGenerateBtn');
        const loadExampleBtn = document.getElementById('generatorLoadExampleBtn');
        
        // Устанавливаем placeholder из внешнего файла
        if (configTextarea && typeof ENC_PLACEHOLDER !== 'undefined') {
            configTextarea.placeholder = ENC_PLACEHOLDER;
        }
        
        if (loadExampleBtn) {
            loadExampleBtn.addEventListener('click', () => {
                if (typeof ENC_TEMPLATE !== 'undefined') {
                    configTextarea.value = JSON.stringify(ENC_TEMPLATE, null, 2);
                    toast.success('Пример загружен');
                } else {
                    toast.error('Шаблон не найден');
                }
            });
        }
        
        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                const passphrase = passphraseInput.value;
                const configJson = configTextarea.value;
                
                if (!passphrase) {
                    toast.error('Введите pass-фразу');
                    return;
                }
                
                if (!configJson) {
                    toast.error('Введите конфигурацию в формате JSON');
                    return;
                }
                
                try {
                    const config = parseConfigFromText(configJson);
                    generateBtn.disabled = true;
                    generateBtn.textContent = 'Шифрование...';
                    
                    await createEncryptedConfig(passphrase, config);
                    
                    toast.success('Файл сохранен!');
                } catch (error) {
                    toast.error(`Ошибка: ${error.message}`);
                } finally {
                    generateBtn.disabled = false;
                    generateBtn.textContent = 'Создать .enc файл';
                }
            });
        }
    }
    
    return {
        createEncryptedConfig,
        parseConfigFromText,
        init
    };
})();

if (document.getElementById('generatorForm')) {
    document.addEventListener('DOMContentLoaded', () => {
        ConfigGenerator.init();
    });
}