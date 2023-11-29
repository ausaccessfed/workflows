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
const setGlobals = ({ context, github, fs, glob }) => {
  const contextPayload = context.payload
  GLOBALS = {
    github,
    fs,
    glob,
    owner: contextPayload.organization.login,
    committer: {
      name: 'aaf-terraform',
      email: '118229371+aaf-terraform@users.noreply.github.com'
    }
  }
}

const base64TextToUtf8 = (text) => Buffer.from(text, 'base64').toString('utf8')
const utf8TextToBase64 = (text) => Buffer.from(text).toString('base64')

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
    console.log('(might not be an error)')
    console.error(err.stack)
    result = err.response
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
    console.error(err.stack)
    result = err.response
  }
  return result
}

const commitFile = async ({ repo, branch, prFilePath, message, newContentBase64, fileSHA }) => {
  return await GLOBALS.github.rest.repos.createOrUpdateFileContents({
    owner: GLOBALS.owner,
    repo,
    branch,
    path: prFilePath,
    message,
    content: newContentBase64,
    committer: GLOBALS.committer,
    sha: fileSHA
  })
}

const deleteFile = async ({ repo, branch, prFilePath, message, fileSHA }) => {
  let result = {}
  try {
    return await GLOBALS.github.rest.repos.deleteFile({
      owner: GLOBALS.owner,
      branch,
      repo,
      path: prFilePath,
      message,
      sha: fileSHA,
      committer: GLOBALS.committer
    })
  } catch (err) {
    console.log('(might not be an error)')
    console.error(err.stack)
    result = err.response
  }
  return result
}

// const getPullRequestByBranchName = async ({ repo, branch }) => {
//   const query = `query pullRequest($owner:String!,$repo:String!, $branch:String!) {
//           repository(owner: $owner, name: $repo) {
//             pullRequests(headRefName: $branch, first: 100) {
//               nodes {
//                 number
//                 url
//               }
//             }
//           }
//         }`

//   await GLOBALS.github.graphql(query, {
//     owner: GLOBALS.owner,
//     repo,
//     branch
//   })
// }

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
    console.error(err.stack)
    result = err.response
  }
  return result
}

// const deletePR = async ({ repo }) => {
//   return await GLOBALS.github.rest.pulls.delete({
//     owner: GLOBALS.owner,
//     repo,
//     state: 'closed'
//   })
// }

const deleteBranch = async ({ repo, branch }) => {
  return await GLOBALS.github.rest.git.deleteRef({
    owner: GLOBALS.owner,
    repo,
    ref: `heads/${branch}`
  })
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
        newContent += `\n${currentContent}`
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

const updateFile = async ({ repo, parsedFile }) => {
  const { message, prFilePath } = parsedFile
  let { newContent } = parsedFile
  const {
    data: { sha: fileSHA, content: currentContentBase64 }
  } = await getFile({ repo, path: prFilePath, ref: CONSTANTS.prBranchName })

  const isOnceFile = CONSTANTS.regex.once.test(newContent)
  if (isOnceFile) {
    if (fileSHA) {
      //  If file exists then skip
      return
    }
    newContent = newContent.replace(CONSTANTS.regex.once, '')
  }

  newContent = handlePartial({ currentContentBase64, newContent })

  await commitFile({
    repo,
    branch: CONSTANTS.prBranchName,
    prFilePath,
    message,
    newContentBase64: utf8TextToBase64(newContent),
    fileSHA
  })
}

const removeFile = async ({ repo, branch, prFilePath, message }) => {
  const {
    data: { sha: fileSHA }
  } = await getFile({ repo, path: prFilePath, ref: branch })

  await deleteFile({
    repo,
    branch,
    prFilePath,
    message,
    fileSHA
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
      await removeFile({
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

const createPRBranch = async ({ repo, baseBranch }) => {
  //   const pr = await getPullRequestByBranchName({ repo, branch: CONSTANTS.prBranchName })
  //   console.log(pr)

  //   if (number) {
  // await deletePR({ repo, pull_number: number })
  await deleteBranch({ repo, branch: CONSTANTS.prBranchName })
  //   }

  const {
    data: {
      commit: { sha: baseBranchSHA }
    }
  } = await getBranch({ repo, branch: baseBranch })

  await createBranch({ repo, branch: CONSTANTS.prBranchName, sha: baseBranchSHA })
}
const getFiles = async () => {
  const globber = await GLOBALS.glob.create('**/**/distributions/**/**.*', { followSymbolicLinks: false })
  return await globber.glob()
}
const run = async ({ github, context, repositories, fs, glob }) => {
  setGlobals({ context, github, fs, glob })

  repositories = ['ausaccessfed/reporting-service']

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
    await createPRBranch({ repo, baseBranch })

    // handle files
    for (const parsedFile of parsedFiles) {
      await updateFile({ repo, parsedFile })
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
