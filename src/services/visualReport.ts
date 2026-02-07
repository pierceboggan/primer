import path from "path";
import { ReadinessReport, ReadinessCriterionResult } from "./readiness";

type VisualReportOptions = {
  reports: Array<{ repo: string; report: ReadinessReport; error?: string }>;
  title?: string;
  generatedAt?: string;
};

export function generateVisualReport(options: VisualReportOptions): string {
  const { reports, title = "AI Readiness Report", generatedAt = new Date().toISOString() } = options;

  const successfulReports = reports.filter(r => !r.error);
  const failedReports = reports.filter(r => r.error);

  // Calculate aggregate statistics
  const totalRepos = reports.length;
  const successfulRepos = successfulReports.length;
  const avgLevel = successfulReports.length > 0
    ? successfulReports.reduce((sum, r) => sum + r.report.achievedLevel, 0) / successfulReports.length
    : 0;

  // Calculate pillar statistics across all repos
  const pillarStats = calculatePillarStats(successfulReports);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 2rem;
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5rem;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .header .subtitle {
      color: #666;
      font-size: 1rem;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .card-title {
      font-size: 0.9rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
    }

    .card-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
    }

    .card-subtitle {
      font-size: 0.85rem;
      color: #888;
      margin-top: 0.5rem;
    }

    .section {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 1.8rem;
      color: #333;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid #667eea;
    }

    .pillar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .pillar-card {
      padding: 1.5rem;
      border-radius: 8px;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
    }

    .pillar-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .pillar-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
    }

    .progress-bar {
      flex: 1;
      height: 24px;
      background: #e9ecef;
      border-radius: 12px;
      overflow: hidden;
      margin-right: 1rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.8rem;
      font-weight: 600;
      transition: width 0.3s ease;
    }

    .progress-fill.low {
      background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
    }

    .progress-fill.medium {
      background: linear-gradient(90deg, #ffd89b 0%, #ff6f3c 100%);
    }

    .progress-fill.high {
      background: linear-gradient(90deg, #30cfd0 0%, #4ade80 100%);
    }

    .repo-list {
      display: grid;
      gap: 1rem;
    }

    .repo-item {
      padding: 1.5rem;
      border-radius: 8px;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
    }

    .repo-item.error {
      border-left-color: #f5576c;
      background: #fff5f5;
    }

    .repo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .repo-name {
      font-size: 1.2rem;
      font-weight: 600;
      color: #333;
    }

    .level-badge {
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      color: white;
    }

    .level-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .level-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .level-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .level-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
    .level-5 { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); }

    .repo-pillars {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .repo-pillar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: white;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .repo-pillar-name {
      color: #666;
    }

    .repo-pillar-value {
      font-weight: 600;
      color: #333;
    }

    .error-message {
      color: #f5576c;
      font-size: 0.95rem;
      margin-top: 0.5rem;
    }

    .chart {
      margin: 2rem 0;
      min-height: 300px;
    }

    .level-distribution {
      display: flex;
      gap: 1rem;
      margin: 2rem 0;
    }

    .level-bar {
      flex: 1;
      text-align: center;
    }

    .level-bar-fill {
      height: 200px;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px 8px 0 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      color: white;
      font-weight: 600;
      padding: 1rem;
      position: relative;
    }

    .level-bar-label {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #666;
      font-weight: 600;
    }

    .footer {
      text-align: center;
      color: white;
      margin-top: 2rem;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      .header h1 {
        font-size: 1.8rem;
      }

      .summary-cards {
        grid-template-columns: 1fr;
      }

      .pillar-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 ${escapeHtml(title)}</h1>
      <p class="subtitle">Generated ${new Date(generatedAt).toLocaleString()}</p>
    </div>

    <div class="summary-cards">
      <div class="card">
        <div class="card-title">Total Repositories</div>
        <div class="card-value">${totalRepos}</div>
        <div class="card-subtitle">${successfulRepos} analyzed successfully</div>
      </div>

      <div class="card">
        <div class="card-title">Average Readiness Level</div>
        <div class="card-value">${avgLevel.toFixed(1)}</div>
        <div class="card-subtitle">${getLevelName(Math.round(avgLevel))}</div>
      </div>

      <div class="card">
        <div class="card-title">Success Rate</div>
        <div class="card-value">${totalRepos > 0 ? Math.round((successfulRepos / totalRepos) * 100) : 0}%</div>
        <div class="card-subtitle">${failedReports.length} failed</div>
      </div>
    </div>

    ${successfulReports.length > 0 ? `
    <div class="section">
      <h2 class="section-title">📊 Pillar Performance Across All Repositories</h2>
      <div class="pillar-grid">
        ${pillarStats.map(pillar => `
          <div class="pillar-card">
            <div class="pillar-name">${escapeHtml(pillar.name)}</div>
            <div class="pillar-stats">
              <div class="progress-bar">
                <div class="progress-fill ${getProgressClass(pillar.passRate)}" style="width: ${pillar.passRate * 100}%">
                  ${Math.round(pillar.passRate * 100)}%
                </div>
              </div>
              <span>${pillar.passed}/${pillar.total}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📈 Level Distribution</h2>
      <div class="level-distribution">
        ${[1, 2, 3, 4, 5].map(level => {
          const count = successfulReports.filter(r => r.report.achievedLevel === level).length;
          const percent = successfulReports.length > 0 ? (count / successfulReports.length) * 100 : 0;
          return `
            <div class="level-bar">
              <div class="level-bar-fill" style="height: ${Math.max(20, percent * 2)}px">
                <span>${count}</span>
              </div>
              <div class="level-bar-label">Level ${level}<br>${getLevelName(level)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">📁 Repository Details</h2>
      <div class="repo-list">
        ${reports.map(({ repo, report, error }) => {
          if (error) {
            return `
              <div class="repo-item error">
                <div class="repo-header">
                  <div class="repo-name">${escapeHtml(repo)}</div>
                  <span style="color: #f5576c; font-weight: 600;">❌ Error</span>
                </div>
                <div class="error-message">${escapeHtml(error)}</div>
              </div>
            `;
          }

          return `
            <div class="repo-item">
              <div class="repo-header">
                <div class="repo-name">${escapeHtml(repo)}</div>
                <div class="level-badge level-${report.achievedLevel}">
                  Level ${report.achievedLevel}: ${getLevelName(report.achievedLevel)}
                </div>
              </div>
              ${report.isMonorepo ? `<div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">📦 Monorepo (${report.apps.length} apps)</div>` : ''}
              <div class="repo-pillars">
                ${report.pillars.map(pillar => `
                  <div class="repo-pillar">
                    <span class="repo-pillar-name">${escapeHtml(pillar.name)}</span>
                    <span class="repo-pillar-value">${pillar.passed}/${pillar.total} (${Math.round(pillar.passRate * 100)}%)</span>
                  </div>
                `).join('')}
              </div>
              ${getTopFixesHtml(report)}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    ${failedReports.length > 0 ? `
    <div class="section">
      <h2 class="section-title">⚠️ Failed Repositories</h2>
      <div class="repo-list">
        ${failedReports.map(({ repo, error }) => `
          <div class="repo-item error">
            <div class="repo-name">${escapeHtml(repo)}</div>
            <div class="error-message">${escapeHtml(error || 'Unknown error')}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated with Primer - AI Readiness Tool</p>
    </div>
  </div>
</body>
</html>`;
}

function calculatePillarStats(reports: Array<{ repo: string; report: ReadinessReport }>): Array<{
  id: string;
  name: string;
  passed: number;
  total: number;
  passRate: number;
}> {
  const pillarMap = new Map<string, { name: string; passed: number; total: number }>();

  for (const { report } of reports) {
    for (const pillar of report.pillars) {
      const existing = pillarMap.get(pillar.id);
      if (existing) {
        existing.passed += pillar.passed;
        existing.total += pillar.total;
      } else {
        pillarMap.set(pillar.id, {
          name: pillar.name,
          passed: pillar.passed,
          total: pillar.total
        });
      }
    }
  }

  return Array.from(pillarMap.entries()).map(([id, stats]) => ({
    id,
    name: stats.name,
    passed: stats.passed,
    total: stats.total,
    passRate: stats.total > 0 ? stats.passed / stats.total : 0
  }));
}

function getTopFixesHtml(report: ReadinessReport): string {
  const failedCriteria = report.criteria
    .filter(c => c.status === "fail")
    .sort((a, b) => {
      const impactWeight = { high: 3, medium: 2, low: 1 };
      const effortWeight = { low: 1, medium: 2, high: 3 };
      const impactDelta = impactWeight[b.impact] - impactWeight[a.impact];
      if (impactDelta !== 0) return impactDelta;
      return effortWeight[a.effort] - effortWeight[b.effort];
    })
    .slice(0, 3);

  if (failedCriteria.length === 0) {
    return '<div style="margin-top: 1rem; color: #4ade80; font-weight: 600;">✅ All criteria passing!</div>';
  }

  return `
    <div style="margin-top: 1rem;">
      <div style="font-size: 0.9rem; font-weight: 600; color: #666; margin-bottom: 0.5rem;">Top Fixes Needed:</div>
      <ul style="list-style: none; padding-left: 0; font-size: 0.85rem;">
        ${failedCriteria.map(c => `
          <li style="margin-bottom: 0.25rem;">
            <span style="color: ${c.impact === 'high' ? '#f5576c' : c.impact === 'medium' ? '#ff6f3c' : '#ffd89b'};">●</span>
            ${escapeHtml(c.title)}
            <span style="color: #888;">(${c.impact} impact, ${c.effort} effort)</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function getLevelName(level: number): string {
  const names: Record<number, string> = {
    1: "Functional",
    2: "Documented",
    3: "Standardized",
    4: "Optimized",
    5: "Autonomous"
  };
  return names[level] || "Unknown";
}

function getProgressClass(passRate: number): string {
  if (passRate >= 0.8) return "high";
  if (passRate >= 0.5) return "medium";
  return "low";
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
