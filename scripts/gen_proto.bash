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

write_definitions() {
  JSON_PATH=$1
  DEFS_PATH=$2
  INTERFACES_PATH=$3

  echo "Generated json, $(cat $JSON_PATH | wc -l) lines."
  echo "/* tslint:disable:trailing-comma */" > $DEFS_PATH
  echo "/* tslint:disable:quotemark */" >> $DEFS_PATH
  echo "/* tslint:disable:max-line-length */" >> $DEFS_PATH
  echo "export const PROTO_DEFINITIONS = $(cat ${JSON_PATH});" >> $DEFS_PATH

  cat $JSON_PATH | node ./scripts/gen_typings.js > $INTERFACES_PATH
}

set -e
./node_modules/protobufjs/bin/pbjs \
  -p ${GOPATH}/src \
  -t json \
  ./proto/grpc-bus.proto > \
  ${JSON_OUTPUT_PATH}

write_definitions ${JSON_OUTPUT_PATH} \
  ./src/proto/definitions.ts \
  ./src/proto/interfaces.ts
rm ${JSON_OUTPUT_PATH} || true

# Generate mocks
./node_modules/protobufjs/bin/pbjs \
  -p ${GOPATH}/src \
  -t json \
  ./proto/mock.proto > \
  ${JSON_OUTPUT_PATH}
write_definitions ${JSON_OUTPUT_PATH} \
  ./src/mock/definitions.ts \
  ./src/mock/interfaces.ts
rm ${JSON_OUTPUT_PATH} || true
