import { DateTime } from 'luxon'
import { getLoginState } from './account'
import { getSetting, readableTime } from './utils'

const priceProUrl = "https://msitepp-fm.jd.com/rest/priceprophone/priceProPhoneMenu"
const frequencyOptionText = {
  '2h': "每2小时",
  '5h': "每5小时",
  'daily': "每天",
  'never': "从不"
}
const mapFrequency = {
  '2h': 2 * 60,
  '5h': 5 * 60,
  'daily': 24 * 60,
  'never': 99999
}
const tasks = [
  {
    id: '1',
    src: {
      m: "https://msitepp-fm.jd.com/rest/priceprophone/priceProPhoneMenu",
      pc: "https://pcsitepp-fm.jd.com/rest/pricepro/priceapply"
    },
    title: '价格保护',
    description: "价格保护默认只申请15天内下单的商品",
    mode: 'iframe',
    type: ['pc', 'm'],
    frequencyOption: ['2h', '5h', 'daily', 'never'],
    frequency: '5h',
    location: {
      host: ['pcsitepp-fm.jd.com', 'msitepp-fm.jd.com']
    },
    rateLimit:{
      weekly: 55,
      daily: 10,
      hour: 2
    }
  },
  {
    id: '15',
    src: {
      pc: 'https://jjb.zaoshu.so/event/coupon',
    },
    url: 'https://a.jd.com',
    title: '全品类券',
    description: "每天尝试领取全品类券（29减2/105减5/500减20/1000减30）",
    schedule: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    mode: 'iframe',
    location: {
      host: ['a.jd.com'],
      pathname: ['/']
    },
    type: ['pc'],
    frequencyOption: ['5h', 'daily', 'never'],
    frequency: '5h',
    rateLimit:{
      weekly: 55,
      daily: 10,
      hour: 2
    }
  },
  {
    id: '3',
    src: {
      m: 'https://plus.m.jd.com/index',
    },
    title: 'PLUS专享券',
    description: "当然啦，你得先是PLUS会员才能领到（不是每月定额100的全品类券）",
    mode: 'iframe',
    frequencyOption: ['2h', '5h', 'daily', 'never'],
    type: ['m'],
    frequency: '5h',
    location: {
      host: ['plus.m.jd.com'],
      pathname: ['/index']
    },
    rateLimit:{
      weekly: 14,
      daily: 5,
      hour: 2
    }
  },
  {
    id: '4',
    src: {
      m: 'https://m.jr.jd.com/mjractivity/rn/couponCenter/index.html?RN=couponCenter&tab=20',
    },
    title: '精选白条券',
    mode: 'iframe',
    frequencyOption: ['2h', '5h', 'daily', 'never'],
    type: ['m'],
    frequency: '5h',
    rateLimit:{
      weekly: 32,
      daily: 4,
      hour: 2
    }
  },
  {
    id: '21',
    src: {
      pc: 'https://jjb.zaoshu.so/event/coupon?type=phone',
    },
    baseUrl: 'https://a.jd.com',
    title: '话费充值券',
    description: "领取京东最新的话费充值券",
    mode: 'iframe',
    type: ['pc'],
    schedule: [10, 12, 14, 18, 20],
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['a.jd.com']
    },
    selector: {
      target: ".coupon-item:last",
      result: ".mask .content",
      successKeyWord: "成功",
    },
    rateLimit:{
      weekly: 32,
      daily: 4,
      hour: 2
    }
  },
  {
    id: '5',
    src: {
      m: 'https://vip.m.jd.com/page/signin',
    },
    title: '京东会员签到',
    description: "京东会员移动页每日签到领京豆",
    mode: 'iframe',
    key: "vip",
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    rateLimit:{
      weekly: 32,
      daily: 4,
      hour: 2
    }
  },
  {
    id: '14',
    src: {
      m: 'https://coin.jd.com/m/gb/index.html',
    },
    title: '钢镚每日签到',
    key: "coin",
    checkin: true,
    mode: 'iframe',
    type: ['m'],
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    rateLimit:{
      weekly: 32,
      daily: 4,
      hour: 2
    }
  },
  {
    id: '6',
    src: {
      m: 'https://m.jr.jd.com/spe/qyy/main/index.html?userType=41',
    },
    title: '金融钢镚签到',
    description: "京东金融惠赚钱每日签到有钢镚奖励",
    key: "jr-qyy",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    rateLimit:{
      weekly: 32,
      daily: 4,
      hour: 2
    },
    deprecated: true
  },
  {
    id: '9',
    src: {
      m: 'https://uf.jr.jd.com/activities/sign/v4/html/index.html',
    },
    title: '金融会员签到',
    description: "京东金融会员签到，需要实名认证",
    key: "jr-index",
    checkin: true,
    mode: 'iframe',
    type: ['m'],
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    rateLimit:{
      weekly: 32,
      daily: 4,
      hour: 2
    }
  },
  {
    id: '11',
    src: {
      m: 'https://bean.m.jd.com',
    },
    title: '每日京豆签到',
    key: "bean",
    checkin: true,
    mode: 'iframe',
    type: ['m'],
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    rateLimit:{
      weekly: 14,
      daily: 5,
      hour: 2
    }
  },
  {
    id: '12', // 已经失效
    src: {
      m: 'https://m.jr.jd.com/integrate/signin/index.html',
    },
    title: '领取双签奖励',
    description: "完成京豆和京东金融签到有一个双签奖励",
    key: "double_check",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    location: {
      host: ['m.jr.jd.com'],
      pathname: ['/integrate/signin/index.html']
    },
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    deprecated: true
  },
  {
    id: "18",
    src: {
      m: "https://pro.m.jd.com/mall/active/3S28janPLYmtFxypu37AYAGgivfp/index.html"
    },
    title: '拍拍签到有礼',
    description: "拍拍二手签到有礼",
    key: "paipai",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['pro.m.jd.com'],
      pathname: ['/mall/active/3S28janPLYmtFxypu37AYAGgivfp/index.html']
    },
    rateLimit:{
      weekly: 14,
      daily: 5,
      hour: 2
    }
  },
  {
    id: '16',
    src: {
      m: 'https://m.jr.jd.com/btyingxiao/marketing/html/index.html',
    },
    title: '白条免息红包',
    description: "大部分情况获得京豆，也有可能白条券",
    key: "baitiao",
    checkin: true,
    mode: 'iframe',
    type: ['m'],
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    rateLimit:{
      weekly: 14,
      daily: 5,
      hour: 2
    }
  },
  {
    id: '7',
    src: {
      pc: 'https://bean.jd.com/myJingBean/list',
    },
    title: '浏览店铺签到',
    description: "这个功能是自动浏览店铺签到得京豆，会开一些固定标签页",
    mode: 'tab',
    type: ['pc'],
    frequencyOption: ['daily', 'never'],
    frequency: 'never',
    rateLimit:{
      weekly: 14,
      daily: 5,
      hour: 2
    }
  },
  {
    id: '22',
    src: {
      m: 'https://m.jr.jd.com/member/gcmall/',
    },
    title: '领取金融金币',
    description: "领取京东金融各种返金币",
    mode: 'iframe',
    type: ['m'],
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['m.jr.jd.com'],
      pathname: ['/member/gcmall/']
    },
    new: true,
    rateLimit:{
      weekly: 14,
      daily: 3,
      hour: 2
    }
  },
  {
    id: '23',
    src: {
      m: 'https://pro.m.jd.com/mall/active/2C4Az1JUCWN8f3Y6xaxHbzTLkUzC/index.html',
    },
    title: '领取智能生活京豆',
    description: "领取智能生活页面签到京豆",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['pro.m.jd.com'],
      pathname: ['/mall/active/2C4Az1JUCWN8f3Y6xaxHbzTLkUzC/index.html']
    },
    new: true,
    rateLimit:{
      weekly: 14,
      daily: 3,
      hour: 2
    }
  },
  {
    id: '24',
    src: {
      m: 'https://pro.m.jd.com/mall/active/bVs9EG4MMK4zKdqVt86UFABX2en/index.html',
    },
    title: '领取母婴好货京豆',
    description: "领取母婴好货页面签到京豆",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['pro.m.jd.com'],
      pathname: ['/mall/active/bVs9EG4MMK4zKdqVt86UFABX2en/index.html']
    },
    new: true,
    rateLimit:{
      weekly: 14,
      daily: 3,
      hour: 2
    }
  },
  {
    id: '25',
    src: {
      m: 'https://pro.m.jd.com/mall/active/NJ1kd1PJWhwvhtim73VPsD1HwY3/index.html',
    },
    title: '领取京东个护京豆',
    description: "领取京东个护页面签到京豆",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['pro.m.jd.com'],
      pathname: ['/mall/active/NJ1kd1PJWhwvhtim73VPsD1HwY3/index.html']
    },
    new: true,
    rateLimit:{
      weekly: 14,
      daily: 3,
      hour: 2
    }
  },
  {
    id: '26',
    src: {
      m: 'https://pro.m.jd.com/mall/active/2Tjm6ay1ZbZ3v7UbriTj6kHy9dn6/index.html',
    },
    title: '领取京东清洁京豆',
    description: "领取京东清洁页面签到京豆",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['pro.m.jd.com'],
      pathname: ['/mall/active/2Tjm6ay1ZbZ3v7UbriTj6kHy9dn6/index.html']
    },
    new: true,
    rateLimit:{
      weekly: 14,
      daily: 3,
      hour: 2
    }
  },
  {
    id: '27',
    src: {
      m: 'https://pro.m.jd.com/mall/active/3SC6rw5iBg66qrXPGmZMqFDwcyXi/index.html',
    },
    title: '领取京东图书京豆',
    description: "领取京东图书页面签到京豆",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['pro.m.jd.com'],
      pathname: ['/mall/active/3SC6rw5iBg66qrXPGmZMqFDwcyXi/index.html']
    },
    new: true,
    rateLimit:{
      weekly: 14,
      daily: 3,
      hour: 2
    }
  },
  {
    id: '28',
    src: {
      m: 'https://pro.m.jd.com/mall/active/aNCM6yrzD6qp1Vvh5YTzeJtk7cM/index.html',
    },
    title: '领取京东超市京豆',
    description: "领取京东超市页面签到京豆",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['pro.m.jd.com'],
      pathname: ['/mall/active/aNCM6yrzD6qp1Vvh5YTzeJtk7cM/index.html']
    },
    new: true,
    rateLimit:{
      weekly: 14,
      daily: 3,
      hour: 2
    }
  },
  {
    id: '29',
    src: {
      m: 'https://red-e.jd.com/resources/pineapple/index.html',
    },
    title: '领取每日镚一镚',
    description: "领取每日镚一镚",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['red-e.jd.com'],
      pathname: ['/resources/pineapple/index.html']
    },
    new: true,
    rateLimit:{
      weekly: 14,
      daily: 3,
      hour: 2
    },
  },
  {
    id: '30',
    src: {
      m: 'https://vip.jd.com/newPage/reward',
    },
    title: '领取摇一摇',
    description: "领取摇一摇",
    mode: 'iframe',
    type: ['m'],
    checkin: true,
    frequencyOption: ['daily', 'never'],
    frequency: 'daily',
    location: {
      host: ['vip.jd.com'],
      pathname: ['/newPage/reward']
    },
    new: true,
    rateLimit:{
      weekly: 14,
      daily: 30,
      hour: 20
    },
  }
]

// 根据登录状态选择任务模式
let findTaskPlatform = function (task) {
  let loginState = getLoginState()
  let platform = null
  for (var i = 0; i < task.type.length; i++) {
    if (loginState[task.type[i]].state == 'alive') {
      platform = task.type[i];
      break;
    }
  }
  return platform
}

let getTask = function (taskId, currentPlatform) {
  let taskParameters = getSetting('task-parameters', [])
  let taskSettings = getSetting(`task-${taskId}:settings`, {})
  let parameters = (Array.isArray(taskParameters) && taskParameters.length > 0) ? taskParameters.find(t => t.id == taskId.toString()) : {}
  let task = Object.assign({
    rateLimit: {
      weekly: 21,
      daily: 5,
      hour: 2
    }
  }, tasks.find(t => t.id == taskId.toString()), parameters, taskSettings)
  let year = new Date().getFullYear()
  let week = DateTime.local().weekNumber
  let today = DateTime.local().toFormat("o")
  let hour = new Date().getHours()
  let taskStatus = {}
  taskStatus.platform = findTaskPlatform(task);
  taskStatus.frequency = getSetting(`job${taskId}_frequency`, task.frequency)
  taskStatus.usage = {
    hour: getSetting(`temporary:usage-${taskId}_${year}d:${today}:h:${hour}`, 0),
    daily: getSetting(`temporary:usage-${taskId}_${year}d:${today}`, 0),
    weekly: getSetting(`temporary:usage-${taskId}_${year}w:${week}`, 0)
  }
  taskStatus.last_run_at = localStorage.getItem(`job${task.id}_lasttime`) ? parseInt(localStorage.getItem(`job${task.id}_lasttime`)) : null
  taskStatus.last_run_description = taskStatus.last_run_at ? "上次运行： " + readableTime(DateTime.fromMillis(Number(taskStatus.last_run_at))) : "从未执行";

  // 如果是签到任务，则读取签到状态
  if (task.checkin) {
    let checkinRecord = getSetting(`jjb_checkin_${task.key}`, null)
    if (checkinRecord && checkinRecord.date == DateTime.local().toFormat("o")) {
      taskStatus.checked = true
      taskStatus.checkin_description = "完成于：" + readableTime(DateTime.fromISO(checkinRecord.time)) + (checkinRecord.value ? "，领到：" + checkinRecord.value : "");
    }
  }

  // 如果是单次任务，则读取完成状态
  if (task.onetimeKey) {
    let onetimeRecord = getSetting(`task_onetime_${task.onetimeKey}`, null)
    if (onetimeRecord) {
      taskStatus.checked = true
      taskStatus.checkin_description = `完成于：${readableTime(DateTime.fromISO(onetimeRecord.time))} ${onetimeRecord.message}`
    }
  }

  // 如果限定平台
  if (currentPlatform) {
    if (task.type && task.type.indexOf(currentPlatform) < 0) {
      taskStatus.unavailable = true
    }
  }
  // 选择运行平台
  if (!task.url) {
    taskStatus.url = taskStatus.platform ? task.src[taskStatus.platform] : task.src[task.type[0]];
  }
  // 如果任务无可运行平台
  if (!taskStatus.platform) {
    taskStatus.suspended = true;
    taskStatus.platform = task.type[0];
  }
  // 如果超出限制
  if ((task.rateLimit.weekly && taskStatus.usage.weekly >= task.rateLimit.weekly) || taskStatus.usage.daily >= task.rateLimit.daily || taskStatus.usage.hour >= task.rateLimit.hour) {
    taskStatus.pause = true;
  }
  // 如果是新任务
  if (task.new) {
    taskStatus.pause = true;
  }
  return Object.assign(task, taskStatus)
}

let getTasks = function (currentPlatform) {
  let taskList = tasks.map((task) => {
    return getTask(task.id, currentPlatform)
  })
  return taskList.filter(task => !(task.unavailable || task.deprecated));
}

module.exports = {
  priceProUrl,
  frequencyOptionText,
  mapFrequency,
  tasks,
  getTask,
  getTasks,
  findTaskPlatform
};