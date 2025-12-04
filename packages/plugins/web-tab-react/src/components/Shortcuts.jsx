import { useState, useEffect, useRef } from 'react'
import { Card, Button, Input, Space, Popconfirm, Spin, Dropdown, theme, Modal, Form, Popover } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons'
import { storageManager } from '../utils/storage'

const { useToken } = theme

const defaultIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAxLjVjLTEuNzQgMC0zLjI3LjgxLTQuMyAyLjA1bC0uMTcuMTljLS40My40OC0uNzMgMS4wNS0uODggMS42N0M2LjQ0IDUuODQgNiA3LjM0IDYgOXMyLjAxIDYgNiA2IDYtMi42OSA2LTZjMC0xLjY2LS40NC0zLjE2LTEuMTctNC4zMy0uMTUtLjYyLS40NS0xLjE5LS44OC0xLjY3bC0uMTctLjE5QzE1LjI3IDIuMzEgMTMuNzQgMS41IDEyIDEuNXptMCAxOGMtMi4yMSAwLTQtMS43OS00LTRzMS43OS00IDQtNCA0IDEuNzkgNCA0LTEuNzkgNC00IDR6Ii8+PC9zdmc+'

const defaultShortcuts = [
  { id: 1, name: "GitHub", url: "https://github.com", icon: "https://github.githubassets.com/favicons/favicon.svg" },
  { id: 2, name: "Gmail", url: "https://mail.google.com", icon: "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png" },
  { id: 3, name: "YouTube", url: "https://youtube.com", icon: "https://www.youtube.com/s/desktop/d5c6f5f4/img/favicon_48x48.png" },
  { id: 4, name: "知乎", url: "https://zhihu.com", icon: "https://static.zhihu.com/heifetz/favicon.ico" },
  { id: 5, name: "B站", url: "https://bilibili.com", icon: "https://www.bilibili.com/favicon.ico" }
]

export default function Shortcuts() {
  const { token } = useToken()
  const [shortcuts, setShortcuts] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [openGroupId, setOpenGroupId] = useState(null)
  const [draggedFromGroup, setDraggedFromGroup] = useState(null) // { groupId, itemId }
  const [editingGroupName, setEditingGroupName] = useState(null) // groupId
  const [groupNameInput, setGroupNameInput] = useState('')
  const scrollRef = useRef(null)
  const scrollTimeoutRef = useRef(null)

  useEffect(() => {
    loadShortcuts()
  }, [])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const handleScroll = () => {
      scrollElement.classList.add('scrolling')
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        scrollElement.classList.remove('scrolling')
      }, 1000)
    }

    scrollElement.addEventListener('scroll', handleScroll)
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const loadShortcuts = async () => {
    try {
      await storageManager.init()
      const saved = await storageManager.get('shortcuts')
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setShortcuts(saved)
      } else {
        setShortcuts(defaultShortcuts)
        await storageManager.set('shortcuts', defaultShortcuts)
      }
    } catch (error) {
      console.error('[Shortcuts] Load error:', error)
      setShortcuts(defaultShortcuts)
    } finally {
      setLoading(false)
    }
  }

  const saveShortcuts = async (newShortcuts) => {
    try {
      await storageManager.set('shortcuts', newShortcuts)
      setShortcuts(newShortcuts)
    } catch (error) {
      console.error('[Shortcuts] Save error:', error)
    }
  }

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (shortcut) => {
    setEditingId(shortcut.id)
    form.setFieldsValue({
      name: shortcut.name,
      url: shortcut.url,
      icon: shortcut.icon || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    const newShortcuts = shortcuts.filter(s => s.id !== id)
    await saveShortcuts(newShortcuts)
  }

  const handleDeleteFromGroup = async (groupId, itemId) => {
    const newShortcuts = shortcuts.map(s => {
      if (s.id === groupId && s.isGroup) {
        const newItems = s.items.filter(item => item.id !== itemId)
        if (newItems.length === 1) {
          // 如果组里只剩一个，就变成单个快捷方式
          return newItems[0]
        } else if (newItems.length === 0) {
          // 如果组里没有项目了，删除整个组
          return null
        }
        return { ...s, items: newItems }
      }
      return s
    }).filter(Boolean)
    await saveShortcuts(newShortcuts)
  }

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      await handleDelete(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const { name, url, icon } = values

      // 验证 URL 格式
      let finalUrl = url.trim()
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl
      }

      let newShortcuts
      if (editingId === null) {
        // 添加新快捷方式
        const newId = Math.max(...shortcuts.map(s => s.id), 0) + 1
        newShortcuts = [...shortcuts, { id: newId, name: name.trim(), url: finalUrl, icon: icon?.trim() || defaultIcon }]
      } else {
        // 编辑现有快捷方式
        newShortcuts = shortcuts.map(s => {
          if (s.id === editingId) {
            if (s.isGroup) {
              // 编辑组时，只更新组的显示名称（使用第一个项目的名称）
              return s
            }
            return { ...s, name: name.trim(), url: finalUrl, icon: icon?.trim() || defaultIcon }
          }
          return s
        })
      }

      await saveShortcuts(newShortcuts)
      setIsModalOpen(false)
      setEditingId(null)
      form.resetFields()
    } catch (error) {
      console.error('[Shortcuts] Validation error:', error)
    }
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    setEditingId(null)
    form.resetFields()
  }

  const handleDragStart = (e, id) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', id)
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggedId) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e, targetId) => {
    e.preventDefault()
    setDragOverId(null)

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDraggedFromGroup(null)
      return
    }

    let draggedItem
    let newShortcuts = [...shortcuts]

    // 如果是从组中拖出的
    if (draggedFromGroup) {
      const group = shortcuts.find(s => s.id === draggedFromGroup.groupId)
      if (group && group.isGroup) {
        draggedItem = group.items.find(item => item.id === draggedFromGroup.itemId)
        // 先从组中移除
        newShortcuts = newShortcuts.map(s => {
          if (s.id === draggedFromGroup.groupId && s.isGroup) {
            const newItems = s.items.filter(item => item.id !== draggedFromGroup.itemId)
            if (newItems.length === 1) {
              // 如果组里只剩一个，就变成单个快捷方式
              return newItems[0]
            } else if (newItems.length === 0) {
              // 如果组里没有项目了，删除整个组
              return null
            }
            return { ...s, items: newItems }
          }
          return s
        }).filter(Boolean)
      }
    } else {
      draggedItem = shortcuts.find(s => s.id === draggedId)
    }

    if (!draggedItem) {
      setDraggedId(null)
      setDraggedFromGroup(null)
      return
    }

    const targetItem = newShortcuts.find(s => s.id === targetId)

    if (!targetItem) {
      setDraggedId(null)
      setDraggedFromGroup(null)
      return
    }

    if (targetItem.isGroup) {
      // 拖到组上，加入组
      const draggedItemCopy = { ...draggedItem }
      newShortcuts = newShortcuts.map(s => {
        if (s.id === targetId) {
          return { ...s, items: [...s.items, draggedItemCopy] }
        }
        return s
      })
      // 如果不是从组中拖出的，需要移除原来的快捷方式
      if (!draggedFromGroup) {
        newShortcuts = newShortcuts.filter(s => s.id !== draggedId)
      }
    } else {
      // 拖到单个快捷方式上，形成组
      const newGroupId = Math.max(...newShortcuts.map(s => s.id), 0) + 1
      const draggedItemCopy = { ...draggedItem }
      const targetItemCopy = { ...targetItem }
      
      newShortcuts = newShortcuts.map(s => {
        if (s.id === targetId) {
          return {
            id: newGroupId,
            isGroup: true,
            items: [targetItemCopy, draggedItemCopy]
          }
        }
        return s
      })
      // 如果不是从组中拖出的，需要移除原来的快捷方式
      if (!draggedFromGroup) {
        newShortcuts = newShortcuts.filter(s => s.id !== draggedId)
      }
    }

    await saveShortcuts(newShortcuts)
    setDraggedId(null)
    setDraggedFromGroup(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
    setDraggedFromGroup(null)
  }

  const handleDragFromGroup = (e, groupId, itemId) => {
    setDraggedId(itemId)
    setDraggedFromGroup({ groupId, itemId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', itemId)
  }

  const handleGroupNameChange = async (groupId, newName) => {
    const newShortcuts = shortcuts.map(s => {
      if (s.id === groupId && s.isGroup) {
        return { ...s, name: newName.trim() || null }
      }
      return s
    })
    await saveShortcuts(newShortcuts)
    setEditingGroupName(null)
    setGroupNameInput('')
  }

  const startEditGroupName = (groupId, currentName) => {
    setEditingGroupName(groupId)
    setGroupNameInput(currentName || '')
  }

  const getContextMenuItems = (item) => {
    if (item.isGroup) {
      return [
        {
          key: 'editName',
          label: '编辑组名',
          icon: <EditOutlined />,
          onClick: () => startEditGroupName(item.id, item.name),
        },
        {
          key: 'delete',
          label: '删除组',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDeleteClick(item.id),
        },
      ]
    }
    return [
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEdit(item),
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDeleteClick(item.id),
      },
    ]
  }

  const renderShortcutItem = (item) => {
    if (item.isGroup) {
      // 渲染组
      const groupContent = (
        <div style={{ padding: '8px', minWidth: '200px' }}>
          {/* 组名编辑 */}
          <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${token.colorBorder}` }}>
            {editingGroupName === item.id ? (
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="组名"
                  onPressEnter={() => handleGroupNameChange(item.id, groupNameInput)}
                  autoFocus
                />
                <Button
                  type="primary"
                  onClick={() => handleGroupNameChange(item.id, groupNameInput)}
                >
                  保存
                </Button>
                <Button
                  onClick={() => {
                    setEditingGroupName(null)
                    setGroupNameInput('')
                  }}
                >
                  取消
                </Button>
              </Space.Compact>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: token.colorText }}>
                  {item.name || 'group'}({item.items.length})
                </span>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => startEditGroupName(item.id, item.name)}
                />
              </div>
            )}
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))', 
            gap: '8px' 
          }}>
            {item.items.map((groupItem) => (
              <div
                key={groupItem.id}
                draggable
                onDragStart={(e) => handleDragFromGroup(e, item.id, groupItem.id)}
                onDragEnd={handleDragEnd}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: draggedId === groupItem.id && draggedFromGroup?.groupId === item.id ? 0.5 : 1,
                  cursor: 'move',
                }}
                onMouseEnter={(e) => {
                  const deleteBtn = e.currentTarget.querySelector('.group-item-delete')
                  if (deleteBtn) deleteBtn.style.display = 'block'
                }}
                onMouseLeave={(e) => {
                  const deleteBtn = e.currentTarget.querySelector('.group-item-delete')
                  if (deleteBtn) deleteBtn.style.display = 'none'
                }}
              >
                <Button
                  className="group-item-delete"
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  size="small"
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 20,
                    height: 20,
                    minWidth: 20,
                    padding: 0,
                    display: 'none',
                    zIndex: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '50%',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteFromGroup(item.id, groupItem.id)
                  }}
                />
                <a
                  href={groupItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center no-underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: token.colorFillSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={groupItem.icon || defaultIcon}
                      alt={groupItem.name}
                      style={{ width: 32, height: 32 }}
                      onError={(e) => {
                        e.target.src = defaultIcon
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, textAlign: 'center', color: token.colorTextSecondary, marginTop: 4 }}>
                    {groupItem.name}
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      )

      return (
        <Popover
          key={item.id}
          content={groupContent}
          trigger="click"
          open={openGroupId === item.id}
          onOpenChange={(open) => setOpenGroupId(open ? item.id : null)}
        >
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item.id)}
            onDragEnd={handleDragEnd}
            className="flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-1"
            style={{
              opacity: draggedId === item.id ? 0.5 : 1,
              border: dragOverId === item.id ? `2px dashed ${token.colorPrimary}` : '2px solid transparent',
              borderRadius: '8px',
              padding: '4px',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '8px',
                border: `2px solid ${token.colorBorder}`,
                backgroundColor: token.colorFillSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                position: 'relative',
              }}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '2px',
                width: '100%',
                height: '100%',
                padding: '4px',
              }}>
                {item.items.slice(0, 4).map((groupItem) => (
                  <div
                    key={groupItem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={groupItem.icon || defaultIcon}
                      alt={groupItem.name}
                      style={{ width: 16, height: 16 }}
                      onError={(e) => {
                        e.target.src = defaultIcon
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, textAlign: 'center', color: token.colorTextSecondary }}>
              {item.name || 'group'}({item.items.length})
            </div>
          </div>
        </Popover>
      )
    }

    // 渲染单个快捷方式
    return (
      <Dropdown
        key={item.id}
        menu={{ items: getContextMenuItems(item) }}
        trigger={['contextMenu']}
      >
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item.id)}
          onDragEnd={handleDragEnd}
          className="flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-1"
          style={{
            opacity: draggedId === item.id ? 0.5 : 1,
            border: dragOverId === item.id ? `2px dashed ${token.colorPrimary}` : '2px solid transparent',
            borderRadius: '8px',
            padding: '4px',
          }}
        >
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center no-underline"
            onContextMenu={(e) => {
              e.preventDefault()
            }}
            onClick={(e) => {
              if (draggedId) {
                e.preventDefault()
              }
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: token.colorFillSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                overflow: 'hidden',
              }}
            >
              <img
                src={item.icon || defaultIcon}
                alt={item.name}
                style={{ width: 32, height: 32 }}
                onError={(e) => {
                  e.target.src = defaultIcon
                }}
              />
            </div>
            <div style={{ fontSize: 12, textAlign: 'center', color: token.colorTextSecondary }}>
              {item.name}
            </div>
          </a>
        </div>
      </Dropdown>
    )
  }

  return (
    <Card
      title="快捷方式"
      className="col-span-2"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          添加
        </Button>
      }
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
        }
      }}
    >
      <Spin spinning={loading}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div 
            ref={scrollRef}
            className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-4 custom-scrollbar"
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={async (e) => {
              e.preventDefault()
              // 如果是从组中拖出的，直接添加到主列表
              if (draggedFromGroup) {
                const group = shortcuts.find(s => s.id === draggedFromGroup.groupId)
                if (group && group.isGroup) {
                  const draggedItem = group.items.find(item => item.id === draggedFromGroup.itemId)
                  if (draggedItem) {
                    const newShortcuts = shortcuts.map(s => {
                      if (s.id === draggedFromGroup.groupId && s.isGroup) {
                        const newItems = s.items.filter(item => item.id !== draggedFromGroup.itemId)
                        if (newItems.length === 1) {
                          return newItems[0]
                        } else if (newItems.length === 0) {
                          return null
                        }
                        return { ...s, items: newItems }
                      }
                      return s
                    }).filter(Boolean)
                    
                    // 添加到主列表
                    newShortcuts.push({ ...draggedItem })
                    await saveShortcuts(newShortcuts)
                  }
                }
                setDraggedId(null)
                setDraggedFromGroup(null)
              }
            }}
          >
            {shortcuts.map((item) => renderShortcutItem(item))}
          </div>

          <Popconfirm
            title="确定要删除这个快捷方式吗？"
            open={deleteConfirmId !== null}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteConfirmId(null)}
            okText="确定"
            cancelText="取消"
          />
        </div>
      </Spin>

      <Modal
        title={editingId ? '编辑快捷方式' : '添加快捷方式'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={handleCancel}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: '',
            url: '',
            icon: ''
          }}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="名称" />
          </Form.Item>
          <Form.Item
            name="url"
            label="网址"
            rules={[{ required: true, message: '请输入网址' }]}
          >
            <Input placeholder="网址 (例如: github.com)" />
          </Form.Item>
          <Form.Item
            name="icon"
            label="图标 URL (可选)"
          >
            <Input placeholder="图标 URL (可选)" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
