#!/bin/bash

set -e

echo Importing trusted keys...
for file in trusted_keys/*.gpg; do
  echo "  $file"
  gpg --import "$file" 2>&1 | sed 's/^/    /'
done
printf "Done\n\n"

echo "Verifying commit signature..."
git verify-commit HEAD
