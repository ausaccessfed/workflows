const fs = require('fs')
let {
    repo: {
        owner
    }
} = context
const committer = context.pusher ?? {
    name: "todo",
    email: "todo"
}
//const repos = ${{ vars.RENOVATE_REPOSITORIES }}
const repos = ['ausaccessfed/reporting-service']
const globber = await glob.create('**/**/distributions/*.yml', { followSymbolicLinks: false })
const files = await globber.glob()

for (let i = 0; i < files.length; i++) {
    const fileName = files[i]
    const fileNameCleaned = fileName.split("/").pop()
    const content = fs.readFileSync(fileName).toString('base64')
    const branch = `feature/${fileNameCleaned}`
    const message = `Updating ${fileNameCleaned}`

    for (let x = 0; x < repos.length; x++) {
        const repo = repos[x].split("/").pop()
        const {
            data: {
                default_branch: base
            }
        } = await github.rest.repos.get({
            owner,
            repo,
        });
        const {
            data: {
                commit: { sha }
            }
        } = await github.rest.repos.getBranch({
            owner,
            repo,
            branch: base,
        })
        await github.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branch}`,
            sha
        })
        await github.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            branch,
            path: `.github/workflows/${fileNameCleaned}`,
            message,
            content,
            committer
        })
        await github.rest.pulls.create({
            owner,
            repo,
            head: branch,
            base,
            title: message,
            body: message
        })
    }
}