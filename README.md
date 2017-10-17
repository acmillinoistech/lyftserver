# Lyft Hack Night Server

Description coming soon...

## Server Instructions
On first use, install the dependencies.
```
$ npm i
```
Start the test server.
```
node server/test.js
```

## Client Instructions
Run any client scripts in a different terminal while the server is up. Ensure requests are made to the correct API URL.

### Python Starter
```
python main.py
```

### Java Starter
Coming soon...

## API Endpoints

Teams play this challenge with a RESTful API, allowing analysts to work in any programming language. Each team will receive a secret API key to use when making requests and accessing other challenge services. Keep this key secret, otherwise other teams may be able to observe or manipulate your strategy.

**Note:** When using the test server, you can make up any team key you want or simulate different teams playing by using multiple keys.

There are five public endpoints:
- `/trips`: Search for all valid trip records between two date/time points.
- `/count`: Count the total number of valid trip records between two date/time points.
- `/time`: Get the current time in the simulation.
- `/pricing`: Update your team's pricing model for the current simulation checkpoint.
- `/zones`: Set community areas in the city as power zones for the current simulation checkpoint.

And two administrative endpoints:
- `/checkpoint`: Move the simulation to the next checkpoint date.
- `/simulate`: 

See the **Client Instructions** section for sample starter code.

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
#### Response
```
{
	success: true,
	length: 750,
	response: {
		{

		}
		...
	}
}
```
#### Common Errors
- You must include your team key in the request parameters
- You cannot search rides past the current time in the simulation

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
#### Common Errors
- You must include your team key in the request parameters
- You cannot search rides past the current time in the simulation

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
#### Common Errors
- You must include your team key in the request parameters
- [Warning] Fields left blank in the pricing model will be given values of 0: it is possible to lose money by giving way free rides!
- Extra decimal places will be rounded when setting price
- This POST request responds with your team's updated pricing model: double-check to make sure it is structured the way you want
- You can only edit your pricing model for the current checkpoint, not past or future ones

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
#### Common Errors
- You must include your team key in the request parameters


### [POST] ??? [PROPOSED]
#### Description
Proposing a new endpoint or a replacement endpoint that allows teams to change pricing per zone, per hour, or both.
#### Endpoint
`/???`
#### Parameters
- ...
#### Response
```
{
	success: true,
	...
}
```

### [ADMIN] [GET] Checkpoint
#### Description
This endpoint is only for challenge administrators. Move the simulation to the next checkpoint date.
#### Endpoint
`/checkpoint`
#### Parameters
- None
#### Response
```
{
	success: true,
	status: true,
	time: '2017-10-07',
	message: "The simulation is not over, the time is 10/7/2017."
}
```

### [ADMIN] [GET] Simulate
#### Description
Simulate rides won and revenue earned for teams between two date/time points.
#### Endpoint
`/simulate`
#### Parameters
- `teams` [required]: comma-separated list of team keys
- `start` [required]: date/time string to start search at
- `end` [required]: date/time string to end search at
#### Response
```
{
	success: true,
	response: {
		{
			...
		}
		...
	}
}
```