#!/bin/bash

# This script implements 3 asynchronous function
# setTimeout
# setInterval
# async
# killJob function is not asynchronous

declare -a JOB_IDS

declare -i JOBS=1;

success() {
    local _content="$1"
    local _log_name="$2"
    local _ID="$3"
    echo "${_content}" > ${_log_name}.txt
}

error() {
    local _content="$1"
    local _log_name="$2"
    local _err="$3"
    local _ID="$4"
    echo "${_content}" > ${_log_name}.txt
    echo "${_err}" > ${_log_name}_error.txt
}

async() {
    command="$1"
    log_name="$2"
    resolve="$3"
    reject="$4"
    {
        echo "`date "+%Y-%m-%d %H:%M:%S"` Running $command"
        ## this just starts the timers
        _x=$SECONDS
        $command > temp_${JOBS}.txt 2>&1
        status=$?
        __result="$(cat temp_${JOBS}.txt)"

        (( status == 0 )) && {
            $resolve "${__result}" "${log_name}" "${JOBS}"

        } || {
            $reject "${__result}" "${log_name}" "${status}" "${JOBS}"
        }
        unset __result
        echo "`date "+%Y-%m-%d %H:%M:%S"` Finished $command Took $SECONDS"
    } &

    JOB_IDS+=( "${JOBS} ${command}" )

    read -d " " -a __kunk__ <<< "${JOB_IDS[$(( ${#JOB_IDS[@]} - 1))]}"

    : $(( JOBS++ ))
}