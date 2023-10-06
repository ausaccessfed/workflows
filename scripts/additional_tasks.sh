#!/bin/bash
source ./.github/reusable_workflow/scripts/functions.sh

export DOCKER_BUILDKIT=1
export DOCKER_CONTENT_TRUST=1
async "$BUILD_PRODUCTION_COMMAND" "build" success error
async "$EXTRA_TASK_IMAGE_LINT_COMMAND" "image_lint" success error
for ((i=1; i<=EXTRA_TASK_INC; i++)); do
    EXTRA_TASK="EXTRA_TASK_$i"
    [ "${!EXTRA_TASK}" != "" ] && async "${!EXTRA_TASK}" "task_$i" success error
done

wait

echo "Finished!"
