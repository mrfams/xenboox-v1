/**
 * Enterprise Monitoring & Observability MCP Server
 * Provides monitoring setup, alerting configuration, and observability best practices for Xenboox
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// Monitoring tools
const MONITORING_TOOLS = [
  {
    name: 'observability_audit',
    description: 'Audit current observability implementation including logging, metrics, tracing, and monitoring',
    inputSchema: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          enum: ['all', 'logging', 'metrics', 'tracing', 'alerting'],
          description: 'Specific area to audit'
        }
      }
    }
  },
  {
    name: 'setup_apm',
    description: 'Setup Application Performance Monitoring (APM) with Datadog, New Relic, or similar',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['datadog', 'newrelic', 'elastic', 'dynatrace'],
          description: 'APM provider'
        },
        environment: {
          type: 'string',
          enum: ['development', 'staging', 'production'],
          description: 'Deployment environment'
        }
      }
    }
  },
  {
    name: 'setup_error_tracking',
    description: 'Setup error tracking with Sentry, Rollbar, or similar',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['sentry', 'rollbar', 'bugsnag'],
          description: 'Error tracking provider'
        },
        environment: {
          type: 'string',
          enum: ['development', 'staging', 'production'],
          description: 'Deployment environment'
        }
      }
    }
  },
  {
    name: 'setup_logging',
    description: 'Setup centralized logging with ELK stack, CloudWatch, or similar',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['elk', 'cloudwatch', 'logdna', 'papertrail'],
          description: 'Logging provider'
        },
        log_level: {
          type: 'string',
          enum: ['debug', 'info', 'warn', 'error'],
          description: 'Default log level'
        }
      }
    }
  },
  {
    name: 'setup_health_checks',
    description: 'Setup comprehensive health check endpoints for system monitoring',
    inputSchema: {
      type: 'object',
      properties: {
        checks: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['database', 'redis', 'external_apis', 'disk_space', 'memory', 'llm']
          },
          description: 'Health checks to implement'
        }
      }
    }
  },
  {
    name: 'setup_business_metrics',
    description: 'Setup business metrics dashboards for key performance indicators',
    inputSchema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Business metrics to track'
        }
      }
    }
  },
  {
    name: 'setup_alerting',
    description: 'Setup alerting rules and notification channels for critical issues',
    inputSchema: {
      type: 'object',
      properties: {
        channels: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['slack', 'pagerduty', 'email', 'sms', 'webhook']
          },
          description: 'Alert notification channels'
        },
        severity_levels: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low']
          },
          description: 'Severity levels to alert on'
        }
      }
    }
  },
  {
    name: 'performance_baseline',
    description: 'Establish performance baselines and SLA/SLO definitions',
    inputSchema: {
      type: 'object',
      properties: {
        endpoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Endpoints to baseline'
        }
      }
    }
  },
  {
    name: 'distributed_tracing_setup',
    description: 'Setup distributed tracing for request correlation across services',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['jaeger', 'zipkin', 'datadog', 'honeycomb'],
          description: 'Tracing provider'
        }
      }
    }
  },
  {
    name: 'log_analysis',
    description: 'Analyze logs for patterns, errors, and performance issues',
    inputSchema: {
      type: 'object',
      properties: {
        time_range: {
          type: 'string',
          description: 'Time range to analyze (e.g., "24h", "7d")'
        },
        pattern: {
          type: 'string',
          description: 'Specific pattern to search for'
        }
      }
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'enterprise-monitoring',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: MONITORING_TOOLS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'observability_audit':
        return await handleObservabilityAudit(args);
      case 'setup_apm':
        return await handleSetupAPM(args);
      case 'setup_error_tracking':
        return await handleSetupErrorTracking(args);
      case 'setup_logging':
        return await handleSetupLogging(args);
      case 'setup_health_checks':
        return await handleSetupHealthChecks(args);
      case 'setup_business_metrics':
        return await handleSetupBusinessMetrics(args);
      case 'setup_alerting':
        return await handleSetupAlerting(args);
      case 'performance_baseline':
        return await handlePerformanceBaseline(args);
      case 'distributed_tracing_setup':
        return await handleDistributedTracingSetup(args);
      case 'log_analysis':
        return await handleLogAnalysis(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool handlers
async function handleObservabilityAudit(args) {
  const area = args.area || 'all';

  let report = `OBSERVABILITY AUDIT RESULTS\n\n`;

  if (area === 'all' || area === 'logging') {
    report += `LOGGING:\n`;
    report += `- Centralized logging: Not implemented\n`;
    report += `- Log aggregation: Not configured\n`;
    report += `- Log retention: Not defined\n`;
    report += `- Structured logging: Partial (LangFuse only)\n`;
    report += `- Log levels: Not standardized\n\n`;
  }

  if (area === 'all' || area === 'metrics') {
    report += `METRICS:\n`;
    report += `- APM: Not implemented\n`;
    report += `- Business metrics: Not tracked\n`;
    report += `- System metrics: Not monitored\n`;
    report += `- Custom metrics: Not defined\n`;
    report += `- Dashboards: Not created\n\n`;
  }

  if (area === 'all' || area === 'tracing') {
    report += `TRACING:\n`;
    report += `- Distributed tracing: Not implemented\n`;
    report += `- Request correlation: Not available\n`;
    report += `- Agent tracing: LangFuse only (LLM-specific)\n`;
    report += `- Service map: Not available\n\n`;
  }

  if (area === 'all' || area === 'alerting') {
    report += `ALERTING:\n`;
    report += `- Real-time alerting: Not configured\n`;
    report += `- Alert channels: Not defined\n`;
    report += `- Alert escalation: Not implemented\n`;
    report += `- On-call rotation: Not configured\n\n`;
  }

  report += `CRITICAL GAPS:\n`;
  report += `1. No APM implementation (Datadog, New Relic)\n`;
  report += `2. No error tracking (Sentry, Rollbar)\n`;
  report += `3. No centralized logging (ELK, CloudWatch)\n`;
  report += `4. No health check endpoints\n`;
  report += `5. No business metrics dashboards\n`;
  report += `6. No real-time alerting system\n`;
  report += `7. No distributed tracing\n\n`;

  report += `RECOMMENDED ACTIONS:\n`;
  report += `1. Implement Datadog APM for full-stack monitoring\n`;
  report += `2. Add Sentry for error tracking and aggregation\n`;
  report += `3. Setup ELK stack or CloudWatch for centralized logging\n`;
  report += `4. Create /health endpoints for all services\n`;
  report += `5. Define and track key business metrics\n`;
  report += `6. Configure PagerDuty for critical alerts\n`;
  report += `7. Implement distributed tracing with Jaeger or Datadog`;

  return {
    content: [{ type: 'text', text: report }]
  };
}

async function handleSetupAPM(args) {
  const provider = args.provider || 'datadog';
  const environment = args.environment || 'production';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up APM with ${provider} for ${environment}...\n\n` +
          `IMPLEMENTATION STEPS:\n` +
          `1. Install ${provider} npm package\n` +
          `2. Configure ${provider} agent in Next.js\n` +
          `3. Add APM middleware to API routes\n` +
          `4. Instrument agent calls for tracing\n` +
          `5. Configure service naming and environment tags\n` +
          `6. Setup custom metrics for business KPIs\n` +
          `7. Create dashboards in ${provider} UI\n\n` +
          `KEY METRICS TO TRACK:\n` +
          `- Request latency (p50, p95, p99)\n` +
          `- Error rate by endpoint\n` +
          `- Throughput (requests per second)\n` +
          `- Agent execution time\n` +
          `- Database query performance\n` +
          `- LLM API latency and cost\n` +
          `- Business transactions (invoices, payments)\n\n` +
          `CONFIGURATION FILES NEEDED:\n` +
          `- apps/web/lib/apm.ts (APM initialization)\n` +
          `- next.config.ts updates\n` +
          `- .env variables for ${provider} credentials`
      }
    ]
  };
}

async function handleSetupErrorTracking(args) {
  const provider = args.provider || 'sentry';
  const environment = args.environment || 'production';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up error tracking with ${provider} for ${environment}...\n\n` +
          `IMPLEMENTATION STEPS:\n` +
          `1. Install @sentry/nextjs package\n` +
          `2. Run ${provider} wizard for automatic setup\n` +
          `3. Configure ${provider} in Next.js\n` +
          `4. Add user context for error tracking\n` +
          `5. Configure release tracking\n` +
          `6. Setup source maps for error mapping\n` +
          `7. Integrate with Git for commit linking\n\n` +
          `ERROR CONTEXT TO CAPTURE:\n` +
          `- User ID and entity ID\n` +
          `- Agent operation being performed\n` +
          `- Request parameters (sanitized)\n` +
          `- Database state snapshot\n` +
          `- LLM model and prompt version\n` +
          `- Confidence scores\n\n` +
          `ALERT RULES TO CONFIGURE:\n` +
          `- Critical errors: Immediate notification\n` +
          `- Error rate spikes: Alert if > 5% for 5 min\n` +
          `- New error types: Alert on first occurrence\n` +
          `- Recurring errors: Alert if > 10 occurrences/hour`
      }
    ]
  };
}

async function handleSetupLogging(args) {
  const provider = args.provider || 'elk';
  const logLevel = args.log_level || 'info';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up centralized logging with ${provider} (level: ${logLevel})...\n\n` +
          `IMPLEMENTATION STEPS:\n` +
          `1. Deploy ${provider} stack (or use managed service)\n` +
          `2. Install Winston or Pino for structured logging\n` +
          `3. Configure log transport to ${provider}\n` +
          `4. Standardize log format across all services\n` +
          `5. Add correlation IDs for request tracing\n` +
          `6. Configure log retention policies\n` +
          `7. Setup log parsing and indexing\n\n` +
          `LOG STRUCTURE:\n` +
          `{\n` +
          `  timestamp: ISO string,\n` +
          `  level: ${logLevel},\n` +
          `  service: "xenboox-web",\n` +
          `  environment: "production",\n` +
          `  correlationId: UUID,\n` +
          `  userId: UUID,\n` +
          `  entityId: UUID,\n` +
          `  agent: string,\n` +
          `  operation: string,\n` +
          `  message: string,\n` +
          `  metadata: object\n` +
          `}\n\n` +
          `LOG LEVELS:\n` +
          `- error: Critical errors requiring immediate attention\n` +
          `- warn: Warning conditions that should be investigated\n` +
          `- info: Normal operational information\n` +
          `- debug: Detailed debugging information\n\n` +
          `RETENTION POLICY:\n` +
          `- Error logs: 90 days\n` +
          `- Audit logs: 7 years (compliance)\n` +
          `- Debug logs: 30 days\n` +
          `- Access logs: 1 year`
      }
    ]
  };
}

async function handleSetupHealthChecks(args) {
  const checks = args.checks || ['database', 'redis', 'external_apis', 'disk_space', 'memory', 'llm'];

  return {
    content: [
      {
        type: 'text',
        text: `Setting up health check endpoints...\n\n` +
          `ENDPOINTS TO CREATE:\n` +
          `GET /health - Basic health check\n` +
          `GET /health/ready - Readiness probe\n` +
          `GET /health/live - Liveness probe\n` +
          `GET /health/detailed - Detailed system status\n\n` +
          `HEALTH CHECKS TO IMPLEMENT:\n` +
          checks.map(check => {
            const checkDetails = {
              database: 'PostgreSQL connection and query performance',
              redis: 'Redis connection and latency (if added)',
              external_apis: 'LLM API, R2, Resend, Trigger.dev connectivity',
              disk_space: 'Available disk space threshold (>20%)',
              memory: 'Memory usage threshold (<80%)',
              llm: 'LLM API latency and error rate'
            };
            return `- ${check}: ${checkDetails[check] || 'Custom check'}`;
          }).join('\n') +
          `\n\n` +
          `RESPONSE FORMAT:\n` +
          `{\n` +
          `  status: "healthy" | "degraded" | "unhealthy",\n` +
          `  timestamp: ISO string,\n` +
          `  checks: {\n` +
          `    database: { status: "pass", latency: 5ms },\n` +
          `    external_apis: { status: "pass", services: {...} }\n` +
          `  },\n` +
          `  version: string,\n` +
          `  environment: string\n` +
          `}\n\n` +
          `IMPLEMENTATION LOCATION:\n` +
          `- apps/web/app/api/health/route.ts`
      }
    ]
  };
}

async function handleSetupBusinessMetrics(args) {
  const metrics = args.metrics || [
    'daily_active_users',
    'transactions_processed',
    'agent_success_rate',
    'llm_cost_per_transaction',
    'entity_growth',
    'invoice_processing_time',
    'reconciliation_accuracy'
  ];

  return {
    content: [
      {
        type: 'text',
        text: `Setting up business metrics dashboards...\n\n` +
          `KEY BUSINESS METRICS:\n` +
          metrics.map(metric => `- ${metric}`).join('\n') +
          `\n\n` +
          `METRIC DEFINITIONS:\n` +
          `1. Daily Active Users (DAU): Unique users performing actions daily\n` +
          `2. Transactions Processed: Total financial transactions per period\n` +
          `3. Agent Success Rate: % of agent operations completing without escalation\n` +
          `4. LLM Cost per Transaction: Average LLM cost per financial transaction\n` +
          `5. Entity Growth: New entities/organizations added per period\n` +
          `6. Invoice Processing Time: Average time from receipt to posting\n` +
          `7. Reconciliation Accuracy: % of reconciliations matching on first attempt\n\n` +
          `DASHBOARD STRUCTURE:\n` +
          `- Executive Overview: High-level business KPIs\n` +
          `- Operational Metrics: Day-to-day operations\n` +
          `- Agent Performance: Agent success rates and confidence\n` +
          `- Financial Health: Transaction volumes and accuracy\n` +
          `- Cost Management: LLM costs and efficiency\n\n` +
          `IMPLEMENTATION:\n` +
          `- Add custom metrics to APM provider\n` +
          `- Create scheduled jobs for metric calculation\n` +
          `- Build dashboard views in monitoring UI\n` +
          `- Setup metric retention and aggregation`
      }
    ]
  };
}

async function handleSetupAlerting(args) {
  const channels = args.channels || ['slack', 'pagerduty', 'email'];
  const severityLevels = args.severity_levels || ['critical', 'high'];

  return {
    content: [
      {
        type: 'text',
        text: `Setting up alerting system...\n\n` +
          `NOTIFICATION CHANNELS:\n` +
          channels.map(channel => {
            const channelDetails = {
              slack: 'Slack webhook for team notifications',
              pagerduty: 'PagerDuty for on-call escalation',
              email: 'Email for non-critical alerts',
              sms: 'SMS for critical after-hours alerts',
              webhook: 'Custom webhook for integrations'
            };
            return `- ${channel}: ${channelDetails[channel]}`;
          }).join('\n') +
          `\n\n` +
          `ALERT RULES:\n` +
          `CRITICAL (Immediate + PagerDuty):\n` +
          `- Service down (health check failing)\n` +
          `- Error rate > 10% for 5 minutes\n` +
          `- Database connection failure\n` +
          `- Data loss or corruption detected\n` +
          `- Security breach detected\n\n` +
          `HIGH (Slack + Email):\n` +
          `- Error rate > 5% for 10 minutes\n` +
          `- API latency > 5s (p95)\n` +
          `- Agent confidence < 0.6 consistently\n` +
          `- Disk space < 20%\n` +
          `- Memory usage > 80%\n\n` +
          `MEDIUM (Slack):\n` +
          `- Error rate > 2% for 15 minutes\n` +
          `- API latency > 2s (p95)\n` +
          `- LLM API rate limiting\n` +
          `- Queue depth > 1000\n\n` +
          `IMPLEMENTATION:\n` +
          `- Configure alert rules in monitoring provider\n` +
          `- Setup notification channel integrations\n` +
          `- Define on-call rotation and escalation paths\n` +
          `- Create runbooks for common alerts\n` +
          `- Test alert delivery regularly`
      }
    ]
  };
}

async function handlePerformanceBaseline(args) {
  const endpoints = args.endpoints || ['/api/trpc', '/api/chat/stream', '/health'];

  return {
    content: [
      {
        type: 'text',
        text: `Establishing performance baselines...\n\n` +
          `BASELINE METRICS:\n` +
          endpoints.map(ep => `\n${ep}:\n` +
            `- Latency p50: < 200ms\n` +
            `- Latency p95: < 500ms\n` +
            `- Latency p99: < 1s\n` +
            `- Error rate: < 0.1%\n` +
            `- Throughput: > 100 req/s`
          ).join('') +
          `\n\n` +
          `SLA/SLO DEFINITIONS:\n` +
          `Service Level Agreement (SLA):\n` +
          `- 99.9% uptime monthly (43.2 minutes downtime allowed)\n` +
          `- 99.95% uptime quarterly (21.6 minutes downtime allowed)\n\n` +
          `Service Level Objectives (SLO):\n` +
          `- API response time: p95 < 500ms\n` +
          `- Error rate: < 0.1%\n` +
          `- Agent success rate: > 95%\n` +
          `- Data accuracy: 100%\n\n` +
          `ERROR BUDGET:\n` +
          `- Monthly: 43.2 minutes\n` +
          `- Quarterly: 21.6 minutes\n` +
          `- Alert if error budget < 50%\n\n` +
          `IMPLEMENTATION:\n` +
          `- Run load tests to establish true baselines\n` +
          `- Configure SLO tracking in monitoring tool\n` +
          `- Setup error budget alerts\n` +
          `- Review and adjust baselines quarterly`
      }
    ]
  };
}

async function handleDistributedTracingSetup(args) {
  const provider = args.provider || 'datadog';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up distributed tracing with ${provider}...\n\n` +
          `IMPLEMENTATION STEPS:\n` +
          `1. Install ${provider} tracing SDK\n` +
          `2. Initialize tracer in Next.js app\n` +
          `3. Instrument API routes\n` +
          `4. Instrument agent calls\n` +
          `5. Instrument database queries\n` +
          `6. Configure sampling strategy\n` +
          `7. Setup service map\n\n` +
          `TRACE STRUCTURE:\n` +
          `- Trace ID: Correlates all spans for a request\n` +
          `- Span ID: Individual operation within trace\n` +
          `- Parent ID: Relationship between spans\n` +
          `- Service: Which service generated the span\n` +
          `- Operation: What operation was performed\n` +
          `- Tags: Key-value metadata (entityId, agent, etc.)\n\n` +
          `KEY SPANS TO INSTRUMENT:\n` +
          `- HTTP request/response\n` +
          `- tRPC procedure execution\n` +
          `- Agent graph execution\n` +
          `- LLM API calls\n` +
          `- Database queries\n` +
          `- External API calls (R2, Resend, Trigger.dev)\n\n` +
          `SAMPLING STRATEGY:\n` +
          `- Production: 10% sampling (adjust based on volume)\n` +
          `- Staging: 100% sampling\n` +
          `- Development: 100% sampling\n` +
          `- High-priority traces: Always sample (errors, slow requests)`
      }
    ]
  };
}

async function handleLogAnalysis(args) {
  const timeRange = args.time_range || '24h';
  const pattern = args.pattern || 'error';

  return {
    content: [
      {
        type: 'text',
        text: `Analyzing logs for pattern "${pattern}" in last ${timeRange}...\n\n` +
          `LOG ANALYSIS CAPABILITIES:\n` +
          `1. Error pattern detection\n` +
          `2. Performance issue identification\n` +
          `3. Security event correlation\n` +
          `4. User journey reconstruction\n` +
          `5. Agent behavior analysis\n\n` +
          `COMMON PATTERNS TO SEARCH:\n` +
          `- "error" - All error messages\n` +
          `- "timeout" - Timeout issues\n` +
          `- "escalate" - Agent escalations\n` +
          `- "confidence" - Agent confidence scores\n` +
          `- "entityId" - Entity-specific activity\n` +
          `- "slow query" - Database performance\n\n` +
          `ANALYSIS OUTPUT:\n` +
          `- Pattern frequency over time\n` +
          `- Affected services/endpoints\n` +
          `- Correlated errors\n` +
          `- User impact assessment\n` +
          `- Recommended actions\n\n` +
          `IMPLEMENTATION:\n` +
          `- Setup log queries in monitoring tool\n` +
          `- Create saved searches for common patterns\n` +
          `- Configure log alerts for critical patterns\n` +
          `- Schedule regular log analysis reports`
      }
    ]
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Enterprise Monitoring MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});