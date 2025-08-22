// 告警设置
export interface AlertRule {
  enabled: boolean
  warning: number
  critical: number
}

// 告警规则
export interface AlertRules {
  cpu: AlertRule
  memory: AlertRule
  disk: AlertRule
}

// 邮件通知
export interface EmailNotification {
  enabled: boolean
  smtp: string
  port: number
  security: string
  from: string
  to: string
}

// 企业微信通知
export interface WechatNotification {
  enabled: boolean
  webhook: string
  mentioned: string
}

// 告警通知设置
export interface Notifications {
  email: EmailNotification
  wechat: WechatNotification
}
