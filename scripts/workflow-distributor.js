const CONSTANTS = {
    regex: {
        once: new RegExp(/#ONCE#(\n)*/),
        partial: new RegExp(/#PARTIAL#(\n)*/),
    },
    cacheFilePath: ".github/.cachedFiles",
    prBranchName: "feature/distribution_updates"
}
let GLOBALS = {}
const base64TextToUtf8 = (text) => (new Buffer(text, 'base64')).toString('utf8')
const utf8TextToBase64 = (text) => (new Buffer(text)).toString('base64')

const getRepo = async ({ repo }) => {
    return await GLOBALS.github.rest.repos.get({
        owner: GLOBALS.owner,
        repo,
    });
}

const getBranch = async ({ repo, branch }) => {
    return await GLOBALS.github.rest.repos.getBranch({
        owner: GLOBALS.owner,
        repo,
        branch,
    })
}

const createBranch = async ({ repo, branch, sha }) => {
    let result = {}
    try {
        result = await GLOBALS.github.rest.git.createRef({
            owner: GLOBALS.owner,
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
        result = await GLOBALS.github.rest.repos.getContent({
            owner: GLOBALS.owner,
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
    fileSHA,
}) => {
    return await GLOBALS.github.rest.repos.createOrUpdateFileContents({
        owner: GLOBALS.owner,
        repo,
        branch,
        path: prFilePath,
        message,
        content: newContentBase64,
        committer: GLOBALS.committer,
        sha: fileSHA,
    })
}

const deleteFile = async ({
    repo,
    branch,
    prFilePath,
    message,
    fileSHA,
}) => {
    return await GLOBALS.github.rest.repos.deleteFile({
        owner: GLOBALS.owner,
        branch,
        repo,
        path: prFilePath,
        message,
        sha: fileSHA,
        committer: GLOBALS.committer,
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
        result = await GLOBALS.github.rest.pulls.create({
            owner: GLOBALS.owner,
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
    for (fileName of files) {
        // get last split assume its a file with no /
        const fileNameRaw = fileName.split("/").pop()
        // split on .github assume the left as it contains random github runner paths, pop twice
        //  i.e /home/runner/work/workflows/workflows/.github/workflows/distributions/.github/.dockerignore -> workflows/distributions/.github/.dockerignore
        const distributionsFilePath = fileName.split(/\.github\/(.*)/s).slice(-2).shift()
        //  i.e /workflows/distributions/.github/.dockerignore -> .github/.dockerignore
        const prFilePath = distributionsFilePath.split("distributions/").pop()
        if (GLOBALS.fs.lstatSync(fileName).isFile()) {
            const newContent = GLOBALS.fs.readFileSync(fileName).toString('utf8')
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

const updateFile = async ({ repo, parsedFile }) => {
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
        fileSHA,
    })
}

const removeFile = async ({ repo, parsedFile }) => {
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
        fileSHA,
    })
}

const handleFileRemovals = async ({ repo, parsedFiles }) => {
    let {
        data: { sha: distributionsRefFileSHA, content: distributionsRefBase64Content }
    } = (await getFile({ repo, path: CONSTANTS.cacheFilePath, ref: CONSTANTS.prBranchName }));
    let distributionsRefContent = ""
    if (distributionsRefFileSHA) {
        distributionsRefContent = base64TextToUtf8(distributionsRefBase64Content)
        const bootstrappedFiles = distributionsRefContent.split('\n')
        const bootstrappableFiles = parsedFiles.map(parsedFile => parsedFile.distributionsFilePath)
        filesToBeRemoved = bootstrappedFiles.filter(bootstrappedFile => !bootstrappableFiles.includes(bootstrappedFile));
        for ({ prFilePath, message } of filesToBeRemoved) {
            await removeFile({
                repo,
                branch: CONSTANTS.prBranchName,
                prFilePath,
                message: message.replace("Update", "Remove"),
            })
        }
    }
}

const updateCacheFile = async ({ repo, parsedFile, parsedFiles }) => {
    parsedFile.newContent = parsedFiles.map(file => file.distributionsFilePath).join("\n")
    await updateFile({ repo, parsedFile: parsedFile })
}

const createPRBranch = async ({ repo, baseBranch }) => {
    const { data: { commit: { sha: baseBranchSHA } } } = await getBranch({ repo, branch: baseBranch })
    await createBranch({ repo, branch: CONSTANTS.prBranchName, sha: baseBranchSHA })
}
const getFiles = async () => {
    const globber = await GLOBALS.glob.create('**/**/distributions/**/**.*', { followSymbolicLinks: false })
    return await globber.glob()
}
const run = async ({ github, context, repositories, fs, glob }) => {
    GLOBALS = {
        github,
        fs,
        glob,
        owner: context.payload.organization.login,
        committer: context.payload.pusher ?? {
            name: "N/A",
            email: "N/A"
        }
    }
    repositories = ['ausaccessfed/reporting-service']

    const files = await getFiles()
    let cacheParsedFile
    // parses files and then extracts the bootstrap file as its a special one
    const parsedFiles = parseFiles(files).reduce((acc, parsedFile) => {
        if (parsedFile.distributionsFilePath.includes(".cachedFiles")) {
            cacheParsedFile = parsedFile
        } else {
            acc.push(parsedFile)
        }
        return acc
    }, [])

    for (repository of repositories) {
        const repo = repository.split("/").pop()
        const { data: { default_branch: baseBranch } } = await getRepo({ repo })
        await createPRBranch({ repo, baseBranch })

        // handle files
        for (parsedFile of parsedFiles) {
            await updateFile({ repo, parsedFile })
        }

        await handleFileRemovals({ repo, parsedFiles })
        await updateCacheFile({ repo, parsedFile: cacheParsedFile, parsedFiles })

        await createPR({
            repo,
            head: CONSTANTS.prBranchName,
            base: baseBranch,
            message: "Updating Distributable Files",
        })
    }
}


module.exports = run