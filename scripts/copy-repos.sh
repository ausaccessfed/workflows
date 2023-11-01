#!/bin/bash
token=$1
items=($(gh repo list ausaccessfed -L 100 --json url,defaultBranchRef -t "{{range .}}{{.url}}/archive/refs/heads/{{.defaultBranchRef.name}}.zip {{end}}"))

mkdir -p tmp/repos
for i in ${items[@]};
do
    repo=$(echo "$i" | cut -d'/' -f 5)
    wget -O tmp/repos/$repo.zip --header="Authorization: token ${token}" --header="Accept:application/vnd.github.v3.raw" $i 
done

aws-vault exec shared_services -- aws s3 sync tmp/repos s3://aaf-archived-repositories
