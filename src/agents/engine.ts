import type {
  FeasibilityResult,
  MilestonePlanResult,
  PipelineRun,
  ProjectIdea,
  RiskResult,
  ScopeAndStackResult,
  StudentProfile,
} from '../types/models'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const pickVerdict = (score: number): FeasibilityResult['verdict'] => {
  if (score >= 85) return 'Highly Feasible'
  if (score >= 70) return 'Feasible with Modifications'
  if (score >= 55) return 'Moderately Feasible'
  if (score >= 35) return 'Challenging'
  return 'Not Recommended in Current Form'
}

const complexityFromText = (text: string): 'Low' | 'Moderate' | 'High' | 'Very High' => {
  const lower = text.toLowerCase()
  const highSignals = ['ai', 'ml', 'computer vision', 'healthcare', 'traffic', 'diagnosis', 'recommendation system', 'blockchain', 'iot', 'cv', 'predict']
  const mediumSignals = ['dashboard', 'authentication', 'crud', 'login', 'api', 'database', 'report', 'analytics']
  const countHigh = highSignals.filter(signal => lower.includes(signal)).length
  const countMedium = mediumSignals.filter(signal => lower.includes(signal)).length
  if (countHigh >= 2 || lower.includes('healthcare') || lower.includes('traffic')) return 'Very High'
  if (countHigh >= 1 || countMedium >= 2) return 'High'
  if (countMedium >= 1) return 'Moderate'
  return 'Low'
}

const skillLevelMap = (profile: StudentProfile) => new Map(profile.skills.map(skill => [skill.skill.toLowerCase(), skill.level]))

export function runProjectAnalysis(project: ProjectIdea, profile: StudentProfile) {
  const text = `${project.title} ${project.description} ${project.customDomain ?? ''}`.toLowerCase()
  const profileSkills = skillLevelMap(profile)
  const hasSkill = (skill: string) => profileSkills.has(skill.toLowerCase())

  const technicalSignals = [
    'api', 'database', 'react', 'frontend', 'backend', 'dashboard', 'python', 'sql', 'ai', 'ml', 'computer vision', 'iot', 'authentication', 'report', 'predict', 'analysis', 'chat', 'recommendation', 'visualization',
  ]
  const technicalTriggerCount = technicalSignals.filter(signal => text.includes(signal)).length
  const technicalScore = clamp(78 + (profileSkills.size * 2) - Math.max(0, technicalTriggerCount - 3) * 6, 25, 95)

  const relevantSkillScore = [
    'python', 'javascript', 'react', 'sql', 'html', 'css', 'node', 'api', 'machine learning', 'pandas', 'numpy', 'ai', 'data analysis', 'git',
  ].reduce((score, skillText) => {
    const hasRelevant = hasSkill(skillText) || text.includes(skillText)
    return score + (hasRelevant ? 8 : 0)
  }, 0)
  const skillScore = clamp(100 - Math.max(0, 65 - relevantSkillScore), 20, 96)

  const weeklyHoursFactor = profile.weeklyHours >= 10 ? 1.12 : profile.weeklyHours >= 6 ? 1 : 0.8
  const durationFactor = project.durationWeeks >= 10 ? 1 : project.durationWeeks >= 6 ? 0.9 : 0.75
  const timeScore = clamp(Math.round((profile.weeklyHours * 7 * weeklyHoursFactor * durationFactor) / 2), 20, 95)

  const resourceScore = clamp(70 + (profile.course ? 8 : 0) + (profile.priorProjects === 'several' ? 12 : profile.priorProjects === 'one' ? 6 : 0), 20, 90)

  const isHealthcareProject = /healthcare|diagnosis|medical|clinical/.test(text)
  const isBeginnerFriendlyProject = /attendance|management|portal|dashboard|learning/.test(text)
  const finalScoreBase = (technicalScore * 0.32) + (skillScore * 0.28) + (timeScore * 0.22) + (resourceScore * 0.18)
  let finalScore = clamp(Math.round(finalScoreBase + (isBeginnerFriendlyProject ? 10 : 0) - (complexityFromText(text) === 'High' ? 6 : 0) - (complexityFromText(text) === 'Very High' ? 12 : 0)), 0, 100)
  const complexity = complexityFromText(text)
  if (isHealthcareProject && (skillScore < 70 || profile.weeklyHours < 8 || profile.priorProjects === 'none')) finalScore = 28
  if (isBeginnerFriendlyProject && skillScore >= 58) finalScore = Math.max(finalScore, 72)

  const strengths = [
    profileSkills.size >= 4 ? 'The student already has a broad enough skill base to start implementation.' : 'The profile provides a reasonable starting point for a guided student project.',
    profile.weeklyHours >= 6 ? 'Available weekly capacity is enough to sustain a manageable academic project.' : 'The time budget is modest, so scope will need to stay focused.',
    project.durationWeeks >= 8 ? 'The planned timeline gives enough room for discovery, implementation, and testing.' : 'The duration is short enough to support a focused MVP.',
  ]

  const weaknesses = [
    skillScore < 60 ? 'Key technical competencies are underdeveloped for this scope.' : 'Some implementation tasks will require extra research and iteration.',
    complexity === 'Very High' || complexity === 'High' ? 'The project contains more ambition than a beginner-level implementation can support without a narrower problem statement.' : 'The design should still remain practical and testable.',
    timeScore < 60 ? 'The available time budget limits how much breadth can be achieved in one project cycle.' : 'A disciplined delivery plan is important to protect quality.',
  ]

  const requiredPrerequisites = [
    'Define the success criteria and target users before implementation begins.',
    'Document data sources, assumptions, and expected outputs.',
    ...((text.includes('ai') || text.includes('ml') || text.includes('computer vision')) ? ['Prepare a small dataset or synthetic sample to demonstrate the workflow and validate the model.'] : []),
    ...((text.includes('api') || text.includes('backend')) ? ['Create a simple API contract and test data before UI development.'] : []),
  ]

  const technicalChallenges = [
    'The project must preserve a realistic scope under academic deadlines.',
    'Dependencies between modules and data flows should be confirmed before implementation begins.',
    'Integration, validation, and testing are often the most time-consuming parts of this type of project.',
    ...(complexity === 'High' || complexity === 'Very High' ? ['Model tuning, data quality, or hardware constraints may add significant complexity.'] : []),
  ]

  const recommendations = [
    'Reduce scope to a clear MVP that demonstrates the core idea in a verifiable way.',
    'Prioritize deliverables that prove the main technical concept rather than broad feature coverage.',
    'Add testing checkpoints after each major module or integration milestone.',
    ...(finalScore < 60 ? ['Consider simplifying the problem or narrowing the target use case before building a full system.'] : []),
  ]

  const notes = [
    `${project.title} is ${complexity.toLowerCase()} in implementation complexity for a student project.`,
    `The student profile indicates ${profile.weeklyHours} hours per week and ${profile.priorProjects} prior project experience.`,
    `The current technical mix is ${skillScore >= 70 ? 'supportive' : 'partially supportive'} to the proposed solution.`,
    `The recommendation is to keep the project focused on a deployable MVP with strong validation at each stage.`,
  ]

  const feasibility: FeasibilityResult = {
    score: finalScore,
    verdict: pickVerdict(finalScore),
    notes,
    technicalFeasibility: { score: clamp(Math.round(technicalScore), 0, 100), summary: `Technical viability is ${technicalScore >= 70 ? 'strong' : technicalScore >= 50 ? 'moderate' : 'limited'} given the proposed solution.` },
    skillFeasibility: { score: clamp(Math.round(skillScore), 0, 100), summary: `The current skills are ${skillScore >= 70 ? 'adequate' : skillScore >= 50 ? 'partially adequate' : 'not yet sufficient'} for the core tasks.` },
    timeFeasibility: { score: clamp(Math.round(timeScore), 0, 100), summary: `The available weekly schedule can support ${profile.weeklyHours >= 10 ? 'a sustained implementation sprint' : 'a focused but compressed delivery plan'}.` },
    resourceFeasibility: { score: clamp(Math.round(resourceScore), 0, 100), summary: `${profile.course ? 'Academic context and resources are' : 'The current resources are'} adequate ${resourceScore >= 70 ? 'for the project plan' : 'but should be carefully managed'}.` },
    implementationComplexity: complexity,
    requiredPrerequisites,
    technicalChallenges,
    risks: [
      'The project may be more ambitious than the student’s current technical breadth allows.',
      'Integration work and validation may consume more time than planning suggests.',
      'Data quality or model performance may become a blocker if it is not tested early.',
    ].slice(0, 3),
    recommendations,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
  }

  const scope: ScopeAndStackResult = {
    projectTitle: project.title,
    problemStatement: `The project addresses a practical need in the academic or technical context: ${project.title.toLowerCase()} should help users complete a real task more effectively while remaining feasible for a student delivery cycle.`,
    projectObjectives: [
      `Deliver a project that demonstrates a clear solution for ${project.title}.`,
      `Build a usable MVP that students can evaluate with realistic data or workflows.`,
      `Keep the scope aligned with student skills, available hours, and the project duration.`,
    ],
    targetUsers: project.domain === 'ai_ml' ? 'Students, faculty, and project stakeholders who need predictive or intelligent support.' : 'Students and users who need a practical digital solution.',
    proposedSolution: complexity === 'High' || complexity === 'Very High'
      ? 'Reduce the project to a focused MVP that demonstrates the core workflow, validates the main value proposition, and keeps technical risk under control.'
      : 'Design a simple but functional solution that addresses the key use case and can be tested end-to-end in the project window.',
    functionalRequirements: [
      'Support a clear and validated user workflow.',
      'Capture and process the required input data reliably.',
      'Present results with user-friendly feedback or dashboard output.',
      'Provide a way to test and verify success with realistic examples.',
    ],
    nonFunctionalRequirements: [
      'Usability: the interface should be clear and easy to navigate.',
      'Performance: the solution should respond within expected academic demonstration limits.',
      'Maintainability: code and structure should be understandable and extendable.',
      'Security: store and handle sensitive information appropriately, especially in academic or healthcare contexts.',
    ],
    coreFeatures: [
      'User-facing workflow or interface',
      'Core logic solving the main task',
      'Data handling or persistence layer',
      'Validation and demonstration of results',
    ],
    optionalAdvancedFeatures: [
      'Reporting or advanced analytics',
      'Automated notifications or alerts',
      'Improved model tuning or custom dashboards',
      'Deployment and monitoring enhancements',
    ],
    mvp: [
      'Define the problem and target user clearly',
      'Implement the basic workflow end-to-end',
      'Validate the outcome with sample input',
      'Document the final result and limitations',
    ],
    projectModules: [
      'Interface and user interaction',
      'Business logic or model layer',
      'Data access or persistence layer',
      'Validation and testing module',
    ],
    projectBoundaries: [
      'Keep the first version focused on the primary user problem.',
      'Limit optional features to only those that clearly support the MVP.',
      'Avoid broad infrastructure or deployment complexity unless required by the scenario.',
    ],
    inScope: [
      'User workflow design',
      'MVP implementation',
      'Testing and validation',
      'Documentation and project reflection',
    ],
    outOfScope: [
      'Large-scale enterprise deployment',
      'Multi-team production engineering work',
      'Complex cloud infrastructure without a clear need',
    ],
    expectedDeliverables: [
      'Problem definition and user story summary',
      'Working MVP prototype',
      'Testing evidence and validation notes',
      'Project documentation and final reflection',
    ],
    successCriteria: [
      'The project solves the core problem for the target user.',
      'The MVP functions reliably with representative examples.',
      'The workflow is demonstrable and understood by the student.',
    ],
    dependenciesAndAssumptions: [
      'Student skills are sufficient for the chosen MVP scope.',
      'Required datasets or external services are available or simplified.',
      'The project can be validated using a realistic but bounded dataset.',
    ],
    techStack: [],
    summary: `The scope should keep ${project.title} focused on one meaningful user workflow, with a clear MVP, realistic validation, and a manageable delivery plan.`,
  }

  const tech = recommendTechnology(project)
  scope.techStack = tech.techStack
  scope.summary = tech.summary

  const plan: MilestonePlanResult = buildTimeline(project, profile)

  const riskResult: RiskResult = {
    risks: [
      { title: 'Scope creep', severity: 'medium', mitigation: 'Keep a strict MVP and defer optional improvements until the core workflow is validated.' },
      { title: 'Skill mismatch', severity: feasibility.score < 60 ? 'high' : 'medium', mitigation: 'Prioritize the highest-value learning tasks and use simplified implementation paths where needed.' },
      { title: 'Time pressure', severity: profile.weeklyHours < 8 ? 'high' : 'medium', mitigation: 'Use a week-by-week plan with testing checkpoints and explicit deliverable deadlines.' },
    ],
    summary: 'The main risks are alignment with current skills, timeline pressure, and scope growth. They are manageable if the project stays focused on the MVP.',
  }

  return { feasibility, scopeAndStack: scope, plan, risk: riskResult }
}

function recommendTechnology(project: ProjectIdea) {
  const text = `${project.title} ${project.description}`.toLowerCase()
  const isML = /ml|machine learning|ai|predict|recommend|computer vision|classification|model/.test(text)
  const isWeb = /web|dashboard|portal|platform|student|learning|attendance|management/.test(text)

  const stack = [] as ScopeAndStackResult['techStack']
  if (isML) {
    stack.push({
      layer: 'Programming language',
      choice: 'Python',
      reason: 'Python is the standard language for ML, prototyping, and data processing tasks in academic projects.',
      advantages: ['Strong ecosystem for data science and ML', 'Easy to learn for student projects', 'Reliable for model experimentation'],
      limitations: ['Requires careful dependency management'],
      alternatives: ['R', 'Java for enterprise-heavy pipelines'],
      learningDifficulty: 'Moderate',
      compatibility: 'Works well with FastAPI, pandas, numpy, scikit-learn',
    })
    stack.push({
      layer: 'Backend',
      choice: 'FastAPI',
      reason: 'FastAPI provides a simple, clear API layer for ML inference, data endpoints, and integration testing.',
      advantages: ['Fast to build', 'Easy validation with Pydantic', 'Good fit for small academic services'],
      limitations: ['Still requires a basic understanding of async patterns and API design'],
      alternatives: ['Flask', 'Django'],
      learningDifficulty: 'Moderate',
      compatibility: 'Compatible with Python, SQL databases, and lightweight web UIs',
    })
    stack.push({
      layer: 'ML / AI tooling',
      choice: 'scikit-learn + pandas + numpy',
      reason: 'This combination is appropriate for a student project with moderate model needs and limited time.',
      advantages: ['Simple to use', 'Good documentation', 'Supports strong evaluation workflows'],
      limitations: ['Not ideal for advanced deep learning or production-scale vision pipelines'],
      alternatives: ['PyTorch', 'TensorFlow', 'XGBoost'],
      learningDifficulty: 'Moderate',
      compatibility: 'Works well with FastAPI and small SQL datasets',
    })
  } else if (isWeb) {
    stack.push({
      layer: 'Frontend',
      choice: 'React + Vite',
      reason: 'React is appropriate for dynamic academic dashboards and role-based interfaces with high readability and iteration speed.',
      advantages: ['Strong component model', 'Fast frontend iteration', 'Easy to demo in class'],
      limitations: ['Requires careful state management in larger interfaces'],
      alternatives: ['Next.js', 'Vue', 'Plain HTML/JS'],
      learningDifficulty: 'Moderate',
      compatibility: 'Works with REST APIs and a small backend service',
    })
    stack.push({
      layer: 'Backend',
      choice: 'Node.js + Express',
      reason: 'A small REST API backend is a strong match for user dashboards, CRUD operations, and simple authentication.',
      advantages: ['Easy integration with modern JS frontend', 'Fast for minimal MVPs'],
      limitations: ['Type safety and maintainability need discipline'],
      alternatives: ['FastAPI', 'Django', 'Laravel'],
      learningDifficulty: 'Moderate',
      compatibility: 'Pairs well with React and SQL databases',
    })
  } else {
    stack.push({
      layer: 'Frontend',
      choice: 'HTML + CSS + JavaScript',
      reason: 'This is a practical stack for beginner-friendly projects that need a fast and reliable demo experience.',
      advantages: ['Low setup burden', 'Appropriate for a first academic build'],
      limitations: ['Harder to scale or maintain as the project grows'],
      alternatives: ['React', 'Vue'],
      learningDifficulty: 'Low',
      compatibility: 'Works with simple backend APIs or local storage',
    })
  }

  const dbChoice = isML || /analytics|report|dashboard/.test(text) ? 'PostgreSQL' : 'SQLite'
  stack.push({
    layer: 'Database',
    choice: dbChoice,
    reason: 'A relational database gives reliable support for structured entities, user records, and queries without overengineering the project.',
    advantages: ['Structured and queryable', 'Good for academic assignments', 'Easy to demonstrate'],
    limitations: ['Requires schema design and validation'],
    alternatives: ['MongoDB', 'MySQL'],
    learningDifficulty: 'Moderate',
    compatibility: `Compatible with ${isML ? 'Python/FastAPI' : 'React + Node.js'} and application workflows`,
  })

  stack.push({
    layer: 'Authentication',
    choice: 'JWT-based auth',
    reason: 'This keeps authentication simple, familiar, and appropriate for a student project without overcomplicating deployment.',
    advantages: ['Easy to implement', 'Works well for demos and MVPs'],
    limitations: ['Should be paired with secure password handling and validation'],
    alternatives: ['Session cookies', 'Auth providers'],
    learningDifficulty: 'Moderate',
    compatibility: 'Fits well with both Node.js and Python APIs',
  })

  stack.push({
    layer: 'Deployment',
    choice: 'Vercel + Render or Railway',
    reason: 'This setup is appropriate for student projects: easy to set up, low operational overhead, and good for demos.',
    advantages: ['Fast deployment', 'Low maintenance', 'Good for academic presentations'],
    limitations: ['Not suitable for a large multi-service production system'],
    alternatives: ['Netlify', 'Docker', 'Azure App Service'],
    learningDifficulty: 'Low',
    compatibility: 'Works with React frontend and a lightweight API service',
  })

  const summary = `${project.title} is best served by a ${stack.map(item => item.choice).slice(0, 3).join(', ')}-oriented stack. It remains practical for the student’s current skill profile and keeps the architecture small enough to finish within the planned academic timeline.`

  return { summary, techStack: stack }
}

function buildTimeline(project: ProjectIdea, profile: StudentProfile) {
  const totalWeeks = Math.max(4, Math.min(12, project.durationWeeks || 6))
  const isML = /ai|ml|machine learning|predict|vision|model/.test(`${project.title} ${project.description}`.toLowerCase())
  const isWeb = /dashboard|portal|platform|learning|attendance|management/.test(`${project.title} ${project.description}`.toLowerCase())
  const milestones = [] as MilestonePlanResult['milestones']

  const weekTemplates: Array<{ title: string; tasks: string[]; deliverables: string[]; requiredSkills: string[]; testingCheckpoint?: string; riskMitigation?: string }> = [
    { title: 'Problem framing and setup', tasks: ['Clarify the user problem and success criteria', 'Set up the development environment', 'Define the data model and architecture'], deliverables: ['Requirements summary', 'Project architecture diagram'], requiredSkills: ['Requirements analysis', 'Environment setup', 'System design'], testingCheckpoint: 'Validate the project brief with a small sample case.', riskMitigation: 'Keep the primary goal explicit to avoid scope drift.' },
    { title: 'Core scaffolding', tasks: ['Build the UI shell or service structure', 'Create the data model and storage layer', 'Define the primary endpoints or workflow'], deliverables: ['Working skeleton', 'Initial data schema'], requiredSkills: ['Frontend or backend setup', 'Database design', 'API design'], testingCheckpoint: 'Verify that the core flow is connected and accessible.', riskMitigation: 'Avoid overbuilding extra features before the core flow is proven.' },
    { title: 'Core implementation', tasks: ['Deliver the main functional feature set', 'Connect the interface and backend logic', 'Validate data flows'], deliverables: ['Working MVP feature set'], requiredSkills: ['Core development', 'Testing', 'Integration'], testingCheckpoint: 'Run a realistic end-to-end user scenario.', riskMitigation: 'Focus on one workflow at a time and remove blockers quickly.' },
    { title: 'Evaluation and refinement', tasks: ['Test the solution with realistic cases', 'Fix the most important bugs', 'Measure whether results match the goals'], deliverables: ['Validated prototype', 'Issue log'], requiredSkills: ['Debugging', 'Testing', 'Quality assurance'], testingCheckpoint: 'Confirm the MVP meets the success criteria.', riskMitigation: 'Prioritize critical defects before polishing optional features.' },
  ]

  const lateTemplate = isML
    ? {
        title: 'Model or intelligence layer',
        tasks: ['Prepare the dataset and evaluation method', 'Train and validate the model', 'Integrate the model into the app'],
        deliverables: ['Model summary and evaluation report'],
        requiredSkills: ['Python', 'Data preparation', 'Model evaluation'],
      }
    : isWeb
      ? {
          title: 'User workflows and role logic',
          tasks: ['Implement role-based flows and protected actions', 'Connect authentication and dashboard logic', 'Verify each user path'],
          deliverables: ['Authenticated workflow demo', 'User journey validation'],
          requiredSkills: ['Frontend flow design', 'Auth design', 'Testing'],
        }
      : {
          title: 'Feature finishing and validation',
          tasks: ['Finish the remaining feature set', 'Verify the user flow end-to-end', 'Prepare the final demonstration'],
          deliverables: ['Completed feature set', 'Demo-ready outcome'],
          requiredSkills: ['Feature completion', 'Testing', 'Documentation'],
        }

  for (let index = 1; index <= totalWeeks; index += 1) {
    const base = weekTemplates[(index - 1) % weekTemplates.length] ?? weekTemplates[0]
    const title = index <= 4 ? base.title : index === totalWeeks ? 'Polish, test, and report' : `Iteration week ${index}`
    const tasks = [...base.tasks]
    if (index >= 2 && isML) tasks.push('Tune the model or logic based on performance checks')
    if (index >= 2 && isWeb) tasks.push('Validate user journeys and role-specific flows')
    if (index >= 3) tasks.push('Prepare a final demonstration and documentation handoff')

    milestones.push({
      week: index,
      title,
      tasks: tasks.slice(0, 5),
      dependencies: index === 1 ? ['Problem definition'] : [`Week ${Math.max(1, index - 1)} milestone`],
      estimatedHours: Math.max(4, Math.min(20, Math.round(((profile.weeklyHours * 5) / 1.8) + index * 2))),
      deliverables: index === totalWeeks ? ['Final demo', 'Documentation', 'Reflection notes'] : base.deliverables,
      status: index === totalWeeks ? 'in-progress' : 'planned',
      requiredSkills: base.requiredSkills,
      testingCheckpoint: base.testingCheckpoint ?? 'Run a focused validation check using realistic project data.',
      riskMitigation: base.riskMitigation ?? 'Keep a short list of unresolved issues and handle them before adding optional features.',
    })
  }

  if (totalWeeks >= 6) {
    milestones[5] = {
      ...milestones[5],
      title: lateTemplate.title,
      tasks: lateTemplate.tasks,
      deliverables: lateTemplate.deliverables,
      requiredSkills: lateTemplate.requiredSkills,
      testingCheckpoint: 'Verify the project works with real or representative examples.',
      riskMitigation: 'Defers only what does not affect the core workflow.',
    }
  }

  return {
    projectDurationWeeks: totalWeeks,
    totalWeeks,
    summary: `This plan supports a ${totalWeeks}-week student project and keeps the implementation balanced across analysis, build, evaluation, and reporting.`,
    milestones,
  }
}

export function orchestrateProjectPipeline(project: ProjectIdea, profile: StudentProfile): PipelineRun {
  const startedAt = new Date().toISOString()
  const feasible = runProjectAnalysis(project, profile)
  const run: PipelineRun = {
    id: `run_${Math.random().toString(36).slice(2, 10)}`,
    projectId: project.id,
    status: 'completed',
    steps: [
      { agentId: 'feasibility', status: 'completed', startedAt, finishedAt: new Date().toISOString(), summary: `Feasibility: ${feasible.feasibility.score}/100 (${feasible.feasibility.verdict})` },
      { agentId: 'scope_tech', status: 'completed', startedAt, finishedAt: new Date().toISOString(), summary: `Scope set: ${feasible.scopeAndStack.mvp.length} MVP items and ${feasible.scopeAndStack.techStack.length} core technology recommendations.` },
      { agentId: 'planner', status: 'completed', startedAt, finishedAt: new Date().toISOString(), summary: `Timeline created for ${feasible.plan.totalWeeks} weeks with ${feasible.plan.milestones.length} milestones.` },
      { agentId: 'risk', status: 'completed', startedAt, finishedAt: new Date().toISOString(), summary: `Risk review completed with ${feasible.risk.risks.length} major risks and mitigations.` },
    ],
    createdAt: startedAt,
    finishedAt: new Date().toISOString(),
    results: feasible,
  }
  return run
}
