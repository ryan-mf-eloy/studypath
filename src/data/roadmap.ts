/* ─── STUDYPATH — Dados SEED do roadmap ──────────────────────────────────────
   SEED inicial usada UMA VEZ no primeiro boot do servidor pra popular o
   SQLite. Depois disso o roadmap mora em `data/studypath.db` e é editável.
   Nenhum componente deve mais importar isso direto — consuma via
   `useRoadmapStore` no cliente ou `loadRoadmap()` no servidor.
   ─────────────────────────────────────────────────────────────────────────── */

import type { RoadmapData } from '../types';

export const SEED_ROADMAP: RoadmapData = {
  startDate: '2026-04-01',
  endDate:   '2027-06-30',

  // ── Milestones ─────────────────────────────────────────────────────────────
  milestones: [
    { id: 'ms-aws-saa',   name: 'AWS SAA-C03',                   type: 'certification', date: '2026-10-31', status: 'pending', description: 'AWS Solutions Architect Associate' },
    { id: 'ms-mocks',     name: 'Início de mock interviews',      type: 'career',        date: '2026-10-01', status: 'pending' },
    { id: 'ms-japao',     name: 'Viagem ao Japão (22 dias)',      type: 'personal',      date: '2026-10-01', status: 'pending' },
    { id: 'ms-pipeline',  name: 'Pipeline ativo de vagas intl.',  type: 'career',        date: '2027-01-01', status: 'pending' },
    { id: 'ms-gcp-pca',   name: 'GCP Professional Cloud Architect', type: 'certification', date: '2027-03-31', status: 'pending', description: 'Google Cloud Professional Cloud Architect' },
    { id: 'ms-sequoia',   name: 'Lançamento do Sequoia SaaS',    type: 'product',       date: '2027-03-31', status: 'pending' },
    { id: 'ms-azure-104', name: 'Azure AZ-104',                   type: 'certification', date: '2027-05-31', status: 'pending', description: 'Azure Administrator Associate' },
    { id: 'ms-azure-305', name: 'Azure AZ-305',                   type: 'certification', date: '2027-06-30', status: 'pending', description: 'Azure Solutions Architect Expert' },
  ],

  phases: [

    // ═════════════════════════════════════════════════════════════════════════
    // FASE 1 — Fundação (Abril–Maio 2026)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: 'phase-1',
      label: 'Fase 1 — Fundação',
      months: [

        // ── Abril 2026 ────────────────────────────────────────────────────────
        {
          id: '2026-04',
          label: 'Abril 2026',
          phaseId: 'phase-1',
          focuses: [
            {
              id: '2026-04-main',
              type: 'main',
              name: 'Node.js runtime & event loop',
              monthId: '2026-04',
              masteryNote: 'Conseguir explicar por que uma requisição trava, onde o event loop está bloqueado, e como streams resolvem problemas de memória em processamento de arquivos grandes.',
              topics: [
                { id: '2026-04-main-eventloop',   label: 'Event loop e modelo assíncrono do Node.js',      focusId: '2026-04-main' },
                { id: '2026-04-main-promises',    label: 'Promises, microtasks e macrotasks',              focusId: '2026-04-main' },
                { id: '2026-04-main-asyncawait',  label: 'async/await e tratamento de erro em cadeia',    focusId: '2026-04-main' },
                { id: '2026-04-main-streams',     label: 'Streams e backpressure',                        focusId: '2026-04-main' },
                { id: '2026-04-main-modules',     label: 'Sistema de módulos (ESM vs CJS)',               focusId: '2026-04-main' },
                { id: '2026-04-main-http',        label: 'HTTP no ecossistema Node',                      focusId: '2026-04-main' },
                { id: '2026-04-main-config',      label: 'Gestão de configuração (env, dotenv)',          focusId: '2026-04-main' },
                { id: '2026-04-main-integracoes', label: 'Integração com banco, cache e filas (intro)',   focusId: '2026-04-main' },
              ],
            },
            {
              id: '2026-04-sec',
              type: 'secondary',
              name: 'Fundamentos de arquitetura',
              monthId: '2026-04',
              masteryNote: 'Conseguir desenhar um diagrama C4 de contexto e container de um sistema que você já conhece, justificando as fronteiras.',
              topics: [
                { id: '2026-04-sec-modularidade', label: 'Modularidade e coesão',                       focusId: '2026-04-sec' },
                { id: '2026-04-sec-bounded',      label: 'Bounded contexts (introdução a DDD)',          focusId: '2026-04-sec' },
                { id: '2026-04-sec-acoplamento',  label: 'Acoplamento e como medir',                    focusId: '2026-04-sec' },
                { id: '2026-04-sec-adrs',         label: 'ADRs — formato e prática',                    focusId: '2026-04-sec' },
                { id: '2026-04-sec-c4',           label: 'C4 model — níveis de abstração',              focusId: '2026-04-sec' },
                { id: '2026-04-sec-requisitos',   label: 'Requisitos funcionais vs não funcionais',      focusId: '2026-04-sec' },
                { id: '2026-04-sec-docs',         label: 'Documentação enxuta de arquitetura',          focusId: '2026-04-sec' },
              ],
            },
            {
              id: '2026-04-cont',
              type: 'continuous',
              name: 'Algoritmos base + inglês técnico',
              monthId: '2026-04',
              masteryNote: 'Resolver problemas de arrays/maps no LeetCode easy-medium com clareza, explicando o raciocínio em inglês.',
              topics: [
                { id: '2026-04-cont-bigo',    label: 'Big O — complexidade temporal e espacial',        focusId: '2026-04-cont' },
                { id: '2026-04-cont-arrays',  label: 'Arrays, strings, hash maps, sets',               focusId: '2026-04-cont' },
                { id: '2026-04-cont-stacks',  label: 'Stacks e queues',                                focusId: '2026-04-cont' },
                { id: '2026-04-cont-bsearch', label: 'Binary search',                                  focusId: '2026-04-cont' },
                { id: '2026-04-cont-ingles',  label: 'Inglês: leitura de docs + anotações em inglês',  focusId: '2026-04-cont' },
              ],
            },
          ],
        },

        // ── Maio 2026 ─────────────────────────────────────────────────────────
        {
          id: '2026-05',
          label: 'Maio 2026',
          phaseId: 'phase-1',
          focuses: [
            {
              id: '2026-05-main',
              type: 'main',
              name: 'TypeScript avançado',
              monthId: '2026-05',
              masteryNote: 'Desenhar APIs internas com tipos bem definidos que impeçam estados inválidos em tempo de compilação. Explicar a diferença entre type safety no build vs runtime.',
              topics: [
                { id: '2026-05-main-generics',    label: 'Generics e constraints',                        focusId: '2026-05-main' },
                { id: '2026-05-main-utility',     label: 'Utility types (Partial, Pick, Omit, Record...)', focusId: '2026-05-main' },
                { id: '2026-05-main-typeguards',  label: 'Type guards e narrowing',                       focusId: '2026-05-main' },
                { id: '2026-05-main-unions',      label: 'Discriminated unions',                          focusId: '2026-05-main' },
                { id: '2026-05-main-zod',         label: 'Runtime validation (zod, io-ts ou equivalente)', focusId: '2026-05-main' },
                { id: '2026-05-main-boundary',    label: 'Boundary typing — contratos entre camadas',     focusId: '2026-05-main' },
                { id: '2026-05-main-orgtipos',    label: 'Organização de tipos em projetos reais',        focusId: '2026-05-main' },
                { id: '2026-05-main-tsdesign',    label: 'TypeScript como linguagem de design de contratos', focusId: '2026-05-main' },
              ],
            },
            {
              id: '2026-05-sec',
              type: 'secondary',
              name: 'Bancos de dados fundamentos & APIs REST',
              monthId: '2026-05',
              masteryNote: 'Modelar um schema relacional coerente, criar um EXPLAIN e interpretar o resultado. Desenhar endpoints REST com semântica correta.',
              topics: [
                { id: '2026-05-sec-norm',      label: 'Normalização e desnormalização (quando cada uma)',  focusId: '2026-05-sec' },
                { id: '2026-05-sec-keys',      label: 'Chaves primárias, estrangeiras, integridade ref.', focusId: '2026-05-sec' },
                { id: '2026-05-sec-indices',   label: 'Índices — tipos, custo, quando ajudam vs atrapalham', focusId: '2026-05-sec' },
                { id: '2026-05-sec-explain',   label: 'Planos de execução (EXPLAIN)',                     focusId: '2026-05-sec' },
                { id: '2026-05-sec-joins',     label: 'Joins e performance',                             focusId: '2026-05-sec' },
                { id: '2026-05-sec-migrations',label: 'Migrations',                                      focusId: '2026-05-sec' },
                { id: '2026-05-sec-rest',      label: 'Modelagem REST — verbos, status codes, headers',  focusId: '2026-05-sec' },
                { id: '2026-05-sec-authn',     label: 'Autenticação e autorização',                     focusId: '2026-05-sec' },
                { id: '2026-05-sec-pagination',label: 'Paginação, filtros, ordenação, idempotência',     focusId: '2026-05-sec' },
              ],
            },
            {
              id: '2026-05-cont',
              type: 'continuous',
              name: 'Algoritmos base + inglês (continuação)',
              monthId: '2026-05',
              masteryNote: 'Resolver problemas com two pointers e sliding window. Escrever resumos técnicos em inglês.',
              topics: [
                { id: '2026-05-cont-twoptr',   label: 'Two pointers',                                    focusId: '2026-05-cont' },
                { id: '2026-05-cont-sliding',  label: 'Sliding window',                                  focusId: '2026-05-cont' },
                { id: '2026-05-cont-prefix',   label: 'Prefix sums',                                    focusId: '2026-05-cont' },
                { id: '2026-05-cont-ingles',   label: 'Inglês: escrever resumos técnicos em inglês',     focusId: '2026-05-cont' },
              ],
            },
          ],
        },
      ],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // FASE 2 — Integração (Junho–Julho 2026)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: 'phase-2',
      label: 'Fase 2 — Integração',
      months: [
        {
          id: '2026-06',
          label: 'Junho 2026',
          phaseId: 'phase-2',
          focuses: [
            { id: '2026-06-main', type: 'main',       name: 'Bancos de dados: transações & concorrência', monthId: '2026-06', masteryNote: 'Explicar um cenário de race condition em banco, qual isolation level resolve, e o custo de performance.', topics: [
              { id: '2026-06-main-acid',       label: 'Transações e ACID em profundidade',               focusId: '2026-06-main' },
              { id: '2026-06-main-isolation',  label: 'Isolation levels — trade-offs reais',             focusId: '2026-06-main' },
              { id: '2026-06-main-locks',      label: 'Locks e contenção — pessimistic vs optimistic',   focusId: '2026-06-main' },
              { id: '2026-06-main-pooling',    label: 'Connection pooling — configuração e limites',     focusId: '2026-06-main' },
              { id: '2026-06-main-deadlocks',  label: 'Deadlocks — identificação e prevenção',           focusId: '2026-06-main' },
              { id: '2026-06-main-migrations', label: 'Versionamento de schema (migrations seguras)',    focusId: '2026-06-main' },
              { id: '2026-06-main-stores',     label: 'Relational vs document store vs cache',          focusId: '2026-06-main' },
            ]},
            { id: '2026-06-sec',  type: 'secondary',  name: 'Segurança OWASP & GraphQL',                 monthId: '2026-06', masteryNote: 'Implementar um fluxo OAuth2 PKCE end-to-end e desenhar um schema GraphQL alinhado a um domínio real.', topics: [
              { id: '2026-06-sec-owasp',    label: 'OWASP Top 10 — cada item com exemplo prático',      focusId: '2026-06-sec' },
              { id: '2026-06-sec-oauth',    label: 'OAuth2 flows (authorization code, PKCE)',           focusId: '2026-06-sec' },
              { id: '2026-06-sec-jwt',      label: 'JWT — estrutura, validação, refresh tokens',        focusId: '2026-06-sec' },
              { id: '2026-06-sec-oidc',     label: 'OIDC — o que adiciona ao OAuth2',                  focusId: '2026-06-sec' },
              { id: '2026-06-sec-rbac',     label: 'RBAC vs ABAC',                                     focusId: '2026-06-sec' },
              { id: '2026-06-sec-gql',      label: 'GraphQL — schema, resolvers, paginação',           focusId: '2026-06-sec' },
            ]},
            { id: '2026-06-cont', type: 'continuous', name: 'Algoritmos intermediário + design system',  monthId: '2026-06', masteryNote: 'Resolver problemas com linked lists e trees. Criar tokens de design system.', topics: [
              { id: '2026-06-cont-linkedlist', label: 'Linked lists',                                  focusId: '2026-06-cont' },
              { id: '2026-06-cont-trees',      label: 'Trees (binary tree, BST) e percursos',          focusId: '2026-06-cont' },
              { id: '2026-06-cont-heaps',      label: 'Heaps e priority queues',                       focusId: '2026-06-cont' },
              { id: '2026-06-cont-recursion',  label: 'Recursion e pilha de chamadas',                 focusId: '2026-06-cont' },
              { id: '2026-06-cont-ds',         label: 'Design system: tokens, spacing, tipografia',    focusId: '2026-06-cont' },
            ]},
          ],
        },
        {
          id: '2026-07',
          label: 'Julho 2026',
          phaseId: 'phase-2',
          focuses: [
            { id: '2026-07-main', type: 'main',       name: 'Filas & mensageria',          monthId: '2026-07', masteryNote: 'Desenhar um fluxo assíncrono com fila, DLQ e consumer idempotente.', topics: [
              { id: '2026-07-main-semantics',  label: 'Semântica de entrega: at-least/at-most/exactly-once', focusId: '2026-07-main' },
              { id: '2026-07-main-retries',    label: 'Retries, backoff exponencial, DLQ',               focusId: '2026-07-main' },
              { id: '2026-07-main-idempotent', label: 'Consumer idempotente — implementação prática',    focusId: '2026-07-main' },
              { id: '2026-07-main-saga',       label: 'Saga e compensação — orquestração vs coreografia', focusId: '2026-07-main' },
              { id: '2026-07-main-outbox',     label: 'Transactional outbox pattern',                   focusId: '2026-07-main' },
              { id: '2026-07-main-sqs',        label: 'Mapeamento conceitual: SQS/SNS, Pub/Sub, Service Bus', focusId: '2026-07-main' },
            ]},
            { id: '2026-07-sec',  type: 'secondary',  name: 'Padrões arquiteturais & design patterns',  monthId: '2026-07', masteryNote: 'Dado um problema, escolher o padrão mais adequado e justificar com trade-offs.', topics: [
              { id: '2026-07-sec-patterns',   label: 'Strategy, Factory, Adapter, Decorator, Observer', focusId: '2026-07-sec' },
              { id: '2026-07-sec-repo',       label: 'Repository, Builder',                            focusId: '2026-07-sec' },
              { id: '2026-07-sec-hexagonal',  label: 'Hexagonal / ports and adapters',                 focusId: '2026-07-sec' },
              { id: '2026-07-sec-cqrs',       label: 'CQRS, Event-driven, BFF, Anti-corruption layer', focusId: '2026-07-sec' },
            ]},
            { id: '2026-07-cont', type: 'continuous', name: 'Algoritmos intermediário (cont.) + design system', monthId: '2026-07', masteryNote: 'Resolver problemas com graphs. Avançar em design system.', topics: [
              { id: '2026-07-cont-graphs',  label: 'Graphs — representação, DFS, BFS',                focusId: '2026-07-cont' },
              { id: '2026-07-cont-topo',    label: 'Topological sort',                               focusId: '2026-07-cont' },
              { id: '2026-07-cont-ds',      label: 'Design system: componentes primitivos, acessibilidade', focusId: '2026-07-cont' },
            ]},
          ],
        },
      ],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // FASE 3 — Intensificação (Agosto–Setembro 2026)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: 'phase-3',
      label: 'Fase 3 — Intensificação',
      months: [
        {
          id: '2026-08',
          label: 'Agosto 2026',
          phaseId: 'phase-3',
          focuses: [
            { id: '2026-08-main', type: 'main',       name: 'Escalabilidade & confiabilidade', monthId: '2026-08', masteryNote: 'Dado um sistema sob carga, identificar o gargalo e propor solução.', topics: [
              { id: '2026-08-main-scale',   label: 'Escala horizontal vs vertical',                   focusId: '2026-08-main' },
              { id: '2026-08-main-cache',   label: 'Caching — estratégias e invalidação',             focusId: '2026-08-main' },
              { id: '2026-08-main-circuit', label: 'Circuit breaker, bulkhead, graceful degradation', focusId: '2026-08-main' },
              { id: '2026-08-main-retry',   label: 'Retries com backoff e jitter',                   focusId: '2026-08-main' },
            ]},
            { id: '2026-08-sec',  type: 'secondary',  name: 'Docker, CI/CD & Kubernetes',  monthId: '2026-08', masteryNote: 'Containerizar um serviço Node.js e criar pipeline CI/CD no GitHub Actions.', topics: [
              { id: '2026-08-sec-docker',  label: 'Dockerfile multi-stage builds',                  focusId: '2026-08-sec' },
              { id: '2026-08-sec-compose', label: 'docker-compose para desenvolvimento local',      focusId: '2026-08-sec' },
              { id: '2026-08-sec-ci',      label: 'GitHub Actions — workflows, quality gates',      focusId: '2026-08-sec' },
              { id: '2026-08-sec-k8s',     label: 'Kubernetes — pods, services, deployments, HPA', focusId: '2026-08-sec' },
            ]},
            { id: '2026-08-cont', type: 'continuous', name: 'Algoritmos avançado + system design em inglês', monthId: '2026-08', masteryNote: 'Resolver problemas de DP. Explicar sistemas em inglês.', topics: [
              { id: '2026-08-cont-greedy', label: 'Greedy algorithms',                              focusId: '2026-08-cont' },
              { id: '2026-08-cont-bt',     label: 'Backtracking',                                   focusId: '2026-08-cont' },
              { id: '2026-08-cont-dp',     label: 'Dynamic programming básica (memoization)',       focusId: '2026-08-cont' },
              { id: '2026-08-cont-sd',     label: 'System design em inglês: vocabulário de trade-offs', focusId: '2026-08-cont' },
            ]},
          ],
        },
        {
          id: '2026-09',
          label: 'Setembro 2026',
          phaseId: 'phase-3',
          focuses: [
            { id: '2026-09-main', type: 'main',       name: 'AWS imersão',           monthId: '2026-09', masteryNote: 'Dado um cenário de negócio, desenhar a arquitetura AWS justificando cada serviço.', topics: [
              { id: '2026-09-main-iam',   label: 'IAM — users, roles, policies, least privilege',  focusId: '2026-09-main' },
              { id: '2026-09-main-vpc',   label: 'VPC — subnets, route tables, security groups',   focusId: '2026-09-main' },
              { id: '2026-09-main-ec2',   label: 'EC2, Auto Scaling, ELB',                        focusId: '2026-09-main' },
              { id: '2026-09-main-s3',    label: 'S3 — storage classes, lifecycle, encryption',    focusId: '2026-09-main' },
              { id: '2026-09-main-rds',   label: 'RDS — Multi-AZ, read replicas, backup',         focusId: '2026-09-main' },
              { id: '2026-09-main-dynamo',label: 'DynamoDB — partition key design, GSIs',          focusId: '2026-09-main' },
              { id: '2026-09-main-lambda',label: 'Lambda — cold starts, limits, event sources',   focusId: '2026-09-main' },
              { id: '2026-09-main-waf',   label: 'Well-Architected Framework — os 6 pilares',     focusId: '2026-09-main' },
            ]},
            { id: '2026-09-sec',  type: 'secondary',  name: 'IaC Terraform & observabilidade', monthId: '2026-09', masteryNote: 'Provisionar infra com Terraform e configurar observabilidade com SLOs.', topics: [
              { id: '2026-09-sec-tf',   label: 'Terraform — HCL, state, modules, plan/apply',    focusId: '2026-09-sec' },
              { id: '2026-09-sec-logs', label: 'Logs estruturados, métricas, traces distribuídos', focusId: '2026-09-sec' },
              { id: '2026-09-sec-slo',  label: 'SLI, SLO, SLA, error budgets, runbooks',         focusId: '2026-09-sec' },
            ]},
            { id: '2026-09-cont', type: 'continuous', name: 'Algoritmos avançado + system design (cont.)', monthId: '2026-09', masteryNote: 'Sessões cronometradas simulando entrevista.', topics: [
              { id: '2026-09-cont-dp',   label: 'DP — coin change, LCS, knapsack',               focusId: '2026-09-cont' },
              { id: '2026-09-cont-mock', label: 'Sessões cronometradas simulando entrevista',     focusId: '2026-09-cont' },
            ]},
          ],
        },
      ],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // FASE 4 — Consolidação (Outubro–Dezembro 2026)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: 'phase-4',
      label: 'Fase 4 — Consolidação',
      months: [
        {
          id: '2026-10',
          label: 'Outubro 2026',
          phaseId: 'phase-4',
          focuses: [
            { id: '2026-10-main', type: 'main',       name: 'AWS SAA-C03: prep & exame', monthId: '2026-10', masteryNote: 'Realizar o exame até o final de outubro.', topics: [
              { id: '2026-10-main-review',   label: 'Revisão intensiva dos serviços core AWS',          focusId: '2026-10-main' },
              { id: '2026-10-main-simulados',label: 'Simulados oficiais e não-oficiais',                focusId: '2026-10-main' },
              { id: '2026-10-main-gaps',     label: 'Gaps identificados nos simulados → estudo dir.',   focusId: '2026-10-main' },
            ]},
            { id: '2026-10-sec',  type: 'secondary',  name: 'IA: fundamentos & RAG', monthId: '2026-10', masteryNote: 'Projetar um sistema RAG explicando chunking, re-ranking e guardrails.', topics: [
              { id: '2026-10-sec-llm',  label: 'Tokens, embeddings, prompt design, custo',            focusId: '2026-10-sec' },
              { id: '2026-10-sec-rag',  label: 'RAG — chunking, re-ranking, tools/agents',            focusId: '2026-10-sec' },
              { id: '2026-10-sec-eval', label: 'Avaliação, guardrails, Responsible AI',               focusId: '2026-10-sec' },
            ]},
            { id: '2026-10-cont', type: 'continuous', name: 'Mock interviews + narrativa & posicionamento', monthId: '2026-10', masteryNote: 'Início da prática deliberada de entrevistas.', topics: [
              { id: '2026-10-cont-mocks',    label: 'System design mocks em inglês (1x/semana)',       focusId: '2026-10-cont' },
              { id: '2026-10-cont-behavioral',label: 'Behavioral com formato STAR',                   focusId: '2026-10-cont' },
              { id: '2026-10-cont-linkedin', label: 'LinkedIn: headline, about, experiências intl.',   focusId: '2026-10-cont' },
            ]},
          ],
        },
        {
          id: '2026-11',
          label: 'Novembro 2026',
          phaseId: 'phase-4',
          focuses: [
            { id: '2026-11-main', type: 'main',       name: 'GCP: entrada & aprofundamento',  monthId: '2026-11', masteryNote: 'Redesenhar em GCP uma arquitetura já feita em AWS.', topics: [
              { id: '2026-11-main-iam',      label: 'IAM — organizações, projetos, roles, service accounts', focusId: '2026-11-main' },
              { id: '2026-11-main-cloudrun', label: 'Cloud Run — serverless containers',                focusId: '2026-11-main' },
              { id: '2026-11-main-gke',      label: 'GKE — visão arquitetural',                        focusId: '2026-11-main' },
              { id: '2026-11-main-pubsub',   label: 'Pub/Sub, BigQuery, Cloud Monitoring',             focusId: '2026-11-main' },
            ]},
            { id: '2026-11-sec',  type: 'secondary',  name: 'System design: síntese', monthId: '2026-11', masteryNote: 'Fazer um system design completo em 45 min (em inglês), gravado.', topics: [
              { id: '2026-11-sec-multitenancy', label: 'Multi-tenancy, Strangler pattern',             focusId: '2026-11-sec' },
              { id: '2026-11-sec-governance',   label: 'Governança de APIs, liderança técnica, RFCs',  focusId: '2026-11-sec' },
            ]},
            { id: '2026-11-cont', type: 'continuous', name: 'Mock interviews (cont.)',        monthId: '2026-11', masteryNote: 'Mocks 1-2x por semana.', topics: [
              { id: '2026-11-cont-mocks', label: 'Mocks 1–2x/semana — Pramp, interviewing.io',        focusId: '2026-11-cont' },
            ]},
          ],
        },
        {
          id: '2026-12',
          label: 'Dezembro 2026',
          phaseId: 'phase-4',
          focuses: [
            { id: '2026-12-main', type: 'main',       name: 'GCP: consolidação', monthId: '2026-12', masteryNote: 'Comparação estruturada AWS vs GCP por abstração.', topics: [
              { id: '2026-12-main-consolidation', label: 'Consolidação dos serviços GCP estudados',    focusId: '2026-12-main' },
              { id: '2026-12-main-compare',       label: 'Comparação estruturada AWS vs GCP',         focusId: '2026-12-main' },
            ]},
            { id: '2026-12-sec',  type: 'secondary',  name: 'Azure: base', monthId: '2026-12', masteryNote: 'Mapear equivalentes AWS → GCP → Azure para os serviços core.', topics: [
              { id: '2026-12-sec-entra',   label: 'Entra ID, subscriptions, policies, governança',    focusId: '2026-12-sec' },
              { id: '2026-12-sec-compute', label: 'Azure compute — VMs, App Service, Container Apps', focusId: '2026-12-sec' },
              { id: '2026-12-sec-monitor', label: 'Azure Monitor, Application Insights, Key Vault',   focusId: '2026-12-sec' },
            ]},
            { id: '2026-12-cont', type: 'continuous', name: 'Mock interviews + vagas (cont.)', monthId: '2026-12', masteryNote: 'Começar a aplicar para vagas internacionais como warm-up.', topics: [
              { id: '2026-12-cont-mocks', label: 'Manter cadência de mocks',                          focusId: '2026-12-cont' },
              { id: '2026-12-cont-vagas', label: 'Começar a aplicar para vagas internacionais',       focusId: '2026-12-cont' },
            ]},
          ],
        },
      ],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // FASE 5 — Expansão 2027 (Janeiro–Junho 2027)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: 'phase-5',
      label: 'Fase 5 — Expansão 2027',
      months: [
        {
          id: '2027-01', label: 'Janeiro 2027', phaseId: 'phase-5',
          focuses: [
            { id: '2027-01-main', type: 'main',       name: 'GCP: consolidação & labs',   monthId: '2027-01', masteryNote: 'Labs avançados em Cloud Skills Boost.', topics: [
              { id: '2027-01-main-labs',    label: 'Labs avançados em Cloud Skills Boost',            focusId: '2027-01-main' },
              { id: '2027-01-main-bigq',    label: 'BigQuery, Pub/Sub e Cloud Run aprofundados',      focusId: '2027-01-main' },
            ]},
            { id: '2027-01-sec',  type: 'secondary',  name: 'Python: consolidação',         monthId: '2027-01', masteryNote: 'Construir uma API em FastAPI com types, testes e CI.', topics: [
              { id: '2027-01-sec-fastapi', label: 'FastAPI — async, dependency injection, typing',    focusId: '2027-01-sec' },
              { id: '2027-01-sec-pytest',  label: 'Testes — pytest, fixtures, mocking',              focusId: '2027-01-sec' },
            ]},
            { id: '2027-01-cont', type: 'continuous', name: 'Aplicações ativas + open source', monthId: '2027-01', masteryNote: 'Início do pipeline ativo de aplicações internacionais.', topics: [
              { id: '2027-01-cont-vagas', label: '3–5 aplicações/semana com personalização',         focusId: '2027-01-cont' },
              { id: '2027-01-cont-oss',   label: 'Contribuições open source: docs, small fixes',     focusId: '2027-01-cont' },
            ]},
          ],
        },
        {
          id: '2027-02', label: 'Fevereiro 2027', phaseId: 'phase-5',
          focuses: [
            { id: '2027-02-main', type: 'main',       name: 'GCP: consolidação & labs (cont.)', monthId: '2027-02', masteryNote: 'Simulados de certificação GCP.', topics: [
              { id: '2027-02-main-simulados', label: 'Simulados de certificação GCP',                focusId: '2027-02-main' },
            ]},
            { id: '2027-02-sec',  type: 'secondary',  name: 'Python: consolidação (cont.)',     monthId: '2027-02', masteryNote: 'Async Python, deploy em container.', topics: [
              { id: '2027-02-sec-async',  label: 'Async Python (asyncio, aiohttp)',                  focusId: '2027-02-sec' },
              { id: '2027-02-sec-deploy', label: 'Deploy de serviço Python em container',            focusId: '2027-02-sec' },
            ]},
            { id: '2027-02-cont', type: 'continuous', name: 'Aplicações ativas (cont.)', monthId: '2027-02', masteryNote: 'Refinar pitch com base em feedback real.', topics: [
              { id: '2027-02-cont-pipeline', label: 'Manter cadência + refinar pitch com feedback',  focusId: '2027-02-cont' },
            ]},
          ],
        },
        {
          id: '2027-03', label: 'Março 2027', phaseId: 'phase-5',
          focuses: [
            { id: '2027-03-main', type: 'main',       name: 'GCP Professional Cloud Architect: exame', monthId: '2027-03', masteryNote: 'Realizar o exame até o final de março.', topics: [
              { id: '2027-03-main-review', label: 'Revisão intensiva final + simulados oficiais',    focusId: '2027-03-main' },
            ]},
            { id: '2027-03-sec',  type: 'secondary',  name: 'Sequoia SaaS: lançamento', monthId: '2027-03', masteryNote: 'MVP funcional e lançamento público.', topics: [
              { id: '2027-03-sec-mvp',     label: 'MVP funcional, deploy, monitoring',              focusId: '2027-03-sec' },
              { id: '2027-03-sec-landing', label: 'Landing page, onboarding, pricing',              focusId: '2027-03-sec' },
            ]},
            { id: '2027-03-cont', type: 'continuous', name: 'Aplicações ativas (cont.)', monthId: '2027-03', masteryNote: 'Networking e open source.', topics: [
              { id: '2027-03-cont-network', label: 'Networking com recrutadores e engenheiros',      focusId: '2027-03-cont' },
            ]},
          ],
        },
        {
          id: '2027-04', label: 'Abril 2027', phaseId: 'phase-5',
          focuses: [
            { id: '2027-04-main', type: 'main',       name: 'Azure: arquitetura & AZ-104', monthId: '2027-04', masteryNote: 'Preparação para AZ-104.', topics: [
              { id: '2027-04-main-entra',    label: 'Entra ID avançado — conditional access, PIM',   focusId: '2027-04-main' },
              { id: '2027-04-main-network',  label: 'Networking avançado — peering, load balancer',  focusId: '2027-04-main' },
              { id: '2027-04-main-bicep',    label: 'Azure Resource Manager — Bicep templates',      focusId: '2027-04-main' },
            ]},
            { id: '2027-04-sec',  type: 'secondary',  name: 'Sequoia SaaS: iteração', monthId: '2027-04', masteryNote: 'Iteração com base em feedback.', topics: [
              { id: '2027-04-sec-metrics', label: 'Métricas de produto (ativação, retenção, churn)', focusId: '2027-04-sec' },
            ]},
            { id: '2027-04-cont', type: 'continuous', name: 'Aplicações + portfólio', monthId: '2027-04', masteryNote: 'Foco em conversão de oportunidades.', topics: [
              { id: '2027-04-cont-followup', label: 'Follow-ups, negociação de ofertas',             focusId: '2027-04-cont' },
            ]},
          ],
        },
        {
          id: '2027-05', label: 'Maio 2027', phaseId: 'phase-5',
          focuses: [
            { id: '2027-05-main', type: 'main',       name: 'Azure: AZ-104 (cont.)', monthId: '2027-05', masteryNote: 'Realizar o exame AZ-104 até o final de maio.', topics: [
              { id: '2027-05-main-simulados', label: 'Simulados AZ-104 + revisão final',             focusId: '2027-05-main' },
            ]},
            { id: '2027-05-sec',  type: 'secondary',  name: 'Sequoia SaaS: crescimento', monthId: '2027-05', masteryNote: 'Estratégia de aquisição de usuários.', topics: [
              { id: '2027-05-sec-growth', label: 'Estratégia de aquisição + monetização',           focusId: '2027-05-sec' },
            ]},
            { id: '2027-05-cont', type: 'continuous', name: 'Aplicações ativas (cont.)', monthId: '2027-05', masteryNote: 'Negociação de ofertas.', topics: [
              { id: '2027-05-cont-negoc', label: 'Se tiver oferta: negociação, due diligence',       focusId: '2027-05-cont' },
            ]},
          ],
        },
        {
          id: '2027-06', label: 'Junho 2027', phaseId: 'phase-5',
          focuses: [
            { id: '2027-06-main', type: 'main',       name: 'Azure AZ-305: exame', monthId: '2027-06', masteryNote: 'Realizar o exame AZ-305 até o final de junho.', topics: [
              { id: '2027-06-main-305', label: 'AZ-305 — design de soluções, simulados finais',     focusId: '2027-06-main' },
            ]},
            { id: '2027-06-sec',  type: 'secondary',  name: 'Sequoia SaaS: crescimento (cont.)', monthId: '2027-06', masteryNote: 'Produto em evolução contínua.', topics: [
              { id: '2027-06-sec-vitrine', label: 'Sequoia como vitrine para entrevistas/portfólio', focusId: '2027-06-sec' },
            ]},
            { id: '2027-06-cont', type: 'continuous', name: 'Fechamento de ciclo', monthId: '2027-06', masteryNote: 'Conversão de oportunidades.', topics: [
              { id: '2027-06-cont-close', label: 'Fechamento do ciclo: conversão de oportunidades',  focusId: '2027-06-cont' },
            ]},
          ],
        },
      ],
    },
  ],
};
