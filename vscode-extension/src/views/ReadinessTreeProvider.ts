import * as vscode from "vscode";
import type {
  ReadinessReport,
  ReadinessPillarSummary,
  ReadinessCriterionResult
} from "../types.js";
import { groupPillars, getLevelName, getLevelDescription } from "../services.js";

export class ReadinessTreeProvider implements vscode.TreeDataProvider<ReadinessItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ReadinessItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private report: ReadinessReport | undefined;

  setReport(report: ReadinessReport): void {
    this.report = report;
    this._onDidChangeTreeData.fire(undefined);
  }

  getReport(): ReadinessReport | undefined {
    return this.report;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ReadinessItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ReadinessItem): ReadinessItem[] {
    if (element) return element.children ?? [];
    if (!this.report) return [];
    return this.getRootItems(this.report);
  }

  private getRootItems(report: ReadinessReport): ReadinessItem[] {
    const items: ReadinessItem[] = [];

    // ── Score summary ──────────────────────────────────────────────
    items.push(this.createScoreSummary(report));

    // ── Fix First (top failing criteria by impact) ─────────────────
    const fixFirst = this.createFixFirstSection(report);
    if (fixFirst) items.push(fixFirst);

    // ── Pillar groups (smart collapse) ─────────────────────────────
    const groups = groupPillars(report.pillars);
    for (const { label, pillars } of groups) {
      const groupChildren = pillars.map((pillar) => {
        const criteria = report.criteria.filter((c) => c.pillar === pillar.id);
        return this.createPillarItem(pillar, criteria);
      });

      const groupPassed = pillars.reduce((sum, p) => sum + p.passed, 0);
      const groupTotal = pillars.reduce((sum, p) => sum + p.total, 0);
      const allPassing = groupPassed === groupTotal;

      const groupItem = new ReadinessItem(
        label,
        allPassing
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.Expanded,
        groupChildren
      );
      groupItem.iconPath = new vscode.ThemeIcon(
        allPassing ? "pass" : "warning",
        new vscode.ThemeColor(allPassing ? "testing.iconPassed" : "problemsWarningIcon.foreground")
      );
      groupItem.description = allPassing
        ? "All passing"
        : `${groupPassed} of ${groupTotal} passing`;
      groupItem.contextValue = "pillarGroup";
      items.push(groupItem);
    }

    return items;
  }

  private createScoreSummary(report: ReadinessReport): ReadinessItem {
    const name = getLevelName(report.achievedLevel);
    const item = new ReadinessItem(
      `Level ${report.achievedLevel} of 5 — ${name}`,
      vscode.TreeItemCollapsibleState.None
    );

    // Build "next level" description
    const nextLevel = report.levels.find((l) => l.level === report.achievedLevel + 1);
    if (nextLevel && !nextLevel.achieved) {
      const nextName = getLevelName(nextLevel.level);
      const remaining = nextLevel.total - nextLevel.passed;
      item.description = `Next: ${nextName} (${remaining} more)`;
    } else if (report.achievedLevel === 5) {
      item.description = "Maximum level achieved";
    }

    // Icon: shield colored by level
    const iconColor =
      report.achievedLevel >= 4
        ? "testing.iconPassed"
        : report.achievedLevel >= 2
          ? "problemsWarningIcon.foreground"
          : "testing.iconFailed";
    item.iconPath = new vscode.ThemeIcon("shield", new vscode.ThemeColor(iconColor));
    item.contextValue = "level";

    // Tooltip with current + next level descriptions
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`### Level ${report.achievedLevel}: ${name}\n\n`);
    md.appendMarkdown(`${getLevelDescription(report.achievedLevel)}\n\n`);
    if (nextLevel && !nextLevel.achieved) {
      const nextName = getLevelName(nextLevel.level);
      md.appendMarkdown(`---\n\n### Next — Level ${nextLevel.level}: ${nextName}\n\n`);
      md.appendMarkdown(`${getLevelDescription(nextLevel.level)}\n\n`);
      // Show what's needed
      const nextCriteria = report.criteria.filter(
        (c) => c.level === nextLevel.level && c.status === "fail"
      );
      if (nextCriteria.length > 0) {
        md.appendMarkdown("**Needed:**\n");
        for (const c of nextCriteria) {
          md.appendMarkdown(`- $(error) ${c.title}\n`);
        }
      }
    }
    item.tooltip = md;
    return item;
  }

  private createFixFirstSection(report: ReadinessReport): ReadinessItem | undefined {
    const failed = report.criteria
      .filter((c) => c.status === "fail")
      .sort((a, b) => {
        const impactWeight = { high: 3, medium: 2, low: 1 };
        const effortWeight = { low: 1, medium: 2, high: 3 };
        const delta = impactWeight[b.impact] - impactWeight[a.impact];
        if (delta !== 0) return delta;
        return effortWeight[a.effort] - effortWeight[b.effort];
      })
      .slice(0, 5);

    if (failed.length === 0) return undefined;

    const children = failed.map((c) => {
      const ci = new ReadinessItem(c.title, vscode.TreeItemCollapsibleState.None);
      ci.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("testing.iconFailed"));
      const badges: string[] = [];
      if (c.impact === "high") badges.push("high impact");
      if (c.effort === "low") badges.push("low effort");
      ci.description = c.reason
        ? badges.length > 0
          ? `${c.reason} · ${badges.join(", ")}`
          : c.reason
        : badges.join(", ") || undefined;
      ci.contextValue = `criterion.${c.status}`;
      const md = new vscode.MarkdownString();
      md.appendMarkdown(`**${c.title}**\n\n`);
      if (c.reason) md.appendMarkdown(`${c.reason}\n\n`);
      md.appendMarkdown(`Impact: **${c.impact}** · Effort: **${c.effort}**\n\n`);
      if (c.evidence && c.evidence.length > 0) {
        md.appendMarkdown("**Evidence:**\n");
        for (const e of c.evidence) {
          md.appendMarkdown(`- ${e}\n`);
        }
      }
      ci.tooltip = md;
      return ci;
    });

    const section = new ReadinessItem(
      "Fix First",
      vscode.TreeItemCollapsibleState.Expanded,
      children
    );
    section.iconPath = new vscode.ThemeIcon(
      "lightbulb",
      new vscode.ThemeColor("editorLightBulb.foreground")
    );
    section.description = `${failed.length} item${failed.length > 1 ? "s" : ""}`;
    section.contextValue = "fixFirst";
    return section;
  }

  private createPillarItem(
    pillar: ReadinessPillarSummary,
    criteria: ReadinessCriterionResult[]
  ): ReadinessItem {
    const allPassing = pillar.passed === pillar.total;
    const item = new ReadinessItem(
      pillar.name,
      criteria.length > 0
        ? allPassing
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
      criteria.map((c) => this.createCriterionItem(c))
    );
    item.iconPath = new vscode.ThemeIcon(
      allPassing ? "pass" : pillar.passRate >= 0.5 ? "warning" : "error",
      allPassing
        ? new vscode.ThemeColor("testing.iconPassed")
        : pillar.passRate >= 0.5
          ? new vscode.ThemeColor("problemsWarningIcon.foreground")
          : new vscode.ThemeColor("testing.iconFailed")
    );
    item.description = allPassing ? "All passing" : `${pillar.passed} of ${pillar.total} passing`;
    item.contextValue = "pillar";
    return item;
  }

  private createCriterionItem(c: ReadinessCriterionResult): ReadinessItem {
    const ci = new ReadinessItem(c.title, vscode.TreeItemCollapsibleState.None);
    ci.iconPath = new vscode.ThemeIcon(
      c.status === "pass" ? "pass" : c.status === "fail" ? "error" : "circle-outline",
      c.status === "pass"
        ? new vscode.ThemeColor("testing.iconPassed")
        : c.status === "fail"
          ? new vscode.ThemeColor("testing.iconFailed")
          : undefined
    );
    ci.description = c.reason;
    ci.contextValue = `criterion.${c.status}`;
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${c.title}**\n\n`);
    if (c.reason) md.appendMarkdown(`${c.reason}\n\n`);
    if (c.evidence && c.evidence.length > 0) {
      md.appendMarkdown("**Evidence:**\n");
      for (const e of c.evidence) {
        md.appendMarkdown(`- ${e}\n`);
      }
    }
    ci.tooltip = md;
    return ci;
  }
}

class ReadinessItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: ReadinessItem[]
  ) {
    super(label, collapsibleState);
  }
}
