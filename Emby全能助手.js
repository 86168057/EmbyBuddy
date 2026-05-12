// ==UserScript==
// @name         EMBY全能助手
// @name:en      EbyBuddy
// @name:zh      EMBY全能助手
// @name:zh-CN   EMBY全能助手
// @namespace    https://github.com/86168057/EmbyBuddy
// @version      2.2.0
// @description  Emby/Jellyfin 全能助手 - 外部播放器调用 + 番号搜索
// @description:zh-cn Emby/Jellyfin 全能助手：PotPlayer播放、JAVDB/JAVBus番号搜索（基于embyLaunchPotplayer二次开发）
// @description:en  Emby/Jellyfin All-in-One: PotPlayer playback, JAVDB/JAVBus search (fork of embyLaunchPotplayer)
// @license      MIT
// @author       潇洒公子
// @original-author chen3861229
// @source       https://github.com/86168057/EmbyBuddy
// @updateURL    https://raw.githubusercontent.com/86168057/EmbyBuddy/main/Emby全能助手.js
// @downloadURL  https://raw.githubusercontent.com/86168057/EmbyBuddy/main/Emby全能助手.js
// @match        *://*/web/index.html
// @match        *://*/web/
// @grant        GM_xmlhttpRequest
// @connect      javdb.com
// @connect      *.javdb.com
// @connect      javbus.com
// @connect      *.javbus.com
// ==/UserScript==

(function () {
    'use strict';

    // ========== 配置区域 ==========
    const iconConfig = {
        // 图标来源
        baseUrl: "https://emby-external-url.7o7o.cc/embyWebAddExternalUrl/icons",
    };

    // 启用后将修改直接串流链接为真实文件名
    const useRealFileName = false;

    // ========== 内部变量 ==========
    let isEmby = "";
    const mark = "embyLaunchPotplayerCustom";
    const playBtnsWrapperId = "ExternalPlayersBtns";
    const javBtnWrapperId = "JavSearchBtns";
    const lsKeys = {
        iconOnly: `${mark}-iconOnly`,
        hideByOS: `${mark}-hideByOS`,
        notCurrentPot: `${mark}-notCurrentPot`,
        strmDirect: `${mark}-strmDirect`,
    };

    // ========== 全局样式注入 ==========
    function injectGlobalStyles() {
        if (document.getElementById('emby-assistant-global-styles')) return;
        const style = document.createElement('style');
        style.id = 'emby-assistant-global-styles';
        style.innerHTML = `
            .jav-btn-row {
                display: flex !important;
                gap: 3px !important;
                padding: 1px 4px !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                width: 100% !important;
                max-height: 18px !important;
                overflow: visible !important;
            }
            .javdb-list-btn, .javbus-list-btn, .potplayer-list-btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex: 1 1 0 !important;
                padding: 0px 3px !important;
                border-radius: 6px !important;
                font-size: clamp(8px, 1vw, 11px) !important;
                font-weight: bold !important;
                cursor: pointer !important;
                box-shadow: 0 1px 2px rgba(0,0,0,0.15) !important;
                transition: all 0.15s ease !important;
                line-height: 1.2 !important;
                opacity: 0.9 !important;
                white-space: nowrap !important;
            }
            @media (max-width: 800px) {
                .javdb-list-btn, .javbus-list-btn, .potplayer-list-btn {
                    font-size: 7px !important;
                    padding: 0px 2px !important;
                }
                .jav-btn-row { gap: 2px !important; padding: 0px 3px !important; max-height: 15px !important; }
            }
            .javdb-list-btn:hover, .javbus-list-btn:hover, .potplayer-list-btn:hover {
                opacity: 1 !important;
                box-shadow: 0 2px 5px rgba(0,0,0,0.25) !important;
            }
        `;
        document.head.appendChild(style);
    }
    injectGlobalStyles();

    const OS = {
        isAndroid: () => /android/i.test(navigator.userAgent),
        isIOS: () => /iPad|iPhone|iPod/i.test(navigator.userAgent),
        isMacOS: () => /Macintosh|MacIntel/i.test(navigator.userAgent),
        isApple: () => OS.isMacOS() || OS.isIOS(),
        isWindows: () => /compatible|Windows/i.test(navigator.userAgent),
        isMobile: () => OS.isAndroid() || OS.isIOS(),
    };

    // ========== 播放按钮配置（仅保留Potplayer） ==========
    const playBtns = [
        { id: "embyPot", title: "Potplayer", iconId: "icon-PotPlayer", onClick: embyPot, osCheck: [OS.isWindows] },
    ];

    // ========== 自定义设置按钮（保留3个） ==========
    const customBtns = [
        { id: "iconOnly", title: "显示模式", iconName: "open_in_full", onClick: iconOnlyHandler },
        { id: "notCurrentPot", title: "多开Potplayer", iconName: "window", onClick: notCurrentPotHandler },
        { id: "strmDirect", title: "STRM直链", desc: "AList注意：关闭签名，否则不要启用此选项，仍由服务端处理签名", iconName: "link", onClick: strmDirectHandler },
    ];

    playBtns.push(...customBtns);

    const fileNameReg = /.*[\\/]|(\?.*)?$/g;
    const selectors = {
        embyMediaInfoDiv: "div[is='emby-scroller']:not(.hide) .mediaInfo:not(.hide)",
        jellfinMediaInfoDiv: ".itemMiscInfo-primary:not(.hide)",
        embyBtnManualRecording: "div[is='emby-scroller']:not(.hide) .btnManualRecording:not(.hide)",
        jellfinBtnCancelTimer: ".btnCancelTimer:not(.hide)",
        embyMainDetailButtons: "div[is='emby-scroller']:not(.hide) .mainDetailButtons",
        jellfinMainDetailButtons: "div.itemDetailPage:not(.hide) div.detailPagePrimaryContainer",
        selectSubtitles: "div[is='emby-scroller']:not(.hide) select.selectSubtitles",
        selectSource: "div[is='emby-scroller']:not(.hide) select.selectSource:not([disabled])",
    };

    // ========== 初始化函数 ==========
    function init() {
        let playBtnsWrapper = document.getElementById(playBtnsWrapperId);
        if (playBtnsWrapper) {
            playBtnsWrapper.remove();
        }

        let mainDetailButtons = document.querySelector(selectors.embyMainDetailButtons);

        function generateButtonHTML({ id, title, desc, iconId, iconName }) {
            return `
            <button
                id="${id}"
                type="button"
                class="detailButton emby-button emby-button-backdropfilter raised-backdropfilter detailButton-primary"
                title="${desc ? desc : title}"
            >
                <div class="detailButton-content">
                    <i class="md-icon detailButton-icon button-icon button-icon-left material-icons" id="${iconId}">
                        ${iconName ? iconName : '　'}
                    </i>
                    <span class="button-text">${title}</span>
                </div>
            </button>
            `;
        }

        // PotPlayer按钮单独一行，其他按钮换行
        let buttonHtml = `<div id="${playBtnsWrapperId}" class="detailButtons flex align-items-flex-start flex-wrap-wrap detail-lineItem">`;
        // 第一个按钮（Potplayer）
        buttonHtml += generateButtonHTML(playBtns[0]);
        buttonHtml += `</div>`;
        // 其他按钮另起一行
        buttonHtml += `<div id="${playBtnsWrapperId}-settings" class="detailButtons flex align-items-flex-start flex-wrap-wrap detail-lineItem" style="margin-top: 8px;">`;
        for (let i = 1; i < playBtns.length; i++) {
            buttonHtml += generateButtonHTML(playBtns[i]);
        }
        buttonHtml += `</div>`;

        if (!isEmby) {
            mainDetailButtons = document.querySelector(selectors.jellfinMainDetailButtons);
        }
        mainDetailButtons.insertAdjacentHTML("afterend", buttonHtml);

        if (!isEmby) {
            let playBtnsWrapper = document.getElementById("ExternalPlayersBtns");
            playBtnsWrapper.style.display = "flex";
            playBtnsWrapper.classList.add("detailPagePrimaryContainer");
            let btns = playBtnsWrapper.getElementsByTagName("button");
            for (let i = 0; i < btns.length; i++) {
                btns[i].classList.add("button-flat");
            }
        }

        // 添加事件
        playBtns.forEach(btn => {
            const btnEle = document.querySelector(`#${btn.id}`);
            if (btnEle) {
                btnEle.onclick = btn.onClick;
            }
        });

        // 设置图标
        const iconBaseUrl = iconConfig.baseUrl;
        const icons = [
            { id: "icon-PotPlayer", name: "icon-PotPlayer.webp", fontSize: "1.4em" },
        ];

        icons.map((icon) => {
            const element = document.querySelector(`#${icon.id}`);
            if (element) {
                const url = `${iconBaseUrl}/${icon.name || `${icon.id}.webp`}`;
                element.style.cssText += `
                    background-image: url(${url});
                    background-repeat: no-repeat;
                    background-size: 100% 100%;
                    font-size: ${icon.fontSize};
                `;
            }
        });

        // ========== 初始化设置按钮状态
        iconOnlyHandler();
        // 多开Potplayer默认开启
        if (localStorage.getItem(lsKeys.notCurrentPot) === null) {
            localStorage.setItem(lsKeys.notCurrentPot, "1");
        }
        notCurrentPotHandler();
        strmDirectHandler();


    }

    function showFlag() {
        let mediaInfoDiv = document.querySelector(selectors.embyMediaInfoDiv);
        let btnManualRecording = document.querySelector(selectors.embyBtnManualRecording);
        if (!isEmby) {
            mediaInfoDiv = document.querySelector(selectors.jellfinMediaInfoDiv);
            btnManualRecording = document.querySelector(selectors.jellfinBtnCancelTimer);
        }
        return !!mediaInfoDiv || !!btnManualRecording;
    }

    // ========== 获取媒体信息 ==========
    async function getItemInfo() {
        let userId = ApiClient._serverInfo.UserId;
        let itemId = /\?id=([A-Za-z0-9]+)/.exec(window.location.hash)[1];
        let response = await ApiClient.getItem(userId, itemId);

        if (response.Type == "Series") {
            let seriesNextUpItems = await ApiClient.getNextUpEpisodes({ SeriesId: itemId, UserId: userId });
            if (seriesNextUpItems.Items.length > 0) {
                console.log("nextUpItemId: " + seriesNextUpItems.Items[0].Id);
                return await ApiClient.getItem(userId, seriesNextUpItems.Items[0].Id);
            }
        }

        if (response.Type == "Season") {
            let seasonItems = await ApiClient.getItems(userId, { parentId: itemId });
            console.log("seasonItemId: " + seasonItems.Items[0].Id);
            return await ApiClient.getItem(userId, seasonItems.Items[0].Id);
        }

        if (response.MediaSources?.length > 0) {
            console.log("itemId:  " + itemId);
            return response;
        }

        let firstItems = await ApiClient.getItems(userId, { parentId: itemId, Recursive: true, IsFolder: false, Limit: 1 });
        console.log("firstItemId: " + firstItems.Items[0].Id);
        return await ApiClient.getItem(userId, firstItems.Items[0].Id);
    }

    function getSeek(position) {
        let ticks = position * 10000;
        let parts = []
            , hours = ticks / 36e9;
        (hours = Math.floor(hours)) && parts.push(hours);
        let minutes = (ticks -= 36e9 * hours) / 6e8;
        ticks -= 6e8 * (minutes = Math.floor(minutes)),
            minutes < 10 && hours && (minutes = "0" + minutes),
            parts.push(minutes);
        let seconds = ticks / 1e7;
        return (seconds = Math.floor(seconds)) < 10 && (seconds = "0" + seconds),
            parts.push(seconds),
            parts.join(":")
    }

    function getSubPath(mediaSource) {
        let selectSubtitles = document.querySelector(selectors.selectSubtitles);
        let subTitlePath = '';

        if (selectSubtitles && selectSubtitles.value > 0) {
            let SubIndex = mediaSource.MediaStreams.findIndex(m => m.Index == selectSubtitles.value && m.IsExternal);
            if (SubIndex > -1) {
                let subtitleCodec = mediaSource.MediaStreams[SubIndex].Codec;
                subTitlePath = `/${mediaSource.Id}/Subtitles/${selectSubtitles.value}/Stream.${subtitleCodec}`;
            }
        } else {
            let chiSubIndex = mediaSource.MediaStreams.findIndex(m => m.Language == "chi" && m.IsExternal);
            if (chiSubIndex > -1) {
                let subtitleCodec = mediaSource.MediaStreams[chiSubIndex].Codec;
                subTitlePath = `/${mediaSource.Id}/Subtitles/${chiSubIndex}/Stream.${subtitleCodec}`;
            } else {
                let externalSubIndex = mediaSource.MediaStreams.findIndex(m => m.IsExternal);
                if (externalSubIndex > -1) {
                    let subtitleCodec = mediaSource.MediaStreams[externalSubIndex].Codec;
                    subTitlePath = `/${mediaSource.Id}/Subtitles/${externalSubIndex}/Stream.${subtitleCodec}`;
                }
            }
        }
        return subTitlePath;
    }

    async function getEmbyMediaInfo() {
        let itemInfo = await getItemInfo();
        let mediaSourceId = itemInfo.MediaSources[0].Id;
        let selectSource = document.querySelector(selectors.selectSource);
        if (selectSource && selectSource.value.length > 0) {
            mediaSourceId = selectSource.value;
        }

        const accessToken = ApiClient.accessToken();
        let mediaSource = itemInfo.MediaSources.find(m => m.Id == mediaSourceId);
        let uri = isEmby ? "/emby/videos" : "/Items";
        let baseUrl = `${ApiClient._serverAddress}${uri}/${itemInfo.Id}`;
        let subPath = getSubPath(mediaSource);
        let subUrl = subPath.length > 0 ? `${baseUrl}${subPath}?api_key=${accessToken}` : "";
        let streamUrl = `${baseUrl}/`;

        if (mediaSource.Path.startsWith("http") && localStorage.getItem(lsKeys.strmDirect) === "1") {
            streamUrl = decodeURIComponent(mediaSource.Path);
        } else {
            let fileName = mediaSource.IsInfiniteStream ? `master.m3u8` : decodeURIComponent(mediaSource.Path.replace(fileNameReg, ""));
            if (isEmby) {
                if (mediaSource.IsInfiniteStream) {
                    streamUrl += useRealFileName && mediaSource.Name ? `${mediaSource.Name}.m3u8` : fileName;
                } else {
                    streamUrl += useRealFileName ? `stream/${fileName}` : `stream.${mediaSource.Container}`;
                }
            } else {
                streamUrl += `Download`;
                streamUrl += useRealFileName ? `/${fileName}` : "";
            }
            streamUrl += `?api_key=${accessToken}&Static=true&MediaSourceId=${mediaSourceId}&DeviceId=${ApiClient._deviceId}`;
        }

        let position = parseInt(itemInfo.UserData.PlaybackPositionTicks / 10000);
        let intent = await getIntent(mediaSource, position);
        console.log(streamUrl, subUrl, intent);
        return {
            streamUrl: streamUrl,
            subUrl: subUrl,
            intent: intent,
        }
    }

    async function getIntent(mediaSource, position) {
        let title = mediaSource.IsInfiniteStream
            ? mediaSource.Name
            : decodeURIComponent(mediaSource.Path.replace(fileNameReg, ""));
        let externalSubs = mediaSource.MediaStreams.filter(m => m.IsExternal == true);
        let subs_name = '';
        let subs_filename = '';

        if (externalSubs) {
            subs_name = externalSubs.map(s => s.DisplayTitle);
            subs_filename = externalSubs.map(s => s.Path.split('/').pop());
        }

        return {
            title: title,
            position: position,
            subs_name: subs_name,
            subs_filename: subs_filename,
            path: mediaSource.Path,
        };
    }

    // ========== Potplayer 播放 ==========
    async function embyPot() {
        const mediaInfo = await getEmbyMediaInfo();
        const intent = mediaInfo.intent;
        const notCurrentPotArg = localStorage.getItem(lsKeys.notCurrentPot) === "1" ? "" : "/current";
        let potUrl = `potplayer://${encodeURI(mediaInfo.streamUrl)} /sub=${encodeURI(mediaInfo.subUrl)} ${notCurrentPotArg} /seek=${getSeek(intent.position)} /title="${intent.title}"`;
        await writeClipboard(potUrl);
        console.log("Successfully wrote real deep link to clipboard: ", potUrl);
        potUrl = `potplayer://${notCurrentPotArg}/clipboard`;
        window.open(potUrl, "_self");
    }

    // ========== 设置按钮处理函数 ==========
    function lsCheckSetBoolean(event, lsKeyName) {
        let flag = localStorage.getItem(lsKeyName) === "1";
        if (event) {
            flag = !flag;
            localStorage.setItem(lsKeyName, flag ? "1" : "0");
        }
        return flag;
    }

    function hideByOSHandler(event) {
        const btn = document.getElementById("hideByOS");
        if (!btn) {
            return;
        }
        const flag = lsCheckSetBoolean(event, lsKeys.hideByOS);
        const playBtnsWrapper = document.getElementById(playBtnsWrapperId);
        const buttonEleArr = playBtnsWrapper.querySelectorAll("button");
        buttonEleArr.forEach(btnEle => {
            const btn = playBtns.find(btn => btn.id === btnEle.id);
            const shouldHide = flag && btn.osCheck && !btn.osCheck.some(check => check());
            console.log(`${btn.id} Should Hide: ${shouldHide}`);
            btnEle.style.display = shouldHide ? 'none' : 'block';
        });
        btn.classList.toggle("button-submit", flag);
    }

    function iconOnlyHandler(event) {
        const btn = document.getElementById("iconOnly");
        if (!btn) {
            return;
        }
        const flag = lsCheckSetBoolean(event, lsKeys.iconOnly);
        const playBtnsWrapper = document.getElementById(playBtnsWrapperId);
        const spans = playBtnsWrapper.querySelectorAll("span");
        spans.forEach(span => {
            span.hidden = flag;
        });
        const iArr = playBtnsWrapper.querySelectorAll("i");
        iArr.forEach(iEle => {
            iEle.classList.toggle("button-icon-left", !flag);
        });
        btn.classList.toggle("button-submit", flag);
    }

    function notCurrentPotHandler(event) {
        const btn = document.getElementById("notCurrentPot");
        if (!btn) {
            return;
        }
        const flag = lsCheckSetBoolean(event, lsKeys.notCurrentPot);
        btn.classList.toggle("button-submit", flag);
    }

    function strmDirectHandler(event) {
        const btn = document.getElementById("strmDirect");
        if (!btn) {
            return;
        }
        const flag = lsCheckSetBoolean(event, lsKeys.strmDirect);
        btn.classList.toggle("button-submit", flag);
    }

    // ========== JAV 番号提取 ==========
    function extractCode(text) {
        if (!text) return null;
        const patterns = [
            /([A-Z]{2,10}-\d{3,5})/i,
            /([A-Z]{2,10}\d{3,5})/i,
            /\b([A-Z]{2,10}-[A-Z]?\d{3,5})\b/i
        ];
        for (let pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1].toUpperCase();
        }
        return null;
    }

    // ========== JAVDB 搜索 ==========
    function performJavdbJump(code, btnElement) {
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

    // ========== JAVBUS 搜索 ==========
    function performJavbusJump(code, btnElement) {
        const btnText = btnElement.querySelector('span') || btnElement;
        const originalHtml = btnText.innerHTML;
        btnText.innerHTML = '🔍 搜索中...';
        btnElement.disabled = true;
        const searchUrl = `https://www.javbus.com/search/${encodeURIComponent(code)}&type=1&parent=ce`;
        GM_xmlhttpRequest({
            method: 'GET', url: searchUrl, timeout: 5000,
            onload: function(response) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');
                    const firstResult = doc.querySelector('.movie-box');
                    if (firstResult && firstResult.href) {
                        const relativeUrl = firstResult.getAttribute('href');
                        window.open(relativeUrl.startsWith('http') ? relativeUrl : `https://www.javbus.com${relativeUrl}`, '_blank');
                    } else window.open(searchUrl, '_blank');
                } catch (err) { window.open(searchUrl, '_blank'); }
                setTimeout(() => { btnText.innerHTML = originalHtml; btnElement.disabled = false; }, 1000);
            },
            onerror: () => { window.open(searchUrl, '_blank'); btnText.innerHTML = originalHtml; btnElement.disabled = false; }
        });
    }

    // ========== 详情页 JAV 按钮 ==========
    function addJavButtons() {
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

        // 找到Potplayer按钮所在的容器
        const potplayerBtn = document.getElementById('embyPot');
        const container = potplayerBtn ? potplayerBtn.parentElement : null;
        if (!container) return;

        // 移除已存在的JAV按钮
        const oldJavdbBtn = document.getElementById('javdbBtn');
        const oldJavbusBtn = document.getElementById('javbusBtn');
        if (oldJavdbBtn) oldJavdbBtn.remove();
        if (oldJavbusBtn) oldJavbusBtn.remove();

        // 创建JAVDB按钮 - 调整大小与Potplayer一致
        const javdbBtn = document.createElement('button');
        javdbBtn.id = 'javdbBtn';
        javdbBtn.className = 'detailButton emby-button emby-button-backdropfilter raised-backdropfilter detailButton-primary';
        javdbBtn.innerHTML = '<div class="detailButton-content"><span class="button-text">查看 JAVDB</span></div>';
        javdbBtn.style.cssText = 'background:linear-gradient(135deg,#00bcd4,#4CAF50);color:white;border:none;margin-left:8px;';
        javdbBtn.title = '在 JAVDB 中查看 ' + code;
        javdbBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); performJavdbJump(code, javdbBtn); };

        // 创建JAVBUS按钮 - 调整大小与Potplayer一致
        const javbusBtn = document.createElement('button');
        javbusBtn.id = 'javbusBtn';
        javbusBtn.className = 'detailButton emby-button emby-button-backdropfilter raised-backdropfilter detailButton-primary';
        javbusBtn.innerHTML = '<div class="detailButton-content"><span class="button-text">查看 JAVBUS</span></div>';
        javbusBtn.style.cssText = 'background:linear-gradient(135deg,#ff9800,#e91e63);color:white;border:none;margin-left:8px;';
        javbusBtn.title = '在 JAVBUS 中查看 ' + code;
        javbusBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); performJavbusJump(code, javbusBtn); };

        // 将按钮添加到Potplayer后面
        container.appendChild(javdbBtn);
        container.appendChild(javbusBtn);
    }

    // ========== 列表页PotPlayer播放 ==========
    async function playItemWithPotPlayer(itemId) {
        try {
            const userId = ApiClient._serverInfo.UserId;
            let itemInfo = await ApiClient.getItem(userId, itemId);
            if (itemInfo.Type == "Series") {
                let seriesNextUpItems = await ApiClient.getNextUpEpisodes({ SeriesId: itemId, UserId: userId });
                if (seriesNextUpItems.Items.length > 0) {
                    itemInfo = await ApiClient.getItem(userId, seriesNextUpItems.Items[0].Id);
                }
            }
            if (itemInfo.Type == "Season") {
                let seasonItems = await ApiClient.getItems(userId, { parentId: itemId });
                if (seasonItems.Items.length > 0) {
                    itemInfo = await ApiClient.getItem(userId, seasonItems.Items[0].Id);
                }
            }
            if (!itemInfo || !itemInfo.MediaSources || itemInfo.MediaSources.length === 0) {
                console.error("无法获取媒体信息");
                return;
            }
            let mediaSourceId = itemInfo.MediaSources[0].Id;
            const accessToken = ApiClient.accessToken();
            let mediaSource = itemInfo.MediaSources.find(m => m.Id == mediaSourceId);
            let uri = isEmby ? "/emby/videos" : "/Items";
            let baseUrl = `${ApiClient._serverAddress}${uri}/${itemInfo.Id}`;
            let subUrl = "";
            let chiSubIndex = mediaSource.MediaStreams.findIndex(m => m.Language == "chi" && m.IsExternal);
            if (chiSubIndex > -1) {
                let subtitleCodec = mediaSource.MediaStreams[chiSubIndex].Codec;
                subUrl = `${baseUrl}/${mediaSource.Id}/Subtitles/${chiSubIndex}/Stream.${subtitleCodec}?api_key=${accessToken}`;
            } else {
                let externalSubIndex = mediaSource.MediaStreams.findIndex(m => m.IsExternal);
                if (externalSubIndex > -1) {
                    let subtitleCodec = mediaSource.MediaStreams[externalSubIndex].Codec;
                    subUrl = `${baseUrl}/${mediaSource.Id}/Subtitles/${externalSubIndex}/Stream.${subtitleCodec}?api_key=${accessToken}`;
                }
            }
            let streamUrl = `${baseUrl}/stream.${mediaSource.Container}?api_key=${accessToken}&Static=true&MediaSourceId=${mediaSourceId}&DeviceId=${ApiClient._deviceId}`;
            let position = parseInt(itemInfo.UserData.PlaybackPositionTicks / 10000);
            let title = mediaSource.IsInfiniteStream ? mediaSource.Name : decodeURIComponent(mediaSource.Path.replace(/.*[\\/]|(\?.*)?$/g, ""));
            const notCurrentPotArg = localStorage.getItem(lsKeys.notCurrentPot) === "1" ? "" : "/current";
            let potUrl = `potplayer://${encodeURI(streamUrl)} /sub=${encodeURI(subUrl)} ${notCurrentPotArg} /seek=${getSeek(position)} /title="${title}"`;
            await writeClipboard(potUrl);
            potUrl = `potplayer://${notCurrentPotArg}/clipboard`;
            window.open(potUrl, "_self");
        } catch (e) {
            console.error("PotPlayer 播放失败:", e);
        }
    }

    // ========== 通过标题搜索Emby获取itemId ==========
    async function findItemIdByTitle(title) {
        try {
            var userId = ApiClient._serverInfo.UserId;
            var result = await ApiClient.getItems(userId, {
                searchTerm: title,
                limit: 1,
                recursive: true,
                includeItemTypes: 'Movie,Episode,Series'
            });
            if (result.Items && result.Items.length > 0) return result.Items[0].Id;
        } catch(e) {
            console.error('[PotPlayer] 搜索失败:', e);
        }
        return null;
    }

    // ========== 列表页三个按钮（封面图下方横排） ==========
    function addListPageButtons() {
        const items = document.querySelectorAll('.card, .itemAction[data-type="Movie"]');
        items.forEach(item => {
            // 确保获取到的是.card元素
            let card = item.classList.contains('card') ? item : item.closest('.card');
            if (!card) return;
            
            if (card.querySelector('.javbus-list-btn')) return;
            // 跳过人物卡片（"我的媒体"那行演员头像）
            if (card.classList.contains('personCard') || card.classList.contains('peopleCard')) return;
            
            const titleEl = card.querySelector('.cardText, .cardFooter, .itemName');
            if (!titleEl) return;
            
            // 保存标题文本用于PotPlayer按钮
            var cardTitle = titleEl.textContent.trim();
            const code = extractCode(cardTitle);
            if (!code) return;

            // 找到cardText/cardFooter元素，在其之前插入按钮行
            const textFooter = card.querySelector('.cardText, .cardFooter');
            const btnContainer = textFooter || card.querySelector('.cardBox') || card;
            
            // 创建按钮行容器（样式由CSS类控制）
            const btnRow = document.createElement('div');
            btnRow.className = 'jav-btn-row';

            // JD按钮 (JAVDB)
            const jdBtn = document.createElement('span');
            jdBtn.className = 'javdb-list-btn';
            jdBtn.innerHTML = 'JD';
            jdBtn.style.cssText = 'background:linear-gradient(135deg,#00bcd4,#4CAF50);color:white;';
            jdBtn.onclick = (e) => { e.stopPropagation(); performJavdbJump(code, jdBtn); };
            btnRow.appendChild(jdBtn);

            // JB按钮 (JAVBUS)
            const jbBtn = document.createElement('span');
            jbBtn.className = 'javbus-list-btn';
            jbBtn.innerHTML = 'JB';
            jbBtn.style.cssText = 'background:linear-gradient(135deg,#ff9800,#e91e63);color:white;';
            jbBtn.onclick = (e) => { e.stopPropagation(); performJavbusJump(code, jbBtn); };
            btnRow.appendChild(jbBtn);

            // 从卡片的链接href中提取itemId
            const cardLink = card.querySelector('a[href*="id="]');
            let itemId = null;
            if (cardLink) {
                const idMatch = /[?&]id=([A-Za-z0-9]+)/.exec(cardLink.getAttribute('href'));
                if (idMatch) itemId = idMatch[1];
            }

            // PotPlayer按钮（直接通过itemId调用播放）
            const potBtn = document.createElement('span');
            potBtn.className = 'potplayer-list-btn';
            potBtn.innerHTML = 'Pot';
            potBtn.title = itemId ? 'PotPlayer播放' : 'PotPlayer播放（需进入详情页）';
            potBtn.style.cssText = 'background:linear-gradient(135deg,#FFD700,#FFA000);color:#333;';
            potBtn.onclick = function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (itemId) {
                    // 直接通过itemId调用PotPlayer播放
                    playItemWithPotPlayer(itemId);
                } else {
                    // 如果无法从链接提取itemId，尝试从卡片的其他属性获取
                    const dataId = card.getAttribute('data-id') || card.closest('[data-id]')?.getAttribute('data-id');
                    if (dataId) {
                        playItemWithPotPlayer(dataId);
                    } else {
                        // 最后尝试从标题搜索
                        findItemIdByTitle(cardTitle).then(function(foundId) {
                            if (foundId) {
                                playItemWithPotPlayer(foundId);
                            } else {
                                alert('无法获取项目ID，请进入详情页使用PotPlayer按钮');
                            }
                        });
                    }
                }
            };
            btnRow.appendChild(potBtn);

            // 插入到 textFooter 之前（在其父容器中作为兄弟元素）
            if (textFooter && textFooter.parentNode) {
                textFooter.parentNode.insertBefore(btnRow, textFooter);
            } else {
                btnContainer.appendChild(btnRow);
            }
        });
    }

    // ========== 剪贴板功能 ==========
    async function writeClipboard(text) {
        let flag = false;
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(text);
                flag = true;
                console.log("Successfully used navigator.clipboard modern clipboard implementation");
            } catch (error) {
                console.error('Error occurred when copying to clipboard using navigator.clipboard:', error);
            }
        } else {
            flag = writeClipboardLegacy(text);
            console.log("navigator.clipboard modern clipboard implementation not available, using legacy implementation");
        }
        return flag;
    }

    function writeClipboardLegacy(text) {
        let textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.style.position = 'absolute';
        textarea.style.clip = 'rect(0 0 0 0)';
        textarea.value = text;
        textarea.select();
        if (document.execCommand('copy', true)) {
            return true;
        }
        return false;
    }

    // ========== 列表页持续监听 ==========
    let listPageObserver = null;
    function startListPageObserver() {
        if (listPageObserver) return;
        addListPageButtons();
        listPageObserver = new MutationObserver(function() {
            addListPageButtons();
        });
        listPageObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function stopListPageObserver() {
        if (listPageObserver) {
            listPageObserver.disconnect();
            listPageObserver = null;
        }
    }

    // ========== 监听页面变化 ==========
    document.addEventListener("viewbeforeshow", function (e) {
        console.log("viewbeforeshow", e);
        if (isEmby === "") {
            isEmby = !!e.detail.contextPath;
        }
        let isItemDetailPage;
        if (isEmby) {
            isItemDetailPage = e.detail.contextPath.startsWith("/item?id=");
        } else {
            isItemDetailPage = e.detail.params && e.detail.params.id;
        }
        if (isItemDetailPage) {
            stopListPageObserver();
            const mutation = new MutationObserver(function() {
                if (showFlag()) {
                    init();
                    addJavButtons();
                    mutation.disconnect();
                }
            })
            mutation.observe(document.body, {
                childList: true,
                characterData: true,
                subtree: true,
            })
        } else {
            // 列表页添加按钮并启动持续监听
            addListPageButtons();
            startListPageObserver();
        }
    });

    // 页面首次加载时也检查列表页
    if (!location.hash.includes('id=')) {
        addListPageButtons();
        startListPageObserver();
    }
})();
