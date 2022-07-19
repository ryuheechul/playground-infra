# assumes that DATADOG_API_KEY is exported

.PHONY: up
up: down
	docker compose build && docker compose up -d && docker compose logs -f reverse-proxy

.PHONY: down
down:
	docker compose down

# TODO: add this also into docker-compose.yml?
.PHONY: dd
dd:
	docker run --rm --name datadog-agent \
           --cgroupns host \
           -e DD_API_KEY=$(DATADOG_API_KEY) \
           -e DD_LOGS_ENABLED=true \
           -e DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true \
           -e DD_LOGS_CONFIG_DOCKER_CONTAINER_USE_FILE=true \
           -e DD_CONTAINER_EXCLUDE="name:datadog-agent" \
           -v /var/run/docker.sock:/var/run/docker.sock:ro \
           -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
           -v /opt/datadog-agent/run:/opt/datadog-agent/run:rw \
           gcr.io/datadoghq/agent:latest
