#!/bin/bash
source ./.github/reusable_workflow/scripts/functions.sh


export DOCKER_BUILDKIT=1
async "$BUILD_PRODUCTION_COMMAND" "build" success error
[ "$EXTRA_TASK_1" != "" ] && async "$EXTRA_TASK_1" "task_1" success error
[ "$EXTRA_TASK_2" != "" ] && async "$EXTRA_TASK_2" "task_2" success error
[ "$EXTRA_TASK_3" != "" ] && async "$EXTRA_TASK_3" "task_3" success error
[ "$EXTRA_TASK_4" != "" ] && async "$EXTRA_TASK_4" "task_4" success error
[ "$EXTRA_TASK_5" != "" ] && async "$EXTRA_TASK_5" "task_5" success error
[ "$EXTRA_TASK_6" != "" ] && async "$EXTRA_TASK_6" "task_6" success error

wait

echo "Finished!"
