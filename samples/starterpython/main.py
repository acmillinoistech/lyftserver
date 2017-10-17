import requests
import datetime

URL = "https://lyft-vingkan.c9users.io"
TEAM = "your-team"

'''
Helper Methods
'''

# Set Pricing
def set_pricing(pricing):
	query = pricing;
	query["team"] = TEAM;
	response = requests.post(URL + "/pricing/", params=query)
	return response

# Set Power Zones
def set_zones(zones):
	zone_list = (",").join(str(z) for z in zones)
	query = {
		"team": TEAM,
		"zones": zone_list
	}
	response = requests.post(URL + "/zones/", params=query)
	return response

def get_trips(query):
	query["team"] = TEAM
	response = requests.get(URL + "/trips/", params=query)
	res = response.json()
	return res

'''
Example Usage
'''

set_zones([5, 6, 7])

set_pricing({
	"base": 3.40,
	"pickup": 1.00,
	"per_mile": 0.20,
	"per_minute": 0.30
})

data = get_trips({
	"start": "9/10/2017",
	"end": "9/11/2017"
})

print(data["length"])
