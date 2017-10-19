'use strict';

let request = require('request');
let moment = require('moment');
//let database = require('./database');

const URL = "https://lyft-vingkan.c9users.io";
const ADMIN = process.env.ADMIN_SECRET || 'secret';
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
            if (res.success) {
                resolve(res);
            } else {
                reject(res);
            }
        }).catch(reject);
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
    let p = simulate({
        start: moment(now).format('MM/DD/YYYY'),
        end: moment(next).format('MM/DD/YYYY')
    });
    now = next;
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    promises.push(p);
}

console.log('getting it');
console.log(promises.length)

Promise.all(promises).then((res) => {
    console.log("done");
}).catch((error) => {
    console.error(error);
});

