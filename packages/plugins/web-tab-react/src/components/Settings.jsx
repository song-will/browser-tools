import { useState } from 'react'
import { Modal, Space, Tabs } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import StorageSettings from './StorageSettings'
import BackgroundSettings from './BackgroundSettings'
import OperationLogs from './OperationLogs'

export default function Settings({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('storage')

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
              children: <StorageSettings />
            },
            {
              key: 'background',
              label: '背景设置',
              children: <BackgroundSettings />
            },
            {
              key: 'logs',
              label: '操作日志',
              children: <OperationLogs />
            }
          ]}
        />
      </Modal>
    </>
  )
}
