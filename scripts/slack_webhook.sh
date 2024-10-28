#!/bin/bash

TITLE=$1
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
PART=1
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
    PART=$((PART + 1))
    json="$json,
        {
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

json_file=$(mktemp)
echo "$json" >"$json_file"

curl -H 'Content-Type: application/json' -X POST -d @"$json_file" "$WEBHOOK"
