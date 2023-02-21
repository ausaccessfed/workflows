#!/bin/bash

# This script implements 3 asynchronous function
# setTimeout
# setInterval
# async
# killJob function is not asynchronous

# check the README.md for information on how to use this script

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
        $command > temp_${JOBS}.txt 2>&1
        status=$?
        __result="$(cat temp_${JOBS}.txt)"

        (( status == 0 )) && {
            $resolve "${__result}" "${log_name}" "${JOBS}"

        } || {
            $reject "${__result}" "${log_name}" "${status}" "${JOBS}"
        }
        unset __result
    } &

    JOB_IDS+=( "${JOBS} ${command}" )

    read -d " " -a __kunk__ <<< "${JOB_IDS[$(( ${#JOB_IDS[@]} - 1))]}"

    echo ${__kunk__}

    : $(( JOBS++ ))
}