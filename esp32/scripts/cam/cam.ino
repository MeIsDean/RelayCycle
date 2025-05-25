#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>

// WLAN-Zugangsdaten
const char* ssid = "FRITZ!Box 7530 QX";
const char* password = "85785624127153353745";

// WebServer auf Port 80
WebServer server(80);

// Pin-Definitionen für OV2640/AI-Thinker ESP32-CAM
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

void handle_capture() {
  Serial.println("handle_capture called!");
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    server.send(500, "text/plain", "Camera capture failed");
    return;
  }
  Serial.print("JPEG size: ");
  Serial.println(fb->len);

  WiFiClient client = server.client();
  client.print("HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nContent-Length: ");
  client.print(fb->len);
  client.print("\r\nConnection: close\r\n\r\n");
  client.write(fb->buf, fb->len);

  esp_camera_fb_return(fb);
  delay(10);
  Serial.println("Image sent!");
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nESP32-CAM (OV2640) ready!");

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;      // OV2640 kann JPEG
  config.frame_size = FRAMESIZE_VGA;         // 640x480 (andere: QVGA, SVGA, etc.)
  config.jpeg_quality = 12;                  // 0=best, 63=worst
  config.fb_count = 1;                       // RAM schonen

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return;
  }
  Serial.println("Camera init ok!");

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  server.on("/capture", HTTP_GET, handle_capture);
  server.begin();
  Serial.println("HTTP server started! Open /capture for image.");
}

void loop() {
  server.handleClient();
}
