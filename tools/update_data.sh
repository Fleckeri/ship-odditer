#!/usr/bin/env bash
# Fetch the latest upstream drop data and icons, then rebuild app/data.json, app/targeted/ and the site in docs/.
# Used by the GitHub Actions deploy workflow and for local builds:   tools/update_data.sh
#
# Clones (or fast-forwards) sparse, blobless copies of carpetsage/egg (data folders only) and
# carpetsage/eggincassets (64 px and 128 px icons only) into vendor/. "Data updated" is upstream's commit date.
set -euo pipefail
cd "$(dirname "$0")/.."

sync() {  # sync <repo url> <dir> <sparse paths...>: shallow, blobless, sparse; always the latest commit
  local url=$1 dir=$2; shift 2
  if [ ! -d "$dir/.git" ]; then
    git clone --quiet --depth 1 --filter=blob:none --sparse "$url" "$dir"
    git -C "$dir" sparse-checkout set "$@"
  else
    git -C "$dir" sparse-checkout set "$@"
    git -C "$dir" fetch --quiet --depth 1 origin HEAD
    git -C "$dir" checkout --quiet --detach FETCH_HEAD
  fi
}
sync https://github.com/carpetsage/egg vendor/egg wasmegg/artifact-explorer/data wasmegg/_common/eiafx
sync https://github.com/carpetsage/eggincassets vendor/eggincassets 64/egginc 128/egginc

export DATA_DATE=${DATA_DATE:-$(git -C vendor/egg log -1 --format=%cs)}
export UPSTREAM_COMMIT=$(git -C vendor/egg rev-parse HEAD)
echo "upstream carpetsage/egg ${UPSTREAM_COMMIT:0:8}, data date $DATA_DATE"

python3 tools/build_data.py | grep -E '^(items|targets)'
python3 tools/copy_icons.py
python3 tools/build_pwa.py
