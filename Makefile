-include .env

run-distribution:
	export GITHUB_AUTH=${GITHUB_AUTH} && export REPOS=${REPOS} && node ./scripts/local-distribution.js
