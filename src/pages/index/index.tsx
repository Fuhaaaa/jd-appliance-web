import { useState, useEffect, useRef } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  getSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  clearSearchHistory
} from '../../utils/storage'
import { getSuggest } from '../../utils/request'
import './index.scss'

export default function Index() {
  const [keyword, setKeyword] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const debounceTimer = useRef<any>(null)

  useEffect(() => {
    setSearchHistory(getSearchHistory())
  }, [])

  const go = (kw: string) => {
    if (!kw.trim()) return
    setShowSuggest(false)
    const newHistory = addSearchHistory(kw)
    setSearchHistory(newHistory)
    Taro.navigateTo({ url: `/pages/list/list?keyword=${encodeURIComponent(kw)}` })
  }

  // 防抖输入：300ms 后请求搜索建议
  const handleInput = (value: string) => {
    setKeyword(value)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    if (!value.trim()) {
      setSuggestions([])
      setShowSuggest(false)
      return
    }
    debounceTimer.current = setTimeout(() => {
      getSuggest(value).then(res => {
        if (res.code === 0 && res.data && res.data.length > 0) {
          setSuggestions(res.data)
          setShowSuggest(true)
        } else {
          setSuggestions([])
          setShowSuggest(false)
        }
      }).catch(() => {
        setSuggestions([])
        setShowSuggest(false)
      })
    }, 300)
  }

  const handleRemoveHistory = (kw: string) => {
    const newHistory = removeSearchHistory(kw)
    setSearchHistory(newHistory)
  }

  const handleClearHistory = () => {
    Taro.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          clearSearchHistory()
          setSearchHistory([])
        }
      }
    })
  }

  return (
    <View className='page'>
      <View className='page-content'>
        {/* 搜索框 */}
        <View className='search'>
          <View className='search-icon-wrap'>
            <Text className='search-icon-text'>⌕</Text>
          </View>
          <Input
            className='search-input'
            placeholder='搜索家电型号、品牌...'
            placeholderClass='placeholder'
            value={keyword}
            onInput={e => handleInput(e.detail.value)}
            confirmType='search'
            onConfirm={() => go(keyword)}
            onBlur={() => {
              // 延迟隐藏，让点击建议项的事件先触发
              setTimeout(() => setShowSuggest(false), 200)
            }}
          />
          {keyword && (
            <View className='search-clear' onClick={() => { setKeyword(''); setSuggestions([]); setShowSuggest(false) }}>
              <Text className='search-clear-text'>×</Text>
            </View>
          )}
        </View>

        {/* 搜索建议下拉 */}
        {showSuggest && suggestions.length > 0 && (
          <View className='suggest-dropdown'>
            {suggestions.map((item, index) => (
              <View key={index} className='suggest-item' onClick={() => go(item)}>
                <Text className='suggest-icon'>⌕</Text>
                <Text className='suggest-text'>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 搜索历史（本地缓存） */}
        <View className='section'>
          <View className='section-header'>
            <Text className='section-title'>搜索历史</Text>
            {searchHistory.length > 0 && (
              <View className='section-action' onClick={handleClearHistory}>
                <Text className='section-action-text'>清空</Text>
              </View>
            )}
          </View>
          {searchHistory.length > 0 ? (
            <View className='history-list'>
              {searchHistory.map((item, index) => (
                <View key={index} className='history-item' onClick={() => go(item)}>
                  <View className='history-dot' />
                  <Text className='history-text'>{item}</Text>
                  <View
                    className='history-delete'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveHistory(item)
                    }}
                  >
                    <Text className='history-delete-text'>×</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='empty-state'>
              <Text className='empty-text'>暂无搜索历史</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
