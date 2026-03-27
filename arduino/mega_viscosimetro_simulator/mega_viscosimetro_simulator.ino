/*
  Simulador de telemetria para Arduino Mega (Q-VISC).

  Objetivo:
  - Probar el backend/frontend sin viscosimetro fisico.
  - Enviar datos serial en formato compatible con la app:
      VISC=<valor>;TEMP=<valor>
  - Opcionalmente inyectar errores:
      ERROR=<codigo>

  Configuracion recomendada:
  - Placa: Arduino Mega 2560
  - Baudrate: 9600 (igual que SerialManager por defecto)
*/

#include <Arduino.h>
#include <math.h>

// ------------------------------ Ajustes ------------------------------
static const unsigned long BAUD_RATE = 9600;
static const unsigned long STARTUP_SILENT_MS = 5000;   // no envia nada al inicio
static const unsigned long TELEMETRY_PERIOD_MS = 1000; // 1 mensaje por segundo

// Si es true, cada N tramas de telemetria se emite una trama de error.
static const bool ENABLE_PERIODIC_ERROR = true;
static const unsigned long ERROR_EVERY_N_FRAMES = 25;

// Rango base de simulacion (Q-VISC)
static const float BASE_VISC = 120.0f;   // cP
static const float AMPL_VISC = 18.0f;    // cP
static const float BASE_TEMP = 25.0f;    // C
static const float AMPL_TEMP = 1.8f;     // C
// ------------------------------ Estado ------------------------------
unsigned long bootMs = 0;
unsigned long lastTelemetryMs = 0;
unsigned long frameCount = 0;
float phase = 0.0f;

// ------------------------------ Utiles ------------------------------
float pseudoNoise(float minVal, float maxVal) {
  long r = random(0, 10001); // 0..10000
  float n = (float)r / 10000.0f;
  return minVal + (maxVal - minVal) * n;
}

void emitTelemetry(float visc, float temp) {
  // Formato parseable por la app actual:
  // - VISC y TEMP son claves obligatorias para marcar telemetria valida.
  Serial.print("VISC=");
  Serial.print(visc, 3);
  Serial.print(";TEMP=");
  Serial.println(temp, 2);
}

void emitError(const char* code) {
  Serial.print("ERROR=");
  Serial.println(code);
}

void blinkLed(unsigned long now) {
  // Patron de vida simple:
  // - Durante silencio inicial: parpadeo lento
  // - En envio normal: parpadeo rapido
  unsigned long interval = (now - bootMs < STARTUP_SILENT_MS) ? 400 : 120;
  bool on = ((now / interval) % 2) == 0;
  digitalWrite(LED_BUILTIN, on ? HIGH : LOW);
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(BAUD_RATE);

  // Seed simple para ruido pseudoaleatorio
  randomSeed((unsigned long)analogRead(A0) + micros());

  bootMs = millis();
  lastTelemetryMs = bootMs;
}

void loop() {
  unsigned long now = millis();
  blinkLed(now);

  // Ventana inicial sin telemetria: prueba estado "sin medicion detectada"
  if (now - bootMs < STARTUP_SILENT_MS) {
    return;
  }

  if (now - lastTelemetryMs < TELEMETRY_PERIOD_MS) {
    return;
  }

  lastTelemetryMs = now;
  frameCount++;

  if (ENABLE_PERIODIC_ERROR && (frameCount % ERROR_EVERY_N_FRAMES == 0)) {
    emitError("SIMULATED_SENSOR_TIMEOUT");
    return;
  }

  // Señales suaves para que el grafico se mueva de forma realista
  phase += 0.12f;

  float visc = BASE_VISC + AMPL_VISC * sin(phase) + pseudoNoise(-0.7f, 0.7f);
  float temp = BASE_TEMP + AMPL_TEMP * sin(phase * 0.6f) + pseudoNoise(-0.2f, 0.2f);
  // Limites de seguridad para no generar negativos
  if (visc < 1.0f) visc = 1.0f;
  if (temp < -10.0f) temp = -10.0f;

  emitTelemetry(visc, temp);
}
