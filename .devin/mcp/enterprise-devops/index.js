/**
 * Enterprise DevOps & Infrastructure MCP Server
 * Provides CI/CD, infrastructure, deployment, and scalability best practices for Xenboox
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// DevOps tools
const DEVOPS_TOOLS = [
  {
    name: 'devops_audit',
    description: 'Audit current DevOps and infrastructure implementation',
    inputSchema: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          enum: ['all', 'cicd', 'infrastructure', 'deployment', 'disaster_recovery', 'scaling'],
          description: 'Specific area to audit'
        }
      }
    }
  },
  {
    name: 'setup_cicd',
    description: 'Setup CI/CD pipeline with GitHub Actions or similar',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['github', 'gitlab', 'circleci', 'jenkins'],
          description: 'CI/CD provider'
        },
        stages: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['test', 'build', 'lint', 'typecheck', 'security_scan', 'deploy']
          },
          description: 'Pipeline stages to include'
        }
      }
    }
  },
  {
    name: 'setup_iac',
    description: 'Setup Infrastructure as Code with Terraform or CloudFormation',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['terraform', 'cloudformation', 'pulumi'],
          description: 'IaC provider'
        },
        cloud: {
          type: 'string',
          enum: ['aws', 'gcp', 'azure'],
          description: 'Cloud provider'
        }
      }
    }
  },
  {
    name: 'setup_disaster_recovery',
    description: 'Setup disaster recovery and backup strategy',
    inputSchema: {
      type: 'object',
      properties: {
        rto: {
          type: 'string',
          description: 'Recovery Time Objective (e.g., "4h")'
        },
        rpo: {
          type: 'string',
          description: 'Recovery Point Objective (e.g., "15m")'
        }
      }
    }
  },
  {
    name: 'setup_multi_region',
    description: 'Setup multi-region deployment for redundancy',
    inputSchema: {
      type: 'object',
      properties: {
        regions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Regions to deploy to (e.g., ["us-east-1", "eu-west-1"])'
        },
        strategy: {
          type: 'string',
          enum: ['active-active', 'active-passive'],
          description: 'Multi-region strategy'
        }
      }
    }
  },
  {
    name: 'setup_blue_green',
    description: 'Setup blue-green deployment strategy for zero-downtime deployments',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['vercel', 'aws', 'kubernetes'],
          description: 'Deployment provider'
        }
      }
    }
  },
  {
    name: 'setup_auto_scaling',
    description: 'Setup auto-scaling based on load',
    inputSchema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['cpu', 'memory', 'requests', 'response_time']
          },
          description: 'Metrics to scale on'
        }
      }
    }
  },
  {
    name: 'setup_caching',
    description: 'Setup caching strategy with Redis or similar',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['redis', 'memcached', 'upstash'],
          description: 'Caching provider'
        },
        strategy: {
          type: 'string',
          enum: ['cache_aside', 'write_through', 'write_behind'],
          description: 'Caching strategy'
        }
      }
    }
  },
  {
    name: 'setup_cdn',
    description: 'Setup CDN for static assets and API caching',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['cloudflare', 'aws_cloudfront', 'fastly'],
          description: 'CDN provider'
        }
      }
    }
  },
  {
    name: 'database_optimization',
    description: 'Optimize database for performance and scalability',
    inputSchema: {
      type: 'object',
      properties: {
        optimizations: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['connection_pooling', 'query_optimization', 'indexing', 'read_replicas']
          },
          description: 'Optimizations to implement'
        }
      }
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'enterprise-devops',
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
    tools: DEVOPS_TOOLS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'devops_audit':
        return await handleDevOpsAudit(args);
      case 'setup_cicd':
        return await handleSetupCICD(args);
      case 'setup_iac':
        return await handleSetupIaC(args);
      case 'setup_disaster_recovery':
        return await handleSetupDisasterRecovery(args);
      case 'setup_multi_region':
        return await handleSetupMultiRegion(args);
      case 'setup_blue_green':
        return await handleSetupBlueGreen(args);
      case 'setup_auto_scaling':
        return await handleSetupAutoScaling(args);
      case 'setup_caching':
        return await handleSetupCaching(args);
      case 'setup_cdn':
        return await handleSetupCDN(args);
      case 'database_optimization':
        return await handleDatabaseOptimization(args);
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
async function handleDevOpsAudit(args) {
  const area = args.area || 'all';

  let report = `DEVOPS & INFRASTRUCTURE AUDIT\n\n`;

  if (area === 'all' || area === 'cicd') {
    report += `CI/CD PIPELINE:\n`;
    report += `- Automated testing: Not configured\n`;
    report += `- Automated building: Not configured\n`;
    report += `- Automated deployment: Not configured\n`;
    report += `- Security scanning: Not configured\n`;
    report += `- Pipeline as code: Not implemented\n\n`;
  }

  if (area === 'all' || area === 'infrastructure') {
    report += `INFRASTRUCTURE:\n`;
    report += `- IaC (Terraform): Not implemented\n`;
    report += `- Infrastructure documentation: Not available\n`;
    report += `- Configuration management: Not implemented\n`;
    report += `- Environment parity: Not ensured\n\n`;
  }

  if (area === 'all' || area === 'deployment') {
    report += `DEPLOYMENT:\n`;
    report += `- Blue-green deployments: Not implemented\n`;
    report += `- Canary deployments: Not implemented\n`;
    report += `- Rollback capability: Manual only\n`;
    report += `- Zero-downtime deployments: Not guaranteed\n\n`;
  }

  if (area === 'all' || area === 'disaster_recovery') {
    report += `DISASTER RECOVERY:\n`;
    report += `- Backup automation: Not configured\n`;
    report += `- Restore procedures: Not documented\n`;
    report += `- DR plan: Not created\n`;
    report += `- RTO/RPO: Not defined\n`;
    report += `- Failover testing: Not performed\n\n`;
  }

  if (area === 'all' || area === 'scaling') {
    report += `SCALABILITY:\n`;
    report += `- Auto-scaling: Not configured\n`;
    report += `- Load balancing: Not documented\n`;
    report += `- Database sharding: Not implemented\n`;
    report += `- Caching layer: Not implemented\n`;
    report += `- CDN: Not configured\n\n`;
  }

  report += `CRITICAL GAPS:\n`;
  report += `1. No CI/CD pipeline for automated testing and deployment\n`;
  report += `2. No Infrastructure as Code for reproducible deployments\n`;
  report += `3. No disaster recovery plan or backup automation\n`;
  report += `4. No multi-region deployment for redundancy\n`;
  report += `5. No blue-green deployment strategy\n`;
  report += `6. No auto-scaling based on load\n`;
  report += `7. No caching layer for performance\n`;
  report += `8. No CDN for global asset distribution\n\n`;

  report += `RECOMMENDED ACTIONS:\n`;
  report += `1. Setup GitHub Actions CI/CD pipeline\n`;
  report += `2. Implement Terraform for infrastructure\n`;
  report += `3. Create disaster recovery plan with automated backups\n`;
  report += `4. Deploy to multiple regions for redundancy\n`;
  report += `5. Implement blue-green deployments\n`;
  report += `6. Configure auto-scaling policies\n`;
  report += `7. Add Redis caching layer\n`;
  report += `8. Setup Cloudflare CDN`;

  return {
    content: [{ type: 'text', text: report }]
  };
}

async function handleSetupCICD(args) {
  const provider = args.provider || 'github';
  const stages = args.stages || ['test', 'build', 'lint', 'typecheck', 'security_scan', 'deploy'];

  return {
    content: [
      {
        type: 'text',
        text: `Setting up CI/CD pipeline with ${provider}...\n\n` +
          `PIPELINE STAGES:\n` +
          stages.map(stage => {
            const stageDetails = {
              test: 'Run test suite (jest, vitest)',
              build: 'Build Next.js application',
              lint: 'Run ESLint for code quality',
              typecheck: 'Run TypeScript type checking',
              security_scan: 'Run security scanning (Snyk, Dependabot)',
              deploy: 'Deploy to Vercel/staging/production'
            };
            return `${stage}: ${stageDetails[stage]}`;
          }).join('\n') +
          `\n\n` +
          `GITHUB ACTIONS WORKFLOW:\n` +
          `name: CI/CD Pipeline\n\n` +
          `on:\n` +
          `  push:\n` +
          `    branches: [main, develop]\n` +
          `  pull_request:\n` +
          `    branches: [main]\n\n` +
          `jobs:\n` +
          `  test:\n` +
          `    runs-on: ubuntu-latest\n` +
          `    steps:\n` +
          `      - uses: actions/checkout@v4\n` +
          `      - uses: pnpm/action-setup@v2\n` +
          `      - uses: actions/setup-node@v4\n` +
          `        with:\n` +
          `          node-version: 20\n` +
          `      - run: pnpm install\n` +
          `      - run: pnpm test\n\n` +
          `  build:\n` +
          `    runs-on: ubuntu-latest\n` +
          `    steps:\n` +
          `      - uses: actions/checkout@v4\n` +
          `      - uses: pnpm/action-setup@v2\n` +
          `      - uses: actions/setup-node@v4\n` +
          `      - run: pnpm install\n` +
          `      - run: pnpm build\n\n` +
          `  deploy:\n` +
          `    runs-on: ubuntu-latest\n` +
          `    needs: [test, build]\n` +
          `    steps:\n` +
          `      - uses: actions/checkout@v4\n` +
          `      - uses: amondnet/vercel-action@v25\n` +
          `        with:\n` +
          `          vercel-token: \${{ secrets.VERCEL_TOKEN }}\n` +
          `          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}\n` +
          `          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}\n\n` +
          `ENVIRONMENT VARIABLES:\n` +
          `- VERCEL_TOKEN: Vercel authentication token\n` +
          `- VERCEL_ORG_ID: Vercel organization ID\n` +
          `- VERCEL_PROJECT_ID: Vercel project ID\n` +
          `- DATABASE_URL: Neon connection string\n` +
          `- ANTHROPIC_API_KEY: Claude API key\n\n` +
          `IMPLEMENTATION:\n` +
          `- Create .github/workflows/ci-cd.yml\n` +
          `- Configure environment secrets in GitHub\n` +
          `- Setup Vercel project integration\n` +
          `- Configure deployment environments\n` +
          `- Add branch protection rules\n` +
          `- Setup required status checks`;
      }
    ]
  };
}

async function handleSetupIaC(args) {
  const provider = args.provider || 'terraform';
  const cloud = args.cloud || 'aws';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up Infrastructure as Code with ${provider} for ${cloud.toUpperCase()}...\n\n` +
          `TERRAFORM STRUCTURE:\n` +
          `terraform/\n` +
          `├── main.tf              # Main configuration\n` +
          `├── variables.tf         # Variable definitions\n` +
          `├── outputs.tf          # Output definitions\n` +
          `├── provider.tf          # Provider configuration\n` +
          `├── modules/\n` +
          `│   ├── vpc/            # VPC module\n` +
          `│   ├── rds/            # Database module\n` +
          `│   ├── ecs/            # ECS/Fargate module\n` +
          `│   └── cloudfront/     # CDN module\n` +
          `└── environments/\n` +
          `    ├── dev/           # Dev environment\n` +
          `    ├── staging/       # Staging environment\n` +
          `    └── prod/          # Production environment\n\n` +
          `MAIN RESOURCES:\n` +
          `- VPC with private and public subnets\n` +
          `- RDS PostgreSQL (multi-AZ for production)\n` +
          `- ECS/Fargate for containerized apps\n` +
          `- Application Load Balancer\n` +
          `- CloudFront CDN\n` +
          `- S3 buckets for storage\n` +
          `- ElastiCache Redis\n` +
          `- Security groups and NACLs\n\n` +
          `EXAMPLE main.tf:\n` +
          `provider "aws" {\n` +
          `  region = var.aws_region\n` +
          `}\n\n` +
          `module "vpc" {\n` +
          `  source = "./modules/vpc"\n` +
          `  cidr_block = var.vpc_cidr\n` +
          `  availability_zones = var.availability_zones\n` +
          `}\n\n` +
          `module "rds" {\n` +
          `  source = "./modules/rds"\n` +
          `  vpc_id = module.vpc.vpc_id\n` +
          `  subnet_ids = module.vpc.private_subnet_ids\n` +
          `  instance_class = var.db_instance_class\n` +
          `  multi_az = var.environment == "production"\n` +
          `}\n\n` +
          `IMPLEMENTATION:\n` +
          `- Install Terraform CLI\n` +
          `- Create terraform directory structure\n` +
          `- Write Terraform configurations\n` +
          `- Configure Terraform state backend (S3)\n` +
          `- Setup Terraform workspaces\n` +
          `- Integrate with CI/CD pipeline\n` +
          `- Add infrastructure testing`;
      }
    ]
  };
}

async function handleSetupDisasterRecovery(args) {
  const rto = args.rto || '4h';
  const rpo = args.rpo || '15m';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up disaster recovery strategy (RTO: ${rto}, RPO: ${rpo})...\n\n` +
          `DISASTER RECOVERY PLAN:\n` +
          `1. Backup Strategy\n` +
          `2. Recovery Procedures\n` +
          `3. Failover Process\n` +
          `4. Testing Schedule\n` +
          `5. Communication Plan\n\n` +
          `BACKUP STRATEGY:\n` +
          `- Database: Continuous WAL archiving + daily snapshots\n` +
          `- Storage: R2 bucket versioning + cross-region replication\n` +
          `- Configuration: Git version control\n` +
          `- Secrets: Encrypted backups to separate region\n\n` +
          `BACKUP SCHEDULE:\n` +
          `- Database: Continuous (WAL) + Daily snapshots\n` +
          `- Storage: Real-time replication\n` +
          `- Configuration: On every change\n` +
          `- Secrets: Daily encrypted backup\n\n` +
          `RECOVERY PROCEDURES:\n` +
          `1. Database Recovery:\n` +
          `   - Restore from latest snapshot\n` +
          `   - Replay WAL logs to current time\n` +
          `   - Verify data integrity\n\n` +
          `2. Application Recovery:\n` +
          `   - Deploy latest version from CI/CD\n` +
          `   - Configure environment variables\n` +
          `   - Run health checks\n\n` +
          `3. Storage Recovery:\n` +
          `   - Enable versioned objects\n` +
          `   - Restore from cross-region replica\n\n` +
          `FAILOVER PROCESS:\n` +
          `1. Detect failure (automated monitoring)\n` +
          `2. Alert on-call team\n` +
          `3. Execute failover to DR region\n` +
          `4. Update DNS to point to DR region\n` +
          `5. Verify system functionality\n` +
          `6. Notify stakeholders\n\n` +
          `TESTING SCHEDULE:\n` +
          `- Backup verification: Daily\n` +
          `- Restore testing: Weekly\n` +
          `- Failover testing: Quarterly\n` +
          `- Full DR drill: Annually\n\n` +
          `IMPLEMENTATION:\n` +
          `- Configure Neon read replicas\n` +
          `- Setup R2 cross-region replication\n` +
          `- Create backup automation scripts\n` +
          `- Document recovery procedures\n` +
          `- Setup monitoring and alerting\n` +
          `- Schedule regular testing`;
      }
    ]
  };
}

async function handleSetupMultiRegion(args) {
  const regions = args.regions || ['us-east-1', 'eu-west-1'];
  const strategy = args.strategy || 'active-active';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up multi-region deployment (${strategy})...\n\n` +
          `REGIONS:\n` +
          regions.map((region, i) => `${i === 0 ? 'Primary: ' : 'Secondary: '}${region}`).join('\n') +
          `\n\n` +
          `STRATEGY: ${strategy.toUpperCase()}\n\n`;

        if (strategy === 'active-active') {
          strategyText += `Both regions handle traffic simultaneously:\n` +
            `- DNS load balancing across regions\n` +
            `- Data replication in both directions\n` +
            `- Sessions can be served from any region\n` +
            `- Automatic failover on region failure\n\n`;
        } else {
          strategyText += `Primary region handles all traffic:\n` +
            `- Secondary region on standby\n` +
            `- Data replication primary → secondary\n` +
            `- Manual or automatic failover\n` +
            `- Faster recovery, higher cost efficiency\n\n`;
        }

        let text = strategyText + `ARCHITECTURE:\n` +
          `- CDN (CloudFront) with regional origins\n` +
          `- DNS (Route53) with latency-based routing\n` +
          `- Database read replicas in each region\n` +
          `- Application instances in each region\n` +
          `- Cross-region data replication\n\n` +
          `DATA REPLICATION:\n` +
          `- Database: Streaming replication to read replicas\n` +
          `- Storage: R2 cross-region replication\n` +
          `- Cache: Redis Cluster with cross-region replication\n` +
          `- Sessions: Sticky sessions or session replication\n\n` +
          `DNS CONFIGURATION:\n` +
          `resource "aws_route53_record" "api" {\n` +
          `  zone_id = var.hosted_zone_id\n` +
          `  name    = "api.xenboox.com"\n` +
          `  type    = "A"\n` +
          `  alias {\n` +
          `    name                   = aws_lb.primary.dns_name\n` +
          `    zone_id                = aws_lb.primary.zone_id\n` +
          `    evaluate_target_health = true\n` +
          `  }\n` +
          `}\n\n` +
          `IMPLEMENTATION:\n` +
          `- Deploy infrastructure to each region\n` +
          `- Configure cross-region replication\n` +
          `- Setup DNS with latency-based routing\n` +
          `- Configure CDN with regional origins\n` +
          `- Implement health checks for failover\n` +
          `- Test failover procedures`;
      }
    ]
  };
}

async function handleSetupBlueGreen(args) {
  const provider = args.provider || 'vercel';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up blue-green deployment with ${provider}...\n\n` +
          `BLUE-GREEN STRATEGY:\n` +
          `1. Blue: Current production environment\n` +
          `2. Green: New deployment candidate\n` +
          `3. Switch: Instant traffic cutover\n` +
          `4. Rollback: Instant revert to blue\n\n` +
          `DEPLOYMENT PROCESS:\n` +
          `1. Deploy new version to green environment\n` +
          `2. Run smoke tests on green\n` +
          `3. Run integration tests on green\n` +
          `4. Gradually shift traffic to green (10%, 50%, 100%)\n` +
          `5. Monitor for errors\n` +
          `6. If errors detected, rollback to blue\n` +
          `7. If successful, promote green to blue\n\n` +
          `VERCEL IMPLEMENTATION:\n` +
          `# vercel.json\n` +
          `{\n` +
          `  "routes": [\n` +
          `    {\n` +
          `      "src": "/(.*)",\n` +
          `      "dest": "https://green.xenboox.com/$1",\n` +
          `      "headers": {\n` +
          `        "x-verbatim": "1"\n` +
          `      }\n` +
          `    }\n` +
          `  ]\n` +
          `}\n\n` +
          `ENVIRONMENTS:\n` +
          `- Production (Blue): production.xenboox.com\n` +
          `- Staging (Green): green.xenboox.com\n` +
          `- Preview: pr-123.xenboox.com\n\n` +
          `SWITCHING TRAFFIC:\n` +
          `1. Update DNS or load balancer configuration\n` +
          `2. Monitor key metrics (error rate, latency)\n` +
          `3. If issues, immediate rollback\n` +
          `4. If clean, complete cutover\n\n` +
          `IMPLEMENTATION:\n` +
          `- Configure Vercel projects for blue/green\n` +
          `- Setup custom domains for each environment\n` +
          `- Configure load balancer or DNS\n` +
          `- Implement health checks\n` +
          `- Create deployment scripts\n` +
          `- Setup monitoring and alerting`;
      }
    ]
  };
}

async function handleSetupAutoScaling(args) {
  const metrics = args.metrics || ['cpu', 'memory', 'requests', 'response_time'];

  return {
    content: [
      {
        type: 'text',
        text: `Setting up auto-scaling based on metrics...\n\n` +
          `SCALING METRICS:\n` +
          metrics.map(metric => {
            const config = {
              cpu: 'Scale when CPU > 70% for 5 minutes',
              memory: 'Scale when memory > 80% for 5 minutes',
              requests: 'Scale when requests > 1000/instance',
              response_time: 'Scale when p95 latency > 1s'
            };
            return `- ${metric}: ${config[metric]}`;
          }).join('\n') +
          `\n\n` +
          `SCALING POLICY:\n` +
          `- Minimum instances: 2\n` +
          `- Maximum instances: 20\n` +
          `- Scale up cooldown: 5 minutes\n` +
          `- Scale down cooldown: 10 minutes\n` +
          `- Target utilization: 70%\n\n` +
          `AWS AUTO SCALING CONFIGURATION:\n` +
          `resource "aws_autoscaling_policy" "scale_up" {\n` +
          `  name                   = "xenboox-scale-up"\n` +
          `  scaling_adjustment     = 1\n` +
          `  adjustment_type        = "ChangeInCapacity"\n` +
          `  cooldown               = 300\n` +
          `  autoscaling_group_name = aws_autoscaling_group.xenboox.name\n` +
          `}\n\n` +
          `resource "aws_cloudwatch_metric_alarm" "cpu_high" {\n` +
          `  alarm_name          = "xenboox-cpu-high"\n` +
          `  comparison_operator = "GreaterThanThreshold"\n` +
          `  evaluation_periods  = "2"\n` +
          `  metric_name         = "CPUUtilization"\n` +
          `  namespace           = "AWS/EC2"\n` +
          `  period              = "300"\n` +
          `  statistic           = "Average"\n` +
          `  threshold           = "70"\n` +
          `}\n\n` +
          `IMPLEMENTATION:\n` +
          `- Configure auto-scaling group\n` +
          `- Setup CloudWatch alarms\n` +
          `- Define scaling policies\n` +
          `- Configure scaling metrics\n` +
          `- Set up scaling cooldowns\n` +
          `- Monitor scaling events\n` +
          `- Test scaling behavior`;
      }
    ]
  };
}

async function handleSetupCaching(args) {
  const provider = args.provider || 'redis';
  const strategy = args.strategy || 'cache_aside';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up caching with ${provider} (${strategy} strategy)...\n\n` +
          `CACHING STRATEGY: ${strategy.toUpperCase()}\n\n`;

        if (strategy === 'cache_aside') {
          strategyText += `1. Application checks cache\n` +
            `2. If cache miss, query database\n` +
            `3. Populate cache with result\n` +
            `4. Return data to application\n\n`;
        } else if (strategy === 'write_through') {
          strategyText += `1. Application writes to cache\n` +
            `2. Cache synchronously writes to database\n` +
            `3. Application waits for both operations\n\n`;
        } else if (strategy === 'write_behind') {
          strategyText += `1. Application writes to cache\n` +
            `2. Cache asynchronously writes to database\n` +
            `3. Application returns immediately\n\n`;
        }

        let text = strategyText + `REDIS CONFIGURATION:\n` +
          `- Mode: Cluster mode for high availability\n` +
          `- Replication: Multi-AZ with automatic failover\n` +
          `- Eviction policy: allkeys-lru\n` +
          `- Max memory: 4GB per node\n` +
          `- Persistence: RDB + AOF enabled\n\n` +
          `CACHEABLE DATA:\n` +
          `- Chart of accounts (rarely changes)\n` +
          `- User sessions (TTL: 24h)\n` +
          `- API responses (TTL: 5m)\n` +
          `- Report results (TTL: 1h)\n` +
          `- Exchange rates (TTL: 24h)\n` +
          `- Entity settings (TTL: 1h)\n\n` +
          `REDIS INTEGRATION:\n` +
          `import { Redis } from "@upstash/redis";\n\n` +
          `const redis = Redis.fromEnv();\n\n` +
          `async function getCachedData(key: string) {\n` +
          `  const cached = await redis.get(key);\n` +
          `  if (cached) return cached;\n` +
          `  const data = await fetchDataFromDB();\n` +
          `  await redis.set(key, data, { ex: 300 });\n` +
          `  return data;\n` +
          `}\n\n` +
          `IMPLEMENTATION:\n` +
          `- Deploy Redis cluster\n` +
          `- Install Redis client package\n` +
          `- Implement caching layer\n` +
          `- Add cache invalidation\n` +
          `- Monitor cache hit ratio\n` +
          `- Setup cache alerts`;
      }
    ]
  };
}

async function handleSetupCDN(args) {
  const provider = args.provider || 'cloudflare';

  return {
    content: [
      {
        type: 'text',
        text: `Setting up CDN with ${provider}...\n\n` +
          `CDN CONFIGURATION:\n` +
          `- Caching: Static assets (images, CSS, JS)\n` +
          `- Edge caching: API responses where possible\n` +
          `- Compression: Brotli + Gzip\n` +
          `- HTTP/3: Enabled for performance\n` +
          `- TLS 1.3: Only\n` +
          `- Bypass cache: For authenticated requests\n\n` +
          `CACHING RULES:\n` +
          `- Static assets: Cache 1 year\n` +
          `- API responses: Cache 5 minutes (if cacheable)\n` +
          `- HTML: No cache (served from origin)\n` +
          `- Images: Cache 30 days\n` +
          `- Fonts: Cache 1 year\n\n` +
          `CLOUDFLARE CONFIGURATION:\n` +
          `1. Add domain to Cloudflare\n` +
          `2. Update nameservers to Cloudflare\n` +
          `3. Configure page rules\n` +
          `4. Setup SSL/TLS (Full mode)\n` +
          `5. Enable HTTP/3\n` +
          `6. Configure caching levels\n` +
          `7. Setup image optimization\n\n` +
          `PAGE RULES:\n` +
          `- /static/*: Cache everything, edge cache\n` +
          `- /api/*: Bypass cache, respect headers\n` +
          `- /images/*: Cache 30 days, image optimization\n` +
          `- /*.js: Cache 1 year, brotli\n` +
          `- /*.css: Cache 1 year, brotli\n\n` +
          `IMPLEMENTATION:\n` +
          `- Add domain to Cloudflare\n` +
          `- Update DNS records\n` +
          `- Configure caching rules\n` +
          `- Enable security features\n` +
          `- Setup image optimization\n` +
          `- Monitor cache hit ratio`;
      }
    ]
  };
}

async function handleDatabaseOptimization(args) {
  const optimizations = args.optimizations || ['connection_pooling', 'query_optimization', 'indexing', 'read_replicas'];

  return {
    content: [
      {
        type: 'text',
        text: `Optimizing database for performance and scalability...\n\n` +
          `OPTIMIZATIONS:\n` +
          optimizations.map(opt => {
            const details = {
              connection_pooling: 'Manage database connections efficiently',
              query_optimization: 'Optimize slow queries and add indexes',
              indexing: 'Add strategic indexes for common queries',
              read_replicas: 'Add read replicas for read-heavy workloads'
            };
            return `- ${opt}: ${details[opt]}`;
          }).join('\n') +
          `\n\n` +
          `CONNECTION POOLING:\n` +
          `- Pool size: 20 connections\n` +
          `- Max overflow: 10 connections\n` +
          `- Connection timeout: 30 seconds\n` +
          `- Idle timeout: 10 minutes\n\n` +
          `QUERY OPTIMIZATION:\n` +
          `- Add EXPLAIN ANALYZE to slow queries\n` +
          `- Optimize N+1 queries\n` +
          `- Use batch operations\n` +
          `- Add query result caching\n` +
          `- Monitor query performance\n\n` +
          `INDEXING STRATEGY:\n` +
          `- Index foreign keys\n` +
          `- Index frequently queried columns\n` +
          `- Use composite indexes for multi-column queries\n` +
          `- Monitor index usage\n` +
          `- Remove unused indexes\n\n` +
          `READ REPLICAS:\n` +
          `- 1 read replica for staging\n` +
          `- 2 read replicas for production\n` +
          `- Configure read replica routing\n` +
          `- Monitor replica lag\n` +
          `- Setup automatic failover\n\n` +
          `IMPLEMENTATION:\n` +
          `- Configure connection pool in Drizzle\n` +
          `- Add indexes to schema\n` +
          `- Setup read replicas in Neon\n` +
          `- Configure replica routing\n` +
          `- Add query monitoring\n` +
          `- Optimize slow queries`;
      }
    ]
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Enterprise DevOps MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});