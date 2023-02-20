#!/bin/bash

# This script implements 3 asynchronous function
# setTimeout
# setInterval
# async
# killJob function is not asynchronous

# check the README.md for information on how to use this script

declare -a JOB_IDS

declare -i JOBS=1;

async() {

     command="$1"
     resolve="$2"
     reject="$3"
    {
    "$($command)" > temp_${JOBS}.txt 2>&1
    __result="$(cat temp_${JOBS}.txt)"
    status=$?

	(( status == 0 )) && {
	    $resolve "${__result}" "${JOBS}"

	} || {
	    $reject "${__result}" "${status}" "${JOBS}"
	}
	unset __result
    } &



    JOB_IDS+=( "${JOBS} ${command}" )

    read -d " " -a __kunk__ <<< "${JOB_IDS[$(( ${#JOB_IDS[@]} - 1))]}"

    echo ${__kunk__}


    : $(( JOBS++ ))

}