#!/bin/bash

echo "Touching up reference to es6-promise..."
echo " -> https://github.com/apollostack/apollo-client/issues/861"
sed -i -e '/es6-promise/d' ./lib/**/*.d.ts
