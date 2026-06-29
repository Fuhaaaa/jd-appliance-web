import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { getProductDetail, fixImageUrl } from '../../utils/request'
import { decodeHtmlEntities } from '../../utils/decode'
import './detail.scss'

interface ProductDetail {
  id: number
  name: string
  brand: string
  model: string
  images: string[]
  params: Record<string, string>
}

export default function Detail() {
  const router = useRouter()
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const id = Number(router.params.id) || 1
    getProductDetail(id).then(res => {
      if (res.code === 0) setDetail(res.data as ProductDetail)
    })
  }, [])

  if (!detail) {
    return (
      <View className='page'>
        <View className='loading'>
          <View className='loading-spinner' />
          <Text className='loading-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  // 获取产品图片（支持多图）
  const productImages = (detail.images || []).map(fixImageUrl)
  const mainImage = productImages[currentImageIndex] || ''

  // 获取产品标签
  const tags = [
    detail.brand,
    detail.params?.['产品类别'],
    detail.params?.['总容积'],
    detail.params?.['制冷方式'],
  ].filter(Boolean)

  // 平铺的参数列表
  const paramEntries = Object.entries(detail.params || {}).filter(
    ([_, value]) => value && String(value).trim() !== ''
  )

  return (
    <View className='page'>
      <ScrollView className='content' scrollY>
        {/* 产品主图区域 */}
        <View className='product-hero'>
          <View className='product-image-container'>
            {mainImage ? (
              <Image
                className='product-image'
                src={mainImage}
                mode={process.env.TARO_ENV === 'h5' ? 'aspectFit' : 'widthFix'}
                lazyLoad
                onClick={() => {
                  if (process.env.TARO_ENV === 'h5') {
                    setShowPreview(true)
                  } else {
                    Taro.previewImage({
                      urls: productImages,
                      current: mainImage
                    })
                  }
                }}
              />
            ) : (
              <View className='product-image-placeholder'>
                <Text className='product-image-icon'>⬡</Text>
                <Text className='product-image-text'>暂无图片</Text>
              </View>
            )}
          </View>

          {/* 多图切换指示器 */}
          {productImages.length > 1 && (
            <View className='product-image-indicators'>
              {productImages.map((_, index) => (
                <View
                  key={index}
                  className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </View>
          )}

          <View className='product-info'>
            <Text className='product-name'>{detail.name || '未知产品'}</Text>
            <View className='product-tags'>
              {tags.map((tag, index) => (
                <Text key={index} className={`product-tag ${index === 0 ? 'hl' : ''}`}>
                  {tag}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* 参数列表（平铺） */}
        <View className='params-container'>
          <View className='params-card'>
            {paramEntries.map(([label, value], i) => (
              <View key={i} className='param-row'>
                <Text className='param-label'>{label}</Text>
                <Text className='param-value'>{decodeHtmlEntities(String(value))}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* H5 图片预览弹窗 */}
      {process.env.TARO_ENV === 'h5' && showPreview && (
        <View className='image-preview-overlay' onClick={() => setShowPreview(false)}>
          <View className='image-preview-close' onClick={() => setShowPreview(false)}>✕</View>
          <Image
            className='image-preview-img'
            src={mainImage}
            mode='aspectFit'
            onClick={(e) => e.stopPropagation()}
          />
        </View>
      )}
    </View>
  )
}
