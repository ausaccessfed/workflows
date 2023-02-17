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

     command="$1"
     resolve="$2"
     reject="$3"

    {
    command_parts=($(echo $command | tr " " "@" | tr " ~ " " "))
    __result=$($( echo ${command_parts[0]} | tr '@' ' ') "$( echo ${command_parts[1]} | tr '@' ' ')")
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