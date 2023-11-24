const getRepo = async (github, owner, repo) => {
    return await github.rest.repos.get({
        owner,
        repo,
    });
}

const getBranch = async (github, owner, repo, branch) => {
    return await github.rest.repos.getBranch({
        owner,
        repo,
        branch,
    })
}

const createBranch = async (github, owner, repo, branch, sha) => {
    let result = null
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
        }
    }
    return result
}

const getFile = async (
    github,
    owner,
    repo,
    path,
    ref
) => {
    return await github.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
    })
}

const commitFile = async (
    github,
    owner,
    repo,
    branch,
    path,
    sha,
    message,
    content,
    committer
) => {
    return await github.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        branch,
        path,
        sha,
        message,
        content,
        committer
    })
}
const createPR = async (
    github,
    owner,
    repo,
    head,
    base,
    message,
) => {
    return await github.rest.pulls.create({
        owner,
        repo,
        head,
        base,
        title: message,
        body: message
    })
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


            const { data: { default_branch: base } } = await getRepo(github, owner, repo)
            const { data: { commit: { baseBranchSHA } } } = await getBranch(github, owner, repo, base)
            const { status } = await createBranch(github, owner, repo, branch, baseBranchSHA)
            // if status == 422 assume its cause branch exists
            const fileRef = status == 422 ? branch : baseBranchSHA
            const file = await getFile(github, owner, repo, repoFilePath, fileRef)
            console.log(file)

            await commitFile(
                github,
                owner,
                repo,
                branch,
                repoFilePath,
                message,
                content,
                committer,
                //sha: fileSHA,
            )
            await createPR(
                github,
                owner,
                repo,
                branch,
                base,
                message,
            )
        }
    }
}


module.exports = run