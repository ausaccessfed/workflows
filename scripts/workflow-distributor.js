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
    repoFilePath,
    message,
    newContentBuffer,
    committer,
    fileSHA,
}) => {
    return await github.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        branch,
        path: repoFilePath,
        message,
        content: newContentBuffer.toString('base64'),
        committer,
        sha: fileSHA,
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
        let newContentBuffer = fs.readFileSync(fileName)
        let newContent = newContentBuffer.toString('utf8')
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
                data: { sha: fileSHA, content: currentContentBase64 }
            } = await getFile({ github, owner, repo, path: repoFilePath, ref: fileRef })

            // TODO: use currentContent to perform partial replacement i.e shared deployment yml, differing tasks probaly replace up to inputs?
            if (currentContentBase64) {
                const currentContent = (new Buffer(currentContentBase64, 'base64')).toString('utf8')
                console.log(currentContent)

                const isPartial = newContent.includes("#PARTIAL#")

                if (isPartial) {
                    newContent = newContent.replace('#PARTIAL#\n', '')
                    const newContentLines = newContent.split('\n')
                    newContent = currentContent.replace(new RegExp(`/${newContentLines.shift()}.*${newContentLines.pop()}/`, "g"), newContent)
                    console.log(newContent)
                    newContentBuffer = new Buffer(newContent)
                }
            }
            await commitFile({
                github,
                owner,
                repo,
                branch,
                repoFilePath,
                message,
                newContentBuffer,
                committer,
                fileSHA,
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