#!/bin/bash

if [ -z "$1" ]
    then
    echo "Error: No GAME_KEY given."
    exit 0
fi

if [ -z "$2" ]
    then
    echo "Error: No ADMIN_SECRET given."
    exit 0
fi

export GAME_KEY=$1
echo "Set GAME_KEY to $1"
echo $GAME_KEY

export ADMIN_SECRET=$2
echo "Set ADMIN_SECRET to $2"
echo $ADMIN_SECRET