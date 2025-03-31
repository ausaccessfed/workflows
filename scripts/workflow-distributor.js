/* eslint-disable no-console */
const CONSTANTS = {
  regex: {
    once: /#ONCE#(\n)*/,
    partial: /#PARTIAL#(\n)*/,
    repositoryMatch: /#REPOSITORY_MATCH.*#(\n)*/,
    repositoryExclusion: /#REPOSITORY_EXCLUSION_MATCH.*#(\n)*/
  },
  cacheFilePath: '.cachedFiles',
  prBranchName: 'feature/distribution_updates',
  templateReplacements: {
    repository: /##REPOSITORY##/,
    repository_uppercase: /##REPOSITORY_UPPERCASE##/
  }
}

let GLOBALS = {}
const setGlobals = ({ context, github, fs, signature, gpgPrivateKey, gpgPrivateKeyPassword, diff }) => {
  const contextPayload = context.payload
  GLOBALS = {
    gpgPrivateKey,
    gpgPrivateKeyPassword,
    signature,
    github,
    fs,
    diff,
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
    // console.log('(might not be an error)')
    // console.dir(err.response)
    // console.error(err.stack)
    result = err.response
  }
  return result
}

const createSignature = async (commit) => {
  if (GLOBALS.signature) {
    return {
      signature: await GLOBALS.signature.createSignature(
        commit,
        GLOBALS.gpgPrivateKey,
        GLOBALS.gpgPrivateKeyPassword
      )
    }
  }
  return {};
};


const deleteFiles = async (files, { newCommitSha, repo, prBranch }) => {

  if (files.length == 0) {
    return
  }

  const prFilePaths = files.map(file => file.prFilePath)

  console.log(`Attempting Delete for ${prFilePaths.join(",")}`)

  const { data: baseTree } = await GLOBALS.github.rest.git.getTree({
    owner: GLOBALS.owner,
    repo,
    tree_sha: newCommitSha,
    recursive: true
  });
  const message = files.map(file => file.message).join("\n")
  const newTree = baseTree.tree.map(item => {
    if (prFilePaths.includes(item.path)) {
      item.sha = null
    }
    return item
  });

  const { newCommitSha: newestCommitSha } = await createCommit({ repo, baseSha: newCommitSha, tree: newTree, message })

  await GLOBALS.github.rest.git.updateRef({
    owner: GLOBALS.owner,
    repo,
    ref: `heads/${prBranch}`,
    sha: newestCommitSha
  });
}

const createCommit = async ({ repo, baseSha, tree, message }) => {
  const {
    data: { sha: newTreeSha }
  } = await GLOBALS.github.rest.git.createTree({
    owner: GLOBALS.owner,
    repo,
    base_tree: baseSha,
    tree
  })

  const commit = {
    message,
    tree: newTreeSha,
    parents: [baseSha],
    author: GLOBALS.committer,
    committer: GLOBALS.committer
  }
  const signature = await createSignature(commit);

  // if these are the same for whatever reason then no point committing as zero diff change
  const {
    data: { sha: newCommitSha }
  } = await GLOBALS.github.rest.git.createCommit({
    owner: GLOBALS.owner,
    repo,
    ...commit,
    ...signature
  })

  return { newCommitSha, isDiff: baseSha !== newTreeSha }
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
    // console.log('(might not be an error)')
    // console.dir(err.response)
    // console.error(err.stack)
    result = err.response
  }
  return result
}

const handleInclusion = ({ prFilePath, newContent, repo }) => {
  if (CONSTANTS.regex.repositoryMatch.test(newContent)) {
    // #REPOSITORY_MATCH discovery-service,ecr-retagger #
    // to
    // ["discovery-service","ecr-retagger"]
    const repoSplits = newContent.split('REPOSITORY_MATCH')[1].split('#')[0].trim().split(',')
    const shouldBeAdded = repoSplits.includes(repo)
    if (!shouldBeAdded) {
      //  If repo isnt in list then we dont care
      console.log(`Not updating ${prFilePath} due to REPOSITORY_MATCH`)
      return null
    }
    return newContent.replace(CONSTANTS.regex.repositoryMatch, '')
  }
  return newContent
}

const handleExclusion = ({ prFilePath, newContent, repo }) => {
  if (CONSTANTS.regex.repositoryExclusion.test(newContent)) {
    // #REPOSITORY_EXCLUSION_MATCH discovery-service,ecr-retagger #
    // to
    // ["discovery-service","ecr-retagger"]
    const repoSplits = newContent.split('REPOSITORY_EXCLUSION_MATCH')[1].split('#')[0].trim().split(',')
    const shouldntBeAdded = repoSplits.includes(repo)
    if (shouldntBeAdded) {
      //  If repo is in list then we dont care
      console.log(`Not updating ${prFilePath} due to REPOSITORY_EXCLUSION_MATCH`)
      return null
    }
    return newContent.replace(CONSTANTS.regex.repositoryExclusion, '')
  }
  return newContent
}

const handleIsOnce = ({ prFilePath, currentContentBase64, newContent }) => {
  const isOnceFile = CONSTANTS.regex.once.test(newContent)
  if (isOnceFile) {
    if (currentContentBase64) {
      //  If file exists then skip
      console.log(`Not updating ${prFilePath} due to IS_ONCE_FILE`)
      return null
    }
    return newContent.replace(CONSTANTS.regex.once, '')
  }
  return newContent
}

const handleTemplating = ({ newContent: newContentF, repo }) => {
  let newContent = newContentF

  for (const [key, regex] of Object.entries(CONSTANTS.templateReplacements)) {
    if (regex.test(newContent)) {
      let value = ''
      switch (key) {
        case 'repository':
          value = repo
          break;
        case 'repository_uppercase':
          value = repo.toUpperCase()
          break;
      }
      newContent = newContent.replace(regex, value)
    }
  }

  return newContent
}


const handlePartial = ({ currentContentBase64, newContent: newContentF }) => {
  let newContent = newContentF
  const isPartial = CONSTANTS.regex.partial.test(newContent)

  if (isPartial) {
    //  remove partial flag and blank newline at end of template
    newContent = newContent.replace(CONSTANTS.regex.partial, '').replace(/\n$/, '')

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
      const remainingContent = currentContent.split(endLineReplacement)[1]
      if (remainingContent) {
        newContent += remainingContent
      } else {
        const currentContentLines = currentContent.split('\n')
        const linesToBeAdded = currentContentLines
          .filter(
            (currentContentLine) =>
              !newContentLines.includes(currentContentLine) && endLineReplacement !== currentContentLine
          )
          .join('\n')

        newContent += `\n${linesToBeAdded}`
      }
    }
  }
  return newContent
}

const parseFiles = (files) => {
  const parsedFiles = []
  console.log('Parsing the following files')
  console.log(files)
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
    let lstat
    try {
      lstat = GLOBALS.fs.lstatSync(fileName)
    } catch (_e) {
      // This was prob a file removal so it doesn't exist
    }
    if (!lstat) {
      parsedFiles.push({
        distributionsFilePath,
        message: `Remove ${fileNameRaw}`,
        prFilePath,
        newContent: null
      })
      continue
    }
    if (lstat.isFile()) {
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
      continue
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

  newContent = handleInclusion({ prFilePath, newContent, repo })
  if (!newContent) {
    return null
  }

  newContent = handleExclusion({ prFilePath, newContent, repo })
  if (!newContent) {
    return null
  }

  newContent = handleIsOnce({ prFilePath, currentContentBase64, newContent })
  if (!newContent) {
    return null
  }

  newContent = handleTemplating({ repo, newContent })
  newContent = handlePartial({ currentContentBase64, newContent })

  if (currentContentBase64 != undefined) {
    // Assuming currentContentBase64 and newContent are defined
    const currentContent = Buffer.from(currentContentBase64, 'base64').toString('utf-8');

    if (currentContent == newContent) {
      console.log(`Not updating ${prFilePath} due to NO CHANGE`)
      return null
    }

    // Compute the diff
    const differences = GLOBALS.diff.createPatch('file', currentContent, newContent);
    // Print the diff
    console.log(`Updating ${prFilePath}`)
    console.log(differences);
  } else {
    console.log(`Adding ${prFilePath}`)
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
  if (distributionsRefFileSHA) {
    distributionsRefContent = base64TextToUtf8(distributionsRefBase64Content)
    const bootstrappedFiles = distributionsRefContent.split('\n')
    const removalFiles = bootstrappedFiles.filter(
      (file) => !parsedFiles.find((parsedFile) => file == parsedFile.distributionsFilePath)
    ).map(fileName => `.github/${fileName}`)

    return parseFiles(removalFiles)
  }
  return []
}

const getFiles = (dirPath = '.github/workflows/distributions') => {
  let files = []
  const entries = GLOBALS.fs.readdirSync(dirPath, { withFileTypes: true })

  for (let entry of entries) {
    const fullPath = `${dirPath}/${entry.name}`
    if (entry.isDirectory()) {
      files = files.concat(getFiles(fullPath))
    } else {
      files.push(fullPath)
    }
  }

  return files
}

const createPR = async ({ repo, tree, baseBranch }) => {
  const {
    data: {
      commit: { sha: baseSha }
    }
  } = await getBranch({ repo, branch: baseBranch })

  const message = 'Updating distribution files'
  const { newCommitSha, isDiff } = await createCommit({ repo, tree, baseSha, message })

  if (isDiff) {
    await GLOBALS.github.rest.git.createRef({
      owner: GLOBALS.owner,
      repo,
      ref: `refs/heads/${CONSTANTS.prBranchName}`,
      sha: newCommitSha
    })

    const { data } = await GLOBALS.github.rest.pulls.create({
      owner: GLOBALS.owner,
      repo,
      head: CONSTANTS.prBranchName,
      base: baseBranch,
      title: message,
      body: message
    })

    await GLOBALS.github.rest.issues.addLabels({
      owner: GLOBALS.owner,
      repo,
      issue_number: data.number,
      labels: ['workflowDistribution']
    });
  }

  return newCommitSha
}

const run = async ({ github, signature, context, repositories, fs, gpgPrivateKey, gpgPrivateKeyPassword, diff }) => {
  setGlobals({ context, github, signature, fs, gpgPrivateKey, gpgPrivateKeyPassword, diff })
  const files = getFiles()
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
    console.log(`starting ${repository}`)
    const repo = repository.split('/').pop()
    const {
      data: { default_branch: baseBranch }
    } = await getRepo({ repo })
    await deleteBranch({ repo, branch: CONSTANTS.prBranchName })

    let tree = []

    const filesToBeRemoved = await getFileRemovals({ repo, parsedFiles, baseBranch })

    // handle files
    for (const parsedFile of parsedFiles) {
      tree.push(await updateFileTreeObject({ baseBranch, repo, parsedFile }))
    }

    tree = tree.filter(Boolean)

    if (tree.length == 0 && filesToBeRemoved.length == 0) {
      console.log(`Skipping no changes for ${repository}`)
      continue
    }

    console.log(`Updating/adding ${tree.length} files`)
    console.log(`deleting ${filesToBeRemoved.length} files`)

    const newCommitSha = await createPR({ repo, tree, baseBranch })

    deleteFiles(filesToBeRemoved, { newCommitSha, repo, prBranch: CONSTANTS.prBranchName })

    console.log(`finished ${repository}`)
  }
}

module.exports = run
