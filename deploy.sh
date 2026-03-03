#!/bin/bash
solana program close GULCuZrm3VWkzH5nwU1p9XxdmuNw4GBvVnp42nxZZYVS --url devnet
while true; do
  solana program deploy ./target/deploy/ajo.so --url devnet --max-sign-attempts 500
  if [ $? -eq 0 ]; then
    break
  fi
  # extract the leaked buffer if needed, wait no, let's just let it retry with the normal tool. Actually `solana program deploy` handles buffer resumption automatically if we pass the buffer keypair, but we don't have it saved unless we recover it.
  # Let's just run it again.
  sleep 2
done
