// enc-core.js - универсальное ядро шифрования
(function(global) {
    const ITERATIONS = 300000;
    
    function normalizeStr(str) {
        return str.trim().toLowerCase().normalize('NFKC').replace(/\s+/g, '');
    }
    
    async function sha256(text) {
        const data = new TextEncoder().encode(text);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    function bufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }
    
    function base64ToBuffer(base64) {
        const binary = atob(base64);
        return Uint8Array.from(binary, c => c.charCodeAt(0));
    }
    
    async function deriveKey(password, salt, operation) {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(normalizeStr(password)),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            [operation]
        );
    }
    
    async function encrypt(payload, password, options = {}) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt, 'encrypt');
        
        const dataToEncrypt = options.includeMeta ? {
            ...payload,
            _encrypted_at: Date.now(),
            _version: options.version || '1.0'
        } : payload;
        
        const encoded = new TextEncoder().encode(JSON.stringify(dataToEncrypt));
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
        
        const result = {
            v: 1,
            alg: 'AES-GCM',
            kdf: 'PBKDF2-SHA256',
            iterations: ITERATIONS,
            salt: bufferToBase64(salt),
            iv: bufferToBase64(iv),
            ciphertext: bufferToBase64(ciphertext)
        };
        
        if (options.schema) result.schema = options.schema;
        return result;
    }
    
    async function decrypt(encryptedData, password) {
        const salt = base64ToBuffer(encryptedData.salt);
        const iv = base64ToBuffer(encryptedData.iv);
        const ciphertext = base64ToBuffer(encryptedData.ciphertext);
        const key = await deriveKey(password, salt, 'decrypt');
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        const result = JSON.parse(new TextDecoder().decode(decrypted));
        
        delete result._encrypted_at;
        delete result._version;
        return result;
    }
    
    async function generateFilename(passphrase) {
        return await sha256(normalizeStr(passphrase));
    }
    
    function validate(data, schema) {
        if (!schema?.fields) return { valid: true, errors: [] };
        const errors = [];
        // ... валидация (сокращено для brevity)
        return { valid: errors.length === 0, errors };
    }
    
    global.EncCore = {
        encrypt, decrypt, generateFilename, validate, sha256, normalizeStr
    };
})(window);