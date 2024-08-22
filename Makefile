-include .env

run-distribution:
	@export GITHUB_AUTH=${GITHUB_AUTH} && export REPOS=${REPOS} && node ./scripts/local-distribution.js

run-backup:
	aws-vault exec shared-services -- ./scripts/copy-repos.sh ${GITHUB_AUTH}
