# 弦域 · 光的工作室

2026-10-30 的独立设计预览，入口 `/preview/arc/`。网站、教师端和后台通过底部预览工具条切换，支持 `?view=teacher`、`?view=admin` 分享指定界面。正式站首页和既有账号、模型配置、发布内容没有替换。

## 设计与使用

深海蓝、珍珠白、冰蓝与珊瑚色取代原来的黑绿仪表盘。全幅玻璃星灵“弧灵”与中文排版组成首屏，纸面练习、工具目录、工作案例舞台和教程形成明暗节奏。没有机器人、工程坐标、开场等待、自动音频或虚构用户评价。

星灵支持指针视差、点击问候、暂停和减少动态效果；练习可带入真实 AI 工作台。工具支持搜索、分类、收藏与最多三项对比。工作台使用已有模型接口，提供流式回答、停止、重试、复制、模式草稿、焦点约束和错误反馈。新任务会清除旧结果；没有指定新任务时重新打开保留草稿。

教师预览支持课题编辑、阶段切换、展开步骤、复制和实际 AI 练习。后台的开关、排序、筛选与缩略图只在本次预览内生效，不调用管理写入接口；正式工作入口另外提供。

## 技能分工

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/main/.claude/skills/ui-ux-pro-max)：实际运行本地设计系统、焦点与 Next.js 图片查询，提取适用的留白、对比度、触控和性能建议。数据库首个粗查询匹配 Brutalism，与本站方向不符，未采用；收窄后得到 Minimalism & Swiss Style，作为内容区秩序参考，不替代艺术方向。
- [Landing Page Design](https://github.com/elayadesign/ai-design-skills/tree/main/skills/landing-page-design)：用于清晰行动、中文换行、版式节奏及交互状态检查。未采用其固定黑灰审美与虚构品牌、人物、数字的示例。
- [Video Shotcraft](https://github.com/Vincentwei1021/video-shotcraft)：已审查，偏 Remotion 宣传片、镜头和音频流水线，本轮不安装、不执行。

前两套技能通过官方 skill-installer 安装在项目工作目录 `D:/codex-wez1/design-skills`，没有修改用户原有全局技能。设计、视觉和交互由不同代理分工，最终在真实页面整合检查。

## 图像素材

素材由内置 GPT image generation 生成，非代码拼接角色。透明原图 1536×1024，项目引用版本保存在 [spirit-v1.webp](../public/arc/spirit-v1.webp)，1400×933，约237 KB；WebP 保留透明通道。图片负责艺术形象，排版、控件、状态、问候与视差由 HTML/CSS/React 实现，不把整页做成图片，也不宣称它是可旋转的三维网格模型。

生成提示词：

> Use case: stylized-concept. Asset type: original transparent-background hero character for an elegant Chinese AI exploration website. Create ONE exceptionally art-directed original science-fiction virtual companion named Arc / 弧灵: a mysterious but approachable fluid-glass spirit, a graceful airborne organism somewhere between a small manta ray, a luminous silk ribbon and a folded bird. NOT a robot. A sculptural pearlescent translucent glass central teardrop body, two generous sweeping curved wing-like fins made of layered liquid optical glass, a slender flowing ribbon tail. Its silhouette should be unmistakable, expressive and balanced, like a collectible designer sculpture from a luxury motion studio. A small soft luminous heart suspended inside its body and two tiny subtle eye-like light points give it a calm friendly personality, with no cartoon grin. Three-quarter view with face toward camera-left, body floating diagonally upward, wings curving in a loose open embrace. Premium CGI / physically based 3D rendering, subtle glass refraction, pearly opaline highlights, frosted edges, thin-film iridescence in pale ice blue, silver and very restrained lavender; faint warm peach light in the inner heart. Strong dark-side shading plus beautifully shaped studio rim light to reveal real volume, meticulous surface detail. Full body and trailing ribbon completely visible with generous transparent margin. No text, no letters, no logos, no user interface, no panels, no pedestals, no background scenery, no cast shadow on a plane, no grid. Real alpha transparency behind the character. The character should feel wondrous, sophisticated and alive rather than childish, chrome-plastic, generic jellyfish, round-bellied toy, or a head with disconnected sphere limbs. Composition intended to occupy the center-right of a wide website scene with HTML typography in front. High visual finish, cinematic editorial hero asset.

浏览器的模型响应使用受控测试接口验证请求、排版和交互，不据此宣称逐个实测全部线上模型的输出质量。
