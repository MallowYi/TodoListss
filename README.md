# TodoListss

TodoListss 是一个面向 Windows 的本地 Todo 桌面应用，重点能力是**挂件模式**：窗口可以切换为紧凑看板、保持置顶、拖到屏幕边缘后自动隐藏，并在鼠标回到边缘时自动呼出。

当前仓库同时保留了两套实现：

| 路径 | 说明 |
| --- | --- |
| `desktop/` | Electron + React + TypeScript 桌面版，当前更适合继续做界面和交互迭代 |
| `src/TodoListss.App/` | WPF/.NET Windows 桌面版 |
| `tests/TodoListss.App.Tests/` | WPF 相关测试 |
| `specs/001-desktop-todolist/` | 需求规格、设计和任务拆解 |

## 已实现能力

- 创建、编辑、完成、删除待办事项
- 常规桌面模式与挂件模式切换
- 挂件贴边、自动隐藏、边缘呼出
- 本地持久化，无需登录、无需后端
- 挂件看板多列布局与卡片拖拽整理

## 环境要求

- Windows 10/11
- Node.js LTS（建议 20+）和 npm
- .NET 10 SDK（如果你要运行 WPF 版本或执行 `dotnet` 测试）

## 克隆仓库

```powershell
git clone https://github.com/MallowYi/TodoListss.git
cd .\TodoListss
```

## 本地运行（推荐：Electron 版本）

Electron 版本在 `desktop/` 目录下，包含当前主要的界面与挂件交互实现。

```powershell
cd .\desktop
npm install
npm run dev
```

启动后会打开 Electron 桌面窗口。真正的挂件贴边、自动隐藏、始终置顶等原生窗口能力**只会在 Electron 窗口里生效**，浏览器预览模式不包含这些行为。

### Electron 常用命令

```powershell
cd .\desktop
npm run lint
npm run build
npm run dist:win
```

## 本地运行（WPF 版本）

如果你想运行或调试 WPF 实现，可以在仓库根目录执行：

```powershell
dotnet build .\TodoListss.sln
dotnet test .\TodoListss.sln
dotnet run --project .\src\TodoListss.App\TodoListss.App.csproj
```

也可以直接用 Visual Studio 打开 `TodoListss.sln` 运行。

## 数据存储

项目当前是本地持久化，不依赖数据库或云端服务：

- **Electron 版**：把状态写到 Electron `userData` 目录下的 `state.json`
- **WPF 版**：把状态写到 `%AppData%\TodoListss\state.json`

保存内容包括待办列表、选中项、挂件模式状态、贴边状态，以及窗口大小和位置。

## 仓库开发说明

- 如果你主要关心当前桌面 UI 和挂件行为，优先看 `desktop/`
- 如果你想看原生 Windows 实现和单元测试，查看 `src/` 与 `tests/`
- `specs/001-desktop-todolist/` 里保留了这个功能的规格、设计与任务文档
