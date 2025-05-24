#define TINY_GSM_MODEM_SIM800
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// WLAN-Zugangsdaten
const char* ssid = "DEIN_SSID";
const char* password = "DEIN_PASSWORT";

// Ziel im lokalen Netz (z.B. Kamera oder PC mit Webserver)
const char* localImageURL = "http://192.168.0.150/latest.jpg";

// ESP Webserver
WebServer server(80);

void handleRequestImage() {
  WiFiClient imageClient;
  HTTPClient http;
  http.begin(imageClient, localImageURL);

  int httpCode = http.GET();

  if (httpCode == 200) {
    // Bilddaten direkt weiterleiten!
    WiFiClient& client = server.client();
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: image/jpeg");
    client.print("Content-Length: ");
    client.println(http.getSize());
    client.println("Connection: close");
    client.println();

    // Buffer streamen
    int len = http.getSize();
    WiFiClient* stream = http.getStreamPtr();
    uint8_t buff[128];
    while (http.connected() && (len > 0 || len == -1)) {
      size_t size = stream->available();
      if (size) {
        int c = stream->readBytes(buff, ((size > sizeof(buff)) ? sizeof(buff) : size));
        client.write(buff, c);
        if (len > 0) len -= c;
      }
      delay(1);
    }
    http.end();
    return;
  } else {
    server.send(502, "text/plain", "Image fetch failed");
    http.end();
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Endpoint für Proxy
  server.on("/requestimage", HTTP_GET, handleRequestImage);
  server.begin();
  Serial.println("Webserver bereit auf Port 80!");
}

void loop() {
  server.handleClient();
}
