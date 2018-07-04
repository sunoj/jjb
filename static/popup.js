(function ($) {
  $.each(['show', 'hide'], function (i, ev) {
    var el = $.fn[ev];
    $.fn[ev] = function () {
      this.trigger(ev);
      return el.apply(this, arguments);
    };
  });
})(jQuery);

let checkinTasks = ['jr-index', 'jr-qyy', 'vip', 'jdpay', 'bean', 'double_check']

$( document ).ready(function() {
  var orders = JSON.parse(localStorage.getItem('jjb_orders'))
  var messages = JSON.parse(localStorage.getItem('jjb_messages'))
  var login = localStorage.getItem('jjb_logged-in');
  var paid = localStorage.getItem('jjb_paid');
  var account = localStorage.getItem('jjb_account');
  var browser = localStorage.getItem('browserName');
  var disabled_link = localStorage.getItem('disabled_link');
  var disabled_link = localStorage.getItem('disabled_link');
  var unreadCount = localStorage.getItem('unreadCount') || 0
  var changelog_version = localStorage.getItem('changelog_version')
  var displayRecommend = localStorage.getItem('displayRecommend')
  var current_version = "{{version}}"

  if (unreadCount > 0) {
    $("#unreadCount").text(unreadCount).fadeIn()
  }

  $("#renderFrame").attr('src', '/render.html')


  // 查询推荐设置
  $.getJSON("https://jjb.zaoshu.so/recommend/settings", function (json) {
    if (json.display) {
      localStorage.setItem('displayRecommend', json.display)
    }
  });
  
  if (login && login == 'Y') {
    let time = Date.now().toString()
    let dialog = false
    $("#loginNotice").hide()
    
    if (paid) {
      $("#dialogs").hide()
    } else {
      if (time[time.length - 1] < 4) {
        showReward()
        dialog = true
      }
    }

    // 只有在没有弹框 且 打开了推荐 取 1/5 的几率弹出推荐
    if (!dialog && displayRecommend == 'true' && time[time.length - 1] > 7) {
      showJEvent()
      dialog = true
    }
    // 如果当前没有弹框 且 需要展示changelog
    if (!dialog && changelog_version != current_version) {
      console.log('current_version', current_version, changelog_version)
      localStorage.setItem('changelog_version', $("#changeLogs").data('version'))
      $("#changeLogs").show()
    }
  } else {
    $("#loginNotice").show()
  }

  if (!account) {
    $("#clearAccount").addClass('weui-btn_disabled')
  }

  // 标记签到状态
  checkinTasks.forEach(task => {
    let record = localStorage.getItem('jjb_checkin_' + task) ? JSON.parse(localStorage.getItem('jjb_checkin_' + task)) : null
    if (record && record.date == moment().format("DDD")) {
      let title = '完成于：' + moment(record.time).locale('zh-cn').calendar()
      if (record.value) {
        title = title + '，领到：' + record.value
      }
      $(".checkin-" + task).find('.reload-icon').hide()
      $(".checkin-" + task).find('.today').attr('title', title).show()
    }
  });
  

  function switchWechat(target) {
    let to = target || 'ming'
    if (to == 'samedi') {
      $("#dialogs .weixin_pay .ming").hide()
      $("#dialogs .weixin_pay .samedi").show()
    } else {
      $("#dialogs .weixin_pay .ming").show()
      $("#dialogs .weixin_pay .samedi").hide()
    }
  }

  function switchAlipay(target) {
    let to = target || ($("#dialogs .alipay_pay .alipay").is(':visible') ? 'redpack' : 'alipay')
    if (to == 'redpack') {
      console.log('show redpack')
      $("#dialogs .alipay_pay .alipay").hide()
      $("#dialogs .alipay_pay .redpack").show()
    } else {
      console.log('show alipay')
      $("#dialogs .alipay_pay .redpack").hide()
      $("#dialogs .alipay_pay .alipay").show()
    }
  }

  function showReward(){
    switchPayMethod('weixin')
    let time = Date.now().toString()
    if (time[time.length - 1] < 3) {
      setTimeout(() => {
        switchPayMethod('alipay')
      }, 50);
    }
  }

  function switchPayMethod(payMethod, target) {
    $("#dialogs").show()
    if (payMethod == 'weixin') {
      $('.segmented-control .weixin').addClass('checked')
      $('.segmented-control .alipay').removeClass('checked')
      $('.weixin_pay').show()
      $('.alipay_pay').hide()
      switchWechat(target)
    } else {
      $('.segmented-control .weixin').removeClass('checked')
      $('.segmented-control .alipay').addClass('checked')
      $('.weixin_pay').hide()
      $('.alipay_pay').show()
      switchAlipay('alipay')
    }
  }

  // tippy
  setTimeout(function () {
    tippy('.tippy', {
      animation: 'scale',
      duration: 20,
      arrow: true
    })
  }, 800)


  $('.settings .weui-navbar__item').on('click', function () {
    $(this).addClass('weui-bar__item_on').siblings('.weui-bar__item_on').removeClass('weui-bar__item_on');
    var type = $(this).data('type')
    $('.settings_box').hide()
    $('.settings_box.' + type).show()
  });


  $('.contents .weui-navbar__item').on('click', function () {
    $(this).addClass('weui-bar__item_on').siblings('.weui-bar__item_on').removeClass('weui-bar__item_on');
    var type = $(this).data('type')
    if (type == 'messages') {
      $("#unreadCount").fadeOut()
      chrome.runtime.sendMessage({
        text: "clearUnread"
      }, function (response) {
        console.log("Response: ", response);
      });
    }
    $('.contents-box').hide()
    $('.contents-box.' + type).show()
  });

  if (orders) {
    orders = orders.map(function (order) {
      order.time = moment(order.time).locale('zh-cn').calendar()
      return order
    })
  } else {
    orders = []
  }

  if (messages) {
    messages = messages.reverse().map(function (message) {
      if (message.type == 'coupon') {
        message.coupon = JSON.parse(message.content)
      }
      message.time = moment(message.time).locale('zh-cn').calendar()
      return message
    })
  } else {
    messages = []
  }

  var bindAction = function () {
    $('.messages-header .Button').on('click', function () {
      let type = $(this).data('type')
      $('.messages-header .Button').removeClass('selectedTab')
      $(this).addClass('selectedTab')
      $('.message-items .message-item').hide()
      $('.message-items').find('.type-' + type).show()
    });
  }

  var renderFrame = document.getElementById('renderFrame');
 
  if (orders && orders.length > 0) {
    setTimeout(() => {
      renderFrame.contentWindow.postMessage({
        command: 'render',
        context: {
          name: 'orders',
          orders: orders,
          disabled_link: disabled_link == 'checked' ? true : false
        }
      }, '*');
    }, 500);
  }

  if (messages && messages.length > 0) {
    setTimeout(() => {
      renderFrame.contentWindow.postMessage({
        command: 'render',
        context: {
          name: 'messages',
          messages: messages
        }
      }, '*');
    }, 1200);
  }

  function receiveMessage(event) {
    if (event.data.html) {
      switch (event.data.name) {
        case 'orders':
          $('#orders').html(event.data.html)
          break;
        case 'messages':
          $('#messages').html(event.data.html)
          bindAction()
          break;
        default:
          break;
      }
    }
  }
  window.addEventListener('message', receiveMessage, false)

  $(".weui-cell_select").each(function () {
    var job_elem = $(this)
    if (job_elem) {
      var jobId = job_elem.attr('id')
      if (jobId) {
        var last_run_time = localStorage.getItem(jobId + '_lasttime')
        if (last_run_time) {
          job_elem.find('.reload-icon').attr('title', '上次运行： '+ moment(Number(last_run_time)).locale('zh-cn').calendar())
        } else {
          job_elem.find('.reload-icon').attr('title', '从未执行')
        }
      }
    }
  })

  $("#recommendCardDialags .weui-dialog .switch-cardbank").click(function () {
    var bank = $(this).data('bank')
    $('#recommendCardDialags .segmented-control__item').removeClass('checked')
    $(this).parent().addClass('checked')
    $('.card-box').each(function () {
      if ($(this).hasClass(bank)){
        $(this).show()
      } else {
        $(this).hide()
      }
    });
  });

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


  $(".switch-paymethod").on("click", function () {
    let to = $(this).data('to')
    let target = $(this).data('target')
    switchPayMethod(to, target)
  })

  $("#showChangeLog").on("click", function () {
    localStorage.setItem('changelog_version', $("#changeLogs").data('version'))
    $("#changeLogs").show()
  })

  $("#openRecommendCard").on("click", function () {
    $("#recommendCardDialags").show()
  })

  $("#openWechatCard").on("click", function () {
    $("#wechatDialags").show()
  })
  

  $("#openjEventCard").on("click", function () {
    showJEvent()
  })

  $("#openFeedback").on("click", function () {
    // 加载反馈
    if ($("#feedbackIframe").attr('src') == '') {
      $("#feedbackIframe").attr('src', "https://i.duotai.net/forms/yovwz")
      setTimeout(function () {
        $('.iframe-loading').hide()
      }, 800)
    }
    $("#feedbackDialags").show()
  })


  function showJEvent() {
    // 加载反馈
    if ($("#jEventIframe").attr('src') == '') {
      $("#jEventIframe").attr('src', "https://i.duotai.net/forms/zm5rk/i6svm4on")
      setTimeout(function () {
        $('.iframe-loading').hide()
      }, 800)
    }
    $("#jEventDialags").show()
  }

  $("#clearPinnedTabs").on("click", function () {
    chrome.tabs.query({
      pinned: true
    }, function (tabs) {
      var tabIds = $.map(tabs, function (tab) {
        if (tab && tab.url.indexOf('jd.com') !== -1) {
            return tab.id
        }
      })

      // opera doesn't remove pinned tabs, so lets first unpin
      $.map(tabIds, function (tabId) {
        chrome.tabs.update(tabId, {"pinned":false}, function(theTab){ chrome.tabs.remove(theTab.id); });
      })
    })
  })

  $("#feedbackDialags .js-close").on("click", function () {
    $("#feedbackDialags").hide()
  })

  $("#jEventDialags .js-close").on("click", function () {
    $("#jEventDialags").hide()
  })

  $("#recommendCardDialags .js-close").on("click", function () {
    $("#recommendCardDialags").hide()
  })

  $("#dialogs .js-close").on("click", function () {
    $("#dialogs").hide()
  })

  $("#wechatDialags .js-close").on("click", function () {
    $("#wechatDialags").hide()
  })
  

  $(".reload").on("click", function () {
    var job_elem = $(this).parent().parent()

    if (job_elem) {
      
      chrome.runtime.sendMessage({
        text: "runJob",
        content: job_elem.attr('id')
      }, function(response) {
        console.log("Response: ", response);
      });
    }
  })

  $("#clearAccount").on("click", function () {
    localStorage.removeItem('jjb_account')
    localStorage.removeItem('jjb_orders')
    localStorage.removeItem('jjb_messages')
    chrome.tabs.create({
      url: "https://passport.jd.com/uc/login"
    })
  })


  $("#login").on("click", function () {
    chrome.runtime.sendMessage({
      text: "openLogin",
    }, function(response) {
      console.log("Response: ", response);
    });
  })

  var rewards = [
    '给开发者加个鸡腿',
    '请开发者喝杯咖啡',
    '京价保就是好',
    '保价成功，感谢开发者',
    '返利到手，打赏开发者',
    '赞赏支持',
    '打赏声优'
  ]

  var notices = [
    {
      text: '成功申请到价保、领取到返利或者有功能建议欢迎打赏附言。',
      button: rewards[3],
      target: 'ming'
    },
    {
      text: '理想情况下京价保每月仅各种签到任务即可带来5元以上的等同现金收益。',
      button: rewards[2],
      target: 'ming'
    },
    {
      text: '京东页面经常修改，唯有你的支持才能让京价保保持更新持续运作。',
      button: rewards[5],
      target: 'ming'
    },
    {
      text: '京价保所有的功能均在本地完成，不会上传任何信息给任何人。',
      button: rewards[5],
      target: 'ming'
    },
    {
      text: '京价保部分功能会开启一个固定的标签页，过一会儿它会自动关掉，不必紧张。',
      button: rewards[1],
      target: 'ming'
    },
    {
      text: '京东的登录有效期很短，请在登录时勾选保存密码自动登录以便京价保自动完成工作。',
      button: rewards[0],
      target: 'ming'
    },
    {
      text: '京价保全部代码已上传到GitHub，欢迎审查代码，了解京价保如何工作。',
      button: rewards[0],
      target: 'ming'
    },
    {
      text: '软件开发需要开发者付出劳动和智慧，每一行代码都要付出相应的工作，并非唾手可得。',
      button: rewards[5],
      target: 'ming'
    },
    {
      text: '京价保并不强制付费，但如果它确实帮到你，希望你也能帮助它保持更新。',
      button: rewards[5],
      target: 'ming'
    },
    {
      text: '许多开源项目因为缺乏支持而停止更新，如果你希望京价保保持更新，请赞赏支持。',
      button: rewards[5],
      target: 'ming'
    },
    {
      text: '如果每个京价保的用户都能每个月赞赏5元，开发者就能投入更多时间维护京价保，增加更多实用功能。',
      button: rewards[5],
      target: 'ming'
    },
    {
      text: '把京价保推荐给你的朋友同样能帮助京价保保持更新，如果缺乏使用者，开发者可能会放弃维护项目。',
      button: rewards[2],
      target: 'ming'
    },
    {
      text: '如果价保成功的话，打赏声优小姐姐几块钱她会很开心哦',
      button: rewards[6],
      target: 'samedi'
    },
    {
      text: '持续的打赏不仅能为开发者带来收入，还提供了巨大的精神鼓励支持开发者继续开发京价保',
      button: rewards[5],
      target: 'ming'
    },
  ]

  function changeNotice() {
    let notice = notices[Math.floor(Math.random() * notices.length)]
    $("#notice").text(notice.text)
    $(".tips .switch-paymethod").text(notice.button)
    $(".tips .switch-paymethod").data('target', notice.target)
  }
  
  $("#notice").on("dblclick", function () {
    changeNotice()
  })

  $("#pricePro").on("click", function () {
    chrome.runtime.sendMessage({
      text: "openPricePro"
    }, function (response) {
      console.log("Response: ", response);
    })
  })

  $(".listenVoice").on("click", function () {
    listenVoice($(this).data('type'), $(this).data('batch'))
  })

  // 试听通知
  function listenVoice(type, batch) {
    chrome.runtime.sendMessage({
      text: type,
      batch: batch,
      test: true,
      title: "【试听】京价保通知试听",
      content: "并没有钱，这只是假象，你不要太当真"
    }, function (response) {
      console.log("Response: ", response);
    });
  }
})