import { useState, useEffect } from 'react'
import { Form, Input, Button, Select, message } from 'antd'
import { storageManager } from '../utils/storage'

const { Option } = Select

export default function BackgroundSettings() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSettings = async () => {
    try {
      const bgSettings = await storageManager.get('background_settings')
      form.setFieldsValue({
        backgroundType: bgSettings?.type || 'video',
        backgroundImage: bgSettings?.image || '',
        backgroundVideo: bgSettings?.video || '',
      })
    } catch (error) {
      console.error('[BackgroundSettings] Load error:', error)
    }
  }

  const handleFinish = async (values) => {
    setLoading(true)
    
    try {
      // 保存背景设置
      const bgSettings = {
        type: values.backgroundType,
        image: values.backgroundImage,
        video: values.backgroundVideo
      }

      await storageManager.set('background_settings', bgSettings)
      
      // 触发背景更新事件
      window.dispatchEvent(new CustomEvent('backgroundChanged', { detail: bgSettings }))
      
      message.success('背景设置已保存')
    } catch (error) {
      console.error('[BackgroundSettings] Save error:', error)
      message.error('保存失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
    >
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
}

