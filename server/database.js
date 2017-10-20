'use strict';

let firebase = require('firebase');
let config = require('./config');
let FirebaseApp = firebase.initializeApp(config);
let db = FirebaseApp.database();

let database = {
	
	getDB: () => {
		return db;
	},
    
    getTeamData: (gameid, teamid) => {
    	return new Promise((resolve, reject) => {
    		db.ref(`lyft/teams/${gameid}/${teamid}`).once('value', (snap) => {
    			let val = snap.val() || {};
    			if (val) {
    				resolve({
	    				team: teamid,
	    				pricing: val.pricing || {},
	    				zones: val.zones || {}
	    			});
    			} else {
    				resolve({
	    				team: teamid,
	    				pricing: {},
	    				zones: {}
	    			});
    			}
    		});
    	});
    },
    
    getAllTeamData: (gameid, teams) => {
        return new Promise((resolve, reject) => {
    		let promises = [];
    		for (let teamid in teams) {
    			let p = database.getTeamData(gameid, teamid);
    			promises.push(p);
    		}
    		Promise.all(promises).then((res) => {
    			let teamMap = {};
    			res.forEach((data) => {
    				teamMap[data.team] = data;
    			});
    			resolve(teamMap);
    		}).catch(reject);
    	});
    },
    
    setTeamPricing: (gameid, teamid, key, pricing) => {
        return new Promise((resolve, reject) => {
        	let ref = db.ref(`lyft/teams/${gameid}/${teamid}/pricing/${key}`)
        	ref.set(pricing).then((done) => {
        		resolve(pricing);
        	}).catch(reject);
        });
    },
    
    setTeamZones: (gameid, teamid, key, zones) => {
        return new Promise((resolve, reject) => {
        	let ref = db.ref(`lyft/teams/${gameid}/${teamid}/zones/${key}`)
        	ref.set(zones).then((done) => {
        		resolve(zones);
        	}).catch(reject);
        });
    }
    
}

module.exports = database;
