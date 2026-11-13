export const REPO_URL = 'https://github.com/MTaheridev/AutoBI';
export const PROFILE_URL = 'https://github.com/MTaheridev';

export const creator = {
  name: 'Mohammad Taheri',
  handle: '@MTaheridev',
  role: 'Software Engineer · Creator & Architect',
  quote:
    'I got tired of begging a gatekeeping BI manager for a 10-line GROUP BY on databases I helped build. So I engineered the system that makes the bottleneck obsolete.',
  summary:
    'AutoBI is a production TypeScript monorepo — Agent Mode, four SQL connectors, semantic layer with human approval, safe query engine, and interactive ECharts dashboards. Three runtime services, nine shared packages, Argon2id/Redis sessions, and AES-256-GCM secrets.',
} as const;

export const heroFacts = [
  '4 SQL Dialects',
  'Zero Jira Ticket Queues',
  'AES-256-GCM Secrets',
  '7 ECharts Widgets',
  'Human-Approved Semantics',
  'BullMQ Async Introspection',
  '100% TypeScript Monorepo',
] as const;

export const originIncidents = [
  {
    id: 'ticket-queue',
    incident: 'INCIDENT 01 · T+14 DAYS',
    badge: 'The Two-Sprint GROUP BY',
    title: 'Fourteen days for a chart that takes twelve seconds of SQL.',
    story:
      'As a software engineer, product asked me a simple question: how is net revenue trending by region after Tuesday’s release? I didn’t get a query. I got told to open a BI ticket, justify the business priority, wait two sprints, and sit through a lecture on why engineering "shouldn’t touch analytics."',
    symptom: 'STATUS: BLOCKED BY GATEKEEPER · ETA: NEXT QUARTER',
    antidote: 'Killed by: Natural-Language Dashboard Engine + Instant ECharts Spec',
  },
  {
    id: 'secret-metrics',
    incident: 'INCIDENT 02 · TRIBAL FORMULAS',
    badge: 'Hoarded Definitions',
    title: 'One manager kept every metric formula locked in his head.',
    story:
      'Ask what "Active Net Revenue" meant on Monday and you got one number. Ask on Thursday and the denominator quietly changed because one person treated SQL definitions like private job security — never versioned, never reviewed, and impossible to audit.',
    symptom: 'CONFLICT: 3 SLIDE DECKS · 3 DIFFERENT REVENUE NUMBERS',
    antidote: 'Killed by: Human-Governed Semantic Engine (Propose → Approve / Reject)',
  },
  {
    id: 'access-lockout',
    incident: 'INCIDENT 03 · THE CSV EXCUSE',
    badge: 'Locked Out of Our Own Schema',
    title: 'Trusted to ship production code. Blocked from running SELECT.',
    story:
      'The engineers who designed the tables, indexes, and migrations were locked out of read replicas "for safety" — while the BI gatekeeper emailed unencrypted 40MB CSV exports over Slack. Security theater was being used as an excuse for control.',
    symptom: 'SECURITY THEATER: RAW CSV ATTACHMENTS · ZERO AUDIT TRAIL',
    antidote: 'Killed by: Allow-Listed QueryPlan Compiler + AES-256-GCM Pooled Connectors',
  },
  {
    id: 'overhead-tax',
    incident: 'INCIDENT 04 · THE BREAKING POINT',
    badge: 'Paying for Friction',
    title: 'Stop wasting budget on people who annoy your team and slow shipping down.',
    story:
      'Watching real engineering velocity and six-figure budget burn on ego, politics, and gatekeeping was the final straw. If you want to stop wasting money on people who manufacture friction — and let your team ship governed answers in seconds — I designed AutoBI for you.',
    symptom: 'RESOLUTION: REPLACE POLITICS WITH DETERMINISTIC SOFTWARE',
    antidote: 'Shipped: Self-Hosted Open Architecture · Zero Per-Seat Ransom',
  },
] as const;

export const bottleneckToFeature = [
  {
    id: 'bridge-dashboards',
    chapter: 'From Incident 01',
    painTitle: '“File a ticket and wait two sprints for a bar chart.”',
    painMeta: '14-day queue · manual chart wiring',
    engineName: '@autobi/dashboard-engine',
    featureTitle: 'Prompt-to-Dashboard JSON Spec in Seconds',
    featureBody:
      'Describe the view in plain English. AutoBI emits a Zod-validated DashboardSpec across 7 ECharts widget types (KPI, line, bar, area, pie, donut, table) on a 12-column draggable grid.',
  },
  {
    id: 'bridge-semantics',
    chapter: 'From Incident 02',
    painTitle: '“Only the BI manager knows the real revenue formula.”',
    painMeta: 'Unwritten SQL · shifting definitions',
    engineName: '@autobi/semantic-engine',
    featureTitle: 'Proposed Until a Human Clicks Approve',
    featureBody:
      'AI or deterministic heuristics inspect your SchemaSnapshot and propose entities, metrics, dimensions, and joins. Nothing becomes canonical until your team reviews and approves it.',
  },
  {
    id: 'bridge-compiler',
    chapter: 'From Incident 03',
    painTitle: '“We can’t let AI or engineers run queries — it might break prod.”',
    painMeta: 'Fear of rogue SQL · zero guardrails',
    engineName: '@autobi/query-engine',
    featureTitle: 'Structured QueryPlans, Never Arbitrary Raw SQL',
    featureBody:
      'AI never executes free-form SQL. Plans resolve approved metric IDs, check column allow-lists, synthesize FK INNER JOINs, enforce read-only safety, and cap runtime at 30s.',
  },
  {
    id: 'bridge-connectors',
    chapter: 'From Incident 03',
    painTitle: '“Our data is split across Postgres, MySQL, and legacy SQL Server.”',
    painMeta: 'Fragile scripts · emailed CSV dumps',
    engineName: '@autobi/connectors',
    featureTitle: 'Four Isolated, Pooled Production Adapters',
    featureBody:
      'Dedicated adapters for PostgreSQL (pg), MySQL (mysql2), MariaDB, and SQL Server (tedious) with TLS cert verification, SSRF private-host guards, and BullMQ background snapshots.',
  },
  {
    id: 'bridge-ai',
    chapter: 'From Incident 04',
    painTitle: '“Enterprise BI vendors lock us in and mark up AI tokens 10x.”',
    painMeta: 'Opaque SaaS pricing · leaked credentials',
    engineName: '@autobi/ai + @autobi/shared',
    featureTitle: 'Bring Your Own Model — Or Run Zero-Key Heuristics',
    featureBody:
      'Plug in OpenAI or OpenRouter keys per workspace (encrypted with AES-256-GCM, never logged or returned), or run offline with the built-in heuristic proposer.',
  },
  {
    id: 'bridge-versions',
    chapter: 'From Incident 04',
    painTitle: '“Someone edited the executive dashboard and broke Monday’s numbers.”',
    painMeta: 'Destructive edits · finger-pointing',
    engineName: 'DashboardVersion Ledger',
    featureTitle: 'Immutable Versioned Layout & NL Edits',
    featureBody:
      'Every natural-language tweak or drag-and-resize layout save appends a clean v2, v3 snapshot — preserving query run history and instant rollback.',
  },
] as const;

export const capabilities = [
  {
    id: 'connectors',
    span: 'md:col-span-7',
    storyRef: 'Kills CSV exports',
    title: 'Four production connectors',
    body: 'PostgreSQL, MySQL, MariaDB, and SQL Server through @autobi/connectors. TLS on by default, SSRF/private-host guards, connection pooling, and async SchemaSnapshot jobs.',
    tags: ['pg', 'mysql2', 'tedious', 'assertSafeDbHost'],
  },
  {
    id: 'semantics',
    span: 'md:col-span-5',
    storyRef: 'Kills hoarded formulas',
    title: 'Human-governed semantics',
    body: 'AI or heuristics propose entities, metrics, dimensions, and FK relationships. Everything stays Proposed until a reviewer Approves or Rejects.',
    tags: ['propose', 'approve', 'reject'],
  },
  {
    id: 'queries',
    span: 'md:col-span-5',
    storyRef: 'Kills rogue SQL',
    title: 'Safe dialect query compiler',
    body: 'Structured QueryPlans compile to dialect SQL with allow-listed columns, FK INNER JOINs, 30s statement timeouts, concurrency caps, and full run history.',
    tags: ['QueryPlan', 'allow-list', 'read-only'],
  },
  {
    id: 'dashboards',
    span: 'md:col-span-7',
    storyRef: 'Kills 14-day ticket queues',
    title: 'Versioned NL dashboards',
    body: 'Natural-language prompts emit validated DashboardSpec JSON on a 12-column grid — kpi, line, bar, area, pie, donut, table. Zero AI-generated executable frontend code.',
    tags: ['ECharts', '12-col grid', 'v1 → vN'],
  },
  {
    id: 'ai',
    span: 'md:col-span-6',
    storyRef: 'Kills vendor markup',
    title: 'Bring your own AI',
    body: 'OpenAI, OpenRouter, or zero-key heuristic mode per workspace. Keys encrypted with AES-256-GCM at rest — never returned in responses or written to logs.',
    tags: ['OpenAI', 'OpenRouter', 'heuristic'],
  },
  {
    id: 'security',
    span: 'md:col-span-6',
    storyRef: 'Kills security theater',
    title: 'Hardened workspace security',
    body: 'Argon2id passwords, Redis signed httpOnly sessions, email verification, role-based workspace invites, Helmet, CSRF origin checks, and Redis rate limits.',
    tags: ['Argon2id', 'Redis', 'RBAC'],
  },
] as const;

export type PipelineStageId = 'introspect' | 'semantics' | 'compile' | 'dashboard';

export const pipelineStages: {
  id: PipelineStageId;
  step: string;
  title: string;
  body: string;
  artifactLabel: string;
  artifact: string;
}[] = [
  {
    id: 'introspect',
    step: '01',
    title: 'Connect & introspect',
    body: 'Encrypt credentials with AES-256-GCM, verify TLS + host safety, then let the BullMQ worker capture a normalized SchemaSnapshot JSONB.',
    artifactLabel: 'SchemaSnapshot · JSONB',
    artifact: `{
  "dialect": "postgresql",
  "tables": ["orders", "customers", "subscriptions"],
  "fks": [
    { "from": "orders.customer_id", "to": "customers.id" }
  ],
  "normalizedTypes": ["integer", "number", "datetime", "string"]
}`,
  },
  {
    id: 'semantics',
    step: '02',
    title: 'Propose & approve meaning',
    body: 'Semantic engine proposes net_revenue, order_count, and verified joins. Humans approve once — ending metric arguments forever.',
    artifactLabel: 'Semantic Review · Governed',
    artifact: `metric  net_revenue     SUM(orders.amount)      APPROVED
metric  order_count     COUNT(orders.id)        APPROVED
dim     customer_region customers.region        APPROVED
join    orders → customers (customer_id = id)   APPROVED`,
  },
  {
    id: 'compile',
    step: '03',
    title: 'Compile & validate plan',
    body: 'QueryPlan resolves approved metric IDs, compiles dialect-specific SQL, and passes read-only + allow-list validation before touching your pool.',
    artifactLabel: 'Dialect SQL · Validated (18ms)',
    artifact: `SELECT "c"."region" AS "customer_region",
       SUM("o"."amount") AS "net_revenue",
       COUNT("o"."id") AS "order_count"
FROM "public"."orders" "o"
INNER JOIN "public"."customers" "c"
  ON "o"."customer_id" = "c"."id"
GROUP BY "c"."region"
ORDER BY "net_revenue" DESC
LIMIT 500;`,
  },
  {
    id: 'dashboard',
    step: '04',
    title: 'Render & version dashboard',
    body: 'NL prompt generates a DashboardVersion spec. ECharts widgets render immediately; follow-up prompts append v2, v3 non-destructively.',
    artifactLabel: 'DashboardSpec · v2',
    artifact: `{
  "version": 2,
  "title": "Post-Release Regional Revenue",
  "layout": { "columns": 12, "rowHeight": 80 },
  "widgets": [
    { "type": "kpi", "title": "Net Revenue", "w": 4, "h": 2 },
    { "type": "bar", "title": "Revenue by Region", "w": 8, "h": 4 }
  ]
}`,
  },
];

export type PlaygroundPreset = {
  id: string;
  label: string;
  prompt: string;
  dialect: string;
  compileMs: string;
  version: string;
  kpis: { label: string; value: string; delta: string }[];
  chartTitle: string;
  bars: { label: string; value: number; display: string }[];
  donutLabel: string;
  donutSplit: { name: string; pct: number }[];
  sql: string;
};

export const widgetPresets: PlaygroundPreset[] = [
  {
    id: 'revenue',
    label: 'Regional Revenue',
    prompt: 'Show net approved revenue and order volume by region for Q4, plus enterprise share.',
    dialect: 'PostgreSQL 16',
    compileMs: '14ms',
    version: 'Spec v3',
    kpis: [
      { label: 'Net Revenue', value: '$1.48M', delta: '+18.4% vs Q3' },
      { label: 'Approved Orders', value: '12,940', delta: '+9.1% vs Q3' },
      { label: 'Avg Deal Size', value: '$114.37', delta: 'Semantic #m_04' },
    ],
    chartTitle: 'Net revenue by customer_region',
    bars: [
      { label: 'NA-East', value: 92, display: '$512k' },
      { label: 'EU-West', value: 76, display: '$418k' },
      { label: 'NA-West', value: 61, display: '$334k' },
      { label: 'APAC', value: 40, display: '$216k' },
    ],
    donutLabel: 'Tier Mix',
    donutSplit: [
      { name: 'Enterprise', pct: 64 },
      { name: 'Growth', pct: 27 },
      { name: 'Starter', pct: 9 },
    ],
    sql: `SELECT "c"."region", SUM("o"."amount") AS "net_revenue"
FROM "orders" "o"
INNER JOIN "customers" "c" ON "o"."customer_id" = "c"."id"
GROUP BY "c"."region" ORDER BY "net_revenue" DESC LIMIT 250;`,
  },
  {
    id: 'latency',
    label: 'Fulfillment SLA',
    prompt: 'Compare p95 warehouse dispatch hours and on-time rate across fulfillment hubs.',
    dialect: 'MySQL 8.4',
    compileMs: '11ms',
    version: 'Spec v2',
    kpis: [
      { label: 'Global On-Time', value: '98.2%', delta: '+2.4% WoW' },
      { label: 'Avg Dispatch', value: '3.4 hrs', delta: '-42m WoW' },
      { label: 'Breached Shipments', value: '47', delta: 'Timeout cap: 30s' },
    ],
    chartTitle: 'On-time fulfillment % by hub_code',
    bars: [
      { label: 'FRA-01', value: 99, display: '99.1%' },
      { label: 'ORD-02', value: 95, display: '97.8%' },
      { label: 'NRT-01', value: 91, display: '96.4%' },
      { label: 'DAL-03', value: 84, display: '94.9%' },
    ],
    donutLabel: 'Carrier Split',
    donutSplit: [
      { name: 'Priority Air', pct: 52 },
      { name: 'Ground Fleet', pct: 38 },
      { name: 'Regional', pct: 10 },
    ],
    sql: `SELECT \`h\`.\`hub_code\`, AVG(\`s\`.\`dispatch_hours\`) AS \`avg_dispatch\`
FROM \`shipments\` \`s\`
INNER JOIN \`hubs\` \`h\` ON \`s\`.\`hub_id\` = \`h\`.\`id\`
GROUP BY \`h\`.\`hub_code\` LIMIT 250;`,
  },
  {
    id: 'cohorts',
    label: 'SaaS Expansion',
    prompt: 'Break down active ARR expansion and seat utilization by account cohort.',
    dialect: 'SQL Server 2022',
    compileMs: '19ms',
    version: 'Spec v4',
    kpis: [
      { label: 'Net Dollar Retention', value: '119%', delta: '+4.0 pts' },
      { label: 'Expansion ARR', value: '$420k', delta: 'Approved metric' },
      { label: 'Active Workspaces', value: '1,860', delta: 'Pooled read-only' },
    ],
    chartTitle: 'Expansion ARR by signup_quarter',
    bars: [
      { label: '2026-Q1', value: 88, display: '$164k' },
      { label: '2026-Q2', value: 71, display: '$128k' },
      { label: '2026-Q3', value: 49, display: '$82k' },
      { label: '2026-Q4', value: 31, display: '$46k' },
    ],
    donutLabel: 'Plan Health',
    donutSplit: [
      { name: 'Expanding', pct: 58 },
      { name: 'Steady', pct: 35 },
      { name: 'At Risk', pct: 7 },
    ],
    sql: `SELECT TOP (250) [a].[signup_quarter], SUM([e].[arr_delta]) AS [expansion_arr]
FROM [dbo].[arr_events] [e]
INNER JOIN [dbo].[accounts] [a] ON [e].[account_id] = [a].[id]
GROUP BY [a].[signup_quarter] ORDER BY [expansion_arr] DESC;`,
  },
];

export const roiComparison = [
  {
    dimension: 'Time from question to live chart',
    oldWay: '10–14 days in a Jira backlog + two alignment meetings',
    autobiWay: '~12 seconds from plain-English prompt to ECharts grid',
  },
  {
    dimension: 'Who owns metric formulas',
    oldWay: 'Hoarded in one manager’s private saved queries',
    autobiWay: 'Proposed by AI, reviewed & approved by your workspace',
  },
  {
    dimension: 'Database safety model',
    oldWay: 'Lock out engineers, email 40MB CSV dumps on Slack',
    autobiWay: 'Read-only QueryPlans, column allow-lists, 30s timeouts',
  },
  {
    dimension: 'AI & credential privacy',
    oldWay: 'Paste schema & sample rows into public chat tools',
    autobiWay: 'AES-256-GCM encrypted secrets; AI never sees DB creds',
  },
  {
    dimension: 'Annualized cost of answers',
    oldWay: 'Six-figure gatekeeping overhead + per-seat BI tax',
    autobiWay: 'Self-hosted TypeScript monorepo you control end-to-end',
  },
] as const;

export const technicalFaq = [
  {
    id: 'faq-sql',
    question: 'Does the AI ever execute raw SQL directly against my database?',
    answer:
      'Never. AI (or the zero-key heuristic engine) only outputs structured proposals validated by Zod contracts. @autobi/query-engine resolves approved semantic IDs, verifies every table and column against the introspected SchemaSnapshot allow-list, compiles parameterized dialect SQL, and runs a read-only safety validator before execution.',
  },
  {
    id: 'faq-prisma',
    question: 'Do you connect Prisma to customer databases?',
    answer:
      'No — that is a hard architectural boundary. Prisma talks exclusively to AutoBI’s own internal PostgreSQL metadata store. Customer databases are reached only through @autobi/connectors (pg, mysql2, tedious) with isolated pools, TLS verification, and SSRF host guards.',
  },
  {
    id: 'faq-frontend-code',
    question: 'Can AI inject arbitrary JavaScript into dashboards?',
    answer:
      'Never. Dashboards are pure JSON specs (DashboardSpec) rendered through a fixed, type-checked ECharts widget registry (kpi, line, bar, area, pie, donut, table) on react-grid-layout. No eval, no dynamic code execution.',
  },
  {
    id: 'faq-no-ai-key',
    question: 'Can I evaluate AutoBI locally without paying for an OpenAI/OpenRouter key?',
    answer:
      'Yes. Both @autobi/semantic-engine and @autobi/dashboard-engine include deterministic heuristic proposers out of the box. When you are ready, add workspace-scoped OpenAI or OpenRouter keys in AI Settings — encrypted at rest with AES-256-GCM.',
  },
] as const;

export const architectureNodes = [
  { id: 'web', label: 'apps/web', detail: 'Next.js 15 · :3100' },
  { id: 'api', label: 'apps/api', detail: 'NestJS /api/v1 · :3101' },
  { id: 'worker', label: 'apps/worker', detail: 'BullMQ consumer' },
  { id: 'postgres', label: 'Postgres', detail: 'Prisma app DB' },
  { id: 'redis', label: 'Redis', detail: 'sessions + queues' },
  { id: 'connectors', label: 'connectors', detail: 'customer DBs only' },
  { id: 'ai', label: 'ai layer', detail: 'no DB credentials' },
] as const;

export const architectureInvariants = [
  'Prisma talks only to AutoBI’s internal Postgres — never customer DBs.',
  'Connectors never import Nest or Prisma.',
  'AI providers never receive database credentials.',
] as const;

export const cliTabs = [
  {
    id: 'quickstart',
    label: '1. Quick Start',
    code: `cp .env.example .env
docker compose up --build
# web → http://localhost:3100
# api → http://localhost:3101/api/v1/health`,
  },
  {
    id: 'verify',
    label: '2. Verify & Test',
    code: `pnpm lint
pnpm typecheck
pnpm test
# web → http://localhost:3100
# api → http://localhost:3101/api/v1/health`,
  },
  {
    id: 'layout',
    label: '3. Monorepo Layout',
    code: `apps/
  web/      Next.js UI
  api/      NestJS REST
  worker/   BullMQ jobs
packages/
  database/ connectors/ ai/
  semantic-engine/ query-engine/
  dashboard-engine/ contracts/
  shared/ config/`,
  },
] as const;

export const stackBadges = [
  'TypeScript',
  'Next.js',
  'NestJS',
  'Prisma',
  'PostgreSQL',
  'Redis',
  'BullMQ',
  'ECharts',
  'Zod',
  'Vitest',
] as const;
