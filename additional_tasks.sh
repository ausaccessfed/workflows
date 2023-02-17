#!/bin/bash
set -e

# DOCKER_BUILDKIT=1 $BUILD_PRODUCTION_COMMAND > build.txt &
echo "$EXTRA_TASK_2"
$EXTRA_TASK_2 > EXTRA_TASK_2.txt &
# [ "$EXTRA_TASK_1" != "" ] && $EXTRA_TASK_1 > EXTRA_TASK_1.txt &
# [ "$EXTRA_TASK_2" != "" ] && $EXTRA_TASK_2 > EXTRA_TASK_2.txt &
# [ "$EXTRA_TASK_3" != "" ] && $EXTRA_TASK_3 > EXTRA_TASK_3.txt &
# [ "$EXTRA_TASK_4" != "" ] && $EXTRA_TASK_4 > EXTRA_TASK_4.txt &
# [ "$EXTRA_TASK_5" != "" ] && $EXTRA_TASK_5 > EXTRA_TASK_5.txt &
# [ "$EXTRA_TASK_6" != "" ] && $EXTRA_TASK_6 > EXTRA_TASK_6.txt &

wait

[ "$LOAD_PRODUCTION_COMMAND" != "" ] && $LOAD_PRODUCTION_COMMAND &

echo "Finished!"
