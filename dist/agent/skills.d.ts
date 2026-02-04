/**
 * Skills loader for agent capabilities.
 */
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
export declare class SkillsLoader {
    readonly workspace: string;
    readonly workspaceSkills: string;
    readonly builtinSkills: string | null;
    constructor(workspace: string, builtinSkillsDir?: string);
    /**
     * List all available skills.
     *
     * @param filterUnavailable - If true, filter out skills with unmet requirements.
     * @returns List of skill info objects.
     */
    listSkills(filterUnavailable?: boolean): Promise<SkillInfo[]>;
    /**
     * Load a skill by name.
     *
     * @param name - Skill name (directory name).
     * @returns Skill content or null if not found.
     */
    loadSkill(name: string): Promise<string | null>;
    /**
     * Load specific skills for inclusion in agent context.
     *
     * @param skillNames - List of skill names to load.
     * @returns Formatted skills content.
     */
    loadSkillsForContext(skillNames: string[]): Promise<string>;
    /**
     * Build a summary of all skills (name, description, path, availability).
     *
     * This is used for progressive loading - the agent can read the full
     * skill content using read_file when needed.
     *
     * @returns XML-formatted skills summary.
     */
    buildSkillsSummary(): Promise<string>;
    /**
     * Get skills marked as always=true that meet requirements.
     */
    getAlwaysSkills(): Promise<string[]>;
    /**
     * Get metadata from a skill's frontmatter.
     *
     * @param name - Skill name.
     * @returns Metadata object or null.
     */
    getSkillMetadata(name: string): Promise<SkillMetadata | null>;
    /**
     * Get ingenium metadata for a skill (cached in frontmatter).
     */
    private getSkillMeta;
    /**
     * Parse ingenium metadata JSON from frontmatter.
     */
    private parseIngeniumMetadata;
    /**
     * Check if skill requirements are met (bins, env vars).
     */
    private checkRequirements;
    /**
     * Get a description of missing requirements.
     */
    private getMissingRequirements;
    /**
     * Get the description of a skill from its frontmatter.
     */
    private getSkillDescription;
    /**
     * Remove YAML frontmatter from markdown content.
     */
    private stripFrontmatter;
}
/**
 * Create a skills loader.
 */
export declare function createSkillsLoader(workspace: string, builtinSkillsDir?: string): SkillsLoader;
//# sourceMappingURL=skills.d.ts.map