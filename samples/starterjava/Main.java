
/*
 * RUN
 * >> javac -cp ".:lib/*" SimpleServer.java
 * >> java -cp ".:lib/*" SimpleServer
 * Open: http://{workspacename}-{username}.c9users.io/{route}
 */
 
public class Main {

	public Main() {
	
	}
	
	public static void main(String[] args) {
		HttpResponse<String> response = Unirest.get("https://lyft-vingkan.c9users.io/trips/?start=9%2F12%2F17%202%3A00%20PM&end=9%2F12%2F17%203%3A00%20PM&team=team2")
			.header("cache-control", "no-cache")
			.header("postman-token", "3def01a5-99cc-6608-69d4-cc230b9bfe65")
			.asString();
		System.out.println(response);
	}

}