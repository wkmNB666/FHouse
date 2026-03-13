import { Modal, Form, Input, InputNumber, Select, Upload } from 'antd'
import type { UploadFile } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { checkUserExists } from '../services/userService'
import { fetchRoles, type Role } from '../services/roleService'

type Mode = 'house' | 'user'

interface DynamicFormModalProps {
  open: boolean
  mode: Mode
  initialValues?: Record<string, any>
  onOk: (values: Record<string, any>) => void
  onCancel: () => void
}

const genderOptions = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
]

export function DynamicFormModal({
  open,
  mode,
  initialValues,
  onOk,
  onCancel,
}: DynamicFormModalProps) {
  const [form] = Form.useForm()
  const { token } = useAuth()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  const title = mode === 'house'
    ? (initialValues?.communityName ? '编辑房源' : '添加房源')
    : (initialValues?.id ? '编辑用户' : '添加用户')

  const initialImagePaths = useMemo(() => {
    const raw = initialValues?.images as string | undefined
    if (!raw) return []
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }, [initialValues])

  useEffect(() => {
    if (open && initialValues) {
      form.setFieldsValue(initialValues)
      if (mode === 'house') {
        setFileList(
          initialImagePaths.map((p, idx) => ({
            uid: `init-${idx}`,
            name: p.split('/').pop() || `image-${idx + 1}`,
            status: 'done',
            url: p,
            response: { paths: [p] },
          })),
        )
      }
    } else if (open && !initialValues) {
      form.resetFields()
      setFileList([])
    }
  }, [open, initialValues, form, mode, initialImagePaths])

  useEffect(() => {
    if (!open || mode !== 'user') return
    fetchRoles()
      .then((res) => setRoles(res))
      .catch(() => setRoles([]))
  }, [open, mode])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      if (mode === 'house') {
        const uploadedPaths: string[] = []
        for (const f of fileList) {
          const res = f.response as any
          const paths = (res?.data?.paths ?? res?.paths) as string[] | undefined
          if (paths?.length) uploadedPaths.push(...paths)
          else if (typeof f.url === 'string') uploadedPaths.push(f.url)
        }
        values.images = uploadedPaths.join(',')
      }
      onOk(values)
      form.resetFields()
      setFileList([])
    } catch {
      // 校验失败时交给 AntD 自己展示错误
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setFileList([])
    onCancel()
  }

  return (
    <Modal open={open} title={title} onOk={handleOk} onCancel={handleCancel} destroyOnClose>
      <Form form={form} layout="vertical" initialValues={initialValues}>
        {mode === 'house' ? (
          <>
            <Form.Item
              label="小区名称"
              name="communityName"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <Input placeholder="请输入小区名称" />
            </Form.Item>
            <Form.Item
              label="小区价格"
              name="price"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <InputNumber style={{ width: '100%' }} placeholder="请输入期望价格" min={0} />
            </Form.Item>
            <Form.Item
              label="房龄"
              name="houseAge"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <InputNumber style={{ width: '100%' }} placeholder="请输入房屋年限" min={0} />
            </Form.Item>
            <Form.Item label="房屋位置" name="location" rules={[{ required: true, message: '此项为必填' }]}>
              <Input placeholder="如：姑苏区/工业园区" />
            </Form.Item>
            <Form.Item
              label="出租用户名称"
              name="landlordName"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <Input placeholder="如：张三" />
            </Form.Item>
            <Form.Item label="楼栋" name="building" rules={[{ required: true, message: '此项为必填' }]}>
              <Input placeholder="如：1栋" />
            </Form.Item>
            <Form.Item label="单元" name="unit" rules={[{ required: true, message: '此项为必填' }]}>
              <Input placeholder="如：2单元" />
            </Form.Item>
            <Form.Item label="楼层" name="floor" rules={[{ required: true, message: '此项为必填' }]}>
              <Input placeholder="如：3层" />
            </Form.Item>
            <Form.Item label="房源照片">
              <Upload
                action="/api/uploads/houses"
                listType="picture-card"
                accept=".png,.jpg,.jpeg"
                multiple
                fileList={fileList}
                headers={token ? { Authorization: `Bearer ${token}` } : undefined}
                onChange={({ fileList: next }) => {
                  const mapped = next.map((file) => {
                    if (file.status === 'done' && file.response) {
                      const res = file.response as any
                      const paths = (res?.data?.paths ?? res?.paths) as string[] | undefined
                      const url = paths?.[0]
                      if (url && !file.url) return { ...file, url }
                    }
                    return file
                  })
                  setFileList(mapped)
                }}
              >
                {fileList.length >= 8 ? null : (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item
              label="用户名"
              name="userName"
              rules={[
                { required: true, message: '此项为必填' },
                {
                  async validator(_, value) {
                    if (!value || typeof value !== 'string') return
                    const trimmed = value.trim()
                    if (!trimmed) return
                    const res = await checkUserExists(trimmed, initialValues?.id as number | undefined)
                    if (res.exists) return Promise.reject(new Error('该用户名已存在，不可添加'))
                  },
                },
              ]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item
              label={initialValues?.userName ? '密码（不改可留空）' : '密码'}
              name="password"
              rules={initialValues?.userName ? [] : [{ required: true, message: '此项为必填' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
            <Form.Item
              label="性别"
              name="gender"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <Select options={genderOptions} placeholder="请选择性别" />
            </Form.Item>
            <Form.Item
              label="联系方式"
              name="contact"
              rules={[{ required: true, message: '此项为必填' }]}
            >
              <Input placeholder="请输入联系方式" />
            </Form.Item>
            <Form.Item label="角色分配" name="roleId">
              <Select
                placeholder="默认：普通业务员"
                allowClear
                options={roles.map((r) => ({ label: r.roleName, value: r.id }))}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}

