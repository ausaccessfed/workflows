const getRepo = async ({ github, owner, repo }) => {
    return await github.rest.repos.get({
        owner,
        repo,
    });
}

const getBranch = async ({ github, owner, repo, branch }) => {
    return await github.rest.repos.getBranch({
        owner,
        repo,
        branch,
    })
}

const createBranch = async ({ github, owner, repo, branch, sha }) => {
    let result = {}
    try {
        result = await github.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branch}`,
            sha
        })
    } catch (err) {
        if (err.response.data.message == "Reference already exists") {
            result = err.response
        } else {
            console.error(err.stack);
            throw err;
        }
    }
    return result
}

const getFile = async ({
    github,
    owner,
    repo,
    path,
    ref
}) => {
    return await github.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
    })
}

const commitFile = async ({
    github,
    owner,
    repo,
    branch,
    path,
    message,
    content,
    committer,
    sha,
}) => {
    return await github.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        branch,
        path,
        message,
        content,
        committer,
        sha,
    })
}
const createPR = async ({
    github,
    owner,
    repo,
    head,
    base,
    message,
}) => {
    let result = {}
    try {
        result = await github.rest.pulls.create({
            owner,
            repo,
            head,
            base,
            title: message,
            body: message
        })
    } catch (err) {
        if ((err.response.data.errors[0].message ?? "").includes("A pull request already exists")) {
            result = err.response
        } else {
            console.error(err.stack);
            throw err;
        }
    }
    return result
}


const run = async ({ github, context, fs, glob }) => {
    let { repo: { owner } } = context
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
        const repoFilePath = `.github/workflows/${fileNameCleaned}`

        for (let x = 0; x < repos.length; x++) {
            const repo = repos[x].split("/").pop()


            const { data: { default_branch: baseBranch } } = await getRepo({ github, owner, repo })
            const { data: { commit: { sha: baseBranchSHA } } } = await getBranch({ github, owner, repo, branch: baseBranch })
            const { status } = await createBranch({ github, owner, repo, branch, sha: baseBranchSHA })
            // if status == 422 assume its cause branch exists
            const fileRef = status == 422 ? branch : baseBranchSHA
            const {
                data: { sha: fileSHA, content: currentContent }
            } = await getFile({ github, owner, repo, path: repoFilePath, ref: fileRef })

            // TODO: use currentContent to perform partial replacement i.e shared deployment yml, differing tasks probaly replace up to inputs?

            await commitFile({
                github,
                owner,
                repo,
                branch,
                path: repoFilePath,
                message,
                content,
                committer,
                sha: fileSHA,
            })
            await createPR({
                github,
                owner,
                repo,
                head: branch,
                base: baseBranch,
                message,
            })
        }
    }
}


module.exports = run