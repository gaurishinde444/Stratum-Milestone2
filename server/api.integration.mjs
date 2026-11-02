import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let mock, apiProcess, apiUrl, folder, providerCalls=0, providerDelayMs=0
const request=async(path,{token,method='GET',body}={})=>fetch(`${apiUrl}${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined})
const unusedPort=()=>new Promise(resolve=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port))})})

before(async()=>{
  folder=await mkdtemp(join(tmpdir(),'projectmentor-api-'))
  mock=createServer(async(_req,res)=>{providerCalls+=1;const reply=()=>{if(res.destroyed)return;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({invalid:true})}}]}))};if(providerDelayMs)setTimeout(reply,providerDelayMs);else reply()})
  await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve))
  const providerPort=mock.address().port
  const port=await unusedPort();apiUrl=`http://127.0.0.1:${port}`
  apiProcess=spawn(process.execPath,['server/index.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),FRONTEND_ORIGIN:'http://localhost:5173',JWT_SECRET:'integration-test-only-secret',LLM_API_KEY:'mock-key',LLM_BASE_URL:`http://127.0.0.1:${providerPort}/v1`,DB_PATH:join(folder,'test.sqlite')}})
  let ready=false
  for(let i=0;i<80;i++) { try {const response=await fetch(`${apiUrl}/health`);if(response.ok){ready=true;break}}catch{} await new Promise(resolve=>setTimeout(resolve,100)) }
  assert.equal(ready,true,'API server should start')
})

after(async()=>{
  apiProcess?.kill(); await new Promise(resolve=>setTimeout(resolve,100))
  if(mock) await new Promise(resolve=>mock.close(resolve))
  if(folder) await rm(folder,{recursive:true,force:true})
})

test('server auth, SQLite persistence, ownership isolation, and per-agent validation retry',async()=>{
  const register=async(email)=>{const response=await request('/auth/register',{method:'POST',body:{name:'Student User',email,password:'SecurePass123'}});assert.equal(response.status,201);return response.json()}
  const first=await register('one@example.test')
  const profileBody={name:'Student User',course:'Computer Science',year:'2nd year',skills:[{skill:'JavaScript',category:'programming',level:2,selfLevel:2}],priorProjects:'one',weeklyHours:8,assessment:{score:0,level:'beginner',strengths:[],growthAreas:[],verifiedShare:0,assessedAt:new Date().toISOString()}}
  const profileResponse=await request('/students',{method:'POST',token:first.token,body:profileBody})
  assert.equal(profileResponse.status,201)
  const profile=await profileResponse.json()
  assert.equal(profile.userId,first.user.id)
  const projectResponse=await request('/projects',{method:'POST',token:first.token,body:{studentId:profile.id,title:'Attendance Tracker',description:'A small web system for recording and reviewing classroom attendance.',domain:'web',durationWeeks:6}})
  assert.equal(projectResponse.status,201)
  const project=await projectResponse.json()
  const second=await register('two@example.test')
  assert.equal((await request(`/projects/${project.id}`,{token:second.token})).status,404)

  const runResponse=await request(`/projects/${project.id}/pipeline-runs`,{method:'POST',token:first.token})
  assert.equal(runResponse.status,201)
  const run=await runResponse.json()
  let current
  for(let i=0;i<100;i++) { const response=await request(`/pipeline-runs/${run.id}`,{token:first.token});current=await response.json();if(['failed','completed','cancelled'].includes(current.status))break;await new Promise(resolve=>setTimeout(resolve,50)) }
  assert.equal(current.status,'failed')
  assert.equal(current.steps[0].status,'failed')
  assert.match(current.steps[0].error,/retry/i)
  assert.equal(providerCalls,2,'invalid first-agent output should be retried once')
  assert.equal((await request(`/pipeline-runs/${run.id}`,{token:second.token})).status,404)
})

test('unauthenticated project access is rejected',async()=>{
  assert.equal((await request('/projects/example')).status,401)
})

test('Vite fallback localhost ports pass the development CORS preflight',async()=>{
  const response=await fetch(`${apiUrl}/auth/login`,{method:'OPTIONS',headers:{Origin:'http://localhost:5174','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}})
  assert.equal(response.status,204)
  assert.equal(response.headers.get('access-control-allow-origin'),'http://localhost:5174')
})

test('an active run can be cancelled and records cancelled status',async()=>{
  const student=await (await request('/auth/register',{method:'POST',body:{name:'Cancel User',email:'cancel@example.test',password:'SecurePass123'}})).json()
  const profile=await (await request('/students',{method:'POST',token:student.token,body:{name:'Cancel User',course:'Computer Science',year:'2nd year',skills:[{skill:'JavaScript',category:'programming',level:2,selfLevel:2}],priorProjects:'one',weeklyHours:8,assessment:{score:0,level:'beginner',strengths:[],growthAreas:[],verifiedShare:0,assessedAt:new Date().toISOString()}}})).json()
  const project=await (await request('/projects',{method:'POST',token:student.token,body:{studentId:profile.id,title:'Cancel test project',description:'A small web system for recording and reviewing classroom attendance.',domain:'web',durationWeeks:6}})).json()
  providerDelayMs=1500
  const run=await (await request(`/projects/${project.id}/pipeline-runs`,{method:'POST',token:student.token})).json()
  for(let i=0;i<80&&providerCalls<3;i++) await new Promise(resolve=>setTimeout(resolve,25))
  assert.ok(providerCalls>=3,'first agent should reach the mock provider')
  assert.equal((await request(`/pipeline-runs/${run.id}/cancel`,{method:'POST',token:student.token})).status,200)
  let current
  for(let i=0;i<80;i++) { current=await (await request(`/pipeline-runs/${run.id}`,{token:student.token})).json(); if(current.status==='cancelled')break; await new Promise(resolve=>setTimeout(resolve,25)) }
  assert.equal(current.status,'cancelled')
  assert.equal(current.steps[0].status,'cancelled')
})
