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
        console.log("(might not be an error)")
        console.error(err.stack);
        result = err.response
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
    let result = {}
    try {
        result = await github.rest.repos.getContent({
            owner,
            repo,
            path,
            ref
        })
    } catch (err) {
        console.log("(might not be an error)")
        console.error(err.stack);
        result = err.response
    }
    return result
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
        console.log("(might not be an error)")
        console.error(err.stack);
        result = err.response
    }
    return result
}

const handlePartial = ({ currentContentBase64, newContent }) => {
    const isPartial = REGEXES.partial.test(newContent)

    if (isPartial) {
        //  remove partial flag and blank newline at end of template
        newContent = newContent.replace(REGEXES.partial, '').replace(/\n$/, "")

        if (currentContentBase64) {
            const currentContent = (new Buffer(currentContentBase64, 'base64')).toString('utf8')
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
    }
    return newContent
}

const parseFiles = ({ fs, files }) => {
    const parsedFiles = []
    for (let i = 0; i < files.length; i++) {
        const fileName = files[i]
        // get last split assume its a file with no /
        const fileNameRaw = fileName.split("/").pop()
        // remove any chars that will make prs complain
        const fileNameCleaned = fileNameRaw.replace(/\*|\.|\/|\\/g, "_")
        // split on .github assume the left as it contains random github runner paths, pop twice
        //  i.e /home/runner/work/workflows/workflows/.github/workflows/distributions/.github/.dockerignore -> workflows/distributions/.github/.dockerignore
        const distributionsFilePath = fileName.split(/\.github\/(.*)/s).slice(-2).shift()
        //  i.e /workflows/distributions/.github/.dockerignore -> .github/.dockerignore
        const prFilePath = distributionsFilePath.split("distributions/").pop()
        if (fs.lstatSync(fileName).isFile()) {
            const newContent = fs.readFileSync(fileName).toString('utf8')
            parsedFiles.push({
                fileName,
                prBranch: `feature/${fileNameCleaned}`,
                message: `Updating ${fileNameRaw}`,
                prFilePath,
                newContent: `# https://github.com/ausaccessfed/workflows/blob/main/.github/${distributionsFilePath}\n` + newContent
            })
        }
    }
    return parsedFiles
}

const REGEXES = {
    once: new RegExp(/#ONCE#(\n)*/),
    partial: new RegExp(/#PARTIAL#(\n)*/),
}

const run = async ({ github, context, repositories, fs, glob }) => {
    let { repo: { owner } } = context
    const committer = context.pusher ?? {
        name: "N/A",
        email: "N/A"
    }
    const globber = await glob.create('**/**/distributions/**/**.*', { followSymbolicLinks: false })
    const files = await globber.glob()
    repositories = ['ausaccessfed/reporting-service']

    const parsedFiles = parseFiles({ files, fs })

    for (let x = 0; x < repositories.length; x++) {
        const repo = repositories[x].split("/").pop()

        const { data: { default_branch: baseBranch } } = await getRepo({ github, owner, repo })
        const { data: { commit: { sha: baseBranchSHA } } } = await getBranch({ github, owner, repo, branch: baseBranch })

        for (let i = 0; i < parsedFiles.length; i++) {
            let {
                fileName,
                prBranch,
                message,
                prFilePath,
                newContent
            } = parsedFiles[i]

            let {
                data: { sha: fileSHA, content: currentContentBase64 }
            } = (await getFile({ github, owner, repo, path: prFilePath, ref: baseBranch }));

            const isOnceFile = REGEXES.once.test(newContent)
            if (isOnceFile) {
                if (fileSHA) {
                    //  If file exists then skip
                    continue;
                } else {
                    newContent = newContent.replace(REGEXES.once, "")
                }
            }

            const { data: { message: createBranchResponseMessage } } = await createBranch({ github, owner, repo, branch: prBranch, sha: baseBranchSHA })
            const branchExists = createBranchResponseMessage == "Reference already exists"

            // if branch exists pull the prs current contents instead
            if (branchExists) {
                const {
                    data: { sha: prFileSHA, content: prContentBase64 }
                } = (await getFile({ github, owner, repo, path: prFilePath, ref: prBranch }));
                fileSHA = prFileSHA
                currentContentBase64 = prContentBase64
            }


            newContent = handlePartial({ currentContentBase64, newContent })

            await commitFile({
                github,
                owner,
                repo,
                prBranch,
                prFilePath,
                message,
                newContentBuffer: new Buffer(newContent),
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