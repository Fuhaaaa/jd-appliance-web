import { useState, useEffect } from 'react'
import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { searchProducts, getRecommend, fixImageUrl } from '../../utils/request'
import { addSearchHistory } from '../../utils/storage'
import { decodeHtmlEntities } from '../../utils/decode'
import HighlightText from '../../components/HighlightText/HighlightText'
import './list.scss'

interface Product {
  id: number
  title: string
  img: string
  tag: string[]
}

interface RecommendBrand {
  brand: string
  name: string
  count: number
}

interface RecommendProduct {
  id: number
  name: string
  brand: string
  images: string[]
}

export default function List() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [recommendBrands, setRecommendBrands] = useState<RecommendBrand[]>([])
  const [recommendProducts, setRecommendProducts] = useState<RecommendProduct[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    const kw = decodeURIComponent(router.params.keyword || '')
    setKeyword(kw)
    if (kw) {
      fetchProducts(kw, 1)
    }
  }, [])

  const fetchProducts = async (kw: string, pageNum: number) => {
    if (!kw.trim()) return
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setSearched(true)
    try {
      const res = await searchProducts(kw, pageNum)
      if (res.code === 0) {
        const list = res.data as Product[]
        if (pageNum === 1) {
          setProducts(list)
        } else {
          setProducts(prev => [...prev, ...list])
        }
        setTotalPages(res.pagination?.totalPages || 1)
        setPage(pageNum)
        // 搜索无结果时，加载推荐数据
        if (pageNum === 1 && list.length === 0) {
          loadRecommend()
        }
      }
    } catch (e) {
      console.error(e)
      if (pageNum === 1) {
        setProducts([])
        loadRecommend()
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // 加载更多
  const loadMore = () => {
    if (loadingMore || page >= totalPages || loading) return
    fetchProducts(keyword, page + 1)
  }

  // 滚动到底部时自动加载
  const onScrollToLower = () => {
    loadMore()
  }

  const loadRecommend = async () => {
    try {
      const res = await getRecommend()
      if (res.code === 0 && res.data) {
        setRecommendBrands(res.data.brands || [])
        setRecommendProducts(res.data.products || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSearch = () => {
    if (!keyword.trim()) return
    addSearchHistory(keyword)
    fetchProducts(keyword, 1)
  }

  return (
    <View className='page'>
      {/* 顶部搜索栏 */}
      <View className='topbar'>
        <View className='back' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon'>‹</Text>
        </View>
        <View className='search-box'>
          <View className='search-icon-wrap'>
            <Text className='search-icon-text'>⌕</Text>
          </View>
          <Input
            className='search-input'
            placeholder='搜索家电...'
            placeholderClass='placeholder'
            value={keyword}
            onInput={e => setKeyword(e.detail.value)}
            confirmType='search'
            onConfirm={handleSearch}
          />
          {keyword && (
            <View className='search-clear' onClick={() => setKeyword('')}>
              <Text className='search-clear-text'>×</Text>
            </View>
          )}
        </View>
      </View>

      {/* 搜索结果列表 */}
      <ScrollView
        className='list-scroll'
        scrollY
        onScrollToLower={onScrollToLower}
        lowerThreshold={100}
      >
        <View className='list-wrapper'>
        <View className='list'>
          {loading ? (
            <View className='loading-state'>
              <View className='loading-spinner' />
              <Text className='loading-text'>搜索中...</Text>
            </View>
          ) : products.length > 0 ? (
            <View className='result-count'>
              <Text className='result-count-text'>共 {products.length} 个结果</Text>
            </View>
          ) : null}

          {products.map(item => (
            <View
              key={item.id}
              className='card'
              onClick={() => Taro.navigateTo({ url: `/pages/detail/detail?id=${item.id}` })}
            >
              <View className='card-img'>
                {item.img ? (
                  <Image src={fixImageUrl(item.img)} mode='aspectFill' style='width:100%;height:100%' />
                ) : (
                  <View className='card-img-placeholder'>
                    <Text className='card-img-icon'>⬡</Text>
                  </View>
                )}
              </View>
              <View className='card-info'>
                <HighlightText text={item.title} className='card-title' />
                {item.tag?.length > 0 && (
                  <View className='card-tags'>
                    {item.tag.slice(0, 3).map((t, i) => (
                      <HighlightText key={i} text={decodeHtmlEntities(t)} className='card-tag' />
                    ))}
                  </View>
                )}
                <View className='card-action'>
                  <Text className='card-action-text'>查看详情 →</Text>
                </View>
              </View>
            </View>
          ))}

          {/* 加载状态提示 */}
          {products.length > 0 && (
            <View className='load-more'>
              {loadingMore ? (
                <View className='load-more-loading'>
                  <View className='load-more-spinner' />
                  <Text className='load-more-text'>加载中...</Text>
                </View>
              ) : page >= totalPages ? (
                <Text className='load-more-no-more'>没有更多了</Text>
              ) : null}
            </View>
          )}

          {/* 空结果推荐 */}
          {searched && products.length === 0 && !loading && (
            <View className='empty-recommend'>
              <View className='empty-header'>
                <Text className='empty-icon-text'>∅</Text>
                <Text className='empty-text'>未找到相关商品</Text>
                <Text className='empty-hint'>换个关键词试试，或看看以下推荐</Text>
              </View>

              {recommendBrands.length > 0 && (
                <View className='recommend-section'>
                  <Text className='recommend-title'>热门品牌</Text>
                  <View className='recommend-brands'>
                    {recommendBrands.map((b) => (
                      <View
                        key={b.brand}
                        className='recommend-brand-tag'
                        onClick={() => { setKeyword(b.name); fetchProducts(b.name, 1) }}
                      >
                        <Text className='recommend-brand-name'>{b.name}</Text>
                        <Text className='recommend-brand-count'>{b.count}款</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {recommendProducts.length > 0 && (
                <View className='recommend-section'>
                  <Text className='recommend-title'>热门商品</Text>
                  {recommendProducts.map((p) => (
                    <View
                      key={p.id}
                      className='recommend-card'
                      onClick={() => Taro.navigateTo({ url: `/pages/detail/detail?id=${p.id}` })}
                    >
                      {p.images?.[0] && (
                        <Image className='recommend-img' src={fixImageUrl(p.images[0])} mode='aspectFill' />
                      )}
                      <Text className='recommend-name'>{p.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
        </View>
      </ScrollView>
    </View>
  )
}
