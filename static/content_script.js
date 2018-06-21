// 京价保

var observeDOM = (function () {
  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
    eventListenerSupported = window.addEventListener;

  return function (obj, callback) {
    if (MutationObserver) {
      // define a new observer
      var obs = new MutationObserver(function (mutations, observer) {
        if (mutations[0].addedNodes.length || mutations[0].removedNodes.length)
          callback();
      });
      // have the observer observe foo for changes in children
      obs.observe(obj, { childList: true, subtree: true });
    }
    else if (eventListenerSupported) {
      obj.addEventListener('DOMNodeInserted', callback, false);
      obj.addEventListener('DOMNodeRemoved', callback, false);
    }
  };
})();

function escapeSpecialChars(jsonString) {
  return jsonString.replace(/\\n/g, "\\n").replace(/\\'/g, "\\'").replace(/\\"/g, '\\"').replace(/\\&/g, "\\&").replace(/\\r/g, "\\r").replace(/\\t/g, "\\t").replace(/\\b/g, "\\b").replace(/\\f/g, "\\f");
}

async function fetchProductPage(sku) {
  var resp = await fetch('https://item.m.jd.com/product/' + sku + '.html', {
    cache: 'no-cache'
  })
  var page = await resp.text()
  if ($(page)[0] && $(page)[0].id == 'returnurl') {
    var url = $(page)[0].value.replace("http://", "https://")
    var request = new XMLHttpRequest();
    request.open('GET', url, false);
    request.send(null);

    if (request.status === 200) {
      var newData = request.responseText
      request.abort();
      return newData
    } else {
      request.abort();
      throw new Error('GET Error')
    }
  } else {
    return page
  }
}

// 获取价格
async function getNowPrice(sku, isPlus) {
  var data = null
  try {
    data = await fetchProductPage(sku)
  } catch (e) {
    console.log('fetchProductPage', e)
  }
  
  if (data) {
    let itemInfoRe = new RegExp(/<script>[\r\n\s]+window._itemInfo = \({([\s\S]*)}\);[\r\n\s]+<\/script>[\r\n\s]+<script>/, "m");
    let itemOnlyRe = new RegExp(/<script>[\r\n\s]+window._itemOnly =[\r\n\s]+\({([\s\S]*)}\);[\r\n\s]+window\._isLogin/, "m");

    let itemInfo = itemInfoRe.exec(data)
    let itemOnlyInfo = itemOnlyRe.exec(data)

    let itemOnlyJsonString = itemOnlyInfo ? (itemOnlyInfo[1] ? "{" + itemOnlyInfo[1].replace(/,\s*$/, "") + "}" : null) : null
    let skuJsonString = itemInfo ? (itemInfo[1] ? "{" + itemInfo[1].replace(/,\s*$/, "") + "}" : null) : null

    let itemOnly = itemOnlyJsonString ? JSON.parse(escapeSpecialChars(itemOnlyJsonString)) : null
    let skuInfo = skuJsonString ? JSON.parse(escapeSpecialChars(skuJsonString)) : null

    let product_name = (itemOnly ? itemOnly.item.skuName : null) || $(data).find('#itemName').text() || $(data).find('.title-text').text()
    let normal_price = (skuInfo ? skuInfo.price.p : null) || $(data).find('#jdPrice').val() || $(data).find('#specJdPrice').text()

    let spec_price = ($(data).find('#priceSale').text() ? $(data).find('#priceSale').text().replace(/[^0-9\.-]+/g, "") : null) || $(data).find('#spec_price').text()

    let plus_price = (skuInfo ? skuInfo.price.tpp : null) || $(data).find('#specPlusPrice').text()

    let price = normal_price || spec_price || plus_price

    if (!product_name) {
      console.log(data, $(data))
    }
    console.log(product_name + '最新价格', Number(price), 'Plus 价格', Number(plus_price))

    if (Number(plus_price) > 0 && isPlus) {
      return Number(plus_price)
    }

    return Number(price)
  } else {
    return null
  }
}

async function dealProduct(product, order_info, setting) {
  console.log('dealProduct', product, order_info)
  var success_logs = []
  var product_name = product.find('.item-name .name').text()
  var order_price = Number(product.find('.item-opt .price').text().replace(/[^0-9\.-]+/g, ""))
  var order_sku = product.find('.item-opt .apply').attr('id').split('_')
  var order_quantity =  Number(product.find('.item-name .count').text().trim())
  var order_success_logs = product.next().find('.ajaxFecthState .jb-has-succ').text()
  console.log('发现有效的订单', product_name, order_price)

  if (order_success_logs && typeof order_success_logs == "object") {
    order_success_logs.forEach(function(log) {
      if (log) {
        success_logs.push(log.trim())
      }
    });
  }

  if (typeof order_success_logs == "string") {
    success_logs.push(order_success_logs.trim())
  }

  var new_price = await getNowPrice(order_sku[2], setting.is_plus)
  console.log(product_name + '进行价格对比:', new_price, ' Vs ', order_price)
  order_info.goods.push({
    sku: order_sku[2],
    name: product_name,
    order_price: order_price,
    new_price: new_price,
    success_log: success_logs,
    quantity: order_quantity
  })
  var applyBtn = $(product).find('.item-opt .apply')
  var applyId = applyBtn.attr('id')
  var lastApplyPrice = localStorage.getItem('jjb_order_' + applyId)
  if (new_price > 0 && new_price < order_price && (order_price - new_price) > setting.pro_min ) {
    if (lastApplyPrice && Number(lastApplyPrice) <= new_price) {
      console.log('Pass: ' + product_name + '当前价格上次已经申请过了:', new_price, ' Vs ', lastApplyPrice)
      return 
    }
    // 申请
    applyBtn.trigger( "click" )

    localStorage.setItem('jjb_order_' + applyId, new_price)
    chrome.runtime.sendMessage({
      text: "notice",
      batch: 'jiabao',
      title: '报告老板，发现价格保护机会！',
      product_name: product_name,
      content: '购买价：'+ order_price + ' 现价：' + new_price + '，已经自动提交价保申请，正在等待申请结果。'
    }, function(response) {
      console.log("Response: ", response);
    });
    // 等待15秒后检查申请结果
    var resultId = "applyResult_" + applyId.substr(8)
    setTimeout(function () {
      observeDOM(document.getElementById(resultId), function () {
        let resultText = $("#" + resultId).text()
        if (resultText && resultText.indexOf("预计") < 0) {
          chrome.runtime.sendMessage({
            batch: 'jiabao',
            text: "notice",
            title: "报告老板，价保申请有结果了",
            product_name: product_name,
            content: "价保结果：" + resultText
          }, function (response) {
            console.log("Response: ", response);
          });
        }
      });
    }, 5000)
  }
}

async function dealOrder(order, orders, setting) {
  var dealgoods = []
  var order_time = new Date(order.find('.title span').last().text().trim().split('：')[1])
  var order_id = order.find('.title .order-code').text().trim().split('：')[1]
  console.log('订单:', order_id, order_time, setting)

  var proTime = 15 * 24 * 3600 * 1000
  if (setting.pro_days == '7') {
    proTime = 7 * 24 * 3600 * 1000
  }
  if (setting.pro_days == '30') {
    proTime = 30 * 24 * 3600 * 1000
  }

  // 如果订单时间在设置的价保监控范围以内
  if (new Date().getTime() - order_time.getTime() < proTime) {
    var order_info = {
      time: order_time,
      goods: []
    }

    order.find('.product-item').each(function() {
      dealgoods.push(dealProduct($(this), order_info, setting))
    })

    await Promise.all(dealgoods)
    console.log('order_info', order_info)
    orders.push(order_info)
  }
}

async function getAllOrders(setting) {
  console.log('京价保开始自动检查订单')
  let orders = []
  let dealorders = []
  $( "#dataList0 li" ).each(function() {
    dealorders.push(dealOrder($(this), orders, setting))
  });
  await Promise.all(dealorders)
  chrome.runtime.sendMessage({
    text: "orders",
    content: JSON.stringify(orders)
  }, function(response) {
    console.log("Response: ", response);
  });
  localStorage.setItem('jjb_last_check', new Date().getTime());
}

var auto_login_html = "<p class='auto_login'><span class='jjb-login'>让京价保记住密码并自动登录</span></p>";


function mockClick(element) {
  // DOM 2 Events
  var dispatchMouseEvent = function (target, var_args) {
    var e = document.createEvent("MouseEvents");
    // If you need clientX, clientY, etc., you can call
    // initMouseEvent instead of initEvent
    e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
    target.dispatchEvent(e);
  };
  dispatchMouseEvent(element, 'mouseover', true, true);
  dispatchMouseEvent(element, 'mousedown', true, true);
  dispatchMouseEvent(element, 'click', true, true);
  dispatchMouseEvent(element, 'mouseup', true, true);
}


function CheckBaitiaoCouponDom() {
  var time = 0;
  $(".coupon-list .js_coupon").each(function() {
    console.log('开始领券')
    var that = $(this)
    if ($(this).find('.js_getCoupon').text() == '点击领取' ) {
      var coupon_name = that.find('.coupon_lineclamp').text()
      var coupon_price = that.find('.sc-money').text().trim() + ' (' + that.find('.sc-message').text().trim() + ')'
      setTimeout( function(){
        $(that).find('.js_getCoupon').trigger( "tap" )
        $(that).find('.js_getCoupon').trigger( "click" )
        setTimeout(function () {
          if ($(that).find('.coupon_receive').size() > 0) {
            chrome.runtime.sendMessage({
              text: "coupon",
              title: "京价保自动领到一张白条优惠券",
              content: JSON.stringify({
                batch: 'baitiao',
                price: coupon_price,
                name: coupon_name
              })
            }, function (response) {
              console.log("Response: ", response);
            });
          }
        }, 500)
      }, time)
      time += 5000;
    }
  })
}

// 保存账号
function saveAccount(account) {
  chrome.runtime.sendMessage({
    text: "saveAccount",
    content: JSON.stringify(account)
  }, function (response) {
    console.log('saveAccount response', response)
  });
}

// 获取账号信息
function getAccount(type) {
  chrome.runtime.sendMessage({
    text: "getAccount",
  }, function (response) {
    if (response) {
      let account = response
      if (account && account.username && account.password) {
        autoLogin(account, type)
      } else {
        chrome.runtime.sendMessage({
          text: "notLogin",
        }, function (response) {
          console.log("Response: ", response);
        });
      }
    }
  });
}
// 获取设置
function getSetting(name, cb) {
  chrome.runtime.sendMessage({
    text: "getSetting",
    content: name
  }, function (response) {
    cb(response)
    console.log("getSetting Response: ", response);
  });
}

// 登录失败
function dealLoginFailed(errormsg) {
  chrome.runtime.sendMessage({
    text: "loginFailed",
    content: errormsg
  }, function (response) {
    console.log("loginFailed Response: ", response);
  });
}


// 自动登录
function autoLogin(account, type) {
  console.log('京价保正在为您自动登录', type)
  if (type == 'pc') {
    $(".login-tab-r a").trigger("click")
    $("#loginname").val(account.username)
    $("#nloginpwd").val(account.password)
    if (account.loginFailed) {
      $(".tips-inner .cont-wrapper p").text('由于在' + account.loginFailed.displayTime + '自动登录失败（原因：' + account.loginFailed.errormsg + '），2小时内不再自动登录').css('color', '#f73535').css('font-size', '14px')
      $(".login-wrap .tips-wrapper").hide()
      $("#content .tips-wrapper").css('background', '#fff97a')
      chrome.runtime.sendMessage({
        text: "highlightTab",
        content: JSON.stringify({
          url: window.location.href,
          pinned: "true"
        })
      }, function (response) {
        console.log("Response: ", response);
      });  
    } else {
      setTimeout(function () {
        mockClick($(".login-btn a")[0])
      }, 500)
      // 监控登录失败
      setTimeout(function () {
        let errormsg = $('.login-box .msg-error').text()
        if (errormsg == '请输入验证码') {
          dealLoginFailed(errormsg)
        }
      }, 1500)
    }

  } else {
    $("#username").val(account.username)
    $("#password").val(account.password)
    $("#loginBtn").addClass("btn-active")
    setTimeout(function () {
      if ($("#username").val() && $("#password").val()) {
        mockClick($("#loginBtn")[0])
      }
    }, 500)
  }
}


// 转存老的账号
function resaveAccount() {
  var jjb_username = localStorage.getItem('jjb_username')
  var jjb_password = localStorage.getItem('jjb_password')
  if (jjb_username && jjb_password) {
    localStorage.removeItem('jjb_username')
    localStorage.removeItem('jjb_password')
    saveAccount({
      username: jjb_username,
      password: jjb_password
    })
  }
}

// 自动评论
function autoReview(setting) {
  if (setting == 'checked') {
    if ($(".commstar-group").length > 0) {
      $('.commstar .star5').trigger("tap")
      $('.commstar .star5').trigger("click")
    }
    if ($(".f-goods").length > 0) {
      $('.fop-main .star5').trigger("tap")
      $('.fop-main .star5').trigger("click")
      $('.f-item .f-textarea textarea').val('感觉不错，价格也很公道，值的购买！')
    };
    setTimeout(function () {
      $('.btn-submit').trigger("tap")
      $('.btn-submit').trigger("click")
    }, 500)
  }
}


// 自动浏览店铺（7：店铺签到）
function autoVisitShop(setting) {
  if (setting != 'never') {
    console.log('开始自动访问店铺领京豆')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "7"
    })
    var time = 0;
    $(".bean-shop-list li").each(function () {
      var that = $(this)
      if ($(that).find('.s-btn').text() == '去签到') {
        setTimeout(function () {
          chrome.runtime.sendMessage({
            text: "create_tab",
            batch: "bean",
            content: JSON.stringify({
              index: 0,
              url: $(that).find('.s-btn').attr('href'),
              active: "false",
              pinned: "true"
            })
          }, function (response) {
            console.log("Response: ", response);
          });
        }, time)
        time += 30000;
      }
    })
  }
}

// 移动页领取优惠券（2：领精选券）
function pickupCoupon(setting) {
  if (setting != 'never') {
    let time = 0;
    console.log('开始领取精选券')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "2"
    })
    $(".coupon_sec_body a.coupon_default").each(function () {
      let that = $(this)
      let coupon_name = that.find('.coupon_default_name').text()
      let coupon_id = that.find("input[class=id]").val()
      let coupon_price = that.find('.coupon_default_price').text()
      if (that.find('.coupon_default_des').text()) {
        coupon_price = that.find('.coupon_default_des').text()
      }
      if ($(this).find('.coupon_default_status_icon').text() == '立即领取') {
        setTimeout(function () {
          $(that).find('.coupon_default_status_icon').trigger("click")
          setTimeout(function () {
            if ($(that).find('.coupon_default_status_icon').text() == '立即使用') {
              chrome.runtime.sendMessage({
                text: "coupon",
                title: "京价保自动领到一张新的优惠券",
                content: JSON.stringify({
                  id: coupon_id,
                  price: coupon_price,
                  name: coupon_name
                })
              }, function (response) {
                console.log("Response: ", response);
              });
            }
          }, 500)
        }, time)
        time += 5000;
      }
    })
  }
}


function markCheckinStatus(type, value, cb) {
  chrome.runtime.sendMessage({
    text: "checkin_status",
    batch: type,
    value: value,
    status: "signed"
  })
  if (cb) { cb() }
}


function CheckDom() {
  // 转存账号
  resaveAccount()
  
  // 是否登录
  if ( $(".us-line .us-name") && $(".us-line .us-name").length > 0 ) {
    console.log('已经登录')
    chrome.runtime.sendMessage({
      text: "isLogin",
    }, function(response) {
      console.log("Response: ", response);
    });
  };

  // 是否是PLUS会员
  if ($(".cw-user .fm-icon").size() > 0 && $(".cw-user .fm-icon").text() == '正式会员') {
    chrome.runtime.sendMessage({
      text: "isPlus",
    }, function (response) {
      console.log("Response: ", response);
    });
  }

  // 账号登录
  // 手机版登录页
  if ( $(".loginPage").length > 0 ) {
    getAccount('m')
    $(auto_login_html).insertAfter( ".loginPage .notice" )
    $('.loginPage').on('click', '.jjb-login', function (e) {
      window.event ? window.event.returnValue = false : e.preventDefault();
      var username = $("#username").val()
      var password = $("#password").val()
      // 保存账号和密码
      if (username && password) {
        saveAccount({
          username: username,
          password: password
        })
      }
      mockClick($("#loginBtn")[0])
    })
  };
  // PC版登录页
  if ($(".login-tab-r ").length > 0) {
    getAccount('pc')
    $(auto_login_html).insertAfter("#formlogin")
    $('.login-box').on('click', '.jjb-login', function (e) {
      window.event ? window.event.returnValue = false : e.preventDefault();
      var username = $("#loginname").val()
      var password = $("#nloginpwd").val()
      // 保存账号和密码
      if (username && password) {
        saveAccount({
          username: username,
          password: password
        })
      }
      mockClick($(".login-btn a")[0])
    })
  };

  // 移除遮罩
  if ($("#pcprompt-viewpc").size() > 0) {
    mockClick($("#pcprompt-viewpc")[0])
  }


  // 会员页签到 (5:京东会员签到)
  if ( $(".sign-pop").length) {
    console.log('签到领京豆（vip）')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "5"
    })
    if (!$(".sign-pop").hasClass('signed')) {
      $(".sign-pop").trigger( "tap" )
      $(".sign-pop").trigger( "click" )
      setTimeout(function () {
        if ($(".sign-pop").hasClass('signed')) {
          let value = $(".modal-sign-in .jdnum span").text()
          markCheckinStatus('vip', value + '京豆', () => {
            chrome.runtime.sendMessage({
              text: "checkin_notice",
              batch: "bean",
              value: value,
              unit: 'bean',
              title: "京价保自动为您签到领京豆",
              content: "恭喜您获得了" + value + '个京豆奖励'
            }, function(response) {
              console.log("Response: ", response);
            })
          })
        }
      }, 2000)
    } else {
      markCheckinStatus('vip')
    }
  };

  // 双签奖励 (12:双签奖励)
  if ($("#receiveAward .link-gift").length) {
    console.log('双签奖励（double_check）')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "12"
    })
    if ($("#JGiftDialog .gift-dialog-btn").text() == '立即领取') {
      $("#JGiftDialog .gift-dialog-btn").trigger("tap")
      $("#JGiftDialog .gift-dialog-btn").trigger("click")
      setTimeout(function () {
        if ($("#awardInfo .cnt-hd").text() == '你已领取双签礼包') {
          let value = $("#awardInfo .item-desc-1").text().replace(/[^0-9\.-]+/g, "")
          markCheckinStatus('double_check', value + '京豆', () => {
            chrome.runtime.sendMessage({
              text: "checkin_notice",
              batch: "bean",
              value: value,
              unit: 'bean',
              title: "京价保自动为您领取双签",
              content: "恭喜您获得了" + value + '个京豆奖励'
            }, function (response) {
              console.log("Response: ", response);
            })
          })
        }
      }, 2000)
    } else {
      markCheckinStatus('double_check')
    }
  };


  // 京豆签到 (11:京豆签到)
  if (window.location.host == 'bean.m.jd.com') {
    console.log('京豆签到（bean）')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "11"
    })
    var beanbtn = null
    $("#m_common_content .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view span").each(function () {
      let targetEle = $(this)
      if (targetEle.text() == '签到领京豆') {
        mockClick(targetEle[0])
        setTimeout(() => {
          if ($("img[src='https://m.360buyimg.com/mobilecms/jfs/t8899/48/1832651162/9481/95d84514/59bfb1c5N176f3f20.png']")[0]) {
            mockClick($("img[src='https://m.360buyimg.com/mobilecms/jfs/t8899/48/1832651162/9481/95d84514/59bfb1c5N176f3f20.png']")[0])
            markCheckinStatus('bean', null, () => {
              chrome.runtime.sendMessage({
                text: "checkin_notice",
                batch: "bean",
                unit: 'bean',
                title: "京价保自动为您签到领京豆",
                content: "恭喜您获得了一两个京豆奖励"
              }, function (response) {
                console.log("Response: ", response);
              })
            })
          }
        }, 500);
      }
    })
  };

  if ( $(".signin-desc em").text() ) {
    let value = $(".signin-desc em").text()
    markCheckinStatus('vip', value + '京豆', () => {
      chrome.runtime.sendMessage({
        text: "checkin_notice",
        batch: "bean",
        value: value,
        unit: 'bean',
        title: "京价保自动为您签到领京豆",
        content: "恭喜您获得了" + value + '个京豆奖励'
      }, function (response) {
        console.log("Response: ", response);
      })
    })
  }

  // 京东金融慧赚钱签到 (6:金融钢镚签到)
  if ($(".assets-wrap .gangbeng").size() > 0) {
    console.log('签到领京豆（jr-qyy）')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "6"
    })
    if ($(".gangbeng .btn").text() == "领钢镚") {
      $(".gangbeng .btn").trigger( "tap" )
      $(".gangbeng .btn").trigger( "click" )
      // 监控结果
      setTimeout(function () {
        if ($(".gangbeng .btn").text() == "已领取" || ($(".am-modal-body .title").text() && $(".am-modal-body .title").text().indexOf("获得") > -1) ) {
          let re = /^[^-0-9.]+([0-9.]+)[^0-9.]+$/
          let rawValue = $(".am-modal-body .title").text()
          let value = re.exec(rawValue)
          markCheckinStatus('jr-qyy', rawValue, () => {
            chrome.runtime.sendMessage({
              text: "checkin_notice",
              title: "京价保自动为您签到抢钢镚",
              value: value[1],
              unit: 'coin',
              content: "恭喜您领到了" + value[1] + "个钢镚"
            }, function(response) {
              console.log("Response: ", response);
            })
          })
        }
      }, 1000)
    } else {
      markCheckinStatus('jr-qyy')
    }
  };

  // 京东支付签到
  if ( $(".signIn .signInBtn").size() > 0) {
    console.log('签到领京豆（jdpay)')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "8"
    })
    if (!$(".signInBtn").hasClass('clicked')) {
      $(".signInBtn").trigger("tap")
      $(".signInBtn").trigger("click")
      setTimeout(function () {
        if ($(".signInBtn").hasClass('clicked')) {
          let value = $("#rewardTotal").text()
          markCheckinStatus('jdpay', $("#rewardTotal").text() + '个钢镚', () => {
            chrome.runtime.sendMessage({
              text: "checkin_notice",
              unit: 'coin',
              value: value,
              title: "京价保自动为您签到京东支付",
              content: "恭喜您领到了" + value + "个钢镚"
            }, function (response) {
              console.log("Response: ", response);
            })
          })
        }
      }, 1000)
    } else {
      markCheckinStatus('jdpay', $("#rewardTotal").text() + '个钢镚')
    }
  };

  // 京东金融首页签到（9： 金融会员签到）
  if ($(".ban-center .m-qian").size() > 0) {
    console.log('签到领京豆（jr-index)')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "9"
    })
    if ($(".ban-center .m-qian").length > 0 && $(".ban-center .m-qian .qian-text").text() == '签到') {
      $(".ban-center .m-qian .qian-text").trigger("tap")
      $(".ban-center .m-qian .qian-text").trigger("click")
      // 监控结果
      setTimeout(function () {
        if ($(".ban-center .m-qian .qian-text").text() == '已签到' || $("#signFlag").text() == '签到成功' ) {
          let re = /^[^-0-9.]+([0-9.]+)[^0-9.]+$/
          let rawValue = $("#getRewardText").text()
          let value = re.exec(rawValue)
          markCheckinStatus('jr-index', rawValue, () => {
            chrome.runtime.sendMessage({
              text: "checkin_notice",
              title: "京价保自动为您签到京东金融",
              value: value[1],
              unit: 'coin',
              content: "恭喜您！领到了" + value[1] + "个钢镚"
            }, function (response) {
              console.log("Response: ", response);
            })
          })
        }
      }, 1000)
    } else {
      if ($(".ban-center .m-qian .qian-text").text() == '已签到') {
        markCheckinStatus('jr-index')
      }
    }
  };

  // 领取 PLUS 券（3： PLUS券）
  if ( $(".coupon-swiper .coupon-item").length > 0 ) {
    var time = 0;
    console.log('开始领取 PLUS 券')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "3"
    })
    $(".coupon-swiper .coupon-item").each(function() {
      var that = $(this)
      if ($(this).find('.get-btn').text() == '立即领取' ) {
        var coupon_name = that.find('.pin-lmt').text()
        var coupon_price = that.find('.cp-val').text() + '元 (' + that.find('.cp-lmt').text() + ')'
        setTimeout( function(){
          $(that).find('.get-btn').trigger( "click" )
          chrome.runtime.sendMessage({
            text: "coupon",
            title: "京价保自动领到一张 PLUS 优惠券",
            content: JSON.stringify({
              id: '',
              batch: '',
              price: coupon_price,
              name: coupon_name
            })
          }, function(response) {
            console.log("Response: ", response);
          });
        }, time)
        time += 5000;
      }
    })
  };

  // 单独的领券页面
  if ( $("#js_detail .coupon_get") && $(".coupon_get .js_getCoupon").length > 0) {
    console.log('单独的领券页面', $("#js_detail .coupon_get").find('.js_getCoupon'))
    $("#js_detail .coupon_get").find('.js_getCoupon').trigger( "tap" )
    $("#js_detail .coupon_get").find('.js_getCoupon').trigger( "click" )
  }

  // 领取白条券（4：领白条券）
  if ( $(".coupon-list .js_coupon") && $(".coupon-list .js_coupon").length > 0 ) {
    console.log('开始领取白条券')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "4"
    })
    var time = 0;
    $("#js_categories li").each(function() {
      var that = $(this)
      setTimeout( function(){
        $(that).trigger( "tap" )
        console.log('开始领取', $(that).text())
        setTimeout( CheckBaitiaoCouponDom(), 1000)
      }, time)
      time += 30000;
    })
  };


  // 自动访问店铺领京豆
  if ( $(".bean-shop-list").length > 0 ) {
    getSetting('job7_frequency', autoVisitShop)
  };


  if ($(".jShopHeaderArea").length > 0 && $(".jShopHeaderArea .jSign .unsigned").length > 0) {
    setTimeout( function(){
      console.log('店铺自动签到')
      $('.jSign .unsigned').trigger( "click" )
      $('.jSign .unsigned').trigger( "tap" )
    }, 5000)
  }

  if ($(".jShopHeaderArea").length > 0 && $(".jShopHeaderArea .jSign .signed").length > 0) {
    chrome.runtime.sendMessage({
      text: "remove_tab",
      content: JSON.stringify({
        url: window.location.href,
        pinned: "true"
      })
    }, function(response) {
      console.log("Response: ", response);
    });  
  }

  // 领取精选券
  if ($(".coupon_sec_body").length > 0) {
    getSetting('job2_frequency', pickupCoupon)
  };

  // 自动领取京东金融铂金会员京东支付返利（10：金融铂金会员支付返利）
  if ($("#react-root .react-root .react-view").length > 0 && window.location.host == 'm.jr.jd.com') {
    console.log('京东金融铂金会员返利')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "10"
    })
    // 切换到支付返现视图
    $("#react-root .react-root .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view span").each(function () {
      let targetEle = $(this)
      if (targetEle.text() == '支付返现') {
        mockClick(targetEle[0])
        setTimeout(() => {
          getPlatinumRebate()
        }, 500);
      }
    })
    // 领取返利
    function getPlatinumRebate() {
      let time = 0;
      $("#react-root .react-root .react-view img").each(function () {
        let that = $(this)
        if (that.attr("src") && that.width() > 40) {
          setTimeout(function () {
            mockClick(that[0])
            let amount = that.parent().parent().prev().find('span').last().text()
            if (amount && amount > 0.1) {
              let content = "应该是领到了" + amount + '元的返利。'
              if (amount > 5) {
                content += "求打赏"
              }
              chrome.runtime.sendMessage({
                text: "notice",
                batch: "rebate",
                value: amount,
                unit: 'cash',
                title: "京价保自动为您领取铂金会员支付返利",
                content: content
              }, function (response) {
                console.log("Response: ", response);
              });
            }
          }, time)
          time += 5000;
        }
      })
    }
  }

  // 自营筛选 （待实现）

  // if ($("#J_feature").size() > 0) {
  //   let jd_self = `<li><a data-field="wtype" id="filterSelf" data-val="0" href="javascript:;" onclick="searchlog(0,0,0,43)"><i></i>只看自营</a></li>`
  //   $("#J_feature ul").prepend(jd_self);

  //   $("#filterSelf").on('click', () => {
  //     $("#J_goodsList .gl-item").each(function () {
  //       if ($(this).find('i.goods-icons').text() == '自营') {
  //         $(this).show()
  //       } else {
  //         $(this).hide()
  //       }
  //     })
  //   })
  // }
  

  // 自动评价 
  if ($(".mycomment-form").length > 0) {
    getSetting('auto_review', autoReview)
  };

  // 价格保护（1）
  if ($(".bd-product-list ").size() > 0 && $("#jb-product").text() == "价保申请") {
    // try getListData
    var objDiv = document.getElementById("mescroll0");
    objDiv.scrollTop = (objDiv.scrollHeight * 2);

    $('body').append('<div class="weui-mask weui-mask--visible"><h1>已经开始自动检查价格变化，您可以关闭窗口了</h1><span class="close">x</span></div>')
    $('span.close').on('click', () => {
      $('.weui-mask').remove()
    })
    // 如果成功进入价保页面，则代表已经登录
    chrome.runtime.sendMessage({
      text: "isLogin",
    }, function (response) {
      console.log("Response: ", response);
    });

    if ($( ".bd-product-list li").length > 0) {
      console.log('成功获取价格保护商品列表', new Date())
      chrome.runtime.sendMessage({
        text: "run_status",
        jobId: "1"
      })
      chrome.runtime.sendMessage({
        text: "getPriceProtectionSetting"
      }, function (response) {
        setTimeout(function () {
          getAllOrders(response)
        }, 5000)
        console.log("getPriceProtectionSetting Response: ", response);
      });
    } else {
      console.log('好尴尬，最近没有买东西..', new Date())
    }
  };


  // 手机验证码
  if ($('.tip-box').size() > 0 && $(".tip-box").text().indexOf("账户存在风险") > -1) {
    chrome.runtime.sendMessage({
      text: "highlightTab",
      content: JSON.stringify({
        url: window.location.href,
        pinned: "true"
      })
    }, function(response) {
      console.log("Response: ", response);
    });  
  }
}

$( document ).ready(function() {
  console.log('京价保注入页面成功');
  $('script').filter(function () { return this.src.length > 0 }).each(function () { this.src = this.src.replace("http://", "https://") })
  setTimeout( function(){
    console.log('京价保开始执行任务');
    CheckDom()
  }, 2000)
});