# TodoListss desktop workspace

这个目录是 TodoListss 的 **Electron + React + TypeScript** 桌面版工作区。

完整项目说明、仓库结构和本地启动方式请优先看仓库根目录的 `README.md`。

## 快速开始

```powershell
cd .\desktop
npm install
npm run dev
```

## 常用命令

```powershell
npm run lint
npm run build
npm run dist:win
```

## 说明

- 挂件贴边、自动隐藏、边缘呼出等窗口能力依赖 Electron 原生窗口
- 如果只是浏览器预览，界面可以看，但不会具备完整挂件行为
