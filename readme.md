# 京价保 - 自动申请京东价格保护

京价保是一个帮你监控商品价格变化自动申请京东价格保护的浏览器拓展。

## 🎌 重要更新预告

京价保计划在接下来的版本中移除所有自动化的功能（包括签到、领券等），将价保监控功能完全改造为只提醒而不能自动完成的模式，作为替代，京价保计划补充性的提供：

- [ ] Telegram 机器人提醒

- [ ] 微信提醒

- [ ] 邮件提醒

- [ ] 手机 App

目前相关方案正在做技术调研，欢迎各位提供意见。

## 📦 安装方式

**强烈推荐使用 Chrome 商店安装**（这样才能获得自动更新）：

<a target='_blank' rel='nofollow' href='https://chrome.google.com/webstore/detail/gfgkebiommjpiaomalcbfefimhhanlfd'>
  <img alt='Chrome
  web store' width='496' height='150' src='https://jjbcdn.zaoshu.so/web/cws_badge_496x150.png' />
</a>

另外也非常推荐使用 Microsoft Edge 浏览器：

<a href="https://microsoftedge.microsoft.com/addons/detail/ljdjkkjiognkghfjndoddoplekppngge" target="_black">
  <img alt="安装 Edge 版" class="edge" src="https://edgetipscdn.microsoft.com/insider-site/images/favicon.fbd89822.png" width="32px">
</a>

同时提供

Firefox 版本：

<a href="https://addons.mozilla.org/zh-CN/firefox/addon/jjb/" target="_black">
  <img alt="安装 Firefox 版" class="firefox" src="https://d33wubrfki0l68.cloudfront.net/4ce5ce101cdaa4030248fab2934960ad1cc6960e/3f95c/firefox-quantum.png" width="32px">
</a>

或者直接下载的 CRX文件手动安装（非常不建议）

<a href="http://jjb.zaoshu.so/updates/latest" target="_black">
  <img alt="下载 CRX 文件" class="firefox" src="https://jjbcdn.zaoshu.so/crx-icon.png" width="32px">
</a>

*此方法通常只适用于 Chromium 内核的国产浏览器，因为 Chrome 出于安全原因已禁止通过除 Chrome 官方商店以外的其他渠道安装拓展。*

## ✨ 主要功能

* 监控最近订单商品的价格变化，在商品降价时自动申请价格保护
* 监控购物车降价
* 自动领全品类
* 商品价格走势图

## 🖥 界面截图

![主界面](https://i.loli.net/2020/10/28/T4G67vEhPYnm2dI.png)

## 🔨 如何开发

* 安装依赖
> yarn

* 开始开发
> BUILDID=149 VERSION=2.9.4 BROWSER=chrome yarn build

`主要作用就是合并压缩代码，质疑代码和市场版本不一致，请先自行打包一下再对比`

## 💰 价格

京价保可以免费使用，如果京价保确实帮到你，你可以通过打赏作者来鼓励京价保继续更新。

![打赏作者](https://jjbcdn.zaoshu.so/weixin_pay.png?imageView2/0/h/300)

你的打赏能帮助京价保保持更新，适配京东的页面修改，添加更多自动功能。

## 📈 历史价格走势图

“[价格走势图](https://blog.jjb.im/price-chart.html)”是京价保 2.0 版本引入的新功能。

这是一个计划已久的功能，京价保的核心价保功能原本已经在监控已购商品的价格变化，本功能通过将这些价格信息共享，实现了一个互助的价格历史数据库。

![](https://i.v2ex.co/6G1a56k5.png)


## ⚠️ 安全提示

京价保不会在任何情况下强行劫持访问、插入恶意代码、上传隐私信息或利用你的电脑挖矿。

若你发现任何类似问题，请首先确保你使用的是商店版本，不建议在任何情况下使用第三方提供的安装包。

如果你确实发现京东页面（或者还有其他电商和非电商网站）被劫持，请考虑运营商劫持的可能性，并筛查拓展列表。

## 👮 隐私政策

- 京价保不会在任何情况下强行劫持访问、插入恶意代码、上传隐私信息或利用你的电脑挖矿。

- 京价保不会收集和储存任何个人识别信息（不包括京价保网站由第三方提供的统计服务）。

- 京价保的“价格走势图”功能会上传京东商品的价格/满减/赠品信息，如果不希望京价保上传任何价格信息，停用此功能即可。

- 京价保的部分功能链接带有京东联盟的返利链接，如果介意可以关闭这些功能。

了解详见：https://blog.jjb.im/policy.html


## 💻 系统支持

目前京价保对 Windows 和 Mac 平台的 Chrome/Microsoft Edge/Firefox 有较好的支持，对其他操作系统和浏览器的支持情况不确定。

## 📨 获取信息

你可以 Telegram 上关注京价保： https://t.me/jingjiabao

您还可以关注京价保的公众号（发布更新通知）：

![京价保公众号](https://jjbcdn.zaoshu.so/wechat/qrcode_for_gh_21550d50400c_430.jpg?imageView2/0/h/300)

京价保现在还有一个官方博客： https://blog.jjb.im

## ⚖️ 协议和授权

京价保并非一个开源软件，作者保留全部的权利。
公开源代码的目的是为了让使用者能够审计代码，但是你仍然可以就以下方式合法的使用本项目的全部代码和资源：

1. 个人使用
2. 以学习目的使用全部或部分代码

但你不可以：

1. 将本项目的部分或全部代码和资源进行任何形式的再发行（尤其是上传到 Chrome 商店）
2. 利用本项目的部分或全部代码和资源进行任何商业行为

## 🤝 贡献代码

京价保并非一个开源项目，也不是社区共同创造，其全部功能由作者独立完成。

如果你愿意放弃所有权利，并将权利无条件转让给京价保作者，欢迎您贡献代码。

## ❤️ 提交反馈

欢迎提交 issue，请写清楚遇到问题的原因，浏览器和操作系统环境，重现的流程。

任何反馈问题的 issue 均需按照模板格式填写，否则将被直接关闭。

如果有开发能力，建议在本地调试出出错的代码。

## 🔗 衍生项目

<h3>
  <a href="https://github.com/sunoj/teaclub" target="_blank">茶友会</a>
</h3>

## 🥰 特别推荐

<h3>
  <a href="https://duoshao.net/?utm_source=jjb" target="_blank">多少记账 - 可协作的轻量级专业记账应用</a>
</h3>
