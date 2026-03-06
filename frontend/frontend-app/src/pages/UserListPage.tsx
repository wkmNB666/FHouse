import { useEffect, useState } from 'react'
import { Button, DatePicker, Form, Input, Flex, Table, message } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  type User,
} from '../services/userService'
import { DynamicFormModal } from '../components/DynamicFormModal'

export function UserListPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const loadData = async (pageIndex = page, size = pageSize) => {
    try {
      setLoading(true)
      const values = form.getFieldsValue()
      const addedRange = values.addedRange as [any, any] | undefined
      const res = await fetchUsers({
        userName: values.userName,
        contact: values.contact,
        addedFrom: addedRange?.[0]?.toISOString?.(),
        addedTo: addedRange?.[1]?.toISOString?.(),
        page: pageIndex,
        pageSize: size,
      })
      setData(res.items)
      setTotal(res.total)
      setPage(res.page)
      setPageSize(res.pageSize)
    } catch (err: any) {
      message.error(err?.message || '加载用户失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    loadData(1, pageSize)
  }

  const handleAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (record: User) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleDelete = async (record: User) => {
    try {
      await deleteUser(record.id)
      message.success('删除成功')
      loadData()
    } catch (err: any) {
      message.error(err?.message || '删除失败')
    }
  }

  const handleModalOk = async (values: any) => {
    try {
      if (editing) {
        await updateUser(editing.id, {
          ...editing,
          userName: values.userName,
          gender: values.gender,
          contact: values.contact,
          addedTime: editing.addedTime,
        })
        message.success('更新成功')
      } else {
        await createUser({
          userName: values.userName,
          gender: values.gender,
          contact: values.contact,
          addedTime: dayjs().toISOString(),
        })
        message.success('创建成功')
      }
      setModalOpen(false)
      setEditing(null)
      loadData()
    } catch (err: any) {
      message.error(err?.message || '提交失败')
    }
  }

  const columns = [
    {
      title: '用户名称',
      dataIndex: 'userName',
    },
    {
      title: '性别',
      dataIndex: 'gender',
    },
    {
      title: '添加时间',
      dataIndex: 'addedTime',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
    },
    {
      title: '操作',
      width: 140,
      render: (_: any, record: User) => (
        <>
          <Button type="link" size="small" onClick={() => handleEdit(record)} style={{ padding: 0 }}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record)} style={{ padding: 0 }}>
            删除
          </Button>
        </>
      ),
    },
  ]

  return (
    <>
      <Flex wrap="wrap" gap={16} justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Form layout="inline" form={form} style={{ flex: 1, minWidth: 0 }}>
          <Form.Item label="用户名称" name="userName">
            <Input placeholder="请输入用户名称" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item label="添加时间" name="addedRange">
            <DatePicker.RangePicker />
          </Form.Item>
          <Form.Item label="联系方式" name="contact">
            <Input placeholder="请输入联系方式" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
          </Form.Item>
        </Form>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加用户信息
        </Button>
      </Flex>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => loadData(p, ps ?? pageSize),
        }}
      />
      <DynamicFormModal
        open={modalOpen}
        mode="user"
        initialValues={
          editing
            ? {
                userName: editing.userName,
                gender: editing.gender,
                contact: editing.contact,
              }
            : undefined
        }
        onOk={handleModalOk}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </>
  )
}

