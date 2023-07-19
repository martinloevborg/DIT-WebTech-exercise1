import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const expect = chai.expect;

// @ts-ignore
import forever from 'forever-monitor';
import fc, { Arbitrary, AsyncCommand } from 'fast-check';

fc.configureGlobal({
  interruptAfterTimeLimit: 150000, // raise Mocha timeout from 2000ms
  markInterruptAsFailure: true,  // timeout during regular (non-shrink) test is marked as an error
});

const child = new (forever.Monitor)('server.js', { max: 1, silent: true });
// @ts-ignore
child.on('start', () => console.log('Starting server.js up'));
// @ts-ignore
child.on('error', () => console.log('Error from server.js'));
// @ts-ignore
child.on('exit', () => console.log('Shutting server.js down again'));

before(done => { child.start(); setTimeout(done, 300) })
// @ts-ignore
after(() => { if (child.running) child.stop() });

/* *************************************************************** */
/* ***********************   Unit tests   ************************ */
/* *************************************************************** */

describe('GET /', () =>
  it('responds with HTML', () =>
    chai.request('http://localhost:8080')
    .get('/')
    .then(res => {
        expect(res).to.have.status(200);
        expect(res).to.be.html;
    })
    .catch(err => { throw err; })
  )
);

describe('POST /highscore', () => {
  it('responds with 201 Created', () =>
    chai.request('http://localhost:8080')
    .post('/highscore')
    .send({ 'name': 'TonnyRulez', 'score': 123 })
    .set('Content-Type', 'application/json')  
    .then(res => expect(res).to.have.status(201))
    .catch(err => { throw err })
  );
  it('rejects score of 0 with 400 Bad Request', () =>
    chai.request('http://localhost:8080')
    .post('/highscore')
    .send({ 'name': 'SonnyZero', 'score': 0 })
    .set('Content-Type', 'application/json')
    .then(res => expect(res).to.have.status(400))
    .catch(err => { throw err })
  );
  it('rejects a negative score with 400 Bad Request', () =>
    chai.request('http://localhost:8080')
    .post('/highscore')
    .send({ 'name': 'SubZero-Svend', 'score': -120 })
    .set('Content-Type', 'application/json')
    .then(res => expect(res).to.have.status(400))
    .catch(err => { throw err })
  );
  it('accepts another 9 positive scores', () => {
    let reqs = [];
    for (let i=1; i<=9; i++) {
      reqs.push(
        chai.request('http://localhost:8080')
        .post('/highscore')
        .send({ 'name': `Finn${i}`, 'score': i * 100 })
        .set('Content-Type', 'application/json')  
        .then(res => expect(res).to.have.status(201)))
    };
    return Promise.all(reqs)
    .catch(err => { throw err })
  });
  it('rejects an 11th request with a too low score', () => {
    chai.request('http://localhost:8080')
    .post('/highscore')
    .send({ 'name': 'GamerGeorg', 'score': 50 })
    .set('Content-Type', 'application/json')  
    .then(res => expect(res).to.have.status(400))
    .catch(err => { throw err })
  });
  it('accepts a 12th request with a duplicate score', () => {
    chai.request('http://localhost:8080')
    .post('/highscore')
    .send({ 'name': 'FraggerFanny', 'score': 700 })
    .set('Content-Type', 'application/json')  
    .then(res => expect(res).to.have.status(201))
    .catch(err => { throw err })
  });
})

describe('GET /highscores', () => {
  it('responds with JSON', () =>
    chai.request('http://localhost:8080')
    .get('/highscores')
    .then(res => {
      expect(res).to.have.status(200);
      expect(res).to.be.json;
    })
    .catch(err => { throw err })
  );
  it('responds with a correct array of length 10', () =>
    chai.request('http://localhost:8080')
    .get('/highscores')
    .then(res => {
      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.a('array');
      expect(res.body.length).to.equal(10);
      const scores = [900,800,700,700,600,500,400,300,200,123];
      const names = ['Finn9','Finn8','Finn7','FraggerFanny','Finn6','Finn5','Finn4','Finn3','Finn2','TonnyRulez'];
      for(let i in scores) {
        expect(res.body[i].score).to.equal(scores[i]);
        expect(res.body[i].name).to.equal(names[i]);
      }
    })
    .catch(err => { throw err })
  );
});

describe('DELETE /highscores', () => {
  it('responds with 200 OK', () =>
    chai.request('http://localhost:8080')
    .delete('/highscores')
    .then(res => expect(res).to.have.status(200))
    .catch(err => { throw err })
  );

  it('resets highscores', () =>
    chai.request('http://localhost:8080')
    .delete('/highscores')
    .then(res => {
      expect(res).to.have.status(200);
      chai.request('http://localhost:8080')
      .get('/highscores')
      .then(res => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body.length).to.equal(0);
      })
      .catch(err => { throw err });
    })
    .catch(err => { throw err })
  )
})

/* *************************************************************** */
/* *********************  Model-based tests  ********************* */
/* *************************************************************** */

const CMDSLEEPTIME = 100;
const MAXCOMMANDS = 50;
const NUMRUNS = 25;

type model = { count : number, entries : Map<number, string[]> }

function entriesInOrder(map : Map<number, string[]>): [number,string[]][] {
  let all = [];
  for (let e of map.entries()) { all.push(e); }
  return all.sort((a, b) => b[0] - a[0]);
}

class GetHighscoresCmd implements AsyncCommand<model,ChaiHttp.Agent> {
    constructor() {}
    check = (_ : Readonly<model>) => true;
    async run(m : model, request : ChaiHttp.Agent) {
        await new Promise((resolve,reject) => {
        //process.stdout.write(this.toString());
        request//('http://localhost:8080')
          .get('/highscores')
          .then(res => {
            try {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.a('array');
              let expectedsize = Math.min(m.count,10);
              expect(res.body.length).to.equal(expectedsize);

              let myentries = [];
              for (let [score,names] of entriesInOrder(m.entries)) {
                for (let name of names) {
                  myentries.push({ score: score, name: name });
                }
              }
              for (let i = 0; i<expectedsize; i++) {
                let entry = res.body[i];
                expect(entry.score).to.equal(myentries[i].score);
                expect(entry.name).to.equal(myentries[i].name);
              }
              setTimeout(resolve,CMDSLEEPTIME);
            } catch (e) { reject(e) }
          })
        })
    };
    toString = () => '\n GET /highscores';
}

class PostHighscoreCmd implements AsyncCommand<model,ChaiHttp.Agent> {
    readonly score : number;
    readonly name : string;
    constructor(score : number, name : string) { this.score = score; this.name = name }
    check = (_ : Readonly<model>) => true;
    async run(m : model, request : ChaiHttp.Agent) {
        await new Promise((resolve,reject) => {
        //process.stdout.write(this.toString());
        request//('http://localhost:8080')
          .post('/highscore')
          .send(JSON.stringify({ name: this.name, score: this.score }))
          .set('Content-Type', 'application/json')
          .then(res => {
            try {
              if (this.score > 0) {
                let size = 0;
                let minScore = Infinity; //minScore  (to make the top-10)
                for (let [score,names] of entriesInOrder(m.entries)) {
                  if (score < minScore && size < 10) { minScore = score; }
                  size = size + names.length;
                }
                if (m.count >= 10 && this.score <= minScore) {
                  expect(res).to.have.status(400);
                } else {
                  expect(res).to.have.status(201);
                  //update model
                  let oldnames = m.entries.get(this.score) || [];
                  m.entries.entries;
                  oldnames.push(this.name);
                  m.entries.set(this.score,oldnames)
                  m.count = m.count + 1;
                }
              } else {
                expect(res).to.have.status(400);
              }
              setTimeout(resolve,CMDSLEEPTIME);
            } catch (e) { reject(e) }
          })
      })
    };
    toString = () => `\n POST /highscores { name: "${this.name}", score: ${this.score} }`;
  }

  class DeleteHighscoresCmd implements AsyncCommand<model,ChaiHttp.Agent> {
    constructor() {}
    check = (_ : Readonly<model>) => true;
    async run(m : model, request : ChaiHttp.Agent) {
        await new Promise((resolve,reject) => {
        //process.stdout.write(this.toString());
        request//('http://localhost:8080')
          .delete('/highscores')
          .then(res => {
            try {
              expect(res).to.have.status(200);
              m.count = 0;
              m.entries.clear();
              setTimeout(resolve,CMDSLEEPTIME);
            } catch (e) { reject(e) }
          })
        })
    };
    toString = () => '\n DELETE /highscores';
}

const arbscore = fc.oneof(fc.integer({ min: -100, max: 100 }),fc.nat({ max: 100 })).noShrink();
const arbname = fc.string({ minLength : 1 }).noShrink();
const getarb = fc.constant(new GetHighscoresCmd());
const postarb = fc.tuple(arbscore, arbname).map( ([score,name]) => new PostHighscoreCmd(score,name));
const deletearb = fc.constant(new DeleteHighscoresCmd());
const allCommands : Arbitrary<AsyncCommand<model, ChaiHttp.Agent>>[] = [
    getarb, getarb, getarb, getarb, /* poor man's frequency generator */
    postarb, postarb, postarb, postarb, postarb, postarb, postarb, postarb, 
    deletearb
  ];
describe('Property-based tests (these take a while, be patient)', () => {
   it('Server responds as expected', async () => {
        // run everything
        await fc.assert(
            fc.asyncProperty(fc.commands(allCommands, { maxCommands: MAXCOMMANDS }), async cmds => {
              //console.log("");
              //console.log("");
              //process.stdout.write("Fresh run:");
              process.stdout.write(".");
              let request = chai.request('http://localhost:8080').keepOpen();
              const s = () => ({ model: { count: 0, entries: new Map() },
                                 real: request });
              await request.delete('/highscores');
              await fc.asyncModelRun(s, cmds)
              .then(() => request.close())
              }), 
              { numRuns: NUMRUNS,
                verbose: false,
                endOnFailure: true });
      })
});
