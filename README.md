# Workflows

This repo contains the reusable workflows used by many of the app repos throughout AAF.

## Distribution

This repo contains a directory of files in `.github/workflows/distributions`, When a repo is in the list managed by AAF terraform or rather the github var `RENOVATE_REPOSITORIES` then bootstrapping begins on each master merge of this repo and will provisions files found in the above folder according to the following conventions;

* If it contains `#ONCE#`, the file will only ever be added once, if its already found then nothing is done
* If it contains `#PARTIAL#`, the file assumes that from top fo the file down to the last line will be replaced in the source repo if it exists, otherwise it is just added verbatim
* If none of these apply it simply is added.
* If a file is removed from `.github/workflows/distributions` a pr is created to remove it

Notes for when adding new files to be bootstrapped, support new repos,

* Due to how partials work it may create a pr that removes required lines i.e ordering of gitignore's, simply adjust the PR manually and add these lines BELOW the last untouched line and it should not be an issue moving forward
