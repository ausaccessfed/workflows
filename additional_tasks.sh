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
$BUILD_PRODUCTION_COMMAND 1> job_1.txt 2> job_1_error.txt &
[ "$EXTRA_TASK_1" != "" ] && $EXTRA_TASK_1 1> job_2.txt 2> job_2_error.txt &
[ "$EXTRA_TASK_2" != "" ] && $EXTRA_TASK_2 1> job_3.txt 2> job_3_error.txt &
[ "$EXTRA_TASK_3" != "" ] && $EXTRA_TASK_3 1> job_4.txt 2> job_4_error.txt &
[ "$EXTRA_TASK_4" != "" ] && $EXTRA_TASK_4 1> job_5.txt 2> job_5_error.txt &
[ "$EXTRA_TASK_5" != "" ] && $EXTRA_TASK_5 1> job_6.txt 2> job_6_error.txt &
[ "$EXTRA_TASK_6" != "" ] && $EXTRA_TASK_6 1> job_7.txt 2> job_7_error.txt &

wait

[ "$LOAD_PRODUCTION_COMMAND" != "" ] && $LOAD_PRODUCTION_COMMAND &

echo "Finished!"
