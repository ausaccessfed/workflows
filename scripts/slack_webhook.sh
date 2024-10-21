#!/bin/bash

TITLES=$1
TITLE="$(echo "$TITLES" | tr '()' '  ' | tr '"' "'" | cut -d',' -f0 || echo "Title missing!!!")"

WEBHOOK=$2
REPOSITORY=$3
RUN_ID=$4
TESTING=$5
json="{
        \"attachments\": [{
        \"color\": \"#f4c030\",
        \"blocks\": [
        {
            \"type\": \"header\",
            \"text\": {
                \"type\": \"plain_text\",
                \"text\": \"$TITLE\",
                \"emoji\": true
            }
        }"
if [ "$TESTING" = "true" ]; then
    echo "testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas
testinggasdsadsadsadsadasdasdasdas" >chunk_aa

fi

json="$json,
        {
            \"type\": \"section\",
            \"text\": {
                \"type\": \"mrkdwn\",
                \"text\": \"Please review run at\"
            },
            \"accessory\": {
                \"type\": \"button\",
                \"text\": {
                    \"type\": \"plain_text\",
                    \"text\": \"$TITLE\",
                    \"emoji\": true
                },
                \"value\": \"click_me_123\",
                \"url\": \"https://github.com/$REPOSITORY/actions/runs/$RUN_ID}\",
                \"action_id\": \"button-action\"
            }
        }"
json="$json
        ]
    }"

for chunk in chunk_*; do
    file_index=$(echo "$chunk" | cut -d'_' -f2)
    # 1 is start of lists in bash
    file_index=$((file_index + 1))
    part=$(echo "$chunk" | cut -d'_' -f3)
    TITLE="$(echo "$TITLES" | tr '()' '  ' | tr '"' "'" | cut -d',' -f$file_index || echo "Title missing!!!")"

    json="$json,
        {
            \"color\": \"#f4c030\",
            \"text\": \"$TITLE (part $part)\"
        },
        {
            \"color\": \"#f4c030\",
            \"text\": \"\`\`\`$(cat "$chunk")\`\`\`\"
        }"
done

json="$json
    ]
}"

if [ "$TESTING" = "true" ]; then
    rm chunk_aa
    echo "$json"
fi
curl -H 'Content-Type: application/json' -X POST -d "$json" "$WEBHOOK"
