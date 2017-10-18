import com.mashape.unirest.http.*;
import com.mashape.unirest.http.exceptions.UnirestException;
import org.json.*;

/*
 * RUN
 * >> javac -cp ".:lib/*" Main.java
 * >> java -cp ".:lib/*" Main
 */
 
public class Main {
	
	public static String BASE_URL = "https://lyft-vingkan.c9users.io";
	public static String TEAM = "your-team";

	public Main() {
	
	}
	
	public static void main(String[] args) {
		
		try {
			
			HttpResponse<String> request = Unirest.get(BASE_URL + "/trips/")
				.queryString("team", TEAM)
				.queryString("start", "9/10/2017 2:00 PM")
				.queryString("end", "9/10/2017 3:00 PM")
				.asString();
			
			System.out.println(request);
			JSONObject response = new JSONObject(request.getBody());
			JSONArray results = (JSONArray) response.getJSONArray("response");
			for (int i = 0; i < results.length(); i++) {
				JSONObject trip = (JSONObject) results.getJSONObject(i);
				String pickup = (String) trip.get("pickup_community_area");
				String dropoff = (String) trip.get("dropoff_community_area");
				String out = String.format("Trip from area %s to area %s.", pickup, dropoff);
				System.out.println(out);
			}
		
		} catch (UnirestException ue) {
			ue.printStackTrace();
		}
		
	}

}