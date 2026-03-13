import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, DatePicker, Flex, Form, Input, Modal, Select, Table, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { createRole, deleteRole, fetchRoleMembers, fetchRoles, updateRole, updateRoleMembers, checkRoleNameExists, type Role } from '../services/roleService'
import { fetchUsers } from '../services/userService'

const moduleOptions = [
  { label: '首页', value: 'HomeModule' },
  { label: '房源', value: 'HouseModule' },
  { label: '用户', value: 'UserModule' },
  { label: '角色', value: 'RoleModule' },
  { label: '签约', value: 'ContractModule' },
]

export function RoleListPage() {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [editForm] = Form.useForm()

  const [permOpen, setPermOpen] = useState(false)
  const [permRole, setPermRole] = useState<Role | null>(null)
  const [permForm] = Form.useForm()
  const [searchForm] = Form.useForm()

  const loadRoles = async () => {
    try {
      setLoading(true)
      const v = searchForm.getFieldsValue()
      const createRange = v.createRange as [dayjs.Dayjs, dayjs.Dayjs] | undefined
      const res = await fetchRoles({
        roleName: v.roleName || undefined,
        createFrom: createRange?.[0]?.format?.('YYYY-MM-DD'),
        createTo: createRange?.[1]?.format?.('YYYY-MM-DD'),
      })
      setRoles(res)
    } catch (err: any) {
      message.error(err?.message || '加载角色失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [])

  const openCreate = () => {
    setEditing(null)
    editForm.resetFields()
    setEditOpen(true)
  }

  const openEdit = (role: Role) => {
    setEditing(role)
    editForm.setFieldsValue({
      roleName: role.roleName,
      description: role.description,
      permissions: (role.permissions || '').split(',').filter(Boolean),
    })
    setEditOpen(true)
  }

  const submitEdit = async () => {
    try {
      const values = await editForm.validateFields()
      const permissions = (values.permissions as string[] | undefined)?.join(',') ?? ''
      if (editing) {
        await updateRole(editing.id, { roleName: values.roleName, description: values.description, permissions })
        message.success('更新成功')
      } else {
        await createRole({ roleName: values.roleName, description: values.description, permissions })
        message.success('创建成功')
      }
      setEditOpen(false)
      setEditing(null)
      editForm.resetFields()
      loadRoles()
    } catch (err: any) {
      message.error(err?.message || '提交失败')
    }
  }

  const handleDelete = async (role: Role) => {
    Modal.confirm({
      title: `确认删除角色：${role.roleName}？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteRole(role.id)
          message.success('删除成功')
          loadRoles()
        } catch (err: any) {
          message.error(err?.message || '删除失败')
        }
      },
    })
  }

  const openPerm = async (role: Role) => {
    setPermRole(role)
    setPermOpen(true)

    try {
      const [membersRes, usersRes] = await Promise.all([
        fetchRoleMembers(role.id),
        fetchUsers({ page: 1, pageSize: 1000 }),
      ])

      permForm.setFieldsValue({
        permissions: (role.permissions || '').split(',').filter(Boolean),
        userIds: membersRes.map((m) => m.id),
        allUsers: usersRes.items.map((u) => ({ label: u.userName, value: u.id })),
      })
    } catch {
      permForm.setFieldsValue({
        permissions: (role.permissions || '').split(',').filter(Boolean),
        userIds: [],
        allUsers: [],
      })
    }
  }

  const allUsersOptions = Form.useWatch('allUsers', permForm) as { label: string; value: number }[] | undefined

  const submitPerm = async () => {
    if (!permRole) return
    try {
      const values = await permForm.validateFields()
      const permissions = (values.permissions as string[] | undefined)?.join(',') ?? ''
      const userIds = (values.userIds as number[] | undefined) ?? []

      await updateRole(permRole.id, {
        roleName: permRole.roleName,
        description: permRole.description,
        permissions,
      })
      await updateRoleMembers(permRole.id, userIds)

      message.success('配置成功')
      setPermOpen(false)
      setPermRole(null)
      permForm.resetFields()
      loadRoles()
    } catch (err: any) {
      message.error(err?.message || '配置失败')
    }
  }

  const columns = useMemo(
    () => [
      { title: '角色名称', dataIndex: 'roleName' },
      { title: '角色描述', dataIndex: 'description', render: (v: string) => v || '-' },
      { title: '创建时间', dataIndex: 'createTime', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
      {
        title: '操作',
        width: 220,
        render: (_: any, r: Role) => (
          <>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openPerm(r)}>
              权限配置
            </Button>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openEdit(r)}>
              编辑
            </Button>
            <Button type="link" size="small" danger style={{ padding: 0 }} onClick={() => handleDelete(r)}>
              删除
            </Button>
          </>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <Flex wrap="wrap" gap={16} justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Form layout="inline" form={searchForm} onFinish={() => loadRoles()}>
          <Form.Item label="角色名称" name="roleName">
            <Input placeholder="请输入角色名称" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item label="创建时间" name="createRange">
            <DatePicker.RangePicker />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
              查询
            </Button>
          </Form.Item>
        </Form>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          添加角色
        </Button>
      </Flex>

      <Table rowKey="id" loading={loading} columns={columns as any} dataSource={roles} pagination={false} />

      <Modal
        title={editing ? '编辑角色' : '添加角色'}
        open={editOpen}
        onOk={submitEdit}
        onCancel={() => { setEditOpen(false); setEditing(null); editForm.resetFields() }}
        okText="确定"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="角色名称"
            name="roleName"
            rules={[
              { required: true, message: '此项为必填' },
              {
                async validator(_, value) {
                  if (!value || typeof value !== 'string') return
                  const trimmed = value.trim()
                  if (!trimmed) return
                  const res = await checkRoleNameExists(trimmed, editing?.id)
                  if (res.exists) return Promise.reject(new Error('角色名称已存在'))
                },
              },
            ]}
          >
            <Input placeholder="如：管理员" />
          </Form.Item>
          <Form.Item label="角色描述" name="description">
            <Input placeholder="用于列表展示" />
          </Form.Item>
          <Form.Item label="菜单权限" name="permissions">
            <Checkbox.Group options={moduleOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="权限配置"
        open={permOpen}
        onOk={submitPerm}
        onCancel={() => { setPermOpen(false); setPermRole(null); permForm.resetFields() }}
        okText="确定"
        cancelText="取消"
      >
        <Form form={permForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="菜单模块权限" name="permissions">
            <Checkbox.Group options={moduleOptions} />
          </Form.Item>
          <Form.Item label="角色成员" name="userIds">
            <Select
              mode="multiple"
              allowClear
              placeholder="选择该角色的成员"
              optionLabelProp="label"
              options={allUsersOptions ?? []}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

