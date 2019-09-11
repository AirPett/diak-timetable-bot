REPO:=airpett/diak-timetable-sync
TAG:=latest

all: run

build:
	docker build -t ${REPO}:${TAG} .

run: build
	docker run -it --rm ${REPO}:${TAG}

push: build
	docker push ${REPO}:${TAG}

.PHONY: build run push
