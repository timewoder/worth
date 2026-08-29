# Worth

[中文](#中文) · [English](#english)

A responsive calculator for estimating a VPS server's remaining value.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/timewoder/worth)

## 中文

### 简介

Worth 是一个 VPS 服务器剩余价值计算器，可根据续费价格、付款周期、交易日期和到期日期，快速估算服务器当前剩余价值。

### 功能

- 支持 USD、CNY、EUR、GBP、JPY、KRW、AUD、CAD、SGD 和 HKD
- 通过 ExchangeRate-API 获取并缓存实时汇率
- 支持月付、季付、半年付、年付、两年付和三年付
- 支持自动计算或点击按钮手动计算
- 展示交易日期、到期日期、剩余天数、总价值和剩余价值
- 一键复制 Markdown 格式计算结果
- 自动跟随系统浅色/深色模式，也可手动选择并保存偏好
- 响应式布局，适配手机、平板、macOS 和 Windows 浏览器
- 支持 Python 本地运行与 Cloudflare Workers 边缘部署

### 项目结构

```text
worth/
├── public/          # HTML、CSS 和浏览器端 JavaScript
├── src/index.js     # Cloudflare Worker 与汇率 API
├── server.py        # 本地或传统服务器运行入口
├── wrangler.jsonc   # Cloudflare Workers 配置
└── package.json     # Wrangler 命令与依赖
```

### 本地运行

只需要 Python 3：

```bash
python3 server.py --host 0.0.0.0 --port 8080
```

打开 `http://localhost:8080`。

如需模拟 Cloudflare Workers 环境，请安装 Node.js 22 或更高版本：

```bash
npm install
npm run dev
```

### 部署到 Cloudflare Workers

#### 一键部署（推荐）

点击下面的按钮，登录 Cloudflare 后按页面提示创建并部署 Worker：

[![部署到 Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/timewoder/worth)

部署流程会自动复制本 GitHub 仓库、安装依赖并读取 `wrangler.jsonc`。完成后，Cloudflare 会提供一个 `*.workers.dev` 访问地址。

#### 使用命令行部署

```bash
npm install
npx wrangler login
npm run deploy
```

Worker 会托管 `public/` 内的静态文件，并优先处理 `/api/rates`。无需数据库、KV 或自定义环境变量。

### 通过 GitHub 自动部署

在 Cloudflare Workers & Pages 控制台连接本仓库，并设置：

- 构建命令：留空
- 部署命令：`npm run deploy`
- Node.js 版本：22 或更高

### 汇率与隐私

汇率来自 [ExchangeRate-API](https://www.exchangerate-api.com/)。Worker 会在 Cloudflare 边缘缓存结果；所有价值与费用计算均在浏览器本地完成，表单内容不会发送到服务器。

## English

### Overview

Worth estimates a VPS server's remaining value from its renewal price, billing period, transaction date, and expiry date.

### Features

- Supports USD, CNY, EUR, GBP, JPY, KRW, AUD, CAD, SGD, and HKD
- Fetches and caches live rates from ExchangeRate-API
- Supports monthly, quarterly, semiannual, annual, two-year, and three-year billing
- Calculates automatically or on demand
- Shows transaction date, expiry date, remaining days, total value, and remaining value
- Copies the result in Markdown format
- Follows the system light/dark appearance with a persistent manual override
- Responsive across phones, tablets, macOS, and Windows browsers
- Runs locally with Python or at the edge with Cloudflare Workers

### Project structure

```text
worth/
├── public/          # HTML, CSS, and browser-side JavaScript
├── src/index.js     # Cloudflare Worker and exchange-rate endpoint
├── server.py        # Local and traditional server entry point
├── wrangler.jsonc   # Cloudflare Workers configuration
└── package.json     # Wrangler scripts and dependencies
```

### Run locally

With Python 3 only:

```bash
python3 server.py --host 0.0.0.0 --port 8080
```

Open `http://localhost:8080`.

To emulate the Cloudflare Workers environment, install Node.js 22 or later:

```bash
npm install
npm run dev
```

### Deploy to Cloudflare Workers

#### One-click deployment (recommended)

Click the button below, sign in to Cloudflare, and follow the prompts to create and deploy the Worker:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/timewoder/worth)

The flow copies this GitHub repository, installs its dependencies, and reads `wrangler.jsonc` automatically. Cloudflare provides a `*.workers.dev` URL when deployment finishes.

#### Deploy from the command line

```bash
npm install
npx wrangler login
npm run deploy
```

The Worker serves the files in `public/` and runs first for `/api/rates`. No database, KV namespace, or custom environment variable is required.

### Automatic deployment from GitHub

Connect this repository in the Cloudflare Workers & Pages dashboard and configure:

- Build command: leave empty
- Deploy command: `npm run deploy`
- Node.js version: 22 or later

### Rates and privacy

Exchange rates are provided by [ExchangeRate-API](https://www.exchangerate-api.com/) and cached at the Cloudflare edge. All value and fee calculations run locally in the browser; form values are never sent to the server.

## License

MIT
