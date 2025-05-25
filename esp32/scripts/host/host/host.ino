
#include <WiFi.h>
#include <WiFiAP.h>
#include <HTTPClient.h>
#define TINY_GSM_MODEM_SIM800
#include <TinyGsmClient.h>
#include <SoftwareSerial.h>

// GSM Modem
#define MODEM_RST            5
#define MODEM_PWRKEY         4
#define MODEM_POWER_ON       23
#define MODEM_TX             27
#define MODEM_RX             26
#define SIM_PIN              "6722" // Deine SIM-PIN
#define APN                  "internet" // o2 APN, meist "internet" oder "pinternet.interkom.de"
#define GPRS_USER            ""
#define GPRS_PASS            ""
#define SERVER_URL           "http://159.69.47.171/api/upload" // URL deines Servers

// Access Point Einstellungen
const char* ap_ssid = "ESP32-CAM-NETZ";
const char* ap_password = "esp32pass";

// Kamera-IP-Adressen (statisch oder DHCP-Liste auslesen)
const char* camera_ips[] = {
  "192.168.4.10",
  "192.168.4.11",
  // weitere Kameras hinzufügen
};
const int camera_count = sizeof(camera_ips) / sizeof(camera_ips[0]);

// SIM800L via SoftwareSerial
SoftwareSerial SerialAT(MODEM_RX, MODEM_TX);
TinyGsm modem(SerialAT);
TinyGsmClient client(modem);

void setup()
{
  Serial.begin(115200);
  delay(10);

  // GSM Modem starten
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, HIGH);
  delay(1000);
  digitalWrite(MODEM_PWRKEY, LOW);

  SerialAT.begin(9600);
  delay(3000);

  Serial.println("Starte GSM Modem...");
  modem.restart();
  modem.simUnlock(SIM_PIN);

  // Mit Netz verbinden
  Serial.println("Verbindet mit GSM-Netz...");
  if (!modem.waitForNetwork()) {
    Serial.println("Kein Netz!");
    return;
  }
  Serial.println("Netz gefunden");

  // Mit GPRS verbinden
  Serial.println("GPRS verbinden...");
  if (!modem.gprsConnect(APN, GPRS_USER, GPRS_PASS)) {
    Serial.println("GPRS Verbindung fehlgeschlagen!");
    return;
  }
  Serial.println("GPRS verbunden");

  // Access Point starten
  Serial.println("Starte WLAN AP...");
  WiFi.softAP(ap_ssid, ap_password);
  Serial.print("AP-IP-Adresse: ");
  Serial.println(WiFi.softAPIP());
}

void loop()
{
  // Auf eingehende Befehle vom Server prüfen
  if (waitForHttpGetRequestFromServer()) {
    Serial.println("Befehl vom Server erhalten!");
    // An alle Kameras Bild anfordern und an Server weiterleiten
    for (int i = 0; i < camera_count; i++) {
      String image = getImageFromCamera(camera_ips[i]);
      if (image.length() > 0) {
        sendImageToServer(image, i);
      }
    }
  }

  delay(2000); // Loop-Pause
}

// Dummy: Warte auf HTTP-GET vom Server (über GSM), z.B. via polling eines Endpoints
bool waitForHttpGetRequestFromServer()
{
  // Beispiel: Alle 10 Sekunden GET auf Server, erwartet Befehl als "1"
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 10000) {
    lastCheck = millis();
    HTTPClient http;
    if (http.begin(client, SERVER_URL "/get-command")) {
      int httpCode = http.GET();
      if (httpCode == 200) {
        String payload = http.getString();
        http.end();
        return payload == "1";
      }
      http.end();
    }
  }
  return false;
}

// Bild von Kamera anfordern
String getImageFromCamera(const char* cam_ip)
{
  String url = String("http://") + cam_ip + "/capture";
  HTTPClient http;
  Serial.print("Fordere Bild an von: "); Serial.println(url);
  if (http.begin(url)) {
    int httpCode = http.GET();
    if (httpCode == 200) {
      String payload = http.getString(); // Bild als Base64 oder JPEG je nach Kamera
      http.end();
      return payload;
    }
    http.end();
  }
  return "";
}

// Bild an Server weiterleiten
void sendImageToServer(const String& img, int camIdx)
{
  HTTPClient http;
  String upload_url = String(SERVER_URL) + "/upload";
  Serial.print("Sende Bild an Server: "); Serial.println(upload_url);

  http.begin(client, upload_url);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"camera\":" + String(camIdx) + ", \"image\":\"" + img + "\"}";

  int httpResponseCode = http.POST(payload);
  if (httpResponseCode > 0) {
    Serial.printf("[HTTP] POST... code: %d\n", httpResponseCode);
    String response = http.getString();
    Serial.println(response);
  } else {
    Serial.printf("[HTTP] POST... Fehler: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  http.end();
}
