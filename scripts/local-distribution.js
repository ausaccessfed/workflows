/* eslint-disable no-undef */
import fs from 'fs'
import { glob } from 'glob'
import { Octokit } from '@octokit/rest'
import { run } from './workflow-distributor.js'

console.log(process.env.GITHUB_AUTH)

await run({
  github: new Octokit({ auth: process.env.GITHUB_AUTH }),
  context: { payload: { organization: { login: 'aaf-terraform' } } },
  repositories: JSON.parse(process.env.REPOS),
  fs,
  glob
})
