#include "esp_camera.h"
#include <WiFi.h>

// Connect to the bridge AP
const char* ssid = "BridgeNet";
const char* password = "esp32bridge";

// Static IP configuration for ESP32-CAM
IPAddress local_ip(192,168,4,2);
IPAddress gateway(192,168,4,1);
IPAddress subnet(255,255,255,0);

// ... (camera config as before)

WiFiServer server(80);

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Camera configuration ... (as before, see earlier code)

  // Connect to Bridge AP with static IP
  WiFi.config(local_ip, gateway, subnet);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Bridge AP");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Bridge AP");
  Serial.print("ESP32-CAM IP address: ");
  Serial.println(WiFi.localIP());

  server.begin();
}

void loop() {
  WiFiClient client = server.available();
  if (!client) return;

  String req = client.readStringUntil('\r');
  client.read(); // '\n'

  if (req.indexOf("GET /capture") != -1) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      client.println("HTTP/1.1 500 Internal Server Error");
      client.println("Content-Type: text/plain");
      client.println();
      client.println("Camera capture failed");
      client.stop();
      return;
    }
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: image/jpeg");
    client.printf("Content-Length: %u\r\n", fb->len);
    client.println("Connection: close");
    client.println();
    client.write(fb->buf, fb->len);
    esp_camera_fb_return(fb);
    client.stop();
  } else {
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: text/html");
    client.println("Connection: close");
    client.println();
    client.println("<html><body><h2>ESP32-CAM (Station) OK! GET /capture</h2></body></html>");
    client.stop();
  }
}
