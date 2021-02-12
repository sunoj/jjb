import { getSetting } from './utils'

export const getLoginState = function () {
  let loginState = {
    pc: getSetting('jjb_login-state_pc', {
      state: "unknown"
    }),
    m: {
      state: "unknown"
    },
    class: "unknown"
  }
  // 处理登录状态
  if (loginState.pc.state == 'alive') {
    loginState.class = "alive"
  } else if (loginState.pc.state == 'failed') {
    loginState.class = "failed"
  } else {
    loginState.class = "warning"
  }
  return loginState
}