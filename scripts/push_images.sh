#!/bin/bash


async "$PRODUCTION_PUSH_COMMAND" "push_production" success error
async "$CACHE_PUSH_COMMAND" "push_cache" success error

wait

echo "Finished!"
