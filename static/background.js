let jobs = [
  {
    id: '1',
    src: 'https://plogin.m.jd.com/user/login.action?appid=100&kpkey=&returnurl=https%3a%2f%2fsitepp-fm.jd.com%2frest%2fpriceprophone%2fpriceProPhoneMenu',
    title: '价格保护',
    mode: 'iframe',
    frequency: '5h'
  },
  {
    id: '2',
    src: 'https://plogin.m.jd.com/user/login.action?appid=100&kpkey=&returnurl=https%3A%2F%2Fcoupon.m.jd.com%2Fcenter%2FgetCouponCenter.action',
    title: '领精选券',
    mode: 'iframe',
    frequency: '5h'
  },
  {
    id: '3',
    src: 'https://plogin.m.jd.com/user/login.action?appid=100&kpkey=&returnurl=https%3A%2F%2Fplus.m.jd.com%2Findex',
    title: 'PLUS券',
    mode: 'iframe',
    frequency: '5h'
  },
  {
    id: '4',
    src: 'https://plogin.m.jd.com/user/login.action?appid=100&kpkey=&returnurl=https%3a%2f%2fm.jr.jd.com%2fjdbt%2fnewcoupons%2fcoupon-list.html%3fcategory%3d0%26coupony%3d0',
    title: '领白条券',
    mode: 'iframe',
    frequency: '5h'
  },
  {
    id: '5',
    src: 'https://plogin.m.jd.com/user/login.action?appid=100&kpkey=&returnurl=https%3A%2F%2Fvip.m.jd.com%2Fpage%2Fsignin',
    title: '京东会员签到',
    mode: 'iframe',
    frequency: 'daily'
  },
  {
    id: '6',
    src: 'https://plogin.m.jd.com/user/login.action?appid=100&kpkey=&returnurl=https%3a%2f%2fm.jr.jd.com%2fspe%2fqyy%2fmain%2findex.html%3fuserType%3d41',
    title: '京东金融惠赚钱签到',
    mode: 'iframe',
    frequency: 'daily'
  },
  {
    id: '7',
    src: 'https://bean.jd.com/myJingBean/list',
    title: '店铺签到',
    mode: 'tab',
    frequency: 'never'
  },
  {
    id: '8',
    src: 'https://plogin.m.jd.com/user/login.action?appid=100&returnurl=https%3a%2f%2fhome.jdpay.com%2fmy%2fsignIndex%3ffrom%3dsinglemessage%26isappinstalled%3d0%26source%3dJDSC',
    title: '京东支付签到',
    mode: 'iframe',
    frequency: 'daily'
  },
  {
    id: '9',
    src: 'https://vip.jr.jd.com',
    title: '京东金融会员签到',
    mode: 'tab',
    frequency: 'daily'
  },
  {
    id: '10',
    src: 'https://plogin.m.jd.com/user/login.action?appid=100&returnurl=https%3a%2f%2fm.jr.jd.com%2fmjractivity%2frn%2fplatinum_members_center%2findex.html%3fpage%3dFXDetailPage',
    title: '金融铂金会员支付返利',
    mode: 'iframe',
    frequency: 'daily'
  },
  {
    id: '11',
    src: 'https://bean.m.jd.com/',
    title: '移动端京豆签到',
    mode: 'iframe',
    frequency: 'daily'
  },
  {
    id: '12',
    src: 'https://ljd.m.jd.com/countersign/index.action',
    title: '双签礼包',
    mode: 'iframe',
    frequency: 'daily'
  }
]

// 会员礼包
// https://vip.m.jd.com/page/gift/list


let mapFrequency = {
  '2h': 2 * 60,
  '5h': 5 * 60,
  'daily': 24 * 60,
  'never': 99999
}

// 设置默认频率
_.forEach(jobs, (job) => {
  let frequency = localStorage.getItem('job' + job.id + '_frequency')
  if (!frequency) {
    localStorage.setItem('job' + job.id + '_frequency', job.frequency)
  }
})


// This is to remove X-Frame-Options header, if present
chrome.webRequest.onHeadersReceived.addListener(
    function(info) {
      var headers = info.responseHeaders;
      for (var i=headers.length-1; i>=0; --i) {
          var header = headers[i].name.toLowerCase();
          if (header == 'x-frame-options' || header == 'frame-options') {
              headers.splice(i, 1); // Remove header
          }
      }
      return {responseHeaders: headers};
    },
    {
        urls: ['*://*.jd.com/*', '*://*.jd.hk/*', "*://*.jdpay.com/*"], //
        types: ['sub_frame']
    },
    ['blocking', 'responseHeaders']
);

chrome.runtime.onInstalled.addListener(function (object) {
  var installed = localStorage.getItem('jjb_installed')
  if (installed) {
    console.log("已经安装")
  } else {
    localStorage.setItem('jjb_installed', 'Y');
    chrome.tabs.create({url: "/start.html"}, function (tab) {
      console.log("京价保安装成功！");
    });
  }
});

// 判断浏览器
try {
  browser.runtime.getBrowserInfo().then(function (browserInfo) {
    localStorage.setItem('browserName', browserInfo.name);
  })
} catch (error) {}


// 将UA改为 Firfox 试图让京东不要求登录时输入验证码
var Firfox_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:58.0) Gecko/20100101 Firefox/58.0';
chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    for (var i = 0; i < details.requestHeaders.length; ++i) {
      if (details.requestHeaders[i].name === 'User-Agent') {
        details.requestHeaders[i].value = Firfox_USER_AGENT;
        break;
      }
    }
    return { requestHeaders: details.requestHeaders };
  }, { urls: ["*://*.jd.com/*"] }, ['blocking', 'requestHeaders']);


chrome.alarms.onAlarm.addListener(function( alarm ) {
  switch(true){
    // 定时检查任务
    case alarm.name.startsWith('delayIn'):
      clearPinnedTabs()
      findJobs()
      run()
      break;
    case alarm.name.startsWith('runJob'):
      var jobId = alarm.name.split('_')[1]
      run(jobId)
      break;
    case alarm.name  == 'clearIframe':
      // 销毁掉 
      $("#iframe").remove();
      let iframe = '<iframe id="iframe" width="1000 px" height="600 px" src=""></iframe>';
      $('body').html(iframe);
      break;
    case alarm.name.startsWith('closeTab'):
      var tabId = alarm.name.split('_')[1]
      try {
        chrome.tabs.remove(parseInt(tabId))
      } catch (e) {}
      break;
    case alarm.name == 'reload':
      chrome.runtime.reload()
      break;
  }
})

// 保存任务栈
function saveJobStack(jobStack) {
  jobStack = _.uniq(jobStack)
  localStorage.setItem('jobStack', JSON.stringify(jobStack));
}


function getJobs() {
  return _.map(jobs, (job) => {
    var job_run_last_time = localStorage.getItem('job' + job.id + '_lasttime')
    job.last_run_at = job_run_last_time ? parseInt(job_run_last_time) : null
    job.frequency = localStorage.getItem('job' + job.id + '_frequency') || job.frequency
    return job
  })
}


// 寻找乔布斯
function findJobs() {
  var jobStack = localStorage.getItem('jobStack') ? JSON.parse(localStorage.getItem('jobStack')) : []
  var jobList = getJobs()
  jobList.forEach(function(job) {
    switch(job.frequency){
      case '2h':
        // 如果从没运行过，或者上次运行已经过去超过2小时，那么需要运行
        if (!job.last_run_at || moment().isAfter(moment(job.last_run_at).add(2, 'hour')) ) {
          jobStack.push(job.id)
        }
        break;
      case '5h':
        // 如果从没运行过，或者上次运行已经过去超过5小时，那么需要运行
        if (!job.last_run_at || moment().isAfter(moment(job.last_run_at).add(5, 'hour')) ) {
          jobStack.push(job.id)
        }
        break;
      case 'daily':
        // 如果从没运行过，或者上次运行不在今天
        if ( !job.last_run_at || !moment().isSame(moment(job.last_run_at), 'day') ) {
          jobStack.push(job.id)
        }
        break;
      default:
        console.log('ok, never run ', job.title)
    }
  });
  saveJobStack(jobStack)
}

// 执行组织交给我的任务
function run(jobId, force) {
  console.log("run", jobId, new Date())
  // 如果没有指定任务ID 就从任务栈里面找一个
  if (!jobId) {
    var jobStack = localStorage.getItem('jobStack') ? JSON.parse(localStorage.getItem('jobStack')) : []
    if (jobStack && jobStack.length > 0) {
      var jobId = jobStack.shift();
      saveJobStack(jobStack)
    } else {
      console.log('好像没有什么事需要我做...')
    }
  }
  var jobList = getJobs()
  var job = _.find(jobList, {id: jobId})
  if (job && (job.frequency != 'never' || force)) {
    console.log("运行", job.title)
    if (job.mode == 'iframe') {
      $("#iframe").attr('src', job.src)
      // 2分钟后清理 iframe
      chrome.alarms.create('clearIframe', {
        delayInMinutes: 3
      })
    } else {
      chrome.tabs.create({
        index: 1,
        url: job.src,
        active: false,
        pinned: true
      }, function (tab) {
        chrome.alarms.create('closeTab_'+tab.id, {delayInMinutes: 3})
      })
    }
  }

}

function updateUnreadCount(change = 0) {
  let lastUnreadCount = localStorage.getItem('unreadCount') || 0
  let unreadCount = parseInt(Number(lastUnreadCount) + change)
  if (unreadCount < 0) {
    unreadCount = 0
  }
  localStorage.setItem('unreadCount', unreadCount);
  if (unreadCount > 0) {
    let unreadCountText = unreadCount.toString()
    if (unreadCount > 100) {
      unreadCountText = '99+'
    }
    chrome.browserAction.setBadgeText({ text: unreadCountText });
    chrome.browserAction.setBadgeBackgroundColor({ color: "#4caf50" });
  } else {
    chrome.browserAction.setBadgeText({ text: "" });
  }
}



$( document ).ready(function() {
  // 每10分钟运行一次定时任务
  chrome.alarms.create('delayInMinutes', {periodInMinutes: 10})

  // 每600分钟完全重载
  chrome.alarms.create('reload', {periodInMinutes: 600})

  // 载入后马上运行一次任务查找
  findJobs()

  // 载入显示未读数量
  updateUnreadCount()

  // 总是安全的访问京东
  var force_https = localStorage.getItem('force_https')
  if (force_https && force_https == 'checked') {
    chrome.tabs.onCreated.addListener(function (tab){
      forceHttps(tab)
    })
    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
      forceHttps(tab)
    })
  }
})

// 点击通知
chrome.notifications.onClicked.addListener(function (notificationId){
  if (notificationId.split('_').length > 0) {
    var batch = notificationId.split('_')[1]
    if (batch && batch.length > 1) {
      switch(batch){
        case 'baitiao':
          chrome.tabs.create({
  
            url: "https://vip.jr.jd.com/coupon/myCoupons?default=IOU"
          })
          break;
        case 'bean':
          chrome.tabs.create({
  
            url: "http://bean.jd.com/myJingBean/list"
          })
          break;
        case 'jiabao':
          openPriceProPhoneMenu()
          break;
        case 'rebate':
          openFXDetailPage()
          break;
        
        default:
          if (batch && batch != 'undefined') {
            chrome.tabs.create({
              url: "https://search.jd.com/Search?coupon_batch=" + batch
            })
          } else {
            chrome.tabs.create({
              url: "https://union-click.jd.com/jdc?d=259YU4"
            })
          }
          
      }
    }
  }
})

function openPriceProPhoneMenu() {
  chrome.windows.create({
    width: 420,
    height: 800,
    url: "https://plogin.m.jd.com/user/login.action?appid=100&kpkey=&returnurl=https%3a%2f%2fsitepp-fm.jd.com%2frest%2fpriceprophone%2fpriceProPhoneMenu",
    type: "popup"
  });
}

function openFXDetailPage() {
  chrome.windows.create({
    width: 420,
    height: 800,
    url: "https://plogin.m.jd.com/user/login.action?appid=100&returnurl=https%3a%2f%2fm.jr.jd.com%2fmjractivity%2frn%2fplatinum_members_center%2findex.html%3fpage%3dFXDetailPage",
    type: "popup"
  });
}

function openLoginPage() {
  chrome.windows.create({
    width: 1024,
    height: 800,
    url: "https://passport.jd.com/new/login.aspx",
    type: "popup"
  });
}

// force ssl
function forceHttps(tab) {
  if (tab && _.startsWith(tab.url, 'http://') && tab.url.indexOf('jd.com') !== -1) {
    chrome.tabs.update(tab.id, {
      url: tab.url.replace(/^http:\/\//i, 'https://')
    }, function () {
      console.log('force ssl jd.com')
    })
  }
}

// 清除不需要的tab
function clearPinnedTabs() {
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
}


chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  switch(msg.text){
    case 'isLogin':
      localStorage.setItem('jjb_logged-in', 'Y');
      break;
    case 'isPlus':
      localStorage.setItem('jjb_plus', 'Y');
      break;
    case 'getPriceProtectionSetting':
      let isPlus = localStorage.getItem('jjb_plus');
      let min = localStorage.getItem('price_pro_min');
      let days = localStorage.getItem('price_pro_days')
      let is_plus = (localStorage.getItem('is_plus') ? localStorage.getItem('is_plus') == 'checked' : false ) || (isPlus == 'Y')
      return sendResponse({
        pro_days: days || 15,
        is_plus: is_plus,
        pro_min: min | 0.1
      })
      break;
    case 'saveAccount':
      var content = JSON.parse(msg.content)
      if (content.username && content.password) {
        localStorage.setItem('jjb_account', msg.content);
      }
      break;
    case 'getSetting':
      var setting = localStorage.getItem(msg.content)
      return sendResponse(setting)
      break;
    case 'getAccount':
      let account = localStorage.getItem('jjb_account') ? JSON.parse(localStorage.getItem('jjb_account')) : null
      let loginFailed = localStorage.getItem('jjb_login-failed') ? JSON.parse(localStorage.getItem('jjb_login-failed')) : null
      if (account && loginFailed && moment().isBefore(moment(loginFailed.time).add(2, 'hour'))) {
        loginFailed.displayTime = moment(loginFailed.time).locale('zh-cn').calendar()
        account.loginFailed = loginFailed
      }
      return sendResponse(account)
      break;
    case 'paid':
      localStorage.setItem('jjb_paid', 'Y');
      chrome.notifications.create( new Date().getTime().toString(), {
        type: "basic",
        title: "谢谢老板",
        message: "我会努力签到、领券、申请价格保护来回报你的",
        iconUrl: 'static/image/128.png'
      })
      break;
    case 'openLogin':
    case 'openPricePro':
      openPriceProPhoneMenu()
      break;
    case 'loginFailed':
      localStorage.setItem('jjb_login-failed', JSON.stringify({
        errormsg: msg.content,
        time: new Date()
      }));
      chrome.notifications.create(new Date().getTime().toString(), {
        type: "basic",
        title: "自动登录失败：" + msg.content,
        message: "请手动登录一下（如果启用了科学上网，请把京东排除）",
        iconUrl: 'static/image/128.png'
      })
      break;
    case 'option':
      localStorage.setItem('jjb_'+msg.title, msg.content);
      console.log('option', msg)
      break;
    case 'runJob':
      var jobId = msg.content.split('job')[1]
      var jobList = getJobs()
      var job = _.find(jobList, {id: jobId})
      run(jobId, true)
      chrome.notifications.create( new Date().getTime().toString(), {
        type: "basic",
        title: "正在重新运行" + job.title,
        message: "如果有情况我再叫你",
        iconUrl: 'static/image/128.png'
      })
      break;
    case 'notice':
      var play_audio = localStorage.getItem('play_audio')
      if (msg.batch == 'jiabao') {
        var hide_good = localStorage.getItem('hide_good')
        if (play_audio && play_audio == 'checked' || msg.test) {
          var myAudio = new Audio();
          myAudio.src = "static/audio/price_protection.ogg";
          myAudio.play();
        }
        if (!hide_good || hide_good != 'checked') {
          msg.content = (msg.product_name ? msg.product_name.substr(0, 22) : '') + msg.content
        }
      }
      if (msg.batch == 'rebate') {
        if (play_audio && play_audio == 'checked' || msg.test) {
          var myAudio = new Audio();
          myAudio.src = "static/audio/rebate.ogg";
          myAudio.play();
        }
      }
      let icon = 'static/image/128.png'
      if (msg.batch == 'rebate') {
        icon = 'static/image/rebate.png'
      }
      if (msg.batch == 'jiabao') {
        icon = 'static/image/money.png'
      }
      chrome.notifications.create( new Date().getTime().toString() + '_' + msg.batch, {
        type: "basic",
        title: msg.title,
        message: msg.content,
        iconUrl: icon
      })
      break;
    case 'checkin_notice':
      var mute_checkin = localStorage.getItem('mute_checkin')
      if (mute_checkin && mute_checkin == 'checked' && !msg.test) {
        console.log('checkin', msg)
      } else {
        var play_audio = localStorage.getItem('play_audio')
        if (play_audio && play_audio == 'checked' || msg.test) {
          var myAudio = new Audio();
          myAudio.src = "static/audio/beans.ogg";
          if (msg.batch == 'coin') {
            myAudio.src = "static/audio/coin_drop.ogg";
          }
          myAudio.play();
        }
        let icon = 'static/image/bean.png'
        if (msg.batch == 'coin') {
          icon = 'static/image/coin.png'
        }
        chrome.notifications.create( new Date().getTime().toString() + '_' + msg.batch, {
          type: "basic",
          title: msg.title,
          message: msg.content,
          iconUrl: icon
        })
      }
      break;
    // 签到状态
    case 'checkin_status':
      let currentStatus = localStorage.getItem('jjb_checkin_' + msg.batch) ? JSON.parse(localStorage.getItem('jjb_checkin_' + msg.batch)) : null
      let data = {
        date: moment().format("DDD"),
        time: new Date(),
        value: msg.value
      }
      if (currentStatus && currentStatus.date == moment().format("DDD")) {
        console.log('已经记录过今日签到状态了')
      } else {
        localStorage.setItem('jjb_checkin_' + msg.batch, JSON.stringify(data));
      }
      break;
    // 运行状态
    case 'run_status':
      console.log('run_status', msg)
      var jobList = getJobs()
      var job = _.find(jobList, { id: msg.jobId })
      var last_run_at = localStorage.setItem('job' + job.id + '_lasttime', new Date().getTime())
      // 安排下一次运行
      if (mapFrequency[job.frequency] < 1000) {
        chrome.alarms.create('runJob_' + job.id, {
          delayInMinutes: mapFrequency[job.frequency]
        })
      }
      break;
    case 'create_tab':
      var content = JSON.parse(msg.content)
      chrome.tabs.create({
        index: content.index,
        url: content.url,
        active: content.active == 'true',
        pinned: content.pinned == 'true'
      }, function (tab) {
        chrome.alarms.create('closeTab_' + tab.id, { delayInMinutes: 1 })
      })
      break;
    case 'remove_tab':
      var content = JSON.parse(msg.content)
      chrome.tabs.query({
        url: content.url,
        pinned: content.pinned == 'true'
      }, function (tabs) {
        var tabIds = $.map(tabs, function (tab) {
          return tab.id
        })
        chrome.tabs.remove(tabIds)
      })
      break;
    // 高亮Tab
    case 'highlightTab':
      var content = JSON.parse(msg.content)
      chrome.notifications.create(new Date().getTime().toString(), {
        type: "basic",
        title: "京价保未能自动完成任务",
        message: "需要人工辅助，已将窗口切换至需要操作的标签",
        iconUrl: 'static/image/128.png'
      })
      chrome.tabs.query({
        url: content.url,
        pinned: content.pinned == 'true'
      }, function (tabs) {
        var tabIds = $.map(tabs, function (tab) {
          chrome.tabs.update(tab.id, { pinned: false }, function (newTab) {
            chrome.tabs.highlight({
              tabs: newTab.index
            })
          })
          return tab.id
        })
      })
      break;
    case 'coupon':
      var coupon = JSON.parse(msg.content)
      var mute_coupon = localStorage.getItem('mute_coupon')
      if (mute_coupon && mute_coupon == 'checked') {
        console.log('coupon', msg)
      } else {
        chrome.notifications.create( "coupon_" + coupon.batch, {
          type: "basic",
          title: msg.title,
          message: coupon.name + coupon.price,
          isClickable: true,
          iconUrl: 'static/image/coupon.png'
        })
      }
      break;
    case 'orders':
      localStorage.setItem('jjb_orders', msg.content);
      localStorage.setItem('jjb_last_check', new Date().getTime());
      break;
    case 'clearUnread':
      updateUnreadCount(-999)
      break;
    default:
      console.log("Received %o from %o, frame", msg, sender.tab, sender.frameId);
  }
  // 保存消息
  switch (msg.text) {
    case 'coupon':
    case 'notice':
    case 'checkin_notice':
      let messages = localStorage.getItem('jjb_messages') ? JSON.parse(localStorage.getItem('jjb_messages')) : [];
      if (msg.test) {
        break;
      }
      messages.push({
        type: msg.text,
        batch: msg.batch,
        title: msg.title,
        content: msg.content,
        time: new Date()
      })
      updateUnreadCount(1)
      // 如果消息数大于100了，就把最老的一条消息去掉
      if (messages.length > 100) {
        messages.shift()
      }
      localStorage.setItem('jjb_messages', JSON.stringify(messages));
      break;
  }

  sendResponse(msg, "Gotcha!");
});