# Molfar Vertep in a container.
#
#   docker compose up -d        (see docker-compose.yml)
#
# Settings and data live in the /molfar-vertep volume: config.yaml, data/.
# (1.7.x and older used /chrysalis; docker/entrypoint.sh still honours a volume mounted there.)
# Every setting can also be passed as a MOLFAR_VERTEP_* environment variable.

# The engine is compiled on the build machine's own architecture for the
# image's target (Bun cross-compiles), so multi-arch images need no emulation.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.0 AS build
ARG TARGETARCH
ARG MOLFAR_VERTEP_VERSION=
WORKDIR /src
COPY package.json bun.lock bunfig.toml ./
COPY client-agent/package.json client-agent/bun.lock client-agent/
RUN bun install --frozen-lockfile && cd client-agent && bun install --frozen-lockfile
COPY . .
RUN arch=$([ "$TARGETARCH" = "arm64" ] && echo arm64 || echo x64) \
 && MOLFAR_VERTEP_VERSION="$MOLFAR_VERTEP_VERSION" bun run dist "linux-$arch" --no-archive \
 && mkdir /out && mv out/dist/Molfar-Vertep-*-linux-$arch/* /out/

FROM debian:bookworm-slim
# ca-certificates for model providers over HTTPS; git lets apps come from SSH remotes
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates git \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --uid 1000 molfar \
 && mkdir /molfar-vertep && chown molfar /molfar-vertep
COPY --from=build /out /opt/molfar-vertep
COPY docker/entrypoint.sh /opt/molfar-vertep/entrypoint.sh
RUN chmod 755 /opt/molfar-vertep/entrypoint.sh
USER molfar
ENV MOLFAR_VERTEP_HOME=/molfar-vertep \
    MOLFAR_VERTEP_CONTAINER=1 \
    MOLFAR_VERTEP_LAN=true \
    MOLFAR_VERTEP_OPEN_BROWSER=false
VOLUME /molfar-vertep
EXPOSE 8788
STOPSIGNAL SIGTERM
ENTRYPOINT ["/opt/molfar-vertep/entrypoint.sh"]
