# 萌芽参考设计，2026-10-12

参考：用户提供的 Logo、首页，以及 AI 资讯、案例、工具库、教程、学习路径、反馈、知识库图片。原图是视觉参考，图片中的示例版本、日期、评分和联网条件不作为真实产品资料。

首页使用可点击的标题操作区、萌芽插画和任务面板三栏，下面放系统教程、精选案例和工具库入口。保留管理员 DIY 配置。只有未编辑过的旧默认布局会把学习入口提到数量概览之前；版本 2 及后续、已有自定义顺序均保持管理员选择。

公共页采用薄荷绿、白色圆角卡片和图解。工具卡显示实际 0–5 分能力，完整依据在详情。案例按任务筛选；路径阶段可展开，完成度仍存在本机。首页和资讯页继续共享实时来源，首页独立加载轻量资讯组件。反馈保持私有截图、保存与邮件队列，不改动已配置密钥。

样式按页面拆分在 `app/styles/reference-*.css`，公共外壳仅加载基础主题和 Logo。小助手保留拖动、轻触、鼠标跟随、减少动画设置和安静提示，改用柔和圆形底座。

## 插画素材

使用 **内置 imagegen**，background-extraction 模式，以用户原图为编辑目标。字标直接使用原图，CSS 裁切空白，只做 WebP 格式压缩；未让模型重写中文文字。生成图像保留透明通道，未改动用户原始文件。

- `public/brand/wordmark-v3.webp`：原始 Logo 字标，870×290。
- `public/brand/sprout-hero-v3.webp`：首页插画，640×640。
- `public/brand/sprout-mark-v3.webp`：萌芽图标，128×128。
- `app/icon.png`、`app/apple-icon.png`、`public/brand/app-icon-{192,512}-v3.png`：浏览器、Apple 和安装图标。
- `public/icon.svg`：旧安装清单兼容路径，内嵌新版标志。

最终首页插画提示词：

> Use case: background-extraction. Edit target: supplied homepage screenshot. Extract ONLY the large central cream sprout mascot illustration (two green leaves, happy green eyes, green cape, star clasp, waving right hand), preserving its exact face, pose, proportions, 3D material and gentle mint-green palette. Include the thin mint orbit swooshes and small four-point stars surrounding the mascot, as in the original central illustration. Remove ALL page UI, ALL Chinese/English text, the three label chips, buttons, cards, header and webpage background. Produce a clean high-resolution transparent-background square website illustration, mascot occupies 80% of height, no opaque white rectangle, no new character design. Keep the original illustration identity and pose as closely as possible.

最终 Logo 图标提示词：

> Use case: background-extraction. Edit target supplied logo. Extract ONLY the left illustrated logo mark: the same round cream sprout face, two green leaves, dark green cape, green circular swoosh/ribbon and orbit nodes and single four-point star. Remove ALL lettering to the right and all white background. Preserve the supplied logo mark exactly: shape, expression, colors, pose, 3D shading. Square transparent image, round logo mark centered occupying about 88% of square, readable at 48px, no added lettering or UI, do not redesign the logo.

生成插画属于参考图复现，不能保证逐像素相同；页面使用真实组件，按屏幕宽度响应排版，不把截图当成页面。

## 知芽AI 品牌更新，2026-10-13

三个端统一为「知芽AI」，站点配置、浏览器标题、安装名称、反馈署名与邮件发件显示名共用 `lib/brand.ts`。HTTP 请求头使用 ASCII 英文名 `Zhiya AI`。共用 `BrandMark` 的新字标为 `public/brand/zhiya-wordmark-v1.webp`（752×285），在学校端及后台完整展示，在大众端按屏幕宽度使用完整字标或萌芽图标。保留绿色萌芽风格及现有独立图标、角色插画。

新字标使用内置 imagegen，以用户 Logo 截图为编辑目标，替换文字为「知芽AI」，使用原有深绿色圆润字形。生成后仅裁去空白并压缩为 WebP，原图未覆盖。

最终字标提示词：

> Edit the supplied brand logo. Replace ONLY the lettering with the exact brand name 知芽AI (two Chinese characters 知芽 followed immediately by uppercase Latin AI). Keep the existing sprout mascot emblem on the left, its smiling face, green leaves, ring, colors and soft illustrative style. Use deep forest-green, bold rounded Chinese lettering matching the source's playful smooth typography. Exact text must be 知芽AI, no spaces, no extra text, no original brand text remaining. Horizontal compact website header wordmark, emblem and text aligned centrally, mascot height slightly taller than text. Plain white background, generous enough padding that nothing is clipped, but do not add large blank margins. Produce a high-resolution clean single logo suitable for web header use, roughly 3:1 horizontal composition. No mockup, no border, no shadows behind the whole logo.
