<template>
  <div id="loginNotice" :class="`state-${state.class}`">
    <div class="js_dialog" style="opacity: 1;">
      <div class="weui-mask"></div>
      <div class="weui-dialog">
        <div class="weui-dialog__hd title">
          <span class="online-icon"></span>
          <span class="offline-icon"></span>
          <strong
            class="weui-dialog__title"
          >{{ state.class != "alive" ? "糟糕，京东账号不在登录状态" : "太好了，账号登录状态有效"}}</strong>
        </div>
        <div class="weui-dialog__bd loginNotice">
          <div class="page__bd">
            <div class="weui-cells__title">当前账号状态</div>
            <div class="weui-cells">
              <a
                :target="state['pc'].state != 'alive' ? '_blank' : '_self'"
                :href="state['pc'].state != 'alive' ? 'https://home.jd.com' : ''"
                v-tippy
                :class="`${state['pc'].state} login-type_pc`"
                :title="state['pc'].description"
              >
                <div class="weui-cell">
                  <div class="weui-cell__hd" style="position: relative;margin-right: 10px;">
                    <img src="../../static/image/pc.svg" style="width: 30px;display: block">
                  </div>
                  <div class="weui-cell__bd">
                    <p>PC 网页</p>
                    <p style="font-size: 13px;color: #888888;">同步可价保的订单列表</p>
                  </div>
                  <div class="weui-cell__ft login-status" style="font-size: 0">
                    <span
                      style="vertical-align:middle; font-size: 17px;"
                      class="status-text"
                    >{{stateText[state['pc'].state]}}</span>
                    <span class="weui-badge weui-badge_dot status-icon"></span>
                  </div>
                </div>
              </a>

            </div>
          </div>
          <p id="know_more" @click="showDetail = !showDetail">了解更多关于京价保如何使用账号</p>
          <div class="detail" v-if="showDetail">
            <h3>京价保如何使用你的账号来完成任务</h3>
            <p>如你所知，京价保是一个浏览器插件。在你的授权下，京价保代替你自动访问京东的网页来执行一系列操作。京价保的
              <b>所有功能均为京东官方网页所提供</b>的功能。它所做的一切就是免于你逐一打开页面点击按钮，只不过它不知疲倦，日复一日的执行这些行为。
            </p>
            <p>很显然，
              <b>京价保需要您登录京东才能完成你指定的工作</b>。而京东的登录有效期很短，如果您使用扫码登录等方式登录京东，京价保只能在短时间内保持有效。
            </p>
            <p>强烈建议您在登录时选择
              <b>“让京价保记住密码并自动登录”</b>，以便京价保自动完成工作。
            </p>
            <p>京价保确保
              <b>绝不会将您的密码上传和分享给任何人</b>，您可以通过
              <a href="https://github.com/sunoj/jjb" target="_blank">审查代码</a>来确认这一点，同时建议您
              <b>为京东配置一个唯一的登录密码，开启所有的安全措施</b>。
            </p>
            <p>当登录失效或者需要验证码时，京价保将会提醒你。除非你重新登录，否则京价保将无法继续完成任何工作。</p>
          </div>
        </div>
        <div class="weui-dialog__ft">
          <a class="weui-dialog__btn weui-dialog__btn_primary" @click="done('openLogin')">
            <i class="weui-icon-success"></i>现在登录
          </a>
          <a class="weui-dialog__btn weui-dialog__btn_default" @click="done()">知道了</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { stateText } from "../variables";

export default {
  name: "loginNotice",
  props: ["state"],
  data() {
    return {
      stateText: stateText,
      showDetail: false
    };
  },
  methods: {
    openMobilePage: function(url) {
      chrome.runtime.sendMessage(
        {
          action: "openUrlAsMoblie",
          url: url
        },
        function(response) {
          console.log("Response: ", response);
        }
      );
    },
    done: async function(action) {
      if (action == 'openLogin') {
        chrome.runtime.sendMessage({
          action: "openLogin",
        }, function(response) {
          console.log("Response: ", response);
        });
      }
      this.$emit('close')
    }
  }
};
</script>
