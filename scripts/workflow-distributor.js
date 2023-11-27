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
    prBranch,
    prFilePath,
    message,
    newContentBuffer,
    committer,
    fileSHA,
}) => {
    return await github.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        branch: prBranch,
        path: prFilePath,
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

const handlePartial = ({ currentContentBase64, newContent }) => {
    const isPartial = newContent.includes("#PARTIAL#")

    if (isPartial) {
        if (currentContentBase64) {
            const currentContent = (new Buffer(currentContentBase64, 'base64')).toString('utf8')
            newContent = injectPartial({ currentContent, newContent })
            const newContentLines = newContent.split('\n')

            let endLineReplacement = null
            // This just avoids the last line being a blank line
            let tempI = 0
            while (!endLineReplacement && tempI < 10) {
                tempI++
                endLineReplacement = newContentLines.pop()
            }
            newContent += currentContent.split(endLineReplacement)[1]
        }

        newContent = newContent.replace('#PARTIAL#\n', '')
    }
    return newContent
}


const run = async ({ github, context, repositories, fs, glob }) => {
    let { repo: { owner } } = context
    const committer = context.pusher ?? {
        name: "todo",
        email: "todo"
    }
    const globber = await glob.create('**/**/distributions/*.yml', { followSymbolicLinks: false })
    const files = await globber.glob()
    repositories = ['ausaccessfed/reporting-service']
    for (let i = 0; i < files.length; i++) {
        const fileName = files[i]
        // get last split assume its a file with no /
        const fileNameCleaned = fileName.split("/").pop()
        // split on .github assume the left as it contains random github runner paths
        const distributionsFilePath = fileName.split(".github").pop()

        const prBranch = `feature/${fileNameCleaned}`
        const message = `Updating ${fileNameCleaned}`
        const prFilePath = `.github/workflows/${fileNameCleaned}`
        const fileRefUrl = `# https://github.com/ausaccessfed/workflows/blob/main/.github/${distributionsFilePath}\n`

        for (let x = 0; x < repositories.length; x++) {
            const repo = repositories[x].split("/").pop()

            let newContentBuffer = fs.readFileSync(fileName)
            let newContent = newContentBuffer.toString('utf8')
            newContent = fileRefUrl + newContent

            const { data: { default_branch: baseBranch } } = await getRepo({ github, owner, repo })
            const { data: { commit: { sha: baseBranchSHA } } } = await getBranch({ github, owner, repo, branch: baseBranch })
            const { status } = await createBranch({ github, owner, repo, branch: prBranch, sha: baseBranchSHA })
            // if status == 422 assume its cause branch exists
            const fileRef = status == 422 ? prBranch : baseBranchSHA;
            const {
                data: { sha: fileSHA, content: currentContentBase64 }
            } = (await getFile({ github, owner, repo, path: prFilePath, ref: fileRef }));

            newContent = handlePartial({ currentContentBase64, newContent })

            newContentBuffer = new Buffer(newContent)

            await commitFile({
                github,
                owner,
                repo,
                prBranch,
                prFilePath,
                message,
                newContentBuffer,
                committer,
                fileSHA,
            })
            await createPR({
                github,
                owner,
                repo,
                head: prBranch,
                base: baseBranch,
                message,
            })
        }
    }
}


module.exports = run