# TodoListss 开发计划

基于 2026-05-12 的代码审计，按优先级排列。

---

## Phase 1 — 代码治理（基础）

### P1.1 拆分 App.tsx 组件
- **目标**：将 1121 行的 `App.tsx` 拆分为独立组件
- **拆分方案**：
  - `src/components/WidgetBoard.tsx` — 挂件看板（含列、卡片、拖拽、编辑弹窗）
  - `src/components/NormalDashboard.tsx` — 正常模式主页
  - `src/components/TodoDetailPanel.tsx` — 任务详情侧边栏
  - `src/components/Composer.tsx` — 快速添加组件
  - `src/components/StatsGrid.tsx` — 统计卡片
  - `src/components/ProgressBar.tsx` — 今日进度条
- **验证**：`tsc --noEmit` 通过，两种模式功能不变

### P1.2 统一 normalize 逻辑
- **目标**：消除 main.ts 和 desktopApi.ts 中重复的数据规范化代码
- **方案**：在 `shared/contracts.ts` 导出 `normalizePersistedState()`，main.ts 和 desktopApi.ts 统一引用
- **验证**：`tsc --noEmit` 通过，加载旧数据正常

### P1.3 添加 ErrorBoundary
- **目标**：防止渲染崩溃导致白屏
- **方案**：创建 `src/components/ErrorBoundary.tsx`，包裹在 App 根节点外层，崩溃时显示友好提示 + 重新加载按钮
- **验证**：手动在组件中 throw Error 测试

### P1.4 清理废弃 CSS
- **目标**：移除已无 JSX 对应的样式
- **清理列表**：
  - `.hero-actions`, `.hero-actions span`
  - `.eyebrow`
  - `.hero-panel__content h1`, `.hero-panel__content p`
  - `.window-frame-hint`, `.window-brand__subtitle`
- **验证**：视觉无变化，`grep` 确认无引用

---

## Phase 2 — 功能增强（用户体验）

### P2.1 任务搜索
- **目标**：在任务列表区添加搜索框，实时筛选标题和备注
- **方案**：添加 `searchQuery` state，`filteredTodos` 中增加搜索过滤逻辑
- **涉及文件**：`App.tsx`（或拆分后的 `NormalDashboard.tsx`）
- **验证**：输入关键词即时过滤，清除搜索恢复完整列表

### P2.2 任务排序
- **目标**：支持按创建时间、更新时间排序
- **方案**：添加排序下拉/切换按钮，`filteredTodos` 增加 `.sort()` 逻辑
- **验证**：切换排序方式后列表顺序正确变化

### P2.3 截止日期
- **目标**：给任务添加截止日期，过期任务高亮
- **方案**：
  - `TodoItem` 新增 `dueDate: string | null` 字段
  - 编辑弹窗和详情面板添加日期选择器
  - 过期未完成任务卡片加红色边框/图标
  - 更新 `normalizePersistedState` 处理新字段
- **验证**：创建带截止日期的任务，过期后视觉高亮

### P2.4 数据导出/导入
- **目标**：支持 JSON 格式的备份和恢复
- **方案**：
  - IPC 新增 `app:export-state` 和 `app:import-state` 通道
  - 挂件右键菜单和正常模式设置区添加导出/导入按钮
  - 导入时确认覆盖提示
- **验证**：导出 JSON → 清空数据 → 导入恢复

### P2.5 回收站
- **目标**：删除的任务进入回收站，可追溯和恢复
- **方案**：
  - `PersistedState` 新增 `trash: TodoItem[]` 字段
  - 删除操作改为移入 `trash`，保留 30 天自动清理
  - 正常模式添加回收站入口（侧边栏或顶部按钮），点击展开回收站列表
  - 回收站内支持恢复和永久删除
  - 更新 `normalizePersistedState` 处理新字段
- **验证**：删除任务 → 回收站可见 → 恢复后回到原列表；永久删除后不可恢复

---

## Phase 3 — 桌面集成（系统级）

### P3.1 系统托盘
- **目标**：关闭窗口时最小化到系统托盘，托盘图标可恢复窗口
- **方案**：
  - main.ts 创建 `Tray`，设置图标和上下文菜单（显示/隐藏、退出）
  - 拦截窗口关闭事件，`event.preventDefault()` 隐藏到托盘
  - 单击托盘恢复窗口
- **验证**：关闭后任务栏无窗口，托盘图标在，单击恢复

### P3.2 全局快捷键
- **目标**：快捷键呼出/隐藏挂件
- **方案**：main.ts 使用 `globalShortcut.register('Ctrl+Shift+T', ...)` 切换窗口显隐
- **验证**：任意界面按快捷键可呼出/隐藏

### P3.3 开机自启
- **目标**：可选的开机自动启动
- **方案**：`app.setLoginItemSettings({ openAtLogin: true/false })`，在右键菜单或设置区切换
- **验证**：勾选后重启系统，应用自动启动

---

## Phase 4 — 视觉与交互（打磨）

### P4.1 亮色主题
- **目标**：支持暗色/亮色主题切换
- **方案**：CSS 变量 + `data-theme="light"` 属性切换，persist 到 state
- **验证**：切换主题后所有区域配色正确

### P4.2 键盘快捷键优化
- **目标**：应用内快捷键提升操作效率
- **方案**：`Ctrl+N` 新建任务、`Ctrl+F` 聚焦搜索、`Escape` 关闭弹窗/取消选中、`Delete` 删除选中任务
- **验证**：各快捷键在对应上下文中生效

### P4.3 动画打磨
- **目标**：任务卡片添加/删除/状态切换时的过渡动画
- **方案**：CSS `transition` + `keyframes`，或轻量动画库
- **验证**：操作时有平滑过渡而非突变

---

## 备选功能（按需）

| 功能 | 复杂度 | 说明 |
|------|--------|------|
| 优先级标记 | 低 | accent 色之外加 P0/P1/P2 |
| 任务备注 Markdown | 中 | 备注支持基础 Markdown 渲染 |
| 云端同步 | 高 | WebDAV 或自建服务 |
| 系统通知 | 中 | 截止日期临近时弹通知 |
| 多看板 | 高 | 支持多个独立看板，切换管理 |

---

## 建议执行顺序

```
P1.1 拆分组件 → P1.2 统一normalize → P1.3 ErrorBoundary → P1.4 清理CSS
   ↓
P2.1 搜索 → P2.2 排序 → P2.3 截止日期 → P2.4 导出导入 → P2.5 回收站
   ↓
P3.1 托盘 → P3.2 全局快捷键 → P3.3 开机自启
   ↓
P4.1 亮色主题 → P4.2 键盘快捷键 → P4.3 动画打磨
```

Phase 1 先做，为后续功能打基础。之后可以按个人偏好调换顺序。
