#!/usr/bin/env bash
set -e

# host="s3://dev.mockbrian.com"
host="s3://jpeg.zone"

s3cmd sync \
    --no-mime-magic \
    --acl-public \
    --no-progress \
    "site/" \
    "$host/"
