import type { BuilderLevel, PriorExperience, ProjectDomain, Proficiency, SkillAssessment, SkillCategory, SkillQuizResult, SkillRating } from '../types/models'

export const SKILL_CATALOG: { skill: string; category: SkillCategory }[] = [
  { skill: 'Python', category: 'programming' },
  { skill: 'Java', category: 'programming' },
  { skill: 'C / C++', category: 'programming' },
  { skill: 'JavaScript', category: 'web' },
  { skill: 'React', category: 'web' },
  { skill: 'HTML / CSS', category: 'web' },
  { skill: 'Node.js', category: 'web' },
  { skill: 'SQL', category: 'data' },
  { skill: 'Machine Learning', category: 'data' },
  { skill: 'Data analysis', category: 'data' },
  { skill: 'UI / UX', category: 'design' },
  { skill: 'Git', category: 'tools' },
  { skill: 'Arduino / IoT', category: 'tools' },
]

export const PROFICIENCY_LABELS: Record<Proficiency, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }
export const PROFICIENCY_HINTS: Record<Proficiency, string> = {
  1: 'Followed tutorials or class exercises',
  2: 'Built something small on my own',
  3: 'Comfortable building and debugging independently',
}

export const DOMAIN_LABELS: Record<ProjectDomain, string> = {
  ai_ml: 'AI / Machine Learning',
  web: 'Web application',
  mobile: 'Mobile app',
  iot: 'IoT / Hardware',
  data: 'Data analytics',
  other: 'Something else',
}

/** Display name of a project's type: the student's own wording for "Something else". */
export const projectTypeLabel = (p: { domain: ProjectDomain; customDomain?: string }) =>
  p.domain === 'other' && p.customDomain ? p.customDomain : DOMAIN_LABELS[p.domain]

export const EXPERIENCE_LABELS: Record<PriorExperience, string> = {
  none: 'Not yet',
  one: 'One project',
  several: 'Several projects',
}

export const LEVEL_LABELS: Record<BuilderLevel, string> = { beginner: 'Getting started', intermediate: 'Growing builder', advanced: 'Confident builder' }

const categoryOf = (skill: string) => SKILL_CATALOG.find(s => s.skill === skill)?.category ?? 'programming'
export const rating = (skill: string, selfLevel: Proficiency, quiz?: SkillQuizResult): SkillRating =>
  ({ skill, category: categoryOf(skill), selfLevel, level: quiz?.level ?? selfLevel, ...(quiz ? { quiz } : {}) })

/**
 * Quiz level from the difficulties (1–3) of correctly answered questions, out of 6 for a full set:
 *   5–6 → advanced (e.g. medium + hard), 2–4 → intermediate (e.g. easy + medium), 0–1 → beginner.
 */
export function quizLevel(correctDifficulties: number[]): Proficiency {
  const points = correctDifficulties.reduce((sum, d) => sum + d, 0)
  return points >= 5 ? 3 : points >= 2 ? 2 : 1
}

/**
 * Self-assessment scoring (max 100):
 *   skills     up to 60 — sum of proficiency levels, saturating at 12 (e.g. four advanced skills)
 *   experience up to 25 — prior projects built
 *   time       up to 15 — weekly hours, saturating at 15h
 */
/** The three parts of the readiness score (they always add up to the score). */
export function readinessBreakdown(skills: SkillRating[], priorProjects: PriorExperience, weeklyHours: number) {
  return [
    { key: 'skills', label: 'Skills', points: Math.round(Math.min(1, skills.reduce((sum, s) => sum + s.level, 0) / 12) * 60), max: 60 },
    { key: 'experience', label: 'Project experience', points: { none: 0, one: 12, several: 25 }[priorProjects], max: 25 },
    { key: 'time', label: 'Weekly time', points: Math.min(15, Math.max(0, Math.round(weeklyHours))), max: 15 },
  ] as const
}

export function assessSkills(skills: SkillRating[], priorProjects: PriorExperience, weeklyHours: number): SkillAssessment {
  const score = readinessBreakdown(skills, priorProjects, weeklyHours).reduce((sum, part) => sum + part.points, 0)
  const level: BuilderLevel = score >= 70 ? 'advanced' : score >= 40 ? 'intermediate' : 'beginner'

  const strengths = skills.filter(s => s.level === 3).map(s => s.skill)
  if (!strengths.length) strengths.push(...skills.filter(s => s.level === 2).map(s => s.skill).slice(0, 3))

  const has = (category: SkillCategory) => skills.some(s => s.category === category)
  const growthAreas: string[] = []
  if (!skills.some(s => s.skill === 'Git')) growthAreas.push('Version control with Git — keeps a safe history of your project')
  if (!has('data')) growthAreas.push('Working with data (SQL or pandas)')
  if (!has('web') && !has('design')) growthAreas.push('Building a simple user interface')
  if (priorProjects === 'none') growthAreas.push('Shipping a small end-to-end prototype early')
  if (weeklyHours < 5) growthAreas.push('Blocking out regular weekly time for the project')
  // Quiz results lower than the self-rating are the most useful thing to work on.
  const overrated = skills.filter(s => s.quiz && s.quiz.level < s.selfLevel).map(s => `Strengthening your ${s.skill} fundamentals`)
  growthAreas.unshift(...overrated)

  const verifiedShare = skills.length ? skills.filter(s => s.quiz).length / skills.length : 0
  return { score, level, strengths, growthAreas: growthAreas.slice(0, 3), verifiedShare, assessedAt: new Date().toISOString() }
}
