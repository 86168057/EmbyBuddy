# EMBY全能助手 / EbyBuddy

> Emby/Jellyfin 全能增强脚本 —— PotPlayer 外部播放 + JAVDB/JAVBus 番号一键搜索

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/86168057/emby-to-javdb?style=social)](https://github.com/86168057/emby-to-javdb/stargazers)

---

## ✨ 功能特性

### 🎬 外部播放器调用
- **PotPlayer 播放** — 在 Emby/Jellyfin 详情页一键调用 PotPlayer 播放视频
- **外挂字幕加载** — 自动加载中文/外挂字幕到 PotPlayer
- **续播支持** — 自动从上次观看位置继续播放
- **多开模式** — 支持多开 PotPlayer 实例，避免重复打开同一窗口

### 🔍 番号搜索
- **JAVDB 搜索** — 自动提取番号，一键在 JAVDB 中搜索
- **JAVBus 搜索** — 自动提取番号，一键在 JAVBus 中搜索
- **智能番号识别** — 支持多种番号格式（如 `ABP-123`、`ABP123`、`ABC-1234` 等）
- **详情页按钮** — 在 Emby 详情页自动显示 JAVDB/JAVBus 搜索按钮
- **列表页按钮** — 在 Emby 列表页卡片上直接显示 JD/JB/Pot 三个快捷按钮

### ⚙️ 个性化设置
- **显示模式** — 切换按钮的纯图标/图标+文字显示模式
- **多开 PotPlayer** — 控制是否在当前窗口播放还是新开窗口
- **STRM 直链** — 对 STRM 文件启用直接链接（适用于 AList 场景）

### 📱 平台兼容
- 同时支持 **Emby** 和 **Jellyfin**
- 响应式设计，桌面端和移动端自适应

---

## 📦 安装

### 前置要求
- 浏览器已安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)

### 安装方式
1. 点击安装链接：[安装 EMBY全能助手](https://raw.githubusercontent.com/86168057/emby-to-javdb/main/emby-to-javdb.user.js)
2. Tampermonkey 会自动弹出安装确认，点击「安装」即可

---

## 🖼️ 功能展示

### 详情页
- PotPlayer 播放按钮 + 设置按钮（显示模式 / 多开 / STRM直链）
- JAVDB / JAVBus 搜索按钮（自动提取番号）

### 列表页
- 每个视频卡片下方显示三个快捷按钮：
  - 🟢 **JD** — JAVDB 搜索
  - 🔴 **JB** — JAVBus 搜索
  - 🟡 **Pot** — PotPlayer 直接播放

---

## ⚙️ 配置说明

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| 显示模式 | 图标+文字 | 切换按钮的显示风格 |
| 多开PotPlayer | 开启 | 关闭后会在当前 PotPlayer 窗口中播放 |
| STRM直链 | 关闭 | 启用后 STRM 文件直接使用原始链接（AList 用户注意关闭签名） |

---

## 📝 更新日志

### v2.2.0
- 重命名为 EMBY全能助手 / EbyBuddy
- 新增列表页快捷按钮（JD/JB/Pot）
- 新增 JAVBus 番号搜索
- 新增 STRM 直链支持
- 优化番号识别算法
- 优化移动端按钮显示

---

## 🙏 致谢

- 基于 [embyLaunchPotplayer](https://github.com/bpking1/embyExternalUrl) 由 [chen3861229](https://github.com/chen3861229) 开发
- 图标资源来自 [embyWebAddExternalUrl](https://github.com/bpking1/embyExternalUrl)

---

## 📄 许可证

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源。