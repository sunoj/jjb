<template>
  <div class="settings">
    <div class="weui-tab">
      <div :class="`${scienceOnline} weui-navbar`">
        <div
          :class="`weui-navbar__item ${ activeTab == 'frequency_settings' ? 'weui-bar__item_on' : ''}`"
          @click="switchTab('frequency_settings')"
        >任务设置</div>
        <div
          :class="`weui-navbar__item ${ activeTab == 'notice_settings' ? 'weui-bar__item_on' : ''}`"
          @click="switchTab('notice_settings')"
        >通知设置</div>
        <div
          :class="`weui-navbar__item ${ activeTab == 'other_settings' ? 'weui-bar__item_on' : ''}`"
          @click="switchTab('other_settings')"
        >高级设置</div>
      </div>
      <div class="weui-tab__panel">
        <form
          id="settings"
          data-persist="garlic"
          data-domain="true"
          data-destroy="false"
          method="POST"
        >
          <div class="frequency_settings settings_box" v-show="activeTab == 'frequency_settings'">
            <div class="tasks">
              <div class="task-type">
                <div role="radiogroup" class="el-radio-group">
                  <label
                    role="radio"
                    tabindex="-1"
                    class="el-radio-button el-radio-button--mini is-active"
                  >
                    <input
                      type="radio"
                      v-model="taskType"
                      tabindex="-1"
                      class="el-radio-button__orig-radio"
                      value="enabled"
                    >
                    <span class="el-radio-button__inner">自动运行</span>
                  </label>
                  <label
                    role="radio"
                    aria-disabled="true"
                    tabindex="-1"
                    class="el-radio-button el-radio-button--mini"
                  >
                    <input
                      type="radio"
                      v-model="taskType"
                      tabindex="-1"
                      class="el-radio-button__orig-radio"
                      value="disabled"
                    >
                    <span class="el-radio-button__inner">暂未启用</span>
                  </label>
                  <label
                    role="radio"
                    aria-disabled="true"
                    tabindex="-1"
                    v-if="newTasks && newTasks.length > 0"
                    class="el-radio-button el-radio-button--mini"
                  >
                    <input
                      type="radio"
                      v-model="taskType"
                      tabindex="-1"
                      class="el-radio-button__orig-radio"
                      value="new"
                    >
                    <div class="el-radio-button__inner">新任务</div>
                  </label>
                </div>
              </div>
              <div class="task-list">
                <div class="weui-cells weui-cells_form">
                  <div
                    class="task-item"
                    v-for="task in tasks"
                    :key="task.id"
                    @mouseover="hover = task.id"
                    @mouseleave="hover = false"
                  >
                    <div class="weui-cell weui-cell_select weui-cell_select-after">
                      <div class="weui-cell__bd job-m">
                        <span :title="task.description" v-tippy>
                          <a
                            v-if="task.platform == 'm'"
                            @click="openMobilePage(task.url)"
                          >{{task.title}}</a>
                          <a v-else :href="task.baseUrl || task.url" target="_blank">{{task.title}}</a>
                        </span>
                        <span
                          v-show="task.suspended && !task.checked"
                          v-tippy
                          title="因账号未登录任务已暂停运行"
                        >
                          <i class="job-state weui-icon-waiting-circle" @click="showLogin()"></i>
                        </span>
                        <i
                          v-show="task.checked"
                          v-tippy
                          :title="task.checkin_description"
                          class="today weui-icon-success-circle"
                        ></i>
                        <i
                          v-show="!task.checked && !task.suspended && !task.new"
                          @click="retryTask(task)"
                          class="reload-icon"
                          v-tippy
                          :title="task.last_run_description"
                        ></i>
                      </div>
                      <div class="weui-cell__bd">
                        <select
                          class="weui-select"
                          @change="taskFrequencyUpdate(task, $event)"
                          v-model="task.frequency"
                          :name="`job${task.id}_frequency`"
                        >
                          <option
                            v-for="option in task.frequencyOption"
                            :value="option"
                            :key="`${task.id}${option}`"
                          >{{ frequencyOptionText[option] }}</option>
                        </select>
                        <span
                          class="enabled-task"
                          v-if="task.new"
                          @click="enabledTask(task)"
                          v-tippy
                          title="点击以启用新的任务"
                        >启用</span>
                        <i
                          v-else
                          v-show="hover == task.id"
                          class="setting-task weui-icon-info-circle"
                          @click="currentSettingTask = task.id"
                          v-tippy
                          title="查看任务设置"
                        ></i>
                      </div>
                    </div>
                    <task-setting
                      :task="task"
                      :current-task="currentSettingTask"
                      @close="currentSettingTask = null"
                    ></task-setting>
                  </div>
                </div>
              </div>
            </div>
            <vitamin/>
            <div class="tips bottom-tips">
              <p class="page__desc" v-if="notice">
                <a id="notice" @dblclick="changeTips">{{notice.text}}</a>
                <span
                  v-if="notice.type == 'reward' && notice.button"
                  class="weui-btn weui-btn_mini weui-btn_primary switch-paymethod"
                  @click="switchPaymethod('wechat', notice.target)"
                >{{notice.button}}</span>
                <a
                  v-if="notice.type == 'link' && notice.button && notice.mode != 'mobliepage'"
                  class="weui-btn weui-btn_mini weui-btn_primary"
                  target="_blank"
                  :href="notice.url"
                >{{notice.button}}</a>
                <span
                  v-if="notice.type == 'link' && notice.button && notice.mode == 'mobliepage'"
                  class="weui-btn weui-btn_mini weui-btn_primary"
                  @click="openMobilePage(notice.url)"
                  :data-url="notice.url"
                >{{notice.button}}</span>
              </p>
            </div>
          </div>
          <div class="notice_settings settings_box" v-show="activeTab == 'notice_settings'">
            <div class="weui-cells weui-cells_form">
              <div class="weui-cell weui-cell_switch">
                <div class="weui-cell__bd">不再提示领券通知</div>
                <div class="weui-cell__ft">
                  <input
                    class="weui-switch"
                    v-model="settings['mute_coupon']"
                    type="checkbox"
                    true-value="checked"
                    false-value="false"
                    @change="onSettingChange('mute_coupon', $event)"
                  >
                </div>
              </div>
              <div class="weui-cell weui-cell_switch">
                <div class="weui-cell__bd"><span
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="不在价保的浏览器通知消息中包含商品名称等信息"
                  >隐藏价保商品信息</span>
                </div>
                <div class="weui-cell__ft">
                  <input
                    class="weui-switch"
                    type="checkbox"
                    true-value="checked"
                    false-value="false"
                    v-model="settings['hide_good']"
                    @change="onSettingChange('hide_good', $event)"
                  >
                </div>
              </div>
              <div class="weui-cell weui-cell_switch">
                <div class="weui-cell__bd">
                  <span
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="开启后不再晚上12点至凌晨6点发送浏览器通知"
                  >开启夜晚防打扰</span>
                </div>
                <div class="weui-cell__ft">
                  <input
                    class="weui-switch"
                    type="checkbox"
                    true-value="checked"
                    false-value="false"
                    v-model="settings['mute_night']"
                    name="mute_night"
                    @change="onSettingChange('mute_night', $event)"
                  >
                </div>
              </div>
              <div class="weui-cell weui-cell_switch">
                <div class="weui-cell__bd">
                  <span>
                    播放提示音效
                    <i
                      id="listen"
                      @click="listenAudio = true"
                      class="weui-icon-info-circle tippy"
                      data-tippy-content="试听全部提示音效"
                    ></i>
                  </span>
                </div>
                <div class="weui-cell__ft">
                  <input
                    class="weui-switch"
                    type="checkbox"
                    true-value="checked"
                    false-value="false"
                    v-model="settings['play_audio']"
                    name="play_audio"
                    @change="onSettingChange('play_audio', $event)"
                  >
                </div>
              </div>
            </div>
            <div class="other_actions">
              <div class="recommendation">
                <h3 style="text-align: center;color: #666;">服务推荐</h3>
                <p class="recommendServices">
                  <span
                    :class="service.class"
                    v-for="service in recommendServices"
                    :key="service.title"
                  >
                    <a
                      v-if="service.type == 'dialog'"
                      href="#"
                      data-tippy-placement="top-start"
                      :data-tippy-content="service.description"
                      :style="service.linkStyle"
                      :class="service.linkClass"
                      @click="openDialog(service)"
                    >{{service.title}}</a>
                    <a
                      v-else
                      target="_blank"
                      v-tippy
                      :title="service.description"
                      :href="service.link"
                    >{{service.title}}</a>
                  </span>
                </p>
                <div class="recommendedLink">
                  <p v-for="link in recommendedLinks" :key="link.title">
                    <a
                      v-if="link.mobile"
                      @click="openMobilePage(link.url)"
                      :style="link.style"
                    >{{link.title}}</a>
                    <a
                      v-else
                      :href="link.url"
                      :style="link.style"
                      class="weui-form-preview__btn weui-form-preview__btn_primary"
                      target="_blank"
                    >{{link.title}}</a>
                  </p>
                </div>
              </div>
              <h3 style="text-align: center;color: #666;">关注京价保</h3>
              <p style="text-align: center;margin-top: -10px;">
                <a
                  href="https://t.me/jingjiabao"
                  class="weui-btn weui-btn_mini weui-btn_plain-default tippy"
                  data-tippy-placement="top-start"
                  data-tippy-content="通过电报群接收京价保的最新消息"
                  target="_blank"
                >京价保@Telegram</a>
                <a
                  @click="openWechatCard"
                  href="#"
                  class="weui-btn weui-btn_mini weui-btn_plain-default tippy"
                  data-tippy-placement="top-start"
                  data-tippy-content="关注京价保的公众号"
                >京价保公众号</a>
              </p>
            </div>
          </div>
          <div class="other_settings settings_box" v-show="activeTab == 'other_settings'">
            <div class="weui-cells weui-cells_form">
              <div class="weui-cell weui-cell_select weui-cell_select-after">
                <div class="weui-cell__bd">
                  <span
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="商品降价小于“最小价差”时将不会自动申请价保"
                  >最小价差</span>
                </div>
                <div class="weui-cell__bd">
                  <select
                    class="weui-select"
                    name="price_pro_min"
                    v-model="settings['price_pro_min']"
                    @change="onSettingChange('price_pro_min', $event)"
                  >
                    <option :value="0.1">0.1元</option>
                    <option :value="0.5">0.5元</option>
                    <option :value="1">1元</option>
                    <option :value="5">5元</option>
                  </select>
                </div>
              </div>
              <div class="weui-cell weui-cell_select weui-cell_select-after">
                <div class="weui-cell__bd">
                  <span
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="京东生鲜类价格保护时默认提供“生鲜品类券”，可手动修改为“原返”，设置本选项后京价保将为您自动选择"
                  >生鲜价保模式</span>
                </div>
                <div class="weui-cell__bd">
                  <select
                    class="weui-select"
                    name="refund_type"
                    v-model="settings['refund_type']"
                    @change="onSettingChange('refund_type', $event)"
                  >
                    <option value="1">原返</option>
                    <option value="2">限生鲜品类京券</option>
                  </select>
                </div>
              </div>
              <div class="weui-cell weui-cell_switch">
                <div class="weui-cell__bd">
                  <span
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="如果您是Plus会员，在价保时会选择使用Plus价格来做对比"
                  >我是Plus会员</span>
                </div>
                <div class="weui-cell__ft">
                  <input
                    class="weui-switch"
                    type="checkbox"
                    true-value="checked"
                    false-value="false"
                    name="is_plus"
                    v-model="settings['is_plus']"
                    @change="onSettingChange('is_plus', $event)"
                  >
                </div>
              </div>
              <div class="weui-cell weui-cell_switch">
                <div class="weui-cell__bd">
                  <span
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="开启剁手保护模式后，每次购物时京价保将向你发起灵魂质问，帮你极致省钱"
                  >剁手保护模式</span>
                </div>
                <div class="weui-cell__ft">
                  <input
                    class="weui-switch"
                    type="checkbox"
                    true-value="checked"
                    false-value="false"
                    name="hand_protection"
                    v-model="settings['hand_protection']"
                    @change="onSettingChange('hand_protection', $event)"
                  >
                </div>
              </div>
              <div class="weui-cell weui-cell_switch">
                <div class="weui-cell__bd">
                  <span
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="开启本选项后，发现商品降价有价保机会时，京价保只会发送浏览器提醒，而不会自动提交价保申请（不推荐开启此选项）"
                  >被动价保模式</span>
                </div>
                <div class="weui-cell__ft">
                  <input
                    class="weui-switch"
                    type="checkbox"
                    true-value="checked"
                    false-value="false"
                    name="prompt_only"
                    v-model="settings['prompt_only']"
                    @change="onSettingChange('prompt_only', $event)"
                  >
                </div>
              </div>
              <div class="weui-cell weui-cell_switch">
                <div class="weui-cell__bd">
                  <span
                    v-tippy
                    title="在右侧“最近订单”中京价保提供的商品链接包含了京东联盟的跳转，它不会影响你，却能给开发者提供一些收入，帮助京价保保持更新。"
                  >停用最近订单的链接</span>
                </div>
                <div class="weui-cell__ft">
                  <input
                    class="weui-switch"
                    type="checkbox"
                    true-value="checked"
                    false-value="false"
                    @change="onSettingChange('disabled_link', $event)"
                    v-model="settings['disabled_link']"
                    name="disabled_link"
                  >
                </div>
              </div>
              <div class="weui-cell weui-cell_switch">
                <div class="weui-cell__bd">
                  <span
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="停用价格走势功能将停止上报京价保在本地获取到的商品价格同时停止展示价格走势图"
                  >停用价格走势图</span>
                </div>
                <div class="weui-cell__ft">
                  <input
                    class="weui-switch"
                    type="checkbox"
                    true-value="checked"
                    false-value="false"
                    name="disable_pricechart"
                    v-model="settings['disable_pricechart']"
                    @change="onSettingChange('disable_pricechart', $event)"
                  >
                </div>
              </div>
            </div>
            <div class="other_actions">
              <p class="help_btns" style="text-align: center;">
                <span class="el-tag el-tag--success">
                  <a
                    href="#"
                    id="openFeedback"
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="向作者提供功能建议或京东活动的地址，帮助京价保及时更新"
                  >建议反馈</a>
                </span>
                <span class="el-tag el-tag--warning">
                  <a
                    href="https://blog.jjb.im/faq.html"
                    target="_blank"
                    data-tippy-placement="top-start"
                    class="tippy"
                    data-tippy-content="了解一些常见问题的解答"
                  >常见问题</a>
                </span>
              </p>
              <p style="text-align: center;">
                <a
                  href="#"
                  id="clearAccount"
                  @click="clearAccount"
                  class="weui-btn weui-btn_mini weui-btn_plain-default tippy"
                  data-tippy-placement="top-start"
                  data-tippy-content="在登录时勾选记住密码可保存新的密码"
                >清除账号密码和记录</a>
              </p>
            </div>
            <p class="text-tips version">当前版本：{{currentVersion}}</p>
          </div>
        </form>
      </div>
    </div>
    <div class="bottom-box">
      <div class="avatar">
        <a
          id="loginState"
          :class="`${loginState.class} login-state`"
          v-tippy
          @click="showLogin()"
          :title="loginState.description"
        ></a>
      </div>
      <div class="action-list">
        <span class="el-tag el-tag--success">
          <a
            href="#"
            class="switch-paymethod tippy"
            @click="switchPaymethod('wechat', 'ming')"
            data-tippy-placement="top-start"
            data-tippy-content="打赏开发者"
          >打赏开发者</a>
        </span>
        <span class="el-tag el-tag--danger" style="margin-left: 3px;">
          <a
            href="#"
            class="switch-paymethod"
            @click="switchPaymethod('alipay', 'redpack')"
            title="天天领支付宝红包"
            v-tippy
          >支付宝红包</a>
        </span>
        <links></links>
      </div>
    </div>
    <support
      v-if="showSupport"
      @close="showSupport = false"
      :initialPaymethod="paymethod"
      :initialTarget="target"
    ></support>
    <!-- 试听音效 -->
    <div id="listenAudio" v-if="listenAudio">
      <div class="js_dialog" style="opacity: 1;">
        <div class="weui-mask"></div>
        <div class="weui-dialog">
          <div class="weui-dialog__hd">
            <strong class="weui-dialog__title">试听语言提示</strong>
          </div>
          <div class="weui-dialog__bd">
            <div class="weui-cells">
              <div class="weui-cell weui-cell_access">
                <div
                  class="weui-cell__bd message listenVoice"
                  @click="listenVoice('priceProtectionNotice', 'jiabao')"
                >
                  <span>
                    <i class="notice jiabao"></i>发现价格保护机会
                  </span>
                </div>
                <div class="weui-cell__ft"></div>
              </div>
              <div class="weui-cell weui-cell_access">
                <div
                  class="weui-cell__bd message listenVoice"
                  @click="listenVoice('checkin_notice', 'bean')"
                >
                  <span>
                    <i class="checkin_notice bean"></i>签到成功，京豆入账
                  </span>
                </div>
                <div class="weui-cell__ft"></div>
              </div>
              <div class="weui-cell weui-cell_access">
                <div
                  class="weui-cell__bd message listenVoice"
                  @click="listenVoice('checkin_notice', 'coin')"
                >
                  <span>
                    <i class="checkin_notice coin"></i>金融签到，钢镚掉落
                  </span>
                </div>
                <div class="weui-cell__ft"></div>
              </div>
            </div>
          </div>
          <div class="weui-dialog__ft">
            <a
              class="weui-dialog__btn weui-dialog__btn_primary switch-paymethod"
              @click="() => {
                listenAudio = false;
                switchPaymethod('wechat', 'samedi')
              }"
            >
              <i class="weui-icon-success"></i>打赏声优
            </a>
            <a class="weui-dialog__btn weui-dialog__btn_default" @click="listenAudio = false">下次吧</a>
          </div>
        </div>
      </div>
    </div>
    <we-dialog
      v-if="dialog && showDialog"
      @close="showDialog = false"
      :title="dialog.title"
      :content="dialog.content"
      :className="dialog.className"
      :buttons="dialog.buttons"
    ></we-dialog>
  </div>
</template>

<script>
import { frequencyOptionText, getTasks } from "../tasks";
import { recommendServices, notices } from "../variables";
import { getSetting, saveSetting } from "../utils";
import taskSetting from "./task-setting.vue";
import support from "./support.vue";
import links from "./links.vue";
import vitamin from "./vitamin.vue";
import weDialog from "./we-dialog.vue";

const settingKeys = [
  "mute_checkin",
  "play_audio",
  "mute_night",
  "hide_good",
  "mute_coupon",
  "disable_pricechart",
  "disabled_link",
  "prompt_only",
  "hand_protection",
  "is_plus",
  "refund_type",
  "price_pro_min"
];

export default {
  name: "settings",
  props: ["loginState"],
  components: { taskSetting, support, links, vitamin, weDialog },
  data() {
    return {
      frequencyOptionText: frequencyOptionText,
      recommendServices: getSetting("recommendServices", recommendServices),
      recommendedLinks: getSetting("recommendedLinks", []),
      currentVersion: process.env.VERSION,
      scienceOnline: false,
      listenAudio: false,
      activeTab: "frequency_settings",
      taskType: "enabled",
      paymethod: "weixin",
      target: "ming",
      showSupport: false,
      currentSettingTask: null,
      taskList: [],
      hover: null,
      settings: {
        disable_pricechart: false,
        disabled_link: false,
        hand_protection: false,
        hide_good: false,
        is_plus: false,
        mute_checkin: false,
        mute_coupon: false,
        mute_night: true,
        play_audio: false,
        price_pro_min: 0.5,
        prompt_only: false,
        refund_type: "1"
      },
      dialog: {},
      showDialog: false,
      notice: {
        text: "京东页面经常更新，唯有你的支持才能让京价保保持更新。",
        type: "reward",
        target: "ming",
        button: "打赏"
      }
    };
  },
  mounted: async function() {
    this.getTaskList();
    this.changeTips();
    settingKeys.map(settingKey => {
      this.settings[settingKey] = getSetting(settingKey);
    });
    // 测试是否科学上网
    setTimeout(() => {
      this.tryGoogle();
    }, 50);
  },
  watch: {
    loginState: function(newState, oldState) {
      this.getTaskList();
    }
  },
  computed: {
    newTasks: function() {
      return this.taskList.filter(task => task.new);
    },
    tasks: function() {
      switch (this.taskType) {
        case "enabled":
          return this.taskList.filter(
            task => task.frequency != "never" && !task.new
          );
          break;
        case "disabled":
          return this.taskList.filter(task => task.frequency == "never");
          break;
        case "new":
          return this.taskList.filter(task => task.new);
          break;
        default:
          return this.taskList;
          break;
      }
    }
  },
  methods: {
    taskFrequencyUpdate: function(task, event) {
      saveSetting(`job${task.id}_frequency`, event.target.value);
      this.getTaskList();
      this.$toast.show({
        text: "设置已保存",
        time: "500" //显示的时间
      });
    },

    onSettingChange: function(settingKey, event) {
      console.log("onSettingChange", settingKey, event.target.value, event);
      let notice = null;
      let updateCallback = null;
      let value = event.target.value
      switch (settingKey) {
        case "disable_pricechart":
          notice =
            "停用价格走势功能将停止上报京价保在本地获取到的商品价格，同时也会停止展示价格走势图";
          break;
        case "prompt_only":
          notice =
            "开启本选项后，发现商品降价有价保机会时，京价保只会发送浏览器提醒，而不会自动提交价保申请";
          break;
        case "disabled_link":
          notice =
            "京价保展示的最近订单商品链接带有京东联盟的返利，使用该链接购买能给开发者提供一些收入，帮助京价保保持更新。确认要停用该链接吗？";
          updateCallback = this.updateDisableOrderLink;
          break;
        default:
          break;
      }

      // 处理 checkbox
      if (event.target.type == "checkbox") {
        if (event.target.checked) {
          value = "checked"
        } else {
          value = false
        }
      }

      if (notice && value) {
        this.$msgBox
          .showMsgBox({
            title: "选项确认",
            content: notice
          })
          .then(async val => {
            saveSetting(settingKey, value);
            if (updateCallback) updateCallback();
          })
          .catch(() => {
            setTimeout(() => {
              this.settings[settingKey] = getSetting(settingKey, 'false')
              console.log(this.settings[settingKey], this.settings)
            }, 50);
            return console.log("取消", this.settings[settingKey], getSetting(settingKey, 'false'));
          });
      } else {
        saveSetting(settingKey, value);
      }
      this.$toast.show({
        text: "设置已保存",
        time: "500" //显示的时间
      });
    },
    // 换 Tips
    changeTips: function() {
      let announcements = getSetting("announcements", []).concat(notices);
      let tip = announcements[Math.floor(Math.random() * announcements.length)];
      this.notice = tip;
    },
    switchTab: async function(tab) {
      this.activeTab = tab;
    },
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
    clearAccount: async function() {
      this.$msgBox
        .showMsgBox({
          title: "清除密码确认",
          content:
            "清除密码将移除本地存储的账号密码；清除后若需继续使用请重新登录并选择让京价保记住密码"
        })
        .then(async val => {
          localStorage.removeItem("jjb_account");
          chrome.tabs.create({
            url: "https://passport.jd.com/uc/login"
          });
          console.log("确认");
        })
        .catch(() => {
          console.log("取消清除");
        });
    },
    openWechatCard: async function() {
      this.dialog = {
        title: "关注京价保公众号",
        content: `
          <img src="http://jjbcdn.zaoshu.so/wechat/qrcode_for_gh_21550d50400c_430.jpg" class="jjb-official tippy" data-tippy-content="微信搜索“京价保”也可以关注"  alt="jjb-official" width="280">
          <p class="tips">主要发布更新通知，亦可在公众号留言向开发者反馈。</p>
        `
      };
      this.showDialog = true;
    },
    openDialog: async function(action) {
      this.dialog = {
        title: action.title,
        content: action,
        buttons: [
          {
            label: "完成",
            type: "primary"
          }
        ]
      };
      this.showDialog = true;
    },
    tryGoogle: async function() {
      try {
        let response = await fetch(
          "https://www.googleapis.com/discovery/v1/apis?name=abusiveexperiencereport"
        );
        if (response.status == "200") {
          this.scienceOnline = true;
        } else {
          this.scienceOnline = false;
        }
      } catch (error) {
        this.scienceOnline = false;
      }
    },
    // 试听通知
    listenVoice: function(type, batch) {
      chrome.runtime.sendMessage(
        {
          action: type,
          batch: batch,
          test: true,
          title: "京价保通知试听",
          content: "并没有钱，这只是假象，你不要太当真"
        },
        function(response) {
          console.log("Response: ", response);
        }
      );
    },
    showLogin: function() {
      this.$emit("show-login");
    },
    switchPaymethod: function(paymethod, target) {
      this.paymethod = paymethod;
      this.target = target;
      this.showSupport = true;
    },
    updateDisableOrderLink: function() {
      this.$emit("update-order-link");
    },
    // 任务列表
    getTaskList: async function() {
      this.taskList = getTasks();
    },
    retryTask: function(task, hideNotice = false) {
      chrome.runtime.sendMessage(
        {
          action: "runTask",
          hideNotice: hideNotice,
          taskId: task.id
        },
        response => {
          if (!hideNotice) {
            if (response.result == "success") {
              this.$toast.show({
                text: "手动运行成功",
                time: "3000"
              });
            } else if (response.result == "pause") {
              this.$toast.show({
                text: "任务已暂停运行",
                message: response.message,
                time: "3000"
              });
            } else {
              this.$toast.show({
                text: "任务暂未运行",
                message: response.message,
                time: "3000"
              });
            }
          }
        }
      );
    },
    enabledTask: function(task) {
      saveSetting(`task-${task.id}:settings`, {
        new: false
      });
      this.$toast.show({
        text: "任务启用成功",
        time: "1000"
      });
      setTimeout(() => {
        this.getTaskList();
      }, 250);
      setTimeout(() => {
        this.taskType = "enabled";
      }, 500);
    }
  }
};
</script>
<style  scoped>
.settings_box {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100vh * var(--zoom-factor) - 92px);
}

.settings .page__desc {
  font-size: 12px;
  height: 40px;
  line-height: 18px;
  color: #666;
}

.frequency_settings .weui-select {
  width: 9em;
}
.settings .task-list {
  margin-top: 5px;
  overflow-y: auto;
}

.task-item {
  position: relative;
}

.task-item:after {
  content: " ";
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  height: 1px;
  border-top: 1px solid #e5e5e5;
  color: #e5e5e5;
  -webkit-transform-origin: 0 0;
  transform-origin: 0 0;
  -webkit-transform: scaleY(0.5);
  transform: scaleY(0.5);
  left: 15px;
  z-index: 2;
}

.settings .task-list .weui-cells {
  margin-top: 0;
}

.enabled-task {
  color: #690;
  margin-left: 6px;
  cursor: pointer;
}

.setting-task {
  font-size: 19px;
  color: #6cc7f1;
  margin-left: 5px;
  margin-top: 0px;
  cursor: pointer;
}

.other_settings .other_actions {
  height: 140px;
}

.frequency_settings .weui-cell_select .weui-cell__bd:after {
  right: 60px;
}

.task-type {
  margin-top: 6px;
  text-align: center;
}
</style>
