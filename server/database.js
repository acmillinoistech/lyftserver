const PRICING = {
	'sample0': {},
	'sample1': {
		a: {
			base: 3.00,
			pickup: 1.70,
			per_mile: 0.90,
			per_minute: 0.90,
			in_effect: 0
		}
	},
	'sample2': {
		a: {
			base: 3.00,
			pickup: 1.70,
			per_mile: 0.90,
			per_minute: 0.90,
			in_effect: 0
		}
	}
};

const ZONES = {
	'sample2': {
		a: {
			'32': true,
			in_effect: 0
		}
	}
};

let database = {
    
    getTeamData: (teamid) => {
    	return new Promise((resolve, reject) => {
    		if (teamid in PRICING) {
    			resolve({
    				team: teamid,
    				pricing: PRICING[teamid],
    				zones: ZONES[teamid] || {}
    			});	
    		} else {
    			resolve({
    				team: teamid,
    				pricing: {},
    				zones: {}
    			});
    			/*reject({
    				message: `Team ID ${teamid} not found.`
    			});*/
    		}
    	});
    },
    
    getAllTeamData: (teams) => {
        return new Promise((resolve, reject) => {
    		let promises = [];
    		for (let teamid in teams) {
    			let p = database.getTeamData(teamid);
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
    
    setTeamPricing: (teamid, key, pricing) => {
        return new Promise((resolve, reject) => {
            if (!(teamid in PRICING)) {
                PRICING[teamid] = {};
            }
            PRICING[teamid][key] = pricing;
            resolve(pricing);
        });
    },
    
    setTeamZones: (teamid, key, zones) => {
        return new Promise((resolve, reject) => {
            if (!(teamid in ZONES)) {
                ZONES[teamid] = {};
            }
            ZONES[teamid][key] = zones;
            resolve(zones);
        });
    }
    
}

module.exports = database;
