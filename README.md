# Tesla Wrap Studio Lite

一个简化版的 Tesla 贴膜设计工具，专注于 AI 生成设计功能。

## 核心功能

1. **模版选择** - 支持 9 种 Tesla 车型和 7 种工厂颜色
2. **AI 设计生成** - 输入描述，自动生成贴膜设计（Mock 模式）
3. **实时预览** - 在 2D 画布上实时查看设计效果
4. **3D 预览** - 使用 Godot 引擎进行 3D 车辆预览
5. **导出 PNG** - 导出 1024x1024 像素的设计图片

## 支持的车型

| 车型 | 变体 |
|------|------|
| Cybertruck | 标准版 |
| Model 3 | 标准版、2024+ 基础版、2024+ 性能版 |
| Model Y | 标准版、2025+ 标准版、2025+ 高级版、2025+ 性能版、Model Y L |

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite 5** - 构建工具
- **Konva / React-Konva** - 2D 画布渲染
- **Zustand** - 状态管理
- **Tailwind CSS** - 样式
- **Godot Engine** - 3D 预览

## 快速开始

```bash
# 安装依赖
npm install --legacy-peer-deps

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── App.tsx                          # 应用入口
├── editor/
│   ├── WrapDesignerPage.tsx         # 主页面布局
│   ├── EditorCanvas.tsx             # 2D 画布组件
│   ├── Toolbar.tsx                  # 顶部工具栏
│   ├── state/
│   │   ├── editorTypes.ts           # TypeScript 类型定义
│   │   └── useEditorStore.ts        # Zustand 状态管理
│   └── components/
│       ├── AIPanel.tsx              # AI 生成面板
│       ├── ModelSelector.tsx        # 车型/颜色选择器
│       ├── DownloadDialog.tsx       # 下载确认对话框
│       ├── InfoDialog.tsx           # 安装说明对话框
│       └── layers/
│           └── TextureLayer.tsx     # 纹理图层组件
├── viewer/
│   └── GodotViewer.tsx              # 3D 预览组件
├── data/
│   └── carModels.ts                 # 车型数据配置
└── utils/
    ├── exportPng.ts                 # PNG 导出功能
    ├── image.ts                     # 图片处理工具
    └── assets.ts                    # 资源 URL 管理
```

## 使用流程

1. **选择车型** - 点击工具栏的车型选择器，选择目标 Tesla 车型
2. **选择底色** - 选择车辆的基础颜色（工厂颜色）
3. **输入描述** - 在左侧 AI 面板输入设计描述，如 "Ironman themed wrap"
4. **生成设计** - 点击 "Generate Design" 按钮生成设计
5. **3D 预览** - 点击 "3D Preview" 查看 3D 效果
6. **导出图片** - 点击 "Export PNG" 导出最终设计

## AI 生成说明

当前版本使用 **Mock 模式**，AI 生成功能会：
- 模拟 2-4 秒的生成延迟
- 根据输入描述生成彩色渐变设计
- 设计会自动应用到车型模版上

如需接入真实 AI 服务，可以修改 `src/editor/components/AIPanel.tsx` 中的 `handleGenerate` 函数。

## 安装到 Tesla 车辆

导出的 PNG 文件可以安装到 Tesla 车辆上：

1. 将导出的 PNG 文件复制到 USB 驱动器
2. 在 Tesla 中控屏幕进入 **Toybox**
3. 选择 **Wrap Studio**
4. 导入自定义贴膜文件

## 与完整版的区别

此简化版移除了以下功能：
- 用户认证系统
- 图层编辑工具（画笔、文字、形状等）
- 图层面板和属性面板
- 项目保存/打开功能
- 云端同步
- 支付系统

保留了核心的设计预览和导出功能，适合快速体验 AI 生成设计。

## 许可证

MIT

---

基于 [Tesla Wrap Studio](https://github.com/dtschannen/Tesla-Wrap-Studio) 简化
