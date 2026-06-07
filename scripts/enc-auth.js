import { toast } from '/web-utils/utils-scripts/components/Toast/Toast.js';

(function(global) {
    class EncAuth {
        constructor(options = {}) {
            this.containerId = options.containerId || 'encApp';
            this.dataPath = options.dataPath || 'data/';
            this.title = options.title || 'Контент';
            this.onLogin = options.onLogin || null;
            this.onLogout = options.onLogout || null;
            this.currentConfig = null;
            
            this.init();
        }
        
        async loadConfig(passphrase) {
            const filename = await EncCore.generateFilename(passphrase);
            const fileUrl = `${this.dataPath}${filename}.enc`;
            
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('Файл конфигурации не найден');
            
            const encryptedData = await response.json();
            return await EncCore.decrypt(encryptedData, passphrase);
        }
        
        async login(passphrase) {
            try {
                const config = await this.loadConfig(passphrase);
                this.currentConfig = config;
                
                this.showAppContent();
                toast.success('Вход выполнен успешно');
                
                if (this.onLogin) await this.onLogin(config);
                return { success: true, config };
            } catch (error) {
                toast.error(error.message);
                return { success: false, error: error.message };
            }
        }
        
        async logout() {
            this.currentConfig = null;
            this.showLoginForm();
            
            // Очищаем поле ввода
            const passInput = document.getElementById('encPassphrase');
            if (passInput) passInput.value = '';
            
            toast.message('Вы вышли из системы');
            
            if (this.onLogout) await this.onLogout();
        }
        
        showLoginForm() {
            const loginDiv = document.getElementById('encLoginContainer');
            const appDiv = document.getElementById('encAppContainer');
            if (loginDiv) loginDiv.style.display = 'block';
            if (appDiv) appDiv.style.display = 'none';
        }
        
        showAppContent() {
            const loginDiv = document.getElementById('encLoginContainer');
            const appDiv = document.getElementById('encAppContainer');
            if (loginDiv) loginDiv.style.display = 'none';
            if (appDiv) appDiv.style.display = 'block';
        }
        
        render(container) {
            container.innerHTML = `
                <div id="encLoginContainer">
                    <div class="enc-card">
                        <div class="enc-header">
                            <h2>Вход</h2>
                            <button type="button" id="encOpenGenerator" class="enc-btn-icon">
                                <img src="enc-module/src/settings.svg" alt="settings" width="20" height="20">
                            </button>
                        </div>
                        <input id="encPassphrase" class="enc-input" placeholder="Pass-фраза">
                        <button id="encLoginBtn" class="enc-btn">Войти</button>
                    </div>
                </div>
                
                <div id="encAppContainer" style="display:none;">
                    <div class="enc-card">
                        <div class="enc-header">
                            <h2>${this.title}</h2>
                            <button id="encLogoutBtn" class="enc-btn-icon">
                                <img src="enc-module/src/logout.svg" alt="logout" width="20" height="20">
                            </button>
                        </div>
                        <div id="encContent"></div>
                    </div>
                </div>
            `;
            
            document.getElementById('encLoginBtn')?.addEventListener('click', async () => {
                const passphrase = document.getElementById('encPassphrase').value;
                if (!passphrase) {
                    toast.error('Введите pass-фразу');
                    return;
                }
                
                const btn = document.getElementById('encLoginBtn');
                btn.disabled = true;
                btn.textContent = 'Вход...';
                
                await this.login(passphrase);
                
                btn.disabled = false;
                btn.textContent = 'Войти';
            });
            
            document.getElementById('encLogoutBtn')?.addEventListener('click', async () => {
                await this.logout();
            });
            
            document.getElementById('encOpenGenerator')?.addEventListener('click', () => {
                window.location.href = 'enc-module/enc-generator.html';
            });
            
            // Автологин из URL
            const urlPass = new URLSearchParams(window.location.search).get('pass');
            const passInput = document.getElementById('encPassphrase');
            if (urlPass && passInput) {
                passInput.value = urlPass;
                document.getElementById('encLoginBtn')?.click();
            }
        }
        
        getContentContainer() {
            return document.getElementById('encContent');
        }
        
        init() {
            const container = document.getElementById(this.containerId);
            if (!container) {
                console.error(`Container ${this.containerId} not found`);
                return;
            }
            
            this.render(container);
        }
    }
    
    global.EncAuth = EncAuth;
})(window);