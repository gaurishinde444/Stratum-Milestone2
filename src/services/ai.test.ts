import { afterEach, describe, expect, it, vi } from 'vitest'
import { runProjectAnalysis } from '../agents/engine'
import type { ProjectIdea, StudentProfile } from '../types/models'
import { RemoteAnalysisProvider } from './ai'

const project: ProjectIdea = {
  id: 'project_test',
  studentId: 'student_test',
  title: 'Student Attendance Management System',
  description: 'A web application to record, review, and report student attendance for a small class.',
  domain: 'web',
  durationWeeks: 8,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const profile: StudentProfile = {
  id: 'student_test',
  userId: 'user_test',
  name: 'Student',
  course: 'Computer Science',
  year: '2nd year',
  skills: [{ skill: 'JavaScript', category: 'programming', level: 2, selfLevel: 2 }],
  priorProjects: 'one',
  weeklyHours: 8,
  assessment: {
    score: 55,
    level: 'intermediate',
    strengths: ['JavaScript'],
    growthAreas: ['SQL'],
    verifiedShare: 0,
    assessedAt: '2026-01-01T00:00:00.000Z',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RemoteAnalysisProvider', () => {
  it('accepts a schema-valid analysis response from the backend', async () => {
    const analysis = runProjectAnalysis(project, profile)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(analysis), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ))

    const result = await new RemoteAnalysisProvider('http://localhost:3000').analyzeProject(project, profile)

    expect(result.feasibility.score).toBe(analysis.feasibility.score)
  })

  it('surfaces backend errors instead of disguising them as demo results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'LLM_API_KEY is not configured.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    ))

    await expect(new RemoteAnalysisProvider('http://localhost:3000').analyzeProject(project, profile))
      .rejects.toThrow('LLM_API_KEY is not configured.')
  })

  it('rejects malformed analysis data returned by the backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ feasibility: { score: 140 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ))

    await expect(new RemoteAnalysisProvider('http://localhost:3000').analyzeProject(project, profile))
      .rejects.toThrow()
  })
})
