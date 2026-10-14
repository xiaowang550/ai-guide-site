# 知芽AI：两套独立模板

2026-10-14。用户选择一套明亮极简、一套深色科技感，并要求结构不同。原版 `classic` 保留；旧 `studio` / `editorial` 选择值升级为新模板，无需迁移全站配置。

## 三端结构

| 端       | 知芽桌面 · 明亮（studio）                                                              | 知芽探索 · 深色（editorial）                                                       |
| -------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 公开网站 | 固定左侧导航、顶部搜索入口、首页搜索框、任务工作区、并列资源列表；案例采用横向图文条目 | 悬浮顶部导航、独立探索首页、浮动小芽、横向任务选择、分区资源列表；案例采用封面卡片 |
| 教师端   | 侧栏教学导航、横向任务选项、任务说明与步骤并列                                         | 顶部导航、居中标题、纵向任务选择、横向步骤清单                                     |
| 管理端   | 左侧管理分区、顶部操作、四个常用管理入口                                               | 顶部管理分区矩阵、全宽操作区域、整合数据摘要、四个常用管理入口                     |

现有搜索、筛选、课程、练习、收藏、反馈和管理权限继续复用。两套任务面板均可用方向键、Home、End 操作；菜单支持 Escape 关闭。减少动态效果偏好会关闭浮动动画。手机保留底部导航，并改用折叠菜单。

## 应用与预览

后台 → 站点设置 → 网站模板，应用到三个端。配置仍通过已鉴权的 `/api/admin/site-settings` 保存，三个端刷新读取同一份设置。预览 `?design-preview=studio` 或 `?design-preview=editorial` 不更改全站配置，站内链接和 GET 搜索保留预览状态；退出预览恢复当前全站模板。

运行脚本 `public/design/runtime-v2.js` 按需加载 `templates-v2.css`。模板入口在非原版时才懒加载导航及首页组件，原版不下载新版小芽。深色模板固定深色、明亮模板固定明亮；切回原版时恢复原版颜色偏好。旧版静态文件保留，以兼容尚未更新的页面缓存。

## 参考与素材

- https://motionsites.ai/ ：查看了可访问的首页导航、标题层级及展示结构；部分预览资源及作品详情未完整加载，没有复制未核实的模板或提示词。
- https://js.design/community?category=design ：尝试网页访问及实际浏览器访问，作品列表未加载，不能声称已研究其中具体作品。
- 下面两张小芽使用 GPT 内置 ImageGen，参考用户提供的小芽身份图片生成；透明 PNG 用 Sharp 等比缩小为 WebP，保留透明通道。界面与图形装饰为代码实现。

### 明亮版小芽

项目路径：`public/brand/desk-sprout-v2.webp`。

原始文件：`C:/Users/ll/.codex/generated_images/01a1195a-f682-7f50-841c-aae36f6125b5/exec-01903c1d-c24c-418e-8326-92626a57756d.png`。

提示词：

> Create a transparent full body Xiaoya mascot for a sophisticated minimal white web productivity workspace. Use the attached reference only for identity: two green leaf sprouts, soft round ivory body, big deep green eyes, small smiling mouth, green cape and star clasp. New pose: standing on tiptoe, leaning sideways while holding a single oversized smooth translucent mint rounded square tile with a tiny embossed four-point star, as if arranging a workspace. Friendly attentive expression, warm ivory ceramic and soft matte mint, premium soft 3D render, crisp silhouette. Not the seated book pose. No text, letters, scenery, orbit, sparkle clutter, background or floor plane. Centered square composition, whole character and tile visible, true transparent alpha.

### 深色版小芽

项目路径：`public/brand/orbit-sprout-v2.webp`。

原始文件：`C:/Users/ll/.codex/generated_images/01a1195a-f682-7f50-841c-aae36f6125b5/exec-5265a87c-f8a2-4e52-b95f-41b6e3bbfeac.png`。

提示词：

> A friendly Xiaoya sprout mascot floating in a curious forward pointing pose. Reference is the character identity: two leaves on head, round cream body, big kind green eyes, smiling face, cape and star clasp. Make a tasteful blue-green nighttime variant with teal leaves and cape, gentle cyan edge lighting on the cream body. High quality soft 3D illustration. Full body isolated, no text, no scenery. Transparent background.

## 验证

- 生产构建：181 个路由，173 个 HTML 文件。
- 67 个测试文件、1031 项测试通过。
- 原有首屏性能预算通过，未提高预算阈值；客户端数据审计和硬编码审计通过。
- Chrome：三种模板 × 1440 / 390 / 320 像素，99 项页面与切换检查通过。Edge 390 像素、Firefox 1440 像素分别 33 项通过。
- Chrome 与 WebKit 各检查两套新模板的首页、工具库、案例和两个登录页，颜色固定及预览隔离通过。WebKit 工具库曾在等待全部资源时超时，改为等待 DOM 和模板样式后单独复核通过。
- 验证预览中搜索参数、站内跳转、菜单 Escape、退出后恢复原版及颜色偏好。
- 浏览器视口模拟不等同于所有手机型号的真机测试。
- 按需运行脚本 gzip 约 2.2 KB，模板 CSS gzip 约 7.2 KB，另加载选中方案的小芽 WebP。
