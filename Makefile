IMAGE_NAME:=airpett/diak-timetable-sync
VERSION:=$(shell jq .version package.json -r)

all: run

build:
	docker build -t ${IMAGE_NAME} .

build-travis:
	docker pull ${IMAGE_NAME}:latest
	docker build --pull --cache-from ${IMAGE_NAME}:latest -t ${IMAGE_NAME} .

build-dev:
	docker build -t ${IMAGE_NAME}:dev .

run: build-dev
	docker run -it --rm ${IMAGE_NAME}:dev --mount type=bind,source=$(CREDENTIAL_PATH),target=/credentials airpett/diak-timetable-sync

push: build
	docker login -u $(DOCKER_USERNAME)
	docker tag ${IMAGE_NAME} ${IMAGE_NAME}:latest
	docker tag ${IMAGE_NAME} ${IMAGE_NAME}:${VERSION}
	docker push ${IMAGE_NAME}:latest
	docker push ${IMAGE_NAME}:${VERSION}

push-travis: build-travis
	echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin
	docker tag ${IMAGE_NAME} ${IMAGE_NAME}:latest
	docker tag ${IMAGE_NAME} ${IMAGE_NAME}:${VERSION}
	docker push ${IMAGE_NAME}:latest
	docker push ${IMAGE_NAME}:${VERSION}

push-dev: build-dev
	docker login -u $(DOCKER_USERNAME)
	docker push ${IMAGE_NAME}:dev

.PHONY: build run push push-travis
