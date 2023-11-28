
let github
let owner
let fs

const getRepo = async ({ repo }) => {
    return await github.rest.repos.get({
        owner,
        repo,
    });
}

const getBranch = async ({ repo, branch }) => {
    return await github.rest.repos.getBranch({
        owner,
        repo,
        branch,
    })
}

const createBranch = async ({ repo, branch, sha }) => {
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
    repo,
    branch,
    prFilePath,
    message,
    newContentBase64,
    committer,
    fileSHA,
}) => {
    return await github.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        branch,
        path: prFilePath,
        message,
        content: newContentBase64,
        committer,
        sha: fileSHA,
    })
}

const deleteFile = async ({
    repo,
    branch,
    prFilePath,
    message,
    committer,
    fileSHA,
}) => {
    return await github.rest.repos.deleteFile({
        owner,
        branch,
        repo,
        path: prFilePath,
        message,
        sha: fileSHA,
        committer
    })
}

const createPR = async ({
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
    const isPartial = CONSTANTS.regex.partial.test(newContent)

    if (isPartial) {
        //  remove partial flag and blank newline at end of template
        newContent = newContent.replace(CONSTANTS.regex.partial, '').replace(/\n$/, "")

        if (currentContentBase64) {
            const currentContent = base64TextToUtf8(currentContentBase64)
            const newContentLines = newContent.split('\n')

            let endLineReplacement = null
            // This just avoids the last line being a blank line
            let tempI = 0
            while (!endLineReplacement && tempI < 10) {
                tempI++
                endLineReplacement = newContentLines.pop()
            }
            remainingContent = currentContent.split(endLineReplacement)[1]
            if (remainingContent) {
                newContent += remainingContent
            }
        }
    }
    return newContent
}

const parseFiles = (files) => {
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
                distributionsFilePath,
                message: `Updating ${fileNameRaw}`,
                prFilePath,
                newContent: `# https://github.com/ausaccessfed/workflows/blob/main/.github/${distributionsFilePath}\n` + newContent
            })
        }
    }
    return parsedFiles
}

const base64TextToUtf8 = (text) => (new Buffer(text, 'base64')).toString('utf8')
const utf8TextToBase64 = (text) => (new Buffer(text)).toString('base64')

const updateFile = async ({ repo, parsedFile, committer }) => {
    let {
        message,
        prFilePath,
        newContent
    } = parsedFile

    const {
        data: { sha: fileSHA, content: currentContentBase64 }
    } = (await getFile({ repo, path: prFilePath, ref: CONSTANTS.prBranchName }));

    const isOnceFile = CONSTANTS.regex.once.test(newContent)
    if (isOnceFile) {
        if (fileSHA) {
            //  If file exists then skip
            return;
        } else {
            newContent = newContent.replace(CONSTANTS.regex.once, "")
        }
    }

    newContent = handlePartial({ currentContentBase64, newContent })

    await commitFile({
        repo,
        branch: CONSTANTS.prBranchName,
        prFilePath,
        message,
        newContentBase64: utf8TextToBase64(newContent),
        committer,
        fileSHA,
    })
}

const removeFile = async ({ repo, parsedFile, committer }) => {
    let {
        message,
        prFilePath,
    } = parsedFile

    const {
        data: { sha: fileSHA }
    } = (await getFile({ repo, path: prFilePath, ref: CONSTANTS.prBranchName }));

    await deleteFile({
        repo,
        branch: CONSTANTS.prBranchName,
        prFilePath,
        message,
        committer,
        fileSHA,
    })
}


const CONSTANTS = {
    regex: {
        once: new RegExp(/#ONCE#(\n)*/),
        partial: new RegExp(/#PARTIAL#(\n)*/),
    },
    cacheFilePath: ".github/.cachedFiles",
    prBranchName: "feature/distribution_updates"
}

const handleFileRemovals = async ({ repo, parsedFiles, committer }) => {
    let {
        data: { sha: distributionsRefFileSHA, content: distributionsRefBase64Content }
    } = (await getFile({ repo, path: CONSTANTS.cacheFilePath, ref: CONSTANTS.prBranchName }));
    let distributionsRefContent = ""
    if (distributionsRefFileSHA) {
        distributionsRefContent = base64TextToUtf8(distributionsRefBase64Content)
        const bootstrappedFiles = distributionsRefContent.split('\n')
        const bootstrappableFiles = parsedFiles.map(x => x.distributionsFilePath)
        filesToBeRemoved = bootstrappedFiles.filter(x => !bootstrappableFiles.includes(x));
        for (let i = 0; i < filesToBeRemoved.length; i++) {
            const { prFilePath, message } = filesToBeRemoved[i]
            await removeFile({
                repo,
                branch: CONSTANTS.prBranchName,
                prFilePath,
                message: message.replace("Update", "Remove"),
                committer,
            })
        }
    }
}

const updateCacheFile = async ({ parsedFile, parsedFiles }) => {
    parsedFile.newContent = parsedFiles.map(file => file.distributionsFilePath).join("\n")
    await updateFile({ repo, parsedFile: parsedFile, committer })
}


const run = async ({ github: githubRef, context, repositories, fs: fsRef, glob }) => {
    github = githubRef
    owner = context.repo.owner
    fs = fsRef

    const committer = context.pusher ?? {
        name: "N/A",
        email: "N/A"
    }
    const globber = await glob.create('**/**/distributions/**/**.*', { followSymbolicLinks: false })
    const files = await globber.glob()
    repositories = ['ausaccessfed/reporting-service']

    let cacheParsedFile
    // parses files and then extracts the bootstrap file as its a special one
    const parsedFiles = parseFiles(files).reduce((acc, parsedFile) => {
        if (x.distributionsFilePath.includes(".cachedFiles")) {
            cacheParsedFile = parsedFile
        } else {
            acc.push(parsedFile)
        }
        return acc
    }, [])

    for (let x = 0; x < repositories.length; x++) {
        const repo = repositories[x].split("/").pop()
        const { data: { default_branch: baseBranch } } = await getRepo({ repo })
        const { data: { commit: { sha: baseBranchSHA } } } = await getBranch({ repo, branch: baseBranch })
        await createBranch({ repo, branch: CONSTANTS.prBranchName, sha: baseBranchSHA })

        // handle files
        for (let i = 0; i < parsedFiles.length; i++) {
            await updateFile({ repo, parsedFile: parsedFiles[i], committer })
        }

        await handleFileRemovals({ repo, parsedFiles, committer })
        await updateCacheFile({ parsedFile: cacheParsedFile, parsedFiles })

        await createPR({
            repo,
            head: CONSTANTS.prBranchName,
            base: baseBranch,
            message: "Updating Distributable Files",
        })
    }
}


module.exports = run