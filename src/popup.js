import * as _ from "lodash"
$ = window.$ = window.jQuery = require('jquery')

import tippy from 'tippy.js'
import 'weui';
import Vue from 'vue'

import { getLoginState } from './account'

import App from './components/App.vue';
import VueLazyload from 'vue-lazyload'

import MessageBox from './components/messageBox/messageBox';
Vue.use(MessageBox);

import Toast from './components/toast/toast';
Vue.use(Toast);

Vue.use(VueLazyload, {
  preLoad: 1.3,
  error: 'https://jjbcdn.zaoshu.so/web/img_error.png',
  attempt: 1
})
new Vue({
  el: '#app',
  render: h => h(App)
})



$( document ).ready(function() {
  const paid = localStorage.getItem('jjb_paid');
  const account = localStorage.getItem('jjb_account');
  let loginState = getLoginState()

  // tippy
  tippy('.tippy')

  // 是否已存在弹窗
  function isNoDialog(){
    return ($(".js_dialog:visible").length < 1) && ($(".weui-dialog:visible").length < 1)
  }

  // 常规弹窗延迟200ms
  setTimeout(() => {
    if (paid) {
      $("#dialogs").hide()
    }

    // 没有弹框 且 未登录账号
    if (isNoDialog() && (!account && loginState.class == "failed") || loginState.class == "unknown") {
      $("#loginNotice").show();
    }

    if (!account) {
      $("#clearAccount").addClass('weui-btn_disabled')
    }
  }, 200);


  $(".weui-dialog__ft a").on("click", function () {
    $("#dialogs").hide()
    $("#listenAudio").hide()
    $("#loginNotice").hide()
    $("#changeLogs").hide()
    if ($(this).data('action') == 'paid') {
      chrome.runtime.sendMessage({
        text: "paid"
      }, function(response) {
        console.log("Response: ", response);
      });
    } else {
      if ($(this).data('action') == 'pay') {
        showReward()
      }
    }
  })

  $("#listen").on("click", function () {
    $("#listenAudio").show()
  })

  $(".showLoginState").on("click", function () {
    $("#loginNotice").show()
  })

  $("#openFeedback").on("click", function () {
    // 加载反馈
    if ($("#feedbackIframe").attr('src') == '') {
      $("#feedbackIframe").attr('src', `https://i.duotai.net/forms/yovwz?version=${process.env.VERSION}`)
      setTimeout(function () {
        $('.iframe-loading').hide()
      }, 800)
    }
    $("#feedbackDialags").show()
  })

  $("#openFaq").on("click", function () {
    // 加载反馈
    if ($("#faqIframe").attr('src') == '') {
      $("#faqIframe").attr('src', "https://i.duotai.net/forms/oqyvk/1lpb11l2")
      setTimeout(function () {
        $('.iframe-loading').hide()
      }, 800)
    }
    $("#faqDialags").show()
  })

  $("#feedbackDialags .js-close").on("click", function () {
    $("#feedbackDialags").hide()
  })

  $("#faqDialags .js-close").on("click", function () {
    $("#faqDialags").hide()
  })

  $("#jEventDialags .js-close").on("click", function () {
    $("#jEventDialags").hide()
  })

  $("#dialogs .js-close").on("click", function () {
    $("#dialogs").hide()
  })

  $("#wechatDialags .js-close").on("click", function () {
    $("#wechatDialags").hide()
  })


  $(".openLogin").on("click", function () {
    chrome.runtime.sendMessage({
      text: "openLogin",
    }, function(response) {
      console.log("Response: ", response);
    });
  })

  $("#pricePro").on("click", function () {
    chrome.runtime.sendMessage({
      text: "openPricePro"
    }, function (response) {
      console.log("Response: ", response);
    })
  })

})

chrome.windows.getCurrent(function (current) {
  if (current.type == "popup") {
    $(".main-app").addClass("popup-window")
  }
})


// 防止缩放
chrome.tabs.getZoomSettings(function (zoomSettings) {
  if (zoomSettings.defaultZoomFactor > 1 && zoomSettings.scope == 'per-origin' && zoomSettings.mode == 'automatic') {
    let zoomPercent = (100 / (zoomSettings.defaultZoomFactor * 100)) * 100;
    document.body.style.zoom = zoomPercent + '%'
    document.body.style.setProperty("--zoom-factor", zoomSettings.defaultZoomFactor);
  }
})
