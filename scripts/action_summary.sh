#!/bin/bash

TITLES=$1

for chunk in chunk_*; do
    file_index=$(echo "$chunk" | cut -d'_' -f2)
    # 1 is start of lists in bash
    file_index=$((file_index + 1))
    part=$(echo "$chunk" | cut -d'_' -f3)
    TITLE="$(echo "$TITLES" | tr '()' '  ' | tr '"' "'" | cut -d',' -f$file_index || echo "Title missing!!!")"

    if [ -s "$chunk" ]; then
        # shellcheck disable=SC2129
        echo '<details>' >>"$GITHUB_STEP_SUMMARY"
        echo "<summary>$TITLE (part $part)</summary>" >>"$GITHUB_STEP_SUMMARY"
        echo '  ' >>"$GITHUB_STEP_SUMMARY"
        echo '```' >>"$GITHUB_STEP_SUMMARY"
        # shellcheck disable=SC2005
        echo "$(cat "$chunk")" >>"$GITHUB_STEP_SUMMARY"
        echo '```' >>"$GITHUB_STEP_SUMMARY"
        echo '</details>' >>"$GITHUB_STEP_SUMMARY"
    else
        echo "Output file is empty, skipping summary."
    fi
done
