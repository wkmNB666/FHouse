import { useEffect, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Flex, Table, message, Modal, Tag, Cascader } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  fetchHouses,
  createHouse,
  updateHouse,
  deleteHouse,
  auditHouse,
  type House,
} from '../services/houseService'
import { getImageSrc } from '../utils/imageUtils'
import { DynamicFormModal } from '../components/DynamicFormModal'
import { regionOptions } from '../data/regionOptions'
import { useAuth } from '../contexts/AuthContext'

export function HouseListPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<House[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<House | null>(null)

  const { user } = useAuth()
  const canDelete = user?.role === '管理员' || user?.role === '最高管理员'
  const canAudit = user?.role === '管理员' || user?.role === '最高管理员'

  const [auditOpen, setAuditOpen] = useState(false)
  const [auditing, setAuditing] = useState<House | null>(null)
  const [auditForm] = Form.useForm()

  const loadData = async (pageIndex = page, size = pageSize) => {
    try {
      setLoading(true)
      const values = form.getFieldsValue()
      const listedRange = values.listedRange as [any, any] | undefined
      const res = await fetchHouses({
        communityName: values.communityName,
        region: Array.isArray(values.region) && values.region.length ? values.region.join('/') : undefined,
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
        await updateHouse(editing.id, { ...editing, ...values, listedTime: editing.listedTime })
        message.success('更新成功')
      } else {
        await createHouse({ ...values, listedTime: dayjs().toISOString(), auditStatus: 0 })
        message.success('创建成功')
      }
      setModalOpen(false)
      setEditing(null)
      loadData()
    } catch (err: any) {
      message.error(err?.message || '提交失败')
    }
  }

  const openAudit = (record: House) => {
    setAuditing(record)
    auditForm.setFieldsValue({ remark: record.auditRemark ?? '' })
    setAuditOpen(true)
  }

  const submitAudit = async (status: number) => {
    if (!auditing) return
    try {
      const values = await auditForm.validateFields()
      await auditHouse(auditing.id, { status, remark: values.remark })
      message.success(status === 1 ? '审核通过' : '已提交审核结果')
      setAuditOpen(false)
      setAuditing(null)
      auditForm.resetFields()
      loadData()
    } catch (err: any) {
      message.error(err?.message || '审核失败')
    }
  }

  const columns = [
    {
      title: '图片',
      dataIndex: 'images',
      width: 80,
      render: (value: string) => {
        const first = value?.split(',')?.map((s) => s.trim())?.filter(Boolean)?.[0]
        if (!first) return '-'
        return (
          <img
            src={getImageSrc(first)}
            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }}
            alt="house"
          />
        )
      },
    },
    {
      title: '小区名称',
      dataIndex: 'communityName',
    },
    {
      title: '房屋位置',
      dataIndex: 'location',
      render: (v: string) => v || '-',
    },
    {
      title: '出租用户',
      dataIndex: 'landlordName',
      render: (v: string) => v || '-',
    },
    {
      title: '房源具体信息',
      render: (_: any, r: House) => `${r.building || '-'}-${r.unit || '-'}-${r.floor || '-'}`,
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
      title: '审核状态',
      dataIndex: 'auditStatus',
      render: (v: number) =>
        v === 1 ? <Tag color="success">已通过</Tag> : v === 2 ? <Tag color="error">未通过</Tag> : <Tag color="warning">未审核</Tag>,
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, record: House) => (
        <>
          {canAudit && record.auditStatus !== 1 ? (
            <Button
              type="link"
              size="small"
              onClick={() => openAudit(record)}
              style={{ padding: 0, color: record.auditStatus === 2 ? '#ff4d4f' : '#faad14', fontWeight: 600 }}
            >
              审核
            </Button>
          ) : null}
          <Button type="link" size="small" onClick={() => handleEdit(record)} style={{ padding: 0 }}>
            编辑
          </Button>
          {canDelete ? (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleDelete(record)}
              style={{ padding: 0 }}
            >
              删除
            </Button>
          ) : null}
        </>
      ),
    },
  ]

  return (
    <>
      <Flex wrap="wrap" gap={16} justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Form layout="inline" form={form} style={{ flex: 1, minWidth: 0 }}>
          <Form.Item label="房屋区域" name="region">
            <Cascader
              options={regionOptions}
              placeholder="省/市/区/街道"
              allowClear
              showSearch={{ filter: (inputValue, path) => path.some((p) => p.label.toLowerCase().includes(inputValue.toLowerCase())) }}
              style={{ width: 200 }}
              displayRender={(labels) => labels.join(' / ')}
            />
          </Form.Item>
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
                location: editing.location,
                landlordName: editing.landlordName,
                building: editing.building,
                unit: editing.unit,
                floor: editing.floor,
                images: editing.images,
              }
            : undefined
        }
        onOk={handleModalOk}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />

      <Modal
        title="房源审核"
        open={auditOpen}
        onCancel={() => { setAuditOpen(false); setAuditing(null); auditForm.resetFields() }}
        footer={[
          <Button key="reject" danger onClick={() => submitAudit(2)}>
            未通过
          </Button>,
          <Button key="pass" type="primary" onClick={() => submitAudit(1)}>
            通过
          </Button>,
        ]}
      >
        <Form form={auditForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入审核备注（可选）" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

