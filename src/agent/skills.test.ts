/**
 * Tests for SkillsLoader.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SkillsLoader } from './skills.js';

describe('SkillsLoader', () => {
  let testDir: string;
  let skillsDir: string;
  let loader: SkillsLoader;

  beforeEach(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `skills-test-${Date.now()}`);
    skillsDir = join(testDir, 'skills');
    await mkdir(skillsDir, { recursive: true });
    // Pass null for builtinSkillsDir to avoid loading actual builtin skills
    loader = new SkillsLoader(testDir, join(testDir, 'builtin'));
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('listSkills', () => {
    it('should return empty array when no skills', async () => {
      const skills = await loader.listSkills();
      expect(skills).toEqual([]);
    });

    it('should list workspace skills', async () => {
      // Create a skill
      const skillDir = join(skillsDir, 'test-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\ndescription: Test skill\n---\n\n# Test Skill\n',
        'utf-8'
      );

      const skills = await loader.listSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0]?.name).toBe('test-skill');
      expect(skills[0]?.source).toBe('workspace');
    });

    it('should list builtin skills', async () => {
      // Create builtin skills directory
      const builtinDir = join(testDir, 'builtin', 'builtin-skill');
      await mkdir(builtinDir, { recursive: true });
      await writeFile(
        join(builtinDir, 'SKILL.md'),
        '---\ndescription: Builtin skill\n---\n\n# Builtin Skill\n',
        'utf-8'
      );

      const skills = await loader.listSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0]?.name).toBe('builtin-skill');
      expect(skills[0]?.source).toBe('builtin');
    });

    it('should prefer workspace skills over builtin', async () => {
      // Create workspace skill
      const workspaceSkill = join(skillsDir, 'same-skill');
      await mkdir(workspaceSkill, { recursive: true });
      await writeFile(
        join(workspaceSkill, 'SKILL.md'),
        '---\ndescription: Workspace version\n---\n\n# Workspace\n',
        'utf-8'
      );

      // Create builtin skill with same name
      const builtinSkill = join(testDir, 'builtin', 'same-skill');
      await mkdir(builtinSkill, { recursive: true });
      await writeFile(
        join(builtinSkill, 'SKILL.md'),
        '---\ndescription: Builtin version\n---\n\n# Builtin\n',
        'utf-8'
      );

      const skills = await loader.listSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0]?.source).toBe('workspace');
    });
  });

  describe('loadSkill', () => {
    it('should return null for non-existent skill', async () => {
      const content = await loader.loadSkill('nonexistent');
      expect(content).toBeNull();
    });

    it('should load skill content', async () => {
      const skillDir = join(skillsDir, 'my-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# My Skill\n\nContent here', 'utf-8');

      const content = await loader.loadSkill('my-skill');

      expect(content).toBe('# My Skill\n\nContent here');
    });
  });

  describe('getSkillMetadata', () => {
    it('should return null for non-existent skill', async () => {
      const metadata = await loader.getSkillMetadata('nonexistent');
      expect(metadata).toBeNull();
    });

    it('should parse frontmatter metadata', async () => {
      const skillDir = join(skillsDir, 'meta-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\ndescription: My description\nalways: true\n---\n\n# Content',
        'utf-8'
      );

      const metadata = await loader.getSkillMetadata('meta-skill');

      expect(metadata).not.toBeNull();
      expect(metadata?.description).toBe('My description');
      expect(metadata?.always).toBe(true);
    });

    it('should return null for skill without frontmatter', async () => {
      const skillDir = join(skillsDir, 'no-meta');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# Just content\n\nNo frontmatter here', 'utf-8');

      const metadata = await loader.getSkillMetadata('no-meta');
      expect(metadata).toBeNull();
    });
  });

  describe('loadSkillsForContext', () => {
    it('should return empty string for no skills', async () => {
      const content = await loader.loadSkillsForContext([]);
      expect(content).toBe('');
    });

    it('should load and format skills', async () => {
      const skillDir = join(skillsDir, 'context-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\ndescription: Test\n---\n\n# Skill Content\n\nBody text',
        'utf-8'
      );

      const content = await loader.loadSkillsForContext(['context-skill']);

      expect(content).toContain('### Skill: context-skill');
      expect(content).toContain('# Skill Content');
      expect(content).toContain('Body text');
      // Frontmatter should be stripped
      expect(content).not.toContain('description: Test');
    });

    it('should join multiple skills with separator', async () => {
      const skill1 = join(skillsDir, 'skill-1');
      const skill2 = join(skillsDir, 'skill-2');
      await mkdir(skill1, { recursive: true });
      await mkdir(skill2, { recursive: true });
      await writeFile(join(skill1, 'SKILL.md'), '# Skill 1', 'utf-8');
      await writeFile(join(skill2, 'SKILL.md'), '# Skill 2', 'utf-8');

      const content = await loader.loadSkillsForContext(['skill-1', 'skill-2']);

      expect(content).toContain('### Skill: skill-1');
      expect(content).toContain('### Skill: skill-2');
      expect(content).toContain('---');
    });
  });

  describe('buildSkillsSummary', () => {
    it('should return empty string when no skills', async () => {
      const summary = await loader.buildSkillsSummary();
      expect(summary).toBe('');
    });

    it('should build XML summary', async () => {
      const skillDir = join(skillsDir, 'summary-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\ndescription: A test skill for summary\n---\n\n# Content',
        'utf-8'
      );

      const summary = await loader.buildSkillsSummary();

      expect(summary).toContain('<skills>');
      expect(summary).toContain('</skills>');
      expect(summary).toContain('<name>summary-skill</name>');
      expect(summary).toContain('<description>A test skill for summary</description>');
      expect(summary).toContain('available="true"');
    });

    it('should escape XML special characters', async () => {
      const skillDir = join(skillsDir, 'xml-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\ndescription: Test <brackets> & ampersand\n---\n\n# Content',
        'utf-8'
      );

      const summary = await loader.buildSkillsSummary();

      expect(summary).toContain('&lt;brackets&gt;');
      expect(summary).toContain('&amp;');
    });
  });

  describe('getAlwaysSkills', () => {
    it('should return empty array when no always skills', async () => {
      const skillDir = join(skillsDir, 'normal-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\ndescription: Normal skill\n---\n\n# Content',
        'utf-8'
      );

      const always = await loader.getAlwaysSkills();
      expect(always).toEqual([]);
    });

    it('should return skills marked as always', async () => {
      const skillDir = join(skillsDir, 'always-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\ndescription: Always loaded\nalways: true\n---\n\n# Content',
        'utf-8'
      );

      const always = await loader.getAlwaysSkills();
      expect(always).toContain('always-skill');
    });
  });
});

describe('createSkillsLoader', () => {
  it('should create a SkillsLoader instance', async () => {
    const { createSkillsLoader } = await import('./skills.js');
    const testDir = join(tmpdir(), `skills-factory-test-${Date.now()}`);

    try {
      const loader = createSkillsLoader(testDir);
      expect(loader).toBeInstanceOf(SkillsLoader);
    } finally {
      // Cleanup
      if (existsSync(testDir)) {
        await rm(testDir, { recursive: true, force: true });
      }
    }
  });
});
