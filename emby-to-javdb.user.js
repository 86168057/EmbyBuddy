// ==UserScript==
// @name         Emby全能助手
// @namespace    https://github.com/86168057/emby-to-javdb
// @version      0.1
// @description  在EMBY详情页和列表页添加跳转JAVDB按钮，集成全套15个外部播放器（已移除展开功能，优化性能）
// @author       潇洒公子
// @license      MIT
// @match        http://*/web/index.html*
// @match        https://*/web/index.html*
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMGJjZDQ7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM0Q0FGNTA7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0idXJsKCNnKSIgcng9IjMwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+RUE8L3RleHQ+PC9zdmc+
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      javdb.com
// @connect      *.javdb.com
// @connect      7o7o.cc
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== Emby全能助手 V0.1 已启动 ===');

    const iconBaseUrl = "https://emby-external-url.7o7o.cc/embyWebAddExternalUrl/icons";
    const playBtnsWrapperId = "ExternalPlayersBtns";
    let eDetail = null;
    let mutationTimer = null;

    const getSetting = (k, defaultVal = false) => {
        let val = GM_getValue(k);
        return val === undefined ? defaultVal : val;
    };
    const setSetting = (k, v) => GM_setValue(k, v);

    // ==================== CSS 注入 ====================
    function injectGlobalStyles() {
        if (document.getElementById('emby-assistant-global-styles')) return;
        const style = document.createElement('style');
        style.id = 'emby-assistant-global-styles';
        style.innerHTML = `
            .javdb-list-btn:hover { opacity: 1 !important; transform: scale(1.1); }
        `;
        document.head.appendChild(style);
    }

    // ==================== JAVDB 跳转逻辑 ====================

    function extractCode(text) {
        if (!text) return null;
        const patterns = [/([A-Z]{2,10}-\d{3,5})/i, /([A-Z]{2,10}\d{3,5})/i, /\b([A-Z]{2,10}-[A-Z]?\d{3,5})\b/i];
        for (let pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1].toUpperCase();
        }
        return null;
    }

    function performJump(code, btnElement) {
        const btnText = btnElement.querySelector('span') || btnElement;
        const originalHtml = btnText.innerHTML;
        btnText.innerHTML = '🔍 搜索中...';
        btnElement.disabled = true;
        const searchUrl = `https://javdb.com/search?q=${encodeURIComponent(code)}&f=all`;
        GM_xmlhttpRequest({
            method: 'GET', url: searchUrl, timeout: 5000,
            onload: function(response) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');
                    const firstResult = doc.querySelector('.movie-list .item a, .video-list .item a');
                    if (firstResult && firstResult.href) {
                        const relativeUrl = firstResult.getAttribute('href');
                        window.open(relativeUrl.startsWith('http') ? relativeUrl : `https://javdb.com${relativeUrl}`, '_blank');
                    } else window.open(searchUrl, '_blank');
                } catch (err) { window.open(searchUrl, '_blank'); }
                setTimeout(() => { btnText.innerHTML = originalHtml; btnElement.disabled = false; }, 1000);
            },
            onerror: () => { window.open(searchUrl, '_blank'); btnText.innerHTML = originalHtml; btnElement.disabled = false; }
        });
    }

    function addListPageButtons() {
        const cards = document.querySelectorAll('.card, .itemAction[data-type="Movie"]');
        cards.forEach(card => {
            if (card.querySelector('.javdb-list-btn')) return;
            const titleEl = card.querySelector('.cardText, .cardFooter, .itemName');
            if (!titleEl) return;
            const code = extractCode(titleEl.textContent.trim());
            if (!code) return;
            const listBtn = document.createElement('div');
            listBtn.className = 'javdb-list-btn';
            listBtn.innerHTML = 'JD';
            listBtn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:100;background:linear-gradient(135deg,rgba(0,188,212,0.9),rgba(76,175,80,0.9));color:white;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.3);opacity:0.7; transition: all 0.2s;';
            listBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); performJump(code, listBtn); };
            const inner = card.querySelector('.cardBox, .cardScalable') || card;
            if (getComputedStyle(inner).position === 'static') inner.style.position = 'relative';
            inner.appendChild(listBtn);
        });
    }

    function addJavdbButton() {
        const titleSelectors = ['h1.itemName', 'h2.itemName', '.detailPagePrimaryTitle', '.itemName', '.parentName', '[class*="itemName"]', '.item-title'];
        let titleEl = null; let code = null;
        for (const s of titleSelectors) {
            const el = document.querySelector(s);
            if (el) { code = extractCode(el.textContent.trim()); if (code) { titleEl = el; break; } }
        }
        if (!titleEl || !code) {
            if (location.href.includes('item')) {
                const bodyText = document.body.textContent.substring(0, 5000);
                code = extractCode(bodyText);
            }
            if (!code) return;
        }
        const container = document.querySelector('.detailButtons, .itemDetailButtons, .mainDetailButtons');
        if (!container || container.querySelector('.javdb-jump-btn')) return;

        const jb = document.createElement('button');
        jb.className = 'javdb-jump-btn raised detailButton paper-icon-button-light';
        jb.innerHTML = '<span style="display:flex;align-items:center;gap:8px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>查看 JAVDB</span>';
        jb.style.cssText = 'background:linear-gradient(135deg,#00bcd4,#4CAF50);color:white;border:none;border-radius:8px;padding:12px 30px;font-size:16px;font-weight:bold;cursor:pointer;margin-left:15px;box-shadow:0 4px 10px rgba(0,0,0,0.3);height: fit-content;align-self: center;white-space: nowrap; transition: all 0.3s;';
        jb.onmouseenter = () => { jb.style.transform = 'scale(1.05)'; jb.style.filter = 'brightness(1.1)'; };
        jb.onmouseleave = () => { jb.style.transform = 'scale(1)'; jb.style.filter = 'brightness(1)'; };
        jb.onclick = (e) => { e.preventDefault(); e.stopPropagation(); performJump(code, jb); };
        container.appendChild(jb);
    }

    // ==================== 外部播放器逻辑 ====================

    async function getItemInfo() {
        let userId = ApiClient._serverInfo.UserId;
        let itemId = /\?id=([A-Za-z0-9]+)/.exec(window.location.hash)[1];
        return await ApiClient.getItem(userId, itemId);
    }

    async function getEmbyMediaInfo() {
        let itemInfo = await getItemInfo();
        let mediaSourceId = document.querySelector("select.selectSource:not([disabled])")?.value || itemInfo.MediaSources[0].Id;
        const accessToken = ApiClient.accessToken();
        let mediaSource = itemInfo.MediaSources.find(m => m.Id == mediaSourceId);
        let baseUrl = `${ApiClient._serverAddress}${eDetail?.detail?.contextPath ? "/emby/videos" : "/Items"}/${itemInfo.Id}`;
        let subUrl = "";
        let sub = mediaSource.MediaStreams.filter(m => m.IsExternal).find(m => m.Language == "chi") || mediaSource.MediaStreams.find(m => m.IsExternal);
        if (sub) subUrl = `${baseUrl}/Subtitles/${sub.Index}/Stream.${sub.Codec}?api_key=${accessToken}`;
        let streamUrl = `${baseUrl}/stream.${mediaSource.Container}?api_key=${accessToken}&Static=true&MediaSourceId=${mediaSourceId}&DeviceId=${ApiClient._deviceId}`;
        return { streamUrl, subUrl, position: parseInt(itemInfo.UserData.PlaybackPositionTicks / 10000), title: mediaSource.Path.split(/[\\/]/).pop() };
    }

    function getSeek(p) {
        let t = p * 10000, parts = [], h = Math.floor(t / 36e9);
        if (h) parts.push(h);
        let m = Math.floor((t -= 36e9 * h) / 6e8);
        parts.push(m < 10 && h ? "0" + m : m);
        let s = Math.floor((t -= 6e8 * m) / 1e7);
        parts.push(s < 10 ? "0" + s : s);
        return parts.join(":");
    }

    async function embyPot() {
        const info = await getEmbyMediaInfo();
        const multi = getSetting("pot_multi") ? "" : "/current";
        const potUrl = `potplayer://${encodeURI(info.streamUrl)} /sub=${encodeURI(info.subUrl)} ${multi} /seek=${getSeek(info.position)} /title="${info.title}"`;
        if (navigator.clipboard) await navigator.clipboard.writeText(potUrl); else GM_setClipboard(potUrl);
        document.getElementById('potplayer-invoker').src = `potplayer://${multi}/clipboard`;
    }

    async function embyVlc() { const i = await getEmbyMediaInfo(); window.open(`vlc://${encodeURI(i.streamUrl)}`, "_self"); }
    async function embyIINA() { const i = await getEmbyMediaInfo(); window.open(`iina://weblink?url=${encodeURIComponent(i.streamUrl)}&new_window=1`, "_self"); }
    async function embyNPlayer() { const i = await getEmbyMediaInfo(); window.open(`nplayer-${encodeURI(i.streamUrl)}`, "_self"); }
    async function embyMX() { const i = await getEmbyMediaInfo(); window.open(`intent:${encodeURI(i.streamUrl)}#Intent;package=com.mxtech.videoplayer.ad;S.title=${encodeURI(i.title)};i.position=${i.position};end`, "_self"); }
    async function embyMXPro() { const i = await getEmbyMediaInfo(); window.open(`intent:${encodeURI(i.streamUrl)}#Intent;package=com.mxtech.videoplayer.pro;S.title=${encodeURI(i.title)};i.position=${i.position};end`, "_self"); }
    async function embyInfuse() { const i = await getEmbyMediaInfo(); window.open(`infuse://x-callback-url/play?url=${encodeURIComponent(i.streamUrl)}&sub=${encodeURIComponent(i.subUrl)}`, "_self"); }
    async function embyMPV() { const i = await getEmbyMediaInfo(); window.open(`mpv://${encodeURI(i.streamUrl)}`, "_self"); }
    async function embyStellar() { const i = await getEmbyMediaInfo(); window.open(`stellar://play/${encodeURI(i.streamUrl)}`, "_self"); }
    async function embyDDPlay() { const i = await getEmbyMediaInfo(); window.open(`ddplay:${encodeURIComponent(i.streamUrl + "|filePath=" + i.title)}`, "_self"); }
    async function embyFileball() { const i = await getEmbyMediaInfo(); window.open(`filebox://play?url=${encodeURIComponent(i.streamUrl)}`, "_self"); }
    async function embyOmniPlayer() { const i = await getEmbyMediaInfo(); window.open(`omniplayer://weblink?url=${encodeURIComponent(i.streamUrl)}`, "_self"); }
    async function embyFigPlayer() { const i = await getEmbyMediaInfo(); window.open(`figplayer://weblink?url=${encodeURIComponent(i.streamUrl)}`, "_self"); }
    async function embySenPlayer() { const i = await getEmbyMediaInfo(); window.open(`SenPlayer://x-callback-url/play?url=${encodeURIComponent(i.streamUrl)}`, "_self"); }
    async function embyCopyUrl() { const i = await getEmbyMediaInfo(); GM_setClipboard(i.streamUrl); alert("已复制"); }

    const playBtns = [
        { id: "embyPot", title: "PotPlayer", iconId: "icon-PotPlayer", onClick: embyPot },
        { id: "embyVlc", title: "VLC", iconId: "icon-VLC", onClick: embyVlc },
        { id: "embyIINA", title: "IINA", iconId: "icon-IINA", onClick: embyIINA },
        { id: "embyNPlayer", title: "NPlayer", iconId: "icon-NPlayer", onClick: embyNPlayer },
        { id: "embyMX", title: "MXPlayer", iconId: "icon-MXPlayer", onClick: embyMX },
        { id: "embyMXPro", title: "MXPro", iconId: "icon-MXPlayerPro", onClick: embyMXPro },
        { id: "embyInfuse", title: "Infuse", iconId: "icon-infuse", onClick: embyInfuse },
        { id: "embyMPV", title: "MPV", iconId: "icon-MPV", onClick: embyMPV },
        { id: "embyStellar", title: "恒星播放器", iconId: "icon-StellarPlayer", onClick: embyStellar },
        { id: "embyDDPlay", title: "弹弹Play", iconId: "icon-DDPlay", onClick: embyDDPlay },
        { id: "embyFileball", title: "Fileball", iconId: "icon-Fileball", onClick: embyFileball },
        { id: "embyOmniPlayer", title: "OmniPlayer", iconId: "icon-OmniPlayer", onClick: embyOmniPlayer },
        { id: "embyFigPlayer", title: "FigPlayer", iconId: "icon-FigPlayer", onClick: embyFigPlayer },
        { id: "embySenPlayer", title: "SenPlayer", iconId: "icon-SenPlayer", onClick: embySenPlayer },
        { id: "embyCopyUrl", title: "复制串流", iconId: "icon-Copy", onClick: embyCopyUrl },
    ];

    function initExternalPlayers() {
        const container = document.querySelector('.mainDetailButtons, .detailButtons');
        if (!container) return;
        const oldWrapper = document.getElementById(playBtnsWrapperId);
        if (oldWrapper) oldWrapper.remove();
        const wrapper = document.createElement('div');
        wrapper.id = playBtnsWrapperId;
        wrapper.className = 'detailButtons flex align-items-flex-start flex-wrap-wrap detail-lineItem';
        wrapper.style.cssText = 'margin-top: 15px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);';
        const isIconOnly = getSetting("icon_only");
        playBtns.forEach(btn => {
            const b = document.createElement('button');
            b.className = 'detailButton emby-button emby-button-backdropfilter raised-backdropfilter detailButton-primary';
            b.style.margin = '6px';
            b.innerHTML = `<div class="detailButton-content"><i class="md-icon detailButton-icon" style="background-image: url(${iconBaseUrl}/${btn.iconId}.webp); background-size: 100% 100%; width: 24px; height: 24px;">　</i>${isIconOnly ? '' : `<span class="button-text" style="font-size: 14px; margin-left: 8px;">${btn.title}</span>`}</div>`;
            b.onclick = btn.onClick;
            wrapper.appendChild(b);
        });
        const configBtns = [{ id: "cfg_multi", title: "多开模式", key: "pot_multi" }, { id: "cfg_icon", title: "精简模式", key: "icon_only" }];
        configBtns.forEach(cfg => {
            const active = getSetting(cfg.key);
            const b = document.createElement('button');
            b.className = `detailButton emby-button ${active ? 'button-submit' : ''}`;
            b.style.cssText = `margin: 6px; border: 1px solid ${active ? '#4CAF50' : '#666'}; background: ${active ? 'rgba(76,175,80,0.2)' : 'transparent'}; cursor: pointer;`;
            b.innerHTML = `<span style="font-size: 12px;">${cfg.title}: ${active ? 'ON' : 'OFF'}</span>`;
            b.onclick = () => { setSetting(cfg.key, !active); initExternalPlayers(); };
            wrapper.appendChild(b);
        });
        if (!document.getElementById('potplayer-invoker')) {
            const ifr = document.createElement('iframe'); ifr.id = 'potplayer-invoker'; ifr.style.display = 'none'; document.body.appendChild(ifr);
        }
        const helpBox = document.createElement('div');
        helpBox.style.cssText = 'width: 100%; font-size: 13px; color: #ccc; margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; line-height: 1.6; border-left: 4px solid #4CAF50;';
        helpBox.innerHTML = `<div style="font-weight: bold; color: #4CAF50; margin-bottom: 8px; font-size: 15px;">使用说明（针对浏览器弹窗）：</div><div style="color: #ff9800; margin-bottom: 5px;">注意：仅当点击播放器按钮弹出的确认框中没有“始终允许”勾选框时，才需要执行以下手动操作。</div>1. 在地址栏输入：<code style="background: #444; padding: 2px 5px; border-radius: 3px;">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> 并回车。<br>2. 找到 <span style="color: #eee; font-weight: bold;">Insecure origins treated as secure</span> 项。<br>3. 在文本框填入：<span style="color: #00bcd4;">http://你的IP:${location.port || '8096'}</span><br>4. 将选项改为 <span style="color: #4CAF50; font-weight: bold;">Enabled</span> 并点击 <span style="color: #eee; font-weight: bold;">Relaunch</span> 重启浏览器。<br>5. 重启后再次点击 PotPlayer 按钮，勾选弹窗中的“始终允许”即可。`;
        wrapper.appendChild(helpBox);
        container.after(wrapper);
    }

    // ==================== 初始化 ====================
    injectGlobalStyles();
    const observer = new MutationObserver(() => {
        if (mutationTimer) clearTimeout(mutationTimer);
        mutationTimer = setTimeout(() => {
            if (location.hash.includes('id=')) {
                addJavdbButton();
                initExternalPlayers();
            } else {
                addListPageButtons();
            }
        }, 300);
    });

    document.addEventListener("viewbeforeshow", (e) => {
        eDetail = e;
        observer.observe(document.body, { childList: true, subtree: true });
    });

    setTimeout(() => {
        addListPageButtons();
        if (location.hash.includes('id=')) {
            addJavdbButton();
            initExternalPlayers();
        }
    }, 1000);
})();