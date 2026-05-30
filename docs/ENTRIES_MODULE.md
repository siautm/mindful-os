# Entries 前端说明

**页面**：`/entries`  
**主文件**：`src/app/pages/Entries.tsx`  
**UI 组件**：`src/app/components/entries/*`（来自 `reference/` 设计）

## 每条记录只有

| 字段 | 说明 |
|------|------|
| **Title** | 必填 |
| **Photo** | 可选：上传图片（&lt;800KB）或粘贴 URL |
| **Tags** | 多标签，列表可按 tag 筛选 |
| **Metadata** | 动态 key : value，新建时为空，底部 + 添加 |

另有 **Lock**（锁定后只读，存于 `is_pinned`）。

无 Type、无 Note。

## 部署数据库

若已有 entries 表，在 Supabase 执行一次：

`supabase/entries_add_photo_url.sql`

## 给 AI

```
改 Entries UI：src/app/pages/Entries.tsx + src/app/components/entries/
保持：仅 title / photo / tags / metadata；reference 科幻 HUD 风格。
```
