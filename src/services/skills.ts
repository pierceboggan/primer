import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { ensureDir, safeWriteFile } from "../utils/fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Path to bundled skills assets */
const ASSETS_DIR = path.resolve(__dirname, "../../assets/skills");

/** Meta-skills that get copied to target repos */
const META_SKILLS = [
  "skill-creator",
  "skill-planner",
  "skill-reskilling",
  "skill-creator-eval",
  "skill-planner-eval"
];

export type CopySkillsOptions = {
  repoPath: string;
  force: boolean;
};

/**
 * Recursively copy a directory
 */
async function copyDir(src: string, dest: string, force: boolean): Promise<string[]> {
  const actions: string[] = [];
  await ensureDir(dest);

  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      const subActions = await copyDir(srcPath, destPath, force);
      actions.push(...subActions);
    } else {
      const content = await fs.readFile(srcPath, "utf8");
      const result = await safeWriteFile(destPath, content, force);
      actions.push(result);
    }
  }
  return actions;
}

/**
 * Copy meta-skills to target repository's .github/skills/ directory
 */
export async function copySkillsToRepo(options: CopySkillsOptions): Promise<{ summary: string }> {
  const { repoPath, force } = options;
  const actions: string[] = [];

  // Copy each meta-skill
  const skillsDestDir = path.join(repoPath, ".github", "skills");
  for (const skillName of META_SKILLS) {
    const srcDir = path.join(ASSETS_DIR, skillName);
    const destDir = path.join(skillsDestDir, skillName);
    
    try {
      await fs.access(srcDir);
      const skillActions = await copyDir(srcDir, destDir, force);
      actions.push(...skillActions);
    } catch {
      actions.push(`⚠️ Skill not found: ${skillName}`);
    }
  }

  // Copy artifacts/skills/plans scaffolding
  const artifactsSrc = path.join(ASSETS_DIR, "artifacts", "skills", "plans");
  const artifactsDest = path.join(repoPath, "artifacts", "skills", "plans");
  
  try {
    await fs.access(artifactsSrc);
    const artifactActions = await copyDir(artifactsSrc, artifactsDest, force);
    actions.push(...artifactActions);
  } catch {
    actions.push("⚠️ Artifacts scaffolding not found");
  }

  const summary = actions.length ? `\n${actions.join("\n")}` : "No skills copied.";
  return { summary };
}
