/*
 * INSTRUCTIONS
 * To simulate and save results to Firebase:
 * $ node server/simulate.js 10/1/2017 10/4/2017
 * Wait for all of the steps to be saved, then exit.
 */

'use strict';

let request = require('request');
let moment = require('moment');
let database = require('./database');
let db = database.getDB();

const URL = "https://lyft-vingkan.c9users.io";
const ADMIN = process.env.ADMIN_SECRET || "secret";
const GAME = process.env.GAME_KEY || "no_game";
const TEAMS = [
    'team1',
    'sample0'
];

function get(url, query) {
	return new Promise((resolve, reject) => {
		request({
			method: 'GET',
			url: url,
			qs: query || {}
		}, (error, response, body) => {
			if (error) {
				reject(error);
			} else {
				resolve(body);
			}
		});
	});	
}

function simulate(params) {
    return new Promise((resolve, reject) => {
        get(`${URL}/simulate/`, {
            admin: ADMIN,
            teams: TEAMS.join(','),
            start: params.start,
            end: params.end
        }).then((res) => {
            let r = JSON.parse(res);
            if (r.success) {
                resolve(r);
            } else {
                reject(r);
            }
        }).catch(reject);
    });
}

function getSimKey(sim) {
    return `s${sim.start}e${sim.end}`;
}

function save(sim) {
    let key = getSimKey(sim);
    return db.ref(`lyft/results/${GAME}/${key}`).set(sim).then((done) => {
        console.log(`Saved: ${moment(sim.start).format('M/D')} - ${moment(sim.end).format('M/D')}`);
    }).catch(console.error);
}

function reflect(promise) {
    return new Promise((resolve, reject) => {
        promise.then((data) => {
            resolve({
                success: true,
                data: data
            })
        }).catch((error) => {
            resolve({
                success: false,
                error: error
            });
        })
    });
}

let startArg = process.argv[2];
let endArg = process.argv[3];

if (!startArg || !endArg) {
    throw new Error('Must provide start and end date as arguments.');
}

let promises = [];

let ss = new Date(startArg).getTime();
let es = new Date(endArg).getTime();

let now = new Date(startArg);
let next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

console.log(`${moment(ss).format('M/D/YY')} <--> ${moment(es).format('M/D/YY')}`);

while (now.getTime() < es) {
    let p = reflect(new Promise((resolve, reject) => {
            simulate({
            start: moment(now).format('MM/DD/YYYY'),
            end: moment(next).format('MM/DD/YYYY')
        }).then((res) => {
            save(res).then(resolve).catch(reject);
        }).catch(reject);
    }));
    now = next;
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    promises.push(p);
}

console.log(`Simulating in ${promises.length} steps.`);

Promise.all(promises).then((data) => {
    let wins = data.filter((p) => p.success).length;
    console.log(`Finished ${wins}/${data.length} steps without errors.`);
    data.filter((p) => !p.success).forEach((p) => {
        console.log(p.error);
    });
}).catch((error) => {
    console.log(`Error prevented all steps from saving. Some may have completed:`);
    console.log(error);
});