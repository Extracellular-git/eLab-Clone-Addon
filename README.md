# eLab-Clone-Addon
This is the git repo for Extracellular's bulk clone button addon, it's designed to allow users to clone individual samples once in bulk. It goes through the following name transformation through its lineage:

cell sample -> cell sample (cloned) -> cell sample (cloned) 1 ... N

The button can be found in the inventory / sample browser once at least one sample has been selected

---

To get started you must:
1. Install NodeJS with a version >= 16
2. npm install http-server -g (can add sudo on the front)
3. Get OpenSSL, they ask for a specific version but I got a different one (check [here](https://developer.elabnext.com/docs/getting-started))
4. run to generate keys:
```
$ req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 10000 –nodes
```
5. then make start-up script executable:
```
chmod +x SDK-server.sh
```
6. And you can run the server with:
```
./SDK-server.sh
```

NOTE: ALSO MIGHT NEED TO GENERATE OWN GIT PERSONAL ACCESS TOKEN
