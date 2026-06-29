import Taro from '@tarojs/taro'

const SEARCH_HISTORY_KEY = 'search_history'
const MAX_HISTORY_LENGTH = 10

// 获取搜索历史
export const getSearchHistory = (): string[] => {
  try {
    const history = Taro.getStorageSync(SEARCH_HISTORY_KEY)
    return history ? JSON.parse(history) : []
  } catch {
    return []
  }
}

// 添加搜索历史
export const addSearchHistory = (keyword: string): string[] => {
  if (!keyword.trim()) return getSearchHistory()

  const history = getSearchHistory()
  // 移除重复项
  const newHistory = history.filter(item => item !== keyword)
  // 新关键词添加到最前面
  newHistory.unshift(keyword)
  // 最多保存 10 条
  const trimmedHistory = newHistory.slice(0, MAX_HISTORY_LENGTH)

  try {
    Taro.setStorageSync(SEARCH_HISTORY_KEY, JSON.stringify(trimmedHistory))
  } catch {
    console.error('保存搜索历史失败')
  }

  return trimmedHistory
}

// 删除单条搜索历史
export const removeSearchHistory = (keyword: string): string[] => {
  const history = getSearchHistory()
  const newHistory = history.filter(item => item !== keyword)

  try {
    Taro.setStorageSync(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  } catch {
    console.error('删除搜索历史失败')
  }

  return newHistory
}

// 清空搜索历史
export const clearSearchHistory = (): void => {
  try {
    Taro.removeStorageSync(SEARCH_HISTORY_KEY)
  } catch {
    console.error('清空搜索历史失败')
  }
}
