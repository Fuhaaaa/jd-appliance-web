/**
 * 修复所有 json 文件中 comp 自引用问题的 webpack 插件
 */
const fs = require('fs')
const path = require('path')

function fixJsonFiles(dir) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      fixJsonFiles(fullPath)
    } else if (entry.name.endsWith('.json')) {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
      if (content.usingComponents && content.usingComponents.comp) {
        delete content.usingComponents.comp
        fs.writeFileSync(fullPath, JSON.stringify(content))
        console.log(`✅ 已修复: ${path.relative(process.cwd(), fullPath)}`)
      }
    }
  }
}

class FixCompPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('FixCompPlugin', (compilation, callback) => {
      const distDir = path.resolve(compiler.context, 'dist/weapp')
      fixJsonFiles(distDir)
      callback()
    })
  }
}

module.exports = FixCompPlugin
