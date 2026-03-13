/**
 * Minimal 省-市-区-街道 cascade data for house region filter.
 * Format: Antd Cascader options (label, value, children?).
 */
export interface RegionOption {
  label: string
  value: string
  children?: RegionOption[]
}

export const regionOptions: RegionOption[] = [
  {
    label: '江苏省',
    value: '江苏省',
    children: [
      {
        label: '苏州市',
        value: '苏州市',
        children: [
          {
            label: '姑苏区',
            value: '姑苏区',
            children: [
              { label: '双塔街道', value: '双塔街道' },
              { label: '沧浪街道', value: '沧浪街道' },
            ],
          },
          {
            label: '工业园区',
            value: '工业园区',
            children: [
              { label: '娄葑街道', value: '娄葑街道' },
              { label: '斜塘街道', value: '斜塘街道' },
            ],
          },
        ],
      },
      {
        label: '南京市',
        value: '南京市',
        children: [
          {
            label: '玄武区',
            value: '玄武区',
            children: [
              { label: '梅园新村街道', value: '梅园新村街道' },
              { label: '新街口街道', value: '新街口街道' },
            ],
          },
        ],
      },
    ],
  },
  {
    label: '浙江省',
    value: '浙江省',
    children: [
      {
        label: '杭州市',
        value: '杭州市',
        children: [
          {
            label: '西湖区',
            value: '西湖区',
            children: [
              { label: '灵隐街道', value: '灵隐街道' },
              { label: '文三路街道', value: '文三路街道' },
            ],
          },
        ],
      },
    ],
  },
]
