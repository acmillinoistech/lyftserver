# Lyft Hack Night Server

## Table of Contents
- [Server Instructions](#section-server)
- [Client Instructions](#section-client)
- [API Endpoints](#section-api)

In this challenge, teams compete to help Lyft earn more riders in the city of Chicago, The challenge simulates an alternate reality where there are no Lyft cars (or any other ridesharing services), only taxis... all of which are operated by the infamous Bauer Taxi Service.

Using the resources provided, work with your team to analyze data on rides around the city and form a competitive pricing model to earn business from citizens who normally ride taxis. You can change the price of Lyft rides as well as designate community areas in Chicago as "Power Zones." In power zones, Lyft pays drivers extra to increase the supply of available rides. When you set a power zone, riders may be willing to pay more if a Lyft will arrive faster than a taxi. Be careful thoughl, as power zones become more costly the more rides they convert.

There will be multiple checkpoints in simulation time where we check up on all the teams' progress and see which teams are earning the most revenue. Each team exists in its own separate, simulated universe.

<a name="section-server"></a>
## Server Instructions
On first use, install the dependencies.
```
$ npm i
```
Set a secret key to protect administrative operations. Only share this key with other challenge administrators.
```
export ADMIN_SECRET=something_secret
```
Start the test server.
```
node server/main.js
```

#### Cloud9 Usage
If you start the server from a Cloud9 workspace, the API will be available at:
- https://`workspacename`-`username`.c9users.io
- For the primary Cloud9 workspace, the API runs [here](https://lyft-vingkan.c9users.io/hello).

You can use [the primary project workspace](https://ide.c9.io/vingkan/lyft) to run the API, but do not do any development work there. To edit samples, clone the repository into another workspace.

<a name="section-client"></a>
## Client Instructions
Run any client scripts in a different terminal while the server is up. Ensure requests are made to the correct API URL.

### Python Starter
Set your secret team key.
```
export TEAM_SECRET=your_team
```
Save and run your script.
```
python main.py
```

### Java Starter
Set your secret team key.
```
export TEAM_SECRET=your_team
```
Save, compile, and run your script.
```
javac -cp ".:lib/*" Main.java
java -cp ".:lib/*" Main
```

<a name="section-api"></a>
## API Endpoints

Teams play this challenge with a RESTful API, allowing analysts to work in any programming language. Each team will receive a secret API key to use when making requests and accessing other challenge services. Keep this key secret, otherwise other teams may be able to observe or manipulate your strategy.

**Note:** When using the test server, you can make up any team key you want or simulate different teams playing by using multiple keys.

There are five public endpoints:
- [`/trips`](#get-trips): Search for all valid trip records between two date/time points.
- [`/count`](#get-count): Count the total number of valid trip records between two date/time points.
- [`/time`](#get-time): Get the current time in the simulation.
- [`/pricing`](#post-pricing): Update your team's pricing model for the current simulation checkpoint.
- [`/zones`](#post-zones): Set community areas in the city as power zones for the current simulation checkpoint.

And two administrative endpoints:
- [`/checkpoint`](#post-checkpoint): Move the simulation to the next checkpoint date.
- [`/simulate`](#get-simulate): Simulate rides won and revenue earned for teams between two date/time points.

See the **Client Instructions** section for sample starter code.

<a name="get-trips"></a>
### [GET] Trips
#### Description
Search for all valid trip records between two date/time points.
#### Endpoint
`/trips`
#### Parameters
- `team` [required]: secret key for your team
- `start` [required]: date/time string to start search at
- `end` [required]: date/time string to end search at
- `limit`: maximum number of results to return
- `offset`: only return search results past this index
#### Experimental SQL Parameter
You can fine tune your search query with a SQL WHERE clause instead of `start` and `end`.
- `team` [required]: secret key for your team
- `where` [required]: SQL WHERE clause
When querying across dates and times, wrap the values with curly braces. This applies to the columns `trip_start_timestamp` and `trip_end_timestamp`.
```
{
	"where": "(trip_start_timestamp BETWEEN {9/10/2017 2:00 PM} AND {9/10/2017 3:00 PM}) AND (trip_total BETWEEN 10 AND 20)"
}
```
#### Response
```
{
	success: true,
	length: 750,
	response: {
	    {
	      "company": "Bauer Taxi Service",
	      "dropoff_census_tract": "17031081300",
	      "dropoff_centroid_latitude": "41.898331794",
	      "dropoff_centroid_location": {
	        "type": "Point",
	        "coordinates": [
	          -87.6207628651,
	          41.8983317935
	        ]
	      },
	      "dropoff_centroid_longitude": "-87.620762865",
	      "dropoff_community_area": "8",
	      "extras": "1",
	      "fare": "7.85",
	      "payment_type": "Cash",
	      "pickup_census_tract": "17031320600",
	      "pickup_centroid_latitude": "41.870607372",
	      "pickup_centroid_location": {
	        "type": "Point",
	        "coordinates": [
	          -87.6221729369,
	          41.8706073724
	        ]
	      },
	      "pickup_centroid_longitude": "-87.622172937",
	      "pickup_community_area": "32",
	      "taxi_id": "e3490f01724ad4a617a42371dab38fcbcb4b7f6418d451b7c8392135a040d2f63591def795e0ec2564c589bae2d2169b0d778204659910d80932d3b69eff4eda",
	      "tips": "0",
	      "tolls": "0",
	      "trip_end_timestamp": "2014-09-10T12:15:00",
	      "trip_id": "8ba13d43087a7d5279b788c7d6e89b765ea5db82",
	      "trip_miles": "21",
	      "trip_seconds": "540",
	      "trip_start_timestamp": "2014-09-10T12:00:00",
	      "trip_total": "8.85",
	      "entry_idx": 0
	    },
		...
	}
}
```
#### Warnings
- You must include your team key in the request parameters
- You cannot search rides past the current time in the simulation

<a name="get-count"></a>
### [GET] Count
#### Description
Count the total number of valid trip records between two date/time points.
#### Endpoint
`/count`
#### Parameters
- `team` [required]: secret key for your team
- `start` [required]: date/time string to start search at
- `end` [required]: date/time string to end search at
#### Response
```
{
	success: true,
	count: 750
}
```
#### Warnings
- You must include your team key in the request parameters
- You cannot search rides past the current time in the simulation

<a name="get-time"></a>
### [GET] Time
#### Description
Get the current time in the simulation.
#### Endpoint
`/time`
#### Parameters
- None
#### Response
```
{
	success: true,
	time: "2017-10-01",
	message: "The simulation is not over, the time is 10/1/2017."
}
```
<a name="post-pricing"></a>
### [POST] Pricing
#### Description
Update your team's pricing model for the current simulation checkpoint.
#### Endpoint
`/pricing`
#### Parameters
- `team` [required]: secret key for your team
- `base`: base cost of a ride in dollars
- `pickup`: cost of picking up a rider in dollars
- `per_mile`: cost per mile driven in dollars
- `per_minute`: cost per minute driven in dollars
#### Response
```
{
	success: true,
	team: "YOUR_SECRET_TEAM_KEY",
	pricing: {
		{
			base: 3.00,
			pickup: 1.70,
			per_mile: 0.90,
			per_minute: 0.90
		}
		...
	}
}
```
#### Warnings
- You must include your team key in the request parameters
- Fields left blank in the pricing model will be given values of 0: it is possible to lose money by giving way free rides!
- Extra decimal places will be rounded when setting price
- This POST request responds with your team's updated pricing model: double-check to make sure it is structured the way you want
- You can only edit your pricing model for the current checkpoint, not past or future ones

<a name="post-zones"></a>
### [POST] Zones
#### Description
Set community areas in the city as power zones for the current simulation checkpoint.
#### Endpoint
`/zones`
#### Parameters
- `team` [required]: secret key for your team
- `zones`: comma-separated list of community area numbers to set as power zones
#### Response
```
{
	success: true,
	team: "YOUR_SECRET_TEAM_KEY",
	zones: {
		{
			"32": true,
			"76": true
		}
		...
	}
}
```
#### Warnings
- You must include your team key in the request parameters

<a name="post-checkpoint"></a>
### [POST] Checkpoint
#### Description
This endpoint is only for challenge administrators. Move the simulation to the next checkpoint date.
#### Endpoint
`/checkpoint`
#### Parameters
- `admin` [required]: secret admin key
#### Response
```
{
	success: true,
	status: true,
	time: '2017-10-07',
	message: "The simulation is not over, the time is 10/7/2017."
}
```

<a name="get-simulate"></a>
### [GET] Simulate
#### Description
Simulate rides won and revenue earned for teams between two date/time points.
#### Endpoint
`/simulate`
#### Parameters
- `admin` [required]: secret admin key
- `teams` [required]: comma-separated list of team keys
- `start` [required]: date/time string to start search at
- `end` [required]: date/time string to end search at
#### Response
```
{
	"success": true,
	"data": {
		"team1": {
			"trips": {
				"lyft": 0,
				"taxi": 31143
			},
			"revenue": {
				"lyft": "0.00",
				"taxi": "320012.90"
			}
		}
		...
	}
}
```