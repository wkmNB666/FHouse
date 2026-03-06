import { useEffect, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Flex, Table, message } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  fetchHouses,
  createHouse,
  updateHouse,
  deleteHouse,
  type House,
} from '../services/houseService'
import { DynamicFormModal } from '../components/DynamicFormModal'

export function HouseListPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<House[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<House | null>(null)

  const loadData = async (pageIndex = page, size = pageSize) => {
    try {
      setLoading(true)
      const values = form.getFieldsValue()
      const listedRange = values.listedRange as [any, any] | undefined
      const res = await fetchHouses({
        communityName: values.communityName,
        minPrice: values.minPrice,
        maxPrice: values.maxPrice,
        listedFrom: listedRange?.[0]?.toISOString?.(),
        listedTo: listedRange?.[1]?.toISOString?.(),
        page: pageIndex,
        pageSize: size,
      })
      setData(res.items)
      setTotal(res.total)
      setPage(res.page)
      setPageSize(res.pageSize)
    } catch (err: any) {
      message.error(err?.message || '加载房源失败')
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

  const handleEdit = (record: House) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleDelete = async (record: House) => {
    try {
      await deleteHouse(record.id)
      message.success('删除成功')
      loadData()
    } catch (err: any) {
      message.error(err?.message || '删除失败')
    }
  }

  const handleModalOk = async (values: any) => {
    try {
      if (editing) {
        await updateHouse(editing.id, {
          ...editing,
          communityName: values.communityName,
          houseAge: values.houseAge,
          price: values.price,
          listedTime: editing.listedTime,
        })
        message.success('更新成功')
      } else {
        await createHouse({
          communityName: values.communityName,
          houseAge: values.houseAge,
          price: values.price,
          listedTime: dayjs().toISOString(),
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
      title: '小区名称',
      dataIndex: 'communityName',
    },
    {
      title: '房龄',
      dataIndex: 'houseAge',
    },
    {
      title: '上架时间',
      dataIndex: 'listedTime',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '价格',
      dataIndex: 'price',
      render: (value: number) => `${value} 元`,
    },
    {
      title: '操作',
      width: 140,
      render: (_: any, record: House) => (
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
          <Form.Item label="小区名称" name="communityName">
            <Input placeholder="请输入小区名称" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item label="上架时间" name="listedRange">
            <DatePicker.RangePicker />
          </Form.Item>
          <Form.Item label="最低价格" name="minPrice">
            <InputNumber placeholder="最低" min={0} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item label="最高价格" name="maxPrice">
            <InputNumber placeholder="最高" min={0} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
          </Form.Item>
        </Form>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加房源
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
        mode="house"
        initialValues={
          editing
            ? {
                communityName: editing.communityName,
                price: editing.price,
                houseAge: editing.houseAge,
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

