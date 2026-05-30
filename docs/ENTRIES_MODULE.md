# Entries 前端说明

**页面**：`/entries`（独立路由，无 MainLayout 侧边栏）  
**主文件**：`src/app/pages/Entries.tsx`  
**数据逻辑**：`src/app/lib/useEntriesArchive.ts`  
**UI 组件**：`src/app/components/entries/*`

## 沉浸模式

- 左上角 **QUIT** → 舱门关闭动画 → Dashboard（`/`）
- 侧边栏进入：**HUD 过渡**（`ArchiveDepartOverlay`）→ `/entries` → 舱门打开
- 全屏 `100dvh`；`BlastDoorShutter` 开门后保持挂载（勿 unmount），否则 QUIT 无关门动画

## 每条记录

| 字段 | 说明 |
|------|------|
| **Title** | 必填 |
| **Photo** | 可选；上传自动压缩（≤800px 边长）；或 URL |
| **Tags** | 多标签；列表可按 tag 筛选 |
| **Metadata** | 动态 key:value；卡片不显示，仅在详情编辑 |

**Lock**（`is_pinned`）→ 只读 + slate 冷金属 `RESTRICTED` 样式。

## 搜索与筛选

- 搜索框：**仅匹配标题**；`tag:名称` 可筛标签（与下方 tag 按钮可叠加）
- 快捷键：`/` 聚焦搜索，`Esc` 清空（详情打开时无效）
- 排序：UPDATED / CREATED / TITLE（锁定记录始终置顶）
- 分页：每页 24 条

## 批量与工具

- **BULK SELECT**：多选 → 批量锁定/解锁、加 tag、导出 JSON
- 工具栏喇叭图标：舱门开关音效（默认关，`localStorage`）

## 草稿

- 详情未保存编辑会写入 `localStorage` 草稿；关闭/离开前确认
- 保存成功后清除草稿

## 部署

- `index.html` 禁缓存（`vercel.json`）
- 构建版本：`__ENTRIES_UI_BUILD__`（Vercel commit SHA）；仅 **开发模式** 显示在页眉
- 数据库迁移：`supabase/entries_add_photo_url.sql`（已有表时）

## 给 AI

```
改 Entries：Entries.tsx + src/app/components/entries/ + useEntriesArchive.ts
保持：title/photo/tags/metadata；科幻 HUD；舱门勿在开门后卸载。
```
