const { response } = require('express');
const express = require('express');
const server = express();
let highscoreList = [];

server.get('/', express.json(), (request, response) => {
    response.sendFile(__dirname + '/highscore.html');
});

server.get('/highscores', express.json(), (request, response) => {
    response.set('Content-type: application/json');
    response.json(highscoreList);
});

server.delete('/highscores', express.json(), (request, response) => {
    highscoreList = [];
    response.sendStatus(200);
});

server.post('/highscore', express.json(), (request, response) => {
    let jsonObj = request.body;
    let allowHighscore = false;
    if (jsonObj.score > 0) {
        if (highscoreList.length == 10) {
            for (let i = 0; i < highscoreList.length; i++) {
                if (highscoreList[i].score < jsonObj.score) {
                    allowHighscore = true;
                }
            }
            if (allowHighscore) {
                highscoreList.pop();
                highscoreList.push(jsonObj);
                response.sendStatus(201);
            }
        } else {
            highscoreList.push(jsonObj);
            response.sendStatus(201);
        }
        highscoreList.sort((a, b) => b.score - a.score);
        response.sendStatus(400);
    } else {
        response.sendStatus(400);
    }
});

server.listen(8080);

