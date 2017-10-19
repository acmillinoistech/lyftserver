'''
Python Starter Code
>> python main.py
'''

import os
import requests
from datetime import datetime

URL = "https://lyft-vingkan.c9users.io"
TEAM = os.environ["TEAM_SECRET"]

'''
Helper Methods
'''

# Get Trips
def get_trips(query):
	query["team"] = TEAM
	response = requests.get(URL + "/trips/", params=query)
	return response.json()


# Set Pricing
def set_pricing(pricing):
	query = pricing;
	query["team"] = TEAM;
	response = requests.post(URL + "/pricing/", params=query)
	return response.json()

# Set Power Zones
def set_zones(zones):
	zone_list = (",").join(str(z) for z in zones)
	query = {
		"team": TEAM,
		"zones": zone_list
	}
	response = requests.post(URL + "/zones/", params=query)
	return response.json()
	
def string_to_date(datestring):
	return datetime.strptime(datestring, "%Y-%m-%dT%H:%M:%S")

'''
Example Usage
'''

trips = get_trips({
	"start": "9/10/2017 2:00 PM",
	"end": "9/10/2017 3:00 PM",
	"limit": 10
})

for trip in trips["response"]:
	d = string_to_date(trip["trip_start_timestamp"])
	time = d.strftime("%m/%d %r")
	pickup = trip["pickup_community_area"]
	dropoff = trip["dropoff_community_area"]
	print("Trip at %s from area %s to %s" % (time, pickup, dropoff))

p = set_pricing({
	"base": 3.40,
	"pickup": 1.00,
	"per_mile": 0.20,
	"per_minute": 0.30
})

print(p)

z = set_zones([5, 6, 7])
print(z)
