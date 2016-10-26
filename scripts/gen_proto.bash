#!/bin/bash
JSON_OUTPUT_PATH=./.tmp.json

if [ ! -d "./scripts" ]; then
  if [ -n "$ATTEMPTED_CD_DOTDOT" ]; then
    echo "You need to run this from the root of the project."
    exit 1
  fi
  set -e
  cd ../ && ATTEMPTED_CD_DOTDOT=yes $@
  exit 0
fi

set -e
./node_modules/protobufjs/bin/pbjs \
  -p ${GOPATH}/src \
  -t json \
  ./proto/**/*.proto > \
  ${JSON_OUTPUT_PATH}
echo "Generated json, $(cat $JSON_OUTPUT_PATH | wc -l) lines."

echo "/* tslint:disable:trailing-comma */" > ./src/proto/definitions.ts
echo "/* tslint:disable:quotemark */" >> ./src/proto/definitions.ts
echo "/* tslint:disable:max-line-length */" >> ./src/proto/definitions.ts
echo "export const PROTO_DEFINITIONS = $(cat ${JSON_OUTPUT_PATH});" >> ./src/proto/definitions.ts

cat $JSON_OUTPUT_PATH | node ./scripts/gen_typings.js > ./src/proto/interfaces.ts

rm ${JSON_OUTPUT_PATH} || true
