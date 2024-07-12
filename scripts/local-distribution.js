/* eslint-disable no-undef */
import fs from 'fs'
import { Octokit } from '@octokit/rest'
import { run } from './workflow-distributor.js'

await run({
  github: new Octokit({ auth: process.env.GITHUB_AUTH }),
  context: { payload: { organization: { login: 'ausaccessfed' } } },
  repositories: JSON.parse(process.env.REPOS),
  fs
})
