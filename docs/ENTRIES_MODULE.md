# Entries 模块说明（给 AI / 维护者）

> **用途**：知识词条（食谱、读书笔记、学习笔记等）。用户自建 **metadata 键值对**，无固定表单字段。  
> **路由**：`/entries`  
> **最近 UI 原则**：metadata 区 **无标题、无说明**，只有 **Add field**；列表与字段行均为 **极简卡片**（紫/绿点缀，hover 微交互）。

---

## 1. 产品行为（必须遵守）

### 1.1 用户要什么

| 需求 | 当前实现 |
|------|----------|
| 新建 entry 时 metadata **为空** | `openCreate()` → `metadataRows = []`，API 不合并 preset |
| 用户点 **Add field** 增加一行 | 左：字段名；右：内容（两个输入框） |
| 字段名可选历史名或自由输入 | HTML `<datalist>` + `keyCatalog` / `buildKeySuggestions` |
| **不要**「Save as preset」、不要自动填 ingredients 等 | 前端已删 preset UI；`presets` 在 load 时强制 `[]` |
| **不要** `dislike_by` | 不再创建；旧数据里可能有，编辑时当普通 key 显示 |
| 保存时记住字段名供下次建议 | `rememberKeys()` → POST `action: "remember_key"` |

### 1.2 编辑弹窗结构

1. **Type** — `<select>`，来自 `catalog.types`
2. **Title** — 必填
3. **Note** — 可选长文本
4. **Tags** — Enter 添加，点击 badge 删除
5. **动态字段区** — 仅右上角 **Add field**；每行一张卡片（字段名 + Content textarea + hover 显示删除）
6. **Save** / **Pin** / **Delete**（编辑时）

### 1.3 列表页

- 搜索：title、note、tags、metadata JSON 全文（`entrySearchBlob`）
- 类型筛选按钮：All + 各 `entry_types.label`
- 每条 entry：可点击卡片；显示 pin、标题、类型胶囊、日期、note 摘要、metadata **key 名**（最多 4 个）、tags

---

## 2. 文件地图

```
mindos/
├── api/entries.ts              # Vercel serverless：唯一 Entries API
├── src/app/pages/Entries.tsx   # 页面 + 编辑 Dialog（主要改 UI 在这里）
├── src/app/lib/entryTypes.ts   # 类型、metadata 行转换、缓存、mindmap 解析（未在 UI 用）
├── src/app/routes.tsx          # path: "entries" → lazy Entries
├── supabase/
│   ├── schema_entries.sql      # 表结构
│   ├── rls_policies_entries.sql
│   └── ENTRIES_RUNBOOK.md      # 简短部署步骤（指向本文档）
└── docs/ENTRIES_MODULE.md      # 本文件
```

**环境变量**：`VITE_API_BASE_URL`（可选，空则同源 `/api/entries`）

**部署注意**：Vercel Hobby 限制约 12 个 Serverless Function；`api/entries.ts` 占 1 个。

---

## 3. 数据库（Supabase）

### 3.1 表

| 表 | 作用 |
|----|------|
| `entry_types` | 用户类型（recipe / book_note / learning 等） |
| `entry_type_fields` | **仅用于字段名建议**（`remember_key` 写入），不驱动 UI 控件 |
| `entry_type_presets` | 历史遗留；**前端不用**；API GET 仍返回但 UI 忽略 |
| `entries` | 主数据：`title`, `note`, `tags[]`, `metadata` jsonb, `is_pinned`, `entry_at` |

### 3.2 `entries.metadata` 形状

**当前 UI 只读写纯字符串键值对**：

```json
{
  "ingredients": "a, b",
  "steps": "1. add water\n2. add oil",
  "cook_time": "12"
}
```

`entryTypes.ts` 还支持 `mindmap_list` 结构（`parseMindmapListText` / `mindmapListToText`），但 **Entries.tsx 未接入**；若要做步骤思维导图预览，改 `metadataToRows` / `rowsToMetadata` 或按 `valueKind` 分支渲染。

### 3.3 首次访问

`ensureDefaultCatalog()`：若用户无 `entry_types`，插入 3 个默认类型（**不带**默认 fields）。

---

## 4. API：`/api/entries`

认证：`Authorization: Bearer <supabase access_token>`（`requireUserId`）。

### 4.1 GET

响应：

```ts
{
  types: { id, typeKey, label, sortOrder }[];
  fields: EntryTypeField[];      // 来自 entry_type_fields
  presets: { typeId, fieldKey, value }[];  // 前端丢弃
  keyCatalog: Record<typeId, string[]>;      // 各类型建议字段名
  entries: KnowledgeEntry[];
}
```

`keyCatalog` = `entry_type_fields.field_key` ∪ 所有 entries 里该 type 的 metadata keys。

### 4.2 POST

| `action` |  body | 说明 |
|----------|--------|------|
| （默认） | `typeId`, `title`, `note?`, `tags?`, `metadata?`, `isPinned?`, `entryAt?`, `id?` | 创建 entry（upsert by id） |
| `remember_key` | `typeId`, `fieldKey`, `label?` | 把字段名记入 `entry_type_fields`（`field_key` 会 lower + 空格→`_`） |
| `create_type` | `typeKey`, `label`, `fields?[]` | 自定义类型（**UI 未暴露**） |

### 4.3 PATCH

`id` 必填；可部分更新 `title`, `note`, `tags`, `metadata`, `isPinned`, `entryAt`, `typeId`。

### 4.4 DELETE

`?id=<entryId>` 或 body `{ id }`。

### 4.5 错误

`42P01` → 提示跑 `schema_entries.sql` + `rls_policies_entries.sql`。

---

## 5. 前端状态流（`Entries.tsx`）

```
loadAll() ──GET──► setCatalog + setEntries + saveEntriesCache()
                      │
未登录 ◄── readEntriesCache() localStorage

openCreate / openEdit
  └─ metadataRows ← metadataToRows(entry.metadata) 或 []

saveEntry()
  └─ rowsToMetadata(metadataRows) → PATCH/POST
  └─ rememberKeys(typeId, Object.keys(metadata))

keySuggestions(typeId)
  └─ keyCatalog[typeId] + buildKeySuggestions(typeId, fields, entries)
  └─ 绑定 <datalist id={datalistId}>
```

**本地缓存 key**：`mindful_entries_catalog`, `mindful_entries_list`（`entryTypes.ts`）。

---

## 6. 核心类型与函数（`entryTypes.ts`）

```ts
interface KnowledgeEntry {
  id, typeId, title, note, tags[], metadata: Record<string, unknown>,
  isPinned, entryAt, createdAt?, updatedAt?
}

interface MetadataRow { id, key, value }  // UI 编辑用

metadataToRows(metadata) → MetadataRow[]
rowsToMetadata(rows) → Record<string, string>   // 空 key 跳过
buildKeySuggestions(typeId, fields, entries) → string[]
entrySearchBlob(entry, typeLabel) → string   // 搜索用
```

---

## 7. 已废弃 / 勿恢复（除非产品明确要求）

- 按类型 **预置字段**（ingredients、cook_time、allergy、dislike_by…）自动渲染
- **Preset 值** 按钮、`entry_type_presets` 在 UI 中的使用
- 新建 entry 时 `mergePresetsIntoMetadata`
- 固定「Metadata」标题 + 灰色说明文案

`entry_type_presets` 表与 API 字段可保留作迁移兼容，但 **不要** 在前端重新启用 preset 流程。

---

## 8. 常见改动指南（给接手的 AI）

| 目标 | 建议改哪里 |
|------|------------|
| 只改 UI/样式 | `src/app/pages/Entries.tsx`（Tailwind；主题色见 `src/styles/theme.css`，Entries 页多用 violet-600） |
| 改 metadata 存储格式（如 mindmap） | `entryTypes.ts` + `Entries.tsx` 保存/加载 + 可选 `api/entries.ts` 校验 |
| 新 API 行为 | `api/entries.ts`（注意 Vercel function 数量） |
| 新 entry 类型默认值 | `DEFAULT_TYPES` in `api/entries.ts` |
| 用户自建类型 UI | 调用已有 `POST action: create_type`；在 `Entries.tsx` 加 Dialog |
| 清理旧 DB 字段 | Supabase SQL 删 `entry_type_fields` / `entry_type_presets` 行；或 migration |
| 部署 DB | `supabase/schema_entries.sql` → `rls_policies_entries.sql` |

### 8.1 改 UI 时保持

- metadata 区：**只有 Add field**，无 section 标题
- 新建：**metadata 为空**
- 字段行：**卡片式**（`rounded-2xl`, hover shadow, 删除钮 `group-hover`）

### 8.2 测试清单

- [ ] 登录后 `/entries` 加载列表
- [ ] New → 无 metadata 行 → Add field → 填 key/value → Save → 再编辑仍保留
- [ ] 字段名 datalist 出现上次用过的 key
- [ ] 搜索 / 类型筛选
- [ ] Pin、Delete
- [ ] 未登录时用 localStorage 缓存（只读体验）

---

## 9. Git 相关提交（参考）

- `94971b4` — Entries 初版
- `4286288` — 动态 metadata，去掉 preset / dislike_by
- `1a67412` — 极简卡片 UI

改完按用户习惯：`git commit` + `git push`（PowerShell 多行 message 用 `$msg = @'...'@`）。

---

## 10. 给 AI 的简短 prompt 模板

复制下面一段即可：

```
请阅读 mindos/docs/ENTRIES_MODULE.md，只改 Entries 模块。
约束：metadata 默认空；仅 Add field 添加键值对；不要 preset UI 和 dislike_by；
保持极简卡片 UI（紫/绿、hover 交互）。
主要文件：src/app/pages/Entries.tsx, src/app/lib/entryTypes.ts, api/entries.ts。
我的具体需求是：<在这里写你的需求>
```
