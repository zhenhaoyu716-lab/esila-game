# 合成EsiLA · Cloudflare发布

已于 2026-10-08 发布到 Cloudflare Pages。

- 正式地址：https://esila-game.pages.dev/
- Cloudflare 项目：`esila-game`
- 正式分支：`main`
- 本次部署：https://3ad1370c.esila-game.pages.dev/
- 部署 ID：`3ad1370c-7d48-4277-acd5-09e2f8f9f91d`
- 控制台：https://dash.cloudflare.com/2062dafcbe7249c22a801e2a9a3a6b7b/pages/view/esila-game

发布文件夹：`cloudflare-site`。浏览器直接上传文件：`合成EsiLA-Cloudflare.zip`。

包内包含游戏页面、样式、两份游戏脚本和11张图片，共15个文件。截图、测试和本地预览服务器不包含在发布包中。

本次通过 Cloudflare 插件创建项目并提交部署，用 Wrangler 上传 15 个文件。发布文件包含此前的图片、弹性效果、界面文案和积分规则：合成 2—10 号依次加 1—9 分，合成 11 号后本局积分固定为 388。

最新版将槽高度从 590 增加到 710，底部从 574 下移到 694。虚线仍在 100，可用堆叠高度从 474 增加到 594，约增加 25%。7 项物理测试通过，已核对正式网址的页面和两份脚本与本地发布文件一致。

开始提示已改为「点击这里，放下第e个」，正式网址已核对一致。

快满时的提示已改为「快满啦，快合e位」，已核对线上脚本与本地发布文件一致。

官方说明：https://developers.cloudflare.com/pages/get-started/direct-upload/

更新游戏后，在本目录运行 `npm run build`。如果本机 Wrangler 已登录，可运行 `npm run deploy` 更新同一个项目；也可在 Edge 中打开上述控制台，进入该项目并选择创建部署，上传最新的 `cloudflare-site` 文件夹。页面地址保持不变。

重新打包时，ZIP 根目录应直接包含 `index.html`。临时上传授权通过内存传递，不写入发布目录。
