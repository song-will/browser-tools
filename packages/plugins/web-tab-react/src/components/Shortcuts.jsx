import { useState, useEffect, useRef } from 'react'
import { Card, Button, Input, Space, Popconfirm, Spin, Dropdown, theme, Modal, Form, Popover } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons'
import { storageManager } from '../utils/storage'
import { getFavicon } from '../utils/favicon'
import { uuidv4 } from '../utils/index'
import { logOperation } from '../utils/operationLog'

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
  const [iconLoading, setIconLoading] = useState(false)
  const scrollRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const urlDebounceTimerRef = useRef(null)

  useEffect(() => {
    loadShortcuts()
  }, [])

  useEffect(() => {
    // 监听数据同步事件
    const handleDataSynced = () => {
      console.log('[Shortcuts] 收到数据同步事件，重新加载数据')
      loadShortcuts()
    }
    
    window.addEventListener('dataSynced', handleDataSynced)
    
    return () => {
      window.removeEventListener('dataSynced', handleDataSynced)
    }
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
        // 过滤掉已删除的项目（软删除）
        const activeShortcuts = saved.filter(item => !item.deleted)
        setShortcuts(activeShortcuts)
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
      const now = Date.now()
      // 为所有快捷方式和组添加/更新 updatedAt 字段
      // 注意：保留已删除的项目（软删除），但显示时过滤
      const shortcutsWithTimestamp = newShortcuts.map(s => {
        if (s.isGroup) {
          return {
            ...s,
            updatedAt: s.updatedAt || now,
            items: s.items.map(item => ({
              ...item,
              updatedAt: item.updatedAt || now
            }))
          }
        }
        return {
          ...s,
          updatedAt: s.updatedAt || now
        }
      })
      await storageManager.set('shortcuts', shortcutsWithTimestamp)
      // 显示时过滤掉已删除的项目
      const activeShortcuts = shortcutsWithTimestamp.filter(item => !item.deleted)
      setShortcuts(activeShortcuts)
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
    const deletedItem = shortcuts.find(s => s.id === id)
    // 软删除：标记为已删除，而不是直接移除
    const now = Date.now()
    const newShortcuts = shortcuts.map(s => 
      s.id === id 
        ? { ...s, deleted: true, deletedAt: now, updatedAt: now }
        : s
    )
    await saveShortcuts(newShortcuts)
    
    if (deletedItem) {
      const logType = deletedItem.isGroup ? 'delete_group' : 'delete_shortcut'
      await logOperation(logType, {
        id: deletedItem.id,
        name: deletedItem.name || (deletedItem.isGroup ? '组' : '快捷方式'),
        isGroup: deletedItem.isGroup
      })
    }
  }

  const handleDeleteFromGroup = async (groupId, itemId) => {
    const group = shortcuts.find(s => s.id === groupId && s.isGroup)
    const deletedItem = group?.items.find(item => item.id === itemId)
    const now = Date.now()
    
    const newShortcuts = shortcuts.map(s => {
      if (s.id === groupId && s.isGroup) {
        // 软删除：标记组内项目为已删除
        const newItems = s.items.map(item => 
          item.id === itemId 
            ? { ...item, deleted: true, deletedAt: now, updatedAt: now }
            : item
        ).filter(item => !item.deleted) // 过滤掉已删除的项目
        
        if (newItems.length === 1) {
          // 如果组里只剩一个，就变成单个快捷方式
          return newItems[0]
        } else if (newItems.length === 0) {
          // 如果组里没有项目了，删除整个组
          return { ...s, deleted: true, deletedAt: now, updatedAt: now }
        }
        return { ...s, items: newItems, updatedAt: now }
      }
      return s
    }).filter(s => !s.deleted) // 过滤掉已删除的组
    await saveShortcuts(newShortcuts)
    
    if (deletedItem) {
      await logOperation('remove_from_group', {
        groupId,
        itemId: deletedItem.id,
        itemName: deletedItem.name
      })
    }
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
        const newId = uuidv4()
        const newShortcut = { id: newId, name: name.trim(), url: finalUrl, icon: icon?.trim() || defaultIcon }
        newShortcuts = [...shortcuts, newShortcut]
        await saveShortcuts(newShortcuts)
        await logOperation('add_shortcut', {
          id: newId,
          name: name.trim(),
          url: finalUrl
        })
      } else {
        // 编辑现有快捷方式
        const oldItem = shortcuts.find(s => s.id === editingId)
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
        await saveShortcuts(newShortcuts)
        if (oldItem && !oldItem.isGroup) {
          await logOperation('edit_shortcut', {
            id: editingId,
            oldName: oldItem.name,
            newName: name.trim(),
            oldUrl: oldItem.url,
            newUrl: finalUrl
          })
        }
      }

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
    setIconLoading(false)
    if (urlDebounceTimerRef.current) {
      clearTimeout(urlDebounceTimerRef.current)
      urlDebounceTimerRef.current = null
    }
  }

  // 自动获取图标
  const handleUrlChange = async (e) => {
    const url = e.target.value.trim()
    
    // 清除之前的定时器
    if (urlDebounceTimerRef.current) {
      clearTimeout(urlDebounceTimerRef.current)
    }

    // 如果 URL 为空，清空图标
    if (!url) {
      form.setFieldsValue({ icon: '' })
      return
    }

    // 验证 URL 格式
    let finalUrl = url
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl
    }

    // 防抖：等待用户停止输入 800ms 后再获取图标
    urlDebounceTimerRef.current = setTimeout(async () => {
      try {
        setIconLoading(true)
        console.log('[Shortcuts] 开始自动获取图标，URL:', finalUrl)
        
        const iconUrl = await getFavicon(finalUrl)
        
        if (iconUrl) {
          console.log('[Shortcuts] 图标获取成功:', iconUrl)
          form.setFieldsValue({ icon: iconUrl })
        } else {
          console.log('[Shortcuts] 图标获取失败，保持当前值')
        }
      } catch (error) {
        console.error('[Shortcuts] 获取图标出错:', error)
      } finally {
        setIconLoading(false)
      }
    }, 800)
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
        // 先从组中软删除
        const now = Date.now()
        newShortcuts = newShortcuts.map(s => {
          if (s.id === draggedFromGroup.groupId && s.isGroup) {
            // 软删除组内项目
            const newItems = s.items.map(item => 
              item.id === draggedFromGroup.itemId
                ? { ...item, deleted: true, deletedAt: now, updatedAt: now }
                : item
            ).filter(item => !item.deleted) // 过滤掉已删除的
            
            if (newItems.length === 1) {
              // 如果组里只剩一个，就变成单个快捷方式
              return newItems[0]
            } else if (newItems.length === 0) {
              // 如果组里没有项目了，删除整个组
              return { ...s, deleted: true, deletedAt: now, updatedAt: now }
            }
            return { ...s, items: newItems, updatedAt: now }
          }
          return s
        }).filter(s => !s.deleted) // 过滤掉已删除的组
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
      const draggedItemCopy = { ...draggedItem, id: draggedItem.id || uuidv4() }
      newShortcuts = newShortcuts.map(s => {
        if (s.id === targetId) {
          return { ...s, items: [...s.items, draggedItemCopy] }
        }
        return s
      })
      // 如果不是从组中拖出的，需要软删除原来的快捷方式
      if (!draggedFromGroup) {
        const now = Date.now()
        newShortcuts = newShortcuts.map(s => 
          s.id === draggedId
            ? { ...s, deleted: true, deletedAt: now, updatedAt: now }
            : s
        ).filter(s => !s.deleted)
      }
      await saveShortcuts(newShortcuts)
      await logOperation('add_to_group', {
        groupId: targetId,
        groupName: targetItem.name || '组',
        itemId: draggedItemCopy.id,
        itemName: draggedItemCopy.name
      })
    } else {
      // 拖到单个快捷方式上，形成组
      const newGroupId = uuidv4()
      const draggedItemCopy = { ...draggedItem, id: draggedItem.id || uuidv4() }
      const targetItemCopy = { ...targetItem, id: targetItem.id || uuidv4() }
      
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
      // 如果不是从组中拖出的，需要软删除原来的快捷方式
      if (!draggedFromGroup) {
        const now = Date.now()
        newShortcuts = newShortcuts.map(s => 
          s.id === draggedId
            ? { ...s, deleted: true, deletedAt: now, updatedAt: now }
            : s
        ).filter(s => !s.deleted)
      }
      await saveShortcuts(newShortcuts)
      await logOperation('create_group', {
        groupId: newGroupId,
        items: [
          { id: targetItemCopy.id, name: targetItemCopy.name },
          { id: draggedItemCopy.id, name: draggedItemCopy.name }
        ]
      })
    }

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
    const oldGroup = shortcuts.find(s => s.id === groupId && s.isGroup)
    const newShortcuts = shortcuts.map(s => {
      if (s.id === groupId && s.isGroup) {
        return { ...s, name: newName.trim() || null }
      }
      return s
    })
    await saveShortcuts(newShortcuts)
    
    if (oldGroup) {
      await logOperation('edit_group_name', {
        groupId,
        oldName: oldGroup.name || '组',
        newName: newName.trim() || '组'
      })
    }
    
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
      className="col-span-3"
      style={{
        height: 'fit-content',
        alignSelf: 'start',
      }}
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
              height: 'fit-content',
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
                    const now = Date.now()
                    const newShortcuts = shortcuts.map(s => {
                      if (s.id === draggedFromGroup.groupId && s.isGroup) {
                        // 软删除组内项目
                        const newItems = s.items.map(item => 
                          item.id === draggedFromGroup.itemId
                            ? { ...item, deleted: true, deletedAt: now, updatedAt: now }
                            : item
                        ).filter(item => !item.deleted)
                        
                        if (newItems.length === 1) {
                          return newItems[0]
                        } else if (newItems.length === 0) {
                          return { ...s, deleted: true, deletedAt: now, updatedAt: now }
                        }
                        return { ...s, items: newItems, updatedAt: now }
                      }
                      return s
                    }).filter(s => !s.deleted)
                    
                    // 添加到主列表
                    const draggedItemWithId = { ...draggedItem, id: draggedItem.id || uuidv4() }
                    newShortcuts.push(draggedItemWithId)
                    await saveShortcuts(newShortcuts)
                    await logOperation('remove_from_group', {
                      groupId: draggedFromGroup.groupId,
                      itemId: draggedItemWithId.id,
                      itemName: draggedItemWithId.name
                    })
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
            <Input 
              placeholder="网址 (例如: github.com)" 
              onChange={handleUrlChange}
            />
          </Form.Item>
          <Form.Item
            name="icon"
            label="图标 URL (可选)"
            extra={iconLoading ? '正在自动获取图标...' : '输入网址后将自动获取图标'}
          >
            <Input 
              placeholder="图标 URL (可选，将自动填充)" 
              suffix={iconLoading ? <Spin size="small" /> : null}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
