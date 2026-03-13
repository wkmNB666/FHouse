import { useEffect, useMemo, useState } from 'react'
import { Button, DatePicker, Flex, Form, Image, Input, InputNumber, Modal, Select, Space, Table, Tooltip, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { createContract, deleteContract, fetchContracts, updateContract, type ContractItem } from '../services/contractService'
import { fetchHouses, type House } from '../services/houseService'
import { getImageSrc } from '../utils/imageUtils'
import { useAuth } from '../contexts/AuthContext'

export function ContractListPage() {
  const { user } = useAuth()
  const canDelete = user?.role === '管理员' || user?.role === '最高管理员'

  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ContractItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ContractItem | null>(null)
  const [modalForm] = Form.useForm()

  const [houseOptions, setHouseOptions] = useState<House[]>([])
  const [housePreview, setHousePreview] = useState<{ info: string; images: string[] } | null>(null)

  const loadContracts = async (pageIndex = page, size = pageSize) => {
    try {
      setLoading(true)
      const values = form.getFieldsValue()
      const signedRange = values.signedRange as [any, any] | undefined
      const res = await fetchContracts({
        communityName: values.communityName,
        landlordName: values.landlordName,
        tenantName: values.tenantName,
        signedFrom: signedRange?.[0]?.toISOString?.(),
        signedTo: signedRange?.[1]?.toISOString?.(),
        page: pageIndex,
        pageSize: size,
      })
      setData(res.items)
      setTotal(res.total)
      setPage(res.page)
      setPageSize(res.pageSize)
    } catch (err: any) {
      message.error(err?.message || '加载签约失败')
    } finally {
      setLoading(false)
    }
  }

  const loadHouses = async () => {
    try {
      const res = await fetchHouses({ page: 1, pageSize: 200 })
      setHouseOptions(res.items)
    } catch {
      setHouseOptions([])
    }
  }

  useEffect(() => {
    loadContracts()
    loadHouses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => loadContracts(1, pageSize)

  const openAdd = () => {
    setEditing(null)
    modalForm.resetFields()
    modalForm.setFieldsValue({ signedAt: dayjs() })
    setHousePreview(null)
    setModalOpen(true)
  }

  const openEdit = (r: ContractItem) => {
    setEditing(r)
    modalForm.setFieldsValue({
      houseId: r.houseId,
      communityName: r.communityName,
      landlordName: r.landlordName,
      landlordContact: r.landlordContact,
      tenantName: r.tenantName,
      tenantContact: r.tenantContact,
      location: r.location,
      contractPrice: r.contractPrice,
      signedAt: dayjs(r.signedAt),
    })
    const images = (r.houseImages || '').split(',').map((s) => s.trim()).filter(Boolean)
    setHousePreview({ info: r.houseInfo, images })
    setModalOpen(true)
  }

  const handleDelete = (r: ContractItem) => {
    Modal.confirm({
      title: '确认删除该签约？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteContract(r.id)
          message.success('删除成功')
          loadContracts()
        } catch (err: any) {
          message.error(err?.message || '删除失败')
        }
      },
    })
  }

  const submitModal = async () => {
    try {
      const v = await modalForm.validateFields()
      const payload = {
        houseId: v.houseId,
        communityName: v.communityName,
        landlordName: v.landlordName,
        landlordContact: v.landlordContact,
        tenantName: v.tenantName,
        tenantContact: v.tenantContact,
        location: v.location,
        contractPrice: v.contractPrice,
        signedAt: (v.signedAt as dayjs.Dayjs).toISOString(),
      }

      if (editing) {
        await updateContract(editing.id, payload)
        message.success('更新成功')
      } else {
        await createContract(payload)
        message.success('创建成功')
      }

      setModalOpen(false)
      setEditing(null)
      modalForm.resetFields()
      loadContracts()
    } catch (err: any) {
      message.error(err?.message || '提交失败')
    }
  }

  const onHouseChange = (houseId: number) => {
    const h = houseOptions.find((x) => x.id === houseId)
    if (!h) {
      setHousePreview(null)
      return
    }
    const info = `${h.building || '-'}-${h.unit || '-'}-${h.floor || '-'}`
    const images = (h.images || '').split(',').map((s) => s.trim()).filter(Boolean)
    setHousePreview({ info, images })

    // convenience fill
    modalForm.setFieldsValue({
      communityName: h.communityName,
      location: h.location,
      landlordName: h.landlordName,
      landlordContact: h.landlordContact ?? '',
      contractPrice: h.price,
    })
  }

  const columns = useMemo(
    () => [
      { title: '签约小区名称', dataIndex: 'communityName' },
      {
        title: '房东姓名及联系方式',
        render: (_: any, r: ContractItem) => `${r.landlordName} / ${r.landlordContact}`,
      },
      {
        title: '租客姓名及联系方式',
        render: (_: any, r: ContractItem) => `${r.tenantName} / ${r.tenantContact}`,
      },
      { title: '位置', dataIndex: 'location' },
      { title: '签约价格', dataIndex: 'contractPrice', render: (v: number) => `${v} 元` },
      { title: '栋', dataIndex: 'building', render: (v: string) => v || '-' },
      { title: '单元', dataIndex: 'unit', render: (v: string) => v || '-' },
      { title: '楼层', dataIndex: 'floor', render: (v: string) => v || '-' },
      { title: '房源具体信息', dataIndex: 'houseInfo' },
      {
        title: '房屋照片',
        dataIndex: 'houseImages',
        width: 90,
        render: (v: string) => {
          const first = (v || '').split(',').map((s) => s.trim()).filter(Boolean)[0]
          if (!first) return '-'
          return <Image width={40} height={40} style={{ objectFit: 'cover', borderRadius: 6 }} src={getImageSrc(first)} />
        },
      },
      { title: '签约时间', dataIndex: 'signedAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
      {
        title: '操作',
        width: 140,
        render: (_: any, r: ContractItem) => (
          <>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openEdit(r)}>
              编辑
            </Button>
            {canDelete ? (
              <Button type="link" size="small" danger style={{ padding: 0 }} onClick={() => handleDelete(r)}>
                删除
              </Button>
            ) : null}
          </>
        ),
      },
    ],
    [canDelete, houseOptions],
  )

  return (
    <>
      <Flex wrap="wrap" gap={16} justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Form layout="inline" form={form} style={{ flex: 1, minWidth: 0 }}>
          <Form.Item label="小区名称" name="communityName">
            <Input placeholder="请输入小区名称" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item label="房东" name="landlordName">
            <Input placeholder="房东姓名" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item label="租客" name="tenantName">
            <Input placeholder="租客姓名" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item label="签约时间" name="signedRange">
            <DatePicker.RangePicker />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
          </Form.Item>
        </Form>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          添加签约
        </Button>
      </Flex>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns as any}
        dataSource={data}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => loadContracts(p, ps ?? pageSize),
        }}
      />

      <Modal
        title={editing ? '编辑签约' : '添加签约'}
        open={modalOpen}
        onOk={submitModal}
        onCancel={() => { setModalOpen(false); setEditing(null); modalForm.resetFields() }}
        okText="确定"
        cancelText="取消"
      >
        <Form form={modalForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="关联房源" name="houseId" rules={[{ required: true, message: '此项为必填' }]}>
            <Select
              placeholder="选择房源"
              showSearch
              optionFilterProp="label"
              disabled={!!editing}
              options={houseOptions.map((h) => ({
                label: `${h.communityName} (${h.id})${h.isContracted ? ' [已签约]' : ''}`,
                value: h.id,
                disabled: !!h.isContracted,
              }))}
              optionRender={(opt) =>
                (opt as { data?: { disabled?: boolean }; label?: React.ReactNode }).data?.disabled ? (
                  <Tooltip title="此房源已签约">
                    <span>{(opt as { label?: React.ReactNode }).label}</span>
                  </Tooltip>
                ) : (
                  (opt as { label?: React.ReactNode }).label
                )
              }
              onChange={onHouseChange}
            />
          </Form.Item>

          {housePreview ? (
            <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 12 }}>
              <div>房源具体信息：{housePreview.info}</div>
              <Image.PreviewGroup>
                <Space wrap>
                  {housePreview.images.slice(0, 6).map((src) => (
                    <Image key={src} width={60} height={60} style={{ objectFit: 'cover', borderRadius: 6 }} src={getImageSrc(src)} />
                  ))}
                </Space>
              </Image.PreviewGroup>
            </Space>
          ) : null}

          <Form.Item label="签约小区名称" name="communityName" rules={[{ required: true, message: '此项为必填' }]}>
            <Input placeholder="自动带出，可修改" disabled={!!editing} />
          </Form.Item>
          <Form.Item label="位置" name="location" rules={[{ required: true, message: '此项为必填' }]}>
            <Input placeholder="自动带出，可修改" disabled={!!editing} />
          </Form.Item>
          <Form.Item label="房东姓名" name="landlordName" rules={[{ required: true, message: '此项为必填' }]}>
            <Input placeholder="自动带出，可修改" />
          </Form.Item>
          <Form.Item label="房东联系方式" name="landlordContact" rules={[{ required: true, message: '此项为必填' }]}>
            <Input placeholder="请输入房东联系方式" />
          </Form.Item>
          <Form.Item label="租客姓名" name="tenantName" rules={[{ required: true, message: '此项为必填' }]}>
            <Input placeholder="请输入租客姓名" />
          </Form.Item>
          <Form.Item label="租客联系方式" name="tenantContact" rules={[{ required: true, message: '此项为必填' }]}>
            <Input placeholder="请输入租客联系方式" />
          </Form.Item>
          <Form.Item label="签约价格" name="contractPrice" rules={[{ required: true, message: '此项为必填' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="自动带出，可修改" />
          </Form.Item>
          <Form.Item label="签约时间" name="signedAt" rules={[{ required: true, message: '此项为必填' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

