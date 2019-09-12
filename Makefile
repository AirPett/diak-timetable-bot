IMAGE_NAME:=airpett/diak-timetable-sync
VERSION:=$(shell jq .version package.json -r)

all: run

build:
	docker build -t ${IMAGE_NAME} --build-arg arch=$(ARCH) .

build-travis:
	docker run --rm --privileged multiarch/qemu-user-static:register --reset
	docker run -t --rm multiarch/debian-debootstrap:armhf-jessie uname -a
	docker pull ${IMAGE_NAME}:latest-$(ARCH) || true
	docker build --pull --cache-from ${IMAGE_NAME}:latest-$(ARCH) -t ${IMAGE_NAME} --build-arg arch=$(ARCH) .
	docker images

build-dev:
	docker build -t ${IMAGE_NAME}:dev-$(ARCH) --build-arg arch=$(ARCH) .

run: build-dev
	docker run -it --rm --mount type=bind,source=$(CONFIG_PATH),target=/config ${IMAGE_NAME}:dev-$(ARCH)

push: build
	docker login -u $(DOCKER_USERNAME)
	docker tag ${IMAGE_NAME} ${IMAGE_NAME}:latest-$(ARCH)
	docker tag ${IMAGE_NAME} ${IMAGE_NAME}:${VERSION}-$(ARCH)
	docker push ${IMAGE_NAME}:latest-$(ARCH)
	docker push ${IMAGE_NAME}:${VERSION}-$(ARCH)

push-travis: build-travis
	echo "${DOCKER_PASSWORD}" | docker login -u ${DOCKER_USERNAME} --password-stdin
	docker tag ${IMAGE_NAME} ${IMAGE_NAME}:latest-$(ARCH)
	docker tag ${IMAGE_NAME} ${IMAGE_NAME}:${VERSION}-$(ARCH)
	docker push ${IMAGE_NAME}:latest-$(ARCH)
	docker push ${IMAGE_NAME}:${VERSION}-$(ARCH)

push-dev: build-dev
	docker login -u $(DOCKER_USERNAME)
	docker push ${IMAGE_NAME}:dev-$(ARCH)

.PHONY: build build-travis build-dev run push push-travis push-dev
