#!/usr/bin/env bash


# This script implements 3 asynchronous function
# setTimeout
# setInterval
# async
# killJob function is not asynchronous

# check the README.md for information on how to use this script

declare -a JOB_IDS

declare -i JOBS=1;

async() {

    local commandToExec="$1"
    local resolve="$2"
    local reject="$3"

    {

        echo "hello $commandToExec"
	$commandToExec

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