# 部署说明：GitHub Pages + Cloudflare Workers/D1

当前部署目标：

- 前端：GitHub Pages，仓库 `https://github.com/17602842555/ydhy.git`
- 后端：Cloudflare Worker，Worker 名称 `ydhy-api`
- 后端地址：`https://ydhy-api.2445776963.workers.dev`
- 数据库：Cloudflare D1，数据库名 `ydhy-db`

## 1. 本地推送到 GitHub

```bash
git init
git branch -M main
git remote add origin https://github.com/17602842555/ydhy.git
git add .
git commit -m "Deploy HUAGE dashboard to GitHub and Cloudflare"
git push -u origin main
```

如果本机没有 GitHub 登录态，先执行：

```bash
gh auth login
```

## 2. GitHub Pages 前端

项目已经添加 `.github/workflows/frontend-github-pages.yml`。

推送到 `main` 后，在 GitHub 仓库里打开：

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

前端构建会自动使用：

```text
VITE_BASE_PATH=/ydhy/
```

如果后续前端切到真实 API，在 GitHub 仓库变量里增加：

```text
VITE_API_BASE_URL=https://<your-worker-subdomain>.workers.dev/api
```

## 3. 创建 Cloudflare D1

先登录 Cloudflare：

```bash
npx wrangler login
```

创建 D1：

```bash
npx wrangler d1 create ydhy-db
```

当前 D1 database id 已写入 `wrangler.jsonc`：

```text
345ac340-35da-48ca-a75e-ab8a471865dc
```

如果后续重建数据库，把返回的 `database_id` 填到两个地方之一：

- 本地：替换 `wrangler.jsonc` 里的 `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID`
- GitHub Actions：仓库 `Settings -> Secrets and variables -> Actions -> Secrets` 增加 `CLOUDFLARE_D1_DATABASE_ID`

## 4. Cloudflare 后端部署

本地部署：

```bash
export CLOUDFLARE_D1_DATABASE_ID=<your-d1-database-id>
export HUAGE_CORS_ORIGIN=https://17602842555.github.io,http://127.0.0.1:5173
npm run cf:seed:generate
node scripts/prepare-cloudflare-config.mjs
npm run cf:d1:migrate:remote
npm run cf:d1:seed:remote
npx wrangler deploy
```

如果要让线上看板调用 Ark Coding Plan 分析，先把 API key 写入 Cloudflare Secret，不要写进前端环境变量：

```bash
npx wrangler secret put ARK_API_KEY
```

GitHub Actions 部署需要设置这些 Secret：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_D1_DATABASE_ID
ARK_API_KEY
```

建议再设置仓库变量：

```text
HUAGE_CORS_ORIGIN=https://17602842555.github.io,http://127.0.0.1:5173
VITE_API_BASE_URL=https://<your-worker-subdomain>.workers.dev/api
ARK_MODEL=ark-code-latest
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3
ARK_TIMEOUT_MS=75000
```

## 5. 验证

后端：

```bash
curl https://ydhy-api.2445776963.workers.dev/api/health
```

登录并读取经营系统：

```bash
TOKEN=$(curl -sS -X POST https://ydhy-api.2445776963.workers.dev/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"userId":"user-lijinning","password":"123456"}' | node -pe "JSON.parse(fs.readFileSync(0,'utf8')).token")

curl -sS https://ydhy-api.2445776963.workers.dev/api/operating-system \
  -H "Authorization: Bearer $TOKEN"
```

验证 Ark Coding Plan 分析接口：

```bash
curl -sS https://ydhy-api.2445776963.workers.dev/api/ai/insights \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refresh":true,"section":"decision","context":{"label":"全局决策包"}}'
```

不带 `refresh:true` 时只读取后端保存的分析结果；没有保存记录会返回 `404 ai_insight_cache_miss`。

验证 Ark Coding Plan 连接诊断接口：

```bash
curl -sS https://ydhy-api.2445776963.workers.dev/api/ai/test-connection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"aiSettings":{"model":"ark-code-latest","baseUrl":"https://ark.cn-beijing.volces.com/api/coding/v3"}}'
```

## 当前限制

Cloudflare Worker 版本已经把结构化运行数据放入 D1。导入文件的二进制原件下载接口当前未接 R2，因此 `/api/imports/:id/source-file` 在 Cloudflare 端会返回未配置文件存储；本地 Node API 仍支持本地文件归档。
