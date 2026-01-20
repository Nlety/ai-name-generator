/**
 * AI 起名大师 - 主应用
 */
const DOM = {};
const AppState = { type: 'baby', surname: '', gender: 'male', requirements: '', currentResult: '', favorites: [] };

function initDOM() {
    DOM.surname = document.getElementById('surname');
    DOM.gender = document.getElementById('gender');
    DOM.requirements = document.getElementById('requirements');
    DOM.babyOptions = document.getElementById('baby-options');
    DOM.btnGenerate = document.getElementById('btn-generate');
    DOM.resultArea = document.getElementById('result-area');
    DOM.namesContent = document.getElementById('names-content');
    DOM.favoritesPanel = document.getElementById('favorites-panel');
    DOM.favoritesList = document.getElementById('favorites-list');
    DOM.favoritesOverlay = document.getElementById('favorites-overlay');
    DOM.settingsModal = document.getElementById('settings-modal');
    DOM.toast = document.getElementById('toast');
}

function initEvents() {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.type = btn.dataset.type;
            DOM.babyOptions.classList.toggle('hidden', btn.dataset.type !== 'baby');
        });
    });

    DOM.surname.addEventListener('input', () => AppState.surname = DOM.surname.value);
    DOM.gender.addEventListener('change', () => AppState.gender = DOM.gender.value);
    DOM.requirements.addEventListener('input', () => AppState.requirements = DOM.requirements.value);
    DOM.btnGenerate.addEventListener('click', generateNames);

    document.getElementById('btn-favorites').addEventListener('click', () => { DOM.favoritesPanel.classList.add('open'); DOM.favoritesOverlay.classList.remove('hidden'); });
    document.getElementById('btn-close-favorites').addEventListener('click', closeFavorites);
    DOM.favoritesOverlay.addEventListener('click', closeFavorites);

    document.getElementById('btn-settings').addEventListener('click', () => { DOM.settingsModal.classList.add('show'); loadSettings(); });
    document.getElementById('btn-close-settings').addEventListener('click', () => DOM.settingsModal.classList.remove('show'));
    document.getElementById('btn-cancel-settings').addEventListener('click', () => DOM.settingsModal.classList.remove('show'));
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

    document.querySelectorAll('.example-btn').forEach(btn => btn.addEventListener('click', () => loadExample(btn.dataset.example)));
}

const EXAMPLES = {
    boy: { type: 'baby', surname: '王', gender: 'male', requirements: '希望名字有诗意，寓意聪明智慧' },
    girl: { type: 'baby', surname: '李', gender: 'female', requirements: '希望名字温婉优雅，有书香气质' },
    brand: { type: 'company', requirements: '一家做智能家居的科技公司，要有未来感' },
    gameid: { type: 'game', requirements: '炫酷霸气的游戏ID，适合竞技游戏' }
};

function loadExample(key) {
    const ex = EXAMPLES[key];
    if (!ex) return;
    AppState.type = ex.type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.type-btn[data-type="${ex.type}"]`)?.classList.add('active');
    DOM.babyOptions.classList.toggle('hidden', ex.type !== 'baby');
    if (ex.surname) { DOM.surname.value = ex.surname; AppState.surname = ex.surname; }
    if (ex.gender) { DOM.gender.value = ex.gender; AppState.gender = ex.gender; }
    DOM.requirements.value = ex.requirements || '';
    AppState.requirements = ex.requirements || '';
    showToast('info', '已填入示例', '点击"生成名字"');
}

async function generateNames() {
    DOM.resultArea.classList.remove('hidden');
    DOM.namesContent.innerHTML = '';
    AppState.currentResult = '';

    await AIService.generateNames(AppState.type, {
        surname: AppState.surname,
        gender: AppState.gender,
        requirements: AppState.requirements
    },
        (text) => { AppState.currentResult += text; DOM.namesContent.innerHTML = formatContent(AppState.currentResult); },
        () => showToast('success', '生成完成', ''),
        (e) => showToast('error', '生成失败', e.message)
    );
}

function formatContent(text) {
    return text
        .replace(/^### (.+)$/gm, '<div class="name-card"><h3 class="text-lg font-bold text-violet-700">$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-amber-600">$1</strong>')
        .replace(/\n(?=###)/g, '</div>\n')
        .replace(/\n/g, '<br>');
}

async function loadFavorites() { AppState.favorites = await StorageService.getFavorites(); renderFavorites(); }

function renderFavorites() {
    if (AppState.favorites.length === 0) { DOM.favoritesList.innerHTML = '<p class="text-gray-400 text-sm text-center">暂无收藏</p>'; return; }
    DOM.favoritesList.innerHTML = AppState.favorites.map(f => `
        <div class="p-3 bg-violet-50 rounded-xl" data-id="${f.id}">
            <div class="font-medium text-violet-700">${f.name}</div>
            <div class="text-xs text-gray-400 mt-1">${f.type === 'baby' ? '宝宝名' : f.type === 'company' ? '公司名' : f.type === 'product' ? '产品名' : f.type === 'game' ? '游戏ID' : '宠物名'}</div>
        </div>
    `).join('');
}

function closeFavorites() { DOM.favoritesPanel.classList.remove('open'); DOM.favoritesOverlay.classList.add('hidden'); }
function loadSettings() { const c = AIService.getModelConfig() || {}; document.getElementById('api-url').value = c.apiUrl || ''; document.getElementById('api-key').value = c.apiKey || ''; document.getElementById('model-name').value = c.modelName || ''; }
function saveSettings() { const c = { apiUrl: document.getElementById('api-url').value.trim(), apiKey: document.getElementById('api-key').value.trim(), modelName: document.getElementById('model-name').value.trim() || 'GLM-4-Flash' }; if (!c.apiUrl || !c.apiKey) { showToast('warning', '请填写完整', ''); return; } AIService.saveModelConfig(c); DOM.settingsModal.classList.remove('show'); showToast('success', '配置已保存', ''); }

function showToast(type, title, message) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-violet-500' };
    document.getElementById('toast-icon').className = `w-8 h-8 rounded-full flex items-center justify-center ${colors[type]}`;
    document.getElementById('toast-icon').textContent = icons[type];
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-message').textContent = message;
    DOM.toast.classList.remove('hidden');
    setTimeout(() => DOM.toast.classList.add('hidden'), 3000);
}

async function init() {
    initDOM();
    initEvents();
    await loadFavorites();
    const config = await AIService.initConfig();
    if (!config) setTimeout(() => { DOM.settingsModal.classList.add('show'); showToast('info', '欢迎使用', '请配置 AI 模型'); }, 500);
}

document.addEventListener('DOMContentLoaded', init);
