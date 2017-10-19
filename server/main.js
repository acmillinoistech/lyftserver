'use strict';

let express = require('express');
let app = express();
let request = require('request');
let moment = require('moment');
let database = require('./database');

/* Global Variables */

const ADMIN_ORIGIN = process.env.ADMIN_SECRET || 'secret';
const PUBLIC_TRIP_LIMIT = 1000;
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

const COST_WAIT = 3.00;
const COST_WAIT_SPAN = 2.50;

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

/* Server Functions */

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
	return moment(ts).format(`YYYY-MM-DDTHH:mm:ss`);
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

function getTeamData(teamid) {
	return database.getTeamData(teamid);
}

function getAllTeamData(teams) {
	return database.getAllTeamData(teams);
}

function setTeamPricing(teamid, key, pricing) {
	return database.setTeamPricing(teamid, key, pricing);
}

function setTeamZones(teamid, key, zones) {
	return database.setTeamZones(teamid, key, zones);
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

function parseTimeQuery(query) {
	try {
		const tsStart = '{';
		const tsEnd = '}';
		let nq = '';
		let tStr = '';
		let reading = false;
		for (let i = 0; i < query.length; i++) {
			let c = query[i];
			if (c === tsStart) {
				reading = true;
			} else if (c === tsEnd) {
				let ts = new Date(tStr).getTime();
				let ds = convertTime(ts, TIME.simulation, TIME.real);
				let is = getISOString(ds);
				nq += `'${is}'`;
				reading = false;
				tStr = '';
			} else if (reading) {
				tStr += c;
			} else {
				nq += c;
			}
		}
		return {
			success: true,
			query: nq
		}
	} catch (error) {
		return {
			success: false,
			error: error
		}
	}
}

function cleanWhereClause(whereClause) {
	let qStart = whereClause.indexOf(`trip_start_timestamp`) > -1;
	let qEnd = whereClause.indexOf(`trip_end_timestamp`) > -1;
	let qTime = (qStart ? 1 : 0) + (qEnd ? 1 : 0);
	if (qTime > 0) {
		let hp1 = (whereClause.match(/{/g) || []).length;
		let hp2 = (whereClause.match(/}/g) || []).length;
		let hasBraces = (hp1 === hp2) && hp1 > 0;
		if (hasBraces) {
			let pq = parseTimeQuery(whereClause);
			if (pq.success) {
				return pq;
			} else {
				return {
					success: false,
					error: pq.error
				}
			}	
		} else {
			return {
				success: false,
				error: `Missing braces in time formatting.`
			}
		}
	}
	return {
		success: true,
		query: whereClause
	}
}

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
	let cleaned = list.filter((record) => {
		//console.log(record.trip_id);
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
	}).sort((a, b) => {
		let at = new Date(a.trip_start_timestamp).getTime();
		let bt = new Date(b.trip_start_timestamp).getTime();
		return at - bt;
	})
	console.log(`Original: ${list.length}, Cleaned: ${cleaned.length}`);
	return cleaned;
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
	//console.log(`Taxi: ${taxi_total.toFixed(2)} <> Ride : ${ride_total.toFixed(2)} => ${chooseRide ? `Ride` : `Taxi`}`);
	return chooseRide;
}

function simulateRecord(old, teamData) {
	let record = old;//let record = JSON.parse(JSON.stringify(old));
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

function countTrips(params) {
	return new Promise((resolve, reject) => {
		
		let whereQuery;
		if (params.where) {
			//console.log(`Custom Where Clause: ${params.where}`);
			whereQuery = params.where;
		} else {
			params.field = `trip_start_timestamp`;
			let is = new Date(params.start).getTime();
			let ie = new Date(params.end).getTime();
			let ds = convertTime(is, TIME.simulation, TIME.real);
			let de = convertTime(ie, TIME.simulation, TIME.real);
			whereQuery = `${params.field} between '${getISOString(ds)}' and '${getISOString(de)}'`
		}
		
		get(TAXI_DATASET_URL, {
			'$where': whereQuery,
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
		
		let limit = params.limit || PUBLIC_TRIP_LIMIT;
		let offset = params.offset || 0;
		
		console.log(`Limit: ${limit}, Offset: ${offset}`);
			
		let whereQuery;
		if (params.where) {
			console.log(`Custom Where Clause: ${params.where}`);
			whereQuery = params.where;
		} else {
			
			console.log(params.start, params.end);
			
			params.field = `trip_start_timestamp`;
			
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
			
			whereQuery = `${params.field} between '${getISOString(ds)}' and '${getISOString(de)}'`
		}
			
		get(TAXI_DATASET_URL, {
			'$where': whereQuery,
			'$order': `trip_id`,
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

/* Global Variables */

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.all('*', (req, res, next) => {
	let start = process.hrtime();
	res.on('finish', () => {
		let hrtime = process.hrtime(start);
		let elapsed = parseFloat(hrtime[0] + (hrtime[1] / 1000000).toFixed(3), 10);
		console.log(req.path);
		console.log(req.query);
		console.log(elapsed + 'ms\n');
	});
	next();
});

app.get('/trips/', (req, res) => {
	
	console.log(`\nGET /trips`);
	
	if (req.query.where) {
		let cq = cleanWhereClause(req.query.where);
		if (cq.success) {
			req.query.where = cq.query;
		} else {
			res.send(cq);
		}
	}
	
	let params = req.query;
	let teamid = params.team;
	countTrips(params).then((response) => {
		
		let total = response.count;
		console.log(`Counted ${total} rides.`);
		
		if (parseInt(params.limit) > PUBLIC_TRIP_LIMIT) {
			params.limit = PUBLIC_TRIP_LIMIT;
		}
		
		getTrips(params).then((response) => {
			
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
	
	if (req.query.where) {
		let cq = cleanWhereClause(req.query.where);
		if (cq.success) {
			req.query.where = cq.query;
		} else {
			res.send(cq);
		}
	}
	
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
	
	try {
		
		let admin = req.query.admin;
		if (admin !== ADMIN_ORIGIN) {
			res.send({
				success: false,
				error: `You are not allowed to execute admin operations.`
			});
		}
		
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
						start: new Date(params.start).getTime(),
						end: new Date(params.end).getTime(),
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
	
	} catch (error) {
		res.send({
			success: false,
			error: reportToUser(error)
		});
	}
	
});

app.post('/checkpoint', (req, res) => {
	let admin = req.query.admin;
	if (admin !== ADMIN_ORIGIN) {
		res.send({
			success: false,
			error: `You are not allowed to execute admin operations.`
		});
	}
	let status = setNextCheckPoint();
	res.send({
		status: status,
		time: TIME.now,
		message: `The simulation ${status ? `is not over` : `is over`}, the time is ${moment(TIME.now).format('M/D/YYYY')}.`
	});
});

app.post('/pricing', (req, res) => {
	try {
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
		setTeamPricing(teamid, t_key, pricing).then((done) => {
			res.send({
				success: true,
				team: q.team,
				pricing: pricing
			});	
		}).catch((error) => {
			res.send({
				success: false,
				error: reportToUser(error)
			});
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
		setTeamZones(teamid, t_key, zones).then((done) => {
			res.send({
				success: true,
				team: q.team,
				zones: zones
			});	
		}).catch((error) => {
			res.send({
				success: false,
				error: reportToUser(error)
			});
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

