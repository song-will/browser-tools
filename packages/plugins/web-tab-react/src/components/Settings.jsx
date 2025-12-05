import { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, Switch, Select, message, Tag, Space, Divider, Tabs, Table, Popconfirm } from 'antd'
import { SettingOutlined, SyncOutlined, DeleteOutlined } from '@ant-design/icons'
import { storageManager } from '../utils/storage'
import { getOperationLogs, clearOperationLogs } from '../utils/operationLog'

const { Option } = Select

export default function Settings({ isOpen, onClose }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [enableGithub, setEnableGithub] = useState(false)
  const [creatingGist, setCreatingGist] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState('storage')
  const [operationLogs, setOperationLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const githubToken = Form.useWatch('githubToken', form)

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const loadSettings = async () => {
    try {
      const config = await storageManager.getStorageConfig()
      const bgSettings = await storageManager.get('background_settings')
      
      const githubEnabled = config?.enableGithub || false
      form.setFieldsValue({
        enableGithub: githubEnabled,
        githubToken: config?.token || '',
        githubGistId: config?.gistId || '',
        backgroundType: bgSettings?.type || 'video',
        backgroundImage: bgSettings?.image || '',
        backgroundVideo: bgSettings?.video || '',
      })
      setEnableGithub(githubEnabled)
    } catch (error) {
      console.error('[Settings] Load error:', error)
    }
  }

  const handleFinish = async (values) => {
    setLoading(true)
    
    try {
      // 保存存储设置
      if (values.enableGithub) {
        if (!values.githubToken?.trim()) {
          message.error('请输入 GitHub Token')
          setLoading(false)
          return
        }

        const config = {
          enableGithub: true,
          token: values.githubToken.trim(),
          gistId: values.githubGistId?.trim() || null
        }

        await storageManager.setStorageConfig(config)
      } else {
        await storageManager.setStorageConfig({ enableGithub: false })
      }

      // 保存背景设置
      const bgSettings = {
        type: values.backgroundType,
        image: values.backgroundImage,
        video: values.backgroundVideo
      }

      await storageManager.set('background_settings', bgSettings)
      
      // 触发背景更新事件
      window.dispatchEvent(new CustomEvent('backgroundChanged', { detail: bgSettings }))
      
      message.success('设置已保存')
      // 保存成功后自动关闭弹窗
      onClose()
    } catch (error) {
      console.error('[Settings] Save error:', error)
      message.error('保存失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGist = async () => {
    const token = form.getFieldValue('githubToken')?.trim()
    if (!token) {
      message.error('请先填写 GitHub Token')
      return
    }

    setCreatingGist(true)
    try {
      const timestamp = Date.now()
      const description = `web-tab-${timestamp}`
      
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description,
          public: false,
          files: {
            'placeholder.json': {
              content: JSON.stringify({ placeholder: true }, null, 2)
            }
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create gist: ${response.statusText}`)
      }

      const gist = await response.json()
      form.setFieldValue('githubGistId', gist.id)
      message.success('Gist 创建成功')
    } catch (error) {
      console.error('[Settings] Create gist error:', error)
      message.error('创建失败: ' + error.message)
    } finally {
      setCreatingGist(false)
    }
  }

  const handleSyncFromGithub = async () => {
    setSyncing(true)
    try {
      const result = await storageManager.syncFromGithub()
      const logInfo = result.logs ? `，操作日志: ${result.logs.merged} 条` : ''
      message.success(`同步成功！快捷方式: ${result.shortcuts.merged} 条，待办事项: ${result.todos.merged} 条${logInfo}`)
      // 触发页面刷新（通过事件）
      window.dispatchEvent(new CustomEvent('dataSynced'))
      // 如果当前在日志标签页，刷新日志列表
      if (activeTab === 'logs') {
        await loadOperationLogs()
      }
    } catch (error) {
      console.error('[Settings] Sync error:', error)
      message.error('同步失败: ' + error.message)
    } finally {
      setSyncing(false)
    }
  }

  const loadOperationLogs = async () => {
    setLoadingLogs(true)
    try {
      const logs = await getOperationLogs()
      setOperationLogs(logs)
    } catch (error) {
      console.error('[Settings] Load logs error:', error)
      message.error('加载操作日志失败')
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleClearLogs = async () => {
    try {
      await clearOperationLogs()
      setOperationLogs([])
      message.success('操作日志已清空')
    } catch (error) {
      console.error('[Settings] Clear logs error:', error)
      message.error('清空日志失败')
    }
  }

  useEffect(() => {
    if (isOpen && activeTab === 'logs') {
      loadOperationLogs()
    }
  }, [isOpen, activeTab])

  return (
    <>
      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>设置</span>
          </Space>
        }
        open={isOpen}
        onCancel={onClose}
        footer={null}
        width={640}
        styles={{
          body: {
            paddingRight: 8,
          }
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'storage',
              label: '存储设置',
              children: (
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleFinish}
                >
                  {/* 存储设置 */}
                  <div style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>存储设置</h3>
            
            <div style={{ 
              padding: 12, 
              marginBottom: 16, 
              borderRadius: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.02)'
            }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <span style={{ fontWeight: 500 }}>Chrome Storage</span>
                  <Tag color="success">默认启用</Tag>
                </Space>
                <Button
                  type="link"
                  size="small"
                  onClick={async () => {
                    try {
                      await storageManager.debug()
                      message.info('调试信息已输出到控制台，请按 F12 查看')
                    } catch (error) {
                      console.error('[Settings] Debug error:', error)
                      message.error('调试失败: ' + error.message)
                    }
                  }}
                  style={{ padding: 0, height: 'auto', fontSize: 12 }}
                >
                  查看存储数据
                </Button>
              </Space>
              <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginTop: 4 }}>
                数据将立即保存到本地 Chrome Storage，快速可靠
              </div>
            </div>

            <Form.Item
              name="enableGithub"
              valuePropName="checked"
            >
              <Space>
                <Switch 
                  checked={enableGithub}
                  onChange={(checked) => {
                    setEnableGithub(checked)
                    form.setFieldValue('enableGithub', checked)
                  }}
                />
                <span>GitHub Gist 同步（可选）</span>
              </Space>
              <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginTop: 4, marginLeft: 28 }}>
                启用后，数据变更会在 2 秒后自动同步到 GitHub Gist，实现跨设备数据同步
              </div>
            </Form.Item>

            <Form.Item
              name="githubToken"
              label="GitHub Token"
              rules={enableGithub ? [{ required: true, message: '请输入 GitHub Token' }] : []}
              extra={
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12 }}
                >
                  如何获取 Token？
                </a>
              }
            >
              <Input.Password 
                placeholder="ghp_xxxxxxxxxxxx" 
                disabled={!enableGithub}
              />
            </Form.Item>
            <Form.Item
              name="githubGistId"
              label={
                <Space>
                  <span>Gist ID</span>
                  {enableGithub && githubToken?.trim() && (
                    <Button
                      type="link"
                      size="small"
                      onClick={handleCreateGist}
                      loading={creatingGist}
                      style={{ padding: 0, height: 'auto' }}
                    >
                      创建
                    </Button>
                  )}
                </Space>
              }
              rules={enableGithub ? [{ required: true, message: '请输入 Gist ID 或点击创建按钮创建' }] : []}
            >
              <Input 
                placeholder="请输入 Gist ID 或点击创建按钮创建" 
                disabled={!enableGithub}
              />
            </Form.Item>

            {enableGithub && (
              <Form.Item>
                <Button
                  type="primary"
                  icon={<SyncOutlined />}
                  onClick={handleSyncFromGithub}
                  loading={syncing}
                  block
                >
                  立即同步
                </Button>
                <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginTop: 4 }}>
                  从 GitHub Gist 拉取最新数据并合并到本地
                </div>
              </Form.Item>
            )}
          </div>

          <Divider />

          {/* 背景设置 */}
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>背景设置</h3>
            
            <Form.Item
              name="backgroundType"
              label="背景类型"
            >
              <Select>
                <Option value="image">图片</Option>
                <Option value="video">视频</Option>
              </Select>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.backgroundType !== currentValues.backgroundType}
            >
              {({ getFieldValue }) => {
                const backgroundType = getFieldValue('backgroundType')
                return (
                  <>
                    {backgroundType === 'image' && (
                      <Form.Item
                        name="backgroundImage"
                        label="图片 URL"
                      >
                        <Input placeholder="https://example.com/image.jpg" />
                      </Form.Item>
                    )}
                    {backgroundType === 'video' && (
                      <Form.Item
                        name="backgroundVideo"
                        label="视频 URL"
                      >
                        <Input placeholder="https://example.com/video.mp4" />
                      </Form.Item>
                    )}
                  </>
                )
              }}
            </Form.Item>
          </div>

                  <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                      保存设置
                    </Button>
                  </Form.Item>
                </Form>
              )
            },
            {
              key: 'logs',
              label: '操作日志',
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.45)' }}>
                      共 {operationLogs.length} 条记录
                    </span>
                    <Popconfirm
                      title="确定要清空所有操作日志吗？"
                      onConfirm={handleClearLogs}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                      >
                        清空日志
                      </Button>
                    </Popconfirm>
                  </div>
                  <Table
                    dataSource={operationLogs}
                    loading={loadingLogs}
                    pagination={{ pageSize: 20 }}
                    scroll={{ y: 400 }}
                    columns={[
                      {
                        title: '时间',
                        dataIndex: 'timestamp',
                        key: 'timestamp',
                        width: 160,
                        render: (timestamp) => {
                          if (!timestamp) return '-'
                          const date = new Date(timestamp)
                          return date.toLocaleString('zh-CN')
                        }
                      },
                      {
                        title: '操作类型',
                        dataIndex: 'type',
                        key: 'type',
                        width: 120,
                        render: (type) => {
                          const typeMap = {
                            'add_shortcut': '添加快捷方式',
                            'edit_shortcut': '编辑快捷方式',
                            'delete_shortcut': '删除快捷方式',
                            'create_group': '创建组',
                            'edit_group_name': '编辑组名',
                            'delete_group': '删除组',
                            'add_to_group': '添加到组',
                            'remove_from_group': '从组移除',
                            'add_todo': '添加待办',
                            'toggle_todo': '切换待办状态',
                            'delete_todo': '删除待办'
                          }
                          return typeMap[type] || type
                        }
                      },
                      {
                        title: 'IP',
                        dataIndex: 'ip',
                        key: 'ip',
                        width: 110
                      },
                      {
                        title: '客户端',
                        dataIndex: 'client',
                        key: 'client',
                        width: 140,
                        render: (client) => {
                          if (!client) return '-'
                          return `${client.browser || '未知'} / ${client.platform || '未知'}`
                        }
                      }
                    ]}
                    rowKey="id"
                    size="small"
                  />
                </div>
              )
            }
          ]}
        />
      </Modal>
    </>
  )
}
