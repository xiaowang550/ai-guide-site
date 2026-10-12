# 小芽形象与互动

网页素材：`public/assistant/sprout-companion-v2.webp`，256 × 256，透明背景，约 12 KB。素材由内置 **imagegen** 工具按用户提供的“清新绿意萌芽助手.png”制作，再用 Sharp 转为适合网页的小型 WebP。原图未覆盖。

首次访问显示助手介绍气泡，约 12 秒后消失；之后约四分钟且页面闲置十五秒时，轮换简短、符合当前页面的提示。输入、模态弹窗、隐藏标签页、聊天面板和拖动期间暂停。关闭提示后半小时内不再提醒。同一标签页导航不重复首次介绍。

桌面鼠标靠近 180px 范围时，形象向鼠标方向最多位移 3px、旋转 4°。平时轻微漂浮。系统减少动态效果时停止这些动画。继续支持鼠标与触屏拖动，位置保存在本机；提示文字可穿透点击，只有小关闭按钮接收点击。气泡优先出现在助手上方，靠近顶部时显示在下方以保持完整可见。

提醒不调用模型，也不打开聊天。新访问不会恢复之前打开的聊天窗口；用户点击助手或明确点击其他打开助手按钮时才展开。

## 内置 imagegen 最终提示词

Use case: background-extraction and stylized-concept website mascot asset. Image 1 is the user's mascot identity reference and edit target. Create a clean transparent full-body cutout of EXACTLY this same adorable creamy ivory sprout companion with two dark green leaves on its head, glossy dark green eyes with white highlights, warm peach cheeks, happy small open smiling mouth, soft leafy green cape and the small green four-point star clasp, right arm waving. Preserve the original soft polished 3D clay illustration, proportions, colors, friendly expression and slight playful head tilt. Keep eyes, face, leaves, cape and both feet crisp and recognizable at small web sizes. Remove the entire white/cream backdrop, orbit ring, floating stars, ground shadow and ambient outside glow; retain only the single complete mascot body including leaves and cape. True transparent RGBA background, no checkerboard, no white fringe, no border, no text. Center the whole character upright in a square image with minimal 5% safe margins. Do not add other elements or redesign the character.
