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
const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
const getRepo = async ({ repo }) => {
  return await GLOBALS.github.rest.repos.get({
    owner: GLOBALS.owner,
    repo
  })
}

const getBranch = async ({ repo, branch }) => {
  let result
  try {
    result = await GLOBALS.github.rest.repos.getBranch({
      owner: GLOBALS.owner,
      repo,
      branch
    })
  } catch (err) {
    // sleep to avoid the first add delay
    await sleep(5000)
    result = await GLOBALS.github.rest.repos.getBranch({
      owner: GLOBALS.owner,
      repo,
      branch
    })
  }
  return result
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

const commitFile = async ({ createBranch, repo, branch, prFilePath, message, content }) => {
  const {
    data: {
      commit: { sha: baseSha }
    }
  } = await getBranch({ repo, branch })

  const tree = [
    {
      path: prFilePath,
      mode: '100644',
      type: 'blob',
      //   if content null its file deletion
      ...(content === null ? { sha: null } : { content })
    }
  ]

  const { newCommitSha, isDiff } = await createCommit({ repo, tree, baseSha, message })

  if (isDiff) {
    return createBranch
      ? await GLOBALS.github.rest.git.createRef({
          owner: GLOBALS.owner,
          repo,
          ref: `refs/heads/${branch}`,
          sha: newCommitSha
        })
      : await GLOBALS.github.rest.git.updateRef({
          owner: GLOBALS.owner,
          repo,
          ref: `heads/${branch}`,
          message,
          sha: newCommitSha,
          force: true
        })
  }

  return false
}

const deleteFile = async ({ repo, branch, prFilePath, message }) => {
  let result = {}
  try {
    return await commitFile({
      repo,
      branch,
      prFilePath,
      message,
      content: null
    })
  } catch (err) {
    console.log('(might not be an error)')
    console.dir(err.response)
    console.error(err.stack)
    result = err.response
  }
  return result
}

const createPR = async ({ repo, head, base, message }) => {
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
    console.log('(might not be an error)')
    console.dir(err.response)
    console.error(err.stack)
    result = err.response
  }
  return result
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

const updateFile = async ({ createBranch, repo, parsedFile }) => {
  const { message, prFilePath } = parsedFile
  let { newContent } = parsedFile
  const {
    data: { content: currentContentBase64 }
  } = await getFile({ repo, path: prFilePath, ref: CONSTANTS.prBranchName })

  const isOnceFile = CONSTANTS.regex.once.test(newContent)
  if (isOnceFile) {
    if (currentContentBase64) {
      //  If file exists then skip
      return
    }
    newContent = newContent.replace(CONSTANTS.regex.once, '')
  }

  if (currentContentBase64) {
    newContent = handlePartial({ currentContent: base64TextToUtf8(currentContentBase64), newContent })
  }

  await commitFile({
    repo,
    branch: CONSTANTS.prBranchName,
    createBranch,
    prFilePath,
    message,
    content: newContent
  })
}

const handleFileRemovals = async ({ repo, parsedFiles, baseBranch }) => {
  const {
    data: { sha: distributionsRefFileSHA, content: distributionsRefBase64Content }
  } = await getFile({ repo, path: CONSTANTS.cacheFilePath, ref: baseBranch })
  let distributionsRefContent = ''
  if (distributionsRefFileSHA) {
    distributionsRefContent = base64TextToUtf8(distributionsRefBase64Content)
    const bootstrappedFiles = distributionsRefContent.split('\n')
    const bootstrappableFiles = parsedFiles.map((parsedFile) => parsedFile.distributionsFilePath)
    const filesToBeRemoved = bootstrappedFiles.filter(
      (bootstrappedFile) => !bootstrappableFiles.includes(bootstrappedFile)
    )
    for (const prFilePath of filesToBeRemoved) {
      await deleteFile({
        repo,
        branch: CONSTANTS.prBranchName,
        prFilePath,
        message: `Remove ${prFilePath}`
      })
    }
  }
}

const updateCacheFile = async ({ repo, parsedFile, parsedFiles }) => {
  parsedFile.newContent = parsedFiles.map((file) => file.distributionsFilePath).join('\n')
  await updateFile({ repo, parsedFile })
}

const getFiles = async () => {
  const globber = await GLOBALS.glob.create('**/**/distributions/**/**.*', { followSymbolicLinks: false })
  return await globber.glob()
}

const run = async ({ github, signature, context, repositories, fs, glob, gpgPrivateKey, gpgPrivateKeyPassword }) => {
  setGlobals({ context, github, signature, fs, glob, gpgPrivateKey, gpgPrivateKeyPassword })
  const files = await getFiles()
  let cacheParsedFile
  // parses files and then extracts the bootstrap file as its a special one
  const parsedFiles = parseFiles(files).reduce((acc, parsedFile) => {
    if (parsedFile.distributionsFilePath.includes(CONSTANTS.cacheFilePath)) {
      cacheParsedFile = parsedFile
    } else {
      acc.push(parsedFile)
    }
    return acc
  }, [])

  for (const repository of repositories) {
    const repo = repository.split('/').pop()
    const {
      data: { default_branch: baseBranch }
    } = await getRepo({ repo })
    await deleteBranch({ repo, branch: CONSTANTS.prBranchName })

    let createBranch = true
    // handle files
    for (const parsedFile of parsedFiles) {
      await updateFile({ createBranch, repo, parsedFile })
      createBranch = false
    }

    await handleFileRemovals({ repo, parsedFiles, baseBranch })
    await updateCacheFile({ repo, parsedFile: cacheParsedFile, parsedFiles })

    await createPR({
      repo,
      head: CONSTANTS.prBranchName,
      base: baseBranch,
      message: 'Update distributable files'
    })
  }
}

module.exports = run
