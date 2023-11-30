/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
/* eslint-disable no-return-await */

const CONSTANTS = {
  regex: {
    once: /#ONCE#(\n)*/,
    partial: /#PARTIAL#(\n)*/
  },
  cacheFilePath: '.cachedFiles',
  prBranchName: 'feature/distribution_updates'
}

let GLOBALS = {}
const setGlobals = ({ context, github, fs, glob, signature, gpgPrivateKey, gpgPrivateKeyPassword }) => {
  const contextPayload = context.payload
  GLOBALS = {
    gpgPrivateKey,
    gpgPrivateKeyPassword,
    signature,
    github,
    fs,
    glob,
    owner: contextPayload.organization.login,
    committer: {
      email: 'fishwhack9000+terraform@gmail.com',
      name: 'aaf-terraform',
      date: new Date(Date.now()).toISOString()
    }
  }
}

const base64TextToUtf8 = (text) => Buffer.from(text, 'base64').toString('utf8')

const getRepo = async ({ repo }) => {
  return await GLOBALS.github.rest.repos.get({
    owner: GLOBALS.owner,
    repo
  })
}

const getBranch = async ({ repo, branch }) => {
  return await GLOBALS.github.rest.repos.getBranch({
    owner: GLOBALS.owner,
    repo,
    branch
  })
}

const getFile = async ({ repo, path, ref }) => {
  let result = {}
  try {
    result = await GLOBALS.github.rest.repos.getContent({
      owner: GLOBALS.owner,
      repo,
      path,
      ref
    })
  } catch (err) {
    console.log('(might not be an error)')
    console.dir(err.response)
    console.error(err.stack)
    result = err.response
  }
  return result
}

const createCommit = async ({ repo, baseSha, tree, message }) => {
  console.dir(tree)
  const {
    data: { sha: treeSha }
  } = await GLOBALS.github.rest.git.createTree({
    owner: GLOBALS.owner,
    repo,
    base_tree: baseSha,
    tree
  })

  const commit = {
    message,
    tree: treeSha,
    parents: [baseSha],
    author: GLOBALS.committer,
    committer: GLOBALS.committer
  }

  // if these are the same for whatever reason then no point committing as zero diff change
  const {
    data: { sha: newCommitSha }
  } = await GLOBALS.github.rest.git.createCommit({
    owner: GLOBALS.owner,
    repo,
    ...commit,
    signature: await GLOBALS.signature.createSignature(commit, GLOBALS.gpgPrivateKey, GLOBALS.gpgPrivateKeyPassword)
  })

  return { newCommitSha, isDiff: baseSha !== treeSha }
}

const deleteBranch = async ({ repo, branch }) => {
  let result
  try {
    result = await GLOBALS.github.rest.git.deleteRef({
      owner: GLOBALS.owner,
      repo,
      ref: `heads/${branch}`
    })
  } catch (err) {
    console.log('(might not be an error)')
    console.dir(err.response)
    console.error(err.stack)
    result = err.response
  }
  return result
}

const handlePartial = ({ currentContent, newContent: newContentF }) => {
  let newContent = newContentF
  const isPartial = CONSTANTS.regex.partial.test(newContent)

  if (isPartial) {
    //  remove partial flag and blank newline at end of template
    newContent = newContent.replace(CONSTANTS.regex.partial, '').replace(/\n$/, '')

    if (currentContent) {
      const newContentLines = newContent.split('\n')

      let endLineReplacement = null
      // This just avoids the last line being a blank line
      let tempI = 0
      while (!endLineReplacement && tempI < 10) {
        tempI++
        endLineReplacement = newContentLines.pop()
      }
      const remainingContent = currentContent.split(endLineReplacement)[1]
      if (remainingContent) {
        newContent += remainingContent
      } else {
        const currentContentLines = currentContent.split('\n')
        const linesToBeAdded = currentContentLines
          .filter((currentContentLine) => !newContentLines.includes(currentContentLine))
          .join('\n')

        newContent += `\n${linesToBeAdded}`
      }
    }
  }
  return newContent
}

const parseFiles = (files) => {
  const parsedFiles = []
  for (const fileName of files) {
    // get last split assume its a file with no /
    const fileNameRaw = fileName.split('/').pop()
    // split on .github assume the left as it contains random github runner paths, pop twice
    //  i.e /home/runner/work/workflows/workflows/.github/workflows/distributions/.github/.dockerignore -> workflows/distributions/.github/.dockerignore
    const distributionsFilePath = fileName
      .split(/\.github\/(.*)/s)
      .slice(-2)
      .shift()
    // i.e /workflows/distributions/.github/.dockerignore -> .github/.dockerignore
    const prFilePath = distributionsFilePath.split('distributions/').pop()
    if (GLOBALS.fs.lstatSync(fileName).isFile()) {
      const newContent = GLOBALS.fs.readFileSync(fileName).toString('utf8')
      // NOTE: due to issues with comments causing issues i.e json does not support
      // we have decided to suspend the commentRefString
      // const commentRefString = `# https://github.com/ausaccessfed/workflows/blob/main/.github/${distributionsFilePath}\n`
      const commentRefString = ''
      parsedFiles.push({
        distributionsFilePath,
        message: `Update ${fileNameRaw}`,
        prFilePath,
        newContent: `${commentRefString}${newContent}`
      })
    }
  }
  return parsedFiles
}

const updateFileTreeObject = async ({ baseBranch, repo, parsedFile }) => {
  const { prFilePath } = parsedFile
  let { newContent } = parsedFile
  const {
    data: { content: currentContentBase64 }
  } = await getFile({ repo, path: prFilePath, ref: baseBranch })

  const isOnceFile = CONSTANTS.regex.once.test(newContent)
  if (isOnceFile) {
    if (currentContentBase64) {
      //  If file exists then skip
      return null
    }
    newContent = newContent.replace(CONSTANTS.regex.once, '')
  }

  if (currentContentBase64) {
    newContent = handlePartial({ currentContent: base64TextToUtf8(currentContentBase64), newContent })
  }

  return {
    path: prFilePath,
    mode: '100644',
    type: 'blob',
    content: newContent
  }
}

const getFileRemovals = async ({ repo, parsedFiles, baseBranch }) => {
  const {
    data: { sha: distributionsRefFileSHA, content: distributionsRefBase64Content }
  } = await getFile({ repo, path: CONSTANTS.cacheFilePath, ref: baseBranch })
  let distributionsRefContent = ''
  let filesToBeRemoved = []
  if (distributionsRefFileSHA) {
    distributionsRefContent = base64TextToUtf8(distributionsRefBase64Content)
    const bootstrappedFiles = distributionsRefContent.split('\n')
    const bootstrappableFiles = parsedFiles.map((parsedFile) => parsedFile.distributionsFilePath)
    filesToBeRemoved = bootstrappedFiles.filter((bootstrappedFile) => !bootstrappableFiles.includes(bootstrappedFile))
  }
  return filesToBeRemoved
}

const getFiles = async () => {
  const globber = await GLOBALS.glob.create('**/**/distributions/**/**.*', { followSymbolicLinks: false })
  return await globber.glob()
}

const createPR = async ({ repo, tree, baseBranch }) => {
  const {
    data: {
      commit: { sha: baseSha }
    }
  } = await getBranch({ repo, branch: baseBranch })

  const message = 'Updating distribution files'
  const { newCommitSha, isDiff } = await createCommit({ repo, tree: tree.filter((x) => x), baseSha, message })

  if (isDiff) {
    await GLOBALS.github.rest.git.createRef({
      owner: GLOBALS.owner,
      repo,
      ref: `refs/heads/${CONSTANTS.prBranchName}`,
      sha: newCommitSha
    })

    await GLOBALS.github.rest.pulls.create({
      owner: GLOBALS.owner,
      repo,
      head: CONSTANTS.prBranchName,
      base: baseBranch,
      title: message,
      body: message
    })
  }
}

const run = async ({ github, signature, context, repositories, fs, glob, gpgPrivateKey, gpgPrivateKeyPassword }) => {
  setGlobals({ context, github, signature, fs, glob, gpgPrivateKey, gpgPrivateKeyPassword })
  const files = await getFiles()
  // parses files and then extracts the bootstrap file as its a special one
  let parsedFiles = parseFiles(files)
  const cacheFileContents = parsedFiles.map((file) => file.distributionsFilePath).join('\n')
  parsedFiles = parsedFiles.map((parsedFile) => {
    if (parsedFile.distributionsFilePath.includes(CONSTANTS.cacheFilePath)) {
      parsedFile.newContent = cacheFileContents
    }
    return parsedFile
  })

  for (const repository of repositories) {
    const repo = repository.split('/').pop()
    const {
      data: { default_branch: baseBranch }
    } = await getRepo({ repo })
    await deleteBranch({ repo, branch: CONSTANTS.prBranchName })

    const tree = []
    // handle files
    for (const parsedFile of parsedFiles) {
      tree.push(await updateFileTreeObject({ baseBranch, repo, parsedFile }))
    }

    const filesToBeRemoved = await getFileRemovals({ repo, parsedFiles, baseBranch })
    for (const prFilePath of filesToBeRemoved) {
      tree.push({
        path: prFilePath,
        mode: '100644',
        type: 'blob',
        sha: null
      })
    }

    await createPR({ repo, tree, baseBranch })
  }
}

module.exports = run
