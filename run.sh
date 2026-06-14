#!/bin/bash
set -e

D="$(pwd)/data"
L="$(pwd)/local_data"

case "$1" in
  build_generator)   docker build -t city-generator ./generator ;;
  build_reporter)    docker build -t city-reporter ./reporter ;;
  run_generator)     mkdir -p "$D" && docker run --rm -v "$D":/data city-generator ;;
  run_reporter)      mkdir -p "$D" && docker run --rm -v "$D":/data city-reporter ;;
  create_local_data) mkdir -p "$L" && docker run --rm -v "$L":/data city-generator ;;
  clear_data)        rm -f "$D"/*.csv "$D"/*.html && echo "data/ очищена" ;;
  inside_generator)  mkdir -p "$D" && docker run --rm --entrypoint sh -v "$D":/data city-generator -c "ls -la /data" ;;
  inside_reporter)   mkdir -p "$D" && docker run --rm --entrypoint sh -v "$D":/data city-reporter  -c "ls -la /data" ;;
  structure)         find . -not -path '*/.git/*' -not -path '*/node_modules/*' | sort ;;
  report_server)
    mkdir -p "$D"
    docker run -d --rm --name report-server \
      -v "$D":/usr/share/nginx/html:ro \
      -v "$(pwd)/reporter/default.conf":/etc/nginx/conf.d/default.conf:ro \
      -p 8080:80 nginx:alpine
    echo "http://localhost:8080"
    ;;
  *) echo "build_generator | run_generator | create_local_data | build_reporter | run_reporter | structure | clear_data | inside_generator | inside_reporter | report_server" ;;
esac