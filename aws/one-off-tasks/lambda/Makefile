.PHONY: tests
tests: test-update-record

.PHONY: test-update-record
test-update-record: build run-update-record down

.PHONY: build
build:
	docker-compose -f ./docker-compose.tests.yml build

.PHONY: run-update-record
run-update-record:
	docker-compose -f ./docker-compose.tests.yml run update-record

.PHONY: down
down:
	docker-compose -f ./docker-compose.tests.yml down
