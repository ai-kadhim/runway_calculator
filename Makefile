.PHONY: dev build start lint clean install

dev:
	pnpm dev

build:
	pnpm build

start:
	pnpm start

lint:
	pnpm lint

clean:
	rm -rf .next node_modules

install:
	pnpm install
