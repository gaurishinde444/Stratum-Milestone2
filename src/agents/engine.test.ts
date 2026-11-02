import { describe, expect, it } from 'vitest'
import { runProjectAnalysis } from './engine'
import { assessSkills, rating } from '../lib/skills'
import type { ProjectIdea, StudentProfile } from '../types/models'

const makeStudent = (overrides: Partial<StudentProfile> = {}): StudentProfile => {
  const skills = [
    rating('Python', 2),
    rating('JavaScript', 2),
    rating('HTML / CSS', 2),
    rating('SQL', 2),
    rating('Git', 2),
  ]

  const base: StudentProfile = {
    id: 'stu_1',
    userId: 'user_1',
    name: 'Aditi',
    course: 'Computer Science',
    year: '3rd year',
    skills,
    priorProjects: 'one',
    weeklyHours: 8,
    assessment: assessSkills(skills, 'one', 8),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return { ...base, ...overrides }
}

const makeProject = (title: string, description: string, domain: ProjectIdea['domain'] = 'web'): ProjectIdea => ({
  id: `proj_${title.toLowerCase().replace(/\s+/g, '-')}`,
  studentId: 'stu_1',
  title,
  description,
  domain,
  durationWeeks: 6,
  createdAt: new Date().toISOString(),
})

describe('Milestone 2 agent engine', () => {
  it('scores a beginner attendance project as highly feasible', () => {
    const student = makeStudent({
      skills: [rating('HTML / CSS', 2), rating('JavaScript', 2), rating('Python', 1), rating('SQL', 1), rating('Git', 2)],
      weeklyHours: 7,
      priorProjects: 'none',
    })

    const result = runProjectAnalysis(makeProject('Student Attendance Management System', 'A student attendance system with simple login, attendance marking, and analytics.', 'web'), student)

    expect(result.feasibility.score).toBeGreaterThan(70)
    expect(result.feasibility.verdict).not.toBe('Not Recommended in Current Form')
    expect(result.scopeAndStack.projectObjectives.length).toBeGreaterThan(2)
    expect(result.plan.milestones.length).toBeGreaterThan(3)
  })

  it('uses ML-specific recommendations for a prediction project', () => {
    const student = makeStudent({
      skills: [rating('Python', 3), rating('Machine Learning', 2), rating('SQL', 2), rating('Data analysis', 2), rating('Git', 2)],
      weeklyHours: 10,
      priorProjects: 'one',
    })

    const result = runProjectAnalysis(makeProject('Student Performance Prediction Using Machine Learning', 'Build a model that predicts final grades using academic data and assignment scores.', 'ai_ml'), student)

    expect(result.scopeAndStack.techStack.some(item => item.choice.includes('Python'))).toBe(true)
    expect(result.scopeAndStack.techStack.some(item => item.layer === 'ML / AI tooling')).toBe(true)
    expect(result.plan.milestones.some(m => m.tasks.some(task => task.toLowerCase().includes('model')))).toBe(true)
  })

  it('handles an advanced AI traffic management project with realistic risk flags', () => {
    const student = makeStudent({
      skills: [rating('Python', 3), rating('Machine Learning', 3), rating('JavaScript', 2), rating('React', 2), rating('SQL', 2)],
      weeklyHours: 12,
      priorProjects: 'several',
    })

    const result = runProjectAnalysis(makeProject('AI-Based Intelligent Traffic Management System', 'Develop a camera-based intelligent traffic system with vehicle detection and signal optimization.', 'ai_ml'), student)

    expect(result.feasibility.implementationComplexity).toMatch(/High|Very High/)
    expect(result.risk.risks.length).toBeGreaterThanOrEqual(2)
    expect(result.scopeAndStack.outOfScope.length).toBeGreaterThan(0)
  })

  it('recommends a web platform stack for a full-stack academic management project', () => {
    const student = makeStudent({
      skills: [rating('React', 3), rating('JavaScript', 3), rating('Python', 2), rating('SQL', 2), rating('Git', 2)],
      weeklyHours: 9,
      priorProjects: 'one',
    })

    const result = runProjectAnalysis(makeProject('Smart Learning and Academic Management Platform', 'Create a platform for student learning, assignment tracking, and teacher dashboards.', 'web'), student)
    expect(result.scopeAndStack.techStack.some(item => item.choice.includes('React'))).toBe(true)
    expect(result.scopeAndStack.techStack.some(item => item.layer === 'Database')).toBe(true)
    expect(result.feasibility.score).toBeGreaterThan(60)
  })

  it('flags the healthcare diagnosis project as not recommended in current form', () => {
    const student = makeStudent({
      skills: [rating('Python', 1), rating('HTML / CSS', 2), rating('SQL', 1), rating('Git', 1)],
      weeklyHours: 5,
      priorProjects: 'none',
    })

    const result = runProjectAnalysis(makeProject('AI-Powered Healthcare Diagnosis and Recommendation System', 'Design a medical diagnosis system using health data and patient history.', 'ai_ml'), student)

    expect(result.feasibility.verdict).toBe('Not Recommended in Current Form')
    expect(result.risk.risks.some(risk => risk.title.toLowerCase().includes('skill'))).toBe(true)
    expect(result.scopeAndStack.mvp.length).toBeGreaterThan(0)
  })
})
