# Lyft Hack Night Server

In this challenge, teams compete to help Lyft earn more riders in the city of Chicago, The challenge simulates an alternate reality where there are no Lyft cars (or any other ridesharing services), only taxis... all of which are operated by the infamous Bauer Taxis Service.

Using the resources provided, work with your team to analyze data on rides around the city and form a competitive pricing model to earn business from citizens who normally ride taxis. You can change the price of Lyft rides as well as designate community areas in Chicago as "Power Zones." In power zones, Lyft pays drivers extra to increase the supply of available rides. When you set a power zone, riders may be willing to pay more if a Lyft will arrive faster than a taxi. Be careful thoughl, as power zones become more costly the more rides they convert.

There will be multiple checkpoints in simulation time where we check up on all the teams' progress and see which teams are earning the most revenue. Each team exists in its own separate, simulated universe.

## Server Instructions
On first use, install the dependencies.
```
$ npm i
```
Start the test server.
```
node server/test.js
```

#### Cloud9 Usage
If you start the server from a Cloud9 workspace, the API will be available at:
- https://`workspacename`-`username`.c9users.io
- For the primary Cloud9 workspace, the API runs [here](https://lyft-vingkan.c9users.io/hello).

You can use [the primary project workspace](https://ide.c9.io/vingkan/lyft) to run the API, but do not do any development work there. To edit samples, clone the repository into another workspace.

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