/*
 * Java Starter Code
 * >> javac -cp ".:lib/*" Main.java
 * >> java -cp ".:lib/*" Main
 */

import com.mashape.unirest.http.*;
import com.mashape.unirest.http.exceptions.UnirestException;
import org.json.*;
import java.util.Date;
import java.text.SimpleDateFormat;
import java.text.ParseException;
 
public class Main {
	
	public static final String BASE_URL = "https://lyft-vingkan.c9users.io";
	public static final String TEAM = System.getenv().get("TEAM_SECRET");
	
	public static void main(String[] args) {
		
		/*
		 * Example Usage
		 */
		
		try {
			
			SimpleDateFormat sdf = new SimpleDateFormat("M/d h:mm a");
			JSONObject response = getTrips("9/10/2017 2:00 PM", "9/10/2017 3:00 PM", 10);
			JSONArray results = (JSONArray) response.getJSONArray("response");
			for (int i = 0; i < results.length(); i++) {
				JSONObject trip = (JSONObject) results.getJSONObject(i);
				String tripStart = (String) trip.get("trip_start_timestamp");
				Date d = stringToDate(tripStart);
				String time = sdf.format(d);
				String pickup = (String) trip.get("pickup_community_area");
				String dropoff = (String) trip.get("dropoff_community_area");
				String out = String.format("Trip at %s from area %s to %s", time, pickup, dropoff);
				System.out.println(out);
			}
			
			double base = 3.40;
			double pickup = 1.00;
			double perMile = 0.20;
			double perMinute = 0.30;
			JSONObject p = setPricing(base, pickup, perMile, perMinute);
			System.out.println(p);
			
			int[] zones = {5, 6, 7};
			JSONObject z = setZones(zones);
			System.out.println(z);
		
		} catch (UnirestException ue) {
			ue.printStackTrace();
		} catch (ParseException pe) {
			pe.printStackTrace();
		}
		
	}
	
	/*
	 * Helper Methods
	 */
	
	// Get Trips
	public static JSONObject getTrips(String start, String end) throws UnirestException {
		HttpResponse<String> request = Unirest.get(BASE_URL + "/trips/")
			.queryString("team", TEAM)
			.queryString("start", start)
			.queryString("end", end)
			.asString();
		JSONObject response = new JSONObject(request.getBody());
		return response;
	}
	
	// Get Trips (with limit)
	public static JSONObject getTrips(String start, String end, int limit) throws UnirestException {
		HttpResponse<String> request = Unirest.get(BASE_URL + "/trips/")
			.queryString("team", TEAM)
			.queryString("start", start)
			.queryString("end", end)
			.queryString("limit", limit)
			.asString();
		JSONObject response = new JSONObject(request.getBody());
		return response;
	}
	
	// Set Pricing
	public static JSONObject setPricing(double base, double pickup, double perMile, double perMinute) throws UnirestException {
		HttpResponse<String> request = Unirest.post(BASE_URL + "/pricing/")
			.queryString("team", TEAM)
			.queryString("base", base)
			.queryString("pickup", pickup)
			.queryString("per_mile", perMile)
			.queryString("per_minute", perMinute)
			.asString();
		JSONObject response = new JSONObject(request.getBody());
		return response;
	}
	
	// Set Power Zones
	public static JSONObject setZones(int[] zones) throws UnirestException {
		String zoneList = "";
		for (int i = 0; i < zones.length; i++) {
			zoneList += zones[i];
			if (i < (zones.length - 1)) {
				zoneList += ",";
			}
		}
		HttpResponse<String> request = Unirest.post(BASE_URL + "/zones/")
			.queryString("team", TEAM)
			.queryString("zones", zoneList)
			.asString();
		JSONObject response = new JSONObject(request.getBody());
		return response;
	}
	
	// Convert String to Date
	public static Date stringToDate(String dateString) throws ParseException {
		SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
		Date d = df.parse(dateString);
		return d;
	}

}