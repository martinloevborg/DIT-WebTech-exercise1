A Highscore Server
==================

Implement a highscore server in Node.js in `server.js`.

Your server should record the (up to) 10 best scores
(in memory - **do not attempt to set up a database**).

Your server should listen on port 8080 and it should support 4 endpoints:
- A GET request to `/` should respond with (the contents of) [highscore.html](highscore.html)
- A GET request to `/highscores` should return a JSON response of the registered highscores:
  ```
  [ { "name"  : "FragMeister", "score" : 770 },
    { "name"  : "Anders And", "score" : 650 },
    { "name"  : "MetteF", "score" : 450 },
    { "name"  : "Jan", "score" : 25 }
  ]
  ```
  The server should respond with at most 10 entries
  and the highscores should be listed in a sorted order (highest score first).

- A DELETE request to `/highscores` should empty the recorded highscore list

- A POST request to `/highscore` with body
  ```
    { "name" : "TonnyRulez", "score" : 330 }
  ```
  should update the server's state and return `201 Created`
  so that a later GET request to `/highscores` includes the score. 
  
  However, POST'ing a zero or negative score or a score too low to make the top-10 list should return a `400 Bad Request`.

  If a POST'ed score is equal to a previous one, the previous one keeps its position and is listed first.  


Example run
-----------

Here is an example of a `curl` interaction:
```
 $ curl http://localhost:8080/highscores
 []
 $ curl -X POST -d '{ "name":"TonnyRulez", "score":220 }' -H "Content-type: application/json" http://localhost:8080/highscore
 $ curl -X POST -d '{ "name":"MetteF", "score":110 }' -H "Content-type: application/json" http://localhost:8080/highscore
 $ curl -X POST -d '{ "name":"Jan", "score":25 }' -H "Content-type: application/json" http://localhost:8080/highscore
 $ curl http://localhost:8080/highscores
 [{"name":"TonnyRulez","score":220},{"name":"MetteF","score":110},{"name":"Jan","score":25}] 
 $ curl -X DELETE http://localhost:8080/highscores
 $ curl http://localhost:8080/highscores
 []
```

Project details
---------------

Install the required packages by running `npm install`.

You are welcome to use additional NPM packages as you see fit.
If your code depends on additional NPM packages, add them to [package.json](package.json)
and commit your changes.

You can test your server implementation by running `npm test`. Your server should be able to start by simply running `node server.js`.

Your server's JSON should also work together with the HTML page [highscore.html](highscore.html) served by `/` on http://localhost:8080/.
