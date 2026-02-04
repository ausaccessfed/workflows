# Workflows

This repo contains the reusable workflows used by other repos throughout AAF.

## Distribution

Files in `.github/workflows/distributions` are automatically distributed to some other repos.
The list of affected repos is controlled by [aaf-terraform](https://github.com/ausaccessfed/aaf-terraform).

Each master commit to this repo will distribute files from the distributions dir according to the following conventions:

* If it contains `#ONCE#`, the file will only be added once, if it's already found then nothing is done
* If it contains `#PARTIAL#`, the file assumes that from the top of the file down to the last line will be replaced in the source repo if it exists, otherwise it is just added verbatim
* If it contains `#REPOSITORY_MATCH` then the provided repos are used as a subsetting filter, i.e `#REPOSITORY_MATCH repo1,repo2,repo3 #` will match 3 repos names repo1 repo2 repo3, all other repos will be ignored for said file
* If none of these apply it simply is added.
* If a file is removed from `.github/workflows/distributions` a pr is created to remove it

## Supporting new repos

Due to how partials work, it may remove required lines i.e ordering of gitignore's. Adjust the PR manually and add these lines BELOW the last untouched line and it should not be an issue moving forward.
