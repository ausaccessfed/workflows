-include .env # Applies to every target in the file!
-include ../aaf-terraform/Makefile

run-distribution:
	@export GITHUB_AUTH=${GITHUB_AUTH} && export REPOS=${REPOS} && node ./scripts/local-distribution.js

run-backup:
	aws-vault exec shared-services -- ./scripts/copy-repos.sh ${GITHUB_AUTH}

run-webhook:
	./scripts/slack_webhook.sh "Test Title" "${WEBHOOK}" "REPO" "12345" "true"
