#!/bin/bash
source ./.github/reusable_workflow/functions.sh

success() {
    local _content="$1"
    local _ID="$2"
    echo ${_content} > job_${_ID}.txt
}

error() {
    local _err="$1"
    local _ID="$2"
    echo ${_err} > job_${_ID}_error.txt
}

# DOCKER_BUILDKIT=1 $BUILD_PRODUCTION_COMMAND > build.txt &
async "$EXTRA_TASK_2" success error
# [ "$EXTRA_TASK_1" != "" ] && $EXTRA_TASK_1 > EXTRA_TASK_1.txt &
# [ "$EXTRA_TASK_2" != "" ] && $EXTRA_TASK_2 > EXTRA_TASK_2.txt &
# [ "$EXTRA_TASK_3" != "" ] && $EXTRA_TASK_3 > EXTRA_TASK_3.txt &
# [ "$EXTRA_TASK_4" != "" ] && $EXTRA_TASK_4 > EXTRA_TASK_4.txt &
# [ "$EXTRA_TASK_5" != "" ] && $EXTRA_TASK_5 > EXTRA_TASK_5.txt &
# [ "$EXTRA_TASK_6" != "" ] && $EXTRA_TASK_6 > EXTRA_TASK_6.txt &

wait

[ "$LOAD_PRODUCTION_COMMAND" != "" ] && $LOAD_PRODUCTION_COMMAND &

echo "Finished!"
