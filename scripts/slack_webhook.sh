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
    echo "testing" >chunk_aa
fi
for chunk in chunk_*; do
    PART=$((PART + 1))
    json="$json,
    {
        \"type\": \"actions\",
        \"elements\": [
            {
                \"type\": \"button\",
                \"text\": {
                    \"type\": \"plain_text\",
                    \"text\": \"Show Details\"
                },
                \"action_id\": \"show_details\",
                \"value\": \"details\"
            }
        ]
    }"
    # ,
    # {
    #     \"title\": \"Part $PART\",
    #     \"type\": \"rich_text\",
    #     \"elements\": [{
    #         \"type\": \"rich_text_preformatted\",
    #         \"elements\": [{
    #             \"type\": \"text\",
    #             \"text\": \"$(cat "$chunk")\"
    #         }]
    #     }]
    # }"
done

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
        }]
    }"

if [ "$TESTING" = "true" ]; then
    rm chunk_aa
fi

curl -H 'Content-Type: application/json' -X POST -d "$json" "$WEBHOOK"
