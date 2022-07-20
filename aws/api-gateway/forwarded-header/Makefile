.PHONY: diff
diff:
	earthly -i --allow-privileged +diff

.PHONY: test
# this is supposed to be called by +tester image from ./Earthfile
test:
	curl -s https://postman-echo.com/get/ | jq > direct-echo.json \
		&& curl -s $(GATEWAY_URL) | jq > echo-via-gateway.json \
		&& git diff --no-index direct-echo.json echo-via-gateway.json || true

.PHONY: deploy
.ONESHELL:
deploy:
	earthly -i --allow-privileged +deploy

.PHONY: destroy
destroy:
	earthly --allow-privileged +destroy

.PHONY: clean-deploy
clean-deploy: destroy deploy

## everything below here are helper commands for debugging

.PHONY: cdk
cdk:
	earthly -i +cdk
