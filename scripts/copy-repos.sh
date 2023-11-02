#!/bin/bash
echo "starting"
export GH_TOKEN="$1"
items=($(gh repo list ausaccessfed -L 100 --json url,defaultBranchRef -t "{{range .}}{{.url}}/archive/refs/heads/{{.defaultBranchRef.name}}.zip {{end}}"))

dir=tmp/repos
mkdir -p $dir
for i in ${items[@]};
do
    repo=$(echo "$i" | cut -d'/' -f 5)
    echo "backing up $repo"
    wget -O $dir/$repo.zip --retry-connrefused --header="Authorization: token ${GH_TOKEN}" --header="Accept:application/vnd.github.v3.raw" $i
done

expected=$(wc -w <<< "${items[@]}")
actual=$(ls -1 $dir | wc -l)
aws s3 sync $dir s3://aaf-archived-repositories

if [ "$actual" != "$expected" ]; then
    echo "ERROR! expected to upload $expected but actually uploaded $actual"
    exit 1;
fi

echo "finished"
