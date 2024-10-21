
const run = async ({ github, context, fs, create_comment, titles, task_failed, issue_number }) => {
    // get all files named chunk_*
    const chunks = fs.readdirSync(".").filter(fn => fn.includes('chunk_'));

    // Retrieve existing bot comments for the PR
    const { data: comments } = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number,
    })

    const MAX_GITHUB_COMMENT_LENGTH = 65536 - 100;

    const botComment = comments.find(comment => {
        return comment.user.type === 'Bot' && comment.body.includes(...titles)
    })

    let fileIndex = 0

    let body = chunks.reduce((acc, chunk) => {
        // processing a new file, look for new title
        if (!chunk.includes(`chunk_${fileIndex}`)) {
            fileIndex++;
        }
        const chuckFilenameSplits = chunk.split("_")
        const title = titles[chuckFilenameSplits[1]] || "Title missing!!!"
        const part = chuckFilenameSplits[2]
        let output = fs.readFileSync(chunk, "utf8");

        let output_title = "Show Output"
        if (task_failed == 'true') {
            output_title = "Show Failed Output"
        }

        const body = `## ${title}
            <details><summary>${output_title} (part ${part})</summary>

            \`\`\`\n
            ${output}
            \`\`\`

            </details>\n`

        return acc + body
    }, "")

    body = body.slice(0, MAX_GITHUB_COMMENT_LENGTH)
    // TODO: we could sub split and loop those also, will wait until i see this happen
    if (body.length == MAX_GITHUB_COMMENT_LENGTH) {
        body += "...\nPlease review the output in github actions logs because it's too long"
    }

    if (botComment) {
        if (create_comment) {
            github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body
            })
        } else {
            github.rest.issues.deleteComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
            })
        }
    } else if (create_comment) {
        github.rest.issues.createComment({
            issue_number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body
        })
    }
}

module.exports = run
