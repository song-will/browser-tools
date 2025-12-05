import { useState, useEffect } from 'react'
import { Form, Input, Button, Switch, message, Tag, Space } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import { storageManager } from '../utils/storage'

export default function StorageSettings() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [enableGithub, setEnableGithub] = useState(false)
  const [creatingGist, setCreatingGist] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const githubToken = Form.useWatch('githubToken', form)

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSettings = async () => {
    try {
      const config = await storageManager.getStorageConfig()
      const githubEnabled = config?.enableGithub || false
      form.setFieldsValue({
        enableGithub: githubEnabled,
        githubToken: config?.token || '',
        githubGistId: config?.gistId || '',
      })
      setEnableGithub(githubEnabled)
    } catch (error) {
      console.error('[StorageSettings] Load error:', error)
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
      
      message.success('存储设置已保存')
    } catch (error) {
      console.error('[StorageSettings] Save error:', error)
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
      console.error('[StorageSettings] Create gist error:', error)
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
      message.success('同步成功！')
      console.log(`同步成功！快捷方式: ${result.shortcuts.merged} 条，待办事项: ${result.todos.merged} 条${logInfo}`)
      // 触发页面刷新（通过事件）
      window.dispatchEvent(new CustomEvent('dataSynced'))
    } catch (error) {
      console.error('[StorageSettings] Sync error:', error)
      message.error('同步失败: ' + error.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
    >
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
                  console.error('[StorageSettings] Debug error:', error)
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

      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" block loading={loading}>
          保存设置
        </Button>
      </Form.Item>
    </Form>
  )
}

