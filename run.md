# Run Tutorial - docker

## Replace with latest
```sh
docker build -t szabfun-backend <. replace with the backend dir!>
docker stop szabfun-backendvX.X && docker rm szabfun-backendvX.X
```

## Start the new instance
```sh
docker run -d -p 3000:3000 --name szabfun-backendvX.X szabfun-backend:latest
```