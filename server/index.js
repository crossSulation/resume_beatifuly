/**
 * 简历编辑助手 - 内置 LLM 代理服务
 *
 * 作用：在服务器端保存 API Key（LLM_API_KEY），浏览器只请求本服务的 /api/chat，
 * 避免 Key 暴露在前端代码中。同时托管构建产物（dist），可直接用于生产部署。
 *
 * 环境变量：
 *   LLM_API_KEY   - 上游模型服务 API Key（必填）
 *   LLM_BASE_URL  - 上游接口地址，默认 https://api.openai.com/v1
 *   PORT          - 监听端口，默认 8787
 */
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT || 8787)
const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(rootDir, '..', 'dist')

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    try {
      if (!LLM_API_KEY) {
        return sendJson(res, 503, { error: '服务器未配置 LLM_API_KEY，请在服务端环境变量中设置' })
      }
      const body = JSON.parse((await readBody(req)) || '{}')
      const upstream = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: body.model,
          temperature: body.temperature,
          response_format: body.response_format,
          max_tokens: body.max_tokens,
          messages: body.messages,
        }),
      })
      const text = await upstream.text()
      res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(text)
    } catch (err) {
      sendJson(res, 500, { error: String(err?.message || err) })
    }
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, configured: Boolean(LLM_API_KEY), baseUrl: LLM_BASE_URL })
  }

  if (req.method === 'GET' && existsSync(distDir)) {
    let filePath = path.join(distDir, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname))
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403)
      return res.end('Forbidden')
    }
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html')
    }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
    res.end(await readFile(filePath))
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not Found')
})

server.listen(PORT, () => {
  console.log(`[resume-beautify] 服务已启动：http://localhost:${PORT}`)
  console.log(`[resume-beautify] 代理模式：${LLM_API_KEY ? '已配置 LLM_API_KEY' : '未配置 LLM_API_KEY（前端将无法通过代理调用模型）'}`)
})
