#!/usr/bin/env bash
echo "Generating candid for $canister"

set -e
CANISTERS="$1"

function generate_did() {
  local canister=$1
  canister_root="src/$canister"


  cargo build --manifest-path="$canister_root/Cargo.toml" \
      --target wasm32-unknown-unknown \
      --release --package "$canister" 

  candid-extractor "target/wasm32-unknown-unknown/release/$canister.wasm" > "$canister_root/$canister.did" 

  ic-wasm "target/wasm32-unknown-unknown/release/$canister.wasm" \
      -o "target/wasm32-unknown-unknown/release/$canister.wasm" \
      metadata candid:service -v public -f "$canister_root/$canister.did"
}


for canister in $(echo $CANISTERS | sed "s/,/ /g")
do
    generate_did "$canister"
done

dfx generate 