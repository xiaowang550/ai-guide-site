# 知芽AI 界面方案

本文为首版历史记录。当前两套独立模板见 [design-editions-v2.md](./design-editions-v2.md)。

原版 classic 保留。studio「清晰 · 工作台」、editorial「留白 · 阅读版」通过后台 → 站点设置 → 界面方案应用。全站设置保存在 site_features，使用现有 owner 鉴权、同源校验和审计记录；每个端刷新读取相同选择。没有迁移账号、课程或学习记录。没有默认替用户选择新方案。

预览链接的 design-preview 只影响当前页面，不写入全站；关闭预览回到已发布方案。原版与新方案的首页结构、文案并存。公共 CSS 按需加载，不在原版页面加载新版图片。新方案覆盖公共页、教师页、登录页与管理工作台，保留表格横向滚动、侧栏滚动、手机底部导航与减少动画设置。

参考研究：

- https://motionsites.ai/ ：实际浏览首页，参考其一个主操作、清楚的分类与内容区节奏。免费作品详情未能完整加载，未复制未核实的提示词或素材。
- https://js.design/community?category=design ：当前浏览器未能加载作品列表。
- https://js.design/special/article/jsdesign-official-website.html ：补充查看即时设计官方工作台介绍，参考任务分区与稳定导航。

GPT 内置 ImageGen，生成而非 CLI。身份参考 public/brand/sprout-hero-v3.webp。保留叶芽、圆润白色身体、绿披风与星形扣。原始透明 PNG 保留在 Codex generated_images；项目版本使用 Sharp 等比缩小为透明 WebP，无重绘。

## 验证记录

- 生产构建通过；权限、持久化、切回原版、三个端读取与非法输入测试通过。
- Chrome：三种方案 × 1440 / 390 / 320 像素宽度，99 项页面与切换检查通过。
- Edge 手机宽度、Firefox 桌面宽度：分别 33 项通过。
- Chrome 与 WebKit：各 10 项手机深色模式、登录页、预览隔离检查通过。WebKit 使用独立页面避免连续导航取消请求；这些检查不代替 iPhone / Android 真机测试。
- 原有性能预算、客户端数据与硬编码审计通过。另计按需资源：界面运行脚本 gzip 1,130 字节，选中新方案时加载的 CSS gzip 4,352 字节；两张小芽 WebP 分别约 42 KB，不在原版加载。
- 默认仍为原版；新方案需要管理员应用，预览链接不会修改全站选择。

## 工作台小芽

路径 public/brand/studio-sprout-v1.webp

提示词：
Use case: stylized-concept. Asset type: transparent character illustration for Zhiya AI's new minimal Studio website. Reference image is the identity reference only. Preserve Xiaoya's two green sprout leaves, soft round ivory body, dark green eyes, small warm smile, dark green cape and white circular star clasp. Create a refined matte porcelain / soft clay 3D version, quietly seated beside a single small ivory notebook with one hand resting on it, composed, helpful, understated. Full body centered, generous clean silhouette, no orbit, no sparkles, no floating UI, no typography, no letters, no background or shadow plane. Soft natural studio lighting, sophisticated muted forest green and warm ivory, subtle material detail, not glossy. True transparent background. Square asset, character fills 80 percent. Keep recognizable core character.

## 阅读版小芽

路径 public/brand/editorial-sprout-v1.webp

提示词：
Use case: stylized-concept. Asset type: transparent Xiaoya mascot for refined editorial website. Input is identity reference: retain two green sprout leaves, soft ivory round body, deep green eyes, friendly small smile, green cape with white star clasp. Reinterpret as elegant handmade paper sculpture with subtle paper grain and gently layered rounded shapes, muted sage forest green and cream. Xiaoya standing calmly holding a closed slim green book against chest with both hands. Fully recognizable same character, premium restrained editorial design, not flat icon, not toy photo. Full body centered with air around silhouette, softly lit. No orbit, sparkles, words, interface, background or base plane. True transparent background, square, silhouette occupying 80 percent.
