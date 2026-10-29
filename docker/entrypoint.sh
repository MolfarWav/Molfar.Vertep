#!/bin/sh
# Starts Molfar Vertep in the container. Up to 1.7.x the volume was /chrysalis;
# a setup that still mounts its data there keeps working, with a note to move the mount.
if [ ! -e /molfar-vertep/config.yaml ] && [ -e /chrysalis/config.yaml ]; then
  export MOLFAR_VERTEP_HOME=/chrysalis
  echo "Molfar Vertep: your data is mounted at /chrysalis. Mount it at /molfar-vertep instead (see docker-compose.yml); /chrysalis still works for now." >&2
fi
exec /opt/molfar-vertep/molfar-vertep "$@"
