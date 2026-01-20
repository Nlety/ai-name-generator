/**
 * 存储服务 - 收藏的名字
 */
const STORAGE_KEY = 'ai_name_favorites';
const API_BASE = '/api/name-storage';

async function getFavorites() {
    try {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        try { const r = await fetch(`${API_BASE}?action=list`); if (r.ok) { const c = await r.json(); if (c.favorites) { const m = mergeData(local, c.favorites); localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); return m; } } } catch (e) { }
        return local;
    } catch (e) { return []; }
}

function mergeData(local, cloud) { const map = new Map();[...local, ...cloud].forEach(r => { if (!map.has(r.id) || r.updatedAt > map.get(r.id).updatedAt) map.set(r.id, r); }); return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt); }

async function saveFavorite(item) {
    try {
        const favorites = await getFavorites();
        const now = Date.now();
        if (!item.id) { item.id = `name_${now}_${Math.random().toString(36).slice(2, 8)}`; item.createdAt = now; }
        item.updatedAt = now;
        const index = favorites.findIndex(r => r.id === item.id);
        if (index >= 0) favorites[index] = item; else favorites.unshift(item);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        let cloudSync = false;
        try { const r = await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', item }) }); cloudSync = r.ok; } catch (e) { }
        return { success: true, cloudSync, item };
    } catch (e) { return { success: false, error: e.message }; }
}

async function deleteFavorite(id) {
    try {
        let favorites = await getFavorites();
        favorites = favorites.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        try { await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) }); } catch (e) { }
        return { success: true };
    } catch (e) { return { success: false }; }
}

window.StorageService = { getFavorites, saveFavorite, deleteFavorite };
