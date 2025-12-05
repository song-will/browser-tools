import { useState, useEffect } from 'react'
import { Table, Button, Popconfirm, message } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { getOperationLogs, clearOperationLogs } from '../utils/operationLog'

export default function OperationLogs() {
  const [operationLogs, setOperationLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    loadOperationLogs()
    
    // 监听数据同步事件，同步后刷新日志
    const handleDataSynced = () => {
      loadOperationLogs()
    }
    window.addEventListener('dataSynced', handleDataSynced)
    
    return () => {
      window.removeEventListener('dataSynced', handleDataSynced)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadOperationLogs = async () => {
    setLoadingLogs(true)
    try {
      const logs = await getOperationLogs()
      setOperationLogs(logs)
    } catch (error) {
      console.error('[OperationLogs] Load logs error:', error)
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
      console.error('[OperationLogs] Clear logs error:', error)
      message.error('清空日志失败')
    }
  }

  return (
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

