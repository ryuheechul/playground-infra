.PHONY: diff
diff:
	earthly -i --allow-privileged +diff

.PHONY: test
# this is supposed to be called by +tester image from ./Earthfile
test:
	curl --request PUT \
		--header "x-api-key: $(GW_API_TOKEN)" \
		--header 'Content-Type: application/json' \
		--data '{"numberToChange":42}' \
		-s $(GATEWAY_URL)

.PHONY: deploy
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

.PHONY: install
install:
	earthly -i +npm-install-local

# to run tests only without actually deploying
.PHONY: deploy-prep
deploy-prep:
	earthly -i --allow-privileged +deploy-prep
