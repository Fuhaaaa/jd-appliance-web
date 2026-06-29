/**
 * HTML 实体解码工具
 * 解码 &#xxx; 格式的 HTML 实体
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return ''

  let decoded = text

  // 解码 &#xxx; 格式的数字实体（必须先处理）
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => {
    return String.fromCharCode(parseInt(num, 10))
  })

  // 解码 &#xHH; 格式的十六进制实体
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })

  // 替换命名实体
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&bull;': '•',
    '&middot;': '·',
    '&nbsp;': ' ',
  }

  Object.entries(entities).forEach(([entity, char]) => {
    decoded = decoded.replace(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), char)
  })

  return decoded
}
