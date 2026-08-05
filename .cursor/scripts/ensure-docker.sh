#!/usr/bin/env bash
set -euo pipefail

if docker info >/dev/null 2>&1; then
  exit 0
fi

if command -v sudo >/dev/null 2>&1; then
  if ! pgrep -x dockerd >/dev/null 2>&1; then
    sudo dockerd >/tmp/dockerd.log 2>&1 &
    for _ in $(seq 1 30); do
      if docker info >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
  fi
  if [[ -S /var/run/docker.sock ]] && ! docker info >/dev/null 2>&1; then
    sudo chmod 666 /var/run/docker.sock || true
  fi
fi

docker info >/dev/null 2>&1
