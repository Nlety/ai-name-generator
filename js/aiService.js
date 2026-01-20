/**
 * AI 服务 - 起名生成
 */
const CONFIG_KEY = 'ai_name_config';
const REMOTE_CONFIG_URL = 'https://ai-pages.dc616fa1.er.aliyun-esa.net/api/storage?key=config';
const DECRYPT_KEY = 'shfn73fnein348un';

function decryptConfig(e) { try { const d = CryptoJS.RC4.decrypt(e, DECRYPT_KEY).toString(CryptoJS.enc.Utf8); if (!d) return null; const c = JSON.parse(d); c.modelName = 'GLM-4-Flash'; return c; } catch (e) { return null; } }
async function fetchRemoteConfig() { try { const r = await fetch(REMOTE_CONFIG_URL); if (!r.ok) return null; const d = await r.json(); if (d && d.value) { const c = decryptConfig(d.value); if (c && c.apiUrl && c.apiKey) { localStorage.setItem(CONFIG_KEY + '_remote', JSON.stringify(c)); return c; } } return null; } catch (e) { return null; } }
function getModelConfig() { try { const u = localStorage.getItem(CONFIG_KEY); if (u) { const p = JSON.parse(u); if (p && p.apiUrl && p.apiKey && p.modelName) return p; } const r = localStorage.getItem(CONFIG_KEY + '_remote'); if (r) return JSON.parse(r); return null; } catch (e) { return null; } }
function saveModelConfig(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }
async function initConfig() { const c = getModelConfig(); if (c) return c; return await fetchRemoteConfig(); }

async function generateNames(type, options, onMessage, onComplete, onError) {
    let config = getModelConfig();
    if (!config || !config.apiUrl || !config.apiKey) config = await fetchRemoteConfig();
    if (!config || !config.apiUrl || !config.apiKey || !config.modelName) { onError(new Error('请先配置模型')); return { abort: () => { } }; }

    const prompts = {
        baby: `你是一位精通中华传统文化的起名专家。请为姓${options.surname || '李'}的${options.gender === 'male' ? '男孩' : options.gender === 'female' ? '女孩' : '孩子'}起5个好名字。
${options.requirements ? `期望：${options.requirements}` : ''}

请按以下格式输出每个名字：
### 名字1：[姓名]
**寓意**：（解释名字的含义和寓意）
**字义**：（逐字解释每个字的含义）
**五行**：（分析五行属性）
**读音**：（标注拼音，分析音韵是否和谐）`,
        company: `你是一位资深品牌命名专家。请为${options.requirements || '一家科技公司'}起5个公司/品牌名称。
要求：易记、有辨识度、适合注册

请按以下格式输出：
### 名称1：[名称]
**英文**：（建议的英文名）
**寓意**：（名称含义）
**适用场景**：（适合什么类型的公司）`,
        product: `你是一位产品命名专家。请为${options.requirements || '一款App'}起5个产品名称。
要求：简洁、易记、有创意

请按以下格式输出：
### 名称1：[名称]
**英文**：（英文名或拼音）
**风格**：（名称风格特点）
**联想**：（用户看到名称会联想到什么）`,
        game: `你是一位资深玩家。请生成5个${options.requirements || '炫酷的'}游戏ID/昵称。
要求：独特、有个性、容易记住

请按以下格式输出：
### ID1：[ID名称]
**风格**：（ID的风格）
**含义**：（ID的含义或来源）`,
        pet: `你是一位宠物专家。请为${options.requirements || '一只可爱的宠物'}起5个可爱的名字。
要求：朗朗上口、有亲和力

请按以下格式输出：
### 名字1：[名字]
**风格**：（可爱/霸气/文艺等）
**寓意**：（名字的含义）`
    };

    const controller = new AbortController();
    try {
        const response = await fetch(`${config.apiUrl}/chat/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({ model: config.modelName, messages: [{ role: 'user', content: prompts[type] || prompts.baby }], stream: true, temperature: 0.9 }),
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`请求失败: ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) { onComplete(); break; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n'); buffer = lines.pop() || '';
            for (const line of lines) { if (line.startsWith('data: ')) { const data = line.slice(6).trim(); if (data === '[DONE]') { onComplete(); return; } try { const content = JSON.parse(data).choices?.[0]?.delta?.content; if (content) onMessage(content); } catch (e) { } } }
        }
    } catch (error) { if (error.name !== 'AbortError') onError(error); }
    return { abort: () => controller.abort() };
}

window.AIService = { getModelConfig, saveModelConfig, initConfig, generateNames };
