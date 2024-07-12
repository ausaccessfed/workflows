/* eslint-disable no-undef */
; (async () => {
  const fs = require('fs')
  // Use dynamic import() for ES Modules
  const { Octokit } = await import('@octokit/rest')
  const run = require('./workflow-distributor.js')

  await run({
    github: new Octokit({ auth: process.env.GITHUB_AUTH }),
    context: { payload: { organization: { login: 'ausaccessfed' } } },
    repositories: JSON.parse(process.env.REPOS),
    fs
  })
})()
