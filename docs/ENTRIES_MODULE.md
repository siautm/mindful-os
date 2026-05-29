# Entries 前端设计说明（给 UI / 前端 AI）

**页面**：`/entries`  
**主文件**：`src/app/pages/Entries.tsx`  
**样式**：Tailwind；本页主色 **violet-600**，标签用 **emerald** 点缀；全局背景偏浅绿（见 `src/styles/theme.css`）。

---

## 页面做什么

个人知识词条：食谱、读书笔记、学习笔记等。每条 entry 有 **类型、标题、备注、标签**，外加用户自己加的 **任意键值对字段**（例如 `ingredients`、`steps`）。

---

## 列表页

- 顶栏：标题 Entries、返回 Dashboard、**New**
- 搜索框 + 类型筛选（All / Recipe / Book notes / Learning…）
- 每条是一枚 **可点击卡片**：
  - 置顶 pin、标题、类型紫色胶囊、日期
  - 备注最多 2 行
  - 若有自定义字段，只显示 **字段名**（用 `·` 连接，最多 4 个）
  - 标签绿色圆角 pill
- 空状态：虚线大卡片，点一下 = 新建

**交互**：hover 卡片轻微上移 + 阴影；`active:scale` 轻微按压感。

---

## 编辑弹窗（New / Edit entry）

从上到下：

| 区块 | 控件 |
|------|------|
| Type | 下拉 |
| Title | 单行，必填 |
| Note | 多行 |
| Tags | 输入 + Enter 添加；badge 点击删除 |
| **自定义字段** | **见下** |
| 底栏 | Save（紫）、Pin、Delete（仅编辑） |

### 自定义字段区（重要）

- **不要**「Metadata」标题，**不要**灰色说明文字
- 只有右上角圆角按钮：**Add field**
- 新建时这里 **完全是空的**（0 行）
- 点 Add field → 多一张 **字段卡片**：
  - 上：字段名（placeholder `Field name`），可下拉选以前用过的名，也可自己打字
  - 下：内容（placeholder `Content…`），多行
  - 右上角删除钮：默认隐藏，**hover 卡片** 时出现
- 卡片样式：`rounded-2xl`、浅紫边框/渐变底、hover / focus-within 加深阴影

---

## 必须遵守（不要改坏）

1. 新建 entry → **没有**预置字段（不要自动出现 ingredients、cook time 等）
2. **不要**「Save as preset」类按钮
3. **不要** `dislike_by` 或任何固定专用字段 UI
4. 自定义字段区保持 **只有 Add field**，无 section 标题

---

## 相关辅助代码（仅当改字段逻辑时看）

`src/app/lib/entryTypes.ts` — 把 `metadata` 对象 ↔ 编辑用的多行 `{ key, value }` 互转。

---

## 给 AI 的一句话任务模板

```
只改 mindos/src/app/pages/Entries.tsx 的 UI。
阅读 docs/ENTRIES_MODULE.md。
保持：metadata 默认空、仅 Add field、无 Metadata 标题、极简卡片风格。
我的需求：<写这里>
```
