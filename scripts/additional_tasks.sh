#!/bin/bash
source ./.github/reusable_workflow/scripts/functions.sh

export DOCKER_BUILDKIT=1
async "$BUILD_PRODUCTION_COMMAND" "build" success error
for ((i=1; i<=EXTRA_TASK_INC; i++)); do
    EXTRA_TASK="EXTRA_TASK_$i"
    [ "${!EXTRA_TASK}" != "" ] && async "${!EXTRA_TASK}" "task_$i" success error
done

wait

echo "Finished!"
