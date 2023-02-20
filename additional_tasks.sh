#!/bin/bash
source ./.github/reusable_workflow/functions.sh

success() {
    local _content="$1"
    local _ID="$2"
    echo "${_content}" > job_${_ID}.txt
}

error() {
    local _content="$1"
    local _err="$2"
    local _ID="$3"
    echo "${_content}" > job_${_ID}.txt
    echo "${_err}" > job_${_ID}_error.txt
}

export DOCKER_BUILDKIT=1
async "$BUILD_PRODUCTION_COMMAND" success error
[ "$EXTRA_TASK_1" != "" ] && async "$EXTRA_TASK_1" success error
[ "$EXTRA_TASK_2" != "" ] && async "$EXTRA_TASK_2" success error
[ "$EXTRA_TASK_3" != "" ] && async "$EXTRA_TASK_3" success error
[ "$EXTRA_TASK_4" != "" ] && async "$EXTRA_TASK_4" success error
[ "$EXTRA_TASK_5" != "" ] && async "$EXTRA_TASK_5" success error
[ "$EXTRA_TASK_6" != "" ] && async "$EXTRA_TASK_6" success error

wait

[ "$LOAD_PRODUCTION_COMMAND" != "" ] && $LOAD_PRODUCTION_COMMAND &

echo "Finished!"
