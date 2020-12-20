default:
	npm install

lint:
	npm lint

clean:
	rm -rf node_modules
	npm cache verify
	npm install

start:
	npm start

build:
	npm build

deploy:
	npm run build
	npm run theme-deploy

deploy-prod:
	npm run build
	npm run theme-deploy:production
