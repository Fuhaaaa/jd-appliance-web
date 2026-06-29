import { View, Text } from '@tarojs/components'

interface HighlightTextProps {
  text: string
  className?: string
}

/**
 * 高亮文本组件
 * 解析后端返回的 <hl>高亮文本</hl> 标记
 * 支持小程序和H5双端
 */
export default function HighlightText({ text, className = '' }: HighlightTextProps) {
  if (!text) return null

  // 解析 <hl> 标记，将其分割为普通文本和高亮文本
  const parts: Array<{ text: string; highlight: boolean }> = []
  const regex = /<hl>(.*?)<\/hl>/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // 添加高亮前的普通文本
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        highlight: false
      })
    }
    // 添加高亮文本
    parts.push({
      text: match[1],
      highlight: true
    })
    lastIndex = regex.lastIndex
  }

  // 添加最后一段普通文本
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      highlight: false
    })
  }

  // 如果没有找到高亮标记，直接返回原文
  if (parts.length === 0) {
    return <Text className={className}>{text}</Text>
  }

  return (
    <View className={className} style='display: inline;'>
      {parts.map((part, index) =>
        part.highlight ? (
          <Text key={index} className='highlight' style='color: #ff6b35; font-weight: 500;'>
            {part.text}
          </Text>
        ) : (
          <Text key={index}>{part.text}</Text>
        )
      )}
    </View>
  )
}
