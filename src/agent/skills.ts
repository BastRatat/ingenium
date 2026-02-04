/**
 * Skills loader for agent capabilities.
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { which } from '../utils/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Skill metadata from frontmatter.
 */
export interface SkillMetadata {
  name?: string;
  description?: string;
  metadata?: string;
  always?: boolean | string;
  [key: string]: unknown;
}

/**
 * Skill info returned by list methods.
 */
export interface SkillInfo {
  name: string;
  path: string;
  source: 'workspace' | 'builtin';
}

/**
 * Ingenium-specific metadata from skill frontmatter.
 */
export interface IngeniumSkillMeta {
  always?: boolean;
  requires?: {
    bins?: string[];
    env?: string[];
  };
}

/**
 * Loader for agent skills.
 *
 * Skills are markdown files (SKILL.md) that teach the agent how to use
 * specific tools or perform certain tasks.
 */
export class SkillsLoader {
  readonly workspace: string;
  readonly workspaceSkills: string;
  readonly builtinSkills: string | null;

  constructor(workspace: string, builtinSkillsDir?: string) {
    this.workspace = workspace;
    this.workspaceSkills = join(workspace, 'skills');
    // Default builtin skills relative to this file
    this.builtinSkills = builtinSkillsDir ?? join(__dirname, '..', '..', 'skills');
  }

  /**
   * List all available skills.
   *
   * @param filterUnavailable - If true, filter out skills with unmet requirements.
   * @returns List of skill info objects.
   */
  async listSkills(filterUnavailable = true): Promise<SkillInfo[]> {
    const skills: SkillInfo[] = [];

    // Workspace skills (highest priority)
    if (existsSync(this.workspaceSkills)) {
      try {
        const entries = await readdir(this.workspaceSkills, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillFile = join(this.workspaceSkills, entry.name, 'SKILL.md');
            if (existsSync(skillFile)) {
              skills.push({ name: entry.name, path: skillFile, source: 'workspace' });
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }

    // Built-in skills
    if (this.builtinSkills && existsSync(this.builtinSkills)) {
      try {
        const entries = await readdir(this.builtinSkills, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillFile = join(this.builtinSkills, entry.name, 'SKILL.md');
            // Skip if already added from workspace
            if (existsSync(skillFile) && !skills.some((s) => s.name === entry.name)) {
              skills.push({ name: entry.name, path: skillFile, source: 'builtin' });
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }

    // Filter by requirements
    if (filterUnavailable) {
      const available: SkillInfo[] = [];
      for (const s of skills) {
        const meta = await this.getSkillMeta(s.name);
        if (this.checkRequirements(meta)) {
          available.push(s);
        }
      }
      return available;
    }

    return skills;
  }

  /**
   * Load a skill by name.
   *
   * @param name - Skill name (directory name).
   * @returns Skill content or null if not found.
   */
  async loadSkill(name: string): Promise<string | null> {
    // Check workspace first
    const workspaceSkill = join(this.workspaceSkills, name, 'SKILL.md');
    if (existsSync(workspaceSkill)) {
      return readFile(workspaceSkill, 'utf-8');
    }

    // Check built-in
    if (this.builtinSkills) {
      const builtinSkill = join(this.builtinSkills, name, 'SKILL.md');
      if (existsSync(builtinSkill)) {
        return readFile(builtinSkill, 'utf-8');
      }
    }

    return null;
  }

  /**
   * Load specific skills for inclusion in agent context.
   *
   * @param skillNames - List of skill names to load.
   * @returns Formatted skills content.
   */
  async loadSkillsForContext(skillNames: string[]): Promise<string> {
    const parts: string[] = [];

    for (const name of skillNames) {
      const content = await this.loadSkill(name);
      if (content) {
        const stripped = this.stripFrontmatter(content);
        parts.push(`### Skill: ${name}\n\n${stripped}`);
      }
    }

    return parts.length > 0 ? parts.join('\n\n---\n\n') : '';
  }

  /**
   * Build a summary of all skills (name, description, path, availability).
   *
   * This is used for progressive loading - the agent can read the full
   * skill content using read_file when needed.
   *
   * @returns XML-formatted skills summary.
   */
  async buildSkillsSummary(): Promise<string> {
    const allSkills = await this.listSkills(false);
    if (allSkills.length === 0) {
      return '';
    }

    const escapeXml = (s: string): string =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const lines: string[] = ['<skills>'];

    for (const s of allSkills) {
      const name = escapeXml(s.name);
      const desc = escapeXml(await this.getSkillDescription(s.name));
      const skillMeta = await this.getSkillMeta(s.name);
      const available = this.checkRequirements(skillMeta);

      lines.push(`  <skill available="${String(available).toLowerCase()}">`);
      lines.push(`    <name>${name}</name>`);
      lines.push(`    <description>${desc}</description>`);
      lines.push(`    <location>${s.path}</location>`);

      // Show missing requirements for unavailable skills
      if (!available) {
        const missing = this.getMissingRequirements(skillMeta);
        if (missing) {
          lines.push(`    <requires>${escapeXml(missing)}</requires>`);
        }
      }

      lines.push('  </skill>');
    }

    lines.push('</skills>');
    return lines.join('\n');
  }

  /**
   * Get skills marked as always=true that meet requirements.
   */
  async getAlwaysSkills(): Promise<string[]> {
    const result: string[] = [];
    const skills = await this.listSkills(true);

    for (const s of skills) {
      const metadata = await this.getSkillMetadata(s.name);
      const skillMeta = this.parseIngeniumMetadata(metadata?.metadata ?? '');

      if (skillMeta.always || metadata?.always === true || metadata?.always === 'true') {
        result.push(s.name);
      }
    }

    return result;
  }

  /**
   * Get metadata from a skill's frontmatter.
   *
   * @param name - Skill name.
   * @returns Metadata object or null.
   */
  async getSkillMetadata(name: string): Promise<SkillMetadata | null> {
    const content = await this.loadSkill(name);
    if (!content) {
      return null;
    }

    if (content.startsWith('---')) {
      const match = /^---\n(.*?)\n---/s.exec(content);
      if (match?.[1]) {
        // Simple YAML parsing
        const metadata: SkillMetadata = {};
        for (const line of match[1].split('\n')) {
          if (line.includes(':')) {
            const colonIndex = line.indexOf(':');
            const key = line.slice(0, colonIndex).trim();
            let value: string | boolean = line.slice(colonIndex + 1).trim();
            // Remove surrounding quotes
            value = value.replace(/^["']|["']$/g, '');
            // Parse boolean
            if (value === 'true') {
              metadata[key] = true;
            } else if (value === 'false') {
              metadata[key] = false;
            } else {
              metadata[key] = value;
            }
          }
        }
        return metadata;
      }
    }

    return null;
  }

  /**
   * Get ingenium metadata for a skill (cached in frontmatter).
   */
  private async getSkillMeta(name: string): Promise<IngeniumSkillMeta> {
    const metadata = await this.getSkillMetadata(name);
    return this.parseIngeniumMetadata(metadata?.metadata ?? '');
  }

  /**
   * Parse ingenium metadata JSON from frontmatter.
   */
  private parseIngeniumMetadata(raw: string): IngeniumSkillMeta {
    if (!raw) {
      return {};
    }

    try {
      const data = JSON.parse(raw) as unknown;
      if (typeof data === 'object' && data !== null && 'ingenium' in data) {
        return (data as { ingenium: IngeniumSkillMeta }).ingenium;
      }
      return {};
    } catch {
      return {};
    }
  }

  /**
   * Check if skill requirements are met (bins, env vars).
   */
  private checkRequirements(skillMeta: IngeniumSkillMeta): boolean {
    const requires = skillMeta.requires ?? {};

    // Check binary requirements
    for (const bin of requires.bins ?? []) {
      if (!which(bin)) {
        return false;
      }
    }

    // Check environment variable requirements
    for (const env of requires.env ?? []) {
      if (!process.env[env]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get a description of missing requirements.
   */
  private getMissingRequirements(skillMeta: IngeniumSkillMeta): string {
    const missing: string[] = [];
    const requires = skillMeta.requires ?? {};

    for (const bin of requires.bins ?? []) {
      if (!which(bin)) {
        missing.push(`CLI: ${bin}`);
      }
    }

    for (const env of requires.env ?? []) {
      if (!process.env[env]) {
        missing.push(`ENV: ${env}`);
      }
    }

    return missing.join(', ');
  }

  /**
   * Get the description of a skill from its frontmatter.
   */
  private async getSkillDescription(name: string): Promise<string> {
    const metadata = await this.getSkillMetadata(name);
    if (metadata?.description) {
      return metadata.description as string;
    }
    return name; // Fallback to skill name
  }

  /**
   * Remove YAML frontmatter from markdown content.
   */
  private stripFrontmatter(content: string): string {
    if (content.startsWith('---')) {
      const match = /^---\n.*?\n---\n/s.exec(content);
      if (match) {
        return content.slice(match[0].length).trim();
      }
    }
    return content;
  }
}

/**
 * Create a skills loader.
 */
export function createSkillsLoader(workspace: string, builtinSkillsDir?: string): SkillsLoader {
  return new SkillsLoader(workspace, builtinSkillsDir);
}
