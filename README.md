# Workflows

This repo contains the reusable workflows used by many of the app repos throughout AAF.

## Distribution

This repo contains a directory of files in `.github/workflows/distributions`, When a repo is in the list managed by AAF terraform or rather the github var `RENOVATE_REPOSITORIES` then bootstrapping begins on each master merge of this repo and will provisions files found in the above folder according to the following conventions;

* If it contains `#ONCE#`, the file will only ever be added once, if its already found then nothing is done
* If it contains `#PARTIAL#`, the file assumes that from the top of the file down to the last line will be replaced in the source repo if it exists, otherwise it is just added verbatim
* If it contains `#REPOSITORY_MATCH` then the provided repos are used as a subsetting filter, i.e `#REPOSITORY_MATCH repo1,repo2,repo3 #` will match 3 repos names repo1 repo2 repo3, all other repos will be ignored for said file
* If none of these apply it simply is added.
* If a file is removed from `.github/workflows/distributions` a pr is created to remove it

Notes for when adding new files to be bootstrapped, support new repos,

* Due to how partials work it may create a pr that removes required lines i.e ordering of gitignore's, simply adjust the PR manually and add these lines BELOW the last untouched line and it should not be an issue moving forward

Once a change is merged to any files in the distributions folder, the action should kick off and create prs. to find those prs for approval simply go [here](https://github.com/search?q=org%3Aausaccessfed++is%3Apr+is%3Aopen++Updating+distribution+files&type=pullrequests&p=1) and action the relevant prs

<!--
    TODO: to make sure we dont get duplicates
 -->
