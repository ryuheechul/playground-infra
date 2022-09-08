.PHONY: tests
tests: test-update-record

.PHONY: test-update-record
test-update-record: build run-update-record down

.PHONY: build
build:
	docker-compose -f ./tests/docker-compose.yml build

.PHONY: run-update-record
run-update-record:
	docker-compose -f ./tests/docker-compose.yml run update-record

.PHONY: down
down:
	docker-compose -f ./tests/docker-compose.yml down
