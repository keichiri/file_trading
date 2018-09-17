const express = require("express");
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const ecies = require('eth-ecies');
const ipfsAPI = require('ipfs-api');
const cors = require('cors');
const bodyparser = require('body-parser');


const directoryPath = process.env.DIRECTORY_PATH;
if (!directoryPath) {
    throw new Error("DIRECTORY_PATH environment variable is missing");
}

if (!fs.existsSync(directoryPath)) {
    throw new Error("DIRECTORY_PATH specifies nonexistant path");
}

const ipfs = ipfsAPI('localhost', 5001, {protocol: 'http'});

let app = express();
// app.use(function (req, res, next) {
//     res.setHeader('Access-Control-Allow-Origin', 'http://localhost:10000');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
//     res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
//     res.setHeader('Access-Control-Allow-Credentials', true);
//     next();
// });
app.use(cors({credentials: true, origin: true}));

app.use(bodyparser.json());

app.get("/files", function(req, res) {
    fs.readdir(directoryPath, function(error, files) {
        if (error) {
            res.status(500);
            res.send({error: error});
        } else {
            res.send({files: files});
        }
    });
});


app.get("/:fileName", function(req, res) {
    let fileName = req.params.fileName;
    let filePath = path.join(directoryPath, fileName);
    fs.readFile(filePath, function(error, fileContent) {
        if (error) {
            if (error.code === "ENOENT") {
                res.status(400);
                res.send({error: "no such file"})
            } else {
                res.status(500);
                res.send({error: error});
            }
        } else {
            if (req.query.hash) {
                let fileHash = calculateHash(fileContent);
                res.send({fileHash: fileHash});
            } else {
                res.send({fileContent: fileContent});
            }
        }
    });
});


app.post("/encrypt_and_publish", function(req, res) {
    let publicKey = req.body.publicKey;
    let filePath = path.join(directoryPath, req.body.fileName);
    console.log(`Name: ${req.body.fileName}`);
    console.log(`Key: ${req.body.publicKey}`);
    fs.readFile(filePath, function(error, fileContent) {
        if (error) {
            if (error.code === "ENOENT") {
                res.status(400);
                res.send({error: "no such file"});
            } else {
                res.status(500);
                res.send({error: error});
            }
        } else {
            encryptAndPublish(req, res, fileContent, publicKey);
        }
    })
});


function encryptAndPublish(req, res, fileContent, publicKey) {
    console.log(`Encrypting...\n`);
    let encryptedContent;
    try {
        encryptedContent = ecies.encrypt(new Buffer(publicKey, 'base64'), fileContent);
    } catch(err) {
        res.status(400);
        res.send({error: "invalid public key"});
    }
    console.log(`Publishing...\n`);

    ipfs.add(encryptedContent, function(error, files) {
        if (error) {
            req.status(500);
            res.send({error: "Failed ot publish file"});
        } else {
            res.send({fileHash: files[0].hash});
        }
    });
}


function calculateHash(data) {
    let hasher = crypto.createHash('sha256');
    hasher.update(data, 'binary');
    return hasher.digest('base64');
}


app.listen(10000);