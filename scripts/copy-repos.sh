#!/bin/bash

set -e

echo "starting"
export GH_TOKEN="$1"
items=($(gh repo list ausaccessfed -L 100 --json url,defaultBranchRef -t "{{range .}}{{.url}}/{{.defaultBranchRef.name}} {{end}}"))

dir="$PWD/tmp/repos"
zip_dir="$PWD/$dir/zips"
mkdir -p "$dir" "$zip_dir"

git config --global gc.auto 0

for i in "${items[@]}"; do
    repo=$(echo "$i" | cut -d'/' -f 5)
    defaultBranchRef=$(echo "$i" | cut -d'/' -f 6)
    repoFolder="$dir/$repo"
    if [ -d "$repoFolder" ]; then
        echo "Pulling $repo"
        cd "$repoFolder"
        git fetch origin "$defaultBranchRef" && git reset --hard "$defaultBranchRef"
        cd "$dir"
    else
        echo "Repo not found cloning $repo"
        git clone -b "$defaultBranchRef" "https://${GH_TOKEN}@github.com/ausaccessfed/${repo}.git" "$repoFolder"
    fi
    echo "backing up $repo"
    cd "$repoFolder"
    zip -qr "$zip_dir/$repo.zip" .
    cd "$dir"
done

find "$zip_dir" -type f -size 0 -delete
expected=$(wc -w <<<"${items[@]}")
actual=$(ls -1 "$zip_dir" | wc -l)
aws s3 sync "$zip_dir" s3://aaf-archived-repositories

rm -rf "$zip_dir"

if [ "$actual" != "$expected" ]; then
    echo "ERROR! expected to upload $expected but actually uploaded $actual"
    exit 1
fi

echo "finished"
