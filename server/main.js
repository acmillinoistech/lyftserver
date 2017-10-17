let express = require('express');
let app = express();
let request = require('request');
let moment = require('moment');

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

function getISOString(ts) {
	return moment(ts).format(`YYYY-MM-DDThh:mm:ss`);
}

function convertTime(timestamp, in_range, out_range) {
	let real_range = in_range[1] - in_range[0];
	let real_val = timestamp - in_range[0];
	let real_ratio = real_val / real_range;
	let res_range = out_range[1] - out_range[0];
	let res_val = (real_ratio * res_range) + out_range[0];
	return res_val;
}

function isInRange(timestamp, range) {
	return timestamp >= range[0] && timestamp <= range[1];
}

function reportToUser(error) {
	console.log(error);
	return error; //JSON.stringify(error);
}

function leftPad(n, d) {
	let str = n + ``;
	while (str.length < d) {
		str = `0` + str;
	}
	return str;
}

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

function getTeamData(teamid) {
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
}

function getAllTeamData(teams) {
	return new Promise((resolve, reject) => {
		let promises = [];
		for (let teamid in teams) {
			let p = getTeamData(teamid);
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
}

function getTeamPricing(pricingMap, timestamp) {
	return Object.keys(pricingMap).map(key => pricingMap[key]).filter((p) => {
		//console.log(moment(p.in_effect).format(`M/D/YY h:mm A`), moment(timestamp).format(`M/D/YY h:mm A`))
		return p.in_effect <= timestamp;
	}).sort((a, b) => {
		return b.in_effect - a.in_effect;
	})[0] || false;
}

function getTeamZones(zoneMap, timestamp) {
	return Object.keys(zoneMap).map(key => zoneMap[key]).filter((p) => {
		//console.log(moment(p.in_effect).format(`M/D/YY h:mm A`), moment(timestamp).format(`M/D/YY h:mm A`))
		return p.in_effect <= timestamp;
	}).sort((a, b) => {
		return b.in_effect - a.in_effect;
	})[0] || {};
}

const COST_WAIT = 3.00;
const COST_WAIT_SPAN = 2.50;

function getZoneModifier(record, model) {
	// Check if record is in power zone;
	let modifier = 0;
	let zones = model.zones || {};
	let area = record.pickup_community_area;
	if (area in zones) {
		let tripHash = parseInt(record.trip_id, 10);
		if (isNaN(tripHash)) {
			tripHash = 0;
		}
		let offset = (((tripHash % 11) - 5) / 5) * COST_WAIT_SPAN;
		let cost = COST_WAIT - offset;
		modifier = cost;
		if (isNaN(modifier)) {
			console.log(`Bad ZMod: offset=${offset}, triphash=${tripHash}`);
		}
	}
	if (modifier > 0) {
		//console.log(`Cost of Waiting: $${modifier.toFixed(2)}`);
	}
	return modifier;
}

function getTaxiPrice(record) {
	let total_with_tip = parseFloat(record.trip_total);
	let fare = parseFloat(record.fare);
	let tolls = parseFloat(record.tolls);
	let extras = parseFloat(record.extras);
	let price = fare + tolls + extras;
	return price;
}

function getRidePrice(record, model) {
	let p = model.pricing;
	if (!p) {
		return Infinity;
	}
	let secs = parseFloat(record.trip_seconds);
	let mins = secs / 60;
	let miles = parseFloat(record.trip_miles);
	let price = p.base + p.pickup + (p.per_mile * miles) + (p.per_minute * mins);
	if (isNaN(price)) {
		console.log(record)
		console.log('mal ride price', price)
	}
	return price;
}

function cleanRecords(list) {
	return list.filter((record) => {
		let inc = true;
		if (record.trip_miles) {
			if (parseFloat(record.trip_miles) <= 0) {
				inc = false;
			}	
		} else {
			inc = false;
		}
		if (!record.dropoff_centroid_latitude) {
			inc = false;
		}
		if (!record.pickup_centroid_latitude) {
			inc = false;
		}
		if (!record.pickup_community_area) {
			inc = false;
		}
		return inc;
	});
}

function getTripRevenue(record, model, isTaxi) {
	let rev = 0;
	if (isTaxi) {
		let price = getRidePrice(record, model);
		let tips = parseFloat(record.tips);
		rev = price + tips;
	} else {
		rev = parseFloat(record.trip_total);
		if (isNaN(rev)) {
			console.log(record)
			console.log('mal', record.trip_total)
		}
	}
	return rev;
}

const DIFF_MAPPING = false;
let diffMap = {};

function chooseToRide(record, model) {
	let pricing = model.pricing;
	if (!pricing) {
		return false;
	}
	let ride_total = getRidePrice(record, model);
	let modifier = getZoneModifier(record, model);
	let taxi_total = getTaxiPrice(record);
	taxi_total += modifier;
	
	let chooseRide = ride_total <= taxi_total;
	if (DIFF_MAPPING) {
		let diff = ride_total - taxi_total;
		let zone = record.pickup_community_area;
		if (!(zone in diffMap)) {
			diffMap[zone] = [];
		}
		diffMap[zone].push(diff);
		//console.log(`Diff: ${diff}`);
	}
	
	//console.log(`Taxi: ${taxi_total.toFixed(2)} <> Ride : ${ride_total.toFixed(2)} => ${chooseRide ? `Ride` : `Taxi`}`);
	return chooseRide;
}

function simulateRecord(old, teamData) {
	let record = JSON.parse(JSON.stringify(old));
	let cs = new Date(record.trip_start_timestamp).getTime();
	let model = {};
	model.pricing = getTeamPricing(teamData.pricing, cs);
	model.zones = getTeamZones(teamData.zones, cs);
	let chooseRide = chooseToRide(record, model);
	if (!model.pricing) {
		chooseRide = false;
	}
	if (chooseRide) {
		let fare = getRidePrice(record, model);
		let rev = getTripRevenue(record, model, chooseRide);
		record.company = `Lyft`;
		record.fare = `${fare.toFixed(2)}`;
		record.tolls = `0`;
		record.extras = `0`;
		record.trip_total = `${rev.toFixed(2)}`;
	}
	return record;
}

function processRecords(list) {
	let response = list.map((record, idx) => {
					
		let ts = new Date(record.trip_start_timestamp).getTime();
		let te = new Date(record.trip_end_timestamp).getTime();
		let cs = convertTime(ts, TIME.real, TIME.simulation);
		let ce = convertTime(te, TIME.real, TIME.simulation);
		record.trip_start_timestamp = getISOString(cs);
		record.trip_end_timestamp = getISOString(ce);
		record.company = 'Bauer Taxi Service';
		record.entry_idx = idx;
		
		return record;
		
	});
	return response;
}

const PORT = process.argv[2] || 8080;
const TAXI_DATASET_URL = 'https://data.cityofchicago.org/resource/wrvz-psew.json';
const TIME = {
	simulation: [
		new Date('10/1/2017').getTime(),
		new Date('10/7/2017').getTime()
	],
	real: [
		new Date('10/1/2016').getTime(),
		new Date('10/7/2016').getTime()
	],
	checkpoints: [
		new Date('10/1/2017').getTime(),
		new Date('10/8/2017').getTime(),
		new Date('10/15/2017').getTime(),
		new Date('10/22/2017').getTime()
	],
	now: 0
};

let cpidx = 0;
function setNextCheckPoint() {
	let nextTime = TIME.checkpoints[cpidx];
	if (nextTime) {
		TIME.now = nextTime;
		cpidx++;
		return true;
	} else {
		return false;
	}
}

setNextCheckPoint();

function countTrips(params) {
	return new Promise((resolve, reject) => {

		params.field = `trip_start_timestamp`;

		let is = new Date(params.start).getTime();
		let ie = new Date(params.end).getTime();
		
		let ds = convertTime(is, TIME.simulation, TIME.real);
		let de = convertTime(ie, TIME.simulation, TIME.real);
		
		get(TAXI_DATASET_URL, {
			'$where': `${params.field} between '${getISOString(ds)}' and '${getISOString(de)}'`,
			'$select': `count(trip_id)`
		}).then((body) => {
			let response = JSON.parse(body);
			resolve({
				count: response[0].count_trip_id
			});
		}).catch(reject);
		
	});
}

function getTrips(params) {
	return new Promise((resolve, reject) => {
		
		console.log(params.start, params.end);
		
		params.field = `trip_start_timestamp`;
		
		let limit = params.limit || PUBLIC_TRIP_LIMIT;
		let offset = params.offset || 0;
		let is = new Date(params.start).getTime();
		let ie = new Date(params.end).getTime();
		
		if (is > TIME.now) {
			reject(`Requested a start time in the future of this universe: ${params.start}`);
		}
		if (ie > TIME.now) {
			reject(`Requested an end time in the future of this universe: ${params.end}`);
		}
		
		let ds = convertTime(is, TIME.simulation, TIME.real);
		let de = convertTime(ie, TIME.simulation, TIME.real);
		
		console.log('Start:', moment(ds).format(`M/D/YY h:mm A`));
		console.log('End:', moment(de).format(`M/D/YY h:mm A`));
			
		get(TAXI_DATASET_URL, {
			'$where': `${params.field} between '${getISOString(ds)}' and '${getISOString(de)}'`,
			'$order': `trip_start_timestamp`,
			'$limit': limit,
			'$offset': offset
		}).then((body) => {
			
			let list = cleanRecords(JSON.parse(body));
			let response = processRecords(list);
			resolve(response);
			
		}).catch(reject);
		
	});
}

function displaySplitBreakdown(response) {
	let l = response.filter((r) => r.company === 'Lyft').length;
	let b = response.filter((r) => r.company === 'Bauer Taxi Service').length;
	console.log(`${l} / ${response.length} are Lyft.`);
	console.log(`${b} / ${response.length} are Bauer.`);
	console.log(`${l} + ${b} = ${l + b} = ${response.length}.`);
}

function simulateTrips(list, teams) {
	let response = list;
	return new Promise((resolve, reject) => {
		let res = {};
		getAllTeamData(teams).then((teamMap) => {
			for (let teamid in teamMap) {
				console.log(`\nSimulating for ${teamid}`);
				let teamData = teamMap[teamid] || {};
				let simulated = response.map((record) => {
					return simulateRecord(record, teamData);
				});
				res[teamid] = simulated;
				console.log(`Results for ${teamid}`);
				//console.log(teamData)
				displaySplitBreakdown(simulated);
			}
			resolve(res);
		}).catch(reject);
	});
}

function scoreTrips(simMap) {
	
	let simulationData = {};
	
	for (let teamid in simMap) {
		
		simulationData[teamid] = {
			trips: {
				lyft: 0,
				taxi: 0
			},
			revenue: {
				lyft: 0,
				taxi: 0
			}
		};
		
		let list = simMap[teamid];
		list.forEach((record, idx) => {
			let rev = parseFloat(record.trip_total);
			if (record.company === 'Bauer Taxi Service') {
				simulationData[teamid].trips.taxi++;
				simulationData[teamid].revenue.taxi += rev;
			} else {
				simulationData[teamid].trips.lyft++;
				simulationData[teamid].revenue.lyft += rev;
			}
		});	
		
	}
	
	for (let teamid in simulationData) {
		let lr = simulationData[teamid].revenue.lyft;
		simulationData[teamid].revenue.lyft = lr.toFixed(2);
		let tr = simulationData[teamid].revenue.taxi;
		simulationData[teamid].revenue.taxi = tr.toFixed(2);
	}
	
	return simulationData;
	
}

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

const PUBLIC_TRIP_LIMIT = 1000;

app.get('/trips/', (req, res) => {
	
	console.log(`\nGET /trips`);
	
	let params = req.query;
	let teamid = params.team;
	countTrips(params).then((response) => {
		
		let total = response.count;
		console.log(`Counted ${total} rides.`);
		
		if (parseInt(params.limit) > PUBLIC_TRIP_LIMIT) {
			params.limit = PUBLIC_TRIP_LIMIT;
		}
		
		getTrips(params).then((response) => {
			
			if (DIFF_MAPPING) {
				console.log(`\nZone Competition over ${response.length} Rides`);
				let totalWon = 0;
				for (let zone in diffMap) {
					let list = diffMap[zone];
					let sum = list.reduce((total, diff) => {
						return total + diff;
					}, 0);
					let avg = sum / list.length;
					let wins = list.filter((diff) => diff <= 0).length;
					totalWon += wins;
					console.log(`Zone ${leftPad(zone, 2)} | avgdiff = ${avg.toFixed(2)} win = ${wins}/${list.length}`);
				}
				console.log(`Total Won = ${totalWon}`);
			}
			
			let teamMap = {};
				teamMap[teamid] = true;
			let simulated = simulateTrips(response, teamMap).then((simMap) => {
				let simulated = simMap[teamid];
				res.send({
					success: true,
					length: response.length,
					response: simulated
				});
			}).catch((error) => {
				res.send({
					success: false,
					error: reportToUser(error)
				});
			});
			
		}).catch((error) => {
			res.send({
				success: false,
				error: reportToUser(error)
			});
		});
		
	}).catch((error) => {
		res.send({
			success: false,
			error: reportToUser(error)
		});
	});
	
});

app.get('/count/', (req, res) => {
	
	let params = req.query;
	params.field = req.params.field;
	countTrips(params).then((response) => {
		res.send({
			success: true,
			count: response.count
		});
	}).catch((error) => {
		res.send({
			success: false,
			error: reportToUser(error)
		});
	});
	
});

app.get('/simulate/', (req, res) => {
	
	console.log(`\nGET /simulate`);
	
	let params = req.query;
	params.field = 'trip_start_timestamp';
	
	countTrips(params).then((countRes) => {
			
		let teamMap = {};
		params.teams.split(',').forEach((teamid) => {
			teamMap[teamid] = true;
		});
		params.teams = teamMap;
		params.limit = countRes.count;
		
		console.log(`Simulate over ${params.limit} records.`);
		console.log(params.teams);
		
		getTrips(params).then((response) => {
			let simulated = simulateTrips(response, teamMap).then((simMap) => {
				let simData = scoreTrips(simMap);
				res.send({
					success: true,
					data: simData
				});
			}).catch((error) => {
				res.send({
					success: false,
					error: reportToUser(error)
				});
			});
			
		}).catch((error) => {
			res.send({
				success: false,
				error: reportToUser(error)
			});
		});
		
	}).catch((error) => {
		res.send({
			success: false,
			error: reportToUser(error)
		});
	});
	
});

app.get('/checkpoint', (req, res) => {
	let status = setNextCheckPoint();
	res.send({
		status: status,
		time: TIME.now,
		message: `The simulation ${status ? `is not over` : `is over`}, the time is ${moment(TIME.now).format('M/D/YYYY')}.`
	});
});

function formatInputPrice(price) {
	if (price) {
		let p = parseFloat(price);
		let d = p.toFixed(2);
		let r = parseFloat(d);
		return r;
	} else {
		return 0;
	}
}

const ADMIN_ORIGIN = `https://acmillinoistech.github.io`;
const REQUIRE_ADMIN = false;

app.post('/pricing', (req, res) => {
	try {
		let origin = req.headers.origin;
		if (origin !== ADMIN_ORIGIN && REQUIRE_ADMIN) {
			res.send({
				success: false,
				error: `Not allowed to execute admin operations from origin: ${origin}.`
			});
		}
		let q = req.query;
		let t_key = `ts${TIME.now}`;
		let pricing = {
			base: formatInputPrice(q.base),
			pickup: formatInputPrice(q.pickup),
			per_mile: formatInputPrice(q.per_mile),
			per_minute: formatInputPrice(q.per_minute),
			in_effect: TIME.now
		}
		let teamid = q.team;
		if (!teamid) {
			res.send({
				success: false,
				error: `No team specified.`
			});
		}
		if (!(teamid in PRICING)) {
			PRICING[teamid] = {};
		}
		PRICING[teamid][t_key] = pricing;
		res.send({
			success: true,
			team: q.team,
			pricing: pricing
		});
	} catch (error) {
		res.send({
			success: false,
			error: reportToUser(error)
		});
	}
});

app.post('/zones', (req, res) => {
	try {
		let origin = req.headers.origin;
		if (origin !== ADMIN_ORIGIN && REQUIRE_ADMIN) {
			res.send({
				success: false,
				error: `Not allowed to execute admin operations from origin: ${origin}.`
			});
		}
		let q = req.query;
		let t_key = `ts${TIME.now}`;
		let zones = {
			in_effect: TIME.now
		}
		let zone_list = q.zones.split(`,`);
		zone_list.forEach((z) => {
			if (z) {
				z = z.trim();
				if  (z !== `in_effect`) {
					zones[z] = true;
				}	
			}
		});
		let teamid = q.team;
		if (!teamid) {
			res.send({
				success: false,
				error: `No team specified.`
			});
		}
		if (!(teamid in ZONES)) {
			ZONES[teamid] = {};
		}
		ZONES[teamid][t_key] = zones;
		res.send({
			success: true,
			team: q.team,
			zones: zones
		});
	} catch (error) {
		res.send({
			success: false,
			error: reportToUser(error)
		});
	}
});

app.get('/hello', (req, res) => {
	res.send('Hello World!');
});

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}...`);
	console.log(`Navigate to https://lyft-vingkan.c9users.io/hello`);
});

