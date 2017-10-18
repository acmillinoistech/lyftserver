import com.mashape.unirest.http.*;
import com.mashape.unirest.http.exceptions.UnirestException;
import org.json.*;

/*
 * RUN
 * >> javac -cp ".:lib/*" Main.java
 * >> java -cp ".:lib/*" Main
 */
 
public class Main {
	
	public static final String BASE_URL = "https://lyft-vingkan.c9users.io";
	public static final String TEAM = "your-team";

	public Main() {
	
	}
	
	public static void main(String[] args) {
		
		try {
			
			JSONObject response = getTrips("9/10/2017 2:00 PM", "9/10/2017 3:00 PM", 20);
			JSONArray results = (JSONArray) response.getJSONArray("response");
			for (int i = 0; i < results.length(); i++) {
				JSONObject trip = (JSONObject) results.getJSONObject(i);
				String pickup = (String) trip.get("pickup_community_area");
				String dropoff = (String) trip.get("dropoff_community_area");
				//String out = String.format("Trip from area %s to area %s.", pickup, dropoff);
				String out = String.format("Trip Time: %s", (String) trip.get("trip_start_timestamp"));
				System.out.println(out);
			}
		
		} catch (UnirestException ue) {
			ue.printStackTrace();
		}
		
	}
	
	public static JSONObject getTrips(String start, String end) throws UnirestException {
		HttpResponse<String> request = Unirest.get(BASE_URL + "/trips/")
			.queryString("team", TEAM)
			.queryString("start", start)
			.queryString("end", end)
			.asString();
		JSONObject response = new JSONObject(request.getBody());
		return response;
	}
	
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

}