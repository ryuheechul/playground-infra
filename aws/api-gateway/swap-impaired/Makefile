.PHONY: diff-reset
diff-reset:
	earthly -i --allow-privileged +diff --CDK_CTX_BRANCH=reset

.PHONY: diff-naive-0
diff-naive-0:
	earthly -i --allow-privileged +diff --CDK_CTX_BRANCH=naive --CDK_CTX_STAGE=0
.PHONY: diff-naive-1
diff-naive-1:
	earthly -i --allow-privileged +diff --CDK_CTX_BRANCH=naive --CDK_CTX_STAGE=1

.PHONY: diff-surgery-0
diff-surgery-0:
	earthly -i --allow-privileged +diff --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=0
.PHONY: diff-surgery-1
diff-surgery-1:
	earthly -i --allow-privileged +diff --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=1
.PHONY: diff-surgery-2
diff-surgery-2:
	earthly -i --allow-privileged +diff --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=2
.PHONY: diff-surgery-3
diff-surgery-3:
	earthly -i --allow-privileged +diff --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=3
.PHONY: diff-surgery-4
diff-surgery-4:
	earthly -i --allow-privileged +diff --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=4

.PHONY: _test
_test:
	sleep 1 && curl -s -o /dev/null -w "%{http_code}\n" $(GATEWAY_URL)
	sleep 1 && curl -s -o /dev/null -w "%{http_code}\n" $(GATEWAY_URL)
	sleep 1 && curl -s -o /dev/null -w "%{http_code}\n" $(GATEWAY_URL)
	sleep 1 && curl -s -o /dev/null -w "%{http_code}\n" $(GATEWAY_URL)
	sleep 1 && curl -s -o /dev/null -w "%{http_code}\n" $(GATEWAY_URL)

.PHONY: test
# this is supposed to be called by +tester image from ./Earthfile
# workaround the absence of ! with https://stackoverflow.com/a/44324918/1570165
# I think bash really need something like `not` - https://stackoverflow.com/a/367167/1570165
test:
	$(shell echo "reset-0\nsurgery-2" | grep "$(CDK_BRANCH_STAGE)" > /dev/null)
	test $(.SHELLSTATUS) -ne 0 && $(MAKE) _test || echo "skip tests for $(CDK_BRANCH_STAGE)"

.PHONY: deploy-reset
deploy-reset:
	earthly -i --allow-privileged +deploy --CDK_CTX_BRANCH=reset

.PHONY: deploy-naive-0
deploy-naive-0:
	earthly -i --allow-privileged +deploy --CDK_CTX_BRANCH=naive --CDK_CTX_STAGE=0
.PHONY: deploy-naive-1
deploy-naive-1:
	earthly -i --allow-privileged +deploy --CDK_CTX_BRANCH=naive --CDK_CTX_STAGE=1

.PHONY: deploy-naive-all
deploy-naive-all:
	$(MAKE) deploy-naive-0 && $(MAKE) deploy-naive-1

.PHONY: deploy-surgery-0
deploy-surgery-0:
	earthly -i --allow-privileged +deploy --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=0
.PHONY: deploy-surgery-1
deploy-surgery-1:
	earthly -i --allow-privileged +deploy --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=1
.PHONY: deploy-surgery-2
deploy-surgery-2:
	earthly -i --allow-privileged +deploy --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=2
.PHONY: deploy-surgery-3
deploy-surgery-3:
	earthly -i --allow-privileged +deploy --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=3
.PHONY: deploy-surgery-4
deploy-surgery-4:
	earthly -i --allow-privileged +deploy --CDK_CTX_BRANCH=surgery --CDK_CTX_STAGE=4

.PHONY: deploy-surgery-all
deploy-surgery-all:
	$(MAKE) deploy-surgery-0 && $(MAKE) deploy-surgery-1 && $(MAKE) deploy-surgery-2 && $(MAKE) deploy-surgery-3 && $(MAKE) deploy-surgery-4

.PHONY: destroy
destroy:
	earthly --allow-privileged +destroy


.PHONY: clean-deploy
clean-deploy: destroy deploy-naive-0

## everything below here are helper commands for debugging

.PHONY: cdk
cdk:
	earthly -i +cdk

.PHONY: install
install:
	earthly -i +npm-install-local
