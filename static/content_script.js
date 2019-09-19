// 京价保
var observeDOM = (function () {
  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver
  return function (obj, callback) {
    // define a new observer
    var obs = new MutationObserver(function (mutations, observer) {
      if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {
        callback(observer);
      }
    });
    // have the observer observe foo for changes in children
    obs.observe(obj, { childList: true, subtree: true });
  };
})();

function priceFormatter(price) {
  return Number(Number(price).toFixed(2))
}

function injectScript(file, node) {
  var th = document.getElementsByTagName(node)[0];
  var s = document.createElement('script');
  s.setAttribute('type', 'text/javascript');
  s.setAttribute('charset', "UTF-8");
  s.setAttribute('src', file);
  th.appendChild(s);
}

function injectScriptCode(code, node) {
  var th = document.getElementsByTagName(node)[0];
  var script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('language', 'JavaScript');
  script.textContent = code;
  th.appendChild(script);
}

injectScriptCode(`
  if (typeof hrl != 'undefined' && typeof host != 'undefined') {
    document.write('<a style="display:none" href="' + hrl + '" id="exe"></a>');
    document.getElementById('exe').click()
  }
`, 'body')

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

function mockClick(element) {
  var dispatchMouseEvent = function (target, var_args) {
    var e = document.createEvent("MouseEvents");
    e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
    target.dispatchEvent(e);
  };
  if (element) {
    dispatchMouseEvent(element, 'mouseover', true, true);
    dispatchMouseEvent(element, 'mousedown', true, true);
    dispatchMouseEvent(element, 'click', true, true);
    dispatchMouseEvent(element, 'mouseup', true, true);
  }
}

/* eventType is 'touchstart', 'touchmove', 'touchend'... */
function sendTouchEvent(x, y, element, eventType) {
  const touchObj = new Touch({
    identifier: Date.now(),
    target: element,
    clientX: x,
    clientY: y,
    radiusX: 2.5,
    radiusY: 2.5,
    rotationAngle: 10,
    force: 0.5,
  });

  if ('TouchEvent' in window && TouchEvent.length > 0) {
    const touchEvent = new TouchEvent(eventType, {
      cancelable: true,
      bubbles: true,
      touches: [touchObj],
      targetTouches: [],
      changedTouches: [touchObj],
      shiftKey: true,
    });
    element.dispatchEvent(touchEvent);
  } else {
    console.log('no TouchEvent')
  }

}

// 申请价保
function apply(applyBtn, priceInfo, setting) {
  let order_price = applyBtn.attr('order_price')
  let product_name = applyBtn.attr('product_name')
  let applyId = applyBtn.attr('id')
  // 是否暂停价保
  if (!applyId || setting.suspendedApplyIds.indexOf(applyId) > -1) {
    return console.log('价保暂停', applyId)
  }
  // 获取上次申请价保的价格
  getSetting('last_apply_price' + applyId, (lastApply) => {
    let lastApplyPrice = lastApply ? lastApply.price : localStorage.getItem('jjb_order_' + applyId)
    if (priceInfo.price > 0 && priceInfo.price < order_price && (order_price - priceInfo.price) > setting.pro_min ) {
      if (lastApplyPrice && Number(lastApplyPrice) - priceInfo.price <= setting.pro_min ) {
        console.log('Pass: ' + product_name + '当前价格上次已经申请过了:', priceInfo.price, ' Vs ', lastApplyPrice)
        return
      }
      // 如果禁止了自动申请
      if (setting.prompt_only) {
        localStorage.setItem('jjb_order_' + applyId, priceInfo.price)
        chrome.runtime.sendMessage({
          action: "setVariable",
          key: 'last_apply_price' + applyId,
          value: {
            price: priceInfo.price,
            submitted: false,
            time: new Date()
          }
        }, function (response) {
          console.log("Response: ", response);
        });
        chrome.runtime.sendMessage({
          text: "notice",
          batch: 'jiabao',
          title: '报告老板，发现价格保护机会！',
          product_name: product_name,
          content: '购买价：'+ order_price + ' 现价：' + priceInfo.price + '，请手动提交价保申请。'
        }, function(response) {
          console.log("Response: ", response);
        });
      } else {
        // 申请
        simulateClick(applyBtn, true)
        setTimeout(() => {
          let resultId = "applyResult_" + applyId.substr(8)
          if (applyBtn.hasClass("disable-apply") || $("#" + resultId).is(":visible")) {
            localStorage.setItem('jjb_order_' + applyId, priceInfo.price)
            chrome.runtime.sendMessage({
              action: "setVariable",
              key: 'last_apply_price' + applyId,
              value: {
                price: priceInfo.price,
                submitted: true,
                time: new Date()
              }
            }, function (response) {
              console.log("Response: ", response);
            });
            chrome.runtime.sendMessage({
              text: "notice",
              batch: 'jiabao',
              title: '报告老板，发现价格保护机会！',
              product_name: product_name,
              content: '购买价：'+ order_price + ' 现价：' + priceInfo.price + '，已经自动提交价保申请，正在等待申请结果。'
            }, function(response) {
              console.log("Response: ", response);
            });
          }

          observeDOM(document.getElementById(resultId), function (observer) {
            let resultText = $("#" + resultId).text()
            if (resultText && resultText.indexOf("预计") < 0 && resultText.indexOf("繁忙") < 0) {
              if (observer) observer.disconnect();
              chrome.runtime.sendMessage({
                batch: 'jiabao',
                action: "notice",
                title: "报告老板，价保申请有结果了",
                product_name: product_name,
                content: "价保结果：" + resultText
              }, function (response) {
                console.log("Response: ", response);
              });
            }
          });
        }, 1500);
      }
    }
  });
}


// 提取优惠信息
function seekPromInfo(platform) {
  let urlInfo, sku
  let promotions = []
  if (platform == 'pc') {
    urlInfo = /(https|http):\/\/item.jd.com\/([0-9]*).html/g.exec(window.location.href);
    sku = urlInfo[2]

    $(".prom-gift-list .prom-gift-item").each(function (index, giftDom) {
      let number, img, description, link
      number = $(giftDom).find(".gift-number").text()
      if ($(giftDom).find("a")) {
        link = $(giftDom).find("a").attr("href")
        img = $(giftDom).find(".gift-img").attr("src")
        description = $(giftDom).find("a").attr("title")
      }
      promotions.push({
        typeName: "赠品",
        number,
        img,
        description,
        link
      })
    })
    $(".p-promotions .prom-item").each(function (index, promDom) {
      let typeName, code, description, link
      typeName = $(promDom).find(".hl_red_bg").text()
      code = $(promDom).data("code")
      description = $(promDom).find(".hl_red").text()
      if ($(promDom).find("a")) {
        link = $(promDom).find("a").attr("href")
      }
      promotions.push({
        typeName,
        code,
        description,
        link
      })
    })
  } else {
    urlInfo = /(https|http):\/\/(item.m.jd.com|mitem.jd.hk)\/product\/([0-9]*).html/g.exec(window.location.href);
    sku = urlInfo[3]
    $(".mod_discount .detail_prom .prom_item").each(function (index, promDom) {
      let typeName, code, description, link
      typeName = $(promDom).find(".hl_red_bg").text()
      code = $(promDom).find(".de_tag").data("code")
      description = $(promDom).find(".de_span").text()
      if ($(promDom).find("a")) {
        link = $(promDom).find("a").attr("href")
      }
      promotions.push({
        typeName,
        code,
        description,
        link
      })
    })
  }
  console.log('find promotions', platform, promotions)
  // 通知促销
  chrome.runtime.sendMessage({
    action: 'promotions',
    sku,
    promotions
  }, function (response) {
    console.log("promotions Response: ", response);
  });
}

// 提取价格信息
function seekPriceInfo(platform) {
  let urlInfo, sku, price, normal_price, presale_price, plus_price, pingou_price, spec_price, orgin_price, skuName
  // 顺便获取促销
  seekPromInfo(platform)
  if (platform == 'pc') {
    urlInfo = /(https|http):\/\/item.jd.com\/([0-9]*).html/g.exec(window.location.href);
    skuName = $(".sku-name").text() ? $(".sku-name").text().trim() : null
    sku = urlInfo[2]
    // 需要对预售定金进行区分
    if ($('span.p-price').length > 1) {
      $('span.p-price').each(function (priceDom) {
        if ($(priceDom).hasClass('J-earnest')) {
          earnest_price = $(priceDom).find('.price').text() ? $(priceDom).find('.price').text().replace(/[^0-9\.-]+/g, "") : null
        } else {
          normal_price = $(priceDom).find('.price').text() ? $(priceDom).find('.price').text().replace(/[^0-9\.-]+/g, "") : null
        }
      })
    } else {
      normal_price = ($('span.p-price .price').text() ? $('span.p-price .price').text().replace(/[^0-9\.-]+/g, "") : null) || ($('#jd-price').text() ? $('#jd-price').text().replace(/[^0-9\.-]+/g, "") : null)
    }

    presale_price = $('.J-presale-price').text() ? $('.J-presale-price').text() : null

    plus_price = $('.p-price-plus .price').text() ? $('.p-price-plus .price').text().replace(/[^0-9\.-]+/g, "") : null
    pingou_price = null
    if ($('#pingou-banner-new') && $('#pingou-banner-new').length > 0 && ($('#pingou-banner-new').css('display') !== 'none')) {
      pingou_price = ($(".btn-pingou span").first().text() ? $(".btn-pingou span").first().text().replace(/[^0-9\.-]+/g, "") : null) || normal_price
      normal_price = $("#InitCartUrl span").text() ? $("#InitCartUrl span").text().replace(/[^0-9\.-]+/g, "") : price
    }
    price = normal_price || presale_price
  } else {
    urlInfo = /(https|http):\/\/item.m.jd.com\/product\/([0-9]*).html/g.exec(window.location.href);
    sku = urlInfo[2]
    skuName = $("#itemName").text() ? $("#itemName").text().trim() : null

    normal_price =($('#priceSaleChoice').text() ? $('#priceSaleChoice').text().replace(/[^0-9\.-]+/g, "") : null) || $('#jdPrice').val() || ($('#specJdPrice').text() ? $('#specJdPrice').text().replace(/[^0-9\.-]+/g, "") : null)

    spec_price = ($('#priceSale').text() && $('#priceSale').height() > 0 ? $('#priceSale').text().replace(/[^0-9\.-]+/g, "") : null) || $('#spec_price').text() && $('#spec_price').height() > 0|| ($('#specPrice').text() ? $('#specPrice').text().replace(/[^0-9\.-]+/g, "") : null)

    plus_price = ($('.vip_price #priceSaleChoice1').text() ? $('.vip_price #priceSaleChoice1').text().replace(/[^0-9\.-]+/g, "") : null) || $('#specPlusPrice').text()

    orgin_price = ($("#orginBuyBtn span").text() ? $("#orginBuyBtn span").text().replace(/[^0-9\.-]+/g, "") : null) || $("#ysOriPrice").text() ? $("#ysOriPrice").text().replace(/[^0-9\.-]+/g, "") : null

    price = normal_price || spec_price || orgin_price

    pingou_price = $('#tuanDecoration .price_warp .price').text() ? $('#tuanDecoration .price_warp .price').text().replace(/[^0-9\.-]+/g, "") : null
  }

  let priceInfo = {
    name: skuName,
    sku: sku,
    normal_price: price ? Number(price) : null,
    plus_price: plus_price ? Number(plus_price) : null,
    pingou_price: pingou_price? Number(pingou_price) : null
  }

  console.log(platform, priceInfo)

  // 通知价格
  chrome.runtime.sendMessage({
    action: 'productPrice',
    ...priceInfo
  }, function (response) {
    console.log("productPrice Response: ", response);
  });

  return priceInfo
}

// 查找订单并对比
function findOrderBySkuAndApply(priceInfo, setting) {
  console.log('findOrderBySkuAndApply', priceInfo)
  $( ".applyBtn" ).each(function() {
    let skuId = $(this).attr('sku')
    let applyId = $(this).attr('id')
    if (skuId && skuId == priceInfo.sku) {
      apply($(this), priceInfo, setting)
    }
    if (setting.suspendedApplyIds.indexOf(applyId) > -1) {
      $(this).text("已暂停")
      $(this).addClass("disable-apply")
      $(this).removeAttr("onclick")
      $(this).removeAttr("report-eventid")
      $(this).removeAttr("id")
    }
  });
}

async function dealProduct(product, orderInfo, setting) {
  console.log('dealProduct', product, orderInfo, setting)
  let pro_logs = []
  let product_name = product.find('.p-name a').text() || product.find('.item-name .name').text()
  let orderPriceDom = product.find('.price-count .price').text() ? product.find('.price-count .price') : product.find('.item-opt .price')
  let order_price = Number(orderPriceDom.text().replace(/[^0-9\.-]+/g, ""))

  let applyBtn = product.find('.item-opt .apply').text() ? product.find('.item-opt .apply') : product.find('.btn a')
  let orderId = applyBtn.attr('id') ? applyBtn.attr('id').split('_') : null

  if (!orderId) {
    return console.log('找不到 orderId')
  }

  let orderCountDom = product.find('.price-count .count').text() ? product.find('.price-count .count') : product.find('.item-name .count')
  let order_quantity =  Number(orderCountDom.text().trim().replace(/[^0-9\.-]+/g, ""))

  let order_pro_logs = product.find('.show-detail').text() ? product.find('.show-detail td') : product.next().next().find('.item-jb')

  let product_img = product.find('a img').attr('src') ? product.find('a img').attr('src') : product.find('.img img').attr('src')

  if (order_price < 0.01) {
    return console.log('忽略免费的商品')
  }
  console.log('发现有效的订单：', product_name, " 下单价格：", order_price)
  if (order_pro_logs && order_pro_logs.length > 0) {
    order_pro_logs.each(function() {
      let logElement = $(this)
      let log = logElement.text().trim().replace('查看退款详情','').replace('查看申请记录','').replace('查看详细规则','')
      if (log && log.indexOf("成功") > -1 || logElement.hasClass("jb-has-succ")) {
        pro_logs.push({
          status: "success",
          message: log
        })
      } else {
        pro_logs.push({
          status: "failed",
          message: log
        })
      }
    });
  }
  // 请求价格
  chrome.runtime.sendMessage({
    action: "getProductPrice",
    sku: orderId[2],
    setting: setting
  }, function(response) {
    console.log("getProductPrice Response: ", response);
  });
  let goodInfo = {
    sku: orderId[2],
    name: product_name,
    img: product_img,
    order_price: order_price,
    logs: pro_logs,
    quantity: order_quantity
  }
  chrome.runtime.sendMessage({
    action: "findGood",
    orderId: orderInfo.id,
    good: goodInfo
  }, function(response) {
    console.log("good Response: ", response);
  });

  // 记录订单信息
  applyBtn.addClass('applyBtn')
  applyBtn.attr('sku', orderId[2])
  applyBtn.attr('order_price', order_price)
  applyBtn.attr('product_name', product_name)
}

async function dealOrder(order, setting) {
  console.log('dealOrder', order)

  let order_time = order.find('span.time').text() ? new Date(order.find('span.time').text()) : new Date(order.find('.title span').last().text().trim().split('：')[1])
  let order_id = order.find('span.order').text() ? order.find('span.order').text().replace(/[^0-9\.-]+/g, "") : order.find('.title .order-code').text().trim().split('：')[1]

  console.log('订单:', order_id, order_time, setting)
  let proTime = Date.now() - 60*60*1000*24*Number(setting.pro_days);
  // 如果订单时间在设置的价保监控范围以内
  if (order_time.getTime() > proTime) {
    let orderInfo = {
      id: order_id,
      timestamp: order_time.getTime(),
      goods: []
    }
    chrome.runtime.sendMessage({
      action: "findOrder",
      orderId: order_id,
      order: orderInfo
    }, function(response) {
      console.log("good Response: ", response);
    });
    let productList = order.find('.product-item').length > 0 ? order.find('.product-item') : order.filter( ".co-th" )
    let time = 500
    productList.each(function () {
      let productElement = $(this)
      setTimeout(async () => {
        try {
          await dealProduct(productElement, orderInfo, setting)
        } catch (error) {
          console.error(error)
        }
      }, time);
      time += 2000;
    })
  }
}

async function getAllOrders(mode, setting) {
  console.log('京价保开始自动检查订单', mode)
  // 移动价保
  if ($( "#dataList0 li").length > 0) {
    let time = 0
    $( "#dataList0 li").each(function() {
      let orderElement = $(this)
      setTimeout(async () => {
        try {
          await dealOrder(orderElement, setting)
        } catch (error) {
          console.error(error)
        }
      }, time);
      time += 3000;
    });
  }
  // PC价保
  if ($( "#dataList .tr-th").length > 0) {
    let time = 0
    $( "#dataList .tr-th").each(function() {
      setTimeout(async () => {
        let orderDom = $(this)
        let product = $(this).next()
        orderDom = orderDom.add(product)
        while (product.next().hasClass('co-th')) {
          orderDom = orderDom.add(product.next())
          product = product.next()
        }
        try {
          await dealOrder(orderDom, setting)
        } catch (error) {
          console.error(error)
        }
      }, time);
      time += 500;
    });
  }

  localStorage.setItem('jjb_last_check', new Date().getTime());
}

// 4：领取白条券
function CheckBaitiaoCouponDom(setting) {
  if (setting != 'never') {
    console.log('开始领取白条券')
    chrome.runtime.sendMessage({
      action: "run_status",
      mode: 'm',
      jobId: "4"
    })
    let time = 0;
    $("#react-root .react-root .react-view .react-view .react-view .react-view .react-view .react-view .react-view span").each(function () {
      let targetEle = $(this)
      if (targetEle.text() == '确定') {
        console.log('需要登录')
        simulateClick(targetEle)
      }
      if (targetEle.text() == '立即领取') {
        let couponDetails = targetEle.parent().prev().find('span').toArray()
        var coupon_name = couponDetails[2] ? $(couponDetails[2]).text().trim() : '未知白条券'
        var coupon_price = couponDetails[0] ? $(couponDetails[0]).text().trim(): '？' + (couponDetails[1] ? (' (' + $(couponDetails[1]).text() + ')') : '')

        setTimeout(function () {
          simulateClick(targetEle, true)
          setTimeout(function () {
            if (targetEle.text() == '去查看') {
              chrome.runtime.sendMessage({
                action: "couponReceived",
                type: "coupon",
                title: "京价保自动领到一张白条优惠券",
                content: {
                  batch: 'baitiao',
                  price: coupon_price,
                  name: coupon_name
                }
              }, function (response) {
                console.log("Response: ", response);
              });
            }
          }, 1500)
        }, time)
        time += 15000;
      }
    })
  }
}

// 3：领取 PLUS 券
function getPlusCoupon(task) {
  if (task.frequency != 'never') {
    let time = 0;
    console.log('开始领取 PLUS 券')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "3"
    })
    if ($(".nut-dialog-close")) {
      $(".nut-dialog-close").click()
    }
    $(".list-item-plus").each(function () {
      let that = $(this)
      let getBtn = $(this).find('.btn-txt')
      if (getBtn.text().indexOf("立即领取") > -1) {
        let coupon_name = that.find('.descr').text().trim().replace(/[\r|\n|\\s]/g,"")
        let coupon_price = that.find('.money').text().trim().replace(/[\r|\n|\\s]/g,"") + ' (' + that.find('.rule').text().trim().replace(/[\r|\n|\\s]/g,"") + ')'
        setTimeout(function () {
          getBtn.trigger("click")
          setTimeout(function () {
            if (getBtn.text().indexOf("去使用") > -1 || getBtn.text().indexOf("已领取") > -1) {
              chrome.runtime.sendMessage({
                action: "couponReceived",
                type: "coupon",
                title: "京价保自动领到一张 PLUS 优惠券",
                content: {
                  price: coupon_price,
                  name: coupon_name
                }
              }, function (response) {
                console.log("Response: ", response);
              });
            }
          }, time + 1500)
        }, time)
        time += 5000;
      }
    })
  }
}

// 15：领取全品类券
function getCommonUseCoupon(task) {
  if (task.frequency != 'never') {
    let time = 0;
    console.log('开始领取全品类券')
    weui.toast('京价保运行中', 1000);
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "15"
    })
    $("#quanlist .quan-item").each(function () {
      let that = $(this)
      if (that.find('.q-ops-box .q-opbtns .txt').text() == '立即领取' && that.find('.q-range').text().indexOf("全品类") > -1) {
        let coupon_name = that.find('.q-range').text().trim()
        let coupon_price = that.find('.q-price strong').text().trim() + '元 (' + that.find('.q-limit').text().trim() + ')'
        let targetBtn = $(that).find('.btn-def')
        setTimeout(function () {
          simulateClick(targetBtn, true)
          setTimeout(function () {
            if ($(".tip-title").text() && $(".tip-title").text().indexOf("领取成功") > -1) {
              chrome.runtime.sendMessage({
                action: "couponReceived",
                type: "coupon",
                title: "京价保自动领到一张全品类优惠券",
                content: {
                  price: coupon_price,
                  name: coupon_name
                }
              }, function (response) {
                console.log("Response: ", response);
              });
            }
          }, 1500)
        }, time)
        time += 5000;
      }
    })
  }
}

// 21：领取话费券
function getTelephoneCoupon(task) {
  if (task.frequency != 'never') {
    console.log('开始领取话费券')
    weui.toast('京价保运行中', 1000);
    chrome.runtime.sendMessage({
      action: "run_status",
      jobId: "21"
    })
    if ($("#quanlist .quan-item").length < 0) {
      let time = 0;
      $("#quanlist .quan-item").each(function () {
        let that = $(this)
        if (that.find('.q-ops-box .q-opbtns .txt').text() == '立即领取' && that.find('.q-range').text().indexOf("话费充值券") > -1) {
          let coupon_name = that.find('.q-range').text().trim()
          let uuid = Date.now()
          let coupon_price = that.find('.q-price strong').text().trim() + '元 (' + that.find('.q-limit').text().trim() + ')'
          setTimeout(function () {
            $(that).find('.btn-def').trigger("click")
            setTimeout(function () {
              if ($(".tip-title").text() && $(".tip-title").text().indexOf("领取成功") > -1) {
                chrome.runtime.sendMessage({
                  action: "couponReceived",
                  type: "coupon",
                  uuid: uuid,
                  title: "京价保自动领到一张话费优惠券",
                  content: {
                    price: coupon_price,
                    name: coupon_name
                  }
                }, function (response) {
                  console.log("Response: ", response);
                });
              }
            }, 1500)
          }, time)
          time += 5000;
        }
      })
    }
  }
}

// 通用任务方法
function runCommonTask(task) {
  if (task.frequency != 'never') {
    console.log(`开始${task.title}`)
    weui.toast('京价保运行中', 1000);
    chrome.runtime.sendMessage({
      action: "run_status",
      jobId: task.id
    })

    if (task.selector) {
      let targetElement = $(`${task.selector.target}`)
      console.log('targetElement', targetElement)
      if (targetElement && targetElement.length > 0) {
        simulateClick(targetElement, true)
        if (task.selector.result) {
          let uuid = Date.now()
          observeDOM(document.body, function (observer) {
            let resultElement = $(`${task.selector.result}`)
            if (resultElement && resultElement.text().indexOf(task.selector.successKeyWord) > -1) {
              if (observer) observer.disconnect();
              return chrome.runtime.sendMessage(Object.assign({
                task: task,
              }, task.successMessage, {
                uuid: uuid
              }), function (response) {
                console.log("Response: ", response);
              });
            }
          })
        }
      }
    }
  }
}


// 自动浏览店铺（7：店铺签到）
function autoVisitShop(setting) {
  if (setting != 'never') {
    weui.toast('京价保运行中', 1000);
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

// 店铺签到（7：店铺签到）
function doShopSign(setting) {
  if (setting != 'never') {
    console.log('店铺自动签到')
    if ($(".J_giftClose").length > 0) {
      simulateClick($(".J_giftClose"), true)
    }
    chrome.runtime.sendMessage({ text: "myTab" }, function (result) {
      console.log('tab', result.tab)
      if (result.tab.pinned) {
        if ($(".j-unsigned.j-sign").length > 0 && $(".j-unsigned.j-sign").attr("status") == 'true') {
          simulateClick($('.j-unsigned.j-sign'))
        } else {
          setTimeout(function () {
            simulateClick($('.jSign .unsigned'))
          }, 3000)
        }
      } else {
        console.log('正常访问不执行店铺自动签到')
      }
    });
  }
}

// 移动页领取优惠券（2：领精选券）
function pickupCoupon(setting) {
  if (setting && setting != 'never') {
    let time = 0;
    console.log('开始领取精选券')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "2"
    })
    $(".coupon_sec_body a.coupon_default").each(function () {
      let that = $(this)
      let coupon_name = that.find('.coupon_default_name').text().trim()
      let coupon_id = that.find("input[class=id]").val()
      let coupon_price = that.find('.coupon_default_price').text().trim()
      if (that.find('.coupon_default_des').text()) {
        coupon_price = that.find('.coupon_default_des').text()
      }
      if ($(this).find('.coupon_default_status_icon').text() == '立即领取') {
        setTimeout(function () {
          simulateClick($(that).find('.coupon_default_status_icon'))
          setTimeout(function () {
            if ($(that).find('.coupon_default_status_icon').text() == '立即使用') {
              chrome.runtime.sendMessage({
                action: "couponReceived",
                type: "coupon",
                title: "京价保自动领到一张新的优惠券",
                content: {
                  id: coupon_id,
                  price: coupon_price,
                  name: coupon_name
                }
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

// 14: 钢镚签到
function getCoin(setting) {
  if (setting != 'never') {
    console.log('钢镚签到')
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "14"
    })
    if ($("#myCanvas").length > 0) {
      let canvas = $("#myCanvas")[0]
      let rect = canvas.getBoundingClientRect()
      let startX = rect.left * (canvas.width / rect.width)

      sendTouchEvent(startX + 10, rect.y + 10, canvas, 'touchstart');
      sendTouchEvent(startX + 70, rect.y + 10, canvas, 'touchmove');
      sendTouchEvent(startX + 70, rect.y + 10, canvas, 'touchend');

      // 监控结果
      observeDOM(document.body, function (observer) {
        let resultElement = $(".package_c .popup_line1")
        if (resultElement && resultElement.text().indexOf("成功") > -1) {
          if (observer) observer.disconnect();
          markCheckinStatus('coin', '～0.02个钢镚', () => {
            chrome.runtime.sendMessage({
              action: "checkin_notice",
              title: "京价保自动为您签到抢钢镚",
              value: 0.02,
              reward: "coin",
              unit: 'coin',
              content: "恭喜您领到了～0.02个钢镚"
            }, function (response) {
              console.log("Response: ", response);
            })
          })
        }
      })
    } else {
      markCheckinStatus('coin')
    }
  }
}

// 1: 价格保护
function priceProtect(task) {
  if (task.frequency != 'never') {
    weui.toast('京价保运行中', 3500);
    let mode = "m"
    // 加载第二页
    if (document.getElementById("mescroll0")) {
      document.getElementById("mescroll0").scrollTop = (document.getElementById("mescroll0").scrollHeight * 2);
      setTimeout(() => {
        document.getElementById("mescroll0").scrollTop = (document.getElementById("mescroll0").scrollHeight * 2);
      }, 3000);
      setTimeout(() => {
        document.getElementById("mescroll0").scrollTop = (document.getElementById("mescroll0").scrollHeight * 2);
      }, 6000);
      setTimeout(() => {
        document.getElementById("mescroll0").scrollTop =0
      }, 6500);
    }
    if (document.getElementById("dataList")) {
      mode = "pc"
      $(window).scrollTop(document.getElementById("dataList").scrollHeight * 2);
      setTimeout(() => {
        $(window).scrollTop(document.getElementById("dataList").scrollHeight * 2);
      }, 3000);
      setTimeout(() => {
        $(window).scrollTop(document.getElementById("dataList").scrollHeight * 2);
      }, 6000);
      setTimeout(() => {
        $(window).scrollTop(0)
      }, 6500);
    }

    if ($(".bd-product-list li").length > 0 || $(".co-th").length > 0) {
      console.log('成功获取价格保护商品列表', new Date())
      chrome.runtime.sendMessage({
        action: "run_status",
        jobId: "1",
        mode: mode
      })
      chrome.runtime.sendMessage({
        text: "getPriceProtectionSetting"
      }, function (response) {
        setTimeout(function () {
          getAllOrders(mode, response)
        }, 8000)
        console.log("getPriceProtectionSetting Response: ", response);
      });
    } else {
      console.log('好尴尬，最近没有买东西..', new Date())
    }
  }
}

// 从京东热卖自动跳转到商品页面
function autoGobuy(setting) {
  if (setting == "checked") {
    weui.toast('京价保自动跳转', 3000);
    simulateClick($(".shop_intro .gobuy a"))
  }
}

// 显示引荐来源
function showUtmSource() {
  const urlParams = new URLSearchParams(window.location.search);
  const utm_source = urlParams.get('utm_source');
  const utmSourceDom = `<div class="utm_source-notice">
    <div class="area_md">
      引荐来源：${utm_source}
      <span id="reportUtmSource" class="report">举报</span>
    </div>
  </div>`
  if (utm_source && utm_source.indexOf('zaoshu.so') < 0) {
    $("body").prepend(utmSourceDom);
  }
  $("#reportUtmSource").on("click", function () {
    weui.dialog({
      title: '举报劫持',
      content: `<iframe id="changelogIframe" frameborder="0" src="https://i.duotai.net/forms/znd7e/pliwjpzx?utm_source=${utm_source}" style="width: 100%;min-height: 385px;"></iframe>`,
      className: 'reportUtmSource',
      buttons: [{
        label: '完成',
        type: 'primary'
      }]
    })
  })
}

// 价格历史
function showPriceChart(disable) {
  if (disable == "checked") {
    console.log('价格走势图已禁用')
  } else {
    injectScript(chrome.extension.getURL('/static/priceChart.js'), 'body');
    window.addEventListener("message", function (event) {
      if (event.source != window)
        return;
      if (event.data.type && (event.data.type == "FROM_PAGE") && (event.data.text == "disablePriceChart")) {
        chrome.runtime.sendMessage({
          action: "setVariable",
          key: "disable_pricechart",
          value: "checked"
        },
        function (response) {
          weui.toast('停用成功', 1000);
          $(".jjbPriceChart").hide()
          console.log("disablePriceChart Response: ", response);
        });
      }
    });
  }
}

// 剁手保护模式
function handProtection(setting, priceInfo) {
  if (setting == "checked") {
    injectScript(chrome.extension.getURL('/static/dialog-polyfill.js'), 'body');
    console.log('剁手保护模式')
    let buyDom = $("#InitCartUrl").length > 0 ? $("#InitCartUrl") : $("#btn-reservation")
    let item = $(".ellipsis").text()
    let price = priceInfo ? (priceInfo.normal_price || priceInfo.plus_price) : ($('.p-price .price').text() ? $('.p-price .price').text().replace(/[^0-9\.-]+/g, "") : null) || ($('#jd-price').text() ? $('#jd-price').text().replace(/[^0-9\.-]+/g, "") : null)
    // 拼接提示
    let dialogMsgDOM = `<dialog id="dialogMsg" class="message">` +
      `<p class="green-text">恭喜你省下了 ` + price + ` ！</p>` +
      `</dialog>`
    // 写入提示消息
    $("body").append(dialogMsgDOM);

    buyDom.removeAttr("clstag")
    buyDom.on("click", function () {
      let count = $('#buy-num').val()
      // 移除此前的提示
      if ($("#dialog").length > 0) {
        $("#dialog").remove()
      }
      // 拼接提示
      let dialogDOM = `<dialog id="dialog">` +
        `<span class="close">x</span>` +
        `<form method="dialog">` +
        `<h3>你真的需要买` + (Number(count) > 1 ? count + '个' : '') + item + `吗?</h3>` +
        `<div class="consideration">` +
        `<p>它是必须的吗？使用的频率足够高吗？</p>` +
        `<p>它真的可以解决你的需求吗？现有方案完全无法接受吗？</p>` +
        `<p>如果收到不合适，它在试用之后退款方便吗？</p>` +
        `<p>现在购买它的价格 ` + price + ` 合适吗？</p>` +
        (Number(count) > 1 ? `<p>有必要现在购买 ` + count + `个吗？</p>` : '') +
        `</div>` +
        `<div class="actions">` +
        `<a href="` + buyDom.attr("href") + `" class="volume-purchase forcedbuy" target="_blank">坚持购买</a>` +
        `<button type="submit" value="no" class="giveUp btn-special2 btn-lg" autofocus>一键省钱</button>` +
        `</div>` +
        `<p class="admonish">若无必要，勿增实体</p>` +
        `</form>` +
        `</dialog>`
      // 写入提示
      $("body").append(dialogDOM);
      var dialog = document.getElementById('dialog');
      var dialogMsg = document.getElementById('dialogMsg');

      dialog.showModal();
      document.querySelector('#dialog .close').onclick = function () {
        dialog.close();
      };

      document.querySelector('#dialog .giveUp').onclick = function () {
        dialog.close();
        setTimeout(() => {
          dialogMsg.showModal();
        }, 50);
        setTimeout(() => {
          dialogMsg.close();
          if (confirm("京价保剁手保护模式准备帮你关闭这个标签页，确认要关闭吗?")) {
            window.close();
          }
        }, 1000);
      };

      return false;
    })
  }
}

// 模拟点击
function simulateClick(dom, mouseEvent) {
  let domNode = dom.get(0)
  if (mouseEvent && domNode) {
    return mockClick(domNode)
  }
  try {
    domNode.trigger("tap")
    domNode.trigger("click")
  } catch (error) {
    try {
      mockClick(domNode)
    } catch (err) {
      console.log('fullback to mockClick', err)
    }
  }
}

function markCheckinStatus(type, value, cb) {
  chrome.runtime.sendMessage({
    action: "markCheckinStatus",
    batch: type,
    value: value,
    status: "signed"
  }, function (response) {
    console.log('markCheckinStatus response', response)
    if (cb && response) { cb() }
  });
}

var auto_login_html = "<p class='auto_login'><span class='jjb-login'>让京价保记住密码并自动登录</span></p>";
var remberme_html = `<label for="remberme" class="remberme J_ping" report-eventid="MLoginRegister_AutoLogin">
  <input type="checkbox" id="remberme" checked>
  <span class="icon icon-rember"></span>
  <span class="txt-remberme">一个月内免登录</span>
  </label>`

// 保存账号
function saveAccount(account) {
  chrome.runtime.sendMessage({
    action: "saveAccount",
    content: account
  }, function (response) {
    console.log('saveAccount response', response)
  });
}

// 获取账号信息
function getAccount(type) {
  console.log("getAccount", type)
  chrome.runtime.sendMessage({
    action: "getAccount",
    type: type
  }, function (response) {
    if (response && response.username && response.password) {
      setTimeout(() => {
        autoLogin(response, type)
      }, 500);
    } else {
      chrome.runtime.sendMessage({
        action: "saveLoginState",
        state: "failed",
        message: "由于账号未保存无法自动登录",
        type: type
      }, function (response) {
        console.log("Response: ", response);
      });
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
    console.log("getSetting Response: ", name, response);
  });
}

// 获取任务设置
function getTask(taskId, cb) {
  chrome.runtime.sendMessage({
    action: "getTask",
    taskId: taskId
  }, function (response) {
    cb(response)
    console.log("getTask Response: ", taskId, response);
  });
}

// 登录失败
function dealLoginFailed(type, errorMsg) {
  let loginFailedDetail = {
    text: "loginFailed",
    type: type,
    notice: true,
    content: errorMsg,
    state: "failed"
  }
  // 如果是单纯的登录页面，则不发送浏览器提醒
  if (window.innerWidth == 420 || window.location.href == "https://passport.jd.com/uc/login") {
    loginFailedDetail.notice = false
    console.log("主动登录页面不发送浏览器消息提醒")
  }
  chrome.runtime.sendMessage(loginFailedDetail, function (response) {
    console.log("loginFailed Response: ", response);
  });
}

function getBase64Image(img) {
  var canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  var dataURL = canvas.toDataURL("image/png");

  return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}

// 自动登录
function autoLogin(account, type) {
  if (account.autoLoginQuota && account.autoLoginQuota < 1) {
    return console.log('当前时段无可用自动登录配额，暂不运行自动登录', type)
  }
  weui.toast('京价保正在自动登录', 1000);
  function login(type) {
    chrome.runtime.sendMessage({
      action: "autoLogin",
      type: type
    }, function (response) {
      console.log("autoLogin Response: ", response);
    });
    setTimeout(() => {
      if (type == 'pc') {
        simulateClick($(".login-btn a"), true)
      } else {
        simulateClick($("#loginBtn"), true)
      }
    }, 1000);
  }

  if (type == 'pc') {
    // 自动补全填入
    $("#loginname").val(account.username)
    $("#nloginpwd").val(account.password)
    // 监控验证结果
    let authcodeDom = document.getElementById("s-authcode")
    if (authcodeDom) {
      observeDOM(authcodeDom, function () {
        let resultText = $("#s-authcode .authcode-btn").text()
        if (resultText && resultText == "验证成功") {
          login('pc')
        }
      });
    }
    // 如果此前已经登录失败
    if (account.loginState && account.loginState.state == 'failed') {
      $(".tips-inner .cont-wrapper p").text('由于在' + account.loginState.displayTime + '自动登录失败（原因：' + account.loginState.message + '），京价保暂停自动登录').css('color', '#f73535').css('font-size', '14px')
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
      // 如果显示需要验证
      if ($("#s-authcode").height() > 0) {
        dealLoginFailed("pc", "需要完成登录验证")
      } else {
        setTimeout(function () {
          login('pc')
        }, 1500)
        // 是否需要滑动验证
        setTimeout(function () {
          let slideMsg = $(".JDJRV-suspend-slide .JDJRV-lable-refresh").text()
          if (slideMsg && slideMsg.length > 0) {
            dealLoginFailed("pc", "需要完成登录验证")
            chrome.runtime.sendMessage({
              text: "highlightTab",
              content: JSON.stringify({
                title: "需要完成滑动拼图以登录",
                url: window.location.href,
                pinned: "true"
              })
            }, function (response) {
              console.log("Response: ", response);
            });
          }
        }, 2500)
        // 监控登录失败
        setTimeout(function () {
          let errorMsg = $('.login-box .msg-error').text()
          if (errorMsg && errorMsg.length > 0) {
            dealLoginFailed("pc", errorMsg)
          }
        }, 3000)
      }
    }
  // 手机登录
  } else {
    $("#username").val(account.username)
    $("#password").val(account.password)
    $("#loginBtn").addClass("btn-active")
    // 自动登录
    function mLogin() {
      setTimeout(function () {
        if ($("#username").val() && $("#password").val()) {
          login('m')
          // 是否需要滑动验证
          observeDOM(document.body, function (observer) {
            let slideMsg = $("#captcha_body .sp_msg").text()
            if (slideMsg && slideMsg.length > 0) {
              if (observer) observer.disconnect();
              dealLoginFailed("m", "需要完成登录验证")
            }
          })
          // 监控失败提示
          setTimeout(function () {
            let errorMsg = $(".notice").text() ? $(".notice").text().trim() : null
            if (errorMsg && errorMsg.length > 0) {
              dealLoginFailed("m", errorMsg)
            }
          }, 2000)
        }
      }, 500)
    }
    // 如果需要验证码
    if ($("#input-code").height() > 0) {
      tryFillCaptcha()
    } else {
      mLogin()
    }
  }
}


function dealWithCaptchaError(isRetry, error) {
  console.log('dealWithCaptchaError', error)
  if (isRetry) {
    dealLoginFailed("m", "需要完成登录验证")
  } else {
    setTimeout(() => {
      tryFillCaptcha(true)
    }, 500);
  }
}

// 识别验证码
function tryFillCaptcha(isRetry) {
  let captcha = $("#username_login .code-box img")[0]
  let base64Image = getBase64Image(captcha)
  $("#username_login").append(`<div class="weui-loadmore">
        <i class="weui-loading"></i>
        <span class="weui-loadmore__tips">${isRetry ? '正在重新识别验证码' : '正在识别验证码'}</span>
    </div>
  `)
  $.ajax({
    method: "POST",
    type: "POST",
    url: "https://jjb.zaoshu.so/captcha",
    data: {
      base64Image: base64Image,
    },
    timeout: 8000,
    dataType: "json",
    success: function(data){
      if (data.result && data.result.length > 3) {
        if ($("#code").is(":focus") || $("#code").val().length > 0 ) {
          $("#username_login").append(`<p class="tips">验证码参考：${data.result}</p>`)
        } else {
          $("#code").val(data.result)
          mLogin()
        }
      } else {
        dealWithCaptchaError(isRetry, data.result)
      }
    },
    error: function(xhr, type){
      dealWithCaptchaError(isRetry, xhr)
    },
    complete: function() {
      $("#username_login .weui-loadmore").hide()
    }
  })
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

// 登录页
function dealLoginPage() {
  // 手机版登录页
  if ( $(".loginPage").length > 0 && $("#username").length > 0) {
    getAccount('m')
    $(auto_login_html).insertAfter( ".loginPage .notice")
    // 隐藏“一键登录”
    $("#loginOneStep").hide()
    // 点击让京价保自动登录
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
      simulateClick($("#loginBtn"), true)
    })
  };
  // PC版登录页
  if ($(".login-tab-r").length > 0 && $("#loginname").length > 0) {
    // 切换到账号登录
    simulateClick($(".login-tab-r a"), true)
    // 获取账号
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
      simulateClick($(".login-btn a"), true)
    })
  };
}
// 签到领京豆（vip）
function vipCheckin(task) {
  if (task.frequency != 'never') {
    console.log('签到领京豆（vip）')
    weui.toast('京价保运行中', 1000);
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "5"
    })
    const signRes = $(".signin-desc").text() || $(".dayGet").text()
    if (signRes && (signRes.indexOf("获得") > -1 || signRes.indexOf("已领取") > -1)) {
      let value = $(".beanNum").text() || signRes.substring(signRes.indexOf("获得")).replace(/[^0-9\.-]+/g, "")
      markCheckinStatus('vip', value + '京豆', () => {
        chrome.runtime.sendMessage({
          action: "checkin_notice",
          batch: "bean",
          value: value,
          unit: 'bean',
          reward: "bean",
          title: "京价保自动为您签到领京豆",
          content: "恭喜您获得了" + value + '个京豆奖励'
        }, function (response) {
          console.log("Response: ", response);
        })
      })
    }
  }
}

// 16: 白条免息红包（baitiao）
function baitiaoLottery(task) {
  if (task.frequency != 'never') {
    console.log('白条签到（baitiao）')
    weui.toast('京价保运行中', 1000);

    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "16"
    })
    setTimeout(() => {
      simulateClick($("#lottery .mark_btn_start"), true)
    }, 1500);
    observeDOM(document.body, function (observer) {
      let resultElement = $('.layer_wrap_header:visible')
      if (resultElement && resultElement.text().indexOf('恭喜') > -1) {
        if (observer) observer.disconnect();
        let result = $('.layer_wrap_content p:visible').first().text()
        markCheckinStatus('baitiao', result, () => {
          chrome.runtime.sendMessage({
            action: "checkin_notice",
            title: "京价保自动为您白条签到",
            content: "恭喜您获得了" + result
          }, function (response) {
            console.log("Response: ", response);
          })
        })
      }
      if ($(".jrm-tips").text() == '您今天已签到,请明天再来') {
        markCheckinStatus('baitiao')
      }
    })
  }
}

// 18: 拍拍二手签到有礼
function dailyPaipai(task) {
	if (task.frequency != 'never') {
		weui.toast('京价保运行中', 1000);
		chrome.runtime.sendMessage({
			text: "run_status",
			jobId: "18"
    });
    setTimeout(() => {
      if ($(".signIn_btnTxt").text() == '签到') {
        simulateClick($(".signIn_btnTxt"))
        observeDOM(document.body, function (observer) {
          let resultElement = $('.signIn_pop .signIn_Title')
          if (resultElement && resultElement.text().indexOf('成功') > -1) {
            if (observer) observer.disconnect();
            let value = $(".signIn_pop .signIn_bean").text() ? $(".signIn_pop .signIn_bean").text().replace(/[^0-9\.-]+/g, "") : null
            if (value && value > 0) {
              markCheckinStatus('paipai', value + '京豆', () => {
                chrome.runtime.sendMessage({
                  action: "checkin_notice",
                  batch: "bean",
                  reward: "bean",
                  value: value,
                  unit: 'bean',
                  title: "京价保自动为您领取拍拍签到有礼",
                  content: "恭喜您获得了" + value + '个京豆奖励'
                }, function (response) {
                  console.log("Response: ", response);
                })
              })
            } else {
              markCheckinStatus('paipai')
            }
          }
        })
      } else {
        if ($(".signIn_btnTxt").text() && $(".signIn_btnTxt").text().indexOf("连续签到") > -1){
          markCheckinStatus('paipai')
        }
      }
    }, 2000);
  }
}

// 19：每天领钢镚
function dailyMTLGB(setting) {
	if (setting != 'never') {
		weui.toast('京价保运行中', 1000);
		chrome.runtime.sendMessage({
			text: "run_status",
			jobId: "19"
    });
    setTimeout(() => {
      simulateClick($(".absolute.tModel_2 .t_1B img"), true)
      observeDOM(document.body, function () {
        if ($(".dialogB").height() > 0 && $(".dialogB .dialog_Button").text() == '立即查看') {
          let value = $(".dialogB .dialog_c").text().replace(/[^0-9\.-]+/g, "")
          markCheckinStatus('mtlgb', value + '钢镚', () => {
            chrome.runtime.sendMessage({
              text: "checkin_notice",
              batch: "coin",
              reward: "coin",
              value: value,
              unit: 'coin',
              title: "京价保自动为您每天领钢镚",
              content: "恭喜您获得了" + value + '个钢镚奖励'
            }, function (response) {
              console.log("Response: ", response);
            })
          })
        }
        if ($(".dialogB .b_bg h2").text() && $(".dialogB .b_bg h2").text().indexOf("已经") > -1){
          console.log('已经领取')
          markCheckinStatus('mtlgb')
        }
      })
    }, 1200);

  }
}

// 20：每日翻牌抽奖
function dailyFlipDraw(setting) {
	if (setting != 'never') {
		weui.toast('京价保运行中', 1000);
		chrome.runtime.sendMessage({
			text: "run_status",
			jobId: "20"
    });
    setTimeout(() => {
      if ($(".drawCont-item .rightBg").height() > 0) {
        markCheckinStatus('flip-draw')
      } else {
        simulateClick($(".drawCont-item").first(), true);
        observeDOM(document.body, function () {
          if ($(".drawCont-item .rightBg").height() > 0) {
            // 翻到了钢镚
            if ($(".drawCont-item .sortTxt").first().text().indexOf("钢镚") > -1) {
              let value = $(".drawCont-item .sortTxt").first().text().replace(/[^0-9\.-]+/g, "")
              if (value && Number(value) > 0) {
                markCheckinStatus('flip-draw', value + '钢镚', () => {
                  chrome.runtime.sendMessage({
                    action: "checkin_notice",
                    batch: "coin",
                    reward: "coin",
                    value: value,
                    unit: 'coin',
                    title: "京价保自动为您每日翻牌抽奖",
                    content: "恭喜您获得了" + value + '个钢镚奖励'
                  }, function (response) {
                    console.log("Response: ", response);
                  })
                })
              } else {
                markCheckinStatus('flip-draw')
              }
            } else {
              markCheckinStatus('flip-draw')
            }
          }
        })
      }
    }, 2000);

  }
}

// 11: 每日京豆签到（bean）
function beanCheckin(setting) {
  if (setting != 'never') {
    console.log('京豆签到（bean）')
    weui.toast('京价保运行中', 1000);
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "11"
    })
    $("#m_common_content .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view span").each(function () {
      let targetEle = $(this)
      if (targetEle.text() == '签到领京豆') {
        simulateClick(targetEle, true)
        observerBeanCheckinResult()
      }
    })

    $("#m_common_content .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view .react-view span").each(function () {
      if ($(this).text() == '已连续签到') {
        markCheckinStatus('bean')
      }
    })
  }
}

function observerBeanCheckinResult() {
  observeDOM(document.body, function (observer) {
    let resultElement = $('span:contains("签到成功 恭喜获得")')
    if (resultElement && resultElement.text().indexOf('恭喜') > -1) {
      if (observer) observer.disconnect();
      let value = resultElement.parent().next().text().replace(/[^0-9\.-]+/g, "")
      markCheckinStatus('bean', value + '京豆', () => {
        chrome.runtime.sendMessage({
          action: "checkin_notice",
          batch: "bean",
          reward: "bean",
          value: value,
          unit: 'bean',
          title: "京价保自动为您签到领京豆",
          content: `恭喜您获得了${value}个京豆奖励`
        }, function (response) {
          console.log("Response: ", response);
        })
      })
    }
  })
}

// 6: 金融钢镚签到（已失效）
function gangbeng(setting) {
  if (setting != 'never') {
    console.log('金融钢镚签到（jr-qyy）')
    weui.toast('京价保运行中', 1000);
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "6"
    })
    if ($(".we-ce-content .content-text").text() == "免费领京豆奖励" && $(".we-ce-content .content-button .button-text").text() == "立即领取") {
      // simulateClick($(".we-ce-content .content-button .button-text"), true)
      // 监控结果
      setTimeout(function () {
        if (($(".am-modal-body .title").text() && $(".am-modal-body .title").text().indexOf("获得") > -1) ) {
          let re = /^[^-0-9.]+([0-9.]+)[^0-9.]+$/
          let rawValue = $(".am-modal-body .title").text()
          let value = re.exec(rawValue)
          markCheckinStatus('jr-qyy', (value ? value[1] : '～0.01') + '个钢镚', () => {
            chrome.runtime.sendMessage({
              action: "checkin_notice",
              title: "京价保自动为您签到抢钢镚",
              value: value ? value[1] : 0.01,
              unit: 'coin',
              reward: "coin",
              content: "恭喜您领到了" + (value ? value[1] : '～0.01') + "个钢镚"
            }, function(response) {
              console.log("Response: ", response);
            })
          })
        }
      }, 1000)
    } else {
      if ($(".we-ce-content .content-button .button-text").text() == "已签到") {
        markCheckinStatus('jr-qyy')
      }
    }
  }
}

// 9: 金融会员签到
function jrIndex(setting) {
  if (setting != 'never') {
    console.log('签到领京豆（jr-index)')
    weui.toast('京价保运行中', 1000);
    chrome.runtime.sendMessage({
      text: "run_status",
      jobId: "9"
    })
    if ($("#sign2main .sign-btn").length > 0 && $("#sign2main .sign-btn").text().indexOf('签到') > -1) {
      simulateClick($("#sign2main .sign-btn"), true)
      // 监控结果
      observeDOM(document.body, function (observer) {
        let resultElement = $('.signDialog h1:visible')
        if (resultElement && resultElement.text().indexOf('成功') > -1) {
          if (observer) observer.disconnect();
          let rawValue = $("#fengkong .goldcolor").first().text()
          markCheckinStatus('jr-index', rawValue + "个钢镚", () => {
            chrome.runtime.sendMessage({
              action: "checkin_notice",
              title: "京价保自动为您签到京东金融",
              value: Number(rawValue),
              unit: 'coin',
              reward: "coin",
              content: "恭喜您！领到了" + rawValue + "个钢镚"
            }, function (response) {
              console.log("Response: ", response);
            })
          })
        }
      })
    } else {
      if ($("#sign2main .sign-btn").text().indexOf('再签') == 0) {
        markCheckinStatus('jr-index')
      }
    }
  }
}

// 金币
function getGoldCoin(task) {
  if (task && task.frequency != 'never') {
    let time = 0;
    console.log('开始领取金币')
    $("#content .set-coin-item a.btn").each(function () {
      let that = $(this)
      if (that.text() == '立即领取') {
        setTimeout(function () {
          simulateClick($(that))
          let uuid = Date.now()
          observeDOM(document.body, function (observer) {
            let resultElement = $(".draw-dialog-content-top .draw-dialog-coin-num")
            if (resultElement && resultElement.text().indexOf('成功') > -1) {
              if (observer) observer.disconnect();
              let value = resultElement.text().replace(/[^0-9\.-]+/g, "")
              return chrome.runtime.sendMessage({
                task: task,
                action: "goldCoinReceived",
                title: "京价保自动为您领取金币",
                value: value,
                reward: "goldCoin",
                content: `恭喜您领到了${value}个金币`,
                uuid: uuid
              }, function (response) {
                console.log("Response: ", response);
              });
            }
          })
        }, time)
        time += 5000;
      }
    })
  }
}

// 通用签到页面
function genericCheckIn(task) {
  if (task && task.frequency != 'never') {
    let time = 0;
    console.log('开始签到特定类别页面')
    $(".signIn_btnTxt").each(function () {
      let that = $(this)
      if (that.text() == '签到') {
        setTimeout(function () {
          simulateClick($(that))
          let uuid = Date.now()
          observeDOM(document.body, function (observer) {
            let resultElement = $(".signIn_pop .signIn_Title")
            if (resultElement && resultElement.text().indexOf('签到成功') > -1) {
              if (observer) observer.disconnect();
              let value = $(".signIn_pop .signIn_bean").text()
              return chrome.runtime.sendMessage({
                task: task,
                action: "checkin_notice",
                title: "京价保自动为您领取京豆",
                value: value,
                reward: "bean",
                content: `恭喜您领到了${value}`,
                uuid: uuid
              }, function (response) {
                console.log("Response: ", response);
              });
            }
          })
        }, time)
        time += 5000;
      }
    })
  }
}

function pineappleCheckIn(task) {
  if (task && task.frequency != 'never') {
    let time = 0;
    console.log('开始签到每日镚一镚')
    $(".get_btn_title").each(function () {
      let that = $(this)
      if (that.text() == '领钢镚') {
        setTimeout(function () {
          simulateClick($(that))
          let uuid = Date.now()
          observeDOM(document.body, function (observer) {
            let resultElement = $(".reward_title")
            if (resultElement && resultElement.text().indexOf('领取成功') > -1) {
              if (observer) observer.disconnect();
              let value = $(".reward_hasnum>span").text()
              if (value !== '') {
                return chrome.runtime.sendMessage({
                  task: task,
                  action: "checkin_notice",
                  title: "京价保自动为您领取钢镚",
                  value: value,
                  reward: "coin",
                  content: `恭喜您领到了${value}个钢蹦`,
                  uuid: uuid
                }, function (response) {
                  console.log("Response: ", response);
                });
              }
            }
          })
        }, time)
        time += 5000;
      }
    })
  }
}

function swingCheckIn(task) {
  if (task && task.frequency != 'never') {
    let time = 0;
    console.log('开始摇一摇')
    $(".rewardBoxBot").each(function () {
      let that = $(this)
      if (that.text() == '摇一摇 有惊喜') {
        setTimeout(function () {
          simulateClick($(that))
          let uuid = Date.now()
          observeDOM(document.body, function (observer) {
            let resultElement = $(".rewardPopT")
            if (resultElement && resultElement.text().indexOf('小盒子送你') > -1) {
              if (observer) observer.disconnect();
              let value = $(".rewardPopT>em").text()
              if (value !== '') {
                return chrome.runtime.sendMessage({
                  task: task,
                  action: "checkin_notice",
                  title: "京价保自动为您领取京豆",
                  value: value,
                  reward: "bean",
                  content: `恭喜您领到了${value}个京豆`,
                  uuid: uuid
                }, function (response) {
                  console.log("Response: ", response);
                });
              }
            }
          })
        }, time)
        time += 5000;
      }
    })
  }
}

// ************
// 主体任务
// ************

var pageTaskRunning = false

function triggerTask(task) {
  switch (task.id) {
    // 1:价保
    case '1':
      priceProtect(task)
    // 3:PLUS券
    case '3':
      getPlusCoupon(task)
      break;
    // 15:全品类券
    case '15':
      getCommonUseCoupon(task)
      break;
    // 18:拍拍签到有礼
    case '18':
      dailyPaipai(task)
      break;
    // 21:话费券
    case '21':
      getTelephoneCoupon(task)
      break;
    // 22:金币
    case '22':
      getGoldCoin(task)
      break;
    // 6: 钢镚
    case '6':
      gangbeng(task)
      break;
    default:
      break;
  }
  if (task.selector) {
    runCommonTask(task)
  }
}


function accountAlive(type, message) {
  chrome.runtime.sendMessage({
    action: "saveLoginState",
    state: "alive",
    message: message,
    type: type
  }, function(response) {
    console.log("accountAlive ", type, message, response);
  });
}

function CheckDom() {
  pageTaskRunning = true
  // 转存账号
  resaveAccount()

  // 登录状态检查
  checkLoginState()

  // getPageSetting
  chrome.runtime.sendMessage({
    action: "getPageSetting",
    location: {
      host: window.location.host,
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname
    }
  }, function (response) {
    if (response && response.tasks) {
      let time = 1500
      response.tasks.forEach(task => {
        setTimeout(() => {
          triggerTask(task)
        }, time)
        time += 15000;
      });
    }
    console.log('getPageSetting', response)
  });

  // 是否是PLUS会员
  if ($(".cw-user .fm-icon").length > 0 && $(".cw-user .fm-icon").text() == '正式会员') {
    chrome.runtime.sendMessage({
      action: "setVariable",
      key: "jjb_plus",
      value: "Y"
    }, function (response) {
      console.log("Response: ", response);
    });
  }

  // 账号登录页
  setTimeout(() => {
    dealLoginPage()
  }, 500);

  // 移除遮罩
  if ($("#pcprompt-viewpc").length > 0) {
    simulateClick($("#pcprompt-viewpc"))
  }

  // 商品页
  if (window.location.host == 'item.jd.com' || window.location.host == 're.jd.com') {
    getSetting('disable_pricechart', showPriceChart);
    if (window.location.host == 'item.jd.com') {
      setTimeout(() => {
        let priceInfo = seekPriceInfo('pc');
        getSetting('hand_protection', (setting) => {
          handProtection(setting, priceInfo)
        })
      }, 1500);
    }
  }

  // 移动商品页
  if (window.location.host == 'item.m.jd.com') {
    setTimeout(() => {
      seekPriceInfo("m");
    }, 500);
  }

  // 移动页增加滑动支持
  if (window.location.host == 'm.jd.com' || window.location.host == 'm.jr.jd.com') {
    injectScript(chrome.extension.getURL('/static/touch-emulator.js'), 'body');
    injectScriptCode(`
      setTimeout(function () {
        TouchEmulator();
      }, 200)
    `, 'body')
  }

  // 会员页签到 (5:京东会员签到)
  if ($(".sign-pop").length || $(".signin .signin-days").length || window.location.host == 'vip.m.jd.com') {
    getTask('5', vipCheckin)
  };

  // 16 白条签到
  if ($("#lottery .mark_btn_start").length || $("#lottery .mark_btn_start").length > 0) {
    getTask('16', baitiaoLottery)
  };

  // 19 每天领钢镚
  if (window.location.host == 'm.jr.jd.com' && window.location.pathname == '/activity/brief/get5Coin/index2.html') {
    setTimeout(() => {
      getSetting('job19_frequency', dailyMTLGB)
    }, 1500);
  }

  // 20 每日翻牌抽奖
  if (window.location.host == 'stock-sr.jd.com' && window.location.pathname == '/h5/jd-flipDraw/html/index.html') {
    setTimeout(() => {
      getSetting('job20_frequency', dailyFlipDraw)
    }, 1500);
  }

  // 京豆签到 (11:京豆签到)
  if (window.location.host == 'bean.m.jd.com') {
    getSetting('job11_frequency', beanCheckin)
    observerBeanCheckinResult()
  }

  // 京东金融慧赚钱签到 (6:金融慧赚钱签到)
  if ($(".assets-wrap .gangbeng").length > 0) {
    setTimeout(() => {
      getSetting('job6_frequency', gangbeng)
    }, 500);
  };

  // 23 智能生活
  if (window.location.host == 'pro.m.jd.com' && window.location.pathname == '/mall/active/KcfFqWvhb5hHtaQkS4SD1UU6RcQ/index.html') {
    setTimeout(() => {
      getSetting('job23_frequency', genericCheckIn)
    }, 1500);
  }

  // 24 母婴好货
  if (window.location.host == 'pro.m.jd.com' && window.location.pathname == '/mall/active/bVs9EG4MMK4zKdqVt86UFABX2en/index.html') {
    setTimeout(() => {
      getSetting('job24_frequency', genericCheckIn)
    }, 1500);
  }

  // 25 京东个护
  if (window.location.host == 'pro.m.jd.com' && window.location.pathname == '/mall/active/NJ1kd1PJWhwvhtim73VPsD1HwY3/index.html') {
    setTimeout(() => {
      getSetting('job25_frequency', genericCheckIn)
    }, 1500);
  }

  // 26 京东清洁
  if (window.location.host == 'pro.m.jd.com' && window.location.pathname == '/mall/active/2Tjm6ay1ZbZ3v7UbriTj6kHy9dn6/index.html') {
    setTimeout(() => {
      getSetting('job26_frequency', genericCheckIn)
    }, 1500);
  }

  // 27 京东图书
  if (window.location.host == 'pro.m.jd.com' && window.location.pathname == '/mall/active/3SC6rw5iBg66qrXPGmZMqFDwcyXi/index.html') {
    setTimeout(() => {
      getSetting('job27_frequency', genericCheckIn)
    }, 1500);
  }

  // 28 京东超市
  if (window.location.host == 'pro.m.jd.com' && window.location.pathname == '/mall/active/aNCM6yrzD6qp1Vvh5YTzeJtk7cM/index.html') {
    setTimeout(() => {
      getSetting('job28_frequency', genericCheckIn)
    }, 1500);
  }

  // 29 每日镚一镚
  if (window.location.host == 'red-e.jd.com' && window.location.pathname == '/resources/pineapple/index.html') {
    setTimeout(() => {
      getSetting('job29_frequency', pineappleCheckIn)
    }, 1500);
  }

  // 30 摇一摇
  if (window.location.host == 'vip.jd.com' && window.location.pathname == '/newPage/reward') {
    setTimeout(() => {
      getSetting('job30_frequency', swingCheckIn)
    }, 1500);
  }

  // 钢镚签到 (14:钢镚签到)
  if (window.location.origin == "https://coin.jd.com" && window.location.pathname == "/m/gb/index.html") {
    injectScriptCode(`
      function canvasEventListener() {
        let canvas = $("#myCanvas")[0];
        canvas.addEventListener('touchstart', canvas.ontouchstart);
        canvas.addEventListener('touchmove', canvas.ontouchmove);
        canvas.addEventListener('touchend', canvas.ontouchend);
      };
      canvasEventListener();
    `, 'body')
    setTimeout(() => {
      getSetting('job14_frequency', getCoin);
    }, 1000);
  };

  // 京东金融首页签到（9： 金融会员签到）
  if ($("#sign2main .sign-btn").length > 0) {
    getSetting('job9_frequency', jrIndex);
  };


  // 单独的领券页面
  if ( $("#js_detail .coupon_get") && $(".coupon_get .js_getCoupon").length > 0) {
    console.log('单独的领券页面', $("#js_detail .coupon_get").find('.js_getCoupon'))
    $("#js_detail .coupon_get").find('.js_getCoupon').trigger( "tap" )
    $("#js_detail .coupon_get").find('.js_getCoupon').trigger( "click" )
  }

  // 领取白条券（4：领白条券）
  if ($("#react-root .react-root .react-view").length > 0 && window.location.host == 'm.jr.jd.com' && document.title == "领券中心") {
    getSetting('job4_frequency', CheckBaitiaoCouponDom)
  };

  // 自动访问店铺领京豆
  if ( $(".bean-shop-list").length > 0 ) {
    getSetting('job7_frequency', autoVisitShop)
  };


  if ($(".jShopHeaderArea").length > 0 && $(".jShopHeaderArea .jSign .unsigned").length > 0) {
    getSetting('job7_frequency', doShopSign)
  }

  if ($(".jShopHeaderArea").length > 0 && $(".jShopHeaderArea .jSign .signed").length > 0) {
    if ($(".real-gift-tip .jingdou").length > 0) {
      let value = $(".real-gift-tip .jingdou span").text()
      chrome.runtime.sendMessage({
        action: "checkin_notice",
        title: "京价保自动为店铺签到领京豆",
        reward: "bean",
        value: Number(value),
        content: "恭喜您获得了" + value + "京豆"
      }, function (response) {
        console.log("Response: ", response);
      })
    }
    setTimeout(() => {
      chrome.runtime.sendMessage({
        text: "remove_tab",
        content: {
          url: window.location.href,
          pinned: true
        }
      }, function(response) {
        console.log("Response: ", response);
      });
    }, 1500);
  }

  // 领取精选券
  if ($(".coupon_sec_body").length > 0) {
    getSetting('job2_frequency', pickupCoupon)
  };

  // 自动跳转至商品页面
  if ($(".shop_intro .gobuy").length > 0) {
    showUtmSource()
    getSetting('auto_gobuy', autoGobuy)
  };

  // 手机验证码
  if ($('.tip-box').length > 0 && $(".tip-box").text().indexOf("账户存在风险") > -1) {
    dealLoginFailed("pc", "需要手机验证码")
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

  // 验证码
  if ($('.page-notice .txt-end').length > 0 && $('.page-notice .txt-end').text().indexOf("账户存在风险") > -1) {
    dealLoginFailed("m", "需要手机验证码")
  }

  // go to user page
  if (window.location != window.parent.location) {
    setTimeout(() => {
      if ($("#mCommonCart").length > 0) {
        simulateClick($("#mCommonCart"), true)
      }
      if ($("#m_common_header_shortcut_h_home").length > 0) {
        simulateClick($("#m_common_header_shortcut_h_home"), true)
      }
      if ($("#ttbar-myjd a").length > 0) {
        $("#ttbar-myjd a").attr('target', '_self')
        simulateClick($("#ttbar-myjd a"), true)
      }
    }, 2 * 60 * 1000);
  }
}

// 检查登录状态
function checkLoginState() {
  if (document.getElementById("ttbar-login") && document.getElementsByClassName("nickname")[0] && document.getElementsByClassName("nickname")[0].innerText) {
    accountAlive('pc', 'PC网页检测到用户名')
  }
  if ($("#J_user .user_show .user_logout").length > 0) {
    accountAlive('pc', 'PC网页检测到用户名')
  };
  // M 是否登录
  if (($("#mCommonMy").length > 0 && $("#mCommonMy").attr("report-eventid") == "MCommonBottom_My") || ($("#userName") && $("#userName").length > 0) || ($(".user_info .name").text() && $(".user_info .name").text().length > 0)) {
    accountAlive('m', '移动网页检测到登录')
  };
  if (location.href == "https://home.m.jd.com/myJd/newhome.action" && document.title == "个人中心") {
    accountAlive('m', '移动网页打开个人中心')
  }
}

// 不在收银台域名下运行任何任务
if (window.location.host != 'pcashier.jd.com') {
  $( document ).ready(function() {
    console.log('京价保注入页面成功');
    checkLoginState()
    if (!pageTaskRunning) {
      setTimeout( function(){
        console.log('京价保开始执行任务');
        CheckDom()
      }, 1200)
    }
  });
}

// 消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.action) {
    case 'productPrice':
      findOrderBySkuAndApply(message, message.setting)
      sendResponse({
        gotcha: message
      })
      break;
    default:
      break;
  }
});

var passiveSupported = false;
try {
  var options = Object.defineProperty({}, "passive", {
    get: function() {
      passiveSupported = true;
    }
  });

  window.addEventListener("test", null, options);
} catch(err) {}

window.addEventListener("message", function(event) {
    if (event.data && event.data.action == 'productPrice') {
      findOrderBySkuAndApply(event.data, event.data.setting)
    }
  },
  passiveSupported ? { passive: true } : false
);


var nodeList = document.querySelectorAll('script');
for (var i = 0; i < nodeList.length; ++i) {
  var node = nodeList[i];
  node.src = node.src.replace("http://", "https://")
}