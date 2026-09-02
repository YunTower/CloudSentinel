import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requester, calls } = vi.hoisted(() => {
  const calls: Array<{ method: string; args: unknown[]; result: { meta?: unknown } }> = []
  const requester = Object.fromEntries(['Get','Post','Patch','Delete'].map((method) => [method, vi.fn((...args: unknown[]) => {
    const result: { meta?: unknown } = {}; calls.push({ method, args, result }); return result
  })]))
  return { requester, calls }
})
vi.mock('@/admin/utils/requester.ts', () => ({ requester }))

import authApi from './auth'
import incidentsApi from './incidents'
import serversApi from './servers'
import monitorsApi from './service-monitors'
import alertsApi from './settings/alerts'
import panelApi from './settings/panel'
import permissionsApi from './settings/permissions'
import publicPagesApi from './settings/public-pages'
import updateApi from './update'

function lastCall() { return calls[calls.length - 1] }
function expectCall(method: string, ...args: unknown[]) { expect(lastCall()).toMatchObject({ method, args }) }

describe('管理端 API 契约', () => {
  beforeEach(() => { calls.length = 0; vi.clearAllMocks() })

  it('认证接口使用正确方法、载荷与用途元数据', () => {
    const login = authApi.login('admin','secret','alice',true); expectCall('Post','/auth/login',{ type:'admin',password:'secret',username:'alice',remember:true }); expect(login.meta).toEqual({ authRole:'login' })
    const logout = authApi.logout(); expectCall('Post','/auth/logout'); expect(logout.meta).toEqual({ authRole:'logout' })
    const refresh = authApi.refreshToken(); expectCall('Post','/auth/refresh'); expect(refresh.meta).toEqual({ authRole:'refreshToken' })
    authApi.checkLogin(); expectCall('Get','/auth/check'); authApi.csrfToken(); expectCall('Get','/auth/csrf')
  })

  it('服务器 CRUD、密钥、Agent 操作与分组接口路径稳定', () => {
    const form = { name:'node' } as never
    serversApi.createServer(form); expectCall('Post','/servers',form)
    serversApi.getServers(); expectCall('Get','/servers'); serversApi.getServers(3); expectCall('Get','/servers?group_id=3')
    serversApi.getServerDetail('a/b',true); expectCall('Get','/servers/a/b?reveal_agent_key=true')
    serversApi.updateServer('s1',form); expectCall('Patch','/servers/s1',form); serversApi.deleteServer('s1'); expectCall('Delete','/servers/s1')
    serversApi.restartService('s1'); expectCall('Post','/servers/s1/agent/restart'); serversApi.updateAgent('s1'); expectCall('Post','/servers/s1/agent/update'); serversApi.resetAgentKey('s1'); expectCall('Post','/servers/s1/agent/reset-key')
    serversApi.getGroups(); expectCall('Get','/servers/groups'); serversApi.createGroup({name:'华东'}); expectCall('Post','/servers/groups',{name:'华东'})
    serversApi.updateGroup(2,{name:'华南'}); expectCall('Patch','/servers/groups/2',{name:'华南'}); serversApi.deleteGroup(2); expectCall('Delete','/servers/groups/2')
  })

  it('四类指标查询只附加已提供的时间范围', () => {
    serversApi.getServerMetricsCPU('s','start','end'); expectCall('Get','/servers/s/metrics/cpu?start=start&end=end')
    serversApi.getServerMetricsMemory('s',undefined,'end'); expectCall('Get','/servers/s/metrics/memory?end=end')
    serversApi.getServerMetricsDisk('s'); expectCall('Get','/servers/s/metrics/disk')
    serversApi.getServerMetricsNetwork('s','a b'); expectCall('Get','/servers/s/metrics/network?start=a+b')
  })

  it('服务器告警规则和复制载荷保持后端字段名', () => {
    serversApi.getServerAlertRules('s'); expectCall('Get','/servers/s/alert-rules')
    serversApi.copyAlertRules('source',['a','b'],['cpu','memory']); expectCall('Post','/servers/alert-rules/copy',{ source_server_id:'source',target_server_ids:['a','b'],rule_types:['cpu','memory'] })
  })

  it('事件时间线接口覆盖列表、公开范围、维护创建更新与解决', () => {
    incidentsApi.getAll(); expectCall('Get','/incidents'); incidentsApi.getPublic({path:'/public'}); expectCall('Get','/public/incidents',{params:{path:'/public'}})
    const create={title:'维护',message:'开始'}; incidentsApi.createMaintenance(create); expectCall('Post','/incidents/maintenance',create)
    incidentsApi.addMaintenanceUpdate(7,{message:'进展'}); expectCall('Post','/incidents/7/updates',{message:'进展'})
    incidentsApi.resolveMaintenance(7,{message:'完成'}); expectCall('Post','/incidents/7/resolve',{message:'完成'})
  })

  it('服务监测接口覆盖 CRUD、原始结果和多 AI 模型载荷', () => {
    const form = { name:'模型',group_name:'AI',target:'https://api.example',ai_api_format:'responses',ai_models:['a','b'],ai_api_key:'key',interval:30,timeout:10,enabled:true,failure_threshold:2,recovery_threshold:2 } as never
    monitorsApi.getAll(); expectCall('Get','/service-monitors'); monitorsApi.getPublic(); expectCall('Get','/public/service-monitors')
    monitorsApi.create(form); expectCall('Post','/service-monitors',form); monitorsApi.update(2,{name:'新'}); expectCall('Patch','/service-monitors/2',{name:'新'})
    monitorsApi.getResults(2); expectCall('Get','/service-monitors/2/results',{params:{limit:100}}); monitorsApi.delete(2); expectCall('Delete','/service-monitors/2')
    monitorsApi.createAIModels(form); expect(lastCall().method).toBe('Post'); expect(lastCall().args[0]).toBe('/service-monitors/ai-models'); expect(lastCall().args[1]).toEqual(expect.objectContaining({name_prefix:'模型',ai_models:['a','b'],ai_api_key:'key'}))
  })

  it('设置、告警和更新入口覆盖所有管理功能', () => {
    panelApi.getPanelSettings(); expectCall('Get','/settings/panel'); panelApi.savePanelSettings({} as never); expectCall('Patch','/settings/panel',{})
    const visitor=panelApi.getPublicSettings(); expectCall('Get','/settings/public'); expect(visitor.meta).toEqual({isVisitor:true})
    panelApi.checkUpdate(); expectCall('Get','/update/check'); panelApi.getUpdateStatus(); expectCall('Get','/update/status'); panelApi.updatePanel(); expectCall('Post','/update')
    alertsApi.getAlertsSettings(); expectCall('Get','/settings/alerts'); alertsApi.saveAlertsSettings({} as never); expectCall('Patch','/settings/alerts',{})
    alertsApi.testAlertSettings({} as never); expectCall('Post','/settings/alerts/test',{}); alertsApi.previewAlertTemplates({} as never); expectCall('Post','/settings/alerts/templates/preview',{})
    permissionsApi.getPermissionsSettings(); expectCall('Get','/settings/permissions'); permissionsApi.savePermissionsSettings({} as never); expectCall('Patch','/settings/permissions',{})
    publicPagesApi.getPublicPagesSettings(); expectCall('Get','/settings/public-pages'); publicPagesApi.savePublicPagesSettings({} as never); expectCall('Patch','/settings/public-pages',{})
    updateApi.checkAgentVersion(); expectCall('Get','/update/agent/check')
  })
})
