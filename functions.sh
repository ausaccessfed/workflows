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

    [[ -z "$commandToExec" ]] || [[ -z "$reject" ]] || [[ -z "$resolve" ]] && {
	printf "%s\n" "Insufficient number of arguments";
	return 1;
    }



    local __temp=( "$commandToExec" "$reject" "$resolve" )


    for _c in "${__temp[@]}";do


	read -d " " comm <<<"${_c}"

	type "${comm}" &>/dev/null

    	local status=$?

    	(( status != 0 )) && {
    	    printf "\"%s\" is neither a function nor a recognized command\n" "${_c}";
	    unset _c
	    return 1;
    	}

    done

    unset __temp ;  unset _c

    {

	__result=$($commandToExec)

	status=$?

	(( status == 0 )) && {
	    $resolve "${__result}" "${JOBS}"

	} || {
	    $reject "${status}" "${JOBS}"
	}
	unset __result
    } &



    JOB_IDS+=( "${JOBS} ${command}" )

    read -d " " -a __kunk__ <<< "${JOB_IDS[$(( ${#JOB_IDS[@]} - 1))]}"

    echo ${__kunk__}


    : $(( JOBS++ ))

}